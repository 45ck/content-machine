# Deep Dive #85: Clipping & Publishing Ecosystem
**Date:** 2026-01-02
**Category:** Clipping & Distribution
**Priority:** HIGH - Content Pipeline Automation

---

## Executive Summary

This deep dive analyzes the clipping and publishing tools in vendor/, covering the complete lifecycle from long-form content to social media distribution. The clipping ecosystem includes AI-powered highlight detection (FunClip, AI-Highlight-Clip), scene detection (PySceneDetect), and auto-clipping services (AutoClipper). The publishing ecosystem spans TikTok (TiktokAutoUploader), YouTube (youtube-upload), Instagram (rednote-uploader), and cross-platform management (Mixpost). Together, these tools enable content-machine to implement automated content repurposing and multi-platform distribution.

---

## 1. AI-Powered Clipping: FunClip

### Architecture Overview

**FunClip** is Alibaba DAMO Academy's open-source AI clipping tool combining speech recognition, speaker diarization, and LLM-powered highlight extraction.

```
FunClip Pipeline:
┌────────────────────────────────────────────────────────────┐
│                      Video Input                            │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│              FunASR (Paraformer-Large)                     │
│  • Industrial-grade Chinese ASR (13M+ downloads)           │
│  • Accurate timestamp prediction                           │
│  • Hotword customization (SeACo-Paraformer)                │
│  • Speaker diarization (CAM++ model)                       │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                 LLM Analysis (v2.0)                         │
│  • Qwen series, GPT series integration                     │
│  • Custom prompts for highlight detection                  │
│  • Timestamp extraction from LLM output                    │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                  Clip Generation                            │
│  • Multi-segment free clipping                             │
│  • Full video SRT + target segment SRT                     │
│  • Optional embedded subtitles (imagemagick)               │
└────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Paraformer-Large** | Best open-source Chinese ASR, 13M+ downloads |
| **Hotword Customization** | Boost recognition of specific terms, names |
| **Speaker Diarization** | CAM++ model for speaker ID (clip by speaker) |
| **LLM Integration** | Qwen/GPT for intelligent highlight detection |
| **Multi-language** | Chinese + English support (`-l en`) |
| **Gradio UI** | Local web interface or Modelscope/HuggingFace |

### Usage Patterns

```bash
# Start local Gradio server
python funclip/launch.py
# For English: python funclip/launch.py -l en

# CLI: Recognition step
python funclip/videoclipper.py --stage 1 \
    --file video.mp4 \
    --output_dir ./output

# CLI: Clipping step  
python funclip/videoclipper.py --stage 2 \
    --file video.mp4 \
    --output_dir ./output \
    --dest_text 'The specific text segment to clip' \
    --start_ost 0 \
    --end_ost 100 \
    --output_file './output/result.mp4'
```

### LLM-Based AI Clipping Workflow

1. Run speech recognition on video
2. Select LLM model (Qwen/GPT) and configure API key
3. Click "LLM Inference" - combines prompts with SRT subtitles
4. Click "AI Clip" - extracts timestamps from LLM output
5. Customize prompts for different highlight types

---

## 2. AI Highlight Clip: Desktop Application

### Architecture

**AI Highlight Clip** is a PyQt5 desktop application for automated highlight extraction using Whisper + LLM scoring.

```
AI Highlight Clip Pipeline:
┌─────────────────────────────────────────────────────────────┐
│                     Long Video Input                         │
│        (Interviews, courses, livestreams, TV series)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               OpenAI Whisper ASR                             │
│  Multi-language │ Timestamped transcription                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Sliding Window Segmentation                        │
│  No missed content │ Overlapping analysis                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│        LLM Scoring (Tongyi Qwen / DashScope)                │
│  "Highlight Index" scoring │ Viral potential analysis        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Intelligent Filtering                           │
│  • AI score threshold                                        │
│  • Keyword density                                           │
│  • Content overlap detection                                 │
│  • TOP N selection                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Output Generation                            │
│  • Individual clip files                                     │
│  • AI-generated viral titles                                 │
│  • Optional embedded subtitles                               │
└─────────────────────────────────────────────────────────────┘
```

### Features

- **Batch Processing:** Process entire directories (e.g., 30-episode TV series)
- **LLM Title Generation:** Auto-generate viral short-form titles
- **Smart Subtitle Processing:** Sentence optimization, custom fonts
- **Configurable Parameters:**
  - Target clip count
  - Target duration per clip
  - Highlight keywords
  - Subtitle embedding toggle

### Example Use Case

> "一键将 30 集 4K 电视剧《繁花》（44GB）剪辑成 30 个金融相关的高光片段"
> (One-click: Convert 30-episode 4K TV series into 30 finance-related highlight clips)

---

## 3. PySceneDetect: Scene Detection Foundation

### Core Capabilities

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Simple detection
scene_list = detect('video.mp4', ContentDetector())

# Iterate scenes
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

# Auto-split with FFmpeg
split_video_ffmpeg('video.mp4', scene_list)
```

