# Nova AI — Full Stack Build Plan

**Goal:** Build a complete personal AI platform that runs in the cloud AND on all devices, with full local control capabilities.

**Date:** February 11, 2026  
**Author:** Dorel & Jarvis

---

## Current State

### Current Delivery Status

| Component | Status | Notes |
|-----------|--------|-------|
| Web app (Next.js 16) | ✅ | Chat, settings, marketing pages |
| Authentication | ✅ | NextAuth (email, Google, GitHub) |
| Stripe billing | ✅ | Free/Pro tiers, credit system |
| Multi-model AI | ✅ | OpenAI + Anthropic providers (5 models) |
| Conversation persistence | ✅ | Postgres + Prisma |
| Streaming responses | ✅ | SSE streaming |
| Tool system (web) | ✅ | Server-side tool execution + desktop client tool handoff |
| i18n | ✅ | 10 languages |
| PWA | ✅ | Installable, offline page |
| Electron app | ✅ | Desktop shell + automation + gateway client wiring (flagged) |
| Agent container | ⚠️ | Build green after typing fixes; still phase-2 hardening work remains |
| Push notifications | ✅ | Web Push API |
| Voice input | ✅ | Web Speech API |
| Integrations | ⚠️ | OAuth ready: Google/Spotify/Notion/Slack/Hue/Sonos; preview-only: WhatsApp/Discord/Phone |
| Desktop automation | ✅ | 30+ macOS tools: Calendar, Mail, Notes, Files, System, Apps, Accessibility, TTS, Shell |
| Routines/Scheduler | ✅ | Routine model, cron execution in Electron, API routes |
| Gateway Hub | ⚠️ | Device registry + WS protocol + routing foundation implemented; staged rollout recommended |

### Remaining Buildout

| Component | Priority | Effort | Notes |
|-----------|----------|--------|-------|
| Gateway Hub hardening | P0 | 1-2 weeks | Production-scale routing, monitoring, churn handling |
| Electron enhancements | P0 | 1 week | LaunchAgent, voice wake, capability expansion |
| iMessage integration | P0 | 1 week | macOS only, AppleScript/SQLite — add to Electron |
| Voice wake system | P1 | 1.5 weeks | "Hey Nova" Porcupine detection — add to Electron |
| Push-to-talk | P1 | 3 days | Hotkey → voice input — Electron globalShortcut infra exists |
| Cloud TTS (ElevenLabs) | P1 | 3 days | macOS native `say` already works via `automation.speak()` |
| Browser automation | P2 | 2 weeks | Playwright/CDP in Electron |
| Memory w/ embeddings | P1 | 1 week | pgvector + embedding generation (basic memory exists) |
| iOS app | P2 | 4 weeks | Swift, background service |
| Android app | P3 | 4 weeks | Kotlin |
| Sub-agents | P3 | 2 weeks | Spawn isolated tasks |

> **Validated as in place:** OAuth state signing, integration provider contracts, gateway protocol versioning, and baseline build/lint gates.

**Total estimated effort:** 3-4 months (18 weeks), reduced from original 24 weeks

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NOVA CLOUD                                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Next.js    │  │   Auth +     │  │     AI       │              │
│  │   Web App    │  │   Billing    │  │   Inference  │              │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘              │
│         │                                    │                       │
│         └────────────────┬───────────────────┘                       │
│                          │                                           │
│                ┌─────────▼─────────┐                                │
│                │   GATEWAY HUB     │                                │
│                │                   │                                │
│                │ • Device registry │                                │
│                │ • WebSocket mgmt  │                                │
│                │ • Tool routing    │                                │
│                │ • Presence/health │                                │
│                └─────────┬─────────┘                                │
│                          │                                           │
└──────────────────────────┼───────────────────────────────────────────┘
                           │ WSS
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  macOS    │    │   iOS     │    │  Android  │
   │  Electron │    │   App     │    │   App     │
   │           │    │           │    │           │
   │ Features: │    │ Features: │    │ Features: │
   │ • iMessage│    │ • Push    │    │ • Push    │
   │ • Files   │    │ • Voice   │    │ • Voice   │
   │ • Voice   │    │ • Camera  │    │ • Camera  │
   │ • Hue     │    │ • Health  │    │ • Files   │
   │ • Sonos   │    │ • Notify  │    │ • Notify  │
   │ • Browser │    │ • Siri    │    │           │
   │ • Desktop │    │           │    │           │
   └───────────┘    └───────────┘    └───────────┘
