/**
 * NanoBanana Provider - Gemini Image Generation
 *
 * Implements AssetProvider interface for Google Gemini image generation.
 * This provider generates images that require motion strategies for video output.
 *
 * Supported models:
 * - gemini-2.0-flash-exp-image-generation (fast, ~$0.04/image)
 *
 * See ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md
 */

import type { GenerationConfig } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * SDK v0.24.1 types don't include `responseModalities` yet — it is required
 * at runtime for gemini-2.0-flash-exp-image-generation.  Remove once the
 * upstream types are updated.
 */
type ImageGenerationConfig = GenerationConfig & { responseModalities: string[] };
import type { AssetProvider, AssetType, AssetSearchOptions, VisualAssetResult } from './types.js';
import { getApiKey, getOptionalApiKey } from '../../core/config.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger({ module: 'nanobanana-provider' });

/**
 * Default cost per image generation in USD.
 * Based on Gemini 2.5 Flash pricing.
 */
const DEFAULT_COST_PER_ASSET = 0.04;

/**
 * Default model for image generation.
 */
const DEFAULT_MODEL = 'gemini-2.0-flash-exp-image-generation';

/**
 * NanoBanana Provider - Gemini image generation for visual content.
 *
 * This provider generates AI images from prompts, which can then be
 * animated using motion strategies (Ken Burns, DepthFlow, Veo).
 *
 * @example
 * ```typescript
 * const provider = new NanoBananaProvider();
 *
 * if (provider.isAvailable()) {
 *   const result = await provider.generate('a sunset over mountains', {
 *     orientation: 'portrait',
 *     style: 'cinematic',
 *   });
 *   console.log(result.url); // data:image/png;base64,...
 * }
 * ```
 */
export class NanoBananaProvider implements AssetProvider {
  readonly name = 'nanobanana';
  readonly assetType: AssetType = 'image';
  readonly requiresMotion = true;
  readonly costPerAsset = DEFAULT_COST_PER_ASSET;

  private model: string;

  constructor(model?: string) {
    this.model = model ?? DEFAULT_MODEL;
  }

  /**
   * Search for assets - wraps generate() for compatibility with stock providers.
   *
   * AI providers generate one image at a time, so this returns a single-element array.
   */
  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    log.debug({ query: options.query }, 'Search request (delegating to generate)');
    const result = await this.generate(options.query, options);
    return [result];
  }

  /**
   * Generate an image from a prompt.
   *
   * @param prompt - The image description/prompt
   * @param options - Generation options (orientation, style, etc.)
   * @returns Generated image as VisualAssetResult
   */
  async generate(prompt: string, options?: AssetSearchOptions): Promise<VisualAssetResult> {
    log.info({ prompt, model: this.model }, 'Generating image');

    // Ensure API key is available
    this.getApiKey();

    const enhancedPrompt = this.buildPrompt(prompt, options);
    const { width, height } = this.getDimensions(options?.orientation);

    try {
      const result = await this.generateImage(enhancedPrompt, { width, height });

      log.info({ id: result.id }, 'Image generated successfully');

      return {
        id: result.id,
        url: result.url,
        type: 'image',
        width: result.width,
        height: result.height,
        metadata: {
          model: this.model,
          prompt: enhancedPrompt,
        },
      };
    } catch (error) {
      log.error({ error, prompt }, 'Image generation failed');
      throw error;
    }
  }

  /**
   * Check if the Gemini API is available.
   *
   * Returns true if either GOOGLE_API_KEY or GEMINI_API_KEY is set.
   */
  isAvailable(): boolean {
    const googleKey = getOptionalApiKey('GOOGLE_API_KEY');
    const geminiKey = getOptionalApiKey('GEMINI_API_KEY');
    return !!(googleKey || geminiKey);
  }

  /**
   * Estimate cost for generating N images.
   */
  estimateCost(assetCount: number): number {
    return assetCount * this.costPerAsset;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Get the API key for Gemini.
   * Prefers GOOGLE_API_KEY, falls back to GEMINI_API_KEY.
   */
  private getApiKey(): string {
    const googleKey = getOptionalApiKey('GOOGLE_API_KEY');
    if (googleKey) return googleKey;

    const geminiKey = getOptionalApiKey('GEMINI_API_KEY');
    if (geminiKey) return geminiKey;

    // This will throw with a helpful error message
    return getApiKey('GOOGLE_API_KEY');
  }

  /**
   * Build an enhanced prompt with style and orientation hints.
   */
  private buildPrompt(basePrompt: string, options?: AssetSearchOptions): string {
    const parts = [basePrompt];

    // Add style hint
    if (options?.style) {
      parts.push(`Style: ${options.style}`);
    } else {
      parts.push('Style: photorealistic, cinematic');
    }

    // Add orientation hint
    if (options?.orientation === 'portrait') {
      parts.push('Vertical composition, 9:16 aspect ratio, portrait orientation');
    } else if (options?.orientation === 'landscape') {
      parts.push('Horizontal composition, 16:9 aspect ratio, landscape orientation');
    } else if (options?.orientation === 'square') {
      parts.push('Square composition, 1:1 aspect ratio');
    }

    // Quality hints
    parts.push('High quality, professional, detailed');

    return parts.join('. ');
  }

  /**
   * Get dimensions based on orientation.
   */
  private getDimensions(orientation?: string): { width: number; height: number } {
    switch (orientation) {
      case 'landscape':
        return { width: 1920, height: 1080 };
      case 'square':
        return { width: 1080, height: 1080 };
      case 'portrait':
      default:
        return { width: 1080, height: 1920 };
    }
  }

  /**
   * Generate image using Gemini API.
   *
   * This method can be overridden in tests for mocking.
   */
  protected async generateImage(
    prompt: string,
    options: { width: number; height: number }
  ): Promise<{ id: string; url: string; width: number; height: number }> {
    const apiKey = this.getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseModalities: ['IMAGE'],
      } as ImageGenerationConfig,
    });

    const result = await model.generateContent(prompt);
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData) {
      throw new Error('Gemini returned no image data. Check model name and API key.');
    }

    const { data, mimeType } = imagePart.inlineData;
    const dataUrl = `data:${mimeType};base64,${data}`;

    return {
      id: `nanobanana-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: dataUrl,
      width: options.width,
      height: options.height,
    };
  }
}
