import { OpenAI } from 'openai';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTier, hasReachedLimit, TIERS, getRemainingMessages } from "@/lib/stripe";
import { checkRateLimit, RATE_LIMIT_CHAT, RATE_LIMIT_IMAGE_FREE, RATE_LIMIT_IMAGE_PRO } from '@/lib/rate-limit';
import { decryptToken, refreshAccessToken, OAUTH_PROVIDERS } from '@/lib/integrations';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are Nova, a friendly and capable AI assistant. You're warm, helpful, and conversational - like talking to a knowledgeable friend.

Key traits:
- You're genuinely helpful, not performatively helpful
- You have personality - you can be playful, make jokes, express opinions
- You're concise but thorough when needed
- You anticipate needs and offer proactive suggestions
- You remember context from the conversation

You have built-in tools: current date/time, web search, and a calculator. Use them proactively when relevant.

Keep responses conversational and natural. Don't use excessive formatting or bullet points unless it genuinely helps clarity.`;

// Get today's date in YYYY-MM-DD format, respecting a timezone offset
function getToday(): string {
  // Use a consistent timezone for usage tracking — UTC is the safest default.
  // For user-local dates, the client would need to send its timezone.
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/** Increment usage count. Called only after a successful AI response. */
async function incrementUsage(userId: string, today: string, currentRecord: { id: string; count: number } | null) {
  if (currentRecord) {
    await prisma.usageRecord.update({
      where: { id: currentRecord.id },
      data: { count: currentRecord.count + 1 },
    });
  } else {
    await prisma.usageRecord.create({
      data: { userId, date: today, count: 1 },
    });
  }
}

// ──────────────────────────────────────────────
// Integration Helpers
// ──────────────────────────────────────────────

interface ConnectedIntegration {
  provider: string;
  accessToken: string;
  email?: string | null;
}

/** Get a valid access token for a user's integration, refreshing if expired */
async function getValidToken(integration: { id: string; provider: string; accessToken: string; refreshToken: string | null; expiresAt: Date | null; userId: string }): Promise<string | null> {
  try {
    let accessToken = decryptToken(integration.accessToken);

    // Check if token is expired (with 5 min buffer)
    if (integration.expiresAt && integration.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      if (!integration.refreshToken || !OAUTH_PROVIDERS[integration.provider]) {
        return null; // Can't refresh
      }
      const refreshToken = decryptToken(integration.refreshToken);
      const tokens = await refreshAccessToken(integration.provider, refreshToken);
      
      // Dynamically import encryption to avoid circular deps
      const { encryptToken } = await import('@/lib/integrations');
      
      // Update stored tokens
      await prisma.userIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: encryptToken(tokens.access_token),
          ...(tokens.refresh_token ? { refreshToken: encryptToken(tokens.refresh_token) } : {}),
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
      });
      accessToken = tokens.access_token;
    }

    return accessToken;
  } catch (error) {
    console.error(`Failed to get token for ${integration.provider}:`, error);
    return null;
  }
}

/** Fetch user's connected integrations with valid tokens */
async function getConnectedIntegrations(userId: string): Promise<ConnectedIntegration[]> {
  const integrations = await prisma.userIntegration.findMany({
    where: { userId },
  });

  const results: ConnectedIntegration[] = [];
  for (const int of integrations) {
    const token = await getValidToken(int);
    if (token) {
      results.push({ provider: int.provider, accessToken: token, email: int.email });
    }
  }
  return results;
}

/** Build system prompt with integration context */
function buildSystemPrompt(connectedIntegrations: ConnectedIntegration[]): string {
  if (connectedIntegrations.length === 0) {
    return BASE_SYSTEM_PROMPT + '\n\nWhen users ask about capabilities you don\'t have yet (like controlling smart home, checking emails, etc.), acknowledge what you\'ll be able to do soon and offer alternatives for now.';
  }

  const integrationDescriptions: Record<string, string> = {
    google: 'Google (Calendar, Gmail, Drive) — you can read calendar events, search emails, and list Drive files',
    spotify: 'Spotify — you can check what\'s playing, search for music, and control playback',
    notion: 'Notion — you can search pages and databases',
    slack: 'Slack — you can search messages and channels',
  };

  const connectedList = connectedIntegrations
    .map((i) => integrationDescriptions[i.provider] || i.provider)
    .join('\n- ');

  return `${BASE_SYSTEM_PROMPT}

You have access to the following connected integrations:
- ${connectedList}

When the user asks about these services, use the available tools to fetch real data. Be helpful and proactive — if someone mentions a meeting, check their calendar. If they mention music, check Spotify.`;
}

