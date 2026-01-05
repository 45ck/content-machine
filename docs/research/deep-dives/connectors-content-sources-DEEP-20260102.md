# Deep Dive: Connectors & Content Sources

**Date:** 2026-01-02  
**Repos:** `vendor/connectors/*`, `vendor/audio/*`  
**Priority:** ⭐ HIGH - Data acquisition layer

---

## Executive Summary

Comprehensive analysis of all vendored connectors for content acquisition (Reddit, YouTube, HackerNews, Google Trends) and audio generation (Kokoro TTS). These are the input/output edges of our pipeline.

### Content Source Matrix

| Source        | Official API      | MCP Server       | TypeScript | Rate Limits | Best For                     |
| ------------- | ----------------- | ---------------- | ---------- | ----------- | ---------------------------- |
| Reddit        | ✅ PRAW/asyncpraw | ✅ reddit-mcp-ts | ✅         | 60 req/min  | Trends, stories, discussions |
| YouTube       | ✅ Google API     | ❌               | ✅         | Quota-based | Transcripts, video analysis  |
| HackerNews    | ✅ Firebase       | ❌               | ✅         | None        | Tech trends, startups        |
| Google Trends | ⚠️ Unofficial     | ❌               | ❌         | Fragile     | Search trends                |

### Recommendation

1. **Reddit MCP** - Use TypeScript MCP server for LLM integration
2. **YouTube Transcript** - Python library for transcript extraction
3. **HackerNews** - Direct Firebase API (simple REST)
4. **TTS** - Kokoro-FastAPI for production (OpenAI-compatible)

---

## Reddit Connectors

### Option 1: PRAW (Python Reddit API Wrapper)

**Repo:** `vendor/connectors/reddit/praw/`

**Pros:**

- Official, well-maintained
- Rate limiting handled automatically
- Full Reddit API coverage
- BSD License

**Basic Usage:**

```python
import praw

reddit = praw.Reddit(
    client_id="CLIENT_ID",
    client_secret="CLIENT_SECRET",
    user_agent="content-machine/1.0"
)

# Get trending posts
for submission in reddit.subreddit("technology").hot(limit=10):
    print(submission.title, submission.score)

# Search for content
for submission in reddit.subreddit("all").search("AI tools", time_filter="week", limit=25):
    print(submission.title)
```

**Content Extraction Pattern:**

```python
def get_viral_posts(subreddit: str, min_score: int = 1000) -> list:
    """Get viral posts suitable for short video content."""
    posts = []
    for post in reddit.subreddit(subreddit).hot(limit=100):
        if post.score >= min_score and not post.over_18:
            posts.append({
                "id": post.id,
                "title": post.title,
                "text": post.selftext,
                "score": post.score,
                "comments": post.num_comments,
                "url": post.url,
                "created": post.created_utc,
            })
    return posts
```

### Option 2: Reddit MCP Server (TypeScript)

**Repo:** `vendor/connectors/reddit/reddit-mcp-ts/`

**Pros:**

- Native MCP integration
- TypeScript
- Docker-ready
- OAuth support
- HTTP transport option

**MCP Tools Available:**

```
Read-only (Client Credentials):
- get_reddit_post(subreddit, post_id)
- get_top_posts(subreddit, time_filter, limit)
- get_user_info(username)
- get_subreddit_info(subreddit_name)
- get_trending_subreddits()
- search_reddit(query, subreddit?, sort?, time_filter?, limit?, type?)
- get_post_comments(post_id, subreddit, sort?, limit?)

Write (User Credentials Required):
- create_post(subreddit, title, content, is_self)
- reply_to_post(post_id, content, subreddit?)
```

**MCP Configuration:**

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "<YOUR_CLIENT_ID>",
        "REDDIT_CLIENT_SECRET": "<YOUR_CLIENT_SECRET>"
      }
    }
  }
}
```

**HTTP Endpoint (FastMCP):**

```typescript
// Client usage
const response = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_TOKEN',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_top_posts',
      arguments: {
        subreddit: 'technology',
        time_filter: 'week',
        limit: 10,
      },
    },
  }),
});
```

### Recommendation: Reddit

**For MVP:** Use Reddit MCP TypeScript server

- Native MCP integration
- TypeScript (matches our stack)
- Docker deployment ready
- Can expose HTTP endpoint for non-MCP clients

---

## YouTube Connectors

### YouTube Transcript API

**Repo:** `vendor/connectors/youtube/youtube-transcript-api/`

**Purpose:** Extract transcripts from YouTube videos without browser automation

**Basic Usage:**

```python
from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()

