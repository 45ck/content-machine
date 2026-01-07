# Visual Provider Integration Guide

**Version:** 1.0.0  
**Date:** 2026-01-07  
**Audience:** Developers adding new visual providers  
**Related:** [ADR-002](./ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md), [Interface Spec](./VISUAL-PROVIDER-INTERFACE-SPEC-20260107.md)

---

## Quick Start

Adding a new visual provider involves three steps:

1. **Implement** the `AssetProvider` interface
2. **Register** in the factory
3. **Test** with unit and integration tests

---

## Part 1: Implementing an Asset Provider

### Step 1: Create Provider File

```
src/visuals/providers/
├── index.ts              # Exports and factory
├── types.ts              # Interface definitions
├── pexels-provider.ts    # Video provider (reference)
├── mock-provider.ts      # Test provider
└── your-provider.ts      # ← Create this
```

### Step 2: Implement the Interface

```typescript
// src/visuals/providers/your-provider.ts

import type { AssetProvider, AssetType, AssetSearchOptions, VisualAssetResult } from './types.js';
import { getApiKey, getOptionalApiKey } from '../../core/config.js';
import { createLogger } from '../../core/logger.js';
import { ProviderError, GenerationFailedError } from './errors.js';

const log = createLogger({ module: 'your-provider' });

export class YourProvider implements AssetProvider {
  // =========================================================================
  // Required Properties
  // =========================================================================

  /** Unique identifier - used in CLI flags and config */
  readonly name = 'yourprovider';

  /** What this provider returns - 'video' or 'image' */
  readonly assetType: AssetType = 'image';

  /** Does output need motion applied? True for image providers */
  readonly requiresMotion = true;

  /** Cost per asset in USD. Set to 0 for free providers */
  readonly costPerAsset = 0.05;

  // =========================================================================
  // API Client (if needed)
  // =========================================================================

  private client: YourAPIClient | null = null;

  private getClient(): YourAPIClient {
    if (!this.client) {
      const apiKey = getApiKey('YOUR_API_KEY');
      this.client = new YourAPIClient(apiKey);
    }
    return this.client;
  }

  // =========================================================================
  // Required Methods
  // =========================================================================

  /**
   * Search for assets matching the query.
   *
   * For stock providers: Search their library
   * For AI providers: Can wrap generate() for compatibility
   */
  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    log.debug({ query: options.query }, 'Searching for assets');

    try {
      // For AI providers, search = single generation
      const result = await this.generate(options.query, options);
      return [result];
    } catch (error) {
      log.error({ error, query: options.query }, 'Search failed');
      throw new ProviderError(`Search failed: ${error}`, this.name);
    }
  }

  /**
   * Generate an asset from a prompt.
   *
   * Required for AI providers, optional for stock providers.
   */
  async generate(prompt: string, options?: AssetSearchOptions): Promise<VisualAssetResult> {
    log.info({ prompt }, 'Generating asset');

    const client = this.getClient();

    try {
      const response = await client.generate({
        prompt: this.enhancePrompt(prompt, options),
        width: this.getWidth(options?.orientation),
        height: this.getHeight(options?.orientation),
      });

      return {
        id: response.id,
        url: response.url,
        type: 'image',
        width: response.width,
        height: response.height,
        metadata: {
          model: response.model,
          seed: response.seed,
        },
      };
    } catch (error) {
      log.error({ error, prompt }, 'Generation failed');
      throw new GenerationFailedError(this.name, prompt, error as Error);
    }
  }

  /**
   * Check if provider is available.
   *
   * Return false if:
   * - API key not set
   * - Service unreachable
   * - Required dependencies missing
   */
  isAvailable(): boolean {
    try {
      getApiKey('YOUR_API_KEY');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estimate cost for N assets.
   */
  estimateCost(assetCount: number): number {
    return assetCount * this.costPerAsset;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private enhancePrompt(basePrompt: string, options?: AssetSearchOptions): string {
    const parts = [basePrompt];

    if (options?.style) {
      parts.push(`Style: ${options.style}`);
    }

    if (options?.orientation === 'portrait') {
      parts.push('Vertical composition, 9:16 aspect ratio');
    }

    return parts.join('. ');
  }

  private getWidth(orientation?: string): number {
    return orientation === 'landscape' ? 1920 : 1080;
  }

  private getHeight(orientation?: string): number {
    return orientation === 'landscape' ? 1080 : 1920;
  }
}
```

