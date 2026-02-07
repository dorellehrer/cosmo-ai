/**
 * Telegram Channel Adapter — uses long polling via Bot API
 */

import { BaseChannelAdapter, type ChannelMessage } from './base.js';

export class TelegramAdapter extends BaseChannelAdapter {
  readonly type = 'telegram';
  private botToken = '';
  private pollingActive = false;
  private offset = 0;

  async connect(config: Record<string, string>): Promise<void> {
    this.botToken = config.botToken;
    if (!this.botToken) throw new Error('Telegram botToken is required');

    // Verify token
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram auth failed: ${data.description}`);

    console.log(`[Telegram] Connected as @${data.result.username}`);
    this.connected = true;
    this.startPolling();
  }

  async disconnect(): Promise<void> {
    this.pollingActive = false;
    this.connected = false;
    console.log('[Telegram] Disconnected');
  }

  async sendMessage(chatId: string, content: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: 'Markdown' }),
    });
  }

  private async startPolling(): Promise<void> {
    this.pollingActive = true;
    while (this.pollingActive) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.offset}&timeout=30&allowed_updates=["message"]`
        );
        const data = await res.json();
        if (data.ok && data.result) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            if (update.message?.text) {
              const msg: ChannelMessage = {
                channelType: 'telegram',
                senderId: String(update.message.from.id),
                senderName: update.message.from.first_name,
                content: update.message.text,
                timestamp: new Date(update.message.date * 1000),
                groupId: update.message.chat.type !== 'private' ? String(update.message.chat.id) : undefined,
              };
              const reply = await this.handleIncoming(msg);
              if (reply) {
                await this.sendMessage(String(update.message.chat.id), reply);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Telegram] Polling error:', error);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
}