# Fetch transcript
transcript = ytt_api.fetch("video_id")

for snippet in transcript:
    print(f"{snippet.start:.2f}: {snippet.text}")

# Output as SRT
from youtube_transcript_api.formatters import SRTFormatter
formatter = SRTFormatter()
srt_output = formatter.format_transcript(transcript)
```

**List Available Languages:**

```python
transcript_list = ytt_api.list("video_id")

for t in transcript_list:
    print(t.language, t.language_code, t.is_generated)

# Find specific language
transcript = transcript_list.find_transcript(['en', 'es'])

# Translate
translated = transcript.translate('de')
print(translated.fetch())
```

**Formatters Available:**

- `JSONFormatter` - JSON output
- `SRTFormatter` - SubRip format
- `WebVTTFormatter` - Web Video Text Tracks
- `TextFormatter` - Plain text

**IP Ban Workaround:**

```python
from youtube_transcript_api.proxies import WebshareProxyConfig

ytt_api = YouTubeTranscriptApi(
    proxy_config=WebshareProxyConfig(
        proxy_username="<username>",
        proxy_password="<password>",
    )
)
```

### yt-dlp

**Repo:** `vendor/connectors/youtube/yt-dlp/`

**Purpose:** Download videos, extract metadata, get subtitles

**Key Features:**

- Download any video/audio format
- Extract auto-generated captions
- Get video metadata
- Supports 1000+ sites

**Usage Pattern:**

```bash
# Download audio only
yt-dlp -x --audio-format mp3 "VIDEO_URL"

# Download with subtitles
yt-dlp --write-auto-sub --sub-format srt "VIDEO_URL"

# Get metadata as JSON
yt-dlp --dump-json "VIDEO_URL"
```

### Recommendation: YouTube

**For Transcript Extraction:** Use youtube-transcript-api (Python)

- No download needed
- Direct transcript access
- Multiple format outputs

**For Video/Audio Download:** Use yt-dlp

- Industry standard
- Reliable
- Multi-site support

---

## HackerNews Connector

**Repo:** `vendor/connectors/hackernews/hn-api-official/`

**API Type:** Firebase REST (real-time capable)

**Endpoints:**

```
Base: https://hacker-news.firebaseio.com/v0/

Items:
- /item/{id}.json - Get item (story, comment, job, poll)
- /maxitem.json - Latest item ID

Lists:
- /topstories.json - Top 500 stories
- /newstories.json - New stories
- /beststories.json - Best stories
- /askstories.json - Ask HN
- /showstories.json - Show HN
- /jobstories.json - Jobs

Users:
- /user/{id}.json - User profile

Real-time:
- /updates.json - Changed items and profiles
```

**TypeScript Client:**

```typescript
const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by: string;
  time: number;
  text?: string;
  url?: string;
  title?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
}

async function getTopStories(limit = 30): Promise<HNItem[]> {
  const res = await fetch(`${HN_BASE}/topstories.json`);
  const ids: number[] = await res.json();

  const stories = await Promise.all(
    ids.slice(0, limit).map(async (id) => {
      const itemRes = await fetch(`${HN_BASE}/item/${id}.json`);
      return itemRes.json();
    })
  );

  return stories;
}

async function getTechTrends(): Promise<HNItem[]> {
  const stories = await getTopStories(100);

  // Filter for tech/AI content
  return stories.filter((story) => {
    const text = (story.title || '').toLowerCase();
    return (
      text.includes('ai') ||
      text.includes('gpt') ||
      text.includes('llm') ||
      text.includes('startup')
    );
  });
}
```

**No Rate Limiting!** - Can poll frequently

### Recommendation: HackerNews

**Direct REST API** - No library needed

- Simple Firebase REST
- Real-time updates via `/updates.json`
- No authentication required
- No rate limits

---

## Google Trends

**Repo:** `vendor/connectors/trends/pytrends/`

**Warning:** Unofficial API, may break

**Basic Usage:**

```python
from pytrends.request import TrendReq

pytrends = TrendReq(hl='en-US', tz=360)

# Build payload
pytrends.build_payload(['AI', 'ChatGPT', 'Claude'], timeframe='now 7-d')

# Interest over time
df = pytrends.interest_over_time()

