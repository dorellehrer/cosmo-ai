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
    id: 'calendar-manager',
    name: 'Calendar Manager',
    description: 'View, create, and manage calendar events',
    category: 'productivity',
    icon: '📅',
    source: 'builtin',
    defaultEnabled: true,
  },
  {
    id: 'email-assistant',
    name: 'Email Assistant',
    description: 'Read, draft, and send emails',
    category: 'productivity',
    icon: '📧',
    source: 'builtin',
    defaultEnabled: true,
  },
  {
    id: 'smart-home',
    name: 'Smart Home Control',
    description: 'Control lights, thermostats, and devices',
    category: 'home',
    icon: '🏠',
    source: 'builtin',
    defaultEnabled: false,
  },
  {
    id: 'file-manager',
    name: 'File Manager',
    description: 'Read, write, and organize files',
    category: 'system',
    icon: '📁',
    source: 'builtin',
    defaultEnabled: false,
  },
  {
    id: 'browser-control',
    name: 'Browser Control',
    description: 'Browse the web, fill forms, extract data',
    category: 'automation',
    icon: '🌐',
    source: 'builtin',
    defaultEnabled: false,
  },
  {
    id: 'reminder',
    name: 'Reminders & Tasks',
    description: 'Set reminders and manage to-do lists',
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
];
