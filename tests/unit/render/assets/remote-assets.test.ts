import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Writable } from 'stream';

vi.mock('fs', () => ({
  createWriteStream: vi.fn(
    () =>
      new Writable({
        write(_c, _e, cb) {
          cb();
        },
      })
  ),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn(() => Promise.resolve()),
}));

vi.mock('stream', async (importOriginal) => {
  const actual = await importOriginal<typeof import('stream')>();
  return {
    ...actual,
    Readable: {
      ...actual.Readable,
      fromWeb: vi.fn(() => actual.Readable.from([])),
    },
  };
});

describe('remote asset downloads', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { rm } = await import('fs/promises');
    (rm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('handles empty plans', async () => {
    const { downloadRemoteAssetsToCache } =
      await import('../../../../src/render/assets/remote-assets');
    const progress: number[] = [];
    const result = await downloadRemoteAssetsToCache({ assets: [] } as any, {
      cacheRoot: '/cache',
      onProgress: (e) => progress.push(e.progress),
    });

    expect(result.extraAssets).toEqual([]);
    expect(result.succeededUrls.size).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it('uses cached files when present', async () => {
    const { stat } = await import('fs/promises');
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFile: () => true,
      size: 10,
    });

    const { downloadRemoteAssetsToCache } =
      await import('../../../../src/render/assets/remote-assets');
    const result = await downloadRemoteAssetsToCache(
      {
        assets: [{ sourceUrl: 'http://x', bundlePath: 'a.mp4' }],
      } as any,
      { cacheRoot: '/cache' }
    );

    expect(result.succeededUrls.has('http://x')).toBe(true);
    expect(result.extraAssets[0].destPath).toBe('a.mp4');
  });

  it('downloads when cache is missing', async () => {
    const { stat, rename } = await import('fs/promises');
    (stat as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('missing'));

    global.fetch = vi.fn().mockResolvedValue(new Response('data')) as any;

    const warn = vi.fn();
    const { downloadRemoteAssetsToCache } =
      await import('../../../../src/render/assets/remote-assets');
    const result = await downloadRemoteAssetsToCache(
      {
        assets: [{ sourceUrl: 'http://x', bundlePath: 'a.mp4' }],
      } as any,
      { cacheRoot: '/cache', log: { debug: vi.fn(), info: vi.fn(), warn } }
    );

    expect(warn).not.toHaveBeenCalled();
    expect(result.succeededUrls.has('http://x')).toBe(true);
    expect(rename).toHaveBeenCalled();
  });

  it('skips assets when download fails', async () => {
    const { stat } = await import('fs/promises');
    (stat as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('missing'));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'err',
      body: null,
    }) as any;

    const { downloadRemoteAssetsToCache } =
      await import('../../../../src/render/assets/remote-assets');
    const result = await downloadRemoteAssetsToCache(
      {
        assets: [{ sourceUrl: 'http://x', bundlePath: 'a.mp4' }],
      } as any,
      { cacheRoot: '/cache' }
    );

    expect(result.succeededUrls.size).toBe(0);
    expect(result.extraAssets).toEqual([]);
  });
});
