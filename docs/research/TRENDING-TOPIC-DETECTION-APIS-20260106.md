# Trending Topic Detection & Content Research APIs

**Research Date:** January 6, 2026  
**Purpose:** Identify APIs and tools for automated trending topic detection for content-machine  
**Status:** Research Complete

---

## Executive Summary

This document analyzes available APIs and tools for detecting trending topics programmatically. The goal is to integrate trend detection into content-machine's pipeline to help users create timely, relevant short-form videos.

**Recommended Approach:**

1. **Primary Sources:** Hacker News API (free, no auth) + Google Trends API (via npm package)
2. **Secondary Sources:** Reddit API (free tier) + NewsAPI (dev tier)
3. **Platform-Specific:** TikTok Creative Center (scraping) for platform trends

---

## 1. Google Trends

### Official API Status

- **No official public API** - Google does not provide a documented REST API for Trends
- Trends data is accessible through the web interface at https://trends.google.com/trending

### Unofficial Solutions

#### google-trends-api (npm package)

- **Package:** `google-trends-api`
- **Repository:** https://github.com/pat310/google-trends-api
- **npm:** https://www.npmjs.com/package/google-trends-api
- **Weekly Downloads:** ~12,580
- **Status:** Works but subject to throttling (last update 5 years ago)
- **License:** MIT

**Available Methods:**
| Method | Description | Use Case |
|--------|-------------|----------|
| `dailyTrends` | 20 trending searches updated hourly | Hot topics for today |
| `realTimeTrends` | 13 stories trending in last 24h | Breaking news/events |
| `interestOverTime` | Search interest over time (0-100 scale) | Validate topic relevance |
| `interestByRegion` | Interest by location | Geo-targeted content |
| `relatedQueries` | Related search queries | Content ideation |
| `relatedTopics` | Related topics | Expand topic scope |
| `autoComplete` | Search suggestions | Keyword discovery |

**Example Usage:**

```typescript
import googleTrends from 'google-trends-api';

// Get daily trending searches for US
const dailyTrends = await googleTrends.dailyTrends({
  geo: 'US',
  trendDate: new Date(),
});

// Get real-time trends in tech category
const realTimeTrends = await googleTrends.realTimeTrends({
  geo: 'US',
  category: 't', // Science/Tech
});

// Check interest for specific topic
const interest = await googleTrends.interestOverTime({
  keyword: 'React vs Vue',
  startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
});
```

**Rate Limits:**

- No official rate limit, but heavily throttled
- Recommend using proxy rotation for production
- Can result in temporary blocks if too aggressive

**Costs:** FREE (unofficial)

**Integration Recommendation:** ⭐⭐⭐ (Good for initial MVP, but fragile)

---

## 2. Reddit API

### Official API

- **Documentation:** https://www.reddit.com/dev/api/
- **Authentication:** OAuth2 required
- **Base URL:** `https://oauth.reddit.com`

### Key Endpoints for Trend Detection

| Endpoint                       | Description                     | Rate Limit |
| ------------------------------ | ------------------------------- | ---------- |
| `GET /r/{subreddit}/hot`       | Hot posts in subreddit          | 60 req/min |
| `GET /r/{subreddit}/rising`    | Rising posts (early trends)     | 60 req/min |
| `GET /r/{subreddit}/top?t=day` | Top posts today                 | 60 req/min |
| `GET /r/{subreddit}/new`       | New posts                       | 60 req/min |
| `GET /best`                    | Best posts across subscriptions | 60 req/min |
| `GET /subreddits/popular`      | Popular subreddits              | 60 req/min |

### Relevant Tech Subreddits

```
r/programming, r/webdev, r/javascript, r/typescript,
r/reactjs, r/node, r/rust, r/golang, r/python,
r/devops, r/aws, r/kubernetes, r/MachineLearning,
r/artificial, r/technology, r/learnprogramming
```

### npm Wrapper: snoowrap

- **Package:** `snoowrap`
- **Repository:** https://github.com/not-an-aardvark/snoowrap
- **npm:** https://www.npmjs.com/package/snoowrap
- **Weekly Downloads:** ~10,675
- **Status:** Archived (Mar 2024), but still functional
- **License:** MIT

**Example Usage:**

