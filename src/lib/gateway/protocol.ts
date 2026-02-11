/**
 * Gateway Hub — WebSocket Protocol Types & Validation
 *
 * Defines the message protocol between the Gateway Hub (cloud)
 * and connected devices (Electron, iOS, Android, web).
 */

/** Increment when message schema changes in a breaking way. */
export const GATEWAY_PROTOCOL_VERSION = '1';

// ──────────────────────────────────────────────
// Client → Server messages
// ──────────────────────────────────────────────

/** Registration payload sent by a device after connecting */
export interface RegisterPayload {
  token: string;        // DeviceSession token
  platform: 'macos' | 'ios' | 'android' | 'web';
  version: string;      // App version (e.g., "1.2.0")
  capabilities: string[]; // e.g., ["imessage", "files", "voice", "hue"]
}

/** Result of a tool call execution on the device */
export interface ToolResultPayload {
  success: boolean;
  result?: unknown;
  error?: string;
}

/** Event emitted by a device (e.g., new iMessage received) */
export interface DeviceEventPayload {
  event: string;        // e.g., "imessage.received", "voice.wake"
  data: unknown;
}

export interface ClientMessage {
  type: 'register' | 'tool_result' | 'event' | 'heartbeat';
  requestId?: string;
  payload: RegisterPayload | ToolResultPayload | DeviceEventPayload | Record<string, never>;
}

// ──────────────────────────────────────────────
// Server → Client messages
// ──────────────────────────────────────────────

/** Tool call dispatched to a device for local execution */
export interface ToolCallPayload {
  tool: string;         // e.g., "imessage.send", "files.read"
  params: Record<string, unknown>;
  timeout?: number;     // Optional timeout in ms
}

/** Sync payload for state updates */
export interface SyncPayload {
  type: string;
  data: unknown;
}

export interface ServerMessage {
  type: 'tool_call' | 'sync' | 'config' | 'ack' | 'error';
  requestId?: string;
  payload: ToolCallPayload | SyncPayload | { message: string } | Record<string, never>;
}

// ──────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────

const VALID_CLIENT_TYPES = new Set(['register', 'tool_result', 'event', 'heartbeat']);
const VALID_PLATFORMS = new Set(['macos', 'ios', 'android', 'web']);

/** Validate an incoming client message. Returns an error string or null if valid. */
export function validateClientMessage(raw: unknown): { msg: ClientMessage; error: null } | { msg: null; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { msg: null, error: 'Message must be a JSON object' };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== 'string' || !VALID_CLIENT_TYPES.has(obj.type)) {
    return { msg: null, error: `Invalid message type: ${obj.type}` };
  }

  if (obj.type === 'register') {
    const payload = obj.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload !== 'object') {
      return { msg: null, error: 'register message requires a payload' };
    }
    if (typeof payload.token !== 'string' || payload.token.length === 0) {
      return { msg: null, error: 'register payload requires a non-empty token' };
    }
    if (typeof payload.platform !== 'string' || !VALID_PLATFORMS.has(payload.platform)) {
      return { msg: null, error: `Invalid platform: ${payload.platform}` };
    }
    if (typeof payload.version !== 'string') {
      return { msg: null, error: 'register payload requires a version string' };
    }
    if (!Array.isArray(payload.capabilities)) {
      return { msg: null, error: 'register payload requires a capabilities array' };
    }
  }

  if (obj.type === 'tool_result') {
    if (typeof obj.requestId !== 'string' || obj.requestId.length === 0) {
      return { msg: null, error: 'tool_result requires a requestId' };
    }
    const payload = obj.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload.success !== 'boolean') {
      return { msg: null, error: 'tool_result payload requires a success boolean' };
    }
  }

  return { msg: obj as unknown as ClientMessage, error: null };
}

/** Create a server message to send to a device */
export function createToolCallMessage(requestId: string, tool: string, params: Record<string, unknown>, timeout?: number): ServerMessage {
  return {
    type: 'tool_call',
    requestId,
    payload: { tool, params, ...(timeout !== undefined && { timeout }) } as ToolCallPayload,
  };
}

export function createAckMessage(requestId?: string): ServerMessage {
  return { type: 'ack', requestId, payload: {} };
}

export function createErrorMessage(message: string, requestId?: string): ServerMessage {
  return { type: 'error', requestId, payload: { message } };
}
