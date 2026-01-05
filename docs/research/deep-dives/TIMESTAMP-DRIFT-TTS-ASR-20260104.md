# Timestamp Drift Between TTS Generation and ASR Transcription

**Date:** 2026-01-04  
**Status:** Research Complete  
**Repos Analyzed:** MoneyPrinterTurbo, short-video-maker-gyori, whisperx, auto-subtitle

---

## Executive Summary

Timestamp drift between TTS-generated audio and ASR-extracted word boundaries is a **common problem** that these repos handle through several strategies:

1. **Text-based alignment correction** (MoneyPrinterTurbo) - Match ASR output to original TTS input using Levenshtein distance
2. **Forced phoneme alignment** (WhisperX) - Use wav2vec2 models to get precise word-level timestamps
3. **NaN interpolation** (WhisperX) - Fill gaps in word timestamps using interpolation
4. **Proportional duration estimation** (MoneyPrinterTurbo/SiliconFlow) - Distribute timestamps proportionally by character count
5. **Token merging** (short-video-maker-gyori) - Merge adjacent tokens without spaces

---

## Problem Statement

When generating captions for TTS audio:

```
TTS Input Text: "Hello world. This is a test."
TTS Audio Duration: 3.5 seconds

ASR Transcription: "Hello world this is a test"  // Missing punctuation
ASR Word Count: 6 words
ASR Total Duration: 3.2 seconds  // Drift!
```

**Key Issues:**

- ASR may find fewer/more words than TTS input
- Word boundaries from ASR don't sum to actual audio duration
- Punctuation timing is undefined (ASR ignores it)
- Silence gaps between sentences are unaccounted for

---

## Pattern 1: Text-Based Alignment Correction (MoneyPrinterTurbo)

**Location:** [vendor/MoneyPrinterTurbo/app/services/subtitle.py](../../../vendor/MoneyPrinterTurbo/app/services/subtitle.py)

This approach uses **Levenshtein distance** to match ASR output against the original TTS script and correct mismatches:

```python
def levenshtein_distance(s1, s2):
    """Calculate edit distance between two strings"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def similarity(a, b):
    """Calculate similarity ratio between two strings (0.0 - 1.0)"""
    distance = levenshtein_distance(a.lower(), b.lower())
    max_length = max(len(a), len(b))
    return 1 - (distance / max_length)
```

### Correction Algorithm

```python
def correct(subtitle_file, video_script):
    """Correct ASR subtitles to match original TTS script"""
    subtitle_items = file_to_subtitles(subtitle_file)
    script_lines = utils.split_string_by_punctuations(video_script)

    corrected = False
    new_subtitle_items = []
    script_index = 0
    subtitle_index = 0

    while script_index < len(script_lines) and subtitle_index < len(subtitle_items):
        script_line = script_lines[script_index].strip()
        subtitle_line = subtitle_items[subtitle_index][2].strip()

        if script_line == subtitle_line:
            # Perfect match - use ASR timing as-is
            new_subtitle_items.append(subtitle_items[subtitle_index])
            script_index += 1
            subtitle_index += 1
        else:
            # Mismatch - try merging multiple ASR segments
            combined_subtitle = subtitle_line
            start_time = subtitle_items[subtitle_index][1].split(" --> ")[0]
            end_time = subtitle_items[subtitle_index][1].split(" --> ")[1]
            next_subtitle_index = subtitle_index + 1

            # Keep merging while similarity improves
            while next_subtitle_index < len(subtitle_items):
                next_subtitle = subtitle_items[next_subtitle_index][2].strip()
                if similarity(
                    script_line, combined_subtitle + " " + next_subtitle
                ) > similarity(script_line, combined_subtitle):
                    combined_subtitle += " " + next_subtitle
                    end_time = subtitle_items[next_subtitle_index][1].split(" --> ")[1]
                    next_subtitle_index += 1
                else:
                    break

            # Accept if similarity > 80%
            if similarity(script_line, combined_subtitle) > 0.8:
                logger.warning(
                    f"Merged/Corrected - Script: {script_line}, Subtitle: {combined_subtitle}"
                )
                new_subtitle_items.append((
                    len(new_subtitle_items) + 1,
                    f"{start_time} --> {end_time}",
                    script_line,  # Use ORIGINAL script text, not ASR
                ))
                corrected = True
            # ... handle remaining cases
```

**Key Insight:** This replaces ASR text with original TTS text but keeps ASR timestamps. This ensures displayed text matches what was spoken.

