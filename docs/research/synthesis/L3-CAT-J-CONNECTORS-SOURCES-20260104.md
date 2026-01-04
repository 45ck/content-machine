# Layer 3 Category J: Connectors & Content Sources

**Date:** 2026-01-04  
**Synthesized From:** 5 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 1 - Content Pipeline

---

## Category Summary

Content connectors source trending topics and raw content for video generation. Key sources: **Reddit**, **YouTube**, **Hacker News**, **Web Search**.

---

## Source Comparison

| Source | API Cost | Content Type | Rate Limits |
|--------|----------|--------------|-------------|
| **Reddit** | Free* | Text, discussions | Varies |
| **YouTube** | Free | Transcripts | Generous |
| **Hacker News** | Free | Tech news | Unlimited |
| **Tavily** | $$ | Web search | Per call |
| **Firecrawl** | Self-host | Web scraping | Unlimited |

*Reddit API now requires developer account

---

## Reddit Connectors

### Option 1: reddit-mcp-buddy (No API Key)

**Best for:** Quick scraping without API access

```python
from mcp import Client

async with Client("http://localhost:8001") as reddit:
    # Browse trending posts
    posts = await reddit.call_tool("browse_subreddit", {
        "subreddit": "programming",
        "sort": "hot",
        "limit": 20
    })
    
    # Get comments
    comments = await reddit.call_tool("get_post_comments", {
        "post_url": posts[0]["url"],
        "limit": 50
    })
```

### Option 2: reddit-mcp-ts (Official API)

**Best for:** Production use with API access

```typescript
import { createRedditClient } from './reddit-mcp';

const client = createRedditClient({
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET
});

// Get trending posts
const posts = await client.getHot('programming', { limit: 25 });

// Search posts
const results = await client.search('AI tools', {
  subreddit: 'technology',
  sort: 'top',
  time: 'week'
});
```

### Pattern: Trend Extraction

```python
async def extract_trending_topics(subreddits: list[str]) -> list[Topic]:
    topics = []
    
    for sub in subreddits:
        posts = await reddit.browse(sub, sort="hot", limit=25)
        
        for post in posts:
            if post['score'] > 100 and post['num_comments'] > 20:
                topics.append(Topic(
                    title=post['title'],
                    source=f"r/{sub}",
                    engagement=post['score'] + post['num_comments'],
                    url=post['url']
                ))
    
    # Rank by engagement
    return sorted(topics, key=lambda t: t.engagement, reverse=True)[:10]
```

---

## YouTube Connectors

### youtube-transcript-api

**Best for:** Getting video transcripts for research

```python
from youtube_transcript_api import YouTubeTranscriptApi

# Get transcript
transcript = YouTubeTranscriptApi.get_transcript("dQw4w9WgXcQ")

# Format as text
text = " ".join([entry['text'] for entry in transcript])

# With timestamps
for entry in transcript:
    print(f"{entry['start']:.1f}s: {entry['text']}")
```

### MCP Wrapper

```python
@mcp.tool()
async def get_video_transcript(
    video_id: str,
    language: str = "en"
) -> dict:
    """Get transcript from a YouTube video."""
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, [language])
        return {
            "transcript": transcript,
            "text": " ".join([e['text'] for e in transcript]),
            "duration": transcript[-1]['start'] if transcript else 0
        }
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
async def search_youtube(
    query: str,
    max_results: int = 10
) -> list[dict]:
    """Search YouTube for videos."""
    # Uses youtube-search-python (no API key)
    from youtubesearchpython import VideosSearch
    search = VideosSearch(query, limit=max_results)
    return search.result()['result']
```

---

## Hacker News Connector

### mcp-hackernews

**Best for:** Tech-focused trending topics