### Detection Algorithms

| Detector | Use Case | Notes |
|----------|----------|-------|
| **ContentDetector** | Fast cuts | Frame-by-frame comparison |
| **AdaptiveDetector** | Camera movement | Two-pass, handles motion |
| **ThresholdDetector** | Fade in/out | Luminance-based |

### CLI Usage

```bash
# Split video on fast cuts
scenedetect -i video.mp4 split-video

# Save frames from each cut
scenedetect -i video.mp4 save-images

# Skip first 10 seconds
scenedetect -i video.mp4 time -s 10s
```

### Integration with content-machine

```python
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector

def get_scene_boundaries(video_path, threshold=27.0):
    """Get scene boundaries for highlight extraction."""
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))
    scene_manager.detect_scenes(video, show_progress=True)
    return scene_manager.get_scene_list()

# Use scenes to inform clipping decisions
scenes = get_scene_boundaries('input.mp4')
for scene in scenes:
    start_time = scene[0].get_seconds()
    end_time = scene[1].get_seconds()
    # Analyze scene content with LLM...
```

---

## 4. AutoClipper: Cloud-Deployed Highlight Service

### Architecture

```
AutoClipper (Google Cloud Run):
┌────────────────────────────────────────────────────────────┐
│                  React Frontend                             │
│  Configure source channels │ Target YouTube channel         │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                FastAPI Backend                              │
│  Channel monitoring │ Highlight detection                   │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│               Celery Workers (Redis)                        │
│  Async clipping │ Subtitle generation │ Upload              │
└────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ YouTube Sources  │ │ Twitch/Kick Live │ │ Target Channel   │
│ Monitor channels │ │ Stream clipping  │ │ Auto-upload      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Deployment

```bash
# Enable GCP services
gcloud services enable run.googleapis.com cloudbuild.googleapis.com redis.googleapis.com

# Create Redis instance
gcloud redis instances create auto-clipper-redis \
    --size=1 --tier=basic --region=us-central1

# Build and deploy backend
docker build -f backend/Dockerfile -t gcr.io/$PROJECT/auto-clipper-backend .
docker push gcr.io/$PROJECT/auto-clipper-backend

gcloud run deploy auto-clipper-backend \
    --image gcr.io/$PROJECT/auto-clipper-backend \
    --set-env-vars REDIS_URL=redis://<IP>:6379,YOUTUBE_API_KEY=...,OPENAI_API_KEY=...
```

---

## 5. TiktokAutoUploader: Request-Based Upload

### Key Innovation

Uses **HTTP requests** instead of Selenium - uploads complete in ~3 seconds vs minutes with browser automation.

```
TiktokAutoUploader v2.0:
┌────────────────────────────────────────────────────────────┐
│                     CLI Interface                           │
│  login │ upload │ show                                      │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│               Cookie Management                             │
│  Multi-account support │ Local storage                      │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│           TikTok Signature (Node.js)                        │
│  Request signing │ API authentication                       │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                Direct API Upload                            │
│  • Video file upload                                        │
│  • Schedule up to 10 days ahead                             │
│  • Title/description/tags                                   │
└────────────────────────────────────────────────────────────┘
```

### Usage

```bash
# Login and save cookies
python cli.py login -n my_account

# Upload from file
python cli.py upload --user my_account -v "video.mp4" -t "Video Title"

# Upload from YouTube Shorts
python cli.py upload --user my_account -yt "https://youtube.com/shorts/xxx" -t "Title"

# Show saved accounts
python cli.py show -c

