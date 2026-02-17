import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import { getOrCreateCanonicalConversation } from '@/lib/canonical-conversation';

// GET /api/conversations - List all conversations for the current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = await checkRateLimitDistributed(`conversations:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const canonicalConversation = await getOrCreateCanonicalConversation(session.user.id);

    const conversation = await prisma.conversation.findUnique({
      where: { id: canonicalConversation.id },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { content: true, role: true },
        },
      },
    });

    return NextResponse.json(conversation ? [conversation] : []);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitPost = await checkRateLimitDistributed(`conversations:create:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPost.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPost.headers }
      );
    }

    const conversation = await getOrCreateCanonicalConversation(session.user.id);

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
