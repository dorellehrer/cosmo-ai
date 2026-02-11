/**
 * Nova AI — Desktop Tool Definitions
 *
 * Defines tool schemas for AI function-calling integration with macOS automation.
 * These tools are only available when the user is running the Electron desktop app.
 * The AI model calls these tools via the standard OpenAI function-calling protocol,
 * and the renderer invokes the corresponding novaDesktop.automation.* methods.
 */

export interface DesktopToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
        items?: { type: string };
      }>;
      required?: string[];
    };
  };
}

// ─── Calendar Tools ────────────────────────────────────────

const calendarListEvents: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_calendar_list_events',
    description: 'List upcoming calendar events from macOS Calendar app. Returns event titles, dates, locations, and calendar names.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days ahead to look (default 7)' },
        calendarName: { type: 'string', description: 'Filter to a specific calendar name' },
      },
    },
  },
};

const calendarCreateEvent: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_calendar_create_event',
    description: 'Create a new event in the macOS Calendar app.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startDate: { type: 'string', description: 'Start date/time in ISO 8601 format' },
        endDate: { type: 'string', description: 'End date/time in ISO 8601 format' },
        calendarName: { type: 'string', description: 'Calendar name (uses default if omitted)' },
        location: { type: 'string', description: 'Event location' },
        notes: { type: 'string', description: 'Event notes/description' },
        allDay: { type: 'boolean', description: 'Whether this is an all-day event' },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },
};

// ─── Reminders Tools ───────────────────────────────────────

const remindersList: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_reminders_list',
    description: 'List reminders from macOS Reminders app.',
    parameters: {
      type: 'object',
      properties: {
        listName: { type: 'string', description: 'Filter to a specific reminders list' },
        includeCompleted: { type: 'boolean', description: 'Include completed reminders (default false)' },
      },
    },
  },
};

const remindersCreate: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_reminders_create',
    description: 'Create a new reminder in the macOS Reminders app.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Reminder title' },
        listName: { type: 'string', description: 'Reminders list name (uses default if omitted)' },
        dueDate: { type: 'string', description: 'Due date in ISO 8601 format' },
        notes: { type: 'string', description: 'Reminder notes' },
        priority: { type: 'number', description: 'Priority: 0 (none), 1 (high), 5 (medium), 9 (low)' },
      },
      required: ['name'],
    },
  },
};

// ─── Mail Tools ────────────────────────────────────────────

const mailSearch: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_mail_search',
    description: 'Search emails in the macOS Mail app.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        account: { type: 'string', description: 'Filter to a specific email account' },
        limit: { type: 'number', description: 'Maximum number of results (default 10)' },
      },
      required: ['query'],
    },
  },
};

const mailSend: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_mail_send',
    description: 'Send an email using the macOS Mail app.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body text' },
        cc: { type: 'string', description: 'CC recipient email address' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
};

const mailUnreadCount: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_mail_unread_count',
    description: 'Get the unread email count from macOS Mail app.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

// ─── Notes Tools ───────────────────────────────────────────

const notesCreate: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_notes_create',
    description: 'Create a new note in the macOS Notes app.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        body: { type: 'string', description: 'Note body content (plain text or HTML)' },
        folder: { type: 'string', description: 'Notes folder name (uses default if omitted)' },
      },
      required: ['title', 'body'],
    },
  },
};

const notesSearch: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_notes_search',
    description: 'Search notes in the macOS Notes app.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum number of results (default 10)' },
      },
      required: ['query'],
    },
  },
};

// ─── System Control Tools ──────────────────────────────────

const systemGetVolume: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_get_volume',
    description: 'Get the current system volume level and mute state.',
    parameters: { type: 'object', properties: {} },
  },
};

const systemSetVolume: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_set_volume',
    description: 'Set the system volume level or toggle mute.',
    parameters: {
      type: 'object',
      properties: {
        volume: { type: 'number', description: 'Volume level 0-100' },
        muted: { type: 'boolean', description: 'Mute or unmute' },
      },
    },
  },
};

const systemGetDarkMode: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_get_dark_mode',
    description: 'Check if macOS Dark Mode is currently enabled.',
    parameters: { type: 'object', properties: {} },
  },
};

const systemSetDarkMode: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_set_dark_mode',
    description: 'Enable or disable macOS Dark Mode.',
    parameters: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'true to enable Dark Mode, false to disable' },
      },
      required: ['enabled'],
    },
  },
};

