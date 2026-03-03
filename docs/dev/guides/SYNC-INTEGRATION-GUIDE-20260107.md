# Implementation Guide: Configurable Sync Strategies

**Date:** 2026-01-07  
**Status:** Implementation Ready  
**Type:** Engineering Guide  
**Related:** RQ-30, RQ-31, RQ-32, RQ-33, RQ-34

---

## 1. Overview

This document provides a software engineering blueprint for integrating advanced audio-video synchronization features into content-machine as **configurable options**, not replacements. The goal is:

- ✅ Backward compatible (existing pipelines work unchanged)
- ✅ Opt-in features via CLI flags and config
- ✅ Progressive enhancement (users can upgrade sync quality as needed)
- ✅ Testable (each strategy is independently testable)

---

## 2. Configuration Schema Changes

### 2.1 New Config Fields

Add to `src/core/config.ts`:

```typescript
// ============================================================================
// NEW: Sync Configuration Schema
// ============================================================================

const SyncStrategyEnum = z.enum([
  'standard', // Current: whisper.cpp with estimation fallback
  'audio-first', // Require whisper, no fallback (RQ-30 pattern)
  'forced-align', // Use Aeneas for known text alignment (RQ-32)
  'hybrid', // WhisperX: ASR + forced alignment (RQ-32)
]);

const DriftCorrectionEnum = z.enum([
  'none', // No drift correction
  'detect', // Detect only, log warnings
  'auto', // Detect and auto-correct
]);

const SyncConfigSchema = z.object({
  /** Sync strategy - determines how timestamps are generated */
  strategy: SyncStrategyEnum.default('standard'),

  /** Drift correction behavior */
  driftCorrection: DriftCorrectionEnum.default('none'),

  /** Maximum acceptable drift in milliseconds before warning/correction */
  maxDriftMs: z.number().int().positive().default(80),

  /** Reconcile ASR text to original script (fixes "10x" → "tenex" issues) */
  reconcileToScript: z.boolean().default(false),

  /** Minimum confidence threshold for word timestamps */
  minConfidence: z.number().min(0).max(1).default(0.6),

  /** Validate timestamps before render (catch end < start bugs) */
  validateTimestamps: z.boolean().default(true),

  /** Repair invalid timestamps automatically */
  autoRepair: z.boolean().default(true),
});

export type SyncStrategy = z.infer<typeof SyncStrategyEnum>;
export type DriftCorrection = z.infer<typeof DriftCorrectionEnum>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
```

### 2.2 Updated Full Config Schema

```typescript
export const ConfigSchema = z.object({
  defaults: DefaultsSchema.default({}),
  llm: LLMConfigSchema.default({}),
  audio: AudioConfigSchema.default({}),
  visuals: VisualsConfigSchema.default({}),
  render: RenderConfigSchema.default({}),
  sync: SyncConfigSchema.default({}), // NEW
});
```

### 2.3 TOML Configuration Examples

```toml
# .content-machine.toml

# Default: Standard pipeline (current behavior)
[sync]
strategy = "standard"
drift_correction = "none"
validate_timestamps = true

# --- OR ---

# Audio-first: Require Whisper, no fallback (higher quality)
[sync]
strategy = "audio-first"
drift_correction = "detect"
max_drift_ms = 80
validate_timestamps = true
auto_repair = true

# --- OR ---

# Maximum quality: Forced alignment with drift correction
[sync]
strategy = "forced-align"
drift_correction = "auto"
max_drift_ms = 50
reconcile_to_script = true
min_confidence = 0.7
validate_timestamps = true
auto_repair = true
```

---

## 3. CLI Flag Extensions

### 3.1 Audio Command Flags

Add to `src/cli/commands/audio.ts`:

