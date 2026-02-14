import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { APIError } from '../../core/errors';
import { getApiKey } from '../../core/config';
import type { WordTimestamp } from '../../domain';

type ElevenLabsForcedAlignmentResponse = {
  loss?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    loss?: number;
  }>;
};

/**
 * Align an audio file to a known transcript using ElevenLabs Forced Alignment.
 */
export async function transcribeWithElevenLabsForcedAlignment(params: {
  audioPath: string;
  transcriptText: string;
  apiBaseUrl?: string;
}): Promise<{ words: WordTimestamp[]; duration: number }> {
  const apiKey = getApiKey('ELEVENLABS_API_KEY');
  const apiBaseUrl = params.apiBaseUrl ?? 'https://api.elevenlabs.io';

  const absAudioPath = resolve(params.audioPath);
  const audioBuf = await readFile(absAudioPath);

  // Use Blob to avoid relying on the File global (not present in all Node test envs).
  const blob = new Blob([audioBuf]);
  const form = new FormData();
  form.append('file', blob, basename(absAudioPath));
  form.set('text', params.transcriptText);

  const res = await fetch(`${apiBaseUrl.replace(/\/+$/u, '')}/v1/forced-alignment`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new APIError(
      `ElevenLabs forced alignment failed: ${res.status} ${res.statusText} ${errText}`,
      { engine: 'elevenlabs-forced-alignment' }
    );
  }

  const json = (await res.json()) as ElevenLabsForcedAlignmentResponse;
  const rawWords = json.words ?? [];
  if (!Array.isArray(rawWords) || rawWords.length === 0) {
    throw new APIError(`ElevenLabs forced alignment returned no words`, {
      engine: 'elevenlabs-forced-alignment',
    });
  }

  const words: WordTimestamp[] = rawWords.map((w) => ({
    word: w.text,
    start: w.start,
    end: w.end,
    confidence: 0.9,
  }));
  const duration = words.reduce((max, w) => Math.max(max, w.end), 0);

  return { words, duration };
}
