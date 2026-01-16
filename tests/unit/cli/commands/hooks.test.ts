import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
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

vi.mock('../../../../src/core/config', () => ({
  loadConfig: vi.fn(() => ({
    hooks: { library: 'transitionalhooks', dir: '~/.cm/assets/hooks' },
  })),
}));

vi.mock('../../../../src/hooks/download', () => ({
  downloadHookClip: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
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

describe('cli hooks command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('lists hooks as json', async () => {
    await configureRuntime({ json: true });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { hooksCommand } = await import('../../../../src/cli/commands/hooks');
    await hooksCommand.parseAsync(['list'], { from: 'user' });

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.command).toBe('hooks:list');
    expect(payload.outputs.hooks.length).toBeGreaterThan(0);
  });

  it('lists hooks in human mode', async () => {
    await configureRuntime({ json: false });

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);

    const { hooksCommand } = await import('../../../../src/cli/commands/hooks');
    await hooksCommand.parseAsync(['list'], { from: 'user' });

    expect(stderrSpy).toHaveBeenCalled();
  });

  it('downloads hook clip and emits json envelope', async () => {
    await configureRuntime({ json: true });

    const { downloadHookClip } = await import('../../../../src/hooks/download');
    (downloadHookClip as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      downloaded: true,
      path: '/tmp/hook.mp4',
    });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { hooksCommand } = await import('../../../../src/cli/commands/hooks');
    await hooksCommand.parseAsync(['download', 'no-crunch'], { from: 'user' });

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload.command).toBe('hooks:download');
    expect(payload.outputs.downloaded).toBe(true);
  });

  it('prints warning when download path missing', async () => {
    await configureRuntime({ json: false });

    const { downloadHookClip } = await import('../../../../src/hooks/download');
    (downloadHookClip as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      downloaded: false,
      path: '/tmp/missing.mp4',
    });

    const fs = await import('node:fs');
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);
    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { hooksCommand } = await import('../../../../src/cli/commands/hooks');
    await hooksCommand.parseAsync(['download', 'no-crunch'], { from: 'user' });

    expect(stderrSpy).toHaveBeenCalledWith(
      'Warning: download completed but file not found on disk'
    );
    expect(stdoutSpy).toHaveBeenCalledWith('/tmp/missing.mp4');
  });

  it('rejects unknown hook library', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { hooksCommand } = await import('../../../../src/cli/commands/hooks');
    await expect(
      hooksCommand.parseAsync(['list', '--library', 'nope'], { from: 'user' })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });
});
