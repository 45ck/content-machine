# Clipping, Video Processing & Orchestration - Deep Dive Analysis
**Date:** 2026-01-02  
**Category:** Deep Research  
**Status:** Complete

---

## Executive Summary

This deep dive analyzes video clipping tools, video processing libraries, and orchestration platforms vendored in content-machine. These tools enable intelligent highlight detection, programmatic video manipulation, and pipeline orchestration.

### Key Discoveries

| Category | Tool | Key Value |
|----------|------|-----------|
| **Clipping** | FunClip | ASR-based clipping + LLM integration |
| **Clipping** | PySceneDetect | Content-aware scene detection |
| **Clipping** | AutoClipper | Live stream → YouTube Shorts |
| **Video Processing** | MoviePy | Pythonic video editing |
| **Video Processing** | FFMPerative | Chat-to-video via LLM |
| **Orchestration** | Temporal | Durable execution platform |
| **Orchestration** | n8n | Visual workflow automation + AI |
| **End-to-End** | AutoTube | n8n + Ollama + OpenTTS pipeline |

---

## 1. Video Clipping Tools

### 1.1 FunClip

**Repository:** `vendor/clipping/FunClip`  
**By:** Alibaba DAMO Academy  
**License:** Open Source

FunClip is an **ASR-based video clipping tool** that uses Alibaba's Paraformer models for speech recognition and supports **LLM-powered smart clipping**.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FunClip Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  Video   │───▶│ FunASR   │───▶│  LLM     │───▶│  Clip    │   │
│  │  Input   │    │ (ASR)    │    │ Inference│    │ Extract  │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│                        │                              │          │
│                        ▼                              ▼          │
│                  ┌──────────┐                  ┌──────────┐      │
│                  │ Speaker  │                  │ Subtitle │      │
│                  │ Diarize  │                  │ Embed    │      │
│                  └──────────┘                  └──────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Features

| Feature | Description |
|---------|-------------|
| **Paraformer-Large** | Industrial-grade Chinese ASR (13M+ downloads) |
| **Timestamp Prediction** | Integrated precise timestamps |
| **Speaker Diarization** | CAM++ for speaker recognition |
| **Hotword Customization** | SeACo-Paraformer for entity recognition |
| **LLM Integration** | GPT/Qwen for smart clip selection |
| **Multi-segment Clipping** | Free selection of multiple segments |

#### LLM-Powered Clipping

```bash
# Step 1: Run ASR
python funclip/videoclipper.py --stage 1 \
    --file video.mp4 --output_dir ./output

# Step 2: LLM selects clips (in Gradio UI)
# Configure model + API key → Click "LLM Inference"
# → Click "AI Clip"

# Command line clipping
python funclip/videoclipper.py --stage 2 \
    --file video.mp4 \
    --dest_text '我们把它跟乡村振兴去结合起来' \
    --start_ost 0 --end_ost 100 \
    --output_file './output/clip.mp4'
```

#### Why FunClip for content-machine

1. **ASR-Based**: Clip by text content, not just time
2. **LLM Integration**: Smart clip selection
3. **Speaker Targeting**: Clip specific speakers
4. **Subtitle Generation**: Full SRT export
5. **Chinese + English**: Multi-language support

### 1.2 PySceneDetect

**Repository:** `vendor/clipping/pyscenedetect`  
**Stars:** 2K+  
**License:** BSD-3-Clause

PySceneDetect is a **content-aware scene detection** tool that identifies cuts, fades, and transitions.

#### Detectors

| Detector | Description | Use Case |
|----------|-------------|----------|
| **ContentDetector** | Changes in frame content | Fast cuts |
| **AdaptiveDetector** | Two-pass, handles camera movement | Action footage |
| **ThresholdDetector** | Fade in/out events | Transitions |

#### API Usage

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Detect scenes
scene_list = detect('my_video.mp4', ContentDetector())

# Print scene boundaries
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

# Split into individual clips
split_video_ffmpeg('my_video.mp4', scene_list)
```

#### CLI Usage

```bash
# Detect and split on fast cuts
scenedetect -i video.mp4 split-video

# Save frames from each scene
scenedetect -i video.mp4 save-images

# Skip first 10 seconds
scenedetect -i video.mp4 time -s 10s
```

#### Integration Pattern

```python
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector

