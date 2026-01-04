# Deep Dive: Render, MCP, Orchestration & Infrastructure
> **Document ID:** `render-mcp-orchestration-infrastructure-DEEP-20260102`
> **Date:** 2026-01-02
> **Category:** Research Deep Dive
> **Status:** Complete

---

## Executive Summary

This document covers the complete infrastructure layer for the content-machine video generation pipeline, including:

1. **Render Tools** - Remotion ecosystem, Mosaico, template systems
2. **MCP Infrastructure** - FastMCP (Python/TypeScript), MCP Python SDK
3. **Orchestration** - Temporal, n8n workflow automation
4. **Job Queues** - BullMQ for Redis-based distributed processing
5. **Observability** - Langfuse LLM observability, Promptfoo evals
6. **Video Processing** - MoviePy, PySceneDetect, FunClip, Clip-Anything

---

## 1. Render Tools Ecosystem

### 1.1 chuk-motion (MCP + Remotion Integration) ⭐ CRITICAL

**Location:** `vendor/render/chuk-mcp-remotion`
**Repository:** github.com/chrishayuk/chuk-motion
**License:** MIT

**Why It Matters:** This is the **blueprint** for our MCP-to-Remotion pipeline. It provides a complete design-system-first approach to AI-assisted video generation.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Design Token System** | Colors, typography, spacing, motion tokens |
| **51 Video Components** | Charts, scenes, overlays, layouts, animations |
| **7 Built-in Themes** | Tech, Finance, Education, Lifestyle, Gaming, Minimal, Business |
| **Track-Based Timeline** | Professional multi-track composition |
| **Platform Safe Margins** | LinkedIn, TikTok, Instagram, YouTube pre-configured |

#### Component Library (51 Components)

```
Charts (6)        : PieChart, BarChart, HorizontalBarChart, LineChart, AreaChart, DonutChart
Scenes (2)        : TitleScene, EndScreen
Overlays (3)      : LowerThird, TextOverlay, SubscribeButton
Code (3)          : CodeBlock, TypingCode, CodeDiff
Layouts (17)      : Grid, SplitScreen, PiP, Mosaic, DialogueFrame, etc.
Animations (3)    : Counter, LayoutEntrance, PanelCascade
Text Animations (6): TypewriterText, StaggerText, WavyText, TrueFocus, DecryptedText, FuzzyText
Demo Realism (4)  : BrowserFrame, DeviceFrame, Terminal, BeforeAfterSlider
Transitions (2)   : LayoutTransition, PixelTransition
Content (5)       : DemoBox, ImageContent, WebPage, VideoContent, StylizedWebPage
```

#### Platform Safe Margins (Critical for Shorts)

| Platform | Top | Bottom | Left | Right | Notes |
|----------|-----|--------|------|-------|-------|
| **TikTok** | 100px | 180px | 24px | 80px | Side buttons on right |
| **Instagram Stories** | 100px | 120px | 24px | 24px | UI overlays top/bottom |
| **YouTube Shorts** | 20px | 20px | 20px | 20px | Standard margins |
| **LinkedIn Feed** | 40px | 40px | 24px | 24px | Recommended safe zone |

#### MCP Tools API

```python
# Project Management
remotion_create_project(name, theme, fps, width, height)
remotion_get_project_info()
remotion_list_projects()

# Component Addition
remotion_add_title_scene(text, subtitle, variant, animation, duration, track, gap_before)
remotion_add_typing_code(code, language, title, variant, cursor_style, typing_speed)
remotion_add_pie_chart(data, title, duration, track, gap_before)

# Discovery
remotion_list_components(category)
remotion_search_components(query)
remotion_get_component_schema(name)

# Tokens
remotion_list_color_tokens()
remotion_list_typography_tokens()
remotion_list_motion_tokens()
remotion_list_spacing_tokens()
```

#### Time String Support

```python
# All timing parameters support flexible formats
duration="2s"       # 2 seconds
duration="500ms"    # 500 milliseconds
duration="1.5s"     # 1.5 seconds
duration="1m"       # 1 minute
gap_before="250ms"  # Gap between components
```

#### Track-Based Timeline

```python
# Main track: Sequential auto-stacking
remotion_add_title_scene(...)     # Starts at 0s
remotion_add_pie_chart(...)       # Auto-stacks after title

# Overlay track: Layers on top
remotion_add_text_overlay(..., track="overlay", align_to="main", offset=5.0)

# Background track
remotion_add_background(..., track="background")
```

