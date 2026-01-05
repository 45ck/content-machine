# Deep Dive #50: Master Architecture Synthesis

**Date:** 2026-01-02  
**Category:** Architecture Decision  
**Status:** Complete

---

## Executive Summary

This document synthesizes findings from 49 deep dives and 139+ vendored repositories to provide definitive architecture recommendations for content-machine. It represents the culmination of comprehensive research into short-form video generation.

**Final Stack Decisions:**

1. **Blueprint:** short-video-maker-gyori (TypeScript + Remotion + MCP + REST)
2. **Configuration Pattern:** Vidosy (JSON → Video)
3. **Agent Framework:** Pydantic AI (Python) + OpenAI Agents SDK (TypeScript)
4. **MCP Framework:** FastMCP 2.0
5. **Rendering:** Remotion + remotion-subtitles + chuk-mcp-remotion
6. **ASR:** WhisperX (70x realtime, word-level timestamps)
7. **TTS:** Kokoro-FastAPI (OpenAI-compatible, Apache license)
8. **Clipping:** FunClip (LLM-based) + PySceneDetect
9. **Capture:** Playwright
10. **Queue:** BullMQ (TypeScript) / RQ (Python)
11. **Storage:** MinIO + Qdrant + PostgreSQL
12. **Observability:** Langfuse + Promptfoo
13. **Research:** GPT Researcher + Tavily + Firecrawl
14. **Publishing:** TiktokAutoUploader + YouTube API + Mixpost

---

## Blueprint Analysis: short-video-maker-gyori

### Why This is Our Blueprint

| Criteria         | short-video-maker-gyori | Alternatives         |
| ---------------- | ----------------------- | -------------------- |
| **Language**     | TypeScript ✅           | Python (most others) |
| **Rendering**    | Remotion ✅             | MoviePy, FFmpeg      |
| **API**          | MCP + REST ✅           | REST only            |
| **TTS**          | Kokoro (local) ✅       | API-dependent        |
| **ASR**          | Whisper.cpp (local) ✅  | API-dependent        |
| **Docker**       | Production-ready ✅     | Often missing        |
| **Architecture** | Clean separation ✅     | Often monolithic     |
| **Memory**       | 3GB RAM minimum ✅      | Often higher         |

### Core Architecture

```
short-video-maker-gyori/
├── src/
│   ├── components/       # Remotion React components
│   ├── server/           # REST + MCP server
│   ├── short-creator/    # Core video generation logic
│   │   ├── libraries/    # TTS, ASR integrations
│   │   ├── ShortCreator.ts
│   │   └── music.ts
│   ├── types/            # TypeScript types
│   ├── ui/               # Web UI
│   ├── config.ts         # Configuration
│   └── index.ts          # Entry point
```

### Pipeline Flow

```
Text Input → TTS (Kokoro) → ASR (Whisper) → Captions
                                              ↓
                              Background Video (Pexels) ← Search Terms
                                              ↓
                                      Remotion Render
                                              ↓
                                         Output MP4
```

### API Design (To Adopt)

**REST Endpoint:**

```bash
POST /api/short-video
{
  "scenes": [
    {
      "text": "Hello world!",
      "searchTerms": ["river"]
    }
  ],
  "config": {
    "paddingBack": 1500,
    "music": "chill",
    "captionPosition": "bottom",
    "voice": "af_heart",
    "orientation": "portrait"
  }
}
```

**MCP Tools:**

- `create-short-video` - Creates video with auto-configuration
- `get-video-status` - Check render progress

---

## Configuration Pattern: Vidosy

### JSON → Video Paradigm

Vidosy represents the ideal configuration-driven approach.

**Core Schema:**

```typescript
interface VidosyConfig {
  video: VideoConfig;
  scenes: SceneConfig[];
  audio?: AudioConfig;
  output?: OutputConfig;
}

interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

interface SceneConfig {
  id: string;
  duration: number;
  background?: BackgroundConfig;
  text?: TextConfig;
  audio?: SceneAudioConfig;
}
```

**Example Configuration:**

```json
{
  "video": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "duration": 30
  },
  "audio": {
    "background": "music.mp3",
    "volume": 0.3,
    "fadeIn": 2,
    "fadeOut": 3
  },
  "scenes": [
    {
      "id": "intro",
      "duration": 5,
      "background": { "type": "video", "value": "bg.mp4" },
      "text": {
        "content": "Welcome",
        "fontSize": 72,
        "color": "#ffffff",
        "position": "center"
      },
      "audio": {
        "file": "narration.mp3",
        "volume": 0.9
      }
    }
  ]
}
```

