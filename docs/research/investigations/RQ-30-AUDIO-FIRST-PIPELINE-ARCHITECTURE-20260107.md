# RQ-30: Audio-First Pipeline Architecture

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P0  
**Related:** RQ-29, IMPL-PHASE-2-AUDIO

---

## Executive Summary

This investigation proposes an **Audio-First Pipeline** that inverts the current generation order. Instead of `script → video → audio → captions`, the audio-first approach uses `script → audio → timestamps → video + captions`. This ensures captions are always derived from the actual audio, eliminating timestamp estimation bugs.

---

## 1. Problem Statement

### Current Pipeline (Script-First)

```
Topic → Script → [Audio Generation] → [Estimated Timestamps] → Video + Captions
                           ↓                     ↓
                    kokoro-js TTS         Text-based estimation
                    (no timestamps)        (prone to bugs)
```

**Issues:**

1. kokoro-js doesn't provide word-level timestamps
2. Estimation algorithm can produce corrupted data (end < start)
3. Whisper ASR may fail silently, falling back to bad estimates
4. Timestamps are "hoped" to match audio, not derived from it

### Proposed Pipeline (Audio-First)

```
Topic → Script → Audio Generation → ASR Transcription → Video + Captions
                        ↓                    ↓
                  kokoro-js TTS        whisper.cpp
                  (actual WAV)         (actual timestamps)
```

**Benefits:**

1. Timestamps come from the actual audio (ground truth)
2. ASR confidence scores indicate accuracy
3. No estimation bugs possible
4. Captions match what was actually spoken

---

## 2. Architecture Comparison

### 2.1 Current Flow (Script-First)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCRIPT-FIRST PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. cm script          2. cm audio           3. cm render                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │ Generate     │─────▶│ TTS + ASR    │─────▶│ Video render │              │
│  │ script.json  │      │ (parallel)   │      │ with captions│              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│                              │                                              │
│                              ▼                                              │
│                        ┌──────────────┐                                     │
│                        │ PROBLEM:     │                                     │
│                        │ Estimation   │                                     │
│                        │ fallback can │                                     │
│                        │ produce bad  │                                     │
│                        │ timestamps   │                                     │
│                        └──────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Audio-First Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUDIO-FIRST PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. cm script          2. cm audio           3. cm audio                    │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │ Generate     │─────▶│ TTS ONLY     │─────▶│ ASR ONLY     │              │
│  │ script.json  │      │ audio.wav    │      │ timestamps   │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│                                                    │                        │
│                                                    ▼                        │
│                        ┌──────────────┐      ┌──────────────┐              │
│                        │ cm visuals   │◀─────│ timestamps   │              │
│                        │ (uses audio  │      │ .json        │              │
│                        │  duration)   │      └──────────────┘              │
│                        └──────────────┘            │                        │
│                              │                     │                        │
│                              ▼                     ▼                        │
│                        ┌──────────────────────────────┐                     │
│                        │        cm render             │                     │
│                        │   (captions from ASR)        │                     │
│                        └──────────────────────────────┘                     │
│                                                                             │
│  KEY INSIGHT: Timestamps ALWAYS come from actual audio transcription        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Design

### 3.1 Pipeline Mode Configuration

```typescript
// src/core/config.ts
export interface PipelineConfig {
  mode: 'script-first' | 'audio-first';

  // Audio-first specific options
  audioFirst?: {
    requireWhisper: boolean; // Fail if whisper unavailable
    whisperModel: 'tiny' | 'base' | 'small' | 'medium';
    validateTimestamps: boolean; // Run validation on ASR output
  };
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  mode: 'audio-first',
  audioFirst: {
    requireWhisper: true,
    whisperModel: 'base',
    validateTimestamps: true,
  },
};
```

### 3.2 Stage Ordering

```typescript
// src/cli/commands/generate.ts
interface GeneratePipeline {
  stages: PipelineStage[];
  order: string[];
}

const SCRIPT_FIRST_ORDER = ['script', 'audio', 'visuals', 'render'];
const AUDIO_FIRST_ORDER = ['script', 'tts', 'asr', 'visuals', 'render'];

function getStageOrder(mode: PipelineMode): string[] {
  return mode === 'audio-first' ? AUDIO_FIRST_ORDER : SCRIPT_FIRST_ORDER;
}
```

