/**
 * Gateway Hub — WebSocket Connection Manager
 *
 * Singleton that manages all active device WebSocket connections.
 * Handles registration, heartbeat, and message dispatch.
 *
 * Architecture:
 * - Each WebSocket is identified by a deviceId after registration
 * - Connections are indexed by userId for fast fan-out
 * - Heartbeat timeout marks stale connections as offline
 */

import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import {
  validateClientMessage,
  createAckMessage,
  createErrorMessage,
  type ClientMessage,
  type ServerMessage,
  type RegisterPayload,
  type ToolResultPayload,
} from './protocol';
import {
  validateDeviceSession,
  setDeviceOnline,
  setDeviceOffline,
  touchDevice,
} from './device-registry';
import {
  claimGatewayToolCallForInstance,
  completeGatewayToolCall,
  expireStaleGatewayToolCalls,
  failGatewayToolCall,
  type GatewayToolCallJob,
} from './dispatch-queue';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DeviceConnection {
  ws: WebSocket;
  deviceId: string;
  userId: string;
  platform: string;
  capabilities: string[];
  connectedAt: Date;
  lastHeartbeat: Date;
}

type ToolResultCallback = (result: ToolResultPayload) => void;
type DeviceEventCallback = (userId: string, deviceId: string, event: string, data: unknown) => void;

// ──────────────────────────────────────────────
// Hub Singleton
// ──────────────────────────────────────────────

const HEARTBEAT_TIMEOUT_MS = 90_000; // 90s without heartbeat → disconnect
const HEARTBEAT_CHECK_INTERVAL_MS = 30_000;
const REGISTER_TIMEOUT_MS = 10_000; // Must register within 10s of connecting
const DISPATCH_POLL_INTERVAL_MS = Math.max(parseInt(process.env.GATEWAY_DISPATCH_POLL_MS || '500', 10), 100);

class GatewayHub {
  private readonly startedAt = Date.now();
  private readonly instanceId = process.env.HOSTNAME || randomUUID();
  private readonly counters = {
    registrationsTotal: 0,
    registrationAuthFailuresTotal: 0,
    heartbeatsTotal: 0,
    eventsTotal: 0,
    disconnectsTotal: 0,
    toolCallsSentTotal: 0,
    toolCallTimeoutsTotal: 0,
    toolCallResultsSuccessTotal: 0,
    toolCallResultsErrorTotal: 0,
  };
  /** deviceId → connection */
  private connections = new Map<string, DeviceConnection>();
  /** userId → Set<deviceId> for fast lookup */
  private userDevices = new Map<string, Set<string>>();
  /** requestId → pending tool call callback */
  private pendingToolCalls = new Map<string, { callback: ToolResultCallback; timer: NodeJS.Timeout }>();
  /** unregistered sockets waiting to register */
  private pendingRegistrations = new Map<WebSocket, NodeJS.Timeout>();
  /** event listeners */
  private eventListeners: DeviceEventCallback[] = [];
  /** heartbeat sweeper */
  private heartbeatTimer: NodeJS.Timeout | null = null;
  /** distributed dispatch worker */
  private dispatchTimer: NodeJS.Timeout | null = null;
  private dispatchInFlight = false;

  constructor() {
    this.startHeartbeatSweeper();
    this.startDistributedDispatchWorker();
  }

  // ──────────────────────────────────────────
  // Connection lifecycle
  // ──────────────────────────────────────────

  /** Accept a new WebSocket and wait for registration */
  handleConnection(ws: WebSocket) {
    // Set a timeout — device must register within 10s
    const timeout = setTimeout(() => {
      if (this.pendingRegistrations.has(ws)) {
        this.sendTo(ws, createErrorMessage('Registration timeout'));
        ws.close(4001, 'Registration timeout');
        this.pendingRegistrations.delete(ws);
      }
    }, REGISTER_TIMEOUT_MS);

    this.pendingRegistrations.set(ws, timeout);

    ws.on('message', (data: Buffer) => {
      try {
        const raw = JSON.parse(data.toString());
        this.handleMessage(ws, raw);
      } catch {
        this.sendTo(ws, createErrorMessage('Invalid JSON'));
      }
    });

    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', () => this.handleDisconnect(ws));
  }

