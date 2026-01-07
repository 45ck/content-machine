# DP-03: Builder Pattern for Complex Object Construction

**Date:** 2026-01-07  
**Status:** Research Complete  
**Category:** Design Patterns  
**Priority:** P1 (Important)  
**Pattern Type:** GoF Builder

---

## 1. Executive Summary

The **Builder Pattern** addresses the problem of constructing complex objects with many optional parameters. In content-machine, `PipelineOptions`, `RenderProps`, and script generation all involve numerous configuration parameters. This document analyzes the current approach and proposes fluent builder implementations.

---

## 2. Problem Statement

### 2.1 Current Pain Points

**Pipeline Options Explosion:**

```typescript
// src/core/pipeline.ts - 14+ fields, many optional
export interface PipelineOptions {
  topic: string;
  archetype: Archetype;
  orientation: Orientation;
  voice: string;
  targetDuration: number;
  outputPath: string;
  keepArtifacts?: boolean;
  workDir?: string;
  onProgress?: (stage: PipelineStage, message: string) => void;
  llmProvider?: LLMProvider;
  mock?: boolean;
  research?: ResearchOutput;
  // Future: music, watermark, transitions...
}
```

**CLI Command Construction:**

```typescript
// src/cli/commands/generate.ts - Manual object assembly
await runPipeline({
  topic,
  archetype,
  orientation,
  voice: options.voice,
  targetDuration: parseInt(options.duration, 10),
  outputPath: options.output,
  keepArtifacts: options.keepArtifacts,
  llmProvider,
  mock: options.mock,
  research,
  onProgress: createProgressHandler(spinners),
});
```

### 2.2 Issues with Plain Objects

| Issue                  | Example                                    |
| ---------------------- | ------------------------------------------ |
| **No validation**      | `targetDuration: -5` silently accepted     |
| **No defaults**        | Must repeat `voice: 'af_heart'` everywhere |
| **No discoverability** | IDE doesn't guide valid combinations       |
| **Testing verbosity**  | Full object required even for simple tests |
| **Parameter ordering** | Easy to swap orientation/archetype         |

---

## 3. Builder Pattern Solution

### 3.1 Core Concept

```
┌────────────────────────────────────────────────────────────┐
│                     Builder Usage                          │
│                                                            │
│   const options = new PipelineBuilder()                    │
│     .topic("Redis vs PostgreSQL")      // Required         │
│     .archetype('versus')               // Required         │
│     .orientation('portrait')           // Optional         │
│     .withResearch(researchData)        // Optional         │
│     .forTesting()                      // Preset           │
│     .build();                          // Validates & Returns│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Benefits

| Benefit             | Description                                   |
| ------------------- | --------------------------------------------- |
| **Fluent API**      | Method chaining with IDE autocomplete         |
| **Validation**      | Build-time validation before pipeline runs    |
| **Defaults**        | Sensible defaults applied automatically       |
| **Presets**         | `.forTesting()`, `.forProduction()` shortcuts |
| **Immutability**    | Each method returns new builder (optional)    |
| **Discoverability** | IDE shows available configuration methods     |

---

## 4. Vendor Evidence

### 4.1 Remotion Config Builder Pattern

```typescript
// vendor/Remotion - Config uses builder-like composition
export const config = {
  ...defaultConfig,
  overrideOutput: 'video.mp4',
  chromiumOptions: {
    enableAcceleration: true,
  },
};
```

### 4.2 OpenAI Agents SDK

```typescript
// vendor/openai-agents-js - Fluent agent construction
const agent = new Agent()
  .withTool(calculatorTool)
  .withSystemPrompt('You are helpful')
  .withModel('gpt-4o')
  .build();
```

### 4.3 Current config.ts Pattern

```typescript
// Our existing Zod schemas provide validation
export const ConfigSchema = z.object({
  defaults: DefaultsSchema.default({}),
  llm: LLMConfigSchema.default({}),
  audio: AudioConfigSchema.default({}),
  // ...
});
```

---

## 5. Proposed Implementation

### 5.1 PipelineBuilder

```typescript
// src/core/builders/pipeline-builder.ts

import { z } from 'zod';
import type { PipelineOptions, PipelineStage } from '../pipeline';
import type { Archetype, Orientation } from '../config';
import type { LLMProvider } from '../llm';
import type { ResearchOutput } from '../../research/schema';
import { ConfigError } from '../errors';

/**
 * Fluent builder for PipelineOptions
 */
export class PipelineBuilder {
  private options: Partial<PipelineOptions> = {};

  // ─────────────────────────────────────────────────────────────
  // Required Parameters
  // ─────────────────────────────────────────────────────────────

