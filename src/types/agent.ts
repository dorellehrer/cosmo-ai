// Agent instance status lifecycle
export type AgentStatus = 'pending' | 'provisioning' | 'running' | 'stopped' | 'error' | 'destroyed';

// Supported AI model providers
export type ModelProvider = 'openai' | 'anthropic' | 'google';

// Channel types the agent can connect to
export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'gmail' | 'webchat';

// Channel connection status
export type ChannelStatus = 'pending' | 'connected' | 'disconnected' | 'error';

// Skill source
export type SkillSource = 'marketplace' | 'custom' | 'builtin';

// Memory categories
export type MemoryCategory = 'general' | 'preference' | 'task' | 'fact';

// ──────────────────────────────────────────────
// Agent Secret Contracts (AWS Secrets Manager)
// ──────────────────────────────────────────────

export interface ApiKeySecretV1 {
  kind: 'api_key';
  version: 'v1';
  provider: ModelProvider | string;
  apiKey: string;
}

export interface ChannelConfigSecretV1 {
  kind: 'channel_config';
  version: 'v1';
  channelType: ChannelType | string;
  config: Record<string, string>;
}

export type AgentSecretEnvelopeV1 = ApiKeySecretV1 | ChannelConfigSecretV1;

// ──────────────────────────────────────────────
// API Request/Response Types
// ──────────────────────────────────────────────

export interface ProvisionAgentRequest {
  name: string;
  personality: string;
  modelProvider: ModelProvider;
  modelName: string;
  apiKey: string; // User's AI provider API key (stored in Secrets Manager)
}

export interface AgentInstanceResponse {
  id: string;
  name: string;
  personality: string;
  status: AgentStatus;
  modelProvider: ModelProvider;
  modelName: string;
  wsEndpoint: string | null;
  publicIp: string | null;
  heartbeatEnabled: boolean;
  heartbeatInterval: string;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeTimezone: string;
  lastHeartbeat: string | null;
  lastActivity: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AgentChannelResponse {
  id: string;
  channelType: ChannelType;
  channelName: string;
  status: ChannelStatus;
  canSend: boolean;
  canReceive: boolean;
  supportsMedia: boolean;
  supportsGroups: boolean;
  lastMessage: string | null;
  errorMessage: string | null;
}

export interface AgentSkillResponse {
  id: string;
  skillId: string;
  name: string;
  description: string | null;
  version: string;
  enabled: boolean;
  source: SkillSource;
  installedAt: string;
}

export interface AgentMemoryResponse {
  id: string;
  date: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
}

// ──────────────────────────────────────────────
// AWS Configuration
// ──────────────────────────────────────────────

export interface AwsAgentConfig {
  region: string;
  clusterArn: string;
  taskDefinition: string;
  subnets: string[];
  securityGroups: string[];
  containerImage: string;
  cpu: string;
  memory: string;
  executionRoleArn: string;
  taskRoleArn: string;
  logGroupName: string;
}

// ──────────────────────────────────────────────
// Provisioning Events (SSE stream to client)
// ──────────────────────────────────────────────

export type ProvisioningEventType =
  | 'status'       // Status text update
  | 'progress'     // Progress percentage (0-100)
  | 'agent'        // Agent instance data
  | 'error'        // Error message
  | 'done';        // Provisioning complete

export interface ProvisioningEvent {
  type: ProvisioningEventType;
  message?: string;
  progress?: number;
  agent?: AgentInstanceResponse;
  error?: string;
}

// ──────────────────────────────────────────────
// Available Models
// ──────────────────────────────────────────────

export interface ModelOption {
  provider: ModelProvider;
  id: string;
  name: string;
  description: string;
  contextWindow: string;
  pricePerMillion: string; // Input cost per 1M tokens
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    provider: 'openai',
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Fast and affordable, great for most tasks',
    contextWindow: '128K',
    pricePerMillion: '$0.15',
  },
  {
    provider: 'openai',
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Most capable OpenAI model with reasoning',
    contextWindow: '128K',
    pricePerMillion: '$2.50',
  },
  {
    provider: 'anthropic',
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Excellent reasoning and coding abilities',
    contextWindow: '200K',
    pricePerMillion: '$3.00',
  },
  {
    provider: 'anthropic',
    id: 'claude-haiku-3-5',
    name: 'Claude Haiku 3.5',
    description: 'Fast and efficient for everyday tasks',
    contextWindow: '200K',
    pricePerMillion: '$0.25',
  },
  {
    provider: 'google',
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Google\'s fast multimodal model',
    contextWindow: '1M',
    pricePerMillion: '$0.10',
  },
];

// ──────────────────────────────────────────────
// Builtin Skills
// ──────────────────────────────────────────────

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  source: SkillSource;
  defaultEnabled: boolean;
}

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web and summarize results',
    category: 'information',
    icon: '🔍',
    source: 'builtin',
    defaultEnabled: true,
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Set and retrieve reminders in agent memory',
    category: 'productivity',
    icon: '⏰',
    source: 'builtin',
    defaultEnabled: true,
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Current conditions and forecasts',
    category: 'information',
    icon: '🌤️',
    source: 'builtin',
    defaultEnabled: true,
  },
  {
    id: 'datetime',
    name: 'Date & Time',
    description: 'Get current date and time for a timezone',
    category: 'utility',
    icon: '🕒',
    source: 'builtin',
    defaultEnabled: true,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Evaluate math expressions',
    category: 'utility',
    icon: '🧮',
    source: 'builtin',
    defaultEnabled: true,
  },
];

/**
 * Legacy UI skill IDs mapped to executable canonical skill IDs.
 * Keeps older DB records working after ID unification.
 */
export const LEGACY_SKILL_ID_MAP: Record<string, string> = {
  'calendar-manager': 'datetime',
  'email-assistant': 'web-search',
  'smart-home': 'web-search',
  'file-manager': 'calculator',
  'browser-control': 'web-search',
  reminder: 'reminders',
};

export function toCanonicalSkillId(skillId: string): string {
  return LEGACY_SKILL_ID_MAP[skillId] ?? skillId;
}

export function getSkillIdVariants(skillId: string): string[] {
  const canonical = toCanonicalSkillId(skillId);
  const legacyAliases = Object.entries(LEGACY_SKILL_ID_MAP)
    .filter(([, mapped]) => mapped === canonical)
    .map(([legacy]) => legacy);
  return Array.from(new Set([skillId, canonical, ...legacyAliases]));
}
