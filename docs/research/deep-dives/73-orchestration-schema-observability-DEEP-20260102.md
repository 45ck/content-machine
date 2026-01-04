# Deep Dive #73: Orchestration, Schema Validation & Observability Stack

**Document ID:** DD-073  
**Date:** 2026-01-02  
**Category:** Orchestration, Schema Validation, Observability  
**Status:** Complete  
**Word Count:** ~8,000

---

## Executive Summary

This document covers three critical infrastructure layers for content-machine:

1. **Orchestration** – Temporal, n8n, Airflow, AI Video Workflow
2. **Schema Validation** – Zod, Pydantic, Instructor, Ajv
3. **Observability** – OpenTelemetry, Sentry, additional tools
4. **Job Queues** – Celery, RQ (Python alternatives to BullMQ)

---

## 1. Orchestration Frameworks

### 1.1 Temporal

**Source:** `vendor/orchestration/temporal/`  
**Creator:** Temporal Technologies (Uber Cadence creators)  
**License:** MIT  
**Language:** Go (server), SDKs in multiple languages  
**Stars:** 11k+

#### Overview

Temporal is a **durable execution platform** that executes application logic called Workflows in a resilient manner, automatically handling failures and retrying operations.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Durable Execution** | Workflows survive process crashes, restarts |
| **Automatic Retries** | Failed operations retry with backoff |
| **State Management** | Workflow state persisted automatically |
| **Multi-language SDKs** | Go, Java, TypeScript, Python, .NET |
| **Visibility** | Web UI for monitoring workflows |
| **Scalable** | Handles millions of concurrent workflows |

#### Installation

```bash
# Install CLI
brew install temporal

# Start development server
temporal server start-dev

# Access Web UI at http://localhost:8233
```

#### TypeScript SDK Example

```typescript
import { proxyActivities, defineWorkflow } from '@temporalio/workflow';

// Define activities
const { generateScript, generateAudio, renderVideo } = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: { maximumAttempts: 3 },
});

// Define workflow
export const videoGenerationWorkflow = defineWorkflow(
  async (topic: string): Promise<string> => {
    // Step 1: Generate script
    const script = await generateScript(topic);
    
    // Step 2: Generate audio
    const audioPath = await generateAudio(script);
    
    // Step 3: Render video
    const videoPath = await renderVideo({
      script,
      audioPath,
    });
    
    return videoPath;
  }
);
```

#### When to Use Temporal

| Use Case | Fit |
|----------|-----|
| Long-running workflows (hours/days) | ✅ Excellent |
| Complex multi-step orchestration | ✅ Excellent |
| Need durability guarantees | ✅ Excellent |
| Simple job queues | ❌ Overkill |
| Prototype/MVP | ❌ Complex setup |

---

### 1.2 n8n

**Source:** `vendor/orchestration/n8n/`  
**License:** Fair-code (Sustainable Use License)  
**Language:** TypeScript  
**Stars:** 45k+

#### Overview

n8n is a **workflow automation platform** with 400+ integrations and native AI capabilities. It combines the flexibility of code with the speed of no-code.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Visual Editor** | Drag-and-drop workflow builder |
| **400+ Integrations** | Pre-built connectors |
| **Code When Needed** | JavaScript/Python support |
| **AI-Native** | LangChain integration built-in |
| **Self-Hostable** | Full control over data |
| **Enterprise Ready** | SSO, permissions, air-gapped |

#### Installation

```bash
# Quick start with npx
npx n8n

# Docker
docker volume create n8n_data
docker run -it --rm --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

#### AI/LangChain Integration

n8n has built-in nodes for:
- Chat models (OpenAI, Anthropic, Ollama)
- Vector stores (Qdrant, Pinecone, Weaviate)
- Agents and chains
- Document loaders
- Text splitters

#### When to Use n8n

| Use Case | Fit |
|----------|-----|
| Quick prototyping | ✅ Excellent |
| Integration-heavy workflows | ✅ Excellent |
| Non-developer operators | ✅ Excellent |
| Complex custom logic | ⚠️ Moderate |
| High-throughput jobs | ❌ Not ideal |

---

### 1.3 Apache Airflow

**Source:** `vendor/orchestration/airflow/`  
**Creator:** Apache Foundation (originated at Airbnb)  
**License:** Apache 2.0  
**Language:** Python  
**Stars:** 35k+

#### Overview

Airflow is a platform to programmatically author, schedule, and monitor workflows (DAGs). It's the industry standard for data pipeline orchestration.

#### Key Features

| Feature | Description |
|---------|-------------|
| **DAGs as Code** | Workflows defined in Python |
| **Rich Scheduler** | Cron-like scheduling |
| **Extensible** | Custom operators, hooks, sensors |
| **Web UI** | Monitoring, logs, DAG visualization |
| **Scalable** | Kubernetes, Celery executors |
| **XCom** | Task-to-task data passing |

#### Installation

```bash
# pip install
pip install apache-airflow

