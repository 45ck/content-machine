# TASK-020: Implement StandardSyncStrategy

**Type:** Feature  
**Priority:** P1  
**Estimate:** S (2-4 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 1

---

## Description

Implement `StandardSyncStrategy` by wrapping the existing ASR functionality from `src/audio/asr/index.ts`. This strategy uses whisper.cpp when available and falls back to estimation when not.

This task does NOT add new functionality - it refactors existing behavior into the strategy pattern established in TASK-019.

---

## Acceptance Criteria

- [ ] Given `StandardSyncStrategy`, when whisper is available, then uses whisper for timestamps
- [ ] Given `StandardSyncStrategy`, when whisper is unavailable, then falls back to estimation
- [ ] Given strategy result, when checking output, then matches existing `transcribeAudio()` behavior
- [ ] Given `requireWhisper: false` (default), when whisper unavailable, then gracefully degrades
- [ ] Given existing pipeline code, when using strategy, then produces identical output to before

---

## Required Documentation

- [ ] JSDoc comments on class and methods
- [ ] Inline comments explaining fallback logic

---

## Testing Considerations

### What Needs Testing

- Strategy wraps existing `transcribeAudio()` correctly
- Fallback behavior is preserved
- Output format matches `TimestampsResult` interface
- Options are passed through correctly

### Edge Cases

- Empty audio file
- Very short audio (<1 second)
- Audio with no speech

### Risks

- Regression in existing behavior
- Performance degradation from abstraction layer

---

## Testing Plan

### Unit Tests - `src/audio/sync/strategies/standard.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StandardSyncStrategy } from './standard';
import * as asr from '../../asr';

// Mock the ASR module
vi.mock('../../asr');

describe('StandardSyncStrategy', () => {
  let strategy: StandardSyncStrategy;

  beforeEach(() => {
    strategy = new StandardSyncStrategy();
    vi.clearAllMocks();
  });

  describe('generateTimestamps', () => {
    it('calls transcribeAudio with correct parameters', async () => {
      const mockResult = {
        engine: 'whisper-cpp',
        words: [{ word: 'hello', start: 0, end: 0.5 }],
        confidence: 0.95,
      };
      vi.mocked(asr.transcribeAudio).mockResolvedValue(mockResult);

      const script = { scenes: [{ text: 'hello' }] } as any;

      await strategy.generateTimestamps('/audio.wav', script);

      expect(asr.transcribeAudio).toHaveBeenCalledWith({
        audioPath: '/audio.wav',
        model: 'base',
        requireWhisper: false,
      });
    });

    it('returns TimestampsResult with correct source', async () => {
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [{ word: 'test', start: 0, end: 1 }],
        confidence: 0.9,
      });

      const result = await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(result.source).toBe('whisper');
      expect(result.words).toHaveLength(1);
      expect(result.confidence).toBe(0.9);
    });

    it('reports estimation source when whisper unavailable', async () => {
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'estimation',
        words: [{ word: 'test', start: 0, end: 1 }],
        confidence: 0.5,
      });

      const result = await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(result.source).toBe('estimation');
    });
  });

  describe('options handling', () => {
    it('uses provided ASR model', async () => {
      const strategy = new StandardSyncStrategy({ asrModel: 'small' });
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [],
        confidence: 0.9,
      });

      await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(asr.transcribeAudio).toHaveBeenCalledWith(expect.objectContaining({ model: 'small' }));
    });

    it('allows overriding requireWhisper', async () => {
      const strategy = new StandardSyncStrategy({ requireWhisper: true });
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [],
        confidence: 0.9,
      });

      await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(asr.transcribeAudio).toHaveBeenCalledWith(
        expect.objectContaining({ requireWhisper: true })
      );
    });
  });

  describe('name property', () => {
    it('returns "standard"', () => {
      expect(strategy.name).toBe('standard');
    });
  });
});
```

### Integration Tests - `tests/integration/standard-strategy.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { StandardSyncStrategy } from '../../src/audio/sync/strategies/standard';
import { generateAudio } from '../../src/audio/pipeline';

describe('StandardSyncStrategy integration', () => {
  it('produces same output as direct pipeline call', async () => {
    // This test ensures the strategy wrapper doesn't change behavior
    // Use a mock/fixture audio file
    const audioPath = 'test-fixtures/sample.wav';
    const script = { scenes: [{ text: 'Hello world' }] };

    // Direct call (existing behavior)
    const directResult = await generateAudio(script, { mockTts: true });

    // Strategy call
    const strategy = new StandardSyncStrategy();
    const strategyResult = await strategy.generateTimestamps(directResult.audioPath, script);

    // Should produce equivalent timestamps
    expect(strategyResult.words.length).toBe(directResult.timestamps.words.length);
  });
});
```

---

## Implementation Notes

### Strategy Class

```typescript
// src/audio/sync/strategies/standard.ts

import type { SyncStrategy, SyncStrategyOptions, TimestampsResult } from '../strategy';
import type { ScriptOutput } from '../../../script/schema';
import { transcribeAudio, type ASRResult } from '../../asr';

/**
 * Standard sync strategy - uses whisper when available, falls back to estimation.
 *
 * This is the default strategy that maintains backward compatibility with
 * existing behavior.
 */
export class StandardSyncStrategy implements SyncStrategy {
  readonly name = 'standard';
  private readonly options: SyncStrategyOptions;

  constructor(options?: SyncStrategyOptions) {
    this.options = {
      asrModel: 'base',
      requireWhisper: false,
      ...options,
    };
  }

  async generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    runtimeOptions?: SyncStrategyOptions
  ): Promise<TimestampsResult> {
    const opts = { ...this.options, ...runtimeOptions };

    const asrResult = await transcribeAudio({
      audioPath,
      model: opts.asrModel,
      requireWhisper: opts.requireWhisper,
    });

    return this.mapToTimestampsResult(asrResult);
  }

  private mapToTimestampsResult(asr: ASRResult): TimestampsResult {
    return {
      source: this.normalizeEngine(asr.engine),
      words: asr.words.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
      confidence: asr.confidence,
      metadata: {
        model: asr.model,
        processingTimeMs: asr.processingTimeMs,
      },
    };
  }

  private normalizeEngine(engine: string): 'whisper' | 'estimation' {
    if (engine.includes('whisper')) {
      return 'whisper';
    }
    return 'estimation';
  }
}
```

### Export from Index

```typescript
// src/audio/sync/index.ts

export { StandardSyncStrategy } from './strategies/standard';
export { createSyncStrategy, getAvailableStrategies } from './factory';
export type { SyncStrategy, SyncStrategyOptions, TimestampsResult } from './strategy';
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/audio/sync/strategies/standard.test.ts`)
- [ ] Integration tests pass
- [ ] No behavior change from existing pipeline
- [ ] JSDoc comments added
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** TASK-018, TASK-019
- **Blocks:** Phase 2 tasks
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Existing Code:** [src/audio/asr/index.ts](../../src/audio/asr/index.ts)
