# Deep Dive: Video Rendering & Processing

**Date:** 2026-01-02  
**Repos:** `vendor/render/*`, `vendor/video-processing/*`, `vendor/storage/*`  
**Priority:** ⭐ CRITICAL - Core video production layer

---

## Executive Summary

Comprehensive analysis of video rendering options (Remotion, MoviePy, FFmpeg) and supporting infrastructure (storage). Remotion is the recommended primary renderer for TypeScript projects, with FFmpeg as the processing backbone.

### Rendering Comparison

| Tool | Language | Type | Captions | Programmatic | Performance |
|------|----------|------|----------|--------------|-------------|
| **Remotion** | TypeScript | React-based | Excellent | ✅ | Medium |
| **MoviePy** | Python | Compositing | Good | ✅ | Medium |
| **FFmpeg** | C/CLI | Low-level | Basic | ⚠️ Complex | Excellent |
| **OpenCV** | Python/C++ | Frame-by-frame | Manual | ⚠️ Complex | Fast |

### Recommendation

1. **Primary:** Remotion for caption-rich short videos
2. **Processing:** FFmpeg for transcoding, cutting, merging
3. **Fallback:** MoviePy for Python-based automation

---

## Remotion (Primary Renderer)

### What is Remotion?

React-based programmatic video creation. Write React components, render as video.

**Key Benefits:**
- TypeScript/React (matches our stack)
- Component-based composition
- Frame-perfect animation control
- Excellent caption support
- Server-side rendering ready

### Caption Libraries

#### remotion-subtitles

**Repo:** `vendor/render/remotion-subtitles/`

**17 Pre-built Caption Styles:**
- `BounceCaption` - Bouncing animation
- `TypewriterCaption` - Character-by-character reveal
- `GlitchCaption` - Digital glitch effect
- `NeonCaption` - Glowing neon style
- `FadeCaption` - Smooth fade in/out
- `FireCaption` - Flame effects
- `WavingCaption` - Wave motion
- `ZoomCaption` - Zoom animation
- `ShakeCaption` - Shake effect
- And more...

**Usage:**
```tsx
import { SubtitleSequence } from "remotion-subtitle";
import { TypewriterCaption as Caption } from "remotion-subtitle";

export const Subtitles = () => {
  const { fps } = useVideoConfig();
  const [sequences, setSequences] = useState([]);
  const [loaded, setLoaded] = useState(false);
  
  let subtitles = new SubtitleSequence("audio.srt");
  
  useEffect(() => {
    subtitles.ready().then(() => {
      setSequences(subtitles.getSequences(<Caption />, fps));
      setLoaded(true);
    });
  }, []);
  
  return loaded && <>{sequences}</>;
};
```

**Custom Styling:**
```tsx
subtitles.getSequences(
  <Caption style={{ 
    fontSize: "4rem", 
    color: "#FFD700",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8)"
  }} />
);
```

### Remotion Templates Collection

**Repo:** `vendor/render/remotion-templates/templates/`

**15 Animation Templates:**
- `animated-list.tsx` - List animations
- `animated-text.tsx` - Text animations
- `bounce-text.tsx` - Bouncing text
- `bubble-pop-text.tsx` - Bubble pop effect
- `card-flip.tsx` - Card flip animation
- `floating-bubble-text.tsx` - Floating bubbles
- `geometric-patterns.tsx` - Geometric backgrounds
- `glitch-text.tsx` - Glitch effect
- `liquid-wave.tsx` - Liquid wave motion
- `matrix-rain.tsx` - Matrix-style rain
- `particle-explosion.tsx` - Particle effects
- `pulsing-text.tsx` - Pulsing animation
- `slide-text.tsx` - Slide in/out
- `sound-wave.tsx` - Audio visualization
- `typewriter-subtitle.tsx` - Typewriter captions

