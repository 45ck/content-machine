# Deep Dive #80: Orchestration, Job Queues & Agent Frameworks Ecosystem

**Date:** 2026-01-02
**Category:** Infrastructure & Agent Architecture
**Complexity:** High
**Dependencies:** DD-073 (Orchestration), DD-074 (Agent Frameworks), DD-079 (Connectors)

---

## Executive Summary

This deep dive synthesizes the complete orchestration layer for content-machine, covering **workflow orchestration** (Temporal, n8n, Airflow), **job queues** (BullMQ, Celery, RQ), **agent frameworks** (CrewAI, LangGraph), and **observability** (Langfuse, Promptfoo). These components form the "brain" of the video generation pipeline—coordinating async tasks, managing long-running agents, and providing visibility into LLM operations.

**Key Findings:**
- **Temporal:** Production-grade durable execution, ideal for complex video workflows
- **n8n:** Visual workflow builder with AI-native LangChain integration
- **BullMQ:** Redis-based, TypeScript-first, ideal for Node.js backends
- **CrewAI:** Multi-agent orchestration with Flows for enterprise control
- **LangGraph:** Low-level stateful workflows, LangChain ecosystem
- **Langfuse:** Open-source LLMOps with tracing, evals, prompt management
- **Promptfoo:** Developer-local LLM testing and red teaming

---

## 1. Workflow Orchestration

### 1.1 Temporal

**Repository:** vendor/orchestration/temporal
**Stars:** 12k+ | **Language:** Go | **License:** MIT

Temporal is a durable execution platform for building scalable, resilient applications. Workflows survive failures and can run indefinitely.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Durable Execution** | Workflows persist through crashes/restarts |
| **Automatic Retries** | Configurable retry policies with backoff |
| **Visibility** | Web UI for monitoring workflow state |
| **Multi-language** | Go, Java, TypeScript, Python, PHP SDKs |
| **Versioning** | Safely update running workflows |
| **Signals & Queries** | External interaction with running workflows |

#### Installation

```bash
# macOS
brew install temporal

# Start local dev server
temporal server start-dev

# Access Web UI at http://localhost:8233
```

#### TypeScript Workflow Example

```typescript
import { proxyActivities, defineSignal, setHandler, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

const { generateScript, renderVideo, uploadVideo } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
  },
});

// Define signals for human approval
export const approveSignal = defineSignal<[boolean]>('approve');

export async function videoGenerationWorkflow(
  topic: string,
  style: string
): Promise<{ videoUrl: string }> {
  
  // Step 1: Generate script (with LLM)
  const script = await generateScript(topic, style);
  
  // Step 2: Wait for human approval (up to 24 hours)
  let approved = false;
  setHandler(approveSignal, (isApproved: boolean) => {
    approved = isApproved;
  });
  
  // Poll for approval or timeout
  const deadline = Date.now() + 24 * 60 * 60 * 1000;
  while (!approved && Date.now() < deadline) {
    await sleep('5 minutes');
  }
  
  if (!approved) {
    throw new Error('Video not approved within 24 hours');
  }
  
  // Step 3: Render video (long-running)
  const videoPath = await renderVideo(script);
  
  // Step 4: Upload to platforms
  const videoUrl = await uploadVideo(videoPath);
  
  return { videoUrl };
}
```

#### content-machine Integration

- **Video Pipeline Orchestration** - End-to-end workflow coordination
- **Human-in-the-Loop** - Approval gates before publishing
- **Retry Handling** - Automatic recovery from API failures
- **Long-running Tasks** - Rendering jobs that take 30+ minutes

---

### 1.2 n8n

**Repository:** vendor/orchestration/n8n
**Stars:** 50k+ | **Language:** TypeScript | **License:** Fair-code (Sustainable Use)

