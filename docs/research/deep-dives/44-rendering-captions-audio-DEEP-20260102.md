# Rendering, Captions & Audio Infrastructure - DEEP DIVE #44

**Created:** 2026-01-02
**Category:** Core Pipeline Analysis
**Repos Analyzed:** 9 (Rendering: 5, Captions: 4, Audio/TTS: 2)
**Status:** ✅ Complete

---

## Executive Summary

This deep dive analyzes the core creative pipeline for content-machine:

1. **Video Rendering** (5 repos): Remotion, Mosaico, JSON2Video, remotion-subtitles, remotion-templates
2. **Captions/ASR** (4 repos): WhisperX, Whisper, auto-subtitle-generator, video-subtitles-generator
3. **Text-to-Speech** (2 repos): Kokoro, Kokoro-FastAPI

**Key Finding:** These tools form the "creative core" of the content-machine pipeline - generating voiceovers (TTS), transcribing for captions (ASR), and assembling final videos (rendering).

---

## Part 1: Video Rendering Infrastructure

### 1.1 Rendering Tool Comparison

| Tool                   | Language         | Approach         | License         | Key Feature          |
| ---------------------- | ---------------- | ---------------- | --------------- | -------------------- |
| **Remotion**           | React/TypeScript | React components | Company License | Programmatic video   |
| **Mosaico**            | Python           | MoviePy-based    | MIT             | AI script generation |
| **JSON2Video**         | API              | JSON config      | Commercial      | Cloud rendering      |
| **remotion-subtitles** | TypeScript       | Remotion plugin  | MIT             | 17 caption templates |

### 1.2 Remotion (React Video) ⭐ RECOMMENDED

**Repository:** `vendor/render/remotion/`
**License:** Company License (review before commercial use)
**Framework:** React + TypeScript

#### Why Remotion for content-machine:

- **React-based** - Leverage web technologies
- **Programmatic** - Use APIs, variables, algorithms
- **Component reuse** - Build video component library
- **Package ecosystem** - Use any npm package

#### ⚠️ License Warning:

Remotion requires a company license for commercial use. Review the license terms before production deployment.

#### Code Pattern:

```tsx
// Video component
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';

export const ProductDemo: React.FC<{
  productUrl: string;
  script: ScriptSegment[];
}> = ({ productUrl, script }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background video/capture */}
      <Sequence from={0} durationInFrames={30 * 60}>
        <ProductCapture url={productUrl} />
      </Sequence>

      {/* Captions overlay */}
      {script.map((segment, i) => (
        <Sequence
          key={i}
          from={segment.startFrame}
          durationInFrames={segment.endFrame - segment.startFrame}
        >
          <AnimatedCaption text={segment.text} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Render command
// npx remotion render src/index.tsx ProductDemo --props='{"productUrl":"...", "script":[...]}'
```

### 1.3 Remotion-Subtitles (Caption Templates)

**Repository:** `vendor/render/remotion-subtitles/`
**License:** MIT
**Purpose:** Animated caption components for Remotion

#### Why remotion-subtitles:

- **17 built-in templates** - Professional caption styles
- **SRT parsing** - Direct subtitle file import
- **Animation effects** - Bounce, glow, typewriter, etc.
- **Custom styling** - Full CSS control

#### Available Caption Styles:

| Template          | Effect              |
| ----------------- | ------------------- |
| BounceCaption     | Bounce in animation |
| ColorfulCaption   | Rainbow text effect |
| ExplosiveCaption  | Explosive entrance  |
| FadeCaption       | Fade in/out         |
| FireCaption       | Fire effect         |
| GlitchCaption     | Glitch animation    |
| GlowingCaption    | Glow effect         |
| LightningCaption  | Lightning flash     |
| NeonCaption       | Neon sign style     |
| RotatingCaption   | 3D rotation         |
| ShakeCaption      | Screen shake        |
| ThreeDishCaption  | 3D perspective      |
| TiltShiftCaption  | Tilt-shift blur     |
| TypewriterCaption | Typewriter effect   |
| WavingCaption     | Wave animation      |
| ZoomCaption       | Zoom in/out         |

