# Deep Dive #84: Video Composition & Rendering Infrastructure

**Date:** 2026-01-02
**Category:** Render Pipeline
**Priority:** CRITICAL - Core Rendering Stack

---

## Executive Summary

This deep dive analyzes the video composition and rendering tools in vendor/, covering programmatic video generation from multiple angles: MCP-powered Remotion orchestration (chuk-motion), Python video composition (Mosaico, MoviePy), animated caption templates (remotion-subtitles), LLM-driven FFmpeg automation (FFMPerative), CapCut draft automation (capcut-mate), and cloud rendering services (JSON2Video, Plainly). The analysis reveals a rich ecosystem enabling content-machine to implement flexible rendering strategies from local Remotion to cloud-based After Effects pipelines.

---

## 1. MCP-Powered Remotion: chuk-motion

### Architecture Overview

**chuk-motion** represents the most sophisticated MCP-to-Remotion bridge, implementing a design-system-first approach with comprehensive component libraries and token-based theming.

```
chuk-motion Architecture:
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server (Python)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Design System Tokens                                   ││
│  │  ┌──────────┬──────────┬──────────┬──────────┐         ││
│  │  │ Colors   │Typography│ Spacing  │ Motion   │         ││
│  │  │ 7 themes │ 3 scales │ margins  │ springs  │         ││
│  │  │ dark/lit │ 720-4K   │ platform │ easing   │         ││
│  │  └──────────┴──────────┴──────────┴──────────┘         ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  51 Video Components                                    ││
│  │  Charts(6) │ Scenes(2) │ Overlays(3) │ Code(3)         ││
│  │  Layouts(17)│ Animations(3) │ TextAnims(6) │ Demo(4)   ││
│  │  Content(5)│ Transitions(2)                             ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Track-Based Timeline                                   ││
│  │  main(layer 0) → overlay(layer 10) → bg(layer -10)     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Remotion Project (TypeScript)             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Generated <Composition /> Components                   ││
│  │  npm start → Preview │ npm run build → MP4             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Platform Safe Margins System

Critical for social media compliance:

| Platform              | Top   | Bottom | Left | Right | Notes              |
| --------------------- | ----- | ------ | ---- | ----- | ------------------ |
| **LinkedIn Feed**     | 40px  | 40px   | 24px | 24px  | 8-24px safe zone   |
| **Instagram Stories** | 100px | 120px  | 24px | 24px  | UI overlays        |
| **TikTok**            | 100px | 180px  | 24px | 80px  | Side buttons right |
| **YouTube**           | 20px  | 20px   | 20px | 20px  | Standard           |
| **Instagram Square**  | 32px  | 32px   | 32px | 32px  | 1:1 format         |

### 51 Component Library

**Charts (6):** PieChart, BarChart, HorizontalBarChart, LineChart, AreaChart, DonutChart

**Scenes (2):** TitleScene (4 variants, 5 animations), EndScreen (4 variants, CTAs)

**Overlays (3):** LowerThird (5 variants, 5 positions), TextOverlay (5 styles, 5 animations), SubscribeButton

**Code (3):** CodeBlock (syntax highlighting), TypingCode (character animation), CodeDiff (side-by-side)

**Layouts (17):** AsymmetricLayout, Container, DialogueFrame, FocusStrip, Grid (8 types), HUDStyle, Mosaic, OverTheShoulder, PerformanceMultiCam, PiP, SplitScreen, StackedReaction, ThreeByThreeGrid, ThreeColumnLayout, ThreeRowLayout, Timeline, Vertical

**Text Animations (6):** TypewriterText, StaggerText, WavyText, TrueFocus, DecryptedText, FuzzyText (VHS glitch)

**Demo Realism (4):** BeforeAfterSlider, BrowserFrame, DeviceFrame, Terminal

### MCP Tool Integration

```python
# Create project with theme
remotion_create_project(
    name="product_demo",
    theme="tech",      # 7 built-in themes
    fps=30,
    width=1080,
    height=1920        # TikTok vertical
)

# Add components with time strings
remotion_add_title_scene(
    text="Welcome to Our Product",
    subtitle="See it in action",
    variant="bold",
    animation="fade_zoom",
    duration="3s"
)

# Track-based composition
remotion_add_typing_code(
    code="const result = await api.call();",
    language="typescript",
    typing_speed="medium",
    duration="5s",
    track="main",
    gap_before="1s"
)

