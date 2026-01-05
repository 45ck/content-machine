# Deep Dive #52: Clipping, Publishing, Video Processing & Workflow Automation

**Date:** 2026-01-02  
**Category:** Video Clipping, Social Publishing, Workflow Orchestration  
**Status:** Complete  
**Priority:** High - Critical Pipeline Components

---

## Executive Summary

This deep dive documents intelligent clipping tools (AI Highlight Clip, AutoClipper, FunClip), social media publishing automation (TiktokAutoUploader, RedNote→Instagram, YouTube automation), video processing utilities (CapCut Mate API, FFMPerative, puppeteer-screen-recorder), and workflow orchestration (AI Video Workflow). These tools form the automation backbone for end-to-end content production.

---

## Part 1: Intelligent Clipping Tools

### 1.1 AI Highlight Clip ⭐ BEST FOR HIGHLIGHT DETECTION

**Repository:** `vendor/clipping/ai-highlight-clip`  
**Technology:** Python (PyQt5, OpenAI Whisper, Qwen LLM)  
**License:** MIT  
**Interface:** Desktop GUI (Cross-platform)

#### What It Does

Automatically discovers and clips "highlight moments" from long-form videos (interviews, lectures, livestreams) using AI scoring.

#### Architecture

```
Long Video Input
       │
       ▼
┌─────────────────────────────┐
│   OpenAI Whisper ASR        │
│   (Multi-language support)  │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Sliding Window Algorithm  │
│   (No moment missed)        │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Qwen LLM Analysis         │
│   - "Highlight Index" Score │
│   - Viral Title Generation  │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Overlap Detection         │
│   - Filter duplicates       │
│   - Select TOP N            │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   FFmpeg Processing         │
│   - Clip extraction         │
│   - Subtitle embedding      │
└─────────────────────────────┘
       │
       ▼
Multiple Short Videos (output_clips/)
```

#### Key Features

| Feature               | Description                                  |
| --------------------- | -------------------------------------------- |
| **ASR Engine**        | OpenAI Whisper (multi-language, multi-model) |
| **AI Scoring**        | Qwen LLM for "highlight index" calculation   |
| **Title Generation**  | AI generates viral-style titles per clip     |
| **Sliding Window**    | Ensures no potential highlight missed        |
| **Keyword Filtering** | Prioritize clips with specified keywords     |
| **Smart Subtitles**   | Optimized line breaks and formatting         |
| **Batch Processing**  | Process entire directories (e.g., TV series) |

#### Configuration Options

| Parameter          | Description                            |
| ------------------ | -------------------------------------- |
| Number of Clips    | How many shorts to generate            |
| Target Duration    | Length per clip (seconds)              |
| Highlight Keywords | Comma-separated priority keywords      |
| Add Subtitles      | Embed captions in output               |
| Language           | Whisper ASR language                   |
| Model              | Whisper model size (accuracy vs speed) |

#### Real-World Example

> "One-click transformed 30 episodes of 4K drama "Flowers" (44GB) into 30 finance-related highlight clips"

#### Why It Matters for content-machine

- **Knowledge Content:** Perfect for educational/interview content
- **Keyword-Based Selection:** Can target specific topics
- **Batch Processing:** Handle entire content libraries
- **Chinese Support:** Important for broader market

---

### 1.2 AutoClipper (Cloud-Based)

**Repository:** `vendor/clipping/autoclipper`  
**Technology:** FastAPI + Celery + React  
**Deployment:** Google Cloud Run  
**License:** Open Source

#### What It Does

Automatically clips highlights from YouTube channels or live Twitch/Kick streams, generates subtitles, and uploads to target YouTube channel.

#### Architecture

```
┌───────────────────────────────────────────────────────┐
│                   Frontend (React)                     │
│          Configure source/target channels             │
└───────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│                Backend (FastAPI)                       │
│         Clipping + Subtitling + Upload Logic          │
└───────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│               Celery Workers + Redis                   │
│              Background job processing                 │
└───────────────────────────────────────────────────────┘
```

#### Cloud Deployment (GCP)

```bash
# Build and push containers
docker build -f backend/Dockerfile -t gcr.io/$PROJECT/auto-clipper-backend
docker build -f frontend/Dockerfile -t gcr.io/$PROJECT/auto-clipper-frontend

# Deploy to Cloud Run
gcloud run deploy auto-clipper-backend \
  --set-env-vars REDIS_URL=redis://<IP>:6379,\
  YOUTUBE_API_KEY=<key>,OPENAI_API_KEY=<key>
```

