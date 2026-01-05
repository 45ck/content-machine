# Layer 3 Category E: Captions & Transcription

**Date:** 2026-01-04  
**Synthesized From:** 5 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 2 - Video Production

---

## Category Summary

Caption systems convert speech to text with precise timing. Key requirements: **word-level timestamps**, **speaker diarization**, and **animated rendering**.

---

## ASR Engine Comparison

| Engine               | Speed     | Accuracy  | Word-Level    | Diarization | GPU?     |
| -------------------- | --------- | --------- | ------------- | ----------- | -------- |
| **WhisperX**         | 70x RT    | Excellent | Yes (aligned) | Yes         | Yes      |
| **faster-whisper**   | 4x faster | Excellent | Yes           | No          | Yes      |
| **Whisper.cpp**      | 10x RT    | Excellent | Yes           | No          | Optional |
| **Whisper (OpenAI)** | 1x RT     | Excellent | Yes           | No          | Yes      |
| **AssemblyAI**       | Fast      | Excellent | Yes           | Yes         | No (API) |

---

## Primary Choice: WhisperX

### Why WhisperX Wins

1. **70x faster** than OpenAI Whisper
2. **Word-level alignment** via forced alignment
3. **Speaker diarization** built-in
4. **Accurate timestamps** for captions

### Installation

```bash
pip install whisperx

# For GPU acceleration
pip install torch torchaudio --extra-index-url https://download.pytorch.org/whl/cu118
```

### Basic Usage

```python
import whisperx

# Load model
model = whisperx.load_model("large-v3", device="cuda")

# Transcribe
result = model.transcribe(audio_path, batch_size=16)

# Align for word-level timestamps
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device="cuda"
)
result = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    audio_path,
    device="cuda"
)

# Output format
# {
#   "segments": [
#     {
#       "start": 0.0,
#       "end": 2.5,
#       "text": "Hello world",
#       "words": [
#         {"word": "Hello", "start": 0.0, "end": 0.5},
#         {"word": "world", "start": 0.6, "end": 1.0}
#       ]
#     }
#   ]
# }
```

### Speaker Diarization

```python
import whisperx

# After transcription and alignment
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token="HF_TOKEN",
    device="cuda"
)

diarize_segments = diarize_model(audio_path)

# Assign speakers to words
result = whisperx.assign_word_speakers(diarize_segments, result)

# Output now includes speaker labels
# {"word": "Hello", "start": 0.0, "end": 0.5, "speaker": "SPEAKER_00"}
```

---

## Secondary Choice: faster-whisper

### When to Use

- Don't need diarization
- Lower VRAM available
- Simpler pipeline

### Usage

```python
from faster_whisper import WhisperModel

model = WhisperModel("large-v3", device="cuda", compute_type="float16")

segments, info = model.transcribe(audio_path, word_timestamps=True)

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
    for word in segment.words:
        print(f"  {word.word} ({word.start:.2f} - {word.end:.2f})")
```

---

## Caption Styling: Captacity

### Word Highlighting Patterns

```python
from captacity import Captions

captions = Captions(
    font="Bangers-Regular.ttf",
    font_size=130,
    font_color="yellow",
    stroke_width=3,
    stroke_color="black",
    highlight_current_word=True,
    word_highlight_color="red"
)

# Apply to video
captions.apply(video_path, transcript, output_path)
```

### Style Options

| Option                   | Values            |
| ------------------------ | ----------------- |
| `font`                   | Any TTF/OTF       |
| `font_size`              | 40-200            |
| `font_color`             | Hex or name       |
| `stroke_width`           | 0-10              |
| `highlight_current_word` | true/false        |
| `line_count`             | 1-3               |
| `position`               | top/center/bottom |

---

## Caption Rendering: remotion-subtitles

### 17 Animation Styles

```typescript
import { Caption } from 'remotion-subtitles';

// Parse SRT
const captions = parseSRT(srtContent);

// Render with style
export const CaptionOverlay = () => (
  <Caption
    captions={captions}
    style="bounce"  // Animation style
    config={{
      fontSize: 80,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      highlightColor: '#ff0000',
      position: 'bottom'
    }}
  />
);
```

### Available Styles

