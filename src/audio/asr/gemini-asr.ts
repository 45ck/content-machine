/**
 * Gemini ASR - Audio transcription with word-level timestamps via Gemini API.
 *
 * Used as a fallback when whisper.cpp is unavailable, or as a primary engine
 * when `--asr-engine gemini` is specified. Requires GOOGLE_API_KEY or
 * GEMINI_API_KEY in environment.
 *
 * The model is prompted to return a strict JSON array of word timestamps.
 * Unlike pure estimation, this uses the actual audio signal so timing
 * reflects real speech patterns (pauses, pacing, emphasis).
 */

import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { getOptionalApiKey } from '../../core/config.js';
import { APIError, ConfigError, RateLimitError } from '../../core/errors.js';
import { withRetry } from '../../core/retry.js';
import type { WordTimestamp } from '../../domain/index.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_API_BASE = 'https://generativelanguage.googleapis.com';
const DEFAULT_API_VERSION = 'v1beta';
const DEFAULT_TIMEOUT_MS = 120_000;

const TRANSCRIPT_PROMPT = `Transcribe this audio clip and return word-level timestamps.

Return ONLY a valid JSON array. Each element must have exactly:
- "word": the spoken word (string, no extra spaces)
- "start": start time in seconds (number, 3 decimal places)
- "end": end time in seconds (number, 3 decimal places)

Rules:
- Include every spoken word in order
- Times must be accurate to the audio, not estimated
- Do not include punctuation as separate words (attach to the word before)
- Do not include any explanation or markdown — only the JSON array

Example format:
[{"word":"Hello","start":0.000,"end":0.320},{"word":"world.","start":0.380,"end":0.710}]`;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: { blockReason?: string };
};

function mimeTypeForAudio(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mp3';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.m4a') return 'audio/mp4';
  return 'audio/wav'; // default
}

function getGeminiApiKey(): string {
  const googleKey = getOptionalApiKey('GOOGLE_API_KEY');
  if (googleKey) return googleKey;
  const geminiKey = getOptionalApiKey('GEMINI_API_KEY');
  if (geminiKey) return geminiKey;
  throw new ConfigError(
    'GOOGLE_API_KEY (or GEMINI_API_KEY) not set. Required for Gemini ASR. ' +
      'Add it to your .env file or pass --asr-engine whisper to use whisper.cpp instead.'
  );
}

/**
 * Check if the Gemini API key is present (without throwing).
 */
export function isGeminiAsrAvailable(): boolean {
  return !!(getOptionalApiKey('GOOGLE_API_KEY') || getOptionalApiKey('GEMINI_API_KEY'));
}

/**
 * Transcribe audio using the Gemini multimodal API.
 *
 * Sends the audio file as inline base64 data alongside a structured prompt
 * asking for word-level timestamps. Works best for audio files under ~10MB.
 *
 * @returns Parsed word timestamps and total duration.
 */
export async function transcribeWithGemini(params: {
  audioPath: string;
  model?: string;
  apiBaseUrl?: string;
  apiVersion?: string;
  timeoutMs?: number;
}): Promise<{ words: WordTimestamp[]; duration: number; text: string }> {
  const {
    audioPath,
    model = DEFAULT_MODEL,
    apiBaseUrl = DEFAULT_API_BASE,
    apiVersion = DEFAULT_API_VERSION,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = params;

  const apiKey = getGeminiApiKey();
  const absPath = resolve(audioPath);
  const audioBytes = await readFile(absPath);
  const mimeType = mimeTypeForAudio(absPath);
  const base64Audio = audioBytes.toString('base64');

  const base = apiBaseUrl.replace(/\/+$/, '');
  const ver = apiVersion.replace(/^\/+|\/+$/g, '');
  const url = `${base}/${ver}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const raw = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: TRANSCRIPT_PROMPT }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      }).finally(() => clearTimeout(timeout));

      const text = await res.text();

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        throw new RateLimitError(
          'gemini',
          retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 10
        );
      }

      if (!res.ok) {
        let message = text.slice(0, 300);
        try {
          const parsed = JSON.parse(text) as { error?: { message?: string } };
          message = parsed?.error?.message ?? message;
        } catch {
          // use raw slice
        }
        throw new APIError(`Gemini ASR failed: ${message}`, {
          provider: 'gemini',
          status: res.status,
          model,
        });
      }

      return text;
    },
    { context: { provider: 'gemini', kind: 'asr' } }
  );

  let json: GeminiGenerateContentResponse;
  try {
    json = JSON.parse(raw) as GeminiGenerateContentResponse;
  } catch {
    throw new APIError('Gemini ASR returned non-JSON response', {
      provider: 'gemini',
      model,
      raw: raw.slice(0, 300),
    });
  }

  if (json.promptFeedback?.blockReason) {
    throw new APIError(`Gemini ASR prompt blocked: ${json.promptFeedback.blockReason}`, {
      provider: 'gemini',
      model,
    });
  }

  const responseText = json.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? '';

  return parseGeminiTranscriptResponse(responseText, model);
}

/**
 * Parse Gemini's text response into structured word timestamps.
 * Handles the JSON array format and cleans up common LLM artifacts.
 */
function parseGeminiTranscriptResponse(
  text: string,
  model: string
): { words: WordTimestamp[]; duration: number; text: string } {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Find the JSON array even if there's surrounding prose
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new APIError('Gemini ASR response did not contain a JSON array', {
      provider: 'gemini',
      model,
      responsePreview: text.slice(0, 300),
    });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(arrayMatch[0]);
  } catch {
    throw new APIError('Gemini ASR response JSON array is malformed', {
      provider: 'gemini',
      model,
      responsePreview: arrayMatch[0].slice(0, 300),
    });
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new APIError('Gemini ASR returned empty transcript', {
      provider: 'gemini',
      model,
    });
  }

  const words: WordTimestamp[] = [];
  for (const item of raw) {
    const w = item as Record<string, unknown>;
    const word = String(w.word ?? w.text ?? '').trim();
    const start = Number(w.start ?? w.start_time ?? w.startTime ?? 0);
    const end = Number(w.end ?? w.end_time ?? w.endTime ?? 0);
    if (!word || !isFinite(start) || !isFinite(end) || end < start) continue;
    words.push({ word, start: parseFloat(start.toFixed(3)), end: parseFloat(end.toFixed(3)) });
  }

  if (words.length === 0) {
    throw new APIError('Gemini ASR parsed zero valid word timestamps', {
      provider: 'gemini',
      model,
    });
  }

  const duration = words[words.length - 1].end;
  const fullText = words.map((w) => w.word).join(' ');
  return { words, duration, text: fullText };
}
