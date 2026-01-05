# Agent Frameworks & Orchestration Patterns - Deep Dive

**Date:** 2026-01-02  
**Status:** Research Complete  
**Category:** Agent Frameworks, LLM Orchestration, Pipeline Architecture

---

## 1. Executive Summary

This document analyzes agent frameworks for orchestrating content-machine's multi-step video generation pipeline. Key findings:

1. **Pydantic AI** - Best for type-safe, single-agent tasks with structured outputs
2. **CrewAI** - Best for multi-agent collaboration with role-based specialization
3. **LangGraph** - Best for complex stateful workflows with checkpointing
4. **LlamaIndex** - Best for RAG and document/knowledge retrieval

**Recommendation:** Use **LangGraph** for main pipeline orchestration with **Pydantic AI** for individual agent nodes requiring structured outputs.

---

## 2. Framework Comparison Matrix

| Feature              | Pydantic AI      | CrewAI            | LangGraph       | LlamaIndex      |
| -------------------- | ---------------- | ----------------- | --------------- | --------------- |
| **Primary Use**      | Type-safe agents | Multi-agent crews | Workflow graphs | RAG & retrieval |
| **Language**         | Python           | Python            | Python/JS       | Python/TS       |
| **State Management** | RunContext       | Shared memory     | Checkpointed    | Document stores |
| **Multi-Agent**      | No (single)      | Yes (crews)       | Yes (nodes)     | No (single)     |
| **MCP Support**      | Built-in         | Via tools         | Via tools       | Via tools       |
| **Human-in-Loop**    | Yes              | Yes               | Yes             | Limited         |
| **Type Safety**      | Excellent        | Good              | Good            | Good            |
| **Observability**    | Logfire          | Control Plane     | LangSmith       | Various         |
| **License**          | MIT              | MIT               | MIT             | MIT             |

---

## 3. Pydantic AI - Type-Safe Agent Framework

### 3.1 Core Architecture

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel, Field

# Structured output with validation
class ScriptOutput(BaseModel):
    scenes: list[str] = Field(description="Scene narrations")
    mood: str = Field(description="Overall mood/tone")
    duration_estimate: int = Field(ge=15, le=60)

# Agent with typed dependencies and outputs
script_agent = Agent(
    'anthropic:claude-sonnet-4-0',
    deps_type=ContentDeps,
    output_type=ScriptOutput,
    instructions="Generate engaging short video scripts"
)

# Tool with dependency injection
@script_agent.tool
async def get_trending_topics(ctx: RunContext[ContentDeps]) -> list[str]:
    """Fetch trending topics from configured sources"""
    return await ctx.deps.trend_api.get_hot_topics()
```

### 3.2 Key Features

1. **Structured Outputs** - Pydantic validation with retry on failure
2. **Dependency Injection** - Type-safe context passing via `RunContext`
3. **Tool Registration** - `@agent.tool` decorator with auto-schema generation
4. **MCP Integration** - Native Model Context Protocol support
5. **Graph Support** - Type-hinted graph definitions for complex flows

### 3.3 Content-Machine Applicability

**Best For:**

- Script generation agent (structured scene outputs)
- Metadata extraction (typed video config)
- Trend analysis (structured topic data)

**Pattern:**

```python
# For each video generation step, use Pydantic AI for structured output
class VideoConfig(BaseModel):
    scenes: list[SceneInput]
    music_mood: MusicMoodEnum
    caption_style: CaptionPositionEnum
    voice: VoiceEnum

video_planner = Agent(
    'openai:gpt-4',
    output_type=VideoConfig,
    instructions="Plan video structure from topic"
)
```

---

## 4. CrewAI - Multi-Agent Collaboration

### 4.1 Crews + Flows Architecture

```python
from crewai import Agent, Crew, Task, Process
from crewai.flow.flow import Flow, listen, start, router

# Define specialized agents
researcher = Agent(
    role="Trend Researcher",
    goal="Find viral-worthy topics with high engagement potential",
    backstory="Expert at identifying trending content patterns"
)

scriptwriter = Agent(
    role="Script Writer",
    goal="Create engaging 30-60 second video scripts",
    backstory="Master of concise, punchy storytelling"
)

# Define tasks with dependencies
research_task = Task(
    description="Research trending topics in {niche}",
    expected_output="List of 5 viral-worthy topics with rationale",
    agent=researcher
)

script_task = Task(
    description="Write script for selected topic: {topic}",
    expected_output="Complete script with scene breakdown",
    agent=scriptwriter
)

