# Implementation Plan: Nano Banana Pro Visual Provider

**Date:** 2026-01-07  
**Phase:** Post-MVP Enhancement  
**Priority:** P2 (Nice-to-have for v1.5)  
**Estimated Effort:** 3-5 days

---

## Overview

This document outlines the implementation plan for adding Nano Banana Pro (Gemini image generation) as an alternative visual provider in Content Machine, complementing the existing Pexels stock footage provider.

## Goals

1. **Generate consistent visuals** from script scenes using AI image generation
2. **Support multiple motion strategies** (Veo, DepthFlow, Ken Burns)
3. **Maintain character consistency** across scenes
4. **Fall back gracefully** when API is unavailable

## Architecture

### Provider Interface Extension

```typescript
// src/visuals/providers/types.ts

export interface VisualProvider {
  name: string;
  generateVisuals(scenes: Scene[], config: VisualsConfig): Promise<VisualsOutput>;
}

export interface GenerativeVisualProvider extends VisualProvider {
  // Image generation
  generateImage(prompt: string, options?: ImageOptions): Promise<GeneratedImage>;
  generateKeyframe(scene: Scene, styleRef?: StyleReference): Promise<Keyframe>;

  // Character consistency
  generateCharacterSheet(description: string): Promise<CharacterSheet>;

  // Title cards
  generateTitleCard(config: TitleCardConfig): Promise<Buffer>;

  // Animation (optional - depends on Veo access)
  animateKeyframe?(keyframe: Keyframe, motion: MotionConfig): Promise<VideoClip>;
}

export interface ImageOptions {
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
  model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
  thinking?: boolean;
  searchGrounding?: boolean;
}

export interface StyleReference {
  characterSheet?: Buffer;
  styleGuide?: string;
  colorPalette?: string[];
}
```

### Provider Implementation

```
src/visuals/providers/
├── index.ts              # Provider factory
├── types.ts              # Shared interfaces
├── pexels.ts             # Existing Pexels provider
├── nanobanana/
│   ├── index.ts          # NanoBananaProvider class
│   ├── client.ts         # Gemini API client wrapper
│   ├── prompts.ts        # Prompt templates
│   ├── motion/
│   │   ├── index.ts      # Motion strategy factory
│   │   ├── veo.ts        # Veo image-to-video
│   │   ├── depthflow.ts  # DepthFlow 2.5D parallax
│   │   └── kenburns.ts   # FFmpeg Ken Burns
│   └── schema.ts         # Zod schemas
└── hybrid.ts             # Pexels + NanoBanana hybrid
```

### Zod Schemas

```typescript
// src/visuals/providers/nanobanana/schema.ts
import { z } from 'zod';

export const GeneratedImageSchema = z.object({
  buffer: z.instanceof(Buffer),
  prompt: z.string(),
  model: z.string(),
  aspectRatio: z.string(),
  generatedAt: z.string().datetime(),
});

export const KeyframeSchema = z.object({
  sceneId: z.string(),
  image: GeneratedImageSchema,
  timestamp: z.number(),
  motion: z.enum(['veo', 'depthflow', 'kenburns', 'static']).optional(),
});

export const CharacterSheetSchema = z.object({
  name: z.string(),
  description: z.string(),
  referenceImages: z.array(GeneratedImageSchema),
  styleGuide: z.string(),
});

export const TitleCardConfigSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  style: z.enum(['modern', 'bold', 'minimal', 'gradient']).default('modern'),
  colors: z
    .object({
      background: z.string(),
      text: z.string(),
    })
    .optional(),
});
```

## Implementation Tasks

### Task 1: Gemini API Client (1 day)

Create a typed wrapper for the Gemini image generation API:

```typescript
// src/visuals/providers/nanobanana/client.ts
export class NanoBananaClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateImage(prompt: string, options: ImageOptions): Promise<GeneratedImage> {
    // Implementation
  }

  async editImage(image: Buffer, prompt: string): Promise<GeneratedImage> {
    // Implementation
  }

  async generateWithReference(
    reference: Buffer,
    prompt: string,
    options: ImageOptions
  ): Promise<GeneratedImage> {
    // Implementation
  }
}
```

### Task 2: Prompt Templates (0.5 day)

Create typed prompt builders:

```typescript
// src/visuals/providers/nanobanana/prompts.ts
export function buildScenePrompt(scene: Scene, styleRef?: StyleReference): string {
  return `
    ${styleRef?.styleGuide || ''}
    Scene: ${scene.visualDescription}
    Mood: ${scene.mood || 'neutral'}
    Camera: ${scene.cameraAngle || 'eye level'}
    Lighting: ${scene.lighting || 'natural'}
    Aspect ratio: 9:16 vertical (portrait orientation)
    Quality: Photorealistic, high detail, 4K
  `.trim();
}

export function buildTitleCardPrompt(config: TitleCardConfig): string {
  // Implementation
}

export function buildCharacterSheetPrompt(description: string): string {
  // Implementation
}
```

### Task 3: Motion Strategies (1 day)

Implement motion strategy pattern:

```typescript
// src/visuals/providers/nanobanana/motion/index.ts
export interface MotionStrategy {
  name: string;
  apply(keyframe: Keyframe, config: MotionConfig): Promise<VideoClip>;
}

export function createMotionStrategy(type: MotionType): MotionStrategy {
  switch (type) {
    case 'veo':
      return new VeoMotionStrategy();
    case 'depthflow':
      return new DepthFlowMotionStrategy();
    case 'kenburns':
      return new KenBurnsMotionStrategy();
    default:
      return new StaticMotionStrategy();
  }
}
```

