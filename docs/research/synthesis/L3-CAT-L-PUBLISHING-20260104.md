# Layer 3 Category L: Publishing & Distribution

**Date:** 2026-01-04  
**Synthesized From:** 3 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 4 - Infrastructure

---

## Category Summary

Publishing systems automate video upload to social platforms. Key challenges: **API access**, **rate limits**, **scheduling**, and **analytics**.

---

## Platform Overview

| Platform | Official API | Unofficial Options | Rate Limits |
|----------|--------------|-------------------|-------------|
| **TikTok** | Content Posting API | Browser automation | 10/day |
| **YouTube** | Data API v3 | None needed | Quota-based |
| **Instagram** | Graph API (Business) | Browser automation | Complex |
| **Twitter/X** | API v2 | None needed | Tier-based |

---

## Official APIs

### YouTube Data API

**Best for:** Production use, most reliable

```typescript
import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

async function uploadToYouTube(
  videoPath: string,
  metadata: VideoMetadata
): Promise<string> {
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: '28'  // Science & Technology
      },
      status: {
        privacyStatus: 'public',  // or 'private', 'unlisted'
        selfDeclaredMadeForKids: false,
        embeddable: true
      }
    },
    media: {
      body: fs.createReadStream(videoPath)
    }
  });
  
  return response.data.id!;
}

// Schedule for later
async function scheduleYouTube(
  videoPath: string,
  metadata: VideoMetadata,
  publishAt: Date
): Promise<string> {
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags
      },
      status: {
        privacyStatus: 'private',
        publishAt: publishAt.toISOString()  // Auto-publish at this time
      }
    },
    media: {
      body: fs.createReadStream(videoPath)
    }
  });
  
  return response.data.id!;
}
```

### TikTok Content Posting API

**Best for:** Business accounts with API access

```typescript
import axios from 'axios';

async function initTikTokUpload(accessToken: string): Promise<string> {
  const response = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      post_info: {
        title: 'AI Trends 2026 #ai #tech #2026',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: 10000000  // 10MB chunks
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.data.publish_id;
}

async function uploadChunk(
  uploadUrl: string,
  chunk: Buffer,
  start: number,
  end: number,
  total: number
): Promise<void> {
  await axios.put(uploadUrl, chunk, {
    headers: {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Type': 'video/mp4'
    }
  });
}
```

---

## Unofficial Automation

### tiktok-uploader (Browser Automation)

**Warning:** May violate ToS, use at your own risk

```python
from tiktok_uploader.upload import upload_video
from tiktok_uploader.auth import AuthBackend

# Cookie-based auth
auth = AuthBackend(cookies='cookies.txt')

# Upload video
upload_video(
    filename='video.mp4',
    description='AI Trends 2026 #ai #tech',
    cookies='cookies.txt',
    headless=True  # Run without browser window
)
```

### Playwright-Based Upload

```typescript
import { chromium } from 'playwright';

async function uploadToTikTokBrowser(
  videoPath: string,
  caption: string,
  cookies: Cookie[]
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  
  const page = await context.newPage();
  await page.goto('https://www.tiktok.com/upload');
  
  // Upload file
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles(videoPath);
  
  // Wait for processing
  await page.waitForSelector('[data-e2e="post-button"]', { timeout: 60000 });
  
  // Add caption
  await page.locator('[data-e2e="caption-input"]').fill(caption);
  
  // Post
  await page.click('[data-e2e="post-button"]');
  await page.waitForURL(/\/@/, { timeout: 120000 });
  
  await browser.close();
}
```

---

## Social Media Schedulers

### Postiz (Open Source)

**Best for:** Multi-platform scheduling with UI

```yaml
# docker-compose.yml
services:
  postiz:
    image: postiz/postiz:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/postiz
      REDIS_URL: redis://redis:6379
```

```typescript
// API integration
import { PostizClient } from '@postiz/sdk';

const postiz = new PostizClient({
  apiKey: process.env.POSTIZ_API_KEY
});

// Schedule post
await postiz.posts.create({
  content: 'Check out our new AI video! 🤖',
  platforms: ['tiktok', 'instagram', 'twitter'],
  scheduledAt: new Date('2026-01-15T10:00:00Z'),
  media: [{ url: videoUrl, type: 'video' }]
});
```

### Mixpost

**Best for:** Laravel/PHP stack

```php
// Schedule across platforms
Mixpost::schedule()
    ->platforms(['tiktok', 'instagram', 'twitter'])
    ->content('AI Trends 2026 🚀')
    ->media($videoPath)
    ->at(Carbon::parse('2026-01-15 10:00'));
```

---

## Publishing Service Pattern

### Unified Publisher

```typescript
interface Publisher {
  upload(video: VideoAsset, metadata: VideoMetadata): Promise<string>;
  schedule(video: VideoAsset, metadata: VideoMetadata, publishAt: Date): Promise<string>;
  getStatus(publishId: string): Promise<PublishStatus>;
}

class YouTubePublisher implements Publisher {
  async upload(video: VideoAsset, metadata: VideoMetadata): Promise<string> {
    return await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title: metadata.title, description: metadata.description },
        status: { privacyStatus: 'public' }
      },
      media: { body: fs.createReadStream(video.path) }
    }).then(r => r.data.id!);
  }
  
  async schedule(video: VideoAsset, metadata: VideoMetadata, publishAt: Date): Promise<string> {
    return await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title: metadata.title, description: metadata.description },
        status: { privacyStatus: 'private', publishAt: publishAt.toISOString() }
      },
      media: { body: fs.createReadStream(video.path) }
    }).then(r => r.data.id!);
  }
  
  async getStatus(videoId: string): Promise<PublishStatus> {
    const response = await youtube.videos.list({
      part: ['status'],
      id: [videoId]
    });
    return {
      status: response.data.items?.[0]?.status?.privacyStatus || 'unknown',
      url: `https://youtube.com/watch?v=${videoId}`
    };
  }
}