# Related queries
related = pytrends.related_queries()

# Trending searches
trending = pytrends.trending_searches(pn='united_states')
```

### Recommendation: Google Trends

**Use with caution** - Unofficial, fragile

- Good for trend discovery
- Combine with Reddit/HN for validation
- Have fallback plan

---

## Audio/TTS: Kokoro

### Kokoro (Base Library)

**Repo:** `vendor/audio/kokoro/`

**What is Kokoro?**

- 82M parameter open-weight TTS model
- Apache 2.0 License (free commercial use!)
- Quality comparable to larger models
- Multi-language support

**Languages Supported:**

- 🇺🇸 American English ('a')
- 🇬🇧 British English ('b')
- 🇪🇸 Spanish ('e')
- 🇫🇷 French ('f')
- 🇮🇳 Hindi ('h')
- 🇮🇹 Italian ('i')
- 🇯🇵 Japanese ('j')
- 🇧🇷 Brazilian Portuguese ('p')
- 🇨🇳 Mandarin Chinese ('z')

**Basic Usage:**

```python
from kokoro import KPipeline
import soundfile as sf

pipeline = KPipeline(lang_code='a')  # American English

text = "Hello, this is a test of Kokoro TTS."
generator = pipeline(text, voice='af_heart')

for i, (gs, ps, audio) in enumerate(generator):
    sf.write(f'output_{i}.wav', audio, 24000)
```

**Custom Phoneme Support:**

```python
# Use IPA for precise pronunciation
text = '[Kokoro](/kˈOkəɹO/) is amazing.'
```

### Kokoro-FastAPI (Production Server)

**Repo:** `vendor/audio/kokoro-fastapi/`

**Why Use This?**

- OpenAI-compatible API endpoint!
- Docker-ready (GPU + CPU)
- Streaming support
- Voice mixing
- Word-level timestamps
- Web UI included

**OpenAI-Compatible Endpoint:**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Generate speech
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_heart",
    input="Hello world!"
) as response:
    response.stream_to_file("output.mp3")
```

**Voice Mixing:**

```python
# Combine voices with weights
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "input": "Hello world!",
        "voice": "af_bella(2)+af_sky(1)",  # 67%/33% mix
        "response_format": "mp3"
    }
)
```

**Word-Level Timestamps (Critical for Captions!):**

```python
response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
        "response_format": "mp3",
        "stream": False,
    }
)

data = response.json()
audio_bytes = base64.b64decode(data["audio"])
timestamps = data["timestamps"]  # Word-level timing!
```

**Docker Deployment:**

```bash
# GPU (CUDA)
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

**Performance:**

- GPU: 35x-100x realtime speed
- CPU: Usable on M1/M2/M3 Macs
- First token latency: ~300ms (GPU), ~3500ms (CPU)

### Recommendation: TTS

**Use Kokoro-FastAPI for production:**

1. OpenAI-compatible API (easy to swap)
2. Word-level timestamps (essential for captions)
3. Docker-ready
4. Free and open-source
5. Multi-language support

**Fallback: EdgeTTS** (Microsoft, 30+ languages, but cloud-dependent)

---

## Agent Frameworks

### LangGraph

**Repo:** `vendor/agents/langgraph/`

**What is LangGraph?**

- Low-level orchestration for stateful agents
- Built on Pregel/Apache Beam concepts
- Durable execution (survives failures)
- Human-in-the-loop support

**Key Benefits:**

1. **Durable Execution** - Resume from failures
2. **Human-in-the-Loop** - Pause for approval
3. **Persistent Memory** - Short-term + long-term
4. **LangSmith Integration** - Debugging/observability
5. **Production-Ready** - Scalable deployment

**Basic Graph:**

```python
from langgraph.graph import START, StateGraph
from typing_extensions import TypedDict

class State(TypedDict):
    text: str
    topics: list[str]
    script: str

def extract_topics(state: State) -> dict:
    # LLM extracts topics from text
    return {"topics": ["AI", "productivity"]}

def generate_script(state: State) -> dict:
    # LLM generates video script
    return {"script": "Today we'll explore..."}

graph = StateGraph(State)
graph.add_node("extract", extract_topics)
graph.add_node("generate", generate_script)
graph.add_edge(START, "extract")
graph.add_edge("extract", "generate")