```python
@mcp.tool()
async def get_top_stories(limit: int = 30) -> list[dict]:
    """Get top stories from Hacker News."""
    async with aiohttp.ClientSession() as session:
        # Get top story IDs
        async with session.get('https://hacker-news.firebaseio.com/v0/topstories.json') as resp:
            story_ids = await resp.json()
        
        # Fetch story details
        stories = []
        for story_id in story_ids[:limit]:
            async with session.get(f'https://hacker-news.firebaseio.com/v0/item/{story_id}.json') as resp:
                story = await resp.json()
                stories.append({
                    'id': story['id'],
                    'title': story.get('title'),
                    'url': story.get('url'),
                    'score': story.get('score', 0),
                    'comments': story.get('descendants', 0)
                })
        
        return stories

@mcp.tool()
async def get_story_comments(story_id: int, limit: int = 20) -> list[dict]:
    """Get comments for a Hacker News story."""
    # Implementation
```

---

## Web Search: Tavily

### AI-Optimized Search

```python
from tavily import TavilyClient

client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

# Search with context extraction
result = client.search(
    query="best AI tools for developers 2026",
    search_depth="advanced",
    include_answer=True,
    max_results=10
)

# Get AI-generated answer
print(result['answer'])

# Get source documents
for doc in result['results']:
    print(f"- {doc['title']}: {doc['url']}")
```

### MCP Wrapper

```python
@mcp.tool()
async def search_web(
    query: str,
    max_results: int = 5
) -> dict:
    """Search the web for information."""
    result = tavily.search(
        query=query,
        search_depth="basic",
        max_results=max_results
    )
    return {
        "answer": result.get('answer'),
        "sources": [
            {"title": r['title'], "url": r['url'], "content": r['content']}
            for r in result['results']
        ]
    }
```

---

## Web Scraping: Firecrawl

### Self-Hosted Scraping

```python
from firecrawl import FirecrawlApp

firecrawl = FirecrawlApp(api_url="http://localhost:3002")

# Scrape a page
result = firecrawl.scrape_url(
    url="https://example.com/article",
    params={
        "formats": ["markdown", "text"],
        "onlyMainContent": True
    }
)

print(result['markdown'])
```

### MCP Wrapper

```python
@mcp.tool()
async def scrape_page(url: str) -> dict:
    """Scrape content from a web page."""
    result = await firecrawl.scrape_url(
        url=url,
        params={"formats": ["markdown"], "onlyMainContent": True}
    )
    return {
        "title": result.get('title'),
        "content": result.get('markdown'),
        "url": url
    }

@mcp.tool()
async def crawl_site(
    url: str,
    max_pages: int = 10
) -> list[dict]:
    """Crawl a website and extract content."""
    results = await firecrawl.crawl_url(
        url=url,
        params={
            "limit": max_pages,
            "scrapeOptions": {"formats": ["markdown"]}
        }
    )
    return results['data']
```

---

## Content Aggregation Pattern

### Multi-Source Trend Research

```python
from dataclasses import dataclass

@dataclass
class TrendingTopic:
    title: str
    source: str
    score: float
    url: str
    summary: str

async def aggregate_trends(topic: str) -> list[TrendingTopic]:
    """Aggregate trending content from multiple sources."""
    
    # Parallel fetch from all sources
    reddit_task = asyncio.create_task(
        reddit_mcp.call_tool("browse_subreddit", {
            "subreddit": "technology",
            "sort": "top",
            "limit": 20
        })
    )
    
    hn_task = asyncio.create_task(
        hn_mcp.call_tool("get_top_stories", {"limit": 20})
    )
    
    search_task = asyncio.create_task(
        tavily.search(topic, max_results=10)
    )
    
    reddit_posts, hn_stories, search_results = await asyncio.gather(
        reddit_task, hn_task, search_task
    )
    
    # Normalize and score
    trends = []
    
    for post in reddit_posts:
        trends.append(TrendingTopic(
            title=post['title'],
            source='reddit',
            score=post['score'] / 1000,  # Normalize
            url=post['url'],
            summary=post.get('selftext', '')[:200]
        ))
    
    for story in hn_stories:
        trends.append(TrendingTopic(
            title=story['title'],
            source='hackernews',
            score=story['score'] / 500,  # Normalize
            url=story['url'],
            summary=''
        ))
    
    for result in search_results['results']:
        trends.append(TrendingTopic(
            title=result['title'],
            source='web',
            score=0.5,  # Default score
            url=result['url'],
            summary=result['content'][:200]
        ))
    
    # Sort by score and deduplicate
    return sorted(trends, key=lambda t: t.score, reverse=True)[:15]
```

