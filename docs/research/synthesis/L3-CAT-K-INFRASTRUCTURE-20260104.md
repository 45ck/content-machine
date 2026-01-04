# Layer 3 Category K: Infrastructure & Platform

**Date:** 2026-01-04  
**Synthesized From:** 6 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 4 - Infrastructure

---

## Category Summary

Infrastructure components provide **storage**, **databases**, **vector search**, and **API layers** for the video generation pipeline.

---

## Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Object Storage** | MinIO | Video/audio files |
| **Vector DB** | Qdrant | Semantic search |
| **Relational DB** | PostgreSQL | Metadata, jobs |
| **Cache** | Redis | Job queue, caching |
| **API** | FastAPI/Hono | Service endpoints |

---

## Object Storage: MinIO

### Why MinIO

1. **S3-compatible** - Standard API
2. **Self-hosted** - No cloud costs
3. **Fast** - Local storage performance
4. **Simple** - Single binary deployment

### Setup

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
```

### TypeScript Client

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  },
  forcePathStyle: true
});

// Upload file
async function uploadVideo(key: string, buffer: Buffer): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: 'videos',
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4'
  }));
  return key;
}

// Generate signed URL (1 hour)
async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: 'videos', Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

// Upload from stream
async function uploadStream(key: string, stream: Readable): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: 'videos',
      Key: key,
      Body: stream
    }
  });
  await upload.done();
  return key;
}
```

### Python Client

```python
import boto3
from botocore.config import Config

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4')
)

# Upload
def upload_video(key: str, file_path: str) -> str:
    s3.upload_file(file_path, 'videos', key)
    return key

# Download
def download_video(key: str, dest_path: str):
    s3.download_file('videos', key, dest_path)

# Presigned URL
def get_download_url(key: str, expires: int = 3600) -> str:
    return s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'videos', 'Key': key},
        ExpiresIn=expires
    )
```

---

## Vector Database: Qdrant

### Why Qdrant

1. **Fast** - Rust-based performance
2. **Rich queries** - Filtering + search
3. **Payloads** - Store metadata
4. **Scalable** - Clustering support

### Setup

```yaml
# docker-compose.yml
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
```

### TypeScript Client

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

// Create collection
await qdrant.createCollection('scripts', {
  vectors: {
    size: 1536,  // OpenAI embedding size
    distance: 'Cosine'
  }
});

// Upsert with metadata
async function indexScript(script: Script, embedding: number[]): Promise<void> {
  await qdrant.upsert('scripts', {
    wait: true,
    points: [{
      id: script.id,
      vector: embedding,
      payload: {
        title: script.title,
        topic: script.topic,
        created_at: script.createdAt.toISOString()
      }
    }]
  });
}

// Search with filters
async function searchSimilar(
  embedding: number[],
  topic?: string,
  limit: number = 5
): Promise<Script[]> {
  const filter = topic ? {
    must: [{ key: 'topic', match: { value: topic } }]
  } : undefined;
  
  const results = await qdrant.search('scripts', {
    vector: embedding,
    filter,
    limit,
    with_payload: true
  });
  
  return results.map(r => ({
    id: r.id as string,
    score: r.score,
    ...r.payload
  }));
}
```

### Python Client

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

qdrant = QdrantClient(url="http://localhost:6333")

# Create collection
qdrant.create_collection(
    collection_name="scripts",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Upsert
def index_script(script_id: str, embedding: list[float], metadata: dict):
    qdrant.upsert(
        collection_name="scripts",
        points=[PointStruct(
            id=script_id,
            vector=embedding,
            payload=metadata
        )]
    )

# Search
def search_similar(embedding: list[float], limit: int = 5) -> list[dict]:
    results = qdrant.search(
        collection_name="scripts",
        query_vector=embedding,
        limit=limit
    )
    return [{"id": r.id, "score": r.score, **r.payload} for r in results]
```

---

## Relational Database: PostgreSQL

### Schema Design

