/**
 * Memory — pgvector-powered semantic memory for Nova.
 *
 * Each user's facts, preferences, and instructions are stored with vector
 * embeddings (text-embedding-3-small, 1536 dims) for fast cosine-similarity
 * recall.
 *
 * Requires:
 *   - pgvector extension on the PostgreSQL database
 *   - An OpenAI API key for embeddings
 *
 * Usage:
 *   const memories = await recall(userId, "user's coffee preferences", 5);
 *   await remember(userId, "User prefers oat milk lattes", "preference");
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const MAX_MEMORIES_PER_USER = 1000;

// ── Embeddings ─────────────────────────────────

/**
 * Generate a vector embedding for a text string.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required for memory embeddings');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMS,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Embedding error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}

// ── Remember ───────────────────────────────────

/**
 * Store a new memory for a user.
 *
 * @param userId   - The user's ID.
 * @param content  - The memory text (fact, preference, instruction).
 * @param category - Category: preference | fact | instruction | event | general.
 * @param importance - Importance score 0.0–1.0 (default 0.5).
 * @returns The created Memory record ID.
 */
export async function remember(
  userId: string,
  content: string,
  category: string = 'general',
  importance: number = 0.5,
): Promise<string> {
  // Check for duplicates (exact match)
  const existing = await prisma.memory.findFirst({
    where: { userId, content },
    select: { id: true },
  });

  if (existing) {
    // Update access count and timestamp
    await prisma.memory.update({
      where: { id: existing.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
        importance: Math.min(1.0, importance + 0.1), // Boost importance on re-mention
      },
    });
    return existing.id;
  }

  // Generate embedding
  let embeddingVector: number[] | null = null;
  try {
    embeddingVector = await embedText(content);
  } catch (err) {
    console.error('[Memory] Embedding generation failed, storing without vector:', err);
  }

  // Check memory limit and evict oldest low-importance memories
  const count = await prisma.memory.count({ where: { userId } });
  if (count >= MAX_MEMORIES_PER_USER) {
    await evictOldMemories(userId, Math.ceil(MAX_MEMORIES_PER_USER * 0.1));
  }

  // Insert with raw SQL for the vector column
  if (embeddingVector) {
    const vectorStr = `[${embeddingVector.join(',')}]`;
    // Generate a unique ID matching Prisma's text ID pattern
    const memoryId = crypto.randomUUID();
    await prisma.$queryRaw`
      INSERT INTO "Memory" ("id", "userId", "content", "category", "importance", "source", "embedding", "accessCount", "createdAt", "updatedAt")
      VALUES (
        ${memoryId},
        ${userId},
        ${content},
        ${category},
        ${importance},
        'extracted',
        ${vectorStr}::vector,
        0,
        NOW(),
        NOW()
      )
    `;
    return memoryId;
  } else {
    // No embedding — insert via Prisma normally
    const memory = await prisma.memory.create({
      data: { userId, content, category, importance, source: 'extracted' },
    });
    return memory.id;
  }
}

// ── Recall ─────────────────────────────────────

export interface RecalledMemory {
  id: string;
  content: string;
  category: string;
  importance: number;
  similarity: number;
  createdAt: Date;
}

/**
 * Recall relevant memories using semantic similarity search.
 *
 * @param userId - The user's ID.
 * @param query  - Natural language query to match against.
 * @param limit  - Max number of memories to return (default 5).
 * @param threshold - Minimum cosine similarity (default 0.3).
 * @returns Array of matching memories sorted by relevance.
 */
