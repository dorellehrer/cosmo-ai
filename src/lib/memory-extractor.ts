/**
 * Memory Extractor — Automatically extracts facts, preferences, and
 * instructions from conversation turns for long-term memory storage.
 *
 * Called after each assistant response in the chat route to identify
 * any new information worth remembering.
 */

export interface ExtractedMemory {
  content: string;
  category: 'preference' | 'fact' | 'instruction' | 'event' | 'general';
  importance: number; // 0.0–1.0
}

/**
 * Extract memorable facts/preferences from a conversation exchange.
 *
 * @param userMessage     - The user's message.
 * @param assistantReply  - Nova's reply.
 * @param existingMemories - Already known facts (to avoid duplicates).
 * @returns Array of facts to remember (may be empty).
 */
export async function extractMemories(
  userMessage: string,
  assistantReply: string,
  existingMemories: string[] = [],
): Promise<ExtractedMemory[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  // Skip trivial messages
  if (userMessage.length < 15 && !userMessage.includes('my') && !userMessage.includes('I ')) {
    return [];
  }

  const existingContext =
    existingMemories.length > 0
      ? `\nAlready known about this user:\n${existingMemories.map((m) => `- ${m}`).join('\n')}`
      : '';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You extract personal facts, preferences, and instructions from conversations for a user's long-term memory profile.

Rules:
- Only extract information that is EXPLICITLY stated or clearly implied by the user
- Skip generic statements, questions, greetings, or small talk
- Focus on: preferences (likes/dislikes), personal facts (name, location, job), instructions ("always do X"), important events
- Do NOT extract information about the assistant or general knowledge
- Do NOT duplicate already-known facts
- Each fact should be a concise, self-contained statement
- Return empty array [] if nothing is worth remembering

Output JSON: { "memories": [{ "content": "...", "category": "preference|fact|instruction|event|general", "importance": 0.0-1.0 }] }
Importance guide: 0.3 = minor detail, 0.5 = useful fact, 0.7 = important preference, 0.9 = critical instruction${existingContext}`,
          },
          {
            role: 'user',
            content: `User said: "${userMessage}"\n\nAssistant replied: "${assistantReply.slice(0, 500)}"`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('[MemoryExtractor] API error:', response.status);
      return [];
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const parsed = JSON.parse(data.choices[0].message.content) as {
      memories: ExtractedMemory[];
    };

    // Validate and filter
    return (parsed.memories || []).filter(
      (m) =>
        m.content &&
        m.content.length > 5 &&
        m.content.length < 500 &&
        ['preference', 'fact', 'instruction', 'event', 'general'].includes(m.category) &&
        typeof m.importance === 'number' &&
        m.importance >= 0 &&
        m.importance <= 1,
    );
  } catch (err) {
    console.error('[MemoryExtractor] Error:', err);
    return [];
  }
}

/**
 * Format recalled memories as a system prompt addendum.
 */
export function formatMemoriesForPrompt(
  memories: Array<{ content: string; category: string }>,
): string {
  if (memories.length === 0) return '';

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.content);
  }

  const sections: string[] = [];
  for (const [category, items] of Object.entries(grouped)) {
    sections.push(`${capitalize(category)}s:\n${items.map((i) => `- ${i}`).join('\n')}`);
  }

  return `\n\n--- What you remember about this user ---\n${sections.join('\n\n')}\n\nUse this context naturally in your responses. Don't explicitly say "I remember that..." unless the user asks about your memory.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