---

## Pattern 2: Proportional Duration Estimation (MoneyPrinterTurbo/SiliconFlow)

**Location:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L570-L610)

When TTS doesn't provide word-level timestamps (e.g., SiliconFlow API), estimate by character ratio:

```python
def siliconflow_tts(text, model, voice, voice_rate, voice_file, voice_volume=1.0):
    """TTS without word-level timing - estimate from character count"""

    # ... audio generation ...

    # Get actual audio duration from file
    audio_clip = AudioFileClip(voice_file)
    audio_duration = audio_clip.duration
    audio_clip.close()

    # Convert to 100-nanosecond units (edge_tts format)
    audio_duration_100ns = int(audio_duration * 10000000)

    # Split text by punctuation to get sentence boundaries
    sentences = utils.split_string_by_punctuations(text)

    if sentences:
        # Calculate duration per character
        total_chars = sum(len(s) for s in sentences)
        char_duration = audio_duration_100ns / total_chars if total_chars > 0 else 0

        current_offset = 0
        for sentence in sentences:
            if not sentence.strip():
                continue

            # Proportional duration based on character count
            sentence_chars = len(sentence)
            sentence_duration = int(sentence_chars * char_duration)

            sub_maker.subs.append(sentence)
            sub_maker.offset.append((current_offset, current_offset + sentence_duration))

            current_offset += sentence_duration
```

**Key Insight:** When no word boundaries are available, distribute time proportionally by character count. This works well for consistent-speed TTS but can drift with variable prosody.

---

## Pattern 3: Forced Phoneme Alignment (WhisperX)

**Location:** [vendor/captions/whisperx/whisperx/alignment.py](../../../vendor/captions/whisperx/whisperx/alignment.py)

WhisperX uses **wav2vec2 forced alignment** to get precise word-level timestamps:

```python
def align(
    transcript: Iterable[SingleSegment],
    model: torch.nn.Module,
    align_model_metadata: dict,
    audio: Union[str, np.ndarray, torch.Tensor],
    device: str,
    interpolate_method: str = "nearest",
    return_char_alignments: bool = False,
) -> AlignedTranscriptionResult:
    """
    Align phoneme recognition predictions to known transcription.
    """

    # For each segment from ASR...
    for sdx, segment in enumerate(transcript):
        t1 = segment["start"]
        t2 = segment["end"]
        text = segment["text"]

        # Extract audio for this segment
        f1 = int(t1 * SAMPLE_RATE)
        f2 = int(t2 * SAMPLE_RATE)
        waveform_segment = audio[:, f1:f2]

        # Run wav2vec2 to get emission probabilities
        with torch.inference_mode():
            emissions = model(waveform_segment.to(device))
            emissions = torch.log_softmax(emissions, dim=-1)

        # Build trellis for alignment
        trellis = get_trellis(emissions[0], tokens, blank_id)

        # Backtrack to find optimal alignment path
        path = backtrack_beam(trellis, emissions[0], tokens, blank_id, beam_width=2)

        # Merge repeated characters into words
        char_segments = merge_repeats(path, text_clean)

        # Calculate ratio for timestamp conversion
        duration = t2 - t1
        ratio = duration * waveform_segment.size(0) / (trellis.size(0) - 1)

        # Assign precise timestamps to each character
        for cdx, char in enumerate(text):
            if cdx in segment_data[sdx]["clean_cdx"]:
                char_seg = char_segments[segment_data[sdx]["clean_cdx"].index(cdx)]
                start = round(char_seg.start * ratio + t1, 3)
                end = round(char_seg.end * ratio + t1, 3)
```

**Key Insight:** Forced alignment uses the known transcript text and aligns it to audio using phoneme recognition, giving much more accurate word boundaries than ASR alone.

---

## Pattern 4: NaN Interpolation for Missing Timestamps

**Location:** [vendor/captions/whisperx/whisperx/utils.py](../../../vendor/captions/whisperx/whisperx/utils.py#L396-L400)

When some words can't be aligned (e.g., not in model vocabulary), interpolate:

```python
def interpolate_nans(x, method='nearest'):
    """Fill NaN timestamps by interpolating from nearby valid values"""
    if x.notnull().sum() > 1:
        return x.interpolate(method=method).ffill().bfill()
    else:
        return x.ffill().bfill()
```

**Usage in alignment:**

```python
# After alignment, some words may have NaN timestamps
aligned_subsegments = pd.DataFrame(aligned_subsegments)

# Interpolate missing start/end times
aligned_subsegments["start"] = interpolate_nans(
    aligned_subsegments["start"],
    method=interpolate_method  # "nearest" by default
)
aligned_subsegments["end"] = interpolate_nans(
    aligned_subsegments["end"],
    method=interpolate_method
)
```

**Key Insight:** When alignment fails for specific words, estimate their timing from neighboring successfully-aligned words.

---

## Pattern 5: Token Merging for Adjacent Words

**Location:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts)