```typescript
export const audioCommand = new Command('audio')
  .description('Generate voiceover audio with word-level timestamps')
  .requiredOption('-i, --input <path>', 'Input script JSON file')
  .option('-o, --output <path>', 'Output audio file path', 'audio.wav')
  .option('--timestamps <path>', 'Output timestamps file path', 'timestamps.json')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--mock', 'Use mock TTS/ASR (for testing)', false)
  // NEW: Sync strategy options
  .option(
    '--sync-strategy <strategy>',
    'Sync strategy: standard, audio-first, forced-align, hybrid',
    'standard'
  )
  .option('--require-whisper', 'Require Whisper ASR (fail if not available)', false)
  .option('--reconcile', 'Reconcile ASR text to original script', false)
  .option('--drift-correction <mode>', 'Drift correction: none, detect, auto', 'none')
  .option('--no-validate', 'Skip timestamp validation');
// ... rest of action handler
```

### 3.2 Render Command Flags

Add to `src/cli/commands/render.ts`:

```typescript
export const renderCommand = new Command('render')
  // ... existing options
  // NEW: Caption sync options
  .option('--caption-sync <mode>', 'Caption sync mode: absolute, sequence-relative', 'absolute')
  .option('--highlight-offset-ms <ms>', 'Offset for word highlight timing (ms)', '0');
// ...
```

### 3.3 Generate Command (Full Pipeline)

```typescript
export const generateCommand = new Command('generate')
  // ... existing options
  // NEW: Sync preset options
  .option(
    '--sync-preset <preset>',
    'Sync quality preset: fast, standard, quality, maximum',
    'standard'
  );
// ...
```

**Preset mappings:**

| Preset     | Strategy     | Drift  | Reconcile | Validate |
| ---------- | ------------ | ------ | --------- | -------- |
| `fast`     | standard     | none   | false     | true     |
| `standard` | standard     | detect | false     | true     |
| `quality`  | audio-first  | detect | true      | true     |
| `maximum`  | forced-align | auto   | true      | true     |

---

## 4. Module Architecture

### 4.1 New Module Structure

```
src/
├── audio/
│   ├── asr/
│   │   ├── index.ts           # Main ASR interface (existing)
│   │   ├── validator.ts       # Timestamp validation (existing)
│   │   ├── whisper.ts         # whisper.cpp adapter (extract from index)
│   │   ├── aeneas.ts          # NEW: Aeneas forced alignment adapter
│   │   ├── whisperx.ts        # NEW: WhisperX hybrid adapter (future)
│   │   └── reconcile.ts       # NEW: ASR-to-script reconciliation
│   ├── sync/                  # NEW: Sync coordination module
│   │   ├── index.ts           # Sync strategy orchestrator
│   │   ├── strategies/
│   │   │   ├── standard.ts    # Current behavior
│   │   │   ├── audio-first.ts # Require whisper
│   │   │   └── forced-align.ts# Aeneas-based
│   │   ├── drift.ts           # Drift detection/correction
│   │   └── types.ts           # Sync-related types
│   └── pipeline.ts            # Updated to use sync module
```

### 4.2 Strategy Interface

```typescript
// src/audio/sync/types.ts

export interface SyncStrategyOptions {
  audioPath: string;
  originalText: string;
  audioDuration: number;
  config: SyncConfig;
}

export interface SyncStrategyResult {
  words: WordTimestamp[];
  duration: number;
  engine: string;
  metadata: {
    driftAnalysis?: DriftAnalysisResult;
    reconciliationApplied?: boolean;
    repairsApplied?: number;
  };
}

export interface SyncStrategy {
  name: string;

  /** Execute the sync strategy */
  execute(options: SyncStrategyOptions): Promise<SyncStrategyResult>;

  /** Check if this strategy is available (dependencies installed) */
  isAvailable(): Promise<boolean>;
}
```

### 4.3 Strategy Factory

