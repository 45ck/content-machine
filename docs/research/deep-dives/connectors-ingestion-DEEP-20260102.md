# Deep Dive: Data Connectors & Ingestion Infrastructure

**Created:** 2026-01-02  
**Type:** Research Deep Dive  
**Category:** Data Acquisition Components

---

## Executive Summary

This document analyzes the complete data connector and ingestion infrastructure in the vendor directory. These components enable content-machine to gather trends, content, and media from external sources for video generation.

**Stack Recommendation:**

- **Reddit:** reddit-mcp-ts (TypeScript MCP server, full CRUD)
- **YouTube:** youtube-transcript-api (transcripts) + yt-dlp (downloads)
- **Trends:** pytrends (Google Trends API)
- **Web Crawling:** Firecrawl (LLM-ready markdown) + Tavily (search/research)
- **UI Capture:** Playwright (MCP integration)
- **TTS:** Kokoro-FastAPI (OpenAI-compatible, voice mixing)

---

## 1. Reddit Connectors

### 1.1 reddit-mcp-ts - MCP Server for Reddit

**Repository:** `vendor/connectors/reddit/reddit-mcp-ts/`  
**Purpose:** TypeScript MCP server for Reddit with full CRUD operations  
**License:** MIT

**Available Tools:**

| Tool                      | Authentication | Description                  |
| ------------------------- | -------------- | ---------------------------- |
| `get_reddit_post`         | Client         | Get specific Reddit post     |
| `get_top_posts`           | Client         | Get top posts from subreddit |
| `get_user_info`           | Client         | Get user information         |
| `get_subreddit_info`      | Client         | Get subreddit details        |
| `get_trending_subreddits` | Client         | Get trending subreddits      |
| `search_reddit`           | Client         | Search posts with filters    |
| `get_post_comments`       | Client         | Get post comments            |
| `get_user_posts`          | Client         | Get user's posts             |
| `get_user_comments`       | Client         | Get user's comments          |
| `create_post`             | User           | Create new post              |
| `reply_to_post`           | User           | Reply to post                |
| `edit_post`               | User           | Edit own post                |
| `delete_post`             | User           | Delete own post              |

**Installation:**

```bash
npx -y @smithery/cli install reddit-mcp-server --client claude
```

**Claude Desktop Config:**

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "<YOUR_CLIENT_ID>",
        "REDDIT_CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "REDDIT_USERNAME": "<YOUR_USERNAME>",
        "REDDIT_PASSWORD": "<YOUR_PASSWORD>"
      }
    }
  }
}
```

**HTTP Mode (FastMCP):**

```bash
PORT=8080 node dist/index.js
```

**Content-Machine Integration:**

- Primary connector for Reddit trend research
- MCP-native for AI agent integration
- TypeScript for consistency with render pipeline
- HTTP mode for direct API access

### 1.2 PRAW / AsyncPRAW

**Repositories:**

- `vendor/connectors/reddit/praw/`
- `vendor/connectors/reddit/asyncpraw/`

**Purpose:** Official Python Reddit API wrappers

**Basic Usage:**

```python
import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="content-machine/1.0"
)

# Get top posts
subreddit = reddit.subreddit("programming")
for post in subreddit.top(limit=10, time_filter="day"):
    print(f"{post.title}: {post.score} upvotes")
```

**AsyncPRAW:**

```python
import asyncpraw

async def get_posts():
    async with asyncpraw.Reddit(
        client_id="YOUR_CLIENT_ID",
        client_secret="YOUR_CLIENT_SECRET",
        user_agent="content-machine/1.0"
    ) as reddit:
        subreddit = await reddit.subreddit("programming")
        async for post in subreddit.top(limit=10):
            print(post.title)
