# Deep Dive: Connectors, Publishing, Audio/TTS, and Video Generators
**Date:** 2026-01-02  
**Category:** Deep Research Analysis  
**Status:** Complete  

---

## 1. Executive Summary

This document provides comprehensive analysis of **connectors** (Reddit, YouTube, web scraping), **publishing tools** (YouTube, TikTok, Instagram upload automation), **audio/TTS tools** (Kokoro, EdgeTTS), and **additional video generators** discovered across the vendored repositories. These components are critical for building a complete automated content pipeline.

### Key Discoveries

| Category | Top Picks | Rationale |
|----------|-----------|-----------|
| **Reddit API** | PRAW/AsyncPRAW | Official SDK, well-maintained |
| **YouTube Download** | yt-dlp | 1000+ sites, active development, Unlicense |
| **Web Scraping** | Firecrawl + Tavily | LLM-ready, crawl + search capabilities |
| **TTS** | Kokoro-FastAPI | OpenAI-compatible, 35-100x realtime |
| **YouTube Upload** | pillar-youtube-upload | Simple OAuth flow, well-documented |
| **TikTok Upload** | TiktokAutoUploader | Fast Requests-based, ~3 seconds |
| **Video Generator** | TikTokAIVideoGenerator | Kokoro + Groq + MoviePy integration |

---

## 2. Connectors Deep Dive

### 2.1 Reddit Connectors

**Available Options:**
- `vendor/connectors/reddit/praw/` - Python Reddit API Wrapper (PRAW)
- `vendor/connectors/reddit/asyncpraw/` - Async version
- `vendor/connectors/reddit/reddit-mcp-*` - MCP servers for Reddit

**PRAW Pattern (Standard):**
```python
import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="content-machine/1.0"
)

# Get trending from subreddit
for submission in reddit.subreddit("technology").hot(limit=10):
    print(submission.title, submission.score)
    print(submission.selftext[:500])
```

**AsyncPRAW Pattern (Async):**
```python
import asyncpraw

async def get_posts():
    reddit = asyncpraw.Reddit(...)
    subreddit = await reddit.subreddit("technology")
    async for submission in subreddit.hot(limit=10):
        yield submission
```

**Recommendation:** Use PRAW for simple scripts, AsyncPRAW for high-throughput crawling, MCP servers for LLM integration.

### 2.2 YouTube Connectors

**yt-dlp (vendor/connectors/youtube/yt-dlp)**
- Fork of youtube-dl, actively maintained
- 1000+ supported sites
- Unlicense (very permissive)
- Features: SponsorBlock, subtitles, thumbnails

**Key yt-dlp Patterns:**
```python
import yt_dlp

def download_video(url: str, output_path: str):
    ydl_opts = {
        'format': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'writesubtitles': True,
        'subtitleslangs': ['en'],
        'writethumbnail': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

def extract_info(url: str):
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        return ydl.extract_info(url, download=False)
```

**youtube-transcript-api:**
```python
from youtube_transcript_api import YouTubeTranscriptApi

transcript = YouTubeTranscriptApi.get_transcript("VIDEO_ID")
# Returns: [{'text': '...', 'start': 0.0, 'duration': 2.5}, ...]
```

### 2.3 Web Scraping Connectors

**Firecrawl (vendor/connectors/web/firecrawl)**
- LLM-ready markdown output
- Crawl entire sites with depth control
- Map site structure
- Extract structured data with AI

```python
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="YOUR_KEY")

# Scrape single page
result = app.scrape_url("https://example.com", params={
    'formats': ['markdown', 'html']
})

# Crawl entire site
crawl_result = app.crawl_url("https://docs.example.com", params={
    'limit': 10,
    'scrapeOptions': {'formats': ['markdown']}
})
```

**Tavily (vendor/connectors/web/tavily-python)**
- AI-native search API
- RAG context generation
- Q&A search with direct answers
- Research reports with citations

```python
from tavily import TavilyClient

client = TavilyClient(api_key="tvly-YOUR_KEY")

# Quick search
response = client.search("AI video generation tools 2025")

# Get RAG context
context = client.get_search_context("How does Remotion work?")

# Q&A with answer
answer = client.qna_search("What is the best TTS for short videos?")

# Full research report
research = client.research(
    input="Research AI video generation landscape",
    model="pro"
)
```

