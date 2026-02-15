# Implementation Plan: Sync Strategies Integration

**Date:** 2026-01-07  
**Status:** Ready for Implementation  
**Phase:** Enhancement (Post-MVP)  
**Effort:** 2-3 weeks

---

## Executive Summary

This implementation plan integrates the advanced sync strategies researched in RQ-30 through RQ-34 with the existing `cm rate` command to create a **closed-loop sync quality system**:

1. **Generation Phase** - Apply configurable sync strategies during `cm audio`
2. **Rating Phase** - Measure sync quality via `cm rate` after `cm render`
3. **Feedback Loop** - Use rating metrics to auto-select optimal strategies

The existing `cm rate` command already provides the **verification side**. This plan focuses on adding the **generation side** with configurable sync strategies.

---

## Current State Analysis

### What Already Exists

| Component              | Location                                                   | Purpose                              | Status      |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------ | ----------- |
| `cm rate`              | [src/cli/commands/rate.ts](../../src/cli/commands/rate.ts) | Post-render sync quality measurement | ✅ Complete |
| `rateSyncQuality()`    | [src/score/sync-rater.ts](../../src/score/sync-rater.ts)   | OCR + ASR comparison engine          | ✅ Complete |
| `SyncRatingOutput`     | [src/score/sync-schema.ts](../../src/score/sync-schema.ts) | Rating result schema                 | ✅ Complete |
| `transcribeAudio()`    | [src/audio/asr/index.ts](../../src/audio/asr/index.ts)     | Whisper.cpp ASR                      | ✅ Complete |
| `estimateTimestamps()` | [src/audio/asr/index.ts](../../src/audio/asr/index.ts)     | Fallback estimation                  | ✅ Complete |
| `generateAudio()`      | [src/audio/pipeline.ts](../../src/audio/pipeline.ts)       | TTS + timestamp pipeline             | ✅ Complete |

### What's Missing

| Component                   | Purpose                           | Priority |
| --------------------------- | --------------------------------- | -------- |
| `SyncConfigSchema`          | Configuration for sync strategies | High     |
| `SyncStrategy` interface    | Strategy pattern abstraction      | High     |
| `ReconcileModule`           | Match ASR text to original script | High     |
| `DriftDetector`             | Analyze drift patterns            | Medium   |
| `AeneasAdapter`             | Forced alignment integration      | Low      |
| CLI flags for `cm audio`    | `--sync-strategy`, `--reconcile`  | High     |
| Rating-based auto-selection | Choose strategy from history      | Future   |

---

## Architecture: Closed-Loop Sync System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Closed-Loop Sync Quality                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   GENERATION PHASE                    RATING PHASE                           │
│   ════════════════                    ═══════════════                        │
│                                                                              │
│   ┌────────────────┐                  ┌────────────────┐                    │
│   │   cm audio     │                  │   cm rate      │                    │
│   │                │                  │                │                    │
│   │ --sync-strategy│                  │ --min-rating   │                    │
│   │ --reconcile    │                  │ --fps          │                    │
│   └───────┬────────┘                  └───────┬────────┘                    │
│           │                                   │                              │
│           ▼                                   ▼                              │
│   ┌────────────────┐                  ┌────────────────┐                    │
│   │ SyncStrategy   │                  │ SyncRater      │                    │
│   │                │                  │                │                    │
│   │ • standard     │                  │ • OCR frames   │                    │
│   │ • audio-first  │                  │ • ASR words    │                    │
│   │ • forced-align │                  │ • Drift calc   │                    │
│   └───────┬────────┘                  └───────┬────────┘                    │
│           │                                   │                              │
│           ▼                                   ▼                              │
│   ┌────────────────┐                  ┌────────────────┐                    │
│   │ timestamps.json│──── render ────▶│ sync-report.json                    │
│   │                │                  │                │                    │
│   │ Word timings   │                  │ Rating: 85/100 │                    │
│   └────────────────┘                  └───────┬────────┘                    │
│                                               │                              │
│                                               ▼                              │
│                                       ┌────────────────┐                    │
│                                       │ FEEDBACK LOOP  │                    │
│                                       │ (Future)       │                    │
│                                       │                │                    │
│                                       │ • Learn optimal│                    │
│                                       │   strategy     │                    │
│                                       │ • Auto-retry   │                    │
│                                       └────────────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration: `cm rate` as Quality Gate