#### Usage Example

```python
# Create project
remotion_create_project(name="product_demo", theme="tech", fps=30, width=1080, height=1920)

# Add components
remotion_add_title_scene(
    text="Welcome to AI Videos",
    subtitle="Created with Design Tokens",
    variant="bold",
    animation="fade_zoom",
    duration="3s"
)

remotion_add_typing_code(
    code="const result = await ai.generate();",
    language="typescript",
    title="AI Integration",
    typing_speed="medium",
    duration="5s"
)

# Render
# cd remotion-projects/product_demo && npm run build
```

**Integration Priority:** CRITICAL - This is our MCP-Remotion bridge.

---

### 1.2 remotion-subtitles (Caption Animations)

**Location:** `vendor/render/remotion-subtitles`
**Package:** `npm install remotion-subtitle`
**License:** Not specified (likely MIT)

#### 17 Pre-built Caption Templates

| Template | Style | Use Case |
|----------|-------|----------|
| TypewriterCaption | Classic typewriter | Tutorials, explanations |
| BounceCaption | Bouncy entrance | Fun, energetic content |
| GlitchCaption | Digital glitch | Tech, gaming |
| NeonCaption | Neon glow | Night themes, club |
| FireCaption | Fire effect | Intense, action |
| ColorfulCaption | Multi-color | Creative, artistic |
| FadeCaption | Smooth fade | Professional, calm |
| ZoomCaption | Scale animation | Emphasis |
| ShakeCaption | Screen shake | Impact, surprise |
| WavingCaption | Wave motion | Friendly, casual |
| ExplosiveCaption | Explosive entrance | High energy |
| GlowingCaption | Soft glow | Elegant, premium |
| LightningCaption | Lightning flash | Speed, power |
| RotatingCaption | 3D rotation | Dynamic |
| ThreeDishCaption | 3D perspective | Modern |
| TiltShiftCaption | Tilt-shift blur | Cinematic |

#### Usage Pattern

```javascript
import { SubtitleSequence } from "remotion-subtitle";
import { TypewriterCaption as Caption } from "remotion-subtitle";

export const Subtitles = () => {
  const { fps } = useVideoConfig();
  const [sequences, setSequences] = useState([]);
  const [loaded, setLoaded] = useState(false);
  
  let subtitles = new SubtitleSequence("audio.srt");
  
  useEffect(() => {
    subtitles.ready().then(() => {
      setSequences(subtitles.getSequences(<Caption />, fps));
      setLoaded(true);
    });
  }, []);
  
  return loaded && <>{sequences}</>;
};
```

#### Custom Styling

```javascript
// Apply custom styles
subtitles.getSequences(<Caption style={{ fontSize: "24px", color: "#FF0000" }} />);

// Get raw array for custom processing
const subtitleArray = subtitles.getArray(fps);
// Each item: { text, startFrame, endFrame }
```

**Integration Priority:** HIGH - Essential for animated captions in shorts.

---

### 1.3 Mosaico (Python Video Composition)

**Location:** `vendor/render/mosaico`
**Package:** `pip install mosaico`
**License:** GitHub (assumed open source)

**Why It Matters:** Python-native video composition with AI script generation integration.

#### Key Features

| Feature | Description |
|---------|-------------|
| **AI Script Generation** | Built-in NewsVideoScriptGenerator |
| **Rich Media Management** | Audio, images, text, subtitles |
| **Flexible Positioning** | Absolute, relative, region-based |
| **Built-in Effects** | Pan, zoom, extensible system |
| **TTS Integration** | ElevenLabs, AssemblyAI transcription |
| **Framework Integration** | Haystack, LangChain support |

#### Quick Start

