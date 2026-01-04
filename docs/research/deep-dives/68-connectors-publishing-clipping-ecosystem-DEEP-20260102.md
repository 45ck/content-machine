# Deep Dive #68: Connectors, Publishing & Clipping Ecosystem

**Document ID:** DD-068  
**Date:** 2026-01-02  
**Category:** Data Connectors, Publishing, Clipping  
**Status:** Complete  
**Word Count:** ~6,000

---

## Executive Summary

This deep dive covers three critical ecosystems for the content-machine platform:

1. **Data Connectors** – Reddit, YouTube, Google Trends APIs
2. **Publishing Tools** – TikTok, YouTube, Mixpost social media management
3. **Clipping Tools** – FunClip LLM-based clipping, PySceneDetect, AutoClipper

These components enable the full **input → processing → output** pipeline for automated content creation.

---

## 1. Data Connectors

### Overview

Data connectors provide the **input layer** for trend research and content sourcing. The vendored repositories cover three primary sources: Reddit, YouTube, and Google Trends.

### 1.1 Reddit Connectors

#### PRAW (Python Reddit API Wrapper)

**Source:** `vendor/connectors/reddit/praw/`  
**Stars:** 3k+  
**License:** BSD

PRAW is the standard Python library for Reddit API access.

```python
import praw

reddit = praw.Reddit(
    client_id="...",
    client_secret="...",
    user_agent="content-machine/1.0"
)

# Get trending posts from a subreddit
for submission in reddit.subreddit("technology").hot(limit=10):
    print(f"{submission.title} - {submission.score} upvotes")
```

#### AsyncPRAW

**Source:** `vendor/connectors/reddit/asyncpraw/`

Async version of PRAW for high-performance applications.

```python
import asyncpraw

async def get_trends():
    async with asyncpraw.Reddit(...) as reddit:
        subreddit = await reddit.subreddit("programming")
        async for submission in subreddit.hot(limit=10):
            print(submission.title)
```

#### Reddit MCP Servers (3 implementations)

| Server | Language | Notes |
|--------|----------|-------|
| `reddit-mcp-buddy` | Python | Buddy-style interaction |
| `reddit-mcp-geli` | Python | Extended features |
| `reddit-mcp-ts` | TypeScript | Native TS implementation |

**MCP Server Pattern:**

```python
from fastmcp import FastMCP

mcp = FastMCP("Reddit Trends")

@mcp.tool
async def get_trending_topics(subreddit: str, limit: int = 10) -> list:
    """Get trending topics from a subreddit."""
    reddit = praw.Reddit(...)
    posts = []
    for submission in reddit.subreddit(subreddit).hot(limit=limit):
        posts.append({
            "title": submission.title,
            "score": submission.score,
            "url": submission.url,
            "num_comments": submission.num_comments,
        })
    return posts
```

### 1.2 YouTube Connectors

#### yt-dlp

**Source:** `vendor/connectors/youtube/yt-dlp/`  
**Stars:** 85k+  
**License:** Unlicense (Public Domain)

yt-dlp is the most powerful video/audio downloader, supporting **thousands of sites**.

##### Key Features

| Feature | Description |
|---------|-------------|
| **Thousands of sites** | YouTube, TikTok, Instagram, etc. |
| **Format selection** | Choose quality, codec |
| **Subtitles** | Download captions |
| **Metadata** | Extract video info |
| **SponsorBlock** | Skip sponsor segments |

##### Code Pattern

```python
import yt_dlp

def download_video(url: str, output_path: str):
    ydl_opts = {
        'format': 'bestvideo[height<=1080]+bestaudio/best',
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitlesformat': 'srt',
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

def extract_info(url: str) -> dict:
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        return ydl.extract_info(url, download=False)
```

##### Use Cases for content-machine

1. **Trend Research:** Download popular videos for analysis
2. **Caption Extraction:** Get transcripts for script inspiration
3. **Thumbnail Analysis:** Extract thumbnails for A/B testing
4. **Competitor Analysis:** Study successful content formats

#### YouTube Transcript API

**Source:** `vendor/connectors/youtube/youtube-transcript-api/`

Direct access to YouTube video transcripts without downloading.

```python
from youtube_transcript_api import YouTubeTranscriptApi

# Get transcript with timestamps
transcript = YouTubeTranscriptApi.get_transcript("dQw4w9WgXcQ")
for entry in transcript:
    print(f"{entry['start']:.2f}s: {entry['text']}")
```

