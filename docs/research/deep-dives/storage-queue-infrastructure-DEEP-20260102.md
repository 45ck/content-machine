# Storage, Queue, and Infrastructure Deep Dive

**Date:** 2026-01-02
**Status:** Research Complete
**Category:** Infrastructure Components

---

## Executive Summary

This document covers the storage, queue, and infrastructure components essential for content-machine's production deployment: MinIO (object storage), Qdrant (vector database), BullMQ (job queue), Temporal (workflow orchestration), and supporting automation tools.

---

## 1. MinIO - S3-Compatible Object Storage

### 1.1 Overview

**Repository:** `vendor/storage/minio/`  
**Type:** High-performance object storage  
**License:** AGPL v3 (commercial via AIStor)

MinIO is an S3-compatible object storage solution optimized for AI/ML workloads and large-scale data pipelines.

### 1.2 Key Features

```yaml
S3 Compatibility:
  - Full S3 API support
  - Seamless integration with S3 tools
  - Direct SDK support for all major languages

Performance:
  - Built for AI & Analytics
  - High-throughput data pipelines
  - Optimized for large files (video, images)

Deployment:
  - Docker containers
  - Kubernetes (Helm charts)
  - Source build (Go)
```

### 1.3 Quick Start

```bash
# Install from source
go install github.com/minio/minio@latest

# Start server
minio server /data

# Default credentials: minioadmin:minioadmin
# Console: http://127.0.0.1:9000
```

### 1.4 Integration Pattern

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
});

// Upload rendered video
await s3Client.send(
  new PutObjectCommand({
    Bucket: 'videos',
    Key: `renders/${videoId}/output.mp4`,
    Body: videoBuffer,
    ContentType: 'video/mp4',
  })
);

// Get video URL for streaming
const url = await getSignedUrl(
  s3Client,
  new GetObjectCommand({
    Bucket: 'videos',
    Key: `renders/${videoId}/output.mp4`,
  }),
  { expiresIn: 3600 }
);
```

### 1.5 Use Cases for content-machine

| Storage Type | Bucket       | Purpose                                |
| ------------ | ------------ | -------------------------------------- |
| Raw Assets   | `assets`     | Product screenshots, background videos |
| Renders      | `renders`    | Completed video outputs                |
| Audio        | `audio`      | TTS voiceovers, background music       |
| Thumbnails   | `thumbnails` | Generated thumbnails                   |
| Temp         | `temp`       | Work-in-progress files                 |

---

## 2. Qdrant - Vector Database

### 2.1 Overview

**Repository:** `vendor/storage/qdrant/`  
**Type:** Vector similarity search engine  
**Language:** Rust  
**License:** Apache 2.0

Qdrant is a production-ready vector database with extended filtering support, perfect for semantic search, recommendations, and AI applications.

### 2.2 Key Features

```yaml
Core:
  - Vector similarity search
  - Payload filtering
  - Neural network embeddings
  - Full-text search (sparse vectors)

Performance:
  - Written in Rust for speed
  - Handles high loads
  - Production benchmarks available

Deployment:
  - Docker container
  - Qdrant Cloud (managed)
  - In-memory (testing)
```

### 2.3 Quick Start

```bash
# Docker
docker run -p 6333:6333 qdrant/qdrant

# Python client
pip install qdrant-client
```

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient("http://localhost:6333")

# Create collection for video content
client.create_collection(
    collection_name="video_content",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Store video metadata with embedding
client.upsert(
    collection_name="video_content",
    points=[
        PointStruct(
            id=1,
            vector=embedding,  # OpenAI text-embedding-3-small
            payload={
                "title": "AI Coding Tools 2025",
                "topic": "developer-tools",
                "platform": "tiktok",
                "engagement_score": 0.85,
            }
        )
    ]
)

# Search for similar content
results = client.search(
    collection_name="video_content",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[FieldCondition(key="platform", match=MatchValue(value="tiktok"))]
    ),
    limit=10
)
```

### 2.4 Use Cases for content-machine

| Collection | Purpose           | Payload Fields                     |
| ---------- | ----------------- | ---------------------------------- |
| `trends`   | Trending topics   | source, score, timestamp, category |
| `scripts`  | Generated scripts | topic, hook, duration, engagement  |
| `videos`   | Published videos  | url, platform, views, likes        |
| `products` | Product knowledge | name, features, screenshots        |

