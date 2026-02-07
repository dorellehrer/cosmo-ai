/**
 * Slack Channel Adapter — uses Slack Socket Mode for real-time events
 *
 * Reuses existing OAuth tokens from the integrations system.
 */

import { BaseChannelAdapter, type ChannelMessage } from './base.js';
import { WebSocket } from 'ws';

export class SlackAdapter extends BaseChannelAdapter {
  readonly type = 'slack';
  private botToken = '';
  private appToken = '';
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  async connect(config: Record<string, string>): Promise<void> {
    this.botToken = config.botToken;
    this.appToken = config.appToken || '';

    if (!this.botToken) throw new Error('Slack botToken is required');

    // If we have an app-level token, use Socket Mode
    if (this.appToken) {
      await this.connectSocketMode();
    } else {
      // Without Socket Mode, we can only send messages (no receiving)
      console.log('[Slack] Connected in send-only mode (no app token for Socket Mode)');
    }

    this.connected = true;
    console.log('[Slack] Connected');
  }

  private async connectSocketMode(): Promise<void> {
    // Get WebSocket URL from Slack
    const res = await fetch('https://slack.com/api/apps.connections.open', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.appToken}` },
    });
    const data = await res.json();
    if (!data.ok || !data.url) {
      console.error('[Slack] Socket Mode connection failed:', data.error);
      return;
    }

    this.ws = new WebSocket(data.url);
    this.ws.on('message', async (raw: Buffer) => {
      const payload = JSON.parse(raw.toString());

      // Acknowledge envelope
      if (payload.envelope_id) {
        this.ws?.send(JSON.stringify({ envelope_id: payload.envelope_id }));
      }

      // Handle events_api messages
      if (payload.type === 'events_api' && payload.payload?.event?.type === 'message') {
        const event = payload.payload.event;
        if (event.bot_id || event.subtype) return; // Ignore bot messages

        const msg: ChannelMessage = {
          channelType: 'slack',
          senderId: event.user,
          content: event.text,
          timestamp: new Date(parseFloat(event.ts) * 1000),
          groupId: event.channel,
        };

        const reply = await this.handleIncoming(msg);
        if (reply) {
          await this.sendMessage(event.channel, reply);
        }
      }
    });

    this.ws.on('open', () => {
      this.reconnectAttempts = 0; // Reset on successful connection
    });

    this.ws.on('close', () => {
      if (!this.connected) return; // Don't reconnect if intentionally disconnected
      this.reconnectAttempts++;
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        console.error(`[Slack] Max reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
        this.connected = false;
        return;
      }
      const backoff = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 300_000);
      console.log(`[Slack] Socket Mode disconnected, reconnecting in ${backoff / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connectSocketMode(), backoff);
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    console.log('[Slack] Disconnected');
  }

  async sendMessage(channel: string, content: string): Promise<void> {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text: content }),
    });
  }
}