n8n is a workflow automation platform with visual editor and 400+ integrations.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Visual Editor** | Drag-and-drop workflow builder |
| **400+ Integrations** | Reddit, YouTube, Slack, Discord, etc. |
| **AI-Native** | Built-in LangChain agents |
| **Self-Hostable** | Full control over data |
| **Code Flexibility** | JavaScript/Python nodes |
| **Webhooks** | Trigger workflows via HTTP |

#### Quick Start

```bash
# Run with npx
npx n8n

# Or Docker
docker run -it --rm --name n8n -p 5678:5678 docker.n8n.io/n8nio/n8n

# Access editor at http://localhost:5678
```

#### Example: AI Video Pipeline

```yaml
# Conceptual n8n workflow
nodes:
  - name: "Reddit Trigger"
    type: "n8n-nodes-base.redditTrigger"
    parameters:
      subreddit: "programming"
      postType: "top"
      
  - name: "AI Script Generator"
    type: "@n8n/n8n-nodes-langchain.agent"
    parameters:
      model: "gpt-4o"
      systemPrompt: "Generate viral TikTok script..."
      
  - name: "Render Video"
    type: "n8n-nodes-base.httpRequest"
    parameters:
      url: "http://localhost:3000/api/render"
      method: "POST"
      
  - name: "Upload to TikTok"
    type: "n8n-nodes-base.httpRequest"
    parameters:
      url: "{{$env.TIKTOK_UPLOAD_URL}}"
```

#### content-machine Integration

- **Visual Prototyping** - Quickly test pipeline ideas
- **Integration Layer** - Connect Reddit, YouTube, Slack
- **AI Agents** - LangChain-powered processing
- **Scheduling** - Cron-based content generation

---

### 1.3 AI Video Workflow

**Repository:** vendor/orchestration/ai-video-workflow
**Stars:** Growing | **Language:** Python | **License:** MIT

Desktop application for automated AI video generation with LibLibAI, Jimeng, and Doubao integration.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Text-to-Image** | LibLibAI integration with LoRA support |
| **Image-to-Video** | Jimeng I2V model |
| **Text-to-Music** | Jimeng music generation |
| **Auto-Merge** | FFmpeg composition |
| **Prompt Generator** | Doubao LLM for inspiration |

#### Pipeline

```
Text Prompt → LibLibAI (Image) → Jimeng I2V (Video) → Jimeng Music → FFmpeg Merge → Final Video
```

**Note:** Chinese-focused with Doubao/Jimeng APIs. Pattern useful for understanding multi-model orchestration.

---

## 2. Job Queues

### 2.1 BullMQ

**Repository:** vendor/job-queue/bullmq
**Stars:** 6k+ | **Language:** TypeScript | **License:** MIT

The fastest, most reliable Redis-based queue for Node.js.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Redis-Backed** | Persistent, distributed jobs |
| **Priority Queues** | Job prioritization |
| **Rate Limiting** | Control throughput |
| **Delayed Jobs** | Schedule for future |
| **Repeatable Jobs** | Cron-like scheduling |
| **Flow (DAG)** | Job dependencies |
| **Events** | Real-time job tracking |

#### Installation

```bash
npm install bullmq
```

#### Usage

```typescript
import { Queue, Worker } from 'bullmq';

// Create queue
const videoQueue = new Queue('video-rendering', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// Add job
await videoQueue.add('render', {
  script: 'Hello world video script...',
  style: 'viral-tiktok',
  outputPath: '/videos/output.mp4',
}, {
  priority: 1,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
});

// Create worker
const worker = new Worker('video-rendering', async (job) => {
  console.log(`Processing job ${job.id}`);
  
  // Long-running render task
  const videoPath = await renderVideo(job.data);
  
  // Update progress
  await job.updateProgress(50);
  
  // Return result
  return { videoPath };
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 2,  // 2 concurrent renders
});

// Handle completion
worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed: ${result.videoPath}`);
});

// Handle failure
worker.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
});
```

#### Job Dependencies (Flows)

```typescript
import { FlowProducer } from 'bullmq';

const flowProducer = new FlowProducer();

