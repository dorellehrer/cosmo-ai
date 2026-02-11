/**
 * Tool Definitions — all AI tool schemas and system prompt building.
 *
 * Extracted from src/app/api/chat/route.ts for modularity.
 */

import { prisma } from '@/lib/prisma';
import { decryptToken, refreshAccessToken, OAUTH_PROVIDERS, encryptToken, isOAuthProvider } from '@/lib/integrations';
import type { ToolDefinition } from './providers';

// ── Types ───────────────────────────────────────

export interface ConnectedIntegration {
  provider: string;
  accessToken: string;
  email?: string | null;
}

// ── System Prompt ───────────────────────────────

export const BASE_SYSTEM_PROMPT = `You are Nova, a friendly and capable AI assistant. You're warm, helpful, and conversational - like talking to a knowledgeable friend.

Key traits:
- You're genuinely helpful, not performatively helpful
- You have personality - you can be playful, make jokes, express opinions
- You're concise but thorough when needed
- You anticipate needs and offer proactive suggestions
- You remember context from the conversation

You have built-in tools: current date/time, web search, and a calculator. Use them proactively when relevant.

Keep responses conversational and natural. Don't use excessive formatting or bullet points unless it genuinely helps clarity.`;

export const integrationDescriptions: Record<string, string> = {
  google: 'Google (Calendar, Gmail, Drive) — you can list, create, update, and delete calendar events, search emails (read-only), and search Drive files',
  spotify: 'Spotify — you can check what\'s playing, search for music, control playback (play, pause, skip), and list playlists',
  notion: 'Notion — you can search pages, create new pages, and update existing pages',
  slack: 'Slack — you can search messages, list channels, send messages to channels (with optional thread replies), and send direct messages',
  hue: 'Philips Hue — you can list lights, control individual lights (on/off, brightness, color), list scenes, and activate scenes',
  sonos: 'Sonos — you can list speaker groups, control playback (play, pause, skip), and adjust volume',
  whatsapp: 'WhatsApp — you can send messages to contacts and read recent messages from conversations',
  discord: 'Discord — you can send messages to channels, read channel messages, and list servers',
  phone: 'AI Phone Calls — you can make AI-powered voice calls to contacts and view recent call history with transcripts. Calls are billed at $0.10/minute',
};

export function buildSystemPrompt(connectedIntegrations: ConnectedIntegration[], hasDesktopTools = false): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (connectedIntegrations.length > 0) {
    const connectedList = connectedIntegrations
      .map((i) => integrationDescriptions[i.provider] || i.provider)
      .join('\n- ');

    prompt += `\n\nYou have access to the following connected integrations:\n- ${connectedList}\n\nWhen the user asks about these services, use the available tools to fetch real data. Be helpful and proactive — if someone mentions a meeting, check their calendar. If they mention music, check Spotify.`;
  } else {
    prompt += '\n\nWhen users ask about capabilities you don\'t have yet (like controlling smart home, checking emails, etc.), acknowledge what you\'ll be able to do soon and offer alternatives for now.';
  }

  if (hasDesktopTools) {
    prompt += `\n\nYou also have access to macOS desktop automation tools. You can:
- Read/write files, search files, reveal in Finder
- Check and create Calendar events and Reminders
- Search and send emails via Mail
- Create and search Notes
- Control system settings (volume, brightness, dark mode, Do Not Disturb)
- Launch, quit, and focus applications
- Manage windows (list, resize, minimize)
- Run Spotlight searches
- Run allowlisted shell commands
- Speak text aloud
- Create scheduled automation routines
- Read screen elements and interact with UI via Accessibility (click buttons, type text, press keys)
- Check and request Accessibility permissions

Use these tools when the user asks to interact with their Mac. Be proactive — if they mention a file, offer to find or read it. If they mention a reminder, offer to create one. If they want to interact with app UI elements, use accessibility tools (but check permission first).`;
  }

  return prompt;
}

// ── Tool Status Labels ──────────────────────────

