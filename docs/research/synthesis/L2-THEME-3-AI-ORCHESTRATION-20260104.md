# Layer 2 Theme 3: AI & Orchestration

**Date:** 2026-01-04  
**Synthesized From:** Categories G, H, I  
**Layer:** 2 (Theme Synthesis)  
**Feeds Into:** Layer 1 Master Architecture

---

## Theme Summary

The **AI & Orchestration** theme covers how LLM agents coordinate the video generation pipeline: **agent frameworks**, **MCP tools**, and **job orchestration**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATION LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                    ┌───────────────────────────┐                        │
│                    │      ORCHESTRATOR         │                        │
│                    │   (OpenAI Agents SDK)     │                        │
│                    └───────────┬───────────────┘                        │
│                                │                                         │
│              ┌─────────────────┼─────────────────┐                      │
│              │                 │                 │                      │
│              ▼                 ▼                 ▼                      │
│    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│    │  research-mcp   │ │   render-mcp    │ │  publish-mcp    │         │
│    │  (Pydantic AI)  │ │  (TypeScript)   │ │  (Pydantic AI)  │         │
│    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘         │
│             │                   │                   │                   │
│             ▼                   ▼                   ▼                   │
│    ┌─────────────────────────────────────────────────────────┐         │
│    │                      BullMQ                              │         │
│    │                   Job Queue                              │         │
│    └─────────────────────────────────────────────────────────┘         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Framework Selection

### Dual-Language Strategy

| Layer | Language | Framework | Purpose |
|-------|----------|-----------|---------|
| **Orchestrator** | TypeScript | OpenAI Agents SDK | Coordinate pipeline |
| **Specialists** | Python | Pydantic AI | Domain-specific agents |

### Why This Split?

1. **TypeScript orchestrator** - Matches Remotion stack, type safety
2. **Python specialists** - Better ML ecosystem (Whisper, Kokoro)
3. **MCP bridge** - Clean interface between languages

---

## Orchestrator Agent (TypeScript)

### OpenAI Agents SDK

```typescript
import { Agent, tool, handoff } from '@openai/agents';
import { z } from 'zod';

// Define MCP-backed tools
const researchTool = tool({
  name: 'research_topic',
  description: 'Research a topic using Reddit, HN, and web search',
  parameters: z.object({
    topic: z.string(),
    depth: z.enum(['quick', 'deep']).default('quick')
  }),
  execute: async ({ topic, depth }) => {
    return await mcpClient.call('research', 'discover_trends', { topic, depth });
  }
});

const generateScriptTool = tool({
  name: 'generate_script',
  description: 'Generate a video script from research',
  parameters: z.object({
    topic: z.string(),
    research: z.any(),
    length: z.number().default(60)
  }),
  execute: async ({ topic, research, length }) => {
    return await mcpClient.call('script', 'generate', { topic, research, length });
  }
});

const renderVideoTool = tool({
  name: 'render_video',
  description: 'Render a video from script',
  parameters: z.object({
    script: z.any(),
    template: z.string().default('tiktok-bold')
  }),
  execute: async ({ script, template }) => {
    return await mcpClient.call('render', 'create_video', { script, template });
  }
});

const publishTool = tool({
  name: 'publish_video',
  description: 'Publish video to social platforms',
  parameters: z.object({
    videoPath: z.string(),
    platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram']))
  }),
  execute: async ({ videoPath, platforms }) => {
    return await mcpClient.call('publish', 'upload', { videoPath, platforms });
  }
});

// Create orchestrator
const videoOrchestrator = new Agent({
  name: 'video-orchestrator',
  model: 'gpt-4o',
  instructions: `You are a video production orchestrator. Your job is to:
    1. Research trending topics
    2. Generate engaging scripts
    3. Render high-quality videos
    4. Publish to social platforms
    
    Always validate each step before proceeding to the next.`,
  tools: [researchTool, generateScriptTool, renderVideoTool, publishTool]
});

// Run orchestration
const result = await videoOrchestrator.run(
  'Create a viral TikTok about AI coding assistants'
);
```

---

## Specialist Agents (Python)

### Research Agent

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel
from dataclasses import dataclass

class ResearchResult(BaseModel):
    topic: str
    trends: list[dict]
    key_insights: list[str]
    suggested_angles: list[str]

@dataclass
class ResearchDeps:
    reddit: RedditClient
    youtube: YouTubeClient
    tavily: TavilyClient

