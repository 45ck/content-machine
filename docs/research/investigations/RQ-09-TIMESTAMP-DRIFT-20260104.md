# RQ-09: TTS/ASR Timestamp Drift Handling

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** How do we handle timestamp drift between TTS generation and ASR transcription?

---

## 1. Problem Statement

Timestamp drift occurs when:
- ASR finds fewer/more words than TTS input
- TTS timing doesn't match expected duration
- Punctuation affects word boundaries
- Gaps between words are inconsistent

---

## 2. Vendor Evidence

### 2.1 Levenshtein Similarity Matching (MoneyPrinterTurbo)

**Source:** [vendor/MoneyPrinterTurbo/app/services/subtitle.py](../../../vendor/MoneyPrinterTurbo/app/services/subtitle.py)

MoneyPrinterTurbo uses Levenshtein distance to match ASR output to original script:

```python
from difflib import SequenceMatcher

def similarity(a: str, b: str) -> float:
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def match_subtitle_to_script(asr_segments: list, script_lines: list) -> list:
    """Match ASR segments to original script lines."""
    SIMILARITY_THRESHOLD = 0.8
    
    matched = []
    script_index = 0
    accumulated_text = ""
    
    for segment in asr_segments:
        accumulated_text += " " + segment["text"]
        accumulated_text = accumulated_text.strip()
        
        if script_index < len(script_lines):
            target_line = script_lines[script_index]
            sim = similarity(accumulated_text, target_line)
            
            if sim >= SIMILARITY_THRESHOLD:
                matched.append({
                    "text": target_line,  # Use original text
                    "start": segment["start"],
                    "end": segment["end"],
                })
                accumulated_text = ""
                script_index += 1
    
    return matched
```

### 2.2 VAD Filtering (WhisperX)

**Source:** [vendor/captions/whisperX/whisperx/vad.py](../../../vendor/captions/whisperX/whisperx/vad.py)

WhisperX uses Voice Activity Detection to filter silence and prevent hallucinations:

```python
# VAD parameters
VAD_OPTIONS = {
    "vad_onset": 0.5,      # Speech start threshold
    "vad_offset": 0.363,   # Speech end threshold
}

def filter_speech_segments(audio, vad_model):
    """Remove silence segments to prevent ASR hallucinations."""
    speech_segments = vad_model.get_speech_timestamps(
        audio,
        onset=VAD_OPTIONS["vad_onset"],
        offset=VAD_OPTIONS["vad_offset"],
    )
    return merge_adjacent_segments(speech_segments)
```

### 2.3 NaN Interpolation for Missing Timestamps

**Source:** [vendor/captions/whisperX/whisperx/alignment.py](../../../vendor/captions/whisperX/whisperx/alignment.py)

```python
def interpolate_nans(timestamps: np.ndarray, method: str = "nearest") -> np.ndarray:
    """Fill missing timestamps using interpolation."""
    valid_mask = ~np.isnan(timestamps)
    
    if method == "nearest":
        # Forward fill, then backward fill
        timestamps = pd.Series(timestamps).ffill().bfill().values
    elif method == "linear":
        # Linear interpolation
        timestamps = np.interp(
            np.arange(len(timestamps)),
            np.where(valid_mask)[0],
            timestamps[valid_mask]
        )
    
    return timestamps
```

### 2.4 Proportional Character Distribution (MoneyPrinterTurbo)

**Source:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py)

When word boundaries aren't available, distribute duration proportionally:

```python
def estimate_word_timings(text: str, start_time: float, end_time: float) -> list:
    """Estimate word timings by proportional character distribution."""
    words = text.split()
    total_chars = sum(len(w) for w in words)
    duration = end_time - start_time
    
    timings = []
    current_time = start_time
    
    for word in words:
        word_duration = (len(word) / total_chars) * duration
        timings.append({
            "word": word,
            "start": current_time,
            "end": current_time + word_duration,
        })
        current_time += word_duration
    
    return timings
```

