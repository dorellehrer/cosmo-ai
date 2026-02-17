/**
 * TTS API Route — POST /api/tts
 *
 * Generates speech audio from text using ElevenLabs or OpenAI TTS.
 * Streams audio back as MP3.
 *
 * Body: { text: string, voice?: string, speed?: number, provider?: 'elevenlabs' | 'openai' }
 * Response: audio/mpeg binary stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSpeech, type TtsOptions } from '@/lib/tts';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimitDistributed(
      `tts:${session.user.id}`,
      RATE_LIMIT_API,
    );
    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'X-RateLimit-Limit': String(RATE_LIMIT_API.maxRequests),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    // Parse body
    const body = await request.json();
    const { text, voice, speed, provider } = body as {
      text?: string;
      voice?: string;
      speed?: number;
      provider?: 'elevenlabs' | 'openai';
    };

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 },
      );
    }

    // Limit text length (ElevenLabs max ~5000 chars, OpenAI max ~4096)
    if (text.length > 4000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 4000 characters.' },
        { status: 400 },
      );
    }

    // Generate speech
    const options: TtsOptions = { voice, speed, provider };
    const result = await generateSpeech(text, options);

    // Return audio as binary response
    return new NextResponse(new Uint8Array(result.audio) as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': result.audio.length.toString(),
        'X-TTS-Provider': result.provider,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    const message = error instanceof Error ? error.message : 'TTS generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
