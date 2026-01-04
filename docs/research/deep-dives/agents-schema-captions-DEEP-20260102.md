# Deep Dive: Agent Frameworks, Schema Validation, and Caption Systems
**Date:** 2026-01-02  
**Category:** Deep Research Analysis  
**Status:** Complete  

---

## 1. Executive Summary

This document provides comprehensive analysis of **agent frameworks** (Pydantic AI, LangGraph, CrewAI, OpenAI Agents SDK), **schema validation tools** (Zod, Instructor, Pydantic), and **caption/transcription systems** (WhisperX, Captacity) discovered across the vendored repositories. These are foundational infrastructure components for building reliable, type-safe AI pipelines.

### Key Recommendations

| Category | Primary Choice | Rationale |
|----------|---------------|-----------|
| **Agent Framework** | Pydantic AI | Type-safe, model-agnostic, MCP support, durable execution |
| **Orchestration** | LangGraph | State machines, human-in-loop, production-ready |
| **Multi-Agent** | CrewAI | Role-based crews, flow composition |
| **TypeScript Agents** | OpenAI Agents SDK | Official, handoffs, realtime voice |
| **Structured Output** | Instructor | Simple extraction, auto-retries |
| **Schema (TS)** | Zod | TypeScript-native, MCP integration |
| **Schema (Python)** | Pydantic | Industry standard, LLM integration |
| **Caption System** | WhisperX | Word-level timestamps, diarization, 70x realtime |
| **Caption Overlay** | Captacity | Simple CLI, highlight current word |

---

## 2. Agent Frameworks Deep Dive

### 2.1 Pydantic AI (Primary Recommendation)

**Location:** `vendor/agents/pydantic-ai`

**Key Features:**
- Built by Pydantic team (used by OpenAI SDK, LangChain, etc.)
- Model-agnostic (OpenAI, Anthropic, Gemini, Groq, Ollama, etc.)
- Seamless Logfire observability integration
- Fully type-safe with IDE autocomplete
- MCP, Agent2Agent (A2A), and UI event streams
- Human-in-the-loop tool approval
- Durable execution for long-running workflows
- Streamed structured outputs
- Graph support for complex flows

**Core Pattern:**
```python
from pydantic_ai import Agent
from pydantic import BaseModel

class VideoScript(BaseModel):
    title: str
    hook: str
    body: str
    cta: str

agent = Agent(
    'anthropic:claude-sonnet-4-0',
    output_type=VideoScript,
    instructions='Generate engaging short-form video scripts.',
)

result = agent.run_sync('Create a script about AI automation')
print(result.output.hook)  # Type-safe access
```

**Dependency Injection Pattern:**
```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext

@dataclass
class ContentDependencies:
    trend_data: dict
    product_info: str
    target_platform: str

agent = Agent(
    'openai:gpt-4o',
    deps_type=ContentDependencies,
    output_type=VideoScript,
)

@agent.instructions
async def dynamic_instructions(ctx: RunContext[ContentDependencies]) -> str:
    return f"Create content for {ctx.deps.target_platform} about {ctx.deps.product_info}"

@agent.tool
async def get_trending_topics(ctx: RunContext[ContentDependencies]) -> list[str]:
    """Returns current trending topics."""
    return list(ctx.deps.trend_data.keys())
```

**Durable Execution (For Long-Running Tasks):**
```python
from pydantic_ai import Agent
from pydantic_ai.durable import DurableAgent

# Agent that survives failures and restarts
durable_agent = DurableAgent(
    agent,
    checkpoint_store=RedisCheckpointStore(redis_url),
)

# Long-running video generation workflow
result = await durable_agent.run(
    "Generate 10 video scripts for this week",
    deps=deps,
)
```

### 2.2 LangGraph (Orchestration Layer)

**Location:** `vendor/agents/langgraph`

**Key Features:**
- State machine-based workflow orchestration
- Durable execution with checkpointing
- Human-in-the-loop interrupts
- Comprehensive memory (short + long term)
- LangSmith debugging integration
- Production-ready deployment