```typescript
// src/audio/sync/index.ts

import { SyncConfig, SyncStrategy as SyncStrategyType } from '../../core/config';
import { StandardStrategy } from './strategies/standard';
import { AudioFirstStrategy } from './strategies/audio-first';
import { ForcedAlignStrategy } from './strategies/forced-align';
import type { SyncStrategy, SyncStrategyOptions, SyncStrategyResult } from './types';

const strategies: Record<SyncStrategyType, () => SyncStrategy> = {
  standard: () => new StandardStrategy(),
  'audio-first': () => new AudioFirstStrategy(),
  'forced-align': () => new ForcedAlignStrategy(),
  hybrid: () => new ForcedAlignStrategy(), // Same as forced-align for now
};

/**
 * Execute sync strategy based on configuration.
 * Falls back to standard if requested strategy unavailable.
 */
export async function executeSync(options: SyncStrategyOptions): Promise<SyncStrategyResult> {
  const log = createLogger({ module: 'sync', strategy: options.config.strategy });

  const strategyName = options.config.strategy;
  const strategy = strategies[strategyName]();

  // Check availability
  if (!(await strategy.isAvailable())) {
    if (strategyName === 'standard') {
      throw new APIError('Standard sync strategy unavailable (should never happen)');
    }

    log.warn(
      { requested: strategyName },
      'Requested sync strategy not available, falling back to standard'
    );

    const fallback = new StandardStrategy();
    return fallback.execute(options);
  }

  log.info({ strategy: strategyName }, 'Executing sync strategy');

  // Execute strategy
  const result = await strategy.execute(options);

  // Apply drift correction if configured
  if (options.config.driftCorrection !== 'none') {
    return await applyDriftCorrection(result, options);
  }

  return result;
}
```

---

## 5. Strategy Implementations

### 5.1 Standard Strategy (Current Behavior)

```typescript
// src/audio/sync/strategies/standard.ts

import { SyncStrategy, SyncStrategyOptions, SyncStrategyResult } from '../types';
import { transcribeAudio } from '../../asr';

export class StandardStrategy implements SyncStrategy {
  name = 'standard';

  async isAvailable(): Promise<boolean> {
    return true; // Always available (has estimation fallback)
  }

  async execute(options: SyncStrategyOptions): Promise<SyncStrategyResult> {
    const result = await transcribeAudio({
      audioPath: options.audioPath,
      originalText: options.originalText,
      audioDuration: options.audioDuration,
      requireWhisper: false, // Allow fallback
    });

    return {
      words: result.words,
      duration: result.duration,
      engine: result.engine,
      metadata: {},
    };
  }
}
```

### 5.2 Audio-First Strategy

```typescript
// src/audio/sync/strategies/audio-first.ts

import { SyncStrategy, SyncStrategyOptions, SyncStrategyResult } from '../types';
import { transcribeAudio } from '../../asr';
import { reconcileToScript } from '../../asr/reconcile';

export class AudioFirstStrategy implements SyncStrategy {
  name = 'audio-first';

  async isAvailable(): Promise<boolean> {
    // Check if whisper.cpp is available
    try {
      const whisper = await import('@remotion/install-whisper-cpp');
      return !!whisper;
    } catch {
      return false;
    }
  }

  async execute(options: SyncStrategyOptions): Promise<SyncStrategyResult> {
    // Require whisper - no fallback
    const result = await transcribeAudio({
      audioPath: options.audioPath,
      originalText: options.originalText,
      audioDuration: options.audioDuration,
      requireWhisper: true, // CRITICAL: No estimation fallback
    });

    // Optionally reconcile to script
    let words = result.words;
    let reconciliationApplied = false;

    if (options.config.reconcileToScript) {
      words = reconcileToScript(result.words, options.originalText);
      reconciliationApplied = true;
    }

    return {
      words,
      duration: result.duration,
      engine: result.engine,
      metadata: { reconciliationApplied },
    };
  }
}
```

### 5.3 Forced Alignment Strategy

