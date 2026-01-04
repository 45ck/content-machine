# RQ-23: Expert Code Review — Critical Implementation Gaps

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P0/P1  
**Iteration:** 5  
**Method:** Deep review of vendored blueprint repos against system design

---

## 1. Executive Summary

Expert code review of short-video-maker-gyori, MoneyPrinterTurbo, and openai-agents-js revealed **10 critical implementation patterns** that are present in production systems but missing from our system design.

| Priority | Count | Summary |
|----------|-------|---------|
| **P0** | 2 | Constructor injection, test stubs |
| **P1** | 7 | Multi-key rotation, fallbacks, validation, signals, lifecycle |
| **P2** | 1 | Reasoning model settings |

---

## 2. P0 Gaps (Must Fix Before Implementation)

### GAP-23.1: Constructor Injection Pattern Not Documented

**Source:** short-video-maker-gyori

**Problem:** System design shows interface definitions but not the instantiation pattern.

**Evidence:**

```typescript
// vendor/short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts
export class Kokoro {
  constructor(private tts: KokoroTTS) {}  // Pure DI

  static async init(dtype: kokoroModelPrecision): Promise<Kokoro> {
    const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype });
    return new Kokoro(tts);  // Factory method for real instantiation
  }
}

// vendor/short-video-maker-gyori/src/index.ts
const kokoro = await Kokoro.init(config.kokoroModelPrecision);
const shortCreator = new ShortCreator(
  config, remotion, kokoro, whisper, ffmpeg, pexelsApi, musicManager
);  // ALL deps injected via constructor
```

**Resolution:** Add to §18 Extensibility Architecture:

```typescript
// Pattern: Static factory + constructor injection
class AudioPipeline {
  // Private constructor — use factory
  private constructor(
    private tts: TTSProvider,
    private asr: ASRProvider,
    private ffmpeg: FFmpegWrapper
  ) {}

  // Factory creates with real dependencies
  static async create(config: Config): Promise<AudioPipeline> {
    const tts = await ttsProviders.get(config.audio.ttsEngine);
    const asr = await asrProviders.get(config.audio.asrEngine);
    const ffmpeg = new FFmpegWrapper();
    return new AudioPipeline(tts, asr, ffmpeg);
  }

  // For testing: inject fakes directly
  static createForTest(fakes: {
    tts: TTSProvider;
    asr: ASRProvider;
    ffmpeg: FFmpegWrapper;
  }): AudioPipeline {
    return new AudioPipeline(fakes.tts, fakes.asr, fakes.ffmpeg);
  }
}
```

---

### GAP-23.2: Test Stub Infrastructure Missing

**Source:** openai-agents-js

**Problem:** System design mentions mocking but doesn't show the actual test infrastructure pattern.

**Evidence:**

```typescript
// vendor/openai-agents-js/packages/agents-core/test/stubs.ts
export class FakeModel implements Model {
  constructor(private _responses: ModelResponse[] = []) {}

  async getResponse(_request: ModelRequest): Promise<ModelResponse> {
    const response = this._responses.shift();
    if (!response) throw new Error('No response found');
    return response;
  }
}

export class FakeModelProvider implements ModelProvider {
  async getModel(_name: string): Promise<Model> {
    return new FakeModel([TEST_MODEL_RESPONSE_BASIC]);
  }
}

// Usage in tests:
setDefaultModelProvider(new FakeModelProvider());
```

**Resolution:** Create `src/test/stubs/` package:

```typescript
// src/test/stubs/fake-llm.ts
export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';
  readonly supportedFeatures = ['json-mode'];
  
  private responses: LLMResponse[] = [];
  private calls: LLMMessage[][] = [];
  
  queueResponse(response: LLMResponse): void {
    this.responses.push(response);
  }
  
  queueJsonResponse<T>(data: T): void {
    this.responses.push({
      content: JSON.stringify(data),
      usage: { promptTokens: 100, completionTokens: 50 },
      model: 'fake',
      finishReason: 'stop',
    });
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    this.calls.push(messages);
    const response = this.responses.shift();
    if (!response) {
      throw new Error('FakeLLMProvider: No responses queued');
    }
    return response;
  }
  
  getCalls(): LLMMessage[][] {
    return this.calls;
  }
}

// src/test/stubs/fake-tts.ts
export class FakeTTSProvider implements TTSProvider {
  readonly name = 'fake';
  readonly supportedVoices = [{ id: 'fake', name: 'Fake Voice' }];
  readonly supportedLanguages = ['en'];
  
  async synthesize(text: string): Promise<TTSResult> {
    // Return a minimal valid MP3 buffer (silent 1-second audio)
    return {
      audio: Buffer.from(SILENT_MP3),
      format: 'mp3',
      duration: 1.0,
    };
  }
}
```

