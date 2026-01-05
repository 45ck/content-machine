# Deep Dive: Video Generation Pipeline Patterns & Tools

> **Document ID:** `video-generation-pipeline-patterns-DEEP-20260102`
> **Date:** 2026-01-02
> **Category:** Research Deep Dive
> **Status:** Complete

---

## Executive Summary

This document analyzes 30+ video generation tools from the vendored repositories, extracting common patterns, architectures, and integration approaches. The goal is to identify best practices for the content-machine pipeline.

---

## 1. Pipeline Architecture Patterns

### 1.1 Universal Pipeline Structure

All analyzed video generators follow a similar high-level pattern:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Content     │ ──▶ │  Media       │ ──▶ │  Assembly    │ ──▶ │  Export      │
│  Generation  │     │  Acquisition │     │  & Rendering │     │  & Publish   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │                     │
     ▼                     ▼                     ▼                     ▼
   Script               Images               Composition           Platform
   Title                Video clips          Audio + Video         Upload
   Description          Audio/TTS            Subtitles             Metadata
   Hashtags             Background           Effects
```

### 1.2 Common Technology Stacks

| Project                     | Language   | Render Engine | TTS          | ASR      | LLM      |
| --------------------------- | ---------- | ------------- | ------------ | -------- | -------- |
| **short-video-maker-gyori** | TypeScript | Remotion      | ElevenLabs   | Whisper  | OpenAI   |
| **vidosy**                  | TypeScript | Remotion      | -            | -        | -        |
| **Crank**                   | Python     | FFmpeg        | Whisper      | Whisper  | Gemini   |
| **VideoGraphAI**            | Python     | FFmpeg        | F5-TTS       | Gentle   | Groq     |
| **Autotube**                | Python     | FFmpeg        | OpenTTS      | -        | Ollama   |
| **Cassette**                | Python     | MoviePy       | UnrealSpeech | -        | GPT-3.5  |
| **OBrainRot**               | Python     | FFmpeg        | Coqui xTTS   | wav2vec2 | -        |
| **FunClip**                 | Python     | FFmpeg        | -            | FunASR   | Qwen/GPT |
| **MoneyPrinterTurbo**       | Python     | MoviePy       | EdgeTTS      | -        | GPT      |
| **ShortGPT**                | Python     | MoviePy       | EdgeTTS      | Whisper  | GPT      |

### 1.3 Key Observations

1. **FFmpeg is Universal** - Every project uses FFmpeg for final rendering/encoding
2. **Python Dominates** - 80%+ of projects are Python-based
3. **Remotion for Quality** - TypeScript projects use Remotion for advanced rendering
4. **EdgeTTS Popular** - Free, 30+ languages, used in many projects
5. **Whisper Standard** - De facto ASR solution across all projects

---

## 2. Project-by-Project Analysis

### 2.1 Crank (Complete YouTube Shorts Pipeline)

**Location:** `vendor/Crank`
**Language:** Python
**License:** Custom

**Pipeline:**

1. Topic → Gemini generates transcript
2. Transcript → Whisper for TTS audio + timestamps
3. YouTube scraping for background video
4. FFmpeg assembly with subtitles
5. Auto-upload to YouTube with metadata

**Key Configuration:**

```yaml
# config/preset.yml
NAME: 'Channel Name'
PROMPT: 'Topic to generate'
UPLOAD: true
DELAY: 2.5 # Hours between uploads
WHISPER_MODEL: 'small'
FONT: 'Comic Sans MS'
```

**Prompt Configuration:**

```yaml
# config/prompt.yml
GET_CONTENT: 'Guidelines for transcript'
GET_TITLE: 'Guidelines for title'
GET_SEARCH_TERM: 'YouTube search term for background'
GET_DESCRIPTION: 'Description guidelines'
GET_CATEGORY_ID: 'Category selection'
```

**Takeaway:** Clean configuration separation (preset.yml vs prompt.yml).

---

### 2.2 VideoGraphAI (Graph-Based Agent Architecture)

**Location:** `vendor/VideoGraphAI`
**Language:** Python (Streamlit UI)
**License:** MIT

**Architecture:**

```
Input (topic, timeframe)
    → Graph Agents (research using Tavily)
    → Content Generation (Groq LLM)
    → Media Production (TogetherAI FLUX.schnell)
    → Audio (F5-TTS)
    → Subtitles (Gentle alignment)
    → FFmpeg composition
    → Streamlit delivery
