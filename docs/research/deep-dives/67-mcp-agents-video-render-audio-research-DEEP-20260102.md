# Deep Dive #67: MCP Ecosystem, Agent Frameworks, Video Processing, Rendering, Audio & Research Tools

**Document ID:** DD-067  
**Date:** 2026-01-02  
**Category:** Infrastructure, Agents, Media Processing  
**Status:** Complete  
**Word Count:** ~8,500

---

## Executive Summary

This deep dive provides a comprehensive analysis of **six critical technology domains** for the content-machine platform:

1. **MCP (Model Context Protocol) Ecosystem** – FastMCP Python/TypeScript, official SDK
2. **Agent Frameworks** – LangGraph, LangChain, LlamaIndex
3. **Video Processing** – FFMPerative, MoviePy, FFmpeg
4. **Rendering Pipeline** – Remotion, Mosaico, chuk-motion
5. **Audio/Speech** – Kokoro TTS, Kokoro-FastAPI, WhisperX
6. **Research Agents** – GPT-Researcher, Open Deep Research

These tools form the complete technical foundation for building AI-powered video generation pipelines.

---

## 1. MCP Ecosystem

### Overview

The **Model Context Protocol (MCP)** is a standardized way to provide context and tools to LLMs. It's often described as "the USB-C port for AI" – a uniform interface for connecting LLMs to data sources and actions.

### 1.1 FastMCP Python (v2.0)

**Source:** `vendor/mcp/fastmcp-python/`  
**Creator:** Prefect (jlowin)  
**Docs:** https://gofastmcp.com  
**License:** MIT

#### Key Features

| Feature              | Description                             |
| -------------------- | --------------------------------------- |
| **Tools**            | Decorated functions that LLMs can call  |
| **Resources**        | Read-only data endpoints (like GET)     |
| **Prompts**          | Reusable templates for LLM interactions |
| **Enterprise Auth**  | Google, GitHub, Azure, Auth0, WorkOS    |
| **Deployment Tools** | FastMCP Cloud, self-hosted              |

#### Code Pattern

```python
from fastmcp import FastMCP

mcp = FastMCP("ContentMachine 🎬")

@mcp.tool
def generate_script(topic: str, duration: int) -> str:
    """Generate a video script from topic."""
    return f"Script for {topic} ({duration}s)"

@mcp.resource("trends://{platform}")
def get_trends(platform: str) -> dict:
    """Get trending topics from platform."""
    return {"platform": platform, "trends": [...]}

if __name__ == "__main__":
    mcp.run()
```

#### Why FastMCP 2.0 vs Official SDK

FastMCP 1.0 was incorporated into the official SDK. FastMCP 2.0 extends far beyond:

- **Advanced Patterns:** Server composition, proxying, OpenAPI generation
- **Enterprise Auth:** Pre-built providers
- **Deployment Tools:** Production-ready infrastructure
- **Testing Utilities:** Comprehensive test frameworks

**Recommendation:** Use FastMCP Python for all Python-based MCP servers.

### 1.2 FastMCP TypeScript

**Source:** `vendor/mcp/fastmcp-typescript/`  
**Creator:** punkpeye  
**License:** MIT

#### Key Features

| Feature             | Description                               |
| ------------------- | ----------------------------------------- |
| **51 Features**     | Sessions, auth, streaming, stateless mode |
| **HTTP Streaming**  | Modern alternative to SSE                 |
| **Stateless Mode**  | Perfect for serverless (Lambda, Vercel)   |
| **CLI Tools**       | Testing and debugging utilities           |
| **Standard Schema** | Works with Zod, Yup, etc.                 |

#### Code Pattern

```typescript
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

const server = new FastMCP({
  name: 'ContentMachine',
  version: '1.0.0',
});

server.addTool({
  name: 'capture_ui',
  description: 'Capture product UI screenshots',
  parameters: z.object({
    url: z.string().url(),
    selector: z.string().optional(),
  }),
  execute: async (args) => {
    return await captureUI(args.url, args.selector);
  },
});

server.start({ transportType: 'httpStream', httpStream: { port: 8080 } });
```