def find_highlight_segments(video_path, threshold=27.0):
    """Find natural scene boundaries for potential clip points."""
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))
    scene_manager.detect_scenes(video, show_progress=True)
    return scene_manager.get_scene_list()
```

### 1.3 AutoClipper

**Repository:** `vendor/clipping/autoclipper`  
**Architecture:** FastAPI + Celery + React

AutoClipper **automatically clips highlights from YouTube/Twitch/Kick** and uploads to YouTube.

#### Architecture

```
┌──────────────────────────────────────────────────────┐
│                   AutoClipper                         │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│  │  FastAPI │───▶│  Celery  │───▶│ YouTube  │        │
│  │  Backend │    │  Worker  │    │  Upload  │        │
│  └──────────┘    └──────────┘    └──────────┘        │
│       │                │                              │
│       ▼                ▼                              │
│  ┌──────────┐    ┌──────────┐                        │
│  │  React   │    │  Redis   │                        │
│  │ Frontend │    │  Queue   │                        │
│  └──────────┘    └──────────┘                        │
└──────────────────────────────────────────────────────┘
```

#### Deployment (Google Cloud Run)

```bash
# Build and deploy
docker build -f backend/Dockerfile -t gcr.io/$PROJECT/auto-clipper-backend .
docker build -f frontend/Dockerfile -t gcr.io/$PROJECT/auto-clipper-frontend .

gcloud run deploy auto-clipper-backend \
  --image gcr.io/$PROJECT/auto-clipper-backend:latest \
  --set-env-vars REDIS_URL=redis://<IP>:6379,YOUTUBE_API_KEY=<KEY>
```

### 1.4 Clip-Anything

**Repository:** `vendor/Clip-Anything`  
**API:** https://docs.vadoo.tv

Clip-Anything uses **multimodal AI** (visual, audio, sentiment) to find clip-worthy moments.

#### Features

| Feature | Description |
|---------|-------------|
| **Advanced Analysis** | Visual, audio, sentiment cues |
| **Virality Scoring** | Rate each scene's potential |
| **Prompt-Based** | "Find all funny moments" |
| **Object Detection** | Find specific objects/scenes |

---

## 2. Video Processing Libraries

### 2.1 MoviePy

**Repository:** `vendor/video-processing/moviepy`  
**Version:** 2.0 (breaking changes from v1)  
**License:** MIT

MoviePy is a **Pythonic video editing library** for cuts, concatenations, compositing, and effects.

#### Core Concepts

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and subclip
clip = (
    VideoFileClip("input.mp4")
    .subclipped(10, 20)  # v2 syntax (was .subclip in v1)
    .with_volume_scaled(0.8)
)

# Add text overlay
txt_clip = TextClip(
    font="Arial.ttf",
    text="Hello!",
    font_size=70,
    color='white'
).with_duration(10).with_position('center')

# Composite and export
final = CompositeVideoClip([clip, txt_clip])
final.write_videofile("output.mp4")
```

#### How It Works

1. Import media → numpy arrays
2. Apply effects (Python operations on arrays)
3. Composite clips (transparency, positioning)
4. Encode back to mp4/webm/gif

#### Common Operations

```python
# Concatenate clips
from moviepy import concatenate_videoclips
final = concatenate_videoclips([clip1, clip2, clip3])

# Add audio
clip = clip.with_audio(AudioFileClip("music.mp3"))

# Resize
clip = clip.resized(height=1080)

# Fade effects
clip = clip.with_effects([vfx.CrossFadeIn(1), vfx.CrossFadeOut(1)])
```

### 2.2 FFMPerative

**Repository:** `vendor/video-processing/FFMPerative`  
**Model:** ffmperative-7b (LLaMA2 fine-tune)

FFMPerative is a **chat-to-video copilot** powered by LLMs.

#### Natural Language Video Editing

```bash
# Add closed captions
ffmperative do --prompt "merge subtitles 'captions.srt' with video 'video.mp4' calling it 'video_caps.mp4'"

# Compose social media edit
ffmperative compose --clips /path/to/clips --output edit.mp4 --prompt "Edit for social media"
```

#### Python API

```python
from ffmperative import ffmp

# Natural language commands
ffmp("sample the 5th frame from '/path/to/video.mp4'")
ffmp("resize video to 1080x1920 portrait")
ffmp("add 2 second fade in and fade out")
```

