/**
 * Model Registry — available AI models exposed as intelligence levels.
 *
 * Users never see raw model names. Instead they pick a "level" label
 * (e.g. "Standard", "Advanced", "Max") that maps to a concrete provider model
 * behind the scenes.
 */

export interface ModelConfig {
  /** Internal model ID sent to the provider API */
  id: string;
  /** User-facing intelligence-level label (no model name) */
  label: string;
  /** Short name kept for backward compat / DB references */
  name: string;
  provider: 'openai' | 'anthropic';
  tier: 'standard' | 'pro';
  /** User-facing description (no model names) */
  description: string;
  maxTokens: number;
  /** Sort order in UI (lower = first) */
  order: number;
  /** Emoji indicator for the intelligence level */
  icon: string;
}

export const MODELS: Record<string, ModelConfig> = {
  // ── Standard tier (trial + pro) ─────────────
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    label: 'Standard',
    name: 'Standard',
    provider: 'openai',
    tier: 'standard',
    description: 'Fast and efficient for everyday tasks',
    maxTokens: 4096,
    order: 1,
    icon: '⚡',
  },
  // ── Pro tier ────────────────────────────────
  'gpt-4o': {
    id: 'gpt-4o',
    label: 'Advanced',
    name: 'Advanced',
    provider: 'openai',
    tier: 'pro',
    description: 'Smarter reasoning and deeper analysis',
    maxTokens: 4096,
    order: 2,
    icon: '🧠',
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    label: 'Creative',
    name: 'Creative',
    provider: 'anthropic',
    tier: 'pro',
    description: 'Excellent for writing, creativity and nuance',
    maxTokens: 4096,
    order: 3,
    icon: '✨',
  },
  'gpt-4.5-preview': {
    id: 'gpt-4.5-preview',
    label: 'Max',
    name: 'Max',
    provider: 'openai',
    tier: 'pro',
    description: 'Most powerful — complex problems and research',
    maxTokens: 16384,
    order: 4,
    icon: '🚀',
  },
  'claude-opus-4-0-20250514': {
    id: 'claude-opus-4-0-20250514',
    label: 'Genius',
    name: 'Genius',
    provider: 'anthropic',
    tier: 'pro',
    description: 'Peak intelligence for the hardest challenges',
    maxTokens: 16384,
    order: 5,
    icon: '💎',
  },
};

export const DEFAULT_MODEL = 'gpt-4o-mini';

/** Models in display order */
export const MODEL_LIST = Object.values(MODELS).sort((a, b) => a.order - b.order);

export function getModelConfig(modelId: string): ModelConfig {
  return MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
}