# Crew with process type
content_crew = Crew(
    agents=[researcher, scriptwriter],
    tasks=[research_task, script_task],
    process=Process.sequential,  # or hierarchical
    verbose=True
)
```

### 4.2 Flows for Production Pipelines

```python
from crewai.flow.flow import Flow, start, listen, router, or_
from pydantic import BaseModel

class VideoState(BaseModel):
    topic: str = ""
    script: str = ""
    assets_ready: bool = False
    render_status: str = "pending"

class VideoProductionFlow(Flow[VideoState]):
    @start()
    def research_topics(self):
        # Use crew for autonomous research
        result = research_crew.kickoff(inputs={"niche": "tech"})
        self.state.topic = result.best_topic
        return result

    @listen(research_topics)
    def generate_script(self, research_result):
        # Use another crew for script generation
        script_result = script_crew.kickoff(inputs={
            "topic": self.state.topic,
            "research": research_result
        })
        self.state.script = script_result.script
        return script_result

    @router(generate_script)
    def route_by_complexity(self):
        if len(self.state.script.split()) > 200:
            return "complex_render"
        return "simple_render"

    @listen("complex_render")
    def render_complex(self):
        # Multi-scene rendering
        pass

    @listen(or_("simple_render", "fallback"))
    def render_simple(self):
        # Single-scene rendering
        pass
```

### 4.3 Key Differentiators

1. **Role-Based Agents** - Natural language role/goal/backstory definitions
2. **Process Types** - Sequential, hierarchical, or custom
3. **Flows** - Event-driven workflow orchestration
4. **No LangChain Dependency** - Standalone, lean framework
5. **5.76x Faster** - Benchmarked faster than LangGraph for some tasks

---

## 5. LangGraph - Stateful Workflow Graphs

### 5.1 Graph-Based State Machine

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict

class VideoState(TypedDict):
    topic: str
    script: str | None
    assets: list[str]
    render_path: str | None
    error: str | None

def research_node(state: VideoState) -> dict:
    # Research trending topics
    topic = trend_api.get_best_topic()
    return {"topic": topic}

def script_node(state: VideoState) -> dict:
    # Generate script from topic
    script = script_generator.generate(state["topic"])
    return {"script": script}

def assets_node(state: VideoState) -> dict:
    # Fetch/generate visual assets
    assets = asset_fetcher.get_assets(state["script"])
    return {"assets": assets}

def render_node(state: VideoState) -> dict:
    # Render final video
    path = remotion.render(state["script"], state["assets"])
    return {"render_path": path}

# Build the graph
graph = StateGraph(VideoState)
graph.add_node("research", research_node)
graph.add_node("script", script_node)
graph.add_node("assets", assets_node)
graph.add_node("render", render_node)

# Define edges
graph.add_edge(START, "research")
graph.add_edge("research", "script")
graph.add_edge("script", "assets")
graph.add_edge("assets", "render")
graph.add_edge("render", END)

# Compile with checkpointing
memory = MemorySaver()
app = graph.compile(checkpointer=memory)
```

### 5.2 Human-in-the-Loop Pattern

```python
from langgraph.prebuilt import interrupt

def review_node(state: VideoState) -> dict:
    # Pause for human review
    decision = interrupt({
        "script": state["script"],
        "message": "Please review script before rendering"
    })

    if decision["approved"]:
        return {"script": decision.get("edited_script", state["script"])}
    else:
        return {"error": "Script rejected by reviewer"}

# Add conditional routing
def should_render(state: VideoState) -> str:
    if state.get("error"):
        return "end"
    return "render"

graph.add_conditional_edges("review", should_render, {
    "render": "render",
    "end": END
})
```

### 5.3 Key Benefits for Content-Machine

1. **Durable Execution** - Persists through failures, resumes from checkpoint
2. **Human-in-the-Loop** - Native interrupt/resume for review workflows
3. **Conditional Branching** - Complex routing based on state
4. **State Persistence** - Memory, Redis, or Postgres backends
5. **LangSmith Integration** - Full observability and debugging

---

## 6. LlamaIndex - Knowledge & RAG Framework

### 6.1 Core Use Case - Product Knowledge

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.llms.openai import OpenAI

# Index product documentation for truthful scripts
documents = SimpleDirectoryReader("./product_docs").load_data()
index = VectorStoreIndex.from_documents(documents)

# Query engine for product-aware script generation
query_engine = index.as_query_engine()
response = query_engine.query(
    "What are the key features to highlight in a demo video?"
)
```

### 6.2 Integration with Agent Frameworks

```python
from llama_index.core.tools import QueryEngineTool
from pydantic_ai import Agent

