# Layer 1: Master Architecture Synthesis

**Date:** 2026-01-04  
**Synthesized From:** All 4 Themes, 12 Categories, 86 Deep Dives  
**Layer:** 1 (Apex)  
**Purpose:** Final architecture decisions for content-machine

---

## Executive Summary

After analyzing **139 vendored repos** across **86 deep-dive documents**, this synthesis provides the definitive technology selections and architecture for **content-machine** - an open-source automated short-form video generation platform.

### Core Insight

> Every successful video generator follows the same **5-stage pipeline**:
> **INPUT → SCRIPT → AUDIO → VISUALS → RENDER**

Our architecture optimizes each stage with best-in-class open-source tools while maintaining flexibility for future evolution.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTENT-MACHINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         ORCHESTRATION LAYER                             │ │
│  │                                                                          │ │
│  │   ┌──────────────────┐    ┌──────────────────┐    ┌────────────────┐   │ │
│  │   │ OpenAI Agents SDK│───▶│   MCP Servers    │───▶│    BullMQ      │   │ │
│  │   │  (Orchestrator)  │    │   (FastMCP 2.0)  │    │  (Job Queue)   │   │ │
│  │   └──────────────────┘    └──────────────────┘    └────────────────┘   │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│  ┌────────────────────────────────────┴───────────────────────────────────┐ │
│  │                         PROCESSING PIPELINE                             │ │
│  │                                                                          │ │
│  │   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │ │
│  │   │  INPUT  │──▶│ SCRIPT  │──▶│  AUDIO  │──▶│ VISUALS │──▶│ RENDER  │  │ │
│  │   │         │   │         │   │         │   │         │   │         │  │ │
│  │   │ Reddit  │   │ GPT-4o  │   │ Kokoro  │   │ Pexels  │   │Remotion │  │ │
│  │   │ HN      │   │ Zod     │   │WhisperX │   │ Assets  │   │Captions │  │ │
│  │   │ YouTube │   │ Schema  │   │         │   │         │   │         │  │ │
│  │   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘  │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│  ┌────────────────────────────────────┴───────────────────────────────────┐ │
│  │                         INFRASTRUCTURE LAYER                            │ │
│  │                                                                          │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │   │   MinIO      │  │  PostgreSQL  │  │    Qdrant    │  │   Redis    │ │ │
│  │   │  (Storage)   │  │  (Metadata)  │  │  (Vectors)   │  │  (Queue)   │ │ │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│  ┌────────────────────────────────────┴───────────────────────────────────┐ │
│  │                         PUBLISHING LAYER                                │ │
│  │                                                                          │ │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │ │
│  │   │     YouTube      │  │      TikTok      │  │    Instagram     │     │ │
│  │   │    (Data API)    │  │  (Content API)   │  │   (Graph API)    │     │ │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘     │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack (Final Selections)

### Primary Stack

| Component         | Technology           | Justification                               |
| ----------------- | -------------------- | ------------------------------------------- |
| **Language**      | TypeScript           | Remotion native, type safety, ecosystem     |
| **Orchestrator**  | OpenAI Agents SDK    | Official SDK, simple API, TypeScript native |
| **Rendering**     | Remotion             | React-based, extensive components           |
| **TTS**           | Kokoro-FastAPI       | Best free quality, Apache license           |
| **ASR**           | WhisperX             | 70x realtime, word-level timestamps         |
| **Captions**      | remotion-subtitles   | 17 presets, TikTok-optimized                |
| **Queue**         | BullMQ               | Redis-based, FlowProducer for dependencies  |
| **MCP**           | FastMCP 2.0          | Python + TypeScript, enterprise features    |
| **Storage**       | MinIO                | S3-compatible, self-hosted                  |
| **Database**      | PostgreSQL + Drizzle | Type-safe ORM                               |
| **Vectors**       | Qdrant               | Fast semantic search                        |
| **Observability** | Langfuse             | LLM tracing, self-hostable                  |

### Python Services

| Component           | Technology          | Justification                 |
| ------------------- | ------------------- | ----------------------------- |
| **Agent Framework** | Pydantic AI         | Type-safe, FastAPI ergonomics |
| **Research**        | Tavily + Reddit MCP | Web search + social trends    |
| **API**             | FastAPI             | Standard Python API framework |