```

**Key Features:**

- Real-time research via Tavily Search API
- Graph-based agent architecture
- F5-TTS for high-quality voiceovers
- Gentle server for subtitle synchronization

**APIs Required:**

- Groq API (LLM)
- Together AI API (image generation)
- Tavily Search API (research)
- F5-TTS (local installation)

**Takeaway:** Graph agents + research integration is powerful for trending content.

---

### 2.3 Autotube (n8n + Docker Architecture)

**Location:** `vendor/Autotube`
**Language:** Python + n8n workflows
**License:** MIT

**System Architecture:**

```
┌──────────────────────────────────────────────────────────────┐
│  n8n Workflow (5678) → Ollama LLaMA 3.1 (11434)              │
│      ↓                                                        │
│  Python Video API (5001) + OpenTTS (5500)                     │
│      ↓                                                        │
│  AI Image Generation (Pollinations.ai / Z-Image)             │
│      ↓                                                        │
│  YouTube API Upload                                           │
└──────────────────────────────────────────────────────────────┘
```

**Docker Components:**

| Service     | Port  | Purpose                |
| ----------- | ----- | ---------------------- |
| n8n         | 5678  | Workflow orchestration |
| Ollama      | 11434 | Local LLM (LLaMA 3.1)  |
| OpenTTS     | 5500  | Text-to-speech         |
| Python API  | 5001  | Video creation         |
| PostgreSQL  | 5432  | n8n database           |
| Redis       | 6379  | Caching                |
| FileBrowser | 8080  | File management        |

**Video Features:**

- Ken Burns zoom effects
- Crossfade transitions
- Text overlays
- Multiple AI images per video

**Takeaway:** n8n orchestration + Docker containerization is production-ready.

---

### 2.4 Cassette (Terminal-Based, Free APIs)

**Location:** `vendor/Cassette`
**Language:** Python
**License:** Not specified

**Key Innovation:** Uses only free/open APIs:

- **LLM:** g4f (free GPT wrapper)
- **TTS:** UnrealSpeech API (free tier)
- **Video:** MoviePy + FFmpeg

**Customization Options:**

- Background music selection
- Voice selection
- Background gameplay videos
- Character images
- Subtitle styles (word or sentence timestamps)
- Custom fonts and colors

**Takeaway:** Demonstrates viable free-tier approach.

---

### 2.5 OBrainRot (Force Alignment Deep Dive)

**Location:** `vendor/OBrainRot`
**Language:** Python
**License:** Not specified

**Force Alignment Approach:**

```python
# Using wav2vec2 for precise alignment
# Based on Motu Hira's tutorial

1. Generate audio with Coqui xTTSv2
2. Pre-process text (remove punctuation via RegEx)
3. Run wav2vec2 force alignment:
   - Frame-wise label probability from audio
   - Create trellis matrix (probability of labels per time step)
   - Find most likely path through trellis
4. Output .ass subtitle file with precise timestamps
5. FFmpeg overlay with per-sentence image switching
```

**Key Files:**

- `video_generator.py` - Image overlay algorithm

**Takeaway:** wav2vec2 force alignment for precise word-level timestamps.

---

### 2.6 FunClip (Alibaba ASR + LLM Clipping)

**Location:** `vendor/clipping/FunClip`
**Source:** Alibaba DAMO Academy

**Key Features:**

- **FunASR Paraformer** - Industrial-grade Chinese ASR (13M+ downloads)
- **SeACo-Paraformer** - Hotword customization
- **CAM++** - Speaker diarization
- **LLM Smart Clipping** - GPT/Qwen for intelligent segment selection

**LLM Clipping Workflow:**

1. Run ASR recognition on video
2. Select LLM model + configure API key
3. Click "LLM Inference" → combines prompts with SRT subtitles
4. Click "AI Clip" → extracts timestamps based on LLM output

**Command Line Usage:**

```bash
# Step 1: Recognize
python funclip/videoclipper.py --stage 1 \
    --file video.mp4 \
    --output_dir ./output

# Step 2: Clip
python funclip/videoclipper.py --stage 2 \
    --file video.mp4 \
    --dest_text "target text segment" \
    --output_file ./output/clip.mp4
```

**Takeaway:** LLM-powered intelligent clipping is emerging pattern.

---

## 3. Review & Approval UI Patterns

### 3.1 Appsmith (Low-Code Internal Tools)

**Location:** `vendor/review-ui/appsmith`
**License:** Open Source

**Use Case:** Build video review dashboard with:

- Video preview player
- Approval/rejection workflow
- Metadata editing
- Publishing queue management

**Features:**

- Drag-and-drop UI builder
- Connect to any database/API
- Custom JavaScript widgets
- RBAC permissions

---

### 3.2 Budibase (Open Source Low-Code)

**Location:** `vendor/review-ui/budibase`
**License:** GPL v3

**Features:**

- Visual app builder
- Data sources: PostgreSQL, MySQL, MongoDB, REST API
- Automation workflows
- User authentication

**Use Case for content-machine:**

- Video queue management
- Multi-user review workflow
- Analytics dashboard

---

## 4. Capture & Recording Patterns

### 4.1 Playwright (Browser Automation)

**Location:** `vendor/capture/playwright`
**License:** Apache 2.0

**Key Capabilities:**

- Cross-browser (Chromium, Firefox, WebKit)
- Auto-wait (no artificial timeouts)
- Video recording
- Screenshot capture
- Network interception

**Recording Example:**

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: 'videos/',
    size: { width: 1080, height: 1920 },
  },
});

const page = await context.newPage();
await page.goto('https://demo.app.com');
// Perform actions...
await context.close(); // Video saved
```