#### Code Pattern:

```tsx
import { SubtitleSequence } from 'remotion-subtitle';
import { TypewriterCaption as Caption } from 'remotion-subtitle';
import { useEffect, useState } from 'react';

export const Subtitles = () => {
  const { fps } = useVideoConfig();
  const [sequences, setSequences] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const subtitles = new SubtitleSequence('audio.srt');

  useEffect(() => {
    subtitles.ready().then(() => {
      setSequences(subtitles.getSequences(<Caption />, fps));
      setLoaded(true);
    });
  }, []);

  return (
    <>
      {loaded && (
        <>
          <Audio src={staticFile('narration.mp3')} />
          {sequences}
        </>
      )}
    </>
  );
};
```

### 1.4 Mosaico (Python Video Generation)

**Repository:** `vendor/render/mosaico/`
**License:** MIT
**Framework:** Python + MoviePy

#### Why Mosaico for Python workflows:

- **AI script generation** - Built-in LLM integration
- **TTS integration** - ElevenLabs, etc.
- **Caption transcription** - AssemblyAI integration
- **Python-native** - No JavaScript required

#### Key Features:

- AI-powered script generation for videos
- Rich media asset management (audio, images, text, subtitles)
- Flexible positioning system
- Built-in effects (pan, zoom)
- LangChain/Haystack integration

#### Code Pattern:

```python
from mosaico.audio_transcribers.assemblyai import AssemblyAIAudioTranscriber
from mosaico.script_generators.news import NewsVideoScriptGenerator
from mosaico.speech_synthesizers.elevenlabs import ElevenLabsSpeechSynthesizer
from mosaico.video.project import VideoProject
from mosaico.video.rendering import render_video

# Create script generator
script_generator = NewsVideoScriptGenerator(
    context=article_text,
    language="en",
    num_paragraphs=8,
    api_key=ANTHROPIC_API_KEY,
)

# Create speech synthesizer
speech_synthesizer = ElevenLabsSpeechSynthesizer(
    voice_id="voice-id",
    api_key=ELEVENLABS_API_KEY,
)

# Create audio transcriber for captions
audio_transcriber = AssemblyAIAudioTranscriber(api_key=ASSEMBLYAI_API_KEY)

# Create project
project = (
    VideoProject.from_script_generator(script_generator, media)
    .with_title("My Video")
    .with_fps(30)
    .with_resolution((1080, 1920))  # 9:16 vertical
    .add_narration(speech_synthesizer)
    .add_captions_from_transcriber(audio_transcriber, overwrite=True)
)

# Render
render_video(project, "output/")
```

### 1.5 JSON2Video (Cloud API)

**Repository:** `vendor/render/json2video-php-sdk/`
**Type:** Commercial API
**Approach:** JSON config → cloud rendering

#### Use Cases:

- Simple video templates
- High-volume rendering
- No local GPU required
- Multi-language voiceover

#### JSON Pattern:

```json
{
  "resolution": "vertical",
  "scenes": [
    {
      "background_color": "#4392F1",
      "elements": [
        {
          "type": "text",
          "text": "Hello World",
          "style": "003",
          "duration": 10,
          "start": 2
        }
      ]
    }
  ]
}
```

### 1.6 Rendering Recommendation

| Use Case                  | Tool                   | Reason                        |
| ------------------------- | ---------------------- | ----------------------------- |
| TypeScript/React pipeline | **Remotion**           | Programmatic, component-based |
| Python pipeline           | **Mosaico**            | Native Python, AI integration |
| Quick prototypes          | **JSON2Video**         | Cloud-based, no setup         |
| Caption animations        | **remotion-subtitles** | 17 templates ready            |

---

## Part 2: Caption & ASR Infrastructure

### 2.1 ASR Tool Comparison

| Tool               | Speed        | Accuracy | Key Feature           |
| ------------------ | ------------ | -------- | --------------------- |
| **WhisperX**       | 70x realtime | High     | Word-level timestamps |
| **Whisper**        | 1x realtime  | High     | OpenAI original       |
| **faster-whisper** | 4x realtime  | High     | CTranslate2 backend   |

