import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAffordModel, isPro } from "@/lib/stripe";
import { checkRateLimitDistributed, RATE_LIMIT_CHAT } from '@/lib/rate-limit';
import {
  getConnectedIntegrations,
  getGatewayDeviceTools,
  buildSystemPrompt,
  getIntegrationTools,
  TOOL_STATUS_LABELS,
  DESKTOP_TOOL_STATUS_LABELS,
} from '@/lib/ai/tool-definitions';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { createProvider } from '@/lib/ai/providers';
import type { ChatMessage, FileAttachment } from '@/lib/ai/providers';
import { getModelConfig, DEFAULT_MODEL, FREE_MODEL } from '@/lib/ai/models';
import type { ReasoningLevel } from '@/lib/ai/models';
import { DESKTOP_TOOLS } from '@/lib/desktop-tools';
import { getDistributedDeviceSummary, routeToolCall } from '@/lib/gateway/message-router';
import { recall } from '@/lib/memory';
import { extractMemories, formatMemoriesForPrompt } from '@/lib/memory-extractor';
import { remember } from '@/lib/memory';
import { getOrCreateCanonicalConversation } from '@/lib/canonical-conversation';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Parse uploaded files and produce attachments + context text */
async function processFiles(files: File[]): Promise<{ attachments: FileAttachment[]; contextText: string }> {
  const attachments: FileAttachment[] = [];
  const contextParts: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      contextParts.push(`[File "${file.name}" rejected: exceeds 10 MB limit]`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      attachments.push({
        type: 'image',
        name: file.name,
        mimeType: file.type,
        data: buffer.toString('base64'),
      });
      contextParts.push(`[Attached image: ${file.name}]`);
    } else if (file.type === 'application/pdf') {
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        const text = result.text.slice(0, 50_000); // cap extracted text
        await parser.destroy();
        contextParts.push(`[Attached PDF: ${file.name}]\n\n${text}`);
      } catch {
        contextParts.push(`[Failed to parse PDF: ${file.name}]`);
      }
    } else if (file.type === 'text/csv' || file.type === 'text/plain') {
      const text = buffer.toString('utf-8').slice(0, 50_000);
      contextParts.push(`[Attached file: ${file.name}]\n\n${text}`);
    } else {
      contextParts.push(`[File "${file.name}" rejected: unsupported type ${file.type}]`);
    }
  }

  return { attachments, contextText: contextParts.join('\n\n') };
}

