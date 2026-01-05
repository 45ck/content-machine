# Infrastructure Foundations - DEEP DIVE #43

**Created:** 2026-01-02
**Category:** Infrastructure Analysis
**Repos Analyzed:** 16 (Storage: 3, Queue: 3, Orchestration: 2, Publishing: 6, GitHub: 2)
**Status:** ✅ Complete

---

## Executive Summary

This deep dive analyzes the foundational infrastructure stack for content-machine:

1. **Storage** (3 repos): MinIO, Qdrant, Weaviate
2. **Job Queues** (3 repos): BullMQ, Celery, RQ
3. **Orchestration** (2 repos): Temporal, n8n
4. **Publishing** (6 repos): TiktokAutoUploader, youtube-upload, mixpost, etc.
5. **GitHub** (2 repos): Octokit, Octokit-REST

**Key Finding:** These tools form the "backbone" of the content-machine pipeline - handling data persistence (storage), background processing (queues), workflow coordination (orchestration), and content distribution (publishing).

---

## Part 1: Storage Infrastructure

### 1.1 Storage Tool Comparison

| Tool         | Type            | Language | License    | Key Feature      |
| ------------ | --------------- | -------- | ---------- | ---------------- |
| **MinIO**    | Object Storage  | Go       | AGPL-3.0   | S3-compatible    |
| **Qdrant**   | Vector Database | Rust     | Apache-2.0 | High performance |
| **Weaviate** | Vector Database | Go       | BSD-3      | Integrated RAG   |

### 1.2 MinIO (Object Storage) ⭐ RECOMMENDED

**Repository:** `vendor/storage/minio/`
**License:** AGPL-3.0 (source-only distribution)
**Status:** Maintenance mode (new features via AIStor commercial)

#### Why MinIO for content-machine:

- **S3-compatible** - Use AWS SDK everywhere
- **Self-hosted** - Full data control
- **High performance** - Optimized for AI/ML workloads
- **Simple deployment** - Single binary

#### Use Cases in content-machine:

- Store video assets (raw footage, rendered videos)
- Store audio files (TTS output, voiceovers)
- Store images (thumbnails, frames)
- Store transcripts and captions

#### Quick Start:

```bash
# Install from source
go install github.com/minio/minio@latest

# Start server
minio server /data

# Default credentials: minioadmin:minioadmin
# Console: http://127.0.0.1:9000
```

#### SDK Integration:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

// Upload rendered video
await s3.send(
  new PutObjectCommand({
    Bucket: 'videos',
    Key: 'output/video-123.mp4',
    Body: videoBuffer,
    ContentType: 'video/mp4',
  })
);
```

### 1.3 Qdrant (Vector Database) ⭐ RECOMMENDED

**Repository:** `vendor/storage/qdrant/`
**License:** Apache-2.0
**Language:** Rust (fast and reliable)

#### Why Qdrant for content-machine:

- **High performance** - Written in Rust
- **Rich filtering** - JSON payloads with complex queries
- **Hybrid search** - Dense + sparse vectors
- **Easy deployment** - Docker ready

#### Use Cases in content-machine:

- Semantic search over video scripts
- Find similar content for trend analysis
- Store embeddings for RAG
- Content deduplication

#### Quick Start:

```bash
# Docker deployment
docker run -p 6333:6333 qdrant/qdrant
```

#### SDK Integration:

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

# Connect
client = QdrantClient("localhost", port=6333)

# Create collection for video scripts
client.create_collection(
    collection_name="scripts",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Insert script embedding
client.upsert(
    collection_name="scripts",
    points=[
        PointStruct(
            id=1,
            vector=script_embedding,
            payload={
                "title": "AI Tools Demo",
                "platform": "tiktok",
                "duration": 30,
            }
        )
    ]
)

# Semantic search
results = client.search(
    collection_name="scripts",
    query_vector=query_embedding,
    limit=5,
    query_filter={
        "must": [{"key": "platform", "match": {"value": "tiktok"}}]
    }
)
```

