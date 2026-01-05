# Deep Dive: WhisperX - Accurate Word-Level Timestamps

**Date:** 2026-01-02  
**Repo:** `vendor/captions/whisperx/`  
**Priority:** ⭐ CRITICAL - Caption Timing Accuracy

---

## Executive Summary

**WhisperX** provides 70x faster-than-realtime transcription with accurate word-level timestamps using wav2vec2 alignment. This is superior to standard Whisper for caption generation because it provides precise word timing through forced phoneme alignment.

### Why This Matters

- ✅ **Accurate word timestamps** - Via wav2vec2 alignment (vs. Whisper's segment-level)
- ✅ **70x realtime speed** - Batched inference with faster-whisper
- ✅ **Speaker diarization** - Who said what (via pyannote-audio)
- ✅ **VAD preprocessing** - Reduces hallucinations
- ✅ **Multi-language** - Automatic alignment model selection
- ⚠️ **Python-only** - Need to call as subprocess or service

---

## Architecture

```
WhisperX Pipeline:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Audio ─► VAD ─► Whisper ─► wav2vec2 ─► Diarization ─► Output  │
│           │       (ASR)      (Align)     (Optional)             │
│           │                                                     │
│    ┌──────┴──────┐                                              │
│    │ Voice       │                                              │
│    │ Activity    │                                              │
│    │ Detection   │                                              │
│    └─────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **VAD (Voice Activity Detection)** - Silero/pyannote VAD
2. **ASR (Speech Recognition)** - faster-whisper (CTranslate2 backend)
3. **Alignment** - wav2vec2 phoneme-based alignment
4. **Diarization** - pyannote-audio speaker segmentation

---

## Python API

```python
import whisperx
import gc

device = "cuda"
audio_file = "audio.mp3"
batch_size = 16
compute_type = "float16"

# 1. Transcribe with Whisper (batched)
model = whisperx.load_model("large-v2", device, compute_type=compute_type)
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=batch_size)
print(result["segments"])  # Before alignment

# 2. Align with wav2vec2
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
    return_char_alignments=False
)
print(result["segments"])  # After alignment - now with word timestamps!

# 3. Optional: Speaker diarization
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token=YOUR_HF_TOKEN,
    device=device
)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
print(result["segments"])  # Now with speaker IDs
```

---

## Output Format

### Before Alignment (Standard Whisper)

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "text": " Welcome to our video about content creation"
    }
  ]
}
```

### After WhisperX Alignment

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "text": " Welcome to our video about content creation",
      "words": [
        { "word": "Welcome", "start": 0.08, "end": 0.52, "score": 0.95 },
        { "word": "to", "start": 0.52, "end": 0.64, "score": 0.98 },
        { "word": "our", "start": 0.64, "end": 0.8, "score": 0.92 },
        { "word": "video", "start": 0.8, "end": 1.24, "score": 0.96 },
        { "word": "about", "start": 1.24, "end": 1.56, "score": 0.94 },
        { "word": "content", "start": 1.56, "end": 2.04, "score": 0.91 },
        { "word": "creation", "start": 2.04, "end": 2.72, "score": 0.93 }
      ]
    }
  ]
}
```

### With Speaker Diarization

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "text": " Welcome to our video",
      "speaker": "SPEAKER_00",
      "words": [
        { "word": "Welcome", "start": 0.08, "end": 0.52, "speaker": "SPEAKER_00" }
        // ...
      ]
    }
  ]
}
```

---

## CLI Usage

```bash
# Basic transcription with alignment
whisperx audio.wav

# With word highlighting in subtitles
whisperx audio.wav --highlight_words True

# Larger model for better accuracy
whisperx audio.wav --model large-v2

# With speaker diarization
whisperx audio.wav --model large-v2 --diarize --highlight_words True

# Specific language
whisperx audio.wav --language de --model large-v2

# CPU mode (for Mac or no GPU)
whisperx audio.wav --compute_type int8 --device cpu
```

---

## Alignment Models

WhisperX automatically selects language-specific wav2vec2 models:

### Built-in Languages (via torchaudio)

- English (`en`)
- French (`fr`)
- German (`de`)
- Spanish (`es`)
- Italian (`it`)

### HuggingFace Models (extended)

Many more languages supported via HuggingFace models. The system automatically downloads the appropriate model for detected/specified language.

---

## Integration Strategy

### Option 1: Python Subprocess

