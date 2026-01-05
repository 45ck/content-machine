# Deep Dive: Blueprint Analysis - short-video-maker-gyori

> **Document ID:** `blueprint-short-video-maker-gyori-DEEP-20260102`
> **Date:** 2026-01-02
> **Category:** Research Deep Dive (Blueprint)
> **Status:** Complete
> **Priority:** CRITICAL

---

## Executive Summary

`short-video-maker-gyori` is the **primary blueprint** for content-machine. It is a production-ready TypeScript + Remotion + MCP + REST video generation server that demonstrates all the patterns we need.

This document provides a comprehensive analysis of its architecture, components, and integration patterns.

---

## 1. Project Overview

### 1.1 What It Does

| Capability             | Description                      |
| ---------------------- | -------------------------------- |
| **Text-to-Speech**     | Kokoro.js for English TTS        |
| **Automatic Captions** | Whisper.cpp for ASR + timestamps |
| **Background Videos**  | Pexels API search                |
| **Background Music**   | Mood-based selection             |
| **Composition**        | Remotion for video assembly      |
| **Interfaces**         | MCP + REST API + Web UI          |

### 1.2 Core Dependencies

| Dependency  | Version  | License      | Purpose                  |
| ----------- | -------- | ------------ | ------------------------ |
| Remotion    | ^4.0.286 | Custom       | Video composition        |
| Whisper.cpp | v1.5.5   | MIT          | Speech-to-text           |
| FFmpeg      | ^2.1.3   | LGPL         | Audio/video manipulation |
| Kokoro.js   | ^1.2.0   | MIT          | Text-to-speech           |
| Pexels API  | N/A      | Pexels Terms | Background videos        |

### 1.3 System Requirements

- **RAM:** ≥ 3GB (4GB recommended)
- **vCPU:** ≥ 2
- **Disk:** ≥ 5GB
- **Platform:** Ubuntu ≥ 22.04, macOS (Windows NOT supported)

---

## 2. Architecture

### 2.1 High-Level Flow

```
Text Input (scenes)
    ↓
Kokoro.js TTS
    ↓
Whisper.cpp ASR (captions + timestamps)
    ↓
Pexels API (background videos)
    ↓
Remotion Composition
    ↓
FFmpeg Render
    ↓
Video Output
```

### 2.2 Scene Structure

Each video is assembled from multiple **scenes**:

```typescript
interface Scene {
  text: string; // Narration text for TTS
  searchTerms: string[]; // Pexels search keywords
}

// Example
const scenes = [
  {
    text: 'Did you know that AI can now create videos?',
    searchTerms: ['technology', 'computer'],
  },
  {
    text: 'Let me show you how it works.',
    searchTerms: ['demonstration', 'presentation'],
  },
];
```

**Fallback Search Terms:** If no videos found, uses: `nature`, `globe`, `space`, `ocean`

### 2.3 Configuration Options

| Option                   | Description                      | Default    |
| ------------------------ | -------------------------------- | ---------- |
| `paddingBack`            | End screen duration (ms)         | 0          |
| `music`                  | Background music mood            | random     |
| `captionPosition`        | `top`, `center`, `bottom`        | `bottom`   |
| `captionBackgroundColor` | Caption highlight color          | `blue`     |
| `voice`                  | Kokoro voice ID                  | `af_heart` |
| `orientation`            | `portrait`, `landscape`          | `portrait` |
| `musicVolume`            | `low`, `medium`, `high`, `muted` | `high`     |

---

## 3. Docker Deployment

### 3.1 Image Variants

| Variant    | Whisper Model     | Kokoro Model   | Use Case             |
| ---------- | ----------------- | -------------- | -------------------- |
| **tiny**   | `tiny.en`         | `q4` quantized | Limited resources    |
| **normal** | `base.en`         | `fp32`         | Standard use         |
| **cuda**   | `medium.en` (GPU) | `fp32`         | NVIDIA GPU available |

### 3.2 Quick Start

```bash
# Tiny (recommended for most)
docker run -it --rm --name short-video-maker \
  -p 3123:3123 \
  -e LOG_LEVEL=debug \
  -e PEXELS_API_KEY=your_key \
  gyoridavid/short-video-maker:latest-tiny

# With CUDA
docker run -it --rm --name short-video-maker \
  -p 3123:3123 \
  -e PEXELS_API_KEY=your_key \
  --gpus=all \
  gyoridavid/short-video-maker:latest-cuda
```

### 3.3 Docker Compose

```yaml
version: '3'
services:
  short-video-maker:
    image: gyoridavid/short-video-maker:latest-tiny
    environment:
      - LOG_LEVEL=debug
      - PEXELS_API_KEY=your_key
    ports:
      - '3123:3123'
    volumes:
      - ./videos:/app/data/videos # Export videos
    networks:
      - demo # For n8n integration

networks:
  demo:
    external: true
```

---