  /**
   * Set the topic for video generation (REQUIRED)
   */
  topic(topic: string): this {
    if (!topic || topic.trim().length === 0) {
      throw new ConfigError('Topic cannot be empty');
    }
    this.options.topic = topic.trim();
    return this;
  }

  /**
   * Set the content archetype (REQUIRED)
   */
  archetype(archetype: Archetype): this {
    this.options.archetype = archetype;
    return this;
  }

  /**
   * Set the output file path (REQUIRED)
   */
  outputPath(path: string): this {
    if (!path.endsWith('.mp4')) {
      throw new ConfigError('Output path must end with .mp4');
    }
    this.options.outputPath = path;
    return this;
  }

  // ─────────────────────────────────────────────────────────────
  // Optional Parameters (with sensible defaults)
  // ─────────────────────────────────────────────────────────────

  /**
   * Set video orientation (default: portrait)
   */
  orientation(orientation: Orientation): this {
    this.options.orientation = orientation;
    return this;
  }

  /**
   * Set TTS voice (default: af_heart)
   */
  voice(voice: string): this {
    this.options.voice = voice;
    return this;
  }

  /**
   * Set target video duration in seconds (default: 45)
   */
  duration(seconds: number): this {
    if (seconds < 15 || seconds > 180) {
      throw new ConfigError('Duration must be between 15 and 180 seconds');
    }
    this.options.targetDuration = seconds;
    return this;
  }

  /**
   * Set working directory for artifacts
   */
  workDir(dir: string): this {
    this.options.workDir = dir;
    return this;
  }

  /**
   * Keep intermediate artifacts after pipeline completion
   */
  keepArtifacts(keep: boolean = true): this {
    this.options.keepArtifacts = keep;
    return this;
  }

  // ─────────────────────────────────────────────────────────────
  // Advanced Configuration
  // ─────────────────────────────────────────────────────────────

  /**
   * Inject custom LLM provider (for testing or custom models)
   */
  withLLMProvider(provider: LLMProvider): this {
    this.options.llmProvider = provider;
    return this;
  }

  /**
   * Inject research data for evidence-based scripts
   */
  withResearch(research: ResearchOutput): this {
    this.options.research = research;
    return this;
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (stage: PipelineStage, message: string) => void): this {
    this.options.onProgress = callback;
    return this;
  }

  // ─────────────────────────────────────────────────────────────
  // Presets (convenience methods)
  // ─────────────────────────────────────────────────────────────

  /**
   * Configure for testing (mock providers, short duration)
   */
  forTesting(): this {
    this.options.mock = true;
    this.options.keepArtifacts = true;
    this.options.targetDuration = 15;
    return this;
  }

  /**
   * Configure for production (no mocks, cleanup artifacts)
   */
  forProduction(): this {
    this.options.mock = false;
    this.options.keepArtifacts = false;
    return this;
  }

  /**
   * Configure for quick preview (low quality, fast)
   */
  forPreview(): this {
    this.options.targetDuration = 15;
    this.options.keepArtifacts = false;
    return this;
  }

  /**
   * Configure for long-form content (60+ seconds)
   */
  forLongForm(durationSeconds: number = 90): this {
    if (durationSeconds < 60) {
      throw new ConfigError('Long-form content must be 60+ seconds');
    }
    this.options.targetDuration = durationSeconds;
    return this;
  }

  // ─────────────────────────────────────────────────────────────
  // Build & Validate
  // ─────────────────────────────────────────────────────────────

  /**
   * Apply defaults for missing optional fields
   */
  private applyDefaults(): Partial<PipelineOptions> {
    return {
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 45,
      keepArtifacts: false,
      mock: false,
      ...this.options,
    };
  }

