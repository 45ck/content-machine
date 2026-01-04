# Deep Dive: Captions, Clipping & Rendering Infrastructure

**Created:** 2026-01-02  
**Type:** Research Deep Dive  
**Category:** Video Processing Components

---

## Executive Summary

This document provides comprehensive analysis of caption generation, video clipping, and rendering infrastructure found in the vendor directory. These are critical components for the content-machine pipeline that transforms raw audio/video into polished short-form content.

**Key Findings:**
- **Captions:** WhisperX (70x realtime, word-level, speaker diarization) > Captacity (styled overlays) > auto-subtitle
- **Clipping:** FunClip (LLM-powered) + PySceneDetect (scene detection) for intelligent segmentation
- **Rendering:** Remotion (React) + chuk-motion (51 MCP components) + remotion-subtitles (17 templates)

---

## 1. Caption Generation Tools

### 1.1 WhisperX - Production-Grade ASR

**Repository:** `vendor/captions/whisperx/`  
**Purpose:** Fast, accurate speech recognition with word-level timestamps and speaker diarization  
**Performance:** 70x realtime with large-v2

**Architecture:**
```
Audio Input
    │
    ├── Batched Whisper (faster-whisper backend)
    │   └── Large-v2: <8GB GPU, 70x realtime
    │
    ├── Wav2Vec2 Forced Alignment
    │   └── Word-level timestamps
    │
    └── Pyannote Speaker Diarization
        └── Speaker ID labels
```

**Key Features:**
- **Batched inference:** 70x realtime transcription
- **faster-whisper backend:** <8GB GPU memory for large-v2
- **Word-level timestamps:** Via wav2vec2 alignment
- **Speaker diarization:** Via pyannote-audio
- **VAD preprocessing:** Reduces hallucinations

**Installation:**
```bash
pip install whisperx
```

**Python Usage:**
```python
import whisperx

device = "cuda"
batch_size = 16
compute_type = "float16"

# 1. Transcribe with batched whisper
model = whisperx.load_model("large-v2", device, compute_type=compute_type)
audio = whisperx.load_audio("audio.mp3")
result = model.transcribe(audio, batch_size=batch_size)

# 2. Align for word-level timestamps
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"], 
    device=device
)
result = whisperx.align(
    result["segments"], 
    model_a, 
    metadata, 
    audio, 
    device
)

# 3. Speaker diarization (optional)
from whisperx.diarize import DiarizationPipeline
diarize_model = DiarizationPipeline(use_auth_token=HF_TOKEN, device=device)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)

print(result["segments"])
# Each segment has: text, start, end, words (with timestamps), speaker
```

**Output Format:**
```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Hello world",
      "speaker": "SPEAKER_00",
      "words": [
        {"word": "Hello", "start": 0.0, "end": 0.5},
        {"word": "world", "start": 0.6, "end": 1.0}
      ]
    }
  ]
}
```

**Content-Machine Integration:**
- Primary ASR for all video transcription
- Word-level timestamps for precise caption sync
- Speaker diarization for multi-speaker content
- 70x realtime makes batch processing feasible

### 1.2 Captacity - Styled Caption Overlays

**Repository:** `vendor/captacity/`  
**Purpose:** Add animated captions to videos using Whisper + MoviePy  
**License:** MIT | Install: `pip install captacity`

**Quick Start:**
```bash
# CLI usage
captacity my_short.mp4 my_short_with_captions.mp4

# Python usage
import captacity

captacity.add_captions(
    video_file="my_short.mp4",
    output_file="my_short_with_captions.mp4",
    font="/path/to/font.ttf",
    font_size=130,
    font_color="yellow",
    stroke_width=3,
    stroke_color="black",
    shadow_strength=1.0,
    shadow_blur=0.1,
    highlight_current_word=True,
    word_highlight_color="red",
    line_count=1,
    padding=50,
)
```

**Styling Options:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `font` | System | Path to custom font file |
| `font_size` | 130 | Caption text size |
| `font_color` | yellow | Text color |
| `stroke_width` | 3 | Outline thickness |
| `stroke_color` | black | Outline color |
| `shadow_strength` | 1.0 | Shadow opacity |
| `shadow_blur` | 0.1 | Shadow blur radius |
| `highlight_current_word` | True | Highlight active word |
| `word_highlight_color` | red | Active word color |
| `line_count` | 1 | Max lines per caption |
| `padding` | 50 | Edge padding |

