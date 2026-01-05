# Orchestration & Advanced Video Generators Deep Dive

**Date:** 2026-01-02
**Status:** Research Complete
**Category:** Workflow Orchestration & Video Generation

---

## Executive Summary

This document analyzes advanced video generation systems with sophisticated orchestration patterns, including Crank (plugin architecture), AutoTube (n8n workflows), VideoGraphAI (graph agents), OBrainRot (forced alignment), and supporting infrastructure like BullMQ, Langfuse, and Promptfoo. These patterns inform content-machine's production pipeline design.

---

## 1. Crank - Plugin-Based Video Generator

### 1.1 Overview

**Repository:** `vendor/Crank/`  
**Language:** Python 3.13 (uv managed)  
**Key Feature:** Extensible plugin architecture for background videos

Crank is a modern, well-architected video generator that produces complete YouTube Shorts from a topic with full metadata, ready for upload.

### 1.2 Architecture

```
src/
├── core/
│   ├── app.py          # CLI entry, workspace management
│   └── orchestrator.py # Pipeline coordination
├── plugins/
│   ├── base.py         # Abstract plugin interface
│   └── registry.py     # Plugin discovery
├── preset/             # YAML configuration handling
├── prompt/             # LLM prompt templates
├── response/           # Gemini API integration
├── caption/            # Whisper-based captioning
├── video/              # FFmpeg video assembly
└── youtube/            # YouTube upload API
```

### 1.3 Plugin System

```python
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict

class BackgroundVideoPlugin(ABC):
    """Abstract base class for background video plugins.

    Plugins are self-contained and load their own configuration.
    """

    def __init__(self, workspace: Path) -> None:
        self.workspace: Path = workspace

    @abstractmethod
    def get_media(self, data: Dict[str, Any]) -> Path:
        """Generate and return path to background video.

        Args:
            data: ALL available pipeline data:
                - search_term: Search query
                - transcript: Generated text
                - title: Video title
                - description: Video description
                - categoryId: YouTube category

        Returns:
            Path to processed background video file.
        """
        pass
```

### 1.4 Orchestrator Pattern

```python
class Orchestrator:
    """Coordinates the end-to-end video generation pipeline."""

    def __init__(
        self,
        preset: YmlHandler,
        plugin: BackgroundVideoPlugin,
        gemini: Gemini,
        editor: Editor,
        caption: Handler,
        uploader: Optional[Uploader],
    ) -> None:
        self.preset = preset
        self.plugin = plugin
        self.gemini = gemini
        self.editor = editor
        self.caption = caption
        self.uploader = uploader
        self.prompt = Prompt()

    def _process_task(self, data: Dict[str, str]) -> Path:
        """Generate video assets and assemble final output."""

        # 1. Get background video from plugin
        media_path = self.plugin.get_media(data)

        # 2. Generate audio from transcript
        transcript = data.get("transcript", "")
        audio_path = self.gemini.get_audio(transcript=transcript)

        # 3. Create captions aligned to audio
        ass_path = self.caption.get_captions(audio_path=audio_path)

        # 4. Assemble final video
        video_path = self.editor.assemble(
            ass_path=ass_path,
            audio_path=audio_path,
            media_path=media_path
        )

        return video_path
```

### 1.5 FFmpeg Video Assembly

```python
class Editor:
    """Handles assembling video from media, audio, and subtitles."""

    def assemble(self, ass_path, audio_path, media_path) -> Path:
        audio_duration = self._get_duration(audio_path)
        media_duration = self._get_duration(media_path)
        final_duration = min(audio_duration, media_duration, 60.0)

        cmd = [
            "ffmpeg", "-y",
            "-i", str(media_path),
            "-i", str(audio_path),
            "-filter_complex",
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,"
            f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,ass={ass_path}[v]",
            "-map", "[v]",
            "-map", "1:a:0",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-t", str(final_duration),
            str(output_path),
        ]
        subprocess.run(cmd, check=True)
        return output_path
```

### 1.6 Configuration System

```yaml
# config/preset.yml
NAME: 'My Channel'
PROMPT: 'Topic or idea for the video'
UPLOAD: true
DELAY: 2.5 # Hours between uploads
WHISPER_MODEL: 'small' # tiny, base, small, medium, large-v3
FONT: 'Comic Sans MS'
OAUTH_PATH: 'secrets.json'
```

