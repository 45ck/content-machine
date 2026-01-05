# Deep Dive #45: Video Processing, Clipping & Capture Infrastructure

**Date:** 2026-01-02
**Status:** Active Research
**Category:** Core Pipeline Tools

---

## Executive Summary

This deep dive covers **23 vendored repositories** across video processing (10), clipping (7), and capture (3) categories. These are the core pipeline tools for content-machine's video generation workflow.

**Key Findings:**

| Category                | Champion Tool             | Why                                                   |
| ----------------------- | ------------------------- | ----------------------------------------------------- |
| **Video Processing**    | MoviePy 2.0               | Python ecosystem, numpy arrays, easy compositing      |
| **Low-Level Video**     | PyAV                      | Direct FFmpeg binding, precise control                |
| **Scene Detection**     | PySceneDetect             | BSD-3, ContentDetector + AdaptiveDetector             |
| **Smart Clipping**      | FunClip ⭐                | Alibaba's FunASR + LLM analysis + speaker diarization |
| **Highlight Detection** | AI-Highlight-Clip         | Whisper + LLM scoring + auto-titles                   |
| **LLM Video Editing**   | FFMPerative               | Natural language → FFmpeg commands                    |
| **Browser Capture**     | Playwright                | Microsoft's cross-browser automation                  |
| **Screen Recording**    | puppeteer-screen-recorder | Native DevTools protocol, no overhead                 |
| **CapCut Automation**   | CapCut Mate               | RESTful API for 剪映 drafts                           |

**Critical Insight:** FunClip from Alibaba DAMO Academy is the standout tool - it combines Paraformer ASR (industrial-grade), speaker diarization, and LLM-based intelligent clipping in one package.

---

## 1. Video Processing Tools (10 repos)

### 1.1 MoviePy - Python Video Editing

**Repo:** `vendor/video-processing/moviepy/`
**License:** MIT
**Language:** Python 3.9+

**What It Is:**
MoviePy is a Python library for video editing: cuts, concatenations, compositing, text overlays, and custom effects. All media is converted to numpy arrays for pixel-level access.

**Key Features:**

- v2.0 major rewrite with breaking changes
- Read/write all common formats + GIF
- Numpy array access for every pixel
- CompositeVideoClip for layering
- Text overlays with custom fonts

**Usage Pattern:**

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and transform
clip = (
    VideoFileClip("example.mp4")
    .subclipped(10, 20)
    .with_volume_scaled(0.8)
)

# Add text overlay
txt_clip = TextClip(
    font="Arial.ttf",
    text="Hello there!",
    font_size=70,
    color='white'
).with_duration(10).with_position('center')

# Compose and export
final_video = CompositeVideoClip([clip, txt_clip])
final_video.write_videofile("result.mp4")
```

**Trade-offs:**

- ✅ Easy to use, Pythonic API
- ✅ Numpy integration for custom effects
- ⚠️ Slower than direct FFmpeg due to data import/export
- ⚠️ v2.0 has breaking changes from v1

**Verdict:** Use for Python-based processing, custom effects, text overlays

---

### 1.2 PyAV - Direct FFmpeg Binding

**Repo:** `vendor/video-processing/pyav/`
**License:** BSD
**Language:** Python

**What It Is:**
PyAV is a Pythonic binding for FFmpeg libraries, providing direct access to containers, streams, packets, codecs, and frames.

**Key Features:**

- Direct FFmpeg access (no subprocess)
- Frame-level control
- Numpy/Pillow integration
- Binary wheels for easy install

**Usage Pattern:**

```python
import av

# Open container
container = av.open('video.mp4')

# Iterate frames
for frame in container.decode(video=0):
    # frame is numpy-compatible
    img = frame.to_ndarray(format='rgb24')
    # Process frame...

