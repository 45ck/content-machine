# Audio-Visual-Caption Synchronization Architecture

**Date:** 2026-01-10  
**Version:** 1.0.0  
**Status:** Design Complete  
**Related:** RQ-28-AUDIO-VISUAL-CAPTION-SYNC

---

## 1. Executive Summary

This document defines the architecture for synchronizing audio, visual, and caption components in content-machine. It addresses the critical sync bugs identified in v3 render and establishes patterns based on vendor research.

### Key Design Decisions:

1. **Audio is the master clock** - all other components sync to audio timing
2. **Word times are always absolute** - from video start, in milliseconds
3. **Caption pages calculate relative times internally** - for Remotion Sequence compatibility
4. **Visuals must cover full audio duration** - with loop/extend fallback
5. **Timestamps are validated at ingest** - reject invalid data early

---

## 2. Timing Reference Model

### 2.1 The Audio-First Principle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MASTER TIMELINE (Audio)                          │
│  0s ─────────────────────────────────────────────────────────> 25s │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Audio Track: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│               └─ totalDuration: 25.225s (authoritative)            │
│                                                                     │
│  Word Timestamps:                                                   │
│    word[0]: 0.00s ──▶ 0.25s ("Want")                              │
│    word[1]: 0.25s ──▶ 0.47s ("to")                                │
│    ...                                                              │
│    word[N]: 24.95s ──▶ 25.22s ("game!")                           │
│                                                                     │
│  Visual Scenes:                                                     │
│    scene-001: 0.00s ──────▶ 2.94s  [video1.mp4]                   │
│    scene-002: 2.94s ──────▶ 6.90s  [video2.mp4]                   │
│    ...                                                              │
│    scene-006: 16.56s ─────▶ 25.22s [video6.mp4] ◀── extended      │
│                                                                     │
│  Caption Pages:                                                     │
│    page[0]: 0.00s ──▶ 0.70s ("Want to 10x")                       │
│    page[1]: 0.70s ──▶ 1.27s ("your productivity")                 │
│    ...                                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Time Coordinate Systems

| System             | Unit         | Reference Point          | Used By                           |
| ------------------ | ------------ | ------------------------ | --------------------------------- |
| Absolute Time      | seconds      | Video start (0s)         | timestamps.json, visuals.json     |
| Absolute Time (ms) | milliseconds | Video start (0ms)        | Caption words internally          |
| Remotion Frames    | frames       | Video start (frame 0)    | Sequence from/duration            |
| Sequence-Relative  | frames       | Sequence start (frame 0) | useCurrentFrame() inside Sequence |

### 2.3 Critical Rule: Remotion Sequence Frame Reset

```tsx
// OUTSIDE Sequence: frame = absolute from video start
const frame = useCurrentFrame(); // e.g., frame 150 (5s at 30fps)

<Sequence from={90} durationInFrames={60}>
  // INSIDE Sequence: frame = relative to Sequence start const frame = useCurrentFrame(); // frame
  0-59, NOT 90-149!
</Sequence>;
```

**Solution: Always convert word times to Sequence-relative before comparison.**

---

## 3. Component Synchronization

### 3.1 Timestamp Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  TTS Engine  │────▶│  Audio File  │────▶│  ASR Engine  │
│   (kokoro)   │     │  (audio.wav) │     │  (whisper)   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                     ┌──────────────────────────────────────┐
                     │          timestamps.json             │
                     │  {                                   │
                     │    allWords: [                       │
                     │      { word, start, end, conf }      │
                     │    ],                                │
                     │    totalDuration: 25.225,            │
                     │    asrEngine: "whisper"              │
                     │  }                                   │
                     └──────────────────────────────────────┘
                                                 │
                                                 ▼
                     ┌──────────────────────────────────────┐
                     │       VALIDATION GATE                │
                     │  - All words: end > start            │
                     │  - No gaps > 500ms                   │
                     │  - Last word.end ≈ totalDuration     │
                     │  - Monotonic: word[n].start ≥        │
                     │               word[n-1].end          │
                     └──────────────────────────────────────┘