# Overlay on top
remotion_add_lower_third(
    name="John Developer",
    title="Senior Engineer",
    variant="minimal",
    position="bottom_left",
    duration="4s",
    track="overlay"
)
```

### Time String Format

Flexible duration specification:

```python
duration="2s"       # 2 seconds
duration="500ms"    # 500 milliseconds
duration="1.5s"     # 1.5 seconds
duration="1m"       # 1 minute
gap_before="250ms"  # Gap before component
```

---

## 2. remotion-subtitles: Animated Caption Templates

### 17 Pre-Built Caption Animations

The remotion-subtitles library provides production-ready animated caption components:

| Template              | Effect              | Use Case               |
| --------------------- | ------------------- | ---------------------- |
| **BounceCaption**     | Spring bounce entry | High energy content    |
| **ColorfulCaption**   | Multi-color text    | Youth/creative content |
| **ExplosiveCaption**  | Dramatic reveal     | Emphasis moments       |
| **FadeCaption**       | Smooth fade in/out  | Professional content   |
| **FireCaption**       | Fire effect overlay | Gaming/dramatic        |
| **GlitchCaption**     | Digital glitch      | Tech/cyberpunk         |
| **GlowingCaption**    | Neon glow           | Night/urban aesthetic  |
| **LightningCaption**  | Electric effects    | Energy/power moments   |
| **NeonCaption**       | Neon sign style     | Retro/synthwave        |
| **RotatingCaption**   | 3D rotation entry   | Dynamic transitions    |
| **ShakeCaption**      | Vibration effect    | Emphasis/impact        |
| **ThreeDishCaption**  | 3D perspective      | Modern/premium         |
| **TiltShiftCaption**  | Miniature effect    | Creative/artistic      |
| **TypewriterCaption** | Character-by-char   | Technical/documentary  |
| **WavingCaption**     | Wave motion         | Playful/casual         |
| **ZoomCaption**       | Scale animation     | Focus attention        |

### Integration Pattern

```typescript
import { SubtitleSequence } from "remotion-subtitle";
import { TypewriterCaption as Caption } from "remotion-subtitle";

// Load SRT file
let subtitles = new SubtitleSequence("audio.srt");

// Wait for parsing
subtitles.ready().then(() => {
    // Get Remotion sequences
    setSequences(subtitles.getSequences(<Caption />, fps));
});

// Render in composition
return (
    <AbsoluteFill>
        {sequences.map((sequence, i) => (
            <Sequence key={i} {...sequence} />
        ))}
    </AbsoluteFill>
);
```

---

## 3. Mosaico: Python Video Composition with AI

### AI-Integrated Video Pipeline

```
Mosaico Architecture:
┌────────────────────────────────────────────────────────────┐
│                   Script Generation Layer                   │
│  LangChain Generator │ Haystack Generator │ Custom         │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                   Asset Management                          │
│  Media References │ Stock Footage │ Generated Images        │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                   Video Project                             │
│  Scenes │ Timeline │ Audio Tracks │ Caption Tracks         │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                   Post-Processing                           │
│  Narration (TTS) │ Captions (Transcription) │ Effects     │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                   Rendering                                 │
│  FFmpeg Backend │ MP4/WebM/GIF Output                      │
└────────────────────────────────────────────────────────────┘
```

### Project Builder Pattern

```python
from mosaico.video.project import VideoProject
from mosaico.script_generators import LangChainScriptGenerator
from mosaico.speech_synthesizers import ElevenLabsSynthesizer
from mosaico.audio_transcribers import AssemblyAITranscriber

# AI script generation
script_generator = LangChainScriptGenerator(
    model="gpt-4",
    prompt_template="Create a 60-second video script about {topic}..."
)

# TTS integration
speech_synthesizer = ElevenLabsSynthesizer(
    voice_id="voice_abc123",
    model_id="eleven_turbo_v2"
)

# Transcription for captions
audio_transcriber = AssemblyAITranscriber(api_key="...")

# Build complete video project
project = (
    VideoProject.from_script_generator(script_generator, media)
    .with_title("Product Demo")
    .with_fps(30)
    .with_resolution(1080, 1920)  # Vertical
    .add_narration(speech_synthesizer)
    .add_captions_from_transcriber(audio_transcriber)
)

