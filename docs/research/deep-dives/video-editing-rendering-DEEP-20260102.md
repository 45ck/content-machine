# Video Editing & Rendering Deep Dive

> **Created:** 2026-01-02  
> **Focus:** Programmatic Video Editing, Remotion MCP, CapCut APIs, FFmpeg LLM Integration  
> **Repos Analyzed:** 10+ video processing and rendering repos

---

## Executive Summary

This document explores the video editing and rendering layer - the tools that transform scripts, audio, and assets into finished videos. We found several groundbreaking approaches:

**Key Discoveries:**
1. **chuk-motion** - Complete Remotion MCP server with 51 components and design token system
2. **CapCut Mate** - FastAPI service for programmatic CapCut/剪映 draft creation
3. **JianYing Protocol Service** - Full CapCut protocol implementation with track/segment APIs
4. **FFMPerative** - LLM-powered natural language to FFmpeg command translation
5. **Remotion Subtitles** - Specialized subtitle rendering for Remotion

---

## 1. chuk-motion (Remotion MCP Server) ⭐⭐⭐

**Path:** `vendor/render/chuk-mcp-remotion`  
**Purpose:** AI-powered video generation via MCP with design system approach

### 1.1 Core Architecture

```
chuk-motion/
├── tokens/                # Design tokens
│   ├── colors.py         # 7 theme palettes
│   ├── typography.py     # Font scales for 720p/1080p/4K
│   ├── spacing.py        # Platform safe margins
│   └── motion.py         # Spring configs, easing curves
├── components/           # 51 production-ready components
│   ├── charts/          # PieChart, BarChart, LineChart, etc.
│   ├── overlays/        # LowerThird, TextOverlay, SubscribeButton
│   ├── code/            # CodeBlock, TypingCode, CodeDiff
│   ├── layouts/         # Grid, SplitScreen, PiP, Mosaic, etc.
│   ├── text_animations/ # TypewriterText, WavyText, FuzzyText, etc.
│   └── content/         # ImageContent, VideoContent, WebPage, etc.
└── generator/            # TSX generation with Jinja2
```

### 1.2 Platform Safe Margins

Critical for avoiding UI overlay cropping:

| Platform | Top | Bottom | Left | Right |
|----------|-----|--------|------|-------|
| **TikTok** | 100px | 180px | 24px | 80px |
| **Instagram Stories** | 100px | 120px | 24px | 24px |
| **LinkedIn Feed** | 40px | 40px | 24px | 24px |
| **YouTube** | 20px | 20px | 20px | 20px |

### 1.3 Component Library (51 Components)

**Charts (6):**
- PieChart, BarChart, HorizontalBarChart, LineChart, AreaChart, DonutChart

**Text Animations (6):**
- TypewriterText, StaggerText, WavyText, TrueFocus, DecryptedText, FuzzyText

**Layouts (17):**
- Grid, SplitScreen, PiP, Mosaic, AsymmetricLayout, DialogueFrame, HUDStyle, etc.

**Code Display (3):**
- CodeBlock (syntax highlighting)
- TypingCode (character-by-character animation)
- CodeDiff (side-by-side comparison)

**Demo Realism (4):**
- BrowserFrame, DeviceFrame, Terminal, BeforeAfterSlider

### 1.4 MCP Tool Usage

```python
# Create project with theme
remotion_create_project(
    name="my_video",
    theme="tech",      # tech, finance, education, gaming, lifestyle, minimal, business
    fps=30,
    width=1080,
    height=1920        # TikTok vertical
)

# Add title scene
remotion_add_title_scene(
    text="Welcome",
    subtitle="AI-Generated Video",
    variant="bold",
    animation="fade_zoom",
    duration="3s"
)

# Add chart with safe margins
remotion_add_pie_chart(
    data='[{"label": "AI", "value": 40}, {"label": "ML", "value": 30}]',
    title="Technology Distribution",
    duration="4s",
    gap_before="1s"
)

# Add code with typing animation
remotion_add_typing_code(
    code="console.log('Hello');",
    language="javascript",
    typing_speed="medium",
    duration="5s"
)
```

### 1.5 Time String Format

All duration parameters support flexible formats:
```python
duration="2s"       # 2 seconds
duration="500ms"    # 500 milliseconds
duration="1.5s"     # 1.5 seconds
duration="1m"       # 1 minute
gap_before="250ms"  # Gap between components
```

