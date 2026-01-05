# RQ-22: Extensibility and Modularity Architecture

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we design content-machine to be modular and extensible for future scope increases?

---

## 1. Problem Statement

The MVP defines a fixed pipeline (script → audio → visuals → render) with specific providers (OpenAI, Kokoro, Pexels, Remotion). Future requirements will include:

- New LLM providers (Claude, Gemini, Ollama, local models)
- New TTS engines (ElevenLabs, PlayHT, Coqui)
- New ASR engines (Deepgram, Assembly AI)
- New stock footage sources (Unsplash, Shutterstock)
- New content archetypes (beyond 6 presets)
- New pipeline stages (trend research, publishing, analytics)
- Custom post-processing effects
- Plugin ecosystem (community contributions)

The architecture must support **extension without core modification**.

---

## 2. Core Extensibility Principles

### 2.1 Open-Closed Principle

**Open for extension, closed for modification.**

```typescript
// ❌ BAD: Switch statement requires core changes
function getTTS(provider: string) {
  switch (provider) {
    case 'kokoro':
      return new Kokoro();
    case 'elevenlabs':
      return new ElevenLabs(); // Must modify core
    default:
      throw new Error('Unknown provider');
  }
}

// ✅ GOOD: Registry pattern allows extension
const ttsRegistry = new ProviderRegistry<TTSProvider>();
ttsRegistry.register('kokoro', () => new Kokoro());
// Users can add without modifying core:
ttsRegistry.register('elevenlabs', () => new ElevenLabs());
```

### 2.2 Dependency Inversion

**Depend on abstractions, not implementations.**

```typescript
// ❌ BAD: Direct dependency on implementation
class AudioPipeline {
  private tts = new Kokoro(); // Hardcoded
}

// ✅ GOOD: Inject abstraction
class AudioPipeline {
  constructor(private tts: TTSProvider) {} // Any TTSProvider works
}
```

### 2.3 Interface Segregation

**Many specific interfaces over one general interface.**

```typescript
// ❌ BAD: God interface
interface VideoProvider {
  generateScript(): Promise<Script>;
  synthesizeSpeech(): Promise<Audio>;
  transcribe(): Promise<Timestamps>;
  findFootage(): Promise<Footage[]>;
  render(): Promise<Video>;
}

// ✅ GOOD: Focused interfaces
interface LLMProvider {
  chat(): Promise<ChatResponse>;
}
interface TTSProvider {
  synthesize(): Promise<AudioResult>;
}
interface ASRProvider {
  transcribe(): Promise<TranscriptResult>;
}
interface StockProvider {
  search(): Promise<FootageResult[]>;
}
interface RenderProvider {
  render(): Promise<VideoResult>;
}
```

---

## 3. Provider Interface Contracts

### 3.1 LLM Provider Interface

```typescript
export interface LLMProvider {
  readonly name: string;
  readonly supportedFeatures: LLMFeature[];

  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  // Optional capabilities
  embed?(texts: string[]): Promise<EmbeddingResult>;
  streamChat?(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  schema?: z.ZodSchema;
  timeout?: number;
}

export interface ChatResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  finishReason: 'stop' | 'length' | 'tool_calls';
  cost?: number;
}

export type LLMFeature = 'json-mode' | 'tool-calling' | 'vision' | 'streaming' | 'embeddings';
```

### 3.2 TTS Provider Interface

```typescript
export interface TTSProvider {
  readonly name: string;
  readonly supportedVoices: Voice[];
  readonly supportedLanguages: string[];

  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;

  // Optional: Get timestamps during synthesis (Edge TTS)
  synthesizeWithTimestamps?(text: string, options: TTSOptions): Promise<TTSResultWithTimestamps>;
}

export interface TTSOptions {
  voice: string;
  rate?: number; // 0.5-2.0
  pitch?: number; // -50 to +50
  volume?: number; // 0-1
}

export interface TTSResult {
  audio: Buffer;
  format: 'mp3' | 'wav' | 'ogg';
  duration: number;
}

export interface TTSResultWithTimestamps extends TTSResult {
  wordTimestamps: WordTimestamp[];
}
```

### 3.3 ASR Provider Interface

```typescript
export interface ASRProvider {
  readonly name: string;
  readonly supportedLanguages: string[];
  readonly supportsWordTimestamps: boolean;

  transcribe(audio: Buffer | string, options?: ASROptions): Promise<ASRResult>;
}

export interface ASROptions {
  language?: string;
  wordTimestamps?: boolean;
  model?: string;
}

export interface ASRResult {
  text: string;
  words?: WordTimestamp[];
  language: string;
  duration: number;
  confidence?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}
```

