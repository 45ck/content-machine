# Master Video Generator Patterns Synthesis

> **Created:** 2026-01-02
> **Status:** Master Research Document
> **Purpose:** Definitive patterns guide for content-machine architecture

---

## Executive Summary

After analyzing 30+ video generator repositories in the content-machine vendor directory, this document synthesizes all discovered patterns into actionable architectural recommendations.

---

## Table of Contents

1. [Pipeline Architecture Patterns](#1-pipeline-architecture-patterns)
2. [Script Generation Patterns](#2-script-generation-patterns)
3. [Audio/TTS Patterns](#3-audiotts-patterns)
4. [Alignment & Captioning Patterns](#4-alignment--captioning-patterns)
5. [Video Composition Patterns](#5-video-composition-patterns)
6. [Content Discovery Patterns](#6-content-discovery-patterns)
7. [Orchestration Patterns](#7-orchestration-patterns)
8. [Publishing Patterns](#8-publishing-patterns)
9. [Key Code Patterns Reference](#9-key-code-patterns-reference)
10. [Architecture Recommendations](#10-architecture-recommendations)

---

## 1. Pipeline Architecture Patterns

### 1.1 Monolithic vs Modular

| Pattern | Repos | Pros | Cons |
|---------|-------|------|------|
| **Single File** | youtube-auto-shorts, TikTokAIVideoGenerator | Simple deployment, easy to understand | Hard to test, modify |
| **Utility Modules** | Faceless-short, shorts_maker | Clear separation, reusable | Still tightly coupled |
| **Plugin Architecture** | Crank | Extensible, swap components | More complex setup |
| **Agent Graph** | VideoGraphAI | Full autonomy, debuggable | Highest complexity |
| **Docker Services** | AutoTube, Viral-Faceless | Isolated, scalable | DevOps overhead |

### 1.2 Standard Pipeline Stages

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────────┐
│   Content   │ → │    Script    │ → │    Audio    │ → │  Alignment   │
│   Source    │   │  Generation  │   │    (TTS)    │   │  (Captions)  │
└─────────────┘   └──────────────┘   └─────────────┘   └──────────────┘
       │                                                       │
       ▼                                                       ▼
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────────┐
│   Visual    │ ← │    Video     │ ← │  Subtitle   │ ← │   Caption    │
│   Source    │   │ Composition  │   │   Styling   │   │   Chunking   │
└─────────────┘   └──────────────┘   └─────────────┘   └──────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐   ┌──────────────┐
│  Metadata   │ → │   Publish    │
│ Generation  │   │   Upload     │
└─────────────┘   └──────────────┘
```

---

## 2. Script Generation Patterns

### 2.1 LLM Prompt Templates

**Basic Script Prompt (MoneyPrinterV2)**
```python
prompt = f"""
Generate a script for a video in {sentence_length} sentences.

REQUIREMENTS:
- Get straight to the point, no "welcome to this video"
- Related to the subject of the video
- NO markdown, NO formatting, NO titles
- Language: {language}

Subject: {subject}
"""
```

**Viral Segment Detection (AI-short-creator)**
```python
prompt = f"""
This is a transcript of a video/podcast. 
Identify the most viral sections (30-58 seconds).
Provide extremely accurate timestamps.

Output format:
[{{"start_time": 0.0, "end_time": 55.26, "description": "..."}}]

Transcription:
{subtitle_content}
"""
```

**Curriculum Generation (Gemini-YouTube-Automation)**
```python
prompt = f"""
Generate a curriculum for 'AI for Developers'.
The series covers:
- Generative AI, LLMs, Vector Databases
- Transformers, multi-agent systems, LangGraph

Output valid JSON:
{{"lessons": [{{"chapter", "part", "title", "status": "pending"}}]}}
"""
```

### 2.2 LLM Provider Patterns

| Provider | Repos | Cost | Notes |
|----------|-------|------|-------|
| **g4f (gpt4free)** | MoneyPrinterV2, YASGU | Free | Unofficial, may break |
| **OpenRouter** | youtube-auto-shorts | Pay-per-use | Multi-model access |
| **OpenAI Direct** | AI-short-creator | Pay-per-use | Most reliable |
| **Gemini** | gemini-youtube-automation | Free tier | Good for prototyping |
| **Ollama Local** | AutoTube | Free | Requires GPU |
| **Groq** | TikTokAIVideoGenerator | Free tier | Fast inference |

---

## 3. Audio/TTS Patterns

### 3.1 TTS Options Comparison

| TTS | Repos | Cost | Quality | Word Timestamps |
|-----|-------|------|---------|-----------------|
| **Edge TTS** | Faceless-short, ShortGPT | Free | Good | No (need Whisper) |
| **Coqui XTTS** | OBrainRot, MoneyPrinterV2 | Free | Excellent | No (need alignment) |
| **Kokoro** | TikTokAIVideoGenerator | Free | Excellent | Yes (native) |
| **Google gTTS** | Gemini-YouTube | Free | Poor | No |
| **OpenTTS** | AutoTube | Free | Good | No |
| **ElevenLabs** | shortrocity | Paid | Best | Yes |
| **UnrealSpeech** | Cassette | Paid | Good | No |

### 3.2 TTS Code Pattern

```python
# Edge TTS (most common free option)
import edge_tts

async def generate_audio(text: str, output_path: str, voice: str = "en-AU-WilliamNeural"):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

# Kokoro TTS (OpenAI-compatible with word timestamps)
from kokoro import KokoroTTS

tts = KokoroTTS()
result = tts.generate(text, voice="af_bella")
# result.word_timestamps available!
```

---

## 4. Alignment & Captioning Patterns

### 4.1 Alignment Methods

| Method | Repos | Accuracy | Speed | Use Case |
|--------|-------|----------|-------|----------|
| **Whisper Timestamped** | Faceless-short, AI-reels | Good | Slow | Unknown text |
| **Wav2Vec2 Forced** | OBrainRot | Excellent | Fast | Known text (TTS) |
| **WhisperX** | shorts_maker | Excellent | Medium | Word-level needed |
| **AssemblyAI** | youtube-auto-shorts | Excellent | Fast | Production, paid |
| **Aeneas** | Viral-Faceless | Good | Fast | Simple alignment |

### 4.2 Caption Chunking Algorithm

```python
def split_words_by_size(words: List[str], max_size: int = 15) -> List[str]:
    """Chunk words into caption-sized groups."""
    half_size = max_size / 2
    captions = []
    
    while words:
        caption = words[0]
        words = words[1:]
        
        while words and len(caption + ' ' + words[0]) <= max_size:
            caption += ' ' + words[0]
            words = words[1:]
            # Break at half capacity for natural pauses
            if len(caption) >= half_size and words:
                break
        
        captions.append(caption)
    
    return captions
```

### 4.3 Wav2Vec2 Forced Alignment (from OBrainRot)

```python
import torch
import torchaudio

def force_align(audio_path: str, transcript: str) -> List[dict]:
    bundle = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
    model = bundle.get_model()
    labels = bundle.get_labels()
    
    waveform, _ = torchaudio.load(audio_path)
    emissions, _ = model(waveform)
    emissions = torch.log_softmax(emissions, dim=-1)
    
    # Build trellis (CTC alignment)
    trellis = build_trellis(emissions, transcript, labels)
    
    # Backtrack to get path
    path = backtrack(trellis, emissions, labels)
    
    # Merge into words
    words = merge_words(path, transcript)
    
    return words  # [{word, start, end, score}, ...]
```

---

## 5. Video Composition Patterns

### 5.1 Framework Comparison

| Framework | Repos | Language | Rendering | Best For |
|-----------|-------|----------|-----------|----------|
| **Remotion** | short-video-maker-gyori, tiktok-automatic | TypeScript | Server | Animations, React devs |
| **MoviePy** | Faceless-short, AutoTube | Python | Local | Quick prototyping |
| **FFmpeg Direct** | VideoShortsCreator | CLI | Local | Complex filters, ASS subs |
| **Shotstack API** | shortrocity | REST | Cloud | No infra, paid |

### 5.2 MoviePy Composition Pattern

```python
from moviepy.editor import (
    VideoFileClip, ImageClip, TextClip, AudioFileClip,
    CompositeVideoClip, CompositeAudioClip, concatenate_videoclips
)

def create_video(images, audio_path, captions, output_path):
    audio = AudioFileClip(audio_path)
    duration = audio.duration
    clip_duration = duration / len(images)
    
    clips = []
    for img_path in images:
        clip = ImageClip(img_path)
        clip = clip.set_duration(clip_duration)
        clip = clip.resize((1080, 1920))  # Shorts format
        clips.append(clip)
    
    video = concatenate_videoclips(clips)
    
    # Add captions
    for (start, end), text in captions:
        txt = TextClip(text, fontsize=70, color="white", 
                      stroke_color="black", stroke_width=2)
        txt = txt.set_start(start).set_end(end)
        txt = txt.set_position(("center", "bottom"))
        clips.append(txt)
    
    final = CompositeVideoClip(clips)
    final = final.set_audio(audio)
    final.write_videofile(output_path, fps=30)
```

### 5.3 Ken Burns Zoom Effect

```python
def create_image_scene(image_path, duration=6, zoom=True):
    img = ImageClip(image_path).with_duration(duration)
    
    if zoom:
        # Ken Burns: 1.0x → 1.08x zoom over duration
        img = img.resized(lambda t: 1 + 0.08 * (t / duration))
    
    return img
```

### 5.4 ASS Subtitle Animation Tags

```python
# Elastic bounce effect
text = f"{{\\an5\\t(0, 100, \\fscx120\\fscy120)\\t(100, 400, \\fscx115\\fscy115)}}{word}"

# Color themes
color_map = {
    "Yellow/White": {"primary": "&H00FFFFFF", "highlight": "&H0000FFFF"},
    "Neon Blue/White": {"primary": "&H00FFFFFF", "highlight": "&H00FFD700"}
}
```

---

## 6. Content Discovery Patterns

### 6.1 Reddit Integration

```python
# PRAW (Python Reddit API Wrapper)
import praw

reddit = praw.Reddit(
    client_id=client_id,
    client_secret=client_secret,
    user_agent=user_agent
)

for post in reddit.subreddit("AmItheAsshole").hot(limit=10):
    if post.selftext and len(post.selftext) > 500:
        yield post
```

### 6.2 Video Search Query Generation

```python
VIDEO_SEARCH_PROMPT = """
Generate video search keywords for Pexels/Unsplash:
{
  "segments": [
    {"time_range": [0, 4], "keywords": ["sunset beach", "ocean waves"]}
  ]
}

Guidelines:
- 3 VISUAL keywords per segment (2-4 seconds)
- Concrete terms (e.g., "dog running" not "happy moment")
- Cover entire video duration
"""
```

### 6.3 Google Trends Scraping

```javascript
// Puppeteer-based trend scraping (Viral-Faceless)
const page = await browser.newPage();
await page.goto('https://trends.google.com/trending');
const trends = await page.$$eval('.trending-searches', els => 
    els.map(el => el.textContent)
);
```

---

## 7. Orchestration Patterns

### 7.1 Options Comparison

| Orchestration | Repos | Complexity | Best For |
|---------------|-------|------------|----------|
| **Sequential Python** | Most repos | Low | Prototyping |
| **n8n Workflows** | AutoTube | Medium | Visual debugging |
| **Docker Compose** | Viral-Faceless | Medium | Multi-service |
| **GitHub Actions** | gemini-youtube | Low | Scheduled jobs |
| **Agent Graph** | VideoGraphAI | High | Autonomous agents |
| **BullMQ** | short-video-maker-gyori | Medium | Job queues |

### 7.2 BullMQ Job Queue Pattern

```typescript
import { Queue, Worker } from 'bullmq';

const videoQueue = new Queue('video-generation');

// Add job
await videoQueue.add('generate', {
    topic: 'AI in 2025',
    style: 'educational',
    duration: 60
});

// Process job
const worker = new Worker('video-generation', async (job) => {
    const { topic, style, duration } = job.data;
    
    await job.updateProgress(10);
    const script = await generateScript(topic);
    
    await job.updateProgress(30);
    const audio = await generateAudio(script);
    
    await job.updateProgress(60);
    const video = await renderVideo(audio, style);
    
    return { videoPath: video };
});
```

### 7.3 Agent Graph Pattern (VideoGraphAI)

```python
from abc import ABC, abstractmethod

class Agent(ABC):
    def __init__(self, name: str, model: str):
        self.name = name
        self.model = model
    
    @abstractmethod
    async def execute(self, input_data: Any) -> Any:
        pass

class Node:
    def __init__(self, agent: Agent = None):
        self.agent = agent
        self.edges: List[Edge] = []
    
    async def process(self, data: Any) -> Any:
        result = await self.agent.execute(data)
        for edge in self.edges:
            edge.target.process(result)
        return result

class Graph:
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
    
    async def run(self, start_node: str, input_data: Any):
        return await self.nodes[start_node].process(input_data)
```

---

## 8. Publishing Patterns

### 8.1 Upload Methods

| Platform | Method | Repos | Notes |
|----------|--------|-------|-------|
| **YouTube** | Selenium | MoneyPrinterV2, YASGU | Unofficial, may break |
| **YouTube** | Official API | gemini-youtube | Quota limits |
| **TikTok** | Selenium | viralfactory | Unofficial |
| **TikTok** | Unofficial API | tiktok-uploader | May break |
| **Multi-platform** | Postiz | postiz | Self-hosted |

### 8.2 Selenium Upload Pattern

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

def upload_to_youtube(video_path: str, title: str, description: str):
    driver = webdriver.Firefox()
    driver.get("https://www.youtube.com/upload")
    
    # Upload file
    file_input = driver.find_element(By.TAG_NAME, "input")
    file_input.send_keys(video_path)
    
    # Set metadata
    title_el = driver.find_element(By.ID, "textbox")
    title_el.send_keys(title)
    
    # Click through wizard
    for _ in range(3):
        next_btn = driver.find_element(By.ID, "next-button")
        next_btn.click()
        time.sleep(2)
    
    # Publish
    done_btn = driver.find_element(By.ID, "done-button")
    done_btn.click()
```

---

## 9. Key Code Patterns Reference

### 9.1 Abbreviation Expansion (shorts_maker)

```python
ABBREVIATION_TUPLES = [
    ("AITA", "Am I the asshole ", " "),
    ("NTA", "Not the asshole ", " "),
    ("YTA", "You're the Asshole", ""),
    (" BF ", " boyfriend ", ""),
    (" GF ", " girlfriend ", ""),
    ("MIL", "mother in law ", " "),
]

def expand_abbreviations(text: str) -> str:
    for abbr, replacement, padding in ABBREVIATION_TUPLES:
        text = text.replace(abbr + padding, replacement)
        text = text.replace(padding + abbr, replacement)
    return text
```

### 9.2 Aspect Ratio Cropping

```python
def crop_to_shorts(clip):
    """Crop video to 9:16 aspect ratio."""
    if round((clip.w/clip.h), 4) < 0.5625:
        # Too tall, crop height
        clip = crop(clip, 
                   width=clip.w, 
                   height=round(clip.w/0.5625),
                   x_center=clip.w / 2, 
                   y_center=clip.h / 2)
    else:
        # Too wide, crop width
        clip = crop(clip, 
                   width=round(0.5625*clip.h), 
                   height=clip.h,
                   x_center=clip.w / 2, 
                   y_center=clip.h / 2)
    return clip.resize((1080, 1920))
```

### 9.3 Frame Analysis (ShortReelX)

```javascript
const tf = require("@tensorflow/tfjs-node");
const mobilenet = require("@tensorflow-models/mobilenet");

async function scoreFrames(videoPath, frameCount) {
    const frames = await extractFrames(videoPath, frameCount);
    const model = await mobilenet.load();
    
    const scores = await Promise.all(frames.map(async (frame) => {
        const tensor = tf.node.decodeImage(frame);
        const predictions = await model.classify(tensor);
        const score = predictions.reduce((acc, p) => 
            acc + p.probability, 0) / predictions.length;
        return { frame, score };
    }));
    
    return scores.sort((a, b) => b.score - a.score);
}
```

---

## 10. Architecture Recommendations

### 10.1 Recommended Stack for content-machine

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Language** | TypeScript | Type safety, Remotion compatibility |
| **Rendering** | Remotion | React-based, best animations |
| **TTS** | Kokoro-FastAPI | Free, word timestamps, OpenAI-compatible |
| **Alignment** | Wav2Vec2 (known text) / WhisperX (unknown) | Best accuracy |
| **Queue** | BullMQ | Redis-backed, job management |
| **Orchestration** | LangGraph | Agent-based, debuggable |
| **MCP** | FastMCP-TS | Tool integration |
| **Storage** | MinIO | S3-compatible, local |
| **Database** | PostgreSQL + Prisma | Type-safe ORM |

### 10.2 Recommended Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                        Content-Machine Pipeline                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │   Content   │    │   Script    │    │   Kokoro-FastAPI    │   │
│  │   Agents    │ →  │   Agent     │ →  │   (TTS + Stamps)    │   │
│  │ (LangGraph) │    │  (Claude)   │    │                     │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│         │                                        │                │
│         ▼                                        ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │   Visual    │    │   Remotion  │    │   Caption Chunker   │   │
│  │   Sources   │ →  │   Render    │ ←  │   (Word → Groups)   │   │
│  │ (Pexels/AI) │    │   Engine    │    │                     │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│                            │                                      │
│                            ▼                                      │
│                     ┌─────────────┐    ┌─────────────────────┐   │
│                     │   BullMQ    │    │      MinIO          │   │
│                     │    Jobs     │ →  │     Storage         │   │
│                     └─────────────┘    └─────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 Key Architectural Decisions

1. **Use Remotion over MoviePy**
   - Better animations, TypeScript type safety
   - React component model for UI capture
   - Server-side rendering for scale

2. **Kokoro-FastAPI for TTS**
   - OpenAI-compatible API (drop-in replacement)
   - Word-level timestamps (no Whisper needed)
   - Free, open-source

3. **Plugin Architecture for Video Sources**
   - Abstract `VideoSourcePlugin` interface
   - Support Pexels, Unsplash, AI-generated, local stock

4. **Wav2Vec2 for TTS Alignment**
   - More accurate than Whisper for known text
   - Use WhisperX for transcription of unknown audio

5. **Agent Graph for Orchestration**
   - Each agent handles one responsibility
   - Debuggable traces
   - Easy to add new capabilities

### 10.4 Implementation Priority

1. **Phase 1: Core Pipeline (Week 1-2)**
   - Remotion template with caption components
   - Kokoro-FastAPI integration
   - Basic BullMQ job queue

2. **Phase 2: Content Sources (Week 3-4)**
   - Reddit MCP connector
   - Pexels/Unsplash video search
   - LLM script generation

3. **Phase 3: Agent Integration (Week 5-6)**
   - LangGraph planning agent
   - Virality scoring agent
   - Metadata generation agent

4. **Phase 4: Publishing (Week 7-8)**
   - YouTube API upload
   - Postiz integration
   - Scheduling system

---

## Appendix: Repo Quick Reference

| Repo | Key Pattern | File |
|------|-------------|------|
| OBrainRot | Wav2Vec2 alignment | `force_alignment.py` |
| Crank | Plugin architecture | `docs/PLUGIN_GUIDE.md` |
| AutoTube | n8n + Ken Burns | `scripts/create_video.py` |
| tiktok-automatic-videos | Remotion + cloud assets | `src/Video.tsx` |
| VideoShortsCreator | ASS subtitle styling | `video_editing.py` |
| VideoGraphAI | Agent graph | `app.py` |
| Viral-Faceless | Google Trends pipeline | `trendscraper/` |
| shorts_maker | Reddit + WhisperX | `ShortsMaker/shorts_maker.py` |
| MoneyPrinterV2 | Full automation | `src/classes/YouTube.py` |

---

**Document Complete - Ready for Architecture Decisions**