```typescript
import snoowrap from 'snoowrap';

const r = new snoowrap({
  userAgent: 'content-machine:v1.0.0 (by /u/yourusername)',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  refreshToken: process.env.REDDIT_REFRESH_TOKEN,
});

// Get rising posts from r/programming
const rising = await r.getSubreddit('programming').getRising({ limit: 25 });

// Get hot posts from multiple subreddits
const hot = await r.getHot('programming+javascript+webdev', { limit: 50 });

// Extract trending topics
const trends = hot.map((post) => ({
  title: post.title,
  score: post.score,
  comments: post.num_comments,
  url: post.url,
  subreddit: post.subreddit_name_prefixed,
}));
```

**Rate Limits:**

- 60 requests per minute with OAuth
- Headers: `X-Ratelimit-Used`, `X-Ratelimit-Remaining`, `X-Ratelimit-Reset`

**Costs:** FREE

**Integration Recommendation:** ⭐⭐⭐⭐⭐ (Excellent for tech topics)

---

## 3. X (Twitter) API

### Official API v2

- **Documentation:** https://developer.x.com/en/docs/x-api
- **Authentication:** OAuth 2.0

### Pricing Tiers

| Tier           | Cost      | Reads/Month | Posts/Month | Features                |
| -------------- | --------- | ----------- | ----------- | ----------------------- |
| **Free**       | $0        | 100         | 500         | Basic access, limited   |
| **Basic**      | $200/mo   | 10,000      | 3,000       | Low-rate access         |
| **Pro**        | $5,000/mo | 1,000,000   | 300,000     | Search, filtered stream |
| **Enterprise** | Custom    | Unlimited   | Custom      | Full access             |

### Trend Detection Endpoints

- `GET /2/trends/place/:id` - Trends for location (requires higher tier)
- Search endpoints for hashtag tracking
- Filtered stream for real-time monitoring

**Costs:** Expensive ($200-5,000+/month)

**Integration Recommendation:** ⭐⭐ (Too expensive for most use cases)

---

## 4. TikTok APIs

### TikTok Research API

- **Documentation:** https://developers.tiktok.com/products/research-api/
- **Access:** Approved researchers only
- **Endpoint:** `POST /v2/research/video/query/`

**Query Capabilities:**

- Filter by `region_code`, `hashtag_name`, `keyword`, `create_date`
- Video metrics: `view_count`, `like_count`, `comment_count`, `share_count`
- Date range: Up to 30 days

**Access Requirements:**

- Academic/research institution affiliation
- Application approval process
- Not available for commercial use

### TikTok Creative Center (Alternative)

- **URL:** https://ads.tiktok.com/business/creativecenter/
- **Access:** Free, no API (scraping required)

**Available Data:**

- Trending Hashtags (top 100, updated weekly)
- Trending Songs/Sounds
- Top Creators
- Trending TikTok Videos
- Industry filtering

**Scraping Approach:**

```typescript
// Would require Playwright/Puppeteer
const trendingHashtags = await scrapeTikTokCreativeCenter({
  type: 'hashtags',
  timeframe: 'last7days',
  region: 'US',
});
```

**Costs:** FREE (scraping) / Research API (approval required)

**Integration Recommendation:** ⭐⭐⭐ (Creative Center scraping viable)

---

## 5. YouTube Data API v3

### Official API

- **Documentation:** https://developers.google.com/youtube/v3/
- **Authentication:** API Key (read) or OAuth 2.0 (write)

### Key Endpoints

| Endpoint                        | Description      | Quota Cost |
| ------------------------------- | ---------------- | ---------- |
| `GET /videos?chart=mostPopular` | Trending videos  | 1 unit     |
| `GET /search`                   | Search videos    | 100 units  |
| `GET /videoCategories`          | Video categories | 1 unit     |

### Trending Videos Endpoint

```typescript
// GET https://www.googleapis.com/youtube/v3/videos
const params = {
  part: 'snippet,statistics',
  chart: 'mostPopular',
  regionCode: 'US',
  videoCategoryId: '28', // Science & Technology
  maxResults: 50,
  key: process.env.YOUTUBE_API_KEY,
};
```

### Quota System

- **Default:** 10,000 units/day
- Search request: 100 units
- List request: 1 unit
- Video upload: 100 units

**Calculating Capacity:**

- With 10,000 units/day and search at 100 units: 100 searches/day
- With list at 1 unit: 10,000 list operations/day

**Costs:** FREE (with quota limits)

**Integration Recommendation:** ⭐⭐⭐⭐ (Good for video trends)

---

## 6. Hacker News API

### Official API

- **Documentation:** https://github.com/HackerNews/API
- **Base URL:** `https://hacker-news.firebaseio.com/v0/`
- **Authentication:** None required
- **Rate Limit:** No limit documented

### Key Endpoints

