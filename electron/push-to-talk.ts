/**
 * Push-to-Talk — global-shortcut-driven audio recording + Whisper transcription.
 *
 * Architecture:
 *   1. Main process registers a global shortcut (default: CmdOrCtrl+Shift+M).
 *   2. On key press → start capturing audio via child_process (`rec` / `sox`).
 *   3. On key release → stop recording, send WAV buffer to Whisper API.
 *   4. Transcription result emitted to renderer via IPC.
 *
 * Falls back to renderer-based MediaRecorder if `rec`/`sox` is not available.
 */

import { globalShortcut, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { transcribe, createWavBuffer, type TranscribeOptions } from './transcriber';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PttConfig {
  /** Global shortcut accelerator (default: CmdOrCtrl+Shift+M) */
  hotkey: string;
  /** OpenAI API key for Whisper */
  apiKey: string;
  /** BCP-47 language code hint */
  language?: string;
  /** Whisper model override */
  model?: string;
}

export type PttState = 'idle' | 'recording' | 'transcribing';

interface PttCallbacks {
  onStateChange: (state: PttState) => void;
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
}

export class PushToTalk {
  private config: PttConfig;
  private callbacks: PttCallbacks;
  private state: PttState = 'idle';
  private recProcess: ChildProcess | null = null;
  private tempFile: string;
  private isRegistered = false;

  constructor(config: PttConfig, callbacks: PttCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.tempFile = path.join(os.tmpdir(), 'nova-ptt-recording.wav');
  }

  /** Register the global shortcut and start listening. */
  start(): boolean {
    if (this.isRegistered) return true;

    try {
      // We use two separate shortcuts for press and release simulation.
      // Electron's globalShortcut doesn't support keyup, so we use a toggle approach:
      // First press = start recording, second press = stop recording.
      const registered = globalShortcut.register(this.config.hotkey, () => {
        if (this.state === 'idle') {
          this.startRecording();
        } else if (this.state === 'recording') {
          this.stopRecording();
        }
        // Ignore presses during transcription
      });

      if (registered) {
        this.isRegistered = true;
        console.log(`[PTT] Registered shortcut: ${this.config.hotkey}`);
      } else {
        console.error(`[PTT] Failed to register shortcut: ${this.config.hotkey}`);
      }
      return registered;
    } catch (err) {
      console.error('[PTT] Error registering shortcut:', err);
      return false;
    }
  }

  /** Unregister the shortcut and clean up. */
  stop(): void {
    if (this.isRegistered) {
      try {
        globalShortcut.unregister(this.config.hotkey);
      } catch {
        // Already unregistered
      }
      this.isRegistered = false;
    }
    this.killRecProcess();
    this.cleanTempFile();
  }

  /** Get current PTT state. */
  getState(): PttState {
    return this.state;
  }

  /** Update the hotkey (unregisters old, registers new). */
  updateHotkey(newHotkey: string): boolean {
    this.stop();
    this.config.hotkey = newHotkey;
    return this.start();
  }

  /** Update API key. */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Programmatically trigger a recording cycle (start → stop → transcribe).
   * Used by the tool dispatcher when the AI calls voice.listen.
   * If already recording, this is a no-op.
   */
  triggerRecording(): void {
    if (this.state !== 'idle') return;
    this.startRecording();
    // Auto-stop after 15 seconds if user doesn't press PTT key
    setTimeout(() => {
      if (this.state === 'recording') {
        this.stopRecording();
      }
    }, 15_000);
  }

  // ── Recording ──────────────────────────────────

  private startRecording(): void {
    this.setState('recording');

    // Platform-specific audio recording
    // macOS: `rec` from SoX  |  Windows: `sox` or `ffmpeg`  |  Linux: `rec` or `arecord`
    try {
      const isWin = process.platform === 'win32';
      const isLinux = process.platform === 'linux';

      let cmd: string;
      let args: string[];

      if (isWin) {
        // Windows: use SoX (sox.exe) or ffmpeg as recorder
        // SoX installation: https://sourceforge.net/projects/sox/ or `choco install sox`
        // The Windows SoX binary doesn't have a separate `rec` command — use `sox -d` instead
        cmd = 'sox';
        args = [
          '-q',                    // Quiet mode
          '-d',                    // Default audio input device
          '-r', '16000',           // 16 kHz sample rate
          '-c', '1',               // Mono
          '-b', '16',              // 16-bit
          '-e', 'signed-integer',  // Signed PCM
          this.tempFile,           // Output file
          'trim', '0', '120',     // Max 2 minutes
        ];
      } else {
        // macOS / Linux: use `rec` (SoX wrapper)
        cmd = 'rec';
        args = [
          '-q',                    // Quiet mode
          '-r', '16000',           // 16 kHz sample rate
          '-c', '1',               // Mono
          '-b', '16',              // 16-bit
          '-e', 'signed-integer',  // Signed PCM
          this.tempFile,           // Output file
          'silence', '1', '0.1', '1%',  // Start on voice
          'trim', '0', '120',     // Max 2 minutes
        ];
      }

      this.recProcess = spawn(cmd, args);

      this.recProcess.on('error', (err) => {
        console.error('[PTT] rec process error:', err.message);
        const installHint = isWin
          ? 'Audio recording failed. Install SoX: choco install sox  (or download from https://sourceforge.net/projects/sox/)'
          : isLinux
            ? 'Audio recording failed. Install SoX: sudo apt install sox'
            : 'Audio recording failed. Install SoX: brew install sox';
        this.callbacks.onError(installHint);
        this.setState('idle');
      });

      this.recProcess.on('exit', (code) => {
        if (code !== null && code !== 0 && this.state === 'recording') {
          console.warn(`[PTT] rec exited with code ${code}`);
        }
      });
    } catch (err) {
      console.error('[PTT] Failed to start recording:', err);
      this.callbacks.onError('Failed to start audio recording');
      this.setState('idle');
    }
  }

  private async stopRecording(): Promise<void> {
    this.killRecProcess();

    // Check if the temp file exists and has content
    try {
      const stats = fs.statSync(this.tempFile);
      if (stats.size < 100) {
        this.callbacks.onError('Recording too short — no audio captured');
        this.setState('idle');
        return;
      }
    } catch {
      this.callbacks.onError('No recording file found');
      this.setState('idle');
      return;
    }

    // Transcribe
    this.setState('transcribing');

    try {
      const wavBuffer = fs.readFileSync(this.tempFile);
      const opts: TranscribeOptions = {
        language: this.config.language,
        model: this.config.model,
      };
      const result = await transcribe(wavBuffer, this.config.apiKey, opts);

      if (result.text) {
        this.callbacks.onTranscription(result.text);
      } else {
        this.callbacks.onError('No speech detected in recording');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PTT] Transcription error:', msg);
      this.callbacks.onError(`Transcription failed: ${msg}`);
    } finally {
      this.cleanTempFile();
      this.setState('idle');
    }
  }

  // ── Utilities ──────────────────────────────────

  private setState(state: PttState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private killRecProcess(): void {
    if (this.recProcess) {
      try {
        // On Windows, child processes need SIGINT; SIGTERM may not work
        if (process.platform === 'win32') {
          this.recProcess.kill(); // Default signal
        } else {
          this.recProcess.kill('SIGTERM');
        }
      } catch {
        // Process already dead
      }
      this.recProcess = null;
    }
  }

  private cleanTempFile(): void {
    try {
      if (fs.existsSync(this.tempFile)) {
        fs.unlinkSync(this.tempFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Send PTT state/transcription to all renderer windows via IPC.
 */
export function broadcastPttEvent(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}