# Show local videos
python cli.py show -v
```

### Features

| Feature | Status |
|---------|--------|
| Request-based (no Selenium) | ✅ |
| Multi-account support | ✅ |
| Schedule 10 days ahead | ✅ |
| YouTube Shorts sourcing | ✅ |
| Upload speed | ~3 seconds |

---

## 6. Mixpost: Social Media Management Platform

### Platform Overview

**Mixpost** is a self-hosted social media management platform supporting multi-platform scheduling, analytics, and team collaboration.

```
Mixpost Architecture:
┌─────────────────────────────────────────────────────────────┐
│                    Web Dashboard                             │
│  Content creation │ Scheduling │ Analytics │ Teams          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Laravel Backend                              │
│  API │ Queue processing │ OAuth management                   │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌─────────────┬─────┼─────┬─────────────┐
          ▼             ▼           ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Facebook   │ │   Twitter    │ │   LinkedIn   │ │   TikTok     │
│   Instagram  │ │   (X)        │ │   Pages      │ │   Pinterest  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Key Features

- **Multi-Platform Scheduling:** Queue and calendar management
- **Post Versions:** Tailored content per platform
- **Media Library:** Reusable assets, stock image integration
- **Team Workspaces:** Collaboration, task assignment
- **Analytics:** Platform-specific insights
- **Templates:** Reusable post templates
- **Dynamic Variables:** Auto-inserted text
- **Hashtag Groups:** Organized hashtag strategies

### Target Users

- Marketing agencies
- SMBs
- E-commerce stores
- Solopreneurs
- Content creators

---

## 7. YouTube Upload: Python SDK

### Official API Integration

```python
from youtube_upload.client import YoutubeUploader

# Initialize with credentials
uploader = YoutubeUploader(client_id, client_secret)
# Or from client_secrets.json
uploader = YoutubeUploader()

# Authenticate (opens browser first time)
uploader.authenticate()
# Or with tokens
uploader.authenticate(access_token=token, refresh_token=refresh)

# Upload video
options = {
    "title": "My Video Title",
    "description": "Video description here",
    "tags": ["tag1", "tag2", "tag3"],
    "categoryId": "22",  # People & Blogs
    "privacyStatus": "private",  # public, private, unlisted
    "kids": False,
    "thumbnailLink": "https://example.com/thumb.jpg"
}

uploader.upload("video.mp4", options)
uploader.close()
```

### Setup Requirements

