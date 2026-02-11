/**
 * Type declarations for optional Picovoice packages.
 * These packages are not included in the default install.
 * Install with: npm install @picovoice/porcupine-node @picovoice/pvrecorder-node
 */

declare module '@picovoice/porcupine-node' {
  export class Porcupine {
    static KEYWORD_PATHS?: Record<string, string>;
    constructor(
      accessKey: string,
      keywordPaths: string[],
      sensitivities: number[],
    );
    process(frame: Int16Array): number;
    delete(): void;
    get frameLength(): number;
    get sampleRate(): number;
  }
}

declare module '@picovoice/pvrecorder-node' {
  export class PvRecorder {
    constructor(frameLength: number, deviceIndex: number);
    start(): void;
    stop(): void;
    read(): Int16Array;
    delete(): void;
  }
}
