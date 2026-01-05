# Deep Dive #78: Clipping, Audio & Scene Detection Ecosystem

**Document ID:** DD-078  
**Date:** 2026-01-02  
**Category:** Clipping, Audio, TTS, Scene Detection  
**Status:** Complete  
**Word Count:** ~6,500

---

## Executive Summary

This document covers the clipping and audio ecosystem:

1. **AI Clipping** – FunClip (Alibaba, LLM-based)
2. **Scene Detection** – PySceneDetect (content-aware, fast cuts)
3. **TTS API** – Kokoro-FastAPI (OpenAI-compatible, multi-language)

---

## 1. AI Clipping Tools

### 1.1 FunClip

**Source:** `vendor/clipping/FunClip/`  
**Creator:** Alibaba DAMO Academy  
**License:** Apache 2.0  
**Language:** Python  
**Stars:** Trending

#### Overview

FunClip is a **fully open-source automated video clipping tool** using Alibaba's FunASR Paraformer models. Features **LLM-based smart clipping** with GPT and Qwen models.

#### Key Features

| Feature                       | Description                                   |
| ----------------------------- | --------------------------------------------- |
| **Paraformer-Large**          | Industrial-grade Chinese ASR (13M+ downloads) |
| **SeACo-Paraformer**          | Hotword customization                         |
| **CAM++ Speaker Recognition** | Clip by speaker ID                            |
| **LLM Smart Clipping**        | GPT/Qwen integration                          |
| **Gradio UI**                 | Web-based interface                           |
| **SRT Generation**            | Full video subtitles                          |
| **Multi-segment Clipping**    | Free selection                                |
| **English Support**           | Since v2.0                                    |

#### LLM Clipping Workflow

1. Run ASR recognition on video
2. Select LLM model (GPT, Qwen, etc.) and configure API key
3. Click "LLM Inference" → combines prompts with SRT subtitles
4. Click "AI Clip" → extracts timestamps from LLM output
5. Customize prompts for different results

#### Installation

```bash
git clone https://github.com/alibaba-damo-academy/FunClip.git
cd FunClip
pip install -r ./requirements.txt
```

#### Optional: Embedded Subtitles

```bash
# Ubuntu
apt-get -y update && apt-get -y install ffmpeg imagemagick
sed -i 's/none/read,write/g' /etc/ImageMagick-6/policy.xml

# Download font
wget https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ClipVideo/STHeitiMedium.ttc -O font/STHeitiMedium.ttc
```

#### Usage: Gradio UI

```bash
python funclip/launch.py
# '-l en' for English
# '-p xxx' for port
# '-s True' for public access

# Visit localhost:7860
```

#### Usage: Command Line

```bash
# Step 1: Recognize
python funclip/videoclipper.py --stage 1 \
    --file examples/video.mp4 \
    --output_dir ./output

# Step 2: Clip
python funclip/videoclipper.py --stage 2 \
    --file examples/video.mp4 \
    --output_dir ./output \
    --dest_text 'The text segment to extract' \
    --start_ost 0 \
    --end_ost 100 \
    --output_file './output/res.mp4'
```

#### ASR Models Used

| Model                | Purpose                         |
| -------------------- | ------------------------------- |
| **Paraformer-Large** | Main Chinese ASR                |
| **SeACo-Paraformer** | Hotword customization           |
| **CAM++**            | Speaker recognition/diarization |
| **Whisper**          | English (optional)              |

---

## 2. Scene Detection

### 2.1 PySceneDetect

**Source:** `vendor/clipping/pyscenedetect/`  
**Creator:** Brandon Castellano  
**License:** BSD-3-Clause  
**Language:** Python  
**Stars:** 3k+

#### Overview

PySceneDetect is a **video scene detection and analysis tool** for finding cuts, fades, and scene boundaries in video files.

#### Key Features

| Feature                 | Description                 |
| ----------------------- | --------------------------- |
| **Content Detection**   | Detect fast cuts            |
| **Adaptive Detection**  | Handles camera movement     |
| **Threshold Detection** | Fade in/out detection       |
| **Video Splitting**     | FFmpeg/mkvmerge integration |
| **Frame Saving**        | Save frames from each scene |
| **Python API**          | Full programmatic control   |
| **CLI**                 | Command-line interface      |

#### Installation

```bash
pip install scenedetect[opencv] --upgrade

# Requires ffmpeg for video splitting
```

#### CLI Usage

```bash
# Split video on fast cuts
scenedetect -i video.mp4 split-video

# Save frames from each scene
scenedetect -i video.mp4 save-images

# Skip first 10 seconds
scenedetect -i video.mp4 time -s 10s
```

#### Python API

```python
from scenedetect import detect, ContentDetector

# Detect scenes
scene_list = detect('my_video.mp4', ContentDetector())

# Print scenes
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: '
          f'Start {scene[0].get_timecode()} / Frame {scene[0].frame_num}, '
          f'End {scene[1].get_timecode()} / Frame {scene[1].frame_num}')
```

#### Split Video

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