# Write output
output = av.open('output.mp4', 'w')
stream = output.add_stream('h264', rate=30)
# ...
```

**Trade-offs:**

- ✅ Full FFmpeg power in Python
- ✅ No subprocess overhead
- ⚠️ Complex - requires understanding FFmpeg internals
- ⚠️ Building from source requires MSYS2 on Windows

**Verdict:** Use for low-level processing when MoviePy isn't enough

---

### 1.3 FFmpeg (Raw)

**Repo:** `vendor/video-processing/ffmpeg/`
**License:** LGPL/GPL

The foundational multimedia processing toolkit. All other video tools ultimately use FFmpeg.

**Libraries:**

- `libavcodec` - Codec implementations
- `libavformat` - Container formats, I/O
- `libavfilter` - Filter graph
- `libswscale` - Scaling/conversion

**Verdict:** Foundation layer - use via PyAV, MoviePy, or subprocess

---

### 1.4 FFMPerative - LLM Video Editing

**Repo:** `vendor/video-processing/FFMPerative/`
**License:** MIT
**Language:** Python

**What It Is:**
Natural language → FFmpeg commands. Use chat to compose video edits.

**Key Features:**

- LLM-powered command generation
- Speed/resize/crop/flip/reverse
- Speech-to-text captions
- Python API + CLI

**Usage Pattern:**

```bash
# CLI
ffmperative do --prompt "merge subtitles 'captions.srt' with video 'video.mp4' calling it 'video_caps.mp4'"

# Compose clips
ffmperative compose --clips /path/to/clips --output video.mp4 --prompt "Edit for social media"
```

```python
from ffmperative import ffmp

ffmp("sample the 5th frame from '/path/to/video.mp4'")
```

**Resources:**

- ffmperative-7b: Fine-tuned LLaMA2 checkpoint
- Sample dataset on HuggingFace

**Verdict:** Novel approach - useful for natural language video editing interfaces

---

### 1.5 CapCut Mate - 剪映 API

**Repo:** `vendor/video-processing/capcut-mate/`
**License:** Not specified
**Language:** Python (FastAPI)

**What It Is:**
RESTful API for programmatically creating/editing CapCut (剪映) draft projects. Enables automation of CapCut workflows.

**Key Features:**

- Full draft management (create, save, export)
- All track types: video, audio, text, stickers, effects, filters
- Complex text with 花字 (fancy text) and bubbles
- Keyframe animation control
- Cloud rendering via OSS
- Coze plugin integration

**API Endpoints:**

```
POST /create_draft          - Create new project
POST /add_videos            - Add video clips
POST /add_audios            - Add audio tracks
POST /add_captions          - Add subtitles with keyword highlighting
POST /add_keyframes         - Create animations
POST /add_effects           - Apply visual effects
POST /gen_video             - Trigger cloud render
GET  /gen_video_status      - Check render progress
```

**Usage Pattern:**

```python
import requests

# Create draft
response = requests.post("http://localhost:30000/openapi/capcut-mate/v1/create_draft",
    json={"width": 1080, "height": 1920})
draft_id = response.json()["draft_id"]

# Add video
requests.post("http://localhost:30000/openapi/capcut-mate/v1/add_videos",
    json={
        "draft_url": f"...?draft_id={draft_id}",
        "video_infos": [{"url": "https://example.com/video.mp4", "start": 0, "end": 1000000}]
    })
```

**Verdict:** Powerful for CapCut/剪映 automation, especially in Chinese market

---

### 1.6 JianYing Protocol Service - 剪映 Low-Level API

**Repo:** `vendor/video-processing/jianying-protocol-service/`
**License:** Not specified
**Language:** Python (FastAPI)

**What It Is:**
Low-level HTTP API for 剪映 (JianYing/CapCut) draft protocol. More granular control than CapCut Mate.

**Key Features:**

- Track-level operations (video, audio, text, sticker, effect, filter)
- Segment management with precise timing
- Transform/keyframe control
- Complex text with 花字, bubbles, animations
- Color adjustment (temperature, saturation, brightness, contrast)
- Transition and animation effects
- OSS integration for media

**Architecture:**

```
┌─────────────────────────────────────┐
│     HTTP API Layer (FastAPI)        │
├─────────────────────────────────────┤
│     Business Logic Layer            │
│  - TaskManager                      │
│  - JianYingProject                  │
├─────────────────────────────────────┤
│     Protocol Layer                  │
│  - JianYingProtocol                 │
│  - Segment/Track/Material Handlers  │
├─────────────────────────────────────┤
│     Infrastructure Layer            │
│  - OSS Integration                  │
│  - File Management                  │
└─────────────────────────────────────┘
```

**Verdict:** Use when you need low-level CapCut draft control

---

## 2. Clipping Tools (7 repos)

### 2.1 FunClip ⭐ - AI Video Clipping

**Repo:** `vendor/clipping/FunClip/`
**License:** Apache-2.0 (FunASR)
**Language:** Python
**Source:** Alibaba DAMO Academy

**What It Is:**
Fully open-source, locally deployed automated video clipping tool. Uses Alibaba's industrial-grade ASR models + LLM for intelligent clipping.

**Key Features:**

- **Paraformer-Large ASR**: Best open-source Chinese ASR (13M+ downloads)
- **SeACo-Paraformer**: Hotword customization for entities/names
- **CAM++ Speaker Recognition**: Clip by speaker ID (e.g., "spk0", "spk0#spk3")
- **LLM Smart Clipping**: GPT/Qwen integration for intelligent selection
- **Multi-language**: Chinese + English (`python funclip/launch.py -l en`)
- **Automatic SRT**: Full video + target segment subtitles

**LLM Clipping Flow:**

1. ASR recognition generates SRT
2. Select LLM model + configure API key
3. Click "LLM Inference" - combines prompts with SRT
4. Click "AI Clip" - extracts timestamps from LLM output
5. Generate clips

**Usage Pattern:**

```bash
# Launch Gradio UI
python funclip/launch.py
# -l en for English
# -p xxx for custom port
# -s True for public access

