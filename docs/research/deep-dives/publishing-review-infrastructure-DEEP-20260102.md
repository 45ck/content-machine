# Publishing & Review Infrastructure Deep Dive

> **Document Type:** Technical Deep Dive  
> **Created:** 2026-01-02  
> **Category:** Distribution & Operations  
> **Status:** Active Research

---

## Executive Summary

This document analyzes the **publishing tools** (6 repos) and **review UI frameworks** (3 repos) vendored in content-machine. These components handle the final stages of the video pipeline: uploading to platforms (TikTok, YouTube, Instagram) and providing internal review/approval workflows.

**Key Findings:**
1. **TiktokAutoUploader** is the most production-ready TikTok uploader (requests-based, not Selenium)
2. **pillar-youtube-upload** provides clean Python API for YouTube uploads with S3 streaming
3. **Mixpost** offers full social media management but is PHP/Laravel (not TypeScript)
4. **react-admin** is the best choice for TypeScript review dashboard (vs Appsmith/Budibase)
5. All platform uploaders face ToS risks - unofficial APIs may break

---

## Part 1: Publishing Tools Analysis

### 1.1 TiktokAutoUploader ⭐ RECOMMENDED

**Repository:** `vendor/publish/TiktokAutoUploader`  
**License:** Unlicensed (review before commercial use)  
**Language:** Python  
**Last Active:** December 2024 (actively maintained)

**Architecture:**
```
TiktokAutoUploader/
├── cli.py                    # Command-line interface
├── tiktok_uploader/
│   ├── tiktok.py            # Core upload logic
│   ├── cookies.py           # Session management
│   ├── Browser.py           # Selenium browser (for login only)
│   ├── bot_utils.py         # Helper functions
│   └── tiktok-signature/    # Node.js signature generation
└── CookiesDir/              # Stored sessions
```

**Key Features:**
- ✅ **Requests-based** (not Selenium) - fast uploads in ~3 seconds
- ✅ **Multi-account support** via cookie storage
- ✅ **Schedule uploads** up to 10 days in advance
- ✅ **YouTube Shorts import** - can pull videos from YouTube
- ✅ **Proxy support** for IP rotation
- ⚠️ **Login requires browser** (Selenium for initial auth only)

**Core Upload Flow:**
```python
from tiktok_uploader import login, upload_video

# One-time login (saves cookies)
session_id = login("my_account")

# Upload video
upload_video(
    session_user="my_account",
    video="video.mp4",
    title="My video title #hashtag",
    schedule_time=3600,  # 1 hour from now
    visibility_type=0,   # 0=public, 1=private
    allow_comment=1,
    allow_duet=1,
    allow_stitch=1
)
```

**Technical Details:**
- Uses AWS SigV4 authentication for TikTok's video storage
- Generates X-Bogus signature via Node.js subprocess
- Chunks video uploads (5MB chunks) with CRC32 verification
- Handles TikTok datacenter assignment (useast2a, etc.)

**Signature Generation Pattern:**
```python
# Calls Node.js for TikTok signature
js_path = os.path.join(os.getcwd(), "tiktok_uploader", "tiktok-signature", "browser.js")
signatures = subprocess_jsvmp(js_path, user_agent, sig_url)
tt_output = json.loads(signatures)["data"]
# Returns: x-bogus, signature, signed_url, x-tt-params
```

**Risk Assessment:**
- 🔴 **HIGH ToS RISK** - Unofficial API, may break anytime
- 🟡 Requires Node.js for signature generation
- 🟢 No Selenium for actual uploads (fast)

---

### 1.2 pillar-youtube-upload ⭐ RECOMMENDED

**Repository:** `vendor/publish/youtube-upload`  
**License:** MIT (check package)  
**Language:** Python  
**Package:** `pillar-youtube-upload`

**Architecture:**
```
youtube_upload/
├── client.py          # YoutubeUploader class
├── oauth_template.py  # OAuth token template
└── __init__.py       # Constants and config
```

**Key Features:**
- ✅ **Official YouTube Data API v3** - legitimate, stable
- ✅ **S3 streaming** - upload directly from cloud storage
- ✅ **Resumable uploads** - handles large files
- ✅ **Thumbnail upload** - set custom thumbnails
- ✅ **OAuth2 authentication** - proper Google auth