## 4. REST API

### 4.1 Endpoints Overview

| Method | Endpoint                       | Description           |
| ------ | ------------------------------ | --------------------- |
| GET    | `/health`                      | Health check          |
| POST   | `/api/short-video`             | Create video          |
| GET    | `/api/short-video/{id}/status` | Check status          |
| GET    | `/api/short-video/{id}`        | Download video        |
| GET    | `/api/short-videos`            | List all videos       |
| DELETE | `/api/short-video/{id}`        | Delete video          |
| GET    | `/api/voices`                  | Available TTS voices  |
| GET    | `/api/music-tags`              | Available music moods |

### 4.2 Create Video

```bash
curl -X POST 'localhost:3123/api/short-video' \
  -H 'Content-Type: application/json' \
  -d '{
    "scenes": [
      {
        "text": "Hello world!",
        "searchTerms": ["river"]
      }
    ],
    "config": {
      "paddingBack": 1500,
      "music": "chill",
      "voice": "af_heart",
      "captionPosition": "bottom"
    }
  }'

# Response
{ "videoId": "cma9sjly700020jo25vwzfnv9" }
```

### 4.3 Check Status

```bash
curl 'localhost:3123/api/short-video/cm9ekme790000hysi5h4odlt1/status'

# Response
{ "status": "ready" }  # or "processing", "error"
```

### 4.4 Download Video

```bash
curl 'localhost:3123/api/short-video/cm9ekme790000hysi5h4odlt1' \
  --output video.mp4
```

### 4.5 Available Voices

```json
[
  "af_heart",
  "af_alloy",
  "af_bella",
  "af_jessica",
  "af_nova",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_liam",
  "am_michael",
  "am_onyx",
  "bf_emma",
  "bf_isabella",
  "bm_george",
  "bm_lewis"
]
```

### 4.6 Music Moods

```json
[
  "sad",
  "melancholic",
  "happy",
  "euphoric/high",
  "excited",
  "chill",
  "uneasy",
  "angry",
  "dark",
  "hopeful",
  "contemplative",
  "funny/quirky"
]
```

---

## 5. MCP Server

### 5.1 Server Endpoints

| Endpoint        | Protocol           |
| --------------- | ------------------ |
| `/mcp/sse`      | Server-Sent Events |
| `/mcp/messages` | HTTP Messages      |

### 5.2 Available Tools

```typescript
// Tool 1: Create Short Video
{
  name: "create-short-video",
  description: "Creates a short video from text scenes",
  parameters: {
    scenes: Scene[],     // Array of scenes
    config?: VideoConfig // Optional configuration
  }
}

// Tool 2: Get Video Status
{
  name: "get-video-status",
  description: "Check video generation status",
  parameters: {
    videoId: string
  }
}
```

### 5.3 n8n Integration

```
# Network Configuration Matrix

| n8n Location | Server Location | URL |
|--------------|-----------------|-----|
| Local (n8n start) | Docker local | http://localhost:3123 |
| Docker local | Docker local | http://short-video-maker:3123 (same network) |
| Docker local | npm local | http://host.docker.internal:3123 |
| Cloud | Cloud | http://{YOUR_IP}:3123 |
```

---

## 6. Environment Variables

### 6.1 Configuration

| Variable          | Description    | Default  |
| ----------------- | -------------- | -------- |
| `PEXELS_API_KEY`  | Pexels API key | Required |
| `LOG_LEVEL`       | Logging level  | `info`   |
| `WHISPER_VERBOSE` | Whisper output | `false`  |
| `PORT`            | Server port    | `3123`   |

### 6.2 System Tuning

| Variable                    | Description                | Default                   |
| --------------------------- | -------------------------- | ------------------------- |
| `KOKORO_MODEL_PRECISION`    | `fp32`, `fp16`, `q8`, `q4` | Image-dependent           |
| `CONCURRENCY`               | Remotion browser tabs      | 1 (for limited resources) |
| `VIDEO_CACHE_SIZE_IN_BYTES` | Remotion cache             | 2097152000 (2GB)          |

### 6.3 Advanced

| Variable        | Description        | Default              |
| --------------- | ------------------ | -------------------- |
| `WHISPER_MODEL` | Whisper model size | Image-dependent      |
| `DATA_DIR_PATH` | Data directory     | `/app/data` (Docker) |
| `DOCKER`        | Docker mode        | `true` (Docker)      |
| `DEV`           | Development mode   | `false`              |

---

## 7. Web UI

The project includes a Gradio-like web interface at `http://localhost:3123`:

**Features:**

- Scene editor
- Configuration options
- Video preview
- Status monitoring

---

## 8. Limitations

| Limitation                | Reason               | Workaround                       |
| ------------------------- | -------------------- | -------------------------------- |
| **English only**          | Kokoro.js limitation | Use EdgeTTS for other languages  |
| **Pexels videos only**    | API dependency       | Fork to add custom video sources |
| **No image support**      | Not implemented      | Use Mosaico for image slideshows |
| **No custom video input** | Not implemented      | Fork to add feature              |