**Whisper Configuration:**
```python
# Force local Whisper
captacity.add_captions(
    video_file="video.mp4",
    output_file="output.mp4",
    use_local_whisper=True,  # Use local model
)

# Install with local whisper
pip install captacity[local_whisper]
```

**Content-Machine Integration:**
- Quick caption overlay for prototyping
- Customizable styling (font, color, stroke)
- Word highlighting for emphasis
- Local or API Whisper support

### 1.3 auto-subtitle - Simple Subtitle Overlay

**Repository:** `vendor/auto-subtitle/`  
**Purpose:** Automatically generate and overlay subtitles using ffmpeg + Whisper

**Installation:**
```bash
pip install git+https://github.com/m1guelpf/auto-subtitle.git
# Requires ffmpeg
```

**Usage:**
```bash
# Basic usage (small model, English)
auto_subtitle /path/to/video.mp4 -o subtitled/

# Larger model for better accuracy
auto_subtitle /path/to/video.mp4 --model medium

# Translate to English
auto_subtitle /path/to/video.mp4 --task translate
```

**Available Models:**
- `tiny`, `tiny.en`
- `base`, `base.en`
- `small`, `small.en` (default)
- `medium`, `medium.en`
- `large`

**Content-Machine Integration:**
- Simplest CLI for quick subtitle generation
- Translation support built-in
- FFmpeg-based overlay

---

## 2. Video Clipping Tools

### 2.1 FunClip - LLM-Powered Video Clipping

**Repository:** `vendor/clipping/FunClip/`  
**Developer:** Alibaba DAMO Academy  
**Purpose:** Open-source, accurate, LLM-enhanced video clipping

**Key Features:**
- **FunASR Paraformer:** Industrial-grade Chinese/English ASR
- **Hotword customization:** SeACo-Paraformer for entity recognition
- **Speaker diarization:** CAM++ model for speaker-based clipping
- **LLM clipping:** GPT/Qwen integration for smart clip selection

**Architecture:**
```
Video Input
    │
    ├── FunASR Paraformer (ASR)
    │   ├── Speech recognition
    │   └── Timestamp prediction
    │
    ├── SeACo-Paraformer (Hotwords)
    │   └── Entity enhancement
    │
    ├── CAM++ (Speaker ID)
    │   └── Speaker diarization
    │
    └── LLM Integration
        ├── Qwen series
        ├── GPT series
        └── Custom prompts
```

**Installation:**
```bash
git clone https://github.com/alibaba-damo-academy/FunClip.git
cd FunClip
pip install -r ./requirements.txt

# For subtitle embedding
apt-get install ffmpeg imagemagick
```

**Gradio Service:**
```bash
python funclip/launch.py
# -l en for English
# -p 7860 for port
```

**Command Line Usage:**
```bash
# Step 1: Recognize
python funclip/videoclipper.py --stage 1 \
    --file video.mp4 \
    --output_dir ./output

# Step 2: Clip by text
python funclip/videoclipper.py --stage 2 \
    --file video.mp4 \
    --output_dir ./output \
    --dest_text '我们把它跟乡村振兴去结合起来' \
    --start_ost 0 \
    --end_ost 100 \
    --output_file './output/res.mp4'
```

**LLM Clipping Workflow:**
1. Run ASR recognition
2. Select LLM model (Qwen/GPT)
3. Click "LLM Inference" → combines prompts with SRT
4. Click "AI Clip" → extracts timestamps from LLM output
5. Customize prompts for specific clip types

**Content-Machine Integration:**
- Industrial-grade Chinese/English ASR
- LLM-powered clip selection
- Speaker-based clipping for podcasts
- Hotword customization for product names

### 2.2 PySceneDetect - Scene Change Detection

**Repository:** `vendor/clipping/pyscenedetect/`  
**Purpose:** Detect scene changes and split videos  
**License:** BSD-3-Clause

**Detection Algorithms:**
| Detector | Use Case |
|----------|----------|
| `ContentDetector` | Fast cuts, color changes |
| `AdaptiveDetector` | Camera movement (two-pass) |
| `ThresholdDetector` | Fade in/out transitions |

**Installation:**
```bash
pip install scenedetect[opencv] --upgrade
# Requires ffmpeg/mkvmerge for splitting
```

