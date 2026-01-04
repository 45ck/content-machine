# Deep Dive #55: Audio/TTS, Captions & Publishing Infrastructure
**Date:** 2026-01-02
**Category:** Audio Processing, TTS, Captions, Social Media Publishing
**Status:** Complete

---

## Executive Summary

This deep dive documents the audio processing (TTS), caption generation (ASR/alignment), and publishing infrastructure available in the vendor ecosystem. These three components form the critical output stage of any video generation pipeline.

### Key Findings

| Category | Top Tools | Key Features |
|----------|-----------|--------------|
| **TTS** | Kokoro, Kokoro-FastAPI | 82M params, 8 languages, Apache license |
| **ASR/Captions** | WhisperX, FunClip | Word-level timestamps, speaker diarization |
| **Scene Detection** | PySceneDetect | Content-aware cutting, Python API |
| **Publishing** | TiktokAutoUploader, youtube-upload, Mixpost | Multi-platform, scheduling |

---

## 1. Text-to-Speech (TTS) Infrastructure

### 1.1 Kokoro - Lightweight Local TTS

**Repository:** `vendor/audio/kokoro`
**License:** Apache 2.0
**Size:** 82 million parameters

Kokoro is the most compelling open-weight TTS model in the ecosystem:

#### Features

| Feature | Value |
|---------|-------|
| Parameters | 82M (lightweight) |
| Sample Rate | 24kHz |
| Languages | 8 supported |
| License | Apache (deployable anywhere) |

#### Supported Languages

```python
LANG_CODES = {
    'a': 'American English',
    'b': 'British English',
    'e': 'Spanish (es)',
    'f': 'French (fr-fr)',
    'h': 'Hindi (hi)',
    'i': 'Italian (it)',
    'j': 'Japanese',  # pip install misaki[ja]
    'p': 'Brazilian Portuguese (pt-br)',
    'z': 'Mandarin Chinese'  # pip install misaki[zh]
}
```

#### Usage Pattern

```python
from kokoro import KPipeline
import soundfile as sf

# Initialize pipeline
pipeline = KPipeline(lang_code='a')  # American English

# Generate audio
text = '''
Kokoro is an open-weight TTS model with 82 million parameters.
Despite its lightweight architecture, it delivers comparable quality
to larger models while being significantly faster.
'''

generator = pipeline(text, voice='af_heart')
for i, (graphemes, phonemes, audio) in enumerate(generator):
    sf.write(f'{i}.wav', audio, 24000)
```

#### Key Advantage

- **espeak-ng fallback** for unknown words
- **phoneme-based** generation via misaki G2P
- **voice cloning** potential with custom voice tensors

### 1.2 Kokoro-FastAPI - Production Deployment

**Repository:** `vendor/audio/kokoro-fastapi`
**Interface:** OpenAI-compatible Speech API

Production-ready Docker deployment of Kokoro:

#### Architecture

```
┌─────────────────────────────────────────┐
│           Kokoro-FastAPI                │
├─────────────────────────────────────────┤
│  ┌─────────────┐   ┌────────────────┐  │
│  │ FastAPI     │   │ Kokoro Model   │  │
│  │ Endpoints   │──▶│ (GPU/CPU)      │  │
│  └─────────────┘   └────────────────┘  │
│         │                  │            │
│         ▼                  ▼            │
│  ┌─────────────┐   ┌────────────────┐  │
│  │ OpenAI API  │   │ Multi-Model    │  │
│  │ Compatible  │   │ Selection      │  │
│  └─────────────┘   └────────────────┘  │
└─────────────────────────────────────────┘
```

#### Features

| Feature | Description |
|---------|-------------|
| Multi-language | English, Japanese, Chinese, Vietnamese |
| OpenAI Compatible | Drop-in replacement for OpenAI Speech |
| GPU Accelerated | NVIDIA CUDA support |
| Voice Mixing | Weighted voice combinations |
| Timestamps | Per-word caption generation |
| Smart Templates | Pre-built prompts for photography, design |
| Web UI | localhost:8880/web |

#### Deployment

```bash
# GPU Docker
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU Docker
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

#### OpenAI-Compatible Endpoint

```python
import openai

client = openai.Client(base_url="http://localhost:8880/v1")
response = client.audio.speech.create(
    model="kokoro",
    voice="af_heart",
    input="Hello, this is Kokoro TTS!"
)
response.stream_to_file("output.mp3")
```

---

## 2. Caption/Transcription Infrastructure

### 2.1 WhisperX - Advanced ASR with Alignment

**Repository:** `vendor/captions/whisperx`
**Performance:** 70x realtime with large-v2

WhisperX is the most advanced open-source ASR solution:

#### Architecture

```
Audio ──▶ [faster-whisper] ──▶ [wav2vec2 alignment] ──▶ Word Timestamps
                │                        │
                ▼                        ▼
         VAD Preprocessing        Speaker Diarization
                                  (pyannote-audio)
