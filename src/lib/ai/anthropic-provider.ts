/**
 * Anthropic Provider — implements AIProvider using the Anthropic SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  ChatParams,
  ChatResponse,
  ChatMessage,
  StreamChunk,
  ToolDefinition,
} from './providers';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';

  async chat(params: ChatParams): Promise<ChatResponse> {
    const { systemPrompt, messages } = splitSystemMessage(params.messages);

    const response = await client.messages.create({
      model: params.model,
      system: systemPrompt,
      messages: toAnthropicMessages(messages),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
      ...(params.tools && params.tools.length > 0
        ? { tools: toAnthropicTools(params.tools) }
        : {}),
    });

    return fromAnthropicResponse(response);
  }

  async chatStream(
    params: Omit<ChatParams, 'tools'>
  ): Promise<AsyncIterable<StreamChunk>> {
    const { systemPrompt, messages } = splitSystemMessage(params.messages);

    const stream = client.messages.stream({
      model: params.model,
      system: systemPrompt,
      messages: toAnthropicMessages(messages),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
    });

    return streamAdapter(stream);
  }

  async quickChat(params: {
    model: string;
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const response = await client.messages.create({
      model: params.model,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock && 'text' in textBlock ? textBlock.text.trim() : '';
  }
}

// ── Format translators ──────────────────────────

/** Anthropic requires system message separate from messages array */
function splitSystemMessage(messages: ChatMessage[]): {
  systemPrompt: string;
  messages: ChatMessage[];
} {
  const systemMsg = messages.find((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');
  return {
    systemPrompt: systemMsg?.content ?? '',
    messages: rest,
  };
}

function toAnthropicMessages(
  messages: ChatMessage[]
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      // Assistant message with tool use
      const content: Anthropic.ContentBlockParam[] = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.functionName,
          input: tc.arguments as Record<string, unknown>,
        });
      }
      result.push({ role: 'assistant', content });
    } else if (msg.role === 'tool' && msg.toolCallId) {
      // Tool results go into a user message in Anthropic format
      // Check if the previous message is already a user message with tool_result
      const lastMsg = result[result.length - 1];
      const toolResultBlock: Anthropic.ToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: msg.toolCallId,
        content: msg.content ?? '',
      };

      if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
        // Append to existing user message
        (lastMsg.content as Anthropic.ContentBlockParam[]).push(toolResultBlock);
      } else {
        result.push({
          role: 'user',
          content: [toolResultBlock],
        });
      }
    } else if (msg.role === 'user') {
      // User messages with image attachments → content array
      if (msg.attachments && msg.attachments.length > 0) {
        const content: Anthropic.ContentBlockParam[] = [];
        for (const att of msg.attachments) {
          if (att.type === 'image') {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: att.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: att.data,
              },
            });
          }
        }
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        result.push({ role: 'user', content });
      } else {
        result.push({ role: 'user', content: msg.content ?? '' });
      }
    } else if (msg.role === 'assistant') {
      result.push({
        role: msg.role,
        content: msg.content ?? '',
      });
    }
  }

  return result;
}

function toAnthropicTools(
  tools: ToolDefinition[]
): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters as Anthropic.Tool.InputSchema,
  }));
}

function fromAnthropicResponse(
  response: Anthropic.Message
): ChatResponse {
  const message: ChatMessage = {
    role: 'assistant',
    content: null,
  };

  // Extract text content
  const textBlocks = response.content.filter((b) => b.type === 'text');
  if (textBlocks.length > 0) {
    message.content = textBlocks
      .map((b) => ('text' in b ? b.text : ''))
      .join('');
  }

  // Extract tool use
  const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
  if (toolUseBlocks.length > 0) {
    message.toolCalls = toolUseBlocks.map((b) => {
      if (b.type !== 'tool_use') throw new Error('Unexpected block type');
      return {
        id: b.id,
        functionName: b.name,
        arguments: b.input as Record<string, unknown>,
      };
    });
  }

  // Map stop_reason to our format
  let finishReason = 'stop';
  if (response.stop_reason === 'tool_use') {
    finishReason = 'tool_calls';
  } else if (response.stop_reason === 'end_turn') {
    finishReason = 'stop';
  }

  return { message, finishReason };
}

async function* streamAdapter(
  stream: ReturnType<typeof client.messages.stream>
): AsyncIterable<StreamChunk> {
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield { content: event.delta.text };
    }
  }
}