**CLI Usage:**
```bash
# Split video on fast cuts
scenedetect -i video.mp4 split-video

# Save frames from each scene
scenedetect -i video.mp4 save-images

# Skip first 10 seconds
scenedetect -i video.mp4 time -s 10s
```

**Python API:**
```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Simple detection
scene_list = detect('video.mp4', ContentDetector())

# Print scenes
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

# Split video
split_video_ffmpeg('video.mp4', scene_list)
```

**Advanced Configuration:**
```python
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector

video = open_video('video.mp4')
scene_manager = SceneManager()
scene_manager.add_detector(ContentDetector(threshold=27.0))
scene_manager.detect_scenes(video, show_progress=True)
scene_list = scene_manager.get_scene_list()
```

**Content-Machine Integration:**
- Pre-process long videos for segmentation
- Identify natural break points
- Combine with FunClip for intelligent clipping
- Batch processing of source videos

---

## 3. Rendering Infrastructure

### 3.1 Remotion - React-Based Video Rendering

**Repository:** `vendor/render/remotion/`  
**Purpose:** Create videos programmatically using React  
**License:** Custom (check for commercial use)

**Core Concept:**
- Video = React components rendered over time
- Each frame = React render at specific time
- Composition = Video definition (dimensions, FPS, duration)

**Project Structure:**
```
my-video/
├── src/
│   ├── Root.tsx          # Entry point
│   ├── Video.tsx         # Main composition
│   ├── Sequence.tsx      # Timed sequences
│   └── components/
├── remotion.config.ts
└── package.json
```

**Basic Composition:**
```tsx
import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={900}  // 30 seconds at 30fps
      fps={30}
      width={1080}
      height={1920}  // 9:16 vertical
    />
  );
};
```

**Sequence Component:**
```tsx
import { useCurrentFrame, useVideoConfig, Sequence } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  return (
    <>
      <Sequence from={0} durationInFrames={90}>
        <TitleScene title="Hook" />
      </Sequence>
      <Sequence from={90} durationInFrames={600}>
        <MainContent />
      </Sequence>
      <Sequence from={690} durationInFrames={210}>
        <CallToAction />
      </Sequence>
    </>
  );
};
```

**Rendering:**
```bash
# Preview
npx remotion preview

# Render to MP4
npx remotion render src/index.tsx MyVideo out/video.mp4

# Render via Lambda (cloud)
npx remotion lambda render
```

### 3.2 remotion-subtitles - Caption Templates

**Repository:** `vendor/render/remotion-subtitles/`  
**Purpose:** SRT parsing + 17 pre-built caption animations  
**License:** MIT

**Installation:**
```bash
npm install remotion-subtitle
```

**Basic Usage:**
```tsx
import { SubtitleSequence } from "remotion-subtitle";
import { TypewriterCaption as Caption } from "remotion-subtitle";
import { useEffect, useState } from "react";
import { useVideoConfig, Audio, staticFile } from "remotion";

export const Subtitles = () => {
  const { fps } = useVideoConfig();
  const [sequences, setSequences] = useState([]);
  const [loaded, setLoaded] = useState(false);
  
  const subtitles = new SubtitleSequence("audio.srt");
  
  useEffect(() => {
    subtitles.ready().then(() => {
      setSequences(subtitles.getSequences(<Caption />, fps));
      setLoaded(true);
    });
  }, []);
  
  return (
    <>
      {loaded && (
        <>
          <Audio src={staticFile("audio.mp3")} />
          {sequences}
        </>
      )}
    </>
  );
};
```

**Available Caption Templates (17):**

| Template | Effect |
|----------|--------|
| `BounceCaption` | Bouncing entrance |
| `ColorfulCaption` | Rainbow color shift |
| `ExplosiveCaption` | Explosive entrance |
| `FadeCaption` | Fade in/out |
| `FireCaption` | Fire effect |
| `GlitchCaption` | Digital glitch |
| `GlowingCaption` | Neon glow |
| `LightningCaption` | Lightning effect |
| `NeonCaption` | Neon sign |
| `RotatingCaption` | 3D rotation |
| `ShakeCaption` | Shake effect |
| `ThreeDishCaption` | 3D depth |
| `TiltShiftCaption` | Tilt-shift blur |
| `TypewriterCaption` | Typing effect |
| `WavingCaption` | Wave motion |
| `ZoomCaption` | Zoom in/out |