### 2.5 Punctuation Handling

**Source:** [vendor/MoneyPrinterTurbo/app/utils/utils.py](../../../vendor/MoneyPrinterTurbo/app/utils/utils.py)

```python
PUNCTUATION_MARKS = [".", "。", "!", "?", "？", ",", "，", ":", "：", ";", "；"]

def split_by_punctuation(text: str) -> list[str]:
    """Split text at punctuation marks for subtitle grouping."""
    segments = []
    current = ""
    
    for char in text:
        current += char
        if char in PUNCTUATION_MARKS:
            segments.append(current.strip())
            current = ""
    
    if current.strip():
        segments.append(current.strip())
    
    return segments

def normalize_for_matching(text: str) -> str:
    """Remove punctuation for ASR matching."""
    return ''.join(c for c in text if c not in PUNCTUATION_MARKS).lower()
```

### 2.6 Token Merging (short-video-maker-gyori)

**Source:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts)

```typescript
function mergeTokensIntoWords(tokens: Token[]): Word[] {
  const words: Word[] = [];
  
  for (const token of tokens) {
    // Tokens without leading space are continuations
    if (!token.text.startsWith(" ") && words.length > 0) {
      const lastWord = words[words.length - 1];
      lastWord.text += token.text;
      lastWord.end = token.t1;
    } else {
      words.push({
        text: token.text.trim(),
        start: token.t0,
        end: token.t1,
      });
    }
  }
  
  return words;
}
```

---

## 3. Drift Scenarios and Solutions

### 3.1 ASR Finds Fewer Words Than Expected

**Cause:** Words merged, mumbled, or silent.

**Solution:** Use original script text with interpolated timing.

```typescript
function handleMissingWords(
  expectedWords: string[],
  asrWords: Word[]
): Word[] {
  if (asrWords.length >= expectedWords.length) {
    return asrWords;
  }
  
  // Distribute missing words proportionally
  const totalDuration = asrWords[asrWords.length - 1].end - asrWords[0].start;
  const durationPerWord = totalDuration / expectedWords.length;
  
  return expectedWords.map((word, i) => ({
    word,
    start: asrWords[0].start + i * durationPerWord,
    end: asrWords[0].start + (i + 1) * durationPerWord,
  }));
}
```

### 3.2 ASR Finds More Words Than Expected

**Cause:** Filler words, repetitions, ASR hallucinations.

**Solution:** Filter to match expected words using Levenshtein.

```typescript
function filterExtraWords(
  expectedWords: string[],
  asrWords: Word[]
): Word[] {
  const result: Word[] = [];
  let asrIndex = 0;
  
  for (const expected of expectedWords) {
    // Find best match in remaining ASR words
    let bestMatch = -1;
    let bestSim = 0;
    
    for (let i = asrIndex; i < Math.min(asrIndex + 3, asrWords.length); i++) {
      const sim = similarity(expected, asrWords[i].word);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = i;
      }
    }
    
    if (bestMatch >= 0 && bestSim > 0.6) {
      result.push({
        word: expected,  // Use original text
        start: asrWords[bestMatch].start,
        end: asrWords[bestMatch].end,
      });
      asrIndex = bestMatch + 1;
    }
  }
  
  return result;
}
```

### 3.3 Duration Mismatch

**Cause:** TTS speaks faster/slower than expected.

**Solution:** Validate and warn, but use actual audio duration.

```typescript
function validateDuration(
  expectedDurationMs: number,
  actualDurationMs: number,
  tolerance: number = 0.1  // 10%
): { valid: boolean; driftMs: number } {
  const driftMs = actualDurationMs - expectedDurationMs;
  const driftRatio = Math.abs(driftMs) / expectedDurationMs;
  
  if (driftRatio > tolerance) {
    logger.warn('Audio duration drift detected', {
      expected: expectedDurationMs,
      actual: actualDurationMs,
      drift: driftMs,
      driftPercent: (driftRatio * 100).toFixed(1),
    });
  }
  
  return {
    valid: driftRatio <= tolerance,
    driftMs,
  };
}
```

