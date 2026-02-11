/**
 * Nova AI — Gateway Hub WebSocket Client
 *
 * Connects the Electron desktop app to the Nova Gateway Hub in the cloud.
 * Handles registration, heartbeat, auto-reconnect, and tool call dispatch.
 *
 * Lifecycle:
 *   1. POST /api/gateway/devices → register device, get session token + wsEndpoint
 *   2. Connect to wsEndpoint via WebSocket
 *   3. Send `register` message with token + capabilities
 *   4. Receive `tool_call` messages → dispatch to local automation → send `tool_result`
 *   5. Heartbeat every 30s to keep connection alive
 *   6. Auto-reconnect on disconnect with exponential backoff
 *
 * This module also forwards device events (iMessage received, voice wake, etc.)
 * to the cloud for real-time push.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import os from 'os';

// ──────────────────────────────────────────────
// Types (mirroring src/lib/gateway/protocol.ts)
// ──────────────────────────────────────────────

interface ClientMessage {
  type: 'register' | 'tool_result' | 'event' | 'heartbeat';
  requestId?: string;
  payload: unknown;
}

interface ServerMessage {
  type: 'tool_call' | 'sync' | 'config' | 'ack' | 'error';
  requestId?: string;
  payload: {
    tool?: string;
    params?: Record<string, unknown>;
    timeout?: number;
    message?: string;
  };
}

interface DeviceRegistrationResponse {
  device: {
    id: string;
    name: string;
    platform: string;
    capabilities: string[];
    isOnline: boolean;
  };
  session: {
    token: string;
    expiresAt: string;
  };
  wsEndpoint: string;
  protocolVersion?: string;
}

export interface GatewayClientOptions {
  /** Base URL of the Nova web app (e.g., https://www.heynova.se) */
  appUrl: string;
  /** Session cookie or auth token for the logged-in user */
  sessionCookie: string;
  /** Device display name */
  deviceName?: string;
  /** Capabilities this device advertises */
  capabilities?: string[];
  /** App version */
  version?: string;
}

export type ToolCallHandler = (
  tool: string,
  params: Record<string, unknown>,
) => Promise<{ success: boolean; result?: unknown; error?: string }>;

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const REGISTRATION_TIMEOUT_MS = 15_000;
const EXPECTED_GATEWAY_PROTOCOL_VERSION = '1';

function resolvePlatform(): 'macos' | 'ios' | 'android' | 'web' {
  switch (process.platform) {
    case 'darwin':
      return 'macos';
    default:
      return 'web';
  }
}