#### Capabilities

- Change speed, resize, crop, flip, reverse
- Speech-to-text transcription
- Closed captions generation
- Batch processing

---

## 3. Orchestration Platforms

### 3.1 Temporal

**Repository:** `vendor/orchestration/temporal`  
**By:** Temporal Technologies (Uber Cadence fork)  
**License:** MIT

Temporal is a **durable execution platform** for building resilient, scalable applications.

#### Core Concepts

| Concept | Description |
|---------|-------------|
| **Workflow** | Long-running business logic |
| **Activity** | Individual units of work |
| **Worker** | Executes workflows/activities |
| **Durable Execution** | Automatic recovery from failures |

#### Go SDK Example

```go
// Workflow definition
func VideoGenerationWorkflow(ctx workflow.Context, input VideoInput) error {
    // Activities are retried automatically
    var script string
    err := workflow.ExecuteActivity(ctx, GenerateScript, input.Topic).Get(ctx, &script)
    if err != nil {
        return err
    }
    
    var audioPath string
    err = workflow.ExecuteActivity(ctx, GenerateAudio, script).Get(ctx, &audioPath)
    if err != nil {
        return err
    }
    
    // Long-running activities with heartbeats
    var videoPath string
    err = workflow.ExecuteActivity(ctx, RenderVideo, audioPath).Get(ctx, &videoPath)
    
    return nil
}
```

#### Why Temporal for content-machine

1. **Automatic Retries**: Handle API failures gracefully
2. **Long-Running Workflows**: Video rendering can take minutes
3. **Visibility**: Track workflow state in Web UI
4. **Versioning**: Safe workflow updates
5. **Timers & Schedules**: Scheduled publishing

#### Quick Start

```bash
brew install temporal
temporal server start-dev
# Web UI at http://localhost:8233
```

### 3.2 n8n

**Repository:** `vendor/orchestration/n8n`  
**License:** Fair-code (Sustainable Use License)

n8n is a **visual workflow automation platform** with 400+ integrations and native AI capabilities.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Visual Editor** | No-code workflow building |
| **Code Nodes** | JavaScript/Python when needed |
| **AI-Native** | LangChain integration |
| **400+ Integrations** | YouTube, TikTok, OpenAI, etc. |
| **Self-Hostable** | Full control over data |

#### Quick Start

```bash
# npx (instant)
npx n8n

# Docker
docker volume create n8n_data
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

#### Example Workflow Structure

```json
{
  "nodes": [
    {"type": "n8n-nodes-base.manualTrigger"},
    {"type": "n8n-nodes-base.httpRequest", "name": "Generate Script"},
    {"type": "n8n-nodes-base.httpRequest", "name": "TTS Generation"},
    {"type": "n8n-nodes-base.httpRequest", "name": "Render Video"},
    {"type": "n8n-nodes-base.youtube", "name": "Upload to YouTube"}
  ],
  "connections": {...}
}
```

---

## 4. End-to-End Automation Systems

### 4.1 AutoTube

**Repository:** `vendor/Autotube`  
**Architecture:** n8n + Ollama + OpenTTS + Python API

AutoTube is a **complete YouTube Shorts factory** with visual workflow automation.

#### System Components

| Component | Port | Purpose |
|-----------|------|---------|
| **n8n** | 5678 | Workflow orchestration |
| **Ollama** | 11434 | LLaMA 3.1 for scripts |
| **OpenTTS** | 5500 | Voice synthesis |
| **Python API** | 5001 | Video creation |
| **PostgreSQL** | 5432 | n8n database |
| **Redis** | 6379 | Caching |
| **FileBrowser** | 8080 | File management |

#### Pipeline Flow

```
Topic Input → Script Generation → AI Image Generation → 
Voice Synthesis → Video Compilation → YouTube Upload
```

#### Video Specifications

- **Format**: 1080x1920 (9:16 vertical)
- **Duration**: ~30 seconds
- **Effects**: Ken Burns zoom, crossfade transitions
- **Audio**: OpenTTS voice synthesis

#### Setup

```bash
git clone https://github.com/Hritikraj8804/Autotube.git
cd Autotube/short_automation
cp .env.example .env
# Edit .env with credentials
docker-compose up -d

