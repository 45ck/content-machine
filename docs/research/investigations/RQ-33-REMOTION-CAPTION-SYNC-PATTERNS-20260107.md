# RQ-33: Remotion Caption Sync Patterns and Frame-Time Conversion

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P1  
**Related:** RQ-28, RQ-30

---

## 1. Problem Statement

Remotion uses frame-based timing while our timestamps are millisecond-based. Caption highlighting, scene transitions, and audio sync all require precise frame-time conversion. This investigation documents the correct patterns from production implementations.

---

## 2. Core Concepts

### 2.1 Remotion Time Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REMOTION TIMING MODEL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Frame 0        Frame 30       Frame 60       Frame 90                      │
│  │              │              │              │                             │
│  ▼              ▼              ▼              ▼                             │
│  ├──────────────┼──────────────┼──────────────┼─────────── → Time           │
│  0.0s           1.0s           2.0s           3.0s                          │
│                                                                             │
│  FPS = 30 → Each frame = 33.33ms                                            │
│  FPS = 25 → Each frame = 40.00ms                                            │
│                                                                             │
│  Conversions:                                                               │
│  - frame = seconds × fps                                                    │
│  - seconds = frame / fps                                                    │
│  - frame = (ms / 1000) × fps                                                │
│  - ms = (frame / fps) × 1000                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 The Sequence Problem

When using `<Sequence>` components, `useCurrentFrame()` **resets to 0** at the start of each Sequence:

```tsx
<Composition durationInFrames={300} fps={30}>
  {/* frame 0-300 (0-10 seconds) */}
  
  <Sequence from={90} durationInFrames={60}>
    {/* Inside here, frame is 0-60, NOT 90-150 */}
    {/* This catches many developers off guard! */}
  </Sequence>
</Composition>
```

---

## 3. Vendor Pattern Analysis

### 3.1 gyoridavid/short-video-maker (Absolute Frames)

**Approach:** Use absolute frame reference, not Sequence-relative.

**File:** `src/components/videos/PortraitVideo.tsx`

```tsx
// Caption timing uses startFrame offset
const startFrame = scenes.slice(0, i).reduce((acc, curr) => {
  return acc + curr.audio.duration;  // Accumulate scene durations
}, 0) * fps;

// Word highlighting compares against absolute frame
const active =
  frame >= startFrame + (text.startMs / 1000) * fps &&
  frame <= startFrame + (text.endMs / 1000) * fps;
```

**Key Pattern:**
- `frame` is obtained from `useCurrentFrame()` at VIDEO level (not inside Sequence)
- `startFrame` is calculated from accumulated scene durations
- Word timing is ADDED to `startFrame` for absolute positioning

### 3.2 remotion-dev/template-tiktok (Sequence-Relative)

**Approach:** Convert word times to Sequence-relative before comparison.

**File:** `src/CaptionedVideo/Page.tsx`

```tsx
const Page: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();  // Resets inside Sequence
  const { fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;  // Sequence-relative time

  return (
    <>
      {page.tokens.map((t) => {
        // Convert ABSOLUTE word times to RELATIVE
        const startRelativeToSequence = t.fromMs - page.startMs;
        const endRelativeToSequence = t.toMs - page.startMs;

        const active = 
          startRelativeToSequence <= timeInMs && 
          endRelativeToSequence > timeInMs;

        return (
          <span style={{ color: active ? "#FFD700" : "white" }}>
            {t.text}
          </span>
        );
      })}
    </>
  );
};
```

**Key Pattern:**
- Words have ABSOLUTE timing (`t.fromMs`, `t.toMs`)
- Page has start time (`page.startMs`)
- Subtract `page.startMs` to get Sequence-relative timing
- Compare against Sequence-relative `timeInMs`

### 3.3 Pattern Comparison

| Aspect | gyori (Absolute) | template-tiktok (Relative) |
|--------|------------------|---------------------------|
| Frame source | Video level | Inside Sequence |
| Calculation | `frame >= startFrame + wordFrame` | `timeInMs >= wordMs - pageMs` |
| Complexity | Simpler mental model | More modular |
| Error prone | Need to track startFrame | Need to subtract page offset |
| Recommended | For simple layouts | For complex compositions |