# Render to file
render_video(project, "output/demo.mp4")
```

### Key Features

- **Script Generators:** LangChain, Haystack integration
- **TTS Providers:** ElevenLabs, Google Cloud, AWS Polly
- **Transcription:** AssemblyAI, Whisper, Google Speech
- **Stock Footage:** Pexels, Unsplash integration
- **Output Formats:** MP4, WebM, GIF

---

## 4. MoviePy: Python Video Editing Foundation

### v2.0 Architecture

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and process video
clip = (
    VideoFileClip("input.mp4")
    .subclipped(10, 20)           # Extract 10-20 second segment
    .with_volume_scaled(0.8)       # Reduce volume to 80%
)

# Text overlay
txt_clip = TextClip(
    font="Arial.ttf",
    text="Hello World!",
    font_size=70,
    color='white'
).with_duration(10).with_position('center')

# Composite layers
final = CompositeVideoClip([clip, txt_clip])
final.write_videofile("output.mp4")
```

### Core Capabilities

- **Cuts & Concatenations:** subclipped(), concatenate_videoclips()
- **Compositing:** CompositeVideoClip for layering
- **Effects:** Custom effects as Python functions
- **Text:** TextClip with font, color, position control
- **Audio:** AudioFileClip, volume adjustments, mixing
- **Formats:** All FFmpeg-supported formats

### When to Use MoviePy vs Remotion

| Use Case             | MoviePy    | Remotion      |
| -------------------- | ---------- | ------------- |
| Programmatic editing | ✅         | ✅            |
| Complex animations   | ❌ Limited | ✅ Full React |
| Template reuse       | ❌         | ✅ Components |
| Python ecosystem     | ✅         | ❌            |
| Performance          | ❌ Slower  | ✅ Faster     |
| Design system        | ❌         | ✅ Tokens     |

---

## 5. FFMPerative: LLM-Powered Video Editing

### Natural Language to FFmpeg

```bash
# Natural language commands
ffmperative do --prompt "merge subtitles 'captions.srt' with video 'video.mp4' calling it 'video_caps.mp4'"

ffmperative do --prompt "resize video to 1080x1920 vertical format"

ffmperative do --prompt "speed up video by 2x"
```

### Python API

```python
from ffmperative import ffmp

# Natural language video editing
ffmp("sample the 5th frame from '/path/to/video.mp4'")
ffmp("crop video to center 720x720")
ffmp("add audio fadeout for last 3 seconds")
```

### Compose Clips

```bash
# Auto-compose clips with AI guidance
ffmperative compose \
    --clips /path/to/video/dir \
    --output /path/to/output.mp4 \
    --prompt "Edit the video for social media with cuts and transitions"
```

### Capabilities

- Change speed, resize, crop, flip, reverse
- Speech-to-text transcription
- Closed captions
- Video/GIF processing
- LLM-guided composition

---

## 6. CapCut Mate: Draft Automation API

### Architecture

```
CapCut Mate API:
┌──────────────────────────────────────────────────────────┐
│                  FastAPI Server (:30000)                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Draft Management                                   │  │
│  │  create_draft │ save_draft │ get_draft             │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Material Management                                │  │
│  │  add_videos │ add_images │ add_audios │ add_sticker│  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Text & Captions                                    │  │
│  │  add_captions │ add_text_style │ keyword highlight │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Effects & Animation                                │  │
│  │  add_effects │ add_keyframes │ add_masks           │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Rendering                                          │  │
│  │  gen_video │ gen_video_status (async)              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                  CapCut/剪映 Desktop                      │
│  Draft files │ Cloud rendering │ Export                  │
└──────────────────────────────────────────────────────────┘
```

### API Usage

```python
import requests

# Create draft
response = requests.post(
    "http://localhost:30000/openapi/capcut-mate/v1/create_draft",
    json={"width": 1080, "height": 1920}
)
draft_id = response.json()["draft_id"]

# Add video
requests.post(
    "http://localhost:30000/openapi/capcut-mate/v1/add_videos",
    json={
        "draft_url": f"...?draft_id={draft_id}",
        "video_infos": [{
            "url": "https://example.com/video.mp4",
            "start": 0,
            "end": 1000000  # microseconds
        }]
    }
)

# Add captions with keyword highlighting
requests.post(
    "http://localhost:30000/openapi/capcut-mate/v1/add_captions",
    json={
        "draft_url": f"...?draft_id={draft_id}",
        "captions": [{
            "text": "This is a key feature demo",
            "keywords": ["key", "feature"],
            "keyword_color": "#FF0000",
            "start": 0,
            "end": 3000000
        }]
    }
)

# Render video
render_response = requests.post(
    "http://localhost:30000/openapi/capcut-mate/v1/gen_video",
    json={"draft_id": draft_id}
)
```