```sql
-- Video projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    topic TEXT,
    status TEXT DEFAULT 'draft',
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenes within project
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    text TEXT NOT NULL,
    duration FLOAT,
    visual_prompt TEXT,
    audio_path TEXT,
    UNIQUE(project_id, sequence)
);

-- Rendered videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    storage_key TEXT NOT NULL,
    duration FLOAT,
    resolution TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job tracking
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    type TEXT NOT NULL,  -- 'script', 'audio', 'render', 'publish'
    status TEXT DEFAULT 'pending',
    progress INT DEFAULT 0,
    result JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_project ON jobs(project_id);
```

### TypeScript with Drizzle

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, uuid, text, timestamp, jsonb, integer, real } from 'drizzle-orm/pg-core';

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

// Queries
const db = drizzle(pool);

// Create project
const project = await db.insert(projects).values({
  title: 'AI Trends 2026',
  topic: 'artificial-intelligence'
}).returning();

// Get with scenes
const result = await db.select()
  .from(projects)
  .leftJoin(scenes, eq(projects.id, scenes.projectId))
  .where(eq(projects.id, projectId));
```

### Python with SQLAlchemy

```python
from sqlalchemy import create_engine, Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Project(Base):
    __tablename__ = 'projects'
    
    id = Column(UUID, primary_key=True, server_default='gen_random_uuid()')
    title = Column(String, nullable=False)
    topic = Column(String)
    status = Column(String, default='draft')
    config = Column(JSONB)
    created_at = Column(DateTime, server_default='now()')
    
    scenes = relationship('Scene', back_populates='project')

class Scene(Base):
    __tablename__ = 'scenes'
    
    id = Column(UUID, primary_key=True, server_default='gen_random_uuid()')
    project_id = Column(UUID, ForeignKey('projects.id'))
    sequence = Column(Integer, nullable=False)
    text = Column(String, nullable=False)
    duration = Column(Float)
    
    project = relationship('Project', back_populates='scenes')
```

---

## Cache & Queue: Redis

### Setup

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

### Caching Pattern

```typescript
import { Redis } from 'ioredis';

const redis = new Redis();

// Cache with TTL
async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}

// Usage
const trends = await cached(
  'trends:programming',
  300,  // 5 minutes
  () => fetchTrends('programming')
);
```

---

## API Layer: FastAPI + Hono

### Python API (FastAPI)

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

app = FastAPI()

class CreateVideoRequest(BaseModel):
    topic: str
    config: dict | None = None

@app.post("/videos")
async def create_video(
    request: CreateVideoRequest,
    background: BackgroundTasks
):
    project = await db.create_project(request.topic, request.config)
    background.add_task(process_video, project.id)
    return {"project_id": project.id, "status": "processing"}

@app.get("/videos/{project_id}")
async def get_video(project_id: str):
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project

@app.get("/videos/{project_id}/download")
async def download_video(project_id: str):
    video = await db.get_video(project_id)
    url = await storage.get_signed_url(video.storage_key)
    return {"url": url}
```

### TypeScript API (Hono)

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const createVideoSchema = z.object({
  topic: z.string(),
  config: z.record(z.unknown()).optional()
});

app.post('/videos', zValidator('json', createVideoSchema), async (c) => {
  const data = c.req.valid('json');
  const project = await db.createProject(data.topic, data.config);
  await queue.add('process-video', { projectId: project.id });
  return c.json({ projectId: project.id, status: 'processing' });
});

app.get('/videos/:id', async (c) => {
  const project = await db.getProject(c.req.param('id'));
  if (!project) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(project);
});

export default app;
```

---

## Docker Compose Stack

```yaml
version: '3.8'

services:
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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

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

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
  redis_data:
  minio_data:
  qdrant_data:
```

---

## Service Configuration

```typescript
// config.ts
export const config = {
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'content_machine',
    user: process.env.PG_USER || 'content',
    password: process.env.PG_PASSWORD || 'machine'
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
  },
  
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333'
  }
};
```

---

## Source Documents

- DD-48: Infrastructure + logging + observability
- DD-60: Connectors + data platforms + storage
- DD-65: Review + orchestration + infrastructure
- DD-79: Storage + queue + infrastructure
- infrastructure-logging-observability-DEEP
- storage-queue-infrastructure-DEEP

---

## Key Takeaway

> **Use MinIO for S3-compatible object storage, Qdrant for vector search, PostgreSQL for relational data, and Redis for caching/queues. Deploy with Docker Compose for development, Kubernetes for production.**
