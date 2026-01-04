# Deep Dive #57: Agent Frameworks, MCP Infrastructure & Screen Capture
**Date:** 2026-01-02  
**Category:** Agent Orchestration, MCP, Capture  
**Status:** Complete  
**Priority:** Critical - Core Architecture  

---

## Executive Summary

This deep dive documents the comprehensive agent frameworks, MCP (Model Context Protocol) infrastructure, and screen capture capabilities available in content-machine's vendored repositories. These form the backbone of intelligent orchestration for automated video generation.

**Key Findings:**
1. **5 Major Agent Frameworks** vendored with distinct paradigms
2. **FastMCP (Python & TypeScript)** provides production-ready MCP server infrastructure
3. **OpenAI Agents SDK** (JS/TS) offers first-party multi-agent capabilities
4. **Playwright + Puppeteer Screen Recorder** enable product-truthful UI capture
5. **chuk-mcp-remotion** bridges AI agents to Remotion video rendering

---

## Part 1: Agent Frameworks Comparison

### 1.1 Framework Overview

| Framework | Language | Paradigm | License | Stars | Key Feature |
|-----------|----------|----------|---------|-------|-------------|
| **CrewAI** | Python | Role-based Crews + Flows | MIT | 30k+ | YAML config, sequential/hierarchical |
| **Pydantic AI** | Python | Type-safe agents | MIT | 8k+ | Pydantic validation, dependency injection |
| **LangGraph** | Python/JS | State graphs + checkpoints | MIT | 15k+ | Durable execution, interrupts |
| **LangChain** | Python/JS | Chains + integrations | MIT | 95k+ | 600+ integrations, LCEL |
| **LlamaIndex** | Python/TS | Data framework + RAG | MIT | 40k+ | 300+ data connectors |
| **OpenAI Agents SDK** | JS/TS | Handoffs + guardrails | MIT | 5k+ | Realtime voice, MCP support |

### 1.2 CrewAI Deep Dive

**Philosophy:** "Fast and Flexible Multi-Agent Automation Framework"

**Key Concepts:**
- **Agents**: LLM instances with roles, goals, backstories
- **Tasks**: Work items with expected outputs
- **Crews**: Teams of agents collaborating on tasks
- **Flows**: Event-driven orchestration for production

**Architecture Pattern:**
```python
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task

@CrewBase
class VideoProductionCrew:
    """Video Production crew"""
    
    @agent
    def script_writer(self) -> Agent:
        return Agent(
            config=self.agents_config['script_writer'],
            tools=[SearchTool(), TrendAnalyzer()],
            verbose=True
        )
    
    @agent
    def video_editor(self) -> Agent:
        return Agent(
            config=self.agents_config['video_editor'],
            tools=[RemotionRenderer(), CaptionGenerator()]
        )
    
    @task
    def write_script(self) -> Task:
        return Task(
            config=self.tasks_config['write_script'],
            agent=self.script_writer
        )
    
    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential  # or Process.hierarchical
        )
```

**YAML Configuration:**
```yaml
# agents.yaml
script_writer:
  role: "{topic} Script Writer"
  goal: "Create engaging 60-second video scripts"
  backstory: "Expert at viral short-form content creation"

# tasks.yaml
write_script:
  description: "Write a {length}-second script about {topic}"
  expected_output: "Complete script with hook, body, CTA"
  agent: script_writer
```

**Flows for Production:**
```python
from crewai.flow.flow import Flow, listen, start, router, or_

class VideoProductionFlow(Flow[VideoState]):
    @start()
    def analyze_trends(self):
        # Demonstrate low-level control
        return {"topic": "AI Tools", "angle": "productivity"}
    
    @listen(analyze_trends)
    def generate_with_crew(self, trend_data):
        # Crew for autonomous collaboration
        return VideoProductionCrew().crew().kickoff(inputs=trend_data)
    
    @router(generate_with_crew)
    def quality_gate(self, result):
        if result.score > 0.8:
            return "render"
        return "revise"
```

