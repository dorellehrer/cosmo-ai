/**
 * WhatsApp Channel Adapter — uses Twilio API
 *
 * Note: Requires a public webhook URL for incoming messages.
 * The agent container must be accessible from the internet or use a tunnel.
 */

import { BaseChannelAdapter, type ChannelMessage } from './base.js';
import express from 'express';
import type { Server } from 'http';

export class WhatsAppAdapter extends BaseChannelAdapter {
  readonly type = 'whatsapp';
  private accountSid = '';
  private authToken = '';
  private phoneNumber = '';
  private webhookServer: Server | null = null;

  async connect(config: Record<string, string>): Promise<void> {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.phoneNumber = config.phoneNumber;

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      throw new Error('WhatsApp requires accountSid, authToken, and phoneNumber');
    }

    // Start webhook server for incoming messages
    const app = express();
    app.use(express.urlencoded({ extended: true }));

    app.post('/webhook/whatsapp', async (req, res) => {
      const body = req.body;
      if (body.Body) {
        const msg: ChannelMessage = {
          channelType: 'whatsapp',
          senderId: body.From?.replace('whatsapp:', '') || 'unknown',
          content: body.Body,
          timestamp: new Date(),
        };
        const reply = await this.handleIncoming(msg);
        // Respond with TwiML
        res.type('text/xml');
        if (reply) {
          res.send(`<Response><Message>${escapeXml(reply)}</Message></Response>`);
        } else {
          res.send('<Response></Response>');
        }
      } else {
        res.send('<Response></Response>');
      }
    });

    const port = parseInt(process.env.WHATSAPP_WEBHOOK_PORT || '18791');
    await new Promise<void>((resolve, reject) => {
      this.webhookServer = app.listen(port, () => resolve());
      this.webhookServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`[WhatsApp] Port ${port} already in use`));
        } else {
          reject(err);
        }
      });
    });
    this.connected = true;
    console.log(`[WhatsApp] Webhook listening on port ${port}`);
  }

  async disconnect(): Promise<void> {
    if (this.webhookServer) {
      this.webhookServer.close();
    }
    this.connected = false;
    console.log('[WhatsApp] Disconnected');
  }

  async sendMessage(to: string, content: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      From: `whatsapp:${this.phoneNumber}`,
      To: `whatsapp:${to}`,
      Body: content,
    });

    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
  }
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