/** OpenAI tool definitions for connected integrations */
function getIntegrationTools(connectedIntegrations: ConnectedIntegration[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
  const providers = new Set(connectedIntegrations.map((i) => i.provider));

  if (providers.has('google')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'google_calendar_list_events',
          description: 'List upcoming calendar events for the user. Call this when the user asks about their schedule, meetings, or calendar.',
          parameters: {
            type: 'object',
            properties: {
              maxResults: { type: 'number', description: 'Maximum events to return (default 10)', default: 10 },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'google_gmail_search',
          description: 'Search the user\'s Gmail inbox. Call this when the user asks about emails.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Gmail search query (e.g., "from:boss subject:meeting")' },
              maxResults: { type: 'number', description: 'Maximum emails to return (default 5)', default: 5 },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'google_drive_search',
          description: 'Search for files in the user\'s Google Drive. Call this when the user asks about documents, spreadsheets, or files.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query for files (e.g., "budget report", "meeting notes")' },
              maxResults: { type: 'number', description: 'Maximum files to return (default 10)', default: 10 },
            },
            required: ['query'],
          },
        },
      }
    );
  }

  if (providers.has('spotify')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'spotify_get_currently_playing',
          description: 'Get the song currently playing on the user\'s Spotify. Call this when the user asks what\'s playing.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'spotify_search',
          description: 'Search for tracks, artists, or albums on Spotify.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              type: { type: 'string', enum: ['track', 'artist', 'album'], description: 'What to search for', default: 'track' },
            },
            required: ['query'],
          },
        },
      }
    );
  }

  if (providers.has('notion')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'notion_search',
          description: 'Search the user\'s Notion workspace for pages and databases. Call this when the user asks about their notes, docs, or Notion content.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'notion_create_page',
          description: 'Create a new page in the user\'s Notion workspace. Call this when the user wants to save a note or create a document.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Page title' },
              content: { type: 'string', description: 'Page content in plain text' },
            },
            required: ['title', 'content'],
          },
        },
      }
    );
  }

  if (providers.has('slack')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'slack_search_messages',
          description: 'Search messages in the user\'s Slack workspace. Call this when the user asks about Slack conversations or messages.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query for messages' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'slack_list_channels',
          description: 'List the user\'s Slack channels. Call this when the user asks about their Slack channels.',
          parameters: { type: 'object', properties: {} },
        },
      }
    );
  }

  // Built-in tools (always available, no integration required)
  tools.push(
    {
      type: 'function',
      function: {
        name: 'get_current_datetime',
        description: 'Get the current date, time, and day of the week. Call this when the user asks about the current time, date, or day. Also useful for calculating relative dates.',
        parameters: {
          type: 'object',
          properties: {
            timezone: { type: 'string', description: 'IANA timezone (e.g., "Europe/Stockholm", "America/New_York"). Defaults to UTC.' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for current information. Call this when the user asks about recent events, facts you\'re unsure about, or anything that requires up-to-date information.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Evaluate a mathematical expression. Call this for calculations, unit conversions, or math. Supports +, -, *, /, **, %, sqrt(), sin(), cos(), tan(), log(), ceil(), floor(), round(), abs(), min(), max(), PI, E.',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression (e.g., "sqrt(144) + 5 * 3", "(100 * 1.25) / 4")' },
          },
          required: ['expression'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_fetch',
        description: 'Fetch and extract the main content from a web page URL. Use this when the user shares a link or asks you to read/summarize a webpage.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to fetch content from' },
          },
          required: ['url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'weather_current',
        description: 'Get current weather for a location. Call this when the user asks about the weather.',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name (e.g., "Stockholm", "New York", "Tokyo")' },
          },
          required: ['location'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'generate_image',
        description: 'Generate an image using DALL-E based on a text description. Call this when the user asks you to create, draw, or generate an image.',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Detailed description of the image to generate' },
            size: { type: 'string', enum: ['1024x1024', '1024x1792', '1792x1024'], description: 'Image size (default 1024x1024)', default: '1024x1024' },
          },
          required: ['prompt'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'translate_text',
        description: 'Translate text between languages. Call this when the user asks to translate something.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to translate' },
            targetLanguage: { type: 'string', description: 'Target language (e.g., "Swedish", "Spanish", "Japanese")' },
            sourceLanguage: { type: 'string', description: 'Source language (optional, auto-detected if omitted)' },
          },
          required: ['text', 'targetLanguage'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'summarize_url',
        description: 'Fetch a web page and provide a concise summary of its content. Use when the user shares a link and asks for a summary or TL;DR.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to summarize' },
          },
          required: ['url'],
        },
      },
    }
  );

  // Google Calendar: create event (if Google connected with write scope)
  if (providers.has('google')) {
    tools.push({
      type: 'function',
      function: {
        name: 'google_calendar_create_event',
        description: 'Create a new event on the user\'s Google Calendar. Call this when the user wants to schedule something.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Event title' },
            startTime: { type: 'string', description: 'Start time in ISO 8601 format (e.g., "2026-02-08T14:00:00+01:00")' },
            endTime: { type: 'string', description: 'End time in ISO 8601 format (e.g., "2026-02-08T15:00:00+01:00")' },
            description: { type: 'string', description: 'Event description (optional)' },
            location: { type: 'string', description: 'Event location (optional)' },
          },
          required: ['title', 'startTime', 'endTime'],
        },
      },
    });
  }

  return tools;
}