---

## 3. P1 Gaps (Should Fix Before MVP)

### GAP-23.3: Multi-Key API Rotation

**Source:** MoneyPrinterTurbo

**Problem:** System design assumes single API key per provider.

**Evidence:**

```python
# vendor/MoneyPrinterTurbo/app/services/material.py
requested_count = 0

def get_api_key(cfg_key: str):
    api_keys = config.app.get(cfg_key)
    if isinstance(api_keys, str):
        return api_keys  # Single key
    
    global requested_count
    requested_count += 1
    return api_keys[requested_count % len(api_keys)]  # Round-robin
```

**Resolution:** Update config schema:

```typescript
// Config supports single key or array
const ApiKeyConfigSchema = z.union([
  z.string(),
  z.array(z.string()).min(1),
]);

// Key rotation helper
class ApiKeyRotator {
  private index = 0;
  
  constructor(private keys: string[]) {}
  
  next(): string {
    const key = this.keys[this.index % this.keys.length];
    this.index++;
    return key;
  }
}

// Usage in config
interface Config {
  pexelsApiKeys: string | string[];  // Can be array for rate limit multiplication
}
```

---

### GAP-23.4: Joker Term Fallback for Stock Footage

**Source:** short-video-maker-gyori

**Problem:** Design mentions cascading search but not the final fallback terms.

**Evidence:**

```typescript
// vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts
const jokerTerms: string[] = ["nature", "globe", "space", "ocean"];

async findVideo(searchTerms: string[], ...): Promise<Video> {
  const shuffledJokerTerms = jokerTerms.sort(() => Math.random() - 0.5);
  const shuffledSearchTerms = searchTerms.sort(() => Math.random() - 0.5);

  for (const searchTerm of [...shuffledSearchTerms, ...shuffledJokerTerms]) {
    try {
      return await this._findVideo(searchTerm, ...);
    } catch (error) {
      // Try next term
    }
  }
  throw new Error("No videos found");
}
```

**Resolution:** Add to cm visuals:

```typescript
const JOKER_TERMS = ['nature', 'abstract', 'sky', 'ocean', 'city', 'texture'];

async function findFootage(visualDirection: string): Promise<StockResult> {
  const llmKeywords = await extractKeywords(visualDirection);
  const shuffledJokers = shuffle(JOKER_TERMS);
  
  const searchOrder = [...llmKeywords, ...shuffledJokers];
  
  for (const term of searchOrder) {
    const results = await stockProvider.search(term);
    if (results.length > 0) {
      return results[0];
    }
  }
  
  // Ultimate fallback: solid color
  return { source: 'fallback-color', color: '#1a1a1a' };
}
```

---

### GAP-23.5: Video Validation After Download

**Source:** MoneyPrinterTurbo

**Problem:** Design assumes downloads succeed and are valid.

**Evidence:**

```python
# vendor/MoneyPrinterTurbo/app/services/material.py
if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
    try:
        clip = VideoFileClip(video_path)
        duration = clip.duration
        fps = clip.fps
        clip.close()
        if duration > 0 and fps > 0:
            return video_path
    except Exception as e:
        os.remove(video_path)  # Delete corrupted file
        logger.warning(f"invalid video file: {video_path}")
```

**Resolution:** Add validation helper:

```typescript
import { execa } from 'execa';

interface VideoMetadata {
  duration: number;
  fps: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

async function validateVideo(path: string): Promise<VideoMetadata | null> {
  try {
    const { stdout } = await execa('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      path,
    ]);
    
    const data = JSON.parse(stdout);
    const videoStream = data.streams.find(s => s.codec_type === 'video');
    
    if (!videoStream || parseFloat(data.format.duration) <= 0) {
      await fs.unlink(path);  // Delete invalid file
      return null;
    }
    
    return {
      duration: parseFloat(data.format.duration),
      fps: eval(videoStream.r_frame_rate),  // "30/1" → 30
      width: videoStream.width,
      height: videoStream.height,
      hasAudio: data.streams.some(s => s.codec_type === 'audio'),
    };
  } catch {
    await fs.unlink(path).catch(() => {});
    return null;
  }
}
```

---

### GAP-23.6: Retry-Within-Provider for TTS

**Source:** MoneyPrinterTurbo

**Problem:** Design has fallback between providers but not retry within same provider.

**Evidence:**

