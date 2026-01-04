# Deep Dive #58: Video Processing, Orchestration & Intelligent Clipping
**Date:** 2026-01-02  
**Category:** Video Pipeline, Workflow Automation, Scene Detection  
**Status:** Complete  
**Priority:** High - Core Pipeline Components  

---

## Executive Summary

This deep dive documents the video processing, workflow orchestration, and intelligent clipping tools available in content-machine's vendored repositories. These tools form the production backbone for automated video generation.

**Key Findings:**
1. **Temporal + BullMQ** provide production-grade job orchestration
2. **n8n** offers visual workflow automation with 400+ integrations
3. **FunClip** provides LLM-powered intelligent clipping with Alibaba's FunASR
4. **PySceneDetect** enables content-aware scene detection
5. **MoviePy** provides Python-native video editing capabilities
6. **FFMPerative** enables natural language video editing with LLM

---

## Part 1: Workflow Orchestration Systems

### 1.1 Temporal - Durable Execution Platform

**Location:** `vendor/orchestration/temporal`  
**Language:** Go (server), SDKs for Python/Java/TS/Go  
**License:** MIT  

**Core Concept:** Workflows that survive process crashes, network failures, and machine restarts.

**Key Benefits:**
- Automatic retry of failed operations
- Exactly-once execution guarantees
- Long-running workflow support (days, weeks, months)
- Built-in versioning for workflow evolution

**Video Pipeline Example:**
```python
from temporalio import workflow, activity
from datetime import timedelta

@activity.defn
async def research_trends() -> dict:
    """Research current trending topics."""
    return await tavily_client.search("AI tools trends")

@activity.defn
async def generate_script(trend: dict) -> str:
    """Generate video script from trend data."""
    return await llm.generate_script(trend)

@activity.defn
async def generate_audio(script: str) -> str:
    """Generate TTS audio from script."""
    return await kokoro.synthesize(script)

@activity.defn
async def render_video(script: str, audio: str) -> str:
    """Render final video with Remotion."""
    return await remotion.render(script, audio)

@workflow.defn
class VideoProductionWorkflow:
    @workflow.run
    async def run(self, topic: str) -> str:
        # Each activity automatically retries on failure
        trend = await workflow.execute_activity(
            research_trends,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        script = await workflow.execute_activity(
            generate_script,
            trend,
            start_to_close_timeout=timedelta(minutes=10)
        )
        
        audio = await workflow.execute_activity(
            generate_audio,
            script,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        video = await workflow.execute_activity(
            render_video,
            script, audio,
            start_to_close_timeout=timedelta(minutes=30)
        )
        
        return video
```

**content-machine Relevance:**
- Perfect for long-running video rendering jobs
- Automatic retry for flaky FFmpeg/Remotion operations
- State preservation if server restarts mid-render
- Visibility into workflow execution via Web UI

---

### 1.2 BullMQ - Redis-Based Job Queue

**Location:** `vendor/job-queue/bullmq`  
**Language:** TypeScript/JavaScript  
**License:** MIT  

**Core Concept:** Fast, reliable job processing with Redis for persistence.

**Key Features:**
- Priority queues
- Job rate limiting
- Delayed jobs
- Repeatable jobs (CRON-like)
- Parent-child job dependencies
- Sandboxed processors

**Video Pipeline Example:**
```typescript
import { Queue, Worker, Job } from 'bullmq';

// Create queues for each stage
const researchQueue = new Queue('research');
const scriptQueue = new Queue('script');
const audioQueue = new Queue('audio');
const renderQueue = new Queue('render');

// Workers for each stage
const researchWorker = new Worker('research', async (job: Job) => {
  const trends = await tavilySearch(job.data.topic);
  
  // Chain to next stage
  await scriptQueue.add('generate-script', {
    videoId: job.data.videoId,
    trends,
  });
  
  return trends;
});

const renderWorker = new Worker('render', async (job: Job) => {
  const { script, audioPath } = job.data;
  
  // Long-running render with progress updates
  job.updateProgress(10);
  const videoPath = await remotion.render(script, audioPath);
  job.updateProgress(100);
  
  return videoPath;
}, {
  concurrency: 2,  // Max 2 concurrent renders
  limiter: {
    max: 10,
    duration: 60000  // 10 renders per minute max
  }
});

// Start a video production
await researchQueue.add('research', {
  videoId: 'video-123',
  topic: 'AI coding tools',
}, {
  priority: 1,  // High priority
  attempts: 3,  // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 1000,
  }
});
```

