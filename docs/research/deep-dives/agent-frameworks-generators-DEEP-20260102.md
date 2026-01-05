# Deep Dive: Agent Frameworks & Video Generators Ecosystem

**Created:** 2026-01-02  
**Type:** Research Deep Dive  
**Category:** Agent Architecture & Video Generation

---

## Executive Summary

This document provides comprehensive analysis of AI agent frameworks and the full ecosystem of video generators in the vendor directory. These form the intelligence layer (agents) and reference implementations (generators) for content-machine.

**Agent Framework Recommendation:**

- **Primary:** Pydantic AI (type-safe, Pydantic-native, MCP support)
- **Complex Workflows:** LangGraph (stateful, durable execution)
- **Multi-Agent Teams:** CrewAI (role-based collaboration)

**Key Generator Patterns Identified:**

- Remotion + Captacity (short-video-maker-gyori) - **PRIMARY BLUEPRINT**
- LLM script + DALL-E images + TTS (Shortrocity pattern)
- Long-form → short clips extraction (FunClip + ShortReelX pattern)
- Face tracking + viral moment detection (reels-clips-automator pattern)

---

## Part 1: Agent Frameworks

### 1.1 Pydantic AI ⭐ RECOMMENDED

**Repository:** `vendor/agents/pydantic-ai/`  
**Purpose:** GenAI agent framework with type safety  
**Creator:** Pydantic team (validation layer of OpenAI SDK, Anthropic SDK, LangChain, etc.)

**Key Features:**

- **Type-safe:** Full IDE support, static type checking
- **Model-agnostic:** OpenAI, Anthropic, Gemini, Groq, Ollama, etc.
- **Pydantic validation:** Structured outputs with automatic retry
- **MCP integration:** Model Context Protocol support
- **Dependency injection:** Clean tool/context management
- **Durable execution:** Survive failures, long-running workflows
- **Logfire integration:** OpenTelemetry observability

**Basic Agent:**

```python
from pydantic_ai import Agent

agent = Agent(
    'anthropic:claude-sonnet-4-0',
    instructions='Be concise, reply with one sentence.',
)

result = agent.run_sync('Where does "hello world" come from?')
print(result.output)
```

**Structured Output:**

```python
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class VideoScript(BaseModel):
    hook: str = Field(description="Attention-grabbing opening")
    main_points: list[str] = Field(description="Key points to cover")
    call_to_action: str = Field(description="Final CTA")

agent = Agent(
    'openai:gpt-4o',
    output_type=VideoScript,
    instructions='Create engaging video scripts for TikTok.',
)

result = agent.run_sync('Create a script about AI coding assistants')
print(result.output.hook)
print(result.output.main_points)
```

**Tools with Dependency Injection:**

```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext

@dataclass
class VideoContext:
    topic: str
    target_platform: str
    duration_seconds: int

agent = Agent(
    'openai:gpt-4o',
    deps_type=VideoContext,
)

@agent.tool
async def get_trending_hashtags(ctx: RunContext[VideoContext]) -> list[str]:
    """Get trending hashtags for the topic."""
    # Access dependencies
    platform = ctx.deps.target_platform
    topic = ctx.deps.topic
    return [f"#{topic}", f"#{platform}viral", "#fyp"]

@agent.instructions
async def custom_instructions(ctx: RunContext[VideoContext]) -> str:
    return f"Create content for {ctx.deps.target_platform}, max {ctx.deps.duration_seconds}s"
```

**Content-Machine Integration:**

- Primary agent framework for script generation
- Type-safe video config generation
- MCP integration for tool access
- Structured output validation

### 1.2 LangGraph

**Repository:** `vendor/agents/langgraph/`  
**Purpose:** Low-level orchestration for stateful agents  
**Creator:** LangChain (inspired by Pregel, Apache Beam)

**Key Features:**

- **Durable execution:** Persist through failures
- **Human-in-the-loop:** Interrupt and modify state
- **Comprehensive memory:** Short-term + long-term
- **LangSmith integration:** Debugging and observability
- **Production deployment:** Scalable infrastructure

**Basic Workflow:**

```python
from langgraph.graph import START, StateGraph
from typing_extensions import TypedDict

class State(TypedDict):
    script: str
    audio_path: str
    video_path: str

def generate_script(state: State) -> dict:
    # Generate script with LLM
    return {"script": "Generated script..."}

def generate_audio(state: State) -> dict:
    # Generate TTS audio
    return {"audio_path": "/path/to/audio.mp3"}

def render_video(state: State) -> dict:
    # Render with Remotion
    return {"video_path": "/path/to/video.mp4"}

# Build graph
graph = StateGraph(State)
graph.add_node("script", generate_script)
graph.add_node("audio", generate_audio)
graph.add_node("render", render_video)

graph.add_edge(START, "script")
graph.add_edge("script", "audio")
graph.add_edge("audio", "render")

# Compile and run
app = graph.compile()
result = app.invoke({"script": "", "audio_path": "", "video_path": ""})
```

