import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/render/captions/chunking', () => ({
  createCaptionChunks: vi.fn(),
  layoutToChunkingConfig: vi.fn((layout) => layout),
  resolveChunkingConfig: vi.fn((config) => ({ ...config, minOnScreenMs: 800 })),
  getRequiredMinDurationMs: vi.fn(() => 900),
}));

vi.mock('../../../src/render/captions/paging', () => ({
  filterCaptionWords: vi.fn((words) => words),
}));

describe('caption diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty report when no chunks exist', async () => {
    const { createCaptionChunks } = await import('../../../src/render/captions/chunking');
    (createCaptionChunks as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { analyzeCaptionChunks } = await import('../../../src/score/caption-diagnostics');
    const report = analyzeCaptionChunks([], {
      layout: { maxWordsPerPage: 4 },
      cleanup: {},
      wordsPerPage: 3,
    } as any);

    expect(report.totalChunks).toBe(0);
    expect(report.chunks).toEqual([]);
  });

  it('computes diagnostics for chunks', async () => {
    const { createCaptionChunks, getRequiredMinDurationMs } =
      await import('../../../src/render/captions/chunking');
    (createCaptionChunks as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        index: 0,
        text: 'Hello world',
        words: [{ word: 'Hello', startMs: 0, endMs: 400 }],
        charCount: 11,
        startMs: 0,
        endMs: 500,
      },
      {
        index: 1,
        text: 'Ok',
        words: [{ word: 'Ok', startMs: 500, endMs: 800 }],
        charCount: 2,
        startMs: 500,
        endMs: 900,
      },
    ]);
    (getRequiredMinDurationMs as unknown as ReturnType<typeof vi.fn>).mockReturnValue(300);

    const { analyzeCaptionChunks } = await import('../../../src/score/caption-diagnostics');
    const report = analyzeCaptionChunks(
      [
        { word: 'Hello', start: 0, end: 0.4 },
        { word: 'world', start: 0.4, end: 0.5 },
      ],
      {
        layout: { maxWordsPerPage: 4 },
        cleanup: {},
        wordsPerPage: 2,
      } as any
    );

    expect(report.totalChunks).toBe(2);
    expect(report.maxCps).toBeGreaterThan(0);
    expect(report.maxWpm).toBeGreaterThan(0);
    expect(report.fastChunkCount).toBe(0);
  });

  it('flags chunks shorter than required duration', async () => {
    const { createCaptionChunks, getRequiredMinDurationMs } =
      await import('../../../src/render/captions/chunking');
    (createCaptionChunks as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        index: 0,
        text: 'Fast',
        words: [{ word: 'Fast', startMs: 0, endMs: 50 }],
        charCount: 4,
        startMs: 0,
        endMs: 100,
      },
    ]);
    (getRequiredMinDurationMs as unknown as ReturnType<typeof vi.fn>).mockReturnValue(500);

    const { analyzeCaptionChunks } = await import('../../../src/score/caption-diagnostics');
    const report = analyzeCaptionChunks([{ word: 'Fast', start: 0, end: 0.1 }], {
      layout: { maxWordsPerPage: 4 },
      cleanup: {},
      wordsPerPage: 4,
    } as any);

    expect(report.fastChunkCount).toBe(1);
    expect(report.chunks[0].meetsMinDuration).toBe(false);
  });
});
