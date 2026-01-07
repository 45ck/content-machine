# RQ-30: Audio-as-Source-of-Truth Sync Pipeline Architecture

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P1  
**Related:** RQ-28, RQ-29, RQ-08, RQ-09

---

## 1. Problem Statement

Short-form video content requires near-perfect synchronization between audio (voiceover), visual elements (stock footage), and text overlays (captions). Without explicit timestamp recovery, duration estimation from text length drifts quickly and produces poor quality output.

The fundamental question: **What is the optimal architecture for achieving <100ms sync accuracy across all components?**

---

## 2. Core Principle: Audio as Source of Truth

### 2.1 Why Audio Must Drive Everything

Audio is the component that:

1. **Users perceive most acutely** - Audio-visual desync >80ms is noticeable
2. **Has fixed duration** - Once TTS generates audio, duration is immutable
3. **Contains natural timing cues** - Word boundaries, pauses, emphasis

### 2.2 The Timing Map Pattern

All production pipelines follow this pattern:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUDIO-DRIVEN SYNC PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                                           │
│  │    SCRIPT    │ "Redis is faster than PostgreSQL for caching"             │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │     TTS      │ Generate audio waveform (15.3 seconds)                    │
│  │   (kokoro)   │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │  TIMING MAP  │ Extract word-level timestamps                             │
│  │  EXTRACTION  │ [{word: "Redis", start: 0.0, end: 0.42}, ...]             │
│  │ (whisper.cpp)│                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         ├──────────────────────────────────────────────────────┐            │
│         │                                                      │            │
│         ▼                                                      ▼            │
│  ┌──────────────┐                                    ┌──────────────┐       │
│  │   CAPTIONS   │                                    │   VISUALS    │       │
│  │  (Remotion)  │ Render word-by-word highlights     │   (Pexels)   │       │
│  └──────────────┘                                    └──────────────┘       │
│                                                                             │
│  Both driven by the SAME timing map from audio extraction                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Vendor Implementation Analysis

### 3.1 gyoridavid/short-video-maker (Blueprint)

**Architecture:** TTS → ASR → Render

```typescript
// Pipeline flow
const audio = await kokoro.generate(sceneText, voice);
const normalizedPath = await ffmpeg.normalizeForWhisper(audio.buffer);
const captions = await whisper.transcribe(normalizedPath); // Word-level

// Captions drive video composition
<Sequence from={(scene.startMs / 1000) * fps}>
  <Audio src={scene.audio.url} />
  <CaptionOverlay captions={scene.captions} />
</Sequence>
```

**Key Insight:** Audio file is generated FIRST, then ASR extracts timing. Video is rendered using those timestamps.

### 3.2 MoneyPrinterTurbo (Python + MoviePy)

**Architecture:** TTS with WordBoundary → SRT → Composite

```python
# EdgeTTS provides word boundaries during streaming
async for chunk in communicate.stream():
    if chunk["type"] == "WordBoundary":
        sub_maker.create_sub(
            (chunk["offset"], chunk["duration"]),
            chunk["text"]
        )

# SRT is generated from word boundaries
# MoviePy uses SRT timing for TextClip positioning
text_clip.set_start(start_time).set_duration(end_time - start_time)
```

**Key Insight:** EdgeTTS gives timestamps during generation (no ASR needed), but they fall back to Whisper when EdgeTTS fails.

### 3.3 ShortGPT (Python + whisper_timestamped)

**Architecture:** TTS → ASR → LLM scene matching

```python
# TTS generates audio without timing
communicate = edge_tts.Communicate(text, voice)
await communicate.save(output_path)

# Whisper extracts word-level timing
whisper_analysis = whisper_timestamped.transcribe(WHISPER_MODEL, audio_path)

# Captions derived from whisper output
captions = getCaptionsWithTime(whisper_analysis, maxCaptionSize=15)
# Returns: [((start, end), "text"), ...]
```

**Key Insight:** Even when using EdgeTTS, they use Whisper for timing because it's more reliable than EdgeTTS word boundaries.

---

## 4. Timing Map Data Structures

### 4.1 Canonical Format (content-machine)

```typescript
// timestamps.json schema
interface TimestampsOutput {
  schemaVersion: '1.0.0';

  // Word-level timing (primary artifact)
  allWords: Array<{
    word: string;
    start: number; // Seconds from audio start
    end: number; // Seconds from audio start
    confidence: number; // 0.0-1.0 from ASR
  }>;

  // Aggregate metadata
  totalDuration: number; // Audio duration in seconds
  ttsEngine: 'kokoro' | 'edge-tts' | 'elevenlabs';
  asrEngine: 'whisper.cpp' | 'whisperx' | 'estimated';
}
```

### 4.2 Scene-Level Timing (derived)

```typescript
// Computed from word boundaries
interface SceneTiming {
  sceneIndex: number;
  text: string;
  startTime: number; // First word start
  endTime: number; // Last word end
  duration: number; // endTime - startTime
  words: WordTiming[]; // All words in scene
}
```

### 4.3 Caption Page Timing (derived)