**content-machine Relevance:**
- Ideal for TypeScript-based pipeline
- Easy Redis setup (works with Upstash, Dragonfly)
- Built-in rate limiting for API calls
- Job dependencies for multi-stage pipeline

---

### 1.3 n8n - Visual Workflow Automation

**Location:** `vendor/orchestration/n8n`  
**Language:** TypeScript  
**License:** Sustainable Use License (fair-code)  

**Core Concept:** Code when you need it, no-code when you don't.

**Key Features:**
- 400+ integrations
- Native AI/LangChain capabilities
- Self-hosted or cloud
- JavaScript/Python code nodes
- HTTP/webhook triggers
- Error workflows

**Video Workflow Example:**
```json
{
  "nodes": [
    {
      "name": "Reddit Trigger",
      "type": "n8n-nodes-base.schedule",
      "parameters": { "interval": "hourly" }
    },
    {
      "name": "Search Trending",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://reddit.com/r/programming/top.json",
        "method": "GET"
      }
    },
    {
      "name": "AI Agent - Script",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "promptType": "define",
        "text": "Generate a 60-second video script about: {{ $json.title }}"
      }
    },
    {
      "name": "Generate TTS",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:8880/v1/audio/speech",
        "method": "POST",
        "body": "{{ $json.script }}"
      }
    },
    {
      "name": "Render Video",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "npx remotion render src/Video.tsx --props='{{ JSON.stringify($json) }}'"
      }
    }
  ]
}
```

**content-machine Relevance:**
- Great for rapid prototyping
- Visual debugging of pipeline
- Easy webhook integrations for external triggers
- Can be used alongside TypeScript code

---

### 1.4 AI Video Workflow (Desktop App)

**Location:** `vendor/orchestration/ai-video-workflow`  
**Language:** Python  
**License:** MIT  

**Core Concept:** All-in-one desktop app for AI video creation pipeline.

**Pipeline Stages:**
1. **Text-to-Image:** LibLibAI (Checkpoint/LoRA models)
2. **Image-to-Video:** Volcano Engine Jimeng I2V
3. **Text-to-Music:** Volcano Engine Jimeng Music
4. **Auto-Merge:** FFmpeg for final composition

**Key Features:**
- Doubao LLM for prompt generation
- Multiple preset themes (fashion, gaming, etc.)
- Real-time media preview
- History navigation

**content-machine Relevance:**
- Reference for desktop GUI patterns
- Chinese AI service integrations (LibLibAI, Volcano)
- Theme-based prompt generation pattern

---

## Part 2: Video Processing Infrastructure

### 2.1 MoviePy - Python Video Editing

**Location:** `vendor/video-processing/moviepy`  
**Language:** Python  
**License:** MIT  

**Core Concept:** Video editing as Python code - every pixel accessible as numpy arrays.

**Key Operations:**
```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip, concatenate_videoclips

# Load and trim
clip = VideoFileClip("input.mp4").subclipped(10, 20)

# Resize for vertical format
vertical = clip.resized(height=1920).cropped(
    x_center=clip.w/2, width=1080
)

# Add text overlay
title = TextClip(
    font="Arial.ttf",
    text="AI Tools Review",
    font_size=70,
    color='white'
).with_duration(5).with_position('center')

# Composite
final = CompositeVideoClip([vertical, title])
final.write_videofile("output.mp4", fps=30)

# Concatenate multiple clips
montage = concatenate_videoclips([clip1, clip2, clip3])
montage.write_videofile("montage.mp4")
```

**Audio Operations:**
```python
from moviepy import AudioFileClip

# Extract audio
audio = VideoFileClip("video.mp4").audio
audio.write_audiofile("audio.mp3")

# Mix audio tracks
from moviepy.audio.AudioClip import CompositeAudioClip
background = AudioFileClip("music.mp3").with_volume_scaled(0.3)
narration = AudioFileClip("voice.mp3")
mixed = CompositeAudioClip([background, narration])
```

**content-machine Relevance:**
- Pure Python - easy integration with ML pipelines
- Good for prototyping and simple edits
- Slower than FFmpeg for production
- v2.0 has major improvements

---

### 2.2 FFMPerative - LLM-Powered FFmpeg

**Location:** `vendor/video-processing/FFMPerative`  
**Language:** Python  
**License:** MIT  

**Core Concept:** Natural language interface to FFmpeg via LLM.

**Key Features:**
- Chat interface for video editing
- Automatic FFmpeg command generation
- 7B fine-tuned LLaMA model available

