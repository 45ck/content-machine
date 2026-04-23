import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../../../src/media/service', () => ({
  synthesizeMediaManifest: vi.fn(),
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

describe('cli media command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json output', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.1.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'fallback-color',
          assetPath: '#000000',
          duration: 1,
          assetType: 'video',
          motionStrategy: 'none',
          motionApplied: false,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
      totalDuration: 1,
    });

    const { synthesizeMediaManifest } = await import('../../../../src/media/service');
    (synthesizeMediaManifest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      generatedAt: '2026-02-12T00:00:00.000Z',
      totalScenes: 0,
      keyframesExtracted: 0,
      videosSynthesized: 0,
      scenes: [],
    });

    const { mediaCommand } = await import('../../../../src/cli/commands/media');
    await mediaCommand.parseAsync(['--input', 'visuals.json'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('media');
    expect(payload.outputs.mediaManifestPath).toBe('media-manifest.json');
  });
});