**content-machine Relevance:**
- Role-based agents ideal for content pipeline (researcher, scriptwriter, editor)
- Flows provide production control for approval workflows
- YAML config aligns with our configuration-driven philosophy

---

### 1.3 Pydantic AI Deep Dive

**Philosophy:** "GenAI Agent Framework, the Pydantic way"

**Key Features:**
1. **Type-safe**: Static type checking for agent outputs
2. **Model-agnostic**: 40+ model providers supported
3. **Dependency injection**: Clean separation of concerns
4. **Structured outputs**: Guaranteed validation
5. **MCP + A2A integration**: Native protocol support
6. **Durable execution**: Handle long-running workflows

**Architecture Pattern:**
```python
from dataclasses import dataclass
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

@dataclass
class VideoDependencies:
    project_id: str
    db: DatabaseConnection
    remotion: RemotionClient

class VideoOutput(BaseModel):
    script: str = Field(description="Generated script")
    scenes: list[Scene] = Field(description="Scene breakdown")
    tts_ready: bool = Field(description="Script is TTS-compatible")
    duration_seconds: int = Field(ge=15, le=60)

video_agent = Agent(
    'anthropic:claude-sonnet-4-0',
    deps_type=VideoDependencies,
    output_type=VideoOutput,  # Guaranteed structured output
    instructions="Create engaging short-form video content"
)

@video_agent.tool
async def get_trending_topics(
    ctx: RunContext[VideoDependencies], 
    platform: str
) -> list[str]:
    """Get current trending topics for the platform."""
    return await ctx.deps.db.get_trends(platform)

@video_agent.tool
async def render_preview(
    ctx: RunContext[VideoDependencies],
    script: str
) -> str:
    """Render a preview of the video."""
    return await ctx.deps.remotion.preview(script)
```

**Observability with Logfire:**
```python
from pydantic_ai import Agent
import logfire

logfire.configure()

# Automatic tracing of all agent runs
result = await video_agent.run("Create a video about Python tips", deps=deps)
```

**content-machine Relevance:**
- Type-safe outputs prevent pipeline errors
- Dependency injection perfect for managing Remotion/TTS/DB connections
- Built-in evals for quality assurance
- MCP integration for tool calling

---

### 1.4 LangGraph Deep Dive

**Philosophy:** "Low-level orchestration framework for building, managing, and deploying long-running, stateful agents"

**Core Benefits:**
- **Durable execution**: Resume from failures
- **Human-in-the-loop**: Pause/approve at any point
- **Comprehensive memory**: Short-term + long-term
- **Debugging**: Full execution visualization

**State Graph Pattern:**
```python
from langgraph.graph import START, StateGraph, END
from typing_extensions import TypedDict

class VideoState(TypedDict):
    topic: str
    script: str
    scenes: list[dict]
    audio_path: str
    video_path: str
    status: str

def research_topic(state: VideoState) -> dict:
    # Research trending angles
    research = tavily_search(state["topic"])
    return {"script": generate_script(research)}

def generate_scenes(state: VideoState) -> dict:
    scenes = parse_script_to_scenes(state["script"])
    return {"scenes": scenes}

def generate_audio(state: VideoState) -> dict:
    audio = kokoro_tts(state["script"])
    return {"audio_path": audio}

def render_video(state: VideoState) -> dict:
    video = remotion_render(state["scenes"], state["audio_path"])
    return {"video_path": video, "status": "complete"}

# Build the graph
graph = StateGraph(VideoState)
graph.add_node("research", research_topic)
graph.add_node("scenes", generate_scenes)
graph.add_node("audio", generate_audio)
graph.add_node("render", render_video)

graph.add_edge(START, "research")
graph.add_edge("research", "scenes")
graph.add_edge("scenes", "audio")
graph.add_edge("audio", "render")
graph.add_edge("render", END)

app = graph.compile()
result = app.invoke({"topic": "AI coding tools"})
```

