/**
 * Sub-Agent — Background task execution system.
 *
 * Allows the AI to spawn autonomous sub-agents that perform multi-step tasks
 * (research, data processing, content generation) in the background.
 *
 * Sub-agents run in-process using a separate AI completion loop with their own
 * tool access (web search). Results are stored in the database and can be checked later.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

// ── Types ──────────────────────────────────────

export interface SubAgentTask {
  userId: string;
  conversationId?: string;
  task: string;
  model?: string;
}

export interface SubAgentStatus {
  id: string;
  task: string;
  status: string;
  result: string | null;
  error: string | null;
  model: string;
  tokensUsed: number;
  steps: SubAgentStep[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface SubAgentStep {
  action: string;
  result: string;
  ts: string;
}

// Sub-agent tool definitions for the AI to use
interface SubAgentToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

const INTERNAL_MODEL = 'gpt-4.1-mini';
const MAX_STEPS = 15;
const MAX_CONCURRENT_PER_USER = 3;

// ── Active sub-agent abort controllers ─────────

const activeControllers = new Map<string, AbortController>();

// ── Sub-Agent Tool Definitions ─────────────────

const SUB_AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Use for research tasks, fact-checking, or finding up-to-date data.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fetch_url',
      description: 'Fetch the text content of a specific URL. Use to read articles, documentation, or web pages.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
];

// ── Sub-Agent Tool Execution ───────────────────

async function executeSubAgentTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'web_search': {
      const query = args.query as string;
      if (!query) return JSON.stringify({ error: 'query is required' });

      try {
        // Use DuckDuckGo Instant Answer API (no API key required)
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
          { signal: AbortSignal.timeout(10_000) },
        );
        if (!res.ok) return JSON.stringify({ error: `Search API error: ${res.status}` });
        const data = (await res.json()) as {
          Abstract?: string;
          AbstractText?: string;
          AbstractSource?: string;
          AbstractURL?: string;
          RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
        };

        const results: Array<{ text: string; url?: string }> = [];
        if (data.AbstractText) {
          results.push({ text: data.AbstractText, url: data.AbstractURL });
        }
        for (const topic of (data.RelatedTopics || []).slice(0, 5)) {
          if (topic.Text) results.push({ text: topic.Text, url: topic.FirstURL });
        }

        if (results.length === 0) {
          return JSON.stringify({ message: `No results found for "${query}". Try rephrasing your search.` });
        }
        return JSON.stringify({ query, results });
      } catch (err) {
        return JSON.stringify({ error: `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
      }
    }

    case 'fetch_url': {
      const url = args.url as string;
      if (!url) return JSON.stringify({ error: 'url is required' });

      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Nova AI Sub-Agent/1.0' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return JSON.stringify({ error: `HTTP ${res.status}: ${res.statusText}` });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text') && !contentType.includes('json')) {
          return JSON.stringify({ error: `Non-text content type: ${contentType}` });
        }

        const text = await res.text();
        // Truncate to avoid token overflow
        const truncated = text.slice(0, 8000);
        return JSON.stringify({
          url,
          contentLength: text.length,
          content: truncated + (text.length > 8000 ? '\n\n[Content truncated...]' : ''),
        });
      } catch (err) {
        return JSON.stringify({ error: `Fetch failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── Spawn ──────────────────────────────────────

/**
 * Spawn a new sub-agent to execute a task in the background.
 *
 * @returns The sub-agent ID for tracking.
 */
export async function spawnSubAgent(task: SubAgentTask): Promise<string> {
  // Check concurrent limit
  const running = await prisma.subAgent.count({
    where: { userId: task.userId, status: 'running' },
  });

  if (running >= MAX_CONCURRENT_PER_USER) {
    throw new Error(
      `Maximum ${MAX_CONCURRENT_PER_USER} concurrent sub-agents allowed. Wait for one to finish or cancel it.`,
    );
  }

  // Create the sub-agent record
  const subAgent = await prisma.subAgent.create({
    data: {
      userId: task.userId,
      parentConversationId: task.conversationId || null,
      task: task.task,
      model: task.model || INTERNAL_MODEL,
      status: 'running',
      steps: [],
    },
  });

  // Execute in background (fire-and-forget)
  executeSubAgent(subAgent.id, task).catch((err) => {
    console.error(`[SubAgent ${subAgent.id}] Unhandled error:`, err);
  });

  return subAgent.id;
}

