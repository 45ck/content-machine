import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/visuals/matcher', () => ({
  matchVisuals: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
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

async function configureRuntime(update: { json: boolean; isTty?: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({
    json: update.json,
    isTty: update.isTty ?? false,
    verbose: false,
    offline: false,
    yes: false,
  });
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

describe('cli visuals command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json output', async () => {
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

    const { matchVisuals } = await import('../../../../src/visuals/matcher');
    (matchVisuals as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      scenes: [{ sceneId: 'scene-001', assetPath: 'a.mp4', source: 'user-footage' }],
      totalDuration: 1,
      fromStock: 0,
      fallbacks: 0,
      gameplayClip: null,
    });

    const { visualsCommand } = await import('../../../../src/cli/commands/visuals');
    await visualsCommand.parseAsync(['--input', 'timestamps.json'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('visuals');
    expect(payload.outputs.visualsPath).toBe('visuals.json');
  });

  it('writes output and summary in human mode', async () => {
    await configureRuntime({ json: false, isTty: false });
    const capture = await captureOutput();

    const { readInputFile, writeOutputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: 'audio-v1',
      scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 1, words: [] }],
      allWords: [],
      totalDuration: 1,
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });

    const { matchVisuals } = await import('../../../../src/visuals/matcher');
    (matchVisuals as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      scenes: [{ sceneId: 'scene-001', assetPath: 'a.mp4', source: 'user-footage' }],
      totalDuration: 1,
      fromStock: 0,
      fallbacks: 0,
      gameplayClip: null,
    });

    const { visualsCommand } = await import('../../../../src/cli/commands/visuals');
    await visualsCommand.parseAsync(['--input', 'timestamps.json'], { from: 'user' });

    await capture.reset();
    expect(writeOutputFile).toHaveBeenCalledWith('visuals.json', expect.any(Object));
    expect(capture.stdout.join('')).toContain('visuals.json');
  });
});