#### When to Use

- **FastMCP TypeScript:** When building MCP servers in TypeScript/Node.js
- **FastMCP Python:** When building MCP servers in Python
- **Official SDK:** When you need maximum control or custom architecture

### 1.3 Official MCP Python SDK

**Source:** `vendor/mcp/mcp-python-sdk/`  
**Creator:** Anthropic  
**License:** MIT

Core SDK features:

- STDIO, SSE, and Streamable HTTP transports
- Full MCP specification implementation
- Tools, Resources, Prompts, Completions, Elicitation

**Note:** FastMCP is built on top of this SDK and adds convenience features.

### MCP Architecture Recommendation

```
┌─────────────────────────────────────────────────────────────┐
│                    Content-Machine                           │
├─────────────────────────────────────────────────────────────┤
│  MCP Servers (FastMCP):                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Reddit Trends│ │ YouTube API  │ │ Playwright   │         │
│  │   (Python)   │ │   (Python)   │ │   (TS/Py)    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   Remotion   │ │    Kokoro    │ │   WhisperX   │         │
│  │ (TypeScript) │ │   (Python)   │ │   (Python)   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Frameworks

### 2.1 LangGraph

**Source:** `vendor/agents/langgraph/`  
**Creator:** LangChain AI  
**Stars:** ~8k+ (rapidly growing)  
**License:** MIT

#### Core Concept

LangGraph is a **low-level orchestration framework** for building stateful, long-running agents. Think of it as a state machine for LLM workflows.

#### Key Features

| Feature                   | Description                       |
| ------------------------- | --------------------------------- |
| **StateGraph**            | Nodes + edges define workflow     |
| **Durable Execution**     | Persists through failures         |
| **Human-in-the-Loop**     | Inspect/modify state at any point |
| **Memory**                | Short-term + long-term persistent |
| **LangSmith Integration** | Tracing and debugging             |

#### Code Pattern

```python
from langgraph.graph import START, StateGraph
from typing_extensions import TypedDict

class ContentState(TypedDict):
    topic: str
    script: str
    audio_url: str
    video_url: str

def research_topic(state: ContentState) -> dict:
    # Research trending topics
    return {"topic": "AI productivity tools"}

def generate_script(state: ContentState) -> dict:
    # Generate script from topic
    return {"script": f"Script about {state['topic']}"}

def synthesize_audio(state: ContentState) -> dict:
    # TTS synthesis
    return {"audio_url": "https://..."}

def render_video(state: ContentState) -> dict:
    # Remotion render
    return {"video_url": "https://..."}

# Build graph
graph = StateGraph(ContentState)
graph.add_node("research", research_topic)
graph.add_node("script", generate_script)
graph.add_node("audio", synthesize_audio)
graph.add_node("render", render_video)

# Define edges
graph.add_edge(START, "research")
graph.add_edge("research", "script")
graph.add_edge("script", "audio")
graph.add_edge("audio", "render")

# Compile and run
app = graph.compile()
result = app.invoke({"topic": "", "script": "", "audio_url": "", "video_url": ""})
```

#### When to Use LangGraph

✅ Complex multi-step workflows  
✅ Human-in-the-loop approvals  
✅ Long-running processes (video generation)  
✅ Need for durable execution  
❌ Simple single-shot queries  
❌ Real-time chat applications

### 2.2 LangChain

**Source:** `vendor/agents/langchain/`  
**Creator:** LangChain AI  
**Stars:** 93k+  
**License:** MIT

LangChain is the **high-level framework** for building LLM applications. LangGraph is built on top of LangChain.

#### Core Components

| Component      | Purpose                                  |
| -------------- | ---------------------------------------- |
| **Models**     | LLM interfaces (OpenAI, Anthropic, etc.) |
| **Chains**     | Sequences of operations                  |
| **Agents**     | LLMs that can use tools                  |
| **Retrievers** | Vector stores, RAG                       |
| **Memory**     | Conversation history                     |

#### Code Pattern

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(model="gpt-4o")
response = llm.invoke([HumanMessage(content="Generate a hook for a video about AI tools")])
```

