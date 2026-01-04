# Observability, Research Tools & Infrastructure - Deep Dive Analysis
**Date:** 2026-01-02  
**Category:** Deep Research  
**Status:** Complete

---

## Executive Summary

This deep dive analyzes the observability, research tools, and infrastructure components vendored in content-machine. These tools form the backbone for LLM monitoring, autonomous research, job queue management, and MCP server infrastructure.

### Key Discoveries

| Category | Tool | Key Value |
|----------|------|-----------|
| **LLM Observability** | Langfuse | Tracing + Prompt Management + Evals |
| **Prompt Testing** | Promptfoo | LLM evals + red teaming + CI/CD |
| **Deep Research** | GPT Researcher | Autonomous research with 20+ sources |
| **Deep Research** | Open Deep Research | LangGraph-based, top-6 on benchmark |
| **Job Queue** | BullMQ | Redis-based, parent-child jobs, rate limiting |
| **MCP Infrastructure** | Postgres MCP Pro | Index tuning + health checks + schema intelligence |
| **MCP Infrastructure** | Qdrant MCP | Vector search memory layer |
| **Video Rendering** | Plainly MCP | Programmatic video rendering via MCP |

---

## 1. LLM Observability

### 1.1 Langfuse

**Repository:** `vendor/observability/langfuse`  
**Stars:** 16K+  
**License:** MIT (with EE folders)

Langfuse is an **open source LLM engineering platform** for development, monitoring, evaluation, and debugging of AI applications.

#### Core Features

| Feature | Description |
|---------|-------------|
| **Tracing** | Track LLM calls, retrieval, embedding, agent actions |
| **Prompt Management** | Version control, collaborative iteration, cached |
| **Evaluations** | LLM-as-judge, user feedback, manual labeling |
| **Datasets** | Test sets and benchmarks for regression testing |
| **Playground** | Test prompts and model configs interactively |

#### Integration Pattern

```python
from langfuse import observe
from langfuse.openai import openai  # Drop-in replacement

@observe()
def generate_script():
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Generate TikTok script"}],
    ).choices[0].message.content

@observe()
def video_pipeline():
    script = generate_script()
    return render_video(script)

video_pipeline()  # Automatically traced
```

#### Key Integrations

| Integration | Type | Notes |
|-------------|------|-------|
| **LangChain** | Python/JS | Callback handler for auto-tracing |
| **LlamaIndex** | Python | Callback system integration |
| **CrewAI** | Python | Multi-agent tracing |
| **Vercel AI SDK** | JS/TS | Next.js, React, Svelte |
| **LiteLLM** | Python/Proxy | 100+ LLM providers |

#### Deployment Options

```bash
# Local development (Docker Compose)
git clone https://github.com/langfuse/langfuse.git
docker compose up

# Self-hosted options: VM, Kubernetes (Helm), AWS/Azure/GCP
```

### 1.2 Promptfoo

**Repository:** `vendor/observability/promptfoo`  
**License:** MIT

Promptfoo is a **developer-first LLM evaluation and red-teaming tool** that runs 100% locally.

#### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Prompt Testing** | Automated evaluations with test cases |
| **Red Teaming** | Vulnerability scanning for LLM apps |
| **Model Comparison** | Side-by-side OpenAI vs Anthropic vs Ollama |
| **CI/CD Integration** | Automate checks in pipelines |
| **Code Scanning** | PR reviews for LLM security/compliance |

#### Usage Pattern

```bash
# Initialize and run evaluation
npx promptfoo@latest init
npx promptfoo eval
```

#### Configuration Example

```yaml
# promptfooconfig.yaml
prompts:
  - "Write a TikTok script about {{topic}}"
  - "Generate a viral short video script for {{topic}}"

providers:
  - openai:gpt-4o
  - anthropic:claude-sonnet-4-20250514
  - ollama:llama3

tests:
  - vars:
      topic: "coding tips"
    assert:
      - type: contains
        value: "hook"
      - type: llm-rubric
        value: "Script should be engaging and under 60 seconds"
```