---

## Component Contracts

### Video Configuration Schema

```typescript
import { z } from 'zod';

// Scene definition
const SceneSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  duration: z.number().min(2).max(15),
  visualPrompt: z.string().optional(),
  searchTerms: z.array(z.string()).optional(),
  assetPath: z.string().optional(),
});

// Caption configuration
const CaptionConfigSchema = z.object({
  style: z
    .enum(['tiktok-bold', 'youtube-shorts', 'minimal', 'karaoke', 'typewriter', 'bounce'])
    .default('tiktok-bold'),
  fontSize: z.number().default(80),
  position: z.enum(['top', 'center', 'bottom']).default('center'),
  highlightColor: z.string().default('#00FF00'),
});

// Audio configuration
const AudioConfigSchema = z.object({
  voice: z.string().default('af_heart'),
  speed: z.number().min(0.5).max(2).default(1),
  music: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.1),
});

// Output configuration
const OutputConfigSchema = z.object({
  resolution: z.object({
    width: z.number().default(1080),
    height: z.number().default(1920),
  }),
  fps: z.number().default(30),
  codec: z.enum(['h264', 'h265', 'vp9']).default('h264'),
  quality: z.number().min(1).max(100).default(80),
});

// Complete video configuration
export const VideoConfigSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(100),
  topic: z.string(),
  scenes: z.array(SceneSchema).min(1).max(20),
  captions: CaptionConfigSchema.default({}),
  audio: AudioConfigSchema.default({}),
  output: OutputConfigSchema.default({}),
  template: z.string().default('default'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type VideoConfig = z.infer<typeof VideoConfigSchema>;
```

### Script Generation Schema

```typescript
const GeneratedScriptSchema = z.object({
  title: z.string().max(100),
  hook: z.string().max(50).describe('First 3 seconds - grab attention'),
  scenes: z
    .array(
      z.object({
        text: z.string().max(200),
        duration: z.number().min(2).max(15),
        visual: z.string().describe('Visual description for asset search'),
        searchTerms: z.array(z.string()).max(5),
      })
    )
    .min(3)
    .max(10),
  cta: z.string().max(100).describe('Call to action'),
  totalDuration: z.number().min(15).max(60),
  metadata: z.object({
    topic: z.string(),
    audience: z.string(),
    tone: z.enum(['educational', 'entertaining', 'promotional']),
    hashtags: z.array(z.string()).max(10),
  }),
});

export type GeneratedScript = z.infer<typeof GeneratedScriptSchema>;
```

---

## Service Architecture

### MCP Server Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP SERVERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   research-mcp (Python :8001)        script-mcp (Python :8002)              │
│   ├── discover_trends                ├── generate_script                    │
│   ├── search_reddit                  ├── refine_script                      │
│   ├── get_youtube_transcripts        └── validate_script                    │
│   └── web_search                                                             │
│                                                                              │
│   audio-mcp (Python :8003)           render-mcp (TypeScript :8004)          │
│   ├── generate_speech                ├── create_project                     │
│   ├── transcribe_audio               ├── add_scene                          │
│   └── get_word_timestamps            ├── render_video                       │
│                                       └── get_render_status                  │
│                                                                              │
│   publish-mcp (Python :8005)         storage-mcp (TypeScript :8006)         │
│   ├── upload_youtube                 ├── upload_file                        │
│   ├── upload_tiktok                  ├── get_signed_url                     │
│   ├── schedule_post                  └── delete_file                        │
│   └── get_analytics                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Definitions

