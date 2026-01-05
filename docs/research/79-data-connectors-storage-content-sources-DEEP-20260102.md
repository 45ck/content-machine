# Deep Dive #79: Data Connectors, Storage & Content Sources Ecosystem

**Date:** 2026-01-02
**Category:** Data Infrastructure & Content Discovery
**Complexity:** High
**Dependencies:** DD-075 (Publishing), DD-076 (Generators), DD-078 (Clipping)

---

## Executive Summary

This deep dive synthesizes the complete data infrastructure layer for content-machine, covering **content sources** (Reddit, YouTube, HackerNews, Google Trends), **web crawling** (Firecrawl, Tavily), **vector storage** (Qdrant, Weaviate, MinIO), and **MCP integrations** that enable AI-driven content discovery. These tools form the "intake" layer of the video generation pipeline—discovering trending topics, extracting transcripts, and storing embeddings for semantic search.

**Key Findings:**

- **YouTube Ecosystem:** yt-dlp (thousands of sites), youtube-transcript-api (no API key needed)
- **Reddit Ecosystem:** 5 tools ranging from simple API wrappers (praw) to full MCP servers (reddit-mcp-ts)
- **Web Crawling:** Firecrawl (LLM-optimized markdown), Tavily (RAG-focused search)
- **Vector Databases:** Qdrant (Rust, fast), Weaviate (Go, cloud-native), both with MCP potential
- **Trend Detection:** PyTrends (Google Trends), HN API (Firebase realtime)
- **High ToS Risk:** snscrape, instaloader (research only)

---

## 1. YouTube Connectors

### 1.1 yt-dlp

**Repository:** vendor/connectors/youtube/yt-dlp
**Stars:** 100k+ | **Language:** Python | **License:** Unlicense

yt-dlp is the definitive audio/video downloader, forked from youtube-dl with massive improvements. It supports **thousands of sites** beyond YouTube including TikTok, Instagram, Twitter, Vimeo, and more.

#### Key Features

| Feature                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| **Multi-site Support**  | Thousands of extractors (see supportedsites.md) |
| **Format Selection**    | Complex format filtering and sorting            |
| **SponsorBlock**        | Automatic sponsor segment skipping              |
| **Subtitle Download**   | Multiple languages, auto-generated included     |
| **Metadata Extraction** | JSON output with full video info                |
| **Plugin System**       | Custom extractors and post-processors           |
| **Embedding**           | Can be imported as Python library               |

#### Usage Patterns

```bash
# Download best quality
yt-dlp "https://youtube.com/watch?v=VIDEO_ID"

# Audio only (for TTS training or background music)
yt-dlp -x --audio-format mp3 "URL"

# Subtitles for caption extraction
yt-dlp --write-sub --sub-lang en --skip-download "URL"

# JSON metadata for trend analysis
yt-dlp --dump-json "URL" > metadata.json

# Download with format selection
yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" "URL"
```

#### Python Embedding

```python
import yt_dlp

# Extract info without downloading
with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
    info = ydl.extract_info('URL', download=False)
    print(f"Title: {info['title']}")
    print(f"Duration: {info['duration']}s")
    print(f"Views: {info['view_count']}")
    print(f"Chapters: {info.get('chapters', [])}")

# Download with custom options
ydl_opts = {
    'format': 'best[height<=720]',
    'outtmpl': '%(title)s.%(ext)s',
    'subtitlesformat': 'srt',
    'writesubtitles': True,
    'subtitleslangs': ['en'],
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
    }]
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download(['URL'])
```

#### Architecture Integration

- **Trend Research:** Download viral video metadata for analysis
- **Competitor Analysis:** Extract views, likes, comments from similar content
- **Asset Acquisition:** Download B-roll, music, reference clips
- **Subtitle Mining:** Extract auto-generated captions for script inspiration

---

### 1.2 youtube-transcript-api

**Repository:** vendor/connectors/youtube/youtube-transcript-api
**Stars:** 3k+ | **Language:** Python | **License:** MIT

Python API for retrieving YouTube transcripts/subtitles without API keys or headless browsers. Perfect for extracting existing captions for analysis or repurposing.

#### Key Features

- **No API Key Required** - Works with public videos
- **Auto-generated Support** - Access AI-generated captions
- **Translation** - Translate transcripts to other languages
- **Multiple Languages** - List and fetch all available languages
- **Timestamps** - Get word-level timing data

#### Usage