### 3.4 Stock Footage Provider Interface

```typescript
export interface StockFootageProvider {
  readonly name: string;
  readonly requiresApiKey: boolean;
  readonly supportedMediaTypes: ('video' | 'image')[];

  search(query: string, options?: SearchOptions): Promise<StockResult[]>;
  download(asset: StockResult, destination: string): Promise<string>;
}

export interface SearchOptions {
  mediaType?: 'video' | 'image';
  orientation?: 'landscape' | 'portrait' | 'square';
  minDuration?: number;
  maxDuration?: number;
  perPage?: number;
}

export interface StockResult {
  id: string;
  source: string;
  url: string;
  previewUrl: string;
  duration?: number;
  width: number;
  height: number;
  description?: string;
}
```

### 3.5 Render Provider Interface

```typescript
export interface RenderProvider {
  readonly name: string;
  readonly supportedFormats: VideoFormat[];

  render(composition: CompositionSpec, options?: RenderOptions): Promise<RenderResult>;

  // Optional: Progress reporting
  renderWithProgress?(
    composition: CompositionSpec,
    options?: RenderOptions,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<RenderResult>;
}

export interface RenderOptions {
  quality: 'draft' | 'standard' | 'high';
  format?: VideoFormat;
  concurrency?: number;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
  size: number;
  format: VideoFormat;
}
```

---

## 4. Provider Registry System

### 4.1 Generic Registry

```typescript
export class ProviderRegistry<T> {
  private providers = new Map<string, () => T>();
  private instances = new Map<string, T>();

  register(name: string, factory: () => T): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider "${name}" already registered`);
    }
    this.providers.set(name, factory);
  }

  get(name: string): T {
    // Lazy instantiation with caching
    if (!this.instances.has(name)) {
      const factory = this.providers.get(name);
      if (!factory) {
        throw new Error(`Provider "${name}" not found. Available: ${this.list().join(', ')}`);
      }
      this.instances.set(name, factory());
    }
    return this.instances.get(name)!;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }
}
```

### 4.2 Global Registries

```typescript
// src/providers/index.ts
export const llmProviders = new ProviderRegistry<LLMProvider>();
export const ttsProviders = new ProviderRegistry<TTSProvider>();
export const asrProviders = new ProviderRegistry<ASRProvider>();
export const stockProviders = new ProviderRegistry<StockFootageProvider>();
export const renderProviders = new ProviderRegistry<RenderProvider>();

// Built-in registrations
llmProviders.register('openai', () => new OpenAIProvider());
llmProviders.register('anthropic', () => new AnthropicProvider());
llmProviders.register('ollama', () => new OllamaProvider());

ttsProviders.register('kokoro', () => new KokoroProvider());
ttsProviders.register('edge-tts', () => new EdgeTTSProvider());

asrProviders.register('whisper-cpp', () => new WhisperCppProvider());

stockProviders.register('pexels', () => new PexelsProvider());
stockProviders.register('pixabay', () => new PixabayProvider());

renderProviders.register('remotion', () => new RemotionProvider());
```

### 4.3 User Extension Point

```typescript
// ~/.cm/plugins/my-tts-provider.ts
import { ttsProviders, TTSProvider } from 'content-machine';

class MyCustomTTS implements TTSProvider {
  readonly name = 'my-tts';
  readonly supportedVoices = [{ id: 'custom-1', name: 'Custom Voice' }];
  readonly supportedLanguages = ['en'];

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    // Custom implementation
  }
}

// Register at runtime
ttsProviders.register('my-tts', () => new MyCustomTTS());
```

---

## 5. Pipeline Extensibility

### 5.1 Stage Interface

```typescript
export interface PipelineStage<TInput, TOutput> {
  readonly name: string;
  readonly version: string;

  execute(input: TInput, context: PipelineContext): Promise<TOutput>;

  // Optional hooks
  beforeExecute?(input: TInput, context: PipelineContext): Promise<TInput>;
  afterExecute?(output: TOutput, context: PipelineContext): Promise<TOutput>;
  onError?(error: Error, context: PipelineContext): Promise<void>;
}

export interface PipelineContext {
  projectDir: string;
  config: Config;
  archetype: ContentArchetype;
  logger: Logger;
  costTracker: CostTracker;
  abortSignal?: AbortSignal;
}
```

### 5.2 Pipeline Builder

```typescript
export class PipelineBuilder {
  private stages: PipelineStage<any, any>[] = [];
  private hooks: PipelineHooks = {};