**Core Pattern:**
```python
from langgraph.graph import START, END, StateGraph
from typing_extensions import TypedDict

class VideoState(TypedDict):
    topic: str
    script: str
    audio_path: str
    captions: list
    video_path: str

def generate_script(state: VideoState) -> dict:
    # Generate script with LLM
    script = llm.generate(state["topic"])
    return {"script": script}

def generate_audio(state: VideoState) -> dict:
    # Generate TTS audio
    audio_path = tts.synthesize(state["script"])
    return {"audio_path": audio_path}

def generate_captions(state: VideoState) -> dict:
    # Transcribe with WhisperX for word timestamps
    captions = whisperx.transcribe(state["audio_path"])
    return {"captions": captions}

def render_video(state: VideoState) -> dict:
    # Render with Remotion
    video = remotion.render(state)
    return {"video_path": video}

# Build the graph
graph = StateGraph(VideoState)
graph.add_node("script", generate_script)
graph.add_node("audio", generate_audio)
graph.add_node("captions", generate_captions)
graph.add_node("render", render_video)

graph.add_edge(START, "script")
graph.add_edge("script", "audio")
graph.add_edge("audio", "captions")
graph.add_edge("captions", "render")
graph.add_edge("render", END)

# Compile and run
app = graph.compile()
result = app.invoke({"topic": "AI automation for content creators"})
```

**Conditional Branching:**
```python
def should_regenerate(state: VideoState) -> str:
    if state.get("quality_score", 0) < 0.7:
        return "regenerate"
    return "continue"

graph.add_conditional_edges(
    "quality_check",
    should_regenerate,
    {"regenerate": "script", "continue": "render"}
)
```

### 2.3 CrewAI (Multi-Agent Teams)

**Location:** `vendor/agents/crewai`

**Key Features:**
- Role-based AI agent teams (Crews)
- Event-driven workflows (Flows)
- Independent of LangChain
- Enterprise control plane
- 100K+ certified developers

**Crew Pattern:**
```python
from crewai import Agent, Task, Crew

# Define specialized agents
researcher = Agent(
    role="Trend Researcher",
    goal="Find viral content opportunities",
    backstory="Expert at identifying trending topics",
    tools=[reddit_tool, google_trends_tool],
)

writer = Agent(
    role="Script Writer",
    goal="Create engaging short-form video scripts",
    backstory="Viral content specialist",
)

editor = Agent(
    role="Content Editor",
    goal="Polish and optimize scripts for engagement",
    backstory="Expert at hooks and CTAs",
)

# Define tasks
research_task = Task(
    description="Research trending topics in {niche}",
    agent=researcher,
    expected_output="List of 5 trending topics with engagement data"
)

writing_task = Task(
    description="Write a 60-second script about {topic}",
    agent=writer,
    context=[research_task],
    expected_output="Complete video script with hook, body, CTA"
)

editing_task = Task(
    description="Edit script for maximum engagement",
    agent=editor,
    context=[writing_task],
    expected_output="Polished, ready-to-record script"
)

# Assemble and run crew
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, editing_task],
    verbose=True,
)

result = crew.kickoff(inputs={"niche": "developer tools"})
```

**Flow Pattern (Production Architecture):**
```python
from crewai import Flow, listen, start

class ContentFlow(Flow):
    @start()
    def research_trends(self):
        return self.researcher_crew.kickoff()
    
    @listen(research_trends)
    def generate_scripts(self, trends):
        return self.writer_crew.kickoff(inputs={"trends": trends})
    
    @listen(generate_scripts)
    def human_review(self, scripts):
        # Human-in-the-loop approval
        return await self.get_approval(scripts)
    
    @listen(human_review)
    def render_videos(self, approved_scripts):
        return self.render_crew.kickoff(inputs={"scripts": approved_scripts})

flow = ContentFlow()
result = flow.kickoff()
```

### 2.4 OpenAI Agents SDK (TypeScript)

**Location:** `vendor/openai-agents-js`