### 1.4 Weaviate (Vector Database + RAG)

**Repository:** `vendor/storage/weaviate/`
**License:** BSD-3-Clause
**Stars:** 17k+

#### Why Consider Weaviate:

- **Integrated vectorization** - Built-in embedding models
- **Native RAG** - Generative search built-in
- **Hybrid search** - Vector + keyword (BM25)
- **Multi-tenancy** - Built for SaaS

#### Key Difference from Qdrant:

- Weaviate has **integrated embedding models** (OpenAI, Cohere, HuggingFace)
- Qdrant requires **external embedding generation**

#### When to Use Which:

- **Qdrant:** When you generate embeddings externally (more control)
- **Weaviate:** When you want integrated vectorization (simpler)

### 1.5 Storage Recommendation

| Use Case                      | Tool         | Reason                         |
| ----------------------------- | ------------ | ------------------------------ |
| Video/Audio/Image files       | **MinIO**    | S3-compatible, high throughput |
| Script embeddings             | **Qdrant**   | Fast, Rust, simple             |
| RAG with integrated embedding | **Weaviate** | Built-in models                |

---

## Part 2: Job Queue Infrastructure

### 2.1 Queue Tool Comparison

| Tool       | Language   | Backend        | Stars | Key Feature         |
| ---------- | ---------- | -------------- | ----- | ------------------- |
| **BullMQ** | TypeScript | Redis          | 6k+   | Parent/child jobs   |
| **Celery** | Python     | Redis/RabbitMQ | 24k+  | Python ecosystem    |
| **RQ**     | Python     | Redis          | 10k+  | Simple, lightweight |

### 2.2 BullMQ (Node.js) ⭐ RECOMMENDED

**Repository:** `vendor/job-queue/bullmq/`
**License:** MIT
**Tagline:** "Fastest, most reliable Redis-based queue for Node"

#### Why BullMQ for content-machine:

- **TypeScript-first** - Matches our stack
- **Parent/child jobs** - Complex workflows
- **Rate limiting** - API throttling
- **Reliable** - Atomic Lua operations

#### Use Cases in content-machine:

- Video rendering queue
- TTS generation jobs
- Upload processing
- Caption generation

#### Code Pattern:

```typescript
import { Queue, Worker, FlowProducer } from 'bullmq';

// Create queue
const renderQueue = new Queue('render', {
  connection: { host: 'localhost', port: 6379 }
});

// Add job
await renderQueue.add('video', {
  videoId: 'v-123',
  scenes: [...],
  outputPath: '/videos/output.mp4'
});

// Process jobs
const worker = new Worker('render', async (job) => {
  console.log(`Rendering video ${job.data.videoId}`);
  await renderVideo(job.data);
  return { status: 'completed' };
}, {
  connection: { host: 'localhost', port: 6379 }
});

// Complex workflows with FlowProducer
const flow = new FlowProducer();

await flow.add({
  name: 'publish-video',
  queueName: 'publish',
  data: { videoId: 'v-123' },
  children: [
    {
      name: 'render',
      queueName: 'render',
      data: { scenes: [...] },
      children: [
        { name: 'tts', queueName: 'audio', data: { script: '...' } },
        { name: 'capture', queueName: 'capture', data: { url: '...' } },
      ]
    }
  ]
});
```

### 2.3 RQ (Python - Lightweight)

**Repository:** `vendor/job-queue/rq/`
**License:** BSD
**Tagline:** "Simple job queues for Python"

#### Why RQ for Python services:

- **Simple** - Low barrier to entry
- **Python-native** - No overhead
- **Scheduling** - Built-in cron support (v2.5+)
- **Lightweight** - Perfect for smaller services

#### Code Pattern:

```python
from redis import Redis
from rq import Queue, Retry

# Create queue
queue = Queue(connection=Redis())

# Enqueue job with retry
job = queue.enqueue(
    generate_tts,
    script="Hello world",
    retry=Retry(max=3, interval=[10, 30, 60])
)

# Schedule job
job = queue.enqueue_in(timedelta(seconds=30), process_video)

# Repeating jobs (v2.5+)
queue.enqueue(cleanup_temp_files, repeat=Repeat(times=3, interval=30))
```

