# Deep Dive #77: Rendering, Captions & Video Composition Ecosystem

**Document ID:** DD-077  
**Date:** 2026-01-02  
**Category:** Rendering, Captions, Video Composition, MCP  
**Status:** Complete  
**Word Count:** ~7,500

---

## Executive Summary

This document covers the video rendering and caption ecosystem:

1. **Python Composition** – Mosaico (programmatic video)
2. **Remotion Ecosystem** – remotion-subtitles, chuk-motion, templates
3. **Caption/ASR** – WhisperX (word-level timestamps, diarization)
4. **Video APIs** – JSON2Video PHP SDK
5. **GitHub Integration** – Octokit for repo automation

---

## 1. Python Video Composition

### 1.1 Mosaico

**Source:** `vendor/render/mosaico/`  
**Creator:** Folha SP  
**License:** MIT  
**Language:** Python  
**Stars:** Growing

#### Overview

Mosaico is a **Python library for programmatic video compositions**. It provides a high-level interface for working with media assets, positioning, effects, and generating video scripts.

#### Key Features

| Feature | Description |
|---------|-------------|
| **AI Script Generation** | LLM-powered scripts for videos |
| **Media Asset Management** | Audio, images, text, subtitles |
| **Positioning System** | Absolute, relative, region-based |
| **Effects** | Pan, zoom, extensible effect system |
| **TTS Integration** | ElevenLabs, other synthesizers |
| **ML Framework Integration** | Haystack, LangChain |

#### Installation

```bash
pip install mosaico

# With additional dependencies
pip install "mosaico[assemblyai,elevenlabs]"
```

#### Quick Start

```python
from mosaico.audio_transcribers.assemblyai import AssemblyAIAudioTranscriber
from mosaico.script_generators.news import NewsVideoScriptGenerator
from mosaico.speech_synthesizers.elevenlabs import ElevenLabsSpeechSynthesizer
from mosaico.video.project import VideoProject
from mosaico.video.rendering import render_video

# Create script generator
script_generator = NewsVideoScriptGenerator(
    context="Your news context here",
    language="pt",
    num_paragraphs=8,
    api_key=ANTHROPIC_API_KEY,
)

# Create speech synthesizer
speech_synthesizer = ElevenLabsSpeechSynthesizer(
    voice_id="Xb7hH8MSUJpSbSDYk0k2",
    voice_stability=0.8,
    voice_similarity_boost=0.75,
    api_key=ELEVENLABS_API_KEY,
)

# Create audio transcriber for captions
audio_transcriber = AssemblyAIAudioTranscriber(api_key=ASSEMBLYAI_API_KEY)

# Create project
project = (
    VideoProject.from_script_generator(script_generator, media)
    .with_title("My Breaking News Video")
    .with_fps(30)
    .with_resolution((1920, 1080))
    .add_narration(speech_synthesizer)
    .add_captions_from_transcriber(audio_transcriber, overwrite=True)
)

# Render
render_video(project, "path/to/dir")
```

#### Manual Composition

```python
from mosaico.video.project import VideoProject
from mosaico.assets import ImageAsset, TextAsset, AudioAsset, AssetReference

# Create assets
assets = [
    ImageAsset.from_path("background.jpg"),
    ImageAsset.from_path("image1.jpg"),
    TextAsset.from_data("Subtitle 1"),
    AudioAsset.from_path("narration.mp3"),
]

# Create asset references with timing
asset_references = [
    AssetReference.from_asset(background, start_time=0, end_time=10),
    AssetReference.from_asset(image1, start_time=10, end_time=20),
    AssetReference.from_asset(subtitle1, start_time=0, end_time=10),
    AssetReference.from_asset(narration, start_time=0, end_time=30),
]

# Create scene and project
scene = Scene(description="My Scene").add_asset_references(asset_references)

project = (
    VideoProject()
    .with_title("My Video")
    .with_fps(30)
    .with_resolution((1920, 1080))
    .add_assets(assets)
    .add_timeline_events(scene)
)

render_video(project, "output/")
```

---

## 2. Remotion Ecosystem

### 2.1 remotion-subtitles

**Source:** `vendor/render/remotion-subtitles/`  
**Creator:** ahgsql  
**License:** MIT  
**Language:** TypeScript/React

