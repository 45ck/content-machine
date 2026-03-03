# TASK-022: Implement AudioFirstSyncStrategy

**Type:** Feature  
**Priority:** P1  
**Estimate:** M (4-8 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 2

---

## Description

Implement `AudioFirstSyncStrategy` that requires whisper.cpp (no fallback to estimation) and optionally reconciles ASR output to the original script text.

This is the recommended strategy for production use when sync quality is important. It trades speed/reliability for accuracy.

---

## Acceptance Criteria

- [ ] Given whisper.cpp available, when generating timestamps, then uses whisper exclusively
- [ ] Given whisper.cpp unavailable, when generating timestamps, then throws CMError (no fallback)
- [ ] Given `reconcile: true` option, when generating timestamps, then ASR words are mapped to script text
- [ ] Given reconciliation, when checking output, then words match original script while timing comes from ASR
- [ ] Given strategy failure, when checking error, then includes actionable fix suggestion

---

## Required Documentation

- [ ] JSDoc explaining when to use this strategy vs standard
- [ ] Document failure modes and how to recover

---

## Testing Considerations

### What Needs Testing

- Strategy requires whisper (fails without it)
- Reconciliation integration with reconcileToScript()
- Error handling and messages
- Option combinations

### Edge Cases

- Whisper fails mid-transcription
- Reconciliation produces empty result
- Very long audio files

### Risks

- Users confused by failure when whisper unavailable
- Reconciliation errors masking real sync issues

---

## Testing Plan

### Unit Tests - `src/audio/sync/strategies/audio-first.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioFirstSyncStrategy } from './audio-first';
import * as asr from '../../asr';
import * as reconcile from '../../asr/reconcile';
import { CMError } from '../../../core/errors';

vi.mock('../../asr');
vi.mock('../../asr/reconcile');

describe('AudioFirstSyncStrategy', () => {
  let strategy: AudioFirstSyncStrategy;

  beforeEach(() => {
    strategy = new AudioFirstSyncStrategy();
    vi.clearAllMocks();
  });

  describe('whisper requirement', () => {
    it('calls transcribeAudio with requireWhisper: true', async () => {
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [{ word: 'test', start: 0, end: 1 }],
        confidence: 0.9,
      });

      await strategy.generateTimestamps('/audio.wav', { scenes: [] } as any);

      expect(asr.transcribeAudio).toHaveBeenCalledWith(
        expect.objectContaining({ requireWhisper: true })
      );
    });

    it('throws CMError when whisper unavailable', async () => {
      vi.mocked(asr.transcribeAudio).mockRejectedValue(
        new CMError('DEPENDENCY_MISSING', 'whisper.cpp not available')
      );

      await expect(strategy.generateTimestamps('/audio.wav', {} as any)).rejects.toThrow(CMError);
    });

    it('error includes fix suggestion', async () => {
      vi.mocked(asr.transcribeAudio).mockRejectedValue(
        new CMError('DEPENDENCY_MISSING', 'whisper.cpp not available')
      );

      try {
        await strategy.generateTimestamps('/audio.wav', {} as any);
      } catch (e) {
        const error = e as CMError;
        expect(error.fix || error.message).toContain('whisper');
      }
    });
  });

  describe('reconciliation', () => {
    it('does not reconcile by default', async () => {
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [{ word: 'test', start: 0, end: 1 }],
        confidence: 0.9,
      });

      await strategy.generateTimestamps('/audio.wav', { scenes: [] } as any);

      expect(reconcile.reconcileToScript).not.toHaveBeenCalled();
    });

    it('reconciles when option enabled', async () => {
      const strategy = new AudioFirstSyncStrategy({ reconcile: true });

      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [{ word: 'tenex', start: 0.5, end: 0.8 }],
        confidence: 0.9,
      });

      vi.mocked(reconcile.reconcileToScript).mockReturnValue([
        { word: '10x', start: 0.5, end: 0.8 },
      ]);

      const script = { scenes: [{ text: '10x faster' }] } as any;

      await strategy.generateTimestamps('/audio.wav', script);

      expect(reconcile.reconcileToScript).toHaveBeenCalled();
    });

    it('passes script text to reconciliation', async () => {
      const strategy = new AudioFirstSyncStrategy({ reconcile: true });

      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [{ word: 'hello', start: 0, end: 0.5 }],
        confidence: 0.9,
      });

      vi.mocked(reconcile.reconcileToScript).mockReturnValue([
        { word: 'hello', start: 0, end: 0.5 },
      ]);

      const script = {
        hook: 'Hello world',
        scenes: [{ text: 'This is a test' }],
        cta: 'Subscribe now',
      } as any;

      await strategy.generateTimestamps('/audio.wav', script);

      // Should extract all spoken text from script
      expect(reconcile.reconcileToScript).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('Hello world')
      );
    });

    it('returns reconciled words in result', async () => {
      const strategy = new AudioFirstSyncStrategy({ reconcile: true });

      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [{ word: 'tenex', start: 0.5, end: 0.8 }],
        confidence: 0.9,
      });

      vi.mocked(reconcile.reconcileToScript).mockReturnValue([
        { word: '10x', start: 0.5, end: 0.8 },
      ]);

      const result = await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(result.words[0].word).toBe('10x');
      expect(result.metadata?.reconciled).toBe(true);
    });
  });

  describe('output format', () => {
    it('returns source as "whisper"', async () => {
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [],
        confidence: 0.9,
      });

      const result = await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(result.source).toBe('whisper');
    });

    it('includes confidence from ASR', async () => {
      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [],
        confidence: 0.87,
      });

      const result = await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(result.confidence).toBe(0.87);
    });
  });

  describe('name property', () => {
    it('returns "audio-first"', () => {
      expect(strategy.name).toBe('audio-first');
    });
  });

  describe('options', () => {
    it('uses provided ASR model', async () => {
      const strategy = new AudioFirstSyncStrategy({ asrModel: 'medium' });

      vi.mocked(asr.transcribeAudio).mockResolvedValue({
        engine: 'whisper-cpp',
        words: [],
        confidence: 0.95,
      });

      await strategy.generateTimestamps('/audio.wav', {} as any);

      expect(asr.transcribeAudio).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'medium' })
      );
    });
  });
});
```

---

## Implementation Notes

### Strategy Class

```typescript
// src/audio/sync/strategies/audio-first.ts