```

**Content-Machine Integration:**

- Python alternative for backend services
- AsyncPRAW for high-concurrency trend scraping
- Full Reddit API coverage

---

## 2. YouTube Connectors

### 2.1 youtube-transcript-api

**Repository:** `vendor/connectors/youtube/youtube-transcript-api/`  
**Purpose:** Retrieve video transcripts without browser automation  
**License:** MIT

**Installation:**

```bash
pip install youtube-transcript-api
```

**Basic Usage:**

```python
from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()

# Fetch transcript (returns FetchedTranscript object)
transcript = ytt_api.fetch("video_id")

# Iterate over snippets
for snippet in transcript:
    print(f"{snippet.start:.2f}s: {snippet.text}")

# Get raw data as list of dicts
raw_data = transcript.to_raw_data()
# [{'text': 'Hello', 'start': 0.0, 'duration': 1.5}, ...]
```

**Multi-Language Support:**

```python
# Specify language preference (fallback order)
transcript = ytt_api.fetch("video_id", languages=['de', 'en'])

# List available transcripts
transcript_list = ytt_api.list("video_id")
for t in transcript_list:
    print(f"{t.language} ({t.language_code})")

# Find specific language
german = transcript_list.find_transcript(['de'])
```

**Translation:**

```python
# Translate to English
transcript_list = ytt_api.list("video_id")
transcript = transcript_list.find_transcript(['de'])
translated = transcript.translate('en')
```

**Content-Machine Integration:**

- Source transcripts for research
- Study competitor video scripts
- No Selenium required (API-based)

### 2.2 yt-dlp

**Repository:** `vendor/connectors/youtube/yt-dlp/`  
**Purpose:** Download videos from YouTube and thousands of sites  
**License:** Unlicense

**Installation:**

```bash
pip install yt-dlp
# Or download binary
```

**Basic Usage:**

```bash
# Download video
yt-dlp "https://youtube.com/watch?v=VIDEO_ID"

# Audio only
yt-dlp -x --audio-format mp3 "URL"

# Best quality
yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" "URL"

# Subtitles
yt-dlp --write-auto-subs --sub-lang en "URL"
```

**Python API:**

```python
import yt_dlp

def download_audio(url: str, output_path: str):
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': output_path,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return info

def get_video_info(url: str):
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(url, download=False)
        return {
            'title': info.get('title'),
            'duration': info.get('duration'),
            'view_count': info.get('view_count'),
            'description': info.get('description'),
        }
```

**Content-Machine Integration:**

- Download reference videos for study
- Extract audio for voiceover analysis
- Get subtitles for caption styling research
- Supports 1000+ sites

---

## 3. Google Trends

### 3.1 pytrends

**Repository:** `vendor/connectors/trends/pytrends/`  
**Purpose:** Unofficial API for Google Trends  
**License:** MIT

**Installation:**

```bash
pip install pytrends
```

**Basic Usage:**

```python
from pytrends.request import TrendReq

# Initialize (with proxy support)
pytrends = TrendReq(
    hl='en-US',
    tz=360,
    timeout=(10, 25),
    retries=2,
    backoff_factor=0.1
)

# Build payload
pytrends.build_payload(
    kw_list=["AI tools", "ChatGPT"],
    cat=0,  # All categories
    timeframe='today 3-m',  # Last 3 months
    geo='US',  # United States
    gprop=''  # Web search
)
```

**Interest Over Time:**

```python
# Get interest over time
df = pytrends.interest_over_time()
print(df.head())

#             AI tools  ChatGPT  isPartial
# date
# 2026-10-01        45       78      False
# 2026-10-08        52       82      False
```

**Related Queries:**

```python
# Get related queries
related = pytrends.related_queries()
# {
#   'AI tools': {
#     'top': DataFrame,      # Top related queries
#     'rising': DataFrame    # Rising related queries
#   }
# }
```

**Trending Searches:**

```python
# Daily trending searches
trending = pytrends.trending_searches(pn='united_states')
print(trending.head(10))