### Step 3: Register in Factory

```typescript
// src/visuals/providers/index.ts

import { YourProvider } from './your-provider.js';

// Add to ProviderName type
export type ProviderName = 'pexels' | 'pixabay' | 'nanobanana' | 'yourprovider' | 'mock';

// Add to factory
export function createAssetProvider(name: ProviderName): AssetProvider {
  switch (name) {
    case 'pexels':
      return new PexelsProvider();
    case 'nanobanana':
      return new NanoBananaProvider();
    case 'yourprovider': // ← Add this
      return new YourProvider();
    case 'mock':
      return new MockVideoProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

// Export your provider
export { YourProvider } from './your-provider.js';
```

### Step 4: Update Schema

```typescript
// src/visuals/schema.ts

export const VisualSourceEnum = z.enum([
  'stock-pexels',
  'stock-pixabay',
  'generated-nanobanana',
  'generated-yourprovider', // ← Add this
  'user-footage',
  'fallback-color',
  'mock',
]);
```

---

## Part 2: Implementing a Motion Strategy

Motion strategies animate static images into video clips.

### Step 1: Create Strategy File

```
src/visuals/motion/
├── index.ts              # Exports and factory
├── types.ts              # Interface definitions
├── none-strategy.ts      # Pass-through
├── kenburns-strategy.ts  # FFmpeg zoom/pan
└── your-strategy.ts      # ← Create this
```

### Step 2: Implement the Interface

```typescript
// src/visuals/motion/your-strategy.ts

import type { MotionStrategy, MotionStrategyName, MotionOptions, MotionResult } from './types.js';
import { createLogger } from '../../core/logger.js';
import { MotionError } from './errors.js';
import { execAsync } from '../../core/exec.js';

const log = createLogger({ module: 'your-strategy' });

export class YourStrategy implements MotionStrategy {
  readonly name: MotionStrategyName = 'yourstrategy';
  readonly costPerClip = 0; // Free for local processing

  async apply(options: MotionOptions): Promise<MotionResult> {
    const { inputPath, outputPath, duration, width, height, fps = 30 } = options;

    log.info({ inputPath, duration }, 'Applying motion effect');

    const startTime = Date.now();

    try {
      // Your motion logic here
      // Example: Call external tool, use FFmpeg, etc.

      await execAsync(
        `your-tool --input "${inputPath}" --output "${outputPath}" --duration ${duration}`
      );

      return {
        outputPath,
        duration,
        success: true,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error({ error, inputPath }, 'Motion effect failed');
      return {
        outputPath,
        duration: 0,
        success: false,
        error: String(error),
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  isAvailable(): boolean {
    try {
      // Check if your dependencies are installed
      execSync('your-tool --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(clipCount: number): number {
    return clipCount * this.costPerClip;
  }
}
```

### Step 3: Register in Factory

```typescript
// src/visuals/motion/index.ts

import { YourStrategy } from './your-strategy.js';

export type MotionStrategyName = 'none' | 'kenburns' | 'depthflow' | 'veo' | 'yourstrategy';

export function createMotionStrategy(name: MotionStrategyName): MotionStrategy {
  switch (name) {
    case 'none':
      return new NoneStrategy();
    case 'kenburns':
      return new KenBurnsStrategy();
    case 'yourstrategy': // ← Add this
      return new YourStrategy();
    default:
      throw new Error(`Unknown strategy: ${name}`);
  }
}
```

---

## Part 3: Testing

### Unit Tests

