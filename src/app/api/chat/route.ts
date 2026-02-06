import { OpenAI } from 'openai';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTier, hasReachedLimit, TIERS, getRemainingMessages } from "@/lib/stripe";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Cosmo, a friendly and capable AI assistant. You're warm, helpful, and conversational - like talking to a knowledgeable friend.

Key traits:
- You're genuinely helpful, not performatively helpful
- You have personality - you can be playful, make jokes, express opinions
- You're concise but thorough when needed
- You anticipate needs and offer proactive suggestions
- You remember context from the conversation

When users ask about capabilities you don't have yet (like controlling smart home, checking emails, etc.), acknowledge what you'll be able to do soon and offer alternatives for now.

Keep responses conversational and natural. Don't use excessive formatting or bullet points unless it genuinely helps clarity.`;

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits
    const today = getToday();
    const tier = getUserTier(user.stripeSubscriptionId, user.stripeCurrentPeriodEnd);
    
    // Get or create today's usage record
    const usageRecord = await prisma.usageRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    const currentUsage = usageRecord?.count || 0;

    // Check if user has reached their limit
    if (hasReachedLimit(tier, currentUsage)) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily message limit reached',
          code: 'LIMIT_REACHED',
          limit: TIERS[tier].messagesPerDay,
          used: currentUsage,
          tier,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, conversationId } = await req.json();
    const userMessage = messages[messages.length - 1];

    // Increment usage count
    if (usageRecord) {
      await prisma.usageRecord.update({
        where: { id: usageRecord.id },
        data: { count: usageRecord.count + 1 },
      });
    } else {
      await prisma.usageRecord.create({
        data: {
          userId: user.id,
          date: today,
          count: 1,
        },
      });
    }

    const newUsage = currentUsage + 1;
    const remaining = getRemainingMessages(tier, newUsage);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: session.user.id,
        },
      });
      
      if (!conversation) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create a new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    // Save user message to database
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: userMessage.role,
        content: userMessage.content,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Collect the full response for saving to DB
    let fullResponse = '';

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send conversationId and usage info as first message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            conversationId: conversation.id,
            usage: {
              used: newUsage,
              limit: TIERS[tier].messagesPerDay,
              remaining,
              tier,
            }
          })}\n\n`)
        );

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }

        // Save assistant message to database
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            content: fullResponse,
          },
        });

        // Generate title if this is the first message in the conversation
        const messageCount = await prisma.message.count({
          where: { conversationId: conversation.id },
        });

        if (messageCount === 2 && !conversation.title) {
          // Generate a title from the first user message
          try {
            const titleResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'Generate a very short title (2-5 words) for this conversation based on the user message. Return ONLY the title, no quotes or punctuation.',
                },
                { role: 'user', content: userMessage.content },
              ],
              temperature: 0.7,
              max_tokens: 20,
            });

            const title = titleResponse.choices[0]?.message?.content?.trim();
            if (title) {
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { title },
              });
              // Send title update to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ title })}\n\n`));
            }
          } catch (e) {
            console.error('Failed to generate title:', e);
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