---

## 3. Temporal - Durable Workflow Orchestration

### 3.1 Overview

**Repository:** `vendor/orchestration/temporal/`  
**Type:** Durable execution platform  
**Language:** Go  
**License:** MIT

Temporal enables developers to build scalable applications with automatic handling of failures and retries. Ideal for long-running video production pipelines.

### 3.2 Key Concepts

```yaml
Workflows:
  - Units of application logic
  - Automatically handles failures
  - Survives server restarts
  - Can run for minutes to months

Activities:
  - Individual work units
  - Can be retried independently
  - Timeout configuration
  - Heartbeat for long operations

Workers:
  - Execute workflow code
  - Scale horizontally
  - Language-specific SDKs
```

### 3.3 Video Pipeline Workflow

```typescript
// TypeScript SDK example
import { proxyActivities, defineWorkflow } from '@temporalio/workflow';

const { researchTrends, generateScript, captureUI, renderVideo, uploadVideo } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: '10 minutes',
  retry: { maximumAttempts: 3 },
});

export const videoProductionWorkflow = defineWorkflow({
  async run(input: VideoRequest): Promise<VideoResult> {
    // Step 1: Research trends
    const trends = await researchTrends(input.topic);

    // Step 2: Generate script
    const script = await generateScript({
      trends,
      duration: input.targetDuration,
      style: input.style,
    });

    // Step 3: Capture product UI
    const captures = await captureUI({
      product: input.productUrl,
      script: script,
    });

    // Step 4: Render video
    const video = await renderVideo({
      script,
      captures,
      style: input.videoStyle,
    });

    // Step 5: Upload to platforms
    const uploads = await uploadVideo({
      videoPath: video.path,
      platforms: input.targetPlatforms,
      metadata: {
        title: script.title,
        description: script.description,
        hashtags: script.hashtags,
      },
    });

    return {
      videoId: video.id,
      uploads,
    };
  },
});
```

### 3.4 Benefits for content-machine

```yaml
Durability:
  - Video production survives server restarts
  - Long render jobs don't lose progress
  - Automatic retry on transient failures

Observability:
  - Built-in Web UI
  - Workflow history
  - Activity traces

Scalability:
  - Horizontal worker scaling
  - Queue-based execution
  - Resource isolation
```

---

## 4. BullMQ - Redis-Based Job Queue

### 4.1 Overview

**Repository:** `vendor/job-queue/bullmq/`  
**Type:** High-performance job queue  
**Runtime:** Node.js  
**Backend:** Redis

BullMQ provides reliable, Redis-based job processing for Node.js applications.

### 4.2 Key Features

```yaml
Job Processing:
  - Delayed jobs
  - Repeatable jobs
  - Rate limiting
  - Prioritization
  - Parent-child flows

Reliability:
  - Atomic operations
  - Retry with backoff
  - Dead letter queue
  - Job deduplication

Monitoring:
  - Taskforce.sh dashboard
  - Bull Board (open source)
  - Event-based monitoring
```

### 4.3 Pipeline Implementation

```typescript
import { Queue, Worker, FlowProducer } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });

// Define queues
const queues = {
  trend: new Queue('trend-research', { connection }),
  script: new Queue('script-generation', { connection }),
  capture: new Queue('ui-capture', { connection }),
  render: new Queue('video-render', { connection }),
  upload: new Queue('video-upload', { connection }),
};

// Parent-child flow for video production
const flowProducer = new FlowProducer({ connection });

async function produceVideo(topic: string) {
  const flow = await flowProducer.add({
    name: 'video-production',
    queueName: 'video-production',
    data: { topic },
    children: [
      {
        name: 'research',
        queueName: 'trend-research',
        data: { topic, sources: ['reddit', 'hackernews'] },
      },
      {
        name: 'script',
        queueName: 'script-generation',
        data: { topic, duration: 45 },
        opts: { delay: 0 },
        children: [
          {
            name: 'capture',
            queueName: 'ui-capture',
            data: { product: 'copilot' },
          },
        ],
      },
    ],
  });

  return flow;
}

// Worker for rendering (limited concurrency)
const renderWorker = new Worker(
  'video-render',
  async (job) => {
    const { script, captures, style } = job.data;

    // Report progress
    await job.updateProgress(10);

    // Render with Remotion
    const output = await renderRemotionVideo({
      composition: style.composition,
      inputProps: { script, captures },
      outputPath: `/tmp/${job.id}.mp4`,
    });

    await job.updateProgress(100);
    return { path: output.path, duration: output.duration };
  },
  {
    connection,
    concurrency: 2, // Limit parallel renders
    limiter: { max: 10, duration: 60000 }, // Rate limit
  }
);
```