```yaml
# config/prompt.yml
GET_CONTENT: 'Guidelines for generating transcript'
GET_TITLE: 'Guidelines for generating title'
GET_SEARCH_TERM: 'Search term for background video'
GET_DESCRIPTION: 'Guidelines for description'
GET_CATEGORY_ID: 'Guidelines for category ID'
```

### 1.7 Key Patterns for content-machine

1. **Plugin Architecture:** Extensible background video sources
2. **YAML Configuration:** Declarative pipeline settings
3. **Workspace Management:** Temporary file handling
4. **Async Loading Animation:** User feedback during processing
5. **Quota Management:** API rate limit tracking

---

## 2. AutoTube - n8n Workflow Automation

### 2.1 Overview

**Repository:** `vendor/Autotube/`  
**Type:** Docker-based automation  
**Key Feature:** Visual n8n workflow orchestration

AutoTube is a complete automation pipeline using n8n for workflow orchestration, demonstrating how visual automation tools can drive video production.

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AutoTube System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌────────┐ │
│  │   n8n    │──▶│ Ollama   │──▶│  Python  │──▶│YouTube │ │
│  │ Workflow │    │   AI    │    │ Video API│    │  API   │ │
│  └──────────┘    └─────────┘    └──────────┘    └────────┘ │
│       │               │                │              │     │
│       ▼               ▼                ▼              ▼     │
│  ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌────────┐ │
│  │PostgreSQL│    │ OpenTTS │    │   AI     │    │ Redis  │ │
│  │    DB    │    │  Voice  │    │  Images  │    │ Cache  │ │
│  └──────────┘    └─────────┘    └──────────┘    └────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Service Components

| Service     | Port  | Purpose                    |
| ----------- | ----- | -------------------------- |
| n8n         | 5678  | Workflow orchestration     |
| Ollama      | 11434 | LLaMA 3.1 for scripts      |
| OpenTTS     | 5500  | Text-to-speech             |
| Python API  | 5001  | Video creation + AI images |
| PostgreSQL  | 5432  | n8n database               |
| Redis       | 6379  | Caching layer              |
| FileBrowser | 8080  | File management UI         |

### 2.4 Video Specifications

```yaml
Format: Vertical 9:16 (1080x1920)
Duration: ~30 seconds (YouTube Shorts)
FPS: 30
Effects:
  - Ken Burns zoom
  - Crossfade transitions
Audio: OpenTTS voice synthesis
```

### 2.5 Workflow Steps

1. **Script Generation:** AI generates 30-second script (hook, content, CTA)
2. **Image Creation:** Multiple AI images per script section
3. **Voice Generation:** TTS creates professional voiceover
4. **Video Compilation:** Images assembled with transitions, zoom, overlays
5. **YouTube Upload:** Uploaded with title, description, tags

### 2.6 Key Patterns for content-machine

1. **Docker Compose:** Complete containerized pipeline
2. **n8n Orchestration:** Visual workflow design
3. **Redis Caching:** Performance optimization
4. **Ken Burns Effect:** Professional image animation
5. **Batch Operations:** Windows .bat scripts for control

---

## 3. VideoGraphAI - Graph-Based Agents

### 3.1 Overview

**Repository:** `vendor/VideoGraphAI/`  
**Type:** Streamlit application  
**Key Feature:** Graph-based agent orchestration

VideoGraphAI uses a graph-based agent architecture for research-driven video creation.

### 3.2 Pipeline Flow

```
Input → Research → Content Creation → Media Production → Compilation
  ↓         ↓              ↓                 ↓               ↓
Topic   Tavily API    Titles/Scripts    Storyboard      Final Video
Timeframe    ↓         Hashtags        AI Images
Length   Graph Agents  Descriptions    Voiceover
                                       Subtitles
```

### 3.3 Technology Stack

| Component | Technology                |
| --------- | ------------------------- |
| UI        | Streamlit                 |
| Research  | Tavily Search API         |
| LLM       | Groq / OpenAI             |
| Images    | TogetherAI (FLUX.schnell) |
| TTS       | F5-TTS                    |
| Subtitles | Gentle (Docker)           |
| Video     | FFmpeg                    |