### 2.4 Trends Connectors

**PyTrends (vendor/connectors/trends/pytrends)**
- Google Trends API wrapper
- Interest over time, related queries
- Trending searches by region

```python
from pytrends.request import TrendReq

pytrends = TrendReq()
pytrends.build_payload(kw_list=["AI video", "Remotion"])
interest = pytrends.interest_over_time()
trending = pytrends.trending_searches(pn='united_states')
```

---

## 3. Publishing Tools Deep Dive

### 3.1 YouTube Upload

**pillar-youtube-upload (vendor/publish/youtube-upload)**
- OAuth 2.0 authentication
- Full metadata support (title, description, tags, thumbnails)
- Privacy settings (public, private, unlisted)
- Kids content flag support

```python
from youtube_upload.client import YoutubeUploader

# Initialize with credentials
uploader = YoutubeUploader(client_id, client_secret)

# Authenticate (opens browser on first run)
uploader.authenticate()

# Upload with options
options = {
    "title": "AI-Generated Short",
    "description": "Created with content-machine",
    "tags": ["ai", "automation", "shorts"],
    "categoryId": "22",  # People & Blogs
    "privacyStatus": "private",
    "kids": False,
    "thumbnailLink": "https://example.com/thumb.jpg"
}
uploader.upload("video.mp4", options)
uploader.close()
```

**Category IDs Reference:**
| ID | Category |
|----|----------|
| 1 | Film & Animation |
| 10 | Music |
| 22 | People & Blogs |
| 24 | Entertainment |
| 25 | News & Politics |
| 27 | Education |
| 28 | Science & Technology |

### 3.2 TikTok Upload

**TiktokAutoUploader (vendor/publish/TiktokAutoUploader)**
- Fast Requests-based (not Selenium)
- ~3 second upload time
- Session cookie authentication
- Caption and hashtag support

```python
from tiktokuploader import upload_video

# Upload with metadata
upload_video(
    video_path="short.mp4",
    caption="Check this out! #ai #tech #fyp",
    session_id="YOUR_SESSION_ID"  # From browser cookies
)
```

**Note:** Uses unofficial API - may break with TikTok updates. Consider as supplementary, not primary upload method.

### 3.3 Instagram Upload

**rednote-instagram-auto-uploader (vendor/publish/rednote-instagram-auto-uploader)**
- Uses instagrapi library
- Reel format support
- Caption preservation
- Automatic video format conversion

```python
from instagrapi import Client

cl = Client()
cl.login("username", "password")

# Upload as Reel
cl.clip_upload(
    "video.mp4",
    caption="AI-generated content #reels #ai",
)
```

### 3.4 Multi-Platform Publishing

**Mixpost (vendor/publish/mixpost)**
- Laravel-based social media management
- Schedule posts across platforms
- Team collaboration features
- Analytics dashboard

**Postiz Patterns:**
- Open-source alternative to Buffer/Hootsuite
- API-based scheduling
- Multi-tenant architecture

---

## 4. Audio/TTS Deep Dive

### 4.1 Kokoro-FastAPI (Primary Recommendation)

**Location:** `vendor/audio/kokoro-fastapi`

**Key Features:**
- 82M parameter TTS model
- OpenAI-compatible API endpoint
- Multi-language support (EN, JP, CN)
- Voice mixing with weighted combinations
- 35-100x realtime speed (GPU)
- Word-level timestamps
- Docker-ready

**Quickstart:**
```bash
# GPU version
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU version
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

**OpenAI-Compatible Usage:**
```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")

with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_heart",  # American female voice
    input="Hello, this is a test!"
) as response:
    response.stream_to_file("output.mp3")
```

**Voice Mixing:**
```python
# 67% bella, 33% sky
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "input": "Mixed voice test",
        "voice": "af_bella(2)+af_sky(1)",  # Weighted ratio
        "response_format": "mp3"
    }
)
```

**Timestamped Captions:**
```python
response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "input": "Hello world!",
        "voice": "af_bella",
        "stream": True
    },
    stream=True
)

