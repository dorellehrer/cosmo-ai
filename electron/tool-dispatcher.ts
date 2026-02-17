/**
 * Nova AI — Gateway Tool Dispatcher
 *
 * Maps Gateway Hub tool names (e.g., "imessage.send", "desktop.calendar.getEvents")
 * to local Electron automation functions.
 *
 * This is the bridge between cloud-dispatched tool calls and local execution.
 */

import * as automation from './automation';
import { BrowserAutomation } from './browser-automation';
import * as imessage from './imessage';
import type { PushToTalk } from './push-to-talk';

// ──────────────────────────────────────────────
// External instance accessors (set by main.ts)
// ──────────────────────────────────────────────

let _pushToTalkGetter: (() => PushToTalk | null) | null = null;

/** Called by main.ts to provide access to the PTT singleton */
export function setPushToTalkGetter(getter: () => PushToTalk | null): void {
  _pushToTalkGetter = getter;
}

function getPushToTalkInstance(): PushToTalk | null {
  return _pushToTalkGetter ? _pushToTalkGetter() : null;
}

// ──────────────────────────────────────────────
// Tool Result type
// ──────────────────────────────────────────────

interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// ──────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────

/**
 * Dispatch a tool call from the Gateway Hub to the appropriate local handler.
 * Tool names use dot-notation matching the CAPABILITY_TOOL_MAP in the cloud.
 */