### Current `cm rate` Capabilities

```bash
# Analyze sync quality of rendered video
cm rate --input video.mp4 --output sync-report.json

# Set quality threshold (fails if below)
cm rate --input video.mp4 --min-rating 80

# Adjust sampling rate
cm rate --input video.mp4 --fps 5
```

### Proposed Integration Points

#### 1. Pipeline Integration

Add `cm rate` as optional step in `cm generate`:

```bash
# Full pipeline with quality gate
cm generate "Redis vs PostgreSQL" --sync-quality-check --min-sync-rating 75
```

#### 2. Auto-Retry on Failure

```bash
# Retry with different strategy if rating fails
cm generate "Redis vs PostgreSQL" --sync-quality-check --auto-retry-sync --min-sync-rating 85
```

Strategy escalation order:

1. `standard` (default)
2. `audio-first` + `reconcile` (one retry; if standard < threshold)

#### 3. Rating-Based Learning (Future)

Store ratings per topic/archetype to learn optimal strategy:

```json
{
  "archetype": "versus",
  "avgRating": {
    "standard": 72,
    "audio-first": 85,
    "forced-align": 91
  },
  "recommendedStrategy": "audio-first"
}
```

---

## Sync Strategy Implementations

### Strategy 1: Standard (Current Behavior)

**File:** `src/audio/sync/strategies/standard.ts`

```typescript
// TDD Test First
describe('StandardSyncStrategy', () => {
  it('uses whisper when available, falls back to estimation', async () => {
    const strategy = new StandardSyncStrategy();
    const result = await strategy.generateTimestamps(audio, script);

    expect(result.source).toBe('whisper'); // or 'estimation'
    expect(result.words).toHaveLength(script.wordCount);
  });

  it('does not fail when whisper unavailable', async () => {
    const strategy = new StandardSyncStrategy({ requireWhisper: false });
    mockWhisperUnavailable();

    const result = await strategy.generateTimestamps(audio, script);

    expect(result.source).toBe('estimation');
    expect(result.words).toBeDefined();
  });
});
```

**Implementation:**

```typescript
export class StandardSyncStrategy implements SyncStrategy {
  readonly name = 'standard';

  async generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    options: SyncStrategyOptions
  ): Promise<TimestampsOutput> {
    // Use existing transcribeAudio with fallback
    const asrResult = await transcribeAudio({
      audioPath,
      model: options.asrModel,
      requireWhisper: false, // Allow fallback
    });

    return {
      source: asrResult.engine,
      words: asrResult.words,
      confidence: asrResult.confidence,
    };
  }
}
```

### Strategy 2: Audio-First (No Fallback)

**File:** `src/audio/sync/strategies/audio-first.ts`

```typescript
// TDD Test First
describe('AudioFirstSyncStrategy', () => {
  it('requires whisper - fails without it', async () => {
    const strategy = new AudioFirstSyncStrategy();
    mockWhisperUnavailable();

    await expect(strategy.generateTimestamps(audio, script)).rejects.toThrow(CMError);
  });

  it('reconciles ASR text to original script', async () => {
    const strategy = new AudioFirstSyncStrategy({ reconcile: true });
    const result = await strategy.generateTimestamps(audio, script);

    // Words should match original script, not ASR transcription
    expect(result.words[0].word).toBe(script.scenes[0].text.split(' ')[0]);
  });
});
```

**Implementation:**

