# Deep Dive: short-video-maker-gyori

**Date:** 2026-01-02  
**Repo:** `vendor/short-video-maker-gyori/`  
**GitHub:** https://github.com/gyoridavid/short-video-maker  
**Priority:** ⭐ CRITICAL - Primary Blueprint

---

## Executive Summary

**short-video-maker-gyori** is our primary reference implementation. It demonstrates a complete, production-ready TypeScript + Remotion + MCP + REST architecture for automated short-form video generation.

### Why This Matters

This is **exactly** the stack we're targeting:
- ✅ TypeScript
- ✅ Remotion for video composition
- ✅ MCP Server for AI agent integration
- ✅ REST API for flexibility
- ✅ Kokoro TTS (free, local)
- ✅ Whisper for captions
- ✅ Pexels for stock footage
- ✅ Docker deployment ready

---

## Architecture Analysis

### High-Level Flow

```
User/Agent → MCP/REST API → ShortCreator → Pipeline → Rendered Video
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                 Kokoro        Pexels       Whisper
                  (TTS)       (Footage)     (Captions)
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                              Remotion
                            (Composition)
                                  │
                                  ▼
                           FFmpeg (Output)
```

### Core Components

#### 1. Server Layer (`src/server/`)

**server.ts** - Express server with dual-protocol support:
- `/api/*` - REST endpoints
- `/mcp/*` - MCP Server (SSE transport)
- Static file serving for Web UI

```typescript
// Dual-protocol pattern
const apiRouter = new APIRouter(config, shortCreator);
const mcpRouter = new MCPRouter(shortCreator);
this.app.use("/api", apiRouter.router);
this.app.use("/mcp", mcpRouter.router);
```

#### 2. MCP Integration (`src/server/routers/mcp.ts`)

Uses `@modelcontextprotocol/sdk` with SSE transport:

```typescript
this.mcpServer.tool(
  "create-short-video",
  "Create a short video from a list of scenes",
  {
    scenes: z.array(sceneInput),
    config: renderConfig,
  },
  async ({ scenes, config }) => {
    const videoId = await this.shortCreator.addToQueue(scenes, config);
    return { content: [{ type: "text", text: videoId }] };
  },
);
```

**Key Insight:** MCP tools return video IDs, not videos directly. The async pattern with queue is essential for long-running video generation.

#### 3. ShortCreator (`src/short-creator/ShortCreator.ts`)

The orchestration layer:

```typescript
class ShortCreator {
  private queue: { sceneInput: SceneInput[]; config: RenderConfig; id: string }[] = [];
  
  // Queue-based processing
  public addToQueue(sceneInput: SceneInput[], config: RenderConfig): string {
    const id = cuid();
    this.queue.push({ sceneInput, config, id });
    if (this.queue.length === 1) {
      this.processQueue();
    }
    return id;
  }
}
```

**Key Insight:** Video generation is queued, not parallel. Prevents OOM errors with Remotion.

#### 4. Pipeline Steps

For each scene:
1. **TTS** (Kokoro) → Generate audio from text
2. **Normalize** (FFmpeg) → Normalize audio
3. **Transcribe** (Whisper) → Generate word-level captions
4. **Footage** (Pexels) → Find background video
5. **Render** (Remotion) → Compose final video

```typescript
// Scene processing loop
for (const scene of inputScenes) {
  const audio = await this.kokoro.generate(scene.text, config.voice);
  await this.ffmpeg.saveNormalizedAudio(audioStream, tempWavPath);
  const captions = await this.whisper.CreateCaption(tempWavPath);
  const video = await this.pexelsApi.findVideo(scene.searchTerms, audioLength, excludeVideoIds, orientation);
  // ... download and add to scenes array
}
```

---

## Type System (Zod Schemas)

### Scene Input Schema

```typescript
const sceneInput = z.object({
  text: z.string().describe("Text to be spoken in the video"),
  searchTerms: z.array(z.string()).describe(
    "Search term for video, 1 word, and at least 2-3 search terms should be provided"
  ),
});
```

### Render Config Schema

```typescript
const renderConfig = z.object({
  paddingBack: z.number().optional(), // End padding in ms
  music: z.nativeEnum(MusicMoodEnum).optional(),
  captionPosition: z.nativeEnum(CaptionPositionEnum).optional(),
  captionBackgroundColor: z.string().optional(),
  voice: z.nativeEnum(VoiceEnum).optional(),
  orientation: z.nativeEnum(OrientationEnum).optional(),
  musicVolume: z.nativeEnum(MusicVolumeEnum).optional(),
});
```

**Key Insight:** All configuration is Zod-validated. This enables type-safe MCP tools and REST endpoints.

---

## Component Libraries

### Kokoro TTS (`libraries/Kokoro.ts`)

```typescript
async generate(text: string, voice: Voices): Promise<{ audio: ArrayBuffer; audioLength: number }> {
  const splitter = new TextSplitterStream();
  const stream = this.tts.stream(splitter, { voice });
  splitter.push(text);
  splitter.close();
  
  const output = [];
  for await (const audio of stream) {
    output.push(audio);
  }
  // Merge audio buffers...
}
```

