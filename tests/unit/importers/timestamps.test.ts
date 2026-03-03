import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/core/logger', () => ({
  createLogger: vi.fn(() => ({ warn: vi.fn() })),
}));

vi.mock('../../../src/audio/asr', () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock('../../../src/audio/asr/reconcile', () => ({
  reconcileToScript: vi.fn(),
}));

vi.mock('../../../src/audio/alignment', () => ({
  buildAlignmentUnits: vi.fn(),
  buildSceneTimestamps: vi.fn(),
  normalizeSpokenText: vi.fn((text: string) => text.trim()),
}));

vi.mock('../../../src/validate/ffprobe-audio', () => ({
  probeAudioWithFfprobe: vi.fn(),
}));

describe('timestamps importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates timestamps even when audio probe fails', async () => {
    const { probeAudioWithFfprobe } = await import('../../../src/validate/ffprobe-audio');
    (probeAudioWithFfprobe as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ffprobe missing')
    );

    const { buildAlignmentUnits, buildSceneTimestamps } =
      await import('../../../src/audio/alignment');
    (buildAlignmentUnits as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 'scene-001', text: 'Hello world' },
    ]);
    (buildSceneTimestamps as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        sceneId: 'scene-001',
        audioStart: 0,
        audioEnd: 2,
        words: [{ word: 'Hello', start: 0, end: 1 }],
      },
    ]);

    const { transcribeAudio } = await import('../../../src/audio/asr');
    (transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      words: [{ word: 'Hello', start: 0, end: 1 }],
      text: 'Hello',
      duration: 2,
      engine: 'estimated',
    });

    const { generateTimestamps } = await import('../../../src/importers/timestamps');
    const output = await generateTimestamps({
      audioPath: 'audio.wav',
      script: { title: 't', scenes: [], meta: { wordCount: 1 } },
    });

    expect(output.asrEngine).toBe('estimated');
    expect(output.scenes?.length).toBe(1);
  });

  it('reconciles words when requested and engine supports it', async () => {
    const { probeAudioWithFfprobe } = await import('../../../src/validate/ffprobe-audio');
    (probeAudioWithFfprobe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      durationSeconds: 2,
    });

    const { buildAlignmentUnits, buildSceneTimestamps } =
      await import('../../../src/audio/alignment');
    (buildAlignmentUnits as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 'scene-001', text: 'Hello world' },
    ]);
    (buildSceneTimestamps as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        sceneId: 'scene-001',
        audioStart: 0,
        audioEnd: 2,
        words: [{ word: 'Hi', start: 0, end: 1 }],
      },
    ]);

    const { transcribeAudio } = await import('../../../src/audio/asr');
    (transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      words: [{ word: 'Hello', start: 0, end: 1 }],
      text: 'Hello',
      duration: 2,
      engine: 'whisper',
    });

    const { reconcileToScript } = await import('../../../src/audio/asr/reconcile');
    (reconcileToScript as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { word: 'Hi', start: 0, end: 1 },
    ]);

    const { generateTimestamps } = await import('../../../src/importers/timestamps');
    const output = await generateTimestamps({
      audioPath: 'audio.wav',
      script: { title: 't', scenes: [], meta: { wordCount: 1 } },
      reconcile: true,
    });

    expect(output.allWords[0].word).toBe('Hi');
  });

  it('builds a fallback scene when script is missing', async () => {
    const { probeAudioWithFfprobe } = await import('../../../src/validate/ffprobe-audio');
    (probeAudioWithFfprobe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      durationSeconds: 1,
    });

    const { buildSceneTimestamps } = await import('../../../src/audio/alignment');
    (buildSceneTimestamps as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        sceneId: 'scene-001',
        audioStart: 0,
        audioEnd: 1,
        words: [{ word: 'Hi', start: 0, end: 1 }],
      },
    ]);

    const { transcribeAudio } = await import('../../../src/audio/asr');
    (transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      words: [{ word: 'Hi', start: 0, end: 1 }],
      text: '',
      duration: 1,
      engine: 'whisper',
    });

    const { generateTimestamps } = await import('../../../src/importers/timestamps');
    const output = await generateTimestamps({ audioPath: 'audio.wav' });

    expect(output.scenes?.[0].sceneId).toBe('scene-001');
    expect(output.allWords).toHaveLength(1);
  });
});