---

## Finalized Component Stack

### Tier 1: Core Pipeline

| Component      | Tool               | Why                                         |
| -------------- | ------------------ | ------------------------------------------- |
| **Rendering**  | Remotion           | React-based, programmable, production-ready |
| **Captions**   | remotion-subtitles | 17 animated styles, SRT parsing             |
| **TTS**        | Kokoro-FastAPI     | Apache license, OpenAI-compatible API       |
| **ASR**        | WhisperX           | 70x realtime, word-level timestamps         |
| **Capture**    | Playwright         | Cross-browser, Microsoft-backed             |
| **MCP Bridge** | chuk-mcp-remotion  | 51 components, platform-aware               |

### Tier 2: Intelligence Layer

| Component             | Tool              | Why                               |
| --------------------- | ----------------- | --------------------------------- |
| **Python Agents**     | Pydantic AI       | FastAPI ergonomics, type-safe     |
| **TypeScript Agents** | OpenAI Agents SDK | Native TypeScript, simple         |
| **MCP Server**        | FastMCP 2.0       | Enterprise auth, production-ready |
| **Structured Output** | Instructor        | LLM → Pydantic models             |
| **Research**          | GPT Researcher    | Autonomous research agent         |
| **Web Search**        | Tavily            | AI-optimized search               |
| **Web Crawl**         | Firecrawl         | URL → clean markdown              |

### Tier 3: Infrastructure

| Component            | Tool       | Why                            |
| -------------------- | ---------- | ------------------------------ |
| **Queue (TS)**       | BullMQ     | Redis-based, TypeScript-native |
| **Queue (Python)**   | RQ         | Simple, Redis-based            |
| **Object Storage**   | MinIO      | S3-compatible, self-hosted     |
| **Vector DB**        | Qdrant     | Rust, fast, production-ready   |
| **Database**         | PostgreSQL | Reliable, well-supported       |
| **Orchestration**    | Temporal   | Durable execution, resilience  |
| **Visual Workflows** | n8n        | 400+ integrations, no-code     |

### Tier 4: Observability & Quality

| Component          | Tool          | Why                   |
| ------------------ | ------------- | --------------------- |
| **LLM Tracing**    | Langfuse      | MIT, self-hostable    |
| **Prompt Eval**    | Promptfoo     | Systematic testing    |
| **Error Tracking** | Sentry        | Industry standard     |
| **Metrics**        | OpenTelemetry | Cross-service tracing |

### Tier 5: Content & Publishing

| Component           | Tool                   | Why                           |
| ------------------- | ---------------------- | ----------------------------- |
| **Clipping**        | FunClip                | LLM-based, Alibaba quality    |
| **Scene Detection** | PySceneDetect          | Accurate, battle-tested       |
| **Video Download**  | yt-dlp                 | 1000+ sites supported         |
| **Reddit**          | reddit-mcp-buddy       | MCP-native, no API key needed |
| **YouTube**         | youtube-transcript-api | Transcripts without browser   |
| **TikTok Upload**   | TiktokAutoUploader     | 3-second uploads              |
| **Multi-Platform**  | Mixpost                | Laravel, social management    |
| **Trends**          | PyTrends               | Google Trends unofficial API  |

---

