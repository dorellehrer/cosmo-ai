/**
 * Nova AI — iMessage Integration (macOS)
 *
 * Reads messages from the macOS Messages SQLite database (chat.db)
 * and sends messages via AppleScript / JXA.
 *
 * Also watches for new incoming messages by polling the database
 * for new rows since the last known ROWID.
 *
 * Requirements:
 *   - macOS only
 *   - Full Disk Access permission (System Settings → Privacy → Full Disk Access)
 *   - Messages.app database at ~/Library/Messages/chat.db
 *
 * Note: We use better-sqlite3 for synchronous SQLite access (fast, no async overhead).
 * Installed as an optional dependency — this module gracefully degrades on non-macOS.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { EventEmitter } from 'events';

const execFileAsync = promisify(execFile);

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface IMessageChat {
  id: number;
  identifier: string;  // Phone number or email
  displayName: string;
  lastMessageDate: number | null;
}

export interface IMessage {
  id: number;
  text: string | null;
  fromMe: boolean;
  timestamp: number;   // macOS Core Data timestamp (nanoseconds since 2001-01-01)
  senderIdentifier: string | null;
  chatIdentifier: string;
  hasAttachment: boolean;
}

export interface IMessageSendResult {
  success: boolean;
  error?: string;
}

export interface IMessageSearchResult {
  messages: IMessage[];
  totalCount: number;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const DB_PATH = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
const CORE_DATA_EPOCH = 978307200; // Seconds between Unix epoch and 2001-01-01

/** Convert macOS Core Data timestamp to JS Date */
function coreDataToDate(timestamp: number): Date {
  // Core Data timestamps are in nanoseconds since 2001-01-01
  // But the Messages DB stores them in a weird mixed format:
  // Some are nanoseconds (> 1e15), some are seconds (< 1e12)
  if (timestamp > 1e15) {
    // Nanoseconds
    return new Date((timestamp / 1e9 + CORE_DATA_EPOCH) * 1000);
  }
  // Seconds
  return new Date((timestamp + CORE_DATA_EPOCH) * 1000);
}

/** Convert JS Date to human-readable relative time */
function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ──────────────────────────────────────────────
// SQLite Database Access
// ──────────────────────────────────────────────

/**
 * We use the `sqlite3` command-line tool (pre-installed on macOS) instead of
 * better-sqlite3 to avoid native module compilation issues in Electron.
 * Queries run as subprocesses — fine for the low frequency of iMessage reads.
 */
async function queryDb(sql: string, params: string[] = []): Promise<string> {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      'Messages database not found. Ensure Full Disk Access is granted to Nova AI.'
    );
  }

  // Use parameterized queries by binding values via .parameter set
  // For safety, we pass parameters as positional bindings
  const args: string[] = [
    '-json',        // Output as JSON
    '-readonly',    // Read-only mode
    DB_PATH,
  ];

  // Build the full SQL with parameter bindings
  let fullSql = sql;
  if (params.length > 0) {
    // Set parameter bindings using .param init and .param set
    const paramCommands = params.map((p, i) => `.param set :p${i} '${p.replace(/'/g, "''")}'`).join('\n');
    fullSql = `.param init\n${paramCommands}\n${sql}`;
  }

  const { stdout } = await execFileAsync('sqlite3', [
    ...args,
    fullSql,
  ], {
    timeout: 10_000,
    maxBuffer: 5 * 1024 * 1024, // 5MB
  });

  return stdout.trim();
}