```python
# vendor/MoneyPrinterTurbo/app/services/voice.py
def azure_tts_v1(text, voice_name, voice_rate, voice_file):
    for i in range(3):  # 3 retries within same provider
        try:
            sub_maker = asyncio.run(_do())
            if not sub_maker or not sub_maker.subs:
                continue  # Empty result = retry
            return sub_maker
        except Exception as e:
            logger.error(f"failed, error: {str(e)}")
    return None  # After 3 failures, return None to trigger fallback
```

**Resolution:** Add retry config per provider:

```typescript
interface TTSProviderConfig {
  provider: string;
  retries: number;        // Retry within this provider
  retryDelayMs: number;   // Base delay between retries
}

async function synthesizeWithRetry(
  provider: TTSProvider,
  text: string,
  config: TTSProviderConfig
): Promise<TTSResult | null> {
  for (let attempt = 0; attempt < config.retries; attempt++) {
    try {
      const result = await provider.synthesize(text, {});
      if (result.audio.length > 0) {
        return result;
      }
      // Empty result, retry
    } catch (error) {
      logger.warn(`TTS attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < config.retries - 1) {
        await sleep(config.retryDelayMs * Math.pow(2, attempt));
      }
    }
  }
  return null;  // Trigger fallback to next provider
}
```

---

### GAP-23.7: AbortSignal Propagation (Cancellation)

**Source:** openai-agents-js

**Problem:** Design doesn't show how SIGINT/cancellation flows through pipeline.

**Evidence:**

```typescript
// vendor/openai-agents-js/packages/agents-core/src/run.ts
export type SharedRunOptions<TContext = undefined> = {
  signal?: AbortSignal;
};

// vendor/openai-agents-js/packages/agents-core/src/model.ts
export type ModelRequest = {
  signal?: AbortSignal;
};

// Propagated to streaming:
for await (const event of model.getStreamedResponse({ signal: options.signal })) {
  if (result.cancelled) return;
}
```

**Resolution:** Add cancellation throughout:

```typescript
// src/core/pipeline.ts
export class Pipeline {
  private abortController = new AbortController();
  
  constructor() {
    process.on('SIGINT', () => {
      console.log('\n⚠️  Cancelling pipeline...');
      this.abortController.abort();
    });
  }
  
  get signal(): AbortSignal {
    return this.abortController.signal;
  }
  
  async run(stages: PipelineStage[]): Promise<void> {
    for (const stage of stages) {
      if (this.signal.aborted) {
        throw new CancellationError('Pipeline cancelled by user');
      }
      await stage.execute({ signal: this.signal });
    }
  }
}

// All providers accept signal
interface LLMProvider {
  chat(messages: LLMMessage[], options?: { signal?: AbortSignal }): Promise<LLMResponse>;
}

// Fetch calls respect signal
await fetch(url, { signal: context.signal });
```

---

### GAP-23.8: Usage Accumulator Class

**Source:** openai-agents-js

**Problem:** Design mentions cost tracking but lacks accumulator pattern.

**Evidence:**

```typescript
// vendor/openai-agents-js/packages/agents-core/src/usage.ts
export class Usage {
  public requests: number = 0;
  public inputTokens: number = 0;
  public outputTokens: number = 0;
  public totalTokens: number = 0;
  public requestUsageEntries: RequestUsage[] = [];

  add(newUsage: Usage) {
    this.requests += newUsage.requests ?? 0;
    this.inputTokens += newUsage.inputTokens ?? 0;
    this.outputTokens += newUsage.outputTokens ?? 0;
    this.totalTokens += newUsage.totalTokens ?? 0;
    if (newUsage.requestUsageEntries?.length > 0) {
      this.requestUsageEntries.push(...newUsage.requestUsageEntries);
    }
  }
}
```

**Resolution:** Create CostTracker class:

```typescript
// src/core/cost-tracker.ts
interface UsageEntry {
  service: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
}

export class CostTracker {
  private entries: UsageEntry[] = [];
  