for chunk in response.iter_lines(decode_unicode=True):
    if chunk:
        data = json.loads(chunk)
        audio = base64.b64decode(data["audio"])
        timestamps = data["timestamps"]  # Word-level timing
```

**Performance Benchmarks (GPU):**
| Metric | Value |
|--------|-------|
| Realtime Factor | 35-100x |
| Token Rate | 137.67 tokens/sec |
| First Token Latency | ~300ms @ chunk 400 |
| Supported Formats | mp3, wav, opus, flac, m4a, pcm |

### 4.2 Kokoro Base Library

**Location:** `vendor/audio/kokoro`

**Direct Usage:**
```python
from kokoro import KPipeline

pipeline = KPipeline(lang_code='a')  # American English

text = "This is a test of the Kokoro TTS system."
generator = pipeline(text, voice='af_heart')

for i, (graphemes, phonemes, audio) in enumerate(generator):
    sf.write(f'{i}.wav', audio, 24000)
```

**Language Codes:**
| Code | Language |
|------|----------|
| a | American English |
| b | British English |
| e | Spanish |
| f | French |
| i | Italian |
| j | Japanese |
| z | Mandarin Chinese |

### 4.3 EdgeTTS (Fallback)

**Pattern from ShortGPT:**
```python
import edge_tts
import asyncio

async def generate_speech(text: str, voice: str, output: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)

# Example voices:
# en-US-JennyNeural, en-US-GuyNeural
# en-GB-SoniaNeural, en-AU-NatashaNeural
# es-ES-ElviraNeural, fr-FR-DeniseNeural
```

**Advantages:**
- Free (Microsoft Edge service)
- 30+ languages
- No API key required
- Streaming support

---

## 5. Video Generator Patterns

### 5.1 Full Pipeline Generators

**TikTokAIVideoGenerator (vendor/TikTokAIVideoGenerator)**
- Groq (Llama3) for script generation
- Together AI (FLUX-1) for images
- Kokoro TTS with EdgeTTS fallback
- Whisper for captions
- MoviePy for composition

```python
# Pipeline flow:
# 1. Generate script with Groq
# 2. Generate image prompts from script
# 3. Generate images with FLUX-1
# 4. Generate audio with Kokoro/EdgeTTS
# 5. Transcribe with Whisper for captions
# 6. Compose with MoviePy

# Output: 1080x1920 vertical video @ 24fps
```

**AI-Content-Studio (vendor/AI-Content-Studio)**
- Google Gemini for script + research
- Vertex AI for images/video
- Google TTS for voices
- Whisper for captions
- Auto-upload to YouTube/Facebook

```python
# Features:
# - Deep research with Google Search grounding
# - NewsAPI integration for headlines
# - Multi-speaker TTS
# - Background music mixing
# - Chapter timestamp generation
```

### 5.2 Reddit-to-Video Generators

**Pattern: Reddit Story Video**
```python
# Common architecture:
# 1. Fetch Reddit post (PRAW)
# 2. Generate TTS for story
# 3. Create captions with Whisper
# 4. Add background gameplay video
# 5. Overlay text/emojis
# 6. Export vertical format

# Examples: RedditShortVideoMaker, tiktok-automatic-videos
```

**tiktok-automatic-videos (vendor/tiktok-automatic-videos)**
- Uses Remotion for video composition
- Google Wavenet for TTS
- Tokenizes text for phrase display
- Auto-selects emoji for illustration

### 5.3 Trend-Based Generators

**YASGU (vendor/YASGU)**
- YouTube Automated Shorts Generator
- Multi-LLM support (GPT, Claude, Mixtral, Gemini)
- CoquiTTS for voice
- DALL-E/Prodia for images
- Selenium Firefox for upload

```python
# Configurable generators for different content types:
{
    "id": "tech_facts",
    "language": "en",
    "subject": "Interesting technology facts",
    "llm": "claude_3_sonnet",
    "image_model": "lexica"
}
```

**Viral-Faceless-Shorts-Generator (vendor/Viral-Faceless-Shorts-Generator)**
- Google Trends scraping with Puppeteer
- Gemini for script generation
- Coqui TTS
- Aeneas for forced subtitle alignment
- Dockerized pipeline

```yaml
# docker-compose services:
# - trendscraper (Puppeteer + Gemini + FFmpeg)
# - coqui (TTS container)
# - speechalign (Aeneas alignment)
# - nginx (web interface)
```

### 5.4 Clipping/Repurposing Tools

**ai-clips-maker (vendor/ai-clips-maker)**
- WhisperX for word-level transcription
- Pyannote for speaker diarization
- OpenCV + PyAV for video processing
- PySceneDetect for scene detection
- Auto-crop around active speaker

```python
from ai_clips_maker import Transcriber, ClipFinder, resize

