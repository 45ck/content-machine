# Vendor Patterns: Video Synchronization Best Practices

**Date:** 2026-01-10  
**Version:** 1.0.0  
**Status:** Complete  
**Related:** RQ-28, SYNC-ARCHITECTURE

---

## 1. Executive Summary

This document synthesizes synchronization patterns from three reference repositories:

| Repository                       | Stack                 | Key Pattern                               |
| -------------------------------- | --------------------- | ----------------------------------------- |
| **gyoridavid/short-video-maker** | TypeScript + Remotion | Frame-based timing with startFrame offset |
| **remotion-dev/template-tiktok** | TypeScript + Remotion | Page-relative timestamp conversion        |
| **MoneyPrinterTurbo**            | Python + MoviePy      | Audio-first with video looping            |

---

## 2. gyoridavid/short-video-maker

### 2.1 Architecture Overview

- **TTS:** Kokoro (local, English)
- **ASR:** Whisper.cpp (word-level timestamps)
- **Rendering:** Remotion 4.x
- **Stock Footage:** Pexels API

### 2.2 Caption Timing Pattern

```tsx
// PortraitVideo.tsx - Key timing logic
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

{scenes.map((scene, i) => {
  // Calculate scene start frame from accumulated durations
  const startFrame = scenes.slice(0, i).reduce(
    (acc, curr) => acc + curr.audio.duration, 0
  ) * fps;

  return (
    <Sequence from={startFrame} durationInFrames={...}>
      {pages.map((page, j) => (
        <Sequence
          from={Math.round((page.startMs / 1000) * fps)}
          durationInFrames={...}
        >
          {line.texts.map((text) => {
            // KEY: Uses startFrame offset + text timing
            const active =
              frame >= startFrame + (text.startMs / 1000) * fps &&
              frame <= startFrame + (text.endMs / 1000) * fps;

            return <span style={active ? activeStyle : {}}>{text.text}</span>;
          })}
        </Sequence>
      ))}
    </Sequence>
  );
})}
```

**Key Insights:**

1. Uses `frame` from outer scope (not inside Sequence)
2. Adds `startFrame` offset to all timing calculations
3. Word timestamps are in milliseconds (`startMs`, `endMs`)
4. Background highlight via `activeStyle` with backgroundColor

### 2.3 Scene Duration Handling

```typescript
// ShortCreator.ts - Video duration matching
const video = await this.pexelsApi.findVideo(
  scene.searchTerms,
  audioLength, // minDurationSeconds
  excludeVideoIds,
  orientation
);
```

**Key Insight:** Finds videos with `duration >= audioLength + buffer`.

### 2.4 Caption Paging Algorithm

```typescript
// utils.ts - Character-based paging
function createCaptionPages({ captions, lineMaxLength, lineCount, maxDistanceMs }) {
  // Groups words into pages based on:
  // - Maximum characters per line (lineMaxLength)
  // - Maximum lines per page (lineCount)
  // - Maximum time gap between words (maxDistanceMs)
}
```

---

## 3. remotion-dev/template-tiktok

### 3.1 Architecture Overview

- **ASR:** @remotion/install-whisper-cpp
- **Captions:** @remotion/captions package
- **Rendering:** Remotion 4.x
- **Input:** Pre-existing video with audio

### 3.2 Caption Timing Pattern

```tsx
// Page.tsx - Key timing logic (RECOMMENDED PATTERN)
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const timeInMs = (frame / fps) * 1000; // Sequence-relative time

return (
  <div>
    {page.tokens.map((t) => {
      // KEY: Converts absolute times to page-relative
      const startRelativeToSequence = t.fromMs - page.startMs;
      const endRelativeToSequence = t.toMs - page.startMs;

      const active = startRelativeToSequence <= timeInMs && endRelativeToSequence > timeInMs;

      return <span style={{ color: active ? HIGHLIGHT_COLOR : 'white' }}>{t.text}</span>;
    })}
  </div>
);
```

**Key Insights:**

1. Uses Sequence-relative frame (`useCurrentFrame()` inside Sequence)
2. **Subtracts `page.startMs`** from word times
3. Comparison is done in Sequence-relative coordinates
4. Clean separation between timing logic and styling

### 3.3 TikTok Caption Creation

```typescript
// Uses @remotion/captions package
import { createTikTokStyleCaptions } from '@remotion/captions';

const { pages } = createTikTokStyleCaptions({
  combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
  captions: subtitles,
});
```

### 3.4 Page Rendering

```tsx
// index.tsx - Sequence timing
{
  pages.map((page, index) => {
    const nextPage = pages[index + 1] ?? null;
    const subtitleStartFrame = (page.startMs / 1000) * fps;
    const subtitleEndFrame = Math.min(
      nextPage ? (nextPage.startMs / 1000) * fps : Infinity,
      subtitleStartFrame + SWITCH_CAPTIONS_EVERY_MS
    );

    return (
      <Sequence from={subtitleStartFrame} durationInFrames={subtitleEndFrame - subtitleStartFrame}>
        <SubtitlePage page={page} />
      </Sequence>
    );
  });
}
```

---

## 4. MoneyPrinterTurbo

### 4.1 Architecture Overview

- **TTS:** EdgeTTS / Azure / SiliconFlow
- **ASR:** Faster-Whisper
- **Rendering:** MoviePy (not Remotion)
- **Stock Footage:** Pexels / Pixabay

### 4.2 Audio-First Duration Sync

