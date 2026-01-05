# Infrastructure & Integrations Deep Dive

> **Created:** 2026-01-02  
> **Focus:** MCP Servers, Clipping Tools, Publishing, Orchestration, Job Queues  
> **Repos Analyzed:** 25+ infrastructure and tooling repos

---

## Executive Summary

This document explores the infrastructure layer of the vendored repos - the MCP servers, clipping tools, publishing pipelines, orchestration workflows, and job queue systems. These form the backbone of any production video automation system.

**Key Discoveries:**

1. **Plainly MCP Server** - Programmatic video rendering via MCP (template-based like Remotion)
2. **Qdrant MCP Server** - Semantic memory for LLMs (useful for trend/context storage)
3. **Nano-Banana MCP** - Gemini 2.5 Flash image generation via MCP
4. **FunClip** - Alibaba's speech recognition + LLM-driven smart clipping
5. **AI Highlight Clip** - Sliding window + AI scoring for highlight extraction
6. **PySceneDetect** - Production-grade scene detection with `ContentDetector` and `AdaptiveDetector`
7. **TikTokAutoUploader** - Fastest upload using requests (not Selenium)
8. **Mixpost** - Full social media management platform (Laravel-based)
9. **AI Video Workflow** - Complete text→image→video→music pipeline
10. **BullMQ** - Production-grade Redis queues with parent-child job dependencies

---

## 1. MCP Servers (Tool Calling for LLMs)

### 1.1 Plainly MCP Server

**Path:** `vendor/mcp-servers/plainly-mcp-server`  
**Purpose:** Programmatic video rendering via MCP protocol

**Available Tools:**

```typescript
// List all renderable templates
list_renderable_items();

// Get template details (parameters, previews, aspect ratios)
get_renderable_items_details(itemId);

// Submit render with parameters
render_item({ templateId, parameters: { headline: '...', background: '...' } });

// Check render status
check_render_status(renderId);
```

**Key Pattern:** Template-based rendering with parameter injection - similar to Remotion but as a service.

**Integration Point:** Could use for quick social media content where we have predefined templates.

---

### 1.2 Qdrant MCP Server

**Path:** `vendor/mcp-servers/qdrant-mcp-server`  
**Purpose:** Semantic memory layer for LLM workflows

**Available Tools:**

```python
# Store information with semantic embeddings
qdrant-store(information="User prefers tech content", metadata={"type": "preference"})

# Retrieve by semantic similarity
qdrant-find(query="what kind of content does user like")
```

**Configuration:**

```bash
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=content-machine-memories
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

**Use Cases for content-machine:**

1. Store analyzed trends for semantic retrieval
2. Cache product knowledge for script generation
3. Store successful video patterns for reuse
4. Build content recommendation memory

---

### 1.3 Nano-Banana MCP Server

**Path:** `vendor/mcp-servers/Nano-Banana-MCP`  
**Purpose:** AI image generation via Gemini 2.5 Flash

**Available Tools:**

```typescript
// Generate new image
generate_image({ prompt: 'A futuristic city with neon lights' });

// Edit existing image
edit_image({ imagePath: '/path/to/image.png', prompt: 'Add rainbow' });

// Continue editing last image
continue_editing({ prompt: 'Make it more colorful' });

// Get last image info
get_last_image_info();
```

**Cross-Platform File Storage:**

- Windows: `%USERPROFILE%\Documents\nano-banana-images\`
- macOS/Linux: `./generated_imgs/`

**Key Pattern:** Iterative editing workflow - generate → continue_editing → continue_editing

---

## 2. Clipping & Highlight Extraction Tools

### 2.1 FunClip (Alibaba)

**Path:** `vendor/clipping/FunClip`  
**Purpose:** Speech-driven video clipping with LLM analysis

**Core Features:**

1. **FunASR Paraformer** - Industrial-grade Chinese ASR with timestamps
2. **SeACo-Paraformer** - Hotword customization for entity recognition
3. **CAM++** - Speaker diarization (clip by speaker ID)
4. **LLM Smart Clipping** - GPT/Qwen analyzes transcript for key moments

**LLM Clipping Workflow:**

```python
# 1. Run ASR recognition
python funclip/videoclipper.py --stage 1 --file video.mp4 --output_dir ./output