scene_list = detect('my_video.mp4', ContentDetector())
split_video_ffmpeg('my_video.mp4', scene_list)
```

#### Advanced API

```python
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
from scenedetect.video_splitter import split_video_ffmpeg

def split_video_into_scenes(video_path, threshold=27.0):
    # Open video
    video = open_video(video_path)

    # Create scene manager with detector
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))

    # Detect scenes
    scene_manager.detect_scenes(video, show_progress=True)
    scene_list = scene_manager.get_scene_list()

    # Split video
    split_video_ffmpeg(video_path, scene_list, show_progress=True)
```

#### Detection Algorithms

| Detector              | Use Case                          |
| --------------------- | --------------------------------- |
| **ContentDetector**   | Fast cuts based on HSL changes    |
| **AdaptiveDetector**  | Two-pass, handles camera movement |
| **ThresholdDetector** | Fade in/out detection             |

---

## 3. TTS API

### 3.1 Kokoro-FastAPI

**Source:** `vendor/audio/kokoro-fastapi/`  
**Creator:** remsky  
**License:** Apache 2.0  
**Language:** Python  
**Model:** Kokoro-82M

#### Overview

Kokoro-FastAPI is a **Dockerized FastAPI wrapper** for the Kokoro-82M text-to-speech model. Features **OpenAI-compatible API**, multi-language support, and GPU acceleration.

#### Key Features

| Feature                  | Description                                  |
| ------------------------ | -------------------------------------------- |
| **OpenAI Compatible**    | Drop-in replacement for OpenAI TTS           |
| **Multi-language**       | English, Japanese, Chinese (Vietnamese soon) |
| **GPU Accelerated**      | NVIDIA CUDA or CPU inference                 |
| **Streaming**            | Real-time audio generation                   |
| **Voice Mixing**         | Weighted voice combinations                  |
| **Timestamped Captions** | Per-word timestamps                          |
| **Multiple Formats**     | mp3, wav, opus, flac, m4a, pcm               |
| **Web UI**               | Built-in interface at /web                   |

#### Performance

| Metric                  | GPU      | CPU      |
| ----------------------- | -------- | -------- |
| **Realtime Factor**     | 35x-100x | Variable |
| **First Token Latency** | ~300ms   | ~3500ms  |
| **Tokens/Second**       | ~137     | Lower    |

#### Quick Start

```bash
# Docker (GPU)
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# Docker (CPU)
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

#### OpenAI-Compatible Usage

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Generate speech
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky+af_bella",  # Voice combination
    input="Hello world!"
) as response:
    response.stream_to_file("output.mp3")
```

#### Requests API

```python
import requests

# Get available voices
response = requests.get("http://localhost:8880/v1/audio/voices")
voices = response.json()["voices"]

# Generate audio
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
        "response_format": "mp3",
        "speed": 1.0
    }
)

with open("output.mp3", "wb") as f:
    f.write(response.content)
```

#### Voice Combination

```python
# Simple 50/50 mix
voice = "af_bella+af_sky"

# Weighted 67/33 mix
voice = "af_bella(2)+af_sky(1)"

# Generate
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "input": "Hello world!",
        "voice": "af_bella(2)+af_sky(1)",
        "response_format": "mp3"
    }
)
```

#### Streaming

```python
from openai import OpenAI
import pyaudio

client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")

# Stream to speakers
player = pyaudio.PyAudio().open(
    format=pyaudio.paInt16,
    channels=1,
    rate=24000,
    output=True
)

with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_bella",
    response_format="pcm",
    input="Hello world!"
) as response:
    for chunk in response.iter_bytes(chunk_size=1024):
        player.write(chunk)
```

#### Timestamped Captions

```python
import requests
import base64
import json

response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
        "speed": 1.0,
        "response_format": "mp3",
        "stream": False,
    }
)

audio_json = json.loads(response.content)
audio_bytes = base64.b64decode(audio_json["audio"].encode("utf-8"))

with open("output.mp3", "wb") as f:
    f.write(audio_bytes)

print(audio_json["timestamps"])  # Word-level timestamps
```

#### Phoneme API

```python
import requests

def get_phonemes(text: str, language: str = "a"):
    """Get phonemes and tokens for input text"""
    response = requests.post(
        "http://localhost:8880/dev/phonemize",
        json={"text": text, "language": language}
    )
    result = response.json()
    return result["phonemes"], result["tokens"]

def generate_from_phonemes(phonemes: str, voice: str = "af_bella"):
    """Generate audio from phonemes"""
    response = requests.post(
        "http://localhost:8880/dev/generate_from_phonemes",
        json={"phonemes": phonemes, "voice": voice},
        headers={"Accept": "audio/wav"}
    )
    return response.content

# Usage
phonemes, tokens = get_phonemes("Hello world!")
print(f"Phonemes: {phonemes}")

audio = generate_from_phonemes(phonemes)
with open("speech.wav", "wb") as f:
    f.write(audio)