export const TOOL_STATUS_LABELS: Record<string, string> = {
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
  google_calendar_update_event: 'Updating calendar event…',
  google_calendar_delete_event: 'Deleting calendar event…',
  google_gmail_send: 'Sending email…',
  google_gmail_search: 'Searching your email…',
  google_drive_search: 'Searching Google Drive…',
  spotify_get_currently_playing: 'Checking what\'s playing…',
  spotify_search: 'Searching Spotify…',
  spotify_play_pause: 'Controlling Spotify playback…',
  spotify_skip_track: 'Skipping track…',
  spotify_list_playlists: 'Loading your playlists…',
  notion_search: 'Searching Notion…',
  notion_create_page: 'Creating Notion page…',
  notion_update_page: 'Updating Notion page…',
  slack_search_messages: 'Searching Slack…',
  slack_list_channels: 'Loading Slack channels…',
  slack_send_message: 'Sending Slack message…',
  slack_send_dm: 'Sending Slack DM…',
  hue_list_lights: 'Checking your lights…',
  hue_control_light: 'Controlling light…',
  hue_list_scenes: 'Loading scenes…',
  hue_activate_scene: 'Activating scene…',
  sonos_get_groups: 'Checking your speakers…',
  sonos_playback_control: 'Controlling Sonos playback…',
  sonos_set_volume: 'Adjusting volume…',
  create_routine: 'Creating routine…',
  // WhatsApp
  whatsapp_send_message: 'Sending WhatsApp message…',
  whatsapp_read_messages: 'WhatsApp beta preview (simulated)…',
  // Discord
  discord_send_message: 'Sending Discord message…',
  discord_read_messages: 'Reading Discord messages…',
  discord_list_servers: 'Loading Discord servers…',
  // AI Phone Calls
  call_contact: 'Phone call beta preview (simulated)…',
  call_list_recent: 'Loading recent calls…',
  // Gateway device tools
  device_imessage_get_chats: 'Checking iMessage chats on your device…',
  device_imessage_get_messages: 'Reading iMessage conversation…',
  device_imessage_send: 'Sending iMessage…',
  device_imessage_search: 'Searching iMessages…',
};

// ── Desktop Tool Status Labels ──────────────────

export const DESKTOP_TOOL_STATUS_LABELS: Record<string, string> = {
  desktop_calendar_list_events: 'Checking your calendar…',
  desktop_calendar_create_event: 'Creating calendar event…',
  desktop_reminders_list: 'Loading your reminders…',
  desktop_reminders_create: 'Creating reminder…',
  desktop_mail_search: 'Searching your email…',
  desktop_mail_send: 'Sending email…',
  desktop_mail_unread_count: 'Checking unread mail…',
  desktop_notes_create: 'Creating note…',
  desktop_notes_search: 'Searching notes…',
  desktop_system_get_volume: 'Checking volume…',
  desktop_system_set_volume: 'Adjusting volume…',
  desktop_system_get_dark_mode: 'Checking dark mode…',
  desktop_system_set_dark_mode: 'Toggling dark mode…',
  desktop_system_get_brightness: 'Checking brightness…',
  desktop_system_set_brightness: 'Adjusting brightness…',
  desktop_system_toggle_dnd: 'Toggling Do Not Disturb…',
  desktop_system_lock_screen: 'Locking screen…',
  desktop_system_empty_trash: 'Emptying trash…',
  desktop_app_list: 'Listing running apps…',
  desktop_app_launch: 'Launching app…',
  desktop_app_quit: 'Quitting app…',
  desktop_app_focus: 'Focusing app…',
  desktop_fs_read_file: 'Reading file…',
  desktop_fs_write_file: 'Writing file…',
  desktop_fs_list_dir: 'Listing directory…',
  desktop_fs_search: 'Searching files…',
  desktop_fs_move_to_trash: 'Moving to trash…',
  desktop_fs_reveal_in_finder: 'Revealing in Finder…',
  desktop_window_list: 'Listing windows…',
  desktop_window_resize: 'Resizing window…',
  desktop_window_minimize_all: 'Minimizing all windows…',
  desktop_spotlight_search: 'Searching with Spotlight…',
  desktop_speak: 'Speaking text…',
  desktop_shell_run: 'Running command…',
  desktop_routine_create: 'Creating routine…',
  desktop_routine_list: 'Loading routines…',
  desktop_routine_delete: 'Deleting routine…',
  desktop_routine_run_now: 'Running routine…',
  // Accessibility
  desktop_accessibility_check: 'Checking accessibility permission…',
  desktop_accessibility_request: 'Requesting accessibility permission…',
  desktop_accessibility_click: 'Clicking element…',
  desktop_accessibility_type: 'Typing text…',
  desktop_accessibility_press_key: 'Pressing key…',
  desktop_accessibility_read_screen: 'Reading screen elements…',
  // Additional
  desktop_calendar_list_calendars: 'Listing calendars…',
  desktop_reminders_list_lists: 'Listing reminder lists…',
  desktop_app_is_running: 'Checking if app is running…',
  desktop_system_sleep: 'Putting Mac to sleep…',
  desktop_system_get_dnd: 'Checking Do Not Disturb…',
  desktop_list_voices: 'Listing available voices…',
};

