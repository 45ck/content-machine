/**
 * Video Providers Module
 *
 * Exports all video provider implementations and types.
 */

export * from './types.js';
export { PexelsProvider } from './pexels-provider.js';
export { MockVideoProvider } from './mock-provider.js';
export { searchPexels, getPexelsVideo } from './pexels.js';

import type { VideoProvider } from './types.js';
import { PexelsProvider } from './pexels-provider.js';
import { MockVideoProvider } from './mock-provider.js';

export type ProviderName = 'pexels' | 'pixabay' | 'mock';

/**
 * Factory function to create video providers
 */
export function createVideoProvider(name: ProviderName): VideoProvider {
  switch (name) {
    case 'pexels':
      return new PexelsProvider();
    case 'mock':
      return new MockVideoProvider();
    case 'pixabay':
      // TODO: Implement Pixabay provider
      throw new Error('Pixabay provider not yet implemented');
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