# CLI mode
# Step 1: Recognize
python funclip/videoclipper.py --stage 1 \
    --file video.mp4 \
    --output_dir ./output

# Step 2: Clip
python funclip/videoclipper.py --stage 2 \
    --file video.mp4 \
    --output_dir ./output \
    --dest_text '我们把它跟乡村振兴去结合起来' \
    --start_ost 0 \
    --end_ost 100 \
    --output_file './output/res.mp4'
```

**Dependencies:**

- FunASR for Paraformer models
- FFmpeg + ImageMagick for subtitle embedding
- LLM API (Qwen/GPT) for smart clipping

**Verdict:** **CHAMPION for intelligent video clipping** - combines best-in-class Chinese ASR with LLM analysis

---

### 2.2 PySceneDetect - Scene Cut Detection

**Repo:** `vendor/clipping/pyscenedetect/`
**License:** BSD-3-Clause
**Language:** Python

**What It Is:**
Video scene cut detection and analysis tool. Identifies scene boundaries for automatic splitting.

**Key Features:**

- ContentDetector: Fast cut detection
- AdaptiveDetector: Handles camera movement better
- ThresholdDetector: Fade in/out detection
- FFmpeg/mkvmerge splitting integration
- CLI + Python API

**Usage Pattern:**

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Simple detection
scene_list = detect('my_video.mp4', ContentDetector())

# Print scenes
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

# Split video
split_video_ffmpeg('my_video.mp4', scene_list)
```

```bash
# CLI
scenedetect -i video.mp4 split-video
scenedetect -i video.mp4 save-images
scenedetect -i video.mp4 time -s 10s  # Skip first 10s
```

**Verdict:** Essential for scene-based video splitting

---

### 2.3 AI-Highlight-Clip - Automatic Highlights

**Repo:** `vendor/clipping/ai-highlight-clip/`
**License:** MIT
**Language:** Python (PyQt5)

**What It Is:**
Desktop app that automatically finds and clips highlight moments from long videos using Whisper + LLM analysis.

**Key Features:**

- OpenAI Whisper for transcription
- LLM scoring for "highlight potential"
- Automatic viral title generation
- Sliding window scanning (no missed moments)
- Batch processing (entire folder of videos)
- Dynamic subtitle embedding
- Cross-platform GUI (PyQt5)

**Workflow:**

1. Whisper transcription → timestamped subtitles
2. LLM analyzes each segment for "highlight index"
3. Smart filtering: TOP N by score, keyword density, overlap
4. Auto-generate viral titles
5. Clip with embedded subtitles

**Configuration:**

- 通义千问 (DashScope) API Key required
- Configurable: segment count, target duration, highlight keywords

**Verdict:** Excellent for automated highlight extraction from long-form content

---

### 2.4 AutoClipper - YouTube/Twitch Automation

**Repo:** `vendor/clipping/autoclipper/`
**License:** Not specified
**Language:** Python (FastAPI) + React