# Docker Compose
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/stable/docker-compose.yaml'
docker compose up -d
```

#### DAG Example

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def generate_script(**context):
    topic = context['params']['topic']
    return f"Script about {topic}"

def generate_audio(**context):
    script = context['ti'].xcom_pull(task_ids='generate_script')
    return f"audio_{script}.mp3"

with DAG(
    'video_generation',
    start_date=datetime(2026, 1, 1),
    schedule_interval='@daily',
    catchup=False,
) as dag:
    
    script_task = PythonOperator(
        task_id='generate_script',
        python_callable=generate_script,
        params={'topic': 'AI coding'},
    )
    
    audio_task = PythonOperator(
        task_id='generate_audio',
        python_callable=generate_audio,
    )
    
    script_task >> audio_task
```

#### When to Use Airflow

| Use Case | Fit |
|----------|-----|
| Scheduled batch jobs | ✅ Excellent |
| Data pipelines | ✅ Excellent |
| Python ecosystem | ✅ Excellent |
| Real-time processing | ❌ Not designed for |
| Simple single jobs | ❌ Overkill |

---

### 1.4 AI Video Workflow

**Source:** `vendor/orchestration/ai-video-workflow/`  
**Creator:** toki-plus  
**License:** MIT  
**Language:** Python (GUI)  
**Interface:** Desktop application

#### Overview

A desktop GUI application for AI video generation with automated pipeline:

1. **Text-to-Image** via LibLibAI
2. **Image-to-Video** via Jimeng (Volcano Engine)
3. **Text-to-Music** via Jimeng
4. **Auto-composition** via FFmpeg

#### Key Features

| Feature | Description |
|---------|-------------|
| **All-in-One GUI** | 3-step workflow interface |
| **AI Prompt Generator** | Doubao model for inspiration |
| **Preset Themes** | Beauty, Labubu, candy, magic |
| **Real-time Preview** | In-app media playback |
| **History Navigation** | Browse generated content |

#### Pattern: Chinese AI Services

This repo uses Chinese AI platforms:
- **LibLibAI** – Text-to-image with LoRA/Checkpoint
- **Jimeng/即梦** (Volcano Engine) – Video/music generation
- **Doubao/豆包** – Prompt generation

Relevant for international TTS/generation alternatives study.

---

### 1.5 Orchestration Comparison

| Feature | Temporal | n8n | Airflow |
|---------|----------|-----|---------|
| **Paradigm** | Durable execution | Visual workflow | DAG scheduling |
| **Language** | Multi-SDK | TypeScript | Python |
| **Best For** | Long-running | Integrations | Batch jobs |
| **Learning Curve** | Steep | Low | Moderate |
| **Self-host** | Yes | Yes | Yes |
| **License** | MIT | Fair-code | Apache 2.0 |

#### Recommendation for content-machine

| Layer | Tool | Rationale |
|-------|------|-----------|
| **Job Queue** | BullMQ | Simple, TypeScript-native, Redis |
| **Visual Workflows** | n8n | Quick prototyping, AI support |
| **Long-running** | Temporal | Future scale, durability |

---

## 2. Schema Validation

### 2.1 Zod

**Source:** `vendor/schema/zod/`  
**Creator:** Colin McDonnell  
**License:** MIT  
**Language:** TypeScript  
**Stars:** 35k+

#### Overview

Zod is a TypeScript-first schema validation library with static type inference. It's the standard for type-safe validation in TypeScript projects.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Zero Dependencies** | Lightweight (2kb gzipped) |
| **Type Inference** | Automatic TypeScript types |
| **Composable** | Build complex schemas from simple ones |
| **JSON Schema** | Convert to/from JSON Schema |
| **Async Validation** | Refinements and transforms |
| **Error Handling** | Detailed error messages |

#### Basic Usage

```typescript
import { z } from 'zod';

// Define schema
const VideoConfig = z.object({
  topic: z.string().min(1).max(100),
  duration: z.number().min(15).max(180),
  style: z.enum(['educational', 'entertainment', 'promotional']),
  voice: z.object({
    language: z.string().default('en-US'),
    speed: z.number().min(0.5).max(2).default(1),
  }).optional(),
});

// Infer TypeScript type
type VideoConfig = z.infer<typeof VideoConfig>;

// Parse and validate
const config = VideoConfig.parse({
  topic: 'AI coding assistants',
  duration: 60,
  style: 'educational',
});
```