// Get today's date in YYYY-MM-DD format (UTC)
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/** Increment usage count. Called only after a successful AI response. */
async function incrementUsage(userId: string, today: string, currentRecord: { id: string; count: number } | null) {
  if (currentRecord) {
    await prisma.usageRecord.update({
      where: { id: currentRecord.id },
      data: { count: currentRecord.count + 1 },
    });
  } else {
    await prisma.usageRecord.create({
      data: { userId, date: today, count: 1 },
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    const rateLimit = await checkRateLimitDistributed(`chat:${session.user.id}`, RATE_LIMIT_CHAT);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimit.headers } }
      );
    }

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits
    const today = getToday();

    const usageRecord = await prisma.usageRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    // Parse request — supports JSON or FormData (for file uploads)
    let messages: { role: string; content: string }[];
    let conversationId: string | undefined;
    let requestModel: string | undefined;
    let requestReasoning: ReasoningLevel | undefined;
    const uploadedFiles: File[] = [];
    let hasDesktopTools = false;
    let toolResults: Array<{ callId: string; result: string }> | undefined;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      messages = JSON.parse(formData.get('messages') as string);
      conversationId = (formData.get('conversationId') as string) || undefined;
      requestModel = (formData.get('model') as string) || undefined;
      requestReasoning = (formData.get('reasoningEffort') as ReasoningLevel) || undefined;
      hasDesktopTools = formData.get('desktopTools') === 'true';
      // Collect all uploaded files
      for (const [key, value] of formData.entries()) {
        if (key === 'files' && value instanceof File) {
          uploadedFiles.push(value);
        }
      }
    } else {
      const body = await req.json();
      messages = body.messages;
      conversationId = body.conversationId;
      requestModel = body.model;
      requestReasoning = body.reasoningEffort;
      hasDesktopTools = body.desktopTools === true;
      toolResults = body.toolResults;
    }

    // Process uploaded files
    let fileAttachments: FileAttachment[] = [];
    let fileContextText = '';
    if (uploadedFiles.length > 0) {
      const processed = await processFiles(uploadedFiles);
      fileAttachments = processed.attachments;
      fileContextText = processed.contextText;
    }

    const userMessage = messages[messages.length - 1];
    // Enhance user message content with file context (for DB storage and text models)
    const enhancedContent = fileContextText
      ? `${userMessage.content}\n\n${fileContextText}`
      : userMessage.content;

    // Single-chat mode: always use canonical conversation for this user
    const conversation = await getOrCreateCanonicalConversation(session.user.id);

    if (conversationId && conversationId !== conversation.id) {
      return new Response(
        JSON.stringify({
          error: 'Single-chat mode is enabled for this account',
          canonicalConversationId: conversation.id,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save user message to database (text-only, no base64 blobs)
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: userMessage.role,
        content: enhancedContent,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Fetch user's connected integrations for tool use
    const connectedIntegrations = await getConnectedIntegrations(user.id);
    const deviceSummary = await getDistributedDeviceSummary(user.id);
    const gatewayRoutingEnabled = process.env.ENABLE_GATEWAY_TOOL_ROUTING === '1';
    const gatewayTools = gatewayRoutingEnabled
      ? getGatewayDeviceTools(deviceSummary.capabilities)
      : [];
    let systemPrompt = buildSystemPrompt(connectedIntegrations, hasDesktopTools);
    const tools = [
      ...getIntegrationTools(connectedIntegrations),
      ...gatewayTools,
      ...(hasDesktopTools ? DESKTOP_TOOLS : []),
    ];

    // Add connected device context to system prompt
    if (gatewayRoutingEnabled && deviceSummary.deviceCount > 0) {
      const deviceList = deviceSummary.devices.map(d => `${d.platform} (${d.capabilities.join(', ')})`).join('; ');
      systemPrompt += `\n\nConnected devices: ${deviceList}. You can use device-specific capabilities like iMessage when available.`;
    }

    // Append user's custom system prompt if set
    if (user.systemPrompt) {
      systemPrompt += `\n\nUser instructions: ${user.systemPrompt}`;
    }

    // Recall relevant memories and inject into system prompt
    try {
      const recalledMemories = await recall(user.id, enhancedContent, 8, 0.35);
      if (recalledMemories.length > 0) {
        systemPrompt += formatMemoriesForPrompt(recalledMemories);
      }
    } catch (err) {
      console.error('[Memory] Recall failed (continuing without):', err);
    }

    // Resolve model: request override → conversation model → user preference → default
    // getModelConfig falls back to DEFAULT_MODEL for unknown IDs (e.g. old DB values)
    let modelId = requestModel || conversation.model || user.preferredModel || DEFAULT_MODEL;
    let modelConfig = getModelConfig(modelId);
    modelId = modelConfig.id; // Ensure modelId matches a valid model (handles legacy DB values)

    // Credit gating: if model costs credits and user can't afford it, fall back to Standard
    // If user can't even afford Standard (1 credit), reject the request
    let usedFallback = false;
    if (!canAffordModel(user.credits, modelConfig.creditCost)) {
      if (!canAffordModel(user.credits, 1)) {
        // Can't afford any model — no credits left
        return new Response(
          JSON.stringify({
            error: 'You have no credits remaining. Buy credits to continue chatting.',
            code: 'NO_CREDITS',
            credits: user.credits,
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      }
      modelId = FREE_MODEL;
      modelConfig = getModelConfig(FREE_MODEL);
      usedFallback = true;
    }

    // Resolve reasoning effort (only for models that support it)
    const reasoningEffort: ReasoningLevel | undefined =
      modelConfig.supportsReasoning
        ? (requestReasoning || (user.reasoningEffort as ReasoningLevel) || 'low')
        : undefined;

    // Save model to conversation if first message or model changed
    if (!conversation.model || conversation.model !== modelId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { model: modelId },
      });
    }

    // Create AI provider for the selected model
    const provider = createProvider(modelConfig.provider);
    const model = modelId;

    // Build normalized messages
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }, i: number) => {
        const isLastMessage = i === messages.length - 1;
        const msg: ChatMessage = {
          role: m.role as ChatMessage['role'],
          content: isLastMessage ? enhancedContent : m.content,
        };
        // Attach images to the last user message for multi-modal vision
        if (isLastMessage && fileAttachments.length > 0) {
          msg.attachments = fileAttachments;
        }
        return msg;
      }),
    ];

    // Handle tool calls in a loop (max 3 rounds to prevent infinite loops)
    let toolRound = 0;
    const MAX_TOOL_ROUNDS = 3;
    const toolStatusEvents: string[] = [];
    const desktopToolNames = new Set(DESKTOP_TOOLS.map(t => t.function.name));
    const gatewayToolNames = new Set(gatewayTools.map(t => t.function.name));

    const executeServerOrGatewayTool = async (
      functionName: string,
      toolArgs: Record<string, unknown>
    ): Promise<string> => {
      if (gatewayRoutingEnabled && gatewayToolNames.has(functionName)) {
        const routed = await routeToolCall(user.id, functionName, toolArgs);
        if (!routed.result.success) {
          return JSON.stringify({
            status: 'informational',
            message: routed.result.error || 'No compatible desktop capability is currently online.',
            nextStep: 'Open Nova Desktop and make sure the relevant capability is enabled, then try again.',
          });
        }
        return JSON.stringify({
          status: 'ok',
          routed: routed.routed,
          deviceId: routed.deviceId || null,
          result: routed.result.result ?? null,
        });
      }

      return executeToolCall(
        functionName,
        toolArgs,
        connectedIntegrations,
        user.id,
        provider,
      );
    };

    // If this is a continuation with tool results from the client, inject them
    if (toolResults && toolResults.length > 0) {
      for (const tr of toolResults) {
        aiMessages.push({
          role: 'tool',
          toolCallId: tr.callId,
          content: tr.result,
        });
      }
    }

    while (toolRound < MAX_TOOL_ROUNDS) {
      const toolResponse = await provider.chat({
        model,
        messages: aiMessages,
        tools,
        temperature: 0.7,
        maxTokens: modelConfig.maxTokens,
        reasoningEffort,
      });

      if (toolResponse.finishReason === 'tool_calls' && toolResponse.message.toolCalls) {
        // Check if any tool calls are desktop-only (must be executed client-side)
        const serverCalls = toolResponse.message.toolCalls.filter(tc => !desktopToolNames.has(tc.functionName));
        const clientCalls = toolResponse.message.toolCalls.filter(tc => desktopToolNames.has(tc.functionName));

        if (clientCalls.length > 0) {
          // Add assistant's tool_calls message for context
          aiMessages.push(toolResponse.message);

          // Execute any server-side tools first
          for (const toolCall of serverCalls) {
            const statusLabel = TOOL_STATUS_LABELS[toolCall.functionName] || `Using ${toolCall.functionName}…`;
            toolStatusEvents.push(statusLabel);
            const result = await executeServerOrGatewayTool(toolCall.functionName, toolCall.arguments);
            aiMessages.push({
              role: 'tool',
              toolCallId: toolCall.id,
              content: result,
            });
          }

          // Return desktop tool calls to the client for execution
          // The client will execute them and send results back in a continuation request
          const desktopToolCallsPayload = clientCalls.map(tc => ({
            callId: tc.id,
            name: tc.functionName,
            arguments: tc.arguments,
            statusLabel: DESKTOP_TOOL_STATUS_LABELS[tc.functionName] || `Running ${tc.functionName.replace('desktop_', '').replace(/_/g, ' ')}…`,
          }));

          // Save the pending AI messages context so the continuation knows where we were
          // (the client will re-send messages + tool results)
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  conversationId: conversation.id,
                  credits: user.credits - modelConfig.creditCost,
                  creditCost: modelConfig.creditCost,
                  modelUsed: modelId,
                  usedFallback,
                  reasoningEffort: reasoningEffort || null,
                  isPro: isPro(user),
                })}\n\n`)
              );
              // Send desktop tool calls for client execution
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ desktopToolCalls: desktopToolCallsPayload })}\n\n`)
              );
              // Send the full AI messages context for the continuation
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ pendingMessages: aiMessages })}\n\n`)
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
            },
          });
        }

        // All tool calls are server-side — execute normally
        aiMessages.push(toolResponse.message);

        for (const toolCall of toolResponse.message.toolCalls) {
          const statusLabel = TOOL_STATUS_LABELS[toolCall.functionName] || `Using ${toolCall.functionName}…`;
          toolStatusEvents.push(statusLabel);
          const result = await executeServerOrGatewayTool(toolCall.functionName, toolCall.arguments);
          aiMessages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: result,
          });
        }
        toolRound++;
        continue;
      }

      // No tool calls — break out and stream the final response
      break;
    }

    // Final streaming call (after all tool calls are resolved)
    const response = await provider.chatStream({
      model,
      messages: aiMessages,
      temperature: 0.7,
      maxTokens: modelConfig.maxTokens,
      reasoningEffort,
    });

    // Collect the full response for saving to DB
    let fullResponse = '';

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let streamClosed = false;
        let clientAborted = req.signal.aborted;
        let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

        const closeStream = () => {
          if (streamClosed) return;
          streamClosed = true;
          try {
            controller.close();
          } catch {
            // Ignore close errors when stream is already closed/errored
          }
        };

        const enqueueData = (payload: unknown): boolean => {
          if (streamClosed || clientAborted) return false;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            return true;
          } catch {
            clientAborted = true;
            return false;
          }
        };

        const enqueueDone = () => {
          if (streamClosed || clientAborted) return;
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch {
            // Ignore enqueue errors on disconnect
          }
        };

        const startKeepAlive = () => {
          keepAliveInterval = setInterval(() => {
            if (streamClosed || clientAborted) return;
            try {
              controller.enqueue(encoder.encode(': keepalive\n\n'));
            } catch {
              clientAborted = true;
            }
          }, 15000);
        };

        const onAbort = () => {
          clientAborted = true;
        };

        req.signal.addEventListener('abort', onAbort);
        startKeepAlive();

        try {
          // Send conversationId and usage info as first message
          if (!enqueueData({
            conversationId: conversation.id,
            credits: user.credits - modelConfig.creditCost,
            creditCost: modelConfig.creditCost,
            modelUsed: modelId,
            usedFallback,
            reasoningEffort: reasoningEffort || null,
            isPro: isPro(user),
          })) {
            return;
          }

          // Send tool status events so the client knows what tools were used
          for (const status of toolStatusEvents) {
            if (!enqueueData({ toolStatus: status })) {
              return;
            }
          }

          for await (const chunk of response) {
            if (clientAborted) break;
            fullResponse += chunk.content;
            if (!enqueueData({ content: chunk.content })) {
              break;
            }
          }

          if (clientAborted) {
            return;
          }

          // Save assistant message to database
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'assistant',
              content: fullResponse,
            },
          });

          // Extract and store new memories (fire-and-forget, don't block response)
          extractMemories(enhancedContent, fullResponse)
            .then(async (newMemories) => {
              for (const mem of newMemories) {
                try {
                  await remember(user.id, mem.content, mem.category, mem.importance);
                } catch (e) {
                  console.error('[Memory] Failed to store extracted memory:', e);
                }
              }
            })
            .catch((e) => console.error('[Memory] Extraction failed:', e));

          // Increment usage AFTER successful response
          await incrementUsage(user.id, today, usageRecord ?? null);

          // Deduct credits for the message
          await prisma.user.update({
            where: { id: user.id },
            data: { credits: { decrement: modelConfig.creditCost } },
          });

          // Generate title if this is the first exchange
          const messageCount = await prisma.message.count({
            where: { conversationId: conversation.id },
          });

          if (messageCount === 2 && !conversation.title) {
            // Always use OpenAI for title generation (cheap, fast, internal-only)
            const titleProvider = createProvider('openai');
            titleProvider.quickChat({
              model: 'gpt-5-mini',
              systemPrompt: 'Generate a very short title (2-5 words) for this conversation based on the user message. Return ONLY the title, no quotes or punctuation.',
              userMessage: enhancedContent,
              temperature: 0.7,
              maxTokens: 20,
            }).then(async (title) => {
              if (!title || clientAborted || streamClosed) return;
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { title },
              });
              enqueueData({ title });
            }).catch((e) => {
              console.error('Failed to generate title:', e);
            }).finally(() => {
              enqueueDone();
              closeStream();
            });
            return; // Don't close here — finally block will close
          }

          enqueueDone();
        } finally {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          req.signal.removeEventListener('abort', onAbort);
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