```typescript
export class AudioFirstSyncStrategy implements SyncStrategy {
  readonly name = 'audio-first';

  async generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    options: SyncStrategyOptions
  ): Promise<TimestampsOutput> {
    // Require whisper - no fallback
    const asrResult = await transcribeAudio({
      audioPath,
      model: options.asrModel,
      requireWhisper: true, // Fail if unavailable
    });

    // Optionally reconcile to original script
    if (options.reconcile) {
      return reconcileToScript(asrResult, script);
    }

    return {
      source: 'whisper',
      words: asrResult.words,
      confidence: asrResult.confidence,
    };
  }
}
```

### Strategy 3: Forced Alignment

**File:** `src/audio/sync/strategies/forced-align.ts`

```typescript
// TDD Test First
describe('ForcedAlignSyncStrategy', () => {
  it('uses Aeneas for phoneme-level alignment', async () => {
    const strategy = new ForcedAlignSyncStrategy();
    const result = await strategy.generateTimestamps(audio, script);

    expect(result.source).toBe('aeneas');
    expect(result.words[0].phonemes).toBeDefined();
  });

  it('falls back to audio-first when Aeneas unavailable', async () => {
    const strategy = new ForcedAlignSyncStrategy({ fallback: 'audio-first' });
    mockAeneasUnavailable();

    const result = await strategy.generateTimestamps(audio, script);

    expect(result.source).toBe('whisper');
  });
});
```

---

## Reconciliation Module

**Purpose:** Match ASR-transcribed words back to original script text.

**Problem:** ASR might transcribe "10x" as "ten ex" or "tenex"

**Solution:** Use Levenshtein similarity to align ASR output to original script.

**File:** `src/audio/asr/reconcile.ts`

```typescript
// TDD Test First
describe('reconcileToScript', () => {
  it('maps ASR words to script words by position and similarity', () => {
    const asrWords = [
      { word: 'tenex', start: 0.5, end: 0.8 },
      { word: 'faster', start: 0.9, end: 1.2 },
    ];
    const scriptText = '10x faster';

    const result = reconcileToScript(asrWords, scriptText);

    expect(result[0].word).toBe('10x'); // Mapped back
    expect(result[0].start).toBe(0.5); // Timing preserved
    expect(result[1].word).toBe('faster'); // Exact match
  });

  it('handles contractions correctly', () => {
    const asrWords = [{ word: "don't", start: 0.5, end: 0.7 }];
    const scriptText = "don't";

    const result = reconcileToScript(asrWords, scriptText);

    expect(result[0].word).toBe("don't");
  });

  it('handles word splitting (ASR splits script word)', () => {
    const asrWords = [
      { word: 'web', start: 0.5, end: 0.6 },
      { word: 'socket', start: 0.6, end: 0.8 },
    ];
    const scriptText = 'WebSocket';

    const result = reconcileToScript(asrWords, scriptText);

    // Merged back to original compound
    expect(result[0].word).toBe('WebSocket');
    expect(result[0].start).toBe(0.5);
    expect(result[0].end).toBe(0.8);
  });
});
```

---

## CLI Integration

### Updated `cm audio` Options

```typescript
// src/cli/commands/audio.ts additions
.option('--sync-strategy <strategy>',
  'Sync strategy: standard, audio-first, forced-align',
  'standard')
.option('--reconcile',
  'Reconcile ASR transcription to original script text')
.option('--drift-correction <mode>',
  'Drift correction: none, detect, auto',
  'none')
.option('--require-whisper',
  'Require whisper.cpp (fail if unavailable)')
```

### Updated `cm generate` Options

```typescript
// src/cli/commands/generate.ts additions
.option('--sync-preset <preset>',
  'Sync quality preset: fast, standard, quality, maximum',
  'standard')
.option('--sync-quality-check',
  'Run cm rate after render')
.option('--min-sync-rating <n>',
  'Minimum acceptable sync rating (0-100)',
  '75')
.option('--auto-retry-sync',
  'Retry with better strategy if rating fails')
```