// ──────────────────────────────────────────────
// Gateway Client
// ──────────────────────────────────────────────

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  private toolCallHandler: ToolCallHandler | null = null;
  private registered = false;
  private intentionalClose = false;
  private deviceId: string | null = null;
  private sessionToken: string | null = null;
  private wsEndpoint: string | null = null;

  private readonly appUrl: string;
  private readonly sessionCookie: string;
  private readonly deviceName: string;
  private readonly capabilities: string[];
  private readonly appVersion: string;
  private readonly platform: 'macos' | 'ios' | 'android' | 'web';

  constructor(options: GatewayClientOptions) {
    super();
    this.appUrl = options.appUrl.replace(/\/$/, '');
    this.sessionCookie = options.sessionCookie;
    this.deviceName = options.deviceName || `${os.userInfo().username}'s ${os.hostname()}`;
    this.capabilities = options.capabilities || [
      'desktop',
      'files',
    ];
    this.appVersion = options.version || '1.0.0';
    this.platform = resolvePlatform();
  }

  // ── Public API ──────────────────────────────

  /** Register the tool call handler (called when cloud dispatches a tool call) */
  onToolCall(handler: ToolCallHandler): void {
    this.toolCallHandler = handler;
  }

  /** Connect to the Gateway Hub. Registers the device first, then opens WebSocket. */
  async connect(): Promise<void> {
    this.intentionalClose = false;

    try {
      // Step 1: Register device via REST API
      const registration = await this.registerDevice();
      this.deviceId = registration.device.id;
      this.sessionToken = registration.session.token;
      this.wsEndpoint = registration.wsEndpoint;
      if (
        registration.protocolVersion &&
        registration.protocolVersion !== EXPECTED_GATEWAY_PROTOCOL_VERSION
      ) {
        console.warn(
          `[Gateway] Protocol mismatch (server=${registration.protocolVersion}, client=${EXPECTED_GATEWAY_PROTOCOL_VERSION})`,
        );
      }

      console.log(`[Gateway] Device registered: ${this.deviceId}`);
      this.emit('registered', registration.device);

      // Step 2: Connect WebSocket
      await this.connectWebSocket();
    } catch (err) {
      console.error('[Gateway] Connection failed:', err);
      this.emit('error', err);
      this.scheduleReconnect();
    }
  }

  /** Disconnect gracefully */
  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this.emit('disconnected');
    console.log('[Gateway] Disconnected');
  }

  /** Send a device event to the cloud (e.g., iMessage received) */
  sendEvent(event: string, data: unknown): void {
    this.send({
      type: 'event',
      payload: { event, data },
    });
  }

  /** Check if connected and registered */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.registered;
  }

  /** Get the device ID assigned by the server */
  get currentDeviceId(): string | null {
    return this.deviceId;
  }

  // ── REST Registration ───────────────────────

  private async registerDevice(): Promise<DeviceRegistrationResponse> {
    const url = `${this.appUrl}/api/gateway/devices`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.sessionCookie,
      },
      body: JSON.stringify({
        name: this.deviceName,
        platform: this.platform,
        capabilities: this.capabilities,
        metadata: {
          hostname: os.hostname(),
          arch: os.arch(),
          osVersion: os.release(),
          nodeVersion: process.versions.node,
          electronVersion: process.versions.electron,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Device registration failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<DeviceRegistrationResponse>;
  }

  // ── WebSocket Connection ────────────────────

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wsEndpoint || !this.sessionToken) {
        reject(new Error('No WebSocket endpoint or session token'));
        return;
      }

      console.log(`[Gateway] Connecting to ${this.wsEndpoint}`);

      this.ws = new WebSocket(this.wsEndpoint, {
        headers: {
          'User-Agent': `Nova-Electron/${this.appVersion}`,
        },
      });

      const registrationTimeout = setTimeout(() => {
        if (!this.registered) {
          console.error('[Gateway] Registration timeout');
          this.ws?.close();
          reject(new Error('Registration timeout'));
        }
      }, REGISTRATION_TIMEOUT_MS);

      this.ws.on('open', () => {
        console.log('[Gateway] WebSocket connected, sending registration...');
        this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

        // Send registration message
        this.send({
          type: 'register',
          payload: {
            token: this.sessionToken,
            platform: this.platform,
            version: this.appVersion,
            capabilities: this.capabilities,
          },
        });
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString()) as ServerMessage;
          this.handleMessage(msg);

          // Resolve on first ack (registration confirmed)
          if (msg.type === 'ack' && !this.registered) {
            this.registered = true;
            clearTimeout(registrationTimeout);
            this.startHeartbeat();
            this.emit('connected');
            console.log('[Gateway] Registered and connected');
            resolve();
          }
        } catch (err) {
          console.error('[Gateway] Failed to parse message:', err);
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(`[Gateway] WebSocket closed: ${code} ${reason.toString()}`);
        clearTimeout(registrationTimeout);
        this.registered = false;
        this.stopHeartbeat();
        this.emit('disconnected');

        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err: Error) => {
        console.error('[Gateway] WebSocket error:', err.message);
        // Error is always followed by close event, reconnect handled there
      });
    });
  }

  // ── Message Handling ────────────────────────

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'tool_call':
        this.handleToolCall(msg);
        break;

      case 'sync':
        this.emit('sync', msg.payload);
        break;

      case 'config':
        this.emit('config', msg.payload);
        break;

      case 'error':
        console.error('[Gateway] Server error:', msg.payload?.message);
        this.emit('server_error', msg.payload);
        break;

      case 'ack':
        // Handled in connectWebSocket
        break;
    }
  }

  private async handleToolCall(msg: ServerMessage): Promise<void> {
    const { tool, params } = msg.payload || {};
    const requestId = msg.requestId;

    if (!tool || !requestId) {
      console.error('[Gateway] Invalid tool_call: missing tool or requestId');
      return;
    }

    console.log(`[Gateway] Tool call: ${tool} (${requestId})`);
    this.emit('tool_call', { tool, params, requestId });

    if (!this.toolCallHandler) {
      console.error('[Gateway] No tool call handler registered');
      this.send({
        type: 'tool_result',
        requestId,
        payload: { success: false, error: 'No tool handler on this device' },
      });
      return;
    }

    try {
      const result = await this.toolCallHandler(tool, params || {});
      this.send({
        type: 'tool_result',
        requestId,
        payload: result,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[Gateway] Tool call failed: ${tool}:`, errorMessage);
      this.send({
        type: 'tool_result',
        requestId,
        payload: { success: false, error: errorMessage },
      });
    }
  }

  // ── Heartbeat ───────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat', payload: {} });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ── Reconnection ───────────────────────────

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectTimer) return;

    console.log(`[Gateway] Reconnecting in ${this.reconnectDelay}ms...`);
    this.emit('reconnecting', { delay: this.reconnectDelay });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch {
        // connect() already schedules next reconnect on failure
      }
    }, this.reconnectDelay);

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      MAX_RECONNECT_DELAY_MS,
    );
  }

  // ── Helpers ─────────────────────────────────

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnecting');
      }
      this.ws = null;
    }

    this.registered = false;
  }
}
