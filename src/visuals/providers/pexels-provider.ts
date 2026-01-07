/**
 * Pexels Video Provider - Strategy Implementation
 *
 * Wraps the Pexels API in the VideoProvider interface.
 */

import type { VideoProvider, VideoSearchOptions, VideoSearchResult } from './types.js';
import { searchPexels } from './pexels.js';
import { getApiKey } from '../../core/config.js';

export class PexelsProvider implements VideoProvider {
  readonly name = 'pexels';

  search(options: VideoSearchOptions): Promise<VideoSearchResult[]> {
    return searchPexels({
      query: options.query,
      orientation: options.orientation,
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
      getApiKey('PEXELS_API_KEY');
      return true;
    } catch {
      return false;
    }
  }
}