```typescript
// Computed for caption display
interface CaptionPage {
  startMs: number; // Page appears at this time
  endMs: number; // Page disappears
  lines: Array<{
    words: Array<{
      text: string;
      startMs: number; // Word highlight starts
      endMs: number; // Word highlight ends
    }>;
  }>;
}
```

---

## 5. The Timing Extraction Decision Tree

```
                    ┌─────────────────────────────┐
                    │  TTS Engine Selection       │
                    └─────────────┬───────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
    │  Polly/Azure  │    │    EdgeTTS    │    │ Kokoro/Other  │
    │ (native marks)│    │ (WordBoundary)│    │  (no timing)  │
    └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
            │                    │                    │
            ▼                    ▼                    │
    ┌───────────────┐    ┌───────────────┐           │
    │ Use native    │    │ Try native,   │           │
    │ timestamps    │    │ fallback ASR  │           │
    └───────┬───────┘    └───────┬───────┘           │
            │                    │                    │
            └────────────────────┴────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │   ASR for word-level        │
                    │   (whisper.cpp/WhisperX)    │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐              ┌───────────────┐
            │ ASR Success   │              │  ASR Failure  │
            │ Use directly  │              │  (rare)       │
            └───────────────┘              └───────┬───────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │ Forced Alignment (Aeneas)   │
                                    │ OR                          │
                                    │ Character-proportional est. │
                                    │ (WITH VALIDATION)           │
                                    └─────────────────────────────┘
```

---

## 6. Multi-Stage Validation (content-machine)

### 6.1 Validation Layers

| Layer          | Check                          | Action on Failure      |
| -------------- | ------------------------------ | ---------------------- |
| **Schema**     | Zod validation (types, ranges) | Throw validation error |
| **Semantic**   | `end > start` for all words    | Repair or re-extract   |
| **Coverage**   | Words cover ≥95% of audio      | Extend last word       |
| **Gaps**       | No gaps >500ms between words   | Interpolate timing     |
| **Confidence** | Average confidence >0.5        | Log warning, proceed   |

### 6.2 Implementation

```typescript
// src/audio/asr/validator.ts
export function validateTimestamps(words: WordTiming[], totalDuration: number): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Critical: end must be > start
    if (word.end <= word.start) {
      issues.push({
        type: 'end_before_start',
        wordIndex: i,
        word: word.word,
        severity: 'critical',
      });
    }

    // Gap check
    if (i > 0) {
      const gap = word.start - words[i - 1].end;
      if (gap > 0.5) {
        // 500ms threshold
        issues.push({
          type: 'large_gap',
          wordIndex: i,
          gapSeconds: gap,
          severity: 'warning',
        });
      }
    }
  }

  // Coverage check
  const lastWord = words[words.length - 1];
  const coverage = lastWord.end / totalDuration;
  if (coverage < 0.95) {
    issues.push({
      type: 'insufficient_coverage',
      coverage,
      severity: 'warning',
    });
  }

  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
  };
}
```

---

## 7. Timestamp Repair Strategies

### 7.1 Fix `end < start` Corruption

```typescript
function repairCorruptedTimings(words: WordTiming[]): WordTiming[] {
  // Calculate average word duration from valid words
  const validDurations = words.filter((w) => w.end > w.start).map((w) => w.end - w.start);
  const avgDuration =
    validDurations.length > 0
      ? validDurations.reduce((a, b) => a + b) / validDurations.length
      : 0.2; // Default 200ms

  return words.map((word, i) => {
    if (word.end <= word.start) {
      // Repair: extend by average duration
      const nextStart = words[i + 1]?.start ?? word.start + avgDuration;
      return {
        ...word,
        end: Math.min(word.start + avgDuration, nextStart - 0.01),
      };
    }
    return word;
  });
}
```

### 7.2 Interpolate Gaps

```typescript
function interpolateGaps(words: WordTiming[], maxGap: number = 0.5): WordTiming[] {
  return words.map((word, i) => {
    if (i === 0) return word;

    const prevEnd = words[i - 1].end;
    const gap = word.start - prevEnd;

    if (gap > maxGap) {
      // Large gap: adjust previous word's end
      words[i - 1] = {
        ...words[i - 1],
        end: word.start - 0.05, // 50ms before current word
      };
    }

    return word;
  });
}
```

### 7.3 Extend to Cover Duration

```typescript
function ensureCoverage(
  words: WordTiming[],
  totalDuration: number,
  minCoverage: number = 0.95
): WordTiming[] {
  if (words.length === 0) return words;

  const lastWord = words[words.length - 1];
  if (lastWord.end < totalDuration * minCoverage) {
    // Extend last word to 95% of duration
    words[words.length - 1] = {
      ...lastWord,
      end: totalDuration * minCoverage,
    };
  }

  return words;
}
```

---

## 8. Scene Synchronization Strategy

### 8.1 Scene Boundaries from Word Timing