**MCP Integration Pattern:**

```typescript
// Playwright MCP Server exposes tools like:
// - navigate(url)
// - click(selector)
// - screenshot()
// - record_video(actions)
```

---

## 5. Storage & Asset Management

### 5.1 MinIO (S3-Compatible Object Storage)

**Location:** `vendor/storage/minio`
**License:** AGPL v3

**Note:** Now source-only distribution, maintenance mode.

**Use Case:**

- Store generated videos
- Asset library (backgrounds, music, fonts)
- Cache rendered segments

**Quick Start:**

```bash
go install github.com/minio/minio@latest
minio server /data
# Access at http://127.0.0.1:9000
```

---

### 5.2 Qdrant (Vector Database)

**Location:** `vendor/storage/qdrant`

**Use Case:**

- Semantic search over video content
- Similar video recommendation
- Trend pattern matching

---

### 5.3 Weaviate (Vector Database + GraphQL)

**Location:** `vendor/storage/weaviate`

**Use Case:**

- Multi-modal search (text + images)
- Content deduplication
- Asset discovery

---

## 6. Common Patterns Summary

### 6.1 Script Generation Pattern

```python
# Universal script structure
script = {
    "hook": "Attention-grabbing first 3 seconds",
    "body": [
        {"text": "Point 1", "visual": "description"},
        {"text": "Point 2", "visual": "description"},
        # ...
    ],
    "cta": "Call to action / conclusion",
    "metadata": {
        "title": "Video title",
        "description": "YouTube description",
        "hashtags": ["tag1", "tag2"],
        "category": "22"  # YouTube category ID
    }
}
```

### 6.2 Audio Generation Pattern

```python
# TTS with timestamp extraction
def generate_audio_with_timestamps(script_text):
    # Generate audio
    audio = tts_engine.synthesize(script_text)

    # Get word timestamps via:
    # Option A: Whisper alignment
    # Option B: wav2vec2 force alignment
    # Option C: TTS engine native timestamps (Kokoro-FastAPI)

    timestamps = align(audio, script_text)

    return {
        "audio_file": audio,
        "word_timestamps": timestamps,  # [{word, start, end}, ...]
        "srt_content": generate_srt(timestamps)
    }
```

### 6.3 Video Assembly Pattern

```python
# FFmpeg-based assembly (most common)
ffmpeg_cmd = [
    "ffmpeg",
    "-i", background_video,
    "-i", audio_file,
    "-vf", f"subtitles={srt_file}:force_style='FontSize=24,Bold=1'",
    "-c:v", "libx264",
    "-c:a", "aac",
    "-map", "0:v",
    "-map", "1:a",
    "-shortest",
    output_file
]

# Remotion-based assembly (higher quality)
# Define React components, render to video
```

### 6.4 Platform-Specific Export

| Platform        | Resolution | Duration | Format    |
| --------------- | ---------- | -------- | --------- |
| TikTok          | 1080x1920  | <60s     | MP4 H.264 |
| YouTube Shorts  | 1080x1920  | <60s     | MP4 H.264 |
| Instagram Reels | 1080x1920  | <90s     | MP4 H.264 |
| YouTube Long    | 1920x1080  | Any      | MP4 H.264 |

---

## 7. Recommended Architecture for content-machine

Based on analysis of all patterns:

### 7.1 Technology Stack

| Layer             | Choice                 | Rationale                          |
| ----------------- | ---------------------- | ---------------------------------- |
| **Orchestration** | BullMQ                 | Parent-child flows, TypeScript     |
| **MCP Framework** | FastMCP (Python + TS)  | Enterprise-grade, composable       |
| **Render Engine** | Remotion + chuk-motion | Design tokens, 51 components       |
| **TTS**           | Kokoro-FastAPI         | OpenAI-compatible, word timestamps |
| **ASR**           | WhisperX               | 70x realtime, diarization          |
| **Captions**      | remotion-subtitles     | 17 animated templates              |
| **LLM**           | Claude + Instructor    | Structured output, type-safe       |
| **Research**      | Tavily + Reddit MCP    | AI-native search                   |
| **Storage**       | MinIO + Qdrant         | S3-compatible + vector search      |
| **Review UI**     | Budibase/Appsmith      | Low-code internal tools            |
| **Observability** | Langfuse + Promptfoo   | LLM tracing + evals                |

