/**
 * AI Provider abstraction — normalizes OpenAI and Anthropic APIs
 * behind a common interface for chat completions and streaming.
 */

// ── Normalized types ────────────────────────────

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  functionName: string;
  arguments: Record<string, unknown>;
}

export interface FileAttachment {
  type: 'image' | 'document';
  name: string;
  mimeType: string;
  data: string; // base64 for images, extracted text for documents
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCalls?: ToolCall[];
  toolCallId?: string; // For tool result messages
  attachments?: FileAttachment[]; // For file uploads (images, PDFs, CSVs)
}

export interface ChatResponse {
  message: ChatMessage;
  finishReason: 'stop' | 'tool_calls' | string;
}

export interface StreamChunk {
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  /** Reasoning effort for models that support it (e.g. GPT-5.2) */
  reasoningEffort?: 'low' | 'medium' | 'high';
}

// ── Provider interface ──────────────────────────

export interface AIProvider {
  readonly name: string;

  /** Non-streaming completion (used for tool call rounds) */
  chat(params: ChatParams): Promise<ChatResponse>;

  /** Streaming completion (used for final response) */
  chatStream(params: Omit<ChatParams, 'tools'>): Promise<AsyncIterable<StreamChunk>>;

  /** Quick one-shot completion (for internal tools like translate, summarize) */
  quickChat(params: {
    model: string;
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}

// ── Factory ─────────────────────────────────────

import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

export function createProvider(provider: 'openai' | 'anthropic'): AIProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