### 4.4 Queue vs Temporal Decision

| Use Case             | BullMQ     | Temporal       |
| -------------------- | ---------- | -------------- |
| Short jobs (< 5 min) | ✅ Best    | Overkill       |
| Long jobs (> 30 min) | Possible   | ✅ Best        |
| Complex workflows    | Limited    | ✅ Best        |
| Simple fan-out       | ✅ Best    | Overkill       |
| Failure recovery     | Good       | ✅ Excellent   |
| Observability        | Bull Board | ✅ Built-in UI |

**Recommendation:** Use BullMQ for individual pipeline stages, Temporal for end-to-end workflow orchestration.

---

## 5. AI Video Workflow - Desktop Application

### 5.1 Overview

**Repository:** `vendor/orchestration/ai-video-workflow/`  
**Type:** PyQt5 desktop application  
**Key Feature:** Multi-AI integration (text→image→video→music)

A complete desktop application demonstrating end-to-end AI video creation.

### 5.2 Pipeline

```
User Input → Prompt Generation → Text-to-Image → Image-to-Video → Text-to-Music → FFmpeg Merge
     ↓              ↓                  ↓              ↓               ↓              ↓
   Topic        Doubao LLM         LibLibAI       Jimeng I2V      Jimeng Music    Final Video
   Style                          (Checkpoint)   (Volcengine)    (Volcengine)
```

### 5.3 Key Integrations

| Stage  | API Provider        | Model                      |
| ------ | ------------------- | -------------------------- |
| Prompt | Doubao (Volcengine) | LLM                        |
| Image  | LibLibAI            | Various Checkpoints + LoRA |
| Video  | Jimeng I2V          | Image-to-Video             |
| Music  | Jimeng Music        | Text-to-Music              |
| Merge  | FFmpeg              | Video processing           |

### 5.4 Patterns for content-machine

1. **Multi-API Orchestration:** Chain multiple AI services
2. **Progress Tracking:** Per-stage progress updates
3. **History Navigation:** Browse previous outputs
4. **Parameter Management:** Centralized configuration

---

## 6. Weaviate - Alternative Vector Database

### 6.1 Overview

**Repository:** `vendor/storage/weaviate/`  
**Type:** Vector database with ML integration  
**License:** BSD-3

Weaviate offers vectorization modules for automatic embedding generation.

### 6.2 Key Differentiator from Qdrant

```yaml
Weaviate:
  - Built-in vectorizers (text2vec-openai, etc.)
  - GraphQL API
  - Hybrid search (BM25 + vectors)
  - Multi-tenancy

Qdrant:
  - Bring your own embeddings
  - REST + gRPC API
  - Faster pure vector search
  - Simpler deployment
```

**Recommendation:** Use Qdrant for content-machine (simpler, faster for pure vector search).

---

## 7. YASGU - Generator Configuration

### 7.1 Overview

**Repository:** `vendor/YASGU/`  
**Type:** Automated YouTube Shorts generator  
**Key Feature:** Multi-language support, configurable LLMs

YASGU demonstrates comprehensive configuration for video generation.

### 7.2 Configuration Structure

```json
{
  "verbose": true,
  "headless": true,
  "threads": 4,
  "assembly_ai_api_key": "...",
  "imagemagick_path": "/usr/bin/convert",
  "generators": [
    {
      "id": "history-facts",
      "language": "en",
      "subject": "History of France",
      "llm": "gpt-4",
      "image_prompt_llm": "gpt-4",
      "image_model": "dall-e-3"
    }
  ]
}
```

