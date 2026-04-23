import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock('../../../../src/cli/utils', () => ({
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: Error) => {
    if (error && error.message === 'exit') return;
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

vi.mock('../../../../src/score/sync-rater', () => ({
  rateSyncQuality: vi.fn(),
  formatSyncRatingCLI: vi.fn(() => 'report'),
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

describe('cli rate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json output when requested', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    const { rateSyncQuality } = await import('../../../../src/score/sync-rater');
    (rateSyncQuality as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rating: 80,
      ratingLabel: 'Good',
      passed: true,
      errors: [],
      metrics: { meanDriftMs: 10, maxDriftMs: 20, matchRatio: 0.9 },
    });

    const { rateCommand } = await import('../../../../src/cli/commands/rate');
    await rateCommand.parseAsync(['--input', 'video.mp4', '--mock'], { from: 'user' });

    await capture.reset();
    exitSpy.mockRestore();

    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('rate');
    expect(payload.outputs.rating).toBe(80);
  });

  it('prints summary output in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { rateSyncQuality } = await import('../../../../src/score/sync-rater');
    (rateSyncQuality as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rating: 80,
      ratingLabel: 'Good',
      passed: true,
      errors: [],
      metrics: { meanDriftMs: 10, maxDriftMs: 20, matchRatio: 0.9 },
    });

    const { rateCommand } = await import('../../../../src/cli/commands/rate');
    await rateCommand.parseAsync(['--input', 'video.mp4', '--summary', '--mock'], { from: 'user' });

    await capture.reset();
    exitSpy.mockRestore();

    expect(capture.stderr.join('')).toContain('Sync rating:');
    expect(capture.stdout.join('')).toContain('sync-report.json');
  });
});