**Key Features:**
- Official OpenAI JavaScript/TypeScript SDK
- Multi-agent workflows with handoffs
- Guardrails for input/output validation
- Built-in tracing and debugging
- Realtime voice agents (WebRTC/WebSockets)
- MCP server support
- Non-OpenAI model support via Vercel AI SDK

**Core Pattern:**
```typescript
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const generateScriptTool = tool({
  name: 'generate_script',
  description: 'Generate a video script',
  parameters: z.object({
    topic: z.string(),
    duration: z.number(),
  }),
  execute: async (input) => {
    return await scriptGenerator.generate(input);
  },
});

const contentAgent = new Agent({
  name: 'Content Agent',
  instructions: 'You create engaging short-form video content',
  tools: [generateScriptTool],
});

const result = await run(
  contentAgent,
  'Create a 60-second script about AI automation'
);
console.log(result.finalOutput);
```

**Handoffs Pattern:**
```typescript
const researchAgent = new Agent({
  name: 'Research Agent',
  instructions: 'You research trending topics',
  handoffDescription: 'Expert at finding viral content opportunities',
  tools: [trendSearchTool],
});

const writerAgent = Agent.create({
  name: 'Writer Agent',
  instructions: 'You write engaging scripts',
  handoffs: [researchAgent], // Can hand off to researcher
});

// Agent will automatically hand off when research is needed
const result = await run(writerAgent, 'Write a script about the latest AI trends');
```

---

## 3. Schema Validation Tools

### 3.1 Instructor (LLM Structured Output)

**Location:** `vendor/schema/instructor`

**Key Features:**
- Get reliable JSON from any LLM
- Built on Pydantic for validation
- Automatic retries on validation failure
- Works with all major providers

**Core Pattern:**
```python
import instructor
from pydantic import BaseModel, Field

class VideoScript(BaseModel):
    title: str = Field(description="Catchy video title")
    hook: str = Field(description="First 3 seconds hook")
    body: list[str] = Field(description="Main content points")
    cta: str = Field(description="Call to action")

client = instructor.from_provider("openai/gpt-4o")

script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[
        {"role": "user", "content": "Create a script about AI automation"}
    ],
)

# script is fully typed and validated
print(script.hook)  # IDE autocomplete works!
```

**Multi-Provider Support:**
```python
# All use the same API!
openai_client = instructor.from_provider("openai/gpt-4o")
anthropic_client = instructor.from_provider("anthropic/claude-3-5-sonnet")
groq_client = instructor.from_provider("groq/llama-3.1-8b-instant")
ollama_client = instructor.from_provider("ollama/llama3.2")
```

**Automatic Retries:**
```python
client = instructor.from_provider("openai/gpt-4o", max_retries=3)

# If validation fails, instructor sends the error back to the LLM
# and asks it to fix the output
script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[...],
)
```

### 3.2 Zod (TypeScript Schema)

**Location:** `vendor/schema/zod`

**Key Features:**
- TypeScript-native validation
- Runtime type checking
- Used by MCP, OpenAI SDK, tRPC
- Excellent DX with IDE support

**Core Pattern:**
```typescript
import { z } from 'zod';

const VideoScriptSchema = z.object({
  title: z.string().min(1).max(100),
  hook: z.string().max(50),
  duration: z.number().min(15).max(60),
  scenes: z.array(z.object({
    text: z.string(),
    visuals: z.string(),
    duration: z.number(),
  })),
  cta: z.string(),
});

type VideoScript = z.infer<typeof VideoScriptSchema>;

// Parse and validate
const script = VideoScriptSchema.parse(rawData);

// Safe parse (no throw)
const result = VideoScriptSchema.safeParse(rawData);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

**MCP Tool Definition:**
```typescript
import { z } from 'zod';
import { tool } from '@openai/agents';

