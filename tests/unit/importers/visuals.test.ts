import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CMError } from '../../../src/core/errors';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

describe('visuals importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds visuals with sequence mode', async () => {
    const { existsSync, statSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isFile: () => true,
      size: 10000,
    });

    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    const output = importVisualsFromClips({
      timestamps: {
        schemaVersion: 'audio-v1',
        scenes: [
          { sceneId: 'scene-001', audioStart: 0, audioEnd: 2, words: [] },
          { sceneId: 'scene-002', audioStart: 2, audioEnd: 4, words: [] },
        ],
        allWords: [],
        totalDuration: 4,
        ttsEngine: 'external',
        asrEngine: 'whisper',
      },
      clips: ['a.mp4'],
      mode: 'sequence',
    });

    expect(output.scenes).toHaveLength(2);
    expect(output.totalAssets).toBe(2);
  });

  it('loops clips when in loop mode', async () => {
    const { existsSync, statSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isFile: () => true,
      size: 10000,
    });

    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    const output = importVisualsFromClips({
      timestamps: {
        schemaVersion: 'audio-v1',
        scenes: [
          { sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] },
          { sceneId: 'scene-002', audioStart: 1, audioEnd: 2, words: [] },
        ],
        allWords: [],
        totalDuration: 2,
        ttsEngine: 'external',
        asrEngine: 'whisper',
      },
      clips: ['a.mp4'],
      mode: 'loop',
    });

    expect(output.scenes[1].assetPath).toContain('a.mp4');
  });

  it('maps clips when in map mode', async () => {
    const { existsSync, statSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isFile: () => true,
      size: 10000,
    });

    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    const output = importVisualsFromClips({
      timestamps: {
        schemaVersion: 'audio-v1',
        scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
        allWords: [],
        totalDuration: 1,
        ttsEngine: 'external',
        asrEngine: 'whisper',
      },
      clips: [],
      mode: 'map',
      sceneMap: { 'scene-001': 'a.mp4' },
    });

    expect(output.scenes[0].assetPath).toContain('a.mp4');
  });

  it('throws when map mode has missing mappings', async () => {
    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    expect(() =>
      importVisualsFromClips({
        timestamps: {
          schemaVersion: 'audio-v1',
          scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
          allWords: [],
          totalDuration: 1,
          ttsEngine: 'external',
          asrEngine: 'whisper',
        },
        clips: [],
        mode: 'map',
        sceneMap: {},
      })
    ).toThrow(CMError);
  });

  it('throws when clip paths are invalid', async () => {
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    expect(() =>
      importVisualsFromClips({
        timestamps: {
          schemaVersion: 'audio-v1',
          scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
          allWords: [],
          totalDuration: 1,
          ttsEngine: 'external',
          asrEngine: 'whisper',
        },
        clips: ['missing.mp4'],
      })
    ).toThrow(CMError);
  });

  it('throws when clip is too small', async () => {
    const { existsSync, statSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isFile: () => true,
      size: 1,
    });

    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    expect(() =>
      importVisualsFromClips({
        timestamps: {
          schemaVersion: 'audio-v1',
          scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
          allWords: [],
          totalDuration: 1,
          ttsEngine: 'external',
          asrEngine: 'whisper',
        },
        clips: ['tiny.mp4'],
      })
    ).toThrow(CMError);
  });

  it('throws when scene duration is not positive', async () => {
    const { existsSync, statSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isFile: () => true,
      size: 10000,
    });

    const { importVisualsFromClips } = await import('../../../src/importers/visuals');
    expect(() =>
      importVisualsFromClips({
        timestamps: {
          schemaVersion: 'audio-v1',
          scenes: [{ sceneId: 'scene-001', audioStart: 1, audioEnd: 1, words: [] }],
          allWords: [],
          totalDuration: 1,
          ttsEngine: 'external',
          asrEngine: 'whisper',
        },
        clips: ['a.mp4'],
      })
    ).toThrow(CMError);
  });
});
