# Layer 3 Category G: Agent Frameworks

**Date:** 2026-01-04  
**Synthesized From:** 10 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 3 - AI & Orchestration

---

## Category Summary

Agent frameworks enable LLM-powered orchestration of video generation pipelines. Key requirements: **tool calling**, **structured output**, **state management**, and **observability**.

---

## Framework Comparison

| Framework | Language | Tools | State | Streaming | Best For |
|-----------|----------|-------|-------|-----------|----------|
| **OpenAI Agents SDK** | TypeScript | Yes | Session | Yes | Simple agents |
| **Pydantic AI** | Python | Yes | Context | Yes | Type-safe Python |
| **LangGraph** | Python/TS | Yes | Graph | Yes | Complex workflows |
| **CrewAI** | Python | Yes | Memory | Yes | Multi-agent |
| **LlamaIndex** | Python | Yes | Context | Yes | RAG focus |

---

## Primary (TypeScript): OpenAI Agents SDK

### Why OpenAI Agents SDK

1. **Official SDK** - Direct OpenAI support
2. **TypeScript native** - Type safety
3. **Simple API** - Low learning curve
4. **MCP compatible** - Tool calling patterns
5. **Streaming** - Real-time responses

### Installation

```bash
npm install @openai/agents
```

### Basic Agent

```typescript
import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

// Define tools
const searchTrends = tool({
  name: 'search_trends',
  description: 'Search for trending topics',
  parameters: z.object({
    topic: z.string(),
    platform: z.enum(['reddit', 'hackernews', 'twitter'])
  }),
  execute: async ({ topic, platform }) => {
    // Implementation
    return await trendService.search(topic, platform);
  }
});

const generateScript = tool({
  name: 'generate_script',
  description: 'Generate video script from topic',
  parameters: z.object({
    topic: z.string(),
    length: z.number(),
    style: z.enum(['educational', 'entertaining', 'promotional'])
  }),
  execute: async ({ topic, length, style }) => {
    return await scriptService.generate(topic, length, style);
  }
});

// Create agent
const agent = new Agent({
  name: 'content-planner',
  model: 'gpt-4o',
  instructions: `You are a content planning agent for short-form video.
    Research trending topics, then generate engaging scripts.`,
  tools: [searchTrends, generateScript]
});

// Run agent
const result = await agent.run('Create a video about AI trends');
```

### Multi-Agent Handoff

```typescript
import { Agent, handoff } from '@openai/agents';

const researcher = new Agent({
  name: 'researcher',
  instructions: 'Research topics and gather information',
  tools: [searchWeb, browsePage]
});

const writer = new Agent({
  name: 'writer',
  instructions: 'Write engaging video scripts',
  tools: [generateScript, refineScript]
});

const producer = new Agent({
  name: 'producer',
  instructions: 'Coordinate video production',
  tools: [
    handoff({ agent: researcher, condition: 'needs research' }),
    handoff({ agent: writer, condition: 'needs script' }),
    renderVideo,
    publishVideo
  ]
});

// Producer delegates to specialists
const result = await producer.run('Create video about quantum computing');
```

---

## Primary (Python): Pydantic AI

### Why Pydantic AI

1. **Type-safe** - Pydantic validation
2. **FastAPI ergonomics** - Familiar patterns
3. **Streaming** - Real-time responses
4. **Dependency injection** - Clean architecture
5. **Production-ready** - Error handling built-in

### Installation

```bash
pip install pydantic-ai
```

### Basic Agent

```python
from pydantic_ai import Agent
from pydantic import BaseModel

class VideoScript(BaseModel):
    title: str
    hook: str
    content: list[str]
    cta: str

agent = Agent(
    'openai:gpt-4o',
    result_type=VideoScript,
    system_prompt="""
    You are a video script writer. Generate engaging scripts
    for short-form content. Always include a strong hook.
    """
)

# Run with structured output
result = await agent.run('Write a script about AI trends')
print(result.data)  # VideoScript instance
```

### Tools with Dependency Injection

```python
from pydantic_ai import Agent, RunContext

@dataclass
class Dependencies:
    trend_api: TrendAPI
    script_db: ScriptDatabase

agent = Agent(
    'openai:gpt-4o',
    deps_type=Dependencies
)

@agent.tool
async def search_trends(ctx: RunContext[Dependencies], topic: str) -> list[Trend]:
    """Search for trending topics."""
    return await ctx.deps.trend_api.search(topic)

@agent.tool
async def save_script(ctx: RunContext[Dependencies], script: VideoScript) -> str:
    """Save script to database."""
    return await ctx.deps.script_db.save(script)

# Run with dependencies
deps = Dependencies(trend_api=TrendAPI(), script_db=ScriptDatabase())
result = await agent.run('Create trending content', deps=deps)
```

### Streaming

```python
async with agent.run_stream('Write a viral script') as response:
    async for text in response.stream_text():
        print(text, end='', flush=True)
```

---

## Complex Workflows: LangGraph

### When to Use LangGraph

- Multi-step workflows with branching
- State machines for complex logic
- Human-in-the-loop patterns
- Checkpointing and recovery

### Graph-Based Workflow

```python
from langgraph.graph import Graph, END

# Define state
class VideoState(TypedDict):
    topic: str
    research: list[str]
    script: str
    audio_path: str
    video_path: str
    status: str

# Define nodes
async def research_node(state: VideoState) -> VideoState:
    research = await research_agent.run(state['topic'])
    return {**state, 'research': research, 'status': 'researched'}

async def script_node(state: VideoState) -> VideoState:
    script = await script_agent.run(state['research'])
    return {**state, 'script': script, 'status': 'scripted'}

async def render_node(state: VideoState) -> VideoState:
    video = await render_service.create(state['script'])
    return {**state, 'video_path': video, 'status': 'rendered'}

# Build graph
workflow = Graph()
workflow.add_node('research', research_node)
workflow.add_node('script', script_node)
workflow.add_node('render', render_node)

workflow.add_edge('research', 'script')
workflow.add_edge('script', 'render')
workflow.add_edge('render', END)

workflow.set_entry_point('research')

# Compile and run
app = workflow.compile()
result = await app.ainvoke({'topic': 'AI trends'})
```