```yaml
# docker-compose.services.yml
services:
  research-mcp:
    build: ./services/research
    ports: ['8001:8001']
    environment:
      - REDDIT_CLIENT_ID
      - TAVILY_API_KEY
      - OPENAI_API_KEY
    depends_on:
      - redis
      - qdrant

  script-mcp:
    build: ./services/script
    ports: ['8002:8002']
    environment:
      - OPENAI_API_KEY
      - LANGFUSE_PUBLIC_KEY
      - LANGFUSE_SECRET_KEY

  audio-mcp:
    build: ./services/audio
    ports: ['8003:8003']
    environment:
      - KOKORO_URL=http://kokoro:8880
    depends_on:
      - kokoro
      - minio

  render-mcp:
    build: ./services/render
    ports: ['8004:8004']
    environment:
      - MINIO_ENDPOINT
      - MINIO_ACCESS_KEY
      - MINIO_SECRET_KEY
    depends_on:
      - minio
      - redis

  publish-mcp:
    build: ./services/publish
    ports: ['8005:8005']
    environment:
      - YOUTUBE_CLIENT_ID
      - YOUTUBE_CLIENT_SECRET
      - TIKTOK_CLIENT_KEY
      - TIKTOK_CLIENT_SECRET

  storage-mcp:
    build: ./services/storage
    ports: ['8006:8006']
    environment:
      - MINIO_ENDPOINT
      - MINIO_ACCESS_KEY
      - MINIO_SECRET_KEY
    depends_on:
      - minio
```

---

## Pipeline Implementation

### End-to-End Flow

```typescript
import { Agent, tool } from '@openai/agents';
import { VideoConfigSchema } from './schemas';

// Create video orchestrator
const videoOrchestrator = new Agent({
  name: 'video-orchestrator',
  model: 'gpt-4o',
  instructions: `You are a video production orchestrator.
    
    Follow this workflow:
    1. Research the topic using discover_trends
    2. Generate a script using generate_script
    3. Generate audio using generate_speech
    4. Get word timestamps using transcribe_audio
    5. Render the video using render_video
    6. Optionally publish using upload_youtube/upload_tiktok
    
    Always validate each step before proceeding.`,
  tools: [
    // Research tools
    tool({
      name: 'discover_trends',
      parameters: z.object({ topic: z.string() }),
      execute: async ({ topic }) => mcpClient.call('research', 'discover_trends', { topic }),
    }),
    // Script tools
    tool({
      name: 'generate_script',
      parameters: z.object({ topic: z.string(), research: z.any() }),
      execute: async (params) => mcpClient.call('script', 'generate_script', params),
    }),
    // Audio tools
    tool({
      name: 'generate_speech',
      parameters: z.object({ text: z.string(), voice: z.string().optional() }),
      execute: async (params) => mcpClient.call('audio', 'generate_speech', params),
    }),
    tool({
      name: 'transcribe_audio',
      parameters: z.object({ audioPath: z.string() }),
      execute: async (params) => mcpClient.call('audio', 'transcribe_audio', params),
    }),
    // Render tools
    tool({
      name: 'render_video',
      parameters: VideoConfigSchema,
      execute: async (config) => mcpClient.call('render', 'render_video', config),
    }),
    // Publish tools
    tool({
      name: 'upload_youtube',
      parameters: z.object({ videoPath: z.string(), metadata: z.any() }),
      execute: async (params) => mcpClient.call('publish', 'upload_youtube', params),
    }),
    tool({
      name: 'upload_tiktok',
      parameters: z.object({ videoPath: z.string(), metadata: z.any() }),
      execute: async (params) => mcpClient.call('publish', 'upload_tiktok', params),
    }),
  ],
});

// Run orchestration
async function createVideo(topic: string): Promise<VideoResult> {
  const result = await videoOrchestrator.run(
    `Create a 60-second TikTok video about: ${topic}
    
    Research trending angles, write an engaging script,
    render with bold captions, and publish to TikTok.`
  );

  return result;
}
```

### Job Queue Implementation