const systemGetBrightness: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_get_brightness',
    description: 'Get the current display brightness level.',
    parameters: { type: 'object', properties: {} },
  },
};

const systemSetBrightness: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_set_brightness',
    description: 'Set the display brightness level.',
    parameters: {
      type: 'object',
      properties: {
        brightness: { type: 'number', description: 'Brightness level 0-100' },
      },
      required: ['brightness'],
    },
  },
};

const systemToggleDnd: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_toggle_dnd',
    description: 'Toggle macOS Do Not Disturb / Focus mode.',
    parameters: { type: 'object', properties: {} },
  },
};

const systemLockScreen: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_lock_screen',
    description: 'Lock the screen immediately.',
    parameters: { type: 'object', properties: {} },
  },
};

const systemEmptyTrash: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_empty_trash',
    description: 'Empty the macOS Trash.',
    parameters: { type: 'object', properties: {} },
  },
};

// ─── App Control Tools ─────────────────────────────────────

const appList: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_app_list',
    description: 'List all currently running applications on macOS.',
    parameters: { type: 'object', properties: {} },
  },
};

const appLaunch: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_app_launch',
    description: 'Launch a macOS application by name.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Application name (e.g., "Safari", "Finder")' },
      },
      required: ['name'],
    },
  },
};

const appQuit: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_app_quit',
    description: 'Quit a running macOS application.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Application name' },
        force: { type: 'boolean', description: 'Force quit the app (default false)' },
      },
      required: ['name'],
    },
  },
};

const appFocus: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_app_focus',
    description: 'Bring a macOS application to the foreground.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Application name' },
      },
      required: ['name'],
    },
  },
};

// ─── File System Tools (headless) ──────────────────────────

const fsReadFile: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_fs_read_file',
    description: 'Read the contents of a file on disk. Supports text files only.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path or path with ~ to the file' },
      },
      required: ['path'],
    },
  },
};

const fsWriteFile: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_fs_write_file',
    description: 'Write or append content to a file on disk.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path or path with ~ to the file' },
        content: { type: 'string', description: 'Content to write' },
        append: { type: 'boolean', description: 'Append instead of overwrite (default false)' },
      },
      required: ['path', 'content'],
    },
  },
};

const fsListDir: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_fs_list_dir',
    description: 'List contents of a directory on disk.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path or path with ~ to the directory' },
        recursive: { type: 'boolean', description: 'List recursively (default false)' },
      },
      required: ['path'],
    },
  },
};

const fsSearch: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_fs_search',
    description: 'Search for files matching a pattern in a directory.',
    parameters: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to search in' },
        pattern: { type: 'string', description: 'Search pattern (glob or name substring)' },
        maxResults: { type: 'number', description: 'Maximum results (default 20)' },
      },
      required: ['directory', 'pattern'],
    },
  },
};

const fsMoveToTrash: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_fs_move_to_trash',
    description: 'Move a file or folder to the macOS Trash.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file or folder' },
      },
      required: ['path'],
    },
  },
};

const fsRevealInFinder: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_fs_reveal_in_finder',
    description: 'Reveal a file or folder in Finder.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file or folder' },
      },
      required: ['path'],
    },
  },
};

// ─── Window Management Tools ───────────────────────────────

const windowList: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_window_list',
    description: 'List all visible windows with their positions and sizes.',
    parameters: { type: 'object', properties: {} },
  },
};

const windowResize: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_window_resize',
    description: 'Move and/or resize an application window.',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Application name' },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        width: { type: 'number', description: 'Width' },
        height: { type: 'number', description: 'Height' },
      },
      required: ['app'],
    },
  },
};

const windowMinimizeAll: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_window_minimize_all',
    description: 'Minimize all windows (show desktop).',
    parameters: { type: 'object', properties: {} },
  },
};

// ─── Spotlight Search ──────────────────────────────────────

const spotlightSearch: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_spotlight_search',
    description: 'Search files, documents, and content on the Mac using Spotlight.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        kind: { type: 'string', description: 'Filter by file kind', enum: ['image', 'document', 'pdf', 'music', 'movie', 'email', 'presentation', 'spreadsheet', 'folder', 'application'] },
        limit: { type: 'number', description: 'Maximum results (default 10)' },
      },
      required: ['query'],
    },
  },
};

// ─── Text-to-Speech ────────────────────────────────────────