class TikTokPublisher implements Publisher {
  // Similar implementation using TikTok API
}

class PublishService {
  private publishers: Map<Platform, Publisher> = new Map([
    ['youtube', new YouTubePublisher()],
    ['tiktok', new TikTokPublisher()]
  ]);
  
  async publish(
    video: VideoAsset,
    metadata: VideoMetadata,
    platforms: Platform[]
  ): Promise<Map<Platform, string>> {
    const results = new Map<Platform, string>();
    
    await Promise.all(platforms.map(async platform => {
      const publisher = this.publishers.get(platform);
      if (publisher) {
        const id = await publisher.upload(video, metadata);
        results.set(platform, id);
      }
    }));
    
    return results;
  }
}
```

---

## Metadata Optimization

### Platform-Specific Formatting

```typescript
interface PlatformMetadata {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
}

function formatForPlatform(
  base: VideoMetadata,
  platform: Platform
): PlatformMetadata {
  switch (platform) {
    case 'youtube':
      return {
        title: base.title.slice(0, 100),  // Max 100 chars
        description: `${base.description}\n\n${base.hashtags.map(h => `#${h}`).join(' ')}`,
        tags: base.tags.slice(0, 500),    // Max 500 chars total
        hashtags: []
      };
    
    case 'tiktok':
      return {
        title: `${base.title.slice(0, 100)} ${base.hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}`,
        description: '',  // TikTok uses caption only
        tags: [],
        hashtags: base.hashtags.slice(0, 5)
      };
    
    case 'instagram':
      return {
        title: '',
        description: `${base.description}\n\n${base.hashtags.slice(0, 30).map(h => `#${h}`).join(' ')}`,
        tags: [],
        hashtags: base.hashtags.slice(0, 30)
      };
    
    default:
      return base;
  }
}
```

### Hashtag Generation

```typescript
async function generateHashtags(
  topic: string,
  platform: Platform,
  count: number = 10
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Generate ${count} trending hashtags for a ${platform} video about: ${topic}
      
      Requirements:
      - Mix of popular and niche hashtags
      - Relevant to the topic
      - No # symbol, just the words
      - One per line`
    }]
  });
  
  return response.choices[0].message.content!
    .split('\n')
    .map(h => h.trim().replace('#', ''))
    .filter(h => h.length > 0);
}
```

---

## Scheduling Patterns

### Content Calendar

```typescript
interface ScheduleSlot {
  platform: Platform;
  dayOfWeek: number;  // 0-6
  hour: number;       // 0-23
  minute: number;
}

const OPTIMAL_SLOTS: ScheduleSlot[] = [
  // TikTok peaks
  { platform: 'tiktok', dayOfWeek: 2, hour: 19, minute: 0 },  // Tuesday 7pm
  { platform: 'tiktok', dayOfWeek: 4, hour: 12, minute: 0 },  // Thursday 12pm
  
  // YouTube peaks
  { platform: 'youtube', dayOfWeek: 5, hour: 15, minute: 0 }, // Friday 3pm
  { platform: 'youtube', dayOfWeek: 6, hour: 11, minute: 0 }, // Saturday 11am
  
  // Instagram peaks
  { platform: 'instagram', dayOfWeek: 3, hour: 11, minute: 0 }, // Wednesday 11am
  { platform: 'instagram', dayOfWeek: 0, hour: 10, minute: 0 }  // Sunday 10am
];

function getNextSlot(platform: Platform, after: Date = new Date()): Date {
  const slots = OPTIMAL_SLOTS.filter(s => s.platform === platform);
  
  for (let daysAhead = 0; daysAhead < 14; daysAhead++) {
    const checkDate = new Date(after);
    checkDate.setDate(checkDate.getDate() + daysAhead);
    
    for (const slot of slots) {
      if (checkDate.getDay() === slot.dayOfWeek) {
        const slotTime = new Date(checkDate);
        slotTime.setHours(slot.hour, slot.minute, 0, 0);
        
        if (slotTime > after) {
          return slotTime;
        }
      }
    }
  }
  
  throw new Error('No slot found');
}
```

---

## Analytics Integration

### Basic Tracking

```typescript
interface VideoAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number;  // seconds
}

async function getYouTubeAnalytics(videoId: string): Promise<VideoAnalytics> {
  const response = await youtube.videos.list({
    part: ['statistics'],
    id: [videoId]
  });
  
  const stats = response.data.items?.[0]?.statistics;
  return {
    views: parseInt(stats?.viewCount || '0'),
    likes: parseInt(stats?.likeCount || '0'),
    comments: parseInt(stats?.commentCount || '0'),
    shares: 0,  // Not available via API
    watchTime: 0  // Requires Analytics API
  };
}
```

---

## Source Documents

- DD-47: Connectors + publishing + MCP
- DD-78: Publishing + viralfactory + automation
- publishing-viralfactory-DEEP

---

## Key Takeaway

> **Use official APIs where available (YouTube Data API, TikTok Content Posting API). Postiz for multi-platform scheduling. Browser automation as last resort for platforms without API access. Always respect rate limits and ToS.**