#### Overview

A library for adding **animated subtitles** to Remotion video projects. Offers easy SRT parsing and **17 pre-built caption templates** with stunning animation effects.

#### Installation

```bash
npm install remotion-subtitle
```

#### Usage

```javascript
import { SubtitleSequence } from "remotion-subtitle";
import { TypewriterCaption as Caption } from "remotion-subtitle";
import { useEffect, useState } from "react";

export const Subtitles = () => {
  const { fps } = useVideoConfig();
  let [Sequences, setSequences] = useState([]);
  const [loaded, setLoaded] = useState(false);
  
  let subtitles = new SubtitleSequence("audio.srt");
  
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
          {Sequences}
        </>
      )}
    </>
  );
};
```

#### 17 Caption Templates

| Template | Effect |
|----------|--------|
| **BounceCaption** | Bouncing animation |
| **ColorfulCaption** | Color changing text |
| **ExplosiveCaption** | Explosive reveal |
| **FadeCaption** | Fade in/out |
| **FireCaption** | Fire effect |
| **GlitchCaption** | Glitch effect |
| **GlowingCaption** | Glowing text |
| **LightningCaption** | Lightning effect |
| **NeonCaption** | Neon glow |
| **RotatingCaption** | 3D rotation |
| **ShakeCaption** | Shake animation |
| **ThreeDishCaption** | 3D appearance |
| **TiltShiftCaption** | Tilt-shift blur |
| **TypewriterCaption** | Typewriter effect |
| **WavingCaption** | Wave motion |
| **ZoomCaption** | Zoom in/out |

#### Custom Styling

```javascript
subtitles.getSequences(
  <Caption style={{ fontSize: "24px", color: "white" }} />, 
  fps
);
```

#### API

| Method | Description |
|--------|-------------|
| `new SubtitleSequence(filepath)` | Initialize with SRT file |
| `ready()` | Promise to load SRT file |
| `getSequences(component, fps)` | Generate Remotion sequences |
| `getArray(fps)` | Get parsed subtitle array |

---

### 2.2 chuk-motion (MCP Remotion Server)

**Source:** `vendor/render/chuk-mcp-remotion/`  
**Creator:** Chris Hay  
**License:** MIT  
**Language:** Python 3.11+  
**Stars:** Growing

#### Overview

chuk-motion is an **MCP server** that brings Remotion video generation to AI assistants. Features a **design-system-first approach** with 51 video components and 7 built-in themes.

#### Key Features

| Feature | Description |
|---------|-------------|
| **MCP Compatible** | Works with Claude and other AI assistants |
| **Design System** | Complete token system (colors, typography, spacing, motion) |
| **51 Components** | Charts, code, scenes, overlays, layouts, animations |
| **7 Themes** | Tech, Finance, Education, Lifestyle, Gaming, Minimal, Business |
| **Multi-Platform** | Safe margins for LinkedIn, TikTok, Instagram, YouTube |
| **Track-Based Timeline** | Professional multi-track composition |
| **1471 Tests** | 86% coverage |

#### Design Token Categories

1. **Colors** – 7 theme palettes, dark/light mode
2. **Typography** – Font scales for 720p, 1080p, 4K
3. **Spacing** – 10-step scale, platform safe margins
4. **Motion** – Spring configs, easing curves

#### Platform Safe Margins

| Platform | Top | Bottom | Left | Right |
|----------|-----|--------|------|-------|
| **LinkedIn Feed** | 40px | 40px | 24px | 24px |
| **Instagram Stories** | 100px | 120px | 24px | 24px |
| **TikTok** | 100px | 180px | 24px | 80px |
| **YouTube** | 20px | 20px | 20px | 20px |

#### Component Library (51 total)

| Category | Components |
|----------|------------|
| **Charts (6)** | PieChart, BarChart, HorizontalBarChart, LineChart, AreaChart, DonutChart |
| **Scenes (2)** | TitleScene, EndScreen |
| **Overlays (3)** | LowerThird, TextOverlay, SubscribeButton |
| **Code (3)** | CodeBlock, TypingCode, CodeDiff |
| **Layouts (17)** | Grid, SplitScreen, PiP, Mosaic, and more |
| **Animations (3)** | Counter, LayoutEntrance, PanelCascade |
| **Text Animations (6)** | TypewriterText, StaggerText, WavyText, TrueFocus, DecryptedText, FuzzyText |
| **Demo Realism (4)** | BeforeAfterSlider, BrowserFrame, DeviceFrame, Terminal |
| **Content (5)** | DemoBox, ImageContent, StylizedWebPage, VideoContent, WebPage |
| **Transitions (2)** | LayoutTransition, PixelTransition |

