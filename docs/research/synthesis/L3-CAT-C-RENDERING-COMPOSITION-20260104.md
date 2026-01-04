# Layer 3 Category C: Rendering & Composition

**Date:** 2026-01-04  
**Synthesized From:** 10 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 2 - Video Production

---

## Category Summary

Rendering and composition tools assemble final videos from audio, visuals, and captions. Our research compared **Remotion**, **MoviePy**, **FFmpeg**, and specialized tools.

---

## Rendering Engine Comparison

| Engine | Language | Flexibility | Speed | Best For |
|--------|----------|-------------|-------|----------|
| **Remotion** | TypeScript/React | Excellent | Medium | Complex compositions |
| **MoviePy** | Python | Good | Medium | Quick scripts |
| **FFmpeg** | CLI | Limited | Fast | Simple assembly |
| **Mosaico** | Python | Excellent | Medium | Declarative video |

---

## Primary Choice: Remotion

### Why Remotion Wins

1. **React-based** - Familiar component model
2. **TypeScript** - Type safety
3. **Programmable** - Full JS/TS control
4. **Animation** - Spring physics, CSS-like
5. **Production-ready** - Used by major companies

### Core Concepts

```typescript
// Composition defines video structure
export const ShortVideo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  return (
    <AbsoluteFill>
      <BackgroundVideo />
      <CaptionOverlay currentFrame={frame} />
    </AbsoluteFill>
  );
};

// Register with Remotion
registerRoot(() => (
  <Composition
    id="ShortVideo"
    component={ShortVideo}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={900} // 30 seconds
  />
));
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| **@remotion/player** | Preview in browser |
| **@remotion/bundler** | Bundle for render |
| **@remotion/renderer** | Headless rendering |
| **@remotion/media-utils** | Audio/video utilities |
| **remotion-subtitles** | 17 caption styles |

### remotion-subtitles Integration

```typescript
import { Caption, CaptionConfig } from 'remotion-subtitles';

// Parse SRT/VTT
const captions = parseSRT(srtContent);

// Render with style
<Caption
  captions={captions}
  config={{
    style: 'bounce',        // 17 styles available
    position: 'bottom',
    fontSize: 80,
    fontColor: '#ffffff',
    highlightColor: '#ff0000'
  }}
/>
```

### Available Caption Styles
- bounce, typewriter, fade, slide
- word-by-word, karaoke, pop
- glow, outline, shadow
- split, stack, wave
- zoom, spin, shake, pulse

---

## chuk-mcp-remotion (chuk-motion)

### 51 Production Components

```typescript
// Component categories
const components = {
  text: ['animated-heading', 'text-reveal', 'quote-display'],
  media: ['image-gallery', 'video-player', 'logo-animation'],
  data: ['progress-bar', 'countdown', 'social-proof'],
  effects: ['particle-overlay', 'floating-icon', 'transition'],
  captions: ['caption-sequence', 'word-highlight', 'karaoke']
};
```

### Design Token System

```typescript
const tokens = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#F59E0B'
  },
  typography: {
    heading: { fontFamily: 'Inter', fontWeight: 700 },
    body: { fontFamily: 'Inter', fontWeight: 400 }
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32
  },
  motion: {
    spring: { stiffness: 100, damping: 15 },
    duration: { short: 150, medium: 300, long: 500 }
  }
};
```

### Platform-Aware Margins

```typescript
const platforms = {
  tiktok: {
    safeTop: 150,     // For username
    safeBottom: 250,  // For description/controls
    safeLeft: 50,
    safeRight: 100    // For buttons
  },
  instagram: {
    safeTop: 120,
    safeBottom: 200
  },
  youtube: {
    safeTop: 100,
    safeBottom: 180
  }
};
```

---

## Mosaico (Python Alternative)

### Declarative Video Composition

```python
from mosaico import Video, Scene, Text, Image, Audio

video = Video(
    width=1080,
    height=1920,
    fps=30
)

video.add_scene(
    Scene(duration=5)
    .add(Image("background.jpg"))
    .add(Text("Hello World", position="center", font_size=72))
    .add(Audio("narration.mp3", volume=0.9))
)

video.add_scene(
    Scene(duration=3)
    .add_transition("fade", duration=0.5)
    .add(Image("next-bg.jpg"))
)

video.render("output.mp4")
```

### When to Use Mosaico
- Python-only environments
- Simple compositions
- Rapid prototyping

---

## FFMPerative (LLM → FFmpeg)

### Natural Language Video Editing

```python
from ffmperative import Agent

agent = Agent()

# Natural language commands
result = agent.execute(
    "Take the first 30 seconds of input.mp4, "
    "add captions from subs.srt, "
    "overlay logo.png in top-right corner, "
    "and export as 1080x1920 at 30fps"
)
```

### How It Works
1. User describes edit in natural language
2. LLM generates FFmpeg command
3. Command is executed
4. Result returned

---

## MoviePy (Python Standard)

### Basic Usage

```python
from moviepy.editor import *