```

---

## 4. Comparative Analysis

### 4.1 Clipping Tools

| Tool              | ASR                          | LLM Clipping | Speaker ID | Output         |
| ----------------- | ---------------------------- | ------------ | ---------- | -------------- |
| **FunClip**       | Paraformer (Chinese/English) | ✅ GPT/Qwen  | ✅ CAM++   | Video + SRT    |
| **PySceneDetect** | N/A                          | ❌           | ❌         | Video segments |
| **Clip-Anything** | N/A                          | ✅           | ❌         | Video clips    |

### 4.2 TTS Tools

| Tool               | OpenAI Compatible | Languages  | Streaming | Voice Mixing |
| ------------------ | ----------------- | ---------- | --------- | ------------ |
| **Kokoro-FastAPI** | ✅                | EN, JA, ZH | ✅        | ✅           |
| **EdgeTTS**        | ❌                | 30+        | ❌        | ❌           |
| **Coqui TTS**      | ❌                | Many       | ❌        | ❌           |
| **ElevenLabs**     | ❌                | Many       | ✅        | ❌           |

---

## 5. Architecture Integration

### 5.1 Video Clipping Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Video Clipping Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SCENE DETECTION (PySceneDetect)                          │
│     ├─ ContentDetector: Fast cuts                            │
│     ├─ AdaptiveDetector: Camera movement                     │
│     └─ Output: Scene boundaries                              │
│                                                              │
│  2. ASR TRANSCRIPTION (FunClip/WhisperX)                     │
│     ├─ Full video transcription                              │
│     ├─ Word-level timestamps                                 │
│     ├─ Speaker diarization                                   │
│     └─ Output: SRT subtitles                                 │
│                                                              │
│  3. LLM ANALYSIS (FunClip)                                   │
│     ├─ Combine prompts + SRT                                 │
│     ├─ Identify highlight moments                            │
│     ├─ Extract timestamps                                    │
│     └─ Output: Clip definitions                              │
│                                                              │
│  4. VIDEO EXTRACTION                                         │
│     ├─ FFmpeg for cutting                                    │
│     ├─ Optional embedded subtitles                           │
│     └─ Output: Final clips                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 TTS Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                      TTS Pipeline                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. TEXT INPUT                                               │
│     Script text from LLM generation                          │
│                                                              │
│  2. PHONEMIZATION                                            │
│     ├─ Text → Phonemes                                       │
│     └─ Language detection                                    │
│                                                              │
│  3. VOICE SELECTION                                          │
│     ├─ Single voice                                          │
│     └─ Voice mixing (weighted combination)                   │
│                                                              │
│  4. AUDIO GENERATION (Kokoro-FastAPI)                        │
│     ├─ GPU acceleration (35-100x realtime)                   │
│     ├─ Streaming chunks                                      │
│     └─ Natural sentence boundaries                           │
│                                                              │
│  5. CAPTION GENERATION                                       │
│     ├─ Word-level timestamps                                 │
│     └─ SRT/ASS output                                        │
│                                                              │
│  6. OUTPUT                                                   │
│     ├─ Audio file (mp3, wav, etc.)                           │
│     └─ Timestamp JSON                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. content-machine Integration

### Recommended Stack

| Component           | Tool                         | Rationale               |
| ------------------- | ---------------------------- | ----------------------- |
| **Scene Detection** | PySceneDetect                | Fast, accurate, Python  |
| **AI Clipping**     | FunClip                      | LLM-based, speaker ID   |
| **TTS**             | Kokoro-FastAPI               | OpenAI-compatible, fast |
| **Caption Sync**    | WhisperX + Kokoro timestamps | Word-level accuracy     |

### Integration Example

```python
# content-machine video pipeline

from scenedetect import detect, ContentDetector

# 1. Detect scenes
scenes = detect(video_path, ContentDetector())

# 2. Generate script (LLM)
script = await llm.generate_script(topic)

# 3. Generate audio with timestamps (Kokoro)
import requests
response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": script.text,
        "voice": "af_bella",
        "response_format": "mp3",
        "stream": False,
    }
)
audio = response.json()

# Save audio
with open("narration.mp3", "wb") as f:
    f.write(base64.b64decode(audio["audio"]))

# Get timestamps for captions
timestamps = audio["timestamps"]

# 4. Generate captions from timestamps
srt = generate_srt(timestamps)

# 5. Compose video (Remotion)
await render_video(
    background=video_path,
    audio="narration.mp3",
    captions=srt,
)
```

---

## 7. Quick Reference

### FunClip

```bash
# Gradio UI
python funclip/launch.py -l en

# CLI recognition
python funclip/videoclipper.py --stage 1 --file video.mp4 --output_dir ./output

# CLI clipping
python funclip/videoclipper.py --stage 2 --file video.mp4 --dest_text "text"
```

### PySceneDetect

```bash
# CLI
scenedetect -i video.mp4 split-video

# Python
from scenedetect import detect, ContentDetector
scenes = detect('video.mp4', ContentDetector())
```

### Kokoro-FastAPI

```bash
# Docker
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# OpenAI compatible
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")
```

---

## 8. Document Metadata

| Field            | Value          |
| ---------------- | -------------- |
| **Document ID**  | DD-078         |
| **Created**      | 2026-01-02     |
| **Author**       | Research Agent |
| **Status**       | Complete       |
| **Dependencies** | DD-055, DD-064 |
