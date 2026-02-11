/**
 * GET  /api/gateway/devices — List user's devices
 * POST /api/gateway/devices — Register a new device + create session token
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import {
  listDevices,
  registerDevice,
  createDeviceSession,
} from '@/lib/gateway/device-registry';
import { GATEWAY_PROTOCOL_VERSION } from '@/lib/gateway/protocol';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`devices:${session.user.id}`, RATE_LIMIT_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const devices = await listDevices(session.user.id);
    return NextResponse.json({ devices });
  } catch (error) {
    console.error('List devices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`devices:${session.user.id}`, RATE_LIMIT_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const body = await request.json();

    const { name, platform, capabilities, metadata } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!platform || !['macos', 'ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json({ error: 'platform must be macos, ios, android, or web' }, { status: 400 });
    }
    if (!Array.isArray(capabilities)) {
      return NextResponse.json({ error: 'capabilities must be an array' }, { status: 400 });
    }

    // Register the device (upserts if same name+platform exists)
    const device = await registerDevice(session.user.id, {
      name,
      platform,
      capabilities,
      metadata: metadata ?? undefined,
    });

    // Create a session token for WebSocket auth
    const deviceSession = await createDeviceSession(device.id);

    // Build WS endpoint URL — standalone server runs on GATEWAY_WS_PORT (default 3001)
    const wsPort = process.env.GATEWAY_WS_PORT || '3001';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${wsPort}`;
    const wsProtocol = appUrl.startsWith('https') ? 'wss' : 'ws';
    const host = new URL(appUrl).hostname;
    const wsEndpoint = `${wsProtocol}://${host}:${wsPort}/ws`;

    return NextResponse.json({
      device,
      session: {
        token: deviceSession.token,
        expiresAt: deviceSession.expiresAt,
      },
      wsEndpoint,
      protocolVersion: GATEWAY_PROTOCOL_VERSION,
    }, { status: 201 });
  } catch (error) {
    console.error('Register device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