# Realtime trending searches
realtime = pytrends.realtime_trending_searches(pn='US')
```

**Content-Machine Integration:**

- Discover trending topics for content
- Analyze keyword popularity over time
- Find rising topics before saturation
- Geographic targeting

---

## 4. Web Crawling & Research

### 4.1 Firecrawl

**Repository:** `vendor/connectors/web/firecrawl/`  
**Purpose:** Web crawling with LLM-ready markdown output  
**License:** AGPL-3.0 (self-hosted) / Proprietary (hosted)

**Features:**

- Scrape pages to clean markdown
- Crawl entire websites
- Map site structure
- LLM extraction with schema
- Handle anti-bot, JS rendering

**API Usage:**

```python
from firecrawl import Firecrawl

fc = Firecrawl(api_key="fc-YOUR_KEY")

# Scrape single page
result = fc.scrape("https://docs.example.com")
print(result['markdown'])

# Crawl entire site
crawl_result = fc.crawl(
    "https://docs.example.com",
    limit=100,
    scrape_options={'formats': ['markdown']}
)

# Map site structure
map_result = fc.map("https://example.com")
print(map_result['links'])  # All discovered URLs
```

**LLM Extraction:**

```python
# Extract structured data with schema
result = fc.scrape(
    "https://example.com/product",
    extract={
        "schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "price": {"type": "number"},
                "features": {"type": "array", "items": {"type": "string"}}
            }
        }
    }
)
print(result['extract'])  # Structured JSON
```

**Content-Machine Integration:**

- Research product documentation
- Gather content for script generation
- LLM-ready markdown output
- MCP server available

### 4.2 Tavily

**Repository:** `vendor/connectors/web/tavily-python/`  
**Purpose:** AI-powered search and research API  
**License:** MIT (wrapper)

**Installation:**

```bash
pip install tavily-python
```

**Basic Search:**

```python
from tavily import TavilyClient

client = TavilyClient(api_key="tvly-YOUR_KEY")

# Basic search
response = client.search("What is AI video generation?")
for result in response['results']:
    print(f"{result['title']}: {result['url']}")
```

**RAG Context Generation:**

```python
# Get context for RAG (single string)
context = client.get_search_context(
    query="Latest AI video generation tools"
)
# Returns concatenated, relevant text for LLM context

# Q&A (direct answer)
answer = client.qna_search(
    query="What is the best TTS for short videos?"
)
print(answer)  # Direct answer string
```

**Content Extraction:**

```python
# Extract content from URLs
response = client.extract(
    urls=[
        "https://docs.remotion.dev/",
        "https://www.pexels.com/api/",
    ],
    include_images=True
)

for result in response['results']:
    print(f"URL: {result['url']}")
    print(f"Content: {result['raw_content'][:500]}...")
```

**Research API:**

```python
# Deep research (multi-step)
research = client.research(
    topic="Best practices for TikTok video generation",
    max_iterations=5
)
print(research['report'])
```

**Content-Machine Integration:**

- Search for product information
- Generate research context for scripts
- Q&A for fact-checking
- Deep research for comprehensive topics

---

## 5. UI Capture

### 5.1 Playwright

**Repository:** `vendor/capture/playwright/`  
**Purpose:** Cross-browser automation for UI recording  
**License:** Apache-2.0

**Installation:**

```bash
pip install playwright
playwright install
```

**Basic Screenshot:**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(
        viewport={'width': 1080, 'height': 1920}  # Vertical
    )

    page.goto("https://example.com")
    page.screenshot(path="screenshot.png")
    browser.close()
```

**Video Recording:**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(
        record_video_dir="videos/",
        record_video_size={'width': 1080, 'height': 1920}
    )

    page = context.new_page()
    page.goto("https://example.com")

    # Interact with product
    page.click("#feature-button")
    page.wait_for_timeout(2000)

    context.close()  # Saves video
    browser.close()