```typescript
// src/audio/sync/strategies/forced-align.ts

import { SyncStrategy, SyncStrategyOptions, SyncStrategyResult } from '../types';
import { alignWithAeneas, isAeneasAvailable } from '../../asr/aeneas';
import { transcribeAudio } from '../../asr';

export class ForcedAlignStrategy implements SyncStrategy {
  name = 'forced-align';

  async isAvailable(): Promise<boolean> {
    return await isAeneasAvailable();
  }

  async execute(options: SyncStrategyOptions): Promise<SyncStrategyResult> {
    try {
      // Try forced alignment first (more accurate for known text)
      const result = await alignWithAeneas({
        audioPath: options.audioPath,
        text: options.originalText,
      });

      return {
        words: result.words,
        duration: result.duration,
        engine: 'aeneas',
        metadata: {},
      };
    } catch (error) {
      // Fallback to audio-first if Aeneas fails
      const log = createLogger({ module: 'forced-align' });
      log.warn({ error }, 'Aeneas failed, falling back to whisper.cpp');

      const result = await transcribeAudio({
        audioPath: options.audioPath,
        originalText: options.originalText,
        audioDuration: options.audioDuration,
        requireWhisper: true,
      });

      return {
        words: result.words,
        duration: result.duration,
        engine: 'whisper-cpp (fallback)',
        metadata: {},
      };
    }
  }
}
```

---

## 6. Reconciliation Module

```typescript
// src/audio/asr/reconcile.ts

import { WordTimestamp } from '../schema';
import { createLogger } from '../../core/logger';

/**
 * Reconcile ASR words to original script text.
 *
 * Purpose: ASR may mishear words ("10x" → "tenex"). This function
 * matches ASR timestamps to script words using similarity matching,
 * displaying the original script text with ASR timing.
 *
 * Based on MoneyPrinterTurbo pattern (RQ-32).
 */
export function reconcileToScript(asrWords: WordTimestamp[], scriptText: string): WordTimestamp[] {
  const log = createLogger({ module: 'reconcile' });
  const scriptWords = scriptText.split(/\s+/).filter(Boolean);
  const result: WordTimestamp[] = [];

  let asrIndex = 0;

  for (const scriptWord of scriptWords) {
    // Find best matching ASR word within lookahead window
    let bestMatch = -1;
    let bestScore = 0;
    const lookahead = Math.min(5, asrWords.length - asrIndex);

    for (let i = 0; i < lookahead; i++) {
      const asrWord = asrWords[asrIndex + i];
      const score = levenshteinSimilarity(normalizeWord(scriptWord), normalizeWord(asrWord.word));

      if (score > bestScore) {
        bestScore = score;
        bestMatch = asrIndex + i;
      }
    }

    if (bestMatch >= 0 && bestScore > 0.6) {
      const matchedAsr = asrWords[bestMatch];
      result.push({
        word: scriptWord, // Use SCRIPT word, not ASR
        start: matchedAsr.start,
        end: matchedAsr.end,
        confidence: matchedAsr.confidence ?? bestScore,
      });
      asrIndex = bestMatch + 1;
    } else {
      // No good match - interpolate timing
      const prevEnd = result.length > 0 ? result[result.length - 1].end : 0;
      const estimatedDuration = 0.2 + scriptWord.length * 0.03; // ~200ms base + per-char

      result.push({
        word: scriptWord,
        start: prevEnd,
        end: prevEnd + estimatedDuration,
        confidence: 0.5, // Low confidence for interpolated
      });

      log.debug({ scriptWord, asrIndex }, 'No ASR match, interpolated timing');
    }
  }

  log.info(
    { scriptWords: scriptWords.length, matched: result.filter((w) => w.confidence! > 0.6).length },
    'Reconciliation complete'
  );

  return result;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}
```

---

## 7. Pipeline Integration

### 7.1 Updated Audio Pipeline