research_agent = Agent(
    'openai:gpt-4o',
    deps_type=ResearchDeps,
    result_type=ResearchResult,
    system_prompt="""
    You are a content research specialist. Your job is to:
    - Find trending topics and discussions
    - Identify viral potential
    - Suggest unique angles for video content
    """
)

@research_agent.tool
async def search_reddit(ctx: RunContext[ResearchDeps], subreddit: str, query: str) -> list[dict]:
    """Search Reddit for relevant discussions."""
    return await ctx.deps.reddit.search(subreddit, query)

@research_agent.tool
async def get_youtube_trends(ctx: RunContext[ResearchDeps], topic: str) -> list[dict]:
    """Get trending YouTube videos on a topic."""
    return await ctx.deps.youtube.search(topic, sort='viewCount')

@research_agent.tool
async def web_search(ctx: RunContext[ResearchDeps], query: str) -> dict:
    """Search the web for information."""
    return await ctx.deps.tavily.search(query)

# Expose via MCP
@mcp.tool()
async def discover_trends(topic: str, depth: str = "quick") -> dict:
    """Research trending topics."""
    deps = ResearchDeps(
        reddit=RedditClient(),
        youtube=YouTubeClient(),
        tavily=TavilyClient()
    )
    result = await research_agent.run(
        f"Research trending content about: {topic}. Depth: {depth}",
        deps=deps
    )
    return result.data.model_dump()
```

### Script Agent

```python
class VideoScript(BaseModel):
    title: str
    hook: str
    scenes: list[Scene]
    cta: str
    total_duration: float

class Scene(BaseModel):
    text: str
    duration: float
    visual_prompt: str
    search_terms: list[str]

script_agent = Agent(
    'openai:gpt-4o',
    result_type=VideoScript,
    system_prompt="""
    You are a viral video scriptwriter. Create scripts that:
    - Hook viewers in the first 3 seconds
    - Deliver value quickly
    - Use conversational language
    - End with clear call-to-action
    """
)

@mcp.tool()
async def generate_script(
    topic: str,
    research: dict,
    length: int = 60
) -> dict:
    """Generate a video script from research."""
    result = await script_agent.run(
        f"""Create a {length}-second video script about: {topic}
        
        Research context:
        {json.dumps(research, indent=2)}
        
        Make it engaging and viral-worthy."""
    )
    return result.data.model_dump()
```

---

## MCP Server Architecture

### Server Topology

```yaml
# mcp-config.yaml
servers:
  research:
    transport: http
    url: http://localhost:8001
    description: "Research and trend discovery"
    tools:
      - discover_trends
      - search_reddit
      - get_transcripts
    
  script:
    transport: http
    url: http://localhost:8002
    description: "Script generation"
    tools:
      - generate_script
      - refine_script
    
  render:
    transport: http
    url: http://localhost:8003
    description: "Video rendering"
    tools:
      - create_video
      - get_render_status
      - download_video
    
  publish:
    transport: http
    url: http://localhost:8004
    description: "Social media publishing"
    tools:
      - upload_video
      - schedule_post
      - get_analytics
```

### FastMCP Server Template

```python
from fastmcp import FastMCP

mcp = FastMCP("service-name")

@mcp.tool()
async def tool_name(param: str) -> dict:
    """Tool description."""
    # Implementation
    return {"result": "..."}

@mcp.resource("data://resource")
async def resource_name() -> dict:
    """Resource description."""
    return {"data": "..."}

if __name__ == "__main__":
    mcp.run(port=8001)
```

---

## Job Queue (BullMQ)

### Queue Architecture

```typescript
import { Queue, Worker, FlowProducer } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis();

// Define queues
const queues = {
  research: new Queue('research', { connection }),
  script: new Queue('script', { connection }),
  audio: new Queue('audio', { connection }),
  render: new Queue('render', { connection }),
  publish: new Queue('publish', { connection })
};

// Flow producer for multi-step jobs
const flow = new FlowProducer({ connection });

// Create video job flow
async function createVideoJob(topic: string, config: VideoConfig): Promise<string> {
  const job = await flow.add({
    name: 'publish',
    queueName: 'publish',
    data: { platforms: config.platforms },
    children: [{
      name: 'render',
      queueName: 'render',
      data: { template: config.template },
      children: [{
        name: 'audio',
        queueName: 'audio',
        data: { voice: config.voice },
        children: [{
          name: 'script',
          queueName: 'script',
          data: { length: config.length },
          children: [{
            name: 'research',
            queueName: 'research',
            data: { topic, depth: 'deep' }
          }]
        }]
      }]
    }]
  });
  
  return job.job.id!;
}
```

### Workers

```typescript
// Research worker
const researchWorker = new Worker('research', async (job) => {
  const { topic, depth } = job.data;
  
  await job.updateProgress(10);
  const result = await mcpClient.call('research', 'discover_trends', { topic, depth });
  
  await job.updateProgress(100);
  return result;
}, { connection });