### 3.4 Key Features

- **Real-time Research:** Automated content research
- **Dynamic Storyboard:** AI-generated visual sequence
- **Synchronized Captions:** Gentle for forced alignment
- **Configurable Length:** 60/120/180 seconds

### 3.5 Key Patterns for content-machine

1. **Streamlit UI:** Quick prototype interface
2. **Graph Agents:** Research-first approach
3. **Gentle Server:** Docker-based alignment
4. **F5-TTS:** Voice cloning capability

---

## 4. OBrainRot - Forced Alignment System

### 4.1 Overview

**Repository:** `vendor/OBrainRot/`  
**Type:** Reddit-to-video generator  
**Key Feature:** wav2vec2 forced alignment

OBrainRot demonstrates sophisticated caption synchronization using forced alignment technology.

### 4.2 Pipeline

```
Reddit URL → Switch → Scraping → TTS → Pre-processing → Alignment → FFmpeg
                ↓         ↓        ↓         ↓              ↓          ↓
           Thread?    Title    Coqui    RegEx Clean   wav2vec2   Final
           VADER      Story    xTTSv2                 Trellis    Video
           LLaMA 3.3
```

### 4.3 Forced Alignment Process

```python
# Based on Motu Hira's Forced Alignment with Wav2Vec2

# 1. Get frame-wise label probability from audio
audio_features = wav2vec2_model(audio_waveform)
emission = audio_features.logits

# 2. Create trellis matrix for label/time alignment
trellis = compute_trellis(emission, transcript_tokens)

# 3. Find most likely path through trellis
path = backtrack(trellis, emission)

# 4. Generate .ass subtitle file with timestamps
segments = merge_repeats(path)
write_ass_file(segments)
```

### 4.4 Image Overlay Algorithm

```python
# Complex algorithm for sentence-aligned image switching
def overlay_images(video, images, timestamps):
    """Impose images on video feed.

    For every sentence spoken, switch to next image.
    Aligns with timestamp and detects sentence boundaries.
    """
    current_image_idx = 0
    for segment in timestamps:
        if is_sentence_end(segment):
            current_image_idx = (current_image_idx + 1) % len(images)
        overlay_at_timestamp(
            video,
            images[current_image_idx],
            segment.start,
            segment.end
        )
```

### 4.5 Key Patterns for content-machine

1. **wav2vec2 Alignment:** Precise caption timing
2. **Sentiment Filtering:** VADER + LLM for content selection
3. **Image Switching:** Visual variety per sentence
4. **Celery Workers:** Background job processing

---

## 5. Observability Stack

### 5.1 Langfuse

**Repository:** `vendor/observability/langfuse/`  
**Type:** LLM engineering platform

```yaml
Features:
  - LLM Application Observability (tracing)
  - Prompt Management (versioning, collaboration)
  - Evaluations (LLM-as-judge, user feedback, manual)
  - Datasets (test sets, benchmarks)
  - LLM Playground (prompt iteration)
  - Comprehensive API

Integrations:
  - OpenAI, Anthropic, Google
  - LangChain, LlamaIndex
  - Vercel AI SDK
  - LiteLLM
```

```python
# Langfuse integration with LangChain
from langfuse.callback import CallbackHandler

handler = CallbackHandler(
    public_key="pk-...",
    secret_key="sk-...",
)

chain.invoke({"input": "..."}, config={"callbacks": [handler]})
```

### 5.2 Promptfoo

**Repository:** `vendor/observability/promptfoo/`  
**Type:** LLM evals & red teaming

```yaml
Features:
  - Automated prompt evaluations
  - Red teaming / vulnerability scanning
  - Model comparison (side-by-side)
  - CI/CD integration
  - Code scanning for LLM security

Quick Start: npx promptfoo@latest init
  npx promptfoo eval
```

```yaml
# promptfoo.yaml
prompts:
  - 'Write a script about {{topic}}'

providers:
  - openai:gpt-4
  - anthropic:claude-3

tests:
  - vars:
      topic: AI developer tools
    assert:
      - type: contains
        value: 'hook'
      - type: llm-rubric
        value: 'Script is engaging and under 60 seconds'
```