**What It Is:**
Automatically clips highlights from YouTube channels or live Twitch/Kick streams, generates subtitles, and uploads to YouTube.

**Architecture:**

- Backend: FastAPI + Celery workers
- Frontend: React dashboard
- Infrastructure: Docker Compose + Redis

**Features:**

- Live stream monitoring (Twitch/Kick)
- YouTube channel monitoring
- Automatic subtitle generation
- Auto-upload to target channel

**Deployment:** Google Cloud Run with Redis

**Verdict:** Full automation pipeline for stream highlights

---

### 2.5 Awesome Free OpusClip Alternatives

**Repo:** `vendor/clipping/awesome-free-opusclip-alternatives/`
**Type:** Curated list

**Key Insight:** Most AI clipping tools charge ~$30/month for only 90 minutes of upload credit.

**Comparison:**
| Tool | Free Plan | Monthly Cost |
|------|-----------|--------------|
| Reelify AI | 90 hours/mo | $0 (beta) |
| Vizard AI | 120 mins/mo | $30 |
| OpusClip | 60 mins/mo | $29 |
| GetMunch | 0 (paid only) | $49 |
| 2Short.ai | 15 mins/mo | $9.90 |

**Verdict:** Reference for competitive landscape

---

### 2.6 Video-AutoClip

**Repo:** `vendor/clipping/Video-AutoClip/`
**License:** MIT

Automatic stream highlight detection with smart video cutting. Node.js based with FFmpeg processing.

---

## 3. Capture Tools (3 repos)

### 3.1 Playwright ⭐ - Cross-Browser Automation

**Repo:** `vendor/capture/playwright/`
**License:** Apache-2.0
**Source:** Microsoft
**Language:** TypeScript/JavaScript + Python/.NET/Java

**What It Is:**
Framework for web testing and automation. Supports Chromium, Firefox, and WebKit with a single API.

**Key Features:**

- Cross-browser: Chromium 144, Firefox 145, WebKit 26
- Cross-platform: Windows, macOS, Linux
- Auto-wait: No artificial timeouts needed
- Trusted events: Real browser input pipeline
- Browser contexts: Full isolation per test
- Network interception
- Codegen: Record actions → generate tests
- Trace viewer: Debug with screenshots/DOM snapshots

**Usage Pattern:**

```typescript
import { test, devices } from '@playwright/test';

test('Page Screenshot', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await page.screenshot({ path: 'example.png' });
});

// Mobile emulation
test.use({
  ...devices['iPhone 13 Pro'],
  locale: 'en-US',
  geolocation: { longitude: 12.492507, latitude: 41.889938 },
  permissions: ['geolocation'],
});

// Network interception
test('Intercept requests', async ({ page }) => {
  await page.route('**', (route) => {
    console.log(route.request().url());
    route.continue();
  });
});
```

**Verdict:** **CHAMPION for product capture** - must-have for authentic UI recording

---

### 3.2 puppeteer-screen-recorder - Video Recording

**Repo:** `vendor/capture/puppeteer-screen-recorder/`
**License:** MIT
**Language:** TypeScript

**What It Is:**
Puppeteer plugin that uses native Chrome DevTools Protocol for video frame capture. No external dependencies for screen capture.

**Key Features:**

- Native CDP (no third-party plugins)
- Follow new tabs automatically
- Configurable FPS (up to 60)
- Auto-installs FFmpeg
- Multiple formats: MP4, AVI, WebM, MOV
- Stream output support
- No window object dependency

**Configuration:**

```javascript
const Config = {
  followNewTab: true,
  fps: 25,
  ffmpeg_Path: null, // Auto-install
  videoFrame: { width: 1024, height: 768 },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 1000,
  autopad: { color: 'black' },
  aspectRatio: '4:3',
  recordDurationLimit: 120, // seconds
};
```

**Usage Pattern:**

```javascript
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page);

  await recorder.start('./output/demo.mp4');
  await page.goto('https://example.com');
  await page.goto('https://test.com');
  await recorder.stop();

  await browser.close();
})();
```

**Limitations:**

- No audio recording (video only)
- No GIF support (image format)

**Verdict:** Best Puppeteer-based video capture

---

### 3.3 Screen Capture Patterns

**Repo:** `vendor/capture/screen-capture-patterns/`
**Type:** Reference patterns