// Create dependency graph
await flowProducer.add({
  name: 'upload-video',
  queueName: 'publishing',
  data: { platforms: ['tiktok', 'youtube'] },
  children: [
    {
      name: 'render-video',
      queueName: 'rendering',
      data: { script: '...' },
      children: [
        {
          name: 'generate-script',
          queueName: 'scripting',
          data: { topic: 'AI tools' },
        },
        {
          name: 'download-assets',
          queueName: 'assets',
          data: { query: 'technology' },
        },
      ],
    },
  ],
});
```

#### content-machine Integration

- **Render Queue** - Long-running Remotion jobs
- **Upload Queue** - Multi-platform publishing
- **Priority System** - Urgent vs scheduled content
- **Rate Limiting** - Respect API quotas

---

### 2.2 Celery (Python)

**Repository:** vendor/job-queue/celery
**Stars:** 25k+ | **Language:** Python | **License:** BSD

Distributed task queue for Python applications.

```python
from celery import Celery

app = Celery('content-machine', broker='redis://localhost:6379')

@app.task(bind=True, max_retries=3)
def render_video(self, script: str, style: str):
    try:
        # Long-running render
        result = remotion_render(script, style)
        return result
    except Exception as e:
        raise self.retry(exc=e, countdown=60)

# Chain tasks
from celery import chain

workflow = chain(
    generate_script.s('AI tools'),
    render_video.s('viral'),
    upload_video.s(['tiktok', 'youtube'])
)
workflow.apply_async()
```

---

### 2.3 RQ (Redis Queue)

**Repository:** vendor/job-queue/rq
**Stars:** 10k+ | **Language:** Python | **License:** BSD

Simple Python job queue based on Redis. Lighter than Celery.

```python
from rq import Queue
from redis import Redis

redis_conn = Redis()
q = Queue(connection=redis_conn)

# Enqueue job
job = q.enqueue(render_video, script, style, job_timeout='30m')

# Check status
print(job.get_status())  # queued, started, finished, failed
print(job.result)        # None until finished
```

---

## 3. Agent Frameworks

### 3.1 CrewAI

**Repository:** vendor/agents/crewai
**Stars:** 25k+ | **Language:** Python | **License:** MIT

Multi-agent automation framework built independently from LangChain.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Crews** | Autonomous collaborative agents |
| **Flows** | Enterprise event-driven control |
| **100k+ Certified Devs** | Large community |
| **LLM-Agnostic** | Works with any model |
| **Tools Integration** | Custom tool creation |

#### Installation

```bash
pip install crewai crewai-tools
```

#### Crew Example

```python
from crewai import Agent, Task, Crew
from crewai_tools import SerperDevTool

# Define agents
researcher = Agent(
    role="Trend Researcher",
    goal="Find viral content opportunities",
    backstory="Expert at identifying trending topics on social media",
    tools=[SerperDevTool()],
    llm="gpt-4o"
)

scriptwriter = Agent(
    role="Script Writer",
    goal="Write engaging TikTok scripts",
    backstory="Viral content creator with 10M+ views",
    llm="gpt-4o"
)

# Define tasks
research_task = Task(
    description="Research trending topics in {niche} on Reddit and TikTok",
    expected_output="List of 5 trending topics with engagement metrics",
    agent=researcher
)

script_task = Task(
    description="Write a 60-second TikTok script about {topic}",
    expected_output="Complete script with hook, body, CTA",
    agent=scriptwriter,
    context=[research_task]  # Depends on research
)

# Create crew
crew = Crew(
    agents=[researcher, scriptwriter],
    tasks=[research_task, script_task],
    verbose=True
)

# Run
result = crew.kickoff(inputs={"niche": "developer tools", "topic": "AI coding assistants"})
```

#### Flows (Enterprise Control)

```python
from crewai.flow.flow import Flow, listen, start

