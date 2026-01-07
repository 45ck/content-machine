# Provider Interface Specification

**Version:** 1.0.0  
**Date:** 2026-01-07  
**Status:** Implementation Ready  
**Related:** [ADR-002](./ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md)

---

## Overview

This document specifies the interfaces for the visual provider system, enabling both **stock video** and **AI-generated image** sources with pluggable motion strategies.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Visual Matching Pipeline                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Keywords ─────▶ AssetProvider ─────▶ VisualAssetResult                │
│                        │                     │                          │
│                        │                     ▼                          │
│                        │              ┌─────────────┐                   │
│                        │              │ assetType?  │                   │
│                        │              └──────┬──────┘                   │
│                        │                     │                          │
│                        │         ┌───────────┴───────────┐              │
│                        │         ▼                       ▼              │
│                        │    [video]                  [image]            │
│                        │         │                       │              │
│                        │         │              MotionStrategy          │
│                        │         │                       │              │
│                        │         ▼                       ▼              │
│                        └────────────▶ Video Clip ◀───────┘              │
│                                           │                             │
│                                           ▼                             │
│                                    VisualAsset                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Asset Provider Interface

All visual sources (stock footage, AI generation) implement this interface.

### Type Definitions

```typescript
// src/visuals/providers/types.ts

/**
 * Asset type discriminator
 */
export type AssetType = 'video' | 'image';

/**
 * Result from an asset provider search or generation
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

/**
 * Options for searching/generating assets
 */
export interface AssetSearchOptions {
  /** Search query or prompt */
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

/**
 * Unified interface for all asset providers
 *
 * Implements Strategy pattern for swappable visual sources.
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
```

### Provider Name Registry

```typescript
// src/visuals/providers/registry.ts

/**
 * All registered provider names
 */
export type ProviderName =
  // Video providers
  | 'pexels'
  | 'pixabay'
  // Image providers
  | 'nanobanana'
  | 'dalle'
  | 'unsplash'
  // Special
  | 'mock';

/**
 * Mapping of provider names to their asset types
 */
export const PROVIDER_ASSET_TYPES: Record<ProviderName, AssetType> = {
  pexels: 'video',
  pixabay: 'video',
  nanobanana: 'image',
  dalle: 'image',
  unsplash: 'image',
  mock: 'video',
};

/**
 * Providers that require a motion strategy
 */
export const REQUIRES_MOTION: Set<ProviderName> = new Set(['nanobanana', 'dalle', 'unsplash']);
```

---

## 2. Motion Strategy Interface

Motion strategies animate static images into video clips.

### Type Definitions

```typescript
// src/visuals/motion/types.ts

/**
 * Motion strategy names
 */
export type MotionStrategyName = 'none' | 'kenburns' | 'depthflow' | 'veo';

/**
 * Options for applying motion to an image
 */
export interface MotionOptions {
  /** Path to source image file */
  inputPath: string;

  /** Path for output video file */
  outputPath: string;

  /** Target duration in seconds */
  duration: number;

  /** Target width in pixels */
  width: number;

  /** Target height in pixels */
  height: number;

  /** Frames per second (default: 30) */
  fps?: number;

  /** Strategy-specific options */
  strategyOptions?: Record<string, unknown>;
}

/**
 * Result of motion application
 */
export interface MotionResult {
  /** Path to generated video */
  outputPath: string;

  /** Actual duration of generated video */
  duration: number;

  /** Whether motion was applied successfully */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Processing time in milliseconds */
  processingTimeMs?: number;
}

/**
 * Strategy interface for animating static images
 *
 * Implements Strategy pattern for different motion effects.
 */
export interface MotionStrategy {
  /** Strategy identifier */
  readonly name: MotionStrategyName;

  /** Cost per clip in USD (0 for free strategies) */
  readonly costPerClip: number;

  /**
   * Apply motion effect to generate video from image
   */
  apply(options: MotionOptions): Promise<MotionResult>;

  /**
   * Check if strategy is available (dependencies installed)
   */
  isAvailable(): boolean;

  /**
   * Estimate cost for N clips
   */
  estimateCost(clipCount: number): number;
}
```

### Strategy Registry

