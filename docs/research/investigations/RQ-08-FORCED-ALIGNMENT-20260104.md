# RQ-08: Production-Ready Forced Alignment Algorithms

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** What forced alignment algorithms are production-ready?

---

## 1. Problem Statement

When Edge TTS timestamps aren't sufficient (long texts, ASR validation), we need forced alignment to synchronize transcript words with audio. The question is which algorithm to use.

---

## 2. Vendor Evidence

### 2.1 Approaches Found in Vendored Repos

| Approach                | Location                       | Algorithm                | Speed           |
| ----------------------- | ------------------------------ | ------------------------ | --------------- |
| **WhisperX**            | vendor/captions/whisperX       | wav2vec2 CTC alignment   | 70x realtime    |
| **whisper-timestamped** | Used by viralfactory, ShortGPT | DTW on attention weights | ~5-10x realtime |
| **whisper.cpp**         | vendor/captions/whisper.cpp    | Token-level timestamps   | ~10x realtime   |
| **Aeneas**              | Various references             | MFCC + DTW               | ~1x realtime    |

### 2.2 WhisperX: Character-Level CTC Alignment

**Source:** [vendor/captions/whisperX/whisperx/alignment.py](../../../vendor/captions/whisperX/whisperx/alignment.py)

WhisperX uses wav2vec2 phoneme models for character-level alignment:

```python
# Character-level alignment with confidence scores
char_segments_arr.append({
    "char": char,
    "start": round(char_seg.start * ratio + t1, 3),
    "end": round(char_seg.end * ratio + t1, 3),
    "score": round(char_seg.score, 3),  # Confidence 0.0-1.0
    "word-idx": word_idx,
})
```

**Key features:**

- Uses **beam search backtracking** for robustness
- Provides **per-word confidence scores** (0.0-1.0)
- Supports **35+ languages** via HuggingFace wav2vec2 models
- **1st place** at Ego4d transcription challenge

### 2.3 WhisperX Failure Handling

```python
# 1. No valid characters in alignment model dictionary
if len(clean_char) == 0:
    logger.warning(f'Failed to align: no characters found')
    # Falls back to original Whisper timestamps

# 2. Segment exceeds audio duration
if t1 >= MAX_DURATION:
    logger.warning(f'Failed to align: start time > audio duration')

# 3. Backtrack path not found
if path is None:
    logger.warning(f'Failed to align: backtrack failed')
    # Uses interpolation to fill missing timestamps
```

### 2.4 Interpolation for Missing Timestamps

```python
# Fill NaN timestamps using nearest-neighbor interpolation
aligned_subsegments["start"] = interpolate_nans(
    aligned_subsegments["start"],
    method="nearest"  # Options: nearest, linear, ffill, bfill
)
```

### 2.5 whisper.cpp Token-Level Timestamps

**Source:** [vendor/captions/whisper.cpp](../../../vendor/captions/whisper.cpp)

whisper.cpp provides token-level timestamps directly from the Whisper model:

```cpp
struct whisper_token_data {
    whisper_token id;     // token id
    float p;              // probability of the token
    float pt;             // timestamp probability
    float ptsum;          // cumulative timestamp probability
    int64_t t0;           // start time (samples)
    int64_t t1;           // end time (samples)
};
```

**Note:** Token boundaries don't always align with word boundaries.

### 2.6 Remotion Whisper Integration

**Source:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts)

```typescript
import { installWhisperCpp, transcribe } from '@remotion/install-whisper-cpp';

// Token merging: combine tokens without leading spaces
function mergeTokensIntoWords(tokens: WhisperToken[]): Word[] {
  const words: Word[] = [];
  let currentWord = '';
  let startTime = 0;

  for (const token of tokens) {
    if (token.text.startsWith(' ') && currentWord) {
      // Space indicates new word
      words.push({ text: currentWord.trim(), start: startTime, end: token.t0 });
      currentWord = token.text;
      startTime = token.t0;
    } else {
      currentWord += token.text;
    }
  }

  return words;
}
```

---

## 3. Performance Comparison

| Approach                | Speed           | GPU Memory      | Accuracy  | Best For             |
| ----------------------- | --------------- | --------------- | --------- | -------------------- |
| **WhisperX**            | 70x realtime    | <8GB (large-v2) | Excellent | Production, accuracy |
| **whisper.cpp**         | ~10x realtime   | CPU-only        | Good      | Edge deployment      |
| **whisper-timestamped** | ~5-10x realtime | Moderate        | Good      | Simple integration   |
| **Aeneas**              | ~1x realtime    | N/A             | Fair      | Legacy systems       |

### Processing Time Examples

| Audio Duration | WhisperX | whisper.cpp | whisper-timestamped |
| -------------- | -------- | ----------- | ------------------- |
| 30 seconds     | ~0.4s    | ~3s         | ~3-6s               |
| 60 seconds     | ~0.9s    | ~6s         | ~6-12s              |
| 5 minutes      | ~4.3s    | ~30s        | ~30-60s             |

---

## 4. Character vs Word Level