### 2.4 Queue Recommendation

| Use Case            | Tool       | Reason                    |
| ------------------- | ---------- | ------------------------- |
| TypeScript services | **BullMQ** | Native, complex workflows |
| Python services     | **RQ**     | Simple, lightweight       |
| Enterprise scale    | **Celery** | Mature, distributed       |

---

## Part 3: Orchestration Infrastructure

### 3.1 Orchestration Tool Comparison

| Tool         | Type              | Language   | License   | Key Feature         |
| ------------ | ----------------- | ---------- | --------- | ------------------- |
| **Temporal** | Durable Execution | Go         | MIT       | Workflow resilience |
| **n8n**      | Visual Automation | TypeScript | Fair-code | No-code + code      |

### 3.2 Temporal (Durable Workflows) ⭐ RECOMMENDED

**Repository:** `vendor/orchestration/temporal/`
**License:** MIT
**Origin:** Fork of Uber's Cadence

#### Why Temporal for content-machine:

- **Durable execution** - Auto-retry failures
- **State persistence** - Resume after crashes
- **Long-running workflows** - Hours to days
- **Multi-language SDKs** - Go, Java, TypeScript, Python

#### Use Cases in content-machine:

- Video generation pipeline orchestration
- Multi-step content creation workflows
- Scheduled content publication
- Error recovery and retry logic

#### Workflow Pattern:

```typescript
// Workflow definition
import { proxyActivities } from '@temporalio/workflow';

const { captureProduct, generateScript, generateTTS, renderVideo, uploadVideo } =
  proxyActivities<VideoActivities>({
    startToCloseTimeout: '10 minutes',
    retry: { maximumAttempts: 3 },
  });

export async function createVideoWorkflow(input: VideoInput): Promise<VideoResult> {
  // Step 1: Capture product UI
  const capture = await captureProduct(input.productUrl);

  // Step 2: Generate script
  const script = await generateScript(capture, input.topic);

  // Step 3: Generate TTS
  const audio = await generateTTS(script.text);

  // Step 4: Render video
  const video = await renderVideo({
    scenes: capture.scenes,
    audio: audio.path,
    captions: script.captions,
  });

  // Step 5: Upload to platforms
  const uploads = await uploadVideo(video, input.platforms);

  return { videoId: video.id, uploads };
}
```

#### Quick Start:

```bash
# Install CLI
brew install temporal

# Start local server
temporal server start-dev

# Web UI at http://localhost:8233
```

### 3.3 n8n (Visual Workflow Automation)

**Repository:** `vendor/orchestration/n8n/`
**License:** Fair-code (Sustainable Use License)
**Stars:** 50k+

#### Why n8n for content-machine:

- **Visual workflows** - Non-developers can create
- **400+ integrations** - Connect anything
- **AI-native** - LangChain built-in
- **Self-hostable** - Full control

#### Use Cases in content-machine:

- Connect external services
- Monitor and alert
- Quick prototypes
- Admin/ops workflows

#### Quick Start:

```bash
# Run with Docker
docker run -it --rm -p 5678:5678 docker.n8n.io/n8nio/n8n

# Or with npx
npx n8n
```

### 3.4 Orchestration Recommendation

| Use Case                  | Tool         | Reason                     |
| ------------------------- | ------------ | -------------------------- |
| Video generation pipeline | **Temporal** | Durable, complex workflows |
| External integrations     | **n8n**      | Visual, 400+ connectors    |
| Simple automation         | **n8n**      | Low-code                   |
| Production workflows      | **Temporal** | Resilient, scalable        |

---

## Part 4: Publishing Infrastructure

### 4.1 Publishing Tool Comparison