```

**Async API:**

```python
import asyncio
from playwright.async_api import async_playwright

async def capture_product_demo():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("https://product.example.com")
        await page.click("[data-action='demo']")
        await page.wait_for_selector(".demo-complete")

        await page.screenshot(path="demo.png")
        await browser.close()

asyncio.run(capture_product_demo())
```

**Content-Machine Integration:**

- Record product UI for truthful videos
- Capture interactions frame-by-frame
- MCP integration (playwright-mcp)
- Cross-browser support

---

## 6. Text-to-Speech

### 6.1 Kokoro-FastAPI

**Repository:** `vendor/audio/kokoro-fastapi/`  
**Purpose:** OpenAI-compatible TTS API with voice mixing  
**License:** MIT

**Features:**

- OpenAI Speech endpoint compatible
- Multi-language (English, Japanese, Chinese)
- Voice mixing with weights
- Per-word timestamps
- GPU or CPU inference

**Docker Quick Start:**

```bash
# CPU
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest

# GPU
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest
```

**OpenAI-Compatible Usage:**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Generate speech
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky+af_bella",  # Voice mixing
    input="Hello world!"
) as response:
    response.stream_to_file("output.mp3")
```

**Voice Mixing:**

```python
import requests

# List available voices
response = requests.get("http://localhost:8880/v1/audio/voices")
voices = response.json()["voices"]

# Mix voices with weights
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella(2)+af_heart(1)",  # 67%/33% mix
        "response_format": "mp3",
        "speed": 1.0
    }
)
```

**Timestamps for Captions:**

```python
# Get word-level timestamps
response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
    }
)
data = response.json()
# {
#   "audio": "base64...",
#   "timestamps": [
#     {"word": "Hello", "start": 0.0, "end": 0.5},
#     {"word": "world", "start": 0.6, "end": 1.1}
#   ]
# }
```

**Content-Machine Integration:**

- Primary TTS for voiceover generation
- OpenAI-compatible API
- Voice mixing for unique narration
- Word-level timestamps for caption sync
- Web UI for testing: http://localhost:8880/web

---

## 7. Video Processing

### 7.1 MoviePy

**Repository:** `vendor/video-processing/moviepy/`  
**Purpose:** Python video editing library  
**License:** MIT

**Installation:**

```bash
pip install moviepy
```

**Basic Editing:**

```python
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

# Load and trim video
clip = (
    VideoFileClip("input.mp4")
    .subclipped(10, 20)  # 10s to 20s
    .with_volume_scaled(0.8)
)

# Add text overlay
txt_clip = TextClip(
    font="Arial.ttf",
    text="Hello!",
    font_size=70,
    color='white'
).with_duration(10).with_position('center')

# Composite
final = CompositeVideoClip([clip, txt_clip])
final.write_videofile("output.mp4")
```

### 7.2 FFMPerative - LLM-Powered Video Editing

**Repository:** `vendor/video-processing/FFMPerative/`  
**Purpose:** Natural language video editing via LLM  
**License:** MIT

**Installation:**

```bash
pip install ffmperative
```

**Usage:**

```bash
# CLI
ffmperative do --prompt "merge subtitles 'captions.srt' with video 'video.mp4' calling it 'video_caps.mp4'"

# Compose from clips
ffmperative compose --clips /path/to/clips --output /path/to/output.mp4 --prompt "Edit for social media"
```

**Python:**

```python
from ffmperative import ffmp

# Natural language video editing
ffmp("sample the 5th frame from '/path/to/video.mp4'")
ffmp("resize '/path/to/video.mp4' to 1080x1920")
ffmp("add closed captions from 'subs.srt' to 'video.mp4'")
```

**Content-Machine Integration:**

- LLM-powered video operations
- Natural language editing commands
- Automatic clip composition
- FFmpeg abstraction

### 7.3 CapCut Mate - CapCut/Jianying API

