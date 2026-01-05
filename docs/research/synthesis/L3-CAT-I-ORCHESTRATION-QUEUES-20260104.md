# Layer 3 Category I: Orchestration & Job Queues

**Date:** 2026-01-04  
**Synthesized From:** 6 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 3 - AI & Orchestration

---

## Category Summary

Orchestration systems coordinate multi-step video generation workflows. Key requirements: **async execution**, **retry handling**, **state management**, and **scaling**.

---

## Tool Comparison

| Tool         | Type     | Language   | Complexity | Best For       |
| ------------ | -------- | ---------- | ---------- | -------------- |
| **BullMQ**   | Queue    | TypeScript | Low        | Simple jobs    |
| **RQ**       | Queue    | Python     | Low        | Python jobs    |
| **Temporal** | Workflow | Multi      | High       | Complex flows  |
| **n8n**      | Visual   | TypeScript | Low        | No-code        |
| **Airflow**  | DAG      | Python     | Medium     | Data pipelines |

---

## Primary (TypeScript): BullMQ

### Why BullMQ

1. **Redis-based** - Fast, reliable
2. **TypeScript native** - Type safety
3. **Job priority** - Urgent first
4. **Retry logic** - Automatic handling
5. **Dashboard** - Bull Board UI

### Installation

```bash
npm install bullmq ioredis
```

### Basic Queue

```typescript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis();

// Create queue
const videoQueue = new Queue('video-generation', { connection });

// Add job
await videoQueue.add(
  'render',
  {
    scenes: [{ text: 'Hello world', searchTerms: ['technology'] }],
    config: { music: 'chill', voice: 'af_heart' },
  },
  {
    priority: 1, // Lower = higher priority
    attempts: 3, // Retry count
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  }
);

// Process jobs
const worker = new Worker(
  'video-generation',
  async (job) => {
    console.log(`Processing ${job.id}: ${job.name}`);

    // Update progress
    await job.updateProgress(10);

    // Do work
    const videoPath = await renderVideo(job.data);

    await job.updateProgress(100);
    return { videoPath };
  },
  { connection }
);

// Handle completion
worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed: ${result.videoPath}`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
});
```

### Job Flow (Multi-Step)

```typescript
import { FlowProducer } from 'bullmq';

const flowProducer = new FlowProducer({ connection });

// Define multi-step workflow
await flowProducer.add({
  name: 'publish',
  queueName: 'publish',
  data: { platforms: ['tiktok', 'youtube'] },
  children: [
    {
      name: 'render',
      queueName: 'render',
      data: { config: videoConfig },
      children: [
        {
          name: 'audio',
          queueName: 'audio',
          data: { scenes: scenes },
          children: [
            {
              name: 'script',
              queueName: 'script',
              data: { topic: 'AI trends' },
            },
          ],
        },
      ],
    },
  ],
});

// Jobs execute in dependency order:
// script → audio → render → publish
```

### Bull Board Dashboard

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(scriptQueue),
    new BullMQAdapter(audioQueue),
    new BullMQAdapter(renderQueue),
    new BullMQAdapter(publishQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

---

## Primary (Python): RQ (Redis Queue)

### Why RQ

1. **Simple** - Minimal API
2. **Python native** - Easy integration
3. **Worker model** - Scale horizontally
4. **Dashboard** - rq-dashboard

### Installation

```bash
pip install rq rq-dashboard
```

### Basic Queue

```python
from redis import Redis
from rq import Queue, Worker

redis_conn = Redis()
q = Queue(connection=redis_conn)

# Define job function
def render_video(scenes: list, config: dict) -> str:
    # Do work
    return video_path

# Enqueue job
job = q.enqueue(render_video, scenes, config,
    job_timeout=600,  # 10 minutes
    result_ttl=86400  # Keep result 24 hours
)

# Check status
print(job.get_status())  # queued, started, finished, failed

# Get result
if job.is_finished:
    print(job.result)
```

### Worker

```bash
# Start worker
rq worker --with-scheduler

# Or in Python
Worker(['default'], connection=redis_conn).work()
```

### Job Dependencies

```python
from rq import Queue

# Create dependent jobs
script_job = q.enqueue(generate_script, topic)
audio_job = q.enqueue(generate_audio, depends_on=script_job)
render_job = q.enqueue(render_video, depends_on=audio_job)
```

---

## Complex Workflows: Temporal

### When to Use Temporal

- Long-running workflows (hours/days)
- Human-in-the-loop approvals
- Complex retry/compensation logic
- Cross-service orchestration

### Workflow Definition

```python
from temporalio import workflow, activity
from datetime import timedelta

@activity.defn
async def generate_script(topic: str) -> str:
    return await script_service.generate(topic)

@activity.defn
async def generate_audio(script: str) -> str:
    return await tts_service.generate(script)

@activity.defn
async def render_video(audio_path: str) -> str:
    return await render_service.render(audio_path)

@workflow.defn
class VideoProductionWorkflow:
    @workflow.run
    async def run(self, topic: str) -> str:
        # Step 1: Script
        script = await workflow.execute_activity(
            generate_script,
            topic,
            start_to_close_timeout=timedelta(minutes=5)
        )

        # Step 2: Audio
        audio = await workflow.execute_activity(
            generate_audio,
            script,
            start_to_close_timeout=timedelta(minutes=10)
        )

        # Step 3: Render
        video = await workflow.execute_activity(
            render_video,
            audio,
            start_to_close_timeout=timedelta(minutes=30)
        )

        return video
