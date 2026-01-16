import { describe, it, expect, vi, beforeEach } from 'vitest';

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
});