# 2. LLM analyzes SRT and selects timestamps
# (Combines prompts with video's SRT subtitles)

# 3. AI Clip extracts timestamps from LLM output
python funclip/videoclipper.py --stage 2 \
  --dest_text '我们把它跟乡村振兴去结合起来' \
  --start_ost 0 --end_ost 100
```

**Key Pattern:** ASR → LLM Analysis → Timestamp Extraction → FFmpeg Clip

---

### 2.2 AI Highlight Clip

**Path:** `vendor/clipping/ai-highlight-clip`  
**Purpose:** Automatic highlight extraction with AI scoring

**Core Features:**

1. **Whisper Transcription** - Multi-language with timestamps
2. **Sliding Window Algorithm** - Scans entire video without missing moments
3. **AI Highlight Scoring** - LLM rates each segment's "viral potential"
4. **Title Generation** - Auto-generates viral titles for each clip

**Configuration Parameters:**

- `生成片段数量` - Number of clips to generate
- `目标片段时长` - Target duration per clip (seconds)
- `高光关键词` - Priority keywords for selection
- `添加字幕` - Embed subtitles in output

**Key Algorithm:**

```python
# Sliding window scans for highlights
for window in sliding_windows(transcript, window_size=60):
    score = llm.rate_highlight_potential(window)
    if score > threshold:
        highlights.append(window)

# Filter for top N non-overlapping clips
final_clips = filter_overlapping(highlights, count=n)
```

---

### 2.3 PySceneDetect

**Path:** `vendor/clipping/pyscenedetect`  
**Purpose:** Production-grade scene/cut detection

**Detection Algorithms:**

```python
from scenedetect import detect, ContentDetector, AdaptiveDetector, ThresholdDetector

# Content-aware detection (fast cuts)
scenes = detect('video.mp4', ContentDetector(threshold=27.0))

# Adaptive detection (handles camera movement better, two-pass)
scenes = detect('video.mp4', AdaptiveDetector())

# Threshold detection (fade in/out)
scenes = detect('video.mp4', ThresholdDetector())
```

**Splitting Videos:**

```python
from scenedetect import split_video_ffmpeg

# Split video at each scene boundary
split_video_ffmpeg('video.mp4', scene_list, show_progress=True)
```

**CLI Usage:**

```bash
# Split on fast cuts
scenedetect -i video.mp4 split-video

# Save frames from each cut
scenedetect -i video.mp4 save-images

# Skip first 10 seconds
scenedetect -i video.mp4 time -s 10s
```

---

### 2.4 Autoclipper

**Path:** `vendor/clipping/autoclipper`  
**Purpose:** YouTube/Twitch highlight extraction + upload

**Architecture:**

```
backend/
├── app/
│   ├── main.py          # FastAPI
│   ├── celery_app.py    # Async workers
│   └── services/        # Clipping/subtitle/upload logic
frontend/
└── (React dashboard)
docker-compose.yml       # Redis + backend + frontend
```

**Cloud Deployment:**

```bash
# Google Cloud Run deployment
gcloud run deploy auto-clipper-backend \
  --set-env-vars REDIS_URL=redis://<IP>:6379,\
                 YOUTUBE_API_KEY=<KEY>,\
                 OPENAI_API_KEY=<KEY>
```

**Key Pattern:** FastAPI + Celery + Redis for production async processing

---

## 3. Publishing & Distribution

### 3.1 TikTokAutoUploader

**Path:** `vendor/publish/TiktokAutoUploader`  
**Purpose:** Fast TikTok uploads using requests (not Selenium)

**Key Advantage:** Uploads in ~3 seconds vs minutes with Selenium

**CLI Usage:**

```bash
# Login and save cookies
python cli.py login -n my_username

# Upload from local file
python cli.py upload --user my_username -v "video.mp4" -t "My title"

# Upload from YouTube Shorts URL
python cli.py upload --user my_username -yt "https://youtube.com/shorts/xxx" -t "Title"
```

**Multi-Account Support:**

```bash
# Show all saved accounts
python cli.py show -c