```typescript
import { Queue, Worker, FlowProducer } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);

// Define queues
const queues = {
  research: new Queue('research', { connection }),
  script: new Queue('script', { connection }),
  audio: new Queue('audio', { connection }),
  render: new Queue('render', { connection }),
  publish: new Queue('publish', { connection }),
};

// Flow producer for job dependencies
const flow = new FlowProducer({ connection });

// Create full video job
async function queueVideoJob(topic: string, config: Partial<VideoConfig>): Promise<string> {
  const job = await flow.add({
    name: 'publish',
    queueName: 'publish',
    data: { platforms: config.platforms || ['youtube'] },
    children: [
      {
        name: 'render',
        queueName: 'render',
        data: { template: config.template || 'tiktok-bold' },
        children: [
          {
            name: 'audio',
            queueName: 'audio',
            data: { voice: config.audio?.voice || 'af_heart' },
            children: [
              {
                name: 'script',
                queueName: 'script',
                data: { length: 60 },
                children: [
                  {
                    name: 'research',
                    queueName: 'research',
                    data: { topic, depth: 'deep' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  return job.job.id!;
}

// Workers
const researchWorker = new Worker(
  'research',
  async (job) => {
    const result = await mcpClient.call('research', 'discover_trends', job.data);
    return result;
  },
  { connection }
);

const scriptWorker = new Worker(
  'script',
  async (job) => {
    const research = await job.getChildrenValues();
    const result = await mcpClient.call('script', 'generate_script', {
      ...job.data,
      research: research.research,
    });
    return result;
  },
  { connection }
);

// ... similar workers for audio, render, publish
```

---

## Project Structure

