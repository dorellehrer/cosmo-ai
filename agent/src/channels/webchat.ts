/**
 * Webchat Channel Adapter — Direct WebSocket connection
 *
 * Provides a WebSocket server that web clients can connect to directly.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { BaseChannelAdapter, type ChannelMessage } from './base.js';

export class WebchatAdapter extends BaseChannelAdapter {
  readonly type = 'webchat';
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocket>();

  async connect(config: Record<string, string>): Promise<void> {
    const port = parseInt(config.port || process.env.WEBCHAT_PORT || '18792');

    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = crypto.randomUUID();
      this.clients.set(clientId, ws);
      console.log(`[Webchat] Client ${clientId} connected`);

      ws.on('message', async (data: Buffer) => {
        try {
          const parsed = JSON.parse(data.toString());
          const msg: ChannelMessage = {
            channelType: 'webchat',
            senderId: clientId,
            senderName: parsed.name || 'Web User',
            content: parsed.content || parsed.text || data.toString(),
            timestamp: new Date(),
          };

          const reply = await this.handleIncoming(msg);
          if (reply) {
            ws.send(JSON.stringify({ type: 'message', content: reply, timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('[Webchat] Message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[Webchat] Client ${clientId} disconnected`);
      });

      // Send welcome message
      ws.send(JSON.stringify({ type: 'connected', clientId }));
    });

    this.connected = true;
    console.log(`[Webchat] WebSocket server listening on port ${port}`);
  }

  async disconnect(): Promise<void> {
    for (const [, ws] of this.clients) {
      ws.close();
    }
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.connected = false;
    console.log('[Webchat] Disconnected');
  }

  async sendMessage(clientId: string, content: string): Promise<void> {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message', content, timestamp: new Date().toISOString() }));
    }
  }
}
