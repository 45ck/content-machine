# Layer 3 Category B: Blueprint Repositories

**Date:** 2026-01-04  
**Synthesized From:** 4 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 1 - Content Pipeline

---

## Category Summary

Blueprint repositories are production-ready implementations that serve as direct models for content-machine. These repos have the exact stack we want: **TypeScript + Remotion + MCP**.

---

## Primary Blueprint: short-video-maker-gyori

### Why This is Our Model

| Criteria  | short-video-maker-gyori | Alternatives   |
| --------- | ----------------------- | -------------- |
| Language  | TypeScript ✅           | Python         |
| Rendering | Remotion ✅             | MoviePy/FFmpeg |
| API       | MCP + REST ✅           | REST only      |
| TTS       | Kokoro (local) ✅       | API-dependent  |
| ASR       | Whisper.cpp ✅          | Cloud ASR      |
| Docker    | Production-ready ✅     | Missing        |

### Core Architecture

```
src/
├── components/       # Remotion React components
├── server/           # REST + MCP server
├── short-creator/    # Core logic
│   ├── libraries/    # TTS, ASR integrations
│   └── ShortCreator.ts
├── types/            # TypeScript types
└── config.ts
```

### Key APIs

**REST:**

```bash
POST /api/short-video
GET  /api/short-video/{id}/status
GET  /api/short-video/{id}
```

**MCP Tools:**

- `create-short-video`
- `get-video-status`

### Scene Model

```typescript
interface Scene {
  text: string; // Narration
  searchTerms: string[]; // Pexels search
}
```

### Configuration

```typescript
interface VideoConfig {
  paddingBack: number; // End screen duration
  music: string; // Mood tag
  captionPosition: 'top' | 'center' | 'bottom';
  captionBackgroundColor: string;
  voice: string; // Kokoro voice ID
  orientation: 'portrait' | 'landscape';
  musicVolume: 'low' | 'medium' | 'high' | 'muted';
}
```

---

## Secondary Blueprint: Vidosy

### JSON → Video Paradigm

Vidosy represents configuration-driven video generation.

**Core Schema:**

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
    "volume": 0.3
  },
  "scenes": [
    {
      "id": "intro",
      "duration": 5,
      "background": { "type": "video", "value": "bg.mp4" },
      "text": {
        "content": "Welcome",
        "fontSize": 72,
        "color": "#ffffff"
      }
    }
  ]
}
```

### Key Innovation

- **Video as data** - Entire video defined in JSON
- **Composable scenes** - Mix and match
- **Audio layering** - Background + narration
- **Zod validation** - Type-safe schemas

---

## Reference Blueprint: ShortGPT

### Why Important

- **EdgeTTS integration** - 30+ free languages
- **Multi-engine architecture** - Swappable TTS/ASR
- **Dubbing workflow** - Video translation

### TTS Pattern

```python
import edge_tts