**Conditional Branching:**

```python
from langgraph.graph import StateGraph, END

def should_regenerate(state: State) -> str:
    if state.get("quality_score", 0) < 7:
        return "regenerate"
    return "proceed"

graph.add_conditional_edges(
    "quality_check",
    should_regenerate,
    {
        "regenerate": "script",
        "proceed": "render"
    }
)
```

**Content-Machine Integration:**

- Complex multi-step video generation pipelines
- Human-in-the-loop review workflows
- Stateful long-running processes
- Checkpoint/resume capability

### 1.3 CrewAI

**Repository:** `vendor/agents/crewai/`  
**Purpose:** Multi-agent team orchestration  
**Creator:** CrewAI Inc (independent of LangChain)

**Key Features:**

- **Role-based agents:** Define specialized roles
- **Autonomous collaboration:** Agents delegate and collaborate
- **Flows:** Event-driven production workflows
- **High performance:** Optimized for speed
- **Enterprise-ready:** Control plane, observability

**Multi-Agent Crew:**

```python
from crewai import Agent, Task, Crew, Process

# Define agents
researcher = Agent(
    role="Trend Researcher",
    goal="Find viral content opportunities",
    backstory="Expert at identifying trending topics",
    verbose=True
)

scriptwriter = Agent(
    role="Scriptwriter",
    goal="Create engaging video scripts",
    backstory="Professional TikTok content creator"
)

# Define tasks
research_task = Task(
    description="Research trending AI topics on Reddit and Twitter",
    expected_output="List of 5 viral-worthy topics with analysis",
    agent=researcher
)

script_task = Task(
    description="Write a 30-second TikTok script for the top topic",
    expected_output="Complete script with hook, content, and CTA",
    agent=scriptwriter
)

# Create crew
crew = Crew(
    agents=[researcher, scriptwriter],
    tasks=[research_task, script_task],
    process=Process.sequential,
    verbose=True
)

# Run
result = crew.kickoff()
```

**CrewAI Flows:**

```python
from crewai.flow import Flow, listen, start

class VideoFlow(Flow):
    @start()
    def research_trends(self):
        # Research trending topics
        return {"topics": ["AI tools", "Coding tips"]}

    @listen(research_trends)
    def generate_script(self, topics):
        # Generate script for top topic
        return {"script": "Script content..."}

    @listen(generate_script)
    def render_video(self, script):
        # Render video
        return {"video_path": "/path/to/video.mp4"}

flow = VideoFlow()
result = flow.kickoff()
```

**Content-Machine Integration:**

- Research + Script + Review multi-agent teams
- Autonomous content ideation
- Enterprise deployment support
- Flows for production pipelines

---

## Part 2: Video Generators Ecosystem

### 2.1 Pattern Analysis

After analyzing 25+ video generators, the following patterns emerge:

| Pattern            | Examples                                  | Stack                      |
| ------------------ | ----------------------------------------- | -------------------------- |
| **Remotion-based** | short-video-maker-gyori, AI-short-creator | React + Remotion + Node.js |
| **MoviePy-based**  | Shortrocity, TikTokAIVideoGenerator       | Python + MoviePy + FFmpeg  |
| **FFmpeg-based**   | ShortFormGenerator, YASGU                 | Python + FFmpeg direct     |
| **Long-to-Short**  | ShortReelX, FunClip                       | Whisper + LLM + FFmpeg     |
| **Face-tracking**  | reels-clips-automator                     | OpenCV + GPT + FFmpeg      |

### 2.2 Shortrocity - LLM + DALL-E + TTS Pattern

**Repository:** `vendor/shortrocity/`  
**Stack:** ChatGPT + DALL-E 3 + ElevenLabs/OpenAI TTS + Captacity  
**Purpose:** AI-generated shorts with generated backgrounds

**Pipeline:**

```
Source Content
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 1. Script Generation (ChatGPT)                      │
│    - Analyze source content                         │
│    - Generate engaging script                       │
│    - Output: script.txt                             │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 2. Image Generation (DALL-E 3)                      │
│    - Generate prompts from script                   │
│    - Create background images                       │
│    - Output: images/                                │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 3. Narration (ElevenLabs/OpenAI TTS)                │
│    - Convert script to speech                       │
│    - Output: audio.mp3                              │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 4. Caption Generation (Captacity + Whisper)         │
│    - Transcribe audio                               │
│    - Add word highlighting                          │
│    - Output: short.avi                              │
└─────────────────────────────────────────────────────┘
```

