# Layer 2 Theme 2: Video Production

**Date:** 2026-01-04  
**Synthesized From:** Categories C, D, E, F  
**Layer:** 2 (Theme Synthesis)  
**Feeds Into:** Layer 1 Master Architecture

---

## Theme Summary

The **Video Production** theme covers how scripts become videos: **rendering**, **clipping**, **captions**, and **audio**. This synthesizes the technical core of video generation.

---

## Production Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VIDEO PRODUCTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Script                                                                  │
│    │                                                                     │
│    ├──────────────┬──────────────┬──────────────┐                       │
│    ▼              ▼              ▼              │                       │
│ ┌──────┐    ┌──────────┐   ┌──────────┐        │                       │
│ │ TTS  │    │  Asset   │   │  Scene   │        │                       │
│ │Audio │    │  Fetch   │   │Detection │        │                       │
│ └──┬───┘    └────┬─────┘   └────┬─────┘        │                       │
│    │             │              │               │                       │
│    ▼             ▼              ▼               │                       │
│ ┌──────────────────────────────────────────────┴──────┐                │
│ │                      RENDER                          │                │
│ │              (Remotion + Captions)                   │                │
│ └──────────────────────────────────────────────────────┘                │
│                           │                                              │
│                           ▼                                              │
│                       Video.mp4                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TTS (Text-to-Speech)

### Technology Selection

| Technology | Quality | Speed | Cost | Languages |
|------------|---------|-------|------|-----------|
| **Kokoro** | ★★★★★ | Fast | Free | EN only |
| **EdgeTTS** | ★★★★☆ | Fast | Free | 30+ |
| **ElevenLabs** | ★★★★★ | Medium | $$$ | Multi |
| **OpenAI TTS** | ★★★★★ | Medium | $$ | Multi |

### Primary: Kokoro-FastAPI

```python
from kokoro_fastapi import KokoroClient

client = KokoroClient("http://localhost:8880")

# Generate speech
audio = await client.generate(
    text="Hello, this is an AI-generated video about technology trends.",
    voice="af_heart",  # American female
    speed=1.0
)

# Save to file
with open("audio.wav", "wb") as f:
    f.write(audio)
```

### Fallback: EdgeTTS (Multi-language)

```python
import edge_tts

async def generate_audio(text: str, language: str = "en") -> bytes:
    voice = VOICE_MAP.get(language, "en-US-AriaNeural")
    
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    
    return audio_data

VOICE_MAP = {
    "en": "en-US-AriaNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "ja": "ja-JP-NanamiNeural",
    "zh": "zh-CN-XiaoxiaoNeural"
}
```

---

## Captions (Transcription)

### Technology Selection

| Technology | Speed | Accuracy | Word-Level | Diarization |
|------------|-------|----------|------------|-------------|
| **WhisperX** | 70x RT | ★★★★★ | ✅ | ✅ |
| **faster-whisper** | 4x RT | ★★★★★ | ✅ | ❌ |
| **Whisper.cpp** | 2x RT | ★★★★☆ | ✅ | ❌ |

### Primary: WhisperX

```python
import whisperx

def transcribe_with_timestamps(audio_path: str) -> list[dict]:
    # Load model
    model = whisperx.load_model("large-v3", device="cuda", compute_type="float16")
    
    # Transcribe
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16)
    
    # Align for word-level timestamps
    model_a, metadata = whisperx.load_align_model(language_code="en", device="cuda")
    result = whisperx.align(result["segments"], model_a, metadata, audio, device="cuda")
    
    # Return word-level data
    words = []
    for segment in result["segments"]:
        for word in segment.get("words", []):
            words.append({
                "text": word["word"],
                "start": word["start"],
                "end": word["end"],
                "confidence": word.get("score", 1.0)
            })
    
    return words
```

### Caption Styling (17 Presets)

```typescript
import { CaptionPreset } from '@remotion/captions';

const CAPTION_PRESETS = {
  'tiktok-bold': {
    fontSize: 80,
    fontFamily: 'Montserrat',
    fontWeight: 900,
    color: 'white',
    strokeWidth: 8,
    strokeColor: 'black',
    backgroundColor: 'transparent',
    highlightColor: '#00FF00',
    position: 'center'
  },
  'youtube-shorts': {
    fontSize: 60,
    fontFamily: 'Inter',
    fontWeight: 700,
    color: 'white',
    strokeWidth: 4,
    strokeColor: 'black',
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'bottom'
  },
  'minimal': {
    fontSize: 48,
    fontFamily: 'SF Pro',
    fontWeight: 500,
    color: 'white',
    strokeWidth: 0,
    backgroundColor: 'transparent',
    position: 'bottom'
  }
};
```