## content-machine Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONTENT-MACHINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Research   │    │   Planning   │    │   Capture    │          │
│  │              │    │              │    │              │          │
│  │ GPT Researcher│    │ Pydantic AI  │    │  Playwright  │          │
│  │ Tavily       │    │ Instructor   │    │              │          │
│  │ reddit-mcp   │    │              │    │              │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATION (Temporal/BullMQ)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Script     │    │    Audio     │    │    Video     │          │
│  │              │    │              │    │              │          │
│  │ LLM (Claude) │    │ Kokoro TTS   │    │  Remotion    │          │
│  │ Instructor   │    │ WhisperX     │    │  subtitles   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    RENDERING (Remotion)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Review     │    │   Storage    │    │   Publish    │          │
│  │              │    │              │    │              │          │
│  │  Appsmith    │    │    MinIO     │    │ TiktokAuto   │          │
│  │              │    │   Qdrant     │    │ YouTube API  │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY (Langfuse + Sentry)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
content-machine/
├── src/
│   ├── connectors/           # MCP Servers
│   │   ├── reddit/           # Reddit trend research
│   │   ├── youtube/          # YouTube transcript/download
│   │   ├── trends/           # Google Trends
│   │   └── hackernews/       # HN content
│   │
│   ├── planner/              # Content Planning Agent
│   │   ├── agent.ts          # Pydantic AI / OpenAI SDK agent
│   │   ├── prompts/          # System prompts
│   │   └── schemas/          # Zod/Pydantic schemas
│   │
│   ├── capture/              # UI Capture
│   │   ├── playwright/       # Browser automation
│   │   └── recorder/         # Video recording
│   │
│   ├── script/               # Script Generation
│   │   ├── generator/        # LLM script creation
│   │   └── tts/              # Kokoro-FastAPI integration
│   │
│   ├── render/               # Remotion Rendering
│   │   ├── components/       # React video components
│   │   ├── compositions/     # Video compositions
│   │   ├── captions/         # Caption styles
│   │   └── templates/        # Video templates
│   │
│   ├── review/               # Review System
│   │   ├── api/              # Review API
│   │   └── dashboard/        # Appsmith/Budibase config
│   │
│   ├── publish/              # Distribution
│   │   ├── tiktok/           # TiktokAutoUploader
│   │   ├── youtube/          # YouTube API
│   │   └── scheduler/        # Mixpost integration
│   │
│   └── common/               # Shared Code
│       ├── types/            # TypeScript types
│       ├── schemas/          # Zod schemas
│       ├── config/           # Configuration
│       └── utils/            # Utilities
│
├── workers/                  # Background Workers
│   ├── render-worker/        # Video rendering jobs
│   └── publish-worker/       # Publishing jobs
│
├── services/                 # Microservices
│   ├── mcp-server/           # MCP server (FastMCP)
│   ├── rest-api/             # REST API
│   └── queue-processor/      # BullMQ processor
│
├── templates/                # Video Templates
│   ├── short-form/           # TikTok/Reels templates
│   ├── product-demo/         # Product showcase
│   └── explainer/            # Educational content
│
└── infrastructure/           # Deployment
    ├── docker/               # Docker configs
    ├── kubernetes/           # K8s manifests
    └── terraform/            # Cloud infrastructure
```

---

## Key Integration Patterns

### 1. Scene-Based Video Configuration

```typescript
// scenes.schema.ts
import { z } from 'zod';

export const SceneSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['narration', 'demo', 'transition']),
  duration: z.number().min(1).max(60),

  narration: z
    .object({
      text: z.string(),
      voice: z.string().default('af_heart'),
    })
    .optional(),

  visuals: z.object({
    type: z.enum(['capture', 'stock', 'generated']),
    source: z.string(),
    searchTerms: z.array(z.string()).optional(),
  }),

  captions: z.object({
    enabled: z.boolean().default(true),
    style: z.enum(['bounce', 'typewriter', 'fade']).default('bounce'),
    position: z.enum(['top', 'center', 'bottom']).default('bottom'),
  }),
});

export const VideoConfigSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  platform: z.enum(['tiktok', 'reels', 'shorts']),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  scenes: z.array(SceneSchema),
  audio: z.object({
    background: z.string().optional(),
    volume: z.number().min(0).max(1).default(0.3),
  }),
});
```

### 2. MCP Server Pattern

```typescript
// mcp-server.ts
import { FastMCP } from 'fastmcp';

const mcp = new FastMCP('content-machine');

@mcp.tool()
async function createVideo(config: VideoConfig): Promise<{ jobId: string }> {
  const job = await renderQueue.add('render', config);
  return { jobId: job.id };
}

@mcp.tool()
async function getTrends(topic: string): Promise<Trend[]> {
  const reddit = await redditMCP.browse('technology', 'hot', 10);
  const hn = await hnMCP.getFrontPage(10);
  return aggregateTrends(reddit, hn, topic);
}

@mcp.resource('templates://list')
async function listTemplates(): Promise<Template[]> {
  return templates.getAll();
}
```

### 3. Rendering Pipeline

```typescript
// render-pipeline.ts
import { bundle, renderMedia } from '@remotion/bundler';