#### Why It Matters

- **Live Stream Clipping:** Real-time highlight extraction
- **YouTube Integration:** Direct upload capability
- **Scalable:** Cloud-native architecture

---

### 1.3 OpusClip Alternative Landscape

**Repository:** `vendor/clipping/awesome-free-opusclip-alternatives`  
**Type:** Curated list of AI clipping tools

#### Market Comparison (2025)

| Tool           | Free Limit | Cost/Month | Watermark | Best For        |
| -------------- | ---------- | ---------- | --------- | --------------- |
| **Reelify AI** | 90 hrs     | $0 (Beta)  | No        | High Volume     |
| Vizard AI      | 120 mins   | $30        | Yes       | Manual Editing  |
| OpusClip       | 60 mins    | $29        | Yes       | Polish/Captions |
| GetMunch       | 0 mins     | $49        | Yes       | Trend Analysis  |
| 2Short.ai      | 15 mins    | $9.90      | Yes       | YouTube URL     |
| Klap           | 1 video    | $29        | Yes       | Basic           |

#### Key Insight

> "Most older tools use expensive Legacy Models for every second of video. Newer tools like Reelify use 'Sparse Indexing' AI that costs 90% less."

---

## Part 2: Social Media Publishing Automation

### 2.1 go-youtube-reddit-automation

**Repository:** `vendor/publish/go-youtube-reddit-automation`  
**Technology:** Go  
**Database:** PostgreSQL

#### What It Does

Fully automated bot: Reddit → TTS → Images → Video → YouTube + Instagram upload. Zero human interaction.

#### Features

1. Pull all news of the day from Reddit
2. Filter and create 60s max video per news
3. Create video snippet with transitions
4. Generate "Breaking News" banner per story
5. Pull 2 related images per news
6. Add banner to video
7. Concatenate with intro and sound
8. Upload to YouTube and Instagram

#### Database Tracking

PostgreSQL tracks Reddit posts to:

- Never upload duplicates
- Enable sentiment analysis
- Store data for future AI training

---

### 2.2 RedNote→Instagram Auto-Uploader

**Repository:** `vendor/publish/rednote-instagram-auto-uploader`  
**Technology:** Python (instagrapi)  
**Platforms:** RedNote (Xiaohongshu) → Instagram

#### What It Does

Downloads videos from RedNote, preserves captions/hashtags, uploads to Instagram as Reels.

#### Features

| Feature              | Description                         |
| -------------------- | ----------------------------------- |
| Caption Preservation | Original captions + hashtags        |
| Continuous Mode      | Auto-check for new URLs             |
| Video Conversion     | Auto-convert for Instagram          |
| Smart Fallback       | Random hashtags if caption missing  |
| Chinese Support      | Handles Chinese characters + emojis |

#### Code Pattern

```python
# .env configuration
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
CONTINUOUS_MODE=true
CHECK_INTERVAL=3600

# CLI usage
python main.py --continuous --interval 3600
```

#### Current Limitations

- Some old/expired RedNote links may fail
- IP detection issues (residential IPs blocked occasionally)

---

### 2.3 TiktokAutoUploader

**Repository:** `vendor/publish/TiktokAutoUploader`  
**Status:** Documented in DD-047

Key for automated TikTok publishing workflow.

---

## Part 3: Video Processing Utilities

### 3.1 CapCut Mate API ⭐ INTEGRATION GEM

**Repository:** `vendor/video-processing/capcut-mate`  
**Technology:** Python (FastAPI, Pydantic)  
**Platform:** CapCut/JianYing (Chinese version)

#### What It Does

API for automating CapCut/JianYing video editing. Can be deployed as Coze plugin for AI-powered video creation.

#### API Endpoints

**Draft Management:**
| Endpoint | Function |
|----------|----------|
| `create_draft` | Create new project with canvas size |
| `save_draft` | Persist current state |
| `get_draft` | Retrieve draft details |

**Media Handling:**
| Endpoint | Function |
|----------|----------|
| `add_videos` | Batch video with crop/scale/effects |
| `add_images` | Batch images with animation |
| `add_audios` | Audio with volume/fade |
| `add_sticker` | Decorative stickers |

**Text & Captions:**
| Endpoint | Function |
|----------|----------|
| `add_captions` | Subtitles with keyword highlight |
| `add_text_style` | Rich text styling |