#### OpenAI Structured Outputs

```typescript
import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';

const openai = new OpenAI();

const ScriptSchema = z.object({
  hook: z.string().describe('Opening hook (5-10 seconds)'),
  body: z.array(z.object({
    point: z.string(),
    duration: z.number(),
  })),
  cta: z.string().describe('Call to action'),
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Generate a video script about AI' }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'script',
      schema: zodToJsonSchema(ScriptSchema),
    },
  },
});
```

---

### 2.2 Pydantic

**Source:** `vendor/schema/pydantic/`  
**Creator:** Pydantic team  
**License:** MIT  
**Language:** Python  
**Stars:** 20k+

#### Overview

Pydantic is the standard for data validation in Python using type hints. It's fast, extensible, and integrates with most Python frameworks.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Type Hints** | Standard Python annotations |
| **Fast** | Rust-powered core (pydantic-core) |
| **IDE Support** | Autocomplete, type checking |
| **JSON Schema** | Auto-generate from models |
| **Validation** | Automatic coercion and errors |
| **Serialization** | JSON, dict, and more |

#### Basic Usage

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class VideoConfig(BaseModel):
    topic: str
    duration: int
    style: str = 'educational'
    created_at: Optional[datetime] = None

# Automatic validation and coercion
config = VideoConfig(
    topic='AI coding',
    duration='60',  # String coerced to int
)

# JSON serialization
print(config.model_dump_json())
```

#### LLM Integration

Pydantic is foundational for:
- **LangChain** output parsers
- **Instructor** structured extraction
- **PydanticAI** agent framework
- **OpenAI function calling**

---

### 2.3 Instructor

**Source:** `vendor/schema/instructor/`  
**Creator:** Jason Liu (jxnlco)  
**License:** MIT  
**Language:** Python  
**Stars:** 8k+

#### Overview

Instructor provides structured outputs from any LLM with automatic retries and validation. Built on Pydantic for type safety.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Provider** | OpenAI, Anthropic, Google, Ollama |
| **Auto Retry** | Validation errors trigger retry |
| **Type Safe** | Pydantic model outputs |
| **Simple API** | One-line extraction |
| **Streaming** | Partial object streaming |
| **Async** | Full async support |

#### Usage

```python
import instructor
from pydantic import BaseModel

class VideoScript(BaseModel):
    hook: str
    body: list[str]
    cta: str

# Works with any provider
client = instructor.from_provider('openai/gpt-4o')

script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[
        {'role': 'user', 'content': 'Create a script about AI tools'}
    ],
)

print(script.hook)
```

#### Multi-Provider Support

```python
# OpenAI
client = instructor.from_provider('openai/gpt-4o')

# Anthropic
client = instructor.from_provider('anthropic/claude-3-5-sonnet')

# Google
client = instructor.from_provider('google/gemini-pro')

# Ollama (local)
client = instructor.from_provider('ollama/llama3.2')

# Groq
client = instructor.from_provider('groq/llama-3.1-8b-instant')
```

---

### 2.4 Ajv

**Source:** `vendor/schema/ajv/`  
**Creator:** Community  
**License:** MIT  
**Language:** JavaScript  
**Stars:** 14k+

#### Overview

Ajv (Another JSON Schema Validator) is the fastest JSON Schema validator for JavaScript. Supports all JSON Schema drafts.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Fastest** | 50% faster than competitors |
| **Standards** | All JSON Schema drafts |
| **JTD** | JSON Type Definition support |
| **Code Generation** | Compile schemas to functions |
| **Extensible** | Custom keywords, formats |

#### Usage

```javascript
import Ajv from 'ajv';

const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    topic: { type: 'string', minLength: 1 },
    duration: { type: 'number', minimum: 15, maximum: 180 },
  },
  required: ['topic', 'duration'],
};

const validate = ajv.compile(schema);