### 2.2 WhisperX (Word-Level Timestamps) ⭐ RECOMMENDED

**Repository:** `vendor/captions/whisperx/`
**License:** BSD
**Stars:** 15k+
**INTERSPEECH 2023:** Accepted paper

#### Why WhisperX for content-machine:

- **70x realtime** - Batched inference on GPU
- **Word-level timestamps** - Precise caption timing
- **Speaker diarization** - Multi-speaker identification
- **VAD preprocessing** - Reduces hallucination

#### Architecture:

```
Audio Input
    │
    ▼
┌─────────────────┐
│  VAD (Silero)   │  ← Voice Activity Detection
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Whisper Batched │  ← 70x faster via batching
│ (faster-whisper)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Forced Align   │  ← wav2vec2 phoneme alignment
│  (wav2vec2)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Speaker Diarize │  ← pyannote-audio
│  (Optional)     │
└────────┬────────┘
         │
         ▼
Word-Level Transcript with Speaker IDs
```

#### Code Pattern:

```python
import whisperx
import gc

device = "cuda"
batch_size = 16
compute_type = "float16"

# 1. Transcribe with batched whisper
model = whisperx.load_model("large-v2", device, compute_type=compute_type)
audio = whisperx.load_audio("audio.mp3")
result = model.transcribe(audio, batch_size=batch_size)

print(result["segments"])  # Before alignment

# 2. Align to get word-level timestamps
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"], device=device
)
result = whisperx.align(
    result["segments"], model_a, metadata, audio, device,
    return_char_alignments=False
)

print(result["segments"])  # After alignment - now with word timestamps!

# 3. Optional: Speaker diarization
from whisperx.diarize import DiarizationPipeline

diarize_model = DiarizationPipeline(use_auth_token=HF_TOKEN, device=device)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)

print(result["segments"])  # Now with speaker IDs!
```

#### Output Format:

```python
{
  "segments": [
    {
      "text": "Hello world",
      "start": 0.0,
      "end": 1.5,
      "words": [
        {"word": "Hello", "start": 0.0, "end": 0.7},
        {"word": "world", "start": 0.8, "end": 1.5}
      ],
      "speaker": "SPEAKER_00"
    }
  ]
}
```

### 2.3 CLI Usage:

```bash
# Basic transcription with word highlighting
whisperx audio.wav --highlight_words True

# With speaker diarization
whisperx audio.wav --model large-v2 --diarize --highlight_words True

# CPU mode
whisperx audio.wav --compute_type int8 --device cpu

# Specific language
whisperx audio.wav --model large-v2 --language de
```

### 2.4 Caption Recommendation

| Use Case              | Tool               | Reason              |
| --------------------- | ------------------ | ------------------- |
| Word-level timestamps | **WhisperX**       | Accurate, fast      |
| Basic transcription   | **Whisper**        | Simple setup        |
| Low GPU memory        | **faster-whisper** | CTranslate2 backend |

---

## Part 3: Text-to-Speech Infrastructure

### 3.1 TTS Tool Comparison

| Tool           | Size       | Languages | Speed            | Quality   |
| -------------- | ---------- | --------- | ---------------- | --------- |
| **Kokoro**     | 82M params | Multi     | 35-100x realtime | High      |
| **EdgeTTS**    | Cloud      | 30+       | API              | Good      |
| **ElevenLabs** | Cloud      | Multi     | API              | Excellent |
| **Piper**      | Local      | Multi     | Fast             | Good      |

### 3.2 Kokoro (Local TTS) ⭐ RECOMMENDED

**Repository:** `vendor/audio/kokoro/`
**License:** Apache-2.0
**Model Size:** 82M parameters
**Output:** 24kHz audio

#### Why Kokoro for content-machine:

- **Apache licensed** - Fully open-source
- **Small model** - 82M params, runs anywhere
- **High quality** - Comparable to larger models
- **Fast** - 35-100x realtime on GPU