#### Google API Clients

| Repository | Language | Purpose |
|------------|----------|---------|
| `google-api-nodejs` | Node.js | YouTube Data API v3 |
| `google-api-python` | Python | YouTube Data API v3 |

**YouTube Data API Pattern:**

```python
from googleapiclient.discovery import build

youtube = build('youtube', 'v3', developerKey=API_KEY)

# Search for trending videos
request = youtube.search().list(
    part="snippet",
    maxResults=10,
    order="viewCount",
    type="video",
    publishedAfter="2026-01-01T00:00:00Z"
)
response = request.execute()
```

### 1.3 Google Trends (pytrends)

**Source:** `vendor/connectors/trends/pytrends/`  
**Stars:** 3k+  
**License:** Apache 2.0

#### Overview

pytrends is an unofficial API for Google Trends, enabling automated trend research.

#### Key Methods

| Method | Description |
|--------|-------------|
| `interest_over_time()` | Historical search interest |
| `interest_by_region()` | Geographic distribution |
| `related_topics()` | Related topics |
| `related_queries()` | Related search queries |
| `trending_searches()` | Daily trending searches |
| `realtime_search_trends()` | Real-time trends |

#### Code Pattern

```python
from pytrends.request import TrendReq

# Initialize with timezone
pytrends = TrendReq(hl='en-US', tz=360)

# Build payload for keywords
kw_list = ["AI video", "TikTok automation", "content creation"]
pytrends.build_payload(kw_list, timeframe='today 12-m', geo='US')

# Get interest over time
interest_df = pytrends.interest_over_time()
print(interest_df.head())

# Get related queries
related = pytrends.related_queries()
print(related['AI video']['rising'])

# Get trending searches
trending = pytrends.trending_searches(pn='united_states')
print(trending.head(10))
```

#### Caveats

- **Rate Limiting:** Google actively rate-limits requests
- **Proxy Support:** Use proxies for high-volume research
- **Unofficial:** May break when Google changes their backend

#### Content-Machine Integration

```python
@mcp.tool
async def get_trending_topics_google(geo: str = "US") -> list:
    """Get currently trending topics from Google Trends."""
    pytrends = TrendReq(hl='en-US', tz=360)
    trending = pytrends.trending_searches(pn='united_states')
    return trending.head(20).tolist()

@mcp.tool  
async def compare_keywords(keywords: list, timeframe: str = "today 3-m") -> dict:
    """Compare search interest for multiple keywords."""
    pytrends = TrendReq(hl='en-US', tz=360)
    pytrends.build_payload(keywords[:5], timeframe=timeframe)  # Max 5
    df = pytrends.interest_over_time()
    return df.to_dict()
```

### Connector Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Connectors Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   Reddit     │ │   YouTube    │ │   Google     │         │
│  │  (PRAW/MCP)  │ │  (yt-dlp)    │ │  (pytrends)  │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    MCP Server                            ││
│  │  @mcp.tool get_reddit_trends()                          ││
│  │  @mcp.tool get_youtube_videos()                         ││
│  │  @mcp.tool get_google_trends()                          ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Content Planning Agent                      ││
│  │                  (LangGraph)                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Publishing Tools

### Overview

Publishing tools handle the **output layer** – automatically uploading generated videos to social platforms.

### 2.1 TiktokAutoUploader

**Source:** `vendor/publish/TiktokAutoUploader/`  
**Stars:** 1k+  
**License:** MIT

#### Key Innovation

**Fastest TikTok uploader using Requests, not Selenium.** Uploads within 3 seconds.

#### Features

| Feature | Description |
|---------|-------------|
| **Fast Upload** | 3 seconds via API, not browser automation |
| **Multi-Account** | Handle multiple TikTok accounts |
| **Scheduling** | Schedule up to 10 days ahead |
| **YouTube Import** | Upload directly from YouTube Shorts links |
| **Cookie Management** | Persistent session handling |

#### Prerequisites

```bash
# Requires Node.js for signature generation
npm install  # in tiktok-signature directory
```

#### Usage Pattern

```bash
# Step 1: Login and save cookies
python cli.py login -n my_account

# Step 2: Upload video
python cli.py upload --user my_account -v "video.mp4" -t "My awesome video"

# Step 3: Upload from YouTube Shorts
python cli.py upload --user my_account -yt "https://youtube.com/shorts/xxx" -t "Repost"
```