class VideoGenerationFlow(Flow):
    
    @start()
    def research_trends(self):
        # Single LLM call for trend research
        return self.llm.invoke("Find trending topics...")
    
    @listen(research_trends)
    def generate_script(self, trends):
        # Use crew for collaborative script generation
        crew = Crew(agents=[...], tasks=[...])
        return crew.kickoff(inputs={"trends": trends})
    
    @listen(generate_script)
    def render_video(self, script):
        # Trigger external render service
        return requests.post("http://render/api", json={"script": script})

# Run flow
flow = VideoGenerationFlow()
result = flow.kickoff()
```

---

### 3.2 LangGraph

**Repository:** vendor/agents/langgraph
**Stars:** 8k+ | **Language:** Python/TypeScript | **License:** MIT

Low-level orchestration framework for stateful, long-running agents.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Durable Execution** | Persist through failures |
| **Human-in-the-Loop** | State inspection/modification |
| **Comprehensive Memory** | Short-term + long-term |
| **LangSmith Debugging** | Visual tracing |
| **Production Deployment** | Scalable infrastructure |

#### Installation

```bash
pip install langgraph
```

#### Basic Workflow

```python
from langgraph.graph import START, StateGraph
from typing_extensions import TypedDict

class VideoState(TypedDict):
    topic: str
    script: str
    video_path: str
    status: str

def research_node(state: VideoState) -> dict:
    # Research trending topics
    topics = tavily_search(state["topic"])
    return {"topic": topics[0]["title"]}

def script_node(state: VideoState) -> dict:
    # Generate script
    script = llm.invoke(f"Write script about {state['topic']}")
    return {"script": script, "status": "script_ready"}

def render_node(state: VideoState) -> dict:
    # Render video
    path = remotion_render(state["script"])
    return {"video_path": path, "status": "rendered"}

def should_continue(state: VideoState) -> str:
    if state.get("status") == "approved":
        return "render"
    return "wait_approval"

# Build graph
graph = StateGraph(VideoState)
graph.add_node("research", research_node)
graph.add_node("script", script_node)
graph.add_node("render", render_node)

graph.add_edge(START, "research")
graph.add_edge("research", "script")
graph.add_conditional_edges("script", should_continue)
graph.add_edge("render", END)

# Compile and run
app = graph.compile()
result = app.invoke({"topic": "AI coding tools"})
```

#### Human-in-the-Loop

```python
from langgraph.checkpoint.memory import MemorySaver

# Add checkpointing
memory = MemorySaver()
app = graph.compile(checkpointer=memory, interrupt_before=["render"])

# Run until interrupt
config = {"configurable": {"thread_id": "video-1"}}
state = app.invoke({"topic": "AI tools"}, config)

# Resume after approval
app.invoke(None, config)  # Continues from checkpoint
```

---

## 4. Observability

### 4.1 Langfuse

**Repository:** vendor/observability/langfuse
**Stars:** 8k+ | **Language:** TypeScript | **License:** MIT

Open-source LLM engineering platform for tracing, evals, and prompt management.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Tracing** | Full LLM call observability |
| **Prompt Management** | Version control for prompts |
| **Evaluations** | LLM-as-judge, user feedback |
| **Datasets** | Test sets for benchmarking |
| **Playground** | Prompt testing UI |
| **Self-Hostable** | Docker, Kubernetes |

#### Installation

```bash
# Python SDK
pip install langfuse

# JavaScript SDK
npm install langfuse
```

#### Tracing

```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse(
    public_key="pk-...",
    secret_key="sk-...",
    host="http://localhost:3000"
)

@observe()
def generate_video_script(topic: str, style: str) -> str:
    # This trace will be captured
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Write a {style} TikTok script"},
            {"role": "user", "content": topic}
        ]
    )
    
    # Add metadata
    langfuse_context.update_current_observation(
        metadata={"style": style, "topic": topic}
    )
    
    return response.choices[0].message.content

# Trace appears in Langfuse UI with timing, tokens, cost
```

#### Prompt Management

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Fetch versioned prompt
prompt = langfuse.get_prompt("video-script-generator", version=2)

# Use in application
response = openai.chat.completions.create(
    model=prompt.config["model"],
    messages=prompt.compile(topic="AI tools")
)
```