```python
from mosaico.audio_transcribers.assemblyai import AssemblyAIAudioTranscriber
from mosaico.script_generators.news import NewsVideoScriptGenerator
from mosaico.speech_synthesizers.elevenlabs import ElevenLabsSpeechSynthesizer
from mosaico.video.project import VideoProject
from mosaico.video.rendering import render_video

# Create script generator
script_generator = NewsVideoScriptGenerator(
    context="Your content context",
    language="en",
    num_paragraphs=8,
    api_key=ANTHROPIC_API_KEY,
)

# Create speech synthesizer
speech_synthesizer = ElevenLabsSpeechSynthesizer(
    voice_id="voice_id",
    api_key=ELEVENLABS_API_KEY,
)

# Create audio transcriber
audio_transcriber = AssemblyAIAudioTranscriber(api_key=ASSEMBLYAI_API_KEY)

# Create and render project
project = (
    VideoProject.from_script_generator(script_generator, media)
    .with_title("My Video")
    .with_fps(30)
    .with_resolution((1920, 1080))
    .add_narration(speech_synthesizer)
    .add_captions_from_transcriber(audio_transcriber)
)

render_video(project, "path/to/output")
```

#### Manual Project Creation

```python
from mosaico.assets import ImageAsset, TextAsset, AudioAsset, AssetReference

assets = [
    ImageAsset.from_path("background.jpg", metadata={"description": "Background"}),
    TextAsset.from_data("Subtitle text"),
    AudioAsset.from_path("narration.mp3"),
]

asset_references = [
    AssetReference.from_asset(background, start_time=0, end_time=10),
    AssetReference.from_asset(text, start_time=5, end_time=10),
]

project = (
    VideoProject()
    .with_title("My Video")
    .with_fps(30)
    .with_resolution((1080, 1920))  # Vertical for shorts
    .add_assets(assets)
    .add_timeline_events(asset_references)
)
```

**Integration Priority:** MEDIUM - Alternative Python-native rendering if needed.

---

### 1.4 Remotion Templates

**Location:** `vendor/render/remotion-templates`
**Source:** React Video Editor

Ready-to-use Remotion composition templates.

#### Integration Pattern

```tsx
import { DynamicVideoTemplate } from "./templates/DynamicVideoTemplate";

<Composition
  id="DynamicVideo"
  component={DynamicVideoTemplate}
  durationInFrames={240}
  fps={30}
  width={1920}
  height={1080}
/>
```

---

## 2. MCP Infrastructure

### 2.1 FastMCP Python v2 ⭐ CRITICAL

**Location:** `vendor/mcp/fastmcp-python`
**Package:** `pip install fastmcp`
**Docs:** gofastmcp.com
**License:** MIT

**Why It Matters:** This is the **standard framework** for building MCP servers. FastMCP 1.0 was incorporated into the official MCP SDK.

#### Core Features

| Feature | Description |
|---------|-------------|
| **Tools** | Expose Python functions to LLMs |
| **Resources** | Expose read-only data (like GET endpoints) |
| **Prompts** | Reusable message templates |
| **Context** | Access session, logging, sampling, progress |
| **Enterprise Auth** | Google, GitHub, Azure, Auth0, WorkOS, Discord, JWT, API Keys |
| **Clients** | Connect to any MCP server programmatically |

#### Basic Server

```python
from fastmcp import FastMCP

mcp = FastMCP("Demo 🚀")

@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.resource("config://version")
def get_version():
    return "2.0.1"

@mcp.prompt
def summarize_request(text: str) -> str:
    return f"Please summarize:\n\n{text}"

if __name__ == "__main__":
    mcp.run()
```

#### Context Access

```python
from fastmcp import FastMCP, Context

mcp = FastMCP("My Server")

@mcp.tool
async def process_data(uri: str, ctx: Context):
    # Log to client
    await ctx.info(f"Processing {uri}...")
    
    # Read a resource
    data = await ctx.read_resource(uri)
    
    # Request LLM sampling from client
    summary = await ctx.sample(f"Summarize: {data.content[:500]}")
    
    # Report progress
    await ctx.report_progress(50, 100)
    
    return summary.text
```

#### Enterprise Authentication

```python
from fastmcp.server.auth.providers.google import GoogleProvider

# Two lines to protect a server
auth = GoogleProvider(client_id="...", client_secret="...", base_url="https://myserver.com")
mcp = FastMCP("Protected Server", auth=auth)

# Supported providers: Google, GitHub, Microsoft Azure, Auth0, WorkOS, Descope, Discord, JWT, API Keys
```

#### Client Usage

```python
from fastmcp import Client

async def main():
    # Connect via stdio
    async with Client("my_server.py") as client:
        tools = await client.list_tools()
        result = await client.call_tool("add", {"a": 5, "b": 3})
    
    # Connect via SSE
    async with Client("http://localhost:8000/sse") as client:
        pass
    
    # Connect in-memory (for testing)
    async with Client(mcp) as client:
        pass
```