### 1.6 Track-Based Timeline

```python
# Main track: Sequential auto-stacking
remotion_add_title_scene(...)       # Starts at 0s
remotion_add_pie_chart(...)         # Auto-stacks after title

# Overlay track: Layers on top
remotion_add_text_overlay(..., track="overlay", align_to="main", offset=5.0)

# Background track: Behind main content
remotion_add_background(..., track="background")
```

**Default Tracks:**
- `main` (layer 0) - Primary content, auto-stacks with 0.5s gap
- `overlay` (layer 10) - Text overlays, UI elements  
- `background` (layer -10) - Background media

---

## 2. CapCut Mate (剪映 API Service)

**Path:** `vendor/video-processing/capcut-mate`  
**Purpose:** FastAPI service for programmatic CapCut draft creation

### 2.1 Key Features

- 🎬 Draft management: Create, save, export
- 🎥 Media: Videos, audio, images, stickers
- 📝 Text: Captions with keyword highlighting
- ✨ Effects: Filters, keyframes, masks, transitions
- 📤 Cloud render: Generate final video via cloud

### 2.2 API Endpoints

**Draft Management:**
```bash
POST /openapi/capcut-mate/v1/create_draft
POST /openapi/capcut-mate/v1/save_draft
GET  /openapi/capcut-mate/v1/get_draft?draft_id=...
```

**Adding Materials:**
```bash
POST /add_videos      # Batch add videos
POST /add_images      # Batch add images
POST /add_audios      # Batch add audio
POST /add_captions    # Add subtitles with highlighting
POST /add_sticker     # Add stickers
POST /add_effects     # Add visual effects
POST /add_keyframes   # Keyframe animations
POST /add_masks       # Shape masks
```

**Rendering:**
```bash
POST /gen_video          # Submit cloud render
GET  /gen_video_status   # Check render progress
```

### 2.3 Usage Example

```python
import requests

BASE_URL = "http://localhost:30000"

# 1. Create draft
response = requests.post(f"{BASE_URL}/openapi/capcut-mate/v1/create_draft", json={
    "width": 1080,
    "height": 1920
})
draft_url = response.json()["data"]["draft_url"]

# 2. Add video
requests.post(f"{BASE_URL}/openapi/capcut-mate/v1/add_videos", json={
    "draft_url": draft_url,
    "video_infos": [{
        "url": "https://example.com/video.mp4",
        "start": 0,
        "end": 10000000  # 10 seconds in microseconds
    }]
})

# 3. Add captions with highlighting
requests.post(f"{BASE_URL}/openapi/capcut-mate/v1/add_captions", json={
    "draft_url": draft_url,
    "captions": [{
        "text": "This is highlighted text",
        "start": 0,
        "end": 3000000,
        "highlight_words": ["highlighted"]
    }]
})

# 4. Generate video
requests.post(f"{BASE_URL}/openapi/capcut-mate/v1/gen_video", json={
    "draft_url": draft_url
})
```

### 2.4 Coze Plugin Integration

Can be deployed as a Coze (扣子) plugin for AI agent access:
1. Import `openapi.yaml` to Coze platform
2. Configure API endpoint
3. Enable plugin in workflows

---

## 3. JianYing Protocol Service (剪映协议服务)

**Path:** `vendor/video-processing/jianying-protocol-service`  
**Purpose:** Complete CapCut protocol implementation with track/segment APIs

### 3.1 Architecture

```
HTTP API Layer (FastAPI)
    ↓
Business Logic Layer (TaskManager, JianYingProject)
    ↓
Protocol Layer (JianYingProtocol, Segment/Track Handlers)
    ↓
Infrastructure Layer (OSS Integration, File Management)
```

### 3.2 Track Types

```python
JIANYING_TRACK_TYPES = [
    'video',    # Video clips
    'audio',    # Audio clips
    'text',     # Text/captions
    'sticker',  # Stickers
    'effect',   # Visual effects
    'filter',   # Color filters
    'adjust'    # Color adjustments
]
```

### 3.3 API Structure

**Task Management:**
```bash
POST /tasks              # Create new project
GET  /tasks/{id}         # Get project info
POST /export             # Export to OSS
```

**Track Management:**
```bash
POST   /tracks           # Create track
DELETE /tracks           # Delete track
GET    /tasks/{id}/tracks
```

