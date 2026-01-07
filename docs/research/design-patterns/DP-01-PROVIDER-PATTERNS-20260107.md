# DP-01: Provider Patterns Research

**Document ID:** DP-01-PROVIDER-PATTERNS-20260107  
**Category:** Design Patterns Research  
**Status:** Complete  
**Created:** 2026-01-07  

---

## Executive Summary

This document analyzes the current provider implementations in content-machine (LLM, TTS, ASR, Stock) and recommends Gang of Four design patterns to unify, extend, and test them effectively.

**Key Findings:**
1. `LLMProvider` is a well-implemented **Strategy Pattern** that should be the model for all providers
2. TTS/ASR/Stock providers lack formal interfaces, making testing and swapping difficult
3. **Abstract Factory Pattern** is needed to create provider families for production vs testing
4. **Decorator Pattern** is essential for cross-cutting concerns (logging, caching, retry)

---

## 1. Current State Analysis

### 1.1 LLM Provider (Excellent ⭐⭐⭐)

**Location:** [src/core/llm/provider.ts](../../../src/core/llm/provider.ts)

```typescript
// Well-defined Strategy interface
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}
```

**Concrete Implementations:**
- `OpenAIProvider` → Real API calls
- `AnthropicProvider` → Real API calls  
- `FakeLLMProvider` → Test double with response queue

**Strengths:**
- Clear interface contract with typed inputs/outputs
- Test double allows queueing specific responses
- Call history tracking for verification
- Factory function `createLLMProvider()` centralizes creation

**Pattern Used:** Strategy + Factory Method

---

### 1.2 TTS Provider (Needs Improvement ⭐⭐)

**Location:** [src/audio/tts/index.ts](../../../src/audio/tts/index.ts)

```typescript
// No formal interface - just a function
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> { ... }

// Caching is informal
let cachedTTS: any = null;
```

**Issues:**
1. **No interface** - Direct function call, not injectable
2. **Informal caching** - Module-level variable, hard to clear in tests
3. **No strategy switching** - Only Kokoro, can't swap to EdgeTTS/ElevenLabs
4. **Test double is incomplete** - `FakeTTSProvider` exists but isn't used through DI

**Required Improvements:**
- Define `TTSProvider` interface matching `LLMProvider` pattern
- Move `FakeTTSProvider` to implement the interface
- Add provider configuration to allow runtime switching

---

### 1.3 ASR Provider (Needs Improvement ⭐⭐)

**Location:** [src/audio/asr/index.ts](../../../src/audio/asr/index.ts)

```typescript
// No formal interface
export async function transcribeAudio(options: ASROptions): Promise<ASRResult> { ... }

// Hardcoded fallback strategy
if (!whisper) {
  return estimateTimestamps(...);  // Fallback embedded in function
}
```

**Issues:**
1. **No interface** - Same as TTS
2. **Fallback logic embedded** - Should be separate strategy
3. **Whisper loading is fragile** - Dynamic import with module-level caching

**Required Improvements:**
- Define `ASRProvider` interface
- Create `WhisperASRProvider`, `EstimatedASRProvider` as strategies
- Use Chain of Responsibility for fallback

---

### 1.4 Stock Provider (Partial ⭐⭐)

**Location:** [src/visuals/providers/pexels.ts](../../../src/visuals/providers/pexels.ts)

```typescript
// Function-based, no interface
export async function searchPexels(options: PexelsSearchOptions): Promise<PexelsVideo[]> { ... }

// Caching is informal
let cachedClient: ReturnType<typeof createClient> | null = null;
```

**Issues:**
1. **No `StockProvider` interface** - Can't easily add Pixabay, Unsplash
2. **Matching logic in matcher.ts** is tightly coupled to Pexels
3. **`FakePexelsProvider` exists** but isn't used through interface

---

## 2. Pattern Recommendations

### 2.1 Strategy Pattern (Extend to All Providers)

**Goal:** Every provider type should have a formal interface that allows runtime swapping.

```typescript
// src/core/providers/contracts.ts

// ==================== TTS ====================
export interface TTSProvider {
  readonly name: string;
  synthesize(options: TTSOptions): Promise<TTSResult>;
}

// ==================== ASR ====================
export interface ASRProvider {
  readonly name: string;
  transcribe(options: ASROptions): Promise<ASRResult>;
}

// ==================== Stock ====================
export interface StockProvider {
  readonly name: string;
  search(options: StockSearchOptions): Promise<StockResult[]>;
  getVideo(id: string): Promise<StockResult>;
}
```

**Benefits:**
1. **Testability** - Inject fakes via constructor
2. **Flexibility** - Switch providers at runtime
3. **Consistency** - All providers follow same pattern as LLM

---

### 2.2 Abstract Factory Pattern (Provider Families)

**Problem:** When testing, you want ALL providers to be fakes. When in production, all should be real.

**Solution:**