---

## 4. Recommended Implementation

### 4.1 Comprehensive Alignment Pipeline

```typescript
interface AlignmentOptions {
  expectedWords: string[];
  asrWords: Word[];
  audioDurationMs: number;
  tolerancePct?: number;
}

function alignWords(options: AlignmentOptions): Word[] {
  const { expectedWords, asrWords, audioDurationMs, tolerancePct = 10 } = options;
  
  // Step 1: Validate word counts
  const countDiff = Math.abs(expectedWords.length - asrWords.length);
  const diffRatio = countDiff / expectedWords.length;
  
  if (diffRatio > 0.2) {
    logger.warn('Significant word count mismatch', {
      expected: expectedWords.length,
      found: asrWords.length,
    });
  }
  
  // Step 2: Match words using Levenshtein
  const matched = matchWordsByContent(expectedWords, asrWords);
  
  // Step 3: Fill gaps with interpolation
  const filled = interpolateMissingTimings(matched, audioDurationMs);
  
  // Step 4: Normalize to use original text
  return filled.map((w, i) => ({
    word: expectedWords[i] ?? w.word,
    start: w.start,
    end: w.end,
  }));
}
```

### 4.2 Scene Boundary Alignment

```typescript
function alignSceneBoundaries(
  scenes: Scene[],
  words: Word[],
  audioDurationMs: number
): SceneTimestamp[] {
  const result: SceneTimestamp[] = [];
  let wordIndex = 0;
  
  for (const scene of scenes) {
    const sceneWordCount = scene.text.split(/\s+/).length;
    const sceneWords = words.slice(wordIndex, wordIndex + sceneWordCount);
    
    if (sceneWords.length === 0) {
      // Estimate based on remaining duration
      const remainingDuration = audioDurationMs - (result.length > 0 
        ? result[result.length - 1].endMs 
        : 0);
      const remainingScenes = scenes.length - result.length;
      const estimatedDuration = remainingDuration / remainingScenes;
      
      const lastEnd = result.length > 0 ? result[result.length - 1].endMs : 0;
      result.push({
        sceneId: scene.id,
        startMs: lastEnd,
        endMs: lastEnd + estimatedDuration,
        words: [],
        estimated: true,
      });
    } else {
      result.push({
        sceneId: scene.id,
        startMs: sceneWords[0].start,
        endMs: sceneWords[sceneWords.length - 1].end,
        words: sceneWords,
        estimated: false,
      });
    }
    
    wordIndex += sceneWordCount;
  }
  
  return result;
}
```

---

## 5. Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Word count match | >90% | (matched words / expected words) |
| Timing accuracy | <100ms | Average difference from reference |
| Duration drift | <10% | (actual - expected) / expected |
| Interpolation rate | <20% | Words with estimated timing |

---

## 6. Implementation Recommendations

| Pattern | Priority | Rationale |
|---------|----------|-----------|
| Levenshtein matching | P0 | Handle ASR variations |
| Proportional interpolation | P0 | Fill missing words |
| Duration validation | P1 | Detect TTS issues |
| Scene boundary adjustment | P1 | Accurate scene timing |
| Quality metrics logging | P2 | Monitor alignment quality |

---

## 7. References

- [vendor/MoneyPrinterTurbo/app/services/subtitle.py](../../../vendor/MoneyPrinterTurbo/app/services/subtitle.py) — Similarity matching
- [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py) — Proportional estimation
- [vendor/captions/whisperX/whisperx/alignment.py](../../../vendor/captions/whisperX/whisperx/alignment.py) — Interpolation
- [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts) — Token merging
- [SECTION-AUDIO-PIPELINE-20260104.md](../sections/SECTION-AUDIO-PIPELINE-20260104.md) — Audio pipeline