### 3.3 Audio Stage Split

In audio-first mode, the `cm audio` stage is split into two distinct sub-stages:

```typescript
// Stage 2a: TTS Only
interface TTSStageOutput {
  audioPath: string;
  duration: number;
  sampleRate: number;
  voice: string;
}

// Stage 2b: ASR Only
interface ASRStageOutput {
  words: WordTimestamp[];
  duration: number;
  engine: 'whisper-cpp';
  confidence: number;
}
```

### 3.4 Strict Whisper Requirement

```typescript
// src/audio/asr/index.ts
export async function transcribeAudio(
  options: ASROptions & { strict?: boolean }
): Promise<ASRResult> {
  const whisper = await getWhisper();

  if (!whisper) {
    if (options.strict) {
      throw new CMError(
        'ASR_UNAVAILABLE',
        'Audio-first mode requires whisper.cpp but it is not installed'
      );
    }
    // Fall back to estimation (script-first mode)
    return estimateTimestamps(options.originalText!, options.audioDuration!);
  }

  return transcribeWithWhisper(options);
}
```

---

## 4. CLI Interface

### 4.1 Generate Command

```bash
# Default: audio-first mode
cm generate "5 JavaScript tips" --output video.mp4

# Explicit audio-first
cm generate "5 JavaScript tips" --pipeline audio-first

# Legacy script-first mode
cm generate "5 JavaScript tips" --pipeline script-first

# Audio-first with specific whisper model
cm generate "5 JavaScript tips" --whisper-model medium
```

### 4.2 New CLI Options

| Option                | Default       | Description                               |
| --------------------- | ------------- | ----------------------------------------- |
| `--pipeline <mode>`   | `audio-first` | Pipeline mode (audio-first, script-first) |
| `--whisper-model <m>` | `base`        | Whisper model for audio-first mode        |
| `--require-whisper`   | `true`        | Fail if whisper unavailable               |

### 4.3 Audio Stage Subcommands

```bash
# Run TTS only (new)
cm audio --tts-only --input script.json --output audio.wav

# Run ASR only (new)
cm audio --asr-only --input audio.wav --output timestamps.json

# Run both (existing behavior)
cm audio --input script.json --output timestamps.json
```

---

## 5. Data Flow Diagrams

### 5.1 Script-First Data Flow

```
script.json ──┬──▶ TTS ──▶ audio.wav
              │
              └──▶ Text-based Estimation ──▶ timestamps.json (may be buggy)
                            │
                            ▼
                      timestamps.json ──▶ visuals.json ──▶ video.mp4
```

### 5.2 Audio-First Data Flow

```
script.json ──▶ TTS ──▶ audio.wav ──▶ ASR (Whisper) ──▶ timestamps.json (ground truth)
                                                              │
                                                              ▼
                                                        visuals.json ──▶ video.mp4
```

---

## 6. Error Handling

### 6.1 Whisper Unavailable

```typescript
// In audio-first mode
if (pipelineMode === 'audio-first' && !whisperAvailable) {
  throw new CMError('WHISPER_REQUIRED', {
    message: 'Audio-first mode requires whisper.cpp',
    fix: 'Run: npx @remotion/install-whisper-cpp',
    alternative: 'Use --pipeline script-first for estimated timestamps',
  });
}
```

### 6.2 ASR Confidence Check

```typescript
interface ASRQualityGate {
  minWordConfidence: number; // 0.7 default
  minOverallConfidence: number; // 0.8 default
  maxWordGapMs: number; // 500 default
}

function validateASRQuality(result: ASRResult, gate: ASRQualityGate): boolean {
  const lowConfidenceWords = result.words.filter((w) => w.confidence < gate.minWordConfidence);

  if (lowConfidenceWords.length > result.words.length * 0.1) {
    log.warn('More than 10% of words have low confidence');
    return false;
  }

  // Check for suspicious gaps (may indicate missed words)
  for (let i = 1; i < result.words.length; i++) {
    const gap = result.words[i].start - result.words[i - 1].end;
    if (gap * 1000 > gate.maxWordGapMs) {
      log.warn(`Suspicious gap of ${gap}s between words ${i - 1} and ${i}`);
    }
  }

  return true;
}
```