Contains patterns for both Playwright and Puppeteer screen recording approaches.

---

## 4. Integration Recommendations

### 4.1 Recommended Stack for content-machine

```
Capture Layer:
├── Playwright (primary - product UI capture)
└── puppeteer-screen-recorder (fallback - when needed)

Processing Layer:
├── PySceneDetect (scene detection)
├── MoviePy (compositing, text overlays)
└── PyAV (low-level when needed)

Clipping Layer:
├── FunClip ⭐ (intelligent clipping with LLM)
└── AI-Highlight-Clip (highlight extraction)

Export Layer:
├── FFmpeg (final encoding)
└── CapCut Mate (optional - if CapCut ecosystem)
```

### 4.2 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Product Capture                          │
│  Playwright → record product interactions → raw video       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Scene Analysis                           │
│  PySceneDetect → identify cut points → scene list          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Intelligent Clipping                     │
│  FunClip → ASR + LLM analysis → highlight segments         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Composition                              │
│  MoviePy/Remotion → add captions, effects → final video    │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 FunClip Integration Example

```python
# content-machine FunClip integration concept

from funclip.videoclipper import VideoClipper

class ProductVideoClipper:
    def __init__(self, llm_api_key: str):
        self.clipper = VideoClipper()
        self.llm_api_key = llm_api_key

    async def process_product_demo(
        self,
        video_path: str,
        product_keywords: list[str],
        output_dir: str
    ) -> list[ClipResult]:
        # Step 1: ASR with product-specific hotwords
        transcription = await self.clipper.transcribe(
            video_path,
            language='en',
            hotwords=product_keywords
        )

        # Step 2: LLM analysis for highlight detection
        highlights = await self.analyze_with_llm(
            transcription,
            prompt=f"Find segments that demonstrate key features: {product_keywords}"
        )

        # Step 3: Generate clips
        clips = []
        for highlight in highlights:
            clip = await self.clipper.extract_segment(
                video_path,
                start=highlight.start,
                end=highlight.end,
                output=f"{output_dir}/{highlight.title}.mp4"
            )
            clips.append(clip)

        return clips
```

---

## 5. Key Insights

### 5.1 FunClip Advantages

1. **Industrial-Grade ASR**: Paraformer-Large has 13M+ downloads, best Chinese ASR
2. **Speaker Diarization**: Can clip specific speakers ("spk0")
3. **Hotword Customization**: Better recognition of product names, tech terms
4. **LLM Integration**: Built-in GPT/Qwen support for intelligent selection
5. **Fully Local**: No cloud dependency for core functionality

### 5.2 Playwright vs Puppeteer

| Feature           | Playwright                 | Puppeteer            |
| ----------------- | -------------------------- | -------------------- |
| Multi-browser     | ✅ Chromium/Firefox/WebKit | ❌ Chrome only       |
| Auto-wait         | ✅ Built-in                | ❌ Manual            |
| Trace viewer      | ✅ Excellent               | ⚠️ Basic             |
| Multi-language    | ✅ TS/Python/.NET/Java     | ⚠️ JS/TS only        |
| Video recording   | ✅ Built-in                | ⚠️ Requires plugin   |
| Microsoft support | ✅ Active                  | ⚠️ Google maintained |

**Verdict:** Use Playwright for new projects

### 5.3 MoviePy vs PyAV

| Use Case             | Tool            |
| -------------------- | --------------- |
| Quick prototyping    | MoviePy         |
| Text overlays        | MoviePy         |
| Custom effects       | MoviePy (numpy) |
| Maximum performance  | PyAV            |
| Streaming processing | PyAV            |
| Frame-level control  | PyAV            |

---

## 6. Related Deep Dives

- Deep Dive #44: Rendering, Captions & Audio Infrastructure
- Deep Dive #43: Infrastructure Foundations
- Deep Dive #10: short-video-maker-gyori (TypeScript + Remotion + MCP)

---

## 7. Next Steps

1. **Create capture pipeline prototype** using Playwright
2. **Integrate FunClip** for intelligent clipping
3. **Connect PySceneDetect** for scene analysis
4. **Build MoviePy composition layer** for final rendering
5. **Test end-to-end** with sample product demo

---

_Document generated during deep research session. Last updated: 2026-01-02_