# Show all videos in queue
python cli.py show -v
```

**Scheduling:** Supports up to 10 days in advance

---

### 3.2 Mixpost

**Path:** `vendor/publish/mixpost`  
**Purpose:** Full social media management platform

**Key Features:**

1. **Multi-Platform Scheduling** - All accounts in one place
2. **Post Versions & Conditions** - Different content per platform
3. **Analytics Dashboard** - Cross-platform metrics
4. **Team Collaboration** - Workspaces with permissions
5. **Queue & Calendar** - Visual content planning
6. **Dynamic Variables** - Reusable template snippets

**Architecture:** Laravel-based (PHP), can be self-hosted

**Integration Pattern:** Use their scheduling logic as reference for our distribution component.

---

## 4. Orchestration & Workflows

### 4.1 AI Video Workflow

**Path:** `vendor/orchestration/ai-video-workflow`  
**Purpose:** Complete text→image→video→music pipeline

**Pipeline Stages:**

```
1. Text-to-Image (LibLibAI)
   ↓
2. Image-to-Video (Jimeng I2V from Volcano Engine)
   ↓
3. Text-to-Music (Jimeng Music)
   ↓
4. FFmpeg Merge (video + music = final)
```

**AI Prompt Generator:**

- Uses **Doubao (豆包)** LLM for prompt generation
- Preset themes with style options
- Generates: image prompt + music prompt + viral title + hashtags

**Configuration:**

```bash
# Environment variables
DOUBAO_API_KEY=...
LIBLIB_AK=... LIBLIB_SK=...
JIMENG_AK=... JIMENG_SK=...
```

**Key Pattern:** Multi-model orchestration with FFmpeg as final merger

---

### 4.2 BullMQ

**Path:** `vendor/job-queue/bullmq`  
**Purpose:** Production-grade Redis job queue for Node.js

**Core Features:**

1. **Parent-Child Dependencies** - Jobs wait for children to complete
2. **Rate Limiting** - Control throughput
3. **Delayed Jobs** - Schedule for future execution
4. **Repeatable Jobs** - Cron-like scheduling
5. **Sandboxed Workers** - Isolated execution
6. **Pause/Resume** - Queue flow control

**Basic Usage:**

```typescript
import { Queue, Worker } from 'bullmq';

// Add jobs
const queue = new Queue('render');
queue.add('generate-video', { scriptId: '123' });

// Process jobs
const worker = new Worker('render', async (job) => {
  if (job.name === 'generate-video') {
    await generateVideo(job.data.scriptId);
  }
});
```

**Parent-Child Jobs (FlowProducer):**

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer();

await flow.add({
  name: 'render-complete',
  queueName: 'final',
  children: [
    { name: 'generate-audio', queueName: 'tts', data: { scriptId: '123' } },
    { name: 'generate-captions', queueName: 'captions', data: { scriptId: '123' } },
    { name: 'fetch-visuals', queueName: 'visuals', data: { query: 'tech' } },
  ],
});
// render-complete waits for all children to finish
```

**Key Pattern:** Use FlowProducer for our video pipeline where render depends on audio + captions + visuals.

---

## 5. AI-Content-Studio Deep Dive

### 5.1 Pipeline Architecture

**Path:** `vendor/AI-Content-Studio/pipeline.py`

**Pipeline Steps (14 total):**

```python
PIPELINE_STEPS = [
    "Deep Research",          # Web search + news gathering
    "Fact Check Research",    # Verify claims
    "Revise Research",        # Update based on fact-check
    "Podcast Script",         # Generate with TTS vocal directions
    "Generate Thumbnail",     # Gemini 2.5 Flash image
    "Analyze Tone",           # (placeholder)
    "Audio (TTS)",            # Gemini TTS with chunking
    "Generate Timed Images",  # Images for each segment
    "Video Generation",       # Background video or slideshow
    "Add Background Music",   # pydub overlay
    "Create Final Video",     # FFmpeg composition
    "Generate SEO Metadata",  # Title/description/tags
    "Generate Timestamps",    # Chapter markers
    "Generate Snippets"       # 60s clips for shorts
]
```

