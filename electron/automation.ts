/**
 * Nova AI — macOS Native Automation Engine
 *
 * Uses JXA (JavaScript for Automation) via osascript for deep macOS integration.
 * Unsandboxed: full system access for Calendar, Mail, Reminders, Finder,
 * System Preferences, app control, volume, brightness, Do Not Disturb, etc.
 *
 * Also exposes direct file system access (headless, no dialog) for AI-driven
 * automations like reading/writing files programmatically.
 *
 * Platform note: JXA/AppleScript functions are macOS-only. File system functions
 * work cross-platform. On Windows/Linux, JXA-dependent functions throw a clear error.
 */

import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const IS_MACOS = process.platform === 'darwin';

/**
 * Guard for macOS-only automation functions.
 * Throws a descriptive error on non-macOS platforms.
 */
function requireMacOS(feature: string): void {
  if (!IS_MACOS) {
    throw new Error(
      `${feature} is only available on macOS. ` +
      `This feature uses Apple's JavaScript for Automation (JXA) which is not available on ${process.platform}.`,
    );
  }
}

// ── JXA Executor ─────────────────────────────────────────────

/**
 * Execute JavaScript for Automation (JXA) via osascript.
 * JXA is more powerful than AppleScript and returns JSON natively.
 */
async function runJXA(script: string): Promise<string> {
  requireMacOS('JXA automation');
  try {
    const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', script], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(`JXA error: ${err.stderr || err.message || 'Unknown error'}`);
  }
}

/**
 * Execute AppleScript (for cases where JXA is less convenient).
 */
async function runAppleScript(script: string): Promise<string> {
  requireMacOS('AppleScript automation');
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', script], {
      timeout: 30_000,
    });
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(`AppleScript error: ${err.stderr || err.message || 'Unknown error'}`);
  }
}

// ── Calendar ─────────────────────────────────────────────────