1. Create project in [Google Cloud Console](https://console.developers.google.com)
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Download `client_secrets.json`
5. Scope: `https://www.googleapis.com/auth/youtube.upload`

---

## 8. RedNote to Instagram Uploader

### Cross-Platform Content Flow

```python
# Environment setup (.env)
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
CONTINUOUS_MODE=true
CHECK_INTERVAL=3600

# CLI usage
python main.py                    # Process once
python main.py --continuous       # Monitor for new URLs
python main.py --interval 1800    # Check every 30 minutes
```

### Pipeline

1. **Input:** `urls.txt` with RedNote video URLs
2. **Download:** Fetch video from RedNote (Xiaohongshu)
3. **Process:** Format conversion for Instagram compatibility
4. **Caption:** Preserve original captions/hashtags (with fallback)
5. **Upload:** Post as Instagram Reels via instagrapi

### Dependencies

- **instagrapi:** Instagram API library
- **ffmpeg:** Video format conversion
- **moviepy 1.0.3:** Specific version for compatibility

---

## 9. Clipping Strategy Matrix

| Tool | Method | Speed | Quality | LLM Integration |
|------|--------|-------|---------|-----------------|
| **FunClip** | ASR + LLM | Medium | High | ✅ Qwen/GPT |
| **AI Highlight Clip** | Whisper + LLM | Slow | High | ✅ Tongyi |
| **PySceneDetect** | Visual analysis | Fast | Basic | ❌ |
| **AutoClipper** | Cloud async | Fast | Medium | ✅ OpenAI |

### Recommended Strategy

```
content-machine Clipping Pipeline:
┌────────────────────────────────────────────────────────────┐
│                    Long-form Content                        │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│          Step 1: Scene Detection (PySceneDetect)           │
│  Fast visual segmentation │ Scene boundaries                │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│         Step 2: ASR Transcription (FunClip/Whisper)        │
│  Timestamped transcript │ Speaker diarization               │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│       Step 3: LLM Highlight Scoring (Content Agent)        │
│  Viral potential │ Topic relevance │ Engagement prediction  │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│              Step 4: Clip Extraction (FFmpeg)              │
│  Precise cuts │ Format optimization │ Caption embedding     │
└────────────────────────────────────────────────────────────┘
```

---

## 10. Publishing Strategy Matrix

| Platform | Tool | Method | Scheduling | Multi-Account |
|----------|------|--------|------------|---------------|
| **TikTok** | TiktokAutoUploader | Requests | 10 days | ✅ |
| **YouTube** | youtube-upload | OAuth API | ❌ | ✅ |
| **Instagram** | rednote-uploader | instagrapi | ❌ | ❌ |
| **Multi-Platform** | Mixpost | OAuth | ✅ Calendar | ✅ Teams |

### Recommended Architecture

```
content-machine Publishing Router:
┌─────────────────────────────────────────────────────────────┐
│                   Rendered Video + Metadata                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Platform Optimizer                         │
│  • Aspect ratio adjustment (9:16, 1:1, 16:9)                │
│  • Duration validation (TikTok: 60s, Shorts: 60s)           │
│  • Caption formatting                                        │
│  • Hashtag strategy per platform                            │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌─────────────┬─────┼─────┬─────────────┐
          ▼             ▼           ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ TikTok       │ │ YouTube      │ │ Instagram    │ │ Mixpost      │
│ Uploader     │ │ Shorts       │ │ Reels        │ │ Multi-Plat   │
│ (Requests)   │ │ (API)        │ │ (instagrapi) │ │ (Scheduled)  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 11. Implementation Recommendations

### Immediate (Week 1)

1. **Integrate PySceneDetect** - Scene boundary detection
2. **Setup FunClip** - ASR + LLM clipping foundation
3. **Define PublishSpec schema** - Platform-agnostic publish config

### Short-term (Week 2-3)

4. **TiktokAutoUploader integration** - Fastest upload path
5. **YouTube upload wrapper** - OAuth flow handling
6. **Clipping agent** - LLM-powered highlight detection

### Medium-term (Month 1)

7. **Mixpost evaluation** - Full multi-platform scheduling
8. **AutoClipper patterns** - Cloud-based async processing
9. **Analytics integration** - Performance tracking

---

## 12. Cross-Reference Matrix

| Tool | Clipping | Publishing | LLM | Cloud | Open Source |
|------|----------|------------|-----|-------|-------------|
| FunClip | ✅ ASR+LLM | ❌ | ✅ Qwen/GPT | ❌ | ✅ Alibaba |
| AI Highlight Clip | ✅ Whisper | ❌ | ✅ Tongyi | ❌ | ✅ MIT |
| PySceneDetect | ✅ Visual | ❌ | ❌ | ❌ | ✅ BSD-3 |
| AutoClipper | ✅ | ✅ YouTube | ✅ | ✅ GCP | ✅ |
| TiktokAutoUploader | ❌ | ✅ TikTok | ❌ | ❌ | ✅ |
| youtube-upload | ❌ | ✅ YouTube | ❌ | ❌ | ✅ |
| rednote-uploader | ❌ | ✅ Instagram | ❌ | ❌ | ✅ MIT |
| Mixpost | ❌ | ✅ Multi | ❌ | Self-host | ✅ MIT |

---

## Appendix: Platform Specifications

### Video Requirements

| Platform | Max Duration | Aspect Ratio | Max Size |
|----------|--------------|--------------|----------|
| TikTok | 10 min | 9:16 (vertical) | 287.6 MB |
| YouTube Shorts | 60 seconds | 9:16 (vertical) | 500 MB |
| Instagram Reels | 90 seconds | 9:16 (vertical) | 4 GB |
| LinkedIn | 10 min | 9:16, 1:1, 16:9 | 5 GB |

### Optimal Posting Times (General)

| Platform | Best Times (US) |
|----------|-----------------|
| TikTok | 7-9 AM, 12-3 PM, 7-9 PM |
| YouTube | 2-4 PM (Thu-Sat) |
| Instagram | 11 AM - 1 PM, 7-9 PM |

---

**Related Deep Dives:**
- DD-084: Video Composition & Rendering Infrastructure
- DD-045: Video Processing, Clipping & Capture
- DD-055: Audio/TTS, Captions & Publishing
- DD-052: Clipping, Publishing & Video Processing