### 5.2 Multi-Speaker TTS with Chunking

```python
# Script chunking for quality
CHUNK_SIZE_LIMIT = 4500
script_chunks = []
current_chunk = ""

for line in script_lines:
    if len(current_chunk) + len(line) + 1 > CHUNK_SIZE_LIMIT:
        script_chunks.append(current_chunk)
        current_chunk = line
    else:
        current_chunk = f"{current_chunk}\n{line}"

# Multi-speaker configuration
payload["generationConfig"]["speechConfig"] = {
    "multiSpeakerVoiceConfig": {
        "speakerVoiceConfigs": [
            {"speaker": "Alex", "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}},
            {"speaker": "Maya", "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Aoede"}}}
        ]
    }
}
```

### 5.3 Deep Research with Fact-Checking

```python
# Step 1: Facet analysis with Google Search
facet_prompt = f"Using Google Search, analyze '{topic}': key sub-topics, entities, controversies"
facet_analysis = gemini.search(facet_prompt)

# Step 2: Synthesis with news
synthesis_prompt = f"""
Synthesize these sources:
SOURCE 1: {facet_analysis}
SOURCE 2: {news_api_results}
Create comprehensive summary covering: background, why trending, key facts, debates, outlook.
"""
research = gemini.generate(synthesis_prompt)

# Optional: Fact-check and revise
fact_check = gemini.generate(f"Review for factual accuracy: {research}")
revised = gemini.generate(f"Revise based on: {fact_check}\n\nOriginal: {research}")
```

### 5.4 SEO Metadata from Script

```python
metadata = gemini.generate(
    prompt=f"""
    Generate SEO metadata as JSON:
    - title: keyword-rich, under 70 chars
    - description: 3 paragraphs, hook first
    - tags: 10-15 comma-separated

    VIDEO TOPIC: {topic}
    FULL SCRIPT: {script}
    """,
    response_mime_type="application/json"
)
```

---

## 6. Kokoro-FastAPI Deep Dive

### 6.1 OpenAI-Compatible API

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")

# Standard TTS
response = client.audio.speech.create(
    model="kokoro",
    voice="af_bella",
    input="Hello world!",
    response_format="mp3"
)

# Voice mixing
response = client.audio.speech.create(
    model="kokoro",
    voice="af_bella(2)+af_sky(1)",  # 67%/33% mix
    input="Hello world!"
)
```

### 6.2 Timestamped Captions

```python
import requests

response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
        "stream": True
    },
    stream=True
)

for chunk in response.iter_lines():
    data = json.loads(chunk)
    audio = base64.b64decode(data["audio"])
    timestamps = data["timestamps"]  # Word-level timing!
```

### 6.3 Performance Metrics

- **GPU (4060Ti):** 35x-100x realtime speed
- **First Token Latency:** ~300ms (GPU), ~3500ms (CPU)
- **Streaming:** Adjustable chunk size for real-time playback

---

## 7. Architecture Recommendations for content-machine

### 7.1 MCP Server Stack

```yaml
mcp-servers:
  - qdrant: Semantic memory for trends/patterns
  - nano-banana: Image generation for thumbnails
  - plainly: Template-based quick renders (optional)
  - postgres: Structured data storage
```

### 7.2 Clipping Pipeline

```yaml
clipping:
  scene-detection: pyscenedetect # ContentDetector
  highlight-scoring: LLM + sliding window (ai-highlight-clip pattern)
  speaker-separation: FunClip CAM++ (if needed)
```

### 7.3 Job Queue Architecture

```typescript
// BullMQ with parent-child dependencies
const videoFlow = new FlowProducer();

await videoFlow.add({
  name: 'publish-video',
  queueName: 'publish',
  children: [
    {
      name: 'render-video',
      queueName: 'render',
      children: [
        { name: 'generate-tts', queueName: 'audio' },
        { name: 'generate-captions', queueName: 'captions' },
        { name: 'fetch-visuals', queueName: 'visuals' },
      ],
    },
    { name: 'generate-seo', queueName: 'metadata' },
  ],
});
```

### 7.4 Publishing Strategy

```yaml
publishing:
  primary: TiktokAutoUploader (requests-based, fast)
  secondary: YouTube API (official)
  scheduler: mixpost patterns (queue-based, multi-account)