**Checkpointing for Durability:**
```python
from langgraph.checkpoint.memory import MemorySaver

# Add persistence
memory = MemorySaver()
app = graph.compile(checkpointer=memory)

# Resume from checkpoint
config = {"configurable": {"thread_id": "video-123"}}
result = app.invoke({"topic": "AI tools"}, config)
```

**Human-in-the-Loop:**
```python
from langgraph.graph import interrupt

def review_script(state: VideoState) -> dict:
    # Pause for human review
    approval = interrupt({"script": state["script"]})
    if not approval:
        return {"status": "rejected"}
    return {"status": "approved"}
```

**content-machine Relevance:**
- State graph perfect for video generation pipeline
- Checkpointing enables recovery from FFmpeg/render failures
- Human-in-the-loop for content approval
- Works seamlessly with LangChain integrations

---

### 1.5 OpenAI Agents SDK (JavaScript/TypeScript)

**Philosophy:** "Lightweight yet powerful framework for building multi-agent workflows"

**Key Features:**
- **Handoffs**: Transfer control between specialized agents
- **Guardrails**: Input/output validation
- **Realtime Voice**: WebRTC/WebSocket voice agents
- **MCP Support**: Local MCP server integration
- **Streaming**: Real-time event streaming

**Architecture Pattern:**
```typescript
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const trendResearcher = new Agent({
  name: 'Trend Researcher',
  instructions: 'Research viral content trends',
  handoffDescription: 'Expert at finding trending topics',
  tools: [
    tool({
      name: 'search_reddit',
      description: 'Search Reddit for trending topics',
      parameters: z.object({ subreddit: z.string() }),
      execute: async (input) => {
        return await redditMcp.search(input.subreddit);
      },
    }),
  ],
});

const scriptWriter = new Agent({
  name: 'Script Writer',
  instructions: 'Write engaging 60-second video scripts',
  handoffDescription: 'Expert at viral script creation',
  handoffs: [trendResearcher],  // Can delegate to researcher
});

const videoOrchestrator = Agent.create({
  name: 'Video Orchestrator',
  instructions: 'Coordinate video production',
  handoffs: [trendResearcher, scriptWriter],
});

// Run the agent loop
const result = await run(
  videoOrchestrator,
  'Create a video about the latest AI tools'
);
```

**Realtime Voice Agent:**
```typescript
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents-realtime';

const voiceAgent = new RealtimeAgent({
  name: 'Voice Narrator',
  instructions: 'You are a professional voice narrator',
  tools: [/* voice tools */],
});

// Browser-based voice interaction
const session = new RealtimeSession(voiceAgent);
await session.connect({ apiKey });
```

**content-machine Relevance:**
- TypeScript aligns with our tech stack
- Handoffs enable specialized agent delegation
- Realtime voice for future voice-driven content creation
- MCP integration for tool access

---

## Part 2: MCP Infrastructure

### 2.1 FastMCP (TypeScript)

**Location:** `vendor/mcp/fastmcp-typescript`

**Key Features:**
- Simple Tool, Resource, Prompt definition
- Authentication & session management
- HTTP Streaming (SSE compatible)
- Stateless mode for serverless
- Progress notifications
- Typed server events

**Server Pattern:**
```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "Video Generator",
  version: "1.0.0",
});

// Add a tool for script generation
server.addTool({
  name: "generate_script",
  description: "Generate a video script from a topic",
  parameters: z.object({
    topic: z.string(),
    duration_seconds: z.number().min(15).max(60),
    style: z.enum(["educational", "entertaining", "promotional"]),
  }),
  execute: async (args) => {
    const script = await generateScript(args);
    return JSON.stringify(script);
  },
});

// Add a resource for templates
server.addResource({
  uri: "template://video-templates",
  name: "Video Templates",
  mimeType: "application/json",
  read: async () => {
    return JSON.stringify(await getTemplates());
  },
});

server.start({ transportType: "stdio" });
```