Merge tokens that don't have space boundaries:

```typescript
async CreateCaption(audioPath: string): Promise<Caption[]> {
    const { transcription } = await transcribe({
        model: this.config.whisperModel,
        whisperPath: this.config.whisperInstallPath,
        inputPath: audioPath,
        tokenLevelTimestamps: true,  // Get token-level timing
    });

    const captions: Caption[] = [];
    transcription.forEach((record) => {
        if (record.text === "") return;

        record.tokens.forEach((token) => {
            // Skip special tokens
            if (token.text.startsWith("[_TT")) return;

            // MERGE: If token doesn't start with space and previous
            // token didn't end with space, merge them
            if (
                captions.length > 0 &&
                !token.text.startsWith(" ") &&
                !captions[captions.length - 1].text.endsWith(" ")
            ) {
                // Extend previous caption instead of creating new one
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
    return captions;
}
```

**Key Insight:** Token-level transcription often splits words. Merge tokens without leading spaces to reconstruct whole words.

---

## Pattern 6: Punctuation-Based Sentence Segmentation

**Location:** [vendor/MoneyPrinterTurbo/app/services/subtitle.py](../../../vendor/MoneyPrinterTurbo/app/services/subtitle.py#L83-L116)

Handle punctuation timing by breaking at punctuation marks:

```python
for segment in segments:
    words_idx = 0
    words_len = len(segment.words)
    seg_start = 0
    seg_end = 0
    seg_text = ""

    if segment.words:
        is_segmented = False
        for word in segment.words:
            if not is_segmented:
                seg_start = word.start
                is_segmented = True

            seg_end = word.end
            seg_text += word.word

            # Break sentence at punctuation
            if utils.str_contains_punctuation(word.word):
                # Remove trailing punctuation for display
                seg_text = seg_text[:-1]
                if not seg_text:
                    continue

                recognized(seg_text, seg_start, seg_end)

                is_segmented = False
                seg_text = ""
```

**Punctuation list used:**

```python
PUNCTUATIONS = [
    ".", "。", "!", "！", "?", "？",
    ",", "，", ":", "：", ";", "；",
    "、", "…", "—", "–"
]
```

**Key Insight:** ASR often includes punctuation in word tokens. Use this to determine sentence boundaries for subtitle grouping.

---

## Pattern 7: Edge-TTS WordBoundary Events

**Location:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L1145-L1205)

Edge-TTS provides real-time word boundaries during synthesis:

```python
async def _do() -> SubMaker:
    communicate = edge_tts.Communicate(text, voice_name, rate=rate_str)
    sub_maker = edge_tts.SubMaker()
    with open(voice_file, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Edge-TTS provides offset and duration in 100ns units
                sub_maker.create_sub(
                    (chunk["offset"], chunk["duration"]),
                    chunk["text"]
                )
    return sub_maker
```

**Key Insight:** When using Edge-TTS, word boundaries come from the TTS engine itself - no ASR needed. This is the most accurate approach but only works with certain TTS providers.

---

## Pattern 8: Audio Normalization Before ASR

**Location:** [vendor/short-video-maker-gyori/src/short-creator/libraries/FFmpeg.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/FFmpeg.ts)

Normalize audio format before ASR to reduce timing errors:

```typescript
async saveNormalizedAudio(audio: ArrayBuffer, outputPath: string): Promise<string> {
    const inputStream = new Readable();
    inputStream.push(Buffer.from(audio));
    inputStream.push(null);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(inputStream)
            .audioCodec("pcm_s16le")    // 16-bit PCM
            .audioChannels(1)            // Mono
            .audioFrequency(16000)       // 16kHz (Whisper's expected rate)
            .toFormat("wav")
            .save(outputPath);
    });
}
```

**Key Insight:** Whisper expects 16kHz mono audio. Resampling and format conversion should happen before transcription to avoid timing drift from sample rate mismatches.

---

