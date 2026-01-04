# Layer 2 Theme 4: Infrastructure & Publishing

**Date:** 2026-01-04  
**Synthesized From:** Categories K, L  
**Layer:** 2 (Theme Synthesis)  
**Feeds Into:** Layer 1 Master Architecture

---

## Theme Summary

The **Infrastructure & Publishing** theme covers the foundation: **storage**, **databases**, **APIs**, and **distribution** to social platforms.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE & PUBLISHING                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                          STORAGE LAYER                           │    │
│  ├─────────────────┬─────────────────┬─────────────────────────────┤    │
│  │     MinIO       │     Qdrant      │        PostgreSQL           │    │
│  │  (S3 Objects)   │  (Vectors)      │       (Metadata)            │    │
│  └─────────────────┴─────────────────┴─────────────────────────────┘    │
│                                │                                         │
│  ┌─────────────────────────────┴───────────────────────────────────┐    │
│  │                           API LAYER                              │    │
│  │                    (Hono / FastAPI)                              │    │
│  └─────────────────────────────┬───────────────────────────────────┘    │
│                                │                                         │
│  ┌─────────────────────────────┴───────────────────────────────────┐    │
│  │                       PUBLISHING LAYER                           │    │
│  ├─────────────────┬─────────────────┬─────────────────────────────┤    │
│  │     YouTube     │     TikTok      │      Instagram              │    │
│  │   (Data API)    │ (Content API)   │   (Graph API)               │    │
│  └─────────────────┴─────────────────┴─────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Storage Layer

### Object Storage: MinIO

**Purpose:** Store video files, audio, assets

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!
  },
  forcePathStyle: true
});

class VideoStorage {
  private bucket = 'videos';
  
  async upload(key: string, buffer: Buffer): Promise<string> {
    await s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4'
    }));
    return key;
  }
  
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    return getSignedUrl(s3, command, { expiresIn });
  }
  
  async delete(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    }));
  }
}
```

### Vector Database: Qdrant

**Purpose:** Semantic search for similar content, deduplication

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

class ContentIndex {
  private collection = 'video-scripts';
  
  async init(): Promise<void> {
    await qdrant.createCollection(this.collection, {
      vectors: { size: 1536, distance: 'Cosine' }
    });
  }
  
  async index(id: string, embedding: number[], metadata: Record<string, any>): Promise<void> {
    await qdrant.upsert(this.collection, {
      points: [{
        id,
        vector: embedding,
        payload: metadata
      }]
    });
  }
  
  async findSimilar(embedding: number[], limit = 5): Promise<SearchResult[]> {
    const results = await qdrant.search(this.collection, {
      vector: embedding,
      limit,
      with_payload: true
    });
    
    return results.map(r => ({
      id: r.id as string,
      score: r.score,
      metadata: r.payload as Record<string, any>
    }));
  }
  
  async isDuplicate(embedding: number[], threshold = 0.95): Promise<boolean> {
    const similar = await this.findSimilar(embedding, 1);
    return similar.length > 0 && similar[0].score > threshold;
  }
}
```

### Relational Database: PostgreSQL

**Purpose:** Project metadata, job tracking, user data

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, uuid, text, timestamp, jsonb, integer, real } from 'drizzle-orm/pg-core';

// Schema
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  topic: text('topic'),
  status: text('status').default('draft'),
  config: jsonb('config'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  sequence: integer('sequence').notNull(),
  text: text('text').notNull(),
  duration: real('duration'),
  visualPrompt: text('visual_prompt'),
  audioPath: text('audio_path')
});

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  storageKey: text('storage_key').notNull(),
  duration: real('duration'),
  resolution: text('resolution'),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at').defaultNow()
});

export const publishings = pgTable('publishings', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').references(() => videos.id),
  platform: text('platform').notNull(),
  platformId: text('platform_id'),
  status: text('status').default('pending'),
  publishedAt: timestamp('published_at'),
  metrics: jsonb('metrics')
});