export async function calendarListEvents(options: {
  days?: number;
  calendarName?: string;
}): Promise<{ events: Array<{ title: string; start: string; end: string; location: string; calendar: string; notes: string }> }> {
  const days = options.days || 7;
  const calFilter = options.calendarName ? `&& cal.name() === ${JSON.stringify(options.calendarName)}` : '';

  const script = `
    (() => {
      const app = Application('Calendar');
      const now = new Date();
      const end = new Date(now.getTime() + ${days} * 86400000);
      const results = [];
      app.calendars().forEach(cal => {
        if (cal.writable() ${calFilter}) {
          cal.events().forEach(evt => {
            try {
              const s = evt.startDate();
              const e = evt.endDate();
              if (s >= now && s <= end) {
                results.push({
                  title: evt.summary() || '',
                  start: s.toISOString(),
                  end: e.toISOString(),
                  location: evt.location() || '',
                  calendar: cal.name(),
                  notes: (evt.description() || '').substring(0, 500)
                });
              }
            } catch(e) {}
          });
        }
      });
      results.sort((a,b) => new Date(a.start) - new Date(b.start));
      return JSON.stringify({ events: results.slice(0, 50) });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

export async function calendarCreateEvent(options: {
  title: string;
  startDate: string;
  endDate: string;
  calendarName?: string;
  location?: string;
  notes?: string;
  allDay?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const calName = options.calendarName || 'Calendar';
  const script = `
    (() => {
      const app = Application('Calendar');
      let cal = app.calendars().find(c => c.name() === ${JSON.stringify(calName)});
      if (!cal) cal = app.calendars()[0];
      const evt = app.Event({
        summary: ${JSON.stringify(options.title)},
        startDate: new Date(${JSON.stringify(options.startDate)}),
        endDate: new Date(${JSON.stringify(options.endDate)}),
        ${options.location ? `location: ${JSON.stringify(options.location)},` : ''}
        ${options.notes ? `description: ${JSON.stringify(options.notes)},` : ''}
        ${options.allDay ? 'alldayEvent: true,' : ''}
      });
      cal.events.push(evt);
      return JSON.stringify({ success: true, message: 'Event created: ' + ${JSON.stringify(options.title)} });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

export async function calendarListCalendars(): Promise<{ calendars: Array<{ name: string; writable: boolean }> }> {
  const script = `
    (() => {
      const app = Application('Calendar');
      const cals = app.calendars().map(c => ({ name: c.name(), writable: c.writable() }));
      return JSON.stringify({ calendars: cals });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

// ── Reminders ────────────────────────────────────────────────

export async function remindersListAll(options?: {
  listName?: string;
  includeCompleted?: boolean;
}): Promise<{ reminders: Array<{ name: string; completed: boolean; dueDate: string | null; list: string; notes: string }> }> {
  const listFilter = options?.listName ? `&& list.name() === ${JSON.stringify(options.listName)}` : '';
  const script = `
    (() => {
      const app = Application('Reminders');
      const results = [];
      app.lists().forEach(list => {
        if (true ${listFilter}) {
          list.reminders().forEach(r => {
            ${!options?.includeCompleted ? 'if (r.completed()) return;' : ''}
            results.push({
              name: r.name(),
              completed: r.completed(),
              dueDate: r.dueDate() ? r.dueDate().toISOString() : null,
              list: list.name(),
              notes: (r.body() || '').substring(0, 500)
            });
          });
        }
      });
      return JSON.stringify({ reminders: results.slice(0, 100) });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

export async function remindersCreate(options: {
  name: string;
  listName?: string;
  dueDate?: string;
  notes?: string;
  priority?: number;
}): Promise<{ success: boolean; message: string }> {
  const listName = options.listName || 'Reminders';
  const script = `
    (() => {
      const app = Application('Reminders');
      let list = app.lists().find(l => l.name() === ${JSON.stringify(listName)});
      if (!list) list = app.defaultList();
      const props = { name: ${JSON.stringify(options.name)} };
      ${options.dueDate ? `props.dueDate = new Date(${JSON.stringify(options.dueDate)});` : ''}
      ${options.notes ? `props.body = ${JSON.stringify(options.notes)};` : ''}
      ${options.priority ? `props.priority = ${options.priority};` : ''}
      const r = app.Reminder(props);
      list.reminders.push(r);
      return JSON.stringify({ success: true, message: 'Reminder created: ' + ${JSON.stringify(options.name)} });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

export async function remindersListLists(): Promise<{ lists: Array<{ name: string; count: number }> }> {
  const script = `
    (() => {
      const app = Application('Reminders');
      const lists = app.lists().map(l => ({
        name: l.name(),
        count: l.reminders().filter(r => !r.completed()).length
      }));
      return JSON.stringify({ lists });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

// ── Mail ─────────────────────────────────────────────────────

export async function mailSearch(options: {
  query: string;
  account?: string;
  limit?: number;
}): Promise<{ messages: Array<{ subject: string; from: string; date: string; read: boolean; mailbox: string }> }> {
  const limit = options.limit || 20;
  // AppleScript is more reliable for Mail searches
  const script = `
    tell application "Mail"
      set results to {}
      set searchQuery to ${JSON.stringify(options.query)}
      set msgs to (messages of inbox whose subject contains searchQuery or sender contains searchQuery)
      repeat with i from 1 to (minimum of {count of msgs, ${limit}})
        set m to item i of msgs
        set end of results to {subject of m, sender of m, date sent of m as string, read status of m, name of mailbox of m}
      end repeat
      return results
    end tell
  `;
  try {
    const raw = await runAppleScript(script);
    // Parse AppleScript output (comma-separated lists)
    const messages = parseMailOutput(raw);
    return { messages };
  } catch {
    return { messages: [] };
  }
}

function parseMailOutput(raw: string): Array<{ subject: string; from: string; date: string; read: boolean; mailbox: string }> {
  // AppleScript returns a flat list, groups of 5 per message
  const items = raw.split(', ').map(s => s.trim());
  const messages: Array<{ subject: string; from: string; date: string; read: boolean; mailbox: string }> = [];
  for (let i = 0; i + 4 < items.length; i += 5) {
    messages.push({
      subject: items[i] || '',
      from: items[i + 1] || '',
      date: items[i + 2] || '',
      read: items[i + 3] === 'true',
      mailbox: items[i + 4] || '',
    });
  }
  return messages;
}

export async function mailSend(options: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
}): Promise<{ success: boolean; message: string }> {
  const ccLine = options.cc ? `
        make new cc recipient at end of cc recipients with properties {address:${JSON.stringify(options.cc)}}` : '';

  const script = `
    tell application "Mail"
      set newMsg to make new outgoing message with properties {subject:${JSON.stringify(options.subject)}, content:${JSON.stringify(options.body)}, visible:true}
      tell newMsg
        make new to recipient at end of to recipients with properties {address:${JSON.stringify(options.to)}}${ccLine}
        send
      end tell
    end tell
    return "sent"
  `;
  await runAppleScript(script);
  return { success: true, message: `Email sent to ${options.to}` };
}

export async function mailGetUnreadCount(): Promise<{ count: number }> {
  const script = `tell application "Mail" to return unread count of inbox`;
  const count = parseInt(await runAppleScript(script)) || 0;
  return { count };
}

// ── Notes ────────────────────────────────────────────────────

export async function notesCreate(options: {
  title: string;
  body: string;
  folder?: string;
}): Promise<{ success: boolean; message: string }> {
  const folderClause = options.folder
    ? `of folder ${JSON.stringify(options.folder)}`
    : '';
  const script = `
    tell application "Notes"
      make new note ${folderClause} with properties {name:${JSON.stringify(options.title)}, body:${JSON.stringify(options.body)}}
    end tell
    return "created"
  `;
  await runAppleScript(script);
  return { success: true, message: `Note created: ${options.title}` };
}

export async function notesSearch(options: { query: string; limit?: number }): Promise<{
  notes: Array<{ name: string; creationDate: string; folder: string }>
}> {
  const limit = options.limit || 20;
  const script = `
    (() => {
      const app = Application('Notes');
      const results = [];
      const query = ${JSON.stringify(options.query.toLowerCase())};
      app.accounts().forEach(acct => {
        acct.folders().forEach(folder => {
          folder.notes().forEach(note => {
            if (results.length >= ${limit}) return;
            const name = note.name().toLowerCase();
            if (name.includes(query)) {
              results.push({
                name: note.name(),
                creationDate: note.creationDate().toISOString(),
                folder: folder.name()
              });
            }
          });
        });
      });
      return JSON.stringify({ notes: results });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

// ── System Control ───────────────────────────────────────────

export async function systemGetVolume(): Promise<{ volume: number; muted: boolean }> {
  const script = `output volume of (get volume settings)`;
  const mutedScript = `output muted of (get volume settings)`;
  const volume = parseInt(await runAppleScript(script)) || 0;
  const muted = (await runAppleScript(mutedScript)) === 'true';
  return { volume, muted };
}

export async function systemSetVolume(options: { volume?: number; muted?: boolean }): Promise<{ success: boolean }> {
  if (options.volume !== undefined) {
    const vol = Math.max(0, Math.min(100, options.volume));
    await runAppleScript(`set volume output volume ${vol}`);
  }
  if (options.muted !== undefined) {
    await runAppleScript(`set volume output muted ${options.muted}`);
  }
  return { success: true };
}

export async function systemGetBrightness(): Promise<{ brightness: number }> {
  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to tell appearance preferences to return dark mode'`
    );
    // Use IOKit for actual brightness
    const { stdout: bright } = await execAsync(
      `ioreg -c AppleBacklightDisplay | grep '"brightness"' | head -1 | awk -F'"brightness" = ' '{print $2}'`
    );
    const raw = parseInt(bright.trim());
    // AppleBacklight uses 0-1024 range
    const pct = Math.round((raw / 1024) * 100);
    return { brightness: isNaN(pct) ? 50 : pct };
  } catch {
    return { brightness: 50 };
  }
}

export async function systemSetBrightness(options: { brightness: number }): Promise<{ success: boolean }> {
  const pct = Math.max(0, Math.min(100, options.brightness)) / 100;
  // Use the brightness command (requires brightness CLI or JXA)
  const script = `
    (() => {
      ObjC.import('CoreGraphics');
      const displays = $.CGGetOnlineDisplayList(10, null, null);
      // This requires private API — fallback to osascript slider approach
      return 'ok';
    })()
  `;
  // More reliable: use AppleScript to set brightness via System Events slider
  await runAppleScript(`
    tell application "System Preferences"
      reveal pane id "com.apple.preference.displays"
      activate
    end tell
    delay 0.5
    tell application "System Events"
      tell process "System Preferences"
        set value of slider 1 of group 1 of tab group 1 of window 1 to ${pct}
      end tell
    end tell
    tell application "System Preferences" to quit
  `);
  return { success: true };
}

export async function systemGetDarkMode(): Promise<{ darkMode: boolean }> {
  const result = await runAppleScript(
    `tell application "System Events" to tell appearance preferences to return dark mode`
  );
  return { darkMode: result === 'true' };
}

export async function systemSetDarkMode(options: { enabled: boolean }): Promise<{ success: boolean }> {
  await runAppleScript(
    `tell application "System Events" to tell appearance preferences to set dark mode to ${options.enabled}`
  );
  return { success: true };
}

export async function systemGetDoNotDisturb(): Promise<{ enabled: boolean }> {
  try {
    const { stdout } = await execAsync(
      `defaults -currentHost read com.apple.notificationcenterui doNotDisturb 2>/dev/null || echo "0"`
    );
    return { enabled: stdout.trim() === '1' };
  } catch {
    return { enabled: false };
  }
}

export async function systemToggleDoNotDisturb(): Promise<{ success: boolean; enabled: boolean }> {
  // Toggle DnD via Control Center shortcut (macOS Monterey+)
  await runAppleScript(`
    tell application "System Events"
      tell process "ControlCenter"
        click menu bar item "Focus" of menu bar 1
        delay 0.3
        click checkbox 1 of group 1 of window 1
      end tell
    end tell
  `);
  const result = await systemGetDoNotDisturb();
  return { success: true, enabled: result.enabled };
}

export async function systemSleep(): Promise<{ success: boolean }> {
  await runAppleScript(`tell application "System Events" to sleep`);
  return { success: true };
}

export async function systemLockScreen(): Promise<{ success: boolean }> {
  await execAsync(
    `/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend`
  );
  return { success: true };
}

export async function systemEmptyTrash(): Promise<{ success: boolean }> {
  await runAppleScript(`tell application "Finder" to empty trash`);
  return { success: true };
}

// ── Application Control ──────────────────────────────────────

export async function appList(): Promise<{ apps: Array<{ name: string; bundleId: string; running: boolean }> }> {
  const script = `
    (() => {
      const se = Application('System Events');
      const running = se.processes().map(p => {
        try { return { name: p.name(), bundleId: p.bundleIdentifier() || '', running: true }; }
        catch { return null; }
      }).filter(Boolean);
      return JSON.stringify({ apps: running.slice(0, 100) });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

export async function appLaunch(options: { name: string }): Promise<{ success: boolean; message: string }> {
  await runAppleScript(`tell application ${JSON.stringify(options.name)} to activate`);
  return { success: true, message: `Launched ${options.name}` };
}

export async function appQuit(options: { name: string; force?: boolean }): Promise<{ success: boolean }> {
  if (options.force) {
    await runAppleScript(`tell application ${JSON.stringify(options.name)} to quit`);
  } else {
    await runAppleScript(`tell application ${JSON.stringify(options.name)} to quit saving yes`);
  }
  return { success: true };
}

export async function appFocus(options: { name: string }): Promise<{ success: boolean }> {
  await runAppleScript(`tell application ${JSON.stringify(options.name)} to activate`);
  return { success: true };
}

export async function appIsRunning(options: { name: string }): Promise<{ running: boolean }> {
  const script = `
    tell application "System Events"
      set isRunning to (name of processes) contains ${JSON.stringify(options.name)}
      return isRunning
    end tell
  `;
  const result = await runAppleScript(script);
  return { running: result === 'true' };
}

// ── Finder / File System (headless — no dialog) ─────────────

export async function fsReadFile(options: { path: string }): Promise<{ content: string; size: number; modified: string } | { error: string }> {
  const absPath = resolvePath(options.path);
  try {
    const stats = fs.statSync(absPath);
    if (stats.size > 5 * 1024 * 1024) {
      return { error: 'File too large (>5MB). Use streaming for large files.' };
    }
    const content = fs.readFileSync(absPath, 'utf-8');
    return { content, size: stats.size, modified: stats.mtime.toISOString() };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function fsWriteFile(options: { path: string; content: string; append?: boolean }): Promise<{ success: boolean; path: string }> {
  const absPath = resolvePath(options.path);
  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  if (options.append) {
    fs.appendFileSync(absPath, options.content, 'utf-8');
  } else {
    fs.writeFileSync(absPath, options.content, 'utf-8');
  }
  return { success: true, path: absPath };
}

export async function fsListDir(options: { path: string; recursive?: boolean }): Promise<{
  entries: Array<{ name: string; path: string; isDirectory: boolean; size: number; modified: string }>
}> {
  const absPath = resolvePath(options.path);
  const entries: Array<{ name: string; path: string; isDirectory: boolean; size: number; modified: string }> = [];

  function walk(dir: string, depth: number) {
    if (depth > 3 || entries.length >= 200) return;
    try {
      const dirents = fs.readdirSync(dir, { withFileTypes: true });
      for (const d of dirents) {
        if (d.name.startsWith('.')) continue; // Skip hidden files
        const fullPath = path.join(dir, d.name);
        try {
          const stats = fs.statSync(fullPath);
          entries.push({
            name: d.name,
            path: fullPath,
            isDirectory: d.isDirectory(),
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
          if (options.recursive && d.isDirectory()) {
            walk(fullPath, depth + 1);
          }
        } catch { /* permission denied, skip */ }
      }
    } catch { /* permission denied, skip */ }
  }

  walk(absPath, 0);
  return { entries };
}

export async function fsSearch(options: { directory: string; pattern: string; maxResults?: number }): Promise<{
  results: Array<{ name: string; path: string; size: number }>
}> {
  const absPath = resolvePath(options.directory);
  const max = options.maxResults || 50;
  try {
    const { stdout } = await execAsync(
      `find ${JSON.stringify(absPath)} -maxdepth 5 -iname ${JSON.stringify(`*${options.pattern}*`)} -not -path '*/.*' 2>/dev/null | head -${max}`
    );
    const results = stdout.trim().split('\n').filter(Boolean).map(p => {
      try {
        const stats = fs.statSync(p);
        return { name: path.basename(p), path: p, size: stats.size };
      } catch {
        return { name: path.basename(p), path: p, size: 0 };
      }
    });
    return { results };
  } catch {
    return { results: [] };
  }
}

export async function fsMoveToTrash(options: { path: string }): Promise<{ success: boolean }> {
  const absPath = resolvePath(options.path);
  await runAppleScript(`tell application "Finder" to delete POSIX file ${JSON.stringify(absPath)}`);
  return { success: true };
}

export async function fsRevealInFinder(options: { path: string }): Promise<{ success: boolean }> {
  const absPath = resolvePath(options.path);
  await runAppleScript(`tell application "Finder" to reveal POSIX file ${JSON.stringify(absPath)}`);
  await runAppleScript(`tell application "Finder" to activate`);
  return { success: true };
}

// ── Window Management ────────────────────────────────────────

export async function windowList(): Promise<{
  windows: Array<{ app: string; title: string; index: number }>
}> {
  const script = `
    (() => {
      const se = Application('System Events');
      const results = [];
      se.processes().forEach(p => {
        try {
          if (p.windows().length > 0) {
            p.windows().forEach((w, i) => {
              results.push({ app: p.name(), title: w.name() || '', index: i + 1 });
            });
          }
        } catch {}
      });
      return JSON.stringify({ windows: results.slice(0, 100) });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

export async function windowResize(options: {
  app: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}): Promise<{ success: boolean }> {
  let script = `tell application "System Events" to tell process ${JSON.stringify(options.app)}\n`;
  if (options.position) {
    script += `  set position of window 1 to {${options.position.x}, ${options.position.y}}\n`;
  }
  if (options.size) {
    script += `  set size of window 1 to {${options.size.width}, ${options.size.height}}\n`;
  }
  script += `end tell`;
  await runAppleScript(script);
  return { success: true };
}

export async function windowMinimizeAll(): Promise<{ success: boolean }> {
  // Cmd+Option+M equivalent
  await runAppleScript(`
    tell application "System Events"
      keystroke "m" using {command down, option down}
    end tell
  `);
  return { success: true };
}

// ── Accessibility (UI Element Interaction) ───────────────────

export async function accessibilityCheckPermission(): Promise<{ granted: boolean }> {
  try {
    const { stdout } = await execAsync(
      `osascript -l JavaScript -e 'ObjC.import("ApplicationServices"); $.AXIsProcessTrusted()'`
    );
    return { granted: stdout.trim() === 'true' };
  } catch {
    return { granted: false };
  }
}

export async function accessibilityRequestPermission(): Promise<{ message: string }> {
  // Open Accessibility settings
  await runAppleScript(`
    tell application "System Settings"
      activate
      delay 0.5
    end tell
    open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  `);
  return { message: 'Opened Accessibility settings. Please grant Nova AI permission.' };
}

export async function accessibilityClickElement(options: {
  app: string;
  element: string;
  elementType?: string;
}): Promise<{ success: boolean; message: string }> {
  const elType = options.elementType || 'button';
  const script = `
    tell application "System Events"
      tell process ${JSON.stringify(options.app)}
        set frontmost to true
        click ${elType} ${JSON.stringify(options.element)} of window 1
      end tell
    end tell
    return "clicked"
  `;
  await runAppleScript(script);
  return { success: true, message: `Clicked ${elType} "${options.element}" in ${options.app}` };
}

export async function accessibilityTypeText(options: {
  text: string;
  app?: string;
}): Promise<{ success: boolean }> {
  if (options.app) {
    await runAppleScript(`tell application ${JSON.stringify(options.app)} to activate`);
    await new Promise(r => setTimeout(r, 300));
  }
  await runAppleScript(`
    tell application "System Events"
      keystroke ${JSON.stringify(options.text)}
    end tell
  `);
  return { success: true };
}

export async function accessibilityPressKey(options: {
  key: string;
  modifiers?: string[];
}): Promise<{ success: boolean }> {
  const modMap: Record<string, string> = {
    cmd: 'command down',
    command: 'command down',
    shift: 'shift down',
    alt: 'option down',
    option: 'option down',
    ctrl: 'control down',
    control: 'control down',
  };
  const mods = (options.modifiers || []).map(m => modMap[m.toLowerCase()] || m).join(', ');
  const using = mods ? ` using {${mods}}` : '';

  // Handle special keys
  const specialKeys: Record<string, number> = {
    return: 36, enter: 36, tab: 48, space: 49, escape: 53, delete: 51,
    up: 126, down: 125, left: 123, right: 124, f1: 122, f2: 120, f3: 99,
  };

  if (specialKeys[options.key.toLowerCase()] !== undefined) {
    await runAppleScript(`
      tell application "System Events"
        key code ${specialKeys[options.key.toLowerCase()]}${using}
      end tell
    `);
  } else {
    await runAppleScript(`
      tell application "System Events"
        keystroke ${JSON.stringify(options.key)}${using}
      end tell
    `);
  }
  return { success: true };
}

export async function accessibilityReadScreen(options: { app: string }): Promise<{
  elements: Array<{ role: string; title: string; value: string }>
}> {
  const script = `
    (() => {
      const se = Application('System Events');
      const proc = se.processes.byName(${JSON.stringify(options.app)});
      const elements = [];
      try {
        const win = proc.windows[0];
        // Read top-level UI elements
        const uiElements = win.uiElements();
        for (let i = 0; i < Math.min(uiElements.length, 50); i++) {
          try {
            const el = uiElements[i];
            elements.push({
              role: el.role() || '',
              title: el.title() || el.description() || '',
              value: String(el.value() || '')
            });
          } catch {}
        }
      } catch {}
      return JSON.stringify({ elements });
    })()
  `;
  return JSON.parse(await runJXA(script));
}

// ── Shell Commands (sandboxed — specific allowed commands) ───

const ALLOWED_COMMANDS = [
  'date', 'cal', 'uptime', 'whoami', 'hostname', 'sw_vers',
  'df', 'du', 'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find',
  'which', 'file', 'stat', 'uname', 'sysctl', 'pmset',
  'networksetup', 'scutil', 'system_profiler',
  'open', 'pbcopy', 'pbpaste', 'say',
  'defaults', 'launchctl', 'diskutil',
  'mdls', 'mdfind', // Spotlight metadata
];

export async function shellRun(options: { command: string }): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Extract the base command
  const baseCmd = options.command.trim().split(/\s+/)[0];
  if (!ALLOWED_COMMANDS.includes(baseCmd)) {
    return { stdout: '', stderr: `Command "${baseCmd}" is not in the allowed list. Allowed: ${ALLOWED_COMMANDS.join(', ')}`, exitCode: 1 };
  }

  try {
    const { stdout, stderr } = await execAsync(options.command, {
      timeout: 15_000,
      maxBuffer: 5 * 1024 * 1024,
    });
    return { stdout: stdout.substring(0, 10_000), stderr: stderr.substring(0, 2000), exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (err.stdout || '').substring(0, 5000),
      stderr: (err.stderr || '').substring(0, 2000),
      exitCode: err.code || 1,
    };
  }
}

// ── Spotlight Search ─────────────────────────────────────────

export async function spotlightSearch(options: { query: string; kind?: string; limit?: number }): Promise<{
  results: Array<{ name: string; path: string; kind: string }>
}> {
  const limit = options.limit || 20;
  let cmd = `mdfind -name ${JSON.stringify(options.query)}`;
  if (options.kind) {
    const kindMap: Record<string, string> = {
      image: 'kMDItemContentTypeTree == "public.image"',
      document: 'kMDItemContentTypeTree == "public.content"',
      pdf: 'kMDItemContentType == "com.adobe.pdf"',
      music: 'kMDItemContentTypeTree == "public.audio"',
      video: 'kMDItemContentTypeTree == "public.movie"',
      folder: 'kMDItemContentType == "public.folder"',
      application: 'kMDItemContentType == "com.apple.application-bundle"',
    };
    if (kindMap[options.kind]) {
      cmd = `mdfind '${kindMap[options.kind]} && kMDItemDisplayName == "*${options.query}*"'`;
    }
  }
  cmd += ` | head -${limit}`;

  try {
    const { stdout } = await execAsync(cmd, { timeout: 10_000 });
    const results = stdout.trim().split('\n').filter(Boolean).map(p => ({
      name: path.basename(p),
      path: p,
      kind: path.extname(p) || 'folder',
    }));
    return { results };
  } catch {
    return { results: [] };
  }
}

// ── Text-to-Speech (macOS native `say` command) ──────────────

export async function speak(options: { text: string; voice?: string; rate?: number }): Promise<{ success: boolean }> {
  const args = [options.text];
  if (options.voice) args.push('-v', options.voice);
  if (options.rate) args.push('-r', String(options.rate));
  await execFileAsync('say', args, { timeout: 60_000 });
  return { success: true };
}

export async function speakListVoices(): Promise<{ voices: string[] }> {
  const { stdout } = await execAsync(`say -v '?' | awk '{print $1}'`);
  const voices = stdout.trim().split('\n').filter(Boolean);
  return { voices };
}

// ── File Watcher ─────────────────────────────────────────────

const activeWatchers = new Map<string, fs.FSWatcher>();

export function fsWatch(
  dirPath: string,
  callback: (event: string, filename: string) => void
): string {
  const absPath = resolvePath(dirPath);
  const id = `watch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const watcher = fs.watch(absPath, { recursive: true }, (event, filename) => {
    if (filename && !filename.startsWith('.')) {
      callback(event, filename);
    }
  });
  activeWatchers.set(id, watcher);
  return id;
}

export function fsUnwatch(id: string): boolean {
  const watcher = activeWatchers.get(id);
  if (watcher) {
    watcher.close();
    activeWatchers.delete(id);
    return true;
  }
  return false;
}

export function fsUnwatchAll(): void {
  for (const [id, watcher] of activeWatchers) {
    watcher.close();
    activeWatchers.delete(id);
  }
}

// ── Helpers ──────────────────────────────────────────────────

function resolvePath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return path.resolve(p);
}