  /**
   * Validate required fields
   */
  private validate(options: Partial<PipelineOptions>): asserts options is PipelineOptions {
    const errors: string[] = [];

    if (!options.topic) errors.push('topic is required');
    if (!options.archetype) errors.push('archetype is required');
    if (!options.outputPath) errors.push('outputPath is required');

    if (errors.length > 0) {
      throw new ConfigError(`Pipeline validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Build and validate the PipelineOptions
   */
  build(): PipelineOptions {
    const options = this.applyDefaults();
    this.validate(options);
    return options as PipelineOptions;
  }

  /**
   * Create a new builder from existing options
   */
  static from(options: Partial<PipelineOptions>): PipelineBuilder {
    const builder = new PipelineBuilder();
    builder.options = { ...options };
    return builder;
  }
}
```

### 5.2 ScriptBuilder

```typescript
// src/script/builders/script-builder.ts

export class ScriptBuilder {
  private options: Partial<GenerateScriptOptions> = {};

  topic(topic: string): this {
    this.options.topic = topic;
    return this;
  }

  archetype(archetype: Archetype): this {
    this.options.archetype = archetype;
    return this;
  }

  duration(seconds: number): this {
    this.options.targetDuration = seconds;
    return this;
  }

  withLLM(provider: LLMProvider): this {
    this.options.llmProvider = provider;
    return this;
  }

  withResearch(research: ResearchOutput): this {
    this.options.research = research;
    return this;
  }

  withPackaging(packaging: { title: string; coverText: string; onScreenHook: string }): this {
    this.options.packaging = packaging;
    return this;
  }

  // Archetype presets
  asListicle(count: number = 5): this {
    return this.archetype('listicle');
  }

  asVersus(): this {
    return this.archetype('versus');
  }

  asHowTo(): this {
    return this.archetype('howto');
  }

  asHotTake(): this {
    return this.archetype('hot-take');
  }

  build(): GenerateScriptOptions {
    if (!this.options.topic) throw new ConfigError('Topic is required');
    if (!this.options.archetype) throw new ConfigError('Archetype is required');

    return {
      topic: this.options.topic,
      archetype: this.options.archetype,
      targetDuration: this.options.targetDuration ?? 45,
      llmProvider: this.options.llmProvider,
      research: this.options.research,
      packaging: this.options.packaging,
    };
  }
}
```

### 5.3 RenderPropsBuilder

```typescript
// src/render/builders/render-props-builder.ts

export class RenderPropsBuilder {
  private props: Partial<RenderProps> = {};

  // Video dimensions
  portrait(): this {
    this.props.width = 1080;
    this.props.height = 1920;
    return this;
  }

  landscape(): this {
    this.props.width = 1920;
    this.props.height = 1080;
    return this;
  }

  square(): this {
    this.props.width = 1080;
    this.props.height = 1080;
    return this;
  }

  // Quality settings
  fps(fps: 24 | 30 | 60): this {
    this.props.fps = fps;
    return this;
  }

  highQuality(): this {
    this.props.fps = 60;
    this.props.codec = 'h264';
    this.props.crf = 18;
    return this;
  }

  fastRender(): this {
    this.props.fps = 30;
    this.props.crf = 28;
    return this;
  }

  // Content
  withAudio(path: string): this {
    this.props.audioPath = path;
    return this;
  }

  withVisuals(visuals: VisualsOutput): this {
    this.props.visuals = visuals;
    return this;
  }

  withTimestamps(timestamps: TimestampsOutput): this {
    this.props.timestamps = timestamps;
    return this;
  }

  outputTo(path: string): this {
    this.props.outputPath = path;
    return this;
  }

  build(): RenderProps {
    // Validate and apply defaults
    return {
      width: this.props.width ?? 1080,
      height: this.props.height ?? 1920,
      fps: this.props.fps ?? 30,
      codec: this.props.codec ?? 'h264',
      crf: this.props.crf ?? 23,
      audioPath: this.props.audioPath,
      visuals: this.props.visuals,
      timestamps: this.props.timestamps,
      outputPath: this.props.outputPath,
    } as RenderProps;
  }
}
```

---

## 6. Usage Examples

### 6.1 Basic Usage

```typescript
// Simple listicle video
const options = new PipelineBuilder()
  .topic('5 JavaScript tips for 2026')
  .archetype('listicle')
  .outputPath('./output/js-tips.mp4')
  .build();

await runPipeline(options);
```

### 6.2 Full Configuration

```typescript
// Production video with all options
const options = new PipelineBuilder()
  .topic('Redis vs PostgreSQL for caching')
  .archetype('versus')
  .orientation('portrait')
  .voice('am_michael')
  .duration(60)
  .outputPath('./output/redis-vs-pg.mp4')
  .withResearch(researchData)
  .onProgress((stage, msg) => console.log(`${stage}: ${msg}`))
  .forProduction()
  .build();
```

### 6.3 Testing Configuration

```typescript
// Quick test configuration
const options = new PipelineBuilder()
  .topic('Test topic')
  .archetype('listicle')
  .outputPath('./test/output.mp4')
  .forTesting()
  .withLLMProvider(new FakeLLMProvider())
  .build();
```

### 6.4 Preset Chaining

```typescript
// Long-form production video
const options = new PipelineBuilder()
  .topic('Complete Docker Tutorial')
  .archetype('howto')
  .outputPath('./output/docker-tutorial.mp4')
  .forLongForm(120)
  .forProduction()
  .withResearch(researchData)
  .build();
```

---

## 7. Director Pattern (Optional Extension)

For common video types, a **Director** can encapsulate builder recipes:

```typescript
// src/core/builders/pipeline-director.ts

export class PipelineDirector {
  /**
   * Create a standard TikTok-style video
   */
  static tiktokVideo(topic: string, archetype: Archetype, outputPath: string): PipelineOptions {
    return new PipelineBuilder()
      .topic(topic)
      .archetype(archetype)
      .outputPath(outputPath)
      .orientation('portrait')
      .duration(45)
      .voice('af_heart')
      .forProduction()
      .build();
  }

  /**
   * Create a YouTube Shorts video
   */
  static youtubeShort(topic: string, archetype: Archetype, outputPath: string): PipelineOptions {
    return new PipelineBuilder()
      .topic(topic)
      .archetype(archetype)
      .outputPath(outputPath)
      .orientation('portrait')
      .duration(58) // Under 60s for Shorts
      .voice('am_michael')
      .forProduction()
      .build();
  }

  /**
   * Create a test video with mock providers
   */
  static testVideo(topic: string = 'Test Topic'): PipelineOptions {
    return new PipelineBuilder()
      .topic(topic)
      .archetype('listicle')
      .outputPath('./test-output/test.mp4')
      .forTesting()
      .build();
  }
}

// Usage
const options = PipelineDirector.tiktokVideo('5 AI tools', 'listicle', './output/ai-tools.mp4');
```

---

## 8. Integration with CLI

```typescript
// src/cli/commands/generate.ts

async function runGenerate(topic: string, cliOptions: GenerateOptions): Promise<void> {
  const builder = new PipelineBuilder()
    .topic(topic)
    .archetype(ArchetypeEnum.parse(cliOptions.archetype))
    .outputPath(cliOptions.output)
    .orientation(OrientationEnum.parse(cliOptions.orientation))
    .voice(cliOptions.voice)
    .duration(parseInt(cliOptions.duration, 10))
    .keepArtifacts(cliOptions.keepArtifacts);

  if (cliOptions.mock) {
    builder.forTesting();
  }

  if (cliOptions.research) {
    const research = await loadOrRunResearch(cliOptions.research, topic, cliOptions.mock);
    if (research) builder.withResearch(research);
  }

  const options = builder.build();
  const result = await runPipeline(options);
  // ...
}
```

---

## 9. Testing Benefits

```typescript
describe('PipelineBuilder', () => {
  it('should require topic, archetype, and outputPath', () => {
    expect(() => new PipelineBuilder().build()).toThrow('topic is required');

    expect(() => new PipelineBuilder().topic('test').build()).toThrow('archetype is required');
  });

  it('should apply sensible defaults', () => {
    const options = new PipelineBuilder()
      .topic('test')
      .archetype('listicle')
      .outputPath('./test.mp4')
      .build();

    expect(options.orientation).toBe('portrait');
    expect(options.voice).toBe('af_heart');
    expect(options.targetDuration).toBe(45);
    expect(options.mock).toBe(false);
  });

  it('should validate duration range', () => {
    expect(
      () => new PipelineBuilder().topic('test').archetype('listicle').duration(5) // Too short
    ).toThrow('Duration must be between 15 and 180');
  });

  it('should support preset chaining', () => {
    const options = new PipelineBuilder()
      .topic('test')
      .archetype('listicle')
      .outputPath('./test.mp4')
      .forTesting()
      .build();

    expect(options.mock).toBe(true);
    expect(options.keepArtifacts).toBe(true);
    expect(options.targetDuration).toBe(15);
  });
});
```

---

## 10. Implementation Priority

| Builder                    | Priority | Justification                        |
| -------------------------- | -------- | ------------------------------------ |
| **PipelineBuilder**        | P0       | Most complex object, used everywhere |
| **ScriptBuilder**          | P1       | Script generation has many options   |
| **RenderPropsBuilder**     | P2       | Render has many quality settings     |
| **AudioOptionsBuilder**    | P2       | Voice/speed/format options           |
| **ResearchOptionsBuilder** | P3       | Research configuration               |

---

## 11. Related Documents

- [DP-01-PROVIDER-ABSTRACTION-STRATEGY-20260107.md](./DP-01-PROVIDER-ABSTRACTION-STRATEGY-20260107.md)
- [src/core/pipeline.ts](../../../src/core/pipeline.ts) — Current PipelineOptions
- [src/core/config.ts](../../../src/core/config.ts) — Zod schemas

---

**Next Step:** Proceed to implementation plan IMPL-DP-03-BUILDER-PATTERN-20260107.md