### 2.2 FastMCP (Python)

**Location:** `vendor/mcp/fastmcp-python`

**Philosophy:** "The fast, Pythonic way to build MCP servers and clients"

**Key Features:**
- Decorator-based tool definition
- Server composition (mount multiple servers)
- OpenAPI & FastAPI generation
- Enterprise authentication (Google, GitHub, Azure, Auth0)
- Proxy server support

**Server Pattern:**
```python
from fastmcp import FastMCP

mcp = FastMCP("Video Generator 🎬")

@mcp.tool
def generate_script(topic: str, duration: int = 60) -> dict:
    """Generate a video script from a topic.
    
    Args:
        topic: The topic for the video
        duration: Target duration in seconds (15-60)
    """
    script = create_script(topic, duration)
    return {"script": script, "scenes": parse_scenes(script)}

@mcp.resource("template://{template_id}")
def get_template(template_id: str) -> str:
    """Get a video template by ID."""
    return load_template(template_id)

@mcp.prompt
def video_brief(topic: str) -> str:
    """Generate a video production brief."""
    return f"""Create a 60-second video about: {topic}
    
    Requirements:
    - Hook in first 3 seconds
    - Clear value proposition
    - Call to action at end
    """

if __name__ == "__main__":
    mcp.run()
```

**Server Composition:**
```python
from fastmcp import FastMCP

main = FastMCP("Content Machine")
trends = FastMCP("Trend Research")
rendering = FastMCP("Video Rendering")

main.mount("/trends", trends)
main.mount("/render", rendering)

# Now main exposes all tools from both sub-servers
```

### 2.3 MCP Server Ecosystem

**Reference Servers (from mcp-servers):**
| Server | Purpose | Status |
|--------|---------|--------|
| Filesystem | File access | Active |
| Git | Repository operations | Active |
| Memory | Knowledge graph persistence | Active |
| Fetch | Web content fetching | Active |
| PostgreSQL | Database access | Archived → postgres-mcp |

**content-machine Specific Servers (from vendor):**
| Server | Purpose | Location |
|--------|---------|----------|
| **qdrant-mcp-server** | Vector search | vendor/mcp-servers/ |
| **postgres-mcp** | Database queries | vendor/mcp-servers/ |
| **plainly-mcp-server** | Video rendering API | vendor/mcp-servers/ |
| **reddit-mcp-ts** | Reddit research | vendor/connectors/ |

---

## Part 3: Screen Capture Infrastructure

### 3.1 Playwright

**Location:** `vendor/capture/playwright`

**Capabilities:**
- Cross-browser: Chromium, Firefox, WebKit
- Auto-wait for elements
- Video recording built-in
- Codegen for test recording
- Trace viewer for debugging

**Video Recording Pattern:**
```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: './recordings',
    size: { width: 1080, height: 1920 }  // Vertical for shorts
  }
});

const page = await context.newPage();
await page.goto('https://product.example.com');

// Perform product demo actions
await page.click('[data-testid="feature-button"]');
await page.fill('#search', 'demo query');
await page.click('[data-testid="submit"]');

// Wait for results
await page.waitForSelector('.results');
await page.screenshot({ path: 'result.png' });

await context.close();  // Video saved automatically
await browser.close();
```

**Docker Deployment:**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.52.0
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "playwright", "test"]
```

### 3.2 Puppeteer Screen Recorder

**Location:** `vendor/capture/puppeteer-screen-recorder`

**Key Features:**
- Native Chrome DevTools Protocol
- Frame-by-frame capture
- Follow new tabs automatically
- Configurable FPS, resolution, codec
- FFmpeg integration

**Configuration:**
```javascript
const Config = {
  followNewTab: true,
  fps: 30,
  ffmpeg_Path: null,  // Auto-install
  videoFrame: {
    width: 1080,
    height: 1920  // Vertical format
  },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 1000,
  aspectRatio: '9:16'  // Vertical shorts
};
```

**Recording Pattern:**
```javascript
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const recorder = new PuppeteerScreenRecorder(page, Config);
await recorder.start('./demo-recording.mp4');