```typescript
// src/audio/pipeline.ts (updated)

import { executeSync } from './sync';
import { loadConfig } from '../core/config';

export interface GenerateAudioOptions {
  script: ScriptOutput;
  voice: string;
  outputPath: string;
  timestampsPath: string;
  mock?: boolean;

  // NEW: Sync options (override config)
  syncStrategy?: SyncStrategy;
  requireWhisper?: boolean;
  reconcileToScript?: boolean;
  driftCorrection?: DriftCorrection;
}

export async function generateAudio(options: GenerateAudioOptions): Promise<AudioOutput> {
  const log = createLogger({ module: 'audio', voice: options.voice });
  const config = loadConfig();

  // Build effective sync config from options + config file
  const syncConfig: SyncConfig = {
    ...config.sync,
    // CLI options override config file
    ...(options.syncStrategy && { strategy: options.syncStrategy }),
    ...(options.reconcileToScript !== undefined && {
      reconcileToScript: options.reconcileToScript,
    }),
    ...(options.driftCorrection && { driftCorrection: options.driftCorrection }),
  };

  // If requireWhisper is set, upgrade to audio-first strategy
  if (options.requireWhisper && syncConfig.strategy === 'standard') {
    syncConfig.strategy = 'audio-first';
  }

  log.info(
    {
      strategy: syncConfig.strategy,
      driftCorrection: syncConfig.driftCorrection,
      reconcile: syncConfig.reconcileToScript,
    },
    'Starting audio generation with sync config'
  );

  // ... TTS generation (unchanged) ...

  // Step 2: Execute sync strategy for timestamps
  const syncResult = await executeSync({
    audioPath: options.outputPath,
    originalText: fullText,
    audioDuration: ttsResult.duration,
    config: syncConfig,
  });

  // ... rest of pipeline (unchanged) ...
}
```

---

## 8. Backward Compatibility Guarantees

### 8.1 Default Behavior Unchanged

| Aspect           | Before                        | After (default)        |
| ---------------- | ----------------------------- | ---------------------- |
| Strategy         | whisper + estimation fallback | Same                   |
| Drift correction | None                          | None                   |
| Reconciliation   | None                          | None                   |
| Validation       | Basic Zod                     | Same + optional repair |

### 8.2 Migration Path

**For existing users:**

- No action required - defaults match current behavior
- Opt-in to new features via config or CLI flags

**For quality-conscious users:**

```toml
# Upgrade to audio-first with reconciliation
[sync]
strategy = "audio-first"
reconcile_to_script = true
drift_correction = "detect"
```

**For maximum quality (requires Aeneas):**

```toml
[sync]
strategy = "forced-align"
reconcile_to_script = true
drift_correction = "auto"
```

---

## 9. Feature Flags for Gradual Rollout

### 9.1 Runtime Overrides

Use CLI flags or project config for sync tuning:

```bash
# CLI override
cm audio --input script.json --output audio.wav --sync-strategy audio-first --reconcile

# Project defaults (.content-machine.toml)
[sync]
strategy = "audio-first"
reconcile_to_script = true
drift_correction = "detect"
```

### 9.2 Experimental Features

```toml
# Mark experimental features
[sync.experimental]
whisperx_enabled = false  # Future: WhisperX integration
aeneas_word_level = false # Future: Word-level Aeneas (slower)
```

---

## 10. Testing Strategy

### 10.1 Unit Tests per Strategy

```typescript
// tests/unit/audio/sync/strategies.test.ts

describe('Sync Strategies', () => {
  describe('StandardStrategy', () => {
    it('should use whisper when available', async () => { ... });
    it('should fall back to estimation when whisper unavailable', async () => { ... });
    it('should validate timestamps', async () => { ... });
  });

  describe('AudioFirstStrategy', () => {
    it('should fail if whisper unavailable', async () => { ... });
    it('should reconcile to script when configured', async () => { ... });
    it('should not fall back to estimation', async () => { ... });
  });

  describe('ForcedAlignStrategy', () => {
    it('should use Aeneas when available', async () => { ... });
    it('should fall back to whisper when Aeneas fails', async () => { ... });
  });
});
```