  addStage<TIn, TOut>(stage: PipelineStage<TIn, TOut>): this {
    this.stages.push(stage);
    return this;
  }

  insertBefore<TIn, TOut>(existingName: string, stage: PipelineStage<TIn, TOut>): this {
    const index = this.stages.findIndex((s) => s.name === existingName);
    if (index === -1) throw new Error(`Stage ${existingName} not found`);
    this.stages.splice(index, 0, stage);
    return this;
  }

  insertAfter<TIn, TOut>(existingName: string, stage: PipelineStage<TIn, TOut>): this {
    const index = this.stages.findIndex((s) => s.name === existingName);
    if (index === -1) throw new Error(`Stage ${existingName} not found`);
    this.stages.splice(index + 1, 0, stage);
    return this;
  }

  removeStage(name: string): this {
    this.stages = this.stages.filter((s) => s.name !== name);
    return this;
  }

  build(): Pipeline {
    return new Pipeline(this.stages, this.hooks);
  }
}

// Default pipeline
const defaultPipeline = new PipelineBuilder()
  .addStage(new ScriptStage())
  .addStage(new AudioStage())
  .addStage(new VisualsStage())
  .addStage(new RenderStage())
  .build();

// Extended pipeline with research
const researchPipeline = new PipelineBuilder()
  .addStage(new ResearchStage()) // Custom stage
  .addStage(new ScriptStage())
  .addStage(new AudioStage())
  .addStage(new VisualsStage())
  .addStage(new RenderStage())
  .addStage(new PublishStage()) // Custom stage
  .build();
```

### 5.3 Hook System

```typescript
export interface PipelineHooks {
  onPipelineStart?: (context: PipelineContext) => Promise<void>;
  onPipelineEnd?: (result: PipelineResult, context: PipelineContext) => Promise<void>;
  onStageStart?: (stage: string, input: unknown, context: PipelineContext) => Promise<void>;
  onStageEnd?: (stage: string, output: unknown, context: PipelineContext) => Promise<void>;
  onStageError?: (stage: string, error: Error, context: PipelineContext) => Promise<void>;
  onProgress?: (stage: string, progress: number, message: string) => void;
}

// Usage
const pipeline = new PipelineBuilder()
  .addStage(new ScriptStage())
  .addStage(new AudioStage())
  .withHooks({
    onStageEnd: async (stage, output, ctx) => {
      // Log to Langfuse
      await langfuse.logStage(stage, output);
    },
    onProgress: (stage, progress, message) => {
      console.log(`[${stage}] ${progress}%: ${message}`);
    },
  })
  .build();
```

---

## 6. Content Archetype Extensibility

### 6.1 Archetype Registry

```typescript
export const archetypeRegistry = new ProviderRegistry<ContentArchetype>();

// Built-in archetypes
archetypeRegistry.register('brainrot', () => brainrotArchetype);
archetypeRegistry.register('meme', () => memeArchetype);
archetypeRegistry.register('educational', () => educationalArchetype);
archetypeRegistry.register('story', () => storyArchetype);
archetypeRegistry.register('product', () => productArchetype);
archetypeRegistry.register('motivational', () => motivationalArchetype);

// User can add custom archetypes
archetypeRegistry.register('gaming-review', () => ({
  id: 'gaming-review',
  name: 'Gaming Review',
  // ... custom configuration
}));
```

### 6.2 Archetype Inheritance

```typescript
export function extendArchetype(
  baseId: string,
  overrides: DeepPartial<ContentArchetype>
): ContentArchetype {
  const base = archetypeRegistry.get(baseId);
  return deepMerge(base, overrides);
}

// Usage: Create variant of brainrot
const myBrainrot = extendArchetype('brainrot', {
  captions: {
    fontFamily: 'Comic Sans MS',
    textColor: '#00FF00',
  },
  audio: {
    voiceRate: 1.5, // Even faster
  },
});

archetypeRegistry.register('my-brainrot', () => myBrainrot);
```

### 6.3 Archetype Loading from Files

```typescript
// Auto-load from ~/.cm/archetypes/
async function loadUserArchetypes(): Promise<void> {
  const archetypeDir = path.join(os.homedir(), '.cm', 'archetypes');

  if (!(await fs.exists(archetypeDir))) return;

  const files = await fs.readdir(archetypeDir);

  for (const file of files) {
    if (!file.endsWith('.json') && !file.endsWith('.yaml')) continue;

    const content = await fs.readFile(path.join(archetypeDir, file), 'utf-8');
    const archetype = file.endsWith('.yaml') ? yaml.parse(content) : JSON.parse(content);

    // Handle inheritance
    if (archetype.extends) {
      const extended = extendArchetype(archetype.extends, archetype);
      archetypeRegistry.register(archetype.id, () => extended);
    } else {
      archetypeRegistry.register(archetype.id, () => archetype);
    }
  }
}
```

---

## 7. Plugin System

### 7.1 Plugin Interface

```typescript
export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description?: string;

  // Called when plugin is loaded
  activate(context: PluginContext): Promise<void>;

  // Called when plugin is unloaded
  deactivate?(): Promise<void>;
}