```

#### Key Features

| Feature | Description |
|---------|-------------|
| Batched Inference | 70x realtime transcription |
| Word-level Timestamps | wav2vec2 forced alignment |
| Speaker Diarization | pyannote-audio integration |
| VAD Preprocessing | Reduces hallucination |
| Memory Efficient | <8GB GPU for large-v2 |

#### Usage

```python
import whisperx

# Load model
device = "cuda"
model = whisperx.load_model("large-v2", device)

# Transcribe
result = model.transcribe("audio.mp3", batch_size=16)

# Align timestamps
model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result = whisperx.align(result["segments"], model_a, metadata, audio, device)

# Diarize speakers
diarize_model = whisperx.DiarizationPipeline(device=device)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
```

#### Output Format

```python
{
    "segments": [
        {
            "start": 0.5,
            "end": 2.3,
            "text": "Hello world",
            "speaker": "SPEAKER_00",
            "words": [
                {"word": "Hello", "start": 0.5, "end": 0.8},
                {"word": "world", "start": 1.1, "end": 2.3}
            ]
        }
    ]
}
```

### 2.2 FunClip - LLM-Powered Video Clipping

**Repository:** `vendor/clipping/FunClip`
**Maintainer:** Alibaba DAMO Academy

FunClip combines ASR with LLM-based intelligent clipping:

#### Pipeline

```
Video ──▶ FunASR ──▶ Transcription ──▶ LLM Analysis ──▶ Timestamps ──▶ FFmpeg
            │                              │
            ▼                              ▼
     Paraformer-Large               GPT/Qwen/Claude
     (Chinese/English)              (Clipping decisions)
```

#### Features

| Feature | Description |
|---------|-------------|
| FunASR Integration | Alibaba's industrial-grade Paraformer |
| Hotword Customization | SeACo-Paraformer for entity recognition |
| Speaker Recognition | CAM++ for speaker-based clipping |
| LLM Clipping | GPT/Qwen for intelligent segment selection |
| Multi-segment | Free clipping with SRT output |

#### LLM Clipping Flow

1. **Recognition:** Upload video, run ASR
2. **LLM Selection:** Choose model (Qwen, GPT), configure API key
3. **LLM Inference:** Combine prompts with SRT subtitles
4. **AI Clip:** Extract timestamps from LLM output
5. **Output:** FFmpeg cuts based on LLM decisions

#### Usage

```bash
# Launch with English support
python funclip/launch.py -l en

# With custom port
python funclip/launch.py -p 8080 -s True
```

### 2.3 PySceneDetect - Content-Aware Scene Detection

**Repository:** `vendor/clipping/pyscenedetect`
**Website:** scenedetect.com

PySceneDetect provides scene boundary detection:

#### Detection Algorithms

| Algorithm | Use Case |
|-----------|----------|
| ContentDetector | Fast cuts, content changes |
| AdaptiveDetector | Camera movement (two-pass) |
| ThresholdDetector | Fade in/out events |

#### API Usage

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Detect scenes
scene_list = detect('video.mp4', ContentDetector())

# Print scene boundaries
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

# Split video at scene boundaries
split_video_ffmpeg('video.mp4', scene_list)
```

#### CLI Usage

```bash
# Split on cuts
scenedetect -i video.mp4 split-video

# Save frames from each cut
scenedetect -i video.mp4 save-images

# Skip first 10 seconds
scenedetect -i video.mp4 time -s 10s
```

---

## 3. Publishing Infrastructure

### 3.1 TiktokAutoUploader - Fast Request-Based Upload

**Repository:** `vendor/publish/TiktokAutoUploader`
**Method:** Requests (not Selenium)
**Performance:** ~3 seconds per upload

The fastest TikTok uploader available:

#### Features

| Feature | Description |
|---------|-------------|
| Speed | 3 seconds per upload |
| Multi-account | Handle multiple accounts locally |
| Scheduling | Up to 10 days in advance |
| Sourcing | Local videos or YouTube Short links |
| Robust | No Selenium, survives layout changes |

#### CLI Usage

```bash
# Login to account
python cli.py login -n my_username

# Upload video
python cli.py upload -n my_username -v video.mp4 -t "Title" -d "Description"

# Schedule upload
python cli.py upload -n my_username -v video.mp4 --schedule "2026-01-15 14:00"
```

#### Requirements

- Node.js (for tiktok-signature)
- Python requests

