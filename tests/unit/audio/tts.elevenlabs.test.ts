import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Mock exec-based ffmpeg/ffprobe calls used by the ElevenLabs adapter.
vi.mock('node:child_process', () => {
  return {
    exec: vi.fn((cmd: string, _opts: any, cb: any) => {
      // Support exec(cmd, cb) and exec(cmd, opts, cb)
      const callback = typeof _opts === 'function' ? _opts : cb;
      const command = String(cmd);

      if (command.includes('ffprobe') && command.includes('format=duration')) {
        callback(null, { stdout: '1.234\n', stderr: '' });
        return {} as any;
      }

      if (command.includes('ffprobe') && command.includes('stream=sample_rate')) {
        callback(null, { stdout: '44100\n', stderr: '' });
        return {} as any;
      }

      if (command.startsWith('ffmpeg ')) {
        // Best-effort: create the output file path from the last quoted string.
        const m = command.match(/"([^"]+)"\s*$/u);
        if (m?.[1]) {
          fs.mkdirSync(path.dirname(m[1]), { recursive: true });
          fs.writeFileSync(m[1], Buffer.from('fake-wav'));
        }
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      }

      callback(null, { stdout: '', stderr: '' });
      return {} as any;
    }),
  };
});

describe('ElevenLabs TTS adapter', () => {
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

  it('streams audio to disk and returns probed metadata (mp3 output)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-elevenlabs-tts-'));
    const outPath = path.join(tmpDir, 'voice.mp3');

    globalThis.fetch = (async (_url: any, _init: any) => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        },
      });
      return { ok: true, status: 200, statusText: 'OK', body, headers: new Headers() } as any;
    }) as any;

    const { synthesizeSpeechElevenLabs } = await import('../../../src/audio/tts/elevenlabs');
    const result = await synthesizeSpeechElevenLabs({
      engine: 'elevenlabs',
      text: 'hello',
      voice: 'voice-id',
      outputPath: outPath,
      elevenlabs: { outputFormat: 'mp3_44100_128' },
    });

    expect(result.audioPath).toBe(outPath);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.sampleRate).toBe(44100);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('transcodes to wav when outputPath is .wav', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-elevenlabs-tts-'));
    const outPath = path.join(tmpDir, 'voice.wav');

    globalThis.fetch = (async (_url: any, _init: any) => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        },
      });
      return { ok: true, status: 200, statusText: 'OK', body, headers: new Headers() } as any;
    }) as any;

    const { synthesizeSpeechElevenLabs } = await import('../../../src/audio/tts/elevenlabs');
    const result = await synthesizeSpeechElevenLabs({
      engine: 'elevenlabs',
      text: 'hello',
      voice: 'voice-id',
      outputPath: outPath,
    });

    expect(result.audioPath).toBe(outPath);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.sampleRate).toBe(44100);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('retries on 429 using retry-after (0) and succeeds on the next attempt', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-elevenlabs-tts-'));
    const outPath = path.join(tmpDir, 'voice.mp3');

    let calls = 0;
    globalThis.fetch = (async (_url: any, _init: any) => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'retry-after': '0' }),
          text: async () => 'rate limited',
          body: null,
        } as any;
      }
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        },
      });
      return { ok: true, status: 200, statusText: 'OK', body, headers: new Headers() } as any;
    }) as any;

    const { synthesizeSpeechElevenLabs } = await import('../../../src/audio/tts/elevenlabs');
    const result = await synthesizeSpeechElevenLabs({
      engine: 'elevenlabs',
      text: 'hello',
      voice: 'voice-id',
      outputPath: outPath,
    });

    expect(calls).toBe(2);
    expect(result.audioPath).toBe(outPath);
  });
});
