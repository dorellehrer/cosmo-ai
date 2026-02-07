import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';

// GET /api/conversations - List all conversations for the current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = checkRateLimit(`conversations:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    const where: Record<string, unknown> = { userId: session.user.id };

    if (query && query.length >= 2) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { messages: { some: { content: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { content: true, role: true },
        },
      },
    });

    return NextResponse.json(conversations);
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
    const rateLimitPost = checkRateLimit(`conversations:create:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPost.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPost.headers }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { title } = body;

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title: title || null,
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