#### Relationship to LangGraph

- **LangChain:** Components and integrations
- **LangGraph:** Workflow orchestration
- **Use together:** LangGraph for workflow, LangChain for LLM calls

### 2.3 LlamaIndex

**Source:** `vendor/agents/llama-index/`  
**Creator:** Run-LLama  
**Stars:** 38k+  
**License:** MIT

LlamaIndex is a **data framework** for LLM applications, focusing on connecting LLMs to external data.

#### Core Features

| Feature             | Description                            |
| ------------------- | -------------------------------------- |
| **Data Connectors** | 300+ integrations (LlamaHub)           |
| **Indices**         | VectorStoreIndex, KnowledgeGraph, etc. |
| **Query Interface** | Retrieval-augmented generation         |
| **Agents**          | Tool-using agents                      |

#### Code Pattern

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

# Load documents
documents = SimpleDirectoryReader("product_docs").load_data()

# Create index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine()
response = query_engine.query("What are the key features of our product?")
```

#### When to Use LlamaIndex

✅ RAG applications  
✅ Document Q&A  
✅ Knowledge base integration  
✅ Product documentation queries  
❌ Complex multi-step workflows (use LangGraph)  
❌ Real-time chat (use LangChain)

### Agent Framework Comparison

| Framework      | Best For              | Complexity | Integration  |
| -------------- | --------------------- | ---------- | ------------ |
| **LangGraph**  | Workflows, durability | High       | LangChain    |
| **LangChain**  | LLM apps, chains      | Medium     | Extensive    |
| **LlamaIndex** | RAG, data             | Medium     | Data sources |
| **PydanticAI** | Type-safe agents      | Low        | MCP          |
| **CrewAI**     | Multi-agent           | High       | LangChain    |

**Recommendation for content-machine:**

- **LangGraph** for content planning pipeline (orchestration)
- **LlamaIndex** for product knowledge base (RAG)
- **PydanticAI** for type-safe individual agents

---

## 3. Video Processing

### 3.1 FFMPerative

**Source:** `vendor/video-processing/FFMPerative/`  
**Creator:** RemyxAI  
**Stars:** ~500  
**License:** MIT

#### Key Innovation

FFMPerative is a **chat-to-video-editing** tool powered by LLMs. Natural language commands become FFmpeg operations.

#### Features

| Feature              | Description               |
| -------------------- | ------------------------- |
| **Natural Language** | "Resize video to 1080p"   |
| **LLM-Powered**      | Uses fine-tuned LLaMA2    |
| **FFmpeg Backend**   | Reliable video processing |
| **Compose Mode**     | Multi-clip editing        |
| **Subtitles**        | SRT merging               |

#### Code Pattern

```python
from ffmperative import ffmp

# Natural language commands
ffmp("sample the 5th frame from '/path/to/video.mp4'")
ffmp("merge subtitles 'captions.srt' with video 'video.mp4' calling it 'output.mp4'")
ffmp("resize video to 1080x1920 and speed up 2x")
```

#### CLI Usage

```bash
# Compose clips with AI guidance
ffmperative compose --clips /path/to/clips --output video.mp4 --prompt "Edit for TikTok"
```

#### Use Case for content-machine

FFMPerative provides a **natural language interface** for video operations, reducing the need to write complex FFmpeg commands.

### 3.2 MoviePy

**Source:** `vendor/video-processing/moviepy/`  
**Creator:** Zulko  
**Stars:** 12k+  
**License:** MIT

#### Core Concept

MoviePy is a **Python library for video editing**: cuts, concatenations, title insertions, compositing, and effects.

#### Key Features

| Feature         | Description             |
| --------------- | ----------------------- |
| **Pure Python** | NumPy arrays for frames |
| **Effects**     | Pan, zoom, fade, etc.   |
| **Text**        | TextClip for overlays   |
| **Audio**       | Audio clip manipulation |
| **GIF Support** | Read/write GIFs         |

#### Code Pattern

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and subclip
clip = (
    VideoFileClip("product_demo.mp4")
    .subclipped(10, 20)
    .with_volume_scaled(0.8)
)

# Add text overlay
txt_clip = TextClip(
    font="Arial.ttf",
    text="New Feature!",
    font_size=70,
    color='white'
).with_duration(10).with_position('center')

# Composite and export
final = CompositeVideoClip([clip, txt_clip])
final.write_videofile("output.mp4")
```

