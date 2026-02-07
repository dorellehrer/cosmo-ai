/**
 * Abstract Channel Adapter Interface
 *
 * All channel adapters (Telegram, Discord, WhatsApp, Slack, Webchat)
 * implement this interface to provide a unified messaging layer.
 */

export interface ChannelMessage {
  channelType: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: Date;
  groupId?: string;
  replyToId?: string;
}

export type MessageHandler = (message: ChannelMessage) => Promise<string>;

export interface ChannelAdapter {
  /** Channel type identifier */
  readonly type: string;

  /** Connect to the channel service */
  connect(config: Record<string, string>): Promise<void>;

  /** Disconnect from the channel service */
  disconnect(): Promise<void>;

  /** Register the message handler (called by agent on startup) */
  onMessage(handler: MessageHandler): void;

  /** Send a message to a specific target */
  sendMessage(target: string, content: string): Promise<void>;

  /** Check if the adapter is currently connected */
  isConnected(): boolean;
}

/**
 * Base class with shared functionality for channel adapters.
 */
export abstract class BaseChannelAdapter implements ChannelAdapter {
  abstract readonly type: string;
  protected handler: MessageHandler | null = null;
  protected connected = false;

  abstract connect(config: Record<string, string>): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(target: string, content: string): Promise<void>;

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  isConnected(): boolean {
    return this.connected;
  }

  protected async handleIncoming(message: ChannelMessage): Promise<string | null> {
    if (!this.handler) return null;
    return this.handler(message);
  }
}
