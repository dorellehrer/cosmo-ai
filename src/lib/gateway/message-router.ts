/**
 * Gateway Hub — Message Router
 *
 * Routes tool calls to connected devices based on required capabilities.
 * Falls back to server-side execution when no device is available.
 *
 * Usage from chat route:
 *   const result = await routeToolCall(userId, 'imessage.send', { to: '...', text: '...' });
 */

import { gatewayHub } from './hub';
import { getRequiredCapability, isDeviceTool, toGatewayToolName } from './tools';
import type { ToolResultPayload } from './protocol';
import { getOnlineDevices } from './device-registry';
import { awaitGatewayToolCallResult, enqueueGatewayToolCall } from './dispatch-queue';

// ──────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────

export interface RouteResult {
  /** Whether the tool was routed to a device (true) or handled server-side (false) */
  routed: boolean;
  /** The device ID that handled the call, if routed */
  deviceId?: string;
  /** The result payload */
  result: ToolResultPayload;
}

/**
 * Route a tool call to the appropriate device.
 *
 * Steps:
 * 1. Determine required capability from tool name
 * 2. Find connected device with that capability
 * 3. Dispatch and wait for result
 *
 * Throws if no device is available and the tool requires a device.
 */
export async function routeToolCall(
  userId: string,
  tool: string,
  params: Record<string, unknown>,
  timeoutMs = 30_000
): Promise<RouteResult> {
  const routedTool = toGatewayToolName(tool);
  const capability = getRequiredCapability(routedTool);

  if (!capability) {
    // Not a device tool — should be handled server-side
    return {
      routed: false,
      result: { success: false, error: `Unknown device tool: ${tool}` },
    };
  }

  // Check if any connected device has the capability
  if (!gatewayHub.hasCapability(userId, capability)) {
    const clusterDevices = await getOnlineDevices(userId, capability);

    if (clusterDevices.length > 0) {
      const queuedCall = await enqueueGatewayToolCall({
        userId,
        requiredCapability: capability,
        tool: routedTool,
        params,
        timeoutMs,
      });

      const queuedResult = await awaitGatewayToolCallResult(queuedCall.id, timeoutMs);

      if (queuedResult.success) {
        return {
          routed: true,
          deviceId: queuedResult.processorInstance || undefined,
          result: queuedResult.result,
        };
      }

      return {
        routed: false,
        result: queuedResult.result,
      };
    }

    return {
      routed: false,
      result: {
        success: false,
        error: `No device with "${capability}" capability is currently online. Please ensure your Nova desktop app is running.`,
      },
    };
  }

  try {
    const result = await gatewayHub.sendToolCallToUser(
      userId,
      capability,
      routedTool,
      params,
      timeoutMs
    );

    // Find which device handled it (for logging)
    const devices = gatewayHub.getConnectedDevices(userId);
    const handler = devices.find(d => d.capabilities.includes(capability));

    return {
      routed: true,
      deviceId: handler?.deviceId,
      result,
    };
  } catch (err) {
    return {
      routed: false,
      result: {
        success: false,
        error: err instanceof Error ? err.message : 'Device tool call failed',
      },
    };
  }
}

/**
 * Check which device-side capabilities are available for a user right now.
 * Useful for the chat system prompt to tell the AI what tools are available.
 */
export function getAvailableDeviceCapabilities(userId: string): string[] {
  return gatewayHub.getUserCapabilities(userId);
}

export async function getAvailableDeviceCapabilitiesDistributed(userId: string): Promise<string[]> {
  const onlineDevices = await getOnlineDevices(userId);
  const capabilities = new Set<string>();

  for (const device of onlineDevices) {
    for (const capability of device.capabilities) {
      capabilities.add(capability);
    }
  }

  return Array.from(capabilities);
}

/**
 * Check if a specific tool can be routed to a device for this user.
 */
export function canRouteToDevice(userId: string, tool: string): boolean {
  if (!isDeviceTool(tool)) return false;
  const capability = getRequiredCapability(tool);
  if (!capability) return false;
  return gatewayHub.hasCapability(userId, capability);
}

/**
 * Get summary of connected devices for a user (for system prompt / UI).
 */
export function getDeviceSummary(userId: string): {
  deviceCount: number;
  capabilities: string[];
  devices: Array<{ deviceId: string; platform: string; capabilities: string[] }>;
} {
  const devices = gatewayHub.getConnectedDevices(userId);
  const allCaps = new Set<string>();
  const deviceList = devices.map(d => {
    for (const c of d.capabilities) allCaps.add(c);
    return {
      deviceId: d.deviceId,
      platform: d.platform,
      capabilities: d.capabilities,
    };
  });

  return {
    deviceCount: deviceList.length,
    capabilities: Array.from(allCaps),
    devices: deviceList,
  };
}

export async function getDistributedDeviceSummary(userId: string): Promise<{
  deviceCount: number;
  capabilities: string[];
  devices: Array<{ deviceId: string; platform: string; capabilities: string[] }>;
  localDeviceCount: number;
}> {
  const localSummary = getDeviceSummary(userId);
  const onlineDevices = await getOnlineDevices(userId);

  const capabilities = new Set<string>();
  const devices = onlineDevices.map((device) => {
    for (const capability of device.capabilities) {
      capabilities.add(capability);
    }

    return {
      deviceId: device.id,
      platform: device.platform,
      capabilities: device.capabilities,
    };
  });

  return {
    deviceCount: devices.length,
    capabilities: Array.from(capabilities),
    devices,
    localDeviceCount: localSummary.deviceCount,
  };
}
