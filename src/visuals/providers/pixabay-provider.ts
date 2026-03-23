/**
 * Pixabay Video Provider - Strategy Implementation
 *
 * Wraps the Pixabay API in the VideoProvider interface.
 */

import type { VideoProvider, VideoSearchOptions, VideoSearchResult } from './types.js';
import { searchPixabay } from './pixabay.js';
import { getApiKey } from '../../core/config.js';

/** VideoProvider strategy for the Pixabay stock video API. */
export class PixabayProvider implements VideoProvider {
  readonly name = 'pixabay';

  search(options: VideoSearchOptions): Promise<VideoSearchResult[]> {
    return searchPixabay({
      query: options.query,
      perPage: options.perPage ?? 5,
    }).then((videos) =>
      videos.map((v) => ({
        id: String(v.id),
        url: v.url,
        thumbnailUrl: v.thumbnailUrl,
        width: v.width,
        height: v.height,
        duration: v.duration,
      }))
    );
  }

  isAvailable(): boolean {
    try {
      getApiKey('PIXABAY_API_KEY');
      return true;
    } catch {
      return false;
    }
  }
}
