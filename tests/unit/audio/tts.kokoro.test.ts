import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

class FakeRawAudio {
  audio: Float32Array;
  sampling_rate: number;
  constructor(audio: Float32Array, samplingRate: number) {
    this.audio = audio;
    this.sampling_rate = samplingRate;
  }
  async save(outPath: string) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from('fake-audio'));
  }
}

vi.mock('@huggingface/transformers', () => ({
  RawAudio: FakeRawAudio,
}));

const generateMock = vi.fn(async () => new FakeRawAudio(new Float32Array(24000), 24000));
const streamMock = vi.fn(async function* () {
  yield { audio: new FakeRawAudio(new Float32Array(12000), 24000) };
  yield { audio: new FakeRawAudio(new Float32Array(12000), 24000) };
});

vi.mock('kokoro-js', () => ({
  KokoroTTS: {
    from_pretrained: vi.fn(async () => ({
      generate: generateMock,
      stream: streamMock,
    })),
  },
  TextSplitterStream: class {
    push() {}
    close() {}
  },
}));

describe('Kokoro TTS adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('synthesizes short text with generate() and writes output', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-kokoro-'));
    const outPath = path.join(tmpDir, 'audio.wav');

    const { synthesizeSpeechKokoro } = await import('../../../src/audio/tts/kokoro');
    const result = await synthesizeSpeechKokoro({
      engine: 'kokoro',
      text: 'hello world',
      voice: 'af_heart',
      outputPath: outPath,
      speed: 1,
    });

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(streamMock).toHaveBeenCalledTimes(0);
    expect(result.audioPath).toBe(outPath);
    expect(result.duration).toBeGreaterThan(0);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('synthesizes long text with stream() chunking', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-kokoro-'));
    const outPath = path.join(tmpDir, 'audio.wav');

    const { synthesizeSpeechKokoro } = await import('../../../src/audio/tts/kokoro');
    const longText = 'a'.repeat(600);
    const result = await synthesizeSpeechKokoro({
      engine: 'kokoro',
      text: longText,
      voice: 'af_heart',
      outputPath: outPath,
      speed: 1,
    });

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(result.audioPath).toBe(outPath);
    expect(result.duration).toBeGreaterThan(0);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('returns a list of known voices', async () => {
    const { getAvailableVoicesKokoro } = await import('../../../src/audio/tts/kokoro');
    const voices = await getAvailableVoicesKokoro();
    expect(voices).toContain('af_heart');
  });
});