#### Multi-Server Client

```python
config = {
    "mcpServers": {
        "weather": {"url": "https://weather-api.example.com/mcp"},
        "assistant": {"command": "python", "args": ["./assistant_server.py"]}
    }
}

client = Client(config)

async with client:
    # Access tools with server prefixes
    forecast = await client.call_tool("weather_get_forecast", {"city": "London"})
    answer = await client.call_tool("assistant_answer_question", {"query": "What is MCP?"})
```

**Integration Priority:** CRITICAL - Our primary MCP framework for Python.

---

### 2.2 FastMCP TypeScript

**Location:** `vendor/mcp/fastmcp-typescript`
**Package:** `npm install fastmcp`
**License:** MIT

#### Key Features

| Feature | Description |
|---------|-------------|
| **Standard Schema** | Works with Zod, ArkType, Valibot |
| **HTTP Streaming** | Efficient alternative to SSE |
| **Stateless Mode** | Perfect for serverless |
| **Session Management** | Full session tracking |
| **Media Content** | Image/audio content blocks |
| **Health Checks** | `/ready` endpoint |

#### Basic Server

```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
});

server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.start({
  transportType: "stdio",
});
```

#### HTTP Streaming (for web deployment)

```typescript
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
    stateless: true,  // For serverless
  },
});
```

#### Tool Authorization

```typescript
server.addTool({
  name: "admin-tool",
  description: "An admin-only tool",
  canAccess: (auth) => auth?.role === "admin",
  execute: async () => "Welcome, admin!",
});
```

**Integration Priority:** HIGH - TypeScript MCP servers for Remotion integration.

---

### 2.3 MCP Python SDK (Official)

**Location:** `vendor/mcp/mcp-python-sdk`
**Package:** `pip install "mcp[cli]"`
**License:** MIT

The official SDK. FastMCP is built on top of this.

#### Quickstart

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Demo", json_response=True)

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.resource("greeting://{name}")
def get_greeting(name: str) -> str:
    return f"Hello, {name}!"

@mcp.prompt()
def greet_user(name: str, style: str = "friendly") -> str:
    styles = {
        "friendly": "Please write a warm, friendly greeting",
        "formal": "Please write a formal, professional greeting",
    }
    return f"{styles.get(style, styles['friendly'])} for someone named {name}."

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

#### Lifespan Context (Dependency Injection)

```python
from contextlib import asynccontextmanager
from mcp.server.fastmcp import Context, FastMCP

@asynccontextmanager
async def app_lifespan(server: FastMCP):
    db = await Database.connect()
    try:
        yield {"db": db}
    finally:
        await db.disconnect()

mcp = FastMCP("My App", lifespan=app_lifespan)

@mcp.tool()
def query_db(ctx: Context) -> str:
    db = ctx.request_context.lifespan_context["db"]
    return db.query()
```

---

## 3. Orchestration Layer

### 3.1 Temporal (Durable Execution)

**Location:** `vendor/orchestration/temporal`
**License:** MIT

#### What It Does

Temporal executes **Workflows** in a resilient manner that automatically handles:
- Intermittent failures
- Retry failed operations
- Long-running processes
- State persistence

#### Quick Start

```bash
# Install
brew install temporal
temporal server start-dev

# Access Web UI
open http://localhost:8233
```

#### Use Cases for content-machine

| Workflow | Description |
|----------|-------------|
| Video Generation | Multi-step: capture → transcribe → render |
| Content Pipeline | Trend research → script → TTS → assembly |
| Publishing | Upload → verify → cross-post |

**Integration Priority:** MEDIUM - Consider for production durable workflows.

---

### 3.2 n8n (Workflow Automation)

**Location:** `vendor/orchestration/n8n`
**License:** Fair-code (Sustainable Use License)

#### Key Features

| Feature | Description |
|---------|-------------|
| **400+ Integrations** | Pre-built connectors |
| **AI-Native** | LangChain workflows with your data |
| **Code When Needed** | JavaScript/Python, npm packages |
| **Self-Host** | Full control over data |

#### Quick Start

```bash
npx n8n
# or
docker run -it --rm -p 5678:5678 docker.n8n.io/n8nio/n8n
```

