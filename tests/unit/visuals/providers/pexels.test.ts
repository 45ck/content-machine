import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pexels', () => ({
  createClient: vi.fn(),
}));

vi.mock('../../../../src/core/config', () => ({
  getApiKey: vi.fn(() => 'key'),
}));

vi.mock('../../../../src/core/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('pexels api helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('searches and maps videos', async () => {
    const { createClient } = await import('pexels');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      videos: {
        search: vi.fn().mockResolvedValue({
          videos: [
            {
              id: 1,
              image: 'thumb',
              duration: 5,
              width: 100,
              height: 200,
              user: { name: 'user' },
              video_files: [
                { link: 'sd', quality: 'sd', height: 480 },
                { link: 'hd', quality: 'hd', height: 720 },
              ],
            },
          ],
        }),
      },
    });

    const { searchPexels } = await import('../../../../src/visuals/providers/pexels');
    const result = await searchPexels({ query: 'test' });
    expect(result[0].url).toBe('hd');
  });

  it('throws APIError when response has error', async () => {
    const { createClient } = await import('pexels');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      videos: {
        search: vi.fn().mockResolvedValue({ error: 'bad' }),
      },
    });

    const { searchPexels } = await import('../../../../src/visuals/providers/pexels');
    await expect(searchPexels({ query: 'test' })).rejects.toMatchObject({ code: 'API_ERROR' });
  });

  it('throws RateLimitError on 429 errors', async () => {
    const { createClient } = await import('pexels');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      videos: {
        search: vi.fn().mockRejectedValue(new Error('429 Too Many Requests')),
      },
    });

    const { searchPexels } = await import('../../../../src/visuals/providers/pexels');
    await expect(searchPexels({ query: 'test' })).rejects.toMatchObject({ code: 'RATE_LIMIT' });
  });

  it('fetches a video and uses fallback URLs', async () => {
    const { createClient } = await import('pexels');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      videos: {
        show: vi.fn().mockResolvedValue({
          id: 2,
          image: 'thumb',
          duration: 5,
          width: 100,
          height: 200,
          user: { name: 'user' },
          video_files: [
            { link: 'huge', quality: 'hd', height: 3000 },
            { link: 'reasonable', quality: 'sd', height: 1080 },
          ],
        }),
      },
    });

    const { getPexelsVideo } = await import('../../../../src/visuals/providers/pexels');
    const result = await getPexelsVideo(2);
    expect(result.url).toBe('reasonable');
  });
});