---

## Rendering (Remotion)

### Technology Selection

| Technology | Type | Language | Flexibility | Performance |
|------------|------|----------|-------------|-------------|
| **Remotion** | React | TypeScript | ★★★★★ | ★★★★☆ |
| **MoviePy** | Script | Python | ★★★☆☆ | ★★★☆☆ |
| **FFmpeg** | CLI | Any | ★★★★★ | ★★★★★ |
| **Mosaico** | React | TypeScript | ★★★★☆ | ★★★★☆ |

### Primary: Remotion

```typescript
import { Composition } from 'remotion';
import { ShortVideo } from './compositions/ShortVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={1800}  // 60s at 30fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        scenes: [],
        audioPath: '',
        captionStyle: 'tiktok-bold'
      }}
    />
  );
};
```

### Scene Composition

```typescript
import { AbsoluteFill, Audio, Sequence, Img, useCurrentFrame } from 'remotion';
import { Captions } from '@remotion/captions';

interface ShortVideoProps {
  scenes: Scene[];
  audioPath: string;
  captionStyle: string;
  words: Word[];
}

export const ShortVideo: React.FC<ShortVideoProps> = ({
  scenes,
  audioPath,
  captionStyle,
  words
}) => {
  let currentFrame = 0;
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Audio track */}
      <Audio src={audioPath} />
      
      {/* Scene backgrounds */}
      {scenes.map((scene, i) => {
        const startFrame = currentFrame;
        const duration = Math.round(scene.duration * 30);
        currentFrame += duration;
        
        return (
          <Sequence key={i} from={startFrame} durationInFrames={duration}>
            <SceneBackground scene={scene} />
          </Sequence>
        );
      })}
      
      {/* Captions overlay */}
      <Captions
        words={words}
        style={CAPTION_PRESETS[captionStyle]}
      />
    </AbsoluteFill>
  );
};
```

### chuk-mcp-remotion Components

```typescript
// 51 pre-built components
import {
  AnimatedHeading,
  CaptionSequence,
  Countdown,
  FloatingIcon,
  ImageGallery,
  LogoAnimation,
  ParticleOverlay,
  ProgressBar,
  QuoteDisplay,
  SocialProof,
  TextReveal,
  VideoPlayer
} from '@chuk/mcp-remotion';

const PromoVideo = () => (
  <AbsoluteFill>
    <LogoAnimation src="/logo.png" duration={2} />
    <Sequence from={60}>
      <AnimatedHeading text="Welcome to AI" style="typewriter" />
    </Sequence>
    <Sequence from={120}>
      <CaptionSequence words={words} style="tiktok-bold" />
    </Sequence>
    <ParticleOverlay type="confetti" />
  </AbsoluteFill>
);
```

---

## Asset Pipeline

### Stock Footage

```typescript
interface AssetService {
  search(query: string): Promise<Asset[]>;
  download(asset: Asset): Promise<string>;
}

class PexelsService implements AssetService {
  async search(query: string): Promise<Asset[]> {
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${query}&per_page=5`,
      { headers: { Authorization: process.env.PEXELS_API_KEY! } }
    );
    const data = await response.json();
    
    return data.videos.map(v => ({
      id: v.id,
      url: v.video_files[0].link,
      thumbnail: v.image,
      duration: v.duration,
      type: 'video'
    }));
  }
  
  async download(asset: Asset): Promise<string> {
    const response = await fetch(asset.url);
    const buffer = await response.arrayBuffer();
    const path = `assets/${asset.id}.mp4`;
    await fs.writeFile(path, Buffer.from(buffer));
    return path;
  }
}
```

### Scene Detection (for source video clipping)

```python
from scenedetect import detect, ContentDetector

def detect_scenes(video_path: str) -> list[tuple[float, float]]:
    """Detect scene boundaries in a video."""
    scene_list = detect(video_path, ContentDetector(threshold=27.0))
    
    return [
        (scene[0].get_seconds(), scene[1].get_seconds())
        for scene in scene_list
    ]