```

---

## 8. Code Patterns Reference

### 8.1 Sliding Window Highlight Detection

```python
def extract_highlights(transcript, window_size=60, step=30, top_n=5):
    highlights = []

    for start in range(0, len(transcript), step):
        window = transcript[start:start + window_size]
        score = llm.score_highlight(window.text)
        highlights.append({
            'start': window.start_time,
            'end': window.end_time,
            'score': score,
            'text': window.text
        })

    # Sort by score and filter overlapping
    sorted_highlights = sorted(highlights, key=lambda x: x['score'], reverse=True)
    return filter_overlapping(sorted_highlights, top_n)
```

### 8.2 Fact-Checking Pipeline

```python
def research_with_fact_check(topic: str) -> str:
    # Initial research
    research = deep_research(topic)

    if config.FACT_CHECK_ENABLED:
        # Find potential issues
        issues = llm.fact_check(research)

        # Revise if issues found
        if issues:
            research = llm.revise(research, issues)

    return research
```

### 8.3 Multi-Account Upload Pattern

```python
class MultiAccountUploader:
    def __init__(self):
        self.accounts = load_saved_cookies("CookiesDir")

    def upload_to_all(self, video_path: str, title: str, schedule: datetime = None):
        results = []
        for account in self.accounts:
            try:
                result = self.upload(account, video_path, title, schedule)
                results.append({"account": account.name, "status": "success"})
            except Exception as e:
                results.append({"account": account.name, "status": "failed", "error": str(e)})
        return results
```

---

## 9. Integration Priorities

### Phase 1: Core Infrastructure

1. **BullMQ** - Job queue for all async processing
2. **Qdrant MCP** - Trend/pattern memory
3. **Kokoro-FastAPI** - Local TTS with timestamps

### Phase 2: Clipping & Analysis

4. **PySceneDetect** - Scene boundary detection
5. **FunClip patterns** - LLM-driven highlight extraction

### Phase 3: Publishing

6. **TikTokAutoUploader** - Primary upload (fastest)
7. **YouTube API** - Official upload
8. **Mixpost patterns** - Scheduling logic

### Phase 4: Advanced Features

9. **AI Video Workflow patterns** - Multi-model orchestration
10. **AI-Content-Studio patterns** - Fact-checking, SEO generation

---

## 10. Risk Assessment

### High Priority

- **TikTokAutoUploader** - Unofficial API, may break
- **Cookie-based auth** - Requires maintenance

### Medium Priority

- **Qdrant local** - Needs Redis for persistence
- **Kokoro model** - English-only currently

### Low Risk

- **BullMQ** - Production-proven, used by Microsoft/Vendure
- **PySceneDetect** - Stable, well-maintained
- **FFmpeg** - Industry standard

---

## Summary

The infrastructure layer provides critical capabilities:

| Component         | Tool                    | Key Feature                          |
| ----------------- | ----------------------- | ------------------------------------ |
| **Memory**        | Qdrant MCP              | Semantic storage for trends/patterns |
| **Images**        | Nano-Banana MCP         | Gemini 2.5 Flash generation          |
| **Clipping**      | PySceneDetect + FunClip | Scene detection + LLM scoring        |
| **Queue**         | BullMQ                  | Parent-child job dependencies        |
| **TTS**           | Kokoro-FastAPI          | OpenAI-compatible with timestamps    |
| **Upload**        | TikTokAutoUploader      | Requests-based (3 second uploads)    |
| **Orchestration** | AI Video Workflow       | Multi-model coordination             |

**Recommended Stack:**

```
TypeScript + Remotion + Kokoro-FastAPI + BullMQ + Qdrant MCP
```

---

**Next Steps:**

1. Prototype BullMQ flow for video pipeline
2. Integrate Qdrant MCP for trend storage
3. Evaluate TikTokAutoUploader stability
4. Study FunClip LLM clipping prompts
