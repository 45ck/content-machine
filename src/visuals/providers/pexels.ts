/**
 * Pexels Provider
 *
 * Search and download videos from Pexels API.
 */
import { createClient, Videos, Video } from 'pexels';
import { getApiKey } from '../../core/config';
import { createLogger } from '../../core/logger';
import { APIError, RateLimitError } from '../../core/errors';

export interface PexelsSearchOptions {
  query: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  perPage?: number;
  page?: number;
}

export interface PexelsVideo {
  id: number;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  user: string;
}

// Cache the client
let cachedClient: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (!cachedClient) {
    const apiKey = getApiKey('PEXELS_API_KEY');
    cachedClient = createClient(apiKey);
  }
  return cachedClient;
}

/**
 * Search Pexels for videos
 */
export async function searchPexels(options: PexelsSearchOptions): Promise<PexelsVideo[]> {
  const log = createLogger({ module: 'pexels', query: options.query });

  log.debug({ orientation: options.orientation, perPage: options.perPage }, 'Searching Pexels');

  try {
    const client = getClient();

    const response = await client.videos.search({
      query: options.query,
      orientation: options.orientation,
      per_page: options.perPage ?? 10,
      page: options.page ?? 1,
    });

    // Type guard for error response
    if ('error' in response) {
      throw new APIError(`Pexels API error: ${response.error}`);
    }

    const videos = response as Videos;

    log.debug({ count: videos.videos.length }, 'Pexels search complete');

    return videos.videos.map((video) => ({
      id: video.id,
      url: getBestVideoUrl(video),
      thumbnailUrl: video.image,
      duration: video.duration,
      width: video.width,
      height: video.height,
      user: video.user.name,
    }));
  } catch (error) {
    log.error({ error }, 'Pexels search failed');

    // Handle rate limiting
    if (error instanceof Error && error.message.includes('429')) {
      throw new RateLimitError('Pexels', 60);
    }

    throw new APIError(
      `Pexels search failed: ${error instanceof Error ? error.message : String(error)}`,
      { query: options.query }
    );
  }
}

/**
 * Get the best quality video URL for the orientation
 * Prefers HD (720-1080p) to avoid huge UHD files that crash the renderer
 */
function getBestVideoUrl(video: Video): string {
  const files = video.video_files;

  // Sort by quality (height) descending
  const sorted = [...files].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  // First preference: HD quality (720p or 1080p) - optimal for rendering
  const hd = sorted.find(
    (f) => f.height && f.height >= 720 && f.height <= 1080 && f.quality === 'hd'
  );
  if (hd) return hd.link;

  // Second preference: Any file 1920p or less (avoid 4K/UHD)
  const reasonable = sorted.find((f) => f.height && f.height <= 1920);
  if (reasonable) return reasonable.link;

  // Third preference: SD quality
  const sd = sorted.find((f) => f.quality === 'sd');
  if (sd) return sd.link;

  // Last resort: smallest available (to avoid memory issues)
  const smallest = [...files].sort((a, b) => (a.height ?? 0) - (b.height ?? 0))[0];
  return smallest?.link ?? sorted[0].link;
}

/**
 * Get a video by ID
 */
export async function getPexelsVideo(id: number): Promise<PexelsVideo> {
  const log = createLogger({ module: 'pexels', videoId: id });

  try {
    const client = getClient();
    const video = await client.videos.show({ id });

    // Type guard for error response
    if ('error' in video) {
      throw new NotFoundError(`Pexels video not found: ${id}`);
    }

    return {
      id: video.id,
      url: getBestVideoUrl(video),
      thumbnailUrl: video.image,
      duration: video.duration,
      width: video.width,
      height: video.height,
      user: video.user.name,
    };
  } catch (error) {
    log.error({ error }, 'Failed to get Pexels video');
    throw new APIError(
      `Failed to get Pexels video: ${error instanceof Error ? error.message : String(error)}`,
      { id }
    );
  }
}

// Need to import for type reference
import { NotFoundError } from '../../core/errors';