```

---

## Render Service

### MCP Interface

```typescript
@mcp.tool()
async function render_video(config: VideoConfig): Promise<RenderResult> {
  // 1. Prepare assets
  const assets = await assetService.prepareAssets(config.scenes);
  
  // 2. Generate audio
  const audioPath = await ttsService.generate(
    config.scenes.map(s => s.text).join(' '),
    config.voice
  );
  
  // 3. Get word timestamps
  const words = await whisperService.transcribe(audioPath);
  
  // 4. Render with Remotion
  const outputPath = await remotionService.render({
    composition: 'ShortVideo',
    props: {
      scenes: config.scenes,
      audioPath,
      words,
      captionStyle: config.captionStyle
    },
    outputPath: `output/${config.id}.mp4`
  });
  
  // 5. Upload to storage
  const storageKey = await storage.upload(outputPath);
  
  return {
    videoPath: outputPath,
    storageKey,
    duration: config.scenes.reduce((acc, s) => acc + s.duration, 0)
  };
}
```

### Remotion CLI Wrapper

```typescript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

async function renderWithRemotions(config: RenderConfig): Promise<string> {
  // Bundle the composition
  const bundled = await bundle({
    entryPoint: './src/index.ts',
    webpackOverride: (config) => config
  });
  
  // Select composition
  const composition = await selectComposition({
    serveUrl: bundled,
    id: config.composition,
    inputProps: config.props
  });
  
  // Render
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: config.outputPath,
    inputProps: config.props
  });
  
  return config.outputPath;
}
```

---

## Quality Pipeline

### Video Quality Checks

```typescript
interface QualityCheck {
  name: string;
  check(video: VideoFile): Promise<boolean>;
}

const qualityChecks: QualityCheck[] = [
  {
    name: 'duration',
    check: async (video) => {
      const duration = await getVideoDuration(video.path);
      return duration >= 15 && duration <= 60;
    }
  },
  {
    name: 'resolution',
    check: async (video) => {
      const { width, height } = await getVideoResolution(video.path);
      return width === 1080 && height === 1920;  // 9:16
    }
  },
  {
    name: 'audio-levels',
    check: async (video) => {
      const levels = await analyzeAudioLevels(video.path);
      return levels.peak > -6 && levels.peak < -1;  // -6dB to -1dB
    }
  },
  {
    name: 'captions-visible',
    check: async (video) => {
      // Sample frames and check caption visibility
      const frames = await extractFrames(video.path, [5, 15, 30, 45]);
      return frames.every(f => detectCaptions(f));
    }
  }
];

async function validateVideo(video: VideoFile): Promise<ValidationResult> {
  const results = await Promise.all(
    qualityChecks.map(async check => ({
      name: check.name,
      passed: await check.check(video)
    }))
  );
  
  return {
    passed: results.every(r => r.passed),
    checks: results
  };
}
```

---

## Key Decisions

### 1. TTS Selection

**Decision:** Kokoro (primary) + EdgeTTS (fallback)
**Rationale:** Kokoro is highest quality free TTS; EdgeTTS covers 30+ languages
**Trade-off:** English-only for best quality, multi-language at slight quality cost

### 2. Caption Technology

**Decision:** WhisperX for transcription, remotion-subtitles for rendering
**Rationale:** 70x realtime with word-level alignment; 17 caption presets
**Trade-off:** GPU required for best performance

### 3. Rendering Engine

**Decision:** Remotion as primary renderer
**Rationale:** React-based, TypeScript native, extensive ecosystem
**Trade-off:** Requires bundling step; slower than direct FFmpeg

### 4. Asset Pipeline

**Decision:** Pexels/Unsplash for stock, S3 for storage
**Rationale:** Free APIs with good quality; MinIO for self-hosted S3
**Trade-off:** API rate limits; need caching layer

---

## Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│                    VIDEO PRODUCTION                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   Kokoro    │     │  WhisperX   │     │  Remotion   │      │
│  │    TTS      │────▶│  Captions   │────▶│   Render    │─────▶│
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│     WAV/MP3            Word JSON           MP4 Video          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PUBLISHING    │
                    │   (Theme 4)     │
                    └─────────────────┘
```

---

## Source Categories

- **Category C:** 10 rendering/composition deep-dives
- **Category D:** 9 clipping/detection deep-dives
- **Category E:** 5 caption/transcription deep-dives
- **Category F:** 4 TTS/audio deep-dives

---

## Key Takeaway

> **Video production flows: TTS (Kokoro) → Transcribe (WhisperX) → Render (Remotion). Use chuk-mcp-remotion for 51 pre-built components. remotion-subtitles for 17 caption styles. Pexels for stock footage. Quality checks before publishing.**
