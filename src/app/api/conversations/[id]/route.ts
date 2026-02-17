import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import { assertCanonicalConversation } from '@/lib/canonical-conversation';

// GET /api/conversations/[id] - Get a specific conversation with messages
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = await checkRateLimitDistributed(`conversation:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const { canonical, isCanonical } = await assertCanonicalConversation(session.user.id, id);

    if (!isCanonical) {
      return NextResponse.json(
        {
          error: 'Single-chat mode is enabled for this account',
          canonicalConversationId: canonical.id,
        },
        { status: 409 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: canonical.id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitDelete = await checkRateLimitDistributed(`conversation:delete:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitDelete.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitDelete.headers }
      );
    }

    const { canonical, isCanonical } = await assertCanonicalConversation(session.user.id, id);

    if (!isCanonical) {
      return NextResponse.json(
        {
          error: 'Single-chat mode is enabled for this account',
          canonicalConversationId: canonical.id,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Deleting the canonical conversation is disabled in single-chat mode' },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation (title)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitPatch = await checkRateLimitDistributed(`conversation:update:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPatch.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPatch.headers }
      );
    }

    const body = await req.json();

    if (body.pinned !== undefined) {
      return NextResponse.json(
        { error: 'Pinning is disabled in single-chat mode' },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;

    const { canonical, isCanonical } = await assertCanonicalConversation(session.user.id, id);

    if (!isCanonical) {
      return NextResponse.json(
        {
          error: 'Single-chat mode is enabled for this account',
          canonicalConversationId: canonical.id,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.conversation.update({
      where: { id: canonical.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
