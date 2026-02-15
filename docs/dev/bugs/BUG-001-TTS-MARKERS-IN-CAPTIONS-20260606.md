# BUG-001: TTS Markers Appearing in Video Captions

**Date:** 2026-06-06  
**Status:** FIXED  
**Severity:** High (visible to end users)  
**Commits:** 96eedc2, 1462eae (enhanced in current session)

---

## Problem Statement

When rendering videos with the CapCut caption preset, internal TTS timing markers like `[_TT_140]` appeared as visible text in the video captions.

**User Report:**

> "I can see `[_TT_140]` in the video captions"

**Screenshot Evidence:**  
The rendered capcut-demo.mp4 showed raw TTS markers displayed as caption words.

---

## Root Cause Analysis

### Layer 1: TTS Generation (Kokoro)

Kokoro TTS (via kokoro-js) uses internal timing markers in the format `[_TT_###]` to control speech prosody and timing. These markers:

- Are embedded in the audio stream for synthesis timing
- Are NOT intended to be spoken or displayed
- Format: `[_TT_` followed by numbers and `]`

### Layer 2: ASR Transcription (Whisper)

When whisper-cpp transcribes the generated audio:

- It picks up audio artifacts from the TTS markers
- Low-confidence "words" are generated for these sounds
- Whisper reports them as actual words with timestamps

### Layer 3: Caption Rendering (Remotion)

The caption system was rendering ALL words from the timestamp file without filtering, causing:

- TTS markers displayed as captions
- Low-confidence noise words shown
- Punctuation-only "words" displayed

---

## Fix Implementation

### Multi-Layer Defense Strategy

**1. ASR-Level Filtering (`src/audio/asr/index.ts`)**

```typescript
export function isWhisperArtifact(word: string, confidence?: number): boolean {
  const trimmed = word.trim();

  // Filter TTS timing markers (Kokoro pattern: [_TT_###])
  if (/^\[_?[A-Z]+_?\d*\]$/.test(trimmed)) return true;

  // Filter very low-confidence transcriptions
  if (confidence !== undefined && confidence < 0.15) return true;

  // Filter other artifacts...
  return false;
}
```

**2. Caption-Level Filtering (`src/render/captions/paging.ts`)**

```typescript
// Extended pattern catches more TTS marker variants
const TTS_MARKER_PATTERN = /^\[_?[A-Z]+_?\d*\]$/;

export function isDisplayableWord(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) return false;
  if (isTtsMarker(trimmed)) return false;
  if (isAsrArtifact(trimmed)) return false;
  return true;
}

export function sanitizeTimedWordsWithConfidence(
  words: Array<{ text: string; confidence?: number }>,
  minConfidence = 0.1
): typeof words {
  return words.filter((w) => {
    if (w.confidence !== undefined && w.confidence < minConfidence) {
      return false;
    }
    return isDisplayableWord(w.text);
  });
}
```

**3. Render Service Integration (`src/render/service.ts`)**

```typescript
const sanitizedWords = options.timestamps.allWords.filter((w) => isDisplayableWord(w.word));
```

---

## Patterns Filtered

| Pattern          | Example             | Reason                       |
| ---------------- | ------------------- | ---------------------------- |
| `[_TT_###]`      | `[_TT_140]`         | Kokoro TTS timing marker     |
| `[_XX_###]`      | `[_SP_50]`          | Generic TTS control sequence |
| `[TAG]`          | `[PAUSE]`           | TTS control tags             |
| Low confidence   | `bed!` (conf: 0.05) | ASR noise/artifact           |
| Punctuation-only | `.`, `!`, `,`       | Whisper artifact             |

---

## Test Coverage

**Unit Tests (`tests/unit/render/captions/paging.test.ts`):**

```typescript
describe('isTtsMarker', () => {
  it('identifies kokoro timing markers', () => {
    expect(isTtsMarker('[_TT_100]')).toBe(true);
    expect(isTtsMarker('[_TT_140]')).toBe(true);
  });
});

describe('sanitizeTimedWordsWithConfidence', () => {
  it('filters low-confidence words', () => {
    const words = [
      { text: 'hello', confidence: 0.95 },
      { text: 'noise', confidence: 0.05 }, // Filtered
    ];
    expect(sanitizeTimedWordsWithConfidence(words, 0.1)).toHaveLength(1);
  });
});
```

**12+ tests** covering TTS marker detection, confidence filtering, and edge cases.

---

## Verification

1. **Before Fix:** `[_TT_140]` visible in captions
2. **After Fix:** Only clean displayable words appear

To regenerate demo files:

```bash
cm generate "morning routine tips" --archetype listicle --output test.mp4
```

---

## Lessons Learned

1. **Defense in Depth:** Filter at multiple layers (ASR + caption rendering)
2. **Confidence Thresholds:** Low-confidence words are usually artifacts
3. **Pattern Evolution:** TTS engines may use various marker formats
4. **Regex Generalization:** Use `[_?[A-Z]+_?\d*]` not just `[_TT_\d+]`

---

## Related Files

- [src/audio/asr/index.ts](../../src/audio/asr/index.ts) - ASR-level filtering
- [src/render/captions/paging.ts](../../src/render/captions/paging.ts) - Caption-level filtering
- [src/render/service.ts](../../src/render/service.ts) - Render integration
- [tests/unit/render/captions/paging.test.ts](../../tests/unit/render/captions/paging.test.ts) - Tests