### Task 4: Provider Integration (1 day)

Integrate into existing visual pipeline:

```typescript
// src/visuals/providers/nanobanana/index.ts
export class NanoBananaProvider implements GenerativeVisualProvider {
  name = 'nanobanana';

  private client: NanoBananaClient;
  private motionStrategy: MotionStrategy;

  constructor(config: NanoBananaConfig) {
    this.client = new NanoBananaClient(config.apiKey);
    this.motionStrategy = createMotionStrategy(config.motionType);
  }

  async generateVisuals(scenes: Scene[], config: VisualsConfig): Promise<VisualsOutput> {
    // Generate character sheet if needed
    // Generate keyframes for each scene
    // Apply motion to each keyframe
    // Return structured output
  }
}
```

### Task 5: CLI Integration (0.5 day)

Add provider flag to `cm visuals`:

```typescript
// src/cli/commands/visuals.ts
program
  .command('visuals')
  .option('--provider <type>', 'Visual provider (pexels|nanobanana)', 'pexels')
  .option('--motion <type>', 'Motion strategy (veo|depthflow|kenburns)', 'kenburns')
  .option('--character-ref <path>', 'Character reference image for consistency');
```

### Task 6: Configuration (0.5 day)

Add configuration support:

```toml
# .content-machine.toml
[visuals]
provider = "nanobanana"  # pexels | nanobanana | hybrid

[visuals.nanobanana]
model = "gemini-2.5-flash-image"
motion_strategy = "adaptive"
character_consistency = true

[visuals.nanobanana.motion]
hero_scenes = "veo"
landscape_scenes = "depthflow"
default = "kenburns"
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/visuals/nanobanana.test.ts
describe('NanoBananaProvider', () => {
  it('should generate image with correct prompt structure', async () => {
    const fakeClient = new FakeNanoBananaClient();
    const provider = new NanoBananaProvider({ client: fakeClient });

    await provider.generateImage('test prompt', { aspectRatio: '9:16' });

    expect(fakeClient.lastPrompt).toContain('9:16');
  });

  it('should apply motion strategy to keyframes', async () => {
    // Test motion application
  });
});
```

### Integration Tests

```typescript
// tests/integration/nanobanana.test.ts
describe('NanoBanana Integration', () => {
  it('should generate keyframes for script scenes', async () => {
    const script = await loadFixture('script-listicle.json');
    const provider = NanoBananaProvider.create(config);

    const visuals = await provider.generateVisuals(script.scenes, {});

    expect(visuals.keyframes).toHaveLength(script.scenes.length);
  });
});
```

### E2E Test

```bash
# Test full pipeline with nanobanana
cm generate "5 TypeScript tips" --archetype listicle --provider nanobanana -o test-output.mp4
```

## Fallback Strategy

```typescript
// src/visuals/providers/hybrid.ts
export class HybridProvider implements VisualProvider {
  private primary: NanoBananaProvider;
  private fallback: PexelsProvider;

  async generateVisuals(scenes: Scene[], config: VisualsConfig): Promise<VisualsOutput> {
    try {
      return await this.primary.generateVisuals(scenes, config);
    } catch (error) {
      if (isRateLimitError(error) || isApiUnavailable(error)) {
        console.warn('NanoBanana unavailable, falling back to Pexels');
        return await this.fallback.generateVisuals(scenes, config);
      }
      throw error;
    }
  }
}
```

## Cost Tracking

```typescript
// src/visuals/providers/nanobanana/cost.ts
export interface CostTracker {
  imageGenerations: number;
  videoGenerations: number;
  estimatedCostUSD: number;
}

export function estimateCost(operations: Operation[]): number {
  return operations.reduce((total, op) => {
    switch (op.type) {
      case 'image':
        return total + 0.01;
      case 'video':
        return total + 0.5;
      default:
        return total;
    }
  }, 0);
}
```

## Migration Path

### Phase 1: Title Cards Only (Low Risk)

- Add NanoBanana for title card generation only
- Keep Pexels for all other visuals

### Phase 2: Hybrid Mode (Medium Risk)

- Use NanoBanana for generated content (title cards, infographics)
- Use Pexels for b-roll and backgrounds

### Phase 3: Full Generation (Higher Risk)

- Full Nano Banana Pro for all visuals
- Veo for hero shots
- DepthFlow/Ken Burns for cost savings

## Dependencies

```json
{
  "@google/generative-ai": "^0.21.0"
}
```

Optional (for local motion):

- `depthflow` CLI tool
- `ffmpeg` CLI tool

## Success Metrics

| Metric                        | Target | Measurement               |
| ----------------------------- | ------ | ------------------------- |
| Image generation success rate | ≥95%   | API response success      |
| Character consistency         | ≥0.85  | CLIP embedding similarity |
| Generation latency            | <30s   | P95 response time         |
| Cost per video                | <$2    | API cost tracking         |

## Related Documents

- [RQ-35: Nano Banana Pro Integration](./investigations/RQ-35-NANOBANANA-PRO-INTEGRATION-20260107.md)
- [Nano Banana Video Pipeline Guide](../dev/guides/NANOBANANA-VIDEO-PIPELINE-GUIDE-20260107.md)
- [Prompt Engineering Reference](../reference/NANOBANANA-PROMPT-ENGINEERING-20260107.md)
- [Vendored Libraries Index](./VENDORED-PROMPT-VIDEO-LIBRARIES-INDEX-20260107.md)