#### Evaluations

```python
# Create dataset
dataset = langfuse.create_dataset(name="video-scripts-eval")

# Add test cases
dataset.create_item(
    input={"topic": "AI coding tools"},
    expected_output="Should include hook, benefits, CTA"
)

# Run evaluation
for item in dataset.items:
    output = generate_video_script(item.input["topic"], "viral")
    langfuse.score(
        trace_id=langfuse_context.get_current_trace_id(),
        name="quality",
        value=0.8  # From LLM-as-judge
    )
```

---

### 4.2 Promptfoo

**Repository:** vendor/observability/promptfoo
**Stars:** 5k+ | **Language:** TypeScript | **License:** MIT

Developer-local LLM testing and red teaming tool.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Local Evaluation** | Prompts never leave your machine |
| **Model Comparison** | Side-by-side testing |
| **Red Teaming** | Security vulnerability scanning |
| **CI/CD Integration** | Automated checks |
| **Multi-Provider** | OpenAI, Anthropic, Ollama, etc. |

#### Quick Start

```bash
# Initialize
npx promptfoo@latest init

# Run eval
npx promptfoo eval

# View results
npx promptfoo view
```

#### Configuration

```yaml
# promptfooconfig.yaml
description: "Video script generation evaluation"

prompts:
  - file://prompts/script-generator.txt
  - file://prompts/script-generator-v2.txt

providers:
  - openai:gpt-4o
  - openai:gpt-4o-mini
  - anthropic:claude-3-5-sonnet

tests:
  - vars:
      topic: "AI coding assistants"
      style: "viral"
    assert:
      - type: contains
        value: "hook"
      - type: llm-rubric
        value: "Should be engaging and under 60 seconds"
      - type: cost
        threshold: 0.05

  - vars:
      topic: "JavaScript frameworks"
      style: "educational"
    assert:
      - type: similar
        value: "Expected output structure..."
        threshold: 0.8
```

#### Red Teaming

```yaml
# Red team configuration
redteam:
  plugins:
    - id: harmful-content
    - id: prompt-injection
    - id: pii-leakage
    - id: jailbreak

  strategies:
    - jailbreak
    - prompt-injection
    - multilingual
```

```bash
# Run red team scan
npx promptfoo redteam run
```

---

## 5. Architecture Integration

### 5.1 Recommended Stack

| Layer | Primary | Alternative | Notes |
|-------|---------|-------------|-------|
| **Orchestration** | Temporal | n8n | Temporal for prod, n8n for prototyping |
| **Job Queue** | BullMQ | Celery | BullMQ for TS, Celery for Python |
| **Agents** | LangGraph | CrewAI | LangGraph for control, CrewAI for autonomous |
| **Observability** | Langfuse | Promptfoo | Langfuse for prod, Promptfoo for dev |

### 5.2 Video Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TEMPORAL                                 │
│                    (Durable Execution)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   LANGGRAPH   │   │    BULLMQ     │   │   LANGFUSE    │
│   (Agents)    │   │  (Job Queue)  │   │ (Observability)│
└───────┬───────┘   └───────┬───────┘   └───────────────┘
        │                   │
        ▼                   ▼
┌───────────────────────────────────────────┐
│              VIDEO PIPELINE               │
│                                           │
│  Research → Script → Render → Upload      │
│                                           │
└───────────────────────────────────────────┘
```

### 5.3 Sample Temporal + BullMQ Integration

```typescript
// temporal/workflows/video-generation.ts
import { proxyActivities } from '@temporalio/workflow';

const activities = proxyActivities<typeof import('./activities')>({
  startToCloseTimeout: '30 minutes',
});

