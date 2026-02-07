/**
 * Skills Engine — Maps agent skills to OpenAI tool definitions and executes them.
 */

import type OpenAI from 'openai';

export interface SkillDefinition {
  id: string;
  name: string;
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
}

/**
 * Built-in skills mapped to OpenAI tool definitions.
 * Each skill provides one or more tools the agent can call.
 */
export const SKILL_TOOLS: Record<string, OpenAI.Chat.Completions.ChatCompletionTool[]> = {
  'web-search': [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for information. Use this when the user asks about current events or information you might not have.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
          },
          required: ['query'],
        },
      },
    },
  ],
  weather: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather for a location.',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name or location' },
          },
          required: ['location'],
        },
      },
    },
  ],
  calculator: [
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Evaluate a mathematical expression.',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression to evaluate' },
          },
          required: ['expression'],
        },
      },
    },
  ],
  reminders: [
    {
      type: 'function',
      function: {
        name: 'set_reminder',
        description: 'Set a reminder for the user. The agent will store it in memory.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'What to remind about' },
            when: { type: 'string', description: 'When to remind (ISO 8601 datetime or relative like "in 1 hour")' },
          },
          required: ['text', 'when'],
        },
      },
    },
  ],
  'datetime': [
    {
      type: 'function',
      function: {
        name: 'get_datetime',
        description: 'Get the current date and time.',
        parameters: {
          type: 'object',
          properties: {
            timezone: { type: 'string', description: 'Timezone (default: UTC)' },
          },
        },
      },
    },
  ],
};

/**
 * Get tools for a set of enabled skill IDs.
 */
export function getToolsForSkills(enabledSkillIds: string[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
  for (const skillId of enabledSkillIds) {
    const skillTools = SKILL_TOOLS[skillId];
    if (skillTools) {
      tools.push(...skillTools);
    }
  }
  return tools;
}

/**
 * Execute a tool call from the AI model.
 * Returns a JSON string result.
 */
export async function executeSkillTool(
  functionName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (functionName) {
    case 'web_search': {
      const query = args.query as string;

      // Try Brave Search first (higher quality web results)
      const braveKey = process.env.BRAVE_SEARCH_API_KEY;
      if (braveKey) {
        try {
          const res = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
            {
              headers: { 'X-Subscription-Token': braveKey, Accept: 'application/json' },
              signal: AbortSignal.timeout(8000),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const results = (data.web?.results || []).map(
              (r: { title: string; url: string; description: string }) => ({
                title: r.title,
                url: r.url,
                snippet: r.description,
              })
            );
            if (results.length > 0) {
              return JSON.stringify({ results, source: 'brave' });
            }
          }
        } catch {
          // Fall through to DuckDuckGo
        }
      }

      // Fallback: DuckDuckGo Instant Answer API
      try {
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
        );
        const data = await res.json();
        const results: { title: string; snippet: string; url?: string }[] = [];
        if (data.AbstractText) {
          results.push({ title: data.Heading || 'Answer', snippet: data.AbstractText, url: data.AbstractURL });
        }
        if (data.Answer) {
          results.push({ title: 'Instant Answer', snippet: data.Answer as string });
        }
        for (const topic of (data.RelatedTopics || []).slice(0, 5)) {
          if (topic.Text) {
            results.push({ title: topic.Text.substring(0, 80), snippet: topic.Text, url: topic.FirstURL });
          }
        }
        return JSON.stringify({ results: results.length > 0 ? results : [{ title: 'No results', snippet: `No results found for "${query}"` }] });
      } catch {
        return JSON.stringify({ error: 'Web search failed' });
      }
    }

    case 'get_weather': {
      const location = args.location as string;
      try {
        const res = await fetch(
          `https://wttr.in/${encodeURIComponent(location)}?format=j1`
        );
        if (!res.ok) return JSON.stringify({ error: 'Weather service unavailable' });
        const data = await res.json();
        const current = data.current_condition?.[0];
        return JSON.stringify({
          location,
          temperature: `${current?.temp_C}°C / ${current?.temp_F}°F`,
          description: current?.weatherDesc?.[0]?.value,
          humidity: `${current?.humidity}%`,
          wind: `${current?.windspeedKmph} km/h ${current?.winddir16Point}`,
        });
      } catch {
        return JSON.stringify({ error: 'Failed to fetch weather' });
      }
    }

    case 'calculate': {
      const expression = args.expression as string;
      try {
        // Safe math evaluation using Function constructor with restricted scope
        const sanitized = expression.replace(/[^0-9+\-*/().%\s^]/g, '');
        const result = new Function(`return (${sanitized})`)();
        return JSON.stringify({ expression, result: String(result) });
      } catch {
        return JSON.stringify({ error: `Could not evaluate: ${expression}` });
      }
    }

    case 'set_reminder': {
      const text = args.text as string;
      const when = args.when as string;
      // Reminders are stored in memory — the memory system handles persistence
      return JSON.stringify({ set: true, text, when, note: 'Reminder stored in agent memory' });
    }

    case 'get_datetime': {
      const tz = (args.timezone as string) || 'UTC';
      try {
        const now = new Date();
        const formatted = now.toLocaleString('en-US', {
          timeZone: tz,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return JSON.stringify({ datetime: formatted, timezone: tz, iso: now.toISOString() });
      } catch {
        return JSON.stringify({ error: `Invalid timezone: ${tz}` });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${functionName}` });
  }
}