async def generate_speech(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio = await communicate.save("output.mp3")
    return audio
```

### Voice Options (EdgeTTS)

- English: `en-US-GuyNeural`, `en-US-JennyNeural`
- Spanish: `es-ES-AlvaroNeural`
- French: `fr-FR-DeniseNeural`
- 30+ more languages

---

## Reference Blueprint: chuk-mcp-remotion (chuk-motion)

### Why Important

- **MCP + Remotion integration**
- **51 production components**
- **Platform-aware safe margins**
- **Design token system**

### Component Library

```typescript
// Available components
'animated-heading';
'caption-sequence';
'countdown';
'floating-icon';
'image-gallery';
'logo-animation';
'particle-overlay';
'progress-bar';
'quote-display';
'social-proof';
'text-reveal';
// ... 40+ more
```

### Platform Configurations

```typescript
const platforms = {
  tiktok: {
    width: 1080,
    height: 1920,
    safeMargin: { top: 150, bottom: 250 },
  },
  instagram: {
    width: 1080,
    height: 1920,
    safeMargin: { top: 120, bottom: 200 },
  },
  youtube: {
    width: 1080,
    height: 1920,
    safeMargin: { top: 100, bottom: 180 },
  },
};
```

### MCP Tools

```typescript
@mcp.tool()
async function createVideoProject(config: ProjectConfig) {
  // Creates Remotion project with components
}

@mcp.tool()
async function addScene(projectId: string, scene: Scene) {
  // Adds scene to project
}

@mcp.tool()
async function renderVideo(projectId: string) {
  // Renders final video
}
```

---

## Patterns to Adopt

### 1. Scene-Based Model

```typescript
// From short-video-maker-gyori
interface Scene {
  text: string;
  searchTerms: string[];
}

// Extended for content-machine
interface ExtendedScene {
  id: string;
  type: 'narration' | 'demo' | 'transition';
  text: string;
  searchTerms?: string[]; // Pexels
  captureWorkflow?: string; // Playwright
  generatedImage?: string; // AI gen
}
```

### 2. Dual API Pattern

```typescript
// REST for flexibility
app.post('/api/video', createVideo);
app.get('/api/video/:id', getVideo);

// MCP for AI agents
mcp.tool('create-video', createVideo);
mcp.tool('get-video', getVideo);
```

### 3. Configuration Separation

```typescript
// System config (environment)
const systemConfig = {
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  WHISPER_MODEL: process.env.WHISPER_MODEL,
};

// Runtime config (per video)
const videoConfig = {
  music: 'chill',
  captionPosition: 'bottom',
  voice: 'af_heart',
};
```

### 4. Docker-First Deployment

```dockerfile
# Multi-stage build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 5. Async Generation + Polling

```typescript
// Create job
const { videoId } = await createVideo(scenes, config);

// Poll for completion
let status = 'processing';
while (status === 'processing') {
  await sleep(2000);
  status = await getStatus(videoId);
}

// Download when ready
const video = await downloadVideo(videoId);
```

---

## What to Extend

### 1. Multi-Language TTS

```typescript
// Add EdgeTTS for non-English
import { MsEdgeTTS } from 'msedgetts';

async function generateSpeech(text: string, voice: string) {
  if (voice.startsWith('af_') || voice.startsWith('am_')) {
    return kokoroTTS(text, voice); // English
  } else {
    return edgeTTS(text, voice); // Other languages
  }
}
```

### 2. Product Capture

```typescript
// Add Playwright capture source
interface CaptureScene extends Scene {
  captureUrl: string;
  captureActions: PlaywrightAction[];
}

async function captureProduct(scene: CaptureScene) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
  });

  await page.goto(scene.captureUrl);

  for (const action of scene.captureActions) {
    await executeAction(page, action);
    await page.screenshot({ path: `frame-${i}.png` });
  }
}
```

### 3. Custom Video Sources

```typescript
// Extend background video sources
async function getBackgroundVideo(scene: Scene) {
  // Priority: captured > custom > Pexels
  if (scene.capturedVideo) {
    return scene.capturedVideo;
  }

  if (scene.customVideoUrl) {
    return downloadVideo(scene.customVideoUrl);
  }

  return searchPexels(scene.searchTerms);
}
```

### 4. Job Queue

```typescript
// Add BullMQ for scalability
import { Queue, Worker } from 'bullmq';

const videoQueue = new Queue('video-generation');

await videoQueue.add('render', { scenes, config });

const worker = new Worker('video-generation', async (job) => {
  return await renderVideo(job.data);
});
```

---

## Key Takeaways

| Blueprint                   | Adopt                                       | Reference  |
| --------------------------- | ------------------------------------------- | ---------- |
| **short-video-maker-gyori** | Architecture, Scene model, MCP+REST, Docker | Primary    |
| **Vidosy**                  | JSON config pattern, Zod schemas            | Config     |
| **ShortGPT**                | EdgeTTS, Multi-language                     | TTS        |
| **chuk-mcp-remotion**       | Component library, Platform awareness       | Components |

---

## Source Documents

- blueprint-short-video-maker-gyori-DEEP
- short-video-maker-gyori-DEEP
- shortgpt-DEEP
- vidosy-DEEP

---

## Key Takeaway

> **short-video-maker-gyori is our primary blueprint. It proves TypeScript + Remotion + MCP + REST works in production. Extend it with Vidosy's JSON config, ShortGPT's EdgeTTS, and chuk-motion's components.**