async function queryDbJson<T>(sql: string, params: string[] = []): Promise<T[]> {
  const raw = await queryDb(sql, params);
  if (!raw || raw === '') return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Core iMessage Operations
// ──────────────────────────────────────────────

/** Get recent chats (conversations) */
export async function getChats(limit = 20): Promise<IMessageChat[]> {
  const rows = await queryDbJson<{
    id: number;
    identifier: string;
    display_name: string | null;
    last_msg_date: number | null;
  }>(`
    SELECT 
      c.ROWID as id,
      c.chat_identifier as identifier,
      c.display_name,
      MAX(m.date) as last_msg_date
    FROM chat c
    LEFT JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
    LEFT JOIN message m ON cmj.message_id = m.ROWID
    GROUP BY c.ROWID
    ORDER BY last_msg_date DESC
    LIMIT ${limit}
  `);

  return rows.map(r => ({
    id: r.id,
    identifier: r.identifier,
    displayName: r.display_name || r.identifier,
    lastMessageDate: r.last_msg_date,
  }));
}

/** Get messages for a specific chat */
export async function getMessages(
  chatIdentifier: string,
  limit = 50,
): Promise<IMessage[]> {
  const rows = await queryDbJson<{
    id: number;
    text: string | null;
    is_from_me: number;
    date: number;
    sender_id: string | null;
    chat_id: string;
    has_attach: number;
  }>(`
    SELECT 
      m.ROWID as id,
      m.text,
      m.is_from_me,
      m.date,
      h.id as sender_id,
      c.chat_identifier as chat_id,
      CASE WHEN m.cache_has_attachments = 1 THEN 1 ELSE 0 END as has_attach
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat c ON cmj.chat_id = c.ROWID
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    WHERE c.chat_identifier = :p0
    ORDER BY m.date DESC
    LIMIT ${limit}
  `, [chatIdentifier]);

  return rows.map(r => ({
    id: r.id,
    text: r.text,
    fromMe: r.is_from_me === 1,
    timestamp: r.date,
    senderIdentifier: r.sender_id,
    chatIdentifier: r.chat_id,
    hasAttachment: r.has_attach === 1,
  }));
}

/** Search messages across all chats */
export async function searchMessages(
  query: string,
  limit = 30,
): Promise<IMessage[]> {
  const rows = await queryDbJson<{
    id: number;
    text: string | null;
    is_from_me: number;
    date: number;
    sender_id: string | null;
    chat_id: string;
    has_attach: number;
  }>(`
    SELECT 
      m.ROWID as id,
      m.text,
      m.is_from_me,
      m.date,
      h.id as sender_id,
      c.chat_identifier as chat_id,
      CASE WHEN m.cache_has_attachments = 1 THEN 1 ELSE 0 END as has_attach
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat c ON cmj.chat_id = c.ROWID
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    WHERE m.text LIKE '%' || :p0 || '%'
    ORDER BY m.date DESC
    LIMIT ${limit}
  `, [query]);

  return rows.map(r => ({
    id: r.id,
    text: r.text,
    fromMe: r.is_from_me === 1,
    timestamp: r.date,
    senderIdentifier: r.sender_id,
    chatIdentifier: r.chat_id,
    hasAttachment: r.has_attach === 1,
  }));
}

/** Send an iMessage via AppleScript */
export async function sendMessage(
  to: string,
  text: string,
): Promise<IMessageSendResult> {
  // Sanitize for AppleScript embedding
  const safeTo = to.replace(/["\\]/g, '');
  const safeText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const script = `
    tell application "Messages"
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant "${safeTo}" of targetService
      send "${safeText}" to targetBuddy
    end tell
  `;

  try {
    await execFileAsync('osascript', ['-e', script], { timeout: 15_000 });
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    // Fallback: try the buddy-based approach
    const fallbackScript = `
      tell application "Messages"
        set targetBuddy to buddy "${safeTo}" of (1st account whose service type = iMessage)
        send "${safeText}" to targetBuddy
      end tell
    `;

    try {
      await execFileAsync('osascript', ['-e', fallbackScript], { timeout: 15_000 });
      return { success: true };
    } catch (err2) {
      const error2 = err2 instanceof Error ? err2.message : String(err2);
      return { success: false, error: `${error}; fallback: ${error2}` };
    }
  }
}

/** Get unread message count */
export async function getUnreadCount(): Promise<number> {
  try {
    const rows = await queryDbJson<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM message
      WHERE is_read = 0 AND is_from_me = 0
      AND date > ${Math.floor((Date.now() / 1000 - CORE_DATA_EPOCH) * 1e9)}
    `);
    return rows[0]?.cnt || 0;
  } catch {
    return 0;
  }
}

/** Check if the Messages database is accessible */
export function isAvailable(): boolean {
  return process.platform === 'darwin' && fs.existsSync(DB_PATH);
}

// ──────────────────────────────────────────────
// Message Watcher (polls for new messages)
// ──────────────────────────────────────────────

export class IMessageWatcher extends EventEmitter {
  private lastRowId = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** Start watching for new messages */
  async start(pollIntervalMs = 5_000): Promise<void> {
    if (this.running) return;
    if (!isAvailable()) {
      console.warn('[iMessage] Not available on this platform');
      return;
    }

    this.running = true;

    // Get the current max ROWID as baseline
    try {
      const rows = await queryDbJson<{ max_id: number }>(
        'SELECT MAX(ROWID) as max_id FROM message'
      );
      this.lastRowId = rows[0]?.max_id || 0;
      console.log(`[iMessage] Watcher started, baseline ROWID: ${this.lastRowId}`);
    } catch (err) {
      console.error('[iMessage] Failed to get baseline ROWID:', err);
      this.running = false;
      return;
    }

    // Poll for new messages
    this.pollTimer = setInterval(() => this.poll(), pollIntervalMs);
  }

  /** Stop watching */
  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[iMessage] Watcher stopped');
  }

  /** Poll for new messages since lastRowId */
  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const rows = await queryDbJson<{
        id: number;
        text: string | null;
        is_from_me: number;
        date: number;
        sender_id: string | null;
        chat_id: string;
      }>(`
        SELECT 
          m.ROWID as id,
          m.text,
          m.is_from_me,
          m.date,
          h.id as sender_id,
          c.chat_identifier as chat_id
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        JOIN chat c ON cmj.chat_id = c.ROWID
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.ROWID > ${this.lastRowId}
        ORDER BY m.ROWID ASC
        LIMIT 50
      `);

      for (const r of rows) {
        this.lastRowId = Math.max(this.lastRowId, r.id);

        const message: IMessage = {
          id: r.id,
          text: r.text,
          fromMe: r.is_from_me === 1,
          timestamp: r.date,
          senderIdentifier: r.sender_id,
          chatIdentifier: r.chat_id,
          hasAttachment: false,
        };

        // Emit for all messages, let the handler decide what to do
        this.emit('message', message);

        // Emit specifically for incoming messages (not from me)
        if (!message.fromMe) {
          this.emit('incoming', message);
        }
      }
    } catch (err) {
      // Don't spam logs — the DB might be locked briefly by Messages.app
      if (this.running) {
        console.debug('[iMessage] Poll error (transient):', err);
      }
    }
  }
}

// ──────────────────────────────────────────────
// Formatted output helpers (for AI consumption)
// ──────────────────────────────────────────────

/** Format a list of chats for the AI */
export function formatChats(chats: IMessageChat[]): string {
  if (chats.length === 0) return 'No recent chats found.';

  return chats.map((c, i) => {
    const time = c.lastMessageDate ? relativeTime(coreDataToDate(c.lastMessageDate)) : 'unknown';
    return `${i + 1}. ${c.displayName} (${c.identifier}) — last message ${time}`;
  }).join('\n');
}

/** Format messages for the AI */
export function formatMessages(messages: IMessage[]): string {
  if (messages.length === 0) return 'No messages found.';

  // Reverse to show oldest first (messages come DESC from DB)
  return [...messages].reverse().map(m => {
    const time = relativeTime(coreDataToDate(m.timestamp));
    const sender = m.fromMe ? 'You' : (m.senderIdentifier || 'Unknown');
    const attachment = m.hasAttachment ? ' [attachment]' : '';
    return `[${time}] ${sender}: ${m.text || '(no text)'}${attachment}`;
  }).join('\n');
}