#### Use Cases for content-machine

- Content scheduling workflows
- Multi-platform publishing automation
- Trend monitoring and alerts

**Integration Priority:** LOW - Nice-to-have for visual workflow building.

---

## 4. Job Queue: BullMQ ⭐ CRITICAL

**Location:** `vendor/job-queue/bullmq`
**Package:** `npm install bullmq`
**License:** MIT
**Backend:** Redis

### Why BullMQ

| Feature | BullMQ | Others |
|---------|--------|--------|
| Parent/Child Dependencies | ✅ | ❌ |
| Priorities | ✅ | Partial |
| Rate Limiting | ✅ | Partial |
| Delayed Jobs | ✅ | ✅ |
| Repeatable Jobs | ✅ | ✅ |
| Sandboxed Workers | ✅ | ❌ |
| Global Events | ✅ | ✅ |
| Persistence | ✅ | ✅ |

### Basic Usage

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';

// Add jobs
const queue = new Queue('video-render');
queue.add('render', { projectId: '123', config: {...} });

// Process jobs
const worker = new Worker('video-render', async job => {
  if (job.name === 'render') {
    await renderVideo(job.data.projectId, job.data.config);
  }
});

// Listen for completion
const queueEvents = new QueueEvents('video-render');
queueEvents.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});
```

### Parent-Child Dependencies (Critical for Pipelines)

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer();

// Create dependency tree
const tree = await flow.add({
  name: 'publish-video',
  queueName: 'publish',
  data: { platform: 'tiktok' },
  children: [
    {
      name: 'render-video',
      queueName: 'render',
      data: { projectId: '123' },
      children: [
        {
          name: 'generate-audio',
          queueName: 'audio',
          data: { script: 'Hello world' },
        },
        {
          name: 'capture-ui',
          queueName: 'capture',
          data: { url: 'https://app.example.com' },
        },
      ],
    },
  ],
});

// Children complete before parent starts
```

### Video Pipeline Example

```typescript
// Queue definitions
const captureQueue = new Queue('capture');
const transcribeQueue = new Queue('transcribe');
const renderQueue = new Queue('render');
const publishQueue = new Queue('publish');

// Pipeline flow
const pipeline = await flow.add({
  name: 'publish',
  queueName: 'publish',
  data: { platforms: ['tiktok', 'youtube'] },
  children: [{
    name: 'render',
    queueName: 'render',
    children: [{
      name: 'transcribe',
      queueName: 'transcribe',
      children: [{
        name: 'capture',
        queueName: 'capture',
        data: { url: 'https://demo.app.com/feature' }
      }]
    }]
  }]
});
```

**Integration Priority:** CRITICAL - Primary job queue for video pipeline.

---

## 5. Observability

### 5.1 Langfuse (LLM Observability) ⭐ CRITICAL

**Location:** `vendor/observability/langfuse`
**License:** MIT
**Deployment:** Cloud or Self-host

#### Core Features

| Feature | Description |
|---------|-------------|
| **Tracing** | Track LLM calls, retrieval, agent actions |
| **Prompt Management** | Version control, collaborative iteration |
| **Evaluations** | LLM-as-judge, user feedback, manual labeling |
| **Datasets** | Test sets and benchmarks |
| **Playground** | Test prompts and configurations |
| **Comprehensive API** | Python, JS/TS SDKs |

#### Self-Host (Docker Compose)

```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up
```

#### Integrations

| Integration | Languages | Description |
|-------------|-----------|-------------|
| **SDK** | Python, JS/TS | Manual instrumentation |
| **OpenAI** | Python, JS/TS | Drop-in replacement |
| **LangChain** | Python, JS/TS | Callback handler |
| **LlamaIndex** | Python | Callback system |
| **LiteLLM** | Python, JS/TS | 100+ LLMs |
| **Vercel AI SDK** | JS/TS | React, Next.js |

#### Usage Example

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Create a trace
trace = langfuse.trace(name="video-generation")

# Create a span
span = trace.span(name="script-generation")

# Log LLM call
generation = span.generation(
    name="generate-script",
    model="gpt-4",
    input={"prompt": "Generate video script"},
    output=script_text,
    usage={"input_tokens": 100, "output_tokens": 500}
)

