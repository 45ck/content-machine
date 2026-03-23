/**
 * @file Unit tests for Pixabay API wrapper
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchPixabay, getPixabayVideo, getBestVideoUrl, buildSearchUrl } from './pixabay.js';
import { RateLimitError, APIError, NotFoundError } from '../../core/errors.js';

const MOCK_HIT = {
  id: 12345,
  duration: 15,
  tags: 'nature, forest, trees',
  videos: {
    large: {
      url: 'https://pixabay.com/large.mp4',
      width: 1920,
      height: 1080,
      size: 5000000,
      thumbnail: 'https://i.vimeocdn.com/large.jpg',
    },
    medium: {
      url: 'https://pixabay.com/medium.mp4',
      width: 1280,
      height: 720,
      size: 2500000,
      thumbnail: 'https://i.vimeocdn.com/medium.jpg',
    },
    small: {
      url: 'https://pixabay.com/small.mp4',
      width: 960,
      height: 540,
      size: 1200000,
      thumbnail: 'https://i.vimeocdn.com/small.jpg',
    },
    tiny: {
      url: 'https://pixabay.com/tiny.mp4',
      width: 640,
      height: 360,
      size: 600000,
      thumbnail: 'https://i.vimeocdn.com/tiny.jpg',
    },
  },
};

const MOCK_RESPONSE = {
  total: 100,
  totalHits: 50,
  hits: [MOCK_HIT],
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('pixabay API wrapper', () => {
  const originalKey = process.env.PIXABAY_API_KEY;

  beforeEach(() => {
    process.env.PIXABAY_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.PIXABAY_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  describe('buildSearchUrl', () => {
    it('builds URL with defaults', () => {
      const url = buildSearchUrl('mykey', { query: 'nature' });
      expect(url).toContain('https://pixabay.com/api/videos/');
      expect(url).toContain('key=mykey');
      expect(url).toContain('q=nature');
      expect(url).toContain('safesearch=true');
      expect(url).toContain('per_page=10');
      expect(url).toContain('page=1');
    });

    it('respects custom perPage and page', () => {
      const url = buildSearchUrl('mykey', { query: 'ocean', perPage: 5, page: 3 });
      expect(url).toContain('per_page=5');
      expect(url).toContain('page=3');
    });
  });

  describe('getBestVideoUrl', () => {
    it('prefers medium resolution', () => {
      const result = getBestVideoUrl(MOCK_HIT);
      expect(result.url).toBe('https://pixabay.com/medium.mp4');
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    it('falls back to large when medium is missing', () => {
      const hit = { ...MOCK_HIT, videos: { ...MOCK_HIT.videos, medium: undefined } };
      const result = getBestVideoUrl(hit);
      expect(result.url).toBe('https://pixabay.com/large.mp4');
    });

    it('falls back to small when medium and large are missing', () => {
      const hit = {
        ...MOCK_HIT,
        videos: { ...MOCK_HIT.videos, medium: undefined, large: undefined },
      };
      const result = getBestVideoUrl(hit);
      expect(result.url).toBe('https://pixabay.com/small.mp4');
    });

    it('falls back to tiny as last resort', () => {
      const hit = { ...MOCK_HIT, videos: { tiny: MOCK_HIT.videos.tiny } };
      const result = getBestVideoUrl(hit);
      expect(result.url).toBe('https://pixabay.com/tiny.mp4');
    });

    it('throws when no video files available', () => {
      const hit = { ...MOCK_HIT, videos: {} };
      expect(() => getBestVideoUrl(hit)).toThrow(/no downloadable files/);
    });
  });

  describe('searchPixabay', () => {
    it('maps response to PixabayVideo array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(MOCK_RESPONSE));

      const results = await searchPixabay({ query: 'nature' });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 12345,
        url: 'https://pixabay.com/medium.mp4',
        thumbnailUrl: 'https://i.vimeocdn.com/small.jpg',
        duration: 15,
        width: 1280,
        height: 720,
        tags: 'nature, forest, trees',
      });
    });

    it('throws RateLimitError on 429', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        jsonResponse({ error: 'rate limited' }, 429)
      );

      await expect(searchPixabay({ query: 'test' })).rejects.toThrow(RateLimitError);
    });

    it('throws APIError on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        jsonResponse({ error: 'bad request' }, 400)
      );

      await expect(searchPixabay({ query: 'test' })).rejects.toThrow(APIError);
    });
  });

  describe('getPixabayVideo', () => {
    it('returns a single video by ID', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(MOCK_RESPONSE));

      const video = await getPixabayVideo(12345);
      expect(video.id).toBe(12345);
      expect(video.url).toBe('https://pixabay.com/medium.mp4');
    });

    it('throws NotFoundError when no hits', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        jsonResponse({ total: 0, totalHits: 0, hits: [] })
      );

      await expect(getPixabayVideo(99999)).rejects.toThrow(NotFoundError);
    });

    it('throws RateLimitError on 429', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        jsonResponse({ error: 'rate limited' }, 429)
      );

      await expect(getPixabayVideo(12345)).rejects.toThrow(RateLimitError);
    });
  });
});