const trendSearchTool = tool({
  name: 'search_trends',
  description: 'Search for trending topics',
  parameters: z.object({
    query: z.string(),
    platform: z.enum(['reddit', 'twitter', 'youtube']),
    limit: z.number().default(10),
  }),
  execute: async (input) => {
    return await trendAPI.search(input);
  },
});
```

### 3.3 Pydantic (Python Schema)

**Location:** `vendor/schema/pydantic`

**Key Features:**
- Python's de facto validation library
- Used by FastAPI, LangChain, OpenAI SDK
- Dataclass-like syntax
- JSON Schema generation

**Core Pattern:**
```python
from pydantic import BaseModel, Field, field_validator
from typing import Literal

class VideoScene(BaseModel):
    text: str = Field(max_length=200)
    visuals: str
    duration: float = Field(ge=1, le=30)

class VideoScript(BaseModel):
    title: str = Field(max_length=100)
    hook: str = Field(max_length=50, description="First 3 seconds hook")
    platform: Literal["tiktok", "reels", "shorts"]
    scenes: list[VideoScene]
    cta: str
    
    @field_validator('hook')
    @classmethod
    def hook_must_be_engaging(cls, v: str) -> str:
        if not any(word in v.lower() for word in ['you', 'this', 'secret']):
            raise ValueError('Hook should address viewer directly')
        return v

# Validation
script = VideoScript.model_validate(raw_data)

# JSON Schema for LLM structured output
schema = VideoScript.model_json_schema()
```

---

## 4. Caption/Transcription Systems

### 4.1 WhisperX (Primary Recommendation)

**Location:** `vendor/captions/whisperx`

**Key Features:**
- 70x realtime transcription with large-v2
- Word-level timestamps via wav2vec2 alignment
- Speaker diarization via pyannote
- VAD preprocessing (reduces hallucination)
- Batched inference (< 8GB GPU memory)

**Installation:**
```bash
pip install whisperx
# Requires CUDA 12.8 for GPU acceleration
```

**Command Line:**
```bash
# Basic transcription with word highlighting
whisperx audio.mp3 --highlight_words True

# With speaker diarization
whisperx audio.mp3 --model large-v2 --diarize --hf_token HF_TOKEN

# CPU mode (Mac compatible)
whisperx audio.mp3 --compute_type int8 --device cpu
```

**Programmatic Usage:**
```python
import whisperx

# Load model
device = "cuda"
compute_type = "float16"
model = whisperx.load_model("large-v2", device, compute_type=compute_type)

# Transcribe
audio = whisperx.load_audio("video.mp3")
result = model.transcribe(audio, batch_size=16)

# Align for word-level timestamps
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

# Speaker diarization
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token="HF_TOKEN", 
    device=device
)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)

# Result structure:
# {
#   "segments": [
#     {
#       "start": 0.0,
#       "end": 2.5,
#       "text": "Hello world",
#       "words": [
#         {"word": "Hello", "start": 0.0, "end": 0.5, "score": 0.99},
#         {"word": "world", "start": 0.6, "end": 1.0, "score": 0.98}
#       ],
#       "speaker": "SPEAKER_00"
#     }
#   ]
# }
```

### 4.2 Captacity (Caption Overlay)

**Location:** `vendor/captacity`

**Key Features:**
- Simple CLI for adding captions
- Word highlighting (current word in different color)
- Customizable fonts, colors, shadows
- Uses Whisper (local or API)
- MoviePy for video processing

**Quick Start:**
```bash
pip install captacity
captacity input.mp4 output.mp4
```

**Programmatic Usage:**
```python
import captacity

captacity.add_captions(
    video_file="short.mp4",
    output_file="short_captioned.mp4",
    
    # Font settings
    font="/path/to/font.ttf",
    font_size=130,
    font_color="yellow",
    
    # Stroke/outline
    stroke_width=3,
    stroke_color="black",
    
    # Shadow
    shadow_strength=1.0,
    shadow_blur=0.1,
    
    # Word highlighting (karaoke style)
    highlight_current_word=True,
    word_highlight_color="red",
    
    # Layout
    line_count=2,  # Max lines on screen
    padding=50,
    
    # Whisper settings
    use_local_whisper=True,  # Use local model
)
```

### 4.3 Auto-Subtitle (Simple Alternative)

**Location:** `vendor/auto-subtitle`

**Key Features:**
- Minimal CLI for subtitle burning
- FFmpeg-based overlay
- Translation support

```bash
# Add subtitles
auto_subtitle video.mp4 -o subtitled/