const valid = validate({ topic: 'AI', duration: 60 });
if (!valid) console.log(validate.errors);
```

---

### 2.5 Schema Validation Comparison

| Feature | Zod | Pydantic | Instructor | Ajv |
|---------|-----|----------|------------|-----|
| **Language** | TypeScript | Python | Python | JavaScript |
| **Type Inference** | ✅ | ✅ | ✅ | ❌ |
| **JSON Schema** | ✅ | ✅ | ✅ | ✅ Native |
| **LLM Integration** | Via libs | Native | ✅ Native | ❌ |
| **Best For** | TS APIs | Python APIs | LLM extraction | JSON validation |

#### Recommendation for content-machine

| Language | Tool | Use Case |
|----------|------|----------|
| **TypeScript** | Zod | API schemas, config validation |
| **Python** | Pydantic + Instructor | LLM outputs, data models |
| **Shared** | JSON Schema | Cross-language contracts |

---

## 3. Observability Stack

### 3.1 OpenTelemetry

**Source:** `vendor/observability/opentelemetry-js/`  
**Creator:** CNCF  
**License:** Apache 2.0  
**Language:** Multi-language  
**Status:** Beta (JS), Stable (Core spec)

#### Overview

OpenTelemetry is the industry standard for collecting telemetry data (traces, metrics, logs) from applications.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Vendor Neutral** | Export to any backend |
| **Auto-instrumentation** | Automatic library tracing |
| **Context Propagation** | Distributed tracing |
| **Metrics** | Counters, histograms, gauges |
| **Logs** | Structured logging |
| **Semantic Conventions** | Standard attribute names |

#### Installation

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

#### Setup

```javascript
const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new opentelemetry.NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'content-machine',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

#### Export to Backends

```javascript
// Jaeger
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

// OTLP (Grafana, Honeycomb, etc.)
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Langfuse (via OTLP)
const exporter = new OTLPTraceExporter({
  url: 'https://cloud.langfuse.com/api/public/otel',
  headers: { Authorization: 'Bearer YOUR_KEY' },
});
```

---

### 3.2 Sentry

**Source:** `vendor/observability/sentry/`  
**Creator:** Sentry  
**License:** FSL/BSL  
**Language:** Multi-language SDKs

#### Overview

Sentry is a debugging platform for error tracking, performance monitoring, and session replay.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Error Tracking** | Automatic exception capture |
| **Performance** | Transaction and span tracing |
| **Session Replay** | Visual reproduction of bugs |
| **Issue Grouping** | Smart duplicate detection |
| **Alerting** | Configurable notifications |
| **Releases** | Deploy tracking, suspect commits |

#### Installation

```bash
npm install @sentry/node
```

#### Setup

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'https://YOUR_DSN@sentry.io/PROJECT',
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// Automatic error capture
try {
  throw new Error('Something went wrong');
} catch (error) {
  Sentry.captureException(error);
}

// Manual breadcrumbs
Sentry.addBreadcrumb({
  category: 'video',
  message: 'Started rendering video',
  level: 'info',
});
```

---

### 3.3 Combined Observability Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Observability Stack                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPLICATION LAYER                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OpenTelemetry SDK                                        │  │
│  │  - Auto-instrumentation (HTTP, DB, LLM)                   │  │
│  │  - Custom spans for video pipeline                        │  │
│  │  - Metrics collection                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  COLLECTION LAYER                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OpenTelemetry Collector                                  │  │
│  │  - Receives OTLP data                                     │  │
│  │  - Routes to multiple backends                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         ▼                 ▼                 ▼                   │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │  Langfuse │     │  Sentry   │     │  Grafana  │             │
│  │  (LLM)    │     │  (Errors) │     │  (Metrics)│             │
│  └───────────┘     └───────────┘     └───────────┘             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Job Queues (Python)

### 4.1 Celery

**Source:** `vendor/job-queue/celery/`  
**License:** BSD  
**Language:** Python  
**Version:** 5.6.1  
**Stars:** 24k+

#### Overview

Celery is the industry-standard distributed task queue for Python, supporting RabbitMQ and Redis backends.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Distributed** | Scale across machines |
| **Brokers** | RabbitMQ, Redis, SQS |
| **Scheduling** | Celery Beat for cron jobs |
| **Workflows** | Chains, groups, chords |
| **Result Backend** | Store task results |
| **Monitoring** | Flower web UI |

#### Setup

```python
# celery_app.py
from celery import Celery

app = Celery(
    'content_machine',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
)

@app.task
def generate_video(topic: str) -> str:
    # Long-running video generation
    return f'/videos/{topic}.mp4'
```

#### Workflows

```python
from celery import chain, group, chord

# Sequential chain
workflow = chain(
    generate_script.s('AI'),
    generate_audio.s(),
    render_video.s(),
)
result = workflow.apply_async()

# Parallel group
group_result = group(
    generate_audio.s(script),
    generate_captions.s(script),
).apply_async()

