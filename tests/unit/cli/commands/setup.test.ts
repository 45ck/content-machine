import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
  parseWhisperModel: vi.fn((value: unknown) => String(value ?? 'base')),
}));

vi.mock('@remotion/install-whisper-cpp', () => ({
  downloadWhisperModel: vi.fn(),
  installWhisperCpp: vi.fn(),
}));

async function configureRuntime(update: { json: boolean; offline?: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({
    json: update.json,
    isTty: false,
    verbose: false,
    offline: update.offline ?? false,
    yes: false,
  });
}

describe('cli setup command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('downloads whisper and emits json envelope', async () => {
    await configureRuntime({ json: true });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { setupCommand } = await import('../../../../src/cli/commands/setup');
    await setupCommand.parseAsync(
      ['whisper', '--model', 'large', '--dir', '~/whisper', '--version', '1.5.5'],
      { from: 'user' }
    );

    const { downloadWhisperModel, installWhisperCpp } =
      await import('@remotion/install-whisper-cpp');

    expect(downloadWhisperModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'large-v3' })
    );
    expect(installWhisperCpp).toHaveBeenCalledWith(expect.objectContaining({ version: '1.5.5' }));

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload.command).toBe('setup:whisper');
    expect(payload.outputs.ok).toBe(true);
  });

  it('prints human output and returns install directory', async () => {
    await configureRuntime({ json: false });

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);
    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { setupCommand } = await import('../../../../src/cli/commands/setup');
    await setupCommand.parseAsync(['whisper', '--dir', '~/whisper'], { from: 'user' });

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Whisper setup complete'));
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('rejects offline mode', async () => {
    await configureRuntime({ json: false, offline: true });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { setupCommand } = await import('../../../../src/cli/commands/setup');
    await expect(setupCommand.parseAsync(['whisper'], { from: 'user' })).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('rejects invalid model', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError, parseWhisperModel } = await import('../../../../src/cli/utils');

    (parseWhisperModel as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('bad-model');
    });

    const { setupCommand } = await import('../../../../src/cli/commands/setup');
    await expect(
      setupCommand.parseAsync(['whisper', '--model', 'nope'], { from: 'user' })
    ).rejects.toThrow('bad-model');

    expect(handleCommandError).toHaveBeenCalled();
  });
});