**Usage:**

```bash
export OPENAI_API_KEY=YOUR_KEY
export ELEVEN_API_KEY=YOUR_KEY

./main.py source.txt settings.json
```

**Caption Settings:**

```json
{
  "font": "Bangers-Regular.ttf",
  "font_size": 130,
  "font_color": "yellow",
  "stroke_width": 3,
  "stroke_color": "black",
  "highlight_current_word": true,
  "word_highlight_color": "red",
  "line_count": 2,
  "padding": 50,
  "shadow_strength": 1.0,
  "shadow_blur": 0.1
}
```

### 2.3 TikTokAIVideoGenerator - Full Stack Pattern

**Repository:** `vendor/TikTokAIVideoGenerator/`  
**Stack:** Groq (Llama3) + Together AI (FLUX-1) + Kokoro TTS + Whisper  
**Purpose:** Complete vertical video generation

**Workflow:**

1. **Script Generation:** Llama3 via Groq Cloud
2. **Image Prompts:** LLM generates prompts from script
3. **Image Generation:** Together AI FLUX-1
4. **Audio Generation:** Kokoro TTS (fallback: Edge TTS)
5. **Caption Generation:** OpenAI Whisper
6. **Video Composition:** MoviePy

**Key Code Patterns:**

```python
# Script generation
from groq import Groq

client = Groq(api_key=groq_api_key)
response = client.chat.completions.create(
    model="llama3-8b-8192",
    messages=[
        {"role": "system", "content": "You are a TikTok script writer..."},
        {"role": "user", "content": f"Topic: {topic}, Style: {style}"}
    ]
)
script = response.choices[0].message.content
```

```python
# Image generation
import together

together.api_key = together_api_key
response = together.Complete.create(
    model="togethercomputer/flux-1",
    prompt=image_prompt,
    n=1,
    size="1080x1920"
)
```

```python
# Video composition
from moviepy.editor import *

clips = []
for i, image in enumerate(images):
    clip = ImageClip(image).set_duration(segment_duration)
    clips.append(clip)

video = concatenate_videoclips(clips)
audio = AudioFileClip("voiceover.mp3")
final = video.set_audio(audio)
final.write_videofile("output.mp4", fps=24)
```

### 2.4 reels-clips-automator - Face Tracking Pattern

**Repository:** `vendor/reels-clips-automator/`  
**Stack:** GPT + Whisper + OpenCV + FFmpeg  
**Purpose:** Convert horizontal videos to vertical Reels

**Key Features:**

- YouTube download or local file
- GPT identifies viral moments
- Face tracking with OpenCV
- Automatic cropping for vertical
- Whisper ASR for subtitles

**Viral Moment Detection:**

```python
# Use GPT to analyze transcript and find viral moments
def find_viral_moments(transcript: str) -> list[dict]:
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k",
        messages=[
            {"role": "system", "content": VIRAL_DETECTION_PROMPT},
            {"role": "user", "content": transcript}
        ]
    )
    return parse_moments(response.choices[0].message.content)
```

**Face Tracking:**

```python
import cv2

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

def track_face(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    if len(faces) > 0:
        x, y, w, h = faces[0]
        return (x + w//2, y + h//2)  # Center of face
    return None
```

### 2.5 ShortReelX - Long-to-Short Extraction

**Repository:** `vendor/ShortReelX/`  
**Stack:** Node.js + FFmpeg + LLM  
**Purpose:** Transform long videos into engaging shorts

**API Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `POST /upload` | Upload video, extract transcript |
| `POST /generate-shorts` | Generate short clips |
| `POST /getexcitingthumbnails` | AI-enhanced thumbnails |
| `POST /generate-hashtags` | AI hashtag generation |

**Approach:**

1. Download/upload video
2. Generate captions with ASR
3. Send captions to LLM for highlight identification
4. LLM returns timestamps of high-engagement moments
5. FFmpeg extracts those segments
6. Apply vertical crop (9:16 aspect ratio)

### 2.6 AI-short-creator - Remotion + Face Tracking

**Repository:** `vendor/AI-short-creator/`  
**Stack:** Python + Remotion (npm) + OpenAI  
**Purpose:** Interview/documentary clip extraction

**Key Files:**

- `main.py` - Main orchestrator
- `transcript_analysis.py` - Analyze for viral moments
- `video_cutter.py` - FFmpeg cutting
- `face.py` - Face detection
- `caption/` - Remotion caption rendering