#### Python API

```python
from tiktok_uploader import TikTokUploader

uploader = TikTokUploader(cookies_file="cookies/my_account.json")

uploader.upload(
    video_path="output/video.mp4",
    title="AI-generated productivity tips",
    tags=["productivity", "AI", "tips"],
    schedule_time=None  # or datetime for scheduling
)
```

#### Risks & Considerations

⚠️ **Unofficial API:** Uses reverse-engineered endpoints, may break anytime  
⚠️ **ToS Risk:** Violates TikTok's Terms of Service  
⚠️ **Rate Limiting:** Aggressive uploads may trigger account restrictions

### 2.2 Mixpost

**Source:** `vendor/publish/mixpost/`  
**Stars:** 1.5k+  
**License:** MIT

#### Overview

Mixpost is a **robust social media management platform** for scheduling and publishing content across multiple platforms.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Platform** | Twitter, Facebook, Instagram, LinkedIn, etc. |
| **Scheduling** | Visual calendar management |
| **Team Collaboration** | Workspaces, permissions |
| **Analytics** | Per-platform performance metrics |
| **Post Templates** | Reusable content templates |
| **Queue Management** | Natural posting schedule |

#### Architecture

Mixpost is a **PHP/Laravel application** designed for self-hosting.

```bash
# Installation (via Composer)
composer require inovector/mixpost

# Configuration
php artisan mixpost:install
php artisan migrate
```

#### Integration Approach

For content-machine (TypeScript/Python stack), Mixpost can be:

1. **Self-hosted** as a separate service
2. **API-integrated** for publishing actions
3. **Reference only** – study patterns for custom implementation

#### Mixpost Pro Features (Paid)

| Feature | Lite | Pro |
|---------|------|-----|
| Multi-account | ✅ | ✅ |
| Scheduling | ✅ | ✅ |
| Team workspaces | ❌ | ✅ |
| Analytics | Basic | Advanced |
| White-labeling | ❌ | ✅ |

### 2.3 Other Publishing Tools

| Tool | Purpose | Status |
|------|---------|--------|
| `youtube-upload` | YouTube video upload | Reference |
| `rednote-instagram-auto-uploader` | Instagram automation | Unofficial |
| `my-youtube-automation` | YouTube workflow | Reference |
| `go-youtube-reddit-automation` | Go-based automation | Reference |

### Publishing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Publishing Layer                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Video Ready for Publishing                                  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               Publishing MCP Server                      ││
│  │                                                          ││
│  │  @mcp.tool upload_to_tiktok(video, title, tags)         ││
│  │  @mcp.tool upload_to_youtube(video, title, desc)        ││
│  │  @mcp.tool schedule_post(platform, video, datetime)      ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ├────────────────┬────────────────┐                  │
│         ▼                ▼                ▼                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   TikTok     │ │   YouTube    │ │   Mixpost    │         │
│  │   Uploader   │ │   Data API   │ │   (Multi)    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Clipping Tools

### Overview

Clipping tools enable **intelligent video segmentation** – identifying and extracting the most engaging portions of longer content.

### 3.1 FunClip

**Source:** `vendor/clipping/FunClip/`  
**Creator:** Alibaba DAMO Academy  
**Stars:** 5k+  
**License:** MIT

#### Core Innovation

FunClip is an **LLM-powered video clipping tool** that uses Alibaba's Paraformer ASR for speech recognition, then allows LLM-guided clip selection.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Paraformer ASR** | Industrial-grade Chinese + English recognition |
| **LLM Clipping** | GPT/Qwen-based intelligent clip selection |
| **Speaker Diarization** | CAM++ speaker recognition |
| **Hotword Support** | Customize entity recognition |
| **Subtitle Generation** | Full SRT output |
| **Multi-language** | Chinese, English |

#### Architecture

```
┌───────────────────────────────────────────────────────────┐
│                        FunClip                             │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  1. ASR (Paraformer-Large)                                │
│     └── Speech → Text with timestamps                     │
│                                                            │
│  2. Speaker Diarization (CAM++)                           │
│     └── Identify speaker segments                         │
│                                                            │
│  3. LLM Inference (GPT/Qwen)                              │
│     └── Select best clips based on prompt                 │
│                                                            │
│  4. Video Clipping (FFmpeg)                               │
│     └── Extract selected segments                         │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

#### Usage Patterns

##### Gradio Interface

```bash
python funclip/launch.py
# Visit localhost:7860