```

### 3.2 Visual Duration Alignment

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISUAL PIPELINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input:                                                         │
│    - timestamps.json.totalDuration = 25.225s                    │
│    - timestamps.json.scenes = [{sceneId, audioStart, audioEnd}] │
│                                                                 │
│  Processing:                                                    │
│    1. For each scene, find stock video ≥ scene duration         │
│    2. If video shorter, loop or trim to fit                     │
│    3. Sum all scene durations                                   │
│    4. IF sum < totalDuration:                                   │
│       a. Extend last scene (if video is long enough)            │
│       b. OR loop previous scenes to fill gap                    │
│       c. OR add fallback color scene                            │
│                                                                 │
│  Output:                                                        │
│    - visuals.json with scene.duration summing to ≥ audioTotal   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Caption Timing in Remotion

```tsx
// CORRECT PATTERN: Convert to Sequence-relative time

export const CaptionPageView: React.FC<Props> = ({ page, config }) => {
  const frame = useCurrentFrame(); // Sequence-relative!
  const { fps } = useVideoConfig();

  // Current time relative to this Sequence (page)
  const currentTimeMs = (frame / fps) * 1000;

  return (
    <div>
      {page.lines.map((line) =>
        line.words.map((word) => {
          // Convert absolute word times to page-relative
          const wordStartRelative = word.startMs - page.startMs;
          const wordEndRelative = word.endMs - page.startMs;

          const isActive = currentTimeMs >= wordStartRelative && currentTimeMs < wordEndRelative;

          return <WordView word={word} isActive={isActive} />;
        })
      )}
    </div>
  );
};
```

---

## 4. Data Schemas

### 4.1 Validated Word Timing

```typescript
import { z } from 'zod';

const ValidatedWordSchema = z
  .object({
    word: z.string(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((data) => data.end > data.start, {
    message: 'Word end time must be greater than start time',
  });

const ValidatedTimestampsSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    allWords: z.array(ValidatedWordSchema),
    totalDuration: z.number().positive(),
    ttsEngine: z.string(),
    asrEngine: z.string(),
  })
  .refine(
    (data) => {
      const lastWord = data.allWords[data.allWords.length - 1];
      return lastWord && lastWord.end >= data.totalDuration * 0.95;
    },
    { message: 'Last word must end near totalDuration' }
  );
```

### 4.2 Visual Scene with Duration Guarantee

```typescript
const VisualSceneSchema = z.object({
  sceneId: z.string(),
  source: z.enum(['stock-pexels', 'stock-pixabay', 'user-footage', 'fallback-color']),
  assetPath: z.string(),
  duration: z.number().positive(),
  // Actual video duration (may be longer than scene duration)
  videoDuration: z.number().positive().optional(),
});

const VisualsOutputSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    scenes: z.array(VisualSceneSchema),
    totalDuration: z.number().positive(),
  })
  .refine(
    (data) => {
      const sceneDurationSum = data.scenes.reduce((sum, s) => sum + s.duration, 0);
      return sceneDurationSum >= data.totalDuration * 0.99;
    },
    { message: 'Scene durations must cover total audio duration' }
  );
```

---

## 5. Highlight Mode Configuration

### 5.1 Available Modes

```typescript
type HighlightMode =
  | 'color' // Change text color when active
  | 'background' // TikTok-style pill background
  | 'underline' // Underline active word
  | 'scale' // Scale up active word
  | 'glow' // Add glow effect
  | 'none'; // No highlighting (static text)