```python
from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()

# Fetch transcript
transcript = ytt_api.fetch("VIDEO_ID")

# Access structured data
for snippet in transcript:
    print(f"{snippet.start:.2f}s: {snippet.text}")

# Get raw data for processing
raw_data = transcript.to_raw_data()
# [{'text': 'Hello', 'start': 0.0, 'duration': 1.5}, ...]

# List available transcripts
transcript_list = ytt_api.list(video_id)
for t in transcript_list:
    print(f"{t.language} ({t.language_code}) - Generated: {t.is_generated}")

# Fetch specific language
transcript = ytt_api.fetch(video_id, languages=['es', 'en'])

# Translate transcript
translated = transcript.translate('fr')
```

#### content-machine Integration

```python
# Pipeline: Extract viral video scripts for analysis
from youtube_transcript_api import YouTubeTranscriptApi

def extract_viral_scripts(video_ids: list[str]) -> list[dict]:
    """Extract transcripts from viral videos for hook analysis."""
    api = YouTubeTranscriptApi()
    scripts = []

    for vid in video_ids:
        try:
            transcript = api.fetch(vid)
            # First 15 seconds = hook
            hook = " ".join([
                s.text for s in transcript
                if s.start < 15
            ])
            scripts.append({
                "video_id": vid,
                "hook": hook,
                "full_text": " ".join([s.text for s in transcript]),
                "duration": transcript[-1].start + transcript[-1].duration
            })
        except Exception as e:
            print(f"Failed {vid}: {e}")

    return scripts
```

---

## 2. Reddit Connectors

### 2.1 PRAW (Python Reddit API Wrapper)

**Repository:** vendor/connectors/reddit/praw
**Stars:** 3k+ | **Language:** Python | **License:** BSD-2-Clause

The official Python wrapper for Reddit's API. Handles rate limiting automatically.

#### Features

- **Full API Coverage** - Submissions, comments, users, subreddits
- **OAuth Support** - Script, web, and installed app types
- **Rate Limit Handling** - Automatic compliance with Reddit rules
- **Streaming** - Real-time submission/comment streams

#### Usage

```python
import praw

reddit = praw.Reddit(
    client_id="CLIENT_ID",
    client_secret="CLIENT_SECRET",
    user_agent="content-machine:v1.0 (by /u/yourusername)",
    username="USERNAME",  # Optional for read-only
    password="PASSWORD"   # Optional for read-only
)

# Get top posts from subreddit
for post in reddit.subreddit("programming").top(time_filter="week", limit=10):
    print(f"{post.score}: {post.title}")
    print(f"  Comments: {post.num_comments}")
    print(f"  URL: {post.url}")

# Search across Reddit
for post in reddit.subreddit("all").search("AI coding assistant", limit=25):
    print(f"r/{post.subreddit}: {post.title}")

# Get trending subreddits
for name in reddit.subreddits.popular(limit=10):
    print(name.display_name)

# Stream new submissions in real-time
for submission in reddit.subreddit("technology").stream.submissions():
    print(f"NEW: {submission.title}")
```

### 2.2 Async PRAW

**Repository:** vendor/connectors/reddit/asyncpraw
**Stars:** 800+ | **Language:** Python | **License:** BSD-2-Clause

Asynchronous version of PRAW for high-throughput applications.

```python
import asyncpraw
import asyncio

async def get_trending():
    reddit = asyncpraw.Reddit(
        client_id="CLIENT_ID",
        client_secret="CLIENT_SECRET",
        user_agent="content-machine:v1.0"
    )

    subreddit = await reddit.subreddit("technology")
    async for post in subreddit.hot(limit=10):
        print(f"{post.score}: {post.title}")

    await reddit.close()

asyncio.run(get_trending())
```

### 2.3 Reddit MCP Servers

Three MCP server implementations provide Reddit access for AI agents:

#### reddit-mcp-ts (TypeScript)

**Repository:** vendor/connectors/reddit/reddit-mcp-ts
**Language:** TypeScript | **Transport:** stdio, HTTP (FastMCP)

**Available Tools:**

| Tool                      | Description               | Auth Required    |
| ------------------------- | ------------------------- | ---------------- |
| `get_reddit_post`         | Get specific post by ID   | Read-only        |
| `get_top_posts`           | Top posts from subreddit  | Read-only        |
| `get_trending_subreddits` | Currently trending        | Read-only        |
| `search_reddit`           | Search posts              | Read-only        |
| `get_post_comments`       | Comments on a post        | Read-only        |
| `get_user_posts`          | User's submission history | Read-only        |
| `create_post`             | Submit new post           | User credentials |
| `reply_to_post`           | Comment on post           | User credentials |