// Perform actions
await page.goto('https://product.example.com');
await page.click('.feature-demo');
await page.waitForTimeout(3000);

await recorder.stop();
await browser.close();
```

### 3.3 Screen Capture Patterns Repository

**Location:** `vendor/capture/screen-capture-patterns`

**Purpose:** Reference implementations for Playwright and Puppeteer in Docker

**Structure:**
```
screen-capture-patterns/
├── playwright/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── run.sh
│   └── tests/
├── puppeteer/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── tests/
└── screen-recordings/
    └── screenshot.png
```

---

## Part 4: chuk-mcp-remotion Bridge

**Location:** `vendor/render/chuk-mcp-remotion`

**Purpose:** MCP server bridging AI agents to Remotion video rendering

### 4.1 Architecture

```
AI Agent (Claude/GPT) 
    ↓ MCP Protocol
chuk-mcp-remotion Server
    ↓ Remotion CLI
Video Output (.mp4)
```

### 4.2 Design System

**Four Token Categories:**

1. **Colors** - 7 theme palettes (Tech, Finance, Education, Lifestyle, Gaming, Minimal, Business)
2. **Typography** - Font scales for 720p, 1080p, 4K
3. **Spacing** - Platform-safe margins for TikTok, YouTube, Instagram
4. **Motion** - Spring configs, easing curves, durations

**Platform Safe Margins:**
| Platform | Top | Bottom | Left | Right |
|----------|-----|--------|------|-------|
| TikTok | 100px | 180px | 24px | 80px |
| Instagram Stories | 100px | 120px | 24px | 24px |
| YouTube | 20px | 20px | 20px | 20px |
| LinkedIn | 40px | 40px | 24px | 24px |

### 4.3 Component Library

**51 Video Components:**
- **Charts (6):** Pie, Bar, Line, Area, Donut, Horizontal Bar
- **Scenes (2):** TitleScene, EndScreen
- **Overlays (3):** LowerThird, TextOverlay, SubscribeButton
- **Code (3):** CodeBlock, TypingCode, CodeDiff
- **Layouts (17):** Grid, Container, Mosaic, HUDStyle, etc.
- **Animations (20+):** Fade, Bounce, Glitch, Neon, etc.

**MCP Tool Pattern:**
```python
@mcp.tool
def create_title_scene(
    title: str,
    subtitle: str = "",
    theme: str = "tech",
    animation: str = "fade"
) -> dict:
    """Create an animated title scene for the video."""
    return {
        "component": "TitleScene",
        "props": {
            "title": title,
            "subtitle": subtitle,
            "theme": theme,
            "animation": animation
        }
    }
```

---

## Part 5: Recommended Architecture

### 5.1 Agent Selection Matrix

| Use Case | Recommended Framework | Reasoning |
|----------|----------------------|-----------|
| **Content Pipeline** | CrewAI + LangGraph | Role-based crews with durable state |
| **Type-Safe Tools** | Pydantic AI | Guaranteed output validation |
| **Real-time Voice** | OpenAI Agents SDK | Native WebRTC support |
| **Data Processing** | LlamaIndex | 300+ data connectors |
| **Complex Orchestration** | LangGraph | State graphs with checkpoints |

### 5.2 MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Machine MCP Hub                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ reddit-mcp  │  │ qdrant-mcp  │  │ postgres-mcp        │ │
│  │ (Trends)    │  │ (Vectors)   │  │ (Persistence)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ remotion-mcp│  │ kokoro-mcp  │  │ whisperx-mcp        │ │
│  │ (Rendering) │  │ (TTS)       │  │ (ASR)               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Video Capture Pipeline

```typescript
// Product-truthful capture using Playwright
async function captureProductDemo(product: Product): Promise<string> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: './captures', size: { width: 1080, height: 1920 } }
  });
  
  const page = await context.newPage();
  
  // Execute product demo script
  for (const step of product.demoSteps) {
    await page.goto(step.url);
    await page.click(step.selector);
    await page.waitForTimeout(step.pauseMs);
  }
  
  await context.close();
  const video = await page.video()!.path();
  await browser.close();
  
  return video;
}
```

---

## Part 6: Integration Patterns

### 6.1 CrewAI + MCP Integration

```python
from crewai import Agent, Tool
from fastmcp import Client