**Repository:** `vendor/video-processing/capcut-mate/`  
**Purpose:** API for CapCut/Jianying draft automation  
**Language:** Chinese (primarily)

**Features:**

- Create drafts programmatically
- Add videos, audio, images, stickers
- Add captions with styling
- Add effects and keyframes
- Cloud rendering export

**Docker:**

```bash
docker pull gogoshine/capcut-mate:latest
docker run -p 30000:30000 gogoshine/capcut-mate:latest
```

**API Endpoints:**
| Endpoint | Function |
|----------|----------|
| `/create_draft` | Create new project |
| `/add_videos` | Add video clips |
| `/add_audios` | Add audio tracks |
| `/add_captions` | Add styled subtitles |
| `/add_effects` | Add visual effects |
| `/add_keyframes` | Add animation keyframes |
| `/save_draft` | Save project |

**Content-Machine Integration:**

- Alternative to Remotion for CapCut users
- Full draft automation
- Cloud rendering integration
- Coze plugin support

---

## 8. Integration Architecture

### 8.1 Trend Research Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   Trend Research                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Reddit  │  │ YouTube  │  │  Google  │  │  HN/X   │ │
│  │   MCP    │  │Transcript│  │  Trends  │  │  APIs   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │              │       │
│       └──────┬──────┴──────┬──────┴──────────────┘       │
│              │             │                              │
│              ▼             ▼                              │
│       ┌────────────────────────────────┐                 │
│       │      Trend Aggregation         │                 │
│       │   (LangGraph Agent)            │                 │
│       └────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                   Content Planning
```

### 8.2 Content Research Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   Content Research                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Firecrawl│  │  Tavily  │  │ YouTube  │              │
│  │  Crawl   │  │  Search  │  │Transcripts│              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│       └──────┬──────┴──────┬──────┘                      │
│              │             │                              │
│              ▼             ▼                              │
│       ┌────────────────────────────────┐                 │
│       │      RAG Context Builder       │                 │
│       │     (Qdrant + Embeddings)      │                 │
│       └────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                   Script Generation
```

### 8.3 Media Generation Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   Media Generation                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Playwright│  │  Kokoro  │  │  Pexels  │              │
│  │  Capture │  │   TTS    │  │  Stock   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│       └──────┬──────┴──────┬──────┘                      │
│              │             │                              │
│              ▼             ▼                              │
│       ┌────────────────────────────────┐                 │
│       │       Asset Assembly           │                 │
│       │   (FFmpeg / MoviePy)           │                 │
│       └────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                   Remotion Render
```

---

## 9. Recommendations

### 9.1 Primary Stack

| Category             | Tool                            | Reason                            |
| -------------------- | ------------------------------- | --------------------------------- |
| **Reddit**           | reddit-mcp-ts                   | MCP-native, TypeScript, full CRUD |
| **YouTube**          | youtube-transcript-api + yt-dlp | No browser needed, comprehensive  |
| **Trends**           | pytrends                        | Google Trends coverage            |
| **Web Research**     | Tavily                          | AI-powered, RAG-ready             |
| **Web Crawling**     | Firecrawl                       | LLM-ready markdown                |
| **UI Capture**       | Playwright                      | Cross-browser, MCP integration    |
| **TTS**              | Kokoro-FastAPI                  | OpenAI-compatible, voice mixing   |
| **Video Processing** | MoviePy + FFmpeg                | Python-native, powerful           |

### 9.2 MCP Integration Points

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    },
    "firecrawl": {
      "command": "npx",
      "args": ["firecrawl-mcp-server"]
    }
  }
}
```

---

## 10. Code Examples

### 10.1 Full Trend Research

