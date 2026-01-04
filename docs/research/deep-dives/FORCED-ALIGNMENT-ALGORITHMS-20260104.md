# Forced Alignment Algorithms for TTS-ASR Timestamp Synchronization

**Date:** 2026-01-04  
**Status:** Research Complete  
**Scope:** Production-ready alignment algorithms in vendored repos

---

## Executive Summary

This research analyzes forced alignment implementations in the vendored repositories for synchronizing TTS audio with ASR-generated timestamps. The primary finding is that **WhisperX's wav2vec2-based phoneme alignment** is the most production-ready solution, offering:

- **70x realtime** processing speed (large-v2)
- **Word-level timestamps** with confidence scores
- **35+ language support** via HuggingFace wav2vec2 models
- **Beam search backtracking** for robust alignment recovery

---

## 1. Alignment Approaches Found

### 1.1 WhisperX Phoneme Alignment (PRIMARY RECOMMENDATION)

**Location:** `vendor/captions/whisperx/whisperx/alignment.py`

**Algorithm:** CTC-based forced alignment using wav2vec2 phoneme models

```python
# Core alignment function signature
def align(
    transcript: Iterable[SingleSegment],
    model: torch.nn.Module,
    align_model_metadata: dict,
    audio: Union[str, np.ndarray, torch.Tensor],
    device: str,
    interpolate_method: str = "nearest",
    return_char_alignments: bool = False,
) -> AlignedTranscriptionResult:
```

**Key Implementation Details:**

1. **Trellis Construction** (Dynamic Programming):
```python
def get_trellis(emission, tokens, blank_id=0):
    num_frame = emission.size(0)
    num_tokens = len(tokens)
    
    trellis = torch.zeros((num_frame, num_tokens))
    trellis[1:, 0] = torch.cumsum(emission[1:, blank_id], 0)
    trellis[0, 1:] = -float("inf")
    trellis[-num_tokens + 1:, 0] = float("inf")

    for t in range(num_frame - 1):
        trellis[t + 1, 1:] = torch.maximum(
            trellis[t, 1:] + emission[t, blank_id],  # Stay at same token
            trellis[t, :-1] + get_wildcard_emission(emission[t], tokens[1:], blank_id),  # Change token
        )
    return trellis
```

2. **Beam Search Backtracking** (Robustness):
```python
def backtrack_beam(trellis, emission, tokens, blank_id=0, beam_width=5):
    """Standard CTC beam search backtracking implementation.
    
    Returns:
        List[Point]: the best path
    """
    # Uses beam_width=2 by default for efficiency
```

3. **Wildcard Handling** for OOV characters:
```python
def get_wildcard_emission(frame_emission, tokens, blank_id):
    """Handles tokens not in alignment model dictionary"""
    wildcard_mask = (tokens == -1)
    max_valid_score = frame_emission.clone()
    max_valid_score[blank_id] = float('-inf')
    max_valid_score = max_valid_score.max()
    result = torch.where(wildcard_mask, max_valid_score, regular_scores)
    return result
```

**Language Support:**
```python
DEFAULT_ALIGN_MODELS_TORCH = {
    "en": "WAV2VEC2_ASR_BASE_960H",
    "fr": "VOXPOPULI_ASR_BASE_10K_FR",
    "de": "VOXPOPULI_ASR_BASE_10K_DE",
    "es": "VOXPOPULI_ASR_BASE_10K_ES",
    "it": "VOXPOPULI_ASR_BASE_10K_IT",
}

DEFAULT_ALIGN_MODELS_HF = {
    "ja": "jonatasgrosman/wav2vec2-large-xlsr-53-japanese",
    "zh": "jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn",
    # ... 30+ more languages
}
```

---

### 1.2 Aeneas Forced Alignment

**Location:** `vendor/Viral-Faceless-Shorts-Generator/speechalign/app.py`

**Algorithm:** MFCC-based DTW alignment via Aeneas library