async function renderVideo(config: VideoConfig): Promise<string> {
  // 1. Generate audio
  const audioPath = await generateTTS(config);

  // 2. Transcribe for captions
  const transcript = await transcribeWhisperX(audioPath);

  // 3. Fetch background videos
  const backgrounds = await fetchBackgrounds(config);

  // 4. Render with Remotion
  const bundled = await bundle('./src/render/index.ts');

  await renderMedia({
    composition: 'ShortVideo',
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: `output/${config.id}.mp4`,
    inputProps: {
      config,
      transcript,
      backgrounds,
      audioPath,
    },
  });

  return `output/${config.id}.mp4`;
}
```

### 4. Publishing Flow

```typescript
// publish-flow.ts
async function publishVideo(videoPath: string, config: PublishConfig) {
  const results = [];

  if (config.platforms.includes('tiktok')) {
    results.push(
      await tiktokUploader.upload({
        video: videoPath,
        title: config.title,
        account: config.tiktokAccount,
      })
    );
  }

  if (config.platforms.includes('youtube')) {
    results.push(
      await youtubeAPI.upload({
        video: videoPath,
        title: config.title,
        description: config.description,
        tags: config.tags,
        visibility: 'public',
      })
    );
  }

  // Log to Mixpost for analytics
  await mixpost.logPublication(results);

  return results;
}
```

---

## Zero-Cost Stack Option

For budget-conscious deployments:

| Component     | Free Option          | Notes               |
| ------------- | -------------------- | ------------------- |
| LLM           | Groq API (free tier) | Or Gemini free tier |
| TTS           | Kokoro (self-hosted) | Apache license      |
| ASR           | WhisperX (local)     | Open source         |
| Images        | Pexels API           | Free, attribution   |
| Search        | DuckDuckGo           | Via Tavily lite     |
| Render        | Remotion             | Open source core    |
| Queue         | Redis (self-hosted)  | Open source         |
| Storage       | MinIO (self-hosted)  | Open source         |
| Observability | Self-hosted Langfuse | MIT license         |

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)

1. ✅ Setup TypeScript project structure
2. ✅ Implement core schemas (Zod)
3. ✅ Setup BullMQ queue
4. ✅ Configure Remotion rendering
5. ✅ Integrate Kokoro TTS
6. ✅ Integrate WhisperX ASR

### Phase 2: Intelligence (Week 3-4)

1. Setup FastMCP server
2. Implement content planning agent
3. Integrate Tavily/Firecrawl for research
4. Build reddit-mcp connector
5. Configure Langfuse observability

### Phase 3: Capture & Templates (Week 5-6)

1. Playwright capture workflows
2. Caption style templates
3. Video templates (product demo, explainer)
4. remotion-subtitles integration

### Phase 4: Review & Publish (Week 7-8)

1. Appsmith review dashboard
2. TiktokAutoUploader integration
3. YouTube API integration
4. Scheduling via Mixpost

---

## Success Metrics

| Metric             | Target       | Tool            |
| ------------------ | ------------ | --------------- |
| Video Render Time  | < 2 minutes  | Langfuse        |
| Caption Accuracy   | > 95% WER    | WhisperX eval   |
| LLM Script Quality | > 4/5 rating | Promptfoo       |
| Publishing Success | > 99%        | Sentry          |
| Cost per Video     | < $0.10      | Custom tracking |

---

## Licensing Considerations

### Safe to Use (MIT/Apache/BSD)

- Remotion (with license for commercial)
- WhisperX
- Kokoro
- FunClip
- Langfuse
- Pydantic AI
- FastMCP
- BullMQ
- Playwright

### Requires Attention

- **Remotion:** Special company license for some use cases
- **yt-dlp:** Check ToS for target sites
- **TiktokAutoUploader:** Unofficial API, may break

### Study Only (High Risk)

- snscrape (ToS violation)
- instaloader (ToS violation)

---

## Conclusion

After analyzing 139+ repositories across 49 deep dives, the recommended architecture for content-machine is:

1. **Blueprint:** Fork/adapt short-video-maker-gyori patterns
2. **Configuration:** Adopt Vidosy JSON-driven approach
3. **Core:** TypeScript + Remotion + Kokoro + WhisperX
4. **Intelligence:** Pydantic AI + FastMCP + Langfuse
5. **Distribution:** TiktokAutoUploader + YouTube API

This stack provides:

- ✅ Fully open-source capability
- ✅ Local processing (no API costs for TTS/ASR)
- ✅ Production-ready architecture
- ✅ Type-safe development
- ✅ Comprehensive observability
- ✅ Multi-platform publishing

---

**Document ID:** DD-050  
**Last Updated:** 2026-01-02  
**Author:** Research Agent  
**Total Research Documents:** 50  
**Repositories Analyzed:** 139+