const speak: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_speak',
    description: 'Speak text aloud using the macOS text-to-speech engine.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to speak' },
        voice: { type: 'string', description: 'Voice name (e.g., "Samantha", "Alex")' },
        rate: { type: 'number', description: 'Speech rate in words per minute (default 175)' },
      },
      required: ['text'],
    },
  },
};

// ─── Shell (allowlisted) ───────────────────────────────────

const shellRun: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_shell_run',
    description: 'Run a safe, allowlisted shell command. Allowed commands include: date, cal, uptime, whoami, hostname, df, du, find, ls, cat, head, tail, wc, grep, sort, uniq, open, say, mdfind, sw_vers, diskutil, top, ps.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
      },
      required: ['command'],
    },
  },
};

// ─── Routine Management ────────────────────────────────────

const routineCreate: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_routine_create',
    description: 'Create a local automation routine that runs on a cron schedule, even when offline. Routines chain multiple automation steps together.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Routine name' },
        schedule: { type: 'string', description: 'Cron expression (e.g., "0 9 * * *" for 9 AM daily, "*/30 * * * *" for every 30 min)' },
        enabled: { type: 'boolean', description: 'Start enabled (default true)' },
        toolChain: {
          type: 'array',
          description: 'Ordered list of automation steps. Each step has a toolName and optional params. Use {{PREVIOUS_RESULT}} in params to pass output from the previous step.',
          items: { type: 'object' },
        },
      },
      required: ['name', 'schedule', 'toolChain'],
    },
  },
};

const routineList: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_routine_list',
    description: 'List all local automation routines with their schedules and status.',
    parameters: { type: 'object', properties: {} },
  },
};

const routineDelete: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_routine_delete',
    description: 'Delete a local automation routine by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Routine ID' },
      },
      required: ['id'],
    },
  },
};

const routineRunNow: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_routine_run_now',
    description: 'Immediately execute a local automation routine.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Routine ID' },
      },
      required: ['id'],
    },
  },
};

// ─── Accessibility Tools ────────────────────────────────────

const accessibilityCheck: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_accessibility_check',
    description: 'Check if macOS Accessibility permission is granted for Nova. Required for screen reading, clicking elements, and typing.',
    parameters: { type: 'object', properties: {} },
  },
};

const accessibilityRequest: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_accessibility_request',
    description: 'Open macOS System Preferences to request Accessibility permission for Nova.',
    parameters: { type: 'object', properties: {} },
  },
};

const accessibilityClickElement: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_accessibility_click',
    description: 'Click a UI element in a macOS application by name. Requires Accessibility permission.',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Application name (e.g., "Safari")' },
        element: { type: 'string', description: 'Element name or title to click' },
        elementType: { type: 'string', description: 'Element type (e.g., "button", "menu item", "checkbox")' },
      },
      required: ['app', 'element'],
    },
  },
};

const accessibilityTypeText: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_accessibility_type',
    description: 'Type text into the currently focused field, or into a specific app. Requires Accessibility permission.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to type' },
        app: { type: 'string', description: 'Optional: application to focus first' },
      },
      required: ['text'],
    },
  },
};

const accessibilityPressKey: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_accessibility_press_key',
    description: 'Press a keyboard shortcut. Requires Accessibility permission. Modifiers: command, control, option, shift.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to press (e.g., "c", "v", "tab", "return", "space")' },
        modifiers: { type: 'array', description: 'Modifier keys (e.g., ["command", "shift"])', items: { type: 'string' } },
      },
      required: ['key'],
    },
  },
};

const accessibilityReadScreen: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_accessibility_read_screen',
    description: 'Read the visible UI elements of an application window (buttons, text fields, labels). Requires Accessibility permission.',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Application name to read' },
      },
      required: ['app'],
    },
  },
};

// ─── Additional Missing Tools ──────────────────────────────

const calendarListCalendars: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_calendar_list_calendars',
    description: 'List all available calendars from the macOS Calendar app.',
    parameters: { type: 'object', properties: {} },
  },
};

const remindersListLists: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_reminders_list_lists',
    description: 'List all reminder lists from the macOS Reminders app.',
    parameters: { type: 'object', properties: {} },
  },
};

const appIsRunning: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_app_is_running',
    description: 'Check if a macOS application is currently running.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Application name' },
      },
      required: ['name'],
    },
  },
};

