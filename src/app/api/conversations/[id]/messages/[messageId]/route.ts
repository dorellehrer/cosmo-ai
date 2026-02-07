import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';

type RouteParams = { params: Promise<{ id: string; messageId: string }> };

// PATCH /api/conversations/[id]/messages/[messageId] - Update message content
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id, messageId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`message:update:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { content } = await req.json();

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const message = await prisma.message.update({
      where: { id: messageId, conversationId: id },
      data: { content: content.trim() },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id]/messages/[messageId] - Delete message and all after it
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id, messageId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`message:delete:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get the target message to find its timestamp
    const targetMessage = await prisma.message.findFirst({
      where: { id: messageId, conversationId: id },
    });

    if (!targetMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Delete all messages after this one (by createdAt)
    const deleted = await prisma.message.deleteMany({
      where: {
        conversationId: id,
        createdAt: { gt: targetMessage.createdAt },
      },
    });

    return NextResponse.json({ success: true, deletedCount: deleted.count });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
  }
}