| Tool                   | Platform       | Method          | Risk   |
| ---------------------- | -------------- | --------------- | ------ |
| **TiktokAutoUploader** | TikTok         | Requests (fast) | Medium |
| **youtube-upload**     | YouTube        | Official API    | Low    |
| **mixpost**            | Multi-platform | Official APIs   | Low    |

### 4.2 TiktokAutoUploader ⭐ RECOMMENDED for TikTok

**Repository:** `vendor/publish/TiktokAutoUploader/`
**License:** MIT
**Status:** Working as of Dec 2024

#### Key Features:

- **Fast** - Requests-based (not Selenium)
- **3 seconds** - Per upload
- **Multi-account** - Handle multiple logins
- **Scheduling** - Up to 10 days ahead

#### Usage:

```bash
# Login
python cli.py login -n my_account

# Upload from local file
python cli.py upload --user my_account -v "video.mp4" -t "My title"

# Upload from YouTube shorts
python cli.py upload --user my_account -yt "https://youtube.com/shorts/xxx" -t "Title"
```

#### ⚠️ Risk Considerations:

- Unofficial API (may break)
- ToS risk (account suspension possible)
- No official support

### 4.3 YouTube Upload Options

**Official API recommended** - More stable, lower risk

```typescript
// Using official YouTube Data API v3
import { google } from 'googleapis';

const youtube = google.youtube('v3');

await youtube.videos.insert({
  auth: oauth2Client,
  part: ['snippet', 'status'],
  requestBody: {
    snippet: {
      title: 'My Video Title',
      description: 'Description here',
      tags: ['ai', 'automation'],
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: 'public',
    },
  },
  media: {
    body: fs.createReadStream('video.mp4'),
  },
});
```

### 4.4 Publishing Recommendation

| Platform       | Tool                   | Risk Level | Notes            |
| -------------- | ---------------------- | ---------- | ---------------- |
| TikTok         | **TiktokAutoUploader** | Medium     | Fast, unofficial |
| YouTube        | **Official API**       | Low        | Stable, quotas   |
| Instagram      | **Official API / MCP** | Low        | Graph API        |
| Multi-platform | **Mixpost/Postiz**     | Low        | Scheduling UI    |

---

## Part 5: GitHub API Infrastructure

### 5.1 Octokit (GitHub SDK)

**Repository:** `vendor/github/octokit/`
**License:** MIT

#### Why Octokit:

- **Official** - GitHub's own SDK
- **Complete** - REST + GraphQL + Webhooks + OAuth
- **Universal** - Browser, Node, Deno

#### Use Cases in content-machine:

- Fetch trending repos
- Monitor GitHub activity
- CI/CD integration
- Issue/PR automation

#### Code Pattern:

```typescript
import { Octokit } from 'octokit';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// REST API
const { data } = await octokit.rest.repos.get({
  owner: 'microsoft',
  repo: 'vscode',
});

// GraphQL API
const { viewer } = await octokit.graphql(`{
  viewer {
    login
    repositories(first: 10) {
      nodes { name }
    }
  }
}`);

// Pagination
const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
  owner: 'octokit',
  repo: 'octokit.js',
  per_page: 100,
});
```

---

## Part 6: Integration Architecture

### 6.1 Full Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    content-machine Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ORCHESTRATION: Temporal                                        │
│  ─────────────────────────────────────────────────────────────  │
│  Coordinates all steps: Capture → Script → TTS → Render → Pub   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QUEUES: BullMQ (TypeScript) | RQ (Python)                      │
│  ─────────────────────────────────────────────────────────────  │
│  Background jobs: Rendering, TTS, Transcription                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STORAGE                                                         │
│  ─────────────────────────────────────────────────────────────  │
│  MinIO (S3): Videos, Audio, Images                              │
│  Qdrant: Script embeddings, similarity search                   │
│  PostgreSQL: Metadata, user data                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PUBLISHING                                                      │
│  ─────────────────────────────────────────────────────────────  │
│  TikTok: TiktokAutoUploader                                     │
│  YouTube: Official API                                          │
│  Instagram: Graph API / MCP                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Data Flow