  private async handleMessage(ws: WebSocket, raw: unknown) {
    const { msg, error } = validateClientMessage(raw);
    if (error || !msg) {
      this.sendTo(ws, createErrorMessage(error || 'Invalid message'));
      return;
    }

    switch (msg.type) {
      case 'register':
        await this.handleRegister(ws, msg.payload as RegisterPayload);
        break;

      case 'tool_result':
        this.handleToolResult(msg.requestId!, msg.payload as ToolResultPayload);
        break;

      case 'heartbeat':
        this.handleHeartbeat(ws);
        break;

      case 'event':
        this.handleDeviceEvent(ws, msg);
        break;
    }
  }

  private async handleRegister(ws: WebSocket, payload: RegisterPayload) {
    // Clear pending registration timeout
    const timeout = this.pendingRegistrations.get(ws);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingRegistrations.delete(ws);
    }

    // Validate session token
    const device = await validateDeviceSession(payload.token);
    if (!device) {
      this.counters.registrationAuthFailuresTotal += 1;
      this.sendTo(ws, createErrorMessage('Invalid or expired session token'));
      ws.close(4002, 'Authentication failed');
      return;
    }

    // If this device already has an active connection, close the old one
    const existingConn = this.connections.get(device.id);
    if (existingConn) {
      existingConn.ws.close(4003, 'Replaced by new connection');
      this.removeConnection(device.id);
    }

    // Create connection record
    const conn: DeviceConnection = {
      ws,
      deviceId: device.id,
      userId: device.userId,
      platform: payload.platform,
      capabilities: payload.capabilities,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    // Index by deviceId and userId
    this.connections.set(device.id, conn);
    if (!this.userDevices.has(device.userId)) {
      this.userDevices.set(device.userId, new Set());
    }
    this.userDevices.get(device.userId)!.add(device.id);

    // Mark online in DB
    await setDeviceOnline(device.id).catch(console.error);
    this.counters.registrationsTotal += 1;

    // Send ack
    this.sendTo(ws, createAckMessage());

    console.log(`[Gateway] Device registered: ${device.id} (${payload.platform}) for user ${device.userId}`);
  }

  private handleToolResult(requestId: string, payload: ToolResultPayload) {
    const pending = this.pendingToolCalls.get(requestId);
    if (!pending) return; // Already timed out or unknown

    clearTimeout(pending.timer);
    this.pendingToolCalls.delete(requestId);

    if (payload.success) {
      this.counters.toolCallResultsSuccessTotal += 1;
    } else {
      this.counters.toolCallResultsErrorTotal += 1;
    }

    pending.callback(payload);
  }

  private handleHeartbeat(ws: WebSocket) {
    const conn = this.findConnectionByWs(ws);
    if (conn) {
      conn.lastHeartbeat = new Date();
      touchDevice(conn.deviceId).catch(console.error);
    }
    this.counters.heartbeatsTotal += 1;
    this.sendTo(ws, createAckMessage());
  }

  private handleDeviceEvent(ws: WebSocket, msg: ClientMessage) {
    const conn = this.findConnectionByWs(ws);
    if (!conn) return;

    const payload = msg.payload as { event: string; data: unknown };
    this.counters.eventsTotal += 1;
    for (const listener of this.eventListeners) {
      try {
        listener(conn.userId, conn.deviceId, payload.event, payload.data);
      } catch (err) {
        console.error('[Gateway] Event listener error:', err);
      }
    }
  }