app = graph.compile()
result = app.invoke({"text": "..."})
```

### Pydantic-AI

**Repo:** `vendor/agents/pydantic-ai/`

**What is Pydantic-AI?**

- Agent framework from Pydantic team
- Type-safe (like FastAPI for agents)
- Model-agnostic
- Structured outputs guaranteed
- MCP integration built-in

**Key Benefits:**

1. **Type Safety** - Compile-time error catching
2. **Model-Agnostic** - Any LLM provider
3. **Structured Outputs** - Pydantic validation
4. **Dependency Injection** - Clean architecture
5. **MCP/A2A Support** - Native integrations

**Basic Agent:**

```python
from pydantic_ai import Agent
from pydantic import BaseModel

class VideoScript(BaseModel):
    title: str
    hook: str
    body: list[str]
    cta: str

agent = Agent(
    'anthropic:claude-sonnet-4-0',
    output_type=VideoScript,
    instructions='Generate engaging short-form video scripts.'
)

result = agent.run_sync('Create a script about AI productivity tools')
print(result.output)  # Validated VideoScript!
```

**With Tools:**

```python
@agent.tool
async def get_trending_topics(ctx: RunContext) -> list[str]:
    """Fetch current trending topics from Reddit."""
    # Call Reddit MCP
    return ["AI", "Remote work", "Climate tech"]
```

### Recommendation: Agent Frameworks

**For MVP:**

- **Pydantic-AI** for simple agent workflows (type-safe, structured outputs)
- **LangGraph** when we need:
  - Complex multi-step workflows
  - Human-in-the-loop approval
  - Durable long-running tasks
  - State persistence

---

## Integration Architecture

### Unified Content Source Interface

```typescript
// src/connectors/types.ts
export interface ContentSource {
  id: string;
  type: 'reddit' | 'youtube' | 'hackernews' | 'trends';
}

export interface TrendingContent {
  id: string;
  source: ContentSource;
  title: string;
  body?: string;
  url?: string;
  score: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface ContentConnector {
  getTrending(options: TrendingOptions): Promise<TrendingContent[]>;
  getContent(id: string): Promise<TrendingContent>;
  search(query: string, options?: SearchOptions): Promise<TrendingContent[]>;
}
```

### MCP-Based Architecture

```typescript
// src/connectors/mcp-registry.ts
export const mcpServers = {
  reddit: {
    command: 'npx',
    args: ['reddit-mcp-server'],
    env: {
      REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
      REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
    },
  },
  // Add more as needed
};

// src/connectors/unified.ts
export class UnifiedContentConnector {
  private reddit: MCPClient;
  private youtube: YouTubeTranscriptClient;
  private hn: HackerNewsClient;

  async getAllTrending(): Promise<TrendingContent[]> {
    const [reddit, hn] = await Promise.all([
      this.reddit.call('get_trending_subreddits', {}),
      this.hn.getTopStories(50),
    ]);

    return [...reddit, ...hn].sort((a, b) => b.score - a.score);
  }
}
```

### TTS Integration

```typescript
// src/audio/tts.ts
export class TTSEngine {
  private baseUrl = 'http://localhost:8880/v1';

  async synthesize(text: string, voice = 'af_heart'): Promise<TTSResult> {
    const response = await fetch(`${this.baseUrl}/dev/captioned_speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        response_format: 'mp3',
        stream: false,
      }),
    });

    const data = await response.json();

    return {
      audioBuffer: Buffer.from(data.audio, 'base64'),
      timestamps: data.timestamps, // Word-level timing!
    };
  }
}
```

---

## What We Have

| Component          | Status     | Best Option              |
| ------------------ | ---------- | ------------------------ |
| Reddit             | ✅ Ready   | reddit-mcp-ts            |
| YouTube Transcript | ✅ Ready   | youtube-transcript-api   |
| HackerNews         | ✅ Ready   | Direct Firebase REST     |
| Google Trends      | ⚠️ Fragile | pytrends (with fallback) |
| TTS                | ✅ Ready   | Kokoro-FastAPI           |
| Agent Framework    | ✅ Ready   | Pydantic-AI + LangGraph  |

---

## Next Steps

1. **Create unified connector interface** (TypeScript)
2. **Setup Reddit MCP server** (Docker)
3. **Deploy Kokoro-FastAPI** (Docker, GPU preferred)
4. **Implement HN client** (simple fetch wrapper)
5. **Add YouTube transcript extraction** (Python microservice or Node wrapper)

---

**Status:** Research complete. All data acquisition paths documented.