  // Pricing table ($ per 1M tokens)
  private static PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
  };
  
  add(entry: UsageEntry): void {
    this.entries.push(entry);
  }
  
  getTotalCost(): number {
    return this.entries.reduce((sum, entry) => {
      const pricing = CostTracker.PRICING[entry.model] ?? { input: 0, output: 0 };
      return sum + 
        (entry.inputTokens / 1_000_000 * pricing.input) +
        (entry.outputTokens / 1_000_000 * pricing.output);
    }, 0);
  }
  
  getSummary(): string {
    const total = this.getTotalCost();
    const byService = this.getByService();
    return `
────────────────────────────
Cost Summary:
  LLM:       $${byService.llm.toFixed(4)}
  Embedding: $${byService.embedding.toFixed(4)}
  Total:     $${total.toFixed(4)}
────────────────────────────`;
  }
}
```

---

### GAP-23.9: Typed Lifecycle Hooks with Signatures

**Source:** openai-agents-js

**Problem:** Design has event system but lacks specific event signatures.

**Evidence:**

```typescript
// vendor/openai-agents-js/packages/agents-core/src/lifecycle.ts
export type RunHookEvents = {
  agent_start: [context, agent, turnInput];
  agent_end: [context, agent, output];
  agent_tool_start: [context, agent, tool, { toolCall }];
  agent_tool_end: [context, agent, tool, result, { toolCall }];
};
```

**Resolution:** Define complete hook event types:

```typescript
// src/core/events.ts
export interface PipelineEvents {
  'pipeline:start': {
    projectId: string;
    archetype: string;
    startedAt: Date;
  };
  
  'pipeline:end': {
    projectId: string;
    duration: number;
    success: boolean;
    outputPath?: string;
    error?: Error;
  };
  
  'stage:start': {
    stage: 'script' | 'audio' | 'visuals' | 'render';
    input: unknown;
    startedAt: Date;
  };
  
  'stage:end': {
    stage: 'script' | 'audio' | 'visuals' | 'render';
    output: unknown;
    duration: number;
  };
  
  'llm:request': {
    model: string;
    messages: LLMMessage[];
    temperature: number;
  };
  
  'llm:response': {
    model: string;
    content: string;
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
  };
  
  'tts:start': {
    engine: string;
    textLength: number;
  };
  
  'tts:complete': {
    engine: string;
    durationSeconds: number;
    audioBytesSize: number;
  };
  
  'render:progress': {
    progress: number;  // 0-100
    framesCurrent: number;
    framesTotal: number;
    eta?: number;
  };
  
  'cost:incurred': {
    service: string;
    model: string;
    amount: number;
    tokens: { input: number; output: number };
  };
}

// Type-safe emitter
export class TypedEventEmitter {
  on<K extends keyof PipelineEvents>(
    event: K,
    handler: (payload: PipelineEvents[K]) => void
  ): void;
  
  emit<K extends keyof PipelineEvents>(
    event: K,
    payload: PipelineEvents[K]
  ): void;
}
```

---

## 4. P2 Gaps (Post-MVP Enhancement)

### GAP-23.10: Reasoning Model Settings

**Source:** openai-agents-js

**Problem:** Design doesn't support o1/o3 reasoning model configuration.

**Evidence:**

```typescript
// vendor/openai-agents-js/packages/agents-core/src/model.ts
export type ModelSettings = {
  reasoning?: {
    effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
    summary?: 'auto' | 'concise' | 'detailed';
  };
};
```

**Resolution:** Add to LLM config for future:

```typescript
interface LLMConfigExtended {
  // Existing
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  
  // Reasoning models (o1, o3)
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
    budgetTokens?: number;
  };
  
  // Prompt caching (Anthropic, OpenAI)
  promptCaching?: 'ephemeral' | '24h' | 'disabled';
}
```

---

## 5. Summary: Implementation Checklist

| Gap ID | Description | Priority | Status |
|--------|-------------|----------|--------|
| GAP-23.1 | Constructor injection pattern | P0 | ⬜ Add to §18 |
| GAP-23.2 | Test stub infrastructure | P0 | ⬜ Create src/test/stubs/ |
| GAP-23.3 | Multi-key API rotation | P1 | ⬜ Update config schema |
| GAP-23.4 | Joker term fallback | P1 | ⬜ Add to cm visuals |
| GAP-23.5 | Video validation after download | P1 | ⬜ Add FFprobe helper |
| GAP-23.6 | Retry-within-provider TTS | P1 | ⬜ Add retry config |
| GAP-23.7 | AbortSignal propagation | P1 | ⬜ Add to Pipeline class |
| GAP-23.8 | Usage accumulator class | P1 | ⬜ Create CostTracker |
| GAP-23.9 | Typed lifecycle hooks | P1 | ⬜ Define PipelineEvents |
| GAP-23.10 | Reasoning model settings | P2 | ⬜ Post-MVP |

---

## 6. References

- [vendor/short-video-maker-gyori](../../../vendor/short-video-maker-gyori) — Constructor injection, Pexels fallback
- [vendor/MoneyPrinterTurbo](../../../vendor/MoneyPrinterTurbo) — Multi-key rotation, video validation, TTS retry
- [vendor/openai-agents-js](../../../vendor/openai-agents-js) — FakeModel stubs, Usage class, AbortSignal, lifecycle hooks