# Steps:
# 1. Upload video
# 2. Click "Recognize" for ASR
# 3. Select LLM model + configure API key
# 4. Click "LLM Inference" for suggestions
# 5. Click "AI Clip" to extract segments
```

##### Command Line

```bash
# Step 1: Recognize
python funclip/videoclipper.py --stage 1 \
    --file video.mp4 \
    --output_dir ./output

# Step 2: Clip specific text
python funclip/videoclipper.py --stage 2 \
    --file video.mp4 \
    --output_dir ./output \
    --dest_text "the key innovation is..." \
    --start_ost 0 \
    --end_ost 100 \
    --output_file './output/clip.mp4'
```

#### LLM Clipping Workflow

1. **ASR Processing:** Video → Transcript with timestamps
2. **Prompt Engineering:** Combine SRT with LLM prompt
3. **LLM Analysis:** Model suggests best clips
4. **Timestamp Extraction:** Parse LLM output for timestamps
5. **Video Export:** FFmpeg extracts segments

#### Integration with content-machine

FunClip can be wrapped as an MCP server:

```python
@mcp.tool
async def analyze_video_for_clips(
    video_path: str,
    prompt: str = "Find the most engaging 30-second segments"
) -> list:
    """Use LLM to identify best clips in a video."""
    # 1. Run ASR
    transcript = await run_paraformer(video_path)
    
    # 2. LLM analysis
    clips = await analyze_with_llm(transcript, prompt)
    
    return clips

@mcp.tool
async def extract_clip(
    video_path: str,
    start_time: float,
    end_time: float,
    output_path: str
) -> str:
    """Extract a clip from video."""
    # Use FFmpeg
    return await extract_segment(video_path, start_time, end_time, output_path)
```

### 3.2 PySceneDetect

**Source:** `vendor/clipping/pyscenedetect/`  
**Stars:** 2k+  
**License:** BSD

#### Overview

PySceneDetect detects scene changes in videos, useful for automatic segmentation.

#### Detection Algorithms

| Algorithm | Description | Use Case |
|-----------|-------------|----------|
| **ContentDetector** | Color/brightness changes | General purpose |
| **ThresholdDetector** | Fade in/out detection | Presentations |
| **AdaptiveDetector** | Adaptive thresholding | Varied content |

#### Code Pattern

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Detect scenes
scene_list = detect('video.mp4', ContentDetector())

# Print scene boundaries
for i, scene in enumerate(scene_list):
    print(f'Scene {i+1}: {scene[0]} - {scene[1]}')

# Split video at scene boundaries
split_video_ffmpeg('video.mp4', scene_list)
```

### 3.3 Other Clipping Tools

| Tool | Description | Stars |
|------|-------------|-------|
| `ai-highlight-clip` | AI-powered highlight detection | ~500 |
| `autoclipper` | Automatic clip generation | ~200 |
| `Video-AutoClip` | Auto-clipping pipeline | ~100 |
| `awesome-free-opusclip-alternatives` | OpusClip alternatives list | Reference |

### Clipping Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Clipping Pipeline                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Source Video (Long-form)                                   │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               Scene Detection                            ││
│  │            (PySceneDetect)                               ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               Speech Recognition                         ││
│  │         (FunClip + Paraformer / WhisperX)               ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               LLM Clip Selection                         ││
│  │         (FunClip + GPT/Claude/Qwen)                      ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │               Video Extraction                           ││
│  │                  (FFmpeg)                                ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  Short-form Clips (TikTok/Reels/Shorts ready)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Integration Recommendations

### Data Collection Layer

| Source | Tool | MCP Server |
|--------|------|------------|
| Reddit | PRAW + AsyncPRAW | `reddit-trends-mcp` |
| YouTube | yt-dlp + Data API | `youtube-trends-mcp` |
| Google Trends | pytrends | `google-trends-mcp` |

### Content Processing Layer

| Task | Tool | Integration |
|------|------|-------------|
| Scene Detection | PySceneDetect | Python library |
| ASR | WhisperX / Paraformer | MCP tool |
| LLM Clipping | FunClip | MCP tool |
| Caption Generation | WhisperX | MCP tool |

### Publishing Layer