| Style          | Description            |
| -------------- | ---------------------- |
| `bounce`       | Words bounce in        |
| `typewriter`   | Character by character |
| `fade`         | Fade in/out            |
| `slide`        | Slide from side        |
| `word-by-word` | Each word appears      |
| `karaoke`      | Highlight current      |
| `pop`          | Scale animation        |
| `glow`         | Glow effect            |
| `outline`      | Animated outline       |
| `shadow`       | Shadow grows           |
| `split`        | Split animation        |
| `stack`        | Stack words            |
| `wave`         | Wave effect            |
| `zoom`         | Zoom in                |
| `spin`         | Rotation               |
| `shake`        | Shake effect           |
| `pulse`        | Pulse animation        |

---

## SRT/VTT Generation

### Generate SRT from WhisperX

```python
def generate_srt(result, output_path):
    with open(output_path, 'w') as f:
        for i, segment in enumerate(result['segments'], 1):
            start = format_timestamp(segment['start'])
            end = format_timestamp(segment['end'])
            text = segment['text'].strip()

            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")

def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
```

### Word-Level SRT (for karaoke)

```python
def generate_word_srt(result, output_path):
    counter = 1
    with open(output_path, 'w') as f:
        for segment in result['segments']:
            for word in segment['words']:
                start = format_timestamp(word['start'])
                end = format_timestamp(word['end'])

                f.write(f"{counter}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{word['word']}\n\n")
                counter += 1
```

---

## Forced Alignment: Wav2Vec2

### When WhisperX Isn't Available

```python
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
import torch

# Load model
processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h")

# Get emissions
inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
with torch.no_grad():
    logits = model(inputs.input_values).logits

# Use Viterbi decoding for alignment
# (Implementation from OBrainRot pattern)
```

---

## Multi-Language Support

### EdgeTTS + WhisperX Pipeline

```python
# 1. Generate speech in any language
import edge_tts

async def generate_multilingual_speech(text, language):
    voices = {
        'en': 'en-US-GuyNeural',
        'es': 'es-ES-AlvaroNeural',
        'fr': 'fr-FR-DeniseNeural',
        'de': 'de-DE-ConradNeural',
        'ja': 'ja-JP-NanamiNeural',
        'zh': 'zh-CN-XiaoxiaoNeural'
    }

    communicate = edge_tts.Communicate(text, voices[language])
    await communicate.save(f"speech_{language}.mp3")

# 2. Transcribe (WhisperX detects language)
result = whisperx_model.transcribe(audio_path)
# Returns {"language": "es", "segments": [...]}

# 3. Align
result = whisperx.align(result["segments"], model_a, metadata, audio_path)
```

---

## Integration Pattern for content-machine

### Caption Pipeline

```typescript
// caption-pipeline.ts
import { WhisperX } from './asr/whisperx';
import { Caption } from 'remotion-subtitles';

interface CaptionPipeline {
  // 1. Transcribe audio
  transcribe(audioPath: string): Promise<Transcript>;

  // 2. Align words
  align(transcript: Transcript, audioPath: string): Promise<AlignedTranscript>;

  // 3. Generate SRT
  generateSRT(aligned: AlignedTranscript): string;

  // 4. Render captions
  render(srt: string, style: CaptionStyle): ReactElement;
}

// Implementation
async function processCaptions(audioPath: string, style: CaptionStyle) {
  // Python service for WhisperX
  const transcript = await whisperxService.transcribe(audioPath);
  const aligned = await whisperxService.align(transcript, audioPath);
  const srt = generateSRT(aligned);

  // Remotion for rendering
  return <Caption captions={parseSRT(srt)} style={style} />;
}
```

### API Design

```typescript
// /api/captions endpoint
app.post('/api/captions', async (req, res) => {
  const { audioPath, style, language } = req.body;

  // Process
  const result = await captionPipeline.process({
    audioPath,
    style: style || 'bounce',
    language: language || 'auto',
  });

  res.json({
    srt: result.srt,
    words: result.words,
    duration: result.duration,
  });
});
```

---

## Quality Optimization

### Accuracy Tips

1. **Use large-v3 model** for best accuracy
2. **Provide language hint** if known
3. **Clean audio** - remove background noise
4. **Chunk long audio** - process in segments

### Performance Tips

1. **GPU acceleration** - 10-70x faster
2. **Batch processing** - multiple files
3. **Cache models** - don't reload per request
4. **Use faster-whisper** for simpler needs

---

## Source Documents

- DD-55: Audio + TTS + captions + publishing
- DD-59: Research + schemas + captions
- captacity-DEEP
- whisperx-DEEP
- agents-schema-captions-DEEP

---

## Key Takeaway

> **WhisperX is the best choice: 70x realtime, word-level alignment, speaker diarization. For rendering, use remotion-subtitles with its 17 animation styles. Captacity provides Python-based styling if needed.**