// Repository
class ProjectRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}
  
  async create(data: CreateProjectInput): Promise<Project> {
    const [project] = await this.db.insert(projects).values(data).returning();
    return project;
  }
  
  async getWithScenes(id: string): Promise<ProjectWithScenes | null> {
    const result = await this.db.select()
      .from(projects)
      .leftJoin(scenes, eq(projects.id, scenes.projectId))
      .where(eq(projects.id, id));
    
    if (!result.length) return null;
    
    return {
      ...result[0].projects,
      scenes: result.map(r => r.scenes).filter(Boolean)
    };
  }
}
```

---

## API Layer

### Hono (TypeScript)

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// Schemas
const createVideoSchema = z.object({
  topic: z.string().min(1),
  config: z.object({
    template: z.string().default('tiktok-bold'),
    voice: z.string().default('af_heart'),
    length: z.number().default(60)
  }).optional()
});

// Routes
app.post('/api/videos', zValidator('json', createVideoSchema), async (c) => {
  const data = c.req.valid('json');
  
  // Create project
  const project = await projectRepo.create({
    title: data.topic,
    topic: data.topic,
    config: data.config
  });
  
  // Queue job
  await videoQueue.add('create-video', {
    projectId: project.id,
    topic: data.topic,
    config: data.config
  });
  
  return c.json({
    projectId: project.id,
    status: 'processing'
  }, 201);
});

app.get('/api/videos/:id', async (c) => {
  const id = c.req.param('id');
  const project = await projectRepo.getWithScenes(id);
  
  if (!project) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  return c.json(project);
});

app.get('/api/videos/:id/download', async (c) => {
  const id = c.req.param('id');
  const video = await videoRepo.getByProject(id);
  
  if (!video) {
    return c.json({ error: 'Video not ready' }, 404);
  }
  
  const url = await storage.getSignedUrl(video.storageKey);
  return c.json({ url });
});

export default app;
```

### FastAPI (Python)

```python
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

app = FastAPI()

class CreateVideoRequest(BaseModel):
    topic: str
    config: dict | None = None

class VideoResponse(BaseModel):
    project_id: str
    status: str

@app.post("/api/videos", response_model=VideoResponse)
async def create_video(
    request: CreateVideoRequest,
    background: BackgroundTasks
):
    project = await project_repo.create(
        title=request.topic,
        topic=request.topic,
        config=request.config
    )
    
    background.add_task(process_video, project.id)
    
    return VideoResponse(
        project_id=str(project.id),
        status="processing"
    )

@app.get("/api/videos/{project_id}")
async def get_video(project_id: str):
    project = await project_repo.get_with_scenes(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    return project
```

---

## Publishing Layer

### Unified Publisher Interface

```typescript
interface Publisher {
  upload(video: VideoFile, metadata: Metadata): Promise<PublishResult>;
  schedule(video: VideoFile, metadata: Metadata, publishAt: Date): Promise<PublishResult>;
  getStatus(publishId: string): Promise<PublishStatus>;
  getAnalytics(publishId: string): Promise<Analytics>;
}

interface PublishResult {
  publishId: string;
  platformId: string;
  url: string;
  status: 'published' | 'scheduled' | 'processing';
}

interface Metadata {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
}
```

### YouTube Publisher

```typescript
import { google } from 'googleapis';

class YouTubePublisher implements Publisher {
  private youtube = google.youtube('v3');
  
  async upload(video: VideoFile, metadata: Metadata): Promise<PublishResult> {
    const response = await this.youtube.videos.insert({
      auth: this.oauth2Client,
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: this.formatDescription(metadata),
          tags: metadata.tags,
          categoryId: '28'  // Science & Technology
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(video.path)
      }
    });
    
    return {
      publishId: response.data.id!,
      platformId: response.data.id!,
      url: `https://youtube.com/watch?v=${response.data.id}`,
      status: 'published'
    };
  }
  
  async schedule(video: VideoFile, metadata: Metadata, publishAt: Date): Promise<PublishResult> {
    const response = await this.youtube.videos.insert({
      auth: this.oauth2Client,
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: this.formatDescription(metadata)
        },
        status: {
          privacyStatus: 'private',
          publishAt: publishAt.toISOString()
        }
      },
      media: {
        body: fs.createReadStream(video.path)
      }
    });
    
    return {
      publishId: response.data.id!,
      platformId: response.data.id!,
      url: `https://youtube.com/watch?v=${response.data.id}`,
      status: 'scheduled'
    };
  }
  
  private formatDescription(metadata: Metadata): string {
    return `${metadata.description}\n\n${metadata.hashtags.map(h => `#${h}`).join(' ')}`;
  }
}
```

### TikTok Publisher

```typescript
class TikTokPublisher implements Publisher {
  private baseUrl = 'https://open.tiktokapis.com/v2';
  
