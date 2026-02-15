# DP-01: Provider Abstraction Using Strategy Pattern

**Date:** 2026-01-07  
**Status:** Research Complete  
**Category:** Design Patterns  
**Priority:** P0 (Critical)  
**Pattern Type:** GoF Strategy + Factory Method

---

## 1. Executive Summary

The **Strategy Pattern** is the foundational design pattern for content-machine's multi-provider architecture. This document analyzes the current implementation, identifies gaps, and provides a comprehensive refactoring plan to ensure all providers (LLM, TTS, ASR, Stock Footage) follow a consistent, testable interface contract.

---

## 2. Current State Analysis

### 2.1 What's Working Well

The LLM provider system is a **textbook Strategy implementation**:

```typescript
// src/core/llm/provider.ts - EXCELLENT
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

// Concrete strategies
class OpenAIProvider implements LLMProvider { ... }
class AnthropicProvider implements LLMProvider { ... }
class FakeLLMProvider implements LLMProvider { ... }  // Test double
```

**Factory Method** cleanly creates providers:

```typescript
// src/core/llm/index.ts
export function createLLMProvider(provider: LLMProviderType, model?: string): LLMProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(model ?? 'gpt-4o');
    case 'anthropic':
      return new AnthropicProvider(model ?? 'claude-3-5-sonnet');
  }
}
```

### 2.2 Gap Analysis: TTS Provider

**Current implementation lacks interface abstraction:**

```typescript
// src/audio/tts/index.ts - PROBLEMATIC
let cachedTTS: any = null; // Module-level singleton

export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  // Hardcoded to kokoro-js, no interface
}
```

**Problems:**

1. No `TTSProvider` interface
2. Cannot swap to EdgeTTS or ElevenLabs without code changes
3. Difficult to test (requires mocking module imports)
4. Singleton pattern prevents parallel testing

### 2.3 Gap Analysis: Stock Footage Provider

**Current implementation is function-based, not class-based:**

```typescript
// src/visuals/providers/pexels.ts - PARTIALLY IMPLEMENTED
let cachedClient: ReturnType<typeof createClient> | null = null;

export async function searchPexels(options: PexelsSearchOptions): Promise<PexelsVideo[]> {
  // No interface, direct implementation
}
```

**Problems:**

1. No `StockProvider` interface
2. Pixabay mentioned in docs but not implemented
3. Cannot inject mock providers for testing

### 2.4 Gap Analysis: ASR Provider

**Current implementation:**

```typescript
// src/audio/asr/index.ts - review needed
export async function transcribeAudio(options: TranscribeOptions): Promise<ASRResult> {
  // Direct Whisper implementation
}
```

---

## 3. Vendor Evidence: Best Practices

### 3.1 ShortGPT VoiceModule Pattern (Python)

```python
# vendor/ShortGPT/shortGPT/audio/voice_module.py
class VoiceModule(ABC):
    @abstractmethod
    def generate_voice(self, text: str, outputfile: str) -> str:
        pass

    @abstractmethod
    def get_remaining_characters(self) -> int:
        pass

class EdgeTTSVoiceModule(VoiceModule):
    # Concrete implementation

class ElevenLabsVoiceModule(VoiceModule):
    # Concrete implementation
```

**Key insight:** Includes `get_remaining_characters()` for quota tracking.

### 3.2 MoneyPrinterTurbo Material Service Pattern

```python
# vendor/MoneyPrinterTurbo/app/services/material.py
def download_videos(source: str = "pexels", ...):
    search_videos = search_videos_pexels
    if source == "pixabay":
        search_videos = search_videos_pixabay
    # Uses function references as strategies
```

**Key insight:** Function-based strategy selection (simpler but less testable).

### 3.3 short-video-maker-gyori Pexels Class

```typescript
// vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts
export class PexelsAPI {
  constructor(private API_KEY: string) {}

  async findVideo(searchTerms: string[], ...): Promise<Video> {
    // With retry logic and joker fallbacks
  }
}
```

**Key insight:** Class-based with constructor injection of API key.

---

## 4. Recommended Architecture

### 4.1 Core Provider Interfaces