**Effects & Animation:**
| Endpoint | Function |
|----------|----------|
| `add_effects` | Filters, borders, dynamics |
| `add_keyframes` | Position/scale/rotation animation |
| `add_masks` | Shape masks for visibility control |
| `get_text_animations` | Available text animations |
| `get_image_animations` | Available image animations |

**Video Generation:**
| Endpoint | Function |
|----------|----------|
| `gen_video` | Submit render task (async) |
| `gen_video_status` | Query render progress |
| `easy_create_material` | One-call multi-material add |

#### Usage Example

```bash
# Create draft
curl -X POST "http://localhost:30000/openapi/capcut-mate/v1/create_draft" \
  -H "Content-Type: application/json" \
  -d '{"width": 1080, "height": 1920}'

# Add video
curl -X POST "http://localhost:30000/openapi/capcut-mate/v1/add_videos" \
  -d '{
    "draft_url": "...",
    "video_infos": [{
      "url": "https://example.com/video.mp4",
      "start": 0,
      "end": 1000000
    }]
  }'
```

#### Why It Matters

- **CapCut Integration:** Leverage popular editing platform programmatically
- **Coze Plugin Ready:** Deploy as AI assistant plugin
- **Cloud Rendering:** Offload rendering to CapCut servers

---

### 3.2 FFMPerative ⭐ NATURAL LANGUAGE VIDEO EDITING

**Repository:** `vendor/video-processing/FFMPerative`  
**Technology:** Python (LLM-powered FFmpeg)  
**Model:** LLaMA2 fine-tuned (ffmperative-7b)

#### What It Does

Chat-based video editing copilot. Describe edits in natural language.

#### Capabilities

- Change speed, resize, crop, flip, reverse
- Speech-to-text transcription
- Closed captions
- Video composition from clips

#### Usage Patterns

**CLI:**

```bash
# Add closed captions
ffmperative do --prompt "merge subtitles 'captions.srt' with video 'video.mp4' calling it 'video_caps.mp4'"

# Compose clips
ffmperative compose --clips /path/to/dir --output my_video.mp4 --prompt "Edit for social media"
```

**Python:**

```python
from ffmperative import ffmp

ffmp("sample the 5th frame from '/path/to/video.mp4'")
```

#### Why It Matters

- **Natural Language Interface:** No FFmpeg expertise needed
- **LLM-Powered:** Can understand complex editing instructions
- **Composable:** Build editing pipelines from descriptions

---

### 3.3 puppeteer-screen-recorder

**Repository:** `vendor/capture/puppeteer-screen-recorder`  
**Technology:** TypeScript (Puppeteer plugin)  
**Protocol:** Chrome DevTools Protocol

#### What It Does

Records video from Puppeteer-controlled browser using native Chrome DevTools screencast protocol. Frame-by-frame capture.

#### Key Features

| Feature            | Description                         |
| ------------------ | ----------------------------------- |
| `followNewTab`     | Follow pages opened by current page |
| FPS Control        | Configurable frame rate             |
| Resolution         | Custom video frame dimensions       |
| FFmpeg Integration | Path configuration                  |

#### Configuration

```typescript
const Config = {
  followNewTab: true,
  fps: 25,
  ffmpeg_Path: '<path>' || null,
  videoFrame: {
    width: 1024,
    height: 768,
  },
};
```

#### Why It Matters

- **Product Demos:** Record actual UI interactions
- **Native Protocol:** Reliable frame capture
- **Follow Navigation:** Capture multi-page flows

---

## Part 4: Workflow Orchestration

### 4.1 AI Video Workflow ⭐ FULL PIPELINE

**Repository:** `vendor/orchestration/ai-video-workflow`  
**Technology:** Python (GUI)  
**Models:** LibLibAI + Jimeng (I2V + Music) + Doubao

#### What It Does

Full AI-native video creation pipeline: Text→Image→Video→Music→Final Composition.

#### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Video Workflow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Doubao LLM  │───▶│   LibLibAI   │───▶│  Jimeng Image    │   │
│  │  (Prompts)   │    │  (Text→Img)  │    │  to Video (I2V)  │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│         │                                         │              │
│         │                                         ▼              │
│         │            ┌──────────────┐    ┌──────────────────┐   │
│         └───────────▶│ Jimeng Music │───▶│     FFmpeg       │   │
│                      │ (Text→Music) │    │  (Composition)   │   │
│                      └──────────────┘    └──────────────────┘   │
│                                                   │              │
│                                                   ▼              │
│                                          Final Video Output      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Features