```

### 5.2 Configuration Schema

```typescript
const HighlightConfigSchema = z.object({
  highlightMode: z.enum(['color', 'background', 'underline', 'scale', 'glow', 'none']),
  highlightColor: z.string().default('#00FF00'),
  highlightEnabled: z.boolean().default(true),
  wordTransitionMs: z.number().min(0).max(500).default(50),
  inactiveOpacity: z.number().min(0).max(1).default(0.6),
});
```

### 5.3 Highlight Implementation

```tsx
const WordView: React.FC<{ word: TimedWord; isActive: boolean; config: HighlightConfig }> = ({
  word,
  isActive,
  config,
}) => {
  // If highlighting disabled, always show as active style
  const showActive = config.highlightEnabled ? isActive : true;

  // Mode-specific styling
  const styles: React.CSSProperties = {};

  switch (config.highlightMode) {
    case 'color':
      styles.color = showActive ? config.highlightColor : config.textColor;
      break;
    case 'background':
      if (showActive) {
        styles.backgroundColor = config.highlightColor;
        styles.padding = '4px 8px';
        styles.borderRadius = '8px';
      }
      break;
    case 'scale':
      styles.transform = showActive ? 'scale(1.2)' : 'scale(1)';
      break;
    case 'glow':
      if (showActive) {
        styles.textShadow = `0 0 20px ${config.highlightColor}`;
      }
      break;
    case 'none':
      // No special styling
      break;
  }

  return <span style={styles}>{word.text}</span>;
};
```

---

## 6. Error Handling

### 6.1 Timestamp Validation Errors

```typescript
class TimestampValidationError extends Error {
  constructor(
    public readonly wordIndex: number,
    public readonly word: string,
    public readonly issue: 'end_before_start' | 'gap_too_large' | 'missing_coverage'
  ) {
    super(`Invalid timestamp at word ${wordIndex} "${word}": ${issue}`);
  }
}

function validateTimestamps(data: TimestampsInput): ValidatedTimestamps {
  for (let i = 0; i < data.allWords.length; i++) {
    const word = data.allWords[i];

    if (word.end <= word.start) {
      throw new TimestampValidationError(i, word.word, 'end_before_start');
    }

    if (i > 0) {
      const prevWord = data.allWords[i - 1];
      const gap = word.start - prevWord.end;
      if (gap > 0.5) {
        // 500ms max gap
        throw new TimestampValidationError(i, word.word, 'gap_too_large');
      }
    }
  }

  return data as ValidatedTimestamps;
}
```

### 6.2 Visual Duration Recovery

```typescript
function ensureVisualCoverage(scenes: VisualScene[], audioDuration: number): VisualScene[] {
  const currentDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  if (currentDuration >= audioDuration) {
    return scenes;
  }

  const gap = audioDuration - currentDuration;
  const lastScene = scenes[scenes.length - 1];

  // Strategy 1: Extend last scene if video is long enough
  if (lastScene.videoDuration && lastScene.videoDuration >= lastScene.duration + gap) {
    return [...scenes.slice(0, -1), { ...lastScene, duration: lastScene.duration + gap }];
  }

  // Strategy 2: Add fallback color scene
  return [
    ...scenes,
    {
      sceneId: `scene-${String(scenes.length + 1).padStart(3, '0')}`,
      source: 'fallback-color',
      assetPath: '#000000',
      duration: gap,
    },
  ];
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

| Test Suite                     | Coverage               |
| ------------------------------ | ---------------------- |
| `timestamp-validation.test.ts` | Word timing validation |
| `caption-timing.test.ts`       | Highlight timing logic |
| `visual-duration.test.ts`      | Duration calculation   |

### 7.2 Integration Tests

| Test Case                       | Verifies                         |
| ------------------------------- | -------------------------------- |
| `sync-caption-to-audio.test.ts` | Words highlight at correct times |
| `sync-visual-to-audio.test.ts`  | Scenes cover full audio          |
| `sync-full-pipeline.test.ts`    | All components aligned           |

### 7.3 Visual Regression Tests

| Test                | Method                |
| ------------------- | --------------------- |
| Caption at 5s mark  | Screenshot comparison |
| Caption at 15s mark | Screenshot comparison |
| Last frame (25s)    | Verify not black      |

---

## 8. Implementation Checklist

- [ ] Add timestamp validation in `src/audio/asr/validator.ts`
- [ ] Fix Caption.tsx to use Sequence-relative timing
- [ ] Add `highlightEnabled` and `highlightMode` to config
- [ ] Add visual duration extension in `src/visuals/matcher.ts`
- [ ] Add TDD tests for all sync scenarios
- [ ] Update RenderProps schema with highlight options
- [ ] Re-render test video with fixes

---

## 9. References

- [RQ-28: Audio-Visual-Caption Sync Issues](../../research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260110.md)
- [Remotion Sequence docs](https://www.remotion.dev/docs/sequence)
- [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker)
- [remotion-dev/template-tiktok](https://github.com/remotion-dev/template-tiktok)