**Segment (Clip) Management:**
```bash
POST /segments/media          # Add video/image/audio
POST /segments/text           # Add text
POST /segments/sticker        # Add sticker
POST /segments/complex-text   # Add fancy text (花字)
POST /segments/filter         # Add color filter
POST /segments/effect         # Add video effect
POST /segments/internal-material  # Add transition/animation
POST /segments/transform      # Update position/scale/rotation
POST /segments/adjust-info    # Update color grading
```

### 3.4 Color Adjustment Parameters

```python
class AdjustInfo:
    temperature: int    # -50 to 50 (色温)
    tone: int          # -50 to 50 (色调)
    saturation: int    # -50 to 50 (饱和度)
    brightness: int    # -50 to 50 (亮度)
    contrast: int      # -50 to 50 (对比度)
    highlight: int     # -50 to 50 (高光)
    shadow: int        # -50 to 50 (阴影)
    vignetting: int    # -50 to 50 (暗角)
```

### 3.5 Complex Text Features

Supports advanced text styles:
- 花字 (Fancy text effects)
- 气泡 (Bubble text)
- 入场动画 (Entry animations)
- 出场动画 (Exit animations)

---

## 4. FFMPerative (LLM → FFmpeg)

**Path:** `vendor/video-processing/FFMPerative`  
**Purpose:** Natural language to FFmpeg command translation

### 4.1 Usage

```bash
# CLI usage
ffmperative do --prompt "merge subtitles 'captions.srt' with video 'video.mp4'"

# Compose clips with AI guidance
ffmperative compose --clips /path/to/clips --output final.mp4 --prompt "Edit for social media"
```

### 4.2 Python API

```python
from ffmperative import ffmp

# Natural language commands
ffmp("sample the 5th frame from '/path/to/video.mp4'")
ffmp("resize video to 1080x1920")
ffmp("add slow motion to first 5 seconds")
ffmp("crop video to center square")
```

### 4.3 Capabilities

- Change speed, resize, crop, flip, reverse
- Speech-to-text transcription
- Closed caption embedding
- Format conversion
- Frame extraction

### 4.4 LLM Integration