transcriber = Transcriber()
transcription = transcriber.transcribe("/path/to/video.mp4")

clip_finder = ClipFinder()
clips = clip_finder.find_clips(transcription=transcription)

crops = resize(
    video_file_path="/path/to/video.mp4",
    pyannote_auth_token="HF_TOKEN",
    aspect_ratio=(9, 16)
)
```

**reels-clips-automator (vendor/reels-clips-automator)**
- GPT for viral section identification
- Face tracking with OpenCV
- Whisper for subtitles
- Horizontal → Vertical conversion

---

## 6. Integration Patterns

### 6.1 Complete Pipeline Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TREND INTAKE   │────▶│  CONTENT PLANNER │────▶│  SCRIPT WRITER  │
│ - Reddit (PRAW) │     │  - LangGraph     │     │  - GPT/Claude   │
│ - Tavily Search │     │  - Pydantic AI   │     │  - Gemini       │
│ - Google Trends │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐     ┌────────▼────────┐
│   PUBLISHER     │◀────│    RENDERER      │◀────│   ASSET CREATOR │
│ - YouTube API   │     │  - Remotion      │     │  - Kokoro TTS   │
│ - TikTok Upload │     │  - FFmpeg        │     │  - FLUX images  │
│ - Instagram API │     │  - MoviePy       │     │  - Whisper caps │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 6.2 BullMQ Job Flow

```typescript
const flow = new FlowProducer({ connection: redis });