```typescript
// src/visuals/motion/registry.ts

/**
 * Motion strategy metadata
 */
export interface MotionStrategyInfo {
  name: MotionStrategyName;
  displayName: string;
  description: string;
  costPerClip: number;
  dependencies: string[];
}

export const MOTION_STRATEGIES: Record<MotionStrategyName, MotionStrategyInfo> = {
  none: {
    name: 'none',
    displayName: 'None (Static)',
    description: 'No motion - use static frame or pass-through for videos',
    costPerClip: 0,
    dependencies: [],
  },
  kenburns: {
    name: 'kenburns',
    displayName: 'Ken Burns Effect',
    description: 'Classic zoom and pan effect using FFmpeg',
    costPerClip: 0,
    dependencies: ['ffmpeg'],
  },
  depthflow: {
    name: 'depthflow',
    displayName: 'DepthFlow 2.5D',
    description: '2.5D parallax animation using depth estimation',
    costPerClip: 0,
    dependencies: ['python', 'depthflow'],
  },
  veo: {
    name: 'veo',
    displayName: 'Veo Image-to-Video',
    description: 'Google Veo AI video generation (high quality)',
    costPerClip: 0.5,
    dependencies: ['GOOGLE_API_KEY'],
  },
};
```

---

## 3. Factory Functions

### Asset Provider Factory

```typescript
// src/visuals/providers/factory.ts

import { AssetProvider, ProviderName } from './types.js';
import { PexelsProvider } from './pexels-provider.js';
import { MockVideoProvider } from './mock-provider.js';
import { NanoBananaProvider } from './nanobanana-provider.js';
import { ConfigError } from '../../core/errors.js';

/**
 * Create an asset provider by name
 */
export function createAssetProvider(name: ProviderName): AssetProvider {
  switch (name) {
    case 'pexels':
      return new PexelsProvider();
    case 'nanobanana':
      return new NanoBananaProvider();
    case 'mock':
      return new MockVideoProvider();
    case 'pixabay':
      throw new ConfigError('Pixabay provider not yet implemented');
    case 'dalle':
      throw new ConfigError('DALL-E provider not yet implemented');
    case 'unsplash':
      throw new ConfigError('Unsplash provider not yet implemented');
    default:
      throw new ConfigError(`Unknown provider: ${name}`);
  }
}

/**
 * Check if any required providers are available
 */
export function getAvailableProviders(): ProviderName[] {
  const providers: ProviderName[] = ['pexels', 'nanobanana', 'mock'];
  return providers.filter((name) => {
    try {
      const provider = createAssetProvider(name);
      return provider.isAvailable();
    } catch {
      return false;
    }
  });
}
```

### Motion Strategy Factory

```typescript
// src/visuals/motion/factory.ts

import { MotionStrategy, MotionStrategyName } from './types.js';
import { NoneStrategy } from './none-strategy.js';
import { KenBurnsStrategy } from './kenburns-strategy.js';
import { DepthFlowStrategy } from './depthflow-strategy.js';
import { VeoStrategy } from './veo-strategy.js';
import { ConfigError } from '../../core/errors.js';

/**
 * Create a motion strategy by name
 */
export function createMotionStrategy(name: MotionStrategyName): MotionStrategy {
  switch (name) {
    case 'none':
      return new NoneStrategy();
    case 'kenburns':
      return new KenBurnsStrategy();
    case 'depthflow':
      return new DepthFlowStrategy();
    case 'veo':
      return new VeoStrategy();
    default:
      throw new ConfigError(`Unknown motion strategy: ${name}`);
  }
}

/**
 * Get available motion strategies
 */
export function getAvailableStrategies(): MotionStrategyName[] {
  const strategies: MotionStrategyName[] = ['none', 'kenburns', 'depthflow', 'veo'];
  return strategies.filter((name) => {
    try {
      const strategy = createMotionStrategy(name);
      return strategy.isAvailable();
    } catch {
      return false;
    }
  });
}
```

---

## 4. Extended Schema

### Updated VisualAsset Schema