# Download AI model
docker exec youtube-ai ollama pull llama3.1:8b
```

### 4.2 AutoShortsAI

**Repository:** `vendor/AutoShortsAI`  
**Type:** SaaS Platform (Reference)

AutoShortsAI is a **commercial reference** for automated video creation and scheduling.

#### Architecture Insights

| Component | Technology |
|-----------|------------|
| **Script Generation** | GPT-4 |
| **Visual Generation** | Stable Diffusion |
| **Voiceover** | Custom TTS |
| **Auto-Posting** | YouTube/TikTok APIs |

#### Key Differentiators

1. **Unique Videos**: Generative AI, not template reuse
2. **Auto-Scheduling**: Daily posts on autopilot
3. **Multi-Platform**: YouTube, TikTok support

---

## 5. Integration Patterns for content-machine

### Pattern 1: FunClip + LLM for Smart Clipping

```python
from funclip import VideoClipper
import openai

async def smart_clip(video_path: str, criteria: str):
    # Step 1: ASR transcription
    clipper = VideoClipper()
    transcript = clipper.recognize(video_path)
    
    # Step 2: LLM selection
    response = await openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Select viral segments from transcript."},
            {"role": "user", "content": f"Criteria: {criteria}\n\nTranscript: {transcript}"}
        ]
    )
    
    segments = parse_segments(response.choices[0].message.content)
    
    # Step 3: Extract clips
    clips = []
    for seg in segments:
        clip = clipper.clip(video_path, seg.start, seg.end)
        clips.append(clip)
    
    return clips
```

### Pattern 2: PySceneDetect + MoviePy Pipeline

```python
from scenedetect import detect, ContentDetector
from moviepy import VideoFileClip, concatenate_videoclips

def create_highlight_reel(video_path: str, max_scenes: int = 5):
    # Detect scenes
    scenes = detect(video_path, ContentDetector())
    
    # Load video
    full_clip = VideoFileClip(video_path)
    
    # Extract best scenes (could use LLM to rank)
    selected_scenes = scenes[:max_scenes]
    
    clips = []
    for start, end in selected_scenes:
        clip = full_clip.subclipped(start.get_seconds(), end.get_seconds())
        clips.append(clip)
    
    # Concatenate with transitions
    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile("highlight_reel.mp4")
```

### Pattern 3: Temporal Workflow for Video Pipeline

```typescript
// src/workflows/video-generation.ts
import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

const { generateScript, generateAudio, fetchAssets, renderVideo, publish } = 
  proxyActivities<typeof activities>({
    startToCloseTimeout: '10 minutes',
    retry: { maximumAttempts: 3 }
  });