export interface PluginContext {
  // Registries
  llmProviders: ProviderRegistry<LLMProvider>;
  ttsProviders: ProviderRegistry<TTSProvider>;
  asrProviders: ProviderRegistry<ASRProvider>;
  stockProviders: ProviderRegistry<StockFootageProvider>;
  archetypeRegistry: ProviderRegistry<ContentArchetype>;

  // Pipeline extension
  pipelineBuilder: PipelineBuilder;

  // Configuration
  config: Config;

  // Utilities
  logger: Logger;
}
```

### 7.2 Plugin Loader

```typescript
export class PluginLoader {
  private plugins = new Map<string, Plugin>();

  async loadFromDirectory(dir: string): Promise<void> {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;

      const modulePath = path.join(dir, file);
      const module = await import(modulePath);

      if (module.default && this.isPlugin(module.default)) {
        await this.load(module.default);
      }
    }
  }

  async load(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already loaded`);
    }

    await plugin.activate(this.createContext());
    this.plugins.set(plugin.name, plugin);

    console.log(`Loaded plugin: ${plugin.name} v${plugin.version}`);
  }

  private isPlugin(obj: unknown): obj is Plugin {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'name' in obj &&
      'version' in obj &&
      'activate' in obj
    );
  }
}
```

### 7.3 Example Plugin

```typescript
// ~/.cm/plugins/elevenlabs-tts.ts
import type { Plugin, TTSProvider } from 'content-machine';

class ElevenLabsTTS implements TTSProvider {
  readonly name = 'elevenlabs';
  // ... implementation
}

const plugin: Plugin = {
  name: 'elevenlabs-tts',
  version: '1.0.0',
  description: 'Adds ElevenLabs TTS support',

  async activate(ctx) {
    ctx.ttsProviders.register('elevenlabs', () => new ElevenLabsTTS());
    ctx.logger.info('ElevenLabs TTS provider registered');
  },
};

export default plugin;
```

---

## 8. Event System for AI/ML Integration

### 8.1 Typed Event Emitter

```typescript
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';

export interface ContentMachineEvents {
  'llm:request': (event: LLMRequestEvent) => void;
  'llm:response': (event: LLMResponseEvent) => void;
  'tts:start': (event: TTSStartEvent) => void;
  'tts:complete': (event: TTSCompleteEvent) => void;
  'render:progress': (event: RenderProgressEvent) => void;
  'pipeline:stage:start': (event: StageStartEvent) => void;
  'pipeline:stage:end': (event: StageEndEvent) => void;
  'cost:incurred': (event: CostEvent) => void;
}

export const events = new EventEmitter() as TypedEmitter<ContentMachineEvents>;

// AI/ML integration points
events.on('llm:response', async (event) => {
  // Log to Langfuse for evals
  await langfuse.logGeneration({
    name: event.model,
    input: event.messages,
    output: event.response,
    usage: event.usage,
  });
});

events.on('cost:incurred', (event) => {
  // Track costs for budget alerts
  costTracker.add(event);
});
```

### 8.2 Middleware Pattern

```typescript
export type Middleware<T> = (input: T, next: () => Promise<T>) => Promise<T>;

export class MiddlewareChain<T> {
  private middlewares: Middleware<T>[] = [];

  use(middleware: Middleware<T>): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(input: T, finalHandler: (input: T) => Promise<T>): Promise<T> {
    let index = 0;

    const next = async (): Promise<T> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware(input, next);
      }
      return finalHandler(input);
    };

    return next();
  }
}

// Usage: Add middleware for prompt caching, retry, logging
const llmMiddleware = new MiddlewareChain<ChatRequest>()
  .use(promptCacheMiddleware)
  .use(retryMiddleware)
  .use(costTrackingMiddleware)
  .use(loggingMiddleware);
```

---

## 9. Configuration Extensibility

### 9.1 Extensible Config Schema

```typescript
// Base config schema
export const BaseConfigSchema = z.object({
  schemaVersion: z.string(),
  llm: z.record(z.string(), LLMConfigSchema),
  embedding: EmbeddingConfigSchema,
  commands: CommandsConfigSchema,
});

// Plugins can extend
export const ConfigSchema = BaseConfigSchema.extend({
  plugins: z.array(z.string()).optional(),
  customProviders: z.record(z.string(), z.unknown()).optional(),
});

// Type-safe extension
export type Config = z.infer<typeof ConfigSchema> & {
  [key: string]: unknown; // Allow plugin-specific keys
};
```

### 9.2 Environment-Based Configuration

```typescript
export function loadConfig(): Config {
  // Priority: CLI args > env vars > user config > defaults
  const defaults = loadDefaults();
  const userConfig = loadUserConfig(); // ~/.cmrc.json
  const envConfig = loadEnvConfig(); // CM_* env vars
  const cliConfig = loadCliConfig(); // --config flag

  return deepMerge(defaults, userConfig, envConfig, cliConfig);
}
```

---

## 10. Future-Proofing Patterns

### 10.1 Version Negotiation

```typescript
export interface VersionedProvider {
  readonly apiVersion: string; // "1.0", "2.0"

  // Feature detection
  supports(feature: string): boolean;
}

// Graceful degradation
async function callLLM(provider: LLMProvider, request: ChatRequest) {
  if (provider.supports('json-mode')) {
    return provider.chat(request, { jsonMode: true });
  }
  // Fallback for older providers
  return parseJsonFromText(await provider.chat(request));
}
```

### 10.2 Schema Migration

```typescript
export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  migrate(data: unknown): unknown;
}

export class SchemaMigrator {
  private migrations: SchemaMigration[] = [];

  register(migration: SchemaMigration): void {
    this.migrations.push(migration);
  }

  migrate(data: { schemaVersion: string }, targetVersion: string): unknown {
    let current = data;
    let currentVersion = data.schemaVersion;

    while (currentVersion !== targetVersion) {
      const migration = this.migrations.find((m) => m.fromVersion === currentVersion);
      if (!migration) {
        throw new Error(`No migration from ${currentVersion}`);
      }
      current = migration.migrate(current);
      currentVersion = migration.toVersion;
    }

    return current;
  }
}
```

### 10.3 Feature Flags

```typescript
export const featureFlags = {
  // Experimental features
  'experimental:split-screen': false,
  'experimental:meme-audio': false,

  // Gradual rollout
  'beta:offline-mode': false,
  'beta:batch-processing': false,

  // Provider-specific
  'provider:ollama': true,
  'provider:elevenlabs': false,
};

export function isFeatureEnabled(flag: keyof typeof featureFlags): boolean {
  // Check env override first
  const envKey = `CM_FEATURE_${flag.toUpperCase().replace(/[:-]/g, '_')}`;
  if (process.env[envKey]) {
    return process.env[envKey] === 'true';
  }
  return featureFlags[flag];
}
```

---

## 11. Summary: Extension Points

| Extension Point        | Mechanism                       | User Action                                |
| ---------------------- | ------------------------------- | ------------------------------------------ |
| **LLM Providers**      | `llmProviders.register()`       | Implement `LLMProvider` interface          |
| **TTS Providers**      | `ttsProviders.register()`       | Implement `TTSProvider` interface          |
| **ASR Providers**      | `asrProviders.register()`       | Implement `ASRProvider` interface          |
| **Stock Providers**    | `stockProviders.register()`     | Implement `StockFootageProvider` interface |
| **Content Archetypes** | `archetypeRegistry.register()`  | JSON/YAML file or `extendArchetype()`      |
| **Pipeline Stages**    | `pipelineBuilder.insertAfter()` | Implement `PipelineStage` interface        |
| **Hooks**              | `pipeline.withHooks()`          | Provide hook functions                     |
| **Plugins**            | `~/.cm/plugins/` directory      | Export `Plugin` object                     |
| **Events**             | `events.on()`                   | Subscribe to typed events                  |
| **Middleware**         | `middleware.use()`              | Implement middleware function              |
| **Config**             | `~/.cmrc.json`                  | Add provider/archetype configs             |

---

## 12. References

- [vendor/langchain](../../../vendor/agents/langchain) — Provider abstraction patterns
- [vendor/openai-agents-js](../../../vendor/openai-agents-js) — Tool registration, typed events
- [vendor/n8n](../../../vendor/orchestration/n8n) — Node/plugin discovery
- [vendor/short-video-maker-gyori](../../../vendor/short-video-maker-gyori) — Constructor injection