**Usage Pattern:**
```python
from youtube_upload.client import YoutubeUploader

# Initialize with client secrets
uploader = YoutubeUploader(client_id, client_secret)
# Or: uploader = YoutubeUploader(secrets_file_path="client_secrets.json")

# Authenticate
uploader.authenticate()  # Opens browser for first-time auth
# Or: uploader.authenticate(access_token="...", refresh_token="...")

# Upload video
options = {
    "title": "My Video Title",
    "description": "Video description",
    "tags": ["tag1", "tag2", "tag3"],
    "categoryId": "22",  # People & Blogs
    "privacyStatus": "private",  # public, private, unlisted
    "kids": False,
    "thumbnailLink": "https://example.com/thumb.jpg"  # or local path
}

response, thumbnail_response = uploader.upload("video.mp4", options)

# S3 streaming upload
import s3fs
fs = s3fs.S3FileSystem()
video = fs.open('s3://bucket/video.mp4')
response, _ = uploader.upload_stream(video, options)

uploader.close()
```

**Authentication Flow:**
1. Create OAuth credentials in Google Cloud Console
2. Enable YouTube Data API v3
3. Download `client_secrets.json`
4. First run opens browser for consent
5. Tokens saved to `oauth.json` for reuse

**Risk Assessment:**
- 🟢 **LOW RISK** - Official API, Google-supported
- 🟡 Requires Google Cloud project setup
- 🟡 API quotas (10,000 units/day default)

---

### 1.3 rednote-instagram-auto-uploader

**Repository:** `vendor/publish/rednote-instagram-auto-uploader`  
**License:** MIT  
**Language:** Python

**Purpose:** Downloads videos from RedNote (Xiaohongshu) and uploads to Instagram Reels.

**Key Dependencies:**
- `instagrapi>=1.17.0` - Instagram private API
- `moviepy==1.0.3` - Video processing
- `ffmpeg` - Format conversion

**Configuration:**
```env
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
DEBUG=false
CONTINUOUS_MODE=false
CHECK_INTERVAL=3600
```

**Risk Assessment:**
- 🔴 **HIGH RISK** - Both RedNote and Instagram unofficial APIs
- 🟡 IP detection issues with RedNote
- 🟡 Instagram account ban risk

**Recommendation:** Study patterns only, not for production.

---

### 1.4 go-youtube-reddit-automation

**Repository:** `vendor/publish/go-youtube-reddit-automation`  
**License:** None specified  
**Language:** Go

**Purpose:** Full end-to-end Reddit-to-YouTube automation.

**Features:**
- Extract Reddit posts
- Generate TTS voiceover
- Create video with images/footage
- Upload to YouTube and Instagram

**Stack:**
- FFmpeg for video/audio
- PostgreSQL for tracking posts
- youtubedr (Go YouTube library)

**Status:** ⚠️ Migrated to external Git - may be abandoned

**Recommendation:** Reference for Go patterns, but Python/TypeScript preferred.

---

### 1.5 Mixpost

**Repository:** `vendor/publish/mixpost`  
**License:** MIT  
**Language:** PHP (Laravel)

**Purpose:** Full social media management platform.

**Features:**
- Multi-platform posting (Facebook, Twitter, Instagram, LinkedIn, Pinterest, TikTok, YouTube)
- Scheduling and queue management
- Team collaboration and workspaces
- Analytics dashboard
- Media library
- Post templates

**Limitations for content-machine:**
- ❌ PHP/Laravel - not TypeScript
- ❌ Heavy framework (not embeddable)
- 🟡 Commercial Pro version for full features

**Recommendation:** Study for feature ideas, but don't integrate directly.

---

## Part 2: Review UI Frameworks

### 2.1 react-admin ⭐ RECOMMENDED

**Repository:** `vendor/review-ui/react-admin`  
**License:** MIT  
**Language:** TypeScript  
**Stars:** 25k+

**Why react-admin is the best choice:**

