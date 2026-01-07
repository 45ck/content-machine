/**
 * Video/Asset Provider Strategy Interface
 *
 * Defines the contract for visual asset providers (Pexels, NanoBanana, etc.)
 * This implements the Strategy pattern for swappable visual sources.
 *
 * Extended in v1.1 to support both video and image providers.
 * See ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md
 */

// =============================================================================
// Asset Type Discriminator
// =============================================================================

/**
 * Asset type discriminator.
 * - 'video': Ready-to-use video clip
 * - 'image': Static image requiring motion strategy
 */
export type AssetType = 'video' | 'image';

// =============================================================================
// Search/Generation Results
// =============================================================================

/**
 * Result from a video provider search.
 * @deprecated Use VisualAssetResult for new providers
 */
export interface VideoSearchResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  duration?: number;
}

/**
 * Result from an asset provider search or generation.
 * Extends VideoSearchResult with type discriminator.
 */
export interface VisualAssetResult {
  /** Unique identifier from the provider */
  id: string;

  /** Direct URL to the asset (video file or image) */
  url: string;

  /** Whether this is a video or image */
  type: AssetType;

  /** Asset dimensions */
  width: number;
  height: number;

  /** Duration in seconds (for videos only) */
  duration?: number;

  /** Preview image URL */
  thumbnailUrl?: string;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Search Options
// =============================================================================

/**
 * Options for video search.
 * @deprecated Use AssetSearchOptions for new providers
 */
export interface VideoSearchOptions {
  query: string;
  orientation: 'portrait' | 'landscape' | 'square';
  perPage?: number;
  minDuration?: number;
}

/**
 * Options for searching/generating assets.
 * Extends VideoSearchOptions with AI generation support.
 */
export interface AssetSearchOptions {
  /** Search query or generation prompt */
  query: string;

  /** Target orientation */
  orientation: 'portrait' | 'landscape' | 'square';

  /** Max results to return (for search) */
  perPage?: number;

  /** Aspect ratio constraint (e.g., "9:16") */
  aspectRatio?: string;

  /** Style hint for AI generators (e.g., "cinematic", "illustration") */
  style?: string;

  /** Minimum duration in seconds (for video search) */
  minDuration?: number;
}

// =============================================================================
// Provider Interfaces
// =============================================================================

/**
 * Strategy interface for video providers.
 * @deprecated Use AssetProvider for new providers
 */
export interface VideoProvider {
  readonly name: string;

  /**
   * Search for videos matching the query
   */
  search(options: VideoSearchOptions): Promise<VideoSearchResult[]>;

  /**
   * Check if provider is available (has API key, etc.)
   */
  isAvailable(): boolean;
}

/**
 * Unified interface for all asset providers (video or image).
 *
 * Implements Strategy pattern for swappable visual sources.
 * New providers should implement this interface.
 */
export interface AssetProvider {
  /** Provider identifier (e.g., "pexels", "nanobanana") */
  readonly name: string;

  /** What type of assets this provider returns */
  readonly assetType: AssetType;

  /** Whether assets need motion applied (true for image providers) */
  readonly requiresMotion: boolean;

  /** Cost per asset in USD (0 for free providers) */
  readonly costPerAsset: number;

  /**
   * Search for assets matching the query.
   * Used for stock providers.
   */
  search(options: AssetSearchOptions): Promise<VisualAssetResult[]>;

  /**
   * Generate an asset from a prompt.
   * Used for AI providers. Optional - not all providers support generation.
   */
  generate?(prompt: string, options?: AssetSearchOptions): Promise<VisualAssetResult>;

  /**
   * Check if provider is available (API key set, service reachable)
   */
  isAvailable(): boolean;

  /**
   * Estimate cost for N assets
   */
  estimateCost(assetCount: number): number;
}

// =============================================================================
// Factory Types
// =============================================================================

/**
 * Factory type for creating video providers
 * @deprecated Use AssetProviderFactory
 */
export type VideoProviderFactory = (config?: unknown) => VideoProvider;

/**
 * Factory type for creating asset providers
 */
export type AssetProviderFactory = (config?: unknown) => AssetProvider;