# Chord (parallel then aggregate)
chord_result = chord(
    [generate_audio.s(script), generate_captions.s(script)],
    combine_assets.s(),
).apply_async()
```

---

### 4.2 RQ (Redis Queue)

**Source:** `vendor/job-queue/rq/`  
**License:** BSD  
**Language:** Python  
**Stars:** 10k+

#### Overview

RQ is a simple Python library for queueing jobs, designed for simplicity over features.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Simple** | Low barrier to entry |
| **Redis-based** | Reliable, persistent |
| **Priority Queues** | Multiple queue support |
| **Scheduling** | Delayed job execution |
| **Retries** | Configurable retry policies |
| **Dashboard** | rq-dashboard for monitoring |

#### Usage

```python
from redis import Redis
from rq import Queue

queue = Queue(connection=Redis())

# Enqueue a job
job = queue.enqueue(generate_video, 'AI coding')

# Priority queues
high_queue = Queue('high', connection=Redis())
low_queue = Queue('low', connection=Redis())

# Workers process high priority first
# rq worker high low

# Scheduling
from datetime import timedelta
job = queue.enqueue_in(timedelta(minutes=10), process_later)
```

---

### 4.3 Job Queue Comparison

| Feature | BullMQ | Celery | RQ |
|---------|--------|--------|-----|
| **Language** | TypeScript | Python | Python |
| **Backend** | Redis | Redis/RabbitMQ | Redis |
| **Complexity** | Moderate | High | Low |
| **Workflows** | FlowProducer | Chains/Chords | Basic |
| **Best For** | Node.js apps | Python at scale | Simple Python |

---

## 5. MinIO Object Storage

**Source:** `vendor/storage/minio/`  
**License:** AGPL v3 (community)  
**Language:** Go  
**Note:** Maintenance mode for community edition

### Overview

MinIO is an S3-compatible object storage designed for AI/ML workloads.

### Key Features

| Feature | Description |
|---------|-------------|
| **S3 Compatible** | Drop-in replacement |
| **High Performance** | Optimized for large files |
| **Self-hosted** | Full control |
| **Kubernetes** | Native Helm charts |

### Usage

```bash
# Install from source
go install github.com/minio/minio@latest

# Start server
minio server /data

# Access at http://localhost:9000
```

### For content-machine

Ideal for:
- Video file storage
- Rendered asset cache
- Backup/archive

---

## 6. Integration Architecture

### 6.1 Complete Stack

```
┌────────────────────────────────────────────────────────────────┐
│                   content-machine Stack                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VALIDATION LAYER                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Zod (TypeScript) + Pydantic (Python)                     │  │
│  │  - API request/response validation                        │  │
│  │  - LLM structured outputs                                 │  │
│  │  - Configuration schemas                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  JOB QUEUE LAYER                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BullMQ (Node.js)                                         │  │
│  │  - trend → script → audio → captions → render → publish   │  │
│  │  - FlowProducer for dependencies                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ORCHESTRATION LAYER (Future)                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  n8n (Visual) | Temporal (Durable)                        │  │
│  │  - Complex workflows                                      │  │
│  │  - Long-running processes                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  OBSERVABILITY LAYER                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OpenTelemetry → Langfuse (LLM) + Sentry (Errors)         │  │
│  │  Promptfoo (Evals) | Grafana (Metrics)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  STORAGE LAYER                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Qdrant (Vectors) + Redis (Cache) + MinIO (Objects)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Document Metadata

| Field | Value |
|-------|-------|
| **Document ID** | DD-073 |
| **Created** | 2026-01-02 |
| **Author** | Research Agent |
| **Status** | Complete |
| **Dependencies** | DD-071, DD-072 |

---

## 8. Key Takeaways

1. **BullMQ** is ideal for TypeScript job queues (use FlowProducer)
2. **n8n** provides quick visual prototyping with AI support
3. **Temporal** is future-proof for durable, long-running workflows
4. **Zod** is the standard for TypeScript schema validation
5. **Instructor** makes LLM extraction trivial with Pydantic
6. **OpenTelemetry** provides vendor-neutral observability
7. **Langfuse + Sentry** cover LLM and error monitoring
8. **MinIO** (or S3) handles video object storage

---

## 9. Quick Reference

### Zod Schema

```typescript
const Config = z.object({
  topic: z.string(),
  duration: z.number().min(15).max(180),
});
```

### Instructor Extraction

```python
client = instructor.from_provider('openai/gpt-4o')
result = client.chat.completions.create(
    response_model=MyModel,
    messages=[{'role': 'user', 'content': '...'}],
)
```

### BullMQ Flow

```typescript
await flow.add({
  name: 'video',
  queueName: 'render',
  children: [
    { name: 'audio', queueName: 'audio' },
    { name: 'captions', queueName: 'captions' },
  ],
});
```

### OpenTelemetry

```javascript
const sdk = new opentelemetry.NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```
