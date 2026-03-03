# ADR-002: Visual Provider System Architecture

**Status:** Accepted  
**Date:** 2026-01-07  
**Author:** Content Machine Team  
**Supersedes:** None  
**Related:** [SYSTEM-DESIGN-20260104.md](./SYSTEM-DESIGN-20260104.md), [RQ-35 Nano Banana Pro](../research/investigations/RQ-35-NANOBANANA-PRO-INTEGRATION-20260107.md)

---

## Context

The current `cm visuals` pipeline uses Pexels (stock video) as the sole source for visual content. Users have requested the ability to use AI-generated images instead of stock footage, particularly using Google's Gemini image generation models (nicknamed "Nano Banana Pro").

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Visual Pipeline                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Keywords ─────▶ PexelsProvider ─────▶ Video URLs           │
│                   (stock video)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Requirements

1. **Backward Compatibility** — Existing Pexels workflow must remain default
2. **Pluggable Providers** — Support multiple visual sources (stock, AI-generated)
3. **Motion Strategies** — Static images need motion applied (Ken Burns, DepthFlow, Veo)
4. **User Choice** — CLI flags and config to select providers
5. **Cost Visibility** — AI generation costs should be estimated before execution

---

## Decision

We will implement a **two-tier provider system** that separates:

1. **Asset Providers** — Sources of visual content (video or image)
2. **Motion Strategies** — Methods to animate static images into video

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Visual Provider System v2                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        Asset Providers                                 │  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   Pexels    │  │  Pixabay    │  │ NanoBanana  │  │   DALL-E    │   │  │
│  │  │  (Video)    │  │  (Video)    │  │  (Image)    │  │  (Image)    │   │  │
│  │  │  DEFAULT    │  │             │  │             │  │             │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │  │
│  │         │                │                │                │          │  │
│  │         ▼                ▼                ▼                ▼          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    VisualAsset (unified type)                   │  │  │
│  │  │  - sceneId, source, assetPath, duration, assetType (video|img) │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                      │
│                                       ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     Motion Strategies (for images)                     │  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   none      │  │  kenburns   │  │  depthflow  │  │    veo      │   │  │
│  │  │ (skip/pass) │  │ (FFmpeg pan)│  │ (2.5D depth)│  │ (img2video) │   │  │
│  │  │  DEFAULT    │  │    FREE     │  │    FREE     │  │  ~$0.50/clip│   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                        │  │
│  │  Images + motion strategy ────▶ Video clips ready for Remotion        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Provider Types

### 1. Video Providers (Return videos directly)

| Provider    | Source Type     | Cost | Output    |
| ----------- | --------------- | ---- | --------- |
| **Pexels**  | `stock-pexels`  | Free | Video URL |
| **Pixabay** | `stock-pixabay` | Free | Video URL |

### 2. Image Providers (Return images, need motion)

| Provider       | Source Type            | Cost         | Output          |
| -------------- | ---------------------- | ------------ | --------------- |
| **NanoBanana** | `generated-nanobanana` | ~$0.04/image | Generated image |
| **DALL-E**     | `generated-dalle`      | ~$0.04/image | Generated image |
| **Unsplash**   | `stock-unsplash`       | Free         | Stock image     |

### 3. Motion Strategies (Animate images to video)

| Strategy      | Cost        | Quality   | Speed   | Description                             |
| ------------- | ----------- | --------- | ------- | --------------------------------------- |
| **none**      | Free        | N/A       | Instant | Static frame (for video providers)      |
| **kenburns**  | Free        | Medium    | Fast    | FFmpeg zoom/pan effects                 |
| **depthflow** | Free        | High      | Medium  | 2.5D depth parallax (via vendored tool) |
| **veo**       | ~$0.50/clip | Very High | Slow    | Gemini image-to-video                   |

---

## Schema Changes

### Extended Source Enum

```typescript
// src/visuals/schema.ts
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
```

### Extended VisualAsset

```typescript
export const VisualAssetSchema = z.object({
  sceneId: z.string(),
  source: VisualSourceEnum,
  assetPath: z.string(),
  duration: z.number().positive(),

  // New fields for image providers
  assetType: z.enum(['video', 'image']).default('video'),
  motionStrategy: z.enum(['none', 'kenburns', 'depthflow', 'veo']).optional(),
  motionApplied: z.boolean().default(false),
  generationPrompt: z.string().optional(), // For AI-generated images

  // Existing fields...
  matchReasoning: MatchReasoningSchema.optional(),
  // ...
});
```

---

## Configuration

### CLI Flags

```bash
# Use stock video (default, backward compatible)
cm visuals --input timestamps.json

# Use AI-generated images with Ken Burns motion
cm visuals --input timestamps.json \
  --asset-provider nanobanana \
  --motion-strategy kenburns

# Use AI images with Veo motion (premium)
cm visuals --input timestamps.json \
  --asset-provider nanobanana \
  --motion-strategy veo

# Hybrid: try stock first, fall back to AI
cm visuals --input timestamps.json \
  --asset-provider pexels,nanobanana \
  --fallback-mode cascade
```

### Config File

```toml
# .content-machine.toml

[visuals]
# Primary asset provider (default: pexels)
provider = "pexels"

# Fallback chain when primary fails
fallback_providers = ["nanobanana", "unsplash"]

# Motion strategy for image providers (default: kenburns)
motion_strategy = "kenburns"

# Cost controls
max_generation_cost = 5.00  # USD, abort if exceeded
warn_at_cost = 2.00        # USD, show warning
```

---

## Provider Interface