```typescript
// src/core/providers/factory.ts

export interface ProviderFactory {
  createLLMProvider(): LLMProvider;
  createTTSProvider(): TTSProvider;
  createASRProvider(): ASRProvider;
  createStockProvider(): StockProvider;
}

export class ProductionProviderFactory implements ProviderFactory {
  constructor(private config: Config) {}

  createLLMProvider(): LLMProvider {
    return createLLMProvider(this.config.llm.provider, this.config.llm.model);
  }

  createTTSProvider(): TTSProvider {
    return new KokoroTTSProvider();
  }

  createASRProvider(): ASRProvider {
    return new WhisperASRProvider();
  }

  createStockProvider(): StockProvider {
    return new PexelsStockProvider(this.config.pexels.apiKey);
  }
}

export class MockProviderFactory implements ProviderFactory {
  readonly llm = new FakeLLMProvider();
  readonly tts = new FakeTTSProvider();
  readonly asr = new FakeASRProvider();
  readonly stock = new FakeStockProvider();

  createLLMProvider(): LLMProvider { return this.llm; }
  createTTSProvider(): TTSProvider { return this.tts; }
  createASRProvider(): ASRProvider { return this.asr; }
  createStockProvider(): StockProvider { return this.stock; }
}
```

**Usage in Pipeline:**

```typescript
// Production
const factory = new ProductionProviderFactory(config);
await runPipeline({ ...options, providerFactory: factory });

// Testing
const factory = new MockProviderFactory();
factory.llm.queueJsonResponse(mockScript);
factory.stock.queueVideos(mockVideos);
await runPipeline({ ...options, providerFactory: factory });
```

---

### 2.3 Decorator Pattern (Cross-Cutting Concerns)

**Problem:** You want logging, caching, and retry logic without modifying every provider.

**Solution:**

```typescript
// src/core/providers/decorators/logging-decorator.ts

export class LoggingLLMProvider implements LLMProvider {
  constructor(
    private inner: LLMProvider,
    private log: Logger
  ) {}

  readonly name = this.inner.name;
  readonly model = this.inner.model;

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    this.log.debug({ messageCount: messages.length, model: this.model }, 'LLM request');
    const start = Date.now();
    
    try {
      const response = await this.inner.chat(messages, options);
      this.log.info({
        durationMs: Date.now() - start,
        tokens: response.usage.totalTokens
      }, 'LLM response');
      return response;
    } catch (error) {
      this.log.error({ error, durationMs: Date.now() - start }, 'LLM error');
      throw error;
    }
  }
}

// Composable decorators
const provider = new LoggingLLMProvider(
  new RetryLLMProvider(
    new CachingLLMProvider(
      new OpenAIProvider('gpt-4o')
    )
  ),
  logger
);
```

---

### 2.4 Adapter Pattern (3rd Party APIs)

The current Pexels integration is essentially an Adapter - it converts the Pexels API to internal types. This should be explicit:

```typescript
// src/visuals/providers/pexels-adapter.ts

export class PexelsStockProvider implements StockProvider {
  readonly name = 'pexels';
  private client: ReturnType<typeof createClient>;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  async search(options: StockSearchOptions): Promise<StockResult[]> {
    const response = await this.client.videos.search({
      query: options.query,
      orientation: options.orientation,
      per_page: options.perPage ?? 10,
    });

    // Adapt Pexels response to internal StockResult
    return (response as Videos).videos.map(this.adaptVideo);
  }

  private adaptVideo(video: Video): StockResult {
    return {
      id: String(video.id),
      url: getBestVideoUrl(video),
      thumbnailUrl: video.image,
      duration: video.duration,
      width: video.width,
      height: video.height,
      provider: 'pexels',
      attribution: video.user.name,
    };
  }
}
```

---

## 3. Code Smell Analysis

### 3.1 Module-Level Caching (Singleton Anti-Pattern)

**Found in:** TTS, ASR, Pexels, LLM provider

```typescript
// Bad: Module-level cache that's hard to reset
let cachedTTS: any = null;
let cachedClient: ReturnType<typeof createClient> | null = null;
```

**Fix:** Move cache into provider instance with explicit `reset()` method:

```typescript
export class KokoroTTSProvider implements TTSProvider {
  private model: KokoroTTS | null = null;

  async getModel(): Promise<KokoroTTS> {
    if (!this.model) {
      this.model = await KokoroTTS.from_pretrained(...);
    }
    return this.model;
  }

  reset(): void {
    this.model = null;
  }
}
```

---

### 3.2 Dynamic Imports with Error Swallowing

**Found in:** ASR whisper loading

```typescript
// Bad: Silent failure
try {
  whisperModule = await import('@remotion/install-whisper-cpp');
} catch {
  whisperInstallFailed = true;
  return null;  // Caller doesn't know WHY it failed
}
```

**Fix:** Explicit error handling with reason:

```typescript
export class WhisperASRProvider implements ASRProvider {
  private initError: Error | null = null;

  async initialize(): Promise<void> {
    try {
      this.whisper = await import('@remotion/install-whisper-cpp');
    } catch (error) {
      this.initError = error instanceof Error ? error : new Error(String(error));
      throw new ASRInitError('Whisper module not available', this.initError);
    }
  }

  isAvailable(): boolean {
    return this.initError === null;
  }

  getInitError(): Error | null {
    return this.initError;
  }
}
```