// ── Integration Token Helpers ───────────────────

/** Get a valid access token for a user's integration, refreshing if expired */
async function getValidToken(integration: {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  userId: string;
}): Promise<string | null> {
  try {
    let accessToken = decryptToken(integration.accessToken);

    // Check if token is expired (with 5 min buffer)
    if (integration.expiresAt && integration.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      if (!integration.refreshToken || !isOAuthProvider(integration.provider) || !OAUTH_PROVIDERS[integration.provider]) {
        return null;
      }
      const refreshToken = decryptToken(integration.refreshToken);
      const tokens = await refreshAccessToken(integration.provider, refreshToken);

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
export async function getConnectedIntegrations(userId: string): Promise<ConnectedIntegration[]> {
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

// ── Gateway Device Tools ───────────────────────

export function getGatewayDeviceTools(availableCapabilities: string[]): ToolDefinition[] {
  const caps = new Set(availableCapabilities);
  const tools: ToolDefinition[] = [];

  if (caps.has('imessage')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'device_imessage_get_chats',
          description: 'List recent iMessage chats from the user’s connected desktop device.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Maximum chats to return (default 20)', default: 20 },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'device_imessage_get_messages',
          description: 'Read recent iMessages in a specific chat on the connected desktop device.',
          parameters: {
            type: 'object',
            properties: {
              chatIdentifier: { type: 'string', description: 'Chat identifier (phone/email thread)' },
              limit: { type: 'number', description: 'Maximum messages to return (default 50)', default: 50 },
            },
            required: ['chatIdentifier'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'device_imessage_send',
          description: 'Send an iMessage from the connected desktop device.',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Phone number, email, or chat identifier' },
              text: { type: 'string', description: 'Message text to send' },
            },
            required: ['to', 'text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'device_imessage_search',
          description: 'Search iMessage history on the connected desktop device.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search text' },
              limit: { type: 'number', description: 'Maximum matches to return (default 30)', default: 30 },
            },
            required: ['query'],
          },
        },
      }
    );
  }

  return tools;
}

// ── Tool Definitions ────────────────────────────