| Criterion | react-admin | Appsmith | Budibase |
|-----------|-------------|----------|----------|
| Language | TypeScript ✅ | Java/Node | Node.js |
| Architecture | Library ✅ | Full platform | Full platform |
| Embedding | Easy ✅ | Difficult | Difficult |
| Customization | Complete ✅ | Limited | Limited |
| Bundle Size | Small ✅ | Large | Large |
| Learning Curve | Moderate | Low | Low |
| Self-host | N/A (client-side) | Required | Required |

**Key Features:**
- 45+ data provider adapters (REST, GraphQL, Firebase, etc.)
- Complete CRUD operations
- Authentication & authorization
- i18n (internationalization)
- Theming (Material UI based)
- Optimistic rendering
- Filter-as-you-type
- Undo support

**Example Review Dashboard:**
```tsx
// ReviewDashboard.tsx
import { Admin, Resource, List, DataTable, Edit, SimpleForm, 
         TextInput, SelectInput, DateField, EditButton } from 'react-admin';
import { dataProvider } from './dataProvider';

const VideoList = () => (
  <List filters={[
    <SelectInput source="status" choices={[
      { id: 'pending', name: 'Pending Review' },
      { id: 'approved', name: 'Approved' },
      { id: 'rejected', name: 'Rejected' },
    ]} />,
  ]}>
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col source="title" />
      <DataTable.Col source="status" />
      <DataTable.Col source="created_at" field={DateField} />
      <DataTable.Col source="platform" />
      <DataTable.Col><EditButton /></DataTable.Col>
    </DataTable>
  </List>
);

const VideoEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="title" />
      <TextInput source="description" multiline />
      <SelectInput source="status" choices={[
        { id: 'pending', name: 'Pending Review' },
        { id: 'approved', name: 'Approved' },
        { id: 'rejected', name: 'Rejected' },
      ]} />
      <SelectInput source="platform" choices={[
        { id: 'tiktok', name: 'TikTok' },
        { id: 'youtube', name: 'YouTube Shorts' },
        { id: 'instagram', name: 'Instagram Reels' },
      ]} />
    </SimpleForm>
  </Edit>
);

export const ReviewApp = () => (
  <Admin dataProvider={dataProvider}>
    <Resource name="videos" list={VideoList} edit={VideoEdit} />
    <Resource name="uploads" list={UploadList} />
    <Resource name="schedules" list={ScheduleList} />
  </Admin>
);
```

