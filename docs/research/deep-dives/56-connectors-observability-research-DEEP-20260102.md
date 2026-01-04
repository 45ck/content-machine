# Deep Dive #56: Connectors, Observability & Research Infrastructure
**Date:** 2026-01-02
**Category:** Data Connectors, Observability, LLM Evaluation
**Status:** Complete

---

## Executive Summary

This deep dive documents the comprehensive connector ecosystem for data intake (Reddit, YouTube, Hacker News, web), observability infrastructure for LLM applications (Langfuse, Promptfoo), and research tools (Firecrawl, Tavily) that form the foundation of content-machine's trend research capabilities.

### Key Findings

| Category | Top Tools | Key Features |
|----------|-----------|--------------|
| **Reddit** | reddit-mcp-ts, PRAW, AsyncPRAW | MCP native, read/write, trending |
| **YouTube** | yt-dlp, youtube-transcript-api | Download, transcripts, metadata |
| **Hacker News** | hn-api-official, Algolia Search | Stories, comments, search |
| **Web Research** | Firecrawl, Tavily | LLM-ready data, RAG context |
| **Observability** | Langfuse, Promptfoo | Tracing, evaluation, red-teaming |
| **Trends** | pytrends | Google Trends API |

---

## 1. Reddit Connectors

### 1.1 reddit-mcp-ts - TypeScript MCP Server

**Repository:** `vendor/connectors/reddit/reddit-mcp-ts`
**Transport:** MCP (Model Context Protocol)
**License:** MIT

Native MCP server for Reddit integration:

#### Available Tools

**Read-only (Client Credentials):**

| Tool | Description |
|------|-------------|
| `get_reddit_post(subreddit, post_id)` | Get specific post |
| `get_top_posts(subreddit, time_filter, limit)` | Top posts from subreddit |
| `get_user_info(username)` | User information |
| `get_subreddit_info(subreddit_name)` | Subreddit details |
| `get_trending_subreddits()` | Currently trending |
| `search_reddit(query, subreddit?, sort?, time_filter?, limit?)` | Search posts |
| `get_post_comments(post_id, subreddit, sort?, limit?)` | Post comments |
| `get_user_posts(username, sort?, time_filter?, limit?)` | User's posts |
| `get_user_comments(username, sort?, time_filter?, limit?)` | User's comments |

**Write Tools (User Credentials):**

| Tool | Description |
|------|-------------|
| `create_post(subreddit, title, content, is_self)` | Create new post |
| `reply_to_post(post_id, content, subreddit?)` | Reply to post |
| `edit_post(thing_id, new_text)` | Edit own post |
| `edit_comment(thing_id, new_text)` | Edit own comment |
| `delete_post(thing_id)` | Delete own post |
| `delete_comment(thing_id)` | Delete own comment |

#### MCP Configuration

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "<YOUR_CLIENT_ID>",
        "REDDIT_CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "REDDIT_USERNAME": "<YOUR_USERNAME_OPTIONAL>",
        "REDDIT_PASSWORD": "<YOUR_PASSWORD_OPTIONAL>"
      }
    }
  }
}
```

### 1.2 PRAW & AsyncPRAW

**Repository:** `vendor/connectors/reddit/praw`, `vendor/connectors/reddit/asyncpraw`
**Type:** Python Reddit API Wrapper

Traditional Python libraries for Reddit:

```python
import praw

reddit = praw.Reddit(
    client_id="your_client_id",
    client_secret="your_client_secret",
    user_agent="content-machine:v1.0"
)

# Get trending subreddits
trending = list(reddit.subreddits.popular(limit=25))

# Search for tech content
results = reddit.subreddit("programming").search("AI trends", limit=50)
for post in results:
    print(f"{post.title}: {post.score} upvotes")