#### Key Value for content-machine

1. **Script Quality Testing**: Evaluate generated scripts against rubrics
2. **Voice Prompt Optimization**: Compare TTS prompt variations
3. **Trend Analysis Validation**: Test research prompt effectiveness
4. **Red Team**: Ensure content safety before publishing

---

## 2. Autonomous Research Tools

### 2.1 GPT Researcher

**Repository:** `vendor/research/gpt-researcher`  
**Stars:** 15K+  
**License:** Apache 2.0

GPT Researcher is an **open deep research agent** for web and local research tasks.

#### Architecture

```
┌────────────┐     ┌──────────────┐     ┌───────────┐
│  Research  │────▶│   Crawler    │────▶│ Summarize │
│  Questions │     │   Agents     │     │   Each    │
└────────────┘     └──────────────┘     └───────────┘
       │                                       │
       ▼                                       ▼
┌────────────┐                          ┌───────────┐
│  Planner   │                          │  Filter   │
│   Agent    │                          │ Aggregate │
└────────────┘                          └───────────┘
                                               │
                                               ▼
                                        ┌───────────┐
                                        │  Report   │
                                        │ Publisher │
                                        └───────────┘
```

#### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Source** | Aggregates 20+ sources per research |
| **Long Reports** | Generates 2000+ word reports |
| **Image Scraping** | Smart image filtering for reports |
| **Local Documents** | Research from PDF, Word, Excel |
| **MCP Support** | GitHub, databases, custom APIs |
| **Deep Research** | Tree-like exploration (5 min, ~$0.40) |

#### Usage

```python
from gpt_researcher import GPTResearcher
import asyncio

async def research_trends():
    researcher = GPTResearcher(
        query="What are trending coding tutorials on TikTok this week?",
        mcp_configs=[
            {
                "name": "github",
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-github"],
                "env": {"GITHUB_TOKEN": os.getenv("GITHUB_TOKEN")}
            }
        ]
    )
    
    research_result = await researcher.conduct_research()
    report = await researcher.write_report()
    return report

# ~$0.40 per deep research, ~5 minutes
```

#### Application to content-machine

1. **Trend Research**: Automated research on trending topics
2. **Product Documentation**: Research competitor products
3. **Script Research**: Background for factual scripts
4. **SEO Analysis**: Research optimal hashtags/descriptions

### 2.2 Open Deep Research

**Repository:** `vendor/research/open-deep-research`  
**By:** LangChain  
**Benchmark Rank:** #6 on Deep Research Bench (RACE score: 0.4344)

**Open Deep Research** is a LangGraph-based research agent that matches performance of commercial deep research tools.

#### Architecture

```
Input Question
      │
      ▼
┌───────────┐
│ Research  │◀─────────────────────────────┐
│   Agent   │                               │
└─────┬─────┘                               │
      │                                      │
      ▼                                      │
┌───────────┐    ┌────────────┐    ┌───────┴───────┐
│Summarize  │───▶│ Compression│───▶│ Final Report  │
│  Results  │    │   Model    │    │    Model      │
└───────────┘    └────────────┘    └───────────────┘
```

#### Model Configuration

| Role | Default Model | Purpose |
|------|---------------|---------|
| **Summarization** | gpt-4.1-mini | Summarize search results |
| **Research** | gpt-4.1 | Power the search agent |
| **Compression** | gpt-4.1 | Compress findings |
| **Final Report** | gpt-4.1 | Write comprehensive report |

#### Search API Support

- Tavily (default)
- Native web search (Anthropic, OpenAI)
- Full MCP compatibility for custom sources

#### Benchmark Results

| Model Config | RACE Score | Cost | Tokens |
|--------------|------------|------|--------|
| GPT-5 | 0.4943 | - | 204M |
| Claude Sonnet 4 | 0.4401 | $187 | 139M |
| GPT-4.1 (default) | 0.4309 | $46 | 58M |

#### Usage

```bash
# Start LangGraph server
uvx --from "langgraph-cli[inmem]" --with-editable . langgraph dev

# Access Studio UI at http://127.0.0.1:2024
```

