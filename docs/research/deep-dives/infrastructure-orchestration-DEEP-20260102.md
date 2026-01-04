# Deep Dive: Infrastructure & Orchestration Patterns

**Date:** 2026-01-02  
**Repos:** `vendor/job-queue/bullmq/`, `vendor/orchestration/temporal/`, `vendor/orchestration/ai-video-workflow/`  
**Priority:** ⭐ HIGH - Critical for scalable pipeline execution

---

## Executive Summary

Research across job queue and orchestration repos reveals critical infrastructure patterns for building scalable video generation pipelines. Key findings:

1. **BullMQ** - Redis-based job queue for TypeScript (recommended)
2. **Temporal** - Durable execution platform for complex workflows
3. **AI-Video-Workflow** - Complete example of multi-API video pipeline

### Why This Matters

- ✅ **Background processing** - Long-running video generation
- ✅ **Retry handling** - Automatic failure recovery
- ✅ **Scalability** - Horizontal scaling of workers
- ✅ **Observability** - Job status tracking and monitoring

---

## BullMQ (Recommended for MVP)

**Type:** Redis-based distributed queue  
**Language:** TypeScript/Node.js  
**License:** MIT

### Core Concept

BullMQ provides a robust job queue with guaranteed delivery, retries, and rate limiting:

```typescript
import { Queue, Worker } from 'bullmq';

// Create queue
const videoQueue = new Queue('video-generation');

// Add job
await videoQueue.add('render', {
  contentId: 'video-123',
  config: { /* render config */ }
});

// Process jobs
const worker = new Worker('video-generation', async (job) => {
  const { contentId, config } = job.data;
  
  // Long-running video generation
  const result = await generateVideo(contentId, config);
  
  return result;
});
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Priority queues** | Prioritize urgent jobs |
| **Rate limiting** | Control API call rates |
| **Retries** | Configurable retry strategies |
| **Delayed jobs** | Schedule for future execution |
| **Job dependencies** | Parent-child relationships |
| **Sandboxed workers** | Isolated process execution |
| **Repeatable jobs** | Cron-like scheduling |

### Content-Machine Use Cases

```typescript
// src/infrastructure/queues.ts
import { Queue, Worker, QueueEvents } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Define queues for each pipeline stage
export const queues = {
  trends: new Queue('trends', { connection }),
  capture: new Queue('capture', { connection }),
  tts: new Queue('tts', { connection }),
  render: new Queue('render', { connection }),
  publish: new Queue('publish', { connection }),
};

// Trend research worker
const trendsWorker = new Worker('trends', async (job) => {
  const { source, keywords } = job.data;
  
  // Research trends from Reddit/HN/YouTube
  const trends = await researchTrends(source, keywords);
  
  // Queue content planning for each trend
  for (const trend of trends) {
    await queues.capture.add('plan-content', {
      trendId: trend.id,
      topic: trend.topic,
    });
  }
  
  return { trendsFound: trends.length };
}, { connection });

// Render worker with progress tracking
const renderWorker = new Worker('render', async (job) => {
  const { contentId, sceneConfigs } = job.data;
  
  for (let i = 0; i < sceneConfigs.length; i++) {
    await renderScene(sceneConfigs[i]);
    
    // Update progress
    await job.updateProgress((i + 1) / sceneConfigs.length * 100);
  }
  
  const videoPath = await concatenateScenes(contentId);
  return { videoPath };
}, { 
  connection,
  concurrency: 2,  // 2 concurrent renders
  limiter: {
    max: 5,        // Max 5 jobs
    duration: 60000, // Per minute
  },
});
```

### Job Flow Pattern

```typescript
// Parent-child job dependencies
const parentJob = await queues.render.add('full-video', {
  contentId: 'video-123',
}, {
  children: [
    { name: 'render-scene', data: { sceneId: 'scene-1' }, queueName: 'render' },
    { name: 'render-scene', data: { sceneId: 'scene-2' }, queueName: 'render' },
    { name: 'render-scene', data: { sceneId: 'scene-3' }, queueName: 'render' },
  ],
});

// Wait for all children to complete
await parentJob.waitUntilFinished();
```

---

## Temporal (For Complex Workflows)

**Type:** Durable execution platform  
**Language:** Go server, SDKs for TypeScript/Python/Java/Go  
**License:** MIT

### Core Concept

Temporal provides durable execution that survives failures:

```typescript
// Workflow definition
import { defineWorkflow, defineActivity } from '@temporalio/workflow';

const workflow = defineWorkflow('video-generation', async (input: VideoRequest) => {
  // Each step is durable - can resume from failure
  const script = await executeActivity('generateScript', input);
  const audio = await executeActivity('generateTTS', script);
  const video = await executeActivity('renderVideo', { audio, script });
  const published = await executeActivity('publishVideo', video);
  
  return { videoId: published.id };
});
```

### When to Use Temporal vs BullMQ

| Scenario | BullMQ | Temporal |
|----------|--------|----------|
| Simple job queue | ✅ | Overkill |
| Background processing | ✅ | ✅ |
| Long-running (hours) | ⚠️ | ✅ |
| Complex state machine | ⚠️ | ✅ |
| Human-in-the-loop | ❌ | ✅ |
| Multi-service orchestration | ⚠️ | ✅ |
| Infrastructure complexity | Low | High |

### Temporal for Content Pipeline

```typescript
// src/workflows/videoGeneration.ts
import * as workflow from '@temporalio/workflow';
import type * as activities from './activities';