```

---

## Phase 1: Foundation (Weeks 1-3)

### 1.1 Gateway Hub (Cloud)

**Location:** `src/app/api/gateway/` + `src/lib/gateway/`

**Purpose:** Central hub that manages all device connections and routes tool calls.

#### Database Schema

```prisma
model Device {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  name          String   // "Dorel's MacBook Pro"
  platform      String   // macos, ios, android, web
  capabilities  String[] // ["imessage", "files", "voice", "hue"]
  lastSeenAt    DateTime
  isOnline      Boolean  @default(false)
  metadata      Json?    // version, os version, etc.
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model DeviceSession {
  id          String   @id @default(cuid())
  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [id])
  token       String   @unique
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

#### WebSocket Protocol

```typescript
// Client → Server
interface ClientMessage {
  type: 'register' | 'tool_result' | 'event' | 'heartbeat';
  requestId?: string;
  payload: any;
}

// Server → Client  
interface ServerMessage {
  type: 'tool_call' | 'sync' | 'config' | 'ack';
  requestId?: string;
  payload: any;
}

// Registration
{
  type: 'register',
  payload: {
    token: 'device-session-token',
    platform: 'macos',
    version: '1.0.0',
    capabilities: ['imessage', 'files', 'voice', 'hue', 'sonos']
  }
}

// Tool call (server → device)
{
  type: 'tool_call',
  requestId: 'uuid',
  payload: {
    tool: 'imessage.send',
    params: { to: '+46738175273', text: 'Hello!' }
  }
}

// Tool result (device → server)
{
  type: 'tool_result',
  requestId: 'uuid',
  payload: {
    success: true,
    result: { messageId: '12345' }
  }
}
```

#### Files to Create

```
src/
├── app/api/gateway/
│   ├── route.ts              # WebSocket upgrade endpoint
│   └── health/route.ts       # Device health check
├── lib/gateway/
│   ├── hub.ts                # Connection manager singleton
│   ├── device-registry.ts    # Device CRUD + presence
│   ├── message-router.ts     # Route tool calls to devices
│   ├── protocol.ts           # Message types + validation
│   └── tools.ts              # Device capability → tool mapping
```

---

### 1.2 Electron App Enhancements

**Location:** `electron/` (existing)

**Approach:** Enhance the existing Electron app instead of building a separate daemon. The Electron app already has system tray, macOS automation (2500+ lines), routine scheduler, auto-updater, Quick Chat, and accessibility API. We add: Gateway Hub WebSocket client, iMessage, voice wake, push-to-talk, and LaunchAgent auto-start.

#### What Already Exists in Electron

| Feature | File | Lines |
|---------|------|-------|
| System tray | `electron/main.ts` | ~100 |
| Quick Chat popup | `electron/main.ts` | ~80 |
| macOS automation (30+ tools) | `electron/automation.ts` | 911 |
| Local routine scheduler | `electron/main.ts` | ~60 |
| Auto-updater | `electron/main.ts` | ~50 |
| Power monitor | `electron/main.ts` | ~30 |
| Deep linking (`nova://`) | `electron/main.ts` | ~40 |
| Clipboard/screenshots | `electron/main.ts` | ~30 |
| OAuth in-app flow | `electron/main.ts` | ~40 |
| Preload API (novaDesktop) | `electron/preload.ts` | 272 |

#### New Features to Add

```
electron/
├── main.ts              # Add: Gateway WS client, voice wake, PTT, LaunchAgent
├── automation.ts        # Add: iMessage read/send/watch
├── gateway-client.ts    # NEW: WebSocket connection to Nova Gateway Hub
├── imessage.ts          # NEW: iMessage SQLite reader + AppleScript sender
├── voice-wake.ts        # NEW: Porcupine "Hey Nova" detection
└── resources/
    ├── hey-nova.ppn     # Custom Porcupine wake word model
    └── ai.nova.plist    # LaunchAgent for auto-start
```

#### Gateway Client (Electron → Cloud)

```typescript
// electron/gateway-client.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private gatewayUrl: string,
    private token: string,
    private capabilities: string[]
  ) {
    super();
  }

  async connect() {
    const protocol = this.gatewayUrl.startsWith('https') ? 'wss' : 'ws';
    const url = `${protocol}://${new URL(this.gatewayUrl).host}/api/gateway`;

    this.ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    this.ws.on('open', () => {
      this.register();
      this.startHeartbeat();
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'tool_call') {
        this.emit('tool_call', msg);
      }
    });

    this.ws.on('close', () => this.scheduleReconnect());
    this.ws.on('error', () => this.scheduleReconnect());
  }

  private register() {
    this.send({
      type: 'register',
      payload: {
        token: this.token,
        platform: 'macos',
        version: require('../package.json').version,
        capabilities: this.capabilities
      }
    });
  }

  sendToolResult(requestId: string, result: any) {
    this.send({ type: 'tool_result', requestId, payload: result });
  }

  private send(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat', payload: {} });
    }, 30_000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5_000);
  }

  disconnect() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