## Pattern 9: VAD-Based Segmentation (WhisperX)

**Location:** [vendor/captions/whisperx/whisperx/asr.py](../../../vendor/captions/whisperx/whisperx/asr.py#L207-L230)

Use Voice Activity Detection to segment audio before ASR:

```python
def transcribe(self, audio, batch_size=None, ...):
    # Pre-process with VAD
    vad_segments = self.vad_model({
        "waveform": waveform,
        "sample_rate": SAMPLE_RATE
    })

    # Merge small segments into larger chunks
    vad_segments = merge_chunks(
        vad_segments,
        chunk_size=30,  # Max 30s chunks
        onset=self._vad_params["vad_onset"],   # 0.500
        offset=self._vad_params["vad_offset"], # 0.363
    )

    # Transcribe each VAD segment
    for idx, out in enumerate(self.__call__(data(audio, vad_segments), ...)):
        segments.append({
            "text": text,
            "start": round(vad_segments[idx]['start'], 3),
            "end": round(vad_segments[idx]['end'], 3)
        })
```

**Key Insight:** VAD provides accurate speech/silence boundaries. This helps with:

- Detecting gaps between sentences
- Reducing hallucinations during silence
- Providing coarse timing before fine alignment

---

## Handling Word Count Mismatches

### When ASR Finds Fewer Words Than TTS Input

**Cause:** ASR may merge words (e.g., "can't" → "cant") or miss quiet words.

**MoneyPrinterTurbo Solution:**

```python
# Extra script lines not matched by ASR
while script_index < len(script_lines):
    logger.warning(f"Extra script line: {script_lines[script_index]}")
    if subtitle_index < len(subtitle_items):
        # Use next ASR timing for the extra script line
        new_subtitle_items.append((
            len(new_subtitle_items) + 1,
            subtitle_items[subtitle_index][1],  # ASR timing
            script_lines[script_index],          # Original script
        ))
        subtitle_index += 1
    else:
        # No more ASR segments - assign zero-duration timestamp
        new_subtitle_items.append((
            len(new_subtitle_items) + 1,
            "00:00:00,000 --> 00:00:00,000",
            script_lines[script_index],
        ))
    script_index += 1
```

### When ASR Finds More Words Than TTS Input

**Cause:** ASR may split contractions or hallucinate during silence.

**WhisperX Solution (VAD filtering):**

```python
# Use VAD to filter out silence before ASR
vad_parameters=dict(min_silence_duration_ms=500)
```

---

## Summary: Drift Handling Strategies

| Strategy                       | When to Use                  | Accuracy | Complexity |
| ------------------------------ | ---------------------------- | -------- | ---------- |
| **TTS WordBoundary events**    | Edge-TTS, Azure TTS          | Highest  | Low        |
| **Forced phoneme alignment**   | Post-ASR correction          | High     | High       |
| **Text similarity matching**   | Match ASR to known script    | Medium   | Medium     |
| **Character-ratio estimation** | No word boundaries available | Low      | Low        |
| **Token merging**              | Token-level ASR output       | Medium   | Low        |
| **NaN interpolation**          | Fill alignment gaps          | Medium   | Low        |
| **VAD pre-segmentation**       | Reduce hallucinations        | N/A      | Medium     |

---

## Recommendations for content-machine

1. **Prefer TTS with word boundaries** - Use Edge-TTS or Azure TTS which provide real-time word timing
2. **Use WhisperX over vanilla Whisper** - Forced alignment gives better word-level timestamps
3. **Always keep original script** - Display original TTS text, use ASR only for timing
4. **Implement similarity matching** - Levenshtein-based correction handles ASR errors gracefully
5. **Normalize audio before ASR** - 16kHz mono PCM reduces timing drift
6. **Use VAD for coarse segmentation** - Better gap handling between sentences
7. **Interpolate NaN timestamps** - Handle alignment failures gracefully

---

## Related Files

- [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py) - TTS + subtitle creation
- [vendor/MoneyPrinterTurbo/app/services/subtitle.py](../../../vendor/MoneyPrinterTurbo/app/services/subtitle.py) - ASR + correction
- [vendor/captions/whisperx/whisperx/alignment.py](../../../vendor/captions/whisperx/whisperx/alignment.py) - Forced alignment
- [vendor/captions/whisperx/whisperx/utils.py](../../../vendor/captions/whisperx/whisperx/utils.py) - Interpolation utils
- [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts) - Token merging