---

## 9. Integration Patterns for content-machine

### 9.1 Direct Integration

```typescript
// Use REST API for video generation
async function generateVideo(scenes: Scene[], config: VideoConfig) {
  const response = await fetch('http://localhost:3123/api/short-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes, config }),
  });

  const { videoId } = await response.json();

  // Poll for completion
  let status = 'processing';
  while (status === 'processing') {
    await sleep(2000);
    const statusRes = await fetch(`http://localhost:3123/api/short-video/${videoId}/status`);
    status = (await statusRes.json()).status;
  }

  // Download video
  const videoRes = await fetch(`http://localhost:3123/api/short-video/${videoId}`);
  return videoRes.blob();
}
```

### 9.2 MCP Integration

```typescript
// Connect via MCP client
import { Client } from 'fastmcp';

const client = await Client.connect('http://localhost:3123/mcp/sse');

const result = await client.callTool('create-short-video', {
  scenes: [{ text: 'Hello world!', searchTerms: ['technology'] }],
  config: {
    music: 'chill',
    voice: 'af_heart',
  },
});
```

### 9.3 BullMQ Job Pattern

```typescript
// Queue video generation jobs
import { Queue, Worker } from 'bullmq';

const videoQueue = new Queue('video-generation');

// Add job
await videoQueue.add('render', {
  scenes: [...],
  config: {...}
});

// Process jobs
const worker = new Worker('video-generation', async (job) => {
  const { scenes, config } = job.data;

  // Call short-video-maker API
  const response = await fetch('http://short-video-maker:3123/api/short-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes, config })
  });

  const { videoId } = await response.json();

  // Return video ID for next step
  return { videoId };
});
```

---

## 10. Extending the Blueprint

### 10.1 Adding Custom Video Sources

Fork and modify:

```typescript
// src/services/video-search.ts
async function searchVideos(terms: string[]): Promise<Video[]> {
  // Add custom sources here
  const pexelsResults = await searchPexels(terms);
  const customResults = await searchCustomSource(terms);

  return [...pexelsResults, ...customResults];
}
```

### 10.2 Adding Languages (via EdgeTTS)

```typescript
// Replace Kokoro.js with EdgeTTS for multi-language
import { MsEdgeTTS } from 'msedgetts';

async function generateSpeech(text: string, voice: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, 'audio-24khz-48kbitrate-mono-mp3');

  const audioBuffer = await tts.toStream(text);
  return audioBuffer;
}
```

### 10.3 Adding Product Capture

```typescript
// Extend scenes to support captured content
interface ExtendedScene {
  text: string;
  searchTerms?: string[]; // Pexels search
  capturedVideo?: string; // Path to captured video
  capturedScreenshots?: string[]; // Paths to screenshots
}

// Capture workflow
async function captureProduct(workflow: CaptureWorkflow): Promise<string[]> {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1080, height: 1920 });

  const captures: string[] = [];
  for (const step of workflow.steps) {
    await page.goto(step.url);
    await page.waitForSelector(step.selector);

    const screenshotPath = `captures/${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    captures.push(screenshotPath);
  }

  await browser.close();
  return captures;
}
```

---

## 11. Key Takeaways

### What Works Well

1. **Docker-first deployment** - Reproducible, easy setup
2. **REST + MCP dual interface** - Flexible integration options
3. **Scene-based composition** - Clean content structure
4. **Configuration separation** - Runtime vs system config
5. **Status polling pattern** - Async video generation

### What to Improve for content-machine

1. **Add language support** - Use Kokoro-FastAPI or EdgeTTS
2. **Add custom video sources** - Product captures, custom uploads
3. **Add job queue** - BullMQ for scalability
4. **Add observability** - Langfuse tracing
5. **Add review workflow** - Human approval before publish

### Architecture Decisions to Adopt

| Decision                   | Rationale                       |
| -------------------------- | ------------------------------- |
| TypeScript + Remotion      | Best-in-class video composition |
| MCP server                 | LLM integration ready           |
| REST API                   | Flexibility for non-MCP clients |
| Docker with variants       | Resource optimization           |
| Scene-based model          | Clean content structure         |
| Async generation + polling | Long-running task handling      |

---

## 12. References

- **Repository:** github.com/gyoridavid/short-video-maker
- **YouTube Tutorial:** youtube.com/watch?v=jzsQpn-AciM
- **n8n Workflows:** github.com/gyoridavid/ai_agents_az/tree/main/episode_7
- **Remotion Docs:** remotion.dev/docs
- **Whisper.cpp:** github.com/ggml-org/whisper.cpp
- **Kokoro.js:** npmjs.com/package/kokoro-js

---

_Document generated as part of content-machine research initiative. Last updated: 2026-01-02_