Create test file at `tests/unit/visuals/providers/your-provider.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YourProvider } from '../../../../src/visuals/providers/your-provider.js';

describe('YourProvider', () => {
  // =========================================================================
  // Interface Compliance Tests
  // =========================================================================

  describe('interface compliance', () => {
    it('has correct name', () => {
      const provider = new YourProvider();
      expect(provider.name).toBe('yourprovider');
    });

    it('has correct asset type', () => {
      const provider = new YourProvider();
      expect(provider.assetType).toBe('image');
    });

    it('requires motion for images', () => {
      const provider = new YourProvider();
      expect(provider.requiresMotion).toBe(true);
    });

    it('has non-negative cost', () => {
      const provider = new YourProvider();
      expect(provider.costPerAsset).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Availability Tests
  // =========================================================================

  describe('isAvailable()', () => {
    afterEach(() => {
      delete process.env.YOUR_API_KEY;
    });

    it('returns false when API key missing', () => {
      delete process.env.YOUR_API_KEY;
      const provider = new YourProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true when API key present', () => {
      process.env.YOUR_API_KEY = 'test-key';
      const provider = new YourProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  // =========================================================================
  // Cost Estimation Tests
  // =========================================================================

  describe('estimateCost()', () => {
    it('calculates cost correctly', () => {
      const provider = new YourProvider();
      expect(provider.estimateCost(0)).toBe(0);
      expect(provider.estimateCost(1)).toBe(provider.costPerAsset);
      expect(provider.estimateCost(10)).toBe(provider.costPerAsset * 10);
    });
  });

  // =========================================================================
  // Search/Generate Tests (with mocks)
  // =========================================================================

  describe('search()', () => {
    it('returns array of results', async () => {
      process.env.YOUR_API_KEY = 'test-key';
      const provider = new YourProvider();

      // Mock the API client
      vi.spyOn(provider as any, 'getClient').mockReturnValue({
        generate: vi.fn().mockResolvedValue({
          id: 'test-123',
          url: 'https://example.com/image.png',
          width: 1080,
          height: 1920,
        }),
      });

      const results = await provider.search({
        query: 'sunset',
        orientation: 'portrait',
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
        type: 'image',
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });
  });
});
```

### Integration Tests

Create test file at `tests/integration/visuals/your-provider.integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { YourProvider } from '../../../src/visuals/providers/your-provider.js';

describe('YourProvider Integration', () => {
  // Skip if API key not available
  const provider = new YourProvider();
  const hasApiKey = provider.isAvailable();

  it.skipIf(!hasApiKey)(
    'generates real image',
    async () => {
      const results = await provider.search({
        query: 'a beautiful mountain landscape at sunset',
        orientation: 'portrait',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].url).toMatch(/^https?:\/\/|^data:image/);
    },
    30000
  ); // 30s timeout for API calls
});
```

---

## Part 4: Adding CLI Support

### Update CLI Command

```typescript
// src/cli/commands/visuals.ts

export const visualsCommand = new Command('visuals')
  .description('Find matching stock footage for script scenes')
  .requiredOption('-i, --input <path>', 'Input timestamps JSON file')
  .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')

  // Existing options
  .option('--provider <provider>', 'Stock footage provider', 'pexels')
  .option('--orientation <type>', 'Footage orientation', 'portrait')

  // New options for image generation
  .option('--asset-provider <provider>', 'Asset provider (pexels, nanobanana, yourprovider)')
  .option('--motion-strategy <strategy>', 'Motion strategy for images (kenburns, depthflow, veo)')
  .option('--estimate-cost', 'Show cost estimate before execution', false)
  .option('--max-cost <usd>', 'Maximum allowed cost in USD')

  .action(async (options) => {
    // Determine provider (new flag takes precedence)
    const providerName = options.assetProvider || options.provider;
    const motionStrategy = options.motionStrategy || 'kenburns';

    // ... rest of implementation
  });
```

### Update Config Schema

```typescript
// src/core/config.ts

const VisualsConfigSchema = z.object({
  // Existing
  provider: z.enum(['pexels', 'pixabay']).default('pexels'),
  cacheEnabled: z.boolean().default(true),
  cacheTtl: z.number().int().positive().default(3600),

  // New options
  assetProvider: z
    .enum(['pexels', 'pixabay', 'nanobanana', 'dalle', 'unsplash', 'yourprovider'])
    .optional(),
  motionStrategy: z.enum(['none', 'kenburns', 'depthflow', 'veo']).default('kenburns'),
  maxGenerationCost: z.number().positive().optional(),
  warnAtCost: z.number().positive().optional(),
  confirmBeforeGeneration: z.boolean().default(true),
});
```

---

## Part 5: Checklist

### Before Submitting PR