export async function recall(
  userId: string,
  query: string,
  limit: number = 5,
  threshold: number = 0.3,
): Promise<RecalledMemory[]> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch (err) {
    console.error('[Memory] Embedding failed for recall, falling back to text search:', err);
    return recallByText(userId, query, limit);
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // pgvector cosine similarity: 1 - (embedding <=> query_vector)
  const results = await prisma.$queryRaw<RecalledMemory[]>`
    SELECT
      "id",
      "content",
      "category",
      "importance",
      1 - ("embedding" <=> ${vectorStr}::vector) AS "similarity",
      "createdAt"
    FROM "Memory"
    WHERE "userId" = ${userId}
      AND "embedding" IS NOT NULL
      AND 1 - ("embedding" <=> ${vectorStr}::vector) > ${threshold}
    ORDER BY "embedding" <=> ${vectorStr}::vector ASC
    LIMIT ${limit}
  `;

  // Update access counts for returned memories
  if (results.length > 0) {
    const ids = results.map((m) => m.id);
    await prisma.memory.updateMany({
      where: { id: { in: ids } },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  return results;
}

/**
 * Fallback text-based recall when embeddings are unavailable.
 */
async function recallByText(
  userId: string,
  query: string,
  limit: number,
): Promise<RecalledMemory[]> {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);

  if (keywords.length === 0) return [];

  // Simple text search using ILIKE
  const conditions = keywords.map(
    (kw) => Prisma.sql`"content" ILIKE ${'%' + kw + '%'}`,
  );
  const whereClause = Prisma.sql`"userId" = ${userId} AND (${Prisma.join(conditions, ' OR ')})`;

  const results = await prisma.$queryRaw<RecalledMemory[]>`
    SELECT "id", "content", "category", "importance", 0.5 AS "similarity", "createdAt"
    FROM "Memory"
    WHERE ${whereClause}
    ORDER BY "importance" DESC, "createdAt" DESC
    LIMIT ${limit}
  `;

  return results;
}

// ── Maintenance ────────────────────────────────

/**
 * Evict old, low-importance memories.
 */
async function evictOldMemories(userId: string, count: number): Promise<void> {
  const toDelete = await prisma.memory.findMany({
    where: { userId },
    orderBy: [{ importance: 'asc' }, { accessCount: 'asc' }, { createdAt: 'asc' }],
    take: count,
    select: { id: true },
  });

  if (toDelete.length > 0) {
    await prisma.memory.deleteMany({
      where: { id: { in: toDelete.map((m) => m.id) } },
    });
    console.log(`[Memory] Evicted ${toDelete.length} old memories for user ${userId}`);
  }
}

/**
 * Remove all memories for a user.
 */
export async function clearAllMemories(userId: string): Promise<number> {
  const result = await prisma.memory.deleteMany({ where: { userId } });
  return result.count;
}

/**
 * List memories for a user (paginated, newest first).
 */
export async function listMemories(
  userId: string,
  options: { category?: string; limit?: number; offset?: number } = {},
): Promise<{ memories: Array<{ id: string; content: string; category: string; importance: number; createdAt: Date }>; total: number }> {
  const { category, limit = 50, offset = 0 } = options;
  const where: Prisma.MemoryWhereInput = { userId };
  if (category) where.category = category;

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: { id: true, content: true, category: true, importance: true, createdAt: true },
    }),
    prisma.memory.count({ where }),
  ]);

  return { memories, total };
}

/**
 * Delete a single memory by ID (with ownership check).
 */
export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const result = await prisma.memory.deleteMany({
    where: { id: memoryId, userId },
  });
  return result.count > 0;
}

/**
 * Consolidate overlapping memories for a user using AI.
 * Groups similar memories and merges them into single records.
 */
export async function consolidateMemories(userId: string): Promise<number> {
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, content: true, category: true, importance: true },
  });

  if (memories.length < 10) return 0; // Not enough to consolidate

  // Group by category
  const groups: Record<string, typeof memories> = {};
  for (const m of memories) {
    if (!groups[m.category]) groups[m.category] = [];
    groups[m.category].push(m);
  }

  let consolidated = 0;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return 0;

  for (const [category, items] of Object.entries(groups)) {
    if (items.length < 5) continue;

    // Ask AI to merge similar statements
    const itemsText = items.map((m, i) => `${i + 1}. ${m.content}`).join('\n');
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content:
                'You merge overlapping/redundant memory entries into unique, concise statements. Output JSON: { "merged": ["statement1", "statement2", ...], "removedIndices": [3, 5, 7] }. Only merge entries that are clearly about the same fact/preference. Keep unique entries as-is.',
            },
            {
              role: 'user',
              content: `Category: ${category}\n\nEntries:\n${itemsText}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
    } catch (err) {
      console.error(`[Memory] Consolidation API call failed for category '${category}':`, err);
      continue;
    }

    if (!response.ok) {
      console.error(`[Memory] Consolidation API returned ${response.status} for category '${category}'`);
      continue;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    try {
      const result = JSON.parse(data.choices[0].message.content) as {
        merged: string[];
        removedIndices: number[];
      };

      // Delete removed entries
      const idsToRemove = result.removedIndices
        .map((i) => items[i - 1]?.id)
        .filter(Boolean) as string[];

      if (idsToRemove.length > 0) {
        await prisma.memory.deleteMany({
          where: { id: { in: idsToRemove } },
        });
        consolidated += idsToRemove.length;

        // Add merged entries
        for (const merged of result.merged) {
          if (!items.some((it) => it.content === merged)) {
            await remember(userId, merged, category, 0.7);
          }
        }
      }
    } catch (err) {
      console.error(`[Memory] Failed to parse consolidation result for category '${category}':`, err);
    }
  }

  return consolidated;
}
