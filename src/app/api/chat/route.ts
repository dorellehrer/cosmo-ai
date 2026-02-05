import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