  private async handleDisconnect(ws: WebSocket) {
    // Clean up pending registration if never registered
    const regTimeout = this.pendingRegistrations.get(ws);
    if (regTimeout) {
      clearTimeout(regTimeout);
      this.pendingRegistrations.delete(ws);
      return;
    }

    // Find and remove registered connection
    const conn = this.findConnectionByWs(ws);
    if (conn) {
      console.log(`[Gateway] Device disconnected: ${conn.deviceId}`);
      await setDeviceOffline(conn.deviceId).catch(console.error);
      this.removeConnection(conn.deviceId);
      this.counters.disconnectsTotal += 1;
    }
  }

  // ──────────────────────────────────────────
  // Tool call dispatch
  // ──────────────────────────────────────────

  /**
   * Send a tool call to a specific device and wait for the result.
   * Returns a Promise that resolves with the result or rejects on timeout.
   */
  sendToolCall(
    deviceId: string,
    tool: string,
    params: Record<string, unknown>,
    timeoutMs = 30_000
  ): Promise<ToolResultPayload> {
    return new Promise((resolve, reject) => {
      const conn = this.connections.get(deviceId);
      if (!conn) {
        reject(new Error(`Device ${deviceId} is not connected`));
        return;
      }

      const requestId = randomUUID();

      const timer = setTimeout(() => {
        this.pendingToolCalls.delete(requestId);
        this.counters.toolCallTimeoutsTotal += 1;
        reject(new Error(`Tool call ${tool} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingToolCalls.set(requestId, { callback: resolve, timer });

      const message: ServerMessage = {
        type: 'tool_call',
        requestId,
        payload: { tool, params },
      };

      this.sendTo(conn.ws, message);
      this.counters.toolCallsSentTotal += 1;
    });
  }

  /**
   * Send a tool call to the best available device for a user with the required capability.
   * Prefers the most recently active device.
   */
  async sendToolCallToUser(
    userId: string,
    capability: string,
    tool: string,
    params: Record<string, unknown>,
    timeoutMs = 30_000
  ): Promise<ToolResultPayload> {
    const deviceIds = this.userDevices.get(userId);
    if (!deviceIds || deviceIds.size === 0) {
      throw new Error(`No devices connected for user ${userId}`);
    }

    // Find a connected device with the required capability
    let bestDevice: DeviceConnection | null = null;
    for (const deviceId of deviceIds) {
      const conn = this.connections.get(deviceId);
      if (conn && conn.capabilities.includes(capability) && conn.ws.readyState === WebSocket.OPEN) {
        if (!bestDevice || conn.lastHeartbeat > bestDevice.lastHeartbeat) {
          bestDevice = conn;
        }
      }
    }

    if (!bestDevice) {
      throw new Error(`No online device with capability "${capability}" for user ${userId}`);
    }

    return this.sendToolCall(bestDevice.deviceId, tool, params, timeoutMs);
  }

  // ──────────────────────────────────────────
  // Queries
  // ──────────────────────────────────────────

  /** Get all connected devices for a user */
  getConnectedDevices(userId: string): DeviceConnection[] {
    const deviceIds = this.userDevices.get(userId);
    if (!deviceIds) return [];

    const result: DeviceConnection[] = [];
    for (const deviceId of deviceIds) {
      const conn = this.connections.get(deviceId);
      if (conn && conn.ws.readyState === WebSocket.OPEN) {
        result.push(conn);
      }
    }
    return result;
  }

  /** Check if a user has any device with a given capability online */
  hasCapability(userId: string, capability: string): boolean {
    const devices = this.getConnectedDevices(userId);
    return devices.some(d => d.capabilities.includes(capability));
  }

  /** Get combined capabilities across all connected devices for a user */
  getUserCapabilities(userId: string): string[] {
    const devices = this.getConnectedDevices(userId);
    const caps = new Set<string>();
    for (const d of devices) {
      for (const c of d.capabilities) {
        caps.add(c);
      }
    }
    return Array.from(caps);
  }

  /** Register an event listener for device events */
  onDeviceEvent(callback: DeviceEventCallback) {
    this.eventListeners.push(callback);
  }

  /** Hub stats for health/monitoring */
  getStats() {
    return {
      instanceId: this.instanceId,
      uptimeMs: Date.now() - this.startedAt,
      totalConnections: this.connections.size,
      totalUsers: this.userDevices.size,
      pendingToolCalls: this.pendingToolCalls.size,
      pendingRegistrations: this.pendingRegistrations.size,
      counters: this.counters,
    };
  }

  // ──────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────

  private sendTo(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private findConnectionByWs(ws: WebSocket): DeviceConnection | undefined {
    for (const conn of this.connections.values()) {
      if (conn.ws === ws) return conn;
    }
    return undefined;
  }

  private removeConnection(deviceId: string) {
    const conn = this.connections.get(deviceId);
    if (!conn) return;

    this.connections.delete(deviceId);
    const userSet = this.userDevices.get(conn.userId);
    if (userSet) {
      userSet.delete(deviceId);
      if (userSet.size === 0) {
        this.userDevices.delete(conn.userId);
      }
    }
  }

  private startHeartbeatSweeper() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [deviceId, conn] of this.connections) {
        if (now - conn.lastHeartbeat.getTime() > HEARTBEAT_TIMEOUT_MS) {
          console.log(`[Gateway] Heartbeat timeout for device ${deviceId}`);
          conn.ws.close(4004, 'Heartbeat timeout');
          setDeviceOffline(deviceId).catch(console.error);
          this.removeConnection(deviceId);
        }
      }
    }, HEARTBEAT_CHECK_INTERVAL_MS);
    this.heartbeatTimer.unref();
  }

  private getLocalRoutingContext(): { userIds: string[]; capabilities: string[] } {
    const userIds = new Set<string>();
    const capabilities = new Set<string>();

    for (const conn of this.connections.values()) {
      if (conn.ws.readyState !== WebSocket.OPEN) continue;
      userIds.add(conn.userId);
      for (const capability of conn.capabilities) {
        capabilities.add(capability);
      }
    }

    return {
      userIds: Array.from(userIds),
      capabilities: Array.from(capabilities),
    };
  }

  private async processDistributedDispatchTick() {
    if (this.dispatchInFlight) return;

    const context = this.getLocalRoutingContext();
    if (context.userIds.length === 0 || context.capabilities.length === 0) {
      return;
    }

    this.dispatchInFlight = true;
    let job: GatewayToolCallJob | null = null;

    try {
      if (Math.random() < 0.02) {
        void expireStaleGatewayToolCalls().catch(() => {});
      }

      job = await claimGatewayToolCallForInstance(
        this.instanceId,
        context.userIds,
        context.capabilities,
      );

      if (!job) {
        return;
      }

      const timeoutMs = Math.max(1000, job.expiresAt.getTime() - Date.now());
      const result = await this.sendToolCallToUser(
        job.userId,
        job.requiredCapability,
        job.tool,
        job.params,
        timeoutMs,
      );

      await completeGatewayToolCall(job.id, result);
    } catch (error) {
      if (job) {
        const message = error instanceof Error ? error.message : 'Distributed tool call processing failed';
        await failGatewayToolCall(job.id, message).catch(() => {});
      }
    } finally {
      this.dispatchInFlight = false;
    }
  }

  private startDistributedDispatchWorker() {
    this.dispatchTimer = setInterval(() => {
      void this.processDistributedDispatchTick();
    }, DISPATCH_POLL_INTERVAL_MS);
    this.dispatchTimer.unref();
  }

  /** Graceful shutdown */
  shutdown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
    }

    for (const pending of this.pendingToolCalls.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingToolCalls.clear();

    for (const conn of this.connections.values()) {
      conn.ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();
    this.userDevices.clear();
  }
}

// ──────────────────────────────────────────────
// Global singleton (survives HMR in dev)
// ──────────────────────────────────────────────

const globalForGateway = globalThis as unknown as { gatewayHub: GatewayHub | undefined };

export const gatewayHub = globalForGateway.gatewayHub ?? new GatewayHub();

if (process.env.NODE_ENV !== 'production') {
  globalForGateway.gatewayHub = gatewayHub;
}