---

## 3. Job Queue Infrastructure

### 3.1 BullMQ

**Repository:** `vendor/job-queue/bullmq`  
**Stars:** 5K+  
**License:** MIT

BullMQ is the **fastest, most reliable Redis-based distributed queue** for Node.js.

#### Core Features

| Feature | Description |
|---------|-------------|
| **Parent-Child Dependencies** | Job flow with dependencies |
| **Rate Limiting** | Queue-level rate limiting |
| **Priorities** | Prioritized job processing |
| **Delayed Jobs** | Schedule jobs for future |
| **Repeatable Jobs** | Cron-like scheduling |
| **Sandboxed Workers** | Isolated job processing |
| **Pause/Resume** | Queue control |

#### Basic Usage

```typescript
import { Queue, Worker, QueueEvents, FlowProducer } from 'bullmq';

// Add jobs to queue
const queue = new Queue('video-render');
await queue.add('render-tiktok', { 
  script: "Hook your audience...",
  voice: "kokoro-en",
  style: "modern"
});

// Process jobs
const worker = new Worker('video-render', async job => {
  if (job.name === 'render-tiktok') {
    return await renderTikTok(job.data);
  }
});

// Listen for completion
const queueEvents = new QueueEvents('video-render');
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Video ${jobId} rendered:`, returnvalue);
});
```

#### Parent-Child Flows (Critical for Pipelines)

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer();

// Video generation pipeline with dependencies
await flow.add({
  name: 'publish-video',
  queueName: 'publish',
  data: { platforms: ['tiktok', 'youtube'] },
  children: [
    {
      name: 'render-video',
      queueName: 'render',
      data: { outputFormat: 'mp4' },
      children: [
        {
          name: 'generate-tts',
          queueName: 'audio',
          data: { voice: 'kokoro-en' }
        },
        {
          name: 'fetch-visuals',
          queueName: 'assets',
          data: { source: 'pexels' }
        },
        {
          name: 'generate-captions',
          queueName: 'captions',
          data: { style: 'word-highlight' }
        }
      ]
    }
  ]
});
```

#### Feature Comparison

| Feature | BullMQ | BullMQ Pro | Bull | Kue | Agenda |
|---------|--------|------------|------|-----|--------|
| **Backend** | Redis | Redis | Redis | Redis | Mongo |
| **Parent-Child** | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Rate Limiter** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Group Rate Limit** | ✗ | ✓ | ✗ | ✗ | ✗ |
| **Batches** | ✗ | ✓ | ✗ | ✗ | ✗ |
| **Priorities** | ✓ | ✓ | ✓ | ✓ | ✗ |

#### Why BullMQ for content-machine

1. **Pipeline Dependencies**: Video pipeline has natural parent-child structure
2. **Rate Limiting**: Respect API limits (TTS, Pexels, OpenAI)
3. **Redis-Based**: Fast, proven, works with Dragonfly for scale
4. **TypeScript Native**: Matches our tech stack
5. **Used by Langfuse**: Proven at scale in LLM systems

---

## 4. MCP Server Infrastructure

### 4.1 Postgres MCP Pro

**Repository:** `vendor/mcp-servers/postgres-mcp`  
**By:** Crystal DBA

Postgres MCP Pro is an **advanced MCP server for PostgreSQL** with index tuning, explain plans, and health checks.

#### Core Tools

| Tool | Description |
|------|-------------|
| `list_schemas` | List all database schemas |
| `list_objects` | List tables, views, sequences |
| `get_object_details` | Columns, constraints, indexes |
| `execute_sql` | Safe SQL execution (read-only mode available) |
| `explain_query` | Execution plan with hypothetical indexes |
| `get_top_queries` | Slowest queries via pg_stat_statements |
| `analyze_workload_indexes` | Recommend optimal indexes |
| `analyze_db_health` | Buffer cache, connections, vacuum health |

#### Access Modes

| Mode | Description |
|------|-------------|
| **Unrestricted** | Full read/write for development |
| **Restricted** | Read-only with execution time limits |