#### v2 Breaking Changes

MoviePy v2.0 introduced major breaking changes. Always check documentation for migration.

#### Comparison: MoviePy vs Remotion

| Aspect          | MoviePy         | Remotion          |
| --------------- | --------------- | ----------------- |
| **Language**    | Python          | TypeScript/React  |
| **Paradigm**    | Imperative      | Declarative       |
| **Speed**       | Slower (Python) | Faster (native)   |
| **Flexibility** | Very flexible   | React components  |
| **Best For**    | Quick edits     | Production videos |

### 3.3 FFmpeg (Core)

**Source:** `vendor/video-processing/ffmpeg/`  
**License:** LGPL/GPL

FFmpeg is the **foundation** for all video processing. Both MoviePy and Remotion use FFmpeg under the hood.

#### Libraries

| Library           | Purpose                |
| ----------------- | ---------------------- |
| **libavcodec**    | Encoding/decoding      |
| **libavformat**   | Containers (mp4, webm) |
| **libavfilter**   | Filters and effects    |
| **libswresample** | Audio resampling       |
| **libswscale**    | Color/scaling          |

**Recommendation:** Use FFmpeg directly only for complex operations not covered by higher-level tools.

---

## 4. Rendering Pipeline

### 4.1 Remotion

**Source:** `vendor/render/remotion/`  
**Creator:** Remotion GmbH  
**Stars:** 21k+  
**License:** Special (see below)

#### Core Concept

Remotion enables **creating videos programmatically using React**. Videos are React components rendered frame-by-frame.

#### Why React for Video?

| Benefit              | Description                            |
| -------------------- | -------------------------------------- |
| **Web Technologies** | CSS, Canvas, SVG, WebGL                |
| **Programming**      | Variables, functions, APIs, algorithms |
| **React**            | Components, composition, ecosystem     |
| **TypeScript**       | Type safety, IDE support               |

#### Famous Examples

- **GitHub Unwrapped** – Personalized year-in-review videos
- **Fireship** – Code-generated tech videos
- **ProductHunt** – Launch videos

#### Code Pattern

```tsx
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';

export const ProductDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = Math.min(1, frame / 30);

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Sequence from={0} durationInFrames={60}>
        <h1 style={{ opacity, color: 'white' }}>Welcome to Our Product</h1>
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <ProductFeatureDemo />
      </Sequence>
    </AbsoluteFill>
  );
};
```

#### ⚠️ License Warning

**CRITICAL:** Remotion has a special company license. Read the LICENSE.md before commercial use:

- Free for individuals and open-source
- Company license required for some commercial use cases
- Review at https://remotion.dev/license

### 4.2 Mosaico

**Source:** `vendor/render/mosaico/`  
**Creator:** Folha de S.Paulo  
**Stars:** ~200  
**License:** MIT

#### Core Concept

Mosaico is a **Python library for programmatic video compositions** with AI-powered script generation.

#### Key Features

| Feature                  | Description                      |
| ------------------------ | -------------------------------- |
| **AI Script Generation** | LLM-powered video scripts        |
| **Asset Management**     | Audio, images, text, subtitles   |
| **Positioning System**   | Absolute, relative, region-based |
| **Effects**              | Pan, zoom, extensible            |
| **TTS Integration**      | ElevenLabs, etc.                 |
| **LangChain/Haystack**   | ML framework integration         |

