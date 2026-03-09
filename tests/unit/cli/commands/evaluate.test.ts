import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/evaluate/evaluator', () => ({
  evaluateVideo: vi.fn(),
}));

vi.mock('../../../../src/evaluate/batch', () => ({
  evaluateBatch: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: Error) => {
    throw error;
  }),
}));

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start() {
      return this;
    },
    stop() {
      return this;
    },
    fail() {
      return this;
    },
  })),
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

describe('cli evaluate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('prints check fixes in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { evaluateVideo } = await import('../../../../src/evaluate/evaluator');
    (evaluateVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      videoPath: 'video.mp4',
      passed: false,
      checks: [
        {
          checkId: 'rate',
          passed: false,
          skipped: false,
          error: 'Whisper runtime is not installed',
          fix: 'Run: cm setup whisper --model base',
          summary: 'Error: Whisper runtime is not installed',
          durationMs: 5,
        },
      ],
      thresholds: { validateProfile: 'portrait' },
      totalDurationMs: 5,
      createdAt: new Date().toISOString(),
    });

    const { evaluateCommand } = await import('../../../../src/cli/commands/evaluate');
    await evaluateCommand.parseAsync(['--input', 'video.mp4', '--output', 'evaluate.json'], {
      from: 'user',
    });

    await capture.reset();
    exitSpy.mockRestore();

    expect(capture.stderr.join('')).toContain('Fix: Run: cm setup whisper --model base');
    expect(capture.stdout.join('')).toContain('evaluate.json');
  });
});