# Wrap LlamaIndex as a tool
product_tool = QueryEngineTool.from_defaults(
    query_engine=product_index.as_query_engine(),
    name="product_knowledge",
    description="Query product documentation for accurate feature info"
)

# Use in agent
@script_agent.tool
async def get_product_features(ctx: RunContext[ContentDeps], query: str) -> str:
    """Get accurate product information for script generation"""
    return product_tool.call(query)
```

### 6.3 Key Differentiators

1. **RAG-Focused** - Optimized for retrieval-augmented generation
2. **300+ Integrations** - Vector stores, LLMs, embeddings via LlamaHub
3. **Index Persistence** - Built-in storage management
4. **Modular Design** - Core + integrations architecture

---

## 7. Architecture Recommendation for Content-Machine

### 7.1 Hybrid Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Orchestrator                    │
│  (Main Pipeline: Durable, Checkpointed, Human-in-Loop)      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Research   │ -> │   Script    │ -> │   Assets    │     │
│  │    Node      │    │    Node     │    │    Node     │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐     │
│  │ Pydantic AI │    │ Pydantic AI │    │  Pexels +   │     │
│  │  Trend Agent│    │ Script Agent│    │  Kokoro TTS │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                            │                                │
│                     ┌──────▼──────┐                        │
│                     │  LlamaIndex  │                        │
│                     │Product RAG  │                        │
│                     └─────────────┘                        │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Review    │ <- │   Render    │ <- │   Caption   │     │
│  │ (Interrupt) │    │  (Remotion) │    │  (WhisperX) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Implementation Strategy

**Phase 1: Core Pipeline (LangGraph)**

```python
# Main orchestration with checkpointing
from langgraph.graph import StateGraph
from langgraph.checkpoint.postgres import PostgresSaver

class ContentMachineState(TypedDict):
    topic: str
    script: ScriptOutput  # Pydantic model
    audio_path: str
    captions: list[Caption]
    video_path: str
    approved: bool

graph = StateGraph(ContentMachineState)
# ... add nodes and edges

# Production with Postgres persistence
checkpointer = PostgresSaver.from_conn_string(DATABASE_URL)
pipeline = graph.compile(checkpointer=checkpointer)
```

**Phase 2: Individual Agents (Pydantic AI)**

```python
# Type-safe script generation
from pydantic_ai import Agent

script_agent = Agent(
    'anthropic:claude-sonnet-4-0',
    output_type=ScriptOutput,
    deps_type=ScriptDeps
)

@script_agent.tool
async def query_product_docs(ctx: RunContext[ScriptDeps], query: str) -> str:
    """Query product documentation via LlamaIndex"""
    return await ctx.deps.product_index.query(query)
```

**Phase 3: Product Knowledge (LlamaIndex)**

```python
# RAG for product-truthful content
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.qdrant import QdrantVectorStore

vector_store = QdrantVectorStore(collection_name="product_docs")
product_index = VectorStoreIndex.from_vector_store(vector_store)
```

---

## 8. Storage Layer Integration

### 8.1 Vector Databases (Qdrant vs Weaviate)

| Feature           | Qdrant                   | Weaviate          |
| ----------------- | ------------------------ | ----------------- |
| **Language**      | Rust                     | Go                |
| **Speed**         | Faster at scale          | Fast              |
| **Hybrid Search** | Yes                      | Yes (BM25+vector) |
| **Filtering**     | Advanced payload filters | GraphQL filters   |
| **Integrations**  | LangChain, LlamaIndex    | Same + native RAG |
| **Self-Hosted**   | Docker, Kubernetes       | Same              |
| **Cloud**         | Qdrant Cloud             | Weaviate Cloud    |
| **License**       | Apache 2.0               | BSD 3-Clause      |

**Recommendation:** Qdrant for performance, Weaviate for built-in RAG features.

### 8.2 Object Storage (MinIO)

```python
# Store generated videos and assets
from minio import Minio

client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

# Upload rendered video
client.fput_object(
    "videos",
    f"{video_id}.mp4",
    video_path,
    content_type="video/mp4"
)
```

**Note:** MinIO is now in maintenance mode (source-only). Consider alternatives for new projects or use MinIO AIStor for enterprise support.

---

## 9. Pipeline Patterns from Vendored Repos

### 9.1 Short-Video-Maker-Gyori (Blueprint)

The TypeScript blueprint demonstrates:

```typescript
// Queue-based processing
public addToQueue(sceneInput: SceneInput[], config: RenderConfig): string {
  const id = cuid();
  this.queue.push({ sceneInput, config, id });
  if (this.queue.length === 1) {
    this.processQueue();
  }
  return id;
}