```

#### LaunchAgent (Auto-start)

```xml
<!-- ~/Library/LaunchAgents/ai.nova.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.nova</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/Nova AI.app/Contents/MacOS/Nova AI</string>
        <string>--hidden</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/nova.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/nova.error.log</string>
</dict>
</plist>
```

---

### 1.3 iMessage Integration (Electron)

**Approach:** Read from SQLite database + send via AppleScript. Added as modules in the Electron app (`electron/imessage.ts`), exposed via the `novaDesktop` preload API.

#### Reading Messages

```typescript
// electron/imessage.ts
import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import { homedir } from 'os';

const DB_PATH = `${homedir()}/Library/Messages/chat.db`;

export class IMessageTool {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH, { readonly: true });
  }

  async getChats(limit = 20) {
    return this.db.prepare(`
      SELECT 
        c.ROWID as id,
        c.chat_identifier as identifier,
        c.display_name as name,
        MAX(m.date) as lastMessageDate
      FROM chat c
      LEFT JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
      LEFT JOIN message m ON cmj.message_id = m.ROWID
      GROUP BY c.ROWID
      ORDER BY lastMessageDate DESC
      LIMIT ?
    `).all(limit);
  }

  async getMessages(chatId: string, limit = 50) {
    return this.db.prepare(`
      SELECT 
        m.ROWID as id,
        m.text,
        m.is_from_me as fromMe,
        m.date as timestamp,
        h.id as senderId
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      JOIN chat c ON cmj.chat_id = c.ROWID
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE c.chat_identifier = ?
      ORDER BY m.date DESC
      LIMIT ?
    `).all(chatId, limit);
  }

  async send(to: string, text: string): Promise<{ success: boolean }> {
    const script = `
      tell application "Messages"
        set targetService to 1st service whose service type = iMessage
        set targetBuddy to buddy "${to}" of targetService
        send "${text.replace(/"/g, '\\"')}" to targetBuddy
      end tell
    `;
    
    try {
      execSync(`osascript -e '${script}'`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

#### Watching for New Messages

```typescript
import { watch } from 'fs';

export class IMessageWatcher {
  private lastRowId = 0;

  async start(onMessage: (msg: Message) => void) {
    // Get initial last row ID
    this.lastRowId = this.getLastRowId();
    
    // Watch for database changes
    watch(DB_PATH, async () => {
      const newMessages = await this.getNewMessages();
      for (const msg of newMessages) {
        onMessage(msg);
      }
    });
  }

  private getNewMessages() {
    const messages = this.db.prepare(`
      SELECT * FROM message 
      WHERE ROWID > ? AND is_from_me = 0
      ORDER BY ROWID ASC
    `).all(this.lastRowId);
    
    if (messages.length > 0) {
      this.lastRowId = messages[messages.length - 1].ROWID;
    }
    
    return messages;
  }
}
```

---

## Phase 2: Voice & UX (Weeks 4-5)

> **Note:** Voice wake, PTT, and TTS are added as Electron features — not a separate daemon.

### 2.1 Voice Wake Detection

**Options:**
1. **Porcupine** (Picovoice) — Best accuracy, free tier available
2. **Vosk** — Fully offline, open source
3. **Whisper** — Use for transcription after wake

#### Implementation with Porcupine

```typescript
// src/voice/wake.ts
import { Porcupine } from '@picovoice/porcupine-node';
import { PvRecorder } from '@picovoice/pvrecorder-node';
import EventEmitter from 'events';

export class VoiceWake extends EventEmitter {
  private porcupine: Porcupine;
  private recorder: PvRecorder;

  async start() {
    // Initialize Porcupine with custom wake word "Hey Nova"
    this.porcupine = new Porcupine(
      process.env.PICOVOICE_ACCESS_KEY,
      ['./resources/hey-nova.ppn'], // Custom wake word model
      [0.5] // Sensitivity
    );

    // Initialize audio recorder
    this.recorder = new PvRecorder(
      this.porcupine.frameLength,
      -1 // Default audio device
    );

    this.recorder.start();
    this.listen();
  }

  private async listen() {
    while (true) {
      const frame = await this.recorder.read();
      const index = this.porcupine.process(frame);
      
      if (index >= 0) {
        this.emit('wake');
      }
    }
  }

  stop() {
    this.recorder.stop();
    this.porcupine.release();
  }
}
```

### 2.2 Speech-to-Text

```typescript
// src/voice/transcribe.ts
import { Whisper } from 'whisper-node'; // or use OpenAI API

export class Transcriber {
  private whisper: Whisper;

  async transcribe(audioBuffer: Buffer): Promise<string> {
    // Option 1: Local Whisper
    const result = await this.whisper.transcribe(audioBuffer);
    return result.text;
    
    // Option 2: OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData
    });
    return response.json().text;
  }
}
```

### 2.3 Text-to-Speech

```typescript
// src/voice/tts.ts
import { ElevenLabs } from 'elevenlabs';
import { exec } from 'child_process';

export class TTS {
  private elevenlabs: ElevenLabs;
  private voice = 'George'; // Warm storyteller

  async speak(text: string): Promise<void> {
    // Generate audio
    const audio = await this.elevenlabs.textToSpeech({
      text,
      voice: this.voice,
      model: 'eleven_turbo_v2'
    });

    // Save to temp file and play
    const tempFile = `/tmp/nova-tts-${Date.now()}.mp3`;
    await fs.writeFile(tempFile, audio);
    exec(`afplay ${tempFile}`);
  }
}
```

### 2.4 Push-to-Talk

```typescript
// src/voice/ptt.ts
import { globalShortcut } from 'electron';

export class PushToTalk {
  private recording = false;
  private recorder: AudioRecorder;

  register(hotkey = 'Alt+Right') {
    globalShortcut.register(hotkey, () => {
      if (!this.recording) {
        this.startRecording();
      }
    });

    globalShortcut.registerKeyUp(hotkey, () => {
      if (this.recording) {
        this.stopRecording();
      }
    });
  }

  private async startRecording() {
    this.recording = true;
    this.recorder.start();
    // Play "listening" sound
  }

  private async stopRecording() {
    this.recording = false;
    const audio = await this.recorder.stop();
    // Send to transcription → cloud
    this.emit('recording', audio);
  }
}
```

---

## Phase 3: New Integrations (Weeks 6-8)

> **Already built:** Philips Hue, Sonos, Google Calendar, Gmail, Spotify, Notion, Slack, WhatsApp, Discord, and Phone are all live with OAuth + tool execution. See `src/lib/ai/tool-executor.ts` and `src/lib/integrations.ts`.

### 3.1 Browser Automation

> The only Phase 3 integration that is genuinely new.

```typescript
// src/tools/browser.ts
import { chromium, Browser, Page } from 'playwright';

export class BrowserTool {
  private browser: Browser;
  private pages: Map<string, Page> = new Map();

  async launch() {
    this.browser = await chromium.launch({ headless: false });
  }

  async open(url: string): Promise<string> {
    const page = await this.browser.newPage();
    await page.goto(url);
    const id = crypto.randomUUID();
    this.pages.set(id, page);
    return id;
  }

  async snapshot(pageId: string): Promise<string> {
    const page = this.pages.get(pageId);
    if (!page) throw new Error('Page not found');
    
    // Get accessible tree
    const snapshot = await page.accessibility.snapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  async click(pageId: string, selector: string) {
    const page = this.pages.get(pageId);
    if (!page) throw new Error('Page not found');
    
    await page.click(selector);
  }

  async type(pageId: string, selector: string, text: string) {
    const page = this.pages.get(pageId);
    if (!page) throw new Error('Page not found');
    
    await page.fill(selector, text);
  }

  async screenshot(pageId: string): Promise<Buffer> {
    const page = this.pages.get(pageId);
    if (!page) throw new Error('Page not found');
    
    return page.screenshot();
  }
}
```

---

## Phase 4: Mobile Apps (Weeks 9-16)

### 4.1 iOS App (Swift)

```
nova-ios/
├── Nova.xcodeproj
├── Nova/
│   ├── App/
│   │   ├── NovaApp.swift
│   │   └── AppDelegate.swift
│   ├── Services/
│   │   ├── CloudConnection.swift    # WebSocket to cloud
│   │   ├── VoiceService.swift       # Speech recognition
│   │   ├── NotificationService.swift
│   │   └── LocationService.swift
│   ├── Views/
│   │   ├── ChatView.swift
│   │   ├── SettingsView.swift
│   │   └── OnboardingView.swift
│   └── Extensions/
│       └── Intents/                  # Siri integration
└── NovaIntents/
    └── IntentHandler.swift           # "Hey Siri, ask Nova..."
```

#### Key iOS Capabilities

```swift
// CloudConnection.swift
class CloudConnection: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    @Published var isConnected = false
    
    func connect(token: String) {
        let url = URL(string: "wss://api.nova.ai/gateway")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        webSocket = URLSession.shared.webSocketTask(with: request)
        webSocket?.resume()
        receiveMessages()
    }
    
    func receiveMessages() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessages()
            case .failure(let error):
                print("WebSocket error: \(error)")
            }
        }
    }
}
```

### 4.2 Android App (Kotlin)

```
nova-android/
├── app/
│   ├── src/main/
│   │   ├── java/ai/nova/android/
│   │   │   ├── MainActivity.kt
│   │   │   ├── services/
│   │   │   │   ├── CloudService.kt
│   │   │   │   ├── VoiceService.kt
│   │   │   │   └── NotificationService.kt
│   │   │   ├── ui/
│   │   │   │   ├── chat/
│   │   │   │   └── settings/
│   │   │   └── NovaApplication.kt
│   │   └── res/
│   └── build.gradle.kts
└── build.gradle.kts
```

---

## Phase 5: Polish (Weeks 17-18)

### 5.1 Memory System

> **Note:** Basic agent memory already exists (`AgentMemory` model, PostgreSQL persistence with 30s flush). This phase adds **vector embeddings** via pgvector for semantic recall.

```typescript
// src/lib/memory.ts
interface Memory {
  id: string;
  userId: string;
  type: 'fact' | 'preference' | 'event' | 'relationship';
  content: string;
  embedding: number[];  // For semantic search
  createdAt: Date;
  lastAccessedAt: Date;
  importance: number;   // 0-1, decays over time
}

class MemorySystem {
  async remember(content: string, type: Memory['type']) {
    const embedding = await this.embed(content);
    await prisma.memory.create({
      data: { content, type, embedding, importance: 1.0 }
    });
  }

  async recall(query: string, limit = 5): Promise<Memory[]> {
    const queryEmbedding = await this.embed(query);
    
    // Vector similarity search
    return prisma.$queryRaw`
      SELECT *, 1 - (embedding <=> ${queryEmbedding}) as similarity
      FROM memories
      WHERE user_id = ${userId}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  }

  async consolidate() {
    // Run periodically to decay importance and consolidate memories
  }
}
```

### 5.2 Sub-agents

> **Note:** Cron/Scheduler is already built — `Routine` model + `RoutineExecution` model in Prisma, local cron scheduler in Electron, `/api/routines/` and `/api/agent/cron` routes.

```typescript
// src/lib/sub-agents.ts
interface SubAgent {
  id: string;
  parentAgentId: string;
  task: string;           // Natural language task description
  type: 'research' | 'monitor' | 'execute';
  status: 'running' | 'completed' | 'failed';
  result?: any;
  createdAt: Date;
  completedAt?: Date;
}

class SubAgentSystem {
  async spawn(parentId: string, task: string, type: SubAgent['type']): Promise<SubAgent> {
    // Create isolated context for the sub-agent
    const subAgent = await prisma.subAgent.create({
      data: { parentAgentId: parentId, task, type, status: 'running' }
    });

    // Execute in background
    this.executeInBackground(subAgent);
    return subAgent;
  }

  private async executeInBackground(subAgent: SubAgent) {
    try {
      // Sub-agent gets its own conversation context
      // but inherits parent's tools and permissions
      const result = await this.runTask(subAgent);
      await prisma.subAgent.update({
        where: { id: subAgent.id },
        data: { status: 'completed', result, completedAt: new Date() }
      });
    } catch (error) {
      await prisma.subAgent.update({
        where: { id: subAgent.id },
        data: { status: 'failed', result: { error: error.message } }
      });
    }
  }
}
```

---

## Milestones & Timeline

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1-2 | Gateway Hub | WebSocket server + device registry + `Device`/`DeviceSession` schema |
| 3 | iMessage + Electron Gateway | iMessage in Electron, Electron as Gateway client |
| 4-5 | Voice wake + PTT + TTS | Porcupine in Electron, globalShortcut recording, ElevenLabs |
| 6 | Memory w/ embeddings | pgvector + embedding generation for semantic recall |
| 7-8 | Browser automation | Client-side Playwright/CDP in Electron |
| 9-12 | iOS app | Swift, WebSocket to Gateway, push, voice |
| 13-16 | Android app | Kotlin, same Gateway protocol |
| 17-18 | Sub-agents + Polish | Isolated task spawning, edge cases |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| iMessage access breaks | Monitor macOS updates, have fallback |
| Voice wake battery drain | Optimize, make optional |
| WebSocket reliability | Reconnection logic, offline queue |
| App Store rejection | Follow guidelines strictly |
| Scope creep | Stick to phases, ship incrementally |

---

## Success Metrics

### Launch (Month 2)
- [ ] Electron with Gateway client, iMessage, voice wake
- [ ] Gateway Hub live
- [ ] 100 beta users

### Growth (Month 4)  
- [ ] iOS app in App Store
- [ ] Memory with embeddings
- [ ] 1,000 users
- [ ] 100 paying customers

### Scale (Month 8)
- [ ] Android app
- [ ] Sub-agents
- [ ] 10,000 users
- [ ] 1,000 paying customers
- [ ] Break-even

---

## Getting Started

```bash
# 1. Add Device/DeviceSession models to prisma/schema.prisma
npx prisma migrate dev --name add_device_registry

# 2. Create Gateway Hub
mkdir -p src/lib/gateway src/app/api/gateway
# Implement: hub.ts, device-registry.ts, message-router.ts, protocol.ts

# 3. Add iMessage + voice wake to Electron
# Create: electron/imessage.ts, electron/voice-wake.ts, electron/gateway-client.ts
npm install better-sqlite3 @picovoice/porcupine-node @picovoice/pvrecorder-node

# 4. Wire Electron → Gateway Hub
# 5. Ship it
```

---

*Let's build the future of personal AI.*

*— Dorel & Jarvis, February 2026*
