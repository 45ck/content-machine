# Deep Dive: Publishing & Upload Patterns

**Date:** 2026-01-02  
**Repos:** `vendor/viralfactory/`, `vendor/publish/TiktokAutoUploader/`, `vendor/publish/youtube-upload/`  
**Priority:** ⭐ MEDIUM - Distribution Phase (Future)

---

## Executive Summary

Research across multiple upload/publishing repos reveals patterns for automated video distribution to TikTok, YouTube, and Instagram. Most rely on cookie-based authentication or OAuth for API access.

### Why This Matters

- ✅ **Automated publishing** - Complete the content pipeline
- ✅ **Multi-platform support** - TikTok, YouTube, Instagram
- ⚠️ **Cookie-based auth is fragile** - Platform ToS concerns
- ⚠️ **Official APIs are limited** - TikTok no public upload API

---

## Platform Upload Approaches

### TikTok

**No Official Upload API** - Must use unofficial methods:

1. **Cookie-based (TiktokAutoUploader)**
   - Uses session cookies from browser
   - Fastest approach (requests, not Selenium)
   - Risk: Account ban if detected

2. **Selenium-based (legacy)**
   - Automates browser interaction
   - Slow and fragile
   - Breaks with UI changes

```python
# TiktokAutoUploader pattern
from tiktok_uploader.upload import upload_video

upload_video(
    filename=path,
    description="Video description #hashtag",
    cookies_str=cookies,  # Session cookies from browser
    browser="chrome",
    comment=True,
    stitch=False,
    duet=False,
)
```

### YouTube

**Official API available** - OAuth-based:

```python
# viralfactory pattern
from google_auth_oauthlib.flow import InstalledAppFlow

# OAuth flow
flow = InstalledAppFlow.from_client_config(
    credentials, 
    scopes=["https://www.googleapis.com/auth/youtube.upload"]
)
user_credentials = flow.run_local_server()

# Upload
youtube_uploading.upload(oauth_credentials, {
    "file": path,
    "title": title,
    "description": description,
    "privacyStatus": "private",  # Start private, manually publish
    "category": 28,  # Tech category
})
```

### Instagram

**No Official Upload API** - Must use:
1. Browser automation (Playwright/Selenium)
2. Third-party services (unofficial APIs)

---

## viralfactory Engine Pattern

viralfactory provides a clean abstraction for upload engines:

### Base Upload Engine

```python
class BaseUploadEngine(BaseEngine):
    name: str
    description: str
    num_options: int
    
    @classmethod
    @abstractmethod
    def get_options(cls): ...
    
    @abstractmethod
    def upload(self, title: str, description: str, path: str): ...
    
    @classmethod
    def get_settings(cls): ...
```

### TikTok Implementation

```python
class TikTokUploadEngine(BaseUploadEngine):
    name = "TikTokUpload"
    description = "Upload to TikTok"
    
    def __init__(self, options):
        self.hashtags = options[0]
    
    def upload(self, title: str, description: str, path: str):
        cookies = self.get_setting(type="cookies")["cookies"]
        
        # Extract hashtags from title/description
        hashtags = self.hashtags.strip().split(" ")
        for word in title.split():
            if word.startswith("#"):
                hashtags.append(word)
        
        # Compose final description
        final_description = f"{title} {description} {' '.join(hashtags)}"
        
        upload_video(
            filename=path,
            description=final_description,
            cookies_str=cookies,
            browser="chrome",
        )
```

### YouTube Implementation

```python
class YouTubeUploadEngine(BaseUploadEngine):
    name = "YouTube"
    description = "Upload videos to YouTube"
    
    def __init__(self, options):
        self.oauth_name = options[0]
        self.hashtags = options[1]
        self.oauth = self.retrieve_setting(type="oauth_credentials")[self.oauth_name]
        self.credentials = self.retrieve_setting(type="youtube_client_secrets")[
            self.oauth["client_secret"]
        ]
    
    def upload(self, title: str, description: str, path: str):
        options = {
            "file": path,
            "title": f"{title} | {self.hashtags}",
            "description": description,
            "privacyStatus": "private",
            "category": 28,
        }
        
        try:
            youtube_uploading.upload(self.oauth["credentials"], options)
        except Exception:
            # Re-authenticate if token expired
            new_oauth = self.__oauth(self.credentials)
            youtube_uploading.upload(new_oauth, options)
```

---

## Credential Management

### Cookie Storage Pattern

```python
@classmethod
def store_setting(cls, *, identifier: str, data: dict):
    with SessionLocal() as db:
        setting = db.execute(
            select(Setting).filter(
                Setting.provider == cls.name, 
                Setting.type == identifier
            )
        ).scalar()
        
        if setting:
            setting.data = data
        else:
            db.add(Setting(provider=cls.name, type=identifier, data=data))
        db.commit()

@classmethod
def retrieve_setting(cls, *, identifier: str) -> dict | None:
    with SessionLocal() as db:
        result = db.execute(
            select(Setting).filter(
                Setting.provider == cls.name, 
                Setting.type == identifier
            )
        ).scalar()
        
        return result.data if result else None
```

### OAuth Flow (YouTube)

```python
def __oauth(cls, credentials):
    flow = InstalledAppFlow.from_client_config(
        credentials, 
        scopes=["https://www.googleapis.com/auth/youtube.upload"]
    )
    
    user_credentials = flow.run_local_server(
        success_message="Authenticated! You can close this window.",
        authorization_prompt_message="Please authorize this app.",
    )
    
    return orjson.loads(user_credentials.to_json())
```

---

## TypeScript Adaptation

