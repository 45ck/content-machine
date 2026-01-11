import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { resolveHookSelection } from './resolve';
import { TRANSITIONAL_HOOKS } from './libraries/transitionalhooks';

vi.mock('../validate/ffprobe', () => ({
  probeVideoWithFfprobe: vi.fn(async () => {
    throw new Error('ffprobe unavailable');
  }),
}));

describe('resolveHookSelection', () => {
  const tempRoot = join(process.cwd(), 'tests', '.tmp', 'hooks');

  beforeEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('resolves a local hook path with an explicit duration', async () => {
    const hookPath = join(tempRoot, 'local-hook.mp4');
    writeFileSync(hookPath, 'stub');

    const hook = await resolveHookSelection({
      hook: hookPath,
      durationSeconds: 1.4,
    });

    expect(hook).toBeTruthy();
    expect(hook?.path).toBe(resolve(hookPath));
    expect(hook?.duration).toBe(1.4);
    expect(hook?.source).toBe('file');
  });

  it('trims hook duration when trimDurationSeconds is provided', async () => {
    const hookPath = join(tempRoot, 'trim-hook.mp4');
    writeFileSync(hookPath, 'stub');

    const hook = await resolveHookSelection({
      hook: hookPath,
      durationSeconds: 5,
      trimDurationSeconds: 2,
    });

    expect(hook).toBeTruthy();
    expect(hook?.duration).toBe(2);
  });

  it('uses trimDurationSeconds when duration probing fails', async () => {
    const hookPath = join(tempRoot, 'trim-fallback.mp4');
    writeFileSync(hookPath, 'stub');

    const hook = await resolveHookSelection({
      hook: hookPath,
      trimDurationSeconds: 2.5,
    });

    expect(hook).toBeTruthy();
    expect(hook?.duration).toBe(2.5);
  });

  it('resolves a library hook id to the configured hooks dir', async () => {
    const entry = TRANSITIONAL_HOOKS[0];
    const libraryDir = join(tempRoot, 'transitionalhooks');
    mkdirSync(libraryDir, { recursive: true });
    const hookPath = join(libraryDir, entry.filename);
    writeFileSync(hookPath, 'stub');

    const hook = await resolveHookSelection({
      hook: entry.id,
      library: 'transitionalhooks',
      hooksDir: tempRoot,
      durationSeconds: 1.1,
    });

    expect(hook).toBeTruthy();
    expect(hook?.path).toBe(resolve(hookPath));
    expect(hook?.id).toBe(entry.id);
    expect(hook?.source).toBe('library');
  });

  it('throws when a library hook file is missing', async () => {
    const entry = TRANSITIONAL_HOOKS[0];

    await expect(
      resolveHookSelection({
        hook: entry.id,
        library: 'transitionalhooks',
        hooksDir: tempRoot,
        durationSeconds: 1.1,
      })
    ).rejects.toThrow('Hook file not found');
  });

  it('downloads a missing library hook when downloadMissing is true', async () => {
    const entry = TRANSITIONAL_HOOKS[0];

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('stub', { status: 200 }))
    );

    try {
      const hook = await resolveHookSelection({
        hook: entry.id,
        library: 'transitionalhooks',
        hooksDir: tempRoot,
        downloadMissing: true,
        durationSeconds: 1.1,
      });

      expect(hook).toBeTruthy();
      expect(hook?.id).toBe(entry.id);
      expect(hook?.source).toBe('library');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