export async function dispatchToolCall(
  tool: string,
  params: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const result = await executeToolCall(tool, params);
    return { success: true, result };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[ToolDispatch] ${tool} failed:`, error);
    return { success: false, error };
  }
}

async function executeToolCall(
  tool: string,
  p: Record<string, unknown>,
): Promise<unknown> {
  switch (tool) {
    // ── iMessage ─────────────────────────────
    case 'imessage.getChats':
      return imessage.getChats(asNumber(p.limit, 20));

    case 'imessage.getMessages':
      return imessage.getMessages(asString(p.chatIdentifier), asNumber(p.limit, 50));

    case 'imessage.send':
      return imessage.sendMessage(asString(p.to), asString(p.text));

    case 'imessage.search':
      return imessage.searchMessages(asString(p.query), asNumber(p.limit, 30));

    // ── Desktop: Calendar ────────────────────
    case 'desktop.calendar.getEvents':
      return automation.calendarListEvents({
        days: asNumber(p.days, 7),
        calendarName: asOptionalString(p.calendarName),
      });

    case 'desktop.calendar.addEvent':
      return automation.calendarCreateEvent({
        title: asString(p.title),
        startDate: asString(p.startDate),
        endDate: asString(p.endDate),
        calendarName: asOptionalString(p.calendarName),
        location: asOptionalString(p.location),
        notes: asOptionalString(p.notes),
        allDay: p.allDay === true,
      });

    // ── Desktop: Reminders ───────────────────
    case 'desktop.reminders.getReminders':
      return automation.remindersListAll({
        listName: asOptionalString(p.listName),
        includeCompleted: p.includeCompleted === true,
      });

    case 'desktop.reminders.addReminder':
      return automation.remindersCreate({
        name: asString(p.name),
        listName: asOptionalString(p.listName),
        dueDate: asOptionalString(p.dueDate),
        notes: asOptionalString(p.notes),
        priority: asOptionalNumber(p.priority),
      });

    // ── Desktop: Mail ────────────────────────
    case 'desktop.mail.getUnread':
      return automation.mailGetUnreadCount();

    case 'desktop.mail.send':
      return automation.mailSend({
        to: asString(p.to),
        subject: asString(p.subject),
        body: asString(p.body),
        cc: asOptionalString(p.cc),
      });

    // ── Desktop: Notes ───────────────────────
    case 'desktop.notes.search':
      return automation.notesSearch({
        query: asString(p.query),
        limit: asOptionalNumber(p.limit),
      });

    case 'desktop.notes.create':
      return automation.notesCreate({
        title: asString(p.title),
        body: asString(p.body),
        folder: asOptionalString(p.folder),
      });

    // ── Desktop: System Control ──────────────
    case 'desktop.system.volume':
      return automation.systemSetVolume({
        volume: asOptionalNumber(p.volume),
        muted: p.muted === true ? true : undefined,
      });

    case 'desktop.system.brightness':
      return automation.systemSetBrightness({
        brightness: asNumber(p.brightness, 50),
      });

    case 'desktop.system.darkMode':
      return automation.systemSetDarkMode({
        enabled: p.enabled === true,
      });

    case 'desktop.system.doNotDisturb':
      return automation.systemToggleDoNotDisturb();

    // ── Desktop: App Control ─────────────────
    case 'desktop.apps.launch':
      return automation.appLaunch({ name: asString(p.name) });

    case 'desktop.apps.quit':
      return automation.appQuit({
        name: asString(p.name),
        force: p.force === true,
      });

    case 'desktop.apps.list':
      return automation.appList();

    // ── Desktop: Shell ───────────────────────
    case 'desktop.shell.run':
      return automation.shellRun({ command: asString(p.command) });

    // ── Desktop: Speak (TTS) ─────────────────
    case 'desktop.speak':
      return automation.speak({
        text: asString(p.text),
        voice: asOptionalString(p.voice),
        rate: asOptionalNumber(p.rate),
      });

    // ── Desktop: Spotlight ───────────────────
    case 'desktop.spotlight':
      return automation.spotlightSearch({
        query: asString(p.query),
        kind: asOptionalString(p.kind),
        limit: asOptionalNumber(p.limit),
      });

    // ── Desktop: Screenshot ──────────────────
    case 'desktop.screenshot':
      return { success: false, error: 'Screenshot capture is not available via the gateway tool route. Use the browser.screenshot tool for web page screenshots, or take a screenshot locally via the desktop app UI.' };

    // ── Desktop: Clipboard ───────────────────
    case 'desktop.clipboard.read':
      return { success: false, error: 'Clipboard access requires the Electron desktop app UI (IPC). Not available via gateway tool dispatch.' };

    case 'desktop.clipboard.write':
      return { success: false, error: 'Clipboard write requires the Electron desktop app UI (IPC). Not available via gateway tool dispatch.' };

    // ── Desktop: Accessibility ───────────────
    case 'desktop.accessibility.click':
      return automation.accessibilityClickElement({
        app: asString(p.app),
        element: asString(p.element),
        elementType: asOptionalString(p.elementType),
      });

    case 'desktop.accessibility.type':
      return automation.accessibilityTypeText({
        text: asString(p.text),
        app: asOptionalString(p.app),
      });

    case 'desktop.accessibility.pressKey':
      return automation.accessibilityPressKey({
        key: asString(p.key),
        modifiers: Array.isArray(p.modifiers) ? p.modifiers as string[] : undefined,
      });

    case 'desktop.accessibility.readScreen':
      return automation.accessibilityReadScreen({
        app: asString(p.app),
      });

    // ── Files ────────────────────────────────
    case 'files.read':
      return automation.fsReadFile({ path: asString(p.path) });

    case 'files.write':
      return automation.fsWriteFile({
        path: asString(p.path),
        content: asString(p.content),
        append: p.append === true,
      });

    case 'files.list':
      return automation.fsListDir({
        path: asString(p.path),
        recursive: p.recursive === true,
      });

    case 'files.search':
      return automation.fsSearch({
        directory: asString(p.directory),
        pattern: asString(p.pattern),
        maxResults: asOptionalNumber(p.maxResults),
      });

    case 'files.trash':
      return automation.fsMoveToTrash({ path: asString(p.path) });

    case 'files.mkdir': {
      const dirPath = asString(p.path);
      const { mkdirSync, existsSync } = await import('fs');
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      return { success: true, path: dirPath };
    }

    // ── Voice ────────────────────────────────
    case 'voice.speak':
      return automation.speak({
        text: asString(p.text),
        voice: asOptionalString(p.voice),
        rate: asOptionalNumber(p.rate),
      });

    case 'voice.listen': {
      // Trigger PTT recording via the main process PushToTalk instance.
      // We need access to the singleton — import from main.ts via a getter.
      const ptt = getPushToTalkInstance();
      if (!ptt) {
        return { success: false, error: 'Push-to-talk not initialized. Ensure OPENAI_API_KEY is set.' };
      }
      if (ptt.getState() === 'recording') {
        return { success: true, message: 'Already recording. Press the PTT key or wait for transcription.' };
      }
      if (ptt.getState() === 'transcribing') {
        return { success: true, message: 'Currently transcribing previous recording. Please wait.' };
      }
      // Start recording — the transcription result will be delivered via voice:transcription IPC event
      ptt.triggerRecording();
      return { success: true, message: 'Voice recording started. Transcription will be delivered via voice:transcription event. Use the PTT key to stop recording.' };
    }

    // ── Browser Automation ───────────────────
    case 'browser.open': {
      const browser = getBrowserInstance();
      return browser.open(asOptionalString(p.url));
    }

    case 'browser.navigate': {
      const browser = getBrowserInstance();
      return browser.navigate(asString(p.url));
    }

    case 'browser.snapshot': {
      const browser = getBrowserInstance();
      return browser.snapshot();
    }

    case 'browser.click': {
      const browser = getBrowserInstance();
      return browser.click(asString(p.target || p.selector || p.text));
    }

    case 'browser.type': {
      const browser = getBrowserInstance();
      return browser.type(asString(p.text), asOptionalString(p.selector));
    }

    case 'browser.screenshot': {
      const browser = getBrowserInstance();
      return browser.screenshot(asOptionalString(p.selector));
    }

    case 'browser.close': {
      const browser = getBrowserInstance();
      return browser.close();
    }

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ──────────────────────────────────────────────
// Browser Automation singleton
// ──────────────────────────────────────────────

let _browserInstance: BrowserAutomation | null = null;

function getBrowserInstance() {
  if (!_browserInstance) {
    _browserInstance = new BrowserAutomation();
  }
  return _browserInstance;
}

// ──────────────────────────────────────────────
// Parameter helpers
// ──────────────────────────────────────────────

function asString(value: unknown, fallback?: string): string {
  if (typeof value === 'string') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Expected string, got ${typeof value}`);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}
