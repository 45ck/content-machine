# RQ-28: Audio-Visual-Caption Synchronization Issues

**Date:** 2026-06-10  
**Status:** In Progress  
**Severity:** Critical  
**Components:** Captions, Render, Audio, Visuals

---

## 1. Problem Statement

After rendering test video v3, the following synchronization issues were observed:

1. **Caption highlighting is not working** - words are not being highlighted as they are spoken
2. **Audio, visuals, and text are all out of sync** - the timing between components is misaligned
3. **Visuals and audio are completely out of sync** - scenes end before audio completes

---

## 2. Root Cause Analysis

### 2.1 Caption Highlighting Bug (Critical)

**Location:** `src/render/captions/Caption.tsx` lines 56-65, 76-77

**The Bug:**

```tsx
// Inside a Sequence, frame resets to 0 at each Sequence start
const currentTimeMs = (frame / fps) * 1000;

// This comparison fails because word.startMs is ABSOLUTE (from video start)
// but currentTimeMs is RELATIVE to Sequence start
const isActive = currentTimeMs >= word.startMs && currentTimeMs < word.endMs;
```

**Root Cause:** When a `<Sequence>` component starts, `useCurrentFrame()` resets to 0 for that Sequence. The Caption component's `CaptionPageView` is rendered inside a Sequence, so `frame` is relative to the Sequence start (which is `page.startMs`), but the word timings (`word.startMs`, `word.endMs`) are absolute from video start.

**Vendor Solution (gyoridavid/short-video-maker):**

```tsx
// PortraitVideo.tsx lines 131-133
const active =
  frame >= startFrame + (text.startMs / 1000) * fps &&
  frame <= startFrame + (text.endMs / 1000) * fps;
```

They use the **outer frame** (not Sequence-relative) and add `startFrame` offset. Alternatively, they could offset the word times by subtracting `page.startMs`.

**Vendor Solution (remotion-dev/template-tiktok):**

```tsx
// Page.tsx lines 67-72
const startRelativeToSequence = t.fromMs - page.startMs;
const endRelativeToSequence = t.toMs - page.startMs;

const active = startRelativeToSequence <= timeInMs && endRelativeToSequence > timeInMs;
```

They **subtract `page.startMs`** from word times to make them Sequence-relative.

### 2.2 Timestamp Data Corruption (Critical)

**Location:** `output/timestamps.json` - allWords array, indices 82-95

**The Bug:**

```json
{
  "word": "ahead",
  "start": 21.647242120343844,  // Start at 21.6s
  "end": 21.457512535816612,   // End at 21.4s - BEFORE start!
  "confidence": 0.9
},
{
  "word": "of",
  "start": 21.91828438395416,   // Start at 21.9s
  "end": 21.457512535816612,   // Same broken end time
  "confidence": 0.9
}
// ... 12 more words with same broken end time
```

**Root Cause:** The ASR estimation algorithm in `src/audio/asr/estimator.ts` (or similar) is calculating end times incorrectly when audio exceeds a certain duration. All words after ~21.4s have the same `end` value of 21.457512535816612, regardless of their actual `start` time.

**Impact:** This causes:

1. Words 82-95 have `end < start` which is logically impossible
2. Caption highlighting fails for these words (condition `currentTimeMs < word.endMs` is never true when `start > end`)
3. The last ~5 seconds of the video have no valid word timing

### 2.3 Visual-Audio Duration Mismatch (Critical)

**Observed Data:**

- `timestamps.json`: `totalDuration: 25.225` seconds
- `visuals.json`: Scene 6 ends at `20.32816977077364` seconds
- `visuals.json`: Sum of scene durations ≈ 20.33s

**The Bug:** The visuals pipeline ends at ~20.3s but audio continues until 25.2s. This leaves ~5 seconds of video with no visual content (black screen or last frame frozen).

**Root Cause:** Scene durations in `visuals.json` are calculated from the original scene boundaries in `timestamps.json`, but the script/audio had additional content added (the repeated "Smash that follow button..." CTA) that wasn't matched to visuals.

**Vendor Solution (MoneyPrinterTurbo):**

```python
# video.py lines 233-243
if video_duration < audio_duration:
    logger.warning(f"video duration ({video_duration:.2f}s) is shorter than audio duration ({audio_duration:.2f}s), looping clips to match audio length.")
    base_clips = processed_clips.copy()
    for clip in itertools.cycle(base_clips):
        if video_duration >= audio_duration:
            break
        processed_clips.append(clip)
        video_duration += clip.duration
```

They **loop existing clips** to fill the remaining duration.

---

## 3. Vendor Pattern Analysis

### 3.1 gyoridavid/short-video-maker (TypeScript + Remotion)

**Key Patterns:**

1. Word timestamps are in milliseconds (`startMs`, `endMs`)
2. Uses `useCurrentFrame()` at component level (not inside Sequence)
3. Calculates `startFrame` for each scene/page explicitly
4. Caption highlighting: `frame >= startFrame + (text.startMs / 1000) * fps`

**Caption Pages Structure:**

```ts
type CaptionPage = {
  startMs: number;
  endMs: number;
  lines: CaptionLine[];
};
```

### 3.2 remotion-dev/template-tiktok (Official Template)