export async function videoGenerationWorkflow(input: VideoInput): Promise<string> {
  // Generate script
  const script = await generateScript(input.topic, input.style);
  
  // Parallel: audio + assets
  const [audioPath, assets] = await Promise.all([
    generateAudio(script),
    fetchAssets(script.keywords)
  ]);
  
  // Render video (long-running)
  const videoPath = await renderVideo({ script, audioPath, assets });
  
  // Optional: wait for optimal posting time
  if (input.scheduleFor) {
    await sleep(input.scheduleFor - Date.now());
  }
  
  // Publish
  const videoUrl = await publish(videoPath, input.platforms);
  
  return videoUrl;
}
```

### Pattern 4: n8n Visual Workflow

```json
{
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "hours", "hours": 24 }] } }
    },
    {
      "name": "Get Trending Topic",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": { "url": "http://localhost:5001/trending" }
    },
    {
      "name": "Generate Script",
      "type": "n8n-nodes-base.ollama",
      "parameters": { "model": "llama3.1:8b" }
    },
    {
      "name": "Generate Audio",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": { "url": "http://localhost:5500/api/tts" }
    },
    {
      "name": "Render Video",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": { "url": "http://localhost:5001/render" }
    },
    {
      "name": "Upload to YouTube",
      "type": "n8n-nodes-base.youTube",
      "parameters": { "operation": "upload" }
    }
  ]
}
```

---

## 6. Comparison Matrix

### Clipping Tools

| Tool | Method | LLM Support | Speaker ID | Languages |
|------|--------|-------------|------------|-----------|
| FunClip | ASR-based | ✅ GPT/Qwen | ✅ CAM++ | CN, EN |
| PySceneDetect | Visual | ❌ | ❌ | N/A |
| AutoClipper | Highlight detection | ✅ | ❌ | EN |
| Clip-Anything | Multimodal | ✅ | ❌ | Multi |

### Orchestration Platforms

| Platform | Type | Language | Durability | AI-Native |
|----------|------|----------|------------|-----------|
| Temporal | Code-first | Go, TS, Python | ✅ Full | ❌ |
| n8n | Visual | JS/Python | ✅ Checkpoints | ✅ LangChain |
| BullMQ | Queue | TypeScript | ❌ (Redis) | ❌ |
| Airflow | DAGs | Python | ✅ | ❌ |

### Video Processing

| Library | Language | Interface | Performance | Learning Curve |
|---------|----------|-----------|-------------|----------------|
| MoviePy | Python | Pythonic | Moderate | Low |
| FFmpeg | CLI | Commands | Fast | High |
| FFMPerative | Python | Chat | Moderate | Very Low |
| PyAV | Python | Low-level | Fast | High |

---

## 7. Recommendations

### For content-machine MVP

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| **Clipping** | PySceneDetect | Simple, proven, BSD license |
| **Video Processing** | MoviePy | Pythonic, good docs |
| **Orchestration** | BullMQ | TypeScript native, simple |
| **Future Scale** | Temporal | When workflows get complex |

### Implementation Priorities

1. **Week 1-2**: Setup BullMQ + basic pipeline
2. **Week 3-4**: Integrate MoviePy for video composition
3. **Month 2**: Add FunClip for ASR-based clipping
4. **Month 3**: Evaluate Temporal for complex workflows

### Architecture Decision

```
                    ┌─────────────┐
                    │   BullMQ    │
                    │   (Redis)   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Research │    │  Render  │    │ Publish  │
    │  Worker  │    │  Worker  │    │  Worker  │
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ GPT/LLM  │    │ MoviePy  │    │ TikTok   │
    │ Research │    │ Remotion │    │ YouTube  │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 8. Key Code Patterns

### Pattern: Scene Detection → Clip Selection → Export

```python
from scenedetect import detect, ContentDetector
from moviepy import VideoFileClip
import openai

async def create_viral_clips(video_path: str, topic: str):
    # 1. Detect scenes
    scenes = detect(video_path, ContentDetector())
    
    # 2. Extract scene descriptions (could use vision LLM)
    scene_info = [{"start": s[0].get_seconds(), "end": s[1].get_seconds()} 
                  for s in scenes]
    
    # 3. LLM ranks scenes for virality
    response = await openai.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": f"Rank these scenes for a viral {topic} video: {scene_info}"
        }]
    )
    ranked = parse_ranking(response.choices[0].message.content)
    
    # 4. Extract top clips
    video = VideoFileClip(video_path)
    clips = []
    for scene in ranked[:5]:
        clip = video.subclipped(scene["start"], scene["end"])
        clips.append(clip)
    
    return clips
```

### Pattern: Temporal Activity Retry

```typescript
// activities.ts
export async function renderVideo(input: RenderInput): Promise<string> {
  const { script, audioPath, assets } = input;
  
  // Long-running render with progress
  const result = await remotion.render({
    composition: 'TikTokVideo',
    props: { script, audioPath, assets },
    onProgress: (p) => Context.current().heartbeat(p)
  });
  
  return result.outputPath;
}

// workflow.ts
const { renderVideo } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  heartbeatTimeout: '1 minute',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2
  }
});
```

---

## 9. References

| Tool | Documentation | Key Resource |
|------|---------------|--------------|
| FunClip | https://github.com/alibaba-damo-academy/FunClip | Gradio demo |
| PySceneDetect | https://scenedetect.com/docs | CLI examples |
| MoviePy | https://zulko.github.io/moviepy | v2 migration |
| Temporal | https://docs.temporal.io | Go/TS tutorials |
| n8n | https://docs.n8n.io | AI workflow guide |
| FFMPerative | https://github.com/remyxai/FFMPerative | LLM commands |

---

**Document Status:** Complete  
**Next Steps:** Implement PySceneDetect + MoviePy integration for MVP  
**Related Docs:** 
- [observability-research-infrastructure-DEEP-20260102.md](observability-research-infrastructure-DEEP-20260102.md)
- [e2e-video-generation-patterns-DEEP-20260102.md](e2e-video-generation-patterns-DEEP-20260102.md)
