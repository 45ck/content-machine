import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundError } from '../../../src/core/errors';

vi.mock('../../../src/core/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/hooks/resolve', () => ({
  resolveHookSelection: vi.fn(),
}));

vi.mock('../../../src/core/logger', () => ({
  createLogger: vi.fn(() => ({ warn: vi.fn() })),
}));

async function configureRuntime(
  update: Partial<{ json: boolean; offline: boolean; yes: boolean }>
) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: false, isTty: false, ...update });
}

describe('cli hooks', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await configureRuntime({});
  });

  it('returns null and clears hook when cli hook is disabled', async () => {
    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'none',
        trimDuration: undefined,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    const options: { hook?: unknown } = { hook: 'none' };
    const result = await resolveHookFromCli(options);

    expect(result).toBeNull();
    expect(options.hook).toBeUndefined();
  });

  it('throws for invalid hook audio/fit values', async () => {
    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'no-crunch',
        trimDuration: undefined,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    await expect(resolveHookFromCli({ hook: 'abc', hookAudio: 'bad' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    await expect(resolveHookFromCli({ hook: 'abc', hookFit: 'weird' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('sets hookTrim from config defaults when absent', async () => {
    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'clip-1',
        trimDuration: 1.5,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookSelection } = await import('../../../src/hooks/resolve');
    (resolveHookSelection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/hooks/clip.mp4',
      duration: 2,
      mute: false,
      fit: 'cover',
    });

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    const options: { hookTrim?: unknown } = {};
    const result = await resolveHookFromCli(options);

    expect(result).not.toBeNull();
    expect(options.hookTrim).toBe('1.5');
  });

  it('suppresses NotFoundError for default hooks', async () => {
    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'missing-hook',
        trimDuration: 2,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookSelection } = await import('../../../src/hooks/resolve');
    (resolveHookSelection as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Missing', { fix: 'download' })
    );

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    const options: { hookTrim?: unknown } = {};
    const result = await resolveHookFromCli(options);

    expect(result).toBeNull();
    expect(options.hookTrim).toBeUndefined();
  });

  it('rethrows NotFoundError when hook is explicitly provided', async () => {
    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'clip-1',
        trimDuration: undefined,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookSelection } = await import('../../../src/hooks/resolve');
    (resolveHookSelection as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Missing')
    );

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    await expect(resolveHookFromCli({ hook: 'missing' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('honors offline mode when deciding to download hooks', async () => {
    await configureRuntime({ offline: true, yes: true });

    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'clip-1',
        trimDuration: undefined,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookSelection } = await import('../../../src/hooks/resolve');
    (resolveHookSelection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/hooks/clip.mp4',
      duration: 2,
      mute: false,
      fit: 'cover',
    });

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    await resolveHookFromCli({ hook: 'clip-1', downloadHook: true });

    expect(resolveHookSelection).toHaveBeenCalledWith(
      expect.objectContaining({ downloadMissing: false })
    );
  });

  it('ignores non-positive hook trim values', async () => {
    const { loadConfig } = await import('../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      hooks: {
        defaultHook: 'clip-1',
        trimDuration: undefined,
        audio: 'keep',
        fit: 'cover',
        dir: '/hooks',
        library: 'lib',
        maxDuration: 3,
      },
    });

    const { resolveHookSelection } = await import('../../../src/hooks/resolve');
    (resolveHookSelection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/hooks/clip.mp4',
      duration: 2,
      mute: false,
      fit: 'cover',
    });

    const { resolveHookFromCli } = await import('../../../src/cli/hooks');
    await resolveHookFromCli({ hook: 'clip-1', hookTrim: -1 });
    expect(resolveHookSelection).toHaveBeenCalledWith(
      expect.objectContaining({ trimDurationSeconds: undefined })
    );
  });
});