```
content-machine/
├── src/
│   ├── orchestrator/              # OpenAI Agents SDK orchestrator
│   │   ├── agent.ts               # Main orchestrator agent
│   │   ├── tools.ts               # MCP-backed tools
│   │   └── prompts.ts             # System prompts
│   │
│   ├── services/                  # MCP servers
│   │   ├── research/              # Python: trend discovery
│   │   │   ├── main.py
│   │   │   ├── agents.py
│   │   │   └── Dockerfile
│   │   ├── script/                # Python: script generation
│   │   │   ├── main.py
│   │   │   ├── agents.py
│   │   │   └── Dockerfile
│   │   ├── audio/                 # Python: TTS + ASR
│   │   │   ├── main.py
│   │   │   ├── kokoro.py
│   │   │   ├── whisperx.py
│   │   │   └── Dockerfile
│   │   ├── render/                # TypeScript: Remotion
│   │   │   ├── server.ts
│   │   │   ├── compositions/
│   │   │   └── Dockerfile
│   │   ├── publish/               # Python: social media
│   │   │   ├── main.py
│   │   │   ├── youtube.py
│   │   │   ├── tiktok.py
│   │   │   └── Dockerfile
│   │   └── storage/               # TypeScript: MinIO wrapper
│   │       ├── server.ts
│   │       └── Dockerfile
│   │
│   ├── queue/                     # BullMQ job queue
│   │   ├── queues.ts
│   │   ├── workers.ts
│   │   └── flows.ts
│   │
│   ├── api/                       # REST API (Hono)
│   │   ├── server.ts
│   │   ├── routes/
│   │   └── middleware/
│   │
│   ├── db/                        # Database (Drizzle)
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── client.ts
│   │
│   ├── schemas/                   # Zod schemas
│   │   ├── video.ts
│   │   ├── script.ts
│   │   └── index.ts
│   │
│   └── common/                    # Shared utilities
│       ├── config.ts
│       ├── logger.ts
│       └── errors.ts
│
├── remotion/                      # Remotion compositions
│   ├── src/
│   │   ├── Root.tsx
│   │   ├── compositions/
│   │   │   ├── ShortVideo.tsx
│   │   │   ├── Captions.tsx
│   │   │   └── components/
│   │   └── styles/
│   ├── remotion.config.ts
│   └── package.json
│
├── docker/                        # Docker configurations
│   ├── docker-compose.yml         # Full stack
│   ├── docker-compose.dev.yml     # Development
│   └── docker-compose.infra.yml   # Infrastructure only
│
├── docs/                          # Documentation
│   ├── research/
│   │   ├── synthesis/             # This pyramid
│   │   └── deep-dives/            # 86 deep-dives
│   ├── architecture/
│   ├── guides/
│   └── reference/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── tasks/                         # Task tracking
├── scripts/                       # Automation
└── templates/                     # Remotion templates
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Setup TypeScript monorepo structure
- [ ] Configure Drizzle + PostgreSQL schema
- [ ] Setup MinIO, Redis, Qdrant (Docker Compose)
- [ ] Implement core Zod schemas
- [ ] Create basic Hono API server

### Phase 2: Services (Weeks 3-4)

- [ ] Implement research-mcp server
- [ ] Implement script-mcp server
- [ ] Implement audio-mcp server (Kokoro + WhisperX)
- [ ] Setup MCP client for service communication

### Phase 3: Rendering (Weeks 5-6)

- [ ] Setup Remotion project structure
- [ ] Implement ShortVideo composition
- [ ] Integrate remotion-subtitles (caption presets)
- [ ] Implement render-mcp server
- [ ] Add asset pipeline (Pexels integration)

### Phase 4: Orchestration (Weeks 7-8)

- [ ] Implement OpenAI Agents SDK orchestrator
- [ ] Configure BullMQ queues and workers
- [ ] Implement job flow dependencies
- [ ] Add Langfuse tracing

### Phase 5: Publishing (Weeks 9-10)

- [ ] Implement YouTube publisher (Data API)
- [ ] Implement TikTok publisher (Content API)
- [ ] Add publish-mcp server
- [ ] Implement scheduling system

### Phase 6: Polish (Weeks 11-12)

- [ ] E2E testing
- [ ] Documentation
- [ ] Performance optimization
- [ ] Error handling + retry logic
- [ ] Deployment guides

---

## Key Principles

### 1. Product Truthfulness

Videos show **real product UI** when demonstrating products. Never use stock footage to represent product features.

### 2. LLM-First Reasoning

Use LLMs for **decision-making**, not keyword matching. Structured outputs with Zod schemas ensure reliability.

### 3. Configuration-Driven

Videos defined as **JSON configurations** (Vidosy pattern). Templates and styles are configurable, not hardcoded.

### 4. Observable by Default

All LLM calls traced via **Langfuse**. Job status via **BullMQ**. Errors to **Sentry**.

### 5. Graceful Degradation

**Fallback strategies** for all critical paths:

- TTS: Kokoro → EdgeTTS → OpenAI TTS
- LLM: GPT-4o → GPT-4o-mini → Claude
- Assets: Pexels → Unsplash → placeholder

---

## Research Provenance

This architecture synthesizes findings from:

| Layer       | Documents     | Key Sources               |
| ----------- | ------------- | ------------------------- |
| **Layer 4** | 86 deep-dives | All 139 vendored repos    |
| **Layer 3** | 12 categories | A-L category syntheses    |
| **Layer 2** | 4 themes      | Content, Video, AI, Infra |
| **Layer 1** | This document | All above                 |

### Blueprint Repos (Most Influential)

1. **short-video-maker-gyori** - TypeScript + Remotion + MCP + REST pattern
2. **vidosy** - JSON configuration → video paradigm
3. **ShortGPT** - EdgeTTS integration, dubbing workflows
4. **chuk-mcp-remotion** - 51 production Remotion components
5. **captacity** - Caption styling patterns

---

## Synthesis Complete

```
                    ┌───────────────┐
                    │   LAYER 1     │  ← This document
                    │   MASTER      │
                    └───────┬───────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
     ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼─────┐
     │  THEME 1   │  │  THEME 2   │  │ THEME 3-4  │
     │  Content   │  │  Video     │  │ AI + Infra │
     │  Pipeline  │  │ Production │  │            │
     └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
            │               │               │
    ┌───────┴───────┬───────┴───────┬───────┴───────┐
    │               │               │               │
┌───▼───┐  ┌────▼───┐  ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
│ CAT A │  │ CAT B  │  │ CAT C  │  │  ...   │  │ CAT L  │
│ Gen.  │  │ Blue.  │  │ Render │  │        │  │ Pub.   │
└───┬───┘  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘
    │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────┐
│                    86 DEEP DIVES                         │
│              (139 repos analyzed)                        │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Create ADR-001**: Finalize Remotion as rendering engine
2. **Create ADR-002**: Finalize MCP server architecture
3. **Initialize src/ structure**: As defined above
4. **Implement core schemas**: VideoConfig, GeneratedScript
5. **Setup Docker Compose**: Infrastructure stack

---

**Research Complete. Implementation Begins.**

---

_Last Updated: 2026-01-04_