```typescript
function computeSceneTiming(scenes: SceneScript[], allWords: WordTiming[]): SceneTiming[] {
  let wordIndex = 0;

  return scenes
    .map((scene, sceneIndex) => {
      const sceneWords: WordTiming[] = [];
      const targetText = normalizeForComparison(scene.text);
      let accumulatedText = '';

      // Accumulate words until we match scene text
      while (wordIndex < allWords.length) {
        const word = allWords[wordIndex];
        accumulatedText += normalizeForComparison(word.word);
        sceneWords.push(word);
        wordIndex++;

        // Check if we've matched the scene
        const similarity = levenshteinSimilarity(accumulatedText, targetText);
        if (similarity >= 0.9) break;
      }

      return {
        sceneIndex,
        text: scene.text,
        startTime: sceneWords[0]?.start ?? 0,
        endTime: sceneWords[sceneWords.length - 1]?.end ?? 0,
        duration: 0, // Computed below
        words: sceneWords,
      };
    })
    .map((scene) => ({
      ...scene,
      duration: scene.endTime - scene.startTime,
    }));
}
```

### 8.2 Visual Duration Matching

```typescript
function matchVisualsToScenes(
  scenes: SceneTiming[],
  stockFootage: StockVideo[]
): VisualAssignment[] {
  return scenes.map((scene) => {
    // Find footage with duration >= scene duration + buffer
    const minDuration = scene.duration + 1.0; // 1s buffer

    const suitable = stockFootage.filter((v) => v.duration >= minDuration);
    const selected = suitable[0] ?? stockFootage[0]; // Fallback to any

    return {
      sceneIndex: scene.sceneIndex,
      videoUrl: selected.url,
      startTime: scene.startTime,
      duration: scene.duration,
      trim: {
        start: 0,
        end: scene.duration,
      },
    };
  });
}
```

---

## 9. Frame-Time Conversion (Remotion)

### 9.1 Conversion Functions

```typescript
export const FPS = 30;

// Milliseconds to frame number
export function msToFrame(ms: number): number {
  return Math.round((ms / 1000) * FPS);
}

// Seconds to frame number
export function secondsToFrame(seconds: number): number {
  return Math.round(seconds * FPS);
}

// Frame to milliseconds
export function frameToMs(frame: number): number {
  return (frame / FPS) * 1000;
}

// Frame to seconds
export function frameToSeconds(frame: number): number {
  return frame / FPS;
}
```

### 9.2 Caption Highlighting Logic

```typescript
// Inside Remotion component (NOT inside a Sequence)
function useWordHighlight(word: WordTiming, videoStartFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert word timing to frames
  const wordStartFrame = videoStartFrame + secondsToFrame(word.start);
  const wordEndFrame = videoStartFrame + secondsToFrame(word.end);

  return frame >= wordStartFrame && frame < wordEndFrame;
}
```

### 9.3 Sequence-Relative Timing (Alternative)

```typescript
// Inside a Sequence - word times must be made relative
function WordHighlight({ word, pageStartMs }: Props) {
  const frame = useCurrentFrame(); // Resets to 0 at Sequence start
  const { fps } = useVideoConfig();

  const currentTimeMs = (frame / fps) * 1000;

  // Make word times relative to page start
  const wordStartRelative = word.startMs - pageStartMs;
  const wordEndRelative = word.endMs - pageStartMs;

  const isActive = currentTimeMs >= wordStartRelative &&
                   currentTimeMs < wordEndRelative;

  return <span className={isActive ? 'highlighted' : ''}>{word.text}</span>;
}
```

---

## 10. Recommendations

### 10.1 For content-machine v1.0

1. **Keep current architecture:** TTS (kokoro) → ASR (whisper.cpp) → Render (Remotion)
2. **Add validation layer:** Catch and repair corrupted timestamps before render
3. **Store canonical artifact:** `timestamps.json` as single source of truth
4. **Use absolute timing:** Store all times as seconds from video start

### 10.2 For content-machine v1.5+

1. **Evaluate WhisperX:** Higher accuracy than whisper.cpp for word boundaries
2. **Add forced alignment:** Aeneas as fallback when ASR confidence is low
3. **Implement reconciliation:** Match ASR text back to original script

### 10.3 Sync Quality Targets

| Metric                    | Target | Measurement            |
| ------------------------- | ------ | ---------------------- |
| Word highlight accuracy   | ±50ms  | Manual review sample   |
| Scene transition accuracy | ±100ms | Compare to audio peaks |
| Visual-audio drift        | <80ms  | Full video analysis    |
| Timestamp coverage        | ≥95%   | Automated validation   |

---

## 11. References

- [RQ-28: Audio-Visual-Caption Sync Issues](RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md)
- [RQ-29: Sync Approaches Evaluation](RQ-29-SYNC-APPROACHES-EVALUATION-20260107.md)
- [RQ-08: Forced Alignment Algorithms](RQ-08-FORCED-ALIGNMENT-20260104.md)
- [RQ-09: Timestamp Drift Handling](RQ-09-TIMESTAMP-DRIFT-20260104.md)
- [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker)
- [remotion-dev/template-tiktok](https://github.com/remotion-dev/template-tiktok)
- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)