**Typewriter Example:**
```tsx
import { interpolate, useCurrentFrame } from "remotion";

export default function TypewriterSubtitle() {
  const frame = useCurrentFrame();
  const text = "I like typing...";
  
  const visibleCharacters = Math.floor(
    interpolate(frame, [0, 45], [0, text.length], {
      extrapolateRight: "clamp",
    })
  );

  return (
    <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      textAlign: "center",
    }}>
      {text.slice(0, visibleCharacters).split("").map((char, index) => (
        <span key={index} style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "3rem",
          fontWeight: "bold",
          color: "white",
        }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
      {/* Blinking cursor */}
      <span style={{
        fontSize: "3rem",
        color: "#60a5fa",
        opacity: frame % 15 < 7 ? 1 : 0,
      }}>
        ▌
      </span>
    </div>
  );
}
```

### chuk-mcp-remotion (51 Components)

**Repo:** `vendor/render/chuk-mcp-remotion/`

**Full component library with MCP integration:**
- Scene transitions
- Text effects
- Caption styles
- Background generators
- Audio visualizers

(Already documented in separate deep-dive)

---

## MoviePy (Python Alternative)

### What is MoviePy?

Python library for video editing using numpy arrays. Good for automation pipelines.

**Key Features:**
- Read/write all common formats
- Cuts, concatenations, compositing
- Text overlays
- Custom effects via numpy
- Cross-platform

### Basic Usage

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and trim video
clip = (
    VideoFileClip("input.mp4")
    .subclipped(10, 20)  # 10s to 20s
    .with_volume_scaled(0.8)
)

# Add text overlay
txt_clip = (
    TextClip(
        font="Arial.ttf",
        text="Hello there!",
        font_size=70,
        color='white'
    )
    .with_duration(10)
    .with_position('center')
)

# Composite
final = CompositeVideoClip([clip, txt_clip])
final.write_videofile("result.mp4")
```

### Word-Level Caption Pattern

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

def create_word_captions(video_path: str, words: list, output_path: str):
    """
    Create video with word-level captions.
    
    words: [{"word": "Hello", "start": 0.0, "end": 0.5}, ...]
    """
    video = VideoFileClip(video_path)
    width, height = video.size
    
    text_clips = []
    for word_data in words:
        txt = (
            TextClip(
                font="Arial-Bold.ttf",
                text=word_data["word"],
                font_size=int(height * 0.08),
                color="white",
                stroke_color="black",
                stroke_width=3,
            )
            .with_start(word_data["start"])
            .with_end(word_data["end"])
            .with_position(("center", height * 0.75))
        )
        text_clips.append(txt)
    
    final = CompositeVideoClip([video] + text_clips)
    final.write_videofile(output_path, codec="libx264")

# Usage
words = [
    {"word": "Hello", "start": 0.0, "end": 0.3},
    {"word": "world!", "start": 0.4, "end": 0.8},
]
create_word_captions("input.mp4", words, "output.mp4")
```

### 9:16 Vertical Crop Pattern

```python
def crop_to_vertical(video_path: str, output_path: str):
    """Crop video to 9:16 vertical format."""
    video = VideoFileClip(video_path)
    width, height = video.size
    
    # Calculate new dimensions
    new_width = int(height * 9 / 16)
    
    # Center crop
    cropped = video.cropped(
        x_center=width / 2,
        width=new_width
    )
    
    cropped.write_videofile(output_path)
```

### When to Use MoviePy

- Python-based automation pipelines
- Quick prototyping
- Batch processing
- Integration with ML/AI tools
- When TypeScript isn't available

---

## FFmpeg (Processing Backbone)

### What is FFmpeg?

The universal audio/video processing tool. Everything else uses it under the hood.

### Essential Operations