### Upload Engine Interface

```typescript
// src/publish/types.ts
export interface UploadEngine {
  name: string;
  upload(content: UploadContent): Promise<UploadResult>;
  configure(options: EngineOptions): void;
}

export interface UploadContent {
  title: string;
  description: string;
  filePath: string;
  hashtags?: string[];
  scheduledTime?: Date;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  platformId?: string;
}
```

### YouTube Upload (Official API)

```typescript
// src/publish/youtube.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class YouTubeUploader implements UploadEngine {
  name = 'YouTube';
  private oauth2Client: OAuth2Client;
  
  constructor(credentials: YouTubeCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
    this.oauth2Client.setCredentials(credentials.tokens);
  }
  
  async upload(content: UploadContent): Promise<UploadResult> {
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
    
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: content.title,
          description: this.formatDescription(content),
          categoryId: '28', // Science & Technology
          tags: content.hashtags,
        },
        status: {
          privacyStatus: 'private',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(content.filePath),
      },
    });
    
    return {
      success: true,
      url: `https://youtube.com/watch?v=${response.data.id}`,
      platformId: response.data.id,
    };
  }
  
  private formatDescription(content: UploadContent): string {
    const hashtags = content.hashtags?.map(h => 
      h.startsWith('#') ? h : `#${h}`
    ).join(' ') || '';
    
    return `${content.description}\n\n${hashtags}`;
  }
}
```

### TikTok Upload (Unofficial)

```typescript
// src/publish/tiktok.ts
// Note: This uses unofficial methods and may violate ToS

export class TikTokUploader implements UploadEngine {
  name = 'TikTok';
  
  constructor(private cookies: string) {}
  
  async upload(content: UploadContent): Promise<UploadResult> {
    // Use tiktok-uploader npm package or call Python subprocess
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const proc = spawn('python', [
        '-m', 'tiktok_uploader.upload',
        '--video', content.filePath,
        '--description', this.formatDescription(content),
        '--cookies', this.cookies,
      ]);
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject({ success: false, error: 'Upload failed' });
        }
      });
    });
  }
  
  private formatDescription(content: UploadContent): string {
    const hashtags = content.hashtags?.map(h => 
      h.startsWith('#') ? h : `#${h}`
    ).join(' ') || '#fyp #foryou';
    
    return `${content.title} ${content.description} ${hashtags}`;
  }
}
```

---

## Scheduling Considerations

### TikTok Scheduling
- Official: Up to 10 days in advance (via web interface)
- Unofficial: Depends on implementation

### YouTube Scheduling
- Official API: Full scheduling support
- Can set `publishAt` timestamp

```typescript
// YouTube scheduling
const response = await youtube.videos.insert({
  requestBody: {
    status: {
      privacyStatus: 'private',
      publishAt: content.scheduledTime?.toISOString(),
    },
  },
});
```

---

## Risks and Recommendations

### Platform Risks

| Platform | Risk Level | Notes |
|----------|------------|-------|
| YouTube | LOW | Official API, well-documented |
| TikTok | HIGH | No official API, cookie-based can lead to bans |
| Instagram | HIGH | No official API, ToS violations likely |

### Recommendations

1. **YouTube: Use official API** - Safe, reliable, scheduling support
2. **TikTok: Start with manual** - Review first, then auto-upload
3. **Instagram: Consider third-party** - Services like Later, Buffer
4. **All platforms: Review first** - Don't auto-publish without review

### Proposed Pipeline

```
Generation → Render → [Review Dashboard] → Approved → Publish Queue → Upload
                           ↓
                        Rejected → Edit → Re-review
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **YouTube official API** - Safe, reliable
2. **Engine abstraction pattern** - Clean interface
3. **Credential storage pattern** - Secure settings management
4. **Hashtag extraction** - Parse from content

### Future Consideration 🔮

1. **TikTok upload** - After review, risk accepted
2. **Scheduling system** - Queue with publish times
3. **Multi-account support** - Different platforms/accounts

---

## Integration with Review Phase

```typescript
// src/publish/scheduler.ts
export class PublishScheduler {
  constructor(
    private engines: Map<Platform, UploadEngine>,
    private db: Database
  ) {}
  
  async scheduleForReview(video: GeneratedVideo): Promise<void> {
    await this.db.insert('review_queue', {
      videoId: video.id,
      status: 'pending_review',
      platforms: video.targetPlatforms,
      scheduledTime: video.publishTime,
    });
  }
  
  async approveAndSchedule(reviewId: string): Promise<void> {
    const review = await this.db.get('review_queue', reviewId);
    review.status = 'approved';
    
    for (const platform of review.platforms) {
      await this.db.insert('publish_queue', {
        reviewId,
        platform,
        scheduledTime: review.scheduledTime,
        status: 'scheduled',
      });
    }
  }
  
  async processQueue(): Promise<void> {
    const due = await this.db.query('publish_queue', {
      status: 'scheduled',
      scheduledTime: { $lte: new Date() },
    });
    
    for (const item of due) {
      const engine = this.engines.get(item.platform);
      const result = await engine.upload(item.content);
      
      item.status = result.success ? 'published' : 'failed';
      item.result = result;
    }
  }
}
```

---

## Lessons Learned

1. **Official APIs are safer** - Use when available (YouTube)
2. **Cookie auth is fragile** - Tokens expire, accounts can be banned
3. **Review step is essential** - Don't auto-publish blindly
4. **Scheduling needs queue** - Background job processing
5. **Multi-platform is complex** - Each platform has different requirements

---

**Status:** Research complete. YouTube ready for implementation; TikTok/Instagram deferred.