export async function videoGenerationWorkflow(topic: string) {
  // Step 1: Research (LangGraph agent via activity)
  const research = await activities.runResearchAgent(topic);
  
  // Step 2: Generate script (LangGraph agent)
  const script = await activities.runScriptAgent(research);
  
  // Step 3: Queue render job (BullMQ)
  const jobId = await activities.queueRenderJob(script);
  
  // Step 4: Wait for render completion (poll BullMQ)
  const videoPath = await activities.waitForRenderJob(jobId);
  
  // Step 5: Upload
  return await activities.uploadVideo(videoPath);
}
```

```typescript
// temporal/activities/render.ts
import { Queue } from 'bullmq';

const renderQueue = new Queue('video-rendering');

export async function queueRenderJob(script: string): Promise<string> {
  const job = await renderQueue.add('render', { script });
  return job.id!;
}

export async function waitForRenderJob(jobId: string): Promise<string> {
  const job = await Job.fromId(renderQueue, jobId);
  
  // Wait for completion with timeout
  const result = await job.waitUntilFinished(renderQueue, 30 * 60 * 1000);
  return result.videoPath;
}
```

---

## 6. Decision Matrix

### 6.1 Orchestration Choice

| Factor | Temporal | n8n | Airflow |
|--------|----------|-----|---------|
| **Durability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ (Python) |
| **Visual Editor** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Complexity** | High | Low | Medium |
| **Enterprise** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**Recommendation:** Temporal for production, n8n for rapid prototyping.

### 6.2 Agent Framework Choice

| Factor | LangGraph | CrewAI | OpenAI Agents SDK |
|--------|-----------|--------|-------------------|
| **Control** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Autonomy** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **TypeScript** | ⭐⭐⭐⭐ | ⭐ (Python) | ⭐⭐⭐⭐⭐ |
| **Debugging** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Learning Curve** | Medium | Low | Low |

**Recommendation:** LangGraph for complex workflows, CrewAI for multi-agent collaboration.

### 6.3 Queue Choice

| Factor | BullMQ | Celery | RQ |
|--------|--------|--------|-----|
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ |
| **Python** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Features** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Simplicity** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Scaling** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Recommendation:** BullMQ for TypeScript stack, Celery if Python-heavy.

---

## 7. Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. BullMQ queue setup for render jobs
2. Langfuse integration for LLM tracing
3. Basic workflow without orchestrator

### Phase 2: Orchestration (Week 3-4)
1. Temporal server deployment
2. Video generation workflow
3. Human approval gates

### Phase 3: Agents (Week 5-6)
1. LangGraph research agent
2. Script generation agent
3. Integration with Temporal

### Phase 4: Observability (Week 7-8)
1. Promptfoo eval suite
2. Langfuse dashboards
3. Alert rules

---

## 8. Key Takeaways

1. **Temporal is production-ready** - Durable execution for long-running video pipelines
2. **n8n for prototyping** - Visual builder accelerates iteration
3. **BullMQ fits TypeScript stack** - Redis-based, feature-rich, well-maintained
4. **LangGraph for control** - Low-level when you need precise agent behavior
5. **CrewAI for autonomy** - Multi-agent collaboration with less code
6. **Langfuse is essential** - Open-source LLMOps, self-hostable
7. **Promptfoo for dev testing** - Fast, local, privacy-preserving
8. **Combine tools strategically** - Temporal + BullMQ + LangGraph + Langfuse

---

## Related Documents

- [DD-073: Orchestration & Schema](73-orchestration-schema-observability-DEEP-20260102.md) - Earlier orchestration analysis
- [DD-074: Agent Frameworks](74-agent-frameworks-deep-research-DEEP-20260102.md) - Detailed agent comparison
- [DD-079: Data Connectors](../79-data-connectors-storage-content-sources-DEEP-20260102.md) - Intake layer
- [DD-072: OpenAI Agents & Observability](72-openai-agents-langfuse-promptfoo-DEEP-20260102.md) - OpenAI-specific patterns

---

**Document Statistics:**
- **Tools Covered:** 12
- **Code Examples:** 20+
- **Architecture Diagrams:** 2
- **Decision Matrices:** 3
- **Estimated Reading Time:** 20 minutes