#### Supported Languages:

- 🇺🇸 American English (`a`)
- 🇬🇧 British English (`b`)
- 🇪🇸 Spanish (`e`)
- 🇫🇷 French (`f`)
- 🇮🇳 Hindi (`h`)
- 🇮🇹 Italian (`i`)
- 🇯🇵 Japanese (`j`)
- 🇧🇷 Brazilian Portuguese (`p`)
- 🇨🇳 Mandarin Chinese (`z`)

#### Code Pattern:

```python
from kokoro import KPipeline
import soundfile as sf

# Initialize pipeline
pipeline = KPipeline(lang_code='a')  # American English

# Generate speech
text = """
Kokoro is an open-weight TTS model with 82 million parameters.
Despite its lightweight architecture, it delivers comparable quality
to larger models while being significantly faster.
"""

# Generate with streaming
generator = pipeline(text, voice='af_heart', speed=1.0)

for i, (graphemes, phonemes, audio) in enumerate(generator):
    print(f"Segment {i}: {graphemes}")
    sf.write(f'segment_{i}.wav', audio, 24000)
```

### 3.3 Kokoro-FastAPI (Production API) ⭐ RECOMMENDED

**Repository:** `vendor/audio/kokoro-fastapi/`
**License:** Apache-2.0
**Deployment:** Docker (GPU/CPU)

#### Why Kokoro-FastAPI:

- **OpenAI-compatible** - Drop-in replacement
- **Docker ready** - GPU and CPU images
- **Streaming support** - Real-time output
- **Voice mixing** - Combine multiple voices

#### Quick Start:

```bash
# GPU deployment
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU deployment
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

#### OpenAI-Compatible Usage:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Generate speech (OpenAI compatible!)
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_heart",  # or combine: "af_sky+af_bella"
    input="Hello world!"
) as response:
    response.stream_to_file("output.mp3")
```

#### Voice Mixing:

```python
import requests

# Weighted voice combination (67%/33% mix)
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "input": "Hello world!",
        "voice": "af_bella(2)+af_sky(1)",  # 2:1 ratio
        "response_format": "mp3"
    }
)

with open("output.mp3", "wb") as f:
    f.write(response.content)
```

#### Timestamped Captions:

```python
import requests
import json

# Generate with word-level timestamps
response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
        "response_format": "mp3",
        "stream": False
    }
)

result = response.json()
audio_bytes = base64.b64decode(result["audio"])
timestamps = result["timestamps"]  # Word-level timing!
```

### 3.4 Performance Metrics:

| Metric               | GPU (4060Ti) | CPU (i7) |
| -------------------- | ------------ | -------- |
| Realtime Factor      | 35-100x      | 3-10x    |
| First Token Latency  | ~300ms       | ~3500ms  |
| Memory (large model) | <8GB         | N/A      |

### 3.5 TTS Recommendation

| Use Case           | Tool               | Reason                       |
| ------------------ | ------------------ | ---------------------------- |
| Production API     | **Kokoro-FastAPI** | OpenAI-compatible, streaming |
| Python integration | **Kokoro**         | Direct library use           |
| 30+ languages      | **EdgeTTS**        | Free, Microsoft backend      |
| Highest quality    | **ElevenLabs**     | Commercial, cloning          |

---

## Part 4: Integration Architecture

### 4.1 Full Creative Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Creative Pipeline                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SCRIPT GENERATION (LLM + Instructor)                        │
│     └─→ Generate video script with timing hints                │
│                                                                 │
│  2. TTS (Kokoro-FastAPI)                                        │
│     └─→ Generate voiceover audio with timestamps               │
│     └─→ Output: audio.mp3 + word_timestamps.json               │
│                                                                 │
│  3. ASR VERIFICATION (WhisperX)                                 │
│     └─→ Verify timestamps / refine alignment                   │
│     └─→ Output: verified_captions.json                         │
│                                                                 │
│  4. RENDERING (Remotion)                                        │
│     └─→ Combine captures + audio + captions                    │
│     └─→ Apply caption animations (remotion-subtitles)          │
│     └─→ Output: final_video.mp4                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow

```typescript
// Step 1: Generate script
const script = await instructor.chat.completions.create({
  model: 'gpt-4o',
  response_model: { schema: VideoScriptSchema },
  messages: [{ role: 'user', content: 'Create a 30s TikTok about VS Code...' }],
});

// Step 2: Generate TTS
const ttsResponse = await fetch('http://localhost:8880/dev/captioned_speech', {
  method: 'POST',
  body: JSON.stringify({
    model: 'kokoro',
    input: script.fullText,
    voice: 'af_heart',
    response_format: 'mp3',
  }),
});
const { audio, timestamps } = await ttsResponse.json();

// Step 3: Render video
await renderMedia({
  composition: ProductDemo,
  outputLocation: 'output.mp4',
  inputProps: {
    captureUrl: 'https://product.example.com',
    audioBase64: audio,
    captions: timestamps,
  },
});
```

### 4.3 Remotion Component with Kokoro:

```tsx
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { NeonCaption } from 'remotion-subtitle';

interface CaptionSegment {
  word: string;
  start: number;
  end: number;
}

export const TikTokVideo: React.FC<{
  audioSrc: string;
  captions: CaptionSegment[];
}> = ({ audioSrc, captions }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background */}
      <ProductCapture />

      {/* Audio */}
      <Audio src={audioSrc} />

      {/* Animated captions */}
      {captions.map((caption, i) => (
        <Sequence
          key={i}
          from={Math.floor(caption.start * fps)}
          durationInFrames={Math.floor((caption.end - caption.start) * fps)}
        >
          <NeonCaption text={caption.word} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

---

## Part 5: Recommendations Summary

### 5.1 Recommended Stack

| Category          | Tool                   | Priority | Notes                   |
| ----------------- | ---------------------- | -------- | ----------------------- |
| Video Rendering   | **Remotion**           | P0       | Review license          |
| Caption Animation | **remotion-subtitles** | P0       | 17 templates            |
| ASR/Transcription | **WhisperX**           | P0       | Word-level timestamps   |
| TTS (API)         | **Kokoro-FastAPI**     | P0       | OpenAI-compatible       |
| TTS (Library)     | **Kokoro**             | P1       | Direct integration      |
| Python Rendering  | **Mosaico**            | P2       | Alternative to Remotion |

### 5.2 Deployment Order

1. **Phase 1: TTS Setup**
   - Deploy Kokoro-FastAPI (Docker)
   - Test voice options
   - Configure for production

2. **Phase 2: ASR Setup**
   - Install WhisperX
   - Configure GPU/CPU mode
   - Test timestamp accuracy

3. **Phase 3: Rendering Setup**
   - Initialize Remotion project
   - Import remotion-subtitles
   - Build caption components

4. **Phase 4: Integration**
   - Connect TTS → ASR → Rendering
   - Build full pipeline
   - Test end-to-end

### 5.3 Docker Compose Addition:

```yaml
# Add to infrastructure docker-compose.yml

services:
  kokoro-tts:
    image: ghcr.io/remsky/kokoro-fastapi-gpu:latest
    ports:
      - '8880:8880'
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## References

### Rendering

- Remotion Docs: https://www.remotion.dev/docs
- remotion-subtitles: https://github.com/ahgsql/remotion-subtitles
- Mosaico: https://folhasp.github.io/mosaico/

### Captions/ASR

- WhisperX Paper: https://arxiv.org/abs/2303.00747
- Whisper: https://github.com/openai/whisper
- faster-whisper: https://github.com/guillaumekln/faster-whisper

### TTS

- Kokoro Model: https://huggingface.co/hexgrad/Kokoro-82M
- Kokoro-FastAPI: https://github.com/remsky/Kokoro-FastAPI

---

**Document Status:** Complete
**Total Deep-Dive Documents:** 44

**Next Steps:**

1. Deploy Kokoro-FastAPI
2. Install WhisperX
3. Initialize Remotion project
4. Build caption component library
5. Test full pipeline integration