/** Execute a tool call against a provider API */
async function executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  integrations: ConnectedIntegration[],
  userId: string = 'anon',
  isPro: boolean = false,
): Promise<string> {
  try {
    const getToken = (provider: string) => integrations.find((i) => i.provider === provider)?.accessToken;

    switch (functionName) {
      case 'google_calendar_list_events': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const maxResults = (args.maxResults as number) || 10;
        const now = new Date().toISOString();
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${now}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return JSON.stringify({ error: `Calendar API error: ${res.status}` });
        const data = await res.json();
        const events = (data.items || []).map((e: { summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => ({
          title: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
        }));
        return JSON.stringify({ events });
      }

      case 'google_gmail_search': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const query = args.query as string;
        const maxResults = (args.maxResults as number) || 5;
        const listRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!listRes.ok) return JSON.stringify({ error: `Gmail API error: ${listRes.status}` });
        const listData = await listRes.json();
        const messages = [];
        for (const msg of (listData.messages || []).slice(0, maxResults)) {
          const msgRes = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            const headers = msgData.payload?.headers || [];
            messages.push({
              subject: headers.find((h: { name: string }) => h.name === 'Subject')?.value,
              from: headers.find((h: { name: string }) => h.name === 'From')?.value,
              date: headers.find((h: { name: string }) => h.name === 'Date')?.value,
              snippet: msgData.snippet,
            });
          }
        }
        return JSON.stringify({ messages });
      }

      case 'spotify_get_currently_playing': {
        const token = getToken('spotify');
        if (!token) return JSON.stringify({ error: 'Spotify not connected' });
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 204) return JSON.stringify({ playing: false, message: 'Nothing is currently playing' });
        if (!res.ok) return JSON.stringify({ error: `Spotify API error: ${res.status}` });
        const data = await res.json();
        return JSON.stringify({
          playing: data.is_playing,
          track: data.item?.name,
          artist: data.item?.artists?.map((a: { name: string }) => a.name).join(', '),
          album: data.item?.album?.name,
        });
      }

      case 'spotify_search': {
        const token = getToken('spotify');
        if (!token) return JSON.stringify({ error: 'Spotify not connected' });
        const query = args.query as string;
        const type = (args.type as string) || 'track';
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return JSON.stringify({ error: `Spotify API error: ${res.status}` });
        const data = await res.json();
        const key = `${type}s` as string;
        const items = (data[key]?.items || []).map((item: { name: string; artists?: { name: string }[]; album?: { name: string } }) => ({
          name: item.name,
          artist: item.artists?.map((a) => a.name).join(', '),
          album: item.album?.name,
        }));
        return JSON.stringify({ results: items });
      }

      // ── Google Drive ──
      case 'google_drive_search': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const query = args.query as string;
        const maxResults = (args.maxResults as number) || 10;
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name+contains+'${encodeURIComponent(query)}'&pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&orderBy=modifiedTime+desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return JSON.stringify({ error: `Drive API error: ${res.status}` });
        const data = await res.json();
        const files = (data.files || []).map((f: { name: string; mimeType: string; modifiedTime: string; webViewLink?: string; size?: string }) => ({
          name: f.name,
          type: f.mimeType?.split('.').pop()?.replace('document', 'Doc').replace('spreadsheet', 'Sheet').replace('presentation', 'Slides') || f.mimeType,
          modified: f.modifiedTime,
          link: f.webViewLink,
          size: f.size ? `${Math.round(parseInt(f.size) / 1024)}KB` : undefined,
        }));
        return JSON.stringify({ files });
      }

      // ── Notion ──
      case 'notion_search': {
        const token = getToken('notion');
        if (!token) return JSON.stringify({ error: 'Notion not connected' });
        const query = args.query as string;
        const res = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, page_size: 10 }),
        });
        if (!res.ok) return JSON.stringify({ error: `Notion API error: ${res.status}` });
        const data = await res.json();
        const results = (data.results || []).map((r: { object: string; id: string; url?: string; properties?: Record<string, { title?: { plain_text: string }[] }>; title?: { plain_text: string }[]; last_edited_time?: string }) => {
          let title = 'Untitled';
          if (r.properties?.title?.title?.[0]?.plain_text) {
            title = r.properties.title.title[0].plain_text;
          } else if (r.properties?.Name?.title?.[0]?.plain_text) {
            title = r.properties.Name.title[0].plain_text;
          } else if (r.title?.[0]?.plain_text) {
            title = r.title[0].plain_text;
          }
          return { title, type: r.object, url: r.url, lastEdited: r.last_edited_time };
        });
        return JSON.stringify({ results });
      }

      case 'notion_create_page': {
        const token = getToken('notion');
        if (!token) return JSON.stringify({ error: 'Notion not connected' });
        const title = args.title as string;
        const content = args.content as string;
        // First, find a suitable parent page (search for workspace-level pages)
        const searchRes = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filter: { property: 'object', value: 'page' }, page_size: 1 }),
        });
        const searchData = await searchRes.json();
        const parentId = searchData.results?.[0]?.id;
        if (!parentId) return JSON.stringify({ error: 'No parent page found in Notion' });

        const res = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { page_id: parentId },
            properties: {
              title: { title: [{ text: { content: title } }] },
            },
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content } }],
                },
              },
            ],
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          return JSON.stringify({ error: `Notion API error: ${res.status} — ${err}` });
        }
        const page = await res.json();
        return JSON.stringify({ created: true, title, url: page.url });
      }

      // ── Slack ──
      case 'slack_search_messages': {
        const token = getToken('slack');
        if (!token) return JSON.stringify({ error: 'Slack not connected' });
        const query = args.query as string;
        const res = await fetch(
          `https://slack.com/api/search.messages?query=${encodeURIComponent(query)}&count=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return JSON.stringify({ error: `Slack API error: ${res.status}` });
        const data = await res.json();
        if (!data.ok) return JSON.stringify({ error: data.error || 'Slack search failed' });
        const messages = (data.messages?.matches || []).slice(0, 10).map((m: { text: string; username?: string; channel?: { name: string }; ts?: string }) => ({
          text: m.text?.substring(0, 200),
          from: m.username,
          channel: m.channel?.name,
          timestamp: m.ts ? new Date(parseFloat(m.ts) * 1000).toISOString() : undefined,
        }));
        return JSON.stringify({ messages });
      }

      case 'slack_list_channels': {
        const token = getToken('slack');
        if (!token) return JSON.stringify({ error: 'Slack not connected' });
        const res = await fetch(
          'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return JSON.stringify({ error: `Slack API error: ${res.status}` });
        const data = await res.json();
        if (!data.ok) return JSON.stringify({ error: data.error || 'Slack channels failed' });
        const channels = (data.channels || []).map((c: { name: string; is_private: boolean; num_members?: number; purpose?: { value: string } }) => ({
          name: c.name,
          private: c.is_private,
          members: c.num_members,
          purpose: c.purpose?.value?.substring(0, 100),
        }));
        return JSON.stringify({ channels });
      }

      // ── Built-in Tools (no integration required) ──
      case 'get_current_datetime': {
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
            hour12: true,
          });
          const isoDate = now.toLocaleDateString('sv-SE', { timeZone: tz }); // YYYY-MM-DD
          return JSON.stringify({ datetime: formatted, iso: isoDate, timezone: tz, unix: Math.floor(now.getTime() / 1000) });
        } catch {
          return JSON.stringify({ error: `Invalid timezone: ${tz}` });
        }
      }

      case 'web_search': {
        const query = args.query as string;
        try {
          // Use DuckDuckGo Instant Answer API (free, no API key)
          const res = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
          );
          const data = await res.json();
          const results: { title: string; snippet: string; url?: string }[] = [];

          // Abstract (main answer)
          if (data.AbstractText) {
            results.push({ title: data.Heading || 'Answer', snippet: data.AbstractText, url: data.AbstractURL });
          }
          // Answer (instant)
          if (data.Answer) {
            results.push({ title: 'Instant Answer', snippet: typeof data.Answer === 'string' ? data.Answer : data.Answer.toString() });
          }
          // Related topics
          if (data.RelatedTopics) {
            for (const topic of data.RelatedTopics.slice(0, 5)) {
              if (topic.Text) {
                results.push({ title: topic.Text.substring(0, 80), snippet: topic.Text, url: topic.FirstURL });
              }
            }
          }

          if (results.length === 0) {
            return JSON.stringify({ message: `No instant results for "${query}". I'll answer based on my knowledge.`, results: [] });
          }
          return JSON.stringify({ results });
        } catch {
          return JSON.stringify({ error: 'Web search temporarily unavailable' });
        }
      }

      case 'calculate': {
        const expression = args.expression as string;
        try {
          // Sanitize: only allow safe math characters and functions
          const sanitized = expression.replace(/[^0-9+\-*/().,%\s^]/g, (match) => {
            const allowed = ['sqrt', 'sin', 'cos', 'tan', 'log', 'ceil', 'floor', 'round', 'abs', 'min', 'max', 'PI', 'E', 'pow', 'random'];
            if (allowed.some(f => match === f[0])) return match;
            return '';
          });
          // Replace math functions with Math.xxx
          const mathExpr = sanitized
            .replace(/\bsqrt\b/g, 'Math.sqrt')
            .replace(/\bsin\b/g, 'Math.sin')
            .replace(/\bcos\b/g, 'Math.cos')
            .replace(/\btan\b/g, 'Math.tan')
            .replace(/\blog\b/g, 'Math.log')
            .replace(/\bceil\b/g, 'Math.ceil')
            .replace(/\bfloor\b/g, 'Math.floor')
            .replace(/\bround\b/g, 'Math.round')
            .replace(/\babs\b/g, 'Math.abs')
            .replace(/\bmin\b/g, 'Math.min')
            .replace(/\bmax\b/g, 'Math.max')
            .replace(/\bpow\b/g, 'Math.pow')
            .replace(/\bPI\b/g, 'Math.PI')
            .replace(/\bE\b/g, 'Math.E')
            .replace(/\*\*/g, '**')
            .replace(/\^/g, '**');
          // Safety check: reject anything with letters that isn't Math
          if (/[a-zA-Z]/.test(mathExpr.replace(/Math\.[a-zA-Z]+/g, ''))) {
            return JSON.stringify({ error: 'Invalid expression. Use numbers and math functions only.' });
          }
          const result = new Function(`"use strict"; return (${mathExpr})`)();
          if (typeof result !== 'number' || !isFinite(result)) {
            return JSON.stringify({ error: 'Expression did not produce a valid number' });
          }
          return JSON.stringify({ expression, result });
        } catch {
          return JSON.stringify({ error: `Failed to evaluate: ${expression}` });
        }
      }

      // ── Web Fetch ──
      case 'web_fetch': {
        const url = args.url as string;
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Nova-AI/1.0 (web-fetch)' },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) return JSON.stringify({ error: `Failed to fetch URL: ${res.status}` });
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
            return JSON.stringify({ error: `Unsupported content type: ${contentType}` });
          }
          const html = await res.text();
          // Strip HTML tags, scripts, styles to extract text
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 4000);
          return JSON.stringify({ url, content: text, length: text.length });
        } catch {
          return JSON.stringify({ error: `Failed to fetch: ${url}` });
        }
      }

      // ── Weather ──
      case 'weather_current': {
        const location = args.location as string;
        try {
          // Use Open-Meteo (free, no API key)
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en`
          );
          const geoData = await geoRes.json();
          if (!geoData.results?.[0]) return JSON.stringify({ error: `Location not found: ${location}` });
          const { latitude, longitude, name, country } = geoData.results[0];
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
          );
          const weatherData = await weatherRes.json();
          const current = weatherData.current;
          const weatherCodes: Record<number, string> = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
            55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
          };
          return JSON.stringify({
            location: `${name}, ${country}`,
            temperature: `${current.temperature_2m}°C`,
            humidity: `${current.relative_humidity_2m}%`,
            wind: `${current.wind_speed_10m} km/h`,
            condition: weatherCodes[current.weather_code] || 'Unknown',
          });
        } catch {
          return JSON.stringify({ error: 'Weather service temporarily unavailable' });
        }
      }

      // ── Image Generation (DALL-E) — rate-limited per user per day ──
      case 'generate_image': {
        const prompt = args.prompt as string;
        const size = (args.size as string) || '1024x1024';

        // Per-user daily DALL-E rate limit (~$0.04/image)
        const imgRateLimit = checkRateLimit(
          `dalle:${userId}`,
          isPro ? RATE_LIMIT_IMAGE_PRO : RATE_LIMIT_IMAGE_FREE
        );
        if (!imgRateLimit.allowed) {
          const limit = isPro ? 50 : 5;
          return JSON.stringify({
            error: `Daily image generation limit reached (${limit}/day). ${isPro ? 'Try again tomorrow.' : 'Upgrade to Pro for 50 images/day.'}`,
            remaining: 0,
            limit,
          });
        }

        try {
          const imageResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: size as '1024x1024' | '1024x1792' | '1792x1024',
          });
          const imageUrl = imageResponse.data?.[0]?.url;
          const revisedPrompt = imageResponse.data?.[0]?.revised_prompt;
          if (!imageUrl) return JSON.stringify({ error: 'Failed to generate image' });
          return JSON.stringify({
            imageUrl, revisedPrompt, size,
            imagesRemaining: imgRateLimit.remaining,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Image generation failed';
          return JSON.stringify({ error: message });
        }
      }

      // ── Translation (via OpenAI) ──
      case 'translate_text': {
        const text = args.text as string;
        const targetLanguage = args.targetLanguage as string;
        const sourceLanguage = args.sourceLanguage as string | undefined;
        try {
          const translateResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a translator. Translate the following text ${sourceLanguage ? `from ${sourceLanguage} ` : ''}to ${targetLanguage}. Return ONLY the translated text, nothing else.`,
              },
              { role: 'user', content: text },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          });
          const translation = translateResponse.choices[0]?.message?.content?.trim();
          return JSON.stringify({
            original: text,
            translated: translation,
            targetLanguage,
            ...(sourceLanguage ? { sourceLanguage } : {}),
          });
        } catch {
          return JSON.stringify({ error: 'Translation failed' });
        }
      }

      // ── URL Summarization ──
      case 'summarize_url': {
        const url = args.url as string;
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Nova-AI/1.0 (summarizer)' },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) return JSON.stringify({ error: `Failed to fetch URL: ${res.status}` });
          const html = await res.text();
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 6000);
          // Use OpenAI to summarize
          const summaryResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Summarize the following web page content in 3-5 concise paragraphs. Highlight the key points.',
              },
              { role: 'user', content: text },
            ],
            temperature: 0.5,
            max_tokens: 500,
          });
          const summary = summaryResponse.choices[0]?.message?.content?.trim();
          return JSON.stringify({ url, summary });
        } catch {
          return JSON.stringify({ error: `Failed to summarize: ${url}` });
        }
      }

      // ── Google Calendar: Create Event ──
      case 'google_calendar_create_event': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const title = args.title as string;
        const startTime = args.startTime as string;
        const endTime = args.endTime as string;
        const description = args.description as string | undefined;
        const location = args.location as string | undefined;
        try {
          const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                summary: title,
                start: { dateTime: startTime },
                end: { dateTime: endTime },
                ...(description ? { description } : {}),
                ...(location ? { location } : {}),
              }),
            }
          );
          if (!res.ok) {
            const err = await res.text();
            return JSON.stringify({ error: `Calendar API error: ${res.status} — ${err}` });
          }
          const event = await res.json();
          return JSON.stringify({
            created: true,
            title,
            start: startTime,
            end: endTime,
            link: event.htmlLink,
          });
        } catch {
          return JSON.stringify({ error: 'Failed to create calendar event' });
        }
      }

      default:
        return JSON.stringify({ error: `Unknown function: ${functionName}` });
    }
  } catch (error) {
    console.error(`Tool call error (${functionName}):`, error);
    return JSON.stringify({ error: 'Failed to execute tool call' });
  }
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

    // Rate limit check
    const rateLimit = checkRateLimit(`chat:${session.user.id}`, RATE_LIMIT_CHAT);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimit.headers } }
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

    // Usage will be incremented AFTER a successful AI response
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

    // Fetch user's connected integrations for tool use
    const connectedIntegrations = await getConnectedIntegrations(user.id);
    const systemPrompt = buildSystemPrompt(connectedIntegrations);
    const tools = getIntegrationTools(connectedIntegrations);

    // Initial OpenAI call — may include tool calls
    let aiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Handle tool calls in a loop (max 3 rounds to prevent infinite loops)
    let toolRound = 0;
    const MAX_TOOL_ROUNDS = 3;
    // Track tool status events to send at the start of the stream
    const toolStatusEvents: string[] = [];

    // Map tool names to human-friendly status messages
    const TOOL_STATUS_LABELS: Record<string, string> = {
      get_current_datetime: 'Checking date & time…',
      web_search: 'Searching the web…',
      web_fetch: 'Fetching web page…',
      calculate: 'Calculating…',
      weather_current: 'Checking the weather…',
      generate_image: 'Generating image… (this may take a moment)',
      translate_text: 'Translating…',
      summarize_url: 'Summarizing web page…',
      google_calendar_list_events: 'Checking your calendar…',
      google_calendar_create_event: 'Creating calendar event…',
      google_gmail_search: 'Searching your email…',
      google_drive_search: 'Searching Google Drive…',
      spotify_get_currently_playing: 'Checking what\'s playing…',
      spotify_search: 'Searching Spotify…',
      notion_search: 'Searching Notion…',
      notion_create_page: 'Creating Notion page…',
      slack_search_messages: 'Searching Slack…',
      slack_list_channels: 'Loading Slack channels…',
    };

    while (toolRound < MAX_TOOL_ROUNDS) {
      const toolResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        ...(tools.length > 0 ? { tools } : {}),
      });

      const choice = toolResponse.choices[0];
      
      if (choice?.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        // Add assistant's tool_calls message
        aiMessages.push(choice.message);

        // Execute each tool call
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const statusLabel = TOOL_STATUS_LABELS[toolCall.function.name] || `Using ${toolCall.function.name}…`;
          toolStatusEvents.push(statusLabel);
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await executeToolCall(toolCall.function.name, args, connectedIntegrations, user.id, tier === 'pro');
          aiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        toolRound++;
        continue;
      }

      // No tool calls — break out and stream the final response
      break;
    }

    // Final streaming call (after all tool calls are resolved)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: aiMessages,
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

        // Send tool status events so the client knows what tools were used
        if (toolStatusEvents.length > 0) {
          for (const status of toolStatusEvents) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ toolStatus: status })}\n\n`)
            );
          }
        }

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

        // Increment usage AFTER successful response (don't charge for failures)
        await incrementUsage(user.id, today, usageRecord ?? null);

        // Generate title if this is the first exchange — fire-and-forget
        const messageCount = await prisma.message.count({
          where: { conversationId: conversation.id },
        });

        if (messageCount === 2 && !conversation.title) {
          // Fire-and-forget: don't block the stream close on title generation
          openai.chat.completions.create({
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
          }).then(async (titleResponse) => {
            const title = titleResponse.choices[0]?.message?.content?.trim();
            if (title) {
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { title },
              });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ title })}\n\n`));
            }
          }).catch((e) => {
            console.error('Failed to generate title:', e);
          }).finally(() => {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });
          return; // Don't close here — finally block will close
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