  async upload(video: VideoFile, metadata: Metadata): Promise<PublishResult> {
    // Initialize upload
    const initResponse = await fetch(`${this.baseUrl}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        post_info: {
          title: `${metadata.title} ${metadata.hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}`,
          privacy_level: 'PUBLIC_TO_EVERYONE'
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: video.size
        }
      })
    });
    
    const { data } = await initResponse.json();
    const uploadUrl = data.upload_url;
    const publishId = data.publish_id;
    
    // Upload file
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${video.size - 1}/${video.size}`
      },
      body: fs.createReadStream(video.path)
    });
    
    return {
      publishId,
      platformId: publishId,
      url: '',  // URL available after processing
      status: 'processing'
    };
  }
}
```

### Multi-Platform Publisher

```typescript
class MultiPlatformPublisher {
  private publishers: Map<Platform, Publisher> = new Map([
    ['youtube', new YouTubePublisher()],
    ['tiktok', new TikTokPublisher()],
    ['instagram', new InstagramPublisher()]
  ]);
  
  async publish(
    video: VideoFile,
    metadata: Metadata,
    platforms: Platform[]
  ): Promise<Map<Platform, PublishResult>> {
    const results = new Map<Platform, PublishResult>();
    
    // Parallel publish to all platforms
    await Promise.all(platforms.map(async (platform) => {
      const publisher = this.publishers.get(platform);
      if (!publisher) {
        throw new Error(`Unknown platform: ${platform}`);
      }
      
      // Adapt metadata per platform
      const adaptedMetadata = this.adaptMetadata(metadata, platform);
      const result = await publisher.upload(video, adaptedMetadata);
      results.set(platform, result);
    }));
    
    return results;
  }
  
  private adaptMetadata(metadata: Metadata, platform: Platform): Metadata {
    switch (platform) {
      case 'tiktok':
        return {
          ...metadata,
          title: metadata.title.slice(0, 100),
          hashtags: metadata.hashtags.slice(0, 5)
        };
      case 'youtube':
        return {
          ...metadata,
          title: metadata.title.slice(0, 100),
          description: metadata.description.slice(0, 5000)
        };
      case 'instagram':
        return {
          ...metadata,
          hashtags: metadata.hashtags.slice(0, 30)
        };
      default:
        return metadata;
    }
  }
}
```

---

## Docker Compose Stack

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: content
      POSTGRES_PASSWORD: machine
      POSTGRES_DB: content_machine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U content"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis (for BullMQ)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Qdrant (vector database)
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  minio_data:
  qdrant_data:
```

---

## Environment Configuration

```typescript
// config.ts
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // MinIO
  MINIO_ENDPOINT: z.string().default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  
  // Qdrant
  QDRANT_URL: z.string().default('http://localhost:6333'),
  
  // APIs
  OPENAI_API_KEY: z.string(),
  PEXELS_API_KEY: z.string().optional(),
  
  // Publishing
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  
  // Observability
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional()
});

export const config = envSchema.parse(process.env);
```

---

## Key Decisions

### 1. Self-Hosted Infrastructure

**Decision:** MinIO, Qdrant, PostgreSQL all self-hosted
**Rationale:** Cost control, data ownership, no vendor lock-in
**Trade-off:** More operational overhead

### 2. S3-Compatible Storage

**Decision:** Use MinIO with S3 API
**Rationale:** Standard interface, easy migration to AWS S3 later
**Trade-off:** MinIO requires maintenance

### 3. Official APIs for Publishing

**Decision:** Prefer official platform APIs where available
**Rationale:** Reliability, ToS compliance
**Trade-off:** More limited features, approval process

### 4. Platform-Specific Adaptation

**Decision:** Adapt metadata per platform at publish time
**Rationale:** Different platforms have different limits/formats
**Trade-off:** More code complexity

---

## Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE & PUBLISHING                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   MinIO     │     │  PostgreSQL │     │   YouTube   │      │
│  │   Qdrant    │────▶│   Drizzle   │────▶│   TikTok    │─────▶│
│  │   Redis     │     │   Hono      │     │  Instagram  │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│     S3 API            REST API            Official APIs        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Source Categories

- **Category K:** 6 infrastructure deep-dives
- **Category L:** 3 publishing deep-dives

---

## Key Takeaway

> **Use MinIO for S3-compatible storage, Qdrant for vector search, PostgreSQL for metadata, Redis for queues. Hono/FastAPI for APIs. Official platform APIs for publishing (YouTube Data API, TikTok Content API). Adapt metadata per platform. Docker Compose for development.**