---

## 4. Frame-Time Conversion Functions

### 4.1 Core Utilities

```typescript
// src/render/utils/timing.ts

/**
 * Convert milliseconds to frame number.
 * Uses Math.round for accurate frame positioning.
 */
export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/**
 * Convert seconds to frame number.
 */
export function secondsToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Convert frame to milliseconds.
 */
export function frameToMs(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}

/**
 * Convert frame to seconds.
 */
export function frameToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

/**
 * Calculate duration in frames from start/end times.
 */
export function getDurationInFrames(
  startMs: number, 
  endMs: number, 
  fps: number
): number {
  const startFrame = msToFrame(startMs, fps);
  const endFrame = msToFrame(endMs, fps);
  return Math.max(1, endFrame - startFrame);  // Minimum 1 frame
}
```

### 4.2 Word Highlight Helper

```typescript
// src/render/utils/timing.ts

/**
 * Determine if a word should be highlighted at the current frame.
 * 
 * @param word - Word with timing in SECONDS
 * @param currentFrame - Current frame from useCurrentFrame()
 * @param sceneStartFrame - Frame where this scene/page starts
 * @param fps - Frames per second
 */
export function isWordActive(
  word: { start: number; end: number },
  currentFrame: number,
  sceneStartFrame: number,
  fps: number
): boolean {
  const wordStartFrame = sceneStartFrame + secondsToFrame(word.start, fps);
  const wordEndFrame = sceneStartFrame + secondsToFrame(word.end, fps);
  
  return currentFrame >= wordStartFrame && currentFrame < wordEndFrame;
}

/**
 * Alternative: Sequence-relative word highlighting.
 * Use when inside a Sequence component.
 * 
 * @param word - Word with timing in MILLISECONDS (absolute)
 * @param pageStartMs - When this page/Sequence starts
 * @param currentTimeMs - Current time in ms (from frame / fps * 1000)
 */
export function isWordActiveRelative(
  word: { startMs: number; endMs: number },
  pageStartMs: number,
  currentTimeMs: number
): boolean {
  const startRelative = word.startMs - pageStartMs;
  const endRelative = word.endMs - pageStartMs;
  
  return currentTimeMs >= startRelative && currentTimeMs < endRelative;
}
```

---

## 5. Caption Page Structure

### 5.1 TikTok-Style Caption Pages

```typescript
// Using @remotion/captions
import { createTikTokStyleCaptions } from '@remotion/captions';

const { pages } = createTikTokStyleCaptions({
  captions: wordTimings,  // Array of Caption objects
  combineTokensWithinMilliseconds: 1200,  // Group words shown together
});

// TikTokPage structure
interface TikTokPage {
  text: string;        // Full text for this page
  startMs: number;     // When page appears (absolute)
  tokens: Array<{
    text: string;      // Individual word
    fromMs: number;    // Word start (absolute)
    toMs: number;      // Word end (absolute)
  }>;
  durationMs: number;  // Page duration
}
```

### 5.2 Custom Caption Pages (content-machine)

```typescript
// src/render/captions/types.ts

export interface CaptionWord {
  text: string;
  startMs: number;    // Absolute from video start
  endMs: number;      // Absolute from video start
}

export interface CaptionLine {
  words: CaptionWord[];
}

export interface CaptionPage {
  startMs: number;    // When this page appears
  endMs: number;      // When this page disappears
  lines: CaptionLine[];
}

// Pagination function
export function createCaptionPages(
  words: CaptionWord[],
  options: {
    maxCharsPerLine: number;
    maxLinesPerPage: number;
    maxGapMs: number;  // Gap that triggers new page
  }
): CaptionPage[] {
  const pages: CaptionPage[] = [];
  let currentPage: CaptionPage | null = null;
  let currentLine: CaptionLine | null = null;
  let currentLineChars = 0;
  
  for (const word of words) {
    // Check if we need a new page (time gap)
    if (currentPage && word.startMs - currentPage.endMs > options.maxGapMs) {
      pages.push(currentPage);
      currentPage = null;
      currentLine = null;
    }
    
    // Start new page if needed
    if (!currentPage) {
      currentPage = {
        startMs: word.startMs,
        endMs: word.endMs,
        lines: []
      };
      currentLine = { words: [] };
      currentPage.lines.push(currentLine);
      currentLineChars = 0;
    }
    
    // Check if we need a new line (character limit)
    if (currentLineChars + word.text.length > options.maxCharsPerLine) {
      if (currentPage.lines.length >= options.maxLinesPerPage) {
        // Max lines reached, start new page
        pages.push(currentPage);
        currentPage = {
          startMs: word.startMs,
          endMs: word.endMs,
          lines: []
        };
      }
      currentLine = { words: [] };
      currentPage.lines.push(currentLine);
      currentLineChars = 0;
    }
    
    // Add word to current line
    currentLine!.words.push(word);
    currentLineChars += word.text.length + 1;  // +1 for space
    currentPage!.endMs = word.endMs;
  }
  
  if (currentPage) {
    pages.push(currentPage);
  }
  
  return pages;
}
```