**Usage Pattern:**
```python
from ffmperative import ffmp

# Natural language commands
ffmp("crop the video to 1080x1920 for TikTok")
ffmp("speed up the video by 1.5x")
ffmp("merge subtitles 'captions.srt' with video 'demo.mp4'")
ffmp("sample the 5th frame from 'product.mp4'")
ffmp("reverse the video")

# Compose clips with AI guidance
ffmperative.compose(
    clips="./clips/",
    output="./output.mp4",
    prompt="Edit for social media with fast cuts"
)
```

**content-machine Relevance:**
- Natural language video editing
- Could be exposed as MCP tool
- Useful for LLM-driven editing decisions

---

### 2.3 CapCut Mate - JianYing API

**Location:** `vendor/video-processing/capcut-mate`  
**Language:** Python (FastAPI)  
**License:** MIT  

**Core Concept:** REST API for programmatic control of JianYing (Chinese CapCut).

**Key Features:**
- Create drafts programmatically
- Add video/audio/image/subtitle/effects
- Cloud rendering
- OpenAPI spec for LLM tool use (Coze integration)

**API Pattern:**
```python
# Create a draft
POST /draft
{
    "name": "AI Generated Video",
    "resolution": [1080, 1920],
    "fps": 30
}

# Add video track
POST /draft/{id}/video
{
    "path": "/path/to/clip.mp4",
    "start_time": 0,
    "duration": 10
}

# Add subtitles
POST /draft/{id}/subtitle
{
    "text": "Hello World",
    "start_time": 0,
    "end_time": 3,
    "style": {...}
}

# Export/render
POST /draft/{id}/render
```

**content-machine Relevance:**
- Pattern for video editor automation APIs
- Could inspire similar API for Remotion control
- Docker deployment available

---

## Part 3: Intelligent Clipping Tools

### 3.1 FunClip - LLM-Powered Video Clipping

**Location:** `vendor/clipping/FunClip`  
**Language:** Python  
**License:** MIT  
**Creator:** Alibaba DAMO Academy  

**Core Concept:** ASR + LLM for intelligent video clipping.

**Pipeline:**
1. **Speech Recognition:** Paraformer-Large (industrial-grade Chinese ASR)
2. **Speaker Diarization:** CAM++ model identifies speakers
3. **LLM Analysis:** GPT/Qwen analyzes transcript for key moments
4. **Auto Clipping:** Extract segments by text selection or speaker

**Key Features:**
- Hotword customization (brand names, proper nouns)
- Multi-segment free clipping
- SRT subtitle generation
- Gradio interface
- English support via Whisper

**LLM Clipping Pattern:**
```python
# 1. Run ASR on video
recognition = funclip.recognize(
    video_path="podcast.mp4",
    language="en",
    recognize_speakers=True  # Speaker diarization
)

# 2. Use LLM to identify clip-worthy moments
llm_response = funclip.llm_inference(
    srt=recognition.srt,
    model="gpt-4",
    prompt="""
    Analyze this transcript and identify:
    1. Key insights worth sharing
    2. Emotional moments
    3. Quotable statements
    Return timestamps for each.
    """
)

# 3. Extract clips based on LLM output
clips = funclip.ai_clip(
    llm_output=llm_response,
    output_dir="./clips/"
)
```

**content-machine Relevance:**
- Pattern for intelligent content extraction from long videos
- Speaker-based clipping for interviews/podcasts
- LLM prompting patterns for virality scoring

---

### 3.2 PySceneDetect - Content-Aware Scene Detection

**Location:** `vendor/clipping/pyscenedetect`  
**Language:** Python  
**License:** BSD  

**Core Concept:** Detect scene boundaries algorithmically.

**Detection Methods:**
- **ContentDetector:** Detects fast cuts via frame difference
- **AdaptiveDetector:** Two-pass for camera movement handling
- **ThresholdDetector:** Fade in/out detection

**Usage Pattern:**
```python
from scenedetect import detect, ContentDetector, AdaptiveDetector
from scenedetect import split_video_ffmpeg

# Quick detection
scenes = detect('video.mp4', ContentDetector())

# Advanced detection
from scenedetect import open_video, SceneManager

video = open_video('video.mp4')
scene_manager = SceneManager()
scene_manager.add_detector(ContentDetector(threshold=27.0))
scene_manager.detect_scenes(video, show_progress=True)
scenes = scene_manager.get_scene_list()

# Print scene boundaries
for i, scene in enumerate(scenes):
    print(f"Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}")

# Split video at scene boundaries
split_video_ffmpeg('video.mp4', scenes)
```

**content-machine Relevance:**
- Pre-processing for long videos before LLM analysis
- Identify natural cut points for vertical reformatting
- Can feed scene list to LLM for content selection

---

