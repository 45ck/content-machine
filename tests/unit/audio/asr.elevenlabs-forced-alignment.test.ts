import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('ASR (ElevenLabs forced alignment)', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ELEVENLABS_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.ELEVENLABS_API_KEY = originalKey;
  });

  it('calls the ElevenLabs forced alignment endpoint and returns word timings', async () => {
    let seenUrl: string | null = null;
    let seenHeaders: Record<string, string> | null = null;
    let seenBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      seenUrl = String(url);
      seenHeaders = init?.headers ?? null;
      seenBody = init?.body ?? null;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          loss: 0.01,
          words: [
            { text: 'Hello', start: 0.0, end: 0.2, loss: 0.001 },
            { text: 'world', start: 0.2, end: 0.6, loss: 0.001 },
          ],
        }),
      } as any;
    }) as any;

    const { transcribeAudio } = await import('../../../src/audio/asr');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-elevenlabs-asr-'));
    const audioPath = path.join(tmpDir, 'audio.mp3');
    fs.writeFileSync(audioPath, Buffer.from('not-real-audio'));
    const result = await transcribeAudio({
      engine: 'elevenlabs-forced-alignment',
      audioPath,
      originalText: 'Hello world',
      audioDuration: 1,
    });

    expect(seenUrl).toContain('/v1/forced-alignment');
    expect(seenHeaders?.['xi-api-key']).toBe('test-elevenlabs-key');
    expect(seenBody?.get?.('text')).toBe('Hello world');

    expect(result.engine).toBe('elevenlabs-forced-alignment');
    expect(result.words).toEqual([
      { word: 'Hello', start: 0.0, end: 0.2, confidence: 0.9 },
      { word: 'world', start: 0.2, end: 0.6, confidence: 0.9 },
    ]);
  });

  it('throws when ELEVENLABS_API_KEY is missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;

    const { transcribeAudio } = await import('../../../src/audio/asr');
    await expect(
      transcribeAudio({
        engine: 'elevenlabs-forced-alignment',
        audioPath: 'audio.mp3',
        originalText: 'Hello world',
        audioDuration: 1,
      })
    ).rejects.toMatchObject({ name: 'ConfigError' });
  });
});