#### Code Pattern

```python
from mosaico.script_generators.news import NewsVideoScriptGenerator
from mosaico.speech_synthesizers.elevenlabs import ElevenLabsSpeechSynthesizer
from mosaico.audio_transcribers.assemblyai import AssemblyAIAudioTranscriber
from mosaico.video.project import VideoProject
from mosaico.video.rendering import render_video

# Create generators
script_gen = NewsVideoScriptGenerator(
    context="Breaking AI news",
    language="en",
    num_paragraphs=5,
    api_key=ANTHROPIC_API_KEY,
)

speech_synth = ElevenLabsSpeechSynthesizer(
    voice_id="af_heart",
    api_key=ELEVENLABS_API_KEY,
)

transcriber = AssemblyAIAudioTranscriber(api_key=ASSEMBLYAI_API_KEY)

# Build project
project = (
    VideoProject.from_script_generator(script_gen, media)
    .with_title("AI News Update")
    .with_fps(30)
    .with_resolution((1080, 1920))  # TikTok vertical
    .add_narration(speech_synth)
    .add_captions_from_transcriber(transcriber)
)

render_video(project, "output/")
```

#### Mosaico vs Remotion

| Aspect             | Mosaico        | Remotion      |
| ------------------ | -------------- | ------------- |
| **Language**       | Python         | TypeScript    |
| **AI Integration** | Built-in       | External      |
| **TTS**            | Integrated     | External      |
| **Flexibility**    | Higher-level   | Lower-level   |
| **Best For**       | News/narration | Product demos |

### 4.3 chuk-motion (MCP + Remotion)

**Source:** `vendor/render/chuk-mcp-remotion/`  
**Creator:** chrishayuk  
**Stars:** ~100  
**License:** MIT

#### Core Innovation

chuk-motion is an **MCP server that enables AI to generate Remotion videos** with a design-system-first approach.

#### Key Features

| Feature                   | Description                          |
| ------------------------- | ------------------------------------ |
| **51 Video Components**   | Charts, scenes, layouts, animations  |
| **7 Built-in Themes**     | Tech, Finance, Education, etc.       |
| **Design Tokens**         | Colors, typography, spacing, motion  |
| **Platform Safe Margins** | LinkedIn, TikTok, Instagram, YouTube |
| **Track-Based Timeline**  | Professional multi-track composition |

#### Platform Safe Margins

| Platform              | Top   | Bottom | Left | Right |
| --------------------- | ----- | ------ | ---- | ----- |
| **LinkedIn**          | 40px  | 40px   | 24px | 24px  |
| **Instagram Stories** | 100px | 120px  | 24px | 24px  |
| **TikTok**            | 100px | 180px  | 24px | 80px  |
| **YouTube**           | 20px  | 20px   | 20px | 20px  |

#### Component Library (51 total)

| Category            | Components                                             |
| ------------------- | ------------------------------------------------------ |
| **Charts**          | Pie, Bar, Line, Area, Donut, HorizontalBar             |
| **Scenes**          | TitleScene, EndScreen                                  |
| **Overlays**        | LowerThird, TextOverlay, SubscribeButton               |
| **Code**            | CodeBlock, TypingCode, CodeDiff                        |
| **Layouts**         | 17 professional layouts                                |
| **Animations**      | Counter, LayoutEntrance, PanelCascade                  |
| **Text Animations** | Typewriter, Stagger, Wavy, TrueFocus, Decrypted, Fuzzy |
| **Demo Realism**    | BeforeAfterSlider, BrowserFrame, DeviceFrame, Terminal |

#### MCP Server Usage

```bash
# Start MCP server
python -m chuk_motion.server http --port 8000
```

```python
# Via MCP tools
remotion_create_project(
    name="product_demo",
    theme="tech",
    fps=30,
    width=1080,
    height=1920
)
```

**Recommendation:** chuk-motion is ideal for content-machine as it combines MCP + Remotion + design system.

---

## 5. Audio & Speech

### 5.1 Kokoro TTS