### 7.2 Pipeline Implementation

```
Phase 1: Research & Planning
├── Tavily MCP: Search trending topics
├── Reddit MCP: Get viral content patterns
└── Pydantic AI Agent: Generate structured script

Phase 2: Asset Acquisition
├── Playwright MCP: Capture product UI
├── Pexels API: Stock footage (if needed)
└── MinIO: Store captured assets

Phase 3: Audio Production
├── Kokoro-FastAPI: Generate TTS
├── WhisperX: Word-level timestamps
└── BullMQ Job: Audio processing

Phase 4: Video Rendering
├── chuk-motion MCP: Compose timeline
├── remotion-subtitles: Add captions
└── Remotion CLI: Render to MP4

Phase 5: Review & Publish
├── Budibase Dashboard: Human review
├── BullMQ Job: Publishing pipeline
└── Platform APIs: Upload to TikTok/YouTube
```

### 7.3 MCP Server Architecture

```
content-machine-mcp/
├── servers/
│   ├── research-server/          # Tavily + Reddit research
│   │   ├── tools/
│   │   │   ├── search_trends
│   │   │   ├── analyze_viral
│   │   │   └── get_reddit_posts
│   │   └── resources/
│   │       └── trend_data://
│   │
│   ├── capture-server/           # Playwright UI capture
│   │   ├── tools/
│   │   │   ├── navigate
│   │   │   ├── capture_screenshot
│   │   │   ├── record_interaction
│   │   │   └── capture_workflow
│   │   └── resources/
│   │       └── captures://
│   │
│   ├── audio-server/             # TTS + ASR
│   │   ├── tools/
│   │   │   ├── generate_speech
│   │   │   ├── transcribe_audio
│   │   │   └── align_timestamps
│   │   └── resources/
│   │       └── audio://
│   │
│   └── render-server/            # Remotion rendering
│       ├── tools/
│       │   ├── create_project
│       │   ├── add_component
│       │   ├── render_video
│       │   └── list_templates
│       └── resources/
│           └── renders://
```

---

## 8. Implementation Priority

### Phase 1: Core Pipeline (Week 1-2)

1. **Setup BullMQ** with Redis
2. **Create FastMCP servers** (research, capture, audio, render)
3. **Integrate chuk-motion** for Remotion
4. **Basic end-to-end flow**

### Phase 2: Quality (Week 3-4)

1. **WhisperX integration** for word-level timestamps
2. **remotion-subtitles** for animated captions
3. **Langfuse tracing**
4. **Promptfoo evaluations**

### Phase 3: Review & Polish (Week 5-6)

1. **Budibase review dashboard**
2. **Platform-specific exports**
3. **Publishing automation**
4. **Metrics and analytics**

---

## 9. Key Learnings

### What Works Well

1. **Separation of concerns** - Each step in pipeline is independent
2. **Configuration-driven** - YAML/JSON configs for prompts, settings
3. **Docker containerization** - Reproducible, portable
4. **MCP for tool exposure** - Clean LLM-to-tool interface
5. **Force alignment** - Precise subtitle timing

### What to Avoid

1. **Monolithic scripts** - Hard to debug, maintain
2. **Hardcoded prompts** - Use configuration files
3. **Single-threaded processing** - Use job queues
4. **Platform-specific code** - Abstract platform differences
5. **Ignoring rate limits** - Always implement backoff

### Emerging Patterns

1. **LLM-powered clipping** - FunClip shows the way
2. **Graph agents for research** - VideoGraphAI pattern
3. **n8n orchestration** - Visual workflow building
4. **OpenAI-compatible APIs** - Kokoro-FastAPI pattern
5. **Design token systems** - chuk-motion approach

---

## 10. References

| Project      | Key Pattern       | URL                             |
| ------------ | ----------------- | ------------------------------- |
| Crank        | Config separation | vendor/Crank                    |
| VideoGraphAI | Graph agents      | vendor/VideoGraphAI             |
| Autotube     | n8n + Docker      | vendor/Autotube                 |
| OBrainRot    | Force alignment   | vendor/OBrainRot                |
| FunClip      | LLM clipping      | vendor/clipping/FunClip         |
| chuk-motion  | Design tokens     | vendor/render/chuk-mcp-remotion |

---

_Document generated as part of content-machine research initiative. Last updated: 2026-01-02_