Uses fine-tuned LLaMA2 model:
- [FFMPerative LLaMA2 checkpoint](https://huggingface.co/remyxai/ffmperative-7b)
- [Sample FFMPerative Dataset](https://huggingface.co/datasets/remyxai/ffmperative-sample)

---

## 5. Remotion Templates

**Path:** `vendor/render/remotion-templates`

### 5.1 Available Templates

From the templates directory, we have access to various Remotion templates for:
- Caption styling
- Audiograms
- TikTok-specific layouts
- General video compositions

### 5.2 Template Integration with chuk-motion

The chuk-motion MCP server can scaffold complete Remotion projects:

```bash
# After project creation via MCP
cd remotion-projects/my_video
npm install
npm start      # Preview in browser
npm run build  # Render to MP4
```

---

## 6. Architecture Comparison

### 6.1 Rendering Approaches

| Approach | Tool | Pros | Cons |
|----------|------|------|------|
| **Remotion** | chuk-motion | React-based, highly customizable, type-safe | Requires Node.js |
| **CapCut API** | CapCut Mate | Pro-level effects, cloud render | Vendor lock-in |
| **FFmpeg Direct** | FFMPerative | Universal, fast | Complex commands |
| **MoviePy** | Various | Python native | Slower, memory heavy |

### 6.2 Recommended Stack for content-machine

```yaml
rendering:
  primary: Remotion (via chuk-motion MCP)
  secondary: FFmpeg (via FFMPerative for quick edits)
  
caption-styling:
  use: Remotion text components from chuk-motion
  fallback: ASS subtitles via FFmpeg
  
effects:
  standard: chuk-motion 51 components
  advanced: Consider CapCut Mate for complex effects
```

---

## 7. Key Code Patterns

### 7.1 Design Token System (chuk-motion)

```python
# tokens/colors.py
THEMES = {
    "tech": {
        "primary": "#0066FF",
        "accent": "#00D9FF",
        "background": "#0A0A0A",
        "text": "#FFFFFF"
    },
    "finance": {
        "primary": "#00C853",
        "accent": "#FFD600",
        "background": "#0D1117",
        "text": "#FFFFFF"
    }
}

# tokens/spacing.py
PLATFORM_SAFE_MARGINS = {
    "tiktok": {"top": 100, "bottom": 180, "left": 24, "right": 80},
    "instagram_stories": {"top": 100, "bottom": 120, "left": 24, "right": 24},
    "youtube": {"top": 20, "bottom": 20, "left": 20, "right": 20}
}
```

### 7.2 Track-Segment Pattern (JianYing)

```python
# Create track
track = protocol.add_track(task_id, track_type="video")

# Add segment to track
segment = protocol.add_media_segment_to_track(
    track_id=track.id,
    material=MediaMaterial(
        url="https://...",
        media_type="video",
        speed=1.0
    ),
    duration=10000,
    transform=Transform(scale_x=1.0, translate_y=-0.1)
)

# Add transition between segments
protocol.add_internal_material_to_segment(
    segment_id=segment.id,
    material_type="transition",
    effect_info=TransitionEffect(name="推近 II")
)
```

### 7.3 LLM Video Editing (FFMPerative)

```python
from ffmperative import ffmp

# The LLM translates natural language to FFmpeg commands
commands = [
    "crop the center 1080x1920 from video.mp4",
    "add 2x speed to the first 10 seconds",
    "overlay logo.png in bottom right corner",
    "merge audio.mp3 with video.mp4",
    "add subtitles from captions.srt"
]

for cmd in commands:
    ffmp(cmd)  # Executes FFmpeg behind the scenes
```

---

## 8. Integration Strategy for content-machine

### 8.1 MCP Server Architecture

```yaml
mcp-servers:
  remotion:
    tool: chuk-motion
    purpose: Primary video rendering
    components: 51 built-in
    
  ffmpeg:
    tool: FFMPerative
    purpose: Quick edits, format conversion
    
  capcut:
    tool: CapCut Mate (optional)
    purpose: Advanced effects if needed
```

### 8.2 Rendering Pipeline

```
Script + Audio + Visuals
         ↓
   chuk-motion MCP
         ↓
   Remotion Project (TSX)
         ↓
   npm run build
         ↓
   Final MP4
```

### 8.3 Component Selection for Shorts

**For Product Demos:**
- `DeviceFrame` - Show product in device mockup
- `BrowserFrame` - Web app demos
- `TypingCode` - Code demonstrations
- `BeforeAfterSlider` - Feature comparisons

**For Educational Content:**
- `PieChart`, `BarChart` - Data visualization
- `TypewriterText` - Key points
- `TitleScene` - Section headers
- `Timeline` - Process explanation

**For Engagement:**
- `SubscribeButton` - CTAs
- `LowerThird` - Speaker identification
- `EndScreen` - YouTube end cards
- `FuzzyText` - Attention-grabbing effects

---

## 9. Risk Assessment

### High Value, Low Risk
- **chuk-motion** - Well-maintained, comprehensive tests (1471 passing)
- **FFMPerative** - Stable, uses proven FFmpeg

### Medium Value, Medium Risk
- **CapCut Mate** - Depends on CapCut's undocumented API
- **JianYing Protocol** - Chinese documentation, vendor-specific

### Integration Priority

1. **chuk-motion** - Primary rendering via MCP ⭐⭐⭐
2. **FFMPerative** - Utility for quick edits ⭐⭐
3. **Remotion Templates** - Reference patterns ⭐⭐
4. **CapCut APIs** - Study for effect ideas ⭐

---

## 10. Summary

The video rendering layer offers multiple approaches:

| Tool | Use Case | MCP? | Production Ready? |
|------|----------|------|-------------------|
| **chuk-motion** | Full video composition | ✅ Yes | ✅ 1471 tests |
| **CapCut Mate** | Pro-level effects | ❌ API only | ⚠️ Vendor API |
| **JianYing Protocol** | Track/segment editing | ❌ API only | ✅ Documented |
| **FFMPerative** | Quick edits, LLM integration | ❌ CLI | ✅ Stable |

**Recommended Primary Stack:**
```
chuk-motion MCP + Remotion + FFMPerative fallback
```

**Key Advantages:**
- 51 ready-to-use components
- Platform-specific safe margins (TikTok, Instagram, YouTube)
- Design token system for consistent branding
- Track-based timeline for professional composition
- LLM-accessible via MCP protocol

---

**Next Steps:**
1. Set up chuk-motion MCP server locally
2. Create test video with product demo components
3. Evaluate rendering quality vs CapCut
4. Document component customization patterns