### 3.2 youtube-upload (PillarGG)

**Repository:** `vendor/publish/youtube-upload`
**Method:** YouTube Data API v3

Clean Python library for YouTube uploads:

#### Usage

```python
from youtube_upload.client import YoutubeUploader

# Initialize
uploader = YoutubeUploader(client_id, client_secret)

# Authenticate
uploader.authenticate(access_token=token, refresh_token=refresh)

# Upload
options = {
    'title': 'My Video Title',
    'description': 'Video description',
    'tags': ['tag1', 'tag2'],
    'categoryId': '22',
    'privacyStatus': 'private',
    'madeForKids': False
}
uploader.upload('video.mp4', options)
```

#### Authentication Flow

1. Create OAuth credentials in Google Cloud Console
2. Download client_secrets.json
3. Run `authenticate()` - opens browser for channel selection
4. Save access_token/refresh_token for future use

### 3.3 Mixpost - Social Media Management Platform

**Repository:** `vendor/publish/mixpost`
**Framework:** Laravel (PHP)
**License:** MIT

Enterprise-grade social media management:

#### Features

| Feature | Description |
|---------|-------------|
| Multi-platform | All major social networks |
| Scheduling | Queue and calendar management |
| Analytics | Per-platform analytics |
| Team Collaboration | Workspaces and permissions |
| Post Versions | Tailor content per network |
| Media Library | Reusable assets, stock integration |
| Templates | Reusable post templates |

#### Architecture

```
┌────────────────────────────────────────────┐
│              Mixpost Platform              │
├────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Twitter │  │ Facebook│  │ LinkedIn│    │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
│       └────────────┼───────────┘          │
│                    ▼                       │
│  ┌────────────────────────────────────┐   │
│  │      Unified Posting Engine        │   │
│  │  (Scheduling, Queue, Templates)    │   │
│  └────────────────────────────────────┘   │
│                    │                       │
│         ┌─────────┼─────────┐             │
│         ▼         ▼         ▼             │
│  ┌──────────┐ ┌───────┐ ┌─────────┐      │
│  │ Analytics│ │ Media │ │ Teams   │      │
│  │ Engine   │ │Library│ │Workspaces│     │
│  └──────────┘ └───────┘ └─────────┘      │
└────────────────────────────────────────────┘
```

---

## 4. Integration Patterns

### 4.1 TTS → Video Pipeline

```typescript
// content-machine integration
interface TTSRequest {
    text: string;
    voice: string;
    language: 'a' | 'b' | 'e' | 'f' | 'h' | 'i' | 'j' | 'p' | 'z';
    speed?: number;
}

interface TTSResponse {
    audioPath: string;
    duration: number;
    wordTimestamps: Array<{
        word: string;
        start: number;
        end: number;
    }>;
}

async function synthesizeTTS(request: TTSRequest): Promise<TTSResponse> {
    // Kokoro-FastAPI call
    const response = await fetch('http://localhost:8880/v1/audio/speech', {
        method: 'POST',
        body: JSON.stringify({
            model: 'kokoro',
            voice: request.voice,
            input: request.text,
            response_format: 'mp3'
        })
    });
    
    return {
        audioPath: await response.blob(),
        duration: response.headers.get('X-Audio-Duration'),
        wordTimestamps: JSON.parse(response.headers.get('X-Word-Timestamps'))
    };
}
```

### 4.2 ASR → Captions Pipeline

```python
# WhisperX integration for caption generation
async def generate_captions(audio_path: str) -> list[dict]:
    import whisperx
    
    # Load model
    model = whisperx.load_model("large-v2", "cuda")
    
    # Transcribe with word timestamps
    result = model.transcribe(audio_path, batch_size=16)
    
    # Align for word-level precision
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device="cuda"
    )
    aligned = whisperx.align(
        result["segments"],
        model_a,
        metadata,
        audio_path,
        "cuda"
    )
    
    # Format for Remotion captions
    captions = []
    for segment in aligned["segments"]:
        for word in segment.get("words", []):
            captions.append({
                "text": word["word"],
                "startMs": int(word["start"] * 1000),
                "endMs": int(word["end"] * 1000)
            })
    
    return captions
```

### 4.3 Multi-Platform Publishing