### 3.3 Clip-Anything - Multimodal AI Clipping

**Location:** `vendor/Clip-Anything`  
**Language:** Python  
**License:** MIT  

**Core Concept:** Prompt-based clipping using visual, audio, and sentiment cues.

**Capabilities:**
- Visual analysis per frame
- Audio/sound detection
- Emotion/sentiment scoring
- Virality rating
- Text prompt matching

**API Integration:**
```python
# Via Vadoo.tv API
import requests

response = requests.post(
    "https://api.vadoo.tv/clips",
    json={
        "video_url": "https://youtube.com/watch?v=...",
        "prompt": "moments where the speaker is excited",
        "max_clips": 5,
        "clip_length": "15-30s"
    }
)

clips = response.json()["clips"]
for clip in clips:
    print(f"Clip: {clip['start']}-{clip['end']}, Score: {clip['virality_score']}")
```

**content-machine Relevance:**
- Pattern for multimodal content analysis
- Virality scoring for content selection
- Prompt-based extraction approach

---

## Part 4: Complete Video Generation Tools

### 4.1 VideoGraphAI - Graph-Based Agent Pipeline

**Location:** `vendor/VideoGraphAI`  
**Language:** Python  
**License:** MIT  

**Architecture:**
```
Input Topic → Tavily Research → Script Generation → 
Image Gen (TogetherAI) → Voice (F5-TTS) → 
Subtitles (Gentle) → Final Compilation
```

**Tech Stack:**
- **Research:** Tavily Search API
- **LLM:** OpenAI/Groq
- **Images:** FLUX.schnell via TogetherAI
- **TTS:** F5-TTS (local)
- **Subtitles:** Gentle forced alignment
- **GUI:** Streamlit

**content-machine Relevance:**
- Complete reference implementation
- Graph agent pattern for pipeline
- Local TTS integration

---

### 4.2 AI Content Studio - Full YouTube Automation

**Location:** `vendor/AI-Content-Studio`  
**Language:** Python  
**License:** MIT  

**Pipeline:**
1. **Research:** Google Search grounding + NewsAPI
2. **Fact-Checking:** Optional AI review
3. **Script:** Multi-format (podcast, documentary, story)
4. **TTS:** Google Gemini TTS (multi-speaker)
5. **Images:** Vertex AI Imagen 3
6. **Video:** Vertex AI Imagen 2 + WaveSpeed AI
7. **Captions:** Whisper → styled .ass format
8. **Thumbnails:** AI character + bold text
9. **Publishing:** YouTube + Facebook direct upload

**Tech Stack:**
- google-generativeai
- google-cloud-aiplatform
- vertexai
- openai-whisper
- pydub + pysubs2
- ffmpeg

**content-machine Relevance:**
- Enterprise Google Cloud integration patterns
- Multi-speaker TTS coordination
- Auto-captioning workflow

---

### 4.3 OBrainRot - Reddit to TikTok Generator

**Location:** `vendor/OBrainRot`  
**Language:** Python  
**License:** MIT  

**Pipeline:**
1. **Input:** Reddit URL (thread or post)
2. **Sentiment Filter:** VADER + LLaMA 3.3 70B
3. **Scraping:** Reddit API
4. **TTS:** Coqui xTTSv2 (with sample voice cloning)
5. **Force Alignment:** wav2vec2 for subtitle timing
6. **Image Overlay:** Per-sentence image switching
7. **FFmpeg Assembly:** Final video generation

**Key Algorithm - Force Alignment:**
```python
# Using wav2vec2 for precise word-level timestamps
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

# 1. Get frame-wise probabilities from audio
# 2. Create trellis matrix (probability of labels per timestep)
# 3. Find most likely path through trellis
# 4. Generate .ass subtitle file with precise timing
```

**content-machine Relevance:**
- Reddit → video automation pattern
- Voice cloning with reference samples
- Force alignment for perfect subtitle sync

---

### 4.4 Crank - Topic to YouTube Short

**Location:** `vendor/Crank`  
**Language:** Python  
**License:** Custom  

**Pipeline:**
1. **Input:** Topic via YAML config
2. **Script:** Gemini generates transcript
3. **TTS:** Whisper for voice generation
4. **Background:** YouTube video scraping
5. **Captions:** spaCy for text processing
6. **Render:** FFmpeg composition
7. **Upload:** YouTube API (optional delay)

**Configuration Pattern:**
```yaml
# config/preset.yml
NAME: "AI Tech Channel"
PROMPT: "Latest AI coding tools"
UPLOAD: true
DELAY: 2.5  # Hours after generation
WHISPER_MODEL: "small"
FONT: "Comic Sans MS"
```