const { 
  researchTrends, 
  generateScript, 
  captureProduct, 
  generateTTS,
  renderVideo,
  submitForReview,
  publishVideo 
} = workflow.proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: { maximumAttempts: 3 },
});

export async function videoGenerationWorkflow(input: VideoRequest): Promise<VideoResult> {
  // Step 1: Research
  const trend = await researchTrends(input.topic);
  
  // Step 2: Plan content
  const script = await generateScript({
    trend,
    productId: input.productId,
    targetLength: 60,
  });
  
  // Step 3: Capture product UI
  const captures = await captureProduct({
    productId: input.productId,
    script,
  });
  
  // Step 4: Generate TTS
  const audio = await generateTTS({
    script,
    voice: input.voice || 'alloy',
  });
  
  // Step 5: Render video
  const video = await renderVideo({
    captures,
    audio,
    template: input.template,
  });
  
  // Step 6: Human review (can pause for days)
  const approved = await workflow.condition(
    () => workflow.getExternalSignalByName('reviewCompleted'),
    { timeout: '7 days' }
  );
  
  if (!approved) {
    throw new Error('Video rejected during review');
  }
  
  // Step 7: Publish
  const result = await publishVideo({
    videoId: video.id,
    platforms: input.platforms,
  });
  
  return result;
}
```

---

## AI-Video-Workflow (Reference Implementation)

**Type:** Complete AI video generation pipeline  
**Language:** Python + PyQt5  
**Pattern:** Multi-API orchestration

### Architecture Pattern

This repo demonstrates orchestrating multiple AI APIs:

```
1. LibLib AI (Text-to-Image)
   ↓
2. Jimeng I2V (Image-to-Video)
   ↓
3. Jimeng Music (Text-to-Music)
   ↓
4. FFmpeg Merge (Video + Audio)
```

### Key Patterns

**API Client with Authentication:**
```python
class VolcengineAuth:
    """HMAC-SHA256 authentication for Volcengine APIs"""
    
    def get_auth_headers(self, method, host, uri, query_params, body):
        # Sign request with HMAC-SHA256
        signature = self._sign_request(method, host, uri, query_params, body)
        return {
            'Authorization': f'HMAC-SHA256 Credential={self.access_key}/..., Signature={signature}',
            'X-Date': timestamp,
            'X-Content-Sha256': body_hash,
        }
```

**Task Polling Pattern:**
```python
def generate_image(self, params, poll_interval=5, timeout=300):
    # Submit task
    task_id = self.client.submit_task(params)
    
    # Poll for completion
    start_time = time.time()
    while time.time() - start_time < timeout:
        result = self.client.query_status(task_id)
        
        if result['status'] == 'done':
            return result['output_url']
        
        if result['status'] in ['failed', 'error']:
            raise RuntimeError(f"Task failed: {result}")
        
        time.sleep(poll_interval)
    
    raise TimeoutError(f"Task did not complete in {timeout}s")
```

**Pipeline Class:**
```python
class AIGenerationPipeline:
    def __init__(self):
        self.liblib_client = None
        self.jimeng_i2v_client = None
        self.jimeng_music_client = None
    
    def run_full_pipeline(self, image_params, video_params, music_params, output_path):
        # Step 1: Generate image
        image_url, image_path = self.generate_image(image_params)
        
        # Step 2: Generate video from image
        video_url, video_path = self.generate_video(image_url, video_params)
        
        # Step 3: Generate music and merge
        final_path = self.generate_music_and_merge(video_path, music_params, output_path)
        
        return final_path
```

---

## TypeScript Implementation

### Job Queue Setup

```typescript
// src/infrastructure/queue.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Queue factory
export function createQueue<T>(name: string) {
  return new Queue<T>(name, { connection: redis });
}

