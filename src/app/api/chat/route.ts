import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTier, hasReachedLimit, TIERS, getRemainingMessages, hasProAccess, TRIAL_DURATION_MS, canAffordModel } from "@/lib/stripe";
import { checkRateLimit, RATE_LIMIT_CHAT } from '@/lib/rate-limit';
import {
  getConnectedIntegrations,
  buildSystemPrompt,
  getIntegrationTools,
  TOOL_STATUS_LABELS,
} from '@/lib/ai/tool-definitions';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { createProvider } from '@/lib/ai/providers';
import type { ChatMessage, FileAttachment } from '@/lib/ai/providers';
import { getModelConfig, DEFAULT_MODEL, FREE_MODEL } from '@/lib/ai/models';
import type { ReasoningLevel } from '@/lib/ai/models';

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
    const rateLimit = checkRateLimit(`chat:${session.user.id}`, RATE_LIMIT_CHAT);
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

    // Auto-provision trial for legacy users (created before trial system)
    if (!user.trialEnd && !user.freeTrialUsed) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trialEnd: new Date(Date.now() + TRIAL_DURATION_MS),
          freeTrialUsed: true,
        },
      });
      user.trialEnd = new Date(Date.now() + TRIAL_DURATION_MS);
      user.freeTrialUsed = true;
    }

    const tier = getUserTier(user.stripeSubscriptionId, user.stripeCurrentPeriodEnd, user.trialEnd, user.freeTrialUsed);

    const usageRecord = await prisma.usageRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    const currentUsage = usageRecord?.count || 0;

    if (hasReachedLimit(tier, currentUsage)) {
      const isExpired = tier === 'expired';
      return new Response(
        JSON.stringify({
          error: isExpired
            ? 'Your trial has expired. Subscribe to Pro to continue using Nova.'
            : 'Daily message limit reached',
          code: isExpired ? 'TRIAL_EXPIRED' : 'LIMIT_REACHED',
          limit: TIERS[tier].messagesPerDay,
          used: currentUsage,
          tier,
        }),
        { status: isExpired ? 403 : 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request — supports JSON or FormData (for file uploads)
    let messages: { role: string; content: string }[];
    let conversationId: string | undefined;
    let requestModel: string | undefined;
    let requestReasoning: ReasoningLevel | undefined;
    let uploadedFiles: File[] = [];

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      messages = JSON.parse(formData.get('messages') as string);
      conversationId = (formData.get('conversationId') as string) || undefined;
      requestModel = (formData.get('model') as string) || undefined;
      requestReasoning = (formData.get('reasoningEffort') as ReasoningLevel) || undefined;
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

    const newUsage = currentUsage + 1;
    const remaining = getRemainingMessages(tier, newUsage);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: session.user.id,
        },
      });

      if (!conversation) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
        },
      });
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
    let systemPrompt = buildSystemPrompt(connectedIntegrations);
    const tools = getIntegrationTools(connectedIntegrations);

    // Append user's custom system prompt if set
    if (user.systemPrompt) {
      systemPrompt += `\n\nUser instructions: ${user.systemPrompt}`;
    }

    // Resolve model: request override → conversation model → user preference → default
    // getModelConfig falls back to DEFAULT_MODEL for unknown IDs (e.g. old DB values)
    let modelId = requestModel || conversation.model || user.preferredModel || DEFAULT_MODEL;
    let modelConfig = getModelConfig(modelId);
    modelId = modelConfig.id; // Ensure modelId matches a valid model (handles legacy DB values)

    // Credit gating: if model costs credits and user can't afford it, fall back to free model
    let usedFallback = false;
    if (modelConfig.creditCost > 0 && !canAffordModel(user.credits, modelConfig.creditCost)) {
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
        // Add assistant's tool_calls message
        aiMessages.push(toolResponse.message);

        // Execute each tool call
        for (const toolCall of toolResponse.message.toolCalls) {
          const statusLabel = TOOL_STATUS_LABELS[toolCall.functionName] || `Using ${toolCall.functionName}…`;
          toolStatusEvents.push(statusLabel);
          const result = await executeToolCall(
            toolCall.functionName,
            toolCall.arguments,
            connectedIntegrations,
            user.id,
            provider,
          );
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
        // Send conversationId and usage info as first message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            conversationId: conversation.id,
            credits: user.credits - modelConfig.creditCost,
            creditCost: modelConfig.creditCost,
            modelUsed: modelId,
            usedFallback,
            reasoningEffort: reasoningEffort || null,
            usage: {
              used: newUsage,
              limit: TIERS[tier].messagesPerDay,
              remaining,
              tier,
            }
          })}\n\n`)
        );

        // Send tool status events so the client knows what tools were used
        for (const status of toolStatusEvents) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ toolStatus: status })}\n\n`)
          );
        }

        for await (const chunk of response) {
          fullResponse += chunk.content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`));
        }

        // Save assistant message to database
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            content: fullResponse,
          },
        });

        // Increment usage AFTER successful response
        await incrementUsage(user.id, today, usageRecord ?? null);

        // Deduct credits for non-free models
        if (modelConfig.creditCost > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { credits: { decrement: modelConfig.creditCost } },
          });
        }

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
            if (title) {
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { title },
              });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ title })}\n\n`));
            }
          }).catch((e) => {
            console.error('Failed to generate title:', e);
          }).finally(() => {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });
          return; // Don't close here — finally block will close
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