# End span
span.end()
```

**Integration Priority:** CRITICAL - Primary LLM observability tool.

---

### 5.2 Promptfoo (LLM Evals & Red Teaming)

**Location:** `vendor/observability/promptfoo`
**Package:** `npx promptfoo@latest`
**License:** MIT

#### What It Does

- **Test prompts and models** with automated evaluations
- **Security scanning** with red teaming
- **Compare models** side-by-side
- **CI/CD integration** for automated checks

#### Quick Start

```bash
# Initialize
npx promptfoo@latest init

# Run evaluation
npx promptfoo eval
```

#### Configuration Example

```yaml
# promptfooconfig.yaml
prompts:
  - "Generate a video script about {{topic}}"
  
providers:
  - openai:gpt-4
  - anthropic:claude-sonnet-4-0
  
tests:
  - vars:
      topic: "AI coding tools"
    assert:
      - type: contains
        value: "productivity"
      - type: llm-rubric
        value: "Is engaging and hook-focused"
```

**Integration Priority:** HIGH - Essential for prompt quality assurance.

---

## 6. Video Processing & Clipping

### 6.1 MoviePy (Python Video Editing)

**Location:** `vendor/video-processing/moviepy`
**Package:** `pip install moviepy`
**License:** MIT

#### v2.0 Breaking Changes Note
MoviePy recently upgraded to v2.0 with major changes.

#### Basic Usage

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and edit
clip = (
    VideoFileClip("example.mp4")
    .subclipped(10, 20)  # v2 uses subclipped()
    .with_volume_scaled(0.8)
)

# Add text overlay
txt_clip = TextClip(
    font="Arial.ttf",
    text="Hello there!",
    font_size=70,
    color='white'
).with_duration(10).with_position('center')

# Composite and export
final = CompositeVideoClip([clip, txt_clip])
final.write_videofile("result.mp4")
```

**Integration Priority:** MEDIUM - Utility for video manipulation tasks.

---

### 6.2 PySceneDetect (Scene Detection)

**Location:** `vendor/clipping/pyscenedetect`
**Package:** `pip install scenedetect[opencv]`
**License:** BSD-3-Clause

#### Detection Methods

| Detector | Use Case |
|----------|----------|
| ContentDetector | Fast cuts, content changes |
| AdaptiveDetector | Fast camera movement (two-pass) |
| ThresholdDetector | Fade out/in events |

#### Usage

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Detect scenes
scene_list = detect('my_video.mp4', ContentDetector())

# Print scenes
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

# Split video
split_video_ffmpeg('my_video.mp4', scene_list)
```

**Integration Priority:** MEDIUM - Useful for long-form to short-form conversion.

---

### 6.3 FunClip (Alibaba ASR + LLM Clipping)

**Location:** `vendor/clipping/FunClip`
**License:** Open Source (Alibaba DAMO Academy)

#### Key Features

| Feature | Description |
|---------|-------------|
| **FunASR Paraformer** | Industrial-grade Chinese ASR (13M+ downloads) |
| **Speaker Diarization** | CAM++ model for speaker identification |
| **LLM Smart Clipping** | GPT/Qwen integration for intelligent clipping |
| **Hotword Customization** | Enhance recognition for specific terms |
| **English Support** | Whisper integration |

#### Usage

```bash
# Start Gradio interface
python funclip/launch.py

# English mode
python funclip/launch.py -l en

# Command line
python funclip/videoclipper.py --stage 1 --file video.mp4 --output_dir ./output
python funclip/videoclipper.py --stage 2 --file video.mp4 --dest_text "target text" --output_file ./output/clip.mp4
```

**Integration Priority:** MEDIUM - Alternative clipping pipeline, especially for Chinese content.

---

### 6.4 Clip-Anything (Multimodal AI Clipping)

**Location:** `vendor/Clip-Anything`
**License:** Open Source

#### What It Does

- **Visual Analysis** - Object, scene, action detection
- **Audio Analysis** - Sound recognition
- **Sentiment Analysis** - Emotion detection
- **Virality Scoring** - Rate each scene's viral potential

#### Use Case

```python
# Prompt-based clipping
# "Find all moments where someone laughs"
# "Clip the most exciting 30 seconds"
# "Extract key product demo moments"
```

**Integration Priority:** LOW - Research/exploration for advanced clipping.

---

## 7. Integration Architecture

### Recommended Stack

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  Claude Desktop / Web UI / API Consumers                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      MCP SERVER LAYER                             │
│  FastMCP (Python) ─── Tools, Resources, Prompts                   │
│  FastMCP (TypeScript) ─── Remotion integration                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                     PROCESSING LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Capture   │  │    Audio    │  │   Render    │               │
│  │  Playwright │  │ Kokoro TTS  │  │  Remotion   │               │
│  │             │  │  WhisperX   │  │  chuk-motion│               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      QUEUE LAYER                                  │
│  BullMQ (Redis) ─── Parent/Child Flows, Rate Limiting             │
│  capture → transcribe → render → publish                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                   OBSERVABILITY LAYER                             │
│  Langfuse ─── LLM Tracing, Prompt Management                      │
│  Promptfoo ─── Evaluations, Red Teaming                           │
└──────────────────────────────────────────────────────────────────┘
```