#### MCP Server Usage

```bash
# Start MCP server (for Claude Desktop)
python -m chuk_motion.server stdio

# HTTP mode for testing
python -m chuk_motion.server http --port 8000
```

#### Project Creation via MCP

```python
# Create project
remotion_create_project(
    name="my_video",
    theme="tech",
    fps=30,
    width=1920,
    height=1080
)

# Add title scene
remotion_add_title_scene(
    text="Welcome to AI Videos",
    subtitle="Created with Design Tokens",
    variant="bold",
    animation="fade_zoom",
    duration="3s"
)

# Add chart
remotion_add_pie_chart(
    data='[{"label": "AI", "value": 40}]',
    title="Technology Distribution",
    duration="4s",
    gap_before="1s"
)

# Add code with typing
remotion_add_typing_code(
    code="console.log('Hello, World!');",
    language="javascript",
    title="Example Code",
    typing_speed="medium",
    duration="5s"
)
```

#### Render

```bash
cd remotion-projects/my_video
npm install
npm start  # Preview
npm run build  # Render to MP4
```

---

### 2.3 Remotion Template (Railway)

**Source:** `vendor/render/remotion-template-aeither/`  
**Focus:** Express server + Railway deployment

#### Overview

Minimal starter to render Remotion videos via Express server with Railway deployment.

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/renders` | POST | Start a render |
| `/renders/:id` | GET | Status of a render |
| `/renders/:id` | DELETE | Cancel a render |

#### Example Request

```bash
curl -X POST https://<your-app>.railway.app/renders \
  -H 'Content-Type: application/json' \
  -d '{
    "quizData": {
      "questions": [
        {"question":"Sample question?","options":["A","B","C","D"],"correctAnswerIndex":0}
      ]
    }
  }'
```

---

## 3. Caption & ASR Tools

### 3.1 WhisperX

**Source:** `vendor/captions/whisperx/`  
**Creator:** Max Bain (Oxford VGG)  
**License:** BSD  
**Language:** Python  
**Stars:** 10k+

#### Overview

WhisperX provides **fast automatic speech recognition** (70x realtime with large-v2) with:
- Word-level timestamps
- Speaker diarization
- VAD preprocessing

#### Key Features

| Feature | Description |
|---------|-------------|
| **70x Realtime** | Batched inference with large-v2 |
| **faster-whisper** | <8GB GPU memory for large-v2 |
| **Word-level Timestamps** | wav2vec2 alignment |
| **Speaker Diarization** | pyannote-audio |
| **VAD Preprocessing** | Reduces hallucination |
| **Multi-language** | Many languages supported |

#### Technical Components

| Component | Purpose |
|-----------|---------|
| **Whisper** | OpenAI's ASR model |
| **Wav2Vec2** | Phoneme-based forced alignment |
| **pyannote-audio** | Speaker diarization |
| **Silero VAD** | Voice activity detection |
| **faster-whisper** | CTranslate2 backend |

#### Installation

```bash
pip install whisperx

# Or with uv
uvx whisperx
```

#### Command Line Usage

```bash
# Basic transcription
whisperx path/to/audio.wav

# With word highlighting
whisperx path/to/audio.wav --highlight_words True

# Larger model for accuracy
whisperx path/to/audio.wav --model large-v2 --batch_size 4

# With speaker diarization
whisperx path/to/audio.wav --model large-v2 --diarize

# CPU mode
whisperx path/to/audio.wav --compute_type int8 --device cpu

# Other languages
whisperx --model large-v2 --language de path/to/audio.wav
```

#### Python API

```python
import whisperx
from whisperx.diarize import DiarizationPipeline

device = "cuda"
audio_file = "audio.mp3"
batch_size = 16
compute_type = "float16"