**Hybrid Stack:**

```bash
# Step 1: Install Remotion
cd caption && npm install

# Step 2: Install Python
pip install -r requirements.txt

# Step 3: Configure
# Rename .env copy to .env
# Add OPENAI_API_KEY

# Step 4: Run
python main.py
```

### 2.7 shorts_maker (ClipForge) - Production-Ready

**Repository:** `vendor/shorts_maker/`  
**Stack:** Python + uv + WhisperX + Ollama + Flux  
**Purpose:** Production-grade clip generation

**Features:**

- GPU acceleration (WhisperX)
- Local LLM (Ollama)
- Text-to-image (Flux)
- Discord notifications
- Docker support
- CI/CD with GitHub Actions

**Config-driven:**

```yaml
# setup.yml
project_name: 'my_video'
source_video: 'input.mp4'
output_folder: 'outputs/'

whisper:
  model: 'large-v2'
  device: 'cuda'

llm:
  provider: 'ollama'
  model: 'llama3'

image:
  provider: 'flux'
  model: 'schnell'
```

---

## Part 3: Stack Recommendations

### 3.1 Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Pydantic AI Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │   Trend     │  │   Script    │  │    Review        │ │
│  │  Researcher │  │   Writer    │  │    Agent         │ │
│  └─────────────┘  └─────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    LangGraph Workflow                    │
│                                                          │
│  [Research] → [Script] → [Audio] → [Render] → [Review]  │
│       │           │          │         │          │     │
│       └───────────┴──────────┴─────────┴──────────┘     │
│                     (Checkpointed State)                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Video Generation Pipeline

```
Input (Topic/Trend)
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                 Script Generation                         │
│  Pydantic AI + Structured Output (VideoScript)           │
│  - Hook (3-5 seconds)                                    │
│  - Main points (20-40 seconds)                           │
│  - CTA (5-10 seconds)                                    │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                 Media Generation                          │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Playwright  │  │    Pexels     │  │    DALL-E    │ │
│  │   UI Capture  │  │    Stock      │  │    Images    │ │
│  └───────────────┘  └───────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                 Audio Generation                          │
│  Kokoro-FastAPI (OpenAI-compatible)                      │
│  - Voice selection/mixing                                │
│  - Per-word timestamps                                   │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                 Video Rendering                           │
│  Remotion + chuk-motion components                       │
│  - Design tokens (theme, platform margins)               │
│  - Caption templates (remotion-subtitles)                │
│  - 51 reusable components                                │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                 Review & Distribution                     │
│  Human-in-the-loop approval                              │
│  Auto-upload to TikTok/YouTube/Instagram                 │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Recommended Stack

| Layer                 | Component | Tool                          |
| --------------------- | --------- | ----------------------------- |
| **Agent Framework**   | Primary   | Pydantic AI                   |
| **Agent Framework**   | Workflows | LangGraph                     |
| **Trend Research**    | Reddit    | reddit-mcp-ts                 |
| **Trend Research**    | YouTube   | youtube-transcript-api        |
| **Trend Research**    | Google    | pytrends                      |
| **Web Research**      | Search    | Tavily                        |
| **Web Research**      | Crawling  | Firecrawl                     |
| **Script Generation** | LLM       | Claude/GPT-4o via Pydantic AI |
| **UI Capture**        | Browser   | Playwright + MCP              |
| **TTS**               | Audio     | Kokoro-FastAPI                |
| **Captions**          | ASR       | WhisperX                      |
| **Rendering**         | Video     | Remotion + chuk-motion        |
| **Captions**          | Templates | remotion-subtitles            |
| **Clipping**          | Detection | PySceneDetect + FunClip       |
| **Publishing**        | TikTok    | TiktokAutoUploader            |
| **Observability**     | Tracing   | Langfuse                      |
| **Observability**     | Evals     | Promptfoo                     |
| **Queue**             | Jobs      | BullMQ                        |
| **Orchestration**     | Workflows | Temporal                      |

---

## Part 4: Code Patterns

### 4.1 Pydantic AI Video Script Agent

```python
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from dataclasses import dataclass
from typing import Literal

class VideoScript(BaseModel):
    """Structured video script output."""
    title: str = Field(description="Catchy video title")
    hook: str = Field(description="Attention-grabbing opening (3-5 seconds)")
    main_points: list[str] = Field(description="Key points (3-5 items)")
    call_to_action: str = Field(description="Closing CTA")
    hashtags: list[str] = Field(description="Relevant hashtags")
    estimated_duration: int = Field(description="Duration in seconds")