```typescript
// src/core/providers/types.ts

/**
 * Base provider interface for all external services
 */
export interface BaseProvider {
  readonly name: string;
  readonly isAvailable: boolean;
  healthCheck(): Promise<boolean>;
}

/**
 * TTS Provider Strategy
 */
export interface TTSProvider extends BaseProvider {
  readonly supportedVoices: VoiceInfo[];
  readonly supportsTimestamps: boolean;

  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;
  synthesizeWithTimestamps?(text: string, options: TTSOptions): Promise<TTSResultWithTimestamps>;
  listVoices(): Promise<VoiceInfo[]>;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  style?: string;
}

export interface TTSOptions {
  voice: string;
  speed?: number; // 0.5 - 2.0
  pitch?: number; // -50 to +50
  outputFormat?: 'wav' | 'mp3';
}

export interface TTSResult {
  audio: Buffer;
  format: 'wav' | 'mp3';
  duration: number;
  sampleRate: number;
  cost: number;
}

/**
 * ASR Provider Strategy
 */
export interface ASRProvider extends BaseProvider {
  readonly supportedLanguages: string[];
  readonly supportsWordTimestamps: boolean;

  transcribe(audio: Buffer | string, options?: ASROptions): Promise<ASRResult>;
}

export interface ASRResult {
  text: string;
  words: WordTimestamp[];
  language: string;
  duration: number;
  confidence?: number;
}

/**
 * Stock Footage Provider Strategy
 */
export interface StockProvider extends BaseProvider {
  readonly supportedMediaTypes: ('video' | 'image')[];
  readonly requiresApiKey: boolean;

  search(query: string, options: StockSearchOptions): Promise<StockAsset[]>;
  download(asset: StockAsset, destination: string): Promise<string>;
  getAssetById(id: string): Promise<StockAsset>;
}

export interface StockSearchOptions {
  mediaType?: 'video' | 'image';
  orientation?: 'portrait' | 'landscape' | 'square';
  minDuration?: number;
  maxDuration?: number;
  perPage?: number;
  page?: number;
}

export interface StockAsset {
  id: string;
  provider: string;
  url: string;
  previewUrl?: string;
  duration?: number;
  width: number;
  height: number;
  description?: string;
  attribution?: string;
}
```

### 4.2 Provider Factory

```typescript
// src/core/providers/factory.ts

export interface ProviderRegistry {
  tts: Map<string, () => TTSProvider>;
  asr: Map<string, () => ASRProvider>;
  stock: Map<string, () => StockProvider>;
  llm: Map<string, () => LLMProvider>;
}

/**
 * Abstract Factory for all provider types
 */
export class ProviderFactory {
  private static registry: ProviderRegistry = {
    tts: new Map(),
    asr: new Map(),
    stock: new Map(),
    llm: new Map(),
  };

  /**
   * Register a TTS provider
   */
  static registerTTS(name: string, factory: () => TTSProvider): void {
    this.registry.tts.set(name, factory);
  }

  /**
   * Create a TTS provider by name
   */
  static createTTS(name: string): TTSProvider {
    const factory = this.registry.tts.get(name);
    if (!factory) {
      throw new ConfigError(
        `Unknown TTS provider: ${name}. Available: ${[...this.registry.tts.keys()].join(', ')}`
      );
    }
    return factory();
  }

  /**
   * Get all registered TTS providers
   */
  static getAvailableTTS(): string[] {
    return [...this.registry.tts.keys()];
  }

  // Similar methods for ASR, Stock, LLM...
}

// Registration at module load
ProviderFactory.registerTTS('kokoro', () => new KokoroTTSProvider());
ProviderFactory.registerTTS('edge', () => new EdgeTTSProvider());
ProviderFactory.registerTTS('elevenlabs', () => new ElevenLabsTTSProvider());
```

---

## 5. Test Stub Contracts

### 5.1 FakeTTSProvider