**Source:** `vendor/audio/kokoro/`  
**Creator:** hexgrad  
**Model:** Kokoro-82M  
**License:** Apache 2.0 (weights)

#### Core Concept

Kokoro is an **open-weight TTS model** with only 82M parameters that delivers quality comparable to larger models.

#### Key Features

| Feature            | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| **82M Parameters** | Lightweight, fast                                                       |
| **Apache License** | Fully open weights                                                      |
| **Multi-language** | English, Japanese, Chinese, Spanish, French, Italian, Portuguese, Hindi |
| **High Quality**   | Comparable to larger models                                             |
| **Cost-Efficient** | Local inference                                                         |

#### Code Pattern

```python
from kokoro import KPipeline
import soundfile as sf

# Initialize pipeline
pipeline = KPipeline(lang_code='a')  # 'a' = American English

text = """
Welcome to our product demo. Today we're showing you
the fastest way to generate videos with AI.
"""

# Generate audio
generator = pipeline(text, voice='af_heart')

for i, (graphemes, phonemes, audio) in enumerate(generator):
    sf.write(f'segment_{i}.wav', audio, 24000)
```

#### Voice Options

- **af_heart** - Default female voice
- **af_bella** - Alternative female
- **af_sky** - Another variant
- Multiple voices can be combined

### 5.2 Kokoro-FastAPI

**Source:** `vendor/audio/kokoro-fastapi/`  
**Creator:** remsky  
**License:** MIT

#### Core Concept

Dockerized FastAPI wrapper for Kokoro with **OpenAI-compatible API**.

#### Key Features

| Feature               | Description           |
| --------------------- | --------------------- |
| **OpenAI Compatible** | Drop-in replacement   |
| **Docker**            | GPU and CPU images    |
| **Voice Mixing**      | Weighted combinations |
| **Timestamps**        | Per-word captions     |
| **Multi-format**      | mp3, wav, opus, flac  |

#### OpenAI-Compatible Usage

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky+af_bella",  # Voice mixing
    input="Hello world!"
) as response:
    response.stream_to_file("output.mp3")
```

#### Docker Deployment

```bash
# GPU
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

**Recommendation:** Use Kokoro-FastAPI for production TTS – it's OpenAI-compatible, Docker-ready, and supports voice mixing.

### 5.3 WhisperX

**Source:** `vendor/captions/whisperx/`  
**Creator:** m-bain  
**Stars:** 12k+  
**License:** BSD-4-Clause

#### Core Concept

WhisperX provides **fast ASR with word-level timestamps** and speaker diarization.

#### Key Features

| Feature                   | Description           |
| ------------------------- | --------------------- |
| **70x Realtime**          | Batched inference     |
| **Word-Level Timestamps** | wav2vec2 alignment    |
| **Speaker Diarization**   | pyannote-audio        |
| **VAD**                   | Reduces hallucination |
| **<8GB GPU**              | Efficient memory      |

#### Code Pattern

```python
import whisperx

device = "cuda"
batch_size = 16
compute_type = "float16"

# 1. Transcribe
model = whisperx.load_model("large-v2", device, compute_type=compute_type)
audio = whisperx.load_audio("narration.mp3")
result = model.transcribe(audio, batch_size=batch_size)

# 2. Align for word-level timestamps
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device=device
)
result = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    audio,
    device
)

# 3. Speaker diarization (optional)
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token=HF_TOKEN,
    device=device
)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)

print(result["segments"])
# [{"text": "Hello", "start": 0.0, "end": 0.5, "speaker": "SPEAKER_01"}, ...]
```

#### WhisperX vs Whisper

| Aspect          | Whisper         | WhisperX     |
| --------------- | --------------- | ------------ |
| **Speed**       | 1x realtime     | 70x realtime |
| **Timestamps**  | Utterance-level | Word-level   |
| **Diarization** | No              | Yes          |
| **VAD**         | No              | Yes          |
| **Memory**      | Higher          | <8GB         |