---

## Content for Video Topics

### Pattern: Reddit Story → Video

```python
async def reddit_to_video_topic(subreddit: str) -> VideoTopic:
    """Find viral Reddit story for video content."""
    
    # Get top posts
    posts = await reddit.browse(subreddit, sort="top", time="week", limit=50)
    
    # Filter for video-worthy content
    candidates = [
        p for p in posts
        if p['score'] > 500
        and len(p.get('selftext', '')) > 100
        and not p['is_video']  # Text stories only
    ]
    
    if not candidates:
        return None
    
    # Pick best candidate
    best = max(candidates, key=lambda p: p['score'])
    
    # Extract story content
    comments = await reddit.get_comments(best['url'], limit=30)
    top_comments = [c['body'] for c in comments if c['score'] > 50][:5]
    
    return VideoTopic(
        title=best['title'],
        story=best['selftext'],
        comments=top_comments,
        source_url=best['url'],
        engagement_score=best['score']
    )
```

### Pattern: YouTube Research → Video

```python
async def youtube_research_to_script(topic: str) -> str:
    """Research YouTube videos to create original script."""
    
    # Find top videos on topic
    videos = await youtube.search(topic, max_results=5)
    
    # Get transcripts
    transcripts = []
    for video in videos:
        try:
            transcript = await youtube.get_transcript(video['id'])
            transcripts.append({
                'title': video['title'],
                'content': transcript['text']
            })
        except:
            continue
    
    # Synthesize into original script (via LLM)
    prompt = f"""
    Research the following video transcripts about "{topic}":
    
    {json.dumps(transcripts, indent=2)}
    
    Create an ORIGINAL 60-second script that:
    - Synthesizes key insights from these sources
    - Does NOT copy any content directly
    - Adds new perspective or angle
    - Is engaging for TikTok/Reels audience
    """
    
    return await llm.generate(prompt)
```

---

## Rate Limiting & Caching

### Request Caching

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedConnector:
    def __init__(self, ttl_minutes: int = 30):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)
    
    async def get_cached(self, key: str, fetch_fn):
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.ttl:
                return data
        
        data = await fetch_fn()
        self.cache[key] = (data, datetime.now())
        return data

# Usage
connector = CachedConnector(ttl_minutes=15)
posts = await connector.get_cached(
    "reddit:programming:hot",
    lambda: reddit.browse("programming", "hot")
)
```

### Rate Limiting

```python
from asyncio import Semaphore
from time import time

class RateLimiter:
    def __init__(self, requests_per_minute: int):
        self.rpm = requests_per_minute
        self.semaphore = Semaphore(requests_per_minute)
        self.window_start = time()
        self.request_count = 0
    
    async def acquire(self):
        current = time()
        if current - self.window_start > 60:
            self.window_start = current
            self.request_count = 0
        
        if self.request_count >= self.rpm:
            wait_time = 60 - (current - self.window_start)
            await asyncio.sleep(wait_time)
            self.window_start = time()
            self.request_count = 0
        
        self.request_count += 1

# Usage
limiter = RateLimiter(requests_per_minute=60)
await limiter.acquire()
result = await api.call()
```

---

## Source Documents

- DD-45: Social connectors + browsers + capture
- DD-52: Connectors + clipping + scene detection
- DD-60: Connectors + data platforms + storage
- connectors-browsers-capture-DEEP
- connectors-clipping-detection-DEEP

---

## Key Takeaway

> **Use reddit-mcp-buddy for API-free Reddit access, youtube-transcript-api for video transcripts, mcp-hackernews for tech trends, and Tavily for web search. Aggregate from multiple sources, cache aggressively, and respect rate limits.**
