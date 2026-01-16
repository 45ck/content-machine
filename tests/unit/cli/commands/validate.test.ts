import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start: function () {
      return this;
    },
    succeed: function () {
      return this;
    },
    fail: function () {
      return this;
    },
    stop: function () {
      return this;
    },
  })),
}));

vi.mock('../../../../src/validate/validate', () => ({
  validateVideoPath: vi.fn(),
}));

vi.mock('../../../../src/validate/quality', () => ({
  PiqBrisqueAnalyzer: class {
    constructor() {
      return undefined;
    }
  },
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

const baseReport = {
  videoPath: 'video.mp4',
  profile: 'portrait',
  passed: true,
  summary: {
    width: 1080,
    height: 1920,
    durationSeconds: 1.5,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
  },
  gates: [
    {
      gateId: 'resolution',
      passed: true,
      message: 'OK',
      fix: 'None',
    },
  ],
};

describe('cli validate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope and exits 0 when report passes', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { validateVideoPath } = await import('../../../../src/validate/validate');
    (validateVideoPath as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseReport);

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { validateCommand } = await import('../../../../src/cli/commands/validate');
    await validateCommand.parseAsync(['video.mp4', '--output', 'validate.json'], { from: 'user' });

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.outputs.passed).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('writes report json when --report-json is set', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { validateVideoPath } = await import('../../../../src/validate/validate');
    (validateVideoPath as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseReport,
      passed: false,
    });

    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { validateCommand } = await import('../../../../src/cli/commands/validate');
    await validateCommand.parseAsync(['video.mp4', '--report-json'], { from: 'user' });

    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"videoPath"'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('prints failed gates in human mode', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { validateVideoPath } = await import('../../../../src/validate/validate');
    (validateVideoPath as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseReport,
      passed: false,
      gates: [
        {
          gateId: 'cadence',
          passed: false,
          message: 'Too many cuts',
          fix: 'Increase cadence threshold',
        },
      ],
    });

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);
    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { validateCommand } = await import('../../../../src/cli/commands/validate');
    await validateCommand.parseAsync(['video.mp4', '--output', 'report.json'], { from: 'user' });

    expect(stderrSpy).toHaveBeenCalledWith('- cadence: Too many cuts');
    expect(stderrSpy).toHaveBeenCalledWith('  Fix: Increase cadence threshold');
    expect(stdoutSpy).toHaveBeenCalledWith('report.json');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('rejects invalid profile', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { validateCommand } = await import('../../../../src/cli/commands/validate');
    await expect(
      validateCommand.parseAsync(['video.mp4', '--profile', 'square'], { from: 'user' })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('rejects invalid cadence engine', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { validateCommand } = await import('../../../../src/cli/commands/validate');
    await expect(
      validateCommand.parseAsync(['video.mp4', '--cadence', '--cadence-engine', 'nope'], {
        from: 'user',
      })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('normalizes pyscenedetect cadence threshold', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { validateVideoPath } = await import('../../../../src/validate/validate');
    (validateVideoPath as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseReport);

    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { validateCommand } = await import('../../../../src/cli/commands/validate');
    await validateCommand.parseAsync(
      ['video.mp4', '--cadence', '--cadence-engine', 'pyscenedetect', '--cadence-threshold', '0.5'],
      { from: 'user' }
    );

    expect(validateVideoPath).toHaveBeenCalledWith(
      'video.mp4',
      expect.objectContaining({
        cadence: expect.objectContaining({ threshold: 50 }),
      })
    );
    expect(stdoutSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
  });
});