```
1. INTAKE (Trends)
   └─→ GitHub/Reddit/HN via MCP servers
   └─→ Store in PostgreSQL + Qdrant (embeddings)

2. PLANNING (LangGraph)
   └─→ Query trends from Qdrant
   └─→ Generate content plan
   └─→ Create Temporal workflow

3. CAPTURE (Playwright)
   └─→ BullMQ job: Capture product UI
   └─→ Store screenshots/recordings in MinIO

4. SCRIPT (LLM + Instructor)
   └─→ BullMQ job: Generate script
   └─→ Store script in PostgreSQL

5. AUDIO (TTS)
   └─→ RQ job: Generate voiceover
   └─→ Store audio in MinIO

6. RENDER (Remotion)
   └─→ BullMQ job: Render video
   └─→ Store video in MinIO

7. REVIEW (Dashboard)
   └─→ Human approval
   └─→ Update status in PostgreSQL

8. PUBLISH
   └─→ TiktokAutoUploader / YouTube API
   └─→ Log results to PostgreSQL
```

---

## Part 7: Recommendations Summary

### 7.1 Recommended Stack

| Category           | Tool                   | Priority | Notes              |
| ------------------ | ---------------------- | -------- | ------------------ |
| Object Storage     | **MinIO**              | P0       | S3-compatible      |
| Vector Storage     | **Qdrant**             | P0       | Fast, Rust         |
| Queue (TypeScript) | **BullMQ**             | P0       | Parent/child jobs  |
| Queue (Python)     | **RQ**                 | P1       | Simple             |
| Orchestration      | **Temporal**           | P0       | Durable workflows  |
| Visual Automation  | **n8n**                | P2       | Quick integrations |
| TikTok Upload      | **TiktokAutoUploader** | P1       | Fast, risky        |
| YouTube Upload     | **Official API**       | P0       | Stable             |
| GitHub Integration | **Octokit**            | P2       | Trend research     |

### 7.2 Deployment Order

1. **Phase 1: Core Storage**
   - Deploy MinIO (Docker)
   - Deploy Qdrant (Docker)
   - Configure S3 buckets

2. **Phase 2: Queue Infrastructure**
   - Deploy Redis (BullMQ/RQ backend)
   - Setup BullMQ queues
   - Setup RQ for Python services

3. **Phase 3: Orchestration**
   - Deploy Temporal (Docker)
   - Define video generation workflow
   - Connect to queues

4. **Phase 4: Publishing**
   - Setup TiktokAutoUploader
   - Configure YouTube API OAuth
   - Test upload flows

### 7.3 Docker Compose Example

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123

  qdrant:
    image: qdrant/qdrant
    ports:
      - '6333:6333'
    volumes:
      - qdrant_data:/qdrant/storage

  redis:
    image: redis:alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - '7233:7233'
    environment:
      - DB=postgresql
      - POSTGRES_SEEDS=postgres

  temporal-ui:
    image: temporalio/ui:latest
    ports:
      - '8233:8080'
    environment:
      - TEMPORAL_ADDRESS=temporal:7233

volumes:
  minio_data:
  qdrant_data:
  redis_data:
```

---

## References

### Storage

- MinIO Docs: https://min.io/docs
- Qdrant Docs: https://qdrant.tech/documentation/
- Weaviate Docs: https://docs.weaviate.io/

### Queues

- BullMQ Docs: https://docs.bullmq.io/
- RQ Docs: https://python-rq.org/

### Orchestration

- Temporal Docs: https://docs.temporal.io/
- n8n Docs: https://docs.n8n.io/

### Publishing

- TikTok: https://github.com/makiisthenes/TiktokAutoUploader
- YouTube API: https://developers.google.com/youtube/v3

### GitHub

- Octokit: https://github.com/octokit/octokit.js

---

**Document Status:** Complete
**Next Steps:**

1. Deploy MinIO + Qdrant + Redis (Docker Compose)
2. Setup BullMQ queues for render pipeline
3. Implement Temporal workflow for video generation
4. Integrate TiktokAutoUploader for publishing