### 5.3 Observability for content-machine

```typescript
// Recommended observability setup
import { withTrace } from '@openai/agents';
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

async function generateVideo(topic: string) {
  const trace = langfuse.trace({ name: 'video-generation' });

  return await withTrace('Video Pipeline', async () => {
    // 1. Trend research
    const trendSpan = trace.span({ name: 'trend-research' });
    const trends = await researchTrends(topic);
    trendSpan.end({ output: trends });

    // 2. Script generation
    const scriptSpan = trace.span({ name: 'script-generation' });
    const script = await generateScript(trends);
    scriptSpan.end({ output: script });

    // 3. Video rendering
    const renderSpan = trace.span({ name: 'video-render' });
    const video = await renderVideo(script);
    renderSpan.end({ output: { path: video.path } });

    return video;
  });
}
```

---

## 6. Job Queue: BullMQ

### 6.1 Overview

**Repository:** `vendor/job-queue/bullmq/`  
**Type:** Redis-based distributed queue

BullMQ is the fastest, most reliable Redis-based queue for Node.js.

### 6.2 Core Features

```yaml
Features:
  - Atomic job operations
  - Parent-child job flows
  - Delayed jobs
  - Rate limiting
  - Retries with backoff
  - Concurrency control
  - Job prioritization
  - Real-time events
```

### 6.3 Usage Pattern for content-machine

```typescript
import { Queue, Worker, FlowProducer } from 'bullmq';

// Define queues for each pipeline stage
const queues = {
  trend: new Queue('trend-research'),
  script: new Queue('script-generation'),
  capture: new Queue('ui-capture'),
  render: new Queue('video-render'),
  upload: new Queue('video-upload'),
};

// Parent-child flow for video production
const flowProducer = new FlowProducer();

await flowProducer.add({
  name: 'produce-video',
  queueName: 'video-production',
  data: { topic: 'AI coding tools' },
  children: [
    {
      name: 'research-trends',
      queueName: 'trend-research',
      data: { sources: ['reddit', 'hackernews'] },
    },
    {
      name: 'generate-script',
      queueName: 'script-generation',
      data: { duration: 45 },
      children: [
        {
          name: 'capture-ui',
          queueName: 'ui-capture',
          data: { product: 'copilot' },
        },
      ],
    },
  ],
});

// Workers process jobs
const trendWorker = new Worker('trend-research', async (job) => {
  const trends = await researchTrends(job.data.sources);
  return trends;
});

const renderWorker = new Worker(
  'video-render',
  async (job) => {
    const video = await renderRemotionVideo(job.data);
    return { path: video.outputPath };
  },
  { concurrency: 2 }
); // Limit concurrent renders
```

---

## 7. Schema Validation: Instructor

### 7.1 Overview

**Repository:** `vendor/schema/instructor/`  
**Type:** Structured LLM outputs

Instructor provides reliable JSON from any LLM, built on Pydantic.

### 7.2 Key Features

```python
import instructor
from pydantic import BaseModel

class VideoScript(BaseModel):
    hook: str
    main_points: list[str]
    call_to_action: str
    duration_estimate: int

# Works with any provider
client = instructor.from_provider("openai/gpt-4o")
# client = instructor.from_provider("anthropic/claude-3-5-sonnet")
# client = instructor.from_provider("ollama/llama3.2")

script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[{
        "role": "user",
        "content": "Write a 30-second script about AI tools"
    }],
)

print(script.hook)  # Validated and typed!
```

### 7.3 Automatic Retries

```python
from instructor import retry

@retry(max_retries=3)
client = instructor.from_provider("openai/gpt-4o")

# Failed validations automatically retry with error context
script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[...],
)
```

### 7.4 Relationship to PydanticAI

> **Use Instructor for fast extraction, reach for PydanticAI when you need agents.**
>
> - Instructor: Schema-first flows, simple, cheap
> - PydanticAI: Agent runtime, tools, observability, production dashboards

---

## 8. Integration Architecture