# 1. Transcribe with batched whisper
model = whisperx.load_model("large-v2", device, compute_type=compute_type)
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=batch_size)
print(result["segments"])  # Before alignment

# 2. Align whisper output (word-level timestamps)
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"], 
    device=device
)
result = whisperx.align(
    result["segments"], 
    model_a, 
    metadata, 
    audio, 
    device, 
    return_char_alignments=False
)
print(result["segments"])  # After alignment

# 3. Speaker diarization
diarize_model = DiarizationPipeline(
    use_auth_token=YOUR_HF_TOKEN, 
    device=device
)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
print(result["segments"])  # With speaker IDs
```

#### Memory Optimization

```bash
# Reduce batch size
--batch_size 4

# Smaller model
--model base

# Lighter compute
--compute_type int8
```

---

## 4. Video APIs

### 4.1 JSON2Video PHP SDK

**Source:** `vendor/render/json2video-php-sdk/`  
**Creator:** JSON2Video  
**License:** MIT  
**Language:** PHP

#### Overview

JSON2Video is a **video editing API** for creating, editing, and customizing videos programmatically via JSON payloads.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Watermarks** | Add overlays |
| **Resize** | Change video dimensions |
| **Slideshows** | Create from images |
| **Soundtrack** | Add background music |
| **Multi-language** | Automate localization |
| **Voice-over** | TTS integration |
| **Text Animations** | Built-in effects |
| **HTML5+CSS** | Real web elements |

#### Installation

```php
<?php
require_once 'path/to/the/sdk/all.php';

use JSON2Video\Movie;
use JSON2Video\Scene;
```

#### Hello World Example

```php
<?php
require 'vendor/autoload.php';

use JSON2Video\Movie;
use JSON2Video\Scene;

// Create movie
$movie = new Movie;
$movie->setAPIKey(YOUR_API_KEY);
$movie->quality = 'high';
$movie->draft = true;

// Create scene
$scene = new Scene;
$scene->background_color = '#4392F1';

// Add text element
$scene->addElement([
    'type' => 'text',
    'style' => '003',
    'text' => 'Hello world',
    'duration' => 10,
    'start' => 2
]);

// Add scene to movie
$movie->addScene($scene);

// Render
$result = $movie->render();
$movie->waitToFinish();
```

---

## 5. GitHub Integration

### 5.1 Octokit

**Source:** `vendor/github/octokit/`  
**Creator:** GitHub  
**License:** MIT  
**Language:** TypeScript

#### Overview

Octokit is the **all-batteries-included GitHub SDK** for browsers, Node.js, and Deno. Provides complete GitHub API coverage.

#### Key Features

| Feature | Description |
|---------|-------------|
| **REST API** | Full coverage of GitHub REST API |
| **GraphQL** | Query GitHub's GraphQL API |
| **GitHub Apps** | Authentication, webhooks, OAuth |
| **Action Client** | Pre-authenticated for Actions |
| **100% Tested** | Complete test coverage |
| **TypeScript** | Full type declarations |
| **Universal** | Browsers, Node.js, Deno |

#### Installation

```javascript
// Node.js
import { Octokit, App } from "octokit";

// Browser/Deno
import { Octokit, App } from "https://esm.sh/octokit";
```

#### Basic Usage

```javascript
const octokit = new Octokit({ auth: `personal-access-token123` });

// Get authenticated user
const { data: { login } } = await octokit.rest.users.getAuthenticated();
console.log("Hello, %s", login);

// Create an issue
await octokit.rest.issues.create({
    owner: "octocat",
    repo: "hello-world",
    title: "Hello, world!",
    body: "I created this issue using Octokit!",
});
```

#### GraphQL

```javascript
const { viewer: { login } } = await octokit.graphql(`{
  viewer {
    login
  }
}`);
```

#### Pagination

```javascript
const iterator = octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
    owner: "octocat",
    repo: "hello-world",
    per_page: 100,
});