```

### 1.3 Integration Strategy

For content-machine, use **reddit-mcp-ts** as the primary connector:

```typescript
// MCP-native Reddit integration
interface TrendRequest {
    subreddits: string[];
    timeFilter: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    limit: number;
}

async function getTrendingContent(request: TrendRequest): Promise<RedditPost[]> {
    const results = [];
    for (const subreddit of request.subreddits) {
        const posts = await mcpClient.call('get_top_posts', {
            subreddit,
            time_filter: request.timeFilter,
            limit: request.limit
        });
        results.push(...posts);
    }
    return results.sort((a, b) => b.score - a.score);
}
```

---

## 2. YouTube Connectors

### 2.1 yt-dlp - Feature-Rich Video Downloader

**Repository:** `vendor/connectors/youtube/yt-dlp`
**License:** Unlicense
**Sites Supported:** 1000+

The most powerful video downloader:

#### Key Features

| Feature | Description |
|---------|-------------|
| Multi-site | 1000+ supported sites |
| Format Selection | Best quality, specific formats |
| Subtitles | Auto-download captions |
| Metadata | Full video information |
| SponsorBlock | Auto-skip sponsors |
| Authentication | Cookie/netrc support |

#### Usage Patterns

```bash
# Download video with best quality
yt-dlp -f "bestvideo+bestaudio" https://youtube.com/watch?v=VIDEO_ID

# Download subtitles only
yt-dlp --write-subs --skip-download https://youtube.com/watch?v=VIDEO_ID

# Get video metadata as JSON
yt-dlp -j https://youtube.com/watch?v=VIDEO_ID

# Download playlist
yt-dlp https://youtube.com/playlist?list=PLAYLIST_ID
```

#### Python Integration

```python
import yt_dlp

