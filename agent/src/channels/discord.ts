/**
 * Discord Channel Adapter — uses Gateway WebSocket via discord.js
 */

import { BaseChannelAdapter, type ChannelMessage } from './base.js';
import type { Client as DiscordClient, Message } from 'discord.js';

export class DiscordAdapter extends BaseChannelAdapter {
  readonly type = 'discord';
  private client: DiscordClient | null = null;

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

    client.on('messageCreate', async (message) => {
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
      this.client.destroy();
    }
    this.connected = false;
    console.log('[Discord] Disconnected');
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.client) return;
    const channel = await this.client.channels.fetch(channelId);
    if (channel && 'send' in channel) {
      await (channel.send as (body: string) => Promise<Message>)(content.substring(0, 2000));
    }
  }
}