@dataclass
class VideoContext:
    topic: str
    platform: Literal["tiktok", "reels", "shorts"]
    style: Literal["educational", "entertainment", "product_demo"]
    target_duration: int = 30

script_agent = Agent(
    'anthropic:claude-sonnet-4-0',
    deps_type=VideoContext,
    output_type=VideoScript,
    instructions="""
    You are an expert short-form video scriptwriter.
    Create engaging scripts optimized for viral potential.
    """
)

@script_agent.instructions
async def platform_specific(ctx: RunContext[VideoContext]) -> str:
    platform_tips = {
        "tiktok": "Use trending sounds, quick cuts, hook in first 3 seconds",
        "reels": "Leverage transitions, face-to-camera, trending audio",
        "shorts": "Clear value prop, educational hooks, CTAs for subscribe"
    }
    return f"Platform: {ctx.deps.platform}. Tips: {platform_tips[ctx.deps.platform]}"

@script_agent.tool
async def get_trending_topics(ctx: RunContext[VideoContext]) -> list[str]:
    """Get trending topics for the target platform."""
    # Integration with pytrends/Reddit
    return ["AI tools 2026", "productivity hacks", "coding tips"]

# Usage
async def generate_script(topic: str) -> VideoScript:
    ctx = VideoContext(
        topic=topic,
        platform="tiktok",
        style="educational",
        target_duration=30
    )
    result = await script_agent.run(
        f"Create a script about: {topic}",
        deps=ctx
    )
    return result.output
```

### 4.2 LangGraph Video Pipeline

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict
from typing import Optional

class VideoState(TypedDict):
    topic: str
    script: Optional[str]
    audio_path: Optional[str]
    caption_path: Optional[str]
    video_path: Optional[str]
    quality_score: Optional[float]
    error: Optional[str]

async def generate_script(state: VideoState) -> dict:
    """Generate script using Pydantic AI."""
    script = await script_agent.run(state["topic"])
    return {"script": script.output.model_dump_json()}

async def generate_audio(state: VideoState) -> dict:
    """Generate TTS audio with Kokoro."""
    from openai import OpenAI
    client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")

    with client.audio.speech.with_streaming_response.create(
        model="kokoro",
        voice="af_bella",
        input=state["script"]
    ) as response:
        response.stream_to_file("output/audio.mp3")

    return {"audio_path": "output/audio.mp3"}

async def generate_captions(state: VideoState) -> dict:
    """Transcribe audio with WhisperX."""
    import whisperx

    model = whisperx.load_model("large-v2", "cuda")
    audio = whisperx.load_audio(state["audio_path"])
    result = model.transcribe(audio, batch_size=16)

    # Align for word-level timestamps
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device="cuda"
    )
    result = whisperx.align(result["segments"], model_a, metadata, audio, "cuda")

    # Save as SRT
    save_srt(result["segments"], "output/captions.srt")
    return {"caption_path": "output/captions.srt"}

async def render_video(state: VideoState) -> dict:
    """Render video with Remotion."""
    import subprocess

    subprocess.run([
        "npx", "remotion", "render",
        "src/index.tsx", "ShortVideo",
        "--props", json.dumps({
            "script": state["script"],
            "audioFile": state["audio_path"],
            "srtFile": state["caption_path"]
        }),
        "--output", "output/video.mp4"
    ])

    return {"video_path": "output/video.mp4"}

async def quality_check(state: VideoState) -> dict:
    """Evaluate video quality."""
    # LLM-based quality evaluation
    return {"quality_score": 8.5}

def should_retry(state: VideoState) -> str:
    if state.get("quality_score", 0) < 7:
        return "regenerate"
    return "complete"

# Build graph
graph = StateGraph(VideoState)
graph.add_node("script", generate_script)
graph.add_node("audio", generate_audio)
graph.add_node("captions", generate_captions)
graph.add_node("render", render_video)
graph.add_node("quality", quality_check)

graph.add_edge(START, "script")
graph.add_edge("script", "audio")
graph.add_edge("audio", "captions")
graph.add_edge("captions", "render")
graph.add_edge("render", "quality")
graph.add_conditional_edges("quality", should_retry, {
    "regenerate": "script",
    "complete": END
})

# Compile with checkpointing
memory = MemorySaver()
app = graph.compile(checkpointer=memory)

# Run with thread_id for resumability
config = {"configurable": {"thread_id": "video-123"}}
result = await app.ainvoke({"topic": "AI coding tools"}, config)
```

---

## References

- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [Remotion Documentation](https://www.remotion.dev/docs/)
- [Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M)
