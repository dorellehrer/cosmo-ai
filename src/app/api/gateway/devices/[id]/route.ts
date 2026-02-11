/**
 * GET    /api/gateway/devices/[id] — Get device details
 * PATCH  /api/gateway/devices/[id] — Update device
 * DELETE /api/gateway/devices/[id] — Delete device and revoke sessions
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import {
  getDevice,
  updateDevice,
  deleteDevice,
  revokeDeviceSessions,
} from '@/lib/gateway/device-registry';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const device = await getDevice(id, session.user.id);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    return NextResponse.json({ device });
  } catch (error) {
    console.error('Get device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`devices:${session.user.id}`, RATE_LIMIT_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, capabilities, metadata } = body;

    const device = await updateDevice(id, session.user.id, { name, capabilities, metadata });
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    return NextResponse.json({ device });
  } catch (error) {
    console.error('Update device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Revoke all sessions first, then delete
    await revokeDeviceSessions(id);
    const deleted = await deleteDevice(id, session.user.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
