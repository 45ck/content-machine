/**
 * Video/Asset Providers Module
 *
 * Exports all video/asset provider implementations and types.
 *
 * Extended in v1.1 to support both video and image providers.
 * See ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md
 */

export * from './types.js';
export { PexelsProvider } from './pexels-provider.js';
export { MockVideoProvider } from './mock-provider.js';
export { NanoBananaProvider } from './nanobanana-provider.js';
export { LocalProvider } from './local-provider.js';
export { LocalImageProvider } from './local-image-provider.js';
export { searchPexels, getPexelsVideo } from './pexels.js';

import type { VideoProvider, AssetProvider } from './types.js';
import { PexelsProvider } from './pexels-provider.js';
import { MockVideoProvider } from './mock-provider.js';
import { NanoBananaProvider } from './nanobanana-provider.js';
import { LocalProvider } from './local-provider.js';
import { LocalImageProvider } from './local-image-provider.js';

// =============================================================================
// Provider Names
// =============================================================================

/**
 * Video provider names (legacy, returns video clips).
 */
export type ProviderName = 'pexels' | 'pixabay' | 'mock';

/**
 * Asset provider names (extended, includes image generators).
 */
export type AssetProviderName =
  // Video providers
  | 'pexels'
  | 'pixabay'
  | 'local'
  // Image providers
  | 'nanobanana'
  | 'localimage'
  | 'dalle'
  | 'unsplash'
  // Special
  | 'mock';

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Factory function to create video providers.
 * @deprecated Use createAssetProvider for new code
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

/**
 * Factory function to create asset providers.
 *
 * Supports both video providers (Pexels, Pixabay) and image providers (NanoBanana).
 */
export function createAssetProvider(
  name: AssetProviderName,
  config?: CreateAssetProviderConfig
): AssetProvider {
  return assetProviderFactories[name](config);
}

type CreateAssetProviderConfig = {
  visuals?: {
    nanobanana?: {
      model?: string;
      costPerAssetUsd?: number;
      cacheDir?: string;
      apiBaseUrl?: string;
      apiVersion?: string;
      timeoutMs?: number;
    };
    cacheEnabled?: boolean;
    cacheTtl?: number;
    local?: {
      dir?: string;
      recursive?: boolean;
      manifest?: string;
    };
  };
};

type AssetProviderFactory = (config?: CreateAssetProviderConfig) => AssetProvider;

const assetProviderFactories: Record<AssetProviderName, AssetProviderFactory> = {
  pexels: () => adaptVideoProviderToAssetProvider(new PexelsProvider()),
  mock: () => adaptVideoProviderToAssetProvider(new MockVideoProvider()),

  nanobanana: (config) =>
    new NanoBananaProvider({
      model: config?.visuals?.nanobanana?.model,
      cacheDir: config?.visuals?.nanobanana?.cacheDir,
      costPerAssetUsd: config?.visuals?.nanobanana?.costPerAssetUsd,
      apiBaseUrl: config?.visuals?.nanobanana?.apiBaseUrl,
      apiVersion: config?.visuals?.nanobanana?.apiVersion,
      timeoutMs: config?.visuals?.nanobanana?.timeoutMs,
      cacheEnabled: config?.visuals?.cacheEnabled,
      cacheTtlSeconds: config?.visuals?.cacheTtl,
    }),

  local: (config) =>
    new LocalProvider({
      dir: config?.visuals?.local?.dir,
      recursive: config?.visuals?.local?.recursive,
    }),

  localimage: (config) =>
    new LocalImageProvider({
      dir: config?.visuals?.local?.dir,
      recursive: config?.visuals?.local?.recursive,
    }),

  pixabay: () => {
    throw new Error('Pixabay provider not yet implemented');
  },
  dalle: () => {
    throw new Error('DALL-E provider not yet implemented');
  },
  unsplash: () => {
    throw new Error('Unsplash provider not yet implemented');
  },
};

/**
 * Get list of available asset providers (those with API keys configured).
 */
export function getAvailableProviders(): AssetProviderName[] {
  const providers: AssetProviderName[] = ['pexels', 'nanobanana', 'mock'];
  return providers.filter((name) => {
    try {
      const provider = createAssetProvider(name);
      return provider.isAvailable();
    } catch {
      return false;
    }
  });
}

// =============================================================================
// Adapter for Legacy VideoProvider
// =============================================================================

/**
 * Adapts a VideoProvider to the AssetProvider interface.
 * This allows existing video providers to be used with the new interface.
 */
function adaptVideoProviderToAssetProvider(videoProvider: VideoProvider): AssetProvider {
  return {
    name: videoProvider.name,
    assetType: 'video',
    requiresMotion: false,
    costPerAsset: 0,

    async search(options) {
      const results = await videoProvider.search(options);
      return results.map((r) => ({
        id: r.id,
        url: r.url,
        type: 'video' as const,
        width: r.width,
        height: r.height,
        duration: r.duration,
        thumbnailUrl: r.thumbnailUrl,
      }));
    },

    isAvailable() {
      return videoProvider.isAvailable();
    },

    estimateCost() {
      return 0;
    },
  };
}