```python
# video.py - Video duration matching
audio_clip = AudioFileClip(audio_file)
audio_duration = audio_clip.duration

# Process clips until we match audio duration
for video_path in video_paths:
    if video_duration > audio_duration:
        break
    # ... add clip

# CRITICAL: Loop clips if video is shorter than audio
if video_duration < audio_duration:
    logger.warning(
        f"video duration ({video_duration:.2f}s) is shorter than "
        f"audio duration ({audio_duration:.2f}s), looping clips"
    )
    base_clips = processed_clips.copy()
    for clip in itertools.cycle(base_clips):
        if video_duration >= audio_duration:
            break
        processed_clips.append(clip)
        video_duration += clip.duration
```

**Key Insight:** Audio is the master clock. Videos loop to fill gaps.

### 4.3 Subtitle Creation with Word Timing

```python
# voice.py - Word-level subtitle creation
def create_subtitle(sub_maker, text, subtitle_file):
    for _, (offset, sub) in enumerate(zip(sub_maker.offset, sub_maker.subs)):
        _start_time, end_time = offset
        # ... build SRT entries with timing
```

### 4.4 Video-Subtitle Sync

```python
# video.py - Subtitle overlay with precise timing
def create_text_clip(subtitle_item):
    duration = subtitle_item[0][1] - subtitle_item[0][0]
    _clip = _clip.with_start(subtitle_item[0][0])
    _clip = _clip.with_end(subtitle_item[0][1])
    _clip = _clip.with_duration(duration)
```

---

## 5. Comparative Analysis

### 5.1 Timing Reference Approaches

| Approach                            | Used By           | Pros                              | Cons                               |
| ----------------------------------- | ----------------- | --------------------------------- | ---------------------------------- |
| **Outer frame + startFrame offset** | gyoridavid        | Simple, works in nested Sequences | Requires passing frame from parent |
| **Page-relative conversion**        | remotion-tiktok   | Clean, self-contained             | Requires subtraction for each word |
| **SRT absolute timing**             | MoneyPrinterTurbo | Standard format                   | Not real-time; MoviePy specific    |

### 5.2 Recommended Pattern for content-machine

**Use the remotion-dev/template-tiktok pattern:**

```tsx
const startRelativeToSequence = word.startMs - page.startMs;
const endRelativeToSequence = word.endMs - page.startMs;

const active = startRelativeToSequence <= currentTimeMs && endRelativeToSequence > currentTimeMs;
```

**Reasons:**

1. Cleaner code - no need to pass frame from parent
2. Self-contained - each page handles its own timing
3. Official Remotion pattern - from their template
4. Works with `@remotion/captions` package

### 5.3 Duration Handling Strategies

| Strategy                 | When to Use                                 |
| ------------------------ | ------------------------------------------- |
| **Extend last scene**    | Video file is longer than scene duration    |
| **Loop previous scenes** | All videos are shorter than remaining audio |
| **Fallback color**       | No suitable video available                 |

---

## 6. Implementation Recommendations

### 6.1 Caption Timing Fix

```typescript
// src/render/captions/timing.ts
export function isWordActive(
  word: TimedWord,
  pageStartMs: number,
  sequenceTimeMs: number
): boolean {
  const wordStartRelative = word.startMs - pageStartMs;
  const wordEndRelative = word.endMs - pageStartMs;
  return sequenceTimeMs >= wordStartRelative && sequenceTimeMs < wordEndRelative;
}
```

### 6.2 Visual Duration Fix

```typescript
// src/visuals/duration.ts
export function ensureVisualCoverage(scenes: VisualScene[], audioDuration: number): VisualScene[] {
  const currentDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  if (currentDuration >= audioDuration) return scenes;

  const gap = audioDuration - currentDuration;

  // Try extending last scene
  const last = scenes[scenes.length - 1];
  if (last.videoDuration >= last.duration + gap) {
    return [...scenes.slice(0, -1), { ...last, duration: last.duration + gap }];
  }

  // Fallback to color
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

### 6.3 Timestamp Validation

```typescript
// src/audio/asr/validator.ts
export function validateWordTimings(words: Word[], totalDuration: number): void {
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Bug fix: Reject end < start
    if (word.end <= word.start) {
      throw new TimestampValidationError(i, word.word, 'end_before_start');
    }

    // Check gaps
    if (i > 0) {
      const gap = word.start - words[i - 1].end;
      if (gap > 0.5) {
        throw new TimestampValidationError(i, word.word, 'gap_too_large');
      }
    }
  }

  // Check coverage
  const lastWord = words[words.length - 1];
  if (lastWord.end < totalDuration * 0.95) {
    throw new TimestampValidationError(words.length - 1, lastWord.word, 'missing_coverage');
  }
}
```

---

## 7. Files to Reference

| Repository        | File                                      | Purpose              |
| ----------------- | ----------------------------------------- | -------------------- |
| gyoridavid        | `src/components/videos/PortraitVideo.tsx` | Frame-based timing   |
| gyoridavid        | `src/components/utils.ts`                 | Caption paging       |
| remotion-tiktok   | `src/CaptionedVideo/Page.tsx`             | Page-relative timing |
| remotion-tiktok   | `src/CaptionedVideo/index.tsx`            | Sequence rendering   |
| MoneyPrinterTurbo | `app/services/video.py`                   | Video looping        |
| MoneyPrinterTurbo | `app/services/voice.py`                   | Subtitle creation    |

---

## 8. Summary

**The critical fix for content-machine:**

1. **Caption highlighting:** Convert word times to Sequence-relative by subtracting `page.startMs`
2. **Timestamp validation:** Reject words where `end <= start`
3. **Visual duration:** Extend last scene or add fallback when videos don't cover audio

All three vendor projects handle these cases, and the patterns are well-established.