| Endpoint            | Description            | Returns      |
| ------------------- | ---------------------- | ------------ |
| `/topstories.json`  | Top 500 story IDs      | Array of IDs |
| `/newstories.json`  | New 500 story IDs      | Array of IDs |
| `/beststories.json` | Best stories           | Array of IDs |
| `/askstories.json`  | Ask HN stories (200)   | Array of IDs |
| `/showstories.json` | Show HN stories (200)  | Array of IDs |
| `/jobstories.json`  | Job stories            | Array of IDs |
| `/item/{id}.json`   | Single item            | Item object  |
| `/maxitem.json`     | Current max item ID    | Number       |
| `/updates.json`     | Changed items/profiles | Object       |

### Item Object Structure

```typescript
interface HNItem {
  id: number;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by: string; // Author username
  time: number; // Unix timestamp
  title?: string; // Story/poll/job title
  url?: string; // Story URL
  score?: number; // Upvotes
  descendants?: number; // Total comment count
  kids?: number[]; // Comment IDs
}
```

### Example Usage

```typescript
// Fetch top stories
const topStoryIds = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then((r) =>
  r.json()
);

// Fetch first 30 stories
const stories = await Promise.all(
  topStoryIds
    .slice(0, 30)
    .map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json())
    )
);

// Filter for trending tech topics
const trending = stories
  .filter((s) => s.score > 100)
  .map((s) => ({
    title: s.title,
    url: s.url,
    score: s.score,
    comments: s.descendants,
  }));
```

### Firebase Real-time Updates

```typescript
// Using Firebase SDK for real-time updates
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

const db = getDatabase(
  initializeApp({
    databaseURL: 'https://hacker-news.firebaseio.com',
  })
);

onValue(ref(db, 'v0/topstories'), (snapshot) => {
  const topStories = snapshot.val();
  // React to changes in real-time
});
```

**Costs:** FREE

**Integration Recommendation:** ⭐⭐⭐⭐⭐ (Perfect for tech content)

---

## 7. News Aggregation APIs

### NewsAPI.org

- **Documentation:** https://newsapi.org/docs
- **Authentication:** API Key

### Endpoints

| Endpoint            | Description                       |
| ------------------- | --------------------------------- |
| `/v2/everything`    | Search all articles               |
| `/v2/top-headlines` | Breaking news by country/category |
| `/v2/sources`       | Available news sources            |

### Pricing

| Plan          | Cost      | Requests | Article Age | Features            |
| ------------- | --------- | -------- | ----------- | ------------------- |
| **Developer** | FREE      | 100/day  | 24h delay   | Localhost CORS only |
| **Business**  | $449/mo   | 250K/mo  | Real-time   | 5 year archive      |
| **Advanced**  | $1,749/mo | 2M/mo    | Real-time   | 99.95% SLA          |

### Example Usage

```typescript
// Search tech news
const response = await fetch(
  'https://newsapi.org/v2/everything?' +
    new URLSearchParams({
      q: 'artificial intelligence OR machine learning',
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: '50',
    }),
  {
    headers: { 'X-Api-Key': process.env.NEWSAPI_KEY },
  }
);
```

### Limitations

- Dev tier: 24-hour article delay, 100 requests/day
- No full article content (URLs only)
- CORS restricted on free tier

**Costs:** FREE (dev) to $449+/month (production)

**Integration Recommendation:** ⭐⭐⭐ (Good for news, expensive for production)

---

## 8. NPM Packages Summary

### Recommended Packages

| Package               | Purpose               | Weekly Downloads | Status                 |
| --------------------- | --------------------- | ---------------- | ---------------------- |
| `google-trends-api`   | Google Trends access  | 12,580           | Unmaintained but works |
| `snoowrap`            | Reddit API wrapper    | 10,675           | Archived but works     |
| `@googleapis/youtube` | YouTube Data API      | 50,000+          | Official, maintained   |
| `firebase`            | Hacker News real-time | 1M+              | Official, maintained   |

### Not Recommended

- `twitter-api-v2` - Works but API pricing prohibitive
- Unofficial TikTok scrapers - ToS violation risk

---

## 9. Best Practices for Trend Validation

### Multi-Source Validation

```typescript
interface TrendSignal {
  source: string;
  topic: string;
  score: number;
  timestamp: Date;
}

async function validateTrend(topic: string): Promise<boolean> {
  const signals: TrendSignal[] = [];

  // Check multiple sources
  const [hn, reddit, google] = await Promise.all([
    checkHackerNews(topic),
    checkReddit(topic),
    checkGoogleTrends(topic),
  ]);

  // Require 2+ sources to confirm trend
  const confirmed = [hn, reddit, google].filter(Boolean).length >= 2;
  return confirmed;
}
```