def download_video(url: str, output_path: str) -> dict:
    ydl_opts = {
        'format': 'bestvideo[height<=1080]+bestaudio/best',
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'writesubtitles': True,
        'subtitleslangs': ['en'],
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return info
```

### 2.2 youtube-transcript-api

**Repository:** `vendor/connectors/youtube/youtube-transcript-api`
**License:** MIT

Clean API for YouTube transcript retrieval:

#### Features

- Works with auto-generated subtitles
- Translation support
- No headless browser required
- Fast and lightweight

#### Usage

```python
from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()

# Fetch transcript
transcript = ytt_api.fetch("VIDEO_ID")

# Result format
# FetchedTranscript(
#     snippets=[
#         FetchedTranscriptSnippet(
#             text="Hey there",
#             start=0.0,
#             duration=1.5
#         ),
#         ...
#     ]
# )

# List available transcripts
transcript_list = ytt_api.list_transcripts("VIDEO_ID")
for transcript in transcript_list:
    print(f"{transcript.language}: {transcript.language_code}")
```

### 2.3 Google APIs (Python/Node)

**Repository:** `vendor/connectors/youtube/google-api-python`, `google-api-nodejs`

Official YouTube Data API v3 clients for metadata, comments, channels.

---

## 3. Hacker News Connectors

**Repository:** `vendor/connectors/hackernews/*`

### Available Clients

| Client | Language | Features |
|--------|----------|----------|
| hn-api-official | JavaScript | Firebase-based, realtime |
| hn-api-rust | Rust | High performance |
| hn-client | Python | Simple wrapper |
| hn-search-algolia | JavaScript | Full-text search |

### Algolia Search Integration

```javascript
// Full-text search via Algolia
const response = await fetch(
    `https://hn.algolia.com/api/v1/search?query=${query}&tags=story`
);
const results = await response.json();

// Results include:
// - hits: Array of stories
// - nbHits: Total count
// - page: Current page
```

### Firebase Official API

```javascript
// Top stories
const topStories = await fetch(
    'https://hacker-news.firebaseio.com/v0/topstories.json'
).then(r => r.json());

// Story details
const story = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
).then(r => r.json());
```

---

## 4. Web Research Tools

### 4.1 Firecrawl - LLM-Ready Web Data

**Repository:** `vendor/connectors/web/firecrawl`
**License:** AGPL-3.0

Enterprise-grade web scraping for AI applications:

#### Capabilities

| Feature | Description |
|---------|-------------|
| **Scrape** | Single URL to markdown/structured data |
| **Crawl** | Entire website crawling |
| **Map** | Fast URL discovery |
| **Search** | Web search with full content |
| **Extract** | AI-powered structured extraction |

#### Special Features

- Anti-bot handling
- Dynamic JS rendering
- PDF/DOCX parsing
- Actions (click, scroll, wait)
- Change tracking

#### Usage

```python
from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="fc-YOUR_API_KEY")

# Scrape single page
result = app.scrape_url("https://example.com", params={
    "formats": ["markdown", "html"]
})

# Crawl entire site
crawl = app.crawl_url("https://example.com", params={
    "limit": 100,
    "scrapeOptions": {"formats": ["markdown"]}
})

# Extract structured data
extracted = app.extract([
    "https://example.com/product1",
    "https://example.com/product2"
], {
    "schema": {
        "name": "string",
        "price": "number",
        "description": "string"
    }
})
```

#### LLM Framework Integration

- LangChain (Python/JS)
- LlamaIndex
- Crew.ai
- Composio
- Dify
- Flowise

### 4.2 Tavily - AI Search & Research

**Repository:** `vendor/connectors/web/tavily-python`
**Use Case:** RAG applications, AI research

#### Core Features

| Feature | Description |
|---------|-------------|
| **Search** | Web search optimized for LLMs |
| **Extract** | Content extraction from URLs |
| **Crawl** | Website crawling |
| **Map** | Site structure discovery |
| **Research** | Deep research mode |

#### Usage Patterns

```python
from tavily import TavilyClient

tavily = TavilyClient(api_key="tvly-YOUR_API_KEY")

# Simple search
response = tavily.search("Latest AI trends 2026")

# RAG context generation
context = tavily.get_search_context(
    query="What are the best practices for video generation AI?"
)
# Returns formatted context string for LLM

# Q&A mode
answer = tavily.qna_search(
    query="What is Remotion and how does it work?"
)
# Returns concise answer

# Batch extraction
extracted = tavily.extract(urls=[
    "https://remotion.dev/docs",
    "https://langchain.com/docs"
], include_images=True)
```

### 4.3 pytrends - Google Trends

**Repository:** `vendor/connectors/trends/pytrends`
**Use Case:** Trend research, topic validation

```python
from pytrends.request import TrendReq

pytrends = TrendReq(hl='en-US', tz=360)

# Build payload for keywords
pytrends.build_payload(
    kw_list=['AI video', 'TikTok automation'],
    timeframe='today 3-m'
)

# Interest over time
interest = pytrends.interest_over_time()

# Related queries
related = pytrends.related_queries()

# Trending searches (real-time)
trending = pytrends.trending_searches(pn='united_states')
```

---

## 5. Observability Infrastructure

### 5.1 Langfuse - LLM Engineering Platform

**Repository:** `vendor/observability/langfuse`
**License:** MIT
**Deployment:** Self-hosted or Cloud

Comprehensive LLM observability:

#### Core Features

| Feature | Description |
|---------|-------------|
| **Tracing** | Full LLM call tracing with costs |
| **Prompt Management** | Version control, A/B testing |
| **Evaluations** | LLM-as-judge, user feedback |
| **Datasets** | Test sets and benchmarks |
| **Playground** | Interactive prompt testing |

#### Integration

```python
from langfuse import Langfuse

langfuse = Langfuse(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com"
)

# Create trace
trace = langfuse.trace(
    name="video-generation",
    metadata={"topic": "AI trends"}
)

# Log LLM call
generation = trace.generation(
    name="script-generation",
    model="gpt-4",
    input=prompt,
    output=response,
    usage={
        "input": 500,
        "output": 200
    }
)

# Log evaluation
trace.score(
    name="quality",
    value=0.85
)
```

#### OpenAI Integration

```python
from langfuse.openai import openai

# Automatically traces all OpenAI calls
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Generate a video script"}]
)
```

### 5.2 Promptfoo - LLM Evaluation & Red Teaming

**Repository:** `vendor/observability/promptfoo`
**License:** MIT
**Type:** CLI + Web UI

Developer-friendly LLM testing:

#### Use Cases

| Use Case | Description |
|----------|-------------|
| **Prompt Testing** | Compare prompt variations |
| **Model Comparison** | Side-by-side model evaluation |
| **Red Teaming** | Security vulnerability scanning |
| **CI/CD Integration** | Automated quality gates |
| **Code Scanning** | PR review for LLM issues |

#### Quick Start

```bash
# Initialize project
npx promptfoo@latest init

# Run evaluation
npx promptfoo eval

# View results
npx promptfoo view
```

#### Configuration (promptfooconfig.yaml)

```yaml
description: Video Script Generation Test

prompts:
  - file://prompts/script-v1.txt
  - file://prompts/script-v2.txt

providers:
  - openai:gpt-4
  - anthropic:claude-3-opus

tests:
  - vars:
      topic: "AI trends"
    assert:
      - type: contains
        value: "artificial intelligence"
      - type: llm-rubric
        value: "Script is engaging and informative"
      - type: cost
        threshold: 0.05
```

#### Red Teaming

```bash
# Generate adversarial test cases
npx promptfoo redteam generate

# Run security scan
npx promptfoo redteam run

# View vulnerability report
npx promptfoo redteam report
```

### 5.3 OpenTelemetry & Sentry

**Repository:** `vendor/observability/opentelemetry-js`, `vendor/observability/sentry`

Standard observability stack:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseExporter } from 'langfuse-node';

const sdk = new NodeSDK({
    traceExporter: new LangfuseExporter({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
    }),
});

sdk.start();
```

---

## 6. Integration Architecture

### 6.1 Trend Research Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trend Research Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Reddit  │    │  YouTube │    │    HN    │    │  Trends  │  │
│  │   MCP    │    │  yt-dlp  │    │  Algolia │    │ pytrends │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       └───────────────┴───────┬───────┴───────────────┘         │
│                               │                                 │
│                               ▼                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              Trend Aggregation & Scoring                   ││
│  │         (Tavily context, Firecrawl extraction)             ││
│  └────────────────────────────────────────────────────────────┘│
│                               │                                 │
│                               ▼                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                  Content Planning Agent                    ││
│  │                  (Langfuse tracing)                        ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Observability Integration

```typescript
// content-machine observability setup
import { Langfuse } from 'langfuse';
import * as Sentry from '@sentry/node';

// Initialize observability
const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
});

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
});

// Traced video generation
async function generateVideo(topic: string): Promise<Video> {
    const trace = langfuse.trace({
        name: 'video-generation',
        metadata: { topic }
    });
    
    const transaction = Sentry.startTransaction({
        name: 'generate-video',
        op: 'video.generate'
    });
    
    try {
        // 1. Research trends
        const trends = await trace.span({
            name: 'trend-research',
            op: 'research'
        }, async () => {
            return await researchTrends(topic);
        });
        
        // 2. Generate script
        const script = await trace.generation({
            name: 'script-generation',
            model: 'gpt-4',
            input: { topic, trends }
        }, async () => {
            return await generateScript(topic, trends);
        });
        
        // 3. Render video
        const video = await trace.span({
            name: 'video-render',
            op: 'render'
        }, async () => {
            return await renderVideo(script);
        });
        
        return video;
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    } finally {
        transaction.finish();
        await langfuse.flush();
    }
}
```

---

## 7. MCP Server Registry

### Content-Machine MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| reddit-mcp-ts | Reddit trends, posts | ✅ Vendored |
| firecrawl-mcp | Web scraping | Available |
| postgres-mcp | Database queries | ✅ Vendored |
| qdrant-mcp | Semantic memory | ✅ Vendored |
| gemini-image-mcp | Image generation | ✅ Vendored |
| nanobanana-mcp | Gemini images | ✅ Vendored |
| plainly-mcp | Cloud rendering | ✅ Vendored |
| upstash-mcp | Redis operations | ✅ Vendored |

### MCP Integration Pattern

```typescript
// Unified MCP client for all connectors
class ContentMachineMCP {
    private servers: Map<string, MCPClient>;
    
    async initialize() {
        this.servers.set('reddit', await connectMCP('reddit-mcp-ts'));
        this.servers.set('database', await connectMCP('postgres-mcp'));
        this.servers.set('memory', await connectMCP('qdrant-mcp'));
        this.servers.set('image', await connectMCP('nanobanana-mcp'));
    }
    
    async researchTrends(topic: string): Promise<Trends> {
        const redditPosts = await this.servers.get('reddit').call(
            'get_top_posts',
            { subreddit: 'programming', time_filter: 'week', limit: 50 }
        );
        
        // Store in semantic memory
        await this.servers.get('memory').call('store', {
            collection: 'trends',
            documents: redditPosts.map(p => ({
                text: p.title + ' ' + p.selftext,
                metadata: { score: p.score, url: p.url }
            }))
        });
        
        return { posts: redditPosts };
    }
}
```

---

## 8. Recommendations for Content-Machine

### 8.1 Trend Research Stack

| Component | Tool | Reason |
|-----------|------|--------|
| Reddit | reddit-mcp-ts | MCP native, TypeScript |
| YouTube | yt-dlp + transcript-api | Comprehensive, reliable |
| Hacker News | Algolia Search | Fast full-text search |
| Web Research | Tavily | RAG-optimized, fast |
| Trends | pytrends | Google Trends access |

### 8.2 Observability Stack

| Component | Tool | Reason |
|-----------|------|--------|
| LLM Tracing | Langfuse | Open source, self-hosted |
| LLM Evaluation | Promptfoo | Developer-friendly, CI/CD |
| Error Tracking | Sentry | Industry standard |
| Metrics | OpenTelemetry | Vendor-neutral |

### 8.3 Implementation Priority

1. **Phase 1:** reddit-mcp-ts + Langfuse tracing
2. **Phase 2:** YouTube connectors + Tavily research
3. **Phase 3:** Promptfoo evaluation pipeline
4. **Phase 4:** Full MCP integration

---

## 9. Related Documents

- [DD-054: MoneyPrinter Family & YouTube Automation](./54-moneyprinter-family-youtube-automation-DEEP-20260102.md)
- [DD-055: Audio/TTS, Captions & Publishing](./55-audio-tts-captions-publishing-DEEP-20260102.md)
- [DD-053: Rendering, MCP Ecosystem & Composition](./53-rendering-mcp-ecosystem-composition-DEEP-20260102.md)

---

## Appendix A: Connector Comparison

| Connector | Type | Auth | Rate Limits | Best For |
|-----------|------|------|-------------|----------|
| reddit-mcp-ts | MCP | OAuth | Yes | AI integration |
| PRAW | Python | OAuth | Yes | Scripts |
| yt-dlp | CLI/Python | Cookie | Fair use | Downloads |
| youtube-transcript-api | Python | None | Moderate | Transcripts |
| Firecrawl | API | API Key | Paid tiers | Enterprise |
| Tavily | API | API Key | Paid tiers | RAG apps |
| pytrends | Python | None | Rate limited | Trends |

---

**Deep Dives Created:** 56 total
**Next Steps:**
1. Create master index of all deep dives
2. Document remaining specialized repos
3. Architecture decision records (ADRs)