// Worker factory with standard error handling
export function createWorker<T, R>(
  queueName: string,
  processor: (job: Job<T>) => Promise<R>,
  options: WorkerOptions = {}
) {
  const worker = new Worker<T, R>(
    queueName,
    async (job) => {
      try {
        console.log(`[${queueName}] Processing job ${job.id}`);
        const result = await processor(job);
        console.log(`[${queueName}] Completed job ${job.id}`);
        return result;
      } catch (error) {
        console.error(`[${queueName}] Failed job ${job.id}:`, error);
        throw error;
      }
    },
    { connection: redis, ...options }
  );
  
  // Error handling
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with: ${err.message}`);
  });
  
  return worker;
}
```

### Pipeline Orchestrator

```typescript
// src/pipeline/orchestrator.ts
import { createQueue, createWorker } from '../infrastructure/queue';
import type { ContentRequest, ContentResult } from './types';

const queues = {
  content: createQueue<ContentRequest>('content'),
  capture: createQueue<CaptureRequest>('capture'),
  tts: createQueue<TTSRequest>('tts'),
  render: createQueue<RenderRequest>('render'),
  review: createQueue<ReviewRequest>('review'),
  publish: createQueue<PublishRequest>('publish'),
};

export async function startContentPipeline(request: ContentRequest): Promise<string> {
  const job = await queues.content.add('create-video', request, {
    jobId: `content-${Date.now()}`,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
  
  return job.id;
}

// Content worker orchestrates the full pipeline
createWorker<ContentRequest, ContentResult>('content', async (job) => {
  const { contentId, topic, productId } = job.data;
  
  // Step 1: Capture product
  await job.updateProgress(10);
  const captureJob = await queues.capture.add('capture', {
    productId,
    topic,
  });
  const captureResult = await captureJob.waitUntilFinished();
  
  // Step 2: Generate TTS
  await job.updateProgress(30);
  const ttsJob = await queues.tts.add('generate', {
    script: captureResult.script,
  });
  const ttsResult = await ttsJob.waitUntilFinished();
  
  // Step 3: Render video
  await job.updateProgress(50);
  const renderJob = await queues.render.add('render', {
    captures: captureResult.frames,
    audio: ttsResult.audioPath,
    captions: ttsResult.wordTimings,
  });
  const renderResult = await renderJob.waitUntilFinished();
  
  // Step 4: Submit for review
  await job.updateProgress(80);
  await queues.review.add('review', {
    contentId,
    videoPath: renderResult.videoPath,
  });
  
  await job.updateProgress(100);
  return { videoPath: renderResult.videoPath, status: 'pending_review' };
});
```

### Event-Driven Progress Tracking

```typescript
// src/pipeline/events.ts
import { QueueEvents } from 'bullmq';

export class PipelineEventEmitter {
  private events: Map<string, QueueEvents> = new Map();
  
  constructor(queueNames: string[]) {
    for (const name of queueNames) {
      const queueEvents = new QueueEvents(name);
      this.events.set(name, queueEvents);
      
      queueEvents.on('progress', ({ jobId, data }) => {
        this.onProgress(name, jobId, data);
      });
      
      queueEvents.on('completed', ({ jobId, returnvalue }) => {
        this.onCompleted(name, jobId, returnvalue);
      });
      
      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.onFailed(name, jobId, failedReason);
      });
    }
  }
  
  private onProgress(queue: string, jobId: string, progress: number) {
    console.log(`[${queue}] Job ${jobId} progress: ${progress}%`);
    // Emit to SSE/WebSocket for client updates
  }
  
  private onCompleted(queue: string, jobId: string, result: any) {
    console.log(`[${queue}] Job ${jobId} completed`);
  }
  
  private onFailed(queue: string, jobId: string, reason: string) {
    console.error(`[${queue}] Job ${jobId} failed: ${reason}`);
  }
}
```

---

## Recommended Architecture

### Phase 1: MVP (BullMQ)

```
┌─────────────────────────────────────────────────────────┐
│                    REST API Layer                       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    BullMQ Queues                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐│
│  │ Capture │  │   TTS   │  │ Render  │  │   Review    ││
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘│
└───────┼────────────┼───────────┼───────────────┼───────┘
        │            │           │               │
┌───────▼────────────▼───────────▼───────────────▼───────┐
│                      Workers                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ Capture  │  │   TTS    │  │ Remotion │  │ Review  ││
│  │ Worker   │  │ Worker   │  │ Worker   │  │ Worker  ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
└─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                       Redis                             │
└─────────────────────────────────────────────────────────┘
```

### Phase 2: Production (Consider Temporal)

When complexity grows:
- Human-in-the-loop review workflows
- Long-running operations (multi-day approval)
- Cross-service orchestration
- Complex error recovery

---

## What We Can Adopt

### Direct Adoption ✅

1. **BullMQ** - Job queue for background processing
2. **Task polling pattern** - For external API integrations
3. **Progress tracking** - Real-time job status updates
4. **Retry strategies** - Exponential backoff for failures

### Patterns to Implement 🔧

1. **Queue-per-stage** - Separate queues for each pipeline step
2. **Parent-child jobs** - Dependencies between tasks
3. **Worker concurrency** - Parallel processing with limits
4. **Event-driven updates** - Real-time status to UI

### Future Consideration 🔮

1. **Temporal** - When workflows become complex
2. **Multi-region workers** - Geographic distribution
3. **Autoscaling** - Dynamic worker scaling based on queue depth

---

## Lessons Learned

1. **Start simple with BullMQ** - Easy to set up, powerful enough for MVP
2. **Redis is critical** - Use managed Redis in production (Upstash, Redis Cloud)
3. **Separate queues per stage** - Better visibility and independent scaling
4. **Progress tracking matters** - Users need to see what's happening
5. **Retry with backoff** - External APIs are flaky
6. **Log everything** - Job debugging is hard without logs

---

**Status:** Research complete. BullMQ recommended for MVP, Temporal for future consideration.