### Trend Scoring Algorithm

```typescript
function calculateTrendScore(data: TrendData): number {
  const weights = {
    velocity: 0.3, // Rate of increase
    volume: 0.25, // Total mentions
    recency: 0.25, // How recent
    engagement: 0.2, // Comments/shares ratio
  };

  return (
    data.velocity * weights.velocity +
    data.volume * weights.volume +
    data.recency * weights.recency +
    data.engagement * weights.engagement
  );
}
```

### Freshness Windows

| Content Type     | Optimal Window | Decay Rate |
| ---------------- | -------------- | ---------- |
| Breaking news    | 0-4 hours      | Fast       |
| Tech trends      | 1-7 days       | Medium     |
| Evergreen topics | 7-30 days      | Slow       |

---

## 10. How Content Creators Research Topics

### Common Approaches

1. **Platform-Native Tools**
   - TikTok Creative Center for TikTok trends
   - YouTube Trending page + Analytics
   - Twitter/X Explore page

2. **Cross-Platform Monitoring**
   - Reddit rising posts in niche subreddits
   - Hacker News front page for tech
   - Product Hunt for new products

3. **Google Tools**
   - Google Trends for search interest
   - Google Alerts for keyword monitoring
   - YouTube search autocomplete

4. **Community Signals**
   - Discord server discussions
   - Slack community channels
   - Newsletter trending sections

5. **Competitive Analysis**
   - Monitor competitor content performance
   - Identify gaps in coverage
   - Track viral content patterns

---

## 11. Recommended Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trend Detection Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Hacker   │  │  Reddit  │  │  Google  │  │  NewsAPI │       │
│  │  News    │  │   API    │  │  Trends  │  │  (opt)   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │              │
│       └─────────────┴──────┬──────┴─────────────┘              │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │   Aggregator   │                           │
│                    │  & Deduper     │                           │
│                    └───────┬───────┘                           │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │  Trend Scorer  │                           │
│                    │  & Validator   │                           │
│                    └───────┬───────┘                           │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │    LLM for    │                           │
│                    │ Topic Framing │                           │
│                    └───────┬───────┘                           │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │  cm generate  │                           │
│                    │   Pipeline    │                           │
│                    └───────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Cost Summary

| Source              | Free Tier     | Paid Tier     | Recommended           |
| ------------------- | ------------- | ------------- | --------------------- |
| Hacker News API     | Unlimited     | N/A           | ✅ Yes                |
| Reddit API          | 60 req/min    | N/A           | ✅ Yes                |
| Google Trends (npm) | Unlimited\*   | N/A           | ✅ Yes (with caution) |
| YouTube Data API    | 10K units/day | Custom        | ✅ Yes                |
| NewsAPI             | 100 req/day   | $449+/mo      | ⚠️ Dev only           |
| X/Twitter API       | 100 reads/mo  | $200+/mo      | ❌ Too expensive      |
| TikTok Research API | N/A           | Academic only | ❌ Not accessible     |

\*Subject to throttling

---

## 13. Implementation Priority

### Phase 1: MVP (Week 1)

- [ ] Hacker News API integration (free, no auth)
- [ ] Basic trend aggregation
- [ ] LLM-based topic framing

### Phase 2: Enhanced (Week 2-3)

- [ ] Reddit API integration
- [ ] Google Trends validation
- [ ] Multi-source scoring

### Phase 3: Advanced (Week 4+)

- [ ] YouTube trending integration
- [ ] TikTok Creative Center scraping
- [ ] Real-time trend monitoring (Firebase)

---

## 14. CLI Command Design

```bash
# Discover trending topics
cm trends --sources hn,reddit,google --category tech --limit 10

# Generate video from trending topic
cm generate --from-trends --archetype versus --output video.mp4

# Validate topic before generation
cm validate "Redis vs PostgreSQL" --check-trends
```

---

## References

- Hacker News API: https://github.com/HackerNews/API
- Reddit API: https://www.reddit.com/dev/api/
- google-trends-api: https://github.com/pat310/google-trends-api
- snoowrap: https://github.com/not-an-aardvark/snoowrap
- YouTube Data API: https://developers.google.com/youtube/v3/
- NewsAPI: https://newsapi.org/docs
- X API: https://developer.x.com/en/docs/x-api
- TikTok Developers: https://developers.tiktok.com/

---

**Last Updated:** January 6, 2026  
**Author:** Research Agent  
**Status:** Ready for Implementation