WhisperX supports both granularities:

```python
result = whisperx.align(
    segments,
    model_a,
    metadata,
    audio,
    device,
    return_char_alignments=True  # Enable character-level
)

# Output structure:
{
  "segments": [{
    "start": 0.0,
    "end": 2.5,
    "text": "Hello world",
    "words": [
      {"word": "Hello", "start": 0.0, "end": 1.0, "score": 0.95},
      {"word": "world", "start": 1.2, "end": 2.5, "score": 0.92},
    ],
    "chars": [
      {"char": "H", "start": 0.0, "end": 0.12, "score": 0.98},
      {"char": "e", "start": 0.12, "end": 0.25, "score": 0.96},
      # ...
    ]
  }]
}
```

---

## 5. Recommended Implementation

### 5.1 Primary: WhisperX (via Python)

```typescript
interface AlignmentResult {
  segments: {
    start: number;
    end: number;
    text: string;
    words: {
      word: string;
      start: number;
      end: number;
      score: number;
    }[];
  }[];
}

async function alignWithWhisperX(
  audioPath: string,
  transcript: string,
  language: string = 'en'
): Promise<AlignmentResult> {
  const result = await runPython('whisperx_align.py', {
    audio: audioPath,
    transcript,
    language,
    model: 'large-v2',
  });

  return result;
}
```

### 5.2 Python WhisperX Wrapper

```python
#!/usr/bin/env python3
# whisperx_align.py

import whisperx
import torch
import json
import sys

def align(audio_path: str, transcript: str, language: str = "en") -> dict:
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Load audio
    audio = whisperx.load_audio(audio_path)

    # Load alignment model
    model_a, metadata = whisperx.load_align_model(
        language_code=language,
        device=device
    )

    # Create segments from transcript
    segments = [{"text": transcript, "start": 0.0, "end": len(audio) / 16000}]

    # Align
    result = whisperx.align(
        segments,
        model_a,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    return result

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    result = align(**args)
    print(json.dumps(result))
```

### 5.3 Fallback: whisper.cpp (via Remotion)

```typescript
import { transcribe } from '@remotion/install-whisper-cpp';

async function alignWithWhisperCpp(audioPath: string): Promise<AlignmentResult> {
  const result = await transcribe({
    inputPath: audioPath,
    model: 'medium.en',
    tokenLevelTimestamps: true,
  });

  // Merge tokens into words
  const words = mergeTokensIntoWords(result.tokens);

  return {
    segments: [
      {
        start: 0,
        end: result.duration,
        text: result.text,
        words,
      },
    ],
  };
}
```

### 5.4 Hybrid Strategy

```typescript
async function getWordTimestamps(
  audioPath: string,
  transcript: string,
  edgeTTSTimestamps?: WordTiming[]
): Promise<WordTiming[]> {
  // Option 1: Use Edge TTS timestamps if available and audio is short
  if (edgeTTSTimestamps && edgeTTSTimestamps.length > 0) {
    const audioDuration = await getAudioDuration(audioPath);

    // Validate: last word should end near audio duration
    const lastWord = edgeTTSTimestamps[edgeTTSTimestamps.length - 1];
    const drift = Math.abs(audioDuration - lastWord.endMs / 1000);

    if (drift < 0.5) {
      // Less than 500ms drift
      return edgeTTSTimestamps; // Edge TTS is accurate enough
    }
  }

  // Option 2: Use WhisperX for alignment
  try {
    const aligned = await alignWithWhisperX(audioPath, transcript);
    return aligned.segments.flatMap((s) =>
      s.words.map((w) => ({
        word: w.word,
        startMs: w.start * 1000,
        endMs: w.end * 1000,
      }))
    );
  } catch (error) {
    logger.warn('WhisperX failed, falling back to whisper.cpp', { error });
  }

  // Option 3: Fallback to whisper.cpp
  const result = await alignWithWhisperCpp(audioPath);
  return result.segments.flatMap((s) =>
    s.words.map((w) => ({
      word: w.word,
      startMs: w.start * 1000,
      endMs: w.end * 1000,
    }))
  );
}
```

---

## 6. Implementation Recommendations

| Decision                 | Recommendation            | Rationale                  |
| ------------------------ | ------------------------- | -------------------------- |
| Primary method           | Edge TTS built-in         | No extra processing needed |
| Validation method        | WhisperX                  | Best accuracy              |
| Fallback                 | whisper.cpp via Remotion  | Already in dependency tree |
| Threshold for validation | >4KB text OR >500ms drift | Balance accuracy vs speed  |

---

## 7. References

- [vendor/captions/whisperX](../../../vendor/captions/whisperX) — WhisperX implementation
- [vendor/captions/whisper.cpp](../../../vendor/captions/whisper.cpp) — whisper.cpp source
- [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts) — Token merging
- [SECTION-AUDIO-PIPELINE-20260104.md](../sections/SECTION-AUDIO-PIPELINE-20260104.md) — Audio pipeline
- [WhisperX Paper](https://arxiv.org/abs/2303.00747) — Academic reference