```typescript
// src/captions/whisperx.ts
import { spawn } from 'child_process';
import { z } from 'zod';

const WhisperXWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  score: z.number().optional(),
  speaker: z.string().optional(),
});

const WhisperXSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  speaker: z.string().optional(),
  words: z.array(WhisperXWordSchema).optional(),
});

export interface WhisperXOptions {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large-v2' | 'large-v3';
  language?: string;
  device?: 'cuda' | 'cpu';
  computeType?: 'float16' | 'float32' | 'int8';
  diarize?: boolean;
  batchSize?: number;
}

export async function transcribeWithWhisperX(
  audioPath: string,
  options: WhisperXOptions = {}
): Promise<WhisperXResult> {
  const args = [
    audioPath,
    '--model',
    options.model || 'base',
    '--device',
    options.device || 'cuda',
    '--compute_type',
    options.computeType || 'float16',
    '--output_format',
    'json',
    '--output_dir',
    '/tmp/whisperx',
  ];

  if (options.language) args.push('--language', options.language);
  if (options.diarize) args.push('--diarize');
  if (options.batchSize) args.push('--batch_size', options.batchSize.toString());

  return new Promise((resolve, reject) => {
    const proc = spawn('whisperx', args);
    // Handle output...
  });
}
```

### Option 2: Python Service (MCP)

```typescript
// src/mcp/whisperx-server.ts
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

const server = new FastMCP({
  name: 'WhisperX Transcription Server',
  version: '1.0.0',
});

server.addTool({
  name: 'transcribe',
  description: 'Transcribe audio with word-level timestamps',
  parameters: z.object({
    audioPath: z.string(),
    model: z.string().default('base'),
    language: z.string().optional(),
    diarize: z.boolean().default(false),
  }),
  execute: async (args) => {
    // Call Python whisperx
    const result = await runWhisperX(args);
    return JSON.stringify(result);
  },
});
```

### Option 3: REST API Wrapper

```python
# scripts/whisperx_server.py
from fastapi import FastAPI, UploadFile
import whisperx
import tempfile

app = FastAPI()

# Load models once at startup
model = whisperx.load_model("base", "cuda")
align_model, metadata = whisperx.load_align_model("en", "cuda")

@app.post("/transcribe")
async def transcribe(audio: UploadFile, language: str = "en"):
    # Save uploaded file
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        f.write(await audio.read())

        # Transcribe
        audio_data = whisperx.load_audio(f.name)
        result = model.transcribe(audio_data)

        # Align
        result = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio_data,
            "cuda"
        )

        return result
```

---

## Comparison: Whisper vs WhisperX

| Feature        | OpenAI Whisper | WhisperX                 |
| -------------- | -------------- | ------------------------ |
| Speed          | 1x realtime    | 70x realtime             |
| Timestamps     | Segment-level  | **Word-level**           |
| Accuracy       | Good           | **Better (alignment)**   |
| Hallucinations | Some           | **Reduced (VAD)**        |
| Speaker ID     | No             | **Yes (optional)**       |
| GPU Memory     | High           | **Lower** (int8 support) |

---

## Performance Tuning

### GPU Memory Reduction

```bash
# Smaller batch size
whisperx audio.wav --batch_size 4

# Smaller model
whisperx audio.wav --model base

# Lower precision
whisperx audio.wav --compute_type int8
```

### Speed vs Quality

| Setting                            | Speed | Quality    | GPU Memory |
| ---------------------------------- | ----- | ---------- | ---------- |
| `large-v2, float16, batch_size=16` | 70x   | Best       | ~8GB       |
| `base, float16, batch_size=8`      | 100x+ | Good       | ~2GB       |
| `base, int8, batch_size=4`         | 80x   | Good       | ~1GB       |
| `tiny, int8, batch_size=4`         | 120x+ | Acceptable | ~512MB     |

---

## Caption Pipeline Integration

```typescript
// src/captions/pipeline.ts
import { transcribeWithWhisperX } from './whisperx';
import { parseIntoCaptions } from './parser';
import { CaptionStyle } from '../schemas/caption';

export async function generateCaptions(audioPath: string, style: CaptionStyle): Promise<Caption[]> {
  // 1. Get word-level transcription
  const transcript = await transcribeWithWhisperX(audioPath, {
    model: 'base',
    language: 'en',
  });

  // 2. Group words into displayable captions
  const captions = parseIntoCaptions(transcript.segments, {
    maxLines: style.maxLines,
    maxWidth: style.maxWidth,
    font: style.font,
    fontSize: style.fontSize,
  });

  return captions;
}
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **Word-level timestamps** - Essential for caption highlighting
2. **Confidence scores** - Filter low-confidence words
3. **Speaker diarization** - Multi-speaker content

### Integration Pattern 🔧

1. Run WhisperX as a service or subprocess
2. Cache models to avoid reload overhead
3. Use appropriate model size for use case

---

## Lessons Learned

1. **Alignment is critical for captions** - Word-level timing enables highlighting
2. **VAD reduces hallucinations** - Important for clean transcripts
3. **Model size trade-off** - base is usually sufficient for captions
4. **GPU memory matters** - int8 enables smaller GPUs
5. **Confidence scores help** - Filter out uncertain words

---

**Status:** Research complete. WhisperX is essential for accurate captions.