---

## 4. Interface Contracts (Proposed)

### 4.1 Unified Provider Type System

```typescript
// src/core/providers/types.ts

// ==================== Base Types ====================
export interface ProviderUsage {
  cost: number;  // In USD
  units?: number;  // Provider-specific (tokens, characters, seconds)
}

// ==================== TTS ====================
export interface TTSOptions {
  text: string;
  voice: string;
  outputPath: string;
  speed?: number;
}

export interface TTSResult {
  audioPath: string;
  duration: number;  // Seconds
  sampleRate: number;
  usage: ProviderUsage;
}

export interface TTSProvider {
  readonly name: string;
  readonly voices: string[];
  synthesize(options: TTSOptions): Promise<TTSResult>;
}

// ==================== ASR ====================
export interface ASROptions {
  audioPath: string;
  model?: string;
  language?: string;
  originalText?: string;  // For fallback estimation
}

export interface ASRWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface ASRResult {
  words: ASRWord[];
  duration: number;
  text: string;
  engine: string;
}

export interface ASRProvider {
  readonly name: string;
  transcribe(options: ASROptions): Promise<ASRResult>;
  isAvailable(): boolean;
}

// ==================== Stock ====================
export interface StockSearchOptions {
  query: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  perPage?: number;
  page?: number;
}

export interface StockResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  width: number;
  height: number;
  provider: string;
  attribution?: string;
}

export interface StockProvider {
  readonly name: string;
  search(options: StockSearchOptions): Promise<StockResult[]>;
  getVideo(id: string): Promise<StockResult>;
}
```

---

## 5. Migration Path

### Phase 1: Define Interfaces (Non-Breaking)
1. Create `src/core/providers/types.ts` with all interfaces
2. Create `src/core/providers/factory.ts` with `ProviderFactory` interface
3. Update existing fakes to implement new interfaces

### Phase 2: Refactor Existing Providers (Low Risk)
1. Wrap existing functions in class implementing interface
2. Deprecate direct function exports (keep for backward compat)
3. Add interface exports to package

### Phase 3: Add Decorator Infrastructure (Medium Risk)
1. Create decorator base classes for each provider type
2. Add logging decorator
3. Add retry decorator
4. Add caching decorator for LLM/Stock

### Phase 4: Integrate with Pipeline (High Impact)
1. Update `runPipeline()` to accept `ProviderFactory`
2. Add `mock` option that uses `MockProviderFactory`
3. Remove hardcoded provider creation

---

## 6. Test Strategy

### 6.1 Interface Contract Tests

Every provider interface should have contract tests that any implementation must pass:

```typescript
// tests/contracts/tts-provider.contract.ts

export function runTTSProviderContractTests(
  createProvider: () => TTSProvider,
  name: string
): void {
  describe(`TTSProvider contract: ${name}`, () => {
    let provider: TTSProvider;

    beforeEach(() => {
      provider = createProvider();
    });

    it('should have a name', () => {
      expect(provider.name).toBeDefined();
      expect(typeof provider.name).toBe('string');
    });

    it('should synthesize valid text', async () => {
      const result = await provider.synthesize({
        text: 'Hello world',
        voice: provider.voices[0],
        outputPath: '/tmp/test.wav',
      });

      expect(result.duration).toBeGreaterThan(0);
      expect(result.audioPath).toBe('/tmp/test.wav');
    });

    it('should throw on empty text', async () => {
      await expect(
        provider.synthesize({
          text: '',
          voice: provider.voices[0],
          outputPath: '/tmp/test.wav',
        })
      ).rejects.toThrow();
    });
  });
}
```

---

## 7. Appendix: Pattern Cross-Reference

| Pattern | GoF Category | Current Use | Recommended Action |
|---------|-------------|-------------|-------------------|
| Strategy | Behavioral | LLMProvider ✅ | Extend to TTS, ASR, Stock |
| Factory Method | Creational | createLLMProvider() ✅ | Extend to all providers |
| Abstract Factory | Creational | None | Add ProviderFactory |
| Decorator | Structural | None | Add Logging, Caching, Retry |
| Adapter | Structural | Implicit in Pexels | Make explicit |
| Singleton | Creational | Module cache (anti-pattern) | Replace with instance cache |
| Facade | Structural | None | Consider for ContentMachine API |

---

## 8. References

- [SYSTEM-DESIGN-20260104.md](../../architecture/SYSTEM-DESIGN-20260104.md) §5.1 Dependency Injection
- [AGENTS.md](../../../AGENTS.md) Architecture Principles
- Gang of Four: Design Patterns (Gamma et al., 1994)
- [FakeLLMProvider](../../../src/test/stubs/fake-llm.ts) - Reference implementation

---

**Next Steps:**
1. Review with team
2. Create implementation tickets for each phase
3. Start with Phase 1 (interface definitions) as foundation