**Custom Styling:**
```tsx
subtitles.getSequences(
  <Caption style={{ 
    fontSize: "24px",
    color: "white",
    textShadow: "2px 2px 4px black"
  }} />,
  fps
);
```

### 3.3 chuk-motion - MCP-Powered Video Generation

**Repository:** `vendor/render/chuk-mcp-remotion/`  
**Purpose:** 51 video components with design tokens for AI assistants  
**Tests:** 1471 passing | Coverage: 86%

**Design Token System:**

| Category | Purpose | Examples |
|----------|---------|----------|
| **Colors** | 7 theme palettes | tech, finance, education, lifestyle, gaming, minimal, business |
| **Typography** | Font scales | 720p, 1080p, 4K optimized |
| **Spacing** | Platform margins | LinkedIn, TikTok, Instagram, YouTube |
| **Motion** | Animations | Spring configs, easing curves, durations |

**Platform Safe Margins:**
| Platform | Top | Bottom | Left | Right |
|----------|-----|--------|------|-------|
| LinkedIn | 40px | 40px | 24px | 24px |
| Instagram Stories | 100px | 120px | 24px | 24px |
| TikTok | 100px | 180px | 24px | 80px |
| YouTube | 20px | 20px | 20px | 20px |

**Component Library (51 total):**

**Charts (6):** PieChart, BarChart, HorizontalBarChart, LineChart, AreaChart, DonutChart

**Scenes (2):** TitleScene (4 variants, 5 animations), EndScreen (4 variants)

**Overlays (3):** LowerThird, TextOverlay, SubscribeButton

**Code (3):** CodeBlock, TypingCode, CodeDiff

**Layouts (17):** AsymmetricLayout, Container, DialogueFrame, FocusStrip, Grid, HUDStyle, Mosaic, OverTheShoulder, PerformanceMultiCam, PiP, SplitScreen, StackedReaction, ThreeByThreeGrid, ThreeColumnLayout, ThreeRowLayout, Timeline, Vertical

**Animations (3):** Counter, LayoutEntrance, PanelCascade

**Text Animations (6):** TypewriterText, StaggerText, WavyText, TrueFocus, DecryptedText, FuzzyText

**Demo Realism (4):** BeforeAfterSlider, BrowserFrame, DeviceFrame, Terminal

**Content (5):** DemoBox, ImageContent, StylizedWebPage, VideoContent, WebPage

**Transitions (2):** LayoutTransition, PixelTransition

**MCP Server Usage:**
```bash
# STDIO mode (for Claude Desktop)
python -m chuk_motion.server stdio

# HTTP mode (for testing)
python -m chuk_motion.server http --port 8000
```

**Project Creation:**
```python
# Via MCP tools
remotion_create_project(
    name="my_video",
    theme="tech",
    fps=30,
    width=1920,
    height=1080
)
```

**Content-Machine Integration:**
- MCP server for AI-controlled video generation
- Design tokens for consistent styling
- Platform-aware safe margins
- 51 production-ready components
- Claude Desktop integration

---

## 4. Integration Architecture

### 4.1 Caption Pipeline

```
Audio/Video Input
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                    WhisperX                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Transcribe  │→ │   Align     │→ │  Diarize     │  │
│  │ (batched)   │  │ (wav2vec2)  │  │ (pyannote)   │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              Caption Formatting                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  SRT Gen    │→ │   Style     │→ │  Template    │  │
│  │             │  │ (Captacity) │  │ (remotion-   │  │
│  │             │  │             │  │  subtitles)  │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ▼
   Remotion Render
```

### 4.2 Clipping Pipeline

```
Long-Form Video
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                 Scene Detection                       │
│  ┌─────────────┐                                     │
│  │PySceneDetect│→ Scene boundaries                   │
│  └─────────────┘                                     │
└──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                   FunClip                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │   FunASR    │→ │     LLM     │→ │    Clip      │  │
│  │ Transcribe  │  │  Selection  │  │  Extraction  │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ▼
   Short Clips (15-60s)
```

### 4.3 Rendering Pipeline

