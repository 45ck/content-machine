import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
  parseWhisperModel: vi.fn((value: string) => value),
}));

vi.mock('../../../../src/core/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../../src/core/assets/whisper', () => ({
  resolveWhisperDir: vi.fn(() => '/whisper'),
}));

vi.mock('../../../../src/core/assets/requirements', () => ({
  evaluateRequirements: vi.fn(),
  planWhisperRequirements: vi.fn(() => [
    { id: 'whisper:model:base', label: 'Whisper model', ok: true },
  ]),
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
    offline: Boolean(update.offline),
    isTty: false,
    verbose: false,
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

describe('cli assets command', () => {
  const prevAssetCacheDir = process.env.CM_ASSET_CACHE_DIR;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    if (prevAssetCacheDir === undefined) delete process.env.CM_ASSET_CACHE_DIR;
    else process.env.CM_ASSET_CACHE_DIR = prevAssetCacheDir;
  });

  it('prints paths in json mode', async () => {
    process.env.CM_ASSET_CACHE_DIR = '/cache';
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: { dir: '~/hooks' },
    });

    const { assetsCommand } = await import('../../../../src/cli/commands/assets');
    await assetsCommand.parseAsync(['paths'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('assets:paths');
    expect(payload.outputs.whisperDir).toBe('/whisper');
  });

  it('reports whisper status in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { evaluateRequirements } = await import('../../../../src/core/assets/requirements');
    (evaluateRequirements as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'whisper:model:base', label: 'Whisper model', ok: true },
    ]);

    const { assetsCommand } = await import('../../../../src/cli/commands/assets');
    await assetsCommand.parseAsync(['whisper', 'status', '--model', 'base'], {
      from: 'user',
    });

    await capture.reset();
    exitSpy.mockRestore();

    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('assets:whisper:status');
    expect(payload.outputs.ok).toBe(true);
  });

  it('prints whisper status in human mode when missing', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { evaluateRequirements } = await import('../../../../src/core/assets/requirements');
    (evaluateRequirements as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'whisper:model:base',
        label: 'Whisper model',
        ok: false,
        detail: '/missing',
        fix: 'Fix it',
      },
    ]);

    const { assetsCommand } = await import('../../../../src/cli/commands/assets');
    await assetsCommand.parseAsync(['whisper', 'status', '--model', 'base'], {
      from: 'user',
    });

    await capture.reset();
    exitSpy.mockRestore();

    const joined = capture.stderr.join('');
    expect(joined).toContain('Whisper: MISSING');
    expect(joined).toContain('Fix: Fix it');
  });

  it('fails install in offline mode', async () => {
    await configureRuntime({ json: false, offline: true });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { assetsCommand } = await import('../../../../src/cli/commands/assets');
    await expect(
      assetsCommand.parseAsync(['whisper', 'install'], { from: 'user' })
    ).rejects.toThrow('handled');
    expect(handleCommandError).toHaveBeenCalled();
  });

  it('installs whisper in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { assetsCommand } = await import('../../../../src/cli/commands/assets');
    await assetsCommand.parseAsync(['whisper', 'install', '--model', 'base'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('assets:whisper:install');
    expect(payload.outputs.ok).toBe(true);
  });
});