**Data Provider Pattern:**
```typescript
// dataProvider.ts
import { DataProvider } from 'react-admin';

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const response = await fetch(`/api/${resource}?${queryString(params)}`);
    const data = await response.json();
    return { data: data.items, total: data.total };
  },
  getOne: async (resource, params) => {
    const response = await fetch(`/api/${resource}/${params.id}`);
    const data = await response.json();
    return { data };
  },
  create: async (resource, params) => {
    const response = await fetch(`/api/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    });
    const data = await response.json();
    return { data };
  },
  update: async (resource, params) => {
    const response = await fetch(`/api/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    });
    const data = await response.json();
    return { data };
  },
  delete: async (resource, params) => {
    await fetch(`/api/${resource}/${params.id}`, { method: 'DELETE' });
    return { data: params.previousData };
  },
  // ... other methods
};
```

---

### 2.2 Appsmith

**Repository:** `vendor/review-ui/appsmith`  
**License:** Apache 2.0  
**Language:** Java (backend) + React (frontend)

**Purpose:** Low-code platform for internal tools.

**Features:**
- Drag-and-drop UI builder
- 45+ database/API connectors
- JavaScript for logic
- Git version control
- Self-hosted or cloud

**Architecture:**
```
appsmith/
├── app/
│   ├── client/    # React frontend
│   ├── server/    # Java Spring backend
│   └── util/      # Shared utilities
├── deploy/        # Docker, Kubernetes configs
└── scripts/       # Setup scripts
```

**New Feature - Appsmith Agents:**
> "An agentic AI platform that integrates the latest AI models with private and proprietary data at scale."

**Limitations:**
- ❌ Heavy infrastructure (Java + MongoDB + Redis)
- ❌ Requires self-hosting or cloud
- 🟡 Less flexible than code-first approach

---

### 2.3 Budibase

**Repository:** `vendor/review-ui/budibase`  
**License:** GPL v3 (client: MPL 2.0)  
**Language:** TypeScript/Node.js

**Purpose:** Open-source low-code platform.

**Features:**
- Form builder
- Database builder (CouchDB based)
- Automation workflows
- REST API integration
- Role-based access

**Architecture:**
```
budibase/
├── packages/
│   ├── builder/   # Svelte app builder
│   ├── client/    # Runtime for apps
│   ├── server/    # Koa API server
│   └── ...
├── hosting/       # Docker configs
└── charts/        # Helm charts
```

**Data Sources:**
- PostgreSQL, MySQL, MariaDB
- MongoDB, CouchDB
- Airtable, DynamoDB, S3
- REST APIs, GraphQL

**Limitations:**
- ❌ CouchDB requirement
- ❌ GPL license for server (copyleft)
- 🟡 Svelte-based (not React)

---

## Part 3: Integration Architecture

### 3.1 Recommended Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Review Dashboard                      │
│                   (react-admin + MUI)                    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     Review API                           │
│              (Node.js + Prisma + Postgres)               │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   TikTok    │   │   YouTube   │   │  Instagram  │
│  Uploader   │   │  Uploader   │   │  Uploader   │
│  (Python)   │   │  (Python)   │   │  (Python)   │
└─────────────┘   └─────────────┘   └─────────────┘
```

### 3.2 Upload Service Pattern

```typescript
// services/upload.ts
import { spawn } from 'child_process';
import { BullMQ } from 'bullmq';

interface UploadJob {
  videoId: string;
  platform: 'tiktok' | 'youtube' | 'instagram';
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  scheduleTime?: number;
}

const uploadQueue = new Queue<UploadJob>('uploads', { connection: redisConnection });

uploadQueue.process(async (job) => {
  const { platform, videoPath, title, description, tags, scheduleTime } = job.data;
  
  switch (platform) {
    case 'tiktok':
      return await uploadToTikTok(videoPath, title, scheduleTime);
    case 'youtube':
      return await uploadToYouTube(videoPath, { title, description, tags });
    case 'instagram':
      return await uploadToInstagram(videoPath, title);
  }
});

async function uploadToTikTok(videoPath: string, title: string, scheduleTime?: number): Promise<void> {
  // Call Python script
  const result = await new Promise((resolve, reject) => {
    const python = spawn('python', [
      'scripts/tiktok_upload.py',
      '--video', videoPath,
      '--title', title,
      ...(scheduleTime ? ['--schedule', String(scheduleTime)] : [])
    ]);
    
    let output = '';
    python.stdout.on('data', (data) => output += data);
    python.stderr.on('data', (data) => console.error(data.toString()));
    python.on('close', (code) => {
      code === 0 ? resolve(output) : reject(new Error(`Exit code ${code}`));
    });
  });
  
  return JSON.parse(result);
}

async function uploadToYouTube(videoPath: string, options: YouTubeOptions): Promise<void> {
  const python = spawn('python', [
    'scripts/youtube_upload.py',
    '--video', videoPath,
    '--title', options.title,
    '--description', options.description,
    '--tags', options.tags.join(','),
    '--privacy', options.privacyStatus || 'private'
  ]);
  
  // ... handle output
}
```

### 3.3 Review Workflow Schema

```typescript
// schemas/review.ts
import { z } from 'zod';

export const VideoReviewSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(2200),
  videoPath: z.string(),
  thumbnailPath: z.string().optional(),
  
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'published']),
  platform: z.enum(['tiktok', 'youtube', 'instagram']),
  
  reviewNotes: z.string().optional(),
  reviewedBy: z.string().uuid().optional(),
  reviewedAt: z.date().optional(),
  
  scheduledFor: z.date().optional(),
  publishedAt: z.date().optional(),
  publishedUrl: z.string().url().optional(),
  
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ReviewActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  notes: z.string().optional(),
  scheduledFor: z.date().optional(),
});