```typescript
// src/visuals/schema.ts (additions)

/**
 * All valid visual sources
 */
export const VisualSourceEnum = z.enum([
  // Video sources (no motion needed)
  'stock-pexels',
  'stock-pixabay',
  'user-footage',

  // Image sources (require motion strategy)
  'generated-nanobanana',
  'generated-dalle',
  'stock-unsplash',

  // Fallbacks
  'fallback-color',
  'mock',
]);

export type VisualSource = z.infer<typeof VisualSourceEnum>;

/**
 * Motion strategy enum
 */
export const MotionStrategyEnum = z.enum(['none', 'kenburns', 'depthflow', 'veo']);

export type MotionStrategyType = z.infer<typeof MotionStrategyEnum>;

/**
 * Extended visual asset with motion support
 */
export const VisualAssetSchema = z.object({
  sceneId: z.string(),
  source: VisualSourceEnum,
  assetPath: z.string(),
  duration: z.number().positive(),

  // Asset type discriminator
  assetType: z.enum(['video', 'image']).default('video'),

  // Motion strategy (for images)
  motionStrategy: MotionStrategyEnum.optional(),
  motionApplied: z.boolean().default(false),

  // AI generation metadata
  generationPrompt: z.string().optional(),
  generationModel: z.string().optional(),
  generationCost: z.number().nonnegative().optional(),

  // Existing fields (unchanged)
  embeddingSimilarity: z.number().min(0).max(1).optional(),
  llmConfidence: z.number().min(0).max(1).optional(),
  matchReasoning: MatchReasoningSchema.optional(),
  visualCue: z.string().optional(),
  trimStart: z.number().nonnegative().optional(),
  trimEnd: z.number().positive().optional(),
  trimReasoning: z.string().optional(),
});
```

---

## 5. Implementation Examples

### Pexels Provider (Reference Implementation)

```typescript
// src/visuals/providers/pexels-provider.ts

export class PexelsProvider implements AssetProvider {
  readonly name = 'pexels';
  readonly assetType: AssetType = 'video';
  readonly requiresMotion = false;
  readonly costPerAsset = 0;

  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    const results = await searchPexels({
      query: options.query,
      orientation: options.orientation,
      perPage: options.perPage ?? 5,
    });

    return results.map((v) => ({
      id: String(v.id),
      url: v.url,
      type: 'video' as const,
      width: v.width,
      height: v.height,
      duration: v.duration,
      thumbnailUrl: v.thumbnailUrl,
    }));
  }

  isAvailable(): boolean {
    try {
      getApiKey('PEXELS_API_KEY');
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(assetCount: number): number {
    return 0; // Free
  }
}
```

### NanoBanana Provider (Image Generation)

```typescript
// src/visuals/providers/nanobanana-provider.ts

export class NanoBananaProvider implements AssetProvider {
  readonly name = 'nanobanana';
  readonly assetType: AssetType = 'image';
  readonly requiresMotion = true;
  readonly costPerAsset = 0.04;

  private client: GoogleGenerativeAI | null = null;

  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    // For compatibility, treat search as single generation
    const result = await this.generate(options.query, options);
    return [result];
  }

  async generate(prompt: string, options?: AssetSearchOptions): Promise<VisualAssetResult> {
    const client = this.getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const enhancedPrompt = this.buildPrompt(prompt, options);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    });

    const imageData = result.response.candidates?.[0]?.content?.parts?.[0];

    return {
      id: `nanobanana-${Date.now()}`,
      url: `data:image/png;base64,${imageData?.inlineData?.data}`,
      type: 'image',
      width: options?.orientation === 'portrait' ? 1080 : 1920,
      height: options?.orientation === 'portrait' ? 1920 : 1080,
    };
  }

  private buildPrompt(basePrompt: string, options?: AssetSearchOptions): string {
    const style = options?.style || 'cinematic, photorealistic';
    const aspectRatio = options?.aspectRatio || '9:16';
    return `${basePrompt}. Style: ${style}. Aspect ratio: ${aspectRatio}. High quality, professional.`;
  }

  isAvailable(): boolean {
    try {
      getApiKey('GOOGLE_API_KEY');
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(assetCount: number): number {
    return assetCount * this.costPerAsset;
  }
}
```

### Ken Burns Motion Strategy