**Trim Video:**
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:20 -c copy output.mp4
```

**Convert to Vertical (9:16):**
```bash
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih" output.mp4
```

**Add Audio:**
```bash
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -shortest output.mp4
```

**Burn Subtitles:**
```bash
ffmpeg -i input.mp4 -vf "subtitles=captions.srt" output.mp4
```

**Extract Audio:**
```bash
ffmpeg -i input.mp4 -vn -acodec mp3 output.mp3
```

**Concatenate Videos:**
```bash
# Create file list
echo "file 'clip1.mp4'" > list.txt
echo "file 'clip2.mp4'" >> list.txt

ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
```

**Generate Thumbnail:**
```bash
ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 thumbnail.jpg
```

### FFmpeg in TypeScript

```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class FFmpegProcessor {
  async trimVideo(input: string, output: string, start: number, end: number) {
    const cmd = `ffmpeg -i "${input}" -ss ${start} -to ${end} -c copy "${output}"`;
    await execAsync(cmd);
  }
  
  async cropToVertical(input: string, output: string) {
    const cmd = `ffmpeg -i "${input}" -vf "crop=ih*9/16:ih" "${output}"`;
    await execAsync(cmd);
  }
  
  async addAudio(video: string, audio: string, output: string) {
    const cmd = `ffmpeg -i "${video}" -i "${audio}" -c:v copy -c:a aac -shortest "${output}"`;
    await execAsync(cmd);
  }
  
  async getDuration(input: string): Promise<number> {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${input}"`;
    const { stdout } = await execAsync(cmd);
    return parseFloat(stdout.trim());
  }
}
```

---

## Storage Solutions

### MinIO (S3-Compatible)

**Repo:** `vendor/storage/minio/`

**What is MinIO?**
S3-compatible object storage. Can replace AWS S3 for local/self-hosted deployments.

**Note:** Now in maintenance mode, but still functional.

**Docker Deployment:**
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=password" \
  minio/minio server /data --console-address ":9001"
```

**TypeScript Client:**
```typescript
import { Client } from "minio";

const minioClient = new Client({
  endPoint: "localhost",
  port: 9000,
  useSSL: false,
  accessKey: "admin",
  secretKey: "password",
});

// Upload video
await minioClient.fPutObject("videos", "output.mp4", "./output.mp4");

// Generate presigned URL
const url = await minioClient.presignedGetObject("videos", "output.mp4", 3600);
```

**Use Cases:**
- Video asset storage
- Rendered video output
- Background video library
- Audio files

### Qdrant (Vector Database)

**Repo:** `vendor/storage/qdrant/`

**What is Qdrant?**
Vector similarity search engine. Store and search embeddings.

**Use Cases for Video Generation:**
- Semantic search for similar content
- Find related Reddit posts
- Match videos to topics
- Content deduplication

**Docker Deployment:**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

**TypeScript Usage:**
```typescript
import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({ url: "http://localhost:6333" });

// Create collection
await client.createCollection("content", {
  vectors: { size: 1536, distance: "Cosine" },
});

// Insert content with embeddings
await client.upsert("content", {
  points: [
    {
      id: "post-123",
      vector: embeddings,
      payload: {
        title: "AI productivity tools",
        source: "reddit",
        score: 1500,
      },
    },
  ],
});

// Semantic search
const results = await client.search("content", {
  vector: queryEmbedding,
  limit: 10,
});
```

---

## Recommended Architecture

### Video Rendering Pipeline

```
Content Source
    ↓
Script Generation (LLM)
    ↓
TTS (Kokoro-FastAPI)
    ↓ Returns: audio + word timestamps
Transcription (WhisperX) - if needed
    ↓
Visual Asset Preparation
    ↓ Background video selection
    ↓ Product screenshots (Playwright)
    ↓ AI-generated images (optional)
    ↓
Remotion Composition
    ↓ JSON config → React components
    ↓ Caption overlay (word-level)
    ↓ Transitions, effects
    ↓
FFmpeg Post-Processing
    ↓ Final encoding
    ↓ Thumbnail generation
    ↓
Output Storage (MinIO)
    ↓
Distribution
```

### Technology Stack

```
Rendering Layer:
├── Remotion (primary video composition)
├── remotion-subtitles (caption styles)
├── remotion-templates (animations)
└── FFmpeg (transcoding, processing)

Storage Layer:
├── MinIO (S3-compatible object storage)
├── Qdrant (semantic search, deduplication)
└── PostgreSQL (metadata, job state)

Processing Layer:
├── BullMQ (job queue)
├── FFmpeg (video processing)
└── WhisperX (transcription fallback)
```

### TypeScript Video Service