#### Index Tuning Algorithm

Based on Microsoft's **Anytime Algorithm**:

1. **Identify SQL queries** needing tuning (from pg_stat_statements)
2. **Generate candidate indexes** (parse SQL, identify filter/join columns)
3. **Search optimal configuration** (greedy search with HypoPG simulation)
4. **Cost-benefit analysis** (Pareto front selection)

#### Configuration

```json
{
  "mcpServers": {
    "postgres": {
      "command": "uvx",
      "args": ["postgres-mcp", "--access-mode=unrestricted"],
      "env": {
        "DATABASE_URI": "postgresql://user:pass@localhost:5432/content_machine"
      }
    }
  }
}
```

### 4.2 Qdrant MCP Server

**Repository:** `vendor/mcp-servers/qdrant-mcp-server`  
**By:** Qdrant

Official MCP server for **Qdrant vector search** as a semantic memory layer.

#### Tools

| Tool | Description |
|------|-------------|
| `qdrant-store` | Store information with embeddings |
| `qdrant-find` | Semantic search for relevant info |

#### Usage Pattern

```bash
# Environment variables
QDRANT_URL="http://localhost:6333"
COLLECTION_NAME="video-scripts"
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"

# Run server
uvx mcp-server-qdrant --transport sse
```

#### Code Search Configuration

```bash
# Configure for code snippet storage
TOOL_STORE_DESCRIPTION="Store code snippets. 'information' = description, 
                        'metadata.code' = actual code."
TOOL_FIND_DESCRIPTION="Search code by natural language description."
```

### 4.3 Plainly MCP Server

**Repository:** `vendor/mcp-servers/plainly-mcp-server`  
**By:** Plainly Videos

MCP server for **programmatic video rendering** via Plainly's API.

#### Tools

| Tool | Description |
|------|-------------|
| `list_renderable_items` | List designs and projects |
| `get_renderable_items_details` | Parameters, previews, aspect ratios |
| `render_item` | Submit render with parameters |
| `check_render_status` | Check status, get preview links |

#### Configuration

```json
{
  "mcpServers": {
    "plainly": {
      "command": "npx",
      "args": ["-y", "@plainly-videos/mcp-server@latest"],
      "env": {
        "PLAINLY_API_KEY": "<YOUR_KEY>"
      }
    }
  }
}
```

---

## 5. Publishing & Distribution Tools

### 5.1 Mixpost

**Repository:** `vendor/publish/mixpost`  
**Type:** Laravel Package  
**License:** MIT

Mixpost is a **social media management platform** with scheduling, analytics, and team collaboration.

#### Features

| Feature | Description |
|---------|-------------|
| **Multi-Account** | Manage all social accounts in one place |
| **Scheduling** | Queue system for optimal timing |
| **Analytics** | Platform-specific insights |
| **Team Collaboration** | Workspaces, tasks, permissions |
| **Post Versions** | Tailor content per platform |
| **Media Library** | Reusable assets, stock integration |

### 5.2 TikTok Auto Uploader

**Repository:** `vendor/publish/TiktokAutoUploader`  
**Method:** Requests (not Selenium)  
**Speed:** Upload in ~3 seconds

#### Features

| Feature | Description |
|---------|-------------|
| **Multi-Account** | Handle multiple TikTok accounts |
| **Scheduling** | Up to 10 days in advance |
| **YouTube Sourcing** | Upload directly from YouTube Shorts |
| **Fast** | Requests-based, not browser automation |

#### Usage

```bash
# Login (saves cookies)
python cli.py login -n my_account

# Upload from file
python cli.py upload --user my_account -v "video.mp4" -t "My title"

# Upload from YouTube
python cli.py upload --user my_account -yt "https://youtube.com/shorts/xxx" -t "Title"
```

### 5.3 Viral Factory

**Repository:** `vendor/viralfactory`  
**UI:** Gradio  
**License:** AGPL-3.0

Viral Factory is a **modular content automation platform** with custom pipelines.

#### Capabilities

