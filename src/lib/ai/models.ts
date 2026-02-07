/**
 * Model Registry — available AI models with their metadata.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  tier: 'standard' | 'pro';
  description: string;
  maxTokens: number;
}

export const MODELS: Record<string, ModelConfig> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'standard',
    description: 'Fast and efficient for everyday tasks',
    maxTokens: 4096,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'pro',
    description: 'Most capable OpenAI model',
    maxTokens: 4096,
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet',
    provider: 'anthropic',
    tier: 'pro',
    description: 'Excellent for writing and analysis',
    maxTokens: 4096,
  },
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku',
    provider: 'anthropic',
    tier: 'standard',
    description: 'Quick and lightweight',
    maxTokens: 4096,
  },
};

export const DEFAULT_MODEL = 'gpt-4o-mini';

/** Models in display order */
export const MODEL_LIST = Object.values(MODELS);

export function getModelConfig(modelId: string): ModelConfig {
  return MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
}
