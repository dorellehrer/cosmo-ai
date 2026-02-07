/**
 * Discord Channel Adapter — uses Gateway WebSocket via discord.js
 */

import { BaseChannelAdapter, type ChannelMessage } from './base.js';

export class DiscordAdapter extends BaseChannelAdapter {
  readonly type = 'discord';
  private client: unknown = null;

  async connect(config: Record<string, string>): Promise<void> {
    const { Client, GatewayIntentBits } = await import('discord.js');
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    client.on('messageCreate', async (message: { author: { bot: boolean; id: string; username: string }; content: string; createdAt: Date; guildId: string | null; channelId: string; reply: (content: string) => Promise<void> }) => {
      if (message.author.bot) return;
      const msg: ChannelMessage = {
        channelType: 'discord',
        senderId: message.author.id,
        senderName: message.author.username,
        content: message.content,
        timestamp: message.createdAt,
        groupId: message.guildId || undefined,
      };
      const reply = await this.handleIncoming(msg);
      if (reply) {
        await message.reply(reply.substring(0, 2000));
      }
    });

    await client.login(config.botToken);
    this.client = client;
    this.connected = true;
    console.log('[Discord] Connected');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      (this.client as { destroy: () => void }).destroy();
    }
    this.connected = false;
    console.log('[Discord] Disconnected');
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.client) return;
    const client = this.client as { channels: { fetch: (id: string) => Promise<{ send: (content: string) => Promise<void> } | null> } };
    const channel = await client.channels.fetch(channelId);
    if (channel && 'send' in channel) {
      await channel.send(content.substring(0, 2000));
    }
  }
}