### 10.2 Integration Tests

```typescript
// tests/integration/sync-pipeline.test.ts

describe('Sync Pipeline Integration', () => {
  it('standard: generates timestamps with whisper or estimation', async () => {
    const result = await generateAudio({
      script: testScript,
      voice: 'af_heart',
      outputPath: 'test.wav',
      timestampsPath: 'test.json',
      syncStrategy: 'standard',
    });

    expect(result.timestamps.allWords.length).toBeGreaterThan(0);
  });

  it('audio-first: requires whisper', async () => {
    await expect(
      generateAudio({
        script: testScript,
        voice: 'af_heart',
        outputPath: 'test.wav',
        timestampsPath: 'test.json',
        syncStrategy: 'audio-first',
      })
    ).resolves.toMatchObject({
      timestamps: { asrEngine: 'whisper-cpp' },
    });
  });
});
```

---

## 11. Documentation Updates

### 11.1 README.md Addition

````markdown
## Sync Quality Options

content-machine supports multiple sync strategies for different quality/speed tradeoffs:

| Strategy       | Speed  | Quality | Requirements               |
| -------------- | ------ | ------- | -------------------------- |
| `standard`     | Fast   | Good    | None (estimation fallback) |
| `audio-first`  | Medium | Better  | whisper.cpp installed      |
| `forced-align` | Slow   | Best    | Aeneas installed           |

### Quick Start

```bash
# Standard (default)
cm audio -i script.json

# Higher quality (requires whisper)
cm audio -i script.json --sync-strategy audio-first

# Maximum quality (requires Aeneas)
cm audio -i script.json --sync-strategy forced-align --reconcile
```
````

### Configuration

```toml
# .content-machine.toml
[sync]
strategy = "audio-first"
drift_correction = "detect"
reconcile_to_script = true
```

```

---

## 12. Implementation Order

### Phase 1: Foundation (Week 1)
1. [ ] Add SyncConfig schema to config.ts
2. [ ] Create sync module structure
3. [ ] Extract whisper logic to dedicated adapter
4. [ ] Implement StandardStrategy (current behavior)
5. [ ] Add CLI flags for sync options

### Phase 2: Audio-First (Week 2)
1. [ ] Implement AudioFirstStrategy
2. [ ] Add reconciliation module
3. [ ] Update pipeline to use sync orchestrator
4. [ ] Write unit tests

### Phase 3: Forced Alignment (Week 3)
1. [ ] Add Aeneas adapter (subprocess wrapper)
2. [ ] Implement ForcedAlignStrategy
3. [ ] Add drift detection module
4. [ ] Write integration tests

### Phase 4: Polish (Week 4)
1. [ ] Add drift correction (auto mode)
2. [ ] Documentation updates
3. [ ] E2E tests with all strategies
4. [ ] Performance benchmarks

---

## 13. References

- [RQ-30: Sync Pipeline Architecture](investigations/RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md)
- [RQ-31: TTS Timestamp Extraction](investigations/RQ-31-TTS-TIMESTAMP-EXTRACTION-METHODS-20260107.md)
- [RQ-32: Forced Alignment vs ASR](investigations/RQ-32-FORCED-ALIGNMENT-VS-ASR-ANALYSIS-20260107.md)
- [RQ-33: Remotion Caption Sync](investigations/RQ-33-REMOTION-CAPTION-SYNC-PATTERNS-20260107.md)
- [RQ-34: Drift Detection](investigations/RQ-34-DRIFT-DETECTION-RETIMING-STRATEGIES-20260107.md)
- [Current audio pipeline](../../src/audio/pipeline.ts)
- [Current ASR module](../../src/audio/asr/index.ts)
```