---

## 6. Complete Caption Component

### 6.1 With Absolute Frame Tracking

```tsx
// src/render/captions/CaptionsOverlay.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { CaptionPage, CaptionWord } from './types';
import { isWordActive, msToFrame } from '../utils/timing';

interface CaptionsOverlayProps {
  pages: CaptionPage[];
  highlightColor: string;
  defaultColor: string;
  sceneStartFrame: number;  // When this scene starts in video
}

export const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({
  pages,
  highlightColor,
  defaultColor,
  sceneStartFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Calculate absolute frame
  const absoluteFrame = sceneStartFrame + frame;
  
  return (
    <div className="captions-container">
      {pages.map((page, pageIndex) => {
        const pageStartFrame = msToFrame(page.startMs, fps);
        const pageEndFrame = msToFrame(page.endMs, fps);
        const pageDuration = pageEndFrame - pageStartFrame;
        
        return (
          <Sequence
            key={pageIndex}
            from={pageStartFrame}
            durationInFrames={Math.max(1, pageDuration)}
          >
            <PageView
              page={page}
              absoluteFrame={absoluteFrame}
              sceneStartFrame={sceneStartFrame}
              fps={fps}
              highlightColor={highlightColor}
              defaultColor={defaultColor}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

interface PageViewProps {
  page: CaptionPage;
  absoluteFrame: number;
  sceneStartFrame: number;
  fps: number;
  highlightColor: string;
  defaultColor: string;
}

const PageView: React.FC<PageViewProps> = ({
  page,
  absoluteFrame,
  sceneStartFrame,
  fps,
  highlightColor,
  defaultColor,
}) => {
  return (
    <div className="caption-page">
      {page.lines.map((line, lineIndex) => (
        <p key={lineIndex} className="caption-line">
          {line.words.map((word, wordIndex) => {
            // Calculate if this word is active
            const active = isWordActive(
              { start: word.startMs / 1000, end: word.endMs / 1000 },
              absoluteFrame,
              sceneStartFrame,
              fps
            );
            
            return (
              <span
                key={wordIndex}
                style={{
                  color: active ? highlightColor : defaultColor,
                  fontWeight: active ? 'bold' : 'normal',
                  transition: 'color 0.1s ease',
                }}
              >
                {word.text}{' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
};
```

### 6.2 With Sequence-Relative Timing (template-tiktok style)

```tsx
// Alternative approach using relative timing
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptionPage } from './types';
import { isWordActiveRelative, frameToMs } from '../utils/timing';

interface PageViewRelativeProps {
  page: CaptionPage;
  highlightColor: string;
  defaultColor: string;
}

export const PageViewRelative: React.FC<PageViewRelativeProps> = ({
  page,
  highlightColor,
  defaultColor,
}) => {
  // frame is relative to Sequence start (resets to 0)
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Current time relative to Sequence start
  const currentTimeMs = frameToMs(frame, fps);
  
  return (
    <div className="caption-page">
      {page.lines.map((line, lineIndex) => (
        <p key={lineIndex} className="caption-line">
          {line.words.map((word, wordIndex) => {
            // Word times are absolute, subtract page start for relative
            const active = isWordActiveRelative(
              word,
              page.startMs,  // Page start in absolute ms
              currentTimeMs
            );
            
            return (
              <span
                key={wordIndex}
                style={{
                  color: active ? highlightColor : defaultColor,
                  fontWeight: active ? 'bold' : 'normal',
                }}
              >
                {word.text}{' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
};
```

