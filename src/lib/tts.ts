/**
 * TTS — Cloud Text-to-Speech via ElevenLabs API.
 *
 * Generates speech audio from text. Returns an audio Buffer (MP3).
 * Falls back to OpenAI TTS if ElevenLabs key is not available.
 *
 * Environment:
 *   ELEVENLABS_API_KEY — ElevenLabs API key
 *   ELEVENLABS_VOICE_ID — Default voice ID (optional, defaults to "Rachel")
 */

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

// Popular ElevenLabs voice IDs
export const ELEVENLABS_VOICES: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',     // Female, calm, narration
  drew: '29vD33N1CtxCmqQRPOHJ',        // Male, friendly
  clyde: '2EiwWnXFnvU5JabPnv8n',       // Male, deep
  domi: 'AZnzlk1XvdvUeBnXmlld',        // Female, energetic
  aria: '9BWtsMINqrJLrRacOk9x',        // Female, warm
  nova: 'EXAVITQu4vr4xnSDxMaL',        // Female (Bella voice rebrand)
};

export interface TtsOptions {
  /** ElevenLabs voice ID or name key. Defaults to 'nova'. */
  voice?: string;
  /** Speech speed multiplier (0.5–2.0). Default 1.0. */
  speed?: number;
  /** Provider: 'elevenlabs' or 'openai'. Auto-detected from available keys. */
  provider?: 'elevenlabs' | 'openai';
  /** OpenAI voice name (for OpenAI TTS). Default 'nova'. */
  openaiVoice?: string;
  /** Output format. Default 'mp3_44100_128'. */
  format?: string;
}

export interface TtsResult {
  /** Audio data as Buffer */
  audio: Buffer;
  /** MIME type (audio/mpeg for MP3) */
  contentType: string;
  /** Provider used */
  provider: 'elevenlabs' | 'openai';
}

/**
 * Generate speech audio from text.
 */
export async function generateSpeech(
  text: string,
  options: TtsOptions = {},
): Promise<TtsResult> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const provider = options.provider || (elevenLabsKey ? 'elevenlabs' : 'openai');

  if (provider === 'elevenlabs' && elevenLabsKey) {
    return generateElevenLabs(text, elevenLabsKey, options);
  } else if (openaiKey) {
    return generateOpenAiTts(text, openaiKey, options);
  } else {
    throw new Error('No TTS API key available. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.');
  }
}

// ── ElevenLabs ─────────────────────────────────

async function generateElevenLabs(
  text: string,
  apiKey: string,
  options: TtsOptions,
): Promise<TtsResult> {
  const voiceInput = options.voice || process.env.ELEVENLABS_VOICE_ID || 'nova';
  const voiceId = ELEVENLABS_VOICES[voiceInput.toLowerCase()] || voiceInput;
  const format = options.format || 'mp3_44100_128';

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}?output_format=${format}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
          speed: options.speed ?? 1.0,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audio: Buffer.from(arrayBuffer),
    contentType: 'audio/mpeg',
    provider: 'elevenlabs',
  };
}

// ── OpenAI TTS ─────────────────────────────────

async function generateOpenAiTts(
  text: string,
  apiKey: string,
  options: TtsOptions,
): Promise<TtsResult> {
  const voice = options.openaiVoice || 'nova';
  const speed = options.speed ?? 1.0;

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      speed,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI TTS error ${response.status}: ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audio: Buffer.from(arrayBuffer),
    contentType: 'audio/mpeg',
    provider: 'openai',
  };
}