```typescript
// src/visuals/motion/kenburns-strategy.ts

export class KenBurnsStrategy implements MotionStrategy {
  readonly name: MotionStrategyName = 'kenburns';
  readonly costPerClip = 0;

  async apply(options: MotionOptions): Promise<MotionResult> {
    const { inputPath, outputPath, duration, width, height, fps = 30 } = options;

    // Random zoom direction for variety
    const zoomIn = Math.random() > 0.5;
    const startScale = zoomIn ? 1.0 : 1.3;
    const endScale = zoomIn ? 1.3 : 1.0;

    const filter = `zoompan=z='if(lte(on,1),${startScale},lerp(${startScale},${endScale},on/${duration * fps}))':d=${duration * fps}:s=${width}x${height}:fps=${fps}`;

    const args = [
      '-loop',
      '1',
      '-i',
      inputPath,
      '-vf',
      filter,
      '-t',
      String(duration),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-y',
      outputPath,
    ];

    try {
      await execAsync(`ffmpeg ${args.join(' ')}`);
      return {
        outputPath,
        duration,
        success: true,
      };
    } catch (error) {
      return {
        outputPath,
        duration: 0,
        success: false,
        error: String(error),
      };
    }
  }

  isAvailable(): boolean {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(clipCount: number): number {
    return 0; // Free
  }
}
```

---

## 6. Testing Requirements

### Provider Tests

```typescript
// tests/unit/visuals/providers/nanobanana-provider.test.ts

describe('NanoBananaProvider', () => {
  it('implements AssetProvider interface', () => {
    const provider = new NanoBananaProvider();
    expect(provider.name).toBe('nanobanana');
    expect(provider.assetType).toBe('image');
    expect(provider.requiresMotion).toBe(true);
    expect(provider.costPerAsset).toBe(0.04);
  });

  it('returns unavailable when API key missing', () => {
    delete process.env.GOOGLE_API_KEY;
    const provider = new NanoBananaProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('estimates cost correctly', () => {
    const provider = new NanoBananaProvider();
    expect(provider.estimateCost(10)).toBe(0.4);
  });

  describe('generate()', () => {
    it('returns VisualAssetResult with image type', async () => {
      const provider = new NanoBananaProvider();
      // Use fake client for testing
      const result = await provider.generate('a sunset over mountains');

      expect(result.type).toBe('image');
      expect(result.url).toMatch(/^data:image/);
    });
  });
});
```

### Motion Strategy Tests

```typescript
// tests/unit/visuals/motion/kenburns-strategy.test.ts

describe('KenBurnsStrategy', () => {
  it('implements MotionStrategy interface', () => {
    const strategy = new KenBurnsStrategy();
    expect(strategy.name).toBe('kenburns');
    expect(strategy.costPerClip).toBe(0);
  });

  it('checks FFmpeg availability', () => {
    const strategy = new KenBurnsStrategy();
    // This will depend on test environment
    expect(typeof strategy.isAvailable()).toBe('boolean');
  });

  describe('apply()', () => {
    it('generates video from image', async () => {
      const strategy = new KenBurnsStrategy();
      if (!strategy.isAvailable()) return; // Skip if no FFmpeg

      const result = await strategy.apply({
        inputPath: 'test-fixtures/test-image.png',
        outputPath: 'test-output/kenburns-output.mp4',
        duration: 3,
        width: 1080,
        height: 1920,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBe(3);
    });
  });
});
```

---

## 7. Error Handling

### Provider Errors

```typescript
// src/visuals/providers/errors.ts

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, reason: string) {
    super(`Provider ${provider} is unavailable: ${reason}`, provider);
    this.name = 'ProviderUnavailableError';
  }
}

export class GenerationFailedError extends ProviderError {
  constructor(provider: string, prompt: string, cause?: Error) {
    super(`Failed to generate image for prompt: ${prompt}`, provider, cause);
    this.name = 'GenerationFailedError';
  }
}
```

### Motion Errors

```typescript
// src/visuals/motion/errors.ts

export class MotionError extends Error {
  constructor(
    message: string,
    public readonly strategy: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MotionError';
  }
}

export class MotionUnavailableError extends MotionError {
  constructor(strategy: string, missingDependency: string) {
    super(`Motion strategy ${strategy} requires ${missingDependency}`, strategy);
    this.name = 'MotionUnavailableError';
  }
}
```

---

## Next Steps

1. **Read** [Integration Guide](./VISUAL-PROVIDER-INTEGRATION-GUIDE-20260107.md) for adding new providers
2. **Implement** base interfaces in `src/visuals/providers/types.ts`
3. **Test** with mock providers before integrating real APIs
4. **Document** any deviations from this specification
