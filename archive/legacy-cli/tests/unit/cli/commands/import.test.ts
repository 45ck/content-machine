import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
}));

vi.mock('../../../../src/importers/visuals', () => ({
  importVisualsFromClips: vi.fn(),
}));

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start() {
      return this;
    },
    succeed() {
      return this;
    },
    fail() {
      return this;
    },
  })),
}));

vi.mock('../../../../src/cli/ui', () => ({
  formatKeyValueRows: vi.fn((rows) => rows.map(([k, v]) => `${k}:${v}`)),
  writeSummaryCard: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput() {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stdout: string[] = [];
  const stderr: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 1) stdout.push(String(chunk));
    if (fd === 2) stderr.push(String(chunk));
  });
  return {
    stdout,
    stderr,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli import command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json output for visuals import', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: 'audio-v1',
      scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
      allWords: [],
      totalDuration: 1,
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });

    const { importVisualsFromClips } = await import('../../../../src/importers/visuals');
    (importVisualsFromClips as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      scenes: [{ sceneId: 'scene-001', assetPath: 'a.mp4', source: 'user-footage', duration: 1 }],
      totalAssets: 1,
    });

    const { importCommand } = await import('../../../../src/cli/commands/import');
    await importCommand.parseAsync(['visuals', '--timestamps', 't.json', '--clip', 'a.mp4'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('import:visuals');
    expect(payload.outputs.totalAssets).toBe(1);
  });

  it('handles invalid mode values', async () => {
    await configureRuntime({ json: false });
    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: 'audio-v1',
      scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
      allWords: [],
      totalDuration: 1,
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });

    const { importCommand } = await import('../../../../src/cli/commands/import');
    await expect(
      importCommand.parseAsync(
        ['visuals', '--timestamps', 't.json', '--clip', 'a.mp4', '--mode', 'bad'],
        { from: 'user' }
      )
    ).rejects.toThrow('handled');
  });

  it('resolves clip files from a directory input', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const dir = await mkdtemp(join(tmpdir(), 'cm-import-dir-'));
    const clipA = join(dir, 'a.mp4');
    const clipB = join(dir, 'b.mov');
    await writeFile(clipA, 'clip-a');
    await writeFile(clipB, 'clip-b');
    await writeFile(join(dir, 'ignore.txt'), 'not-a-video');

    try {
      const { readInputFile } = await import('../../../../src/cli/utils');
      (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        schemaVersion: 'audio-v1',
        scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
        allWords: [],
        totalDuration: 1,
        ttsEngine: 'external',
        asrEngine: 'whisper',
      });

      const { importVisualsFromClips } = await import('../../../../src/importers/visuals');
      (importVisualsFromClips as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        scenes: [{ sceneId: 'scene-001', assetPath: clipA, source: 'user-footage', duration: 1 }],
        totalAssets: 2,
      });

      const { importCommand } = await import('../../../../src/cli/commands/import');
      await importCommand.parseAsync(['visuals', '--timestamps', 't.json', '--clips', dir], {
        from: 'user',
      });

      expect(importVisualsFromClips).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'sequence',
          clips: expect.arrayContaining([clipA, clipB]),
        })
      );

      const payload = JSON.parse(capture.stdout.join(''));
      expect(payload.outputs.totalAssets).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await capture.reset();
    }
  });

  it('resolves clip files from a glob input', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const dir = await mkdtemp(join(tmpdir(), 'cm-import-glob-'));
    const nested = join(dir, 'nested');
    await mkdir(nested, { recursive: true });
    const clipA = join(dir, 'a.mp4');
    const clipB = join(nested, 'b.webm');
    await writeFile(clipA, 'clip-a');
    await writeFile(clipB, 'clip-b');
    await writeFile(join(nested, 'ignore.md'), 'not-a-video');

    try {
      const { readInputFile } = await import('../../../../src/cli/utils');
      (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        schemaVersion: 'audio-v1',
        scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
        allWords: [],
        totalDuration: 1,
        ttsEngine: 'external',
        asrEngine: 'whisper',
      });

      const { importVisualsFromClips } = await import('../../../../src/importers/visuals');
      (importVisualsFromClips as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        scenes: [{ sceneId: 'scene-001', assetPath: clipA, source: 'user-footage', duration: 1 }],
        totalAssets: 2,
      });

      const { importCommand } = await import('../../../../src/cli/commands/import');
      await importCommand.parseAsync(
        ['visuals', '--timestamps', 't.json', '--clips', join(dir, '**', '*.*')],
        { from: 'user' }
      );

      const importCall = (importVisualsFromClips as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as { clips?: string[] } | undefined;
      expect(importCall?.clips).toBeDefined();
      expect(importCall?.clips).toContain(clipB);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await capture.reset();
    }
  });

  it('handles invalid map JSON entries', async () => {
    await configureRuntime({ json: false });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        schemaVersion: 'audio-v1',
        scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
        allWords: [],
        totalDuration: 1,
        ttsEngine: 'external',
        asrEngine: 'whisper',
      })
      .mockResolvedValueOnce({
        'scene-001': 123,
      });

    const { importCommand } = await import('../../../../src/cli/commands/import');
    await expect(
      importCommand.parseAsync(
        [
          'visuals',
          '--timestamps',
          't.json',
          '--clip',
          'a.mp4',
          '--mode',
          'map',
          '--map',
          'm.json',
        ],
        { from: 'user' }
      )
    ).rejects.toThrow('handled');
  });
});