# Create video from images
clips = [ImageClip(img).set_duration(3) for img in images]
video = concatenate_videoclips(clips, method="compose")

# Add audio
audio = AudioFileClip("narration.mp3")
video = video.set_audio(audio)

# Add subtitles
for caption in captions:
    txt = TextClip(
        caption.text,
        fontsize=80,
        color='white',
        stroke_color='black',
        stroke_width=2
    ).set_position('center').set_duration(caption.duration)
    video = CompositeVideoClip([video, txt.set_start(caption.start)])

# Export
video.write_videofile("output.mp4", fps=30, codec="libx264")
```

### Pros
- Simple Python API
- Good for quick scripts
- No React knowledge needed

### Cons
- Slower than FFmpeg
- Less flexible than Remotion
- Memory issues with long videos

---

## FFmpeg (Raw Power)

### Direct FFmpeg Commands

```bash
# Assemble video with captions
ffmpeg -i background.mp4 \
       -i voiceover.mp3 \
       -vf "subtitles=captions.srt:force_style='FontSize=24,Bold=1'" \
       -c:v libx264 -preset fast -crf 22 \
       -c:a aac -b:a 128k \
       -shortest output.mp4
```

### Caption Styling via ASS
```
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,80,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,0,2,10,10,50,1
```

---

## Composition Patterns

### Pattern 1: Layer-Based
```typescript
<AbsoluteFill>
  <Layer z={0}><BackgroundVideo /></Layer>
  <Layer z={1}><Overlay /></Layer>
  <Layer z={2}><Captions /></Layer>
  <Layer z={3}><Logo /></Layer>
</AbsoluteFill>
```

### Pattern 2: Timeline-Based
```typescript
<Sequence from={0} durationInFrames={90}>
  <Scene1 />
</Sequence>
<Sequence from={90} durationInFrames={120}>
  <Scene2 />
</Sequence>
```

### Pattern 3: Configuration-Driven (Vidosy)
```json
{
  "scenes": [
    { "id": "intro", "duration": 5, "template": "title-card" },
    { "id": "content", "duration": 20, "template": "narration" },
    { "id": "outro", "duration": 5, "template": "cta" }
  ]
}
```

---

## Rendering Configuration

### Remotion Render Settings

```typescript
await renderMedia({
  composition: 'ShortVideo',
  serveUrl: bundledPath,
  codec: 'h264',
  outputLocation: 'output.mp4',
  
  // Quality settings
  crf: 18,                    // Lower = better quality
  
  // Performance
  concurrency: 2,             // Parallel browser tabs
  
  // Video config
  scale: 1,
  
  // Audio
  audioBitrate: '128k',
  
  // Progress callback
  onProgress: ({ progress }) => {
    console.log(`${Math.round(progress * 100)}%`);
  }
});
```

### Output Formats

| Platform | Codec | Resolution | FPS | Bitrate |
|----------|-------|------------|-----|---------|
| TikTok | H.264 | 1080x1920 | 30 | 3-5 Mbps |
| Reels | H.264 | 1080x1920 | 30 | 3-5 Mbps |
| Shorts | H.264 | 1080x1920 | 30 | 3-5 Mbps |

---

## Recommendations

### Primary Stack
- **Remotion** for composition
- **remotion-subtitles** for captions
- **chuk-motion components** for UI elements

### Configuration Pattern
- **Vidosy-style JSON** for video definition
- **Zod schemas** for validation
- **Scene-based model** for structure

### Rendering Pipeline
```typescript
// 1. Parse configuration
const config = VideoConfigSchema.parse(input);

// 2. Generate audio
const audioPath = await generateTTS(config.scenes);

// 3. Transcribe for captions
const captions = await transcribeWhisperX(audioPath);

// 4. Bundle Remotion project
const bundled = await bundle('./src/compositions/index.ts');

// 5. Render video
await renderMedia({
  composition: 'ShortVideo',
  serveUrl: bundled,
  codec: 'h264',
  outputLocation: `output/${config.id}.mp4`,
  inputProps: { config, captions, audioPath }
});
```

---

## Source Documents

- DD-44: Rendering + captions + audio
- DD-49: Rendering + captions + clipping
- DD-53: Rendering + MCP ecosystem
- DD-77: Composition ecosystem
- DD-84: Composition infrastructure
- chuk-mcp-remotion-DEEP
- video-editing-rendering-DEEP
- video-rendering-processing-DEEP
- captions-clipping-rendering-DEEP
- render-mcp-orchestration-infrastructure-DEEP

---

## Key Takeaway

> **Remotion is the clear winner for TypeScript-native video composition. Combine with remotion-subtitles for captions and chuk-motion for pre-built components. Use Vidosy-style JSON configuration for flexibility.**