const systemSleep: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_sleep',
    description: 'Put the Mac to sleep immediately.',
    parameters: { type: 'object', properties: {} },
  },
};

const systemGetDnd: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_system_get_dnd',
    description: 'Check if macOS Do Not Disturb / Focus mode is currently active.',
    parameters: { type: 'object', properties: {} },
  },
};

const listVoices: DesktopToolDefinition = {
  type: 'function',
  function: {
    name: 'desktop_list_voices',
    description: 'List all available macOS text-to-speech voices.',
    parameters: { type: 'object', properties: {} },
  },
};

// ═══════════════════════════════════════════════════════════
// Export all tools
// ═══════════════════════════════════════════════════════════

export const DESKTOP_TOOLS: DesktopToolDefinition[] = [
  // Calendar
  calendarListEvents,
  calendarCreateEvent,
  calendarListCalendars,
  // Reminders
  remindersList,
  remindersCreate,
  // Mail
  mailSearch,
  mailSend,
  mailUnreadCount,
  // Notes
  notesCreate,
  notesSearch,
  // Reminders extra
  remindersListLists,
  // System Control
  systemGetVolume,
  systemSetVolume,
  systemGetDarkMode,
  systemSetDarkMode,
  systemGetBrightness,
  systemSetBrightness,
  systemGetDnd,
  systemToggleDnd,
  systemSleep,
  systemLockScreen,
  systemEmptyTrash,
  // App Control
  appList,
  appLaunch,
  appQuit,
  appFocus,
  appIsRunning,
  // File System
  fsReadFile,
  fsWriteFile,
  fsListDir,
  fsSearch,
  fsMoveToTrash,
  fsRevealInFinder,
  // Window Management
  windowList,
  windowResize,
  windowMinimizeAll,
  // Spotlight
  spotlightSearch,
  // TTS
  speak,
  // Shell
  shellRun,
  // Accessibility
  accessibilityCheck,
  accessibilityRequest,
  accessibilityClickElement,
  accessibilityTypeText,
  accessibilityPressKey,
  accessibilityReadScreen,
  // TTS voices
  listVoices,
  // Routines
  routineCreate,
  routineList,
  routineDelete,
  routineRunNow,
];

/**
 * Map from tool name → novaDesktop.automation method path.
 * Used by the client-side tool executor to dispatch calls.
 */