for await (const { data: issues } of iterator) {
    for (const issue of issues) {
        console.log("Issue #%d: %s", issue.number, issue.title);
    }
}
```

---

## 6. Architecture Integration

### 6.1 Caption Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Caption Pipeline                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AUDIO INPUT                                              │
│     Audio file (MP3, WAV, etc.)                              │
│                                                              │
│  2. ASR (WhisperX)                                           │
│     ├─ Batched transcription (70x realtime)                  │
│     ├─ Word-level alignment (wav2vec2)                       │
│     ├─ Speaker diarization (pyannote)                        │
│     └─ Output: Segments with word timestamps                 │
│                                                              │
│  3. FORMAT CONVERSION                                        │
│     ├─ SRT generation                                        │
│     ├─ ASS generation (styled)                               │
│     └─ JSON for Remotion                                     │
│                                                              │
│  4. RENDERING (Remotion)                                     │
│     ├─ remotion-subtitles (17 templates)                     │
│     ├─ chuk-motion (MCP server)                              │
│     └─ Custom React components                               │
│                                                              │
│  5. OUTPUT                                                   │
│     Final video with animated captions                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Video Composition Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 Video Composition Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PYTHON LAYER                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Mosaico                                              │   │
│  │  - AI script generation                               │   │
│  │  - Asset management                                   │   │
│  │  - Timeline composition                               │   │
│  │  - MoviePy backend                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  MCP LAYER                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  chuk-motion                                          │   │
│  │  - 51 components                                      │   │
│  │  - Design tokens                                      │   │
│  │  - LLM-friendly discovery                             │   │
│  │  - Platform safe margins                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  REMOTION LAYER                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Remotion + Templates                                 │   │
│  │  - remotion-subtitles (17 caption styles)             │   │
│  │  - Railway template (cloud rendering)                 │   │
│  │  - React-based composition                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  API LAYER                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JSON2Video                                           │   │
│  │  - PHP SDK                                            │   │
│  │  - Cloud rendering                                    │   │
│  │  - No local dependencies                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. content-machine Integration

### Recommended Stack

| Component | Tool | Rationale |
|-----------|------|-----------|
| **ASR** | WhisperX | Word-level timestamps, diarization |
| **Python Composition** | Mosaico | AI script generation, LangChain integration |
| **MCP Rendering** | chuk-motion | AI-friendly, design system |
| **Caption Templates** | remotion-subtitles | 17 animated styles |
| **GitHub Automation** | Octokit | Repo management |

### Integration Pattern

```typescript
// content-machine video pipeline

// 1. Generate script (LLM)
const script = await llm.generateScript(topic);

// 2. Synthesize audio (TTS)
const audio = await tts.synthesize(script);

// 3. Transcribe with timestamps (WhisperX)
const captions = await whisperx.transcribe(audio, {
    model: 'large-v2',
    align: true,
    diarize: false,
});

// 4. Render video (chuk-motion MCP)
await mcp.call('remotion_create_project', {
    name: 'video',
    theme: 'tech',
});

await mcp.call('remotion_add_title_scene', {
    text: script.title,
    duration: '3s',
});

// 5. Add captions
for (const caption of captions.segments) {
    await mcp.call('remotion_add_text_overlay', {
        text: caption.text,
        start: caption.start,
        duration: caption.end - caption.start,
    });
}

// 6. Render to MP4
await mcp.call('remotion_render', {
    output: 'output.mp4',
});
```

---

## 8. Quick Reference

### WhisperX

```bash
# Basic
whisperx audio.wav

# With diarization
whisperx audio.wav --model large-v2 --diarize --hf_token TOKEN
```

### remotion-subtitles

```javascript
import { SubtitleSequence, TypewriterCaption } from "remotion-subtitle";
const subs = new SubtitleSequence("audio.srt");
await subs.ready();
const sequences = subs.getSequences(<TypewriterCaption />, 30);
```

### chuk-motion MCP

```bash
python -m chuk_motion.server stdio
```

### Mosaico

```python
from mosaico.video.project import VideoProject
from mosaico.video.rendering import render_video

project = VideoProject().with_title("My Video")
render_video(project, "output/")
```

### Octokit

```javascript
import { Octokit } from "octokit";
const octokit = new Octokit({ auth: TOKEN });
await octokit.rest.repos.get({ owner, repo });
```

---

## 9. Document Metadata

| Field | Value |
|-------|-------|
| **Document ID** | DD-077 |
| **Created** | 2026-01-02 |
| **Author** | Research Agent |
| **Status** | Complete |
| **Dependencies** | DD-044, DD-053, DD-058 |