import type { SyncStrategy, SyncStrategyOptions, TimestampsResult } from '../strategy';
import type { ScriptOutput } from '../../../script/schema';
import { transcribeAudio, type ASRResult } from '../../asr';
import { reconcileToScript } from '../../asr/reconcile';
import { CMError } from '../../../core/errors';

/**
 * Audio-first sync strategy - requires whisper.cpp, no fallback.
 *
 * Use this strategy when:
 * - Sync accuracy is critical
 * - You have whisper.cpp installed
 * - You can tolerate failure if whisper unavailable
 *
 * Optionally reconciles ASR transcription to original script text
 * to fix issues like "10x" being transcribed as "tenex".
 */
export class AudioFirstSyncStrategy implements SyncStrategy {
  readonly name = 'audio-first';
  private readonly options: SyncStrategyOptions;

  constructor(options?: SyncStrategyOptions) {
    this.options = {
      asrModel: 'base',
      reconcile: false,
      ...options,
    };
  }

  async generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    runtimeOptions?: SyncStrategyOptions
  ): Promise<TimestampsResult> {
    const opts = { ...this.options, ...runtimeOptions };

    // Require whisper - no fallback
    const asrResult = await transcribeAudio({
      audioPath,
      model: opts.asrModel,
      requireWhisper: true, // Key difference from StandardSyncStrategy
    });

    let words = asrResult.words;
    let reconciled = false;

    // Optionally reconcile to script
    if (opts.reconcile) {
      const scriptText = this.extractScriptText(script);
      words = reconcileToScript(asrResult.words, scriptText);
      reconciled = true;
    }

    return {
      source: 'whisper',
      words: words.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
      confidence: asrResult.confidence,
      metadata: {
        model: asrResult.model,
        processingTimeMs: asrResult.processingTimeMs,
        reconciled,
      },
    };
  }

  /**
   * Extract all spoken text from script in order
   */
  private extractScriptText(script: ScriptOutput): string {
    const parts: string[] = [];

    if (script.hook) {
      parts.push(script.hook);
    }

    for (const scene of script.scenes) {
      parts.push(scene.text);
    }

    if (script.cta) {
      parts.push(script.cta);
    }

    return parts.join(' ');
  }
}
```

### Integration with Factory

Update `src/audio/sync/factory.ts`:

```typescript
import { AudioFirstSyncStrategy } from './strategies/audio-first';

const STRATEGY_MAP = {
  standard: StandardSyncStrategy,
  'audio-first': AudioFirstSyncStrategy,
  // ...
};
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/audio/sync/strategies/audio-first.test.ts`)
- [ ] Reconciliation integration tested
- [ ] Error messages are actionable
- [ ] JSDoc with usage guidance added
- [ ] Factory updated to include strategy
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** TASK-019 (Interface), TASK-021 (Reconcile Module)
- **Blocks:** TASK-023 (CLI Flags)
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