| Capability | Description |
|------------|-------------|
| **Script Writing** | LLM-powered scripts |
| **TTS** | Coqui TTS integration |
| **Asset Retrieval** | Video/audio backgrounds |
| **Upload** | TikTok and YouTube |

---

## 6. Additional Video Generators

### 6.1 Crank

**Repository:** `vendor/Crank`

Crank generates **complete YouTube Shorts** from a topic, including video and metadata.

#### Pipeline

1. Gemini API → Generate transcript, title, description
2. spaCy → NLP processing
3. YouTube scraping → Background video
4. Whisper → Transcription for captions
5. FFmpeg → Final rendering

#### Configuration

```yaml
# config/preset.yml
NAME: "MyChannel"
PROMPT: "coding tips for beginners"
UPLOAD: true
DELAY: 2.5  # Hours before upload
WHISPER_MODEL: "small"
FONT: "Comic Sans MS"
```

### 6.2 Cassette

**Repository:** `vendor/Cassette`

Cassette creates **30-second explanatory videos** using UnrealSpeech API and FFmpeg.

#### Features

- Background music options
- Voice selection
- Background gameplay choices
- Character image overlays
- Custom fonts and colors
- Sentence or word-level timestamps

### 6.3 VideoGraphAI

**Repository:** `vendor/VideoGraphAI`  
**UI:** Streamlit

VideoGraphAI uses **graph-based agents** for YouTube Shorts automation.

#### Workflow

1. **Research** → Tavily Search API
2. **Content** → Groq/OpenAI for scripts
3. **Visuals** → TogetherAI (FLUX.schnell)
4. **Audio** → F5-TTS voiceovers
5. **Subtitles** → Gentle for synchronization

### 6.4 Open Brain Rot

**Repository:** `vendor/OBrainRot`

Open Brain Rot generates **brain rot videos from Reddit URLs** with sentiment analysis and forced alignment.

#### Technical Approach

1. **Reddit Scraping** → API-based content extraction
2. **Sentiment Analysis** → VADER + Llama 3.3 70B for thread selection
3. **TTS** → Coqui xTTSv2 (lightweight, portable)
4. **Forced Alignment** → wav2vec2 for subtitle timing
5. **Image Overlay** → Sentence-aligned character switching

---

## 7. Integration Strategy for content-machine

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Langfuse   │  │  Promptfoo   │  │OpenTelemetry │           │
│  │   Tracing    │  │    Evals     │  │   Metrics    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         JOB QUEUE                                │
│                        ┌─────────┐                               │
│                        │ BullMQ  │                               │
│                        │ (Redis) │                               │
│                        └────┬────┘                               │
│            ┌────────────────┼────────────────┐                   │
│            ▼                ▼                ▼                   │
│      ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│      │ Research │    │  Render  │    │ Publish  │               │
│      │  Queue   │    │  Queue   │    │  Queue   │               │
│      └──────────┘    └──────────┘    └──────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MCP SERVERS                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Postgres MCP │  │  Qdrant MCP  │  │ Plainly MCP  │           │
│  │   (Data)     │  │  (Memory)    │  │  (Render)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Priorities

| Priority | Component | Rationale |
|----------|-----------|-----------|
| **P0** | BullMQ | Pipeline orchestration foundation |
| **P0** | Langfuse | LLM observability from day 1 |
| **P1** | Promptfoo | Script quality validation |
| **P1** | GPT Researcher | Automated trend research |
| **P2** | Qdrant MCP | Semantic memory for scripts |
| **P2** | Postgres MCP | Database management |
| **P3** | Plainly MCP | Alternative rendering option |

### Configuration Template

```typescript
// src/config/infrastructure.ts
import { Queue, Worker } from 'bullmq';
import { Langfuse } from 'langfuse';

export const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
});

export const queues = {
  research: new Queue('research', { connection: redis }),
  script: new Queue('script', { connection: redis }),
  audio: new Queue('audio', { connection: redis }),
  assets: new Queue('assets', { connection: redis }),
  render: new Queue('render', { connection: redis }),
  publish: new Queue('publish', { connection: redis }),
};
```

