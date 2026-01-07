/**
 * Video Provider Strategy Interface
 *
 * Defines the contract for stock video providers (Pexels, Pixabay, etc.)
 * This implements the Strategy pattern for swappable video sources.
 */

export interface VideoSearchResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  duration?: number;
}

export interface VideoSearchOptions {
  query: string;
  orientation: 'portrait' | 'landscape' | 'square';
  perPage?: number;
  minDuration?: number;
}

/**
 * Strategy interface for video providers
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
 * Factory type for creating video providers
 */
export type VideoProviderFactory = (config?: unknown) => VideoProvider;