```typescript
// src/test/stubs/fake-tts-provider.ts

export class FakeTTSProvider implements TTSProvider {
  readonly name = 'fake';
  readonly isAvailable = true;
  readonly supportedVoices: VoiceInfo[] = [
    { id: 'fake-voice', name: 'Fake Voice', language: 'en' },
  ];
  readonly supportsTimestamps = true;

  private results: TTSResult[] = [];
  private calls: Array<{ text: string; options: TTSOptions }> = [];
  private shouldFail = false;
  private failureError?: Error;

  queueResult(result: TTSResult): void {
    this.results.push(result);
  }

  queueFailure(error: Error): void {
    this.shouldFail = true;
    this.failureError = error;
  }

  getCalls(): Array<{ text: string; options: TTSOptions }> {
    return [...this.calls];
  }

  reset(): void {
    this.results = [];
    this.calls = [];
    this.shouldFail = false;
    this.failureError = undefined;
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    this.calls.push({ text, options });

    if (this.shouldFail && this.failureError) {
      throw this.failureError;
    }

    const result = this.results.shift();
    if (result) return result;

    // Default mock result
    return {
      audio: Buffer.from('mock-audio'),
      format: 'wav',
      duration: text.split(' ').length / 2.5,
      sampleRate: 22050,
      cost: 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return this.supportedVoices;
  }
}
```

### 5.2 FakeStockProvider

```typescript
// src/test/stubs/fake-stock-provider.ts

export class FakeStockProvider implements StockProvider {
  readonly name = 'fake';
  readonly isAvailable = true;
  readonly supportedMediaTypes: ('video' | 'image')[] = ['video', 'image'];
  readonly requiresApiKey = false;

  private searchResults: Map<string, StockAsset[]> = new Map();
  private calls: Array<{ query: string; options: StockSearchOptions }> = [];

  queueSearchResults(query: string, results: StockAsset[]): void {
    this.searchResults.set(query.toLowerCase(), results);
  }

  getCalls(): Array<{ query: string; options: StockSearchOptions }> {
    return [...this.calls];
  }

  async search(query: string, options: StockSearchOptions): Promise<StockAsset[]> {
    this.calls.push({ query, options });

    const results = this.searchResults.get(query.toLowerCase());
    if (results) return results;

    // Default: return one mock video
    return [
      {
        id: `fake-${Date.now()}`,
        provider: 'fake',
        url: `https://fake.pexels.com/video/${query.replace(/\s/g, '-')}.mp4`,
        duration: 10,
        width: options.orientation === 'portrait' ? 1080 : 1920,
        height: options.orientation === 'portrait' ? 1920 : 1080,
        description: `Mock video for "${query}"`,
      },
    ];
  }

  async download(asset: StockAsset, destination: string): Promise<string> {
    // Mock download
    return destination;
  }

  async getAssetById(id: string): Promise<StockAsset> {
    return {
      id,
      provider: 'fake',
      url: `https://fake.pexels.com/video/${id}.mp4`,
      duration: 10,
      width: 1080,
      height: 1920,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
```

---

## 6. Migration Strategy

### Phase 1: Interface Definition (1 day)

1. Create `src/core/providers/types.ts` with all interfaces
2. Create `src/core/providers/factory.ts` with registry
3. Update existing test stubs to implement interfaces

### Phase 2: TTS Refactoring (2 days)

1. Create `KokoroTTSProvider` class implementing `TTSProvider`
2. Migrate `synthesizeSpeech()` to provider method
3. Update `audio/pipeline.ts` to use injected provider
4. Add tests for provider injection

### Phase 3: Stock Provider Refactoring (1 day)

1. Create `PexelsProvider` class implementing `StockProvider`
2. Migrate `searchPexels()` to provider method
3. Update `visuals/matcher.ts` to use injected provider

### Phase 4: Pipeline Integration (1 day)

1. Update `PipelineOptions` to accept provider factories
2. Create `ProductionProviderFactory` and `TestProviderFactory`
3. Update CLI to configure providers from config

---

## 7. Benefits of This Approach

| Benefit           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| **Testability**   | Inject fake providers, no module mocking needed       |
| **Extensibility** | Add EdgeTTS, ElevenLabs, Pixabay without core changes |
| **Configuration** | Switch providers via TOML config                      |
| **Type Safety**   | Interfaces enforce contract compliance                |
| **Documentation** | Self-documenting via interface definitions            |
| **Debugging**     | Clear provider identification in logs                 |

---

## 8. Related Documents

- [SYSTEM-DESIGN-20260104.md](../../dev/architecture/SYSTEM-DESIGN-20260104.md) §18.2 Provider Interface System
- [RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md](../investigations/RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md)
- [RQ-23-EXPERT-REVIEW-GAPS-20260105.md](../investigations/RQ-23-EXPERT-REVIEW-GAPS-20260105.md) GAP-23.2

---

**Next Step:** Proceed to implementation plan IMPL-DP-01-STRATEGY-PATTERN-20260107.md