```python
@app.route('/align', methods=['POST'])
def align_audio_text():
    # Aeneas command-line integration
    command = [
        "python3", "-m", "aeneas.tools.execute_task",
        audio_file.name, text_file.name,
        "task_language=eng|os_task_file_format=srt|is_text_type=plain|alignment_type=word|task_file_format=subtitle",
        srt_file.name
    ]
    subprocess.run(command, check=True)
```

**Text Pre-processing:**
```python
def smart_split(text):
    """Splits text into ~6 word segments for better alignment"""
    # Step 1: split by major separators
    for sep in [". ", ", ", "; ", ": "]:
        # Split and preserve separator
    
    # Step 2: split large chunks into ~6 word segments
    def split_chunk(chunk, avg_words=6):
        if len(words) <= avg_words:
            return [chunk]
        # Recursively split until target size
```

**Limitations:**
- Requires Docker container
- Slower than WhisperX for long content
- Limited to supported Aeneas languages

---

### 1.3 whisper-timestamped (DTW-based)

**Location:** Used by `vendor/viralfactory` and `vendor/ShortGPT`

**Algorithm:** DTW alignment on Whisper cross-attention weights

```python
# From vendor/viralfactory/src/engines/TranscriptionEngine/WhisperTranscriptionEngine.py
import whisper_timestamped as wt

def transcribe(self, path: str, fast: bool = False, words=False):
    device = "cuda" if is_available() else "cpu"
    audio = wt.load_audio(path)
    model = wt.load_model("large-v3" if not fast else "base", device=device)
    result = wt.transcribe(model=model, audio=audio, vad=avoid_hallucinations)
    
    if words:
        results = [word for chunk in result["segments"] for word in chunk["words"]]
        for result in results:
            del result["confidence"]  # Remove confidence scores
        return results
```

**Dependencies (from pdm.lock):**
```
name = "dtw-python"
summary = "A comprehensive implementation of dynamic time warping (DTW) algorithms."
```

---

### 1.4 Remotion/whisper.cpp (Token-Level)

**Location:** `vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts`

**Algorithm:** whisper.cpp token-level timestamps

```typescript
async CreateCaption(audioPath: string): Promise<Caption[]> {
    const { transcription } = await transcribe({
      model: this.config.whisperModel,
      whisperPath: this.config.whisperInstallPath,
      tokenLevelTimestamps: true,  // Key setting
      // ...
    });
    
    // Token merging logic for word-level output
    transcription.forEach((record) => {
      record.tokens.forEach((token) => {
        if (token.text.startsWith("[_TT")) {
          return;  // Skip timing tokens
        }
        // Merge tokens without spaces
        if (captions.length > 0 && !token.text.startsWith(" ") 
            && !captions[captions.length - 1].text.endsWith(" ")) {
          captions[captions.length - 1].text += record.text;
          captions[captions.length - 1].endMs = record.offsets.to;
          return;
        }
        captions.push({
          text: token.text,
          startMs: record.offsets.from,
          endMs: record.offsets.to,
        });
      });
    });
}
```

---

## 2. Accuracy & Performance Metrics

### 2.1 WhisperX Performance

| Metric | Value | Source |
|--------|-------|--------|
| **Realtime Factor** | 70x (large-v2) | README |
| **GPU Memory** | <8GB (large-v2, beam_size=5) | README |
| **WER Impact** | No degradation with VAD | Paper |
| **Competition** | 1st place Ego4d challenge | eval.ai |

**Accuracy Notes:**
- Word timestamps derived from wav2vec2 frame alignment
- Confidence scores provided per-word (0.0-1.0)
- Character-level alignment available via `return_char_alignments=True`

### 2.2 Alignment Failure Handling

**WhisperX Failure Cases (from alignment.py):**