### Preset Mappings

```typescript
const SYNC_PRESETS = {
  fast: {
    strategy: 'standard',
    reconcile: false,
    driftCorrection: 'none',
    qualityCheck: false,
  },
  standard: {
    strategy: 'standard',
    reconcile: false,
    driftCorrection: 'detect',
    qualityCheck: false,
  },
  quality: {
    strategy: 'audio-first',
    reconcile: true,
    driftCorrection: 'detect',
    qualityCheck: true,
    minRating: 75,
  },
  maximum: {
    strategy: 'forced-align',
    reconcile: true,
    driftCorrection: 'auto',
    qualityCheck: true,
    minRating: 85,
  },
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1) - 3 Tasks

| Task     | Description                                      | Effort   |
| -------- | ------------------------------------------------ | -------- |
| TASK-018 | Add `SyncConfigSchema` to config.ts              | S (2-4h) |
| TASK-019 | Create sync strategy interface & factory         | M (4-8h) |
| TASK-020 | Implement `StandardSyncStrategy` (wrap existing) | S (2-4h) |

### Phase 2: Audio-First Strategy (Week 2) - 3 Tasks

| Task     | Description                            | Effort   |
| -------- | -------------------------------------- | -------- |
| TASK-021 | Implement `reconcileToScript()` module | M (4-8h) |
| TASK-022 | Implement `AudioFirstSyncStrategy`     | M (4-8h) |
| TASK-023 | Add CLI flags to `cm audio`            | S (2-4h) |

### Phase 3: Integration & Polish (Week 3) - 3 Tasks

| Task     | Description                                 | Effort    |
| -------- | ------------------------------------------- | --------- |
| TASK-024 | Add `--sync-quality-check` to `cm generate` | M (4-8h)  |
| TASK-025 | Implement drift detection module            | M (4-8h)  |
| TASK-026 | E2E tests: full pipeline with sync rating   | L (8-16h) |

### Future Phase: Forced Alignment

| Task     | Description                         | Effort    |
| -------- | ----------------------------------- | --------- |
| TASK-F01 | Implement `AeneasAdapter`           | L (8-16h) |
| TASK-F02 | Implement `ForcedAlignSyncStrategy` | M (4-8h)  |
| TASK-F03 | Rating-based strategy learning      | XL (16+h) |

---

## Testing Strategy

### Unit Tests

| Module                 | Test File                                       | Coverage Target |
| ---------------------- | ----------------------------------------------- | --------------- |
| SyncConfigSchema       | `src/core/config.test.ts`                       | 100%            |
| SyncStrategy interface | `src/audio/sync/strategy.test.ts`               | 100%            |
| StandardSyncStrategy   | `src/audio/sync/strategies/standard.test.ts`    | 95%             |
| AudioFirstSyncStrategy | `src/audio/sync/strategies/audio-first.test.ts` | 95%             |
| reconcileToScript      | `src/audio/asr/reconcile.test.ts`               | 100%            |
| DriftDetector          | `src/audio/sync/drift.test.ts`                  | 90%             |

### Integration Tests

| Scenario                         | Test File                                  |
| -------------------------------- | ------------------------------------------ |
| audio → timestamps with strategy | `tests/integration/audio-sync.test.ts`     |
| generate → rate quality check    | `tests/integration/generate-rate.test.ts`  |
| CLI flag parsing                 | `tests/integration/cli-sync-flags.test.ts` |

### E2E Tests

| Scenario                                                | Expected Outcome                      |
| ------------------------------------------------------- | ------------------------------------- |
| `cm generate --sync-preset quality`                     | Video with rating ≥75                 |
| `cm generate --sync-quality-check --min-sync-rating 80` | Fails if rating <80                   |
| `cm audio --sync-strategy audio-first --reconcile`      | timestamps.json with reconciled words |

---

## Configuration Schema

### Addition to `src/core/config.ts`

```typescript
export const SyncConfigSchema = z.object({
  // Strategy selection
  strategy: z.enum(['standard', 'audio-first', 'forced-align', 'hybrid']).default('standard'),

  // ASR configuration
  requireWhisper: z.boolean().default(false),
  asrModel: z.enum(['tiny', 'base', 'small', 'medium']).default('base'),

  // Reconciliation
  reconcileToScript: z.boolean().default(false),
  minSimilarity: z.number().min(0).max(1).default(0.7),

  // Drift correction
  driftCorrection: z.enum(['none', 'detect', 'auto']).default('none'),
  maxDriftMs: z.number().default(80),

  // Validation
  validateTimestamps: z.boolean().default(true),
  autoRepair: z.boolean().default(true),

  // Quality gate (for generate command)
  qualityCheck: z.boolean().default(false),
  minRating: z.number().min(0).max(100).default(75),
  autoRetry: z.boolean().default(false),
  maxRetries: z.number().default(2),
});
```

---

## File Structure

```
src/audio/
├── sync/
│   ├── index.ts                 # Public exports
│   ├── strategy.ts              # SyncStrategy interface
│   ├── factory.ts               # createSyncStrategy()
│   ├── presets.ts               # Preset configurations
│   ├── drift.ts                 # DriftDetector
│   └── strategies/
│       ├── standard.ts          # StandardSyncStrategy
│       ├── audio-first.ts       # AudioFirstSyncStrategy
│       └── forced-align.ts      # ForcedAlignSyncStrategy
├── asr/
│   ├── index.ts                 # (existing)
│   ├── reconcile.ts             # reconcileToScript()
│   └── reconcile.test.ts        # Unit tests
└── tts/
    └── (existing)