```
Content Specification (JSON)
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                 chuk-motion MCP                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │   Theme     │→ │ Components  │→ │   Layout     │  │
│  │  Selection  │  │  Selection  │  │ Generation   │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                    Remotion                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │   React     │→ │   FFmpeg    │→ │    MP4       │  │
│  │  Render     │  │  Encode     │  │   Output     │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 5. Recommendations for content-machine

### 5.1 Caption Stack

| Component | Role | Priority |
|-----------|------|----------|
| **WhisperX** | Primary ASR | Critical |
| **remotion-subtitles** | Caption templates | High |
| **Captacity** | Quick prototyping | Medium |
| **auto-subtitle** | CLI fallback | Low |

### 5.2 Clipping Stack

| Component | Role | Priority |
|-----------|------|----------|
| **FunClip** | LLM-powered clipping | High |
| **PySceneDetect** | Scene segmentation | High |
| **ai-clips-maker** | Speaker-aware crops | Medium |

### 5.3 Rendering Stack

| Component | Role | Priority |
|-----------|------|----------|
| **Remotion** | Video rendering engine | Critical |
| **chuk-motion** | MCP components | High |
| **remotion-subtitles** | Caption animations | High |

---

## 6. Code Examples

### 6.1 Full Caption Pipeline

```python
import whisperx
from pathlib import Path

def generate_captions(audio_path: str, output_srt: str):
    """Generate word-level SRT from audio."""
    device = "cuda"
    
    # Load and transcribe
    model = whisperx.load_model("large-v2", device, compute_type="float16")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16)
    
    # Align for word-level timestamps
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device=device
    )
    result = whisperx.align(result["segments"], model_a, metadata, audio, device)
    
    # Generate SRT
    srt_content = []
    for i, seg in enumerate(result["segments"]):
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        srt_content.append(f"{i+1}\n{start} --> {end}\n{text}\n")
    
    Path(output_srt).write_text("\n".join(srt_content))
    return result

def format_timestamp(seconds: float) -> str:
    """Format seconds to SRT timestamp."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
```

### 6.2 Scene Detection + Clipping

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg
import subprocess

def process_long_video(video_path: str, output_dir: str):
    """Detect scenes and prepare for clipping."""
    
    # 1. Detect scene changes
    scenes = detect(video_path, ContentDetector(threshold=27.0))
    
    print(f"Found {len(scenes)} scenes:")
    for i, scene in enumerate(scenes):
        duration = scene[1].get_seconds() - scene[0].get_seconds()
        print(f"  Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()} ({duration:.1f}s)")
    
    # 2. Filter for short-form candidates (15-60s)
    candidates = [
        scene for scene in scenes
        if 15 <= (scene[1].get_seconds() - scene[0].get_seconds()) <= 60
    ]
    
    # 3. Split video at scene boundaries
    if candidates:
        split_video_ffmpeg(video_path, candidates, output_dir=output_dir)
    
    return candidates
```

### 6.3 Remotion Composition

```tsx
// src/ShortVideo.tsx
import { Composition, Sequence, Audio, Img, staticFile } from 'remotion';
import { SubtitleSequence, TypewriterCaption } from 'remotion-subtitle';

interface VideoProps {
  topic: string;
  script: string;
  audioFile: string;
  srtFile: string;
}

export const ShortVideo: React.FC<VideoProps> = ({
  topic,
  script,
  audioFile,
  srtFile,
}) => {
  const { fps } = useVideoConfig();
  const [subtitles, setSubtitles] = useState([]);
  
  useEffect(() => {
    const subs = new SubtitleSequence(srtFile);
    subs.ready().then(() => {
      setSubtitles(subs.getSequences(<TypewriterCaption />, fps));
    });
  }, [srtFile, fps]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background */}
      <Sequence from={0}>
        <Img src={staticFile('background.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Sequence>
      
      {/* Audio */}
      <Audio src={staticFile(audioFile)} />
      
      {/* Captions */}
      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: 50 }}>
        {subtitles}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Register composition
export const RemotionRoot = () => (
  <Composition
    id="ShortVideo"
    component={ShortVideo}
    durationInFrames={900}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      topic: 'AI Tools',
      script: '...',
      audioFile: 'voice.mp3',
      srtFile: 'captions.srt',
    }}
  />
);
```

---

## References

- [WhisperX Paper](https://arxiv.org/abs/2303.00747)
- [FunASR Documentation](https://github.com/alibaba-damo-academy/FunASR)
- [PySceneDetect Documentation](https://scenedetect.com/docs/)
- [Remotion Documentation](https://www.remotion.dev/docs/)
- [chuk-motion Repository](https://github.com/chrishayuk/chuk-motion)