```python
# Case 1: No valid characters in model dictionary
if len(segment_data[sdx]["clean_char"]) == 0:
    logger.warning(f'Failed to align segment ("{segment["text"]}"): '
                   'no characters in this segment found in model dictionary, '
                   'resorting to original')
    aligned_segments.append(aligned_seg)
    continue

# Case 2: Segment exceeds audio duration
if t1 >= MAX_DURATION:
    logger.warning(f'Failed to align segment ("{segment["text"]}"): '
                   'original start time longer than audio duration, skipping')
    aligned_segments.append(aligned_seg)
    continue

# Case 3: Backtrack path not found
path = backtrack_beam(trellis, emission, tokens, blank_id, beam_width=2)
if path is None:
    logger.warning(f'Failed to align segment ("{segment["text"]}"): '
                   'backtrack failed, resorting to original')
    aligned_segments.append(aligned_seg)
    continue
```

**Interpolation for Missing Timestamps:**
```python
# Handles NaN timestamps via interpolation
aligned_subsegments["start"] = interpolate_nans(
    aligned_subsegments["start"], 
    method=interpolate_method  # Default: "nearest"
)
aligned_subsegments["end"] = interpolate_nans(
    aligned_subsegments["end"], 
    method=interpolate_method
)
```

### 2.3 Comparative Processing Times

| Approach | Relative Speed | Notes |
|----------|----------------|-------|
| WhisperX (GPU) | **Fastest** | 70x realtime, batched |
| whisper.cpp | Fast | CPU-optimized, single-file |
| whisper-timestamped | Medium | DTW overhead |
| Aeneas | Slow | External process, MFCC |

---

## 3. Schema & Data Structures

### 3.1 WhisperX Output Schema

```python
# vendor/captions/whisperx/whisperx/schema.py

class SingleWordSegment(TypedDict):
    """A single word of a speech."""
    word: str
    start: float   # seconds
    end: float     # seconds
    score: float   # confidence 0.0-1.0

class SingleCharSegment(TypedDict):
    """A single char of a speech."""
    char: str
    start: float
    end: float
    score: float

class SingleAlignedSegment(TypedDict):
    """A single segment with word alignment."""
    start: float
    end: float
    text: str
    words: List[SingleWordSegment]
    chars: Optional[List[SingleCharSegment]]

class AlignedTranscriptionResult(TypedDict):
    """Complete aligned transcription."""
    segments: List[SingleAlignedSegment]
    word_segments: List[SingleWordSegment]
```

### 3.2 Captacity Segment Format

```python
# vendor/captacity/captacity/segment_parser.py

caption = {
    "start": float,    # seconds
    "end": float,      # seconds
    "words": [
        {"word": str, "start": float, "end": float},
        ...
    ],
    "text": str,       # full caption text
}
```

---

## 4. Character-Level vs Word-Level Alignment

### 4.1 WhisperX Character-Level

```python
# Enable character alignments
result = whisperx.align(
    result["segments"], 
    model_a, 
    metadata, 
    audio, 
    device, 
    return_char_alignments=True  # <-- Key parameter
)

# Output includes:
{
    "chars": [
        {"char": "H", "start": 0.1, "end": 0.12, "score": 0.95},
        {"char": "e", "start": 0.12, "end": 0.14, "score": 0.92},
        # ...
    ]
}
```

### 4.2 Use Cases

| Level | Use Case | Accuracy |
|-------|----------|----------|
| **Word** | Standard captions, highlighting | High |
| **Character** | Karaoke-style, character animation | Very High |
| **Segment** | Basic subtitles | Medium |

---

## 5. Montreal Forced Aligner (MFA) Patterns

**Status:** Not directly vendored, but Aeneas provides similar functionality.

**MFA Approach (Reference):**
1. Acoustic model + pronunciation dictionary
2. HMM-based alignment
3. Phoneme-to-audio mapping