---

## 7. Migration Path

### 7.1 Phase 1: Parallel Support

1. Add `--pipeline` flag to `cm generate`
2. Default to `audio-first` for new projects
3. Allow `script-first` for backward compatibility

### 7.2 Phase 2: Deprecation

1. Show warning when using `script-first`
2. Log message: "Script-first mode is deprecated, use audio-first for better sync"
3. Keep for 2 minor versions

### 7.3 Phase 3: Default Flip

1. Change default to `audio-first`
2. Require explicit `--pipeline script-first` for legacy mode

---

## 8. Performance Considerations

### 8.1 Whisper Model Comparison

| Model  | Speed        | Accuracy | VRAM | Use Case     |
| ------ | ------------ | -------- | ---- | ------------ |
| tiny   | 32x realtime | 75%      | 1GB  | Quick tests  |
| base   | 16x realtime | 85%      | 2GB  | Default      |
| small  | 6x realtime  | 92%      | 4GB  | Production   |
| medium | 2x realtime  | 96%      | 8GB  | High quality |

### 8.2 Expected Timing

For a 30-second video:

| Stage     | Script-First | Audio-First      |
| --------- | ------------ | ---------------- |
| Script    | 2s           | 2s               |
| TTS       | 5s           | 5s               |
| ASR       | 0s (skip)    | 10s (base model) |
| Visuals   | 8s           | 8s               |
| Render    | 45s          | 45s              |
| **Total** | **60s**      | **70s**          |

**Trade-off:** +10s for guaranteed sync quality

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
describe('Audio-First Pipeline', () => {
  it('should produce timestamps from actual audio', async () => {
    const result = await runPipeline({
      mode: 'audio-first',
      input: { topic: 'Test topic' },
    });

    expect(result.timestamps.engine).toBe('whisper-cpp');
    expect(result.timestamps.words).toHaveLength(expectedWordCount);
  });

  it('should fail if whisper unavailable in strict mode', async () => {
    mockWhisperUnavailable();

    await expect(
      runPipeline({
        mode: 'audio-first',
        requireWhisper: true,
      })
    ).rejects.toThrow('WHISPER_REQUIRED');
  });
});
```

### 9.2 Integration Tests

```typescript
describe('Sync Quality Comparison', () => {
  it('audio-first should have better sync than script-first', async () => {
    const scriptFirstVideo = await generateVideo({ mode: 'script-first' });
    const audioFirstVideo = await generateVideo({ mode: 'audio-first' });

    const scriptFirstRating = await rateSync(scriptFirstVideo);
    const audioFirstRating = await rateSync(audioFirstVideo);

    expect(audioFirstRating.rating).toBeGreaterThan(scriptFirstRating.rating);
  });
});
```

---

## 10. Configuration File

```toml
# .content-machine.toml

[pipeline]
mode = "audio-first"  # or "script-first"

[pipeline.audio-first]
require-whisper = true
whisper-model = "base"
validate-timestamps = true
min-confidence = 0.7

[pipeline.script-first]
estimation-algorithm = "character-weighted"
```

---

## 11. Implementation Checklist

- [ ] Add `--pipeline` flag to `cm generate`
- [ ] Split `cm audio` into `--tts-only` and `--asr-only`
- [ ] Add strict whisper requirement for audio-first
- [ ] Add ASR quality gates (confidence checks)
- [ ] Update pipeline orchestration
- [ ] Add migration warnings
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

---

## 12. Related Documents

- [RQ-29: Video Sync Rating System](RQ-29-VIDEO-SYNC-RATING-SYSTEM-20260107.md) - Sync quality measurement
- [IMPL-PHASE-2-AUDIO](../dev/architecture/IMPL-PHASE-2-AUDIO-20260105.md) - Audio pipeline architecture
- [src/audio/asr/index.ts](../../../src/audio/asr/index.ts) - Current ASR implementation

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-07  
**Author:** Claude (Copilot)