// Script worker
const scriptWorker = new Worker('script', async (job) => {
  const { topic, research, length } = job.data;
  
  await job.updateProgress(10);
  const script = await mcpClient.call('script', 'generate', { topic, research, length });
  
  await job.updateProgress(100);
  return script;
}, { connection });

// Render worker
const renderWorker = new Worker('render', async (job) => {
  const { script, template } = job.data;
  
  await job.updateProgress(10);
  const video = await mcpClient.call('render', 'create_video', { script, template });
  
  await job.updateProgress(100);
  return video;
}, { connection });
```

---

## Observability

### Langfuse Integration

```python
from langfuse.decorators import observe

@observe()
async def generate_video(topic: str):
    """Traced end-to-end video generation."""
    
    # All LLM calls are automatically traced
    research = await research_agent.run(topic)
    script = await script_agent.run(research)
    
    # Trace custom spans
    with langfuse.span("render"):
        video = await render_service.create(script)
    
    return video

# View traces at: https://langfuse.com/dashboard
```

### Promptfoo Evaluation

```yaml
# promptfoo.yaml
prompts:
  - id: script-generation
    prompt: |
      Create a {length}-second video script about: {topic}
      
      Research: {research}

providers:
  - openai:gpt-4o
  - anthropic:claude-3-opus

tests:
  - vars:
      topic: "AI coding assistants"
      length: 60
      research: {...}
    assert:
      - type: contains
        value: "hook"
      - type: llm-rubric
        value: "Script is engaging and follows 60-second format"
```

---

## Error Handling

### Retry Strategy

```typescript
// BullMQ retry configuration
const jobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000  // 1s, 2s, 4s
  }
};

// Handle failures
worker.on('failed', async (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
  
  // Send to dead letter queue after max retries
  if (job.attemptsMade >= job.opts.attempts!) {
    await deadLetterQueue.add('failed-job', {
      originalJob: job.data,
      error: error.message,
      failedAt: new Date()
    });
  }
});
```

### Graceful Degradation

```typescript
async function generateWithFallback(topic: string): Promise<Script> {
  try {
    // Primary: GPT-4o
    return await scriptAgent.run(topic, { model: 'gpt-4o' });
  } catch (error) {
    console.warn('GPT-4o failed, falling back to GPT-4o-mini');
    
    // Fallback: GPT-4o-mini
    return await scriptAgent.run(topic, { model: 'gpt-4o-mini' });
  }
}
```

---

## Key Decisions

### 1. Dual-Language Architecture

**Decision:** TypeScript orchestrator + Python specialists
**Rationale:** Best of both ecosystems
**Trade-off:** More complexity, need MCP bridge

### 2. MCP for Inter-Service Communication

**Decision:** Use MCP protocol between services
**Rationale:** LLM-native interface, standardized tools
**Trade-off:** Overhead vs direct function calls

### 3. BullMQ for Job Queue

**Decision:** BullMQ (not Temporal, not RQ)
**Rationale:** TypeScript native, simple FlowProducer for job dependencies
**Trade-off:** Less durable than Temporal for long-running workflows

### 4. Langfuse for Observability

**Decision:** Langfuse for LLM tracing
**Rationale:** Self-hostable, excellent UI, cost tracking
**Trade-off:** Additional infrastructure to manage

---

## Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│                    AI & ORCHESTRATION                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │  OpenAI     │     │   FastMCP   │     │   BullMQ    │      │
│  │ Agents SDK  │────▶│   Servers   │────▶│    Jobs     │─────▶│
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│     Langfuse          Pydantic AI         Redis Queue         │
│     Tracing            Agents                                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Source Categories

- **Category G:** 10 agent framework deep-dives
- **Category H:** 7 MCP ecosystem deep-dives
- **Category I:** 6 orchestration deep-dives

---

## Key Takeaway

> **Use OpenAI Agents SDK for TypeScript orchestration, Pydantic AI for Python specialists, MCP for inter-service communication, BullMQ for job queues, and Langfuse for observability. This creates a flexible, traceable, and scalable AI orchestration layer.**