```yaml
# config/prompt.yml
GET_CONTENT: |
  Generate a 60-second script about {topic}.
  Include a hook, 3 key points, and CTA.
  
GET_SEARCH_TERM: |
  Generate YouTube search terms for background video.
  Topic: {topic}
  Return: gaming, technology, abstract visuals
```

**content-machine Relevance:**
- YAML-driven configuration pattern
- Scheduled upload with delay
- Background video scraping approach

---

## Part 5: Publishing Infrastructure

### 5.1 Go YouTube Reddit Automation

**Location:** `vendor/publish/go-youtube-reddit-automation`  
**Language:** Go  
**License:** MIT  

**Architecture:**
```
Reddit API → PostgreSQL (tracking) → 
TTS + Images → FFmpeg → 
YouTube + Instagram Upload
```

**Key Features:**
- PostgreSQL for post tracking (never duplicate)
- Sentiment analysis data collection
- Breaking news banner generation
- Auto-concatenation with intro/outro

---

### 5.2 Mixpost - Social Media Management

**Location:** `vendor/publish/mixpost`  
**Language:** PHP (Laravel)  
**License:** MIT  

**Features:**
- Multi-platform scheduling
- Asset library
- Analytics dashboard
- Team collaboration
- API access

---

## Part 6: Recommended Architecture

### 6.1 Orchestration Selection

| Use Case | Recommended Tool | Reasoning |
|----------|-----------------|-----------|
| **Production Pipeline** | Temporal | Durable execution, long-running renders |
| **TypeScript Backend** | BullMQ | Native TS, Redis persistence |
| **Rapid Prototyping** | n8n | Visual, 400+ integrations |
| **Desktop App** | ai-video-workflow pattern | PyQt/CustomTkinter GUI |

### 6.2 Clipping Strategy

| Content Type | Tool | Approach |
|--------------|------|----------|
| **Podcasts/Interviews** | FunClip | Speaker diarization + LLM |
| **Long-form Video** | PySceneDetect | Scene boundaries → LLM selection |
| **Viral Moments** | Clip-Anything | Multimodal prompting |

### 6.3 Video Processing Strategy

| Operation | Tool | Rationale |
|-----------|------|-----------|
| **Simple Edits** | MoviePy | Python-native, easy ML integration |
| **Complex Rendering** | Remotion | React components, programmatic |
| **Natural Language** | FFMPerative | LLM-driven decisions |
| **Production Batch** | FFmpeg direct | Maximum performance |

### 6.4 Complete Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Temporal Workflow                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐│
│  │ Research    │ → │ Script Gen  │ → │ Audio + Captions            ││
│  │ (Tavily)    │   │ (Claude)    │   │ (Kokoro + WhisperX)         ││
│  └─────────────┘   └─────────────┘   └─────────────────────────────┘│
│         ↓                                        ↓                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐│
│  │ Capture     │ → │ Clipping    │ → │ Render (Remotion)           ││
│  │ (Playwright)│   │ (FunClip)   │   │ (chuk-mcp-remotion)         ││
│  └─────────────┘   └─────────────┘   └─────────────────────────────┘│
│                                                   ↓                  │
│                              ┌────────────────────────────────────┐ │
│                              │ Review Queue → Publish             │ │
│                              │ (BullMQ)      (TiktokAutoUploader) │ │
│                              └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary

### Orchestration Recommendations

1. **Temporal** for production (durable, long-running)
2. **BullMQ** for TypeScript pipeline (simple, fast)
3. **n8n** for prototyping and non-code users

### Video Processing Recommendations

1. **Remotion** for primary rendering (React, programmatic)
2. **MoviePy** for Python-based preprocessing
3. **FFMPerative** for LLM-driven editing decisions
4. **FFmpeg** direct for batch operations

### Clipping Recommendations

1. **FunClip** for transcript-based intelligent clipping
2. **PySceneDetect** for scene boundary detection
3. **Clip-Anything** pattern for multimodal analysis

### Key Integration Patterns

1. Temporal workflow with BullMQ for stage queuing
2. PySceneDetect → FunClip → LLM for content selection
3. MoviePy preprocessing → Remotion rendering
4. FFMPerative for natural language editing commands

---

## References

- [Temporal Documentation](https://docs.temporal.io/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [n8n Documentation](https://docs.n8n.io/)
- [MoviePy Documentation](https://zulko.github.io/moviepy/)
- [PySceneDetect Documentation](https://scenedetect.com/docs/)
- [FunClip GitHub](https://github.com/alibaba-damo-academy/FunClip)
