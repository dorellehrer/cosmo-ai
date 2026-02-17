/**
 * Gateway Hub — Device Registry
 *
 * CRUD operations for devices and device sessions.
 * Manages device presence (online/offline) and session tokens.
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

const DEVICE_FRESHNESS_WINDOW_MS = 2 * 60 * 1000;

function getFreshnessThreshold() {
  return new Date(Date.now() - DEVICE_FRESHNESS_WINDOW_MS);
}

// ──────────────────────────────────────────────
// Device CRUD
// ──────────────────────────────────────────────

/** Register a new device or return existing one for the same user+platform+name */
export async function registerDevice(
  userId: string,
  data: {
    name: string;
    platform: string;
    capabilities: string[];
    metadata?: Record<string, unknown>;
  }
) {
  // Upsert: if same user already has a device with this name+platform, update it
  const existing = await prisma.device.findFirst({
    where: { userId, name: data.name, platform: data.platform },
  });

  if (existing) {
    return prisma.device.update({
      where: { id: existing.id },
      data: {
        capabilities: data.capabilities,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        lastSeenAt: new Date(),
      },
    });
  }

  return prisma.device.create({
    data: {
      userId,
      name: data.name,
      platform: data.platform,
      capabilities: data.capabilities,
      metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      isOnline: false,
      lastSeenAt: new Date(),
    },
  });
}

/** List all devices for a user */
export async function listDevices(userId: string) {
  return prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
  });
}

/** Get a single device by ID (with ownership check) */
export async function getDevice(deviceId: string, userId: string) {
  return prisma.device.findFirst({
    where: { id: deviceId, userId },
  });
}

/** Update device capabilities or metadata */
export async function updateDevice(
  deviceId: string,
  userId: string,
  data: { name?: string; capabilities?: string[]; metadata?: Record<string, unknown> }
) {
  // Ownership check
  const device = await prisma.device.findFirst({ where: { id: deviceId, userId } });
  if (!device) return null;

  return prisma.device.update({
    where: { id: deviceId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.capabilities && { capabilities: data.capabilities }),
      ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
    },
  });
}

/** Delete a device and its sessions */
export async function deleteDevice(deviceId: string, userId: string) {
  const device = await prisma.device.findFirst({ where: { id: deviceId, userId } });
  if (!device) return false;

  await prisma.device.delete({ where: { id: deviceId } });
  return true;
}

// ──────────────────────────────────────────────
// Presence
// ──────────────────────────────────────────────

/** Mark a device as online and update lastSeenAt */
export async function setDeviceOnline(deviceId: string) {
  return prisma.device.update({
    where: { id: deviceId },
    data: { isOnline: true, lastSeenAt: new Date() },
  });
}

/** Mark a device as offline */
export async function setDeviceOffline(deviceId: string) {
  return prisma.device.update({
    where: { id: deviceId },
    data: { isOnline: false, lastSeenAt: new Date() },
  });
}

/** Touch lastSeenAt for heartbeat */
export async function touchDevice(deviceId: string) {
  return prisma.device.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });
}

/** Get all online devices for a user, optionally filtered by capability */
export async function getOnlineDevices(userId: string, capability?: string) {
  const freshnessThreshold = getFreshnessThreshold();
  const devices = await prisma.device.findMany({
    where: {
      userId,
      isOnline: true,
      lastSeenAt: { gte: freshnessThreshold },
    },
  });

  if (!capability) return devices;
  return devices.filter(d => d.capabilities.includes(capability));
}

export async function markStaleDevicesOffline() {
  const staleThreshold = getFreshnessThreshold();
  const result = await prisma.device.updateMany({
    where: {
      isOnline: true,
      lastSeenAt: { lt: staleThreshold },
    },
    data: {
      isOnline: false,
    },
  });

  return result.count;
}

export async function getGatewayClusterPresenceStats() {
  const staleThreshold = getFreshnessThreshold();

  const staleOnlineDevices = await prisma.device.count({
    where: { isOnline: true, lastSeenAt: { lt: staleThreshold } },
  });

  if (staleOnlineDevices > 0) {
    await markStaleDevicesOffline();
  }

  const [onlineDevices, byPlatform] = await Promise.all([
    prisma.device.count({ where: { isOnline: true } }),
    prisma.device.groupBy({
      by: ['platform'],
      where: { isOnline: true },
      _count: { _all: true },
    }),
  ]);

  return {
    onlineDevices,
    staleOnlineDevices,
    onlineByPlatform: byPlatform.map((entry) => ({
      platform: entry.platform,
      count: entry._count._all,
    })),
  };
}

// ──────────────────────────────────────────────
// Device Sessions (auth tokens for WS connections)
// ──────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Create a new session token for a device */
export async function createDeviceSession(deviceId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  return prisma.deviceSession.create({
    data: { deviceId, token, expiresAt },
  });
}

/** Validate a session token. Returns the device if valid, null otherwise. */
export async function validateDeviceSession(token: string) {
  const session = await prisma.deviceSession.findUnique({
    where: { token },
    include: { device: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired — clean up
    await prisma.deviceSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.device;
}

/** Revoke all sessions for a device */
export async function revokeDeviceSessions(deviceId: string) {
  await prisma.deviceSession.deleteMany({ where: { deviceId } });
}

/** Clean up expired sessions (call periodically) */
export async function cleanExpiredSessions() {
  const result = await prisma.deviceSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