---

## 7. Scene Sequence Timing

### 7.1 Scene Composition

```tsx
// src/render/remotion/ShortVideo.tsx
import { Composition, Sequence, Audio, OffthreadVideo } from 'remotion';

interface Scene {
  videoUrl: string;
  audioUrl: string;
  audioDuration: number;  // Seconds
  captions: CaptionWord[];
}

interface ShortVideoProps {
  scenes: Scene[];
  backgroundMusic?: string;
  musicVolume: number;
}

export const ShortVideo: React.FC<ShortVideoProps> = ({
  scenes,
  backgroundMusic,
  musicVolume,
}) => {
  const { fps } = useVideoConfig();
  
  // Calculate scene start frames from accumulated durations
  const sceneTimings = scenes.map((scene, index) => {
    const startTime = scenes.slice(0, index).reduce(
      (acc, s) => acc + s.audioDuration,
      0
    );
    const startFrame = Math.round(startTime * fps);
    const durationFrames = Math.round(scene.audioDuration * fps);
    
    return { startFrame, durationFrames, scene };
  });
  
  return (
    <div style={{ width: 1080, height: 1920 }}>
      {sceneTimings.map(({ startFrame, durationFrames, scene }, index) => (
        <Sequence
          key={index}
          from={startFrame}
          durationInFrames={durationFrames}
        >
          {/* Background video */}
          <OffthreadVideo
            src={scene.videoUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
          />
          
          {/* Voiceover audio */}
          <Audio src={scene.audioUrl} />
          
          {/* Captions */}
          <CaptionsOverlay
            pages={createCaptionPages(scene.captions, {
              maxCharsPerLine: 20,
              maxLinesPerPage: 2,
              maxGapMs: 1000,
            })}
            highlightColor="#FFD700"
            defaultColor="#FFFFFF"
            sceneStartFrame={startFrame}
          />
        </Sequence>
      ))}
      
      {/* Background music spans entire video */}
      {backgroundMusic && (
        <Audio
          src={backgroundMusic}
          volume={musicVolume}
          loop
        />
      )}
    </div>
  );
};
```

### 7.2 Duration Calculation

```typescript
// Calculate total video duration from scenes
export function calculateTotalDuration(
  scenes: Scene[],
  paddingEndMs: number = 0
): { durationMs: number; durationFrames: number } {
  const totalMs = scenes.reduce(
    (acc, scene) => acc + scene.audioDuration * 1000,
    0
  ) + paddingEndMs;
  
  return {
    durationMs: totalMs,
    durationFrames: Math.ceil((totalMs / 1000) * FPS),
  };
}

// calculateMetadata for dynamic composition
export const calculateMetadata: CalculateMetadataFunction<ShortVideoProps> = 
  async ({ props }) => {
    const { durationFrames } = calculateTotalDuration(props.scenes);
    
    return {
      durationInFrames: durationFrames,
      fps: FPS,
      width: 1080,
      height: 1920,
    };
  };
```

---

## 8. Common Pitfalls and Fixes

### 8.1 Pitfall: Using Sequence-Relative Frame for Absolute Timing

**Bug:**
```tsx
// WRONG: frame resets inside Sequence
<Sequence from={90}>
  <MyComponent />
</Sequence>

const MyComponent = () => {
  const frame = useCurrentFrame();  // Returns 0-X, not 90+
  // Using frame directly for absolute timing fails!
};
```

**Fix:**
```tsx
// CORRECT: Pass absolute frame or use offset
const MyComponent = ({ sceneStartFrame }) => {
  const frame = useCurrentFrame();
  const absoluteFrame = sceneStartFrame + frame;
  // Now absoluteFrame is correct
};
```

### 8.2 Pitfall: Off-by-One Frame Errors

**Bug:**
```tsx
// WRONG: Using floor can cut off last frame
const endFrame = Math.floor(endMs / 1000 * fps);  // May be 1 frame short
```