```typescript
// src/render/VideoRenderService.ts
import { bundle, renderMedia } from "@remotion/bundler";
import { FFmpegProcessor } from "./FFmpegProcessor";
import { MinIOClient } from "../storage/MinIOClient";

export interface RenderConfig {
  script: string;
  audioPath: string;
  timestamps: WordTimestamp[];
  captionStyle: CaptionStyle;
  backgroundVideo?: string;
}

export class VideoRenderService {
  constructor(
    private ffmpeg: FFmpegProcessor,
    private storage: MinIOClient,
  ) {}
  
  async render(config: RenderConfig): Promise<RenderResult> {
    // 1. Bundle Remotion composition
    const bundled = await bundle({
      entryPoint: "./src/compositions/ShortVideo.tsx",
    });
    
    // 2. Render video
    const outputPath = `/tmp/${crypto.randomUUID()}.mp4`;
    await renderMedia({
      composition: {
        id: "ShortVideo",
        durationInFrames: config.durationFrames,
        fps: 30,
        width: 1080,
        height: 1920,
      },
      serveUrl: bundled,
      outputLocation: outputPath,
      inputProps: {
        script: config.script,
        audioPath: config.audioPath,
        timestamps: config.timestamps,
        captionStyle: config.captionStyle,
      },
    });
    
    // 3. Post-process with FFmpeg (optional)
    const finalPath = await this.ffmpeg.optimize(outputPath);
    
    // 4. Upload to storage
    const storageUrl = await this.storage.upload(finalPath);
    
    // 5. Generate thumbnail
    const thumbnailPath = `/tmp/${crypto.randomUUID()}.jpg`;
    await this.ffmpeg.generateThumbnail(finalPath, thumbnailPath, 2);
    const thumbnailUrl = await this.storage.upload(thumbnailPath);
    
    return {
      videoUrl: storageUrl,
      thumbnailUrl,
      duration: await this.ffmpeg.getDuration(finalPath),
    };
  }
}
```

---

## Performance Considerations

### Remotion Rendering

- **GPU acceleration:** Enabled via Lambda or cloud rendering
- **Parallel rendering:** Split into chunks, merge with FFmpeg
- **Caching:** Cache bundled compositions
- **Memory:** Monitor for large compositions

### FFmpeg Optimization

```bash
# Hardware acceleration (NVIDIA)
ffmpeg -hwaccel cuda -i input.mp4 -c:v h264_nvenc output.mp4

# Multi-threaded
ffmpeg -threads 4 -i input.mp4 output.mp4

# Fast preset (less compression, faster)
ffmpeg -i input.mp4 -preset fast output.mp4
```

### Batch Processing

```typescript
// Use BullMQ for job management
const renderQueue = new Queue("video-render");

// Add jobs
await renderQueue.add("render", { config }, {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
});

// Process
const worker = new Worker("video-render", async (job) => {
  return await videoRenderService.render(job.data.config);
}, { concurrency: 2 });
```

---

## What We Can Use

### Direct Adoption ✅

1. **remotion-subtitles** - 17 caption styles, SRT parsing
2. **remotion-templates** - 15 animation templates
3. **FFmpeg patterns** - Transcoding, cropping, merging
4. **MinIO** - S3-compatible storage
5. **Qdrant** - Semantic content search

### Patterns to Implement 🔧

1. **Remotion composition** for short videos
2. **FFmpeg processing pipeline**
3. **Storage abstraction** (MinIO/S3)
4. **Caption rendering system**
5. **Thumbnail generation**

### Future Consideration 🔮

1. **GPU rendering** for faster output
2. **CDN integration** for video delivery
3. **Adaptive bitrate** for different platforms
4. **Template marketplace** for styles

---

## Lessons Learned

1. **Remotion is excellent** for React developers
2. **FFmpeg is essential** - everything uses it
3. **Word-level timing** requires special handling
4. **9:16 is mandatory** for shorts platforms
5. **Storage matters** - plan for large files
6. **Thumbnails are critical** for engagement
7. **Presets save time** - use templates, don't reinvent

---

**Status:** Research complete. Rendering stack documented.
