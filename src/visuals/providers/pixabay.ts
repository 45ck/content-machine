/**
 * Pixabay Provider
 *
 * Search and download videos from Pixabay API.
 */
import { getApiKey } from '../../core/config.js';
import { createLogger } from '../../core/logger.js';
import { APIError, NotFoundError, RateLimitError } from '../../core/errors.js';

/** Options for searching the Pixabay video API. */
export interface PixabaySearchOptions {
  query: string;
  perPage?: number;
  page?: number;
}

/** Normalized video result from the Pixabay API. */
export interface PixabayVideo {
  id: number;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  tags: string;
}

interface PixabayVideoFile {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
}

interface PixabayHit {
  id: number;
  duration: number;
  tags: string;
  videos: {
    large?: PixabayVideoFile;
    medium?: PixabayVideoFile;
    small?: PixabayVideoFile;
    tiny?: PixabayVideoFile;
  };
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
}

const PIXABAY_API_BASE = 'https://pixabay.com/api/videos/';

/** @internal */
export function buildSearchUrl(key: string, options: PixabaySearchOptions): string {
  const params = new URLSearchParams({
    key,
    q: options.query,
    per_page: String(options.perPage ?? 10),
    page: String(options.page ?? 1),
    safesearch: 'true',
  });
  return `${PIXABAY_API_BASE}?${params.toString()}`;
}

/** @internal */
export function getBestVideoUrl(hit: PixabayHit): { url: string; width: number; height: number } {
  // Prefer medium (typically 1280x720) for rendering, then large, then small, then tiny
  const tiers: (keyof PixabayHit['videos'])[] = ['medium', 'large', 'small', 'tiny'];
  for (const tier of tiers) {
    const file = hit.videos[tier];
    if (file?.url) {
      return { url: file.url, width: file.width, height: file.height };
    }
  }
  throw new Error(`Pixabay video ${hit.id} has no downloadable files`);
}

/**
 * Search Pixabay for videos
 */
export async function searchPixabay(options: PixabaySearchOptions): Promise<PixabayVideo[]> {
  const log = createLogger({ module: 'pixabay', query: options.query });

  log.debug({ perPage: options.perPage }, 'Searching Pixabay');

  const apiKey = getApiKey('PIXABAY_API_KEY');
  const url = buildSearchUrl(apiKey, options);

  try {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('X-RateLimit-Reset') ?? 60);
      throw new RateLimitError('Pixabay', retryAfter);
    }

    if (!response.ok) {
      throw new APIError(`Pixabay API error: ${response.status} ${response.statusText}`, {
        provider: 'pixabay',
        status: response.status,
      });
    }

    const data = (await response.json()) as PixabayResponse;

    log.debug({ count: data.hits.length, total: data.totalHits }, 'Pixabay search complete');

    return data.hits.map((hit) => {
      const best = getBestVideoUrl(hit);
      return {
        id: hit.id,
        url: best.url,
        thumbnailUrl: hit.videos.small?.thumbnail ?? hit.videos.tiny?.thumbnail,
        duration: hit.duration,
        width: best.width,
        height: best.height,
        tags: hit.tags,
      };
    });
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof APIError) {
      throw error;
    }

    log.error({ error }, 'Pixabay search failed');
    throw new APIError(
      `Pixabay search failed: ${error instanceof Error ? error.message : String(error)}`,
      { query: options.query }
    );
  }
}

/**
 * Get a video by ID
 */
export async function getPixabayVideo(id: number): Promise<PixabayVideo> {
  const log = createLogger({ module: 'pixabay', videoId: id });

  const apiKey = getApiKey('PIXABAY_API_KEY');
  const params = new URLSearchParams({ key: apiKey, id: String(id) });
  const url = `${PIXABAY_API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('X-RateLimit-Reset') ?? 60);
      throw new RateLimitError('Pixabay', retryAfter);
    }

    if (!response.ok) {
      throw new APIError(`Pixabay API error: ${response.status} ${response.statusText}`, {
        provider: 'pixabay',
        status: response.status,
      });
    }

    const data = (await response.json()) as PixabayResponse;

    if (data.hits.length === 0) {
      throw new NotFoundError(`Pixabay video not found: ${id}`, {
        resource: 'video',
        identifier: String(id),
      });
    }

    const hit = data.hits[0];
    const best = getBestVideoUrl(hit);

    return {
      id: hit.id,
      url: best.url,
      thumbnailUrl: hit.videos.small?.thumbnail ?? hit.videos.tiny?.thumbnail,
      duration: hit.duration,
      width: best.width,
      height: best.height,
      tags: hit.tags,
    };
  } catch (error) {
    if (
      error instanceof RateLimitError ||
      error instanceof APIError ||
      error instanceof NotFoundError
    ) {
      throw error;
    }

    log.error({ error }, 'Failed to get Pixabay video');
    throw new APIError(
      `Failed to get Pixabay video: ${error instanceof Error ? error.message : String(error)}`,
      { id }
    );
  }
}