```typescript
// Unified publishing interface
interface PublishRequest {
    videoPath: string;
    title: string;
    description: string;
    tags: string[];
    platforms: ('tiktok' | 'youtube' | 'instagram')[];
    scheduleTime?: Date;
}

async function publishVideo(request: PublishRequest): Promise<void> {
    const publishPromises = request.platforms.map(async platform => {
        switch (platform) {
            case 'tiktok':
                return publishToTikTok(request);
            case 'youtube':
                return publishToYouTube(request);
            case 'instagram':
                return publishToInstagram(request);
        }
    });
    
    await Promise.all(publishPromises);
}

// TikTok via TiktokAutoUploader
async function publishToTikTok(request: PublishRequest): Promise<void> {
    const { exec } = require('child_process');
    exec(`python cli.py upload -v ${request.videoPath} -t "${request.title}"`);
}

// YouTube via youtube-upload
async function publishToYouTube(request: PublishRequest): Promise<void> {
    const { YoutubeUploader } = require('pillar-youtube-upload');
    const uploader = new YoutubeUploader();
    await uploader.upload(request.videoPath, {
        title: request.title,
        description: request.description,
        tags: request.tags,
        privacyStatus: 'public'
    });
}
```

---

## 5. Caption Styling Patterns

### 5.1 Word Highlighting (Karaoke Style)

Most generators use word highlighting for engagement:

```json
{
    "font": "Bangers-Regular.ttf",
    "font_size": 130,
    "font_color": "yellow",
    "stroke_width": 3,
    "stroke_color": "black",
    "highlight_current_word": true,
    "word_highlight_color": "red",
    "line_count": 2,
    "shadow_strength": 1.0
}
```

### 5.2 Caption Animation Styles

| Style | Description | Use Case |
|-------|-------------|----------|
| Word-by-word | Highlight current word | Engagement |
| Bounce | Scale animation on word | Energy |
| Fade | Opacity transition | Professional |
| Typewriter | Characters appear sequentially | Tutorial |

---

## 6. Recommendations for Content-Machine

### 6.1 TTS Strategy

**Primary:** Kokoro-FastAPI (Docker deployment)
- OpenAI-compatible API
- Multi-language support
- Word timestamps for captions

**Fallback:** Edge TTS (free, no GPU needed)
- 30+ languages
- No local compute required

### 6.2 Caption Strategy

**Primary:** WhisperX
- 70x realtime
- Word-level timestamps
- Speaker diarization

**Integration:** Remotion's caption system
- React-based styling
- Animation support
- Word highlighting

### 6.3 Publishing Strategy

**TikTok:** TiktokAutoUploader
- Fastest option
- Request-based (reliable)

**YouTube:** youtube-upload (PillarGG)
- Clean API
- OAuth 2.0 support

**Multi-Platform:** Consider Mixpost
- Laravel-based
- Enterprise features
- Self-hosted

---

## 7. Performance Benchmarks

### TTS Performance

| Engine | Speed | Quality | GPU Required |
|--------|-------|---------|--------------|
| Kokoro | 10x realtime | High | Optional |
| Edge TTS | API-limited | Good | No |
| OpenAI TTS | API-limited | Excellent | No (cloud) |
| CoquiTTS | 5x realtime | Good | Recommended |

### ASR Performance

| Engine | Speed | Accuracy | Features |
|--------|-------|----------|----------|
| WhisperX | 70x realtime | 97%+ | Word timestamps, diarization |
| Whisper | 10x realtime | 97%+ | Basic timestamps |
| FunASR | 50x realtime | 95%+ | Hotwords, Chinese |

### Publishing Speed

| Platform | Tool | Speed |
|----------|------|-------|
| TikTok | TiktokAutoUploader | ~3 seconds |
| YouTube | youtube-upload | ~30 seconds |
| Instagram | rednote-uploader | ~10 seconds |

---

## 8. Related Documents

- [DD-054: MoneyPrinter Family & YouTube Automation](./54-moneyprinter-family-youtube-automation-DEEP-20260102.md)
- [DD-052: Clipping, Publishing & Video Processing](./52-clipping-publishing-video-processing-DEEP-20260102.md)
- [DD-053: Rendering, MCP Ecosystem & Composition](./53-rendering-mcp-ecosystem-composition-DEEP-20260102.md)

---

## Appendix A: Voice Selection Guide

### Kokoro Voices

| Voice ID | Description | Gender | Tone |
|----------|-------------|--------|------|
| af_heart | Warm, engaging | Female | Conversational |
| am_rock | Energetic | Male | Confident |
| bf_emma | British accent | Female | Professional |
| bm_george | British accent | Male | Formal |

### Edge TTS Popular Voices

| Voice | Language | Description |
|-------|----------|-------------|
| en-US-JennyNeural | English (US) | Natural female |
| en-US-GuyNeural | English (US) | Natural male |
| en-AU-WilliamNeural | English (AU) | Australian male |
| zh-CN-XiaoxiaoNeural | Chinese | Female |

---

**Next Steps:**
1. Create master index of all 55 deep dives
2. Document remaining connector repos
3. Explore observability/tracing infrastructure