```python
import asyncio
from typing import List, Dict
from pytrends.request import TrendReq
from tavily import TavilyClient

class TrendResearcher:
    def __init__(self, tavily_key: str):
        self.pytrends = TrendReq(hl='en-US', tz=360)
        self.tavily = TavilyClient(api_key=tavily_key)

    def get_trending_topics(self, geo: str = 'US') -> List[str]:
        """Get daily trending searches."""
        df = self.pytrends.trending_searches(pn='united_states')
        return df[0].tolist()[:20]

    def analyze_topic(self, topic: str) -> Dict:
        """Deep analyze a topic."""
        # Google Trends data
        self.pytrends.build_payload([topic], timeframe='today 3-m')
        interest = self.pytrends.interest_over_time()
        related = self.pytrends.related_queries()

        # Tavily research
        context = self.tavily.get_search_context(
            query=f"What is {topic}? Why is it trending?"
        )

        return {
            'topic': topic,
            'trend_score': interest[topic].mean() if not interest.empty else 0,
            'related_queries': related.get(topic, {}).get('rising', []),
            'research_context': context
        }

# Usage
researcher = TrendResearcher(tavily_key="tvly-XXX")
topics = researcher.get_trending_topics()
analysis = researcher.analyze_topic(topics[0])
```

### 10.2 Content Collection Pipeline

```python
from youtube_transcript_api import YouTubeTranscriptApi
from firecrawl import Firecrawl
import yt_dlp

class ContentCollector:
    def __init__(self, firecrawl_key: str):
        self.ytt = YouTubeTranscriptApi()
        self.firecrawl = Firecrawl(api_key=firecrawl_key)

    def get_youtube_transcript(self, video_id: str) -> str:
        """Get YouTube video transcript."""
        transcript = self.ytt.fetch(video_id)
        return " ".join([s.text for s in transcript])

    def crawl_documentation(self, url: str) -> str:
        """Crawl product documentation."""
        result = self.firecrawl.scrape(url)
        return result.get('markdown', '')

    def download_reference_video(self, url: str, output: str):
        """Download reference video for analysis."""
        ydl_opts = {
            'format': 'bestvideo[height<=1080]+bestaudio/best',
            'outtmpl': output,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

# Usage
collector = ContentCollector(firecrawl_key="fc-XXX")
transcript = collector.get_youtube_transcript("dQw4w9WgXcQ")
docs = collector.crawl_documentation("https://docs.remotion.dev/")
```

### 10.3 TTS with Timestamps

```python
from openai import OpenAI
import requests
from pathlib import Path

class VoiceGenerator:
    def __init__(self, base_url: str = "http://localhost:8880"):
        self.client = OpenAI(base_url=f"{base_url}/v1", api_key="not-needed")
        self.base_url = base_url

    def generate_speech(self, text: str, voice: str = "af_bella", output: str = "output.mp3"):
        """Generate speech audio."""
        with self.client.audio.speech.with_streaming_response.create(
            model="kokoro",
            voice=voice,
            input=text
        ) as response:
            response.stream_to_file(output)
        return output

    def generate_with_timestamps(self, text: str, voice: str = "af_bella"):
        """Generate speech with word timestamps for captions."""
        response = requests.post(
            f"{self.base_url}/dev/captioned_speech",
            json={
                "model": "kokoro",
                "input": text,
                "voice": voice,
            }
        )
        data = response.json()
        return {
            'audio_base64': data['audio'],
            'timestamps': data['timestamps']
        }

# Usage
tts = VoiceGenerator()
tts.generate_speech("Hello world!", voice="af_bella+af_sky")
result = tts.generate_with_timestamps("Hello world!")
print(result['timestamps'])
```

---

## References

- [Reddit API Documentation](https://www.reddit.com/dev/api/)
- [YouTube Transcript API](https://github.com/jdepoix/youtube-transcript-api)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [Firecrawl Documentation](https://docs.firecrawl.dev/)
- [Tavily Documentation](https://docs.tavily.com/)
- [Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M)
- [Playwright Documentation](https://playwright.dev/)
- [PyTrends](https://github.com/GeneralMills/pytrends)