**Key Patterns:**

1. Uses `@remotion/captions` package with `createTikTokStyleCaptions()`
2. Converts word times to Sequence-relative before comparison
3. Uses `TikTokPage` type with `startMs` for page offset
4. Highlighting: `startRelativeToSequence <= timeInMs && endRelativeToSequence > timeInMs`

**Time Conversion:**

```tsx
const startRelativeToSequence = t.fromMs - page.startMs;
const endRelativeToSequence = t.toMs - page.startMs;
```

### 3.3 MoneyPrinterTurbo (Python + MoviePy)

**Key Patterns:**

1. Uses SRT subtitle format with explicit timing
2. Audio duration is master clock - videos loop to match
3. Subtitle creation validates timing: `if audio_duration == 0: fail`
4. Video clips are resized/cropped to match aspect ratio

**Duration Sync:**

```python
audio_clip = AudioFileClip(audio_file)
audio_duration = audio_clip.duration
# Videos loop until video_duration >= audio_duration
```

---

## 4. Proposed Fixes

### 4.1 Fix Caption Highlighting (High Priority)

**Option A: Offset word times in CaptionPageView**

```tsx
const CaptionPageView: React.FC<CaptionPageViewProps> = ({ page, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sequence-relative time in ms
  const currentTimeMs = (frame / fps) * 1000;

  return (
    {page.lines.map((line) => (
      {line.words.map((word) => {
        // Offset word times by page start
        const wordStartRelative = word.startMs - page.startMs;
        const wordEndRelative = word.endMs - page.startMs;
        const isActive = currentTimeMs >= wordStartRelative && currentTimeMs < wordEndRelative;
        return <WordView word={word} isActive={isActive} />;
      })}
    ))}
  );
};
```

**Option B: Use absolute frame outside Sequences**
Pass the absolute frame as a prop from a parent component that's not inside a Sequence.

### 4.2 Fix Timestamp Estimation (High Priority)

**In ASR estimator:**

1. Add validation: `if (end <= start) throw new Error('Invalid word timing')`
2. Fix the algorithm that calculates end times
3. Ensure words cover the full audio duration

### 4.3 Fix Visual Duration (Medium Priority)

**In visuals matching:**

1. Validate: `sum(scene.duration) >= totalAudioDuration`
2. If short, extend last scene or loop previous scenes
3. Add `paddingBack` support like gyoridavid

---

## 5. Test Cases (TDD)

### 5.1 Caption Timing Tests

```ts
describe('Caption highlighting', () => {
  it('should highlight word when currentTime is within word bounds', () => {
    const word = { startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const currentTimeMs = 700; // 1200ms absolute = 700ms relative
    expect(isWordActive(word, pageStartMs, currentTimeMs)).toBe(true);
  });

  it('should not highlight word before it starts', () => {
    const word = { startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const currentTimeMs = 400; // 900ms absolute = before word
    expect(isWordActive(word, pageStartMs, currentTimeMs)).toBe(false);
  });
});
```

### 5.2 Timestamp Validation Tests

```ts
describe('Timestamp validation', () => {
  it('should reject words where end < start', () => {
    const invalidWord = { word: 'test', start: 21.6, end: 21.4 };
    expect(() => validateWordTiming(invalidWord)).toThrow();
  });

  it('should ensure all words are covered up to totalDuration', () => {
    const words = [...];
    const totalDuration = 25.225;
    const lastWord = words[words.length - 1];
    expect(lastWord.end).toBeGreaterThanOrEqual(totalDuration * 0.95);
  });
});
```

### 5.3 Duration Sync Tests

```ts
describe('Visual-Audio sync', () => {
  it('should have visuals covering full audio duration', () => {
    const audioEnd = 25.225;
    const visualEnd = scenes.reduce((max, s) => Math.max(max, s.startTime + s.duration), 0);
    expect(visualEnd).toBeGreaterThanOrEqual(audioEnd);
  });
});
```

---

## 6. Dependencies & Impact

### Affected Files:

- `src/render/captions/Caption.tsx` - Highlighting logic
- `src/audio/asr/estimator.ts` - Word timing calculation
- `src/visuals/matcher.ts` - Scene duration calculation
- `src/render/remotion/ShortVideo.tsx` - Composition timing

### Related Issues:

- RQ-09: Timestamp Drift
- RQ-07: Edge-TTS Timestamps
- RQ-08: Forced Alignment

---

## 7. Recommended Fix Order

1. **Timestamp Validation** - Add guards to prevent invalid data from propagating
2. **Caption Highlighting** - Fix the relative/absolute timing issue
3. **Visual Duration** - Extend/loop visuals to match audio
4. **Integration Tests** - TDD tests to prevent regression

---

## 8. References

- [gyoridavid/short-video-maker PortraitVideo.tsx](https://github.com/gyoridavid/short-video-maker/blob/main/src/components/videos/PortraitVideo.tsx)
- [remotion-dev/template-tiktok Page.tsx](https://github.com/remotion-dev/template-tiktok/blob/main/src/CaptionedVideo/Page.tsx)
- [MoneyPrinterTurbo video.py](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/app/services/video.py)
- [Remotion Sequence docs](https://www.remotion.dev/docs/sequence)