// Per-scene processing
for (const scene of inputScenes) {
  // 1. TTS Generation (Kokoro)
  const audio = await this.kokoro.generate(scene.text, config.voice);

  // 2. Audio normalization (FFmpeg)
  await this.ffmpeg.saveNormalizedAudio(audioStream, tempWavPath);

  // 3. Caption generation (Whisper)
  const captions = await this.whisper.CreateCaption(tempWavPath);

  // 4. Video asset fetch (Pexels)
  const video = await this.pexelsApi.findVideo(scene.searchTerms, audioLength);

  scenes.push({ captions, video, audio });
}

// 5. Render with Remotion
await this.remotion.render({ music, scenes, config }, videoId);
```

### 9.2 Viral-Faceless-Shorts-Generator (Microservices)

Docker-based microservice pattern:

```yaml
services:
  trendscraper: # Node.js - Puppeteer + Gemini
    - Scrapes Google Trends
    - Generates scripts via Gemini API
    - Burns subtitles with FFmpeg

  coqui: # Coqui TTS container
    - Text-to-speech conversion

  speechalign: # Python + Aeneas
    - Forced alignment for subtitle timing

  nginx: # Web interface
    - One-click generation UI
```

### 9.3 Shortrocity (Simple Python)

Minimal pipeline pattern:

```python
# 1. Generate script
response = client.chat.completions.create(model="gpt-4", messages=[...])

# 2. Parse into scenes
data, narrations = narration.parse(response_text)

# 3. Generate narration audio
narration.create(data, output_folder)

# 4. Generate images
images.create_from_data(data, output_folder)

# 5. Create video
video.create(narrations, basedir, output_file, caption_settings)
```

---

## 10. Integration Strategy

### 10.1 Recommended Stack

| Layer             | Technology          | Justification                        |
| ----------------- | ------------------- | ------------------------------------ |
| **Orchestration** | LangGraph           | Durable, checkpointed, human-in-loop |
| **Agents**        | Pydantic AI         | Type-safe structured outputs         |
| **Knowledge**     | LlamaIndex + Qdrant | Product-truthful RAG                 |
| **TTS**           | Kokoro-FastAPI      | Fast, local, OpenAI-compatible       |
| **ASR**           | WhisperX            | Word-level timestamps, diarization   |
| **Rendering**     | Remotion            | React-based, programmable            |
| **Queue**         | BullMQ              | Redis-based, parent-child jobs       |
| **Storage**       | MinIO + PostgreSQL  | S3-compatible + relational           |

### 10.2 Content-Machine Pipeline

```
Trend Research (MCP/Reddit)
      │
      ▼
Topic Selection (LangGraph node)
      │
      ▼
Script Generation (Pydantic AI + LlamaIndex RAG)
      │
      ▼
Human Review (LangGraph interrupt) ──┐
      │                              │
      ▼                              │
Audio Generation (Kokoro TTS)        │ [APPROVE/EDIT/REJECT]
      │                              │
      ▼                              │
Caption Alignment (WhisperX)    <────┘
      │
      ▼
Asset Fetching (Pexels/Unsplash)
      │
      ▼
Video Rendering (Remotion + chuk-motion)
      │
      ▼
Quality Review (LangGraph interrupt)
      │
      ▼
Publishing (TikTok/YouTube/Instagram)
```

---

## 11. Key Takeaways

1. **LangGraph for Pipeline** - Provides durability, checkpointing, and human-in-the-loop natively
2. **Pydantic AI for Agents** - Type-safe structured outputs with validation retries
3. **LlamaIndex for Knowledge** - RAG over product docs ensures truthfulness
4. **CrewAI Alternative** - Consider if multi-agent collaboration becomes complex
5. **Hybrid Approach** - Combine frameworks at different layers for best results

---

## 12. Related Documents

- [10-short-video-maker-gyori.md](../10-short-video-maker-gyori-20260102.md) - Blueprint repo analysis
- [infrastructure-and-integrations-DEEP.md](infrastructure-and-integrations-DEEP-20260102.md) - MCP/queue patterns
- [video-editing-rendering-DEEP.md](video-editing-rendering-DEEP-20260102.md) - Remotion patterns

---

**Research completed by:** content-machine research pipeline  
**Last updated:** 2026-01-02