# Connect to MCP servers
reddit_mcp = Client("reddit-mcp")
remotion_mcp = Client("chuk-mcp-remotion")

# Wrap MCP tools for CrewAI
def mcp_tool(server: Client, tool_name: str):
    async def call(**kwargs):
        return await server.call_tool(tool_name, kwargs)
    return Tool(name=tool_name, func=call)

trend_researcher = Agent(
    role="Trend Researcher",
    goal="Find viral content opportunities",
    tools=[
        mcp_tool(reddit_mcp, "search_subreddit"),
        mcp_tool(reddit_mcp, "get_trending"),
    ]
)

video_renderer = Agent(
    role="Video Renderer", 
    goal="Create polished video output",
    tools=[
        mcp_tool(remotion_mcp, "create_title_scene"),
        mcp_tool(remotion_mcp, "add_captions"),
        mcp_tool(remotion_mcp, "render_video"),
    ]
)
```

### 6.2 LangGraph + Playwright Capture

```python
from langgraph.graph import StateGraph
from playwright.async_api import async_playwright

class CaptureState(TypedDict):
    product_url: str
    demo_script: list[dict]
    recording_path: str

async def capture_product(state: CaptureState) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            record_video_dir="./captures",
            record_video_size={"width": 1080, "height": 1920}
        )
        page = await context.new_page()
        
        await page.goto(state["product_url"])
        for step in state["demo_script"]:
            await page.click(step["selector"])
            await page.wait_for_timeout(step["wait_ms"])
        
        await context.close()
        video = await page.video.path()
        await browser.close()
        
    return {"recording_path": video}

# Add to graph
graph = StateGraph(CaptureState)
graph.add_node("capture", capture_product)
```

---

## Summary

### Agent Framework Recommendations

1. **Primary Orchestration:** LangGraph (state graphs, durability, human-in-the-loop)
2. **Role-Based Agents:** CrewAI (YAML config, sequential/hierarchical processes)
3. **Type-Safe Tools:** Pydantic AI (structured outputs, dependency injection)
4. **JavaScript Pipeline:** OpenAI Agents SDK (handoffs, realtime voice)

### MCP Infrastructure

1. **Server Framework:** FastMCP (TypeScript for Node.js pipeline, Python for ML)
2. **Key Servers:** reddit-mcp-ts, qdrant-mcp, chuk-mcp-remotion, postgres-mcp

### Capture Strategy

1. **Primary:** Playwright (cross-browser, video recording, Docker-ready)
2. **Fallback:** Puppeteer Screen Recorder (CDP native, configurable)

### Key Integration Patterns

1. MCP servers as tool providers for agents
2. LangGraph for durable video pipeline state
3. Playwright for product-truthful capture
4. chuk-mcp-remotion for AI-driven Remotion rendering

---

## Next Steps

1. **ADR-003:** Choose primary agent framework (CrewAI vs LangGraph vs Hybrid)
2. **ADR-004:** Define MCP server architecture for content-machine
3. **Implement:** FastMCP server for Remotion integration
4. **Implement:** Playwright capture pipeline with MCP tools

---

## References

- [CrewAI Documentation](https://docs.crewai.com/)
- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [FastMCP Python](https://gofastmcp.com/)
- [FastMCP TypeScript](https://github.com/punkpeye/fastmcp)
- [Playwright Documentation](https://playwright.dev/)