| Platform | Tool | Integration |
|----------|------|-------------|
| TikTok | TiktokAutoUploader | MCP tool (with risks) |
| YouTube | YouTube Data API | Official API |
| Multi-platform | Mixpost | Self-hosted service |

### Complete MCP Server Example

```python
from fastmcp import FastMCP
import praw
import yt_dlp
from pytrends.request import TrendReq

mcp = FastMCP("Content Machine - Data Connectors")

# === REDDIT ===
@mcp.tool
async def get_reddit_trending(subreddit: str, limit: int = 10) -> list:
    """Get trending posts from a subreddit."""
    reddit = praw.Reddit(...)
    posts = []
    for post in reddit.subreddit(subreddit).hot(limit=limit):
        posts.append({
            "title": post.title,
            "score": post.score,
            "url": post.url,
        })
    return posts

# === YOUTUBE ===
@mcp.tool
async def download_youtube_video(url: str, output_dir: str) -> dict:
    """Download a YouTube video with metadata."""
    opts = {
        'format': 'bestvideo[height<=1080]+bestaudio/best',
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'writesubtitles': True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return {"title": info['title'], "duration": info['duration']}

@mcp.tool
async def get_youtube_transcript(video_id: str) -> list:
    """Get transcript for a YouTube video."""
    from youtube_transcript_api import YouTubeTranscriptApi
    return YouTubeTranscriptApi.get_transcript(video_id)

# === GOOGLE TRENDS ===
@mcp.tool
async def get_trending_searches(country: str = "united_states") -> list:
    """Get today's trending searches from Google."""
    pytrends = TrendReq(hl='en-US', tz=360)
    trending = pytrends.trending_searches(pn=country)
    return trending.head(20).tolist()

@mcp.tool
async def compare_search_interest(keywords: list) -> dict:
    """Compare search interest for multiple keywords."""
    pytrends = TrendReq(hl='en-US', tz=360)
    pytrends.build_payload(keywords[:5], timeframe='today 3-m')
    df = pytrends.interest_over_time()
    return df.to_dict()

if __name__ == "__main__":
    mcp.run()
```

---

## 5. Risk Assessment

### Legal & ToS Risks

| Tool | Risk Level | Concern |
|------|------------|---------|
| PRAW | Low | Official API with rate limits |
| yt-dlp | Medium | May violate YouTube ToS |
| pytrends | Medium | Unofficial, may break |
| TiktokAutoUploader | High | Violates TikTok ToS |
| Mixpost | Low | Self-hosted, uses official APIs |

### Mitigation Strategies

1. **Rate Limiting:** Implement exponential backoff
2. **Proxies:** Use rotating proxies for high-volume operations
3. **Official APIs:** Prefer official APIs where available
4. **Fallback Systems:** Have alternative data sources
5. **Account Separation:** Don't use main accounts for automation

---

## 6. Document Metadata

| Field | Value |
|-------|-------|
| **Document ID** | DD-068 |
| **Created** | 2026-01-02 |
| **Last Updated** | 2026-01-02 |
| **Author** | Research Agent |
| **Status** | Complete |
| **Dependencies** | DD-067 |

---

## 7. Quick Reference

### yt-dlp Download

```python
import yt_dlp
with yt_dlp.YoutubeDL({'format': 'best'}) as ydl:
    ydl.download([url])
```

### pytrends Trending

```python
from pytrends.request import TrendReq
pytrends = TrendReq()
trending = pytrends.trending_searches(pn='united_states')
```

### PRAW Reddit

```python
import praw
reddit = praw.Reddit(client_id=..., client_secret=..., user_agent=...)
for post in reddit.subreddit("technology").hot(limit=10):
    print(post.title)
```

### FunClip ASR + Clip

```bash
python funclip/videoclipper.py --stage 1 --file video.mp4 --output_dir ./output
python funclip/videoclipper.py --stage 2 --file video.mp4 --dest_text "target text" --output_file clip.mp4
```

---

**Key Takeaways:**

1. **yt-dlp** is the gold standard for video downloading (85k+ stars)
2. **pytrends** enables Google Trends automation (use with proxies)
3. **FunClip** provides LLM-powered intelligent clipping
4. **TiktokAutoUploader** is fast but risky (ToS violation)
5. **Mixpost** is best for legitimate multi-platform publishing
6. **MCP wrapping** unifies all tools under one interface