**Recommendation:** Use WhisperX for all caption generation – it provides word-level timestamps essential for animated captions.

---

## 6. Research Agents

### 6.1 GPT-Researcher

**Source:** `vendor/research/gpt-researcher/`  
**Creator:** assafelovic  
**Stars:** 15k+  
**License:** MIT

#### Core Concept

GPT-Researcher is an **open deep research agent** that produces detailed, factual, unbiased research reports with citations.

#### Architecture

```
┌───────────────────────────────────────────────────────────┐
│                      Research Task                         │
├───────────────────────────────────────────────────────────┤
│  1. Planner Agent → Generate research questions           │
│  2. Crawler Agent → Gather information (20+ sources)      │
│  3. Summarizer → Summarize and source-track               │
│  4. Publisher → Aggregate into final report               │
└───────────────────────────────────────────────────────────┘
```

#### Key Features

| Feature           | Description                |
| ----------------- | -------------------------- |
| **20+ Sources**   | Aggregates diverse sources |
| **2000+ Words**   | Detailed reports           |
| **Citations**     | Source tracking            |
| **MCP Support**   | Hybrid web + MCP research  |
| **Deep Research** | Recursive tree exploration |

#### Code Pattern

```python
from gpt_researcher import GPTResearcher

researcher = GPTResearcher(
    query="What are the best practices for TikTok video creation?",
    mcp_configs=[
        {
            "name": "github",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.getenv("GITHUB_TOKEN")}
        }
    ]
)

# Conduct research
research_result = await researcher.conduct_research()

# Write report
report = await researcher.write_report()
```

#### Use Case for content-machine

GPT-Researcher can be used to **research trending topics** before content creation, ensuring videos are factual and well-sourced.

### 6.2 Open Deep Research

**Source:** `vendor/research/open-deep-research/`  
**Creator:** LangChain AI  
**Stars:** ~3k  
**License:** MIT

#### Core Concept

Open Deep Research is a **LangGraph-based research agent** that performs recursive tree exploration.

#### Key Features

| Feature               | Description                 |
| --------------------- | --------------------------- |
| **Tree Exploration**  | Configurable depth/breadth  |
| **LangGraph Native**  | Built on LangGraph          |
| **MCP Compatible**    | Search tools integration    |
| **~5 min/research**   | Reasonable speed            |
| **~$0.40/research**   | Cost-efficient with o3-mini |
| **0.4943 RACE Score** | Top 6 on leaderboard        |

#### Configuration

```bash
# Environment
export OPENAI_API_KEY=...
export TAVILY_API_KEY=...

# Start LangGraph server
uvx --from "langgraph-cli[inmem]" langgraph dev
```

#### Model Configuration

| Task              | Default Model |
| ----------------- | ------------- |
| **Summarization** | gpt-4.1-mini  |
| **Research**      | gpt-4.1       |
| **Compression**   | gpt-4.1       |
| **Final Report**  | gpt-4.1       |

#### Use Case for content-machine

Open Deep Research can provide the **research backbone** for trend analysis and content planning.

---

## 7. Integration Architecture

### Complete Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     Content-Machine Pipeline                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  Research    │────▶│   Planning   │────▶│   Script     │ │
│  │ (GPT-Researcher)   │  (LangGraph) │     │  (LLM+TTS)   │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │    MCP:      │     │    MCP:      │     │    MCP:      │ │
│  │ Reddit/HN/YT │     │  LlamaIndex  │     │    Kokoro    │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │   Capture    │────▶│   Render     │────▶│   Review     │ │
│  │ (Playwright) │     │(chuk-motion) │     │ (React-Admin)│ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │    MCP:      │     │    MCP:      │     │   WhisperX   │ │
│  │  Playwright  │     │   Remotion   │     │  (Captions)  │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Summary