**Claude Desktop Configuration:**

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "<YOUR_CLIENT_ID>",
        "REDDIT_CLIENT_SECRET": "<YOUR_CLIENT_SECRET>"
      },
      "autoApprove": [
        "get_reddit_post",
        "get_top_posts",
        "search_reddit",
        "get_trending_subreddits"
      ]
    }
  }
}
```

#### reddit-mcp-buddy

**Repository:** vendor/connectors/reddit/reddit-mcp-buddy
**Stars:** Growing | **Language:** TypeScript

**Unique Features:**

- **No API Key Required** - Uses public endpoints
- **Three-tier Rate Limits** - 10/60/100 requests per minute
- **LLM-Optimized Output** - Clean data for Claude

**Available Tools:**

| Tool                | Description                                 |
| ------------------- | ------------------------------------------- |
| `browse_subreddit`  | Browse with sorting (hot, new, top, rising) |
| `search_posts`      | Search across subreddits                    |
| `get_post_comments` | Full comment threads                        |
| `get_user_profile`  | User karma and activity                     |

**Installation (One-liner):**

```bash
npx -y reddit-mcp-buddy
```

---

## 3. Web Crawling & Search

### 3.1 Firecrawl

**Repository:** vendor/connectors/web/firecrawl
**Stars:** 20k+ | **Language:** TypeScript | **License:** AGPL-3.0

LLM-optimized web scraping that converts any URL to clean markdown or structured data.

#### Key Features

| Feature      | Description                           |
| ------------ | ------------------------------------- |
| **Scrape**   | Single URL → LLM-ready markdown/HTML  |
| **Crawl**    | All subpages of a site                |
| **Map**      | Get all URLs from a site instantly    |
| **Search**   | Web search with full content          |
| **Extract**  | Structured data extraction with AI    |
| **Actions**  | Click, scroll, wait before extraction |
| **Batching** | Thousands of URLs async               |

#### API Usage

```bash
# Crawl a documentation site
curl -X POST https://api.firecrawl.dev/v2/crawl \
    -H 'Authorization: Bearer fc-YOUR_API_KEY' \
    -d '{
      "url": "https://docs.example.com",
      "limit": 50,
      "scrapeOptions": {
        "formats": ["markdown"]
      }
    }'
```

#### Python SDK

```python
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="fc-YOUR_KEY")

# Single page scrape
result = app.scrape_url("https://example.com", {
    "formats": ["markdown", "html"]
})
print(result["markdown"])

# Crawl entire site
crawl_job = app.crawl_url("https://docs.example.com", {
    "limit": 100,
    "scrapeOptions": {"formats": ["markdown"]}
})

# Check status
status = app.check_crawl_status(crawl_job["id"])
```

#### content-machine Integration

- **Documentation Scraping** - Crawl product docs for accurate feature descriptions
- **Competitor Research** - Extract landing pages for positioning analysis
- **Asset Discovery** - Find images, videos, resources on product sites

---

### 3.2 Tavily

**Repository:** vendor/connectors/web/tavily-python
**Stars:** 1k+ | **Language:** Python | **License:** MIT

Search API built for RAG and LLM applications. Returns clean, relevant content.

#### Features

- **Smart Search** - Optimized for AI consumption
- **Context Generation** - One-liner RAG context
- **Q&A Mode** - Direct answers to questions
- **Content Extraction** - Extract from specific URLs
- **Crawl & Map** - Site discovery

#### Usage

```python
from tavily import TavilyClient

client = TavilyClient(api_key="tvly-YOUR_KEY")

# Standard search
response = client.search("best practices for TikTok hooks")
for result in response["results"]:
    print(f"{result['title']}: {result['url']}")
    print(f"  {result['content'][:200]}...")

# RAG context (single string, ready for prompt)
context = client.get_search_context(
    query="How to make viral short-form videos?"
)
# Returns concatenated, relevant text

# Direct Q&A
answer = client.qna_search(
    query="What's the ideal TikTok video length?"
)
print(answer)  # "The ideal TikTok video length is 21-34 seconds..."

