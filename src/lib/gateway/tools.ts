/**
 * Gateway Hub — Device Capability → Tool Mapping
 *
 * Maps device capabilities to the tool names that require them.
 * Used by the message router to determine which device can handle a tool call.
 */

// ──────────────────────────────────────────────
// Capability definitions
// ──────────────────────────────────────────────

/**
 * Maps each capability string to the set of tool name prefixes it enables.
 * When the AI requests a tool like "imessage.send", the router looks up
 * which capability is needed ("imessage") and finds a device that has it.
 */
export const CAPABILITY_TOOL_MAP: Record<string, string[]> = {
  // iMessage — read/send/watch messages (macOS only)
  imessage: [
    'imessage.getChats',
    'imessage.getMessages',
    'imessage.send',
    'imessage.search',
  ],

  // File system — read/write/search/list (desktop)
  files: [
    'files.read',
    'files.write',
    'files.list',
    'files.search',
    'files.trash',
    'files.mkdir',
  ],

  // Voice — wake word, TTS, STT (desktop)
  voice: [
    'voice.speak',
    'voice.listen',
  ],

  // Desktop automation — calendar, mail, system, apps, etc. (macOS Electron)
  desktop: [
    'desktop.calendar.getEvents',
    'desktop.calendar.addEvent',
    'desktop.reminders.getReminders',
    'desktop.reminders.addReminder',
    'desktop.mail.getUnread',
    'desktop.mail.send',
    'desktop.notes.search',
    'desktop.notes.create',
    'desktop.system.volume',
    'desktop.system.brightness',
    'desktop.system.darkMode',
    'desktop.system.doNotDisturb',
    'desktop.apps.launch',
    'desktop.apps.quit',
    'desktop.apps.list',
    'desktop.shell.run',
    'desktop.clipboard.read',
    'desktop.clipboard.write',
    'desktop.screenshot',
    'desktop.spotlight',
    'desktop.speak',
    'desktop.accessibility.click',
    'desktop.accessibility.type',
    'desktop.accessibility.pressKey',
    'desktop.accessibility.readScreen',
  ],

  // Browser automation — Playwright/CDP (desktop)
  browser: [
    'browser.open',
    'browser.snapshot',
    'browser.click',
    'browser.type',
    'browser.screenshot',
    'browser.close',
    'browser.navigate',
  ],

  // Smart home — Hue (local network access)
  hue: [
    'hue.listLights',
    'hue.controlLight',
    'hue.listScenes',
    'hue.activateScene',
  ],

  // Smart home — Sonos (local network access)
  sonos: [
    'sonos.getGroups',
    'sonos.play',
    'sonos.pause',
    'sonos.setVolume',
    'sonos.next',
    'sonos.previous',
  ],
};

/**
 * Aliases used by the web chat tool schema that map to gateway dot-notation tools.
 */
export const TOOL_NAME_ALIASES: Record<string, string> = {
  device_imessage_get_chats: 'imessage.getChats',
  device_imessage_get_messages: 'imessage.getMessages',
  device_imessage_send: 'imessage.send',
  device_imessage_search: 'imessage.search',
};

export function toGatewayToolName(toolName: string): string {
  return TOOL_NAME_ALIASES[toolName] ?? toolName;
}

// ──────────────────────────────────────────────
// Lookup helpers
// ──────────────────────────────────────────────

/** Reverse index: tool name → required capability */
const toolToCapability = new Map<string, string>();

// Build reverse index on module load
for (const [capability, tools] of Object.entries(CAPABILITY_TOOL_MAP)) {
  for (const tool of tools) {
    toolToCapability.set(tool, capability);
  }
}

/** Get the capability required to execute a given tool */
export function getRequiredCapability(toolName: string): string | null {
  const normalizedToolName = toGatewayToolName(toolName);

  // Direct match
  if (toolToCapability.has(normalizedToolName)) {
    return toolToCapability.get(normalizedToolName)!;
  }

  // Prefix match: "desktop.calendar.getEvents" → check "desktop.calendar" → "desktop"
  const parts = normalizedToolName.split('.');
  while (parts.length > 1) {
    parts.pop();
    const prefix = parts.join('.');
    if (toolToCapability.has(prefix)) {
      return toolToCapability.get(prefix)!;
    }
  }

  // Check if the first segment is a known capability
  const firstSegment = normalizedToolName.split('.')[0];
  if (CAPABILITY_TOOL_MAP[firstSegment]) {
    return firstSegment;
  }

  return null;
}

/** Check if a tool is a device-side tool (vs server-side) */
export function isDeviceTool(toolName: string): boolean {
  return getRequiredCapability(toolName) !== null;
}

/** Get all tool names available for a given set of capabilities */
export function getToolsForCapabilities(capabilities: string[]): string[] {
  const tools: string[] = [];
  for (const cap of capabilities) {
    const capTools = CAPABILITY_TOOL_MAP[cap];
    if (capTools) {
      tools.push(...capTools);
    }
  }
  return tools;
}