| Layer                | Primary Tool           | Alternative        |
| -------------------- | ---------------------- | ------------------ |
| **MCP Framework**    | FastMCP (Py + TS)      | Official SDK       |
| **Orchestration**    | LangGraph              | Temporal           |
| **Knowledge**        | LlamaIndex             | -                  |
| **TTS**              | Kokoro-FastAPI         | ElevenLabs         |
| **ASR/Captions**     | WhisperX               | Whisper            |
| **Video Render**     | chuk-motion + Remotion | Mosaico            |
| **Video Processing** | FFMPerative            | MoviePy            |
| **Research**         | GPT-Researcher         | Open Deep Research |

---

## 8. Recommendations

### Immediate Actions

1. **MCP Infrastructure:** Set up FastMCP Python + TypeScript servers
2. **Orchestration:** Build content pipeline in LangGraph
3. **TTS:** Deploy Kokoro-FastAPI Docker container
4. **Captions:** Integrate WhisperX for word-level timestamps
5. **Render:** Evaluate chuk-motion for Remotion integration

### Architecture Decisions

| Decision                | Recommendation | Rationale                         |
| ----------------------- | -------------- | --------------------------------- |
| **MCP Framework**       | FastMCP 2.0    | Production-ready, enterprise auth |
| **Agent Orchestration** | LangGraph      | Durable execution, human-in-loop  |
| **TTS**                 | Kokoro-FastAPI | OpenAI-compatible, voice mixing   |
| **ASR**                 | WhisperX       | 70x speed, word-level timestamps  |
| **Render**              | chuk-motion    | MCP + Remotion + design system    |
| **Research**            | GPT-Researcher | Multi-source, MCP support         |

### Docker Compose Starter

```yaml
version: '3.8'

services:
  kokoro-tts:
    image: ghcr.io/remsky/kokoro-fastapi-gpu:latest
    ports:
      - '8880:8880'
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  mcp-server:
    build: ./mcp
    ports:
      - '8000:8000'
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  remotion:
    image: node:20
    working_dir: /app
    volumes:
      - ./remotion:/app
    command: npx remotion studio
    ports:
      - '3000:3000'
```

---

## 9. Appendix: Quick Reference

### MCP Tool Definition (Python)

```python
from fastmcp import FastMCP

mcp = FastMCP("MyServer")

@mcp.tool
def my_tool(param: str) -> str:
    """Tool description for LLM."""
    return result
```

### MCP Tool Definition (TypeScript)

```typescript
server.addTool({
  name: 'my_tool',
  description: 'Tool description for LLM',
  parameters: z.object({ param: z.string() }),
  execute: async (args) => result,
});
```

### LangGraph State Machine

```python
graph = StateGraph(State)
graph.add_node("node_a", func_a)
graph.add_node("node_b", func_b)
graph.add_edge(START, "node_a")
graph.add_edge("node_a", "node_b")
app = graph.compile()
```

### Kokoro TTS

```python
from kokoro import KPipeline
pipeline = KPipeline(lang_code='a')
for i, (gs, ps, audio) in enumerate(pipeline(text, voice='af_heart')):
    sf.write(f'{i}.wav', audio, 24000)
```

### WhisperX Transcription

```python
import whisperx
model = whisperx.load_model("large-v2", "cuda")
result = model.transcribe(audio, batch_size=16)
result = whisperx.align(result["segments"], model_a, metadata, audio, "cuda")
```

---

## Document Metadata

| Field            | Value          |
| ---------------- | -------------- |
| **Document ID**  | DD-067         |
| **Created**      | 2026-01-02     |
| **Last Updated** | 2026-01-02     |
| **Author**       | Research Agent |
| **Status**       | Complete       |
| **Dependencies** | DD-065, DD-066 |

---

**Key Takeaways:**

1. **MCP is the glue** – FastMCP enables LLMs to interact with all tools
2. **LangGraph for orchestration** – Durable, stateful content pipelines
3. **Kokoro for TTS** – Open-weight, Apache-licensed, production-ready
4. **WhisperX for captions** – 70x speed, word-level timestamps
5. **chuk-motion for render** – MCP + Remotion + design system = perfect fit

This completes the core technology stack documentation for content-machine.
