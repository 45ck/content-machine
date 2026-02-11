/**
 * NanoBanana Provider - Gemini Image Generation
 *
 * Implements AssetProvider interface for Google Gemini image generation.
 * This provider generates images that require motion strategies for video output.
 *
 * Supported models:
 * - gemini-2.5-flash-image (fast, ~$0.04/image)
 * - gemini-3-pro-image-preview (high quality, ~$0.08/image)
 *
 * See ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md
 */

import type { AssetProvider, AssetType, AssetSearchOptions, VisualAssetResult } from './types.js';
import { getApiKey, getOptionalApiKey } from '../../core/config.js';
import { createLogger } from '../../core/logger.js';
import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { APIError, RateLimitError } from '../../core/errors.js';
import { withRetry } from '../../core/retry.js';

const log = createLogger({ module: 'nanobanana-provider' });

/**
 * Default cost per image generation in USD.
 * Based on Gemini 2.5 Flash pricing.
 */
const DEFAULT_COST_PER_ASSET = 0.04;

/**
 * Default model for image generation.
 */
const DEFAULT_MODEL = 'gemini-2.5-flash-image';

const DEFAULT_CACHE_DIR = join(homedir(), '.cm', 'assets', 'generated', 'nanobanana');

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function isOkFile(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function isFreshFile(path: string, ttlSeconds: number | undefined): Promise<boolean> {
  if (!(await isOkFile(path))) return false;
  if (!ttlSeconds) return true;
  try {
    const info = await stat(path);
    const ageMs = Date.now() - info.mtimeMs;
    return ageMs <= ttlSeconds * 1000;
  } catch {
    return false;
  }
}

function extForMimeType(mimeType: string | undefined): string {
  if (!mimeType) return '.png';
  const m = mimeType.toLowerCase();
  if (m === 'image/png') return '.png';
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/webp') return '.webp';
  return '.png';
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: { blockReason?: string };
};

async function generateGeminiImage(params: {
  apiKey: string;
  apiBaseUrl: string;
  apiVersion: string;
  model: string;
  prompt: string;
  timeoutMs: number;
}): Promise<{ mimeType: string; bytesBase64: string }> {
  const { apiKey, apiBaseUrl, apiVersion, model, prompt, timeoutMs } = params;
  const base = apiBaseUrl.replace(/\/+$/, '');
  const ver = apiVersion.replace(/^\/+|\/+$/g, '');
  const url = `${base}/${ver}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // Part of the Gemini image-generation API request. If the backend ignores
      // it, we still attempt to parse inline image parts.
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  }).finally(() => clearTimeout(timeout));

  const raw = await res.text();
  if (!res.ok) {
    let retryAfterSeconds = 10;
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter && /^\d+$/.test(retryAfter)) retryAfterSeconds = Number(retryAfter);

    // Try to surface the upstream error shape when available.
    try {
      const parsed = JSON.parse(raw) as any;
      const message =
        parsed?.error?.message ??
        parsed?.message ??
        (typeof raw === 'string' ? raw.slice(0, 300) : 'Unknown error');
      if (res.status === 429) throw new RateLimitError('gemini', retryAfterSeconds);
      throw new APIError(`Gemini image generation failed: ${message}`, {
        provider: 'gemini',
        status: res.status,
        model,
      });
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      if (error instanceof APIError) throw error;
    }

    if (res.status === 429) throw new RateLimitError('gemini', retryAfterSeconds);
    throw new APIError(`Gemini API HTTP ${res.status}`, {
      provider: 'gemini',
      status: res.status,
      model,
      raw: raw.slice(0, 300),
    });
  }

  let json: GeminiGenerateContentResponse;
  try {
    json = JSON.parse(raw) as GeminiGenerateContentResponse;
  } catch {
    throw new APIError(`Gemini image generation returned non-JSON`, {
      provider: 'gemini',
      model,
      raw: raw.slice(0, 300),
    });
  }

  if (json.promptFeedback?.blockReason) {
    throw new APIError(`Gemini prompt blocked`, {
      provider: 'gemini',
      model,
      blockReason: json.promptFeedback.blockReason,
    });
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) {
    const text = parts
      .map((p) => p.text)
      .filter(Boolean)
      .join(' ')
      .slice(0, 200);
    throw new APIError(`Gemini image response missing inlineData`, {
      provider: 'gemini',
      model,
      responseTextPreview: text || '(none)',
    });
  }

  return { mimeType: inline.mimeType ?? 'image/png', bytesBase64: inline.data };
}

export type NanoBananaProviderOptions = {
  model?: string;
  costPerAssetUsd?: number;
  cacheDir?: string;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
  apiBaseUrl?: string;
  apiVersion?: string;
  timeoutMs?: number;
};

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
 *   console.log(result.url); // /home/you/.cm/assets/generated/nanobanana/<hash>.png
 * }
 * ```
 */
export class NanoBananaProvider implements AssetProvider {
  readonly name = 'nanobanana';
  readonly assetType: AssetType = 'image';
  readonly requiresMotion = true;
  readonly costPerAsset: number;

  private model: string;
  private cacheDir: string;
  private cacheEnabled: boolean;
  private cacheTtlSeconds: number | undefined;
  private apiBaseUrl: string;
  private apiVersion: string;
  private timeoutMs: number;

  constructor(options: NanoBananaProviderOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTtlSeconds = options.cacheTtlSeconds;
    this.costPerAsset = options.costPerAssetUsd ?? DEFAULT_COST_PER_ASSET;
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://generativelanguage.googleapis.com';
    this.apiVersion = options.apiVersion ?? 'v1beta';
    this.timeoutMs = options.timeoutMs ?? 60_000;
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
    const promptHash = sha256Hex(prompt).slice(0, 12);
    log.info({ promptHash, promptLength: prompt.length, model: this.model }, 'Generating image');

    // Ensure API key is available
    const apiKey = this.getApiKey();

    const enhancedPrompt = this.buildPrompt(prompt, options);
    const { width, height } = this.getDimensions(options?.orientation);

    try {
      const result = await this.generateImage(enhancedPrompt, { width, height, apiKey });

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
          cacheHit: result.cacheHit,
        },
      };
    } catch (error) {
      const promptHash = sha256Hex(prompt).slice(0, 12);
      log.error({ error, promptHash }, 'Image generation failed');
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
    // Avoid artifacts that look bad in short-form videos.
    parts.push('No text, no subtitles, no watermark, no logos');

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
    _prompt: string,
    _options: { width: number; height: number; apiKey: string }
  ): Promise<{ id: string; url: string; width: number; height: number; cacheHit: boolean }> {
    const { width, height, apiKey } = _options;
    const cacheKey = sha256Hex(
      JSON.stringify({ model: this.model, prompt: _prompt, width, height })
    )
      .slice(0, 24)
      .toLowerCase();

    await mkdir(this.cacheDir, { recursive: true });

    const cacheCandidates = [
      join(this.cacheDir, `${cacheKey}.png`),
      join(this.cacheDir, `${cacheKey}.jpg`),
      join(this.cacheDir, `${cacheKey}.webp`),
    ];
    if (this.cacheEnabled) {
      for (const candidate of cacheCandidates) {
        if (await isFreshFile(candidate, this.cacheTtlSeconds)) {
          return { id: cacheKey, url: candidate, width, height, cacheHit: true };
        }
      }
    }

    const generated = await withRetry(
      () =>
        generateGeminiImage({
          apiKey,
          apiBaseUrl: this.apiBaseUrl,
          apiVersion: this.apiVersion,
          model: this.model,
          prompt: _prompt,
          timeoutMs: this.timeoutMs,
        }),
      { context: { provider: 'gemini', kind: 'image' } }
    );
    const ext = extForMimeType(generated.mimeType);
    const finalPath = join(this.cacheDir, `${cacheKey}${ext}`);

    if (!(await isOkFile(finalPath))) {
      const buf = Buffer.from(generated.bytesBase64, 'base64');
      await writeFile(finalPath, buf);
    }

    return { id: cacheKey, url: finalPath, width, height, cacheHit: false };
  }
}