```typescript
// src/visuals/providers/types.ts

export type AssetType = 'video' | 'image';

export interface VisualAssetResult {
  id: string;
  url: string;
  type: AssetType;
  width: number;
  height: number;
  duration?: number; // For videos
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface AssetSearchOptions {
  query: string;
  orientation: 'portrait' | 'landscape' | 'square';
  perPage?: number;
  aspectRatio?: string; // For image generators
  style?: string; // For image generators
}

/**
 * Unified interface for all asset providers (video or image)
 */
export interface AssetProvider {
  readonly name: string;
  readonly assetType: AssetType;
  readonly requiresMotion: boolean;
  readonly costPerAsset: number; // USD, 0 for free

  search(options: AssetSearchOptions): Promise<VisualAssetResult[]>;
  generate?(prompt: string, options?: AssetSearchOptions): Promise<VisualAssetResult>;
  isAvailable(): boolean;
  estimateCost(assetCount: number): number;
}
```

---

## Motion Strategy Interface

```typescript
// src/visuals/motion/types.ts

export interface MotionOptions {
  inputPath: string; // Path to source image
  outputPath: string; // Path for output video
  duration: number; // Target duration in seconds
  width: number;
  height: number;
  fps?: number; // Default: 30
}

export interface MotionResult {
  outputPath: string;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Strategy interface for animating static images
 */
export interface MotionStrategy {
  readonly name: string;
  readonly costPerClip: number; // USD, 0 for free

  apply(options: MotionOptions): Promise<MotionResult>;
  isAvailable(): boolean;
  estimateCost(clipCount: number): number;
}
```

---

## Backward Compatibility

### Default Behavior (Unchanged)

```bash
# These commands work exactly as before
cm visuals --input timestamps.json
cm visuals --input timestamps.json --provider pexels
cm generate "topic" --archetype listicle
```

### Migration Path

1. **v1.0** (current): Only video providers (Pexels)
2. **v1.1** (this change): Add image providers + motion, Pexels remains default
3. **v1.2** (future): Add hybrid mode, automatic provider selection

### Deprecation Strategy

- `--provider pexels` continues to work indefinitely
- New `--asset-provider` and `--motion-strategy` flags added
- Old flags emit no warnings (silent compatibility)

---

## Cost Management

### Estimation Before Execution

```typescript
interface CostEstimate {
  assetCount: number;
  assetCost: number; // From AssetProvider.estimateCost()
  motionCost: number; // From MotionStrategy.estimateCost()
  totalCost: number;
  breakdown: {
    provider: string;
    strategy: string;
    perAssetCost: number;
    perClipMotionCost: number;
  };
}

async function estimateVisualsCost(options: MatchVisualsOptions): Promise<CostEstimate>;
```

### User Confirmation Flow

```
Estimated cost for 8 scenes:
  • NanoBanana image generation: 8 × $0.04 = $0.32
  • Veo motion (img→video):      8 × $0.50 = $4.00
  ─────────────────────────────────────────────────
  Total: $4.32

Proceed? [y/N]
```

---

## Implementation Phases

### Phase 1: Schema & Interface (This PR)

- [ ] Extend `VisualSourceEnum` with generated sources
- [ ] Add `assetType` and `motionStrategy` to schema
- [ ] Define `AssetProvider` interface
- [ ] Define `MotionStrategy` interface
- [ ] Refactor `PexelsProvider` to implement new interface

### Phase 2: Motion Strategies

- [ ] Implement `KenBurnsStrategy` (FFmpeg)
- [ ] Implement `DepthFlowStrategy` (vendor integration)
- [ ] Add `--motion-strategy` CLI flag

### Phase 3: Image Providers

- [ ] Implement `NanoBananaProvider` (Gemini)
- [ ] Implement `DalleProvider` (OpenAI)
- [ ] Add `--asset-provider` CLI flag
- [ ] Add cost estimation and confirmation

### Phase 4: Hybrid Mode

- [ ] Implement provider fallback chains
- [ ] Add `--fallback-mode` CLI flag
- [ ] Smart provider selection based on scene content

---

## Alternatives Considered

### 1. Separate Commands (Rejected)

```bash
cm visuals-stock --input timestamps.json  # Stock only
cm visuals-ai --input timestamps.json     # AI only
```

**Rejected because:** Fragments user experience, doesn't allow hybrid approaches.

### 2. Prompt-Based Selection (Deferred)

Use LLM to analyze scene content and choose optimal provider automatically.

**Deferred because:** Adds complexity, better as Phase 4 enhancement.

### 3. All-in-One Provider (Rejected)

Single provider class that handles all sources internally.

**Rejected because:** Violates Single Responsibility Principle, hard to extend.

---

## Consequences

### Positive

- Users can choose AI-generated visuals when stock footage doesn't match
- Clear cost visibility before execution
- Extensible for future providers (Midjourney, Stable Diffusion)
- Backward compatible with all existing workflows

### Negative

- Increased complexity in matcher.ts
- Need to manage external dependencies (DepthFlow, FFmpeg)
- Cost estimation adds latency before execution

### Risks

- AI generation quality may not meet user expectations
- Motion strategy output quality varies by source image
- External service rate limits (Gemini API)

---

## References

- [SYSTEM-DESIGN-20260104.md](./SYSTEM-DESIGN-20260104.md) §7.3 cm visuals
- [RQ-35 Nano Banana Pro Investigation](../research/investigations/RQ-35-NANOBANANA-PRO-INTEGRATION-20260107.md)
- [Vendored Prompt Libraries](../../vendor/prompt-libraries/)
- [DepthFlow Documentation](../../vendor/video-effects/DepthFlow/)
