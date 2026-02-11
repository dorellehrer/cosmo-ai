/**
 * Voice Wake Word — "Hey Nova" detection using Porcupine.
 *
 * Requires:
 *   npm install @picovoice/porcupine-node @picovoice/pvrecorder-node
 *
 * A custom "Hey Nova" wake word model (.ppn file) must be generated at:
 *   https://console.picovoice.ai/
 *
 * Environment:
 *   PICOVOICE_ACCESS_KEY — Picovoice Console access key
 *
 * The module gracefully degrades if dependencies are missing.
 */

import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export type WakeState = 'stopped' | 'listening' | 'wake-detected';

interface WakeCallbacks {
  onWake: () => void;
  onStateChange: (state: WakeState) => void;
  onError: (error: string) => void;
}

interface PorcupineInstance {
  process: (frame: Int16Array) => number;
  delete: () => void;
  frameLength: number;
  sampleRate: number;
}

interface PvRecorderInstance {
  start: () => void;
  stop: () => void;
  read: () => Int16Array;
  delete: () => void;
}

export class VoiceWake {
  private callbacks: WakeCallbacks;
  private accessKey: string;
  private state: WakeState = 'stopped';
  private porcupine: PorcupineInstance | null = null;
  private recorder: PvRecorderInstance | null = null;
  private listenLoop: NodeJS.Timeout | null = null;
  private enabled = false;

  constructor(accessKey: string, callbacks: WakeCallbacks) {
    this.accessKey = accessKey;
    this.callbacks = callbacks;
  }

  /** Start listening for the wake word. */
  async start(): Promise<boolean> {
    if (this.state === 'listening') return true;

    try {
      // Dynamic imports — gracefully fail if packages not installed
      const { Porcupine } = await import('@picovoice/porcupine-node');
      const { PvRecorder } = await import('@picovoice/pvrecorder-node');

      // Look for custom wake word model
      const modelPath = this.findWakeWordModel();

      if (modelPath) {
        // Custom "Hey Nova" model
        this.porcupine = new Porcupine(
          this.accessKey,
          [modelPath],
          [0.6], // Sensitivity (0.0 – 1.0)
        ) as unknown as PorcupineInstance;
      } else {
        // Fallback: use built-in "Hey Google" or "Computer" keyword
        // The user should generate a custom model for production
        console.warn('[VoiceWake] No custom .ppn model found. Using built-in "Computer" keyword.');
        console.warn('[VoiceWake] Generate "Hey Nova" at https://console.picovoice.ai/');
        this.porcupine = new Porcupine(
          this.accessKey,
          [Porcupine.KEYWORD_PATHS?.computer ?? 'computer'],
          [0.6],
        ) as unknown as PorcupineInstance;
      }

      // Initialize audio recorder
      this.recorder = new PvRecorder(this.porcupine.frameLength, -1) as unknown as PvRecorderInstance;
      this.recorder.start();

      this.enabled = true;
      this.setState('listening');

      // Start detection loop
      this.runDetectionLoop();

      console.log('[VoiceWake] Started listening for wake word');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot find module') || msg.includes('MODULE_NOT_FOUND')) {
        console.warn('[VoiceWake] Picovoice packages not installed. Wake word disabled.');
        console.warn('[VoiceWake] Install with: npm install @picovoice/porcupine-node @picovoice/pvrecorder-node');
        this.callbacks.onError('Wake word packages not installed');
      } else {
        console.error('[VoiceWake] Failed to start:', msg);
        this.callbacks.onError(`Wake word init failed: ${msg}`);
      }
      return false;
    }
  }

  /** Stop listening. */
  stop(): void {
    this.enabled = false;

    if (this.listenLoop) {
      clearTimeout(this.listenLoop);
      this.listenLoop = null;
    }

    if (this.recorder) {
      try {
        this.recorder.stop();
        this.recorder.delete();
      } catch {
        // Already cleaned up
      }
      this.recorder = null;
    }

    if (this.porcupine) {
      try {
        this.porcupine.delete();
      } catch {
        // Already cleaned up
      }
      this.porcupine = null;
    }

    this.setState('stopped');
    console.log('[VoiceWake] Stopped');
  }

  /** Toggle wake word detection on/off. */
  async toggle(): Promise<boolean> {
    if (this.state === 'listening') {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  getState(): WakeState {
    return this.state;
  }

  isActive(): boolean {
    return this.state === 'listening';
  }

  // ── Detection Loop ─────────────────────────────

  private runDetectionLoop(): void {
    if (!this.enabled || !this.porcupine || !this.recorder) return;

    const tick = () => {
      if (!this.enabled || !this.porcupine || !this.recorder) return;

      try {
        const frame = this.recorder.read();
        const keywordIndex = this.porcupine.process(frame);

        if (keywordIndex >= 0) {
          console.log('[VoiceWake] Wake word detected!');
          this.setState('wake-detected');
          this.callbacks.onWake();

          // Resume listening after a brief cooldown
          setTimeout(() => {
            if (this.enabled) {
              this.setState('listening');
            }
          }, 2000);
        }
      } catch (err) {
        console.error('[VoiceWake] Detection error:', err);
      }

      // Schedule next frame read (~32ms for 512 samples at 16kHz)
      if (this.enabled) {
        this.listenLoop = setTimeout(tick, 30);
      }
    };

    this.listenLoop = setTimeout(tick, 30);
  }

  // ── Model Discovery ────────────────────────────

  /**
   * Search for a custom .ppn wake word model file.
   * Looks in: app resources dir, app data dir, and electron/ dir.
   */
  private findWakeWordModel(): string | null {
    const searchDirs = [
      path.join(process.resourcesPath || '', 'wake-word'),
      path.join(app.getPath('userData'), 'wake-word'),
      path.join(__dirname, '..', 'resources', 'wake-word'),
      path.join(__dirname, '..'),
    ];

    for (const dir of searchDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        const ppnFile = files.find((f) => f.endsWith('.ppn'));
        if (ppnFile) {
          const fullPath = path.join(dir, ppnFile);
          console.log(`[VoiceWake] Found wake word model: ${fullPath}`);
          return fullPath;
        }
      } catch {
        // Ignore search errors
      }
    }

    return null;
  }

  // ── Utilities ──────────────────────────────────

  private setState(state: WakeState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }
}

/**
 * Broadcast wake events to all renderer windows.
 */
export function broadcastWakeEvent(channel: string, data?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}