**Aeneas Equivalent:**
```python
# task_language=eng: Uses English acoustic model
# alignment_type=word: Word-level boundaries
# is_text_type=plain: Plain text input (vs subtitle format)
```

---

## 6. Recommendations

### 6.1 Primary: WhisperX for Production

```python
import whisperx
import gc

device = "cuda"
compute_type = "float16"  # Use "int8" for lower memory

# 1. Transcribe (batched, fast)
model = whisperx.load_model("large-v2", device, compute_type=compute_type)
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=16)

# 2. Align (wav2vec2-based)
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"], 
    device=device
)
result = whisperx.align(
    result["segments"], 
    model_a, 
    metadata, 
    audio, 
    device,
    return_char_alignments=False  # Set True for karaoke
)

# 3. Cleanup
del model; del model_a
gc.collect()
torch.cuda.empty_cache()
```

### 6.2 Alternative: whisper.cpp for Edge Deployment

```typescript
// From short-video-maker-gyori
const { transcription } = await transcribe({
    model: "small.en",
    whisperPath: whisperInstallPath,
    tokenLevelTimestamps: true,
    inputPath: audioPath,
});
```

### 6.3 Fallback: whisper-timestamped for Simple Integration

```python
import whisper_timestamped as wt

audio = wt.load_audio(path)
model = wt.load_model("base")
result = wt.transcribe(model, audio, vad=True)
words = [word for seg in result["segments"] for word in seg["words"]]
```

---

## 7. Error Handling Best Practices

### 7.1 Alignment Failure Recovery

```python
def align_with_fallback(segments, audio, device):
    try:
        model_a, metadata = whisperx.load_align_model("en", device)
        result = whisperx.align(segments, model_a, metadata, audio, device)
        return result
    except Exception as e:
        logger.warning(f"Alignment failed: {e}, using original timestamps")
        # Fallback: use Whisper's native timestamps
        return {"segments": segments, "word_segments": []}
```

### 7.2 OOV Character Handling

```python
# WhisperX handles this automatically via wildcard emissions
# Characters like "2014." or "£13.60" are assigned -1 token
# and get maximum non-blank probability during alignment
```

---

## 8. Performance Optimization

### 8.1 GPU Memory Reduction

```python
# From WhisperX README
whisperx path/to/audio.wav \
    --model large-v2 \
    --batch_size 4 \       # Reduce from default 16
    --compute_type int8    # Use int8 quantization
```

### 8.2 Batched Alignment (TODO in WhisperX)

```python
# From alignment.py line 248
# TODO: Probably can get some speedup gain with batched inference here
waveform_segment = audio[:, f1:f2]
```

---

## 9. Key Findings Summary

| Question | Answer |
|----------|--------|
| **WhisperX word timestamp accuracy?** | High (wav2vec2 frame-level alignment with confidence scores) |
| **Alignment failure handling?** | Graceful fallback to original timestamps with logging |
| **Processing time?** | WhisperX: 70x realtime (GPU), whisper.cpp: ~10x realtime (CPU) |
| **Best for TTS sync?** | WhisperX for accuracy, whisper.cpp for edge deployment |
| **Character-level available?** | Yes, via `return_char_alignments=True` in WhisperX |

---

## 10. Next Steps

1. **Benchmark** WhisperX vs whisper-timestamped on content-machine test audio
2. **Implement** alignment pipeline in `src/script/` module
3. **Define** Caption schema aligned with WhisperX output
4. **Create** fallback chain: WhisperX → whisper-timestamped → native Whisper

---

## References

- WhisperX Paper: https://arxiv.org/abs/2303.00747
- PyTorch Forced Alignment Tutorial: https://pytorch.org/tutorials/intermediate/forced_alignment_with_torchaudio_tutorial.html
- Aeneas: https://github.com/readbeyond/aeneas
- whisper-timestamped: https://github.com/linto-ai/whisper-timestamped
- Remotion Whisper: https://www.remotion.dev/docs/install-whisper-cpp