### Features

- **Draft Management:** Create, save, retrieve drafts
- **Materials:** Videos, images, stickers, audio
- **Captions:** Text styles, keyword highlighting
- **Effects:** Filters, keyframes, masks, animations
- **Rendering:** Cloud-based async video generation
- **Coze Plugin:** One-click deployment to Coze platform

---

## 7. PyAV: Low-Level FFmpeg Binding

### Direct FFmpeg Access

```python
import av

# Open container
container = av.open('input.mp4')

# Access streams
video_stream = container.streams.video[0]
audio_stream = container.streams.audio[0]

# Decode frames
for frame in container.decode(video=0):
    # frame is numpy-convertible
    array = frame.to_ndarray(format='rgb24')
    # Process with PIL, OpenCV, etc.

# Encode output
output = av.open('output.mp4', 'w')
out_stream = output.add_stream('h264', rate=30)

for frame in frames:
    packet = out_stream.encode(frame)
    output.mux(packet)
```

### When to Use PyAV

- Maximum control over encoding
- Custom frame processing pipelines
- Direct FFmpeg library access
- Performance-critical applications
- Integration with numpy/PIL/OpenCV

---

## 8. Cloud Rendering Services

### JSON2Video (PHP SDK)

```php
<?php
use JSON2Video\Movie;
use JSON2Video\Scene;

$movie = new Movie;
$movie->setAPIKey(YOUR_API_KEY);
$movie->quality = 'high';

$scene = new Scene;
$scene->background_color = '#4392F1';

// Add text with animation
$scene->addElement([
    'type' => 'text',
    'style' => '003',
    'text' => 'Hello world',
    'duration' => 10,
    'start' => 2
]);

$movie->addScene($scene);
$movie->render();
$movie->waitToFinish();
```

### Plainly Videos (After Effects)

MCP integration for After Effects rendering:

```python
# Via MCP tools
plainly_export_project()        # Export AE project as ZIP
plainly_upload_project()        # Upload to Plainly cloud
plainly_render(template_id, variables)  # Cloud render with variables
```

### Remotion + Railway Template

Cloud deployment for Remotion rendering:

```bash
# API endpoints
POST /renders    # Start render
GET /renders/:id # Status check
DELETE /renders/:id # Cancel

# Request body
{
    "quizData": {
        "questions": [
            {"question": "...", "options": [...], "correctAnswerIndex": 0}
        ]
    },
    "chatId": "telegram_chat_id"  # Optional Telegram delivery
}
```

---

## 9. Recommended Architecture for content-machine

### Multi-Tier Rendering Strategy

```
content-machine Rendering Pipeline:
┌────────────────────────────────────────────────────────────┐
│                     Content Planning Agent                  │
│  (LangGraph) → Video spec as JSON                          │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                    Rendering Router                         │
│  Evaluate: complexity, platform, urgency, cost             │
│                                                            │
│  ┌──────────────┬──────────────┬──────────────┐           │
│  │ Simple/Fast  │ Complex/Anim │ Professional │           │
│  │ Mosaico      │ Remotion     │ After Effects│           │
│  │ MoviePy      │ chuk-motion  │ Plainly      │           │
│  └──────────────┴──────────────┴──────────────┘           │
└────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   Local Fast     │ │   Local Complex  │ │   Cloud Premium  │
│                  │ │                  │ │                  │
│ • Mosaico        │ │ • chuk-motion    │ │ • Plainly        │
│ • MoviePy        │ │ • Remotion       │ │ • JSON2Video     │
│ • FFMPerative    │ │ • remotion-sub   │ │ • Railway        │
│                  │ │                  │ │                  │
│ Speed: Fast      │ │ Speed: Medium    │ │ Speed: Async     │
│ Quality: Basic   │ │ Quality: High    │ │ Quality: Premium │
│ Cost: Free       │ │ Cost: Free       │ │ Cost: API Credits│
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Implementation Recommendations

| Component              | Primary Tool       | Fallback              | Notes                        |
| ---------------------- | ------------------ | --------------------- | ---------------------------- |
| **MCP Orchestration**  | chuk-motion        | -                     | 51 components, design tokens |
| **Caption Animation**  | remotion-subtitles | chuk-motion TextAnims | 17 templates                 |
| **Python Pipeline**    | Mosaico            | MoviePy               | AI script generation         |
| **Quick Edits**        | FFMPerative        | MoviePy               | Natural language             |
| **Low-Level Control**  | PyAV               | FFmpeg CLI            | Performance critical         |
| **CapCut Integration** | capcut-mate        | -                     | Draft automation             |
| **Cloud Rendering**    | Railway/Remotion   | Plainly               | Scalability                  |

### Suggested MCP Tool Registration

```python
# content-machine MCP tools
@mcp.tool()
async def render_video(
    spec: VideoSpec,
    strategy: Literal["fast", "quality", "premium"] = "quality"
) -> RenderResult:
    """Route to appropriate renderer based on spec complexity."""

    if strategy == "fast" or spec.is_simple():
        return await mosaico_render(spec)
    elif strategy == "quality":
        return await remotion_render(spec)  # via chuk-motion
    else:
        return await cloud_render(spec)  # Plainly/Railway