### Pipeline Flow

```
1. Trend Research
   └── MCP Server (Python) → Tavily/Firecrawl/Reddit

2. Content Planning  
   └── Pydantic AI Agent → Script Generation
       └── Langfuse Tracing

3. Capture
   └── BullMQ Job → Playwright MCP → Screenshots/Recordings

4. Audio Generation
   └── BullMQ Job → Kokoro-FastAPI → MP3 + Word Timestamps

5. Render
   └── BullMQ Job → chuk-motion MCP → Remotion → MP4
       └── remotion-subtitles for captions

6. Publish
   └── BullMQ Job → Platform APIs (TikTok, YouTube, Instagram)
```

---

## 8. Key Implementation Decisions

### Decision 1: MCP Framework Selection

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| FastMCP Python | Rich features, enterprise auth, standard | Python-only | ✅ Primary for agents |
| FastMCP TypeScript | Zod schemas, HTTP streaming, serverless | Less mature | ✅ For Remotion integration |
| Official SDK | Minimal, stable | Less features | Fallback only |

**Decision:** Use FastMCP Python for agent tools, FastMCP TypeScript for Remotion MCP.

### Decision 2: Render Engine

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| chuk-motion | MCP-ready, 51 components, design tokens | Python→TypeScript bridge | ✅ Primary |
| Mosaico | Python-native, AI script gen | Less component library | Alternative |
| Raw Remotion | Maximum flexibility | More boilerplate | When needed |

**Decision:** Use chuk-motion as primary, with remotion-subtitles for captions.

### Decision 3: Job Queue

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| BullMQ | Parent/child, TypeScript, Dragonfly support | Requires Redis | ✅ Primary |
| Celery | Python-native, mature | Complex setup | If Python-only |
| RQ | Simple | Limited features | Not recommended |

**Decision:** Use BullMQ with parent/child flows for video pipeline.

### Decision 4: Observability

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Langfuse | Self-host, comprehensive, MIT | Setup required | ✅ Primary |
| Promptfoo | Eval-focused, CI/CD ready | Less tracing | ✅ For evals |
| LangSmith | LangChain-native | Closed source | Alternative |

**Decision:** Langfuse for tracing, Promptfoo for evaluations.

---

## 9. Next Steps

### Immediate Actions

1. **Setup chuk-motion locally** - Clone, install, run example
2. **Create MCP server skeleton** - FastMCP Python with basic tools
3. **Configure BullMQ** - Redis + queue definitions
4. **Deploy Langfuse** - Docker compose for observability

### Integration Tasks

1. **MCP-Remotion Bridge** - Connect agent outputs to chuk-motion
2. **Pipeline Worker** - BullMQ workers for each stage
3. **Caption Integration** - WhisperX → remotion-subtitles
4. **Platform Margins** - Configure safe areas per platform

---

## 10. References

| Resource | URL |
|----------|-----|
| chuk-motion | github.com/chrishayuk/chuk-motion |
| FastMCP Python | gofastmcp.com |
| FastMCP TypeScript | github.com/punkpeye/fastmcp |
| BullMQ Docs | docs.bullmq.io |
| Langfuse Docs | langfuse.com/docs |
| Promptfoo Docs | promptfoo.dev/docs |
| Remotion Docs | remotion.dev/docs |
| MoviePy v2 | zulko.github.io/moviepy |
| PySceneDetect | scenedetect.com |

---

*Document generated as part of content-machine research initiative. Last updated: 2026-01-02*