---

## 8. Key Patterns Extracted

### Pattern 1: LLM Tracing with Langfuse

```python
from langfuse.decorators import observe

@observe(name="generate-script")
def generate_script(topic: str, style: str) -> str:
    # Automatically traced with inputs, outputs, latency, cost
    return llm.generate(prompt=f"Generate {style} script about {topic}")

@observe(name="video-pipeline")
def pipeline(topic: str):
    script = generate_script(topic, "viral")
    audio = generate_audio(script)
    video = render_video(script, audio)
    return video
```

### Pattern 2: BullMQ Flow for Pipelines

```typescript
const flow = new FlowProducer({ connection: redis });

await flow.add({
  name: 'publish',
  queueName: 'publish',
  data: { videoId },
  children: [
    {
      name: 'render',
      queueName: 'render',
      children: [
        { name: 'tts', queueName: 'audio', data: { script } },
        { name: 'captions', queueName: 'captions', data: { script } },
        { name: 'assets', queueName: 'assets', data: { keywords } }
      ]
    }
  ]
});
```

### Pattern 3: Promptfoo Eval Integration

```yaml
# promptfoo.yaml for script generation
prompts:
  - file://prompts/script-v1.txt
  - file://prompts/script-v2.txt

providers:
  - openai:gpt-4o
  - anthropic:claude-sonnet-4-20250514

tests:
  - vars: { topic: "React hooks" }
    assert:
      - type: llm-rubric
        value: "Hook grabs attention in first 2 seconds"
      - type: javascript
        value: output.length < 500  # Under 60 seconds
```

### Pattern 4: MCP Server Composition

```json
{
  "mcpServers": {
    "postgres": {
      "command": "uvx",
      "args": ["postgres-mcp"],
      "env": { "DATABASE_URI": "postgresql://..." }
    },
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": { 
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "video-memory"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

---

## 9. Recommendations

### Immediate Implementation (Week 1-2)

1. **Setup BullMQ** with Redis for job queue
2. **Integrate Langfuse** for LLM tracing
3. **Configure Promptfoo** for script evaluation

### Near-Term (Week 3-4)

1. **Deploy GPT Researcher** for trend research
2. **Setup Qdrant MCP** for script memory
3. **Create Promptfoo test suite** for all LLM prompts

### Medium-Term (Month 2)

1. **Integrate Postgres MCP Pro** for database management
2. **Evaluate Open Deep Research** for deeper trend analysis
3. **Setup TikTok Auto Uploader** for publishing

### Cost Considerations

| Tool | Cost | Notes |
|------|------|-------|
| Langfuse Cloud | Free tier available | Self-host for unlimited |
| Promptfoo | Free (local) | No API costs |
| GPT Researcher | ~$0.40/deep research | Can use local models |
| BullMQ | Free | Redis hosting costs |
| Qdrant | Free (self-hosted) | Cloud has free tier |

---

## 10. References

| Tool | Documentation | Key Resource |
|------|---------------|--------------|
| Langfuse | https://langfuse.com/docs | Tracing guide |
| Promptfoo | https://promptfoo.dev/docs | Red teaming guide |
| GPT Researcher | https://docs.gptr.dev | MCP integration |
| Open Deep Research | https://blog.langchain.com/open-deep-research/ | Launch blog |
| BullMQ | https://docs.bullmq.io | Flows documentation |
| Postgres MCP | https://github.com/crystaldba/postgres-mcp | Index tuning |
| Qdrant MCP | https://github.com/qdrant/mcp-server-qdrant | Memory patterns |

---

**Document Status:** Complete  
**Next Steps:** Create implementation tasks for P0 components (BullMQ, Langfuse)  
**Related Docs:** 
- [agent-frameworks-orchestration-DEEP-20260102.md](agent-frameworks-orchestration-DEEP-20260102.md)
- [e2e-video-generation-patterns-DEEP-20260102.md](e2e-video-generation-patterns-DEEP-20260102.md)