# Extract from specific URLs
result = client.extract(urls=[
    "https://tiktok.com/business/en-US/blog/...",
    "https://youtube.com/creators/..."
])
```

#### content-machine Integration

```python
# Trend research pipeline
from tavily import TavilyClient

async def research_trend(topic: str) -> dict:
    """Research a trending topic for video script."""
    client = TavilyClient(api_key="...")

    # Get general context
    context = client.get_search_context(
        query=f"latest news and opinions about {topic}"
    )

    # Get specific data points
    facts = client.qna_search(
        query=f"key statistics and facts about {topic}"
    )

    # Find viral discussions
    discussions = client.search(
        query=f"{topic} reddit twitter viral discussion",
        max_results=10
    )

    return {
        "context": context,
        "facts": facts,
        "discussions": [r["url"] for r in discussions["results"]]
    }
```

---

## 4. Hacker News Connectors

### 4.1 Official HN API (Firebase)

**Repository:** vendor/connectors/hackernews/hn-api-official
**Base URL:** `https://hacker-news.firebaseio.com/v0/`
**Rate Limit:** None (currently)

The official Hacker News API via Firebase. Real-time updates, no authentication required.

#### Endpoints

| Endpoint                   | Description               |
| -------------------------- | ------------------------- |
| `/v0/item/<id>.json`       | Story, comment, job, poll |
| `/v0/user/<username>.json` | User profile              |
| `/v0/topstories.json`      | Top 500 story IDs         |
| `/v0/newstories.json`      | Newest 500 story IDs      |
| `/v0/beststories.json`     | Best 500 story IDs        |
| `/v0/askstories.json`      | Ask HN story IDs          |
| `/v0/showstories.json`     | Show HN story IDs         |
| `/v0/jobstories.json`      | Job story IDs             |
| `/v0/maxitem.json`         | Current max item ID       |

#### Item Schema

```json
{
  "id": 8863,
  "by": "dhouston",
  "type": "story",
  "title": "My YC app: Dropbox",
  "url": "http://www.getdropbox.com/...",
  "score": 111,
  "time": 1175714200,
  "descendants": 71,
  "kids": [8952, 9224, 8917, ...]
}
```

#### Usage

```python
import httpx

async def get_top_hn_stories(limit: int = 10) -> list[dict]:
    """Fetch top HN stories for trend analysis."""
    async with httpx.AsyncClient() as client:
        # Get top story IDs
        resp = await client.get(
            "https://hacker-news.firebaseio.com/v0/topstories.json"
        )
        story_ids = resp.json()[:limit]

        # Fetch story details
        stories = []
        for sid in story_ids:
            resp = await client.get(
                f"https://hacker-news.firebaseio.com/v0/item/{sid}.json"
            )
            stories.append(resp.json())

        return stories

# Filter for tech content
def filter_tech_stories(stories: list[dict]) -> list[dict]:
    tech_keywords = ["AI", "LLM", "startup", "Python", "TypeScript", "API"]
    return [
        s for s in stories
        if any(kw.lower() in s.get("title", "").lower() for kw in tech_keywords)
    ]
```

### 4.2 HN Search (Algolia)

**Repository:** vendor/connectors/hackernews/hn-search-algolia
**URL:** https://hn.algolia.com

Full-text search over HN history. Better for finding specific topics.

```python
import httpx

async def search_hn(query: str, tags: str = "story") -> list[dict]:
    """Search HN via Algolia."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://hn.algolia.com/api/v1/search",
            params={
                "query": query,
                "tags": tags,  # story, comment, ask_hn, show_hn
                "numericFilters": "points>50"  # Only popular
            }
        )
        return resp.json()["hits"]
```

---

## 5. Google Trends

### 5.1 PyTrends

**Repository:** vendor/connectors/trends/pytrends
**Stars:** 3k+ | **Language:** Python | **License:** Apache-2.0

Unofficial Google Trends API. Useful for detecting rising topics.

#### Features

| Method                         | Description               |
| ------------------------------ | ------------------------- |
| `interest_over_time()`         | Search volume over time   |
| `interest_by_region()`         | Geographic distribution   |
| `related_topics()`             | Related rising/top topics |
| `related_queries()`            | Related search queries    |
| `trending_searches()`          | Daily trending searches   |
| `realtime_trending_searches()` | Real-time trends          |

#### Usage