export const DESKTOP_TOOL_DISPATCH: Record<string, {
  path: string[];
  paramMapper?: (args: Record<string, unknown>) => unknown[];
}> = {
  // Calendar
  desktop_calendar_list_events: { path: ['automation', 'calendar', 'listEvents'] },
  desktop_calendar_create_event: { path: ['automation', 'calendar', 'createEvent'] },
  desktop_calendar_list_calendars: { path: ['automation', 'calendar', 'listCalendars'] },
  // Reminders
  desktop_reminders_list: { path: ['automation', 'reminders', 'list'] },
  desktop_reminders_create: { path: ['automation', 'reminders', 'create'] },
  desktop_reminders_list_lists: { path: ['automation', 'reminders', 'listLists'] },
  // Mail
  desktop_mail_search: { path: ['automation', 'mail', 'search'] },
  desktop_mail_send: { path: ['automation', 'mail', 'send'] },
  desktop_mail_unread_count: { path: ['automation', 'mail', 'unreadCount'] },
  // Notes
  desktop_notes_create: { path: ['automation', 'notes', 'create'] },
  desktop_notes_search: { path: ['automation', 'notes', 'search'] },
  // System Control
  desktop_system_get_volume: { path: ['automation', 'system', 'getVolume'] },
  desktop_system_set_volume: { path: ['automation', 'system', 'setVolume'] },
  desktop_system_get_dark_mode: { path: ['automation', 'system', 'getDarkMode'] },
  desktop_system_set_dark_mode: { path: ['automation', 'system', 'setDarkMode'] },
  desktop_system_get_brightness: { path: ['automation', 'system', 'getBrightness'] },
  desktop_system_set_brightness: { path: ['automation', 'system', 'setBrightness'] },
  desktop_system_get_dnd: { path: ['automation', 'system', 'getDnd'] },
  desktop_system_toggle_dnd: { path: ['automation', 'system', 'toggleDnd'] },
  desktop_system_sleep: { path: ['automation', 'system', 'sleep'] },
  desktop_system_lock_screen: { path: ['automation', 'system', 'lockScreen'] },
  desktop_system_empty_trash: { path: ['automation', 'system', 'emptyTrash'] },
  // App Control
  desktop_app_list: { path: ['automation', 'app', 'list'] },
  desktop_app_launch: { path: ['automation', 'app', 'launch'] },
  desktop_app_quit: { path: ['automation', 'app', 'quit'] },
  desktop_app_focus: { path: ['automation', 'app', 'focus'] },
  desktop_app_is_running: { path: ['automation', 'app', 'isRunning'] },
  // File System
  desktop_fs_read_file: { path: ['automation', 'fs', 'readFile'] },
  desktop_fs_write_file: { path: ['automation', 'fs', 'writeFile'] },
  desktop_fs_list_dir: { path: ['automation', 'fs', 'listDir'] },
  desktop_fs_search: { path: ['automation', 'fs', 'search'] },
  desktop_fs_move_to_trash: { path: ['automation', 'fs', 'moveToTrash'] },
  desktop_fs_reveal_in_finder: { path: ['automation', 'fs', 'revealInFinder'] },
  // Window Management
  desktop_window_list: { path: ['automation', 'window', 'list'] },
  desktop_window_resize: {
    path: ['automation', 'window', 'resize'],
    paramMapper: (args) => [{
      app: args.app,
      ...(args.x !== undefined || args.y !== undefined ? { position: { x: args.x ?? 0, y: args.y ?? 0 } } : {}),
      ...(args.width !== undefined || args.height !== undefined ? { size: { width: args.width ?? 800, height: args.height ?? 600 } } : {}),
    }],
  },
  desktop_window_minimize_all: { path: ['automation', 'window', 'minimizeAll'] },
  // Spotlight
  desktop_spotlight_search: { path: ['automation', 'spotlight', 'search'] },
  // TTS
  desktop_speak: { path: ['automation', 'speak'] },
  desktop_list_voices: { path: ['automation', 'listVoices'] },
  // Accessibility
  desktop_accessibility_check: { path: ['automation', 'accessibility', 'check'] },
  desktop_accessibility_request: { path: ['automation', 'accessibility', 'request'] },
  desktop_accessibility_click: { path: ['automation', 'accessibility', 'click'] },
  desktop_accessibility_type: { path: ['automation', 'accessibility', 'type'] },
  desktop_accessibility_press_key: { path: ['automation', 'accessibility', 'pressKey'] },
  desktop_accessibility_read_screen: { path: ['automation', 'accessibility', 'readScreen'] },
  // Shell
  desktop_shell_run: { path: ['automation', 'shell', 'run'] },
  // Routines
  desktop_routine_create: { path: ['routines', 'add'] },
  desktop_routine_list: { path: ['routines', 'list'] },
  desktop_routine_delete: { path: ['routines', 'delete'] },
  desktop_routine_run_now: { path: ['routines', 'runNow'] },
};

/**
 * Execute a desktop tool by name with the given arguments.
 * This is called from the client-side chat handler when the AI invokes a desktop tool.
 *
 * @returns The result from the native automation API.
 */
export async function executeDesktopTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const desktop = (window as Window & { novaDesktop?: Record<string, unknown> }).novaDesktop;
  if (!desktop) {
    throw new Error('Desktop tools are only available in the Nova desktop app');
  }

  const dispatch = DESKTOP_TOOL_DISPATCH[toolName];
  if (!dispatch) {
    throw new Error(`Unknown desktop tool: ${toolName}`);
  }

  // Walk the path to find the function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = desktop;
  for (let i = 0; i < dispatch.path.length - 1; i++) {
    target = target[dispatch.path[i]];
    if (!target) {
      throw new Error(`Desktop API path not found: ${dispatch.path.slice(0, i + 1).join('.')}`);
    }
  }

  const methodName = dispatch.path[dispatch.path.length - 1];
  const method = target[methodName];

  if (typeof method !== 'function') {
    throw new Error(`Desktop API method not found: ${dispatch.path.join('.')}`);
  }

  // Apply param mapper if defined, otherwise pass args as single object
  if (dispatch.paramMapper) {
    return method(...dispatch.paramMapper(args));
  }

  // For routines.delete / routines.runNow, extract the id directly
  if (toolName === 'desktop_routine_delete' || toolName === 'desktop_routine_run_now') {
    return method(args.id);
  }

  return method(Object.keys(args).length > 0 ? args : undefined);
}