export type VideoReview = z.infer<typeof VideoReviewSchema>;
export type ReviewAction = z.infer<typeof ReviewActionSchema>;
```

### 3.4 Prisma Schema for Review System

```prisma
// prisma/schema.prisma
model Video {
  id          String   @id @default(uuid())
  title       String
  description String?
  videoPath   String
  thumbnailPath String?
  
  status      VideoStatus @default(DRAFT)
  platform    Platform
  
  reviewNotes String?
  reviewedBy  User?    @relation("ReviewedBy", fields: [reviewerId], references: [id])
  reviewerId  String?
  reviewedAt  DateTime?
  
  scheduledFor DateTime?
  publishedAt  DateTime?
  publishedUrl String?
  
  createdBy   User     @relation("CreatedBy", fields: [creatorId], references: [id])
  creatorId   String
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  uploads     Upload[]
}

model Upload {
  id        String      @id @default(uuid())
  video     Video       @relation(fields: [videoId], references: [id])
  videoId   String
  platform  Platform
  status    UploadStatus @default(PENDING)
  
  externalId  String?   // Platform-specific video ID
  externalUrl String?   // Platform URL
  
  error       String?
  attempts    Int       @default(0)
  
  scheduledFor DateTime?
  uploadedAt   DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum VideoStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  SCHEDULED
  PUBLISHING
  PUBLISHED
  FAILED
}

enum UploadStatus {
  PENDING
  UPLOADING
  COMPLETED
  FAILED
}

enum Platform {
  TIKTOK
  YOUTUBE
  INSTAGRAM
}
```

---

## Part 4: Adoption Recommendations

### 4.1 Immediate Adoption

| Tool | Use Case | Priority |
|------|----------|----------|
| **react-admin** | Review dashboard UI | HIGH |
| **pillar-youtube-upload** | YouTube publishing | HIGH |
| **TiktokAutoUploader** | TikTok publishing (study) | MEDIUM |

### 4.2 Study for Patterns

| Tool | Pattern to Extract |
|------|-------------------|
| Mixpost | Scheduling queue, multi-platform abstraction |
| go-youtube-reddit-automation | Full pipeline orchestration |
| rednote-instagram-auto-uploader | Instagram API patterns |

### 4.3 Integration Priorities

1. **Phase 1:** react-admin review dashboard with mock data
2. **Phase 2:** YouTube upload integration (official API)
3. **Phase 3:** TikTok upload integration (unofficial, higher risk)
4. **Phase 4:** Scheduling system with BullMQ
5. **Phase 5:** Multi-platform publishing abstraction

---

## Part 5: Risk Mitigation

### 5.1 Platform API Risks

| Platform | API Type | Risk Level | Mitigation |
|----------|----------|------------|------------|
| YouTube | Official | LOW | Follow quota limits |
| TikTok | Unofficial | HIGH | Monitor for breaks, proxy rotation |
| Instagram | Unofficial | HIGH | Rate limiting, 2FA handling |

### 5.2 Account Safety

```typescript
// Rate limiting per platform
const rateLimits = {
  tiktok: {
    uploadsPerDay: 3,
    minIntervalMinutes: 30,
  },
  youtube: {
    uploadsPerDay: 6,  // API quota consideration
    minIntervalMinutes: 15,
  },
  instagram: {
    uploadsPerDay: 5,
    minIntervalMinutes: 20,
  },
};
```

### 5.3 Monitoring Requirements

- Track upload success/failure rates
- Monitor API response patterns for breaking changes
- Alert on repeated failures
- Log all API interactions for debugging

---

## Key Takeaways

1. **react-admin** is the clear winner for TypeScript review dashboard - embeddable, customizable, MIT licensed

2. **YouTube publishing** via official API is safe and recommended - pillar-youtube-upload provides clean abstraction

3. **TikTok publishing** is high-risk but TiktokAutoUploader is the best available option - requests-based, actively maintained

4. **Instagram publishing** should be lowest priority - highest risk, least reliable APIs

5. **Scheduling** should use BullMQ job queues with platform-specific rate limiting

6. **Multi-account support** is essential for scaling - each platform uploader supports this

---

## References

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [react-admin Documentation](https://marmelab.com/react-admin/)
- [TikTok for Developers](https://developers.tiktok.com/) (official, limited)
- [Mixpost Documentation](https://docs.mixpost.app/)
- [Budibase Documentation](https://docs.budibase.com/)
- [Appsmith Documentation](https://docs.appsmith.com/)