### 7.3 Generator Options

| Parameter   | Options                              |
| ----------- | ------------------------------------ |
| language    | Multi-language (CoquiTTS)            |
| llm         | GPT-4, Claude, Ollama, Gemini        |
| image_model | DALL-E, Prodiamine, Stable Diffusion |
| subject     | Any topic description                |

---

## 8. Gemini YouTube Automation

### 8.1 Overview

**Repository:** `vendor/gemini-youtube-automation/`  
**Type:** GitHub Actions-based automation  
**Key Feature:** Scheduled daily production

Demonstrates CI/CD-based video automation.

### 8.2 Architecture

```yaml
GitHub Actions Workflow:
  trigger: '7:00 AM UTC daily'
  steps:
    - Generate curriculum via Gemini
    - Generate lesson content
    - Create slides with Pexels backgrounds
    - Text-to-speech with gTTS
    - Assemble video with MoviePy
    - Upload to YouTube API
```

### 8.3 Curriculum Generation

```python
def generate_curriculum(previous_titles=None):
    """Generate course curriculum using Gemini."""
    model = genai.GenerativeModel('gemini-1.5-flash')

    prompt = f"""
    Generate a curriculum for 'AI for Developers'.
    Style: Assume beginner/non-technical viewer.
    Use simple analogies, relatable examples.

    Return JSON with "lessons" array:
    - chapter, part, title, status, youtube_id
    """

    response = model.generate_content(prompt)
    return json.loads(response.text)
```

### 8.4 Patterns for content-machine

1. **Scheduled Automation:** GitHub Actions for production
2. **Content Plans:** JSON-based curriculum/planning
3. **Per-slide Audio:** Sync audio to individual slides
4. **Curriculum-based:** Series planning

---

## 9. Integration Architecture

### 9.1 Complete Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    content-machine Infrastructure                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Temporal   │  │   BullMQ    │  │   Redis     │             │
│  │  Workflows   │  │    Jobs     │  │   Cache     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    MinIO    │  │   Qdrant    │  │  PostgreSQL │             │
│  │   Storage   │  │   Vectors   │  │   Metadata  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MCP Server Layer                      │   │
│  │  [Qdrant MCP] [Postgres MCP] [Reddit MCP] [Playwright]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Docker Compose Configuration

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  qdrant:
    image: qdrant/qdrant
    ports:
      - '6333:6333'
    volumes:
      - qdrant-data:/qdrant/storage

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-data:/data

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: contentmachine
      POSTGRES_USER: contentmachine
      POSTGRES_PASSWORD: contentmachine
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data

  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - '7233:7233'
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=contentmachine
      - POSTGRES_PWD=contentmachine

volumes:
  redis-data:
  qdrant-data:
  minio-data:
  postgres-data:
```

---

## 10. Recommendations

### 10.1 Infrastructure Stack

| Component      | Tool       | Purpose                          |
| -------------- | ---------- | -------------------------------- |
| Object Storage | MinIO      | Video, audio, image files        |
| Vector DB      | Qdrant     | Semantic search, recommendations |
| Metadata DB    | PostgreSQL | Structured data, relationships   |
| Cache          | Redis      | Session, queue backend           |
| Job Queue      | BullMQ     | Pipeline stage jobs              |
| Workflow       | Temporal   | E2E video production             |

### 10.2 Deployment Strategy

```yaml
Development:
  - Docker Compose (single machine)
  - In-memory Qdrant
  - Local MinIO

Staging:
  - Docker Swarm / k3s
  - Persistent volumes
  - Shared storage

Production:
  - Kubernetes
  - Qdrant Cloud (or managed)
  - S3 / MinIO cluster
  - Temporal Cloud
```

---

## 11. References

- MinIO: https://min.io/docs
- Qdrant: https://qdrant.tech/documentation
- Temporal: https://docs.temporal.io
- BullMQ: https://docs.bullmq.io
- Weaviate: https://weaviate.io/developers/weaviate

---

**Next Steps:**

1. Set up Docker Compose development environment
2. Configure MinIO buckets for video pipeline
3. Create Qdrant collections for content and trends
4. Implement BullMQ job handlers
5. Design Temporal workflow for production
