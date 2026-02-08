/**
 * Model Registry — available AI models exposed as intelligence levels.
 *
 * Users never see raw model names. Instead they pick a "level" label
 * (e.g. "Standard", "Advanced", "Max") that maps to a concrete provider model
 * behind the scenes.
 *
 * Credit costs scale with model capability. Standard (0 credits) is the free
 * fallback when credits are depleted.
 */

export interface ModelConfig {
  /** Internal model ID sent to the provider API */
  id: string;
  /** User-facing intelligence-level label (no model name) */
  label: string;
  /** Short name kept for backward compat / DB references */
  name: string;
  provider: 'openai' | 'anthropic';
  /** User-facing description (no model names) */
  description: string;
  maxTokens: number;
  /** Sort order in UI (lower = first) */
  order: number;
  /** Emoji indicator for the intelligence level */
  icon: string;
  /** Credits consumed per message. 0 = free fallback. */
  creditCost: number;
  /** Whether the model supports reasoning_effort / extended thinking */
  supportsReasoning: boolean;
  /** Gradient CSS class for fancy UI cards */
  gradient: string;
  /** Short tagline for credit cost display */
  costLabel: string;
}

export const MODELS: Record<string, ModelConfig> = {
  // ── Free fallback ───────────────────────────
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    label: 'Standard',
    name: 'Standard',
    provider: 'openai',
    description: 'Fast and efficient for everyday tasks',
    maxTokens: 4096,
    order: 1,
    icon: '⚡',
    creditCost: 0,
    supportsReasoning: false,
    gradient: 'from-slate-500 to-zinc-600',
    costLabel: 'Free',
  },
  // ── Credit-gated models ─────────────────────
  'gpt-5.2': {
    id: 'gpt-5.2',
    label: 'Advanced',
    name: 'Advanced',
    provider: 'openai',
    description: 'Smarter reasoning and deeper analysis',
    maxTokens: 8192,
    order: 2,
    icon: '🧠',
    creditCost: 3,
    supportsReasoning: true,
    gradient: 'from-blue-500 to-cyan-500',
    costLabel: '3 credits',
  },
  'claude-sonnet-4-5': {
    id: 'claude-sonnet-4-5',
    label: 'Creative',
    name: 'Creative',
    provider: 'anthropic',
    description: 'Excellent for writing, creativity and nuance',
    maxTokens: 8192,
    order: 3,
    icon: '✨',
    creditCost: 4,
    supportsReasoning: false,
    gradient: 'from-amber-500 to-orange-500',
    costLabel: '4 credits',
  },
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    label: 'Max',
    name: 'Max',
    provider: 'anthropic',
    description: 'Peak intelligence for complex problems',
    maxTokens: 16384,
    order: 4,
    icon: '🚀',
    creditCost: 8,
    supportsReasoning: false,
    gradient: 'from-violet-500 to-fuchsia-500',
    costLabel: '8 credits',
  },
  'gpt-5.2-pro': {
    id: 'gpt-5.2-pro',
    label: 'Genius',
    name: 'Genius',
    provider: 'openai',
    description: 'Maximum capability for the hardest challenges',
    maxTokens: 32768,
    order: 5,
    icon: '💎',
    creditCost: 20,
    supportsReasoning: true,
    gradient: 'from-rose-500 to-pink-600',
    costLabel: '20 credits',
  },
};

export const DEFAULT_MODEL = 'gpt-5-mini';

/** The free fallback model used when user has no credits */
export const FREE_MODEL = 'gpt-5-mini';

/** Models in display order */
export const MODEL_LIST = Object.values(MODELS).sort((a, b) => a.order - b.order);

export function getModelConfig(modelId: string): ModelConfig {
  return MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
}

/** Valid reasoning effort levels for OpenAI models that support it */
export const REASONING_LEVELS = ['low', 'medium', 'high'] as const;
export type ReasoningLevel = (typeof REASONING_LEVELS)[number];