```python
from pytrends.request import TrendReq

pytrends = TrendReq(hl='en-US', tz=360)

# Build payload for keywords
pytrends.build_payload(
    kw_list=["AI video generator", "short form video"],
    cat=0,
    timeframe='today 3-m',
    geo='US'
)

# Interest over time
interest = pytrends.interest_over_time()
print(interest)

# Related queries (for script topics)
related = pytrends.related_queries()
for kw, data in related.items():
    print(f"\n{kw} - Rising queries:")
    for _, row in data['rising'].head(5).iterrows():
        print(f"  {row['query']}: {row['value']}")

# Today's trending searches
trending = pytrends.trending_searches(pn='united_states')
print(trending.head(10))

# Real-time trends by category
realtime = pytrends.realtime_trending_searches(pn='US')
print(realtime[['title', 'traffic']])
```

#### content-machine Integration

```python
# Trend discovery pipeline
async def discover_rising_topics(seed_keywords: list[str]) -> list[dict]:
    """Find rising topics related to seed keywords."""
    pytrends = TrendReq(hl='en-US', tz=360)
    rising_topics = []

    for kw in seed_keywords:
        pytrends.build_payload([kw], timeframe='now 7-d')
        related = pytrends.related_queries()

        if related[kw]['rising'] is not None:
            for _, row in related[kw]['rising'].iterrows():
                if row['value'] > 100:  # Breakout threshold
                    rising_topics.append({
                        "seed": kw,
                        "topic": row['query'],
                        "growth": row['value']
                    })

    return sorted(rising_topics, key=lambda x: x['growth'], reverse=True)
```

---

## 6. Vector Storage

### 6.1 Qdrant

**Repository:** vendor/storage/qdrant
**Stars:** 20k+ | **Language:** Rust | **License:** Apache-2.0

High-performance vector database optimized for speed and scale.

#### Key Features

| Feature                | Description                             |
| ---------------------- | --------------------------------------- |
| **Rust Performance**   | Fast even under high load               |
| **Extended Filtering** | Payload-based filtering + vector search |
| **Hybrid Search**      | Combine dense + sparse vectors          |
| **Horizontal Scaling** | Distributed deployment                  |
| **Multi-tenancy**      | Namespace isolation                     |
| **On-disk Mode**       | Handle larger-than-memory datasets      |

#### Quick Start

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

# In-memory for testing
client = QdrantClient(":memory:")

