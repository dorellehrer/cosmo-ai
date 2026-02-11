/**
 * Transcriber — OpenAI Whisper API client for speech-to-text.
 *
 * Accepts a WAV audio buffer and returns the transcribed text.
 * Runs in the Electron main process.
 */

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscribeOptions {
  /** BCP-47 language hint (e.g. "en", "sv", "ar"). Omit for auto-detect. */
  language?: string;
  /** Prompt/context to improve accuracy. */
  prompt?: string;
  /** Model to use (default: whisper-2). */
  model?: string;
}

export interface TranscribeResult {
  text: string;
  /** Duration in seconds if returned by API */
  duration?: number;
}

/**
 * Transcribe a WAV audio buffer using the OpenAI Whisper API.
 *
 * @param wavBuffer - Raw WAV file data (PCM 16-bit, 16 kHz mono preferred).
 * @param apiKey    - OpenAI API key.
 * @param options   - Optional language hint, prompt, and model.
 * @returns Transcribed text.
 */
export async function transcribe(
  wavBuffer: Buffer,
  apiKey: string,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const { language, prompt, model = 'whisper-2' } = options;

  // Build multipart/form-data manually (no npm dep needed)
  const boundary = `----NovaTranscriber${Date.now()}`;
  const parts: Buffer[] = [];

  // File part
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
    ),
  );
  parts.push(wavBuffer);
  parts.push(Buffer.from('\r\n'));

  // Model part
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`,
    ),
  );

  // Optional language hint
  if (language) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`,
      ),
    );
  }

  // Optional prompt
  if (prompt) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}\r\n`,
      ),
    );
  }

  // Response format
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n`,
    ),
  );

  // Closing boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as { text: string; duration?: number };
  return { text: data.text.trim(), duration: data.duration };
}

/**
 * Create a WAV header for raw PCM data.
 * Useful when PvRecorder gives raw Int16 frames.
 */
export function createWavBuffer(
  pcmData: Int16Array,
  sampleRate = 16000,
  numChannels = 1,
  bitsPerSample = 16,
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length * 2; // 2 bytes per Int16 sample
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (PCM = 16)
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM = 1)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Copy PCM samples
  const pcmBuffer = Buffer.from(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
  pcmBuffer.copy(buffer, headerSize);

  return buffer;
}