// ── Execute ────────────────────────────────────

/**
 * Execute the sub-agent's task step by step.
 * This runs asynchronously and updates the database as it progresses.
 * Supports AbortController-based cancellation.
 */
async function executeSubAgent(id: string, task: SubAgentTask): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await failSubAgent(id, 'No OPENAI_API_KEY configured');
    return;
  }

  // Create an abort controller for cancellation
  const abortController = new AbortController();
  activeControllers.set(id, abortController);

  const steps: SubAgentStep[] = [];
  let totalTokens = 0;

  const messages: Array<{ role: string; content: string; tool_calls?: SubAgentToolCall[]; tool_call_id?: string }> = [
    {
      role: 'system',
      content: `You are a Nova sub-agent executing a specific task. You have access to tools for web search and URL fetching.

Rules:
- Break the task into logical steps
- Use the web_search tool to find current information when needed
- Use the fetch_url tool to read specific web pages
- After each step, report what you did and what you found
- When the task is fully complete, output your final result prefixed with "TASK_COMPLETE:"
- If you cannot complete the task, output "TASK_FAILED:" followed by the reason
- Be concise but thorough
- Maximum ${MAX_STEPS} steps allowed`,
    },
    {
      role: 'user',
      content: `Task: ${task.task}`,
    },
  ];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      // Check for cancellation before each step
      if (abortController.signal.aborted) {
        await prisma.subAgent.update({
          where: { id },
          data: {
            status: 'cancelled',
            tokensUsed: totalTokens,
            steps: steps as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });
        console.log(`[SubAgent ${id}] Cancelled at step ${step + 1}`);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: task.model || INTERNAL_MODEL,
          messages,
          tools: SUB_AGENT_TOOLS,
          temperature: 0.3,
          max_tokens: 2000,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        await failSubAgent(id, `API error ${response.status}: ${errText}`);
        return;
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string | null;
            tool_calls?: SubAgentToolCall[];
          };
          finish_reason: string;
        }>;
        usage?: { total_tokens?: number };
      };

      const choice = data.choices[0];
      const reply = choice?.message?.content || '';
      const toolCalls = choice?.message?.tool_calls;
      totalTokens += data.usage?.total_tokens || 0;

      // Handle tool calls
      if (toolCalls && toolCalls.length > 0) {
        // Add the assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: reply,
          tool_calls: toolCalls,
        });

        // Execute each tool call and add results
        for (const tc of toolCalls) {
          let toolArgs: Record<string, unknown>;
          try {
            toolArgs = JSON.parse(tc.function.arguments);
          } catch {
            toolArgs = {};
          }

          const toolResult = await executeSubAgentTool(tc.function.name, toolArgs);

          messages.push({
            role: 'tool' as string,
            content: toolResult,
            tool_call_id: tc.id,
          });

          // Record the tool call as a step
          const stepRecord: SubAgentStep = {
            action: `Tool: ${tc.function.name}(${tc.function.arguments.slice(0, 200)})`,
            result: toolResult.slice(0, 500),
            ts: new Date().toISOString(),
          };
          steps.push(stepRecord);
        }

        // Update progress in DB
        await prisma.subAgent.update({
          where: { id },
          data: {
            steps: steps as unknown as Prisma.InputJsonValue,
            tokensUsed: totalTokens,
          },
        });

        // Continue to next iteration to get AI's response to tool results
        continue;
      }

      // No tool calls — regular text response
      const stepRecord: SubAgentStep = {
        action: `Step ${step + 1}`,
        result: reply.slice(0, 1000),
        ts: new Date().toISOString(),
      };
      steps.push(stepRecord);

      // Update progress in DB
      await prisma.subAgent.update({
        where: { id },
        data: {
          steps: steps as unknown as Prisma.InputJsonValue,
          tokensUsed: totalTokens,
        },
      });

      // Check for completion
      if (reply.includes('TASK_COMPLETE:')) {
        const result = reply.split('TASK_COMPLETE:')[1].trim();
        await prisma.subAgent.update({
          where: { id },
          data: {
            status: 'completed',
            result,
            tokensUsed: totalTokens,
            steps: steps as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });
        console.log(`[SubAgent ${id}] Completed in ${step + 1} steps`);
        return;
      }

      if (reply.includes('TASK_FAILED:')) {
        const reason = reply.split('TASK_FAILED:')[1].trim();
        await failSubAgent(id, reason, totalTokens, steps);
        return;
      }

      // Continue the conversation
      messages.push({ role: 'assistant', content: reply });
      messages.push({
        role: 'user',
        content: 'Continue with the next step. If the task is complete, start your message with "TASK_COMPLETE:"',
      });
    }

    // Max steps reached
    const lastStep = steps[steps.length - 1]?.result || 'No output';
    await prisma.subAgent.update({
      where: { id },
      data: {
        status: 'completed',
        result: `Reached maximum steps. Last output: ${lastStep}`,
        tokensUsed: totalTokens,
        steps: steps as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      await prisma.subAgent.update({
        where: { id },
        data: {
          status: 'cancelled',
          tokensUsed: totalTokens,
          steps: steps as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      console.log(`[SubAgent ${id}] Aborted`);
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    await failSubAgent(id, msg, totalTokens, steps);
  } finally {
    activeControllers.delete(id);
  }
}

async function failSubAgent(
  id: string,
  error: string,
  tokensUsed = 0,
  steps: SubAgentStep[] = [],
): Promise<void> {
  console.error(`[SubAgent ${id}] Failed:`, error);
  await prisma.subAgent.update({
    where: { id },
    data: {
      status: 'failed',
      error,
      tokensUsed,
      steps: steps as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });
}

// ── Query ──────────────────────────────────────

/**
 * Get the status of a sub-agent.
 */
export async function getSubAgentStatus(
  userId: string,
  subAgentId: string,
): Promise<SubAgentStatus | null> {
  const sa = await prisma.subAgent.findFirst({
    where: { id: subAgentId, userId },
  });

  if (!sa) return null;

  return {
    id: sa.id,
    task: sa.task,
    status: sa.status,
    result: sa.result,
    error: sa.error,
    model: sa.model,
    tokensUsed: sa.tokensUsed,
    steps: (sa.steps as unknown as SubAgentStep[]) || [],
    createdAt: sa.createdAt,
    completedAt: sa.completedAt,
  };
}

/**
 * List sub-agents for a user.
 */
export async function listSubAgents(
  userId: string,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ subAgents: SubAgentStatus[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;
  const where: Prisma.SubAgentWhereInput = { userId };
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.subAgent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.subAgent.count({ where }),
  ]);

  const subAgents: SubAgentStatus[] = items.map((sa) => ({
    id: sa.id,
    task: sa.task,
    status: sa.status,
    result: sa.result,
    error: sa.error,
    model: sa.model,
    tokensUsed: sa.tokensUsed,
    steps: (sa.steps as unknown as SubAgentStep[]) || [],
    createdAt: sa.createdAt,
    completedAt: sa.completedAt,
  }));

  return { subAgents, total };
}

/**
 * Cancel a running sub-agent.
 * Aborts the active execution loop via AbortController if running.
 */
export async function cancelSubAgent(
  userId: string,
  subAgentId: string,
): Promise<boolean> {
  // Abort the active execution if running
  const controller = activeControllers.get(subAgentId);
  if (controller) {
    controller.abort();
    activeControllers.delete(subAgentId);
  }

  const result = await prisma.subAgent.updateMany({
    where: { id: subAgentId, userId, status: 'running' },
    data: { status: 'cancelled', completedAt: new Date() },
  });
  return result.count > 0;
}