| Stage           | Technology   | Description                              |
| --------------- | ------------ | ---------------------------------------- |
| **Prompts**     | Doubao LLM   | Generate image/music prompts from themes |
| **Text→Image**  | LibLibAI     | Checkpoint + LoRA support                |
| **Image→Video** | Jimeng I2V   | Smooth animation from stills             |
| **Text→Music**  | Jimeng Music | Style/mood/instrument control            |
| **Composition** | FFmpeg       | Merge video + audio                      |

#### Preset Themes

Built-in prompt generators for:

- "Beauty" (beach, gym, fashion)
- "Labubu" (candy, magic, cute)
- Custom themes

#### Why It Matters

- **Full AIGC Pipeline:** Text→Final Video in one tool
- **Chinese AI Ecosystem:** Leverages local models
- **Prompt Assistance:** LLM helps generate professional prompts

---

## Part 5: Subtitle & Caption Tools

### 5.1 auto-subtitle-generator

**Repository:** `vendor/captions/auto-subtitle-generator`  
**Technology:** Python (MoviePy, Whisper)  
**Style:** Instagram Reels / TikTok / YouTube Shorts format

#### Features

- GUI interface
- Configurable font color, size, style
- Y-position customization
- Center text alignment

#### TODO (from repo)

- Word-level timestamps (WhisperX/stable-ts integration planned)
- Background color option
- Preview before render

---

### 5.2 Captacity (Previously Documented)

Simple but effective: Whisper + MoviePy for caption burning.

Key options:

```python
captacity.add_captions(
    video_file="my_short.mp4",
    font="/path/to/font.ttf",
    font_size=130,
    highlight_current_word=True,
    word_highlight_color="red",
)
```

---

## Part 6: Technology Comparison Matrix

### Clipping Tools

| Tool              | AI Model       | GUI        | Batch      | Cloud  | Best For          |
| ----------------- | -------------- | ---------- | ---------- | ------ | ----------------- |
| AI Highlight Clip | Qwen + Whisper | ✅ Desktop | ✅ Yes     | ❌ No  | Knowledge content |
| AutoClipper       | OpenAI         | ✅ React   | ⚠️ Limited | ✅ GCP | Live streams      |
| FunClip           | Qwen           | ✅ Gradio  | ❌ No      | ❌ No  | Precise segments  |
| Clip Anything     | Vadoo API      | ❌ No      | ❌ No      | ✅ Yes | Multimodal        |

### Publishing Tools

| Tool               | Source    | Target    | Auto-Upload | Database   |
| ------------------ | --------- | --------- | ----------- | ---------- |
| go-youtube-reddit  | Reddit    | YT + IG   | ✅ Yes      | PostgreSQL |
| RedNote-Instagram  | RedNote   | Instagram | ✅ Yes      | File-based |
| TiktokAutoUploader | Any       | TikTok    | ✅ Yes      | None       |
| gemini-youtube     | Generated | YouTube   | ✅ Yes      | None       |

### Video Processing

| Tool                      | Interface  | LLM-Powered | Platform        |
| ------------------------- | ---------- | ----------- | --------------- |
| CapCut Mate API           | REST API   | ❌ No       | CapCut/JianYing |
| FFMPerative               | CLI/Python | ✅ Yes      | FFmpeg          |
| MoviePy                   | Python     | ❌ No       | Any             |
| puppeteer-screen-recorder | TS Library | ❌ No       | Browser         |

---

## Part 7: Recommendations for content-machine

### Clipping Pipeline

```
Long-Form Content
        │
        ▼
┌─────────────────────────────────┐
│    AI Highlight Clip Pattern    │
│    - Whisper transcription      │
│    - LLM scoring (highlight)    │
│    - Sliding window             │
│    - TOP N selection            │
└─────────────────────────────────┘
        │
        ▼
WhisperX Word-Level Timestamps
        │
        ▼
Remotion Rendering (with captions)
```

### Publishing Pipeline

```
Rendered Video
        │
        ├─────────────────────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐           ┌───────────────┐
│  TikTok       │           │  YouTube      │
│  Uploader     │           │  API          │
└───────────────┘           └───────────────┘
        │                             │
        └─────────────────────────────┘
                    │
                    ▼
            Mixpost Scheduling
            (multi-platform)
```

### Screen Capture Pipeline

```
Playwright + puppeteer-screen-recorder
        │
        ▼
Raw UI Recording (WebM/MP4)
        │
        ▼
FFMPerative Post-Processing
  "Crop to 9:16, add captions"
        │
        ▼
Remotion Final Composition
```