export function getIntegrationTools(connectedIntegrations: ConnectedIntegration[]): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
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
      },
      {
        type: 'function',
        function: {
          name: 'spotify_play_pause',
          description: 'Play or pause the user\'s Spotify playback. Call this when the user wants to play, pause, or resume music.',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['play', 'pause'], description: 'Whether to play or pause' },
            },
            required: ['action'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'spotify_skip_track',
          description: 'Skip to the next or previous track on Spotify. Call this when the user wants to skip or go back a song.',
          parameters: {
            type: 'object',
            properties: {
              direction: { type: 'string', enum: ['next', 'previous'], description: 'Skip forward or backward' },
            },
            required: ['direction'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'spotify_list_playlists',
          description: 'List the user\'s Spotify playlists. Call this when the user asks about their playlists.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of playlists to return (default 20, max 50)' },
            },
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
      },
      {
        type: 'function',
        function: {
          name: 'notion_update_page',
          description: 'Update an existing Notion page. Use the page ID from notion_search. You can update the title and/or append new content.',
          parameters: {
            type: 'object',
            properties: {
              pageId: { type: 'string', description: 'The page ID to update (from notion_search)' },
              title: { type: 'string', description: 'New page title (optional)' },
              content: { type: 'string', description: 'Content to append to the page (optional)' },
            },
            required: ['pageId'],
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
      },
      {
        type: 'function',
        function: {
          name: 'slack_send_message',
          description: 'Send a message to a Slack channel, optionally as a thread reply. Call this when the user wants to post a message to a Slack channel.',
          parameters: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name (without #) or channel ID' },
              text: { type: 'string', description: 'Message text to send' },
              thread_ts: { type: 'string', description: 'Thread timestamp to reply to (optional — makes this a thread reply)' },
            },
            required: ['channel', 'text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'slack_send_dm',
          description: 'Send a direct message to a Slack user. Call this when the user wants to DM someone on Slack.',
          parameters: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'The Slack user ID to send a DM to' },
              text: { type: 'string', description: 'Message text to send' },
            },
            required: ['userId', 'text'],
          },
        },
      }
    );
  }

  if (providers.has('hue')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'hue_list_lights',
          description: 'List all Philips Hue lights in the user\'s home. Returns light names, states, brightness, and colors.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'hue_control_light',
          description: 'Control a Philips Hue light — turn on/off, change brightness, or change color.',
          parameters: {
            type: 'object',
            properties: {
              lightId: { type: 'string', description: 'The light ID (from hue_list_lights)' },
              on: { type: 'boolean', description: 'Turn light on (true) or off (false)' },
              brightness: { type: 'number', description: 'Brightness level 0-100' },
              color: { type: 'string', description: 'Color name (e.g., "red", "blue", "warm white", "cool white", "green", "purple", "orange")' },
            },
            required: ['lightId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'hue_list_scenes',
          description: 'List available Philips Hue scenes that can be activated.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'hue_activate_scene',
          description: 'Activate a Philips Hue scene (e.g., "Relax", "Energize", "Read").',
          parameters: {
            type: 'object',
            properties: {
              sceneId: { type: 'string', description: 'The scene ID (from hue_list_scenes)' },
            },
            required: ['sceneId'],
          },
        },
      }
    );
  }

  if (providers.has('sonos')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'sonos_get_groups',
          description: 'List Sonos speaker groups in the user\'s household. Returns group names, player names, and playback state.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'sonos_playback_control',
          description: 'Control Sonos playback — play, pause, skip forward, or skip backward.',
          parameters: {
            type: 'object',
            properties: {
              groupId: { type: 'string', description: 'The speaker group ID (from sonos_get_groups)' },
              action: { type: 'string', enum: ['play', 'pause', 'skipToNextTrack', 'skipToPreviousTrack'], description: 'Playback action' },
            },
            required: ['groupId', 'action'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'sonos_set_volume',
          description: 'Set volume for a Sonos speaker group (0-100).',
          parameters: {
            type: 'object',
            properties: {
              groupId: { type: 'string', description: 'The speaker group ID (from sonos_get_groups)' },
              volume: { type: 'number', description: 'Volume level 0-100' },
            },
            required: ['groupId', 'volume'],
          },
        },
      }
    );
  }

  // ── WhatsApp Tools ──────────────────────────────
  if (providers.has('whatsapp')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'whatsapp_send_message',
          description: 'Send a WhatsApp message to a contact or group. Call this when the user wants to text someone on WhatsApp.',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Phone number (with country code, e.g., "+46701234567") or contact name' },
              message: { type: 'string', description: 'The message text to send' },
            },
            required: ['to', 'message'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'whatsapp_read_messages',
          description: 'Read recent WhatsApp messages from a conversation. Call this when the user wants to check their WhatsApp messages.',
          parameters: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Contact name or phone number to read messages from. Leave empty for all recent messages.' },
              limit: { type: 'number', description: 'Number of messages to retrieve (default 10, max 50)' },
            },
          },
        },
      }
    );
  }

  // ── Discord Tools ──────────────────────────────
  if (providers.has('discord')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'discord_send_message',
          description: 'Send a message to a Discord channel. Call this when the user wants to post in a Discord channel.',
          parameters: {
            type: 'object',
            properties: {
              channelId: { type: 'string', description: 'The Discord channel ID to send to' },
              serverName: { type: 'string', description: 'Server name (for finding the channel if channelId is unknown)' },
              channelName: { type: 'string', description: 'Channel name (for finding the channel if channelId is unknown)' },
              message: { type: 'string', description: 'The message text to send' },
            },
            required: ['message'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'discord_read_messages',
          description: 'Read recent messages from a Discord channel.',
          parameters: {
            type: 'object',
            properties: {
              channelId: { type: 'string', description: 'The Discord channel ID' },
              serverName: { type: 'string', description: 'Server name (for finding the channel)' },
              channelName: { type: 'string', description: 'Channel name (for finding the channel)' },
              limit: { type: 'number', description: 'Number of messages to retrieve (default 10, max 50)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'discord_list_servers',
          description: 'List the Discord servers (guilds) the bot is a member of, along with their channels.',
          parameters: { type: 'object', properties: {} },
        },
      }
    );
  }

  // ── AI Phone Call Tools ──────────────────────────────
  if (providers.has('phone')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'call_contact',
          description: 'Initiate an AI-powered phone call to a contact. The AI will call the person, have a conversation on your behalf based on your instructions, and provide a transcript and summary afterward. Billed at $0.10/minute.',
          parameters: {
            type: 'object',
            properties: {
              contactName: { type: 'string', description: 'Name of the person to call' },
              phoneNumber: { type: 'string', description: 'Phone number with country code (e.g., "+46701234567")' },
              objective: { type: 'string', description: 'What the AI should accomplish during the call (e.g., "Schedule a dinner reservation for Friday at 7pm", "Ask about their business hours")' },
              tone: { type: 'string', description: 'Communication style: "professional", "casual", or "friendly". Default: "friendly"' },
            },
            required: ['contactName', 'phoneNumber', 'objective'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'call_list_recent',
          description: 'List recent AI phone calls with their status, duration, cost, and summaries.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of recent calls to retrieve (default 10)' },
            },
          },
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

  // Google Calendar: write operations (if Google connected)
  if (providers.has('google')) {
    tools.push(
      {
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
      },
      {
        type: 'function',
        function: {
          name: 'google_calendar_update_event',
          description: 'Update an existing event on the user\'s Google Calendar. Use the event ID from google_calendar_list_events. Only include fields that should be changed.',
          parameters: {
            type: 'object',
            properties: {
              eventId: { type: 'string', description: 'The event ID to update (from google_calendar_list_events)' },
              title: { type: 'string', description: 'New event title (optional)' },
              startTime: { type: 'string', description: 'New start time in ISO 8601 format (optional)' },
              endTime: { type: 'string', description: 'New end time in ISO 8601 format (optional)' },
              description: { type: 'string', description: 'New event description (optional)' },
              location: { type: 'string', description: 'New event location (optional)' },
            },
            required: ['eventId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'google_calendar_delete_event',
          description: 'Delete an event from the user\'s Google Calendar. Use the event ID from google_calendar_list_events. Always confirm with the user before deleting.',
          parameters: {
            type: 'object',
            properties: {
              eventId: { type: 'string', description: 'The event ID to delete (from google_calendar_list_events)' },
            },
            required: ['eventId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'google_gmail_send',
          description: 'Send an email via the user\'s Gmail. Always confirm the recipient, subject, and body with the user before sending.',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject line' },
              body: { type: 'string', description: 'Email body text' },
              replyToMessageId: { type: 'string', description: 'Message ID to reply to (optional — makes this a reply)' },
            },
            required: ['to', 'subject', 'body'],
          },
        },
      }
    );
  }

  // ── Built-in: create_routine (always available) ────────
  tools.push({
    type: 'function',
    function: {
      name: 'create_routine',
      description: 'Create an automated routine that runs on a schedule. Use this when the user asks to automate a recurring task, e.g. "every morning check my calendar and send me a Slack summary". Build a tool chain of steps that execute sequentially.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short name for the routine (e.g. "Morning briefing")' },
          description: { type: 'string', description: 'What the routine does' },
          schedule: { type: 'string', description: 'Cron expression (5 fields). Common: "0 8 * * *" = 8 AM daily, "0 8 * * 1-5" = weekday mornings, "*/30 * * * *" = every 30 min' },
          toolChain: {
            type: 'array',
            description: 'Ordered list of tool steps. Each step runs sequentially; use {{PREVIOUS_RESULT}} in args to reference the previous step output.',
            items: {
              type: 'object',
              properties: {
                toolName: { type: 'string', description: 'Name of the tool to run (e.g. google_calendar_list_events, slack_send_dm)' },
                args: { type: 'object', description: 'Arguments for the tool. Use {{PREVIOUS_RESULT}} to pass output from the previous step.' },
              },
              required: ['toolName'],
            },
          },
        },
        required: ['name', 'schedule', 'toolChain'],
      },
    },
  });

  return tools;
}