# Use larger model for better accuracy
auto_subtitle video.mp4 --model medium

# Translate to English
auto_subtitle video.mp4 --task translate
```

---

## 5. Integration Architecture

### 5.1 Recommended Agent Stack

```
┌────────────────────────────────────────────────────────────┐
│                    CONTENT-MACHINE                         │
├────────────────────────────────────────────────────────────┤
│  ORCHESTRATION LAYER                                       │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   LangGraph     │  │   BullMQ        │                 │
│  │ (State Machine) │  │ (Job Queue)     │                 │
│  └────────┬────────┘  └────────┬────────┘                 │
│           │                    │                           │
├───────────▼────────────────────▼───────────────────────────┤
│  AGENT LAYER                                               │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  Pydantic AI    │  │   CrewAI        │                 │
│  │ (Single Agent)  │  │ (Agent Teams)   │                 │
│  └────────┬────────┘  └────────┬────────┘                 │
│           │                    │                           │
├───────────▼────────────────────▼───────────────────────────┤
│  SCHEMA LAYER                                              │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   Instructor    │  │    Pydantic     │                 │
│  │ (LLM Output)    │  │ (Data Models)   │                 │
│  └─────────────────┘  └─────────────────┘                 │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Caption Pipeline Integration

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel
import whisperx
import captacity

class CaptionedVideo(BaseModel):
    video_path: str
    transcript: str
    word_timestamps: list[dict]

async def create_captioned_video(audio_path: str, background_video: str) -> CaptionedVideo:
    # 1. Transcribe with WhisperX
    model = whisperx.load_model("large-v2", "cuda")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio)
    
    # 2. Align for word timestamps
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], 
        device="cuda"
    )
    aligned = whisperx.align(result["segments"], model_a, metadata, audio, "cuda")
    
    # 3. Add captions to video
    output_path = "output_captioned.mp4"
    captacity.add_captions(
        video_file=background_video,
        output_file=output_path,
        highlight_current_word=True,
        word_highlight_color="yellow",
    )
    
    return CaptionedVideo(
        video_path=output_path,
        transcript=result["text"],
        word_timestamps=aligned["segments"][0]["words"]
    )
```

### 5.3 TypeScript Agent + Zod Integration

```typescript
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const VideoScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  scenes: z.array(z.object({
    text: z.string(),
    visuals: z.string(),
    duration: z.number(),
  })),
  cta: z.string(),
});

type VideoScript = z.infer<typeof VideoScriptSchema>;

const generateScriptTool = tool({
  name: 'generate_script',
  description: 'Generate a structured video script',
  parameters: z.object({
    topic: z.string(),
    platform: z.enum(['tiktok', 'reels', 'shorts']),
  }),
  execute: async (input): Promise<VideoScript> => {
    const result = await llm.generate({
      prompt: `Create a script for ${input.topic}`,
      schema: VideoScriptSchema,
    });
    return VideoScriptSchema.parse(result);
  },
});

