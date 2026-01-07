/**
 * Mock Video Provider - Strategy Implementation
 *
 * Returns mock video results for testing without API calls.
 */

import type { VideoProvider, VideoSearchOptions, VideoSearchResult } from './types.js';

export class MockVideoProvider implements VideoProvider {
  readonly name = 'mock';

  async search(options: VideoSearchOptions): Promise<VideoSearchResult[]> {
    const count = options.perPage ?? 5;
    const results: VideoSearchResult[] = [];

    for (let i = 0; i < count; i++) {
      const id = `mock-${Date.now()}-${i}`;
      results.push({
        id,
        url: `https://mock.pexels.com/video/${id}.mp4`,
        thumbnailUrl: `https://mock.pexels.com/thumb/${id}.jpg`,
        width: options.orientation === 'landscape' ? 1920 : 1080,
        height: options.orientation === 'landscape' ? 1080 : 1920,
        duration: 10 + i * 2,
      });
    }

    return results;
  }

  isAvailable(): boolean {
    return true; // Always available for testing
  }
}