**Limitation:** Kokoro only supports English. For multi-language, we need EdgeTTS from ShortGPT.

### Whisper Integration (`libraries/Whisper.ts`)

Uses Remotion's `@remotion/install-whisper-cpp`:

```typescript
const { transcription } = await transcribe({
  model: this.config.whisperModel,
  whisperPath: this.config.whisperInstallPath,
  inputPath: audioPath,
  tokenLevelTimestamps: true,
});
```

**Key Insight:** Word-level timestamps via `tokenLevelTimestamps: true`. Essential for animated captions.

### Remotion Rendering (`libraries/Remotion.ts`)

```typescript
async render(data: z.infer<typeof shortVideoSchema>, id: string, orientation: OrientationEnum) {
  const composition = await selectComposition({
    serveUrl: this.bundled,
    id: component,
    inputProps: data,
  });

  await renderMedia({
    codec: "h264",
    composition,
    serveUrl: this.bundled,
    outputLocation,
    inputProps: data,
    concurrency: this.config.concurrency,
    offthreadVideoCacheSizeInBytes: this.config.videoCacheSizeInBytes,
  });
}
```

**Key Insight:** `concurrency` and `videoCacheSizeInBytes` are critical for memory management.

---

## Configuration Patterns

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PEXELS_API_KEY` | Pexels API key | Required |
| `KOKORO_MODEL_PRECISION` | Model size (`fp32`, `q4`, etc) | Varies by Docker image |
| `WHISPER_MODEL` | Whisper model size | `medium.en` |
| `CONCURRENCY` | Remotion parallel tabs | 1 |
| `VIDEO_CACHE_SIZE_IN_BYTES` | Video cache size | 2GB |

### Docker Variants

| Image | Whisper | Kokoro | Use Case |
|-------|---------|--------|----------|
| `latest-tiny` | tiny.en | q4 | Low memory (3GB) |
| `latest` | base.en | fp32 | Standard |
| `latest-cuda` | medium.en | fp32 | GPU acceleration |

---

## API Surface

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/short-video` | POST | Create new video |
| `/api/short-video/{id}/status` | GET | Check status |
| `/api/short-video/{id}` | GET | Download video |
| `/api/short-videos` | GET | List all videos |
| `/api/short-video/{id}` | DELETE | Delete video |
| `/api/voices` | GET | List available voices |
| `/api/music-tags` | GET | List music moods |

### MCP Tools

| Tool | Description |
|------|-------------|
| `create-short-video` | Create video from scenes |
| `get-video-status` | Check video status |

---

## What We Can Adopt

### Direct Adoption ✅

1. **Server architecture** - Express + MCP + REST pattern
2. **Queue-based processing** - Prevents OOM
3. **Zod schemas** - Type-safe configuration
4. **Remotion rendering** - Video composition
5. **Whisper integration** - Caption generation

### Needs Extension 🔧

1. **TTS** - Add EdgeTTS for multi-language (from ShortGPT)
2. **Content sources** - Add beyond Pexels (custom assets, Unsplash)
3. **Caption styles** - More animation options (from captacity)
4. **Scene abstraction** - Add vidosy's JSON config pattern

### Gaps to Fill 📋

1. **No product capture** - Playwright integration needed
2. **No trend research** - Reddit/HN MCP connectors needed
3. **No review workflow** - Approval dashboard needed
4. **No upload automation** - Distribution automation needed

---

## Code Quality Assessment

### Strengths

- Clean TypeScript with proper types
- Zod validation throughout
- Docker-ready with multiple variants
- Tests exist (`ShortCreator.test.ts`, `Pexels.test.ts`)
- Good error handling with pino logger

### Weaknesses

- Limited test coverage
- No e2e tests
- Hardcoded music files
- English-only TTS

---

## Integration Points

### How We Would Integrate

```
content-machine/
├── src/
│   ├── server/           # Adopt from short-video-maker-gyori
│   ├── render/           # Adopt from short-video-maker-gyori
│   ├── caption/          # Adopt + extend with captacity patterns
│   ├── tts/              # Extend with EdgeTTS
│   ├── capture/          # NEW: Playwright integration
│   ├── research/         # NEW: Reddit/HN MCP
│   └── planning/         # NEW: LangGraph orchestration
```

---

## Lessons Learned

1. **MCP + REST dual-protocol is the right pattern** - Agents use MCP, everything else uses REST
2. **Queue-based processing is essential** - Video generation is resource-intensive
3. **Zod schemas enable type-safe MCP tools** - Schema → JSON Schema → MCP Tool
4. **Memory management is critical** - Docker images tuned for different resource constraints
5. **Word-level timestamps require special handling** - Whisper's `tokenLevelTimestamps`

---

## Next Steps

1. [ ] Study Remotion composition code in `src/components/`
2. [ ] Extract video schema patterns
3. [ ] Compare with vidosy's JSON config approach
4. [ ] Plan EdgeTTS integration
5. [ ] Design product capture extension

---

**Status:** Research complete. Ready for adoption planning.