# Create collection
client.create_collection(
    collection_name="video_ideas",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Insert vectors
client.upsert(
    collection_name="video_ideas",
    points=[
        PointStruct(
            id=1,
            vector=[0.1, 0.2, ...],  # 1536 dims from OpenAI
            payload={
                "title": "AI Coding Assistant Deep Dive",
                "source": "reddit",
                "score": 1500,
                "created_at": "2026-01-02"
            }
        )
    ]
)

# Search with filtering
results = client.search(
    collection_name="video_ideas",
    query_vector=[0.15, 0.18, ...],
    query_filter={
        "must": [
            {"key": "source", "match": {"value": "reddit"}},
            {"key": "score", "range": {"gte": 100}}
        ]
    },
    limit=10
)
```

#### content-machine Use Cases

- **Semantic Topic Search** - Find related video ideas
- **Script Deduplication** - Avoid similar content
- **Hook Library** - Store and retrieve effective hooks
- **Trend Clustering** - Group related trending topics

---

### 6.2 Weaviate

**Repository:** vendor/storage/weaviate
**Stars:** 12k+ | **Language:** Go | **License:** BSD-3-Clause

Cloud-native vector database with integrated ML model support.

#### Key Features

| Feature                    | Description                          |
| -------------------------- | ------------------------------------ |
| **Integrated Vectorizers** | OpenAI, Cohere, HuggingFace built-in |
| **Hybrid Search**          | BM25 + Vector in single query        |
| **RAG Built-in**           | Generative search with LLMs          |
| **Multi-tenancy**          | First-class support                  |
| **RBAC**                   | Role-based access control            |
| **Vector Compression**     | PQ, SQ, BQ for memory efficiency     |

#### Quick Start

```python
import weaviate
from weaviate.classes.config import Configure, DataType, Property

# Connect
client = weaviate.connect_to_local()

# Create collection with auto-vectorization
client.collections.create(
    name="VideoIdea",
    properties=[
        Property(name="title", data_type=DataType.TEXT),
        Property(name="hook", data_type=DataType.TEXT),
        Property(name="source", data_type=DataType.TEXT),
        Property(name="score", data_type=DataType.INT),
    ],
    vectorizer_config=Configure.Vectorizer.text2vec_openai(),
    generative_config=Configure.Generative.openai()  # For RAG
)

# Insert (vectors generated automatically)
ideas = client.collections.get("VideoIdea")
ideas.data.insert_many([
    {
        "title": "AI Coding Tools Comparison",
        "hook": "This AI writes code 10x faster than you...",
        "source": "hackernews",
        "score": 500
    }
])

# Semantic search
results = ideas.query.near_text(
    query="developer productivity tools",
    limit=5
)

# Hybrid search (keyword + semantic)
results = ideas.query.hybrid(
    query="AI assistant coding",
    alpha=0.5,  # Balance between keyword and vector
    limit=10
)

# RAG query
results = ideas.generate.near_text(
    query="viral AI content",
    single_prompt="Write a TikTok hook based on: {title}",
    limit=3
)

client.close()
```

---

### 6.3 MinIO

**Repository:** vendor/storage/minio
**Stars:** 50k+ | **Language:** Go | **License:** AGPL-3.0

S3-compatible object storage. **Note: Now in maintenance mode.**

#### Quick Start

```bash
# Install
go install github.com/minio/minio@latest

# Start server
minio server /data --console-address :9001

# Access console at http://localhost:9001
# Default credentials: minioadmin:minioadmin
```

#### Python SDK

```python
from minio import Minio

client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

# Create bucket
client.make_bucket("videos")

# Upload rendered video
client.fput_object(
    "videos",
    "2026-01-02-ai-tools.mp4",
    "/path/to/video.mp4"
)

# Generate presigned URL for download
url = client.presigned_get_object("videos", "2026-01-02-ai-tools.mp4")
```

#### content-machine Use Cases

- **Asset Storage** - Stock footage, audio clips, fonts
- **Rendered Videos** - Output storage before publishing
- **Cache Layer** - Downloaded YouTube videos, transcripts

---

## 7. Social Scrapers (HIGH RISK)

### 7.1 snscrape

**Repository:** vendor/connectors/scrapers/snscrape
**License:** GPL-3.0 | **Status:** Research Only

Multi-platform scraper supporting Twitter, Instagram, Reddit, Telegram, etc.

**⚠️ WARNING: Violates platform ToS. Do NOT use in production.**

#### Supported Platforms

| Platform  | Features                          |
| --------- | --------------------------------- |
| Twitter   | Users, hashtags, searches, trends |
| Instagram | Profiles, hashtags, locations     |
| Reddit    | Users, subreddits (via Pushshift) |
| Telegram  | Channels                          |
| Facebook  | Profiles, groups                  |
| TikTok    | (Limited)                         |

#### Example (Research Only)

```bash
# Get last 100 tweets with hashtag
snscrape --max-results 100 twitter-hashtag "AITools"

# Get user profile
snscrape --with-entity twitter-user elonmusk
```

### 7.2 Instaloader

**Repository:** vendor/connectors/scrapers/instaloader
**License:** MIT | **Status:** Research Only

Instagram downloader for profiles, stories, reels, highlights.

**⚠️ WARNING: May violate Instagram ToS. Use cautiously.**

```bash
# Download profile
instaloader profile_name

# Download with metadata
instaloader --comments --geotags profile_name

# Download stories
instaloader --stories --login your_username profile_name
```

---

## 8. Architecture Integration

### 8.1 Trend Research Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    TREND RESEARCH LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Reddit   │  │ HackerNews│  │  YouTube │  │ PyTrends │    │
│  │ MCP      │  │ Firebase │  │ yt-dlp   │  │          │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       └─────────────┴──────┬──────┴─────────────┘           │
│                            │                                 │
│                    ┌───────▼───────┐                        │
│                    │   Normalize   │                        │
│                    │   & Score     │                        │
│                    └───────┬───────┘                        │
│                            │                                 │
│                    ┌───────▼───────┐                        │
│                    │    Embed      │                        │
│                    │   (OpenAI)    │                        │
│                    └───────┬───────┘                        │
│                            │                                 │
│                    ┌───────▼───────┐                        │
│                    │   Qdrant/     │                        │
│                    │   Weaviate    │                        │
│                    └───────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Recommended Stack

| Layer          | Primary                 | Backup         | Notes                                 |
| -------------- | ----------------------- | -------------- | ------------------------------------- |
| **Reddit**     | reddit-mcp-ts           | PRAW           | MCP for agents, PRAW for batch        |
| **YouTube**    | yt-dlp + transcript-api | -              | Combined coverage                     |
| **HackerNews** | Firebase API            | Algolia Search | Firebase for real-time                |
| **Trends**     | PyTrends                | -              | Rate limit carefully                  |
| **Web Crawl**  | Firecrawl               | Tavily         | Firecrawl for docs, Tavily for search |
| **Vectors**    | Qdrant                  | Weaviate       | Qdrant faster, Weaviate more features |
| **Objects**    | MinIO                   | S3             | MinIO for self-hosted                 |

### 8.3 MCP Server Composition

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "${REDDIT_CLIENT_ID}",
        "REDDIT_CLIENT_SECRET": "${REDDIT_CLIENT_SECRET}"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["@firecrawl/mcp-server"],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    },
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "video_ideas"
      }
    }
  }
}
```

---

## 9. Security & Compliance

### 9.1 API Key Management

| Service             | Storage        | Rotation  |
| ------------------- | -------------- | --------- |
| Reddit              | `.env` / Vault | Monthly   |
| Firecrawl           | `.env` / Vault | Monthly   |
| Tavily              | `.env` / Vault | Monthly   |
| OpenAI (embeddings) | `.env` / Vault | Quarterly |

### 9.2 Rate Limits

| Service     | Limit      | Handling                   |
| ----------- | ---------- | -------------------------- |
| Reddit      | 60 req/min | PRAW handles automatically |
| HN Firebase | None       | Be respectful              |
| PyTrends    | ~5 req/min | Exponential backoff        |
| Firecrawl   | By plan    | Queue with delays          |
| Tavily      | By plan    | Queue with delays          |

### 9.3 ToS Compliance

| Tool                   | Risk Level | Recommendation                   |
| ---------------------- | ---------- | -------------------------------- |
| PRAW                   | ✅ Low     | Use with proper user agent       |
| yt-dlp                 | ⚠️ Medium  | Personal use, respect robots.txt |
| youtube-transcript-api | ✅ Low     | Public transcripts only          |
| Firecrawl              | ✅ Low     | Respects robots.txt              |
| snscrape               | ❌ High    | Research only, never production  |
| instaloader            | ❌ High    | Research only, never production  |

---

## 10. Implementation Priority

### Phase 1: Core Connectors (Week 1-2)

1. Reddit MCP Server integration
2. YouTube transcript extraction
3. HN Firebase client wrapper

### Phase 2: Storage Layer (Week 3)

1. Qdrant collection schema for video ideas
2. Embedding pipeline (OpenAI)
3. Semantic search API

### Phase 3: Web Crawling (Week 4)

1. Firecrawl integration for product docs
2. Tavily for research queries
3. Cache layer (MinIO/S3)

### Phase 4: Trend Detection (Week 5)

1. PyTrends wrapper with rate limiting
2. Cross-platform trend scoring
3. Daily trend digest generation

---

## 11. Key Takeaways

1. **yt-dlp is essential** - Supports thousands of sites, embeddable, battle-tested
2. **youtube-transcript-api is underrated** - No API key, perfect for script mining
3. **Reddit MCP servers are production-ready** - Three options with different trade-offs
4. **Firecrawl > BeautifulSoup** - LLM-optimized output, handles JS rendering
5. **Qdrant for speed, Weaviate for features** - Both excellent, pick based on needs
6. **Avoid snscrape/instaloader in production** - ToS violations, use official APIs
7. **PyTrends is fragile** - Google changes break it often, have fallback
8. **HN API is simple but powerful** - Real-time, no auth, unlimited

---

## Related Documents

- [DD-075: Publishing & Review UI](75-publishing-review-ui-ecosystem-DEEP-20260102.md) - Where data goes after processing
- [DD-076: Specialized Video Generators](76-specialized-video-generators-ai-tools-DEEP-20260102.md) - Tools that use these connectors
- [DD-077: Rendering & Composition](77-rendering-captions-composition-ecosystem-DEEP-20260102.md) - Next stage after data collection
- [DD-078: Clipping & Audio](78-clipping-audio-scene-detection-DEEP-20260102.md) - Processing extracted content

---

**Document Statistics:**

- **Tools Covered:** 18
- **Code Examples:** 25+
- **Integration Patterns:** 5
- **Estimated Reading Time:** 25 minutes
