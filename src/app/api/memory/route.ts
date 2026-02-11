/**
 * Memory API — GET /api/memory (list) and DELETE /api/memory (clear all)
 *
 * GET  ?category=preference&limit=50&offset=0 → list memories
 * DELETE → clear all memories for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listMemories, clearAllMemories, remember } from '@/lib/memory';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      `memory:${session.user.id}`,
      RATE_LIMIT_API,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listMemories(session.user.id, { category, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Memory API] GET error:', error);
    return NextResponse.json({ error: 'Failed to list memories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      `memory:${session.user.id}`,
      RATE_LIMIT_API,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { content, category, importance } = body as {
      content?: string;
      category?: string;
      importance?: number;
    };

    if (!content || typeof content !== 'string' || content.length < 3) {
      return NextResponse.json({ error: 'Content is required (min 3 characters)' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Content too long (max 1000 characters)' }, { status: 400 });
    }

    const id = await remember(
      session.user.id,
      content,
      category || 'general',
      importance ?? 0.5,
    );

    return NextResponse.json({ id, message: 'Memory stored' }, { status: 201 });
  } catch (error) {
    console.error('[Memory API] POST error:', error);
    return NextResponse.json({ error: 'Failed to store memory' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      `memory-delete:${session.user.id}`,
      RATE_LIMIT_API,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const count = await clearAllMemories(session.user.id);
    return NextResponse.json({ message: `Cleared ${count} memories` });
  } catch (error) {
    console.error('[Memory API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to clear memories' }, { status: 500 });
  }
}