```

### Human-in-the-Loop

```python
@workflow.defn
class ReviewableVideoWorkflow:
    def __init__(self):
        self.approved = False

    @workflow.signal
    async def approve(self):
        self.approved = True

    @workflow.signal
    async def reject(self, feedback: str):
        self.rejection_feedback = feedback

    @workflow.run
    async def run(self, topic: str) -> str:
        # Generate video
        video = await self.generate_video(topic)

        # Wait for human approval
        await workflow.wait_condition(lambda: self.approved)

        # Publish after approval
        return await self.publish(video)
```

---

## Visual Workflows: n8n

### Low-Code Automation

```json
{
  "nodes": [
    {
      "name": "Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": { "path": "/new-video" }
    },
    {
      "name": "Generate Script",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://script-service/generate",
        "method": "POST"
      }
    },
    {
      "name": "Generate Audio",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://tts-service/generate",
        "method": "POST"
      }
    },
    {
      "name": "Render Video",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://render-service/render",
        "method": "POST"
      }
    }
  ],
  "connections": {
    "Trigger": { "main": [["Generate Script"]] },
    "Generate Script": { "main": [["Generate Audio"]] },
    "Generate Audio": { "main": [["Render Video"]] }
  }
}
```

### AutoTube Example

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Webhook │────▶│ Ollama  │────▶│ OpenTTS │────▶│ Python  │
│ Trigger │     │ Script  │     │  Audio  │     │ Render  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                      │
                                                      ▼
                                               ┌─────────┐
                                               │ YouTube │
                                               │ Upload  │
                                               └─────────┘
```

---

## Patterns for Video Generation

### Pattern 1: Simple Queue

```typescript
// Single queue, process sequentially
await videoQueue.add('full-pipeline', {
  topic: 'AI trends',
  config: videoConfig,
});

worker.process(async (job) => {
  const script = await generateScript(job.data.topic);
  const audio = await generateAudio(script);
  const video = await renderVideo(audio, job.data.config);
  return video;
});
```

### Pattern 2: Parallel Stages

```typescript
// Parallel asset preparation
const [audio, backgrounds] = await Promise.all([
  audioQueue.add('tts', { script }),
  assetQueue.add('fetch-backgrounds', { searchTerms }),
]);

// Wait for both
await Promise.all([audio.finished(), backgrounds.finished()]);

// Then render
await renderQueue.add('render', { audioPath, backgroundPaths });
```

### Pattern 3: Event-Driven

```typescript
// Pub/sub between services
audioWorker.on('completed', async (job, result) => {
  // Automatically trigger next step
  await renderQueue.add('render', {
    audioPath: result.audioPath,
  });
});

renderWorker.on('completed', async (job, result) => {
  // Notify completion
  await notifyService.send({
    event: 'video-ready',
    videoPath: result.videoPath,
  });
});
```

---

## Scaling Patterns

### Horizontal Scaling

```typescript
// Multiple workers per queue
const numWorkers = os.cpus().length;

for (let i = 0; i < numWorkers; i++) {
  new Worker('render', renderJob, { connection });
}
```

### Queue Prioritization

```typescript
// High priority for premium users
await videoQueue.add('render', data, {
  priority: isPremium ? 1 : 10,
});
```

### Rate Limiting

```typescript
// Limit concurrent jobs
const worker = new Worker('render', renderJob, {
  connection,
  concurrency: 2, // Max 2 concurrent
  limiter: {
    max: 10, // Max 10 per
    duration: 60000, // minute
  },
});
```

---

## Integration Pattern for content-machine

### Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BullMQ Queues                          │
├─────────────┬─────────────┬─────────────┬─────────────────-─┤
│   script    │    audio    │   render    │     publish       │
│   queue     │    queue    │   queue     │      queue        │
└──────┬──────┴──────┬──────┴──────┬──────┴───────┬───────────┘
       │             │             │              │
       ▼             ▼             ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  Script    │ │   Audio    │ │   Render   │ │  Publish   │
│  Workers   │ │  Workers   │ │  Workers   │ │  Workers   │
│  (LLM)     │ │  (TTS)     │ │ (Remotion) │ │  (API)     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### Queue Service

```typescript
// queue-service.ts
import { Queue, Worker, FlowProducer } from 'bullmq';

export class VideoQueueService {
  private flow: FlowProducer;

  constructor(redis: IORedis) {
    this.flow = new FlowProducer({ connection: redis });
  }

  async createVideo(topic: string, config: VideoConfig): Promise<string> {
    const job = await this.flow.add({
      name: 'publish',
      queueName: 'publish',
      children: [
        {
          name: 'render',
          queueName: 'render',
          children: [
            {
              name: 'audio',
              queueName: 'audio',
              children: [
                {
                  name: 'script',
                  queueName: 'script',
                  data: { topic, config },
                },
              ],
            },
          ],
        },
      ],
    });

    return job.job.id;
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    // Implementation
  }
}
```

---

## Source Documents

- DD-65: Review + orchestration + infrastructure
- DD-73: Orchestration + schema + observability
- infrastructure-orchestration-DEEP
- infrastructure-schemas-orchestration-DEEP
- orchestration-advanced-generators-DEEP
- storage-queue-infrastructure-DEEP

---

## Key Takeaway

> **BullMQ for TypeScript, RQ for Python simple jobs. Temporal for complex long-running workflows. n8n for visual/low-code automation. Use FlowProducer for multi-step job dependencies.**