### 8.1 Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                  content-machine Production Pipeline             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐   │
│  │ BullMQ  │────▶│ OpenAI  │────▶│ Capture │────▶│Remotion │   │
│  │  Queue  │     │ Agents  │     │Playwright│     │ Render  │   │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘   │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐   │
│  │  Redis  │     │Langfuse │     │ Qdrant  │     │  S3/    │   │
│  │  Cache  │     │ Tracing │     │ Memory  │     │ MinIO   │   │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MCP Server Layer                      │   │
│  │  [Reddit] [YouTube] [Playwright] [Qdrant] [Postgres]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Job Flow

```typescript
// Video production job flow
interface VideoJob {
  id: string;
  topic: string;
  product?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stages: {
    trend?: { status: string; data?: TrendData };
    script?: { status: string; data?: ScriptData };
    capture?: { status: string; data?: CaptureData };
    render?: { status: string; data?: RenderData };
    upload?: { status: string; data?: UploadData };
  };
}

// BullMQ flow definition
const videoFlow = {
  name: 'video-production',
  children: [
    { name: 'trend-research', queueName: 'trend' },
    { name: 'script-generation', queueName: 'script', deps: ['trend-research'] },
    { name: 'ui-capture', queueName: 'capture', deps: ['script-generation'] },
    { name: 'video-render', queueName: 'render', deps: ['ui-capture'] },
    { name: 'video-upload', queueName: 'upload', deps: ['video-render'] },
  ],
};
```

### 8.3 Error Handling Pattern

```typescript
// From Crank's quota management pattern
class PipelineOrchestrator {
  private async handleQuotaExceeded(): Promise<void> {
    await this.preset.set('LIMIT_TIME', new Date().toISOString());
    await this.notifyAdmin('Quota exceeded, pausing pipeline');
  }

  private async executeWithRetry<T>(task: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        lastError = error;

        if (this.isQuotaError(error)) {
          await this.handleQuotaExceeded();
          throw error; // Don't retry quota errors
        }

        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }
}
```

---

## 9. Recommendations

### 9.1 Architecture Patterns to Adopt

| Pattern             | Source       | Application                         |
| ------------------- | ------------ | ----------------------------------- |
| Plugin Architecture | Crank        | Extensible background video sources |
| YAML Configuration  | Crank        | Declarative pipeline settings       |
| n8n Workflows       | AutoTube     | Visual pipeline design (optional)   |
| Forced Alignment    | OBrainRot    | Precise caption synchronization     |
| Graph Agents        | VideoGraphAI | Research-first content creation     |
| Job Flows           | BullMQ       | Pipeline stage coordination         |
| Tracing             | Langfuse     | LLM observability                   |
| Eval                | Promptfoo    | Prompt quality assurance            |

### 9.2 Recommended Stack

```yaml
Core:
  Agent Framework: OpenAI Agents SDK (TypeScript)
  Job Queue: BullMQ (Redis)
  Observability: Langfuse + Promptfoo
  Schema: Zod (TypeScript) / Instructor (Python)

Pipeline:
  Trend Research: OpenAI Agents + MCP (Reddit/HN/YouTube)
  Script Generation: OpenAI Agents + Zod schemas
  Capture: Playwright MCP
  Captions: WhisperX (forced alignment)
  Render: Remotion
  Upload: YouTube API v3

Storage:
  Queue: Redis
  Memory: Qdrant
  Media: MinIO/S3
  Metadata: PostgreSQL
```

### 9.3 Implementation Priority

1. **BullMQ Integration** - Job queue for pipeline stages
2. **Langfuse Setup** - Tracing from day one
3. **Plugin System** - Based on Crank's pattern
4. **YAML Config** - Declarative pipeline settings
5. **Forced Alignment** - WhisperX for captions

---

## 10. References

- Crank: https://github.com/ecnivs/crank
- AutoTube: https://github.com/Hritikraj8804/Autotube
- VideoGraphAI: https://github.com/mikeoller82/VideoGraphAI
- OBrainRot: https://github.com/harvestingmoon/OBrainRot
- BullMQ: https://docs.bullmq.io
- Langfuse: https://langfuse.com/docs
- Promptfoo: https://www.promptfoo.dev/docs
- Instructor: https://python.useinstructor.com

---

**Next Steps:**

1. Implement BullMQ job queue for pipeline stages
2. Setup Langfuse tracing infrastructure
3. Design plugin interface for background videos
4. Create YAML configuration system
5. Integrate WhisperX for forced alignment captions