**Fix:**
```tsx
// CORRECT: Use round for accurate boundaries
const endFrame = Math.round(endMs / 1000 * fps);

// And ensure minimum 1 frame duration
const durationInFrames = Math.max(1, endFrame - startFrame);
```

### 8.3 Pitfall: Comparing Milliseconds to Frames

**Bug:**
```tsx
// WRONG: Mixing units
const isActive = frame >= word.startMs;  // frame is integer, startMs is float
```

**Fix:**
```tsx
// CORRECT: Convert to same unit
const isActive = frame >= msToFrame(word.startMs, fps);
// OR
const currentMs = frameToMs(frame, fps);
const isActive = currentMs >= word.startMs;
```

---

## 9. Testing Frame-Time Conversions

```typescript
// tests/unit/render/timing.test.ts
import { describe, it, expect } from 'vitest';
import { 
  msToFrame, 
  frameToMs, 
  isWordActive, 
  isWordActiveRelative 
} from '../../../src/render/utils/timing';

describe('Frame-Time Conversions', () => {
  const fps = 30;
  
  it('converts milliseconds to frames', () => {
    expect(msToFrame(0, fps)).toBe(0);
    expect(msToFrame(1000, fps)).toBe(30);
    expect(msToFrame(500, fps)).toBe(15);
    expect(msToFrame(33.33, fps)).toBe(1);  // Rounds to nearest
  });
  
  it('converts frames to milliseconds', () => {
    expect(frameToMs(0, fps)).toBe(0);
    expect(frameToMs(30, fps)).toBe(1000);
    expect(frameToMs(15, fps)).toBeCloseTo(500, 1);
  });
  
  it('detects active word with absolute frames', () => {
    const word = { start: 1.0, end: 1.5 };  // 1.0s to 1.5s
    const sceneStart = 0;
    
    expect(isWordActive(word, 29, sceneStart, fps)).toBe(false);  // Before
    expect(isWordActive(word, 30, sceneStart, fps)).toBe(true);   // At start
    expect(isWordActive(word, 40, sceneStart, fps)).toBe(true);   // Middle
    expect(isWordActive(word, 44, sceneStart, fps)).toBe(true);   // Near end
    expect(isWordActive(word, 45, sceneStart, fps)).toBe(false);  // At end
  });
  
  it('detects active word with relative timing', () => {
    const word = { startMs: 1000, endMs: 1500 };  // Absolute timing
    const pageStartMs = 500;  // Page starts at 500ms
    
    // Word is active from 500-1000ms relative (1000-1500 absolute)
    expect(isWordActiveRelative(word, pageStartMs, 400)).toBe(false);
    expect(isWordActiveRelative(word, pageStartMs, 500)).toBe(true);
    expect(isWordActiveRelative(word, pageStartMs, 800)).toBe(true);
    expect(isWordActiveRelative(word, pageStartMs, 1000)).toBe(false);
  });
});
```

---

## 10. Recommendations

### 10.1 For content-machine

1. **Use milliseconds internally** for all timestamps (matches Remotion Caption type)
2. **Convert to frames only at render time** using `msToFrame()`
3. **Choose one pattern consistently:**
   - Absolute frames (simpler, recommended for our structure)
   - OR Sequence-relative (if complex nesting needed)
4. **Add timing utilities** to `src/render/utils/timing.ts`
5. **Test frame boundaries** with unit tests

### 10.2 Default Configuration

```typescript
export const VIDEO_CONFIG = {
  fps: 30,
  width: 1080,
  height: 1920,
  codec: 'h264' as const,
} as const;

export const CAPTION_CONFIG = {
  maxCharsPerLine: 20,
  maxLinesPerPage: 2,
  maxGapMs: 1000,
  highlightColor: '#FFD700',
  defaultColor: '#FFFFFF',
} as const;
```

---

## 11. References

- [RQ-28: Audio-Visual-Caption Sync](RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md)
- [RQ-30: Sync Pipeline Architecture](RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md)
- [Remotion Sequence Documentation](https://www.remotion.dev/docs/sequence)
- [Remotion useCurrentFrame](https://www.remotion.dev/docs/use-current-frame)
- [@remotion/captions](https://www.remotion.dev/docs/captions)
- [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker)
- [remotion-dev/template-tiktok](https://github.com/remotion-dev/template-tiktok)