### Conditional Routing

```python
def should_rewrite(state: VideoState) -> str:
    if state.get('quality_score', 0) < 7:
        return 'rewrite'
    return 'approve'

workflow.add_conditional_edges(
    'quality_check',
    should_rewrite,
    {
        'rewrite': 'script',
        'approve': 'render'
    }
)
```

---

## Multi-Agent: CrewAI

### Collaborative Agents

```python
from crewai import Crew, Agent, Task

researcher = Agent(
    role='Trend Researcher',
    goal='Find viral content opportunities',
    backstory='Expert at identifying trending topics',
    tools=[search_trends, analyze_engagement]
)

writer = Agent(
    role='Script Writer',
    goal='Write engaging video scripts',
    backstory='Viral content creator with millions of views',
    tools=[generate_script, optimize_hook]
)

producer = Agent(
    role='Video Producer',
    goal='Create polished short-form videos',
    backstory='Production expert for TikTok and Reels',
    tools=[render_video, add_captions]
)

# Define tasks
research_task = Task(
    description='Research trending AI topics for Gen Z audience',
    agent=researcher
)

script_task = Task(
    description='Write 60-second script with strong hook',
    agent=writer
)

produce_task = Task(
    description='Render video with captions and music',
    agent=producer
)

# Create crew
crew = Crew(
    agents=[researcher, writer, producer],
    tasks=[research_task, script_task, produce_task],
    verbose=True
)

result = crew.kickoff()
```

---

## RAG Focus: LlamaIndex

### Knowledge-Enhanced Agents

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.agent import OpenAIAgent

# Index product documentation
docs = SimpleDirectoryReader('docs/').load_data()
index = VectorStoreIndex.from_documents(docs)

# Create query engine tool
query_tool = index.as_query_engine()

# Agent with product knowledge
agent = OpenAIAgent.from_tools(
    [query_tool],
    system_prompt="""
    You are a product expert. Use the knowledge base
    to answer questions about our product features.
    """
)

# Query with RAG
response = agent.chat('What are the key features of our API?')
```

---

## Structured Output: Instructor

### LLM → Pydantic Models

```python
import instructor
from openai import OpenAI
from pydantic import BaseModel

client = instructor.from_openai(OpenAI())

class VideoScene(BaseModel):
    text: str
    duration: float
    visual_prompt: str
    search_terms: list[str]

class VideoScript(BaseModel):
    title: str
    scenes: list[VideoScene]
    total_duration: float

# Extract structured data
script = client.chat.completions.create(
    model="gpt-4o",
    response_model=VideoScript,
    messages=[{
        "role": "user",
        "content": "Create a 60-second video script about AI trends"
    }]
)

# script is a validated VideoScript instance
for scene in script.scenes:
    print(f"Scene: {scene.text[:50]}... ({scene.duration}s)")
```

---

## Observability: Langfuse Integration

### Trace Agent Runs

```python
from langfuse.decorators import observe
from pydantic_ai import Agent

agent = Agent('openai:gpt-4o')

@observe()
async def generate_video_content(topic: str):
    # All LLM calls are traced
    research = await research_agent.run(topic)
    script = await script_agent.run(research)
    return script

# View traces in Langfuse dashboard
result = await generate_video_content('AI trends')
```

### OpenAI Agents SDK Tracing

```typescript
import { Agent, withTracing } from '@openai/agents';
import { LangfuseTracer } from './tracing';

const tracer = new LangfuseTracer();

const agent = withTracing(
  new Agent({
    name: 'content-planner',
    tools: [searchTrends, generateScript]
  }),
  tracer
);
```

---

## Integration Pattern for content-machine

### Hybrid Agent Architecture

```typescript
// TypeScript orchestrator
import { Agent } from '@openai/agents';

const orchestrator = new Agent({
  name: 'video-orchestrator',
  instructions: 'Coordinate video production pipeline',
  tools: [
    // MCP tools for Python services
    mcpTool('research', 'http://localhost:8001'),
    mcpTool('tts', 'http://localhost:8002'),
    mcpTool('render', 'http://localhost:8003'),
    
    // Native TypeScript tools
    tool('publish', publishVideo)
  ]
});
```

### Python Specialist Agents

```python
# research_agent.py
from pydantic_ai import Agent

research_agent = Agent(
    'openai:gpt-4o',
    system_prompt='Research trending topics for video content'
)

# Expose via MCP
@mcp.tool
async def research(topic: str) -> ResearchResult:
    return await research_agent.run(topic)
```

---

## Source Documents

- DD-51: Agent frameworks + specialized generators
- DD-57: Agent frameworks + MCP + capture
- DD-66: Observability + schema + agent frameworks
- DD-72: OpenAI Agents + Langfuse + Promptfoo
- DD-74: Agent frameworks + deep research
- DD-80: Orchestration + job queues + agent frameworks
- DD-82: Python agent frameworks + research systems
- agent-frameworks-generators-DEEP
- agent-frameworks-orchestration-DEEP
- openai-agents-sdk-DEEP

---

## Key Takeaway

> **Use OpenAI Agents SDK for TypeScript orchestration and Pydantic AI for Python specialists. LangGraph for complex state machines, CrewAI for multi-agent collaboration. Instructor for structured outputs, Langfuse for observability.**