@mcp.tool()
async def add_animated_captions(
    video_path: str,
    transcript: list[CaptionEntry],
    style: CaptionStyle = "TypewriterCaption"
) -> str:
    """Add animated captions using remotion-subtitles templates."""

    # Generate SRT
    srt_path = generate_srt(transcript)

    # Render with selected caption template
    return await render_with_captions(
        video_path,
        srt_path,
        template=style  # One of 17 templates
    )
```

---

## 10. Cross-Reference Matrix

| Tool               | Type          | Language   | MCP | Cloud | Captions           | Safe Margins   |
| ------------------ | ------------- | ---------- | --- | ----- | ------------------ | -------------- |
| chuk-motion        | Orchestration | Python     | ✅  | ❌    | ✅ 6 types         | ✅ 7 platforms |
| remotion-subtitles | Captions      | TypeScript | ❌  | ❌    | ✅ 17 types        | ❌             |
| Mosaico            | Composition   | Python     | ❌  | ❌    | ✅ via transcriber | ❌             |
| MoviePy            | Editing       | Python     | ❌  | ❌    | ❌ manual          | ❌             |
| FFMPerative        | LLM Edit      | Python     | ❌  | ❌    | ✅ via prompt      | ❌             |
| capcut-mate        | CapCut API    | Python     | ❌  | ✅    | ✅ keywords        | ❌             |
| PyAV               | Low-level     | Python     | ❌  | ❌    | ❌                 | ❌             |
| JSON2Video         | Cloud         | PHP        | ❌  | ✅    | ✅ built-in        | ❌             |
| Plainly            | AE Cloud      | Node       | ✅  | ✅    | ✅ AE native       | ❌             |

---

## 11. Action Items for content-machine

### Immediate (Week 1)

1. **Integrate chuk-motion** - Primary MCP rendering orchestrator
2. **Import remotion-subtitles templates** - Caption animation library
3. **Define VideoSpec schema** - Unified video specification format

### Short-term (Week 2-3)

4. **Mosaico for quick renders** - Python fallback pipeline
5. **FFMPerative for edits** - Natural language video editing
6. **Rendering router logic** - Strategy-based renderer selection

### Medium-term (Month 1)

7. **Cloud rendering integration** - Railway deployment for scale
8. **CapCut integration** - Alternative rendering path
9. **Platform-specific templates** - Pre-configured safe margins

---

## Appendix: Component Count Summary

| Library                  | Components         | Themes | Animations |
| ------------------------ | ------------------ | ------ | ---------- |
| chuk-motion              | 51                 | 7      | 50+        |
| remotion-subtitles       | 17 (captions only) | -      | 17         |
| remotion-templates (RVE) | Variable           | -      | -          |
| Mosaico                  | -                  | -      | via TTS    |
| MoviePy                  | -                  | -      | Manual     |

---

**Related Deep Dives:**

- DD-081: MCP Ecosystem & Server Infrastructure
- DD-082: Python Agent Frameworks & Research Systems
- DD-083: Schema Validation & Audio/TTS Infrastructure
- DD-010: short-video-maker-gyori (Remotion patterns)
- DD-012: vidosy (JSON config pattern)