---

## Appendix A: Code Patterns Library

### Pattern 1: AI Highlight Scoring

```python
# From AI Highlight Clip pattern
def score_highlights(transcript_segments, keywords):
    scores = []
    for segment in transcript_segments:
        # Base score from LLM analysis
        base_score = llm_analyze_engagement(segment.text)

        # Keyword bonus
        keyword_bonus = sum(
            1 for kw in keywords
            if kw.lower() in segment.text.lower()
        )

        scores.append({
            "segment": segment,
            "score": base_score + keyword_bonus,
            "start": segment.start,
            "end": segment.end
        })

    # Remove overlapping segments
    filtered = remove_overlaps(scores)

    # Return top N
    return sorted(filtered, key=lambda x: x["score"], reverse=True)[:TOP_N]
```

### Pattern 2: FFMPerative Natural Language

```python
from ffmperative import ffmp

# Resize for TikTok
ffmp("resize 'input.mp4' to 1080x1920 calling it 'tiktok.mp4'")

# Add captions
ffmp("merge subtitles 'captions.srt' with 'tiktok.mp4' calling it 'final.mp4'")

# Speed up boring parts
ffmp("speed up 'video.mp4' by 2x calling it 'fast.mp4'")
```

### Pattern 3: CapCut Mate API Integration

```python
import requests

BASE_URL = "http://localhost:30000/openapi/capcut-mate/v1"

# Create draft
draft = requests.post(f"{BASE_URL}/create_draft", json={
    "width": 1080,
    "height": 1920
}).json()

# Add video with effects
requests.post(f"{BASE_URL}/add_videos", json={
    "draft_url": draft["url"],
    "video_infos": [{
        "url": "https://example.com/clip.mp4",
        "start": 0,
        "end": 30000000  # 30 seconds in microseconds
    }]
})

# Add captions with keyword highlight
requests.post(f"{BASE_URL}/add_captions", json={
    "draft_url": draft["url"],
    "captions": [
        {"text": "This is amazing content!", "start": 0, "end": 3000000}
    ],
    "keyword_highlight": ["amazing"]
})

# Generate video
task = requests.post(f"{BASE_URL}/gen_video", json={
    "draft_url": draft["url"]
}).json()

# Poll for completion
while True:
    status = requests.get(f"{BASE_URL}/gen_video_status", params={
        "task_id": task["task_id"]
    }).json()
    if status["status"] == "completed":
        download_url = status["video_url"]
        break
```

### Pattern 4: puppeteer-screen-recorder

```typescript
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const recorder = new PuppeteerScreenRecorder(page, {
  followNewTab: true,
  fps: 30,
  videoFrame: { width: 1920, height: 1080 },
});

await recorder.start('./product-demo.mp4');

// Perform UI interactions
await page.goto('https://product.example.com');
await page.click('#start-button');
await page.waitForTimeout(5000);

await recorder.stop();
await browser.close();
```

---

## Appendix B: Integration Roadmap

### Phase 1: Core Clipping

- Integrate AI Highlight Clip scoring algorithm
- Connect WhisperX for word-level timestamps
- Build highlight selection API

### Phase 2: Publishing

- Implement TikTok uploader (unofficial API)
- Setup YouTube Data API integration
- Add Mixpost for scheduling

### Phase 3: Capture

- Integrate puppeteer-screen-recorder
- Build product demo capture workflow
- Add FFMPerative post-processing

### Phase 4: Advanced Processing

- Evaluate CapCut Mate for cloud rendering
- Implement natural language editing commands
- Build batch processing pipeline

---

## Conclusion

This deep dive documents critical tools for:

1. **Intelligent Clipping:** AI Highlight Clip provides the best pattern for highlight detection with LLM scoring
2. **Publishing:** Multiple platforms covered (TikTok, YouTube, Instagram, RedNote)
3. **Video Processing:** FFMPerative's natural language approach is innovative
4. **Screen Capture:** puppeteer-screen-recorder for product demo recording
5. **Workflow:** AI Video Workflow shows full AIGC pipeline

**Key Decisions:**

- Use AI Highlight Clip scoring pattern (Whisper + LLM)
- Implement puppeteer-screen-recorder for UI capture
- Consider FFMPerative for natural language post-processing
- Multi-platform publishing via TiktokAutoUploader + YouTube API

---

_Document created as part of content-machine deep research initiative_