```

---

## Dependencies

### Required (Already Installed)

- `@remotion/install-whisper-cpp` - ASR
- `tesseract.js` - OCR for `cm rate`
- `zod` - Schema validation

### Optional (For Forced Alignment)

- `aeneas` - Python, requires installation
- `whisperx` - Python, future hybrid strategy

### Development

- `vitest` - Testing
- `msw` - Mock service worker for integration tests

---

## Success Metrics

| Metric                           | Target  | Measurement                |
| -------------------------------- | ------- | -------------------------- |
| Default sync rating              | ≥75/100 | `cm rate` on sample videos |
| Audio-first sync rating          | ≥85/100 | `cm rate` on sample videos |
| Forced-align sync rating         | ≥90/100 | `cm rate` on sample videos |
| Reconciliation accuracy          | ≥95%    | Unit tests                 |
| CLI response time (standard)     | <30s    | Benchmark                  |
| CLI response time (forced-align) | <120s   | Benchmark                  |

---

## Related Documentation

- [RQ-30: Sync Pipeline Architecture](../research/investigations/RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md)
- [RQ-31: TTS Timestamp Extraction](../research/investigations/RQ-31-TTS-TIMESTAMP-EXTRACTION-METHODS-20260107.md)
- [RQ-32: Forced Alignment vs ASR](../research/investigations/RQ-32-FORCED-ALIGNMENT-VS-ASR-ANALYSIS-20260107.md)
- [RQ-33: Remotion Caption Patterns](../research/investigations/RQ-33-REMOTION-CAPTION-SYNC-PATTERNS-20260107.md)
- [RQ-34: Drift Detection Strategies](../research/investigations/RQ-34-DRIFT-DETECTION-RETIMING-STRATEGIES-20260107.md)
- [SYNC-INTEGRATION-GUIDE](../dev/guides/SYNC-INTEGRATION-GUIDE-20260107.md)
- [SYNC-CONFIG-REFERENCE](../reference/SYNC-CONFIG-REFERENCE-20260107.md)

---

## Changelog

| Date       | Change                      |
| ---------- | --------------------------- |
| 2026-01-07 | Initial implementation plan |
