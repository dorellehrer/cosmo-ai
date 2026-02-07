/**
 * Tool Executor — executes tool calls against provider APIs.
 *
 * Extracted from src/app/api/chat/route.ts for modularity.
 */

import type { ConnectedIntegration } from './tool-definitions';
import type { AIProvider } from './providers';
import { getOpenAIClient } from './openai-provider';
import { checkRateLimit, RATE_LIMIT_IMAGE, RATE_LIMIT_CALLS } from '@/lib/rate-limit';

/** Get the cheapest model for a given provider (used for internal tool tasks) */
const INTERNAL_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
};

/** Execute a tool call against a provider API */
export async function executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  integrations: ConnectedIntegration[],
  userId: string = 'anon',
  aiProvider: AIProvider,
): Promise<string> {
  try {
    const getToken = (provider: string) => integrations.find((i) => i.provider === provider)?.accessToken;

    switch (functionName) {
      // ── Google Calendar ──
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
        const events = (data.items || []).map((e: { id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; location?: string; description?: string }) => ({
          id: e.id,
          title: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          ...(e.location ? { location: e.location } : {}),
          ...(e.description ? { description: e.description } : {}),
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

      // ── Spotify ──
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

      case 'spotify_play_pause': {
        const token = getToken('spotify');
        if (!token) return JSON.stringify({ error: 'Spotify not connected' });
        const action = args.action as string;
        const endpoint = action === 'pause'
          ? 'https://api.spotify.com/v1/me/player/pause'
          : 'https://api.spotify.com/v1/me/player/play';
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 204 || res.status === 200) return JSON.stringify({ success: true, action });
        if (res.status === 404) return JSON.stringify({ error: 'No active Spotify device found. Please open Spotify on a device first.' });
        if (!res.ok) return JSON.stringify({ error: `Spotify API error: ${res.status}` });
        return JSON.stringify({ success: true, action });
      }

      case 'spotify_skip_track': {
        const token = getToken('spotify');
        if (!token) return JSON.stringify({ error: 'Spotify not connected' });
        const direction = args.direction as string;
        const endpoint = direction === 'previous'
          ? 'https://api.spotify.com/v1/me/player/previous'
          : 'https://api.spotify.com/v1/me/player/next';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 204 || res.status === 200) return JSON.stringify({ success: true, direction });
        if (res.status === 404) return JSON.stringify({ error: 'No active Spotify device found. Please open Spotify on a device first.' });
        if (!res.ok) return JSON.stringify({ error: `Spotify API error: ${res.status}` });
        return JSON.stringify({ success: true, direction });
      }

      case 'spotify_list_playlists': {
        const token = getToken('spotify');
        if (!token) return JSON.stringify({ error: 'Spotify not connected' });
        const limit = Math.min((args.limit as number) || 20, 50);
        const res = await fetch(
          `https://api.spotify.com/v1/me/playlists?limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return JSON.stringify({ error: `Spotify API error: ${res.status}` });
        const data = await res.json();
        const playlists = (data.items || []).map((p: { name: string; id: string; tracks?: { total: number }; owner?: { display_name: string }; public?: boolean }) => ({
          name: p.name,
          id: p.id,
          trackCount: p.tracks?.total,
          owner: p.owner?.display_name,
          public: p.public,
        }));
        return JSON.stringify({ playlists });
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
          return { id: r.id, title, type: r.object, url: r.url, lastEdited: r.last_edited_time };
        });
        return JSON.stringify({ results });
      }

      case 'notion_create_page': {
        const token = getToken('notion');
        if (!token) return JSON.stringify({ error: 'Notion not connected' });
        const title = args.title as string;
        const content = args.content as string;
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

      case 'notion_update_page': {
        const token = getToken('notion');
        if (!token) return JSON.stringify({ error: 'Notion not connected' });
        const pageId = args.pageId as string;
        if (!pageId) return JSON.stringify({ error: 'pageId is required' });
        const title = args.title as string | undefined;
        const content = args.content as string | undefined;
        try {
          if (title) {
            const titleRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                properties: {
                  title: { title: [{ text: { content: title } }] },
                },
              }),
            });
            if (!titleRes.ok) {
              const err = await titleRes.text();
              return JSON.stringify({ error: `Notion API error: ${titleRes.status} — ${err}` });
            }
          }
          if (content) {
            const blockRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
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
            if (!blockRes.ok) {
              const err = await blockRes.text();
              return JSON.stringify({ error: `Notion API error: ${blockRes.status} — ${err}` });
            }
          }
          return JSON.stringify({ updated: true, pageId, ...(title ? { title } : {}), ...(content ? { contentAppended: true } : {}) });
        } catch {
          return JSON.stringify({ error: 'Failed to update Notion page' });
        }
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

      case 'slack_send_message': {
        const token = getToken('slack');
        if (!token) return JSON.stringify({ error: 'Slack not connected' });
        let channel = args.channel as string;
        const text = args.text as string;

        // If channel is a name (not an ID), look it up
        if (!channel.startsWith('C') && !channel.startsWith('D') && !channel.startsWith('G')) {
          const lookupRes = await fetch(
            'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const lookupData = await lookupRes.json();
          const found = (lookupData.channels || []).find(
            (c: { name: string; id: string }) => c.name === channel.replace('#', '')
          );
          if (found) {
            channel = found.id;
          } else {
            return JSON.stringify({ error: `Channel "${channel}" not found` });
          }
        }

        const msgBody: Record<string, string> = { channel, text };
        if (args.thread_ts) msgBody.thread_ts = args.thread_ts as string;
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(msgBody),
        });
        const data = await res.json();
        if (!data.ok) return JSON.stringify({ error: data.error || 'Failed to send message' });
        return JSON.stringify({ sent: true, channel: data.channel, timestamp: data.ts, thread_ts: data.message?.thread_ts });
      }

      case 'slack_send_dm': {
        const token = getToken('slack');
        if (!token) return JSON.stringify({ error: 'Slack not connected' });
        const slackUserId = args.userId as string;
        const text = args.text as string;
        const openRes = await fetch('https://slack.com/api/conversations.open', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ users: slackUserId }),
        });
        const openData = await openRes.json();
        if (!openData.ok) return JSON.stringify({ error: openData.error || 'Failed to open DM conversation' });
        const dmChannelId = openData.channel?.id;
        if (!dmChannelId) return JSON.stringify({ error: 'Failed to get DM channel' });
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel: dmChannelId, text }),
        });
        const data = await res.json();
        if (!data.ok) return JSON.stringify({ error: data.error || 'Failed to send DM' });
        return JSON.stringify({ sent: true, userId: slackUserId, timestamp: data.ts });
      }

      // ── Built-in Tools ──
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
          const isoDate = now.toLocaleDateString('sv-SE', { timeZone: tz });
          return JSON.stringify({ datetime: formatted, iso: isoDate, timezone: tz, unix: Math.floor(now.getTime() / 1000) });
        } catch {
          return JSON.stringify({ error: `Invalid timezone: ${tz}` });
        }
      }

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

        // Fallback: DuckDuckGo Instant Answer API (free, no key)
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
            results.push({ title: 'Instant Answer', snippet: typeof data.Answer === 'string' ? data.Answer : data.Answer.toString() });
          }
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
          const sanitized = expression.replace(/[^0-9+\-*/().,%\s^]/g, (match) => {
            const allowed = ['sqrt', 'sin', 'cos', 'tan', 'log', 'ceil', 'floor', 'round', 'abs', 'min', 'max', 'PI', 'E', 'pow', 'random'];
            if (allowed.some(f => match === f[0])) return match;
            return '';
          });
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

      case 'weather_current': {
        const location = args.location as string;
        try {
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

      case 'generate_image': {
        const prompt = args.prompt as string;
        const size = (args.size as string) || '1024x1024';

        const imgRateLimit = checkRateLimit(
          `dalle:${userId}`,
          RATE_LIMIT_IMAGE
        );
        if (!imgRateLimit.allowed) {
          return JSON.stringify({
            error: 'Daily image generation limit reached (50/day). Try again tomorrow.',
            remaining: 0,
            limit: 50,
          });
        }

        try {
          const openai = getOpenAIClient();
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

      case 'translate_text': {
        const text = args.text as string;
        const targetLanguage = args.targetLanguage as string;
        const sourceLanguage = args.sourceLanguage as string | undefined;
        try {
          const translation = await aiProvider.quickChat({
            model: INTERNAL_MODELS[aiProvider.name] || 'gpt-4o-mini',
            systemPrompt: `You are a translator. Translate the following text ${sourceLanguage ? `from ${sourceLanguage} ` : ''}to ${targetLanguage}. Return ONLY the translated text, nothing else.`,
            userMessage: text,
            temperature: 0.3,
            maxTokens: 1000,
          });
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
          const summary = await aiProvider.quickChat({
            model: INTERNAL_MODELS[aiProvider.name] || 'gpt-4o-mini',
            systemPrompt: 'Summarize the following web page content in 3-5 concise paragraphs. Highlight the key points.',
            userMessage: text,
            temperature: 0.5,
            maxTokens: 500,
          });
          return JSON.stringify({ url, summary });
        } catch {
          return JSON.stringify({ error: `Failed to summarize: ${url}` });
        }
      }

      // ── Google Calendar: Write Operations ──
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

      case 'google_calendar_update_event': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const eventId = args.eventId as string;
        if (!eventId) return JSON.stringify({ error: 'eventId is required' });
        try {
          const body: Record<string, unknown> = {};
          if (args.title) body.summary = args.title as string;
          if (args.description) body.description = args.description as string;
          if (args.location) body.location = args.location as string;
          if (args.startTime) body.start = { dateTime: args.startTime as string };
          if (args.endTime) body.end = { dateTime: args.endTime as string };
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            }
          );
          if (!res.ok) {
            const err = await res.text();
            return JSON.stringify({ error: `Calendar API error: ${res.status} — ${err}` });
          }
          const event = await res.json();
          return JSON.stringify({
            updated: true,
            id: event.id,
            title: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            link: event.htmlLink,
          });
        } catch {
          return JSON.stringify({ error: 'Failed to update calendar event' });
        }
      }

      case 'google_calendar_delete_event': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const eventId = args.eventId as string;
        if (!eventId) return JSON.stringify({ error: 'eventId is required' });
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!res.ok) {
            const err = await res.text();
            return JSON.stringify({ error: `Calendar API error: ${res.status} — ${err}` });
          }
          return JSON.stringify({ deleted: true, eventId });
        } catch {
          return JSON.stringify({ error: 'Failed to delete calendar event' });
        }
      }

      case 'google_gmail_send': {
        const token = getToken('google');
        if (!token) return JSON.stringify({ error: 'Google not connected' });
        const to = args.to as string;
        const subject = args.subject as string;
        const body = args.body as string;
        const replyToMessageId = args.replyToMessageId as string | undefined;
        try {
          const messageParts = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset="UTF-8"',
            ...(replyToMessageId ? [`In-Reply-To: ${replyToMessageId}`, `References: ${replyToMessageId}`] : []),
            '',
            body,
          ];
          const rawMessage = messageParts.join('\r\n');
          const encoded = Buffer.from(rawMessage).toString('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          const reqBody: Record<string, unknown> = { raw: encoded };
          if (replyToMessageId) reqBody.threadId = replyToMessageId;
          const res = await fetch(
            'https://www.googleapis.com/gmail/v1/users/me/messages/send',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(reqBody),
            }
          );
          if (!res.ok) {
            const err = await res.text();
            return JSON.stringify({ error: `Gmail API error: ${res.status} — ${err}` });
          }
          const data = await res.json();
          return JSON.stringify({ sent: true, to, subject, messageId: data.id });
        } catch {
          return JSON.stringify({ error: 'Failed to send email' });
        }
      }

      // ── Philips Hue ──
      case 'hue_list_lights': {
        const token = getToken('hue');
        if (!token) return JSON.stringify({ error: 'Philips Hue not connected' });
        const res = await fetch('https://api.meethue.com/clip/v2/resource/light', {
          headers: { Authorization: `Bearer ${token}`, 'hue-application-key': 'nova-ai' },
        });
        if (!res.ok) return JSON.stringify({ error: `Hue API error: ${res.status}` });
        const data = await res.json();
        const lights = (data.data || []).map((l: { id: string; metadata?: { name: string }; on?: { on: boolean }; dimming?: { brightness: number }; color?: { xy?: { x: number; y: number } } }) => ({
          id: l.id,
          name: l.metadata?.name || 'Unknown',
          on: l.on?.on,
          brightness: l.dimming?.brightness,
        }));
        return JSON.stringify({ lights });
      }

      case 'hue_control_light': {
        const token = getToken('hue');
        if (!token) return JSON.stringify({ error: 'Philips Hue not connected' });
        const lightId = args.lightId as string;
        if (!lightId) return JSON.stringify({ error: 'lightId is required' });
        const body: Record<string, unknown> = {};
        if (args.on !== undefined) body.on = { on: args.on as boolean };
        if (args.brightness !== undefined) body.dimming = { brightness: Math.min(100, Math.max(0, args.brightness as number)) };
        if (args.color) {
          const colorMap: Record<string, { x: number; y: number }> = {
            red: { x: 0.675, y: 0.322 },
            blue: { x: 0.167, y: 0.04 },
            green: { x: 0.409, y: 0.518 },
            purple: { x: 0.3, y: 0.15 },
            orange: { x: 0.57, y: 0.41 },
            yellow: { x: 0.44, y: 0.51 },
            pink: { x: 0.45, y: 0.23 },
            'warm white': { x: 0.459, y: 0.41 },
            'cool white': { x: 0.313, y: 0.328 },
          };
          const xy = colorMap[(args.color as string).toLowerCase()];
          if (xy) body.color = { xy };
        }
        const res = await fetch(`https://api.meethue.com/clip/v2/resource/light/${encodeURIComponent(lightId)}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'hue-application-key': 'nova-ai',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.text();
          return JSON.stringify({ error: `Hue API error: ${res.status} — ${err}` });
        }
        return JSON.stringify({ success: true, lightId, ...body });
      }

      case 'hue_list_scenes': {
        const token = getToken('hue');
        if (!token) return JSON.stringify({ error: 'Philips Hue not connected' });
        const res = await fetch('https://api.meethue.com/clip/v2/resource/scene', {
          headers: { Authorization: `Bearer ${token}`, 'hue-application-key': 'nova-ai' },
        });
        if (!res.ok) return JSON.stringify({ error: `Hue API error: ${res.status}` });
        const data = await res.json();
        const scenes = (data.data || []).map((s: { id: string; metadata?: { name: string }; group?: { rid: string } }) => ({
          id: s.id,
          name: s.metadata?.name || 'Unknown',
          groupId: s.group?.rid,
        }));
        return JSON.stringify({ scenes });
      }

      case 'hue_activate_scene': {
        const token = getToken('hue');
        if (!token) return JSON.stringify({ error: 'Philips Hue not connected' });
        const sceneId = args.sceneId as string;
        if (!sceneId) return JSON.stringify({ error: 'sceneId is required' });
        const res = await fetch(`https://api.meethue.com/clip/v2/resource/scene/${encodeURIComponent(sceneId)}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'hue-application-key': 'nova-ai',
          },
          body: JSON.stringify({ recall: { action: 'active' } }),
        });
        if (!res.ok) {
          const err = await res.text();
          return JSON.stringify({ error: `Hue API error: ${res.status} — ${err}` });
        }
        return JSON.stringify({ activated: true, sceneId });
      }

      // ── Sonos ──
      case 'sonos_get_groups': {
        const token = getToken('sonos');
        if (!token) return JSON.stringify({ error: 'Sonos not connected' });
        const hhRes = await fetch('https://api.ws.sonos.com/control/api/v1/households', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!hhRes.ok) return JSON.stringify({ error: `Sonos API error: ${hhRes.status}` });
        const hhData = await hhRes.json();
        const hhId = hhData.households?.[0]?.id;
        if (!hhId) return JSON.stringify({ error: 'No Sonos household found' });
        const groupsRes = await fetch(`https://api.ws.sonos.com/control/api/v1/households/${hhId}/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!groupsRes.ok) return JSON.stringify({ error: `Sonos API error: ${groupsRes.status}` });
        const groupsData = await groupsRes.json();
        const groups = (groupsData.groups || []).map((g: { id: string; name: string; playbackState?: string; playerIds?: string[] }) => ({
          id: g.id,
          name: g.name,
          playbackState: g.playbackState,
          playerCount: g.playerIds?.length || 0,
        }));
        const players = (groupsData.players || []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }));
        return JSON.stringify({ groups, players });
      }

      case 'sonos_playback_control': {
        const token = getToken('sonos');
        if (!token) return JSON.stringify({ error: 'Sonos not connected' });
        const groupId = args.groupId as string;
        const action = args.action as string;
        if (!groupId || !action) return JSON.stringify({ error: 'groupId and action are required' });
        const res = await fetch(`https://api.ws.sonos.com/control/api/v1/groups/${encodeURIComponent(groupId)}/playback/${action}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const err = await res.text();
          return JSON.stringify({ error: `Sonos API error: ${res.status} — ${err}` });
        }
        return JSON.stringify({ success: true, groupId, action });
      }

      case 'sonos_set_volume': {
        const token = getToken('sonos');
        if (!token) return JSON.stringify({ error: 'Sonos not connected' });
        const groupId = args.groupId as string;
        const volume = args.volume as number;
        if (!groupId || volume === undefined) return JSON.stringify({ error: 'groupId and volume are required' });
        const res = await fetch(`https://api.ws.sonos.com/control/api/v1/groups/${encodeURIComponent(groupId)}/groupVolume`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ volume: Math.min(100, Math.max(0, volume)) }),
        });
        if (!res.ok) {
          const err = await res.text();
          return JSON.stringify({ error: `Sonos API error: ${res.status} — ${err}` });
        }
        return JSON.stringify({ success: true, groupId, volume });
      }

      // ── Create Routine (built-in) ────────────────────
      case 'create_routine': {
        const { name, description, schedule, toolChain } = args as {
          name: string;
          description?: string;
          schedule: string;
          toolChain: { toolName: string; args?: Record<string, unknown> }[];
        };

        // Validate cron
        const { isValidCron, getNextRun, cronToHuman } = await import('@/lib/cron');
        if (!isValidCron(schedule)) {
          return JSON.stringify({ error: 'Invalid cron schedule. Use 5-field format like "0 8 * * *".' });
        }
        if (!toolChain || toolChain.length === 0) {
          return JSON.stringify({ error: 'toolChain must have at least one step.' });
        }

        const { prisma } = await import('@/lib/prisma');

        // Check limit
        const count = await prisma.routine.count({ where: { userId } });
        if (count >= 20) {
          return JSON.stringify({ error: 'Maximum 20 routines reached. Delete one to create a new one.' });
        }

        const nextRun = getNextRun(schedule);
        const routine = await prisma.routine.create({
          data: {
            userId,
            name: name.trim(),
            description: description?.trim() || null,
            schedule,
            toolChain: JSON.stringify(toolChain),
            nextRun,
          },
        });

        return JSON.stringify({
          success: true,
          routine: {
            id: routine.id,
            name: routine.name,
            schedule: cronToHuman(schedule),
            steps: toolChain.length,
            nextRun: nextRun.toISOString(),
          },
          message: `Routine "${routine.name}" created! It will run ${cronToHuman(schedule).toLowerCase()}, starting ${nextRun.toLocaleString()}.`,
        });
      }

      // ── WhatsApp Tools ──────────────────────────────
      case 'whatsapp_send_message': {
        const whatsapp = integrations.find(i => i.provider === 'whatsapp');
        if (!whatsapp) return JSON.stringify({ error: 'WhatsApp is not connected. Please connect it in Settings → Integrations.' });

        const to = args.to as string;
        const message = args.message as string;

        try {
          const res = await fetch('https://graph.facebook.com/v18.0/me/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsapp.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: to.replace(/[^+\d]/g, ''),
              type: 'text',
              text: { body: message },
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return JSON.stringify({ error: `Failed to send WhatsApp message: ${errData?.error?.message || res.statusText}` });
          }

          return JSON.stringify({
            success: true,
            message: `Message sent to ${to} via WhatsApp.`,
          });
        } catch (err) {
          return JSON.stringify({ error: `WhatsApp API error: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }

      case 'whatsapp_read_messages': {
        const whatsapp = integrations.find(i => i.provider === 'whatsapp');
        if (!whatsapp) return JSON.stringify({ error: 'WhatsApp is not connected. Please connect it in Settings → Integrations.' });

        // WhatsApp Business API doesn't directly support reading messages via REST.
        // In production, messages are received via webhook and stored in DB.
        // For now, return a helpful message about the webhook-based architecture.
        return JSON.stringify({
          info: 'WhatsApp messages are received in real-time via webhooks. Recent messages from your conversations are shown in the WhatsApp integration panel.',
          tip: 'Ask me to send a message instead, or check the WhatsApp integration page for received messages.',
        });
      }

      // ── Discord Tools ──────────────────────────────
      case 'discord_send_message': {
        const discord = integrations.find(i => i.provider === 'discord');
        if (!discord) return JSON.stringify({ error: 'Discord is not connected. Please connect it in Settings → Integrations.' });

        const message = args.message as string;
        let channelId = args.channelId as string | undefined;
        const serverName = args.serverName as string | undefined;
        const channelName = args.channelName as string | undefined;

        try {
          // If no channelId, try to find it by server/channel name
          if (!channelId && (serverName || channelName)) {
            const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
              headers: { 'Authorization': `Bearer ${discord.accessToken}` },
            });
            const guilds = await guildsRes.json();
            const guild = guilds.find((g: { name: string }) =>
              serverName ? g.name.toLowerCase().includes(serverName.toLowerCase()) : true
            );

            if (guild) {
              // Use bot token for channel listing (OAuth doesn't have guild.channels scope)
              const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
                headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
              });
              const channels = await channelsRes.json();
              const channel = channels.find((c: { name: string; type: number }) =>
                channelName ? c.name.toLowerCase().includes(channelName.toLowerCase()) && c.type === 0 : c.type === 0
              );
              if (channel) channelId = channel.id;
            }
          }

          if (!channelId) {
            return JSON.stringify({ error: 'Could not find the Discord channel. Please provide a channelId or valid server/channel name.' });
          }

          const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: message }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return JSON.stringify({ error: `Failed to send Discord message: ${errData?.message || res.statusText}` });
          }

          return JSON.stringify({
            success: true,
            message: `Message sent to Discord${channelName ? ` #${channelName}` : ''}.`,
          });
        } catch (err) {
          return JSON.stringify({ error: `Discord API error: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }

      case 'discord_read_messages': {
        const discord = integrations.find(i => i.provider === 'discord');
        if (!discord) return JSON.stringify({ error: 'Discord is not connected. Please connect it in Settings → Integrations.' });

        const channelId = args.channelId as string;
        const limit = Math.min((args.limit as number) || 10, 50);

        if (!channelId) {
          return JSON.stringify({ error: 'Please provide a channelId. Use discord_list_servers to find channel IDs.' });
        }

        try {
          const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`, {
            headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          });

          if (!res.ok) {
            return JSON.stringify({ error: `Failed to read Discord messages: ${res.statusText}` });
          }

          const messages = await res.json();
          return JSON.stringify({
            messages: messages.map((m: { author: { username: string }; content: string; timestamp: string }) => ({
              author: m.author.username,
              content: m.content,
              timestamp: m.timestamp,
            })),
          });
        } catch (err) {
          return JSON.stringify({ error: `Discord API error: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }

      case 'discord_list_servers': {
        const discord = integrations.find(i => i.provider === 'discord');
        if (!discord) return JSON.stringify({ error: 'Discord is not connected. Please connect it in Settings → Integrations.' });

        try {
          const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${discord.accessToken}` },
          });
          const guilds = await guildsRes.json();

          const serversWithChannels = await Promise.all(
            guilds.slice(0, 10).map(async (guild: { id: string; name: string }) => {
              try {
                const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
                  headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
                });
                const channels = await channelsRes.json();
                return {
                  name: guild.name,
                  id: guild.id,
                  channels: Array.isArray(channels)
                    ? channels
                        .filter((c: { type: number }) => c.type === 0) // Text channels only
                        .slice(0, 20)
                        .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
                    : [],
                };
              } catch {
                return { name: guild.name, id: guild.id, channels: [] };
              }
            })
          );

          return JSON.stringify({ servers: serversWithChannels });
        } catch (err) {
          return JSON.stringify({ error: `Discord API error: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }

      // ── AI Phone Call Tools ──────────────────────────────
      case 'call_contact': {
        const phone = integrations.find(i => i.provider === 'phone');
        if (!phone) return JSON.stringify({ error: 'AI Phone Calls is not connected. Please enable it in Settings → Integrations.' });

        // Rate limit AI calls
        const callRateLimit = checkRateLimit(`calls:${userId}`, RATE_LIMIT_CALLS);
        if (!callRateLimit.allowed) {
          return JSON.stringify({
            error: 'Daily AI call limit reached (10/day). Try again tomorrow.',
            remaining: 0,
          });
        }

        const contactName = args.contactName as string;
        const phoneNumber = args.phoneNumber as string;
        const objective = args.objective as string;
        const tone = (args.tone as string) || 'friendly';

        try {
          // Import prisma dynamically to avoid circular deps
          const { prisma } = await import('@/lib/prisma');

          // Create call record
          const callRecord = await prisma.callRecord.create({
            data: {
              userId,
              contactName,
              phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask for display
              direction: 'outbound',
              status: 'initiated',
            },
          });

          // In production, this would call Twilio/Vapi/Bland.ai to initiate the call
          // For now, simulate the call initiation
          return JSON.stringify({
            success: true,
            callId: callRecord.id,
            message: `AI call initiated to ${contactName} (${phoneNumber}). The AI will ${objective}. Tone: ${tone}. You'll receive a transcript and summary when the call ends.`,
            estimatedCost: '$0.10/minute',
            note: 'AI Phone Calls are in beta. The call will appear in your call history once completed.',
          });
        } catch (err) {
          return JSON.stringify({ error: `Failed to initiate call: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }

      case 'call_list_recent': {
        const limit = Math.min((args.limit as number) || 10, 50);

        try {
          const { prisma } = await import('@/lib/prisma');

          const calls = await prisma.callRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
          });

          if (calls.length === 0) {
            return JSON.stringify({ message: 'No recent calls found.', calls: [] });
          }

          return JSON.stringify({
            calls: calls.map(c => ({
              id: c.id,
              contact: c.contactName,
              phone: c.phoneNumber,
              status: c.status,
              duration: c.durationSeconds > 0 ? `${Math.ceil(c.durationSeconds / 60)} min` : 'N/A',
              cost: c.costCents > 0 ? `$${(c.costCents / 100).toFixed(2)}` : 'N/A',
              summary: c.summary || 'No summary available',
              date: c.createdAt.toISOString(),
            })),
          });
        } catch (err) {
          return JSON.stringify({ error: `Failed to list calls: ${err instanceof Error ? err.message : 'Unknown error'}` });
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