await flow.add({
  name: 'publish-video',
  queueName: 'publish',
  data: { videoId, platforms: ['youtube', 'tiktok'] },
  children: [
    {
      name: 'render-video',
      queueName: 'render',
      data: { projectId },
      children: [
        { name: 'generate-tts', queueName: 'audio', data: { scriptId } },
        { name: 'generate-images', queueName: 'assets', data: { prompts } },
        { name: 'generate-captions', queueName: 'captions', data: { audioId } }
      ]
    }
  ]
});
```

### 6.3 MCP Integration

```typescript
// Trend research via MCP
const trendServer = new MCPServer({
  tools: [
    {
      name: 'search_reddit',
      handler: async ({ subreddit, limit }) => {
        return await praw.getHot(subreddit, limit);
      }
    },
    {
      name: 'search_web',
      handler: async ({ query }) => {
        return await tavily.search(query);
      }
    }
  ]
});
```

---

## 7. Technology Comparison Matrix

### 7.1 TTS Solutions

| Solution | Speed | Quality | Languages | Cost | License |
|----------|-------|---------|-----------|------|---------|
| **Kokoro-FastAPI** | 35-100x RT | High | 7 | Free | Apache 2.0 |
| EdgeTTS | Realtime | Good | 30+ | Free | MS Service |
| ElevenLabs | Realtime | Excellent | 29 | $5+/mo | Proprietary |
| Google TTS | Realtime | Good | 40+ | Pay/use | Proprietary |
| Coqui TTS | 2-5x RT | Good | Multi | Free | MPL 2.0 |

**Recommendation:** Kokoro-FastAPI for MVP, EdgeTTS as fallback for additional languages.

### 7.2 Video Generators

| Generator | Pipeline | TTS | Images | Upload | Complexity |
|-----------|----------|-----|--------|--------|------------|
| TikTokAIVideoGenerator | Full | Kokoro | FLUX | Manual | Medium |
| AI-Content-Studio | Full | Google | Vertex | Auto | High |
| YASGU | Full | Coqui | DALL-E | Selenium | High |
| shortrocity | Full | ElevenLabs | DALL-E | Manual | Low |
| Autotube | Full | OpenTTS | Pexels | Manual | Medium |

**Recommendation:** Study TikTokAIVideoGenerator for Kokoro integration pattern, Autotube for n8n orchestration.

### 7.3 Upload Solutions

| Solution | Platform | Method | Reliability | Maintenance |
|----------|----------|--------|-------------|-------------|
| pillar-youtube-upload | YouTube | OAuth API | High | Active |
| TiktokAutoUploader | TikTok | Requests | Medium | Risk |
| instagrapi | Instagram | Unofficial | Medium | Active |
| Selenium browsers | All | Browser auto | Low | High |

**Recommendation:** Official APIs where available (YouTube), unofficial for TikTok/Instagram with monitoring.

---

## 8. Implementation Recommendations

### 8.1 Phase 1: Connector Layer
1. Implement Reddit connector using AsyncPRAW
2. Integrate Tavily for web research
3. Add yt-dlp for YouTube content analysis
4. Setup PyTrends for trend detection

### 8.2 Phase 2: Audio Pipeline
1. Deploy Kokoro-FastAPI via Docker
2. Implement voice mixing for variety
3. Add timestamped caption generation
4. Setup EdgeTTS fallback

### 8.3 Phase 3: Video Generation
1. Integrate Remotion with Kokoro audio
2. Add FLUX/DALL-E image generation
3. Implement Whisper caption overlay
4. Build BullMQ job orchestration

### 8.4 Phase 4: Publishing
1. Implement YouTube upload with OAuth
2. Add TikTok upload (monitor for breaks)
3. Implement Instagram via instagrapi
4. Build scheduling queue

---

## 9. Risk Analysis

### 9.1 API Stability Risks

| Component | Risk Level | Mitigation |
|-----------|------------|------------|
| YouTube API | Low | Official, stable |
| TikTok Upload | High | Monitor, have backup |
| Instagram API | Medium | Use instagrapi, monitor |
| EdgeTTS | Medium | Microsoft may rate limit |
| Reddit API | Low | Official PRAW library |

### 9.2 License Risks

| Component | License | Commercial Use |
|-----------|---------|----------------|
| yt-dlp | Unlicense | ✅ Free |
| Kokoro | Apache 2.0 | ✅ Free |
| Firecrawl | AGPL | ⚠️ Self-host OK |
| Remotion | Custom | ⚠️ Check company license |
| PRAW | BSD | ✅ Free |

---

## 10. Appendix

### 10.1 Quick Reference: API Endpoints

**Kokoro-FastAPI:**
- `POST /v1/audio/speech` - Generate audio
- `GET /v1/audio/voices` - List voices
- `POST /v1/audio/voices/combine` - Mix voices
- `POST /dev/captioned_speech` - Audio + timestamps
- `POST /dev/phonemize` - Text to phonemes

**Firecrawl:**
- `POST /v2/crawl` - Start crawl job
- `GET /v2/crawl/:id` - Check crawl status
- `POST /v2/scrape` - Scrape single URL
- `POST /v2/map` - Map site structure

**Tavily:**
- `POST /search` - Web search
- `POST /extract` - Extract from URLs
- `POST /research` - Deep research

### 10.2 Environment Variables Template

```bash
# Reddit
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=content-machine/1.0

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Search APIs
TAVILY_API_KEY=tvly-xxx
FIRECRAWL_API_KEY=fc-xxx

# AI
OPENAI_API_KEY=sk-xxx
GROQ_API_KEY=gsk-xxx
TOGETHER_API_KEY=xxx

# TTS
KOKORO_URL=http://localhost:8880

# Upload
TIKTOK_SESSION_ID=xxx
INSTAGRAM_USERNAME=xxx
INSTAGRAM_PASSWORD=xxx
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-02  
**Author:** Research Agent  
**Next Review:** After architecture decisions finalized