const contentAgent = new Agent({
  name: 'Content Creator',
  instructions: 'Create engaging short-form video content',
  tools: [generateScriptTool],
});
```

---

## 6. Framework Comparison Matrix

### 6.1 Agent Frameworks

| Feature | Pydantic AI | LangGraph | CrewAI | OpenAI SDK |
|---------|-------------|-----------|--------|------------|
| **Language** | Python | Python | Python | TypeScript |
| **Type Safety** | Excellent | Good | Good | Excellent |
| **Model Agnostic** | ✅ All | ✅ All | ✅ All | ⚠️ Best w/ OpenAI |
| **Structured Output** | Native | Via LangChain | Native | Native (Zod) |
| **MCP Support** | ✅ | ✅ | ⚠️ Limited | ✅ |
| **Human-in-Loop** | ✅ | ✅ | ✅ | ✅ |
| **Durable Execution** | ✅ | ✅ | ❌ | ⚠️ Future |
| **Multi-Agent** | Via graph | Native | ✅ Crews | ✅ Handoffs |
| **Observability** | Logfire | LangSmith | Control Plane | Tracing |
| **License** | MIT | MIT | MIT | MIT |

**Recommendation:**
- **Single agent tasks:** Pydantic AI
- **Complex workflows:** LangGraph
- **Role-based teams:** CrewAI
- **TypeScript projects:** OpenAI Agents SDK

### 6.2 Schema Validation

| Feature | Instructor | Pydantic | Zod |
|---------|------------|----------|-----|
| **Language** | Python | Python | TypeScript |
| **LLM Integration** | ✅ Native | Via Instructor | Via AI SDK |
| **Retries** | ✅ Automatic | Manual | Manual |
| **Providers** | All major | N/A | N/A |
| **JSON Schema** | Via Pydantic | ✅ Native | ✅ Native |

### 6.3 Caption Systems

| Feature | WhisperX | Captacity | Auto-Subtitle |
|---------|----------|-----------|---------------|
| **Speed** | 70x RT | Realtime | ~5x RT |
| **Word Timestamps** | ✅ | Via Whisper | ✅ |
| **Diarization** | ✅ | ❌ | ❌ |
| **Word Highlight** | ❌ | ✅ | ❌ |
| **Video Overlay** | ❌ | ✅ | ✅ |
| **CLI** | ✅ | ✅ | ✅ |
| **Programmatic** | ✅ | ✅ | Limited |

---

## 7. Implementation Recommendations

### 7.1 Phase 1: Agent Foundation
```python
# Start with Pydantic AI for single agents
from pydantic_ai import Agent
from pydantic import BaseModel

class ContentOutput(BaseModel):
    script: str
    image_prompts: list[str]
    hashtags: list[str]

content_agent = Agent(
    'anthropic:claude-sonnet-4-0',
    output_type=ContentOutput,
    instructions='Generate viral short-form content',
)
```

### 7.2 Phase 2: Orchestration
```python
# Add LangGraph for complex pipelines
from langgraph.graph import StateGraph

class PipelineState(TypedDict):
    topic: str
    script: ContentOutput
    audio_path: str
    captions: list
    video_path: str

graph = StateGraph(PipelineState)
# Add nodes for each pipeline stage
```

### 7.3 Phase 3: Captions
```python
# Integrate WhisperX for word-level timestamps
import whisperx

def add_captions_pipeline(video_path: str, audio_path: str) -> str:
    # Transcribe with word alignment
    result = whisperx.transcribe(audio_path)
    aligned = whisperx.align(result)
    
    # Overlay with Captacity
    captacity.add_captions(
        video_file=video_path,
        highlight_current_word=True,
    )
```

---

## 8. Appendix

### 8.1 Quick Reference: Model Provider Strings

**Pydantic AI / Instructor:**
```python
# Format: provider:model-name
"openai:gpt-4o"
"anthropic:claude-sonnet-4-0"
"google:gemini-1.5-pro"
"groq:llama-3.1-70b-versatile"
"ollama:llama3.2"
"together:meta-llama/Llama-3-70b-chat-hf"
```

### 8.2 WhisperX Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 39M | 100x | 60% |
| base | 74M | 80x | 70% |
| small | 244M | 50x | 80% |
| medium | 769M | 25x | 88% |
| large-v2 | 1.55G | 70x* | 95% |
| large-v3 | 1.55G | 70x* | 96% |

*With batched inference on GPU

### 8.3 Environment Variables

```bash
# Agent frameworks
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GROQ_API_KEY=gsk_xxx

# Observability
LANGCHAIN_API_KEY=xxx  # LangSmith
LOGFIRE_API_KEY=xxx    # Pydantic Logfire

# Captions
HF_TOKEN=hf_xxx  # For pyannote diarization

# Schema validation
INSTRUCTOR_MODEL=openai/gpt-4o
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-02  
**Author:** Research Agent  
**Next Review:** After implementation begins
