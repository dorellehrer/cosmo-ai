/**
 * OpenAI Provider — implements AIProvider using the OpenAI SDK.
 */

import OpenAI from 'openai';
import type {
  AIProvider,
  ChatParams,
  ChatResponse,
  ChatMessage,
  StreamChunk,
  ToolDefinition,
  FileAttachment,
} from './providers';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Get the shared OpenAI client (needed for DALL-E image generation) */
export function getOpenAIClient(): OpenAI {
  return client;
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await client.chat.completions.create({
      model: params.model,
      messages: toOpenAIMessages(params.messages),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1000,
      ...(params.tools && params.tools.length > 0
        ? { tools: toOpenAITools(params.tools) }
        : {}),
      ...(params.reasoningEffort ? { reasoning_effort: params.reasoningEffort } : {}),
    });

    const choice = response.choices[0];
    return {
      message: fromOpenAIMessage(choice.message),
      finishReason: choice.finish_reason ?? 'stop',
    };
  }

  async chatStream(
    params: Omit<ChatParams, 'tools'>
  ): Promise<AsyncIterable<StreamChunk>> {
    const response = await client.chat.completions.create({
      model: params.model,
      messages: toOpenAIMessages(params.messages),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1000,
      stream: true,
      ...(params.reasoningEffort ? { reasoning_effort: params.reasoningEffort } : {}),
    });

    return streamAdapter(response);
  }

  async quickChat(params: {
    model: string;
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const response = await client.chat.completions.create({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1000,
    });
    return response.choices[0]?.message?.content?.trim() ?? '';
  }
}

// ── Format translators ──────────────────────────

function toOpenAIMessages(
  messages: ChatMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    if (msg.role === 'tool' && msg.toolCallId) {
      return {
        role: 'tool' as const,
        tool_call_id: msg.toolCallId,
        content: msg.content ?? '',
      };
    }

    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant' as const,
        content: msg.content,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.functionName,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      };
    }

    // User messages with image attachments → content array for Vision
    if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
      const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
      if (msg.content) {
        contentParts.push({ type: 'text', text: msg.content });
      }
      for (const att of msg.attachments) {
        if (att.type === 'image') {
          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.data}`, detail: 'auto' },
          });
        }
      }
      return { role: 'user' as const, content: contentParts };
    }

    return {
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content ?? '',
    };
  });
}

function toOpenAITools(
  tools: ToolDefinition[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: t.function,
  }));
}

function fromOpenAIMessage(
  msg: OpenAI.Chat.Completions.ChatCompletionMessage
): ChatMessage {
  const result: ChatMessage = {
    role: 'assistant',
    content: msg.content,
  };

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    result.toolCalls = msg.tool_calls
      .filter((tc) => tc.type === 'function')
      .map((tc) => ({
        id: tc.id,
        functionName: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
  }

  return result;
}

async function* streamAdapter(
  response: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): AsyncIterable<StreamChunk> {
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { content };
    }
  }
}