- [ ] **Interface Compliance**
  - [ ] Implements all required properties (`name`, `assetType`, `requiresMotion`, `costPerAsset`)
  - [ ] Implements all required methods (`search`, `isAvailable`, `estimateCost`)
  - [ ] Optional `generate()` method for AI providers

- [ ] **Error Handling**
  - [ ] Throws `ProviderError` for API failures
  - [ ] Throws `GenerationFailedError` for generation failures
  - [ ] Logs errors with context

- [ ] **Testing**
  - [ ] Unit tests for interface compliance
  - [ ] Unit tests for availability checking
  - [ ] Unit tests for cost estimation
  - [ ] Integration tests (skippable if no API key)
  - [ ] All tests pass: `npm test`

- [ ] **Documentation**
  - [ ] JSDoc comments on public methods
  - [ ] Updated this guide with provider-specific notes
  - [ ] Added to provider comparison table

- [ ] **Registration**
  - [ ] Added to `ProviderName` type
  - [ ] Added to factory function
  - [ ] Added to schema `VisualSourceEnum`
  - [ ] Exported from `index.ts`

---

## Provider Comparison Table

| Provider       | Type  | Cost  | Quality   | Speed  | API Key            |
| -------------- | ----- | ----- | --------- | ------ | ------------------ |
| **pexels**     | video | Free  | High      | Fast   | `PEXELS_API_KEY`   |
| **pixabay**    | video | Free  | Medium    | Fast   | `PIXABAY_API_KEY`  |
| **nanobanana** | image | $0.04 | Very High | Medium | `GOOGLE_API_KEY`   |
| **dalle**      | image | $0.04 | Very High | Medium | `OPENAI_API_KEY`   |
| **unsplash**   | image | Free  | High      | Fast   | `UNSPLASH_API_KEY` |

---

## Motion Strategy Comparison

| Strategy      | Cost  | Quality   | Speed   | Dependencies      |
| ------------- | ----- | --------- | ------- | ----------------- |
| **none**      | Free  | N/A       | Instant | None              |
| **kenburns**  | Free  | Medium    | Fast    | FFmpeg            |
| **depthflow** | Free  | High      | Medium  | Python, DepthFlow |
| **veo**       | $0.50 | Very High | Slow    | `GOOGLE_API_KEY`  |

---

## Troubleshooting

### Common Issues

**Q: Provider shows as unavailable**

```
A: Check that the API key is set in .env:
   YOUR_API_KEY=your-key-here

   Then verify with:
   node -e "console.log(process.env.YOUR_API_KEY)"
```

**Q: Tests fail with "Unknown provider"**

```
A: Make sure you added the provider to:
   1. ProviderName type in types.ts
   2. createAssetProvider() in index.ts
   3. VisualSourceEnum in schema.ts
```

**Q: Motion strategy not applying**

```
A: Check that:
   1. Your provider's assetType is 'image'
   2. Your provider's requiresMotion is true
   3. The motion strategy is available (check dependencies)
```

---

## Examples

### Minimal Video Provider

```typescript
export class MinimalVideoProvider implements AssetProvider {
  readonly name = 'minimal';
  readonly assetType: AssetType = 'video';
  readonly requiresMotion = false;
  readonly costPerAsset = 0;

  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    return [
      {
        id: '1',
        url: 'https://example.com/video.mp4',
        type: 'video',
        width: 1080,
        height: 1920,
      },
    ];
  }

  isAvailable(): boolean {
    return true;
  }
  estimateCost(n: number): number {
    return 0;
  }
}
```

### Minimal Image Provider

```typescript
export class MinimalImageProvider implements AssetProvider {
  readonly name = 'minimal-img';
  readonly assetType: AssetType = 'image';
  readonly requiresMotion = true;
  readonly costPerAsset = 0.01;

  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    return [await this.generate(options.query, options)];
  }

  async generate(prompt: string): Promise<VisualAssetResult> {
    return {
      id: '1',
      url: 'https://example.com/image.png',
      type: 'image',
      width: 1080,
      height: 1920,
    };
  }

  isAvailable(): boolean {
    return true;
  }
  estimateCost(n: number): number {
    return n * this.costPerAsset;
  }
}
```
