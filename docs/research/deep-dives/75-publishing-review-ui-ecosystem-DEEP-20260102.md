# Deep Dive #75: Publishing Platforms & Review UI Ecosystem

**Document ID:** DD-075  
**Date:** 2026-01-02  
**Category:** Publishing, Review UI, Admin Dashboards  
**Status:** Complete  
**Word Count:** ~6,500

---

## Executive Summary

This document covers the complete publishing and review infrastructure:

1. **Publishing Platforms** – TiktokAutoUploader, Mixpost, youtube-upload
2. **Review UI** – Appsmith, Budibase, React-Admin
3. **Integration Architecture** – Content approval workflows

---

## 1. Publishing Platforms

### 1.1 TiktokAutoUploader

**Source:** `vendor/publish/TiktokAutoUploader/`  
**Creator:** makiisthenes  
**License:** MIT  
**Language:** Python + Node.js  
**Stars:** 2k+

#### Overview

TiktokAutoUploader is the **fastest TikTok uploader** using requests (not Selenium). Uploads videos in ~3 seconds.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Fast** | Request-based, not Selenium |
| **Robust** | Doesn't break with site changes |
| **Multi-account** | Handle multiple TikTok accounts |
| **Scheduling** | Schedule up to 10 days ahead |
| **Video Sources** | Local files or YouTube shorts |

#### Prerequisites

```bash
# Node.js required
npm install -g node

# Python requirements
pip install -r requirements.txt

# Node packages
cd tiktok_uploader/tiktok-signature/
npm i
```

#### CLI Usage

```bash
# Login to account
python cli.py login -n my_account

# Upload video
python cli.py upload \
  -v /path/to/video.mp4 \
  -t "Video Title #viral" \
  -n my_account
```

#### Python API

```python
from tiktok_uploader import TiktokUploader

uploader = TiktokUploader(
    account_name='my_account',
)

# Upload video
uploader.upload(
    video_path='/path/to/video.mp4',
    title='Amazing AI Video #viral #tech',
    schedule=None,  # or datetime for scheduling
)
```

---

### 1.2 Mixpost

**Source:** `vendor/publish/mixpost/`  
**Creator:** Inovector  
**License:** MIT  
**Language:** PHP (Laravel)  
**Type:** Self-hosted SaaS

#### Overview

Mixpost is a **social media management platform** for scheduling, publishing, and analytics across multiple platforms.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-platform** | TikTok, Instagram, Twitter, LinkedIn, FB |
| **Scheduling** | Queue and calendar management |
| **Team Collaboration** | Workspaces, permissions, tasks |
| **Analytics** | Platform-specific metrics |
| **Media Library** | Image, GIF, video management |
| **Templates** | Reusable post templates |
| **Hashtag Groups** | Strategic hashtag organization |

#### Installation

```bash
# Laravel package installation
composer require inovector/mixpost

# Publish configuration
php artisan vendor:publish --tag=mixpost-config

# Run migrations
php artisan migrate
```

#### API Integration

```php
use Inovector\Mixpost\Mixpost;

// Schedule a post
Mixpost::schedule([
    'content' => 'Check out our new AI video!',
    'media' => ['/path/to/video.mp4'],
    'platforms' => ['tiktok', 'instagram'],
    'publish_at' => now()->addHours(2),
]);
```

---

### 1.3 youtube-upload

**Source:** `vendor/publish/youtube-upload/`  
**Creator:** PillarGG  
**License:** MIT  
**Language:** Python  
**API:** YouTube Data API v3

#### Overview

A Python library for uploading YouTube videos via the official YouTube Data API.

#### Installation

```bash
pip install pillar-youtube-upload
```

#### Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/apis/library)
2. Enable YouTube Data API v3
3. Create OAuth credentials
4. Download `client_secrets.json`

#### Usage

```python
from youtube_upload.client import YoutubeUploader

# Initialize
uploader = YoutubeUploader(
    client_id='YOUR_CLIENT_ID',
    client_secret='YOUR_CLIENT_SECRET',
)

# Authenticate
uploader.authenticate(
    access_token='token',
    refresh_token='refresh_token',
)

# Upload
uploader.upload(
    video_path='/path/to/video.mp4',
    options={
        'title': 'AI Coding Assistant Demo',
        'description': 'Check out this amazing tool!',
        'tags': ['AI', 'coding', 'tech'],
        'categoryId': '28',  # Science & Technology
        'privacyStatus': 'public',
        'madeForKids': False,
    },
)
```

---

### 1.4 Publishing Platform Comparison

| Feature | TiktokAutoUploader | Mixpost | youtube-upload |
|---------|-------------------|---------|----------------|
| **Platform** | TikTok | Multi-platform | YouTube |
| **Language** | Python | PHP | Python |
| **Method** | Requests (unofficial) | Official APIs | Official API |
| **Scheduling** | ✅ 10 days | ✅ Unlimited | ✅ API-based |
| **Multi-account** | ✅ | ✅ | ✅ |
| **Analytics** | ❌ | ✅ | ❌ |
| **Best For** | TikTok automation | Social management | YouTube uploads |

---

## 2. Review UI Platforms

### 2.1 Appsmith

**Source:** `vendor/review-ui/appsmith/`  
**Creator:** Appsmith  
**License:** Apache 2.0  
**Language:** TypeScript/Java  
**Stars:** 35k+

#### Overview

Appsmith is an **open-source low-code platform** for building custom applications like dashboards, admin panels, and approval workflows.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Low-code** | Drag-and-drop UI builder |
| **45+ Data Sources** | REST, GraphQL, databases |
| **Pre-built Widgets** | Tables, forms, charts |
| **JavaScript** | Custom logic support |
| **Git Sync** | Version control |
| **Self-hosted** | Full control over data |
| **AI Agents** | New agentic AI platform |

#### Installation

```bash
# Docker
docker pull appsmith/appsmith-ce
docker run -d --name appsmith \
  -p 80:80 \
  -v appsmith_data:/appsmith-stacks \
  appsmith/appsmith-ce
```

#### Use Case: Video Review Dashboard

```javascript
// Appsmith JS Object for video review
export default {
    async fetchPendingVideos() {
        return await Api1.run({
            status: 'pending_review'
        });
    },
    
    async approveVideo(videoId) {
        return await Api2.run({
            id: videoId,
            status: 'approved'
        });
    },
    
    async rejectVideo(videoId, reason) {
        return await Api3.run({
            id: videoId,
            status: 'rejected',
            reason: reason
        });
    }
}
```

---

### 2.2 Budibase

**Source:** `vendor/review-ui/budibase/`  
**Creator:** Budibase  
**License:** GPL v3  
**Language:** TypeScript/Svelte  
**Stars:** 22k+

#### Overview

Budibase is an **open-source low-code platform** for building forms, portals, and approval apps. Known for its speed and ease of use.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Responsive Apps** | Single-page applications |
| **Data Sources** | PostgreSQL, MySQL, MongoDB, REST |
| **Pre-built Components** | Forms, tables, charts |
| **Automation** | Webhook-triggered workflows |
| **Self-hosted** | Docker, Kubernetes |
| **Open Source** | GPL v3 |

#### Installation

```bash
# Docker Compose
docker run -d -p 10000:10000 budibase/budibase
```

#### Automation Example

```yaml
# Budibase automation for video approval
trigger:
  type: webhook
  path: /video/submitted

steps:
  - type: create_row
    table: pending_videos
    row:
      video_url: "{{ trigger.body.url }}"
      status: "pending"
      
  - type: send_email
    to: "reviewer@company.com"
    subject: "New video pending review"
    body: "Video {{ trigger.body.title }} is ready for review"
```

---

### 2.3 React-Admin

**Source:** `vendor/review-ui/react-admin/`  
**Creator:** Marmelab  
**License:** MIT  
**Language:** TypeScript/React  
**Stars:** 25k+

#### Overview

React-Admin is a **frontend framework** for building admin applications on top of REST/GraphQL APIs using React and Material Design.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Backend Agnostic** | 45+ data adapters |
| **Complete Toolkit** | Auth, routing, forms, validation |
| **Material UI** | Beautiful, accessible design |
| **TypeScript** | Full type safety |
| **Customizable** | Replace any component |
| **Performant** | Optimistic rendering |

#### Installation

```bash
npm install react-admin
# or
yarn add react-admin
```

#### Video Review Admin

```tsx
import * as React from 'react';
import { Admin, Resource, List, DataTable, Edit, SimpleForm, TextInput, SelectInput, useRecordContext } from 'react-admin';
import restProvider from 'ra-data-simple-rest';

// Video list
const VideoList = () => (
    <List filters={[<SelectInput source="status" choices={['pending', 'approved', 'rejected']} />]}>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="title" />
            <DataTable.Col source="topic" />
            <DataTable.Col source="status" />
            <DataTable.Col source="created_at" />
        </DataTable>
    </List>
);

// Video edit (review)
const VideoEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput disabled source="id" />
            <TextInput disabled source="title" />
            <TextInput disabled source="topic" />
            <SelectInput source="status" choices={[
                { id: 'pending', name: 'Pending' },
                { id: 'approved', name: 'Approved' },
                { id: 'rejected', name: 'Rejected' },
            ]} />
            <TextInput multiline source="review_notes" />
        </SimpleForm>
    </Edit>
);

// Admin app
const App = () => (
    <Admin dataProvider={restProvider('http://localhost:3000/api')}>
        <Resource name="videos" list={VideoList} edit={VideoEdit} />
    </Admin>
);

export default App;
```

---

### 2.4 Review UI Comparison

| Feature | Appsmith | Budibase | React-Admin |
|---------|----------|----------|-------------|
| **Type** | Low-code | Low-code | Code-first |
| **Language** | JS | JS | TypeScript/React |
| **Learning Curve** | Low | Low | Moderate |
| **Customization** | Moderate | Moderate | High |
| **Self-host** | ✅ | ✅ | ✅ (frontend) |
| **Best For** | Quick dashboards | Approval apps | Custom admin |
| **AI Support** | ✅ Agents | ❌ | ❌ |

---

## 3. Integration Architecture

### 3.1 Content Review Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                   Content Review Pipeline                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VIDEO GENERATION                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Remotion + Kokoro + WhisperX                             │  │
│  │  - Generate video                                         │  │
│  │  - Create thumbnail                                       │  │
│  │  - Extract metadata                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  REVIEW QUEUE                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BullMQ + Redis                                           │  │
│  │  - Queue pending reviews                                  │  │
│  │  - Priority handling                                      │  │
│  │  - Status tracking                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  REVIEW UI                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React-Admin / Appsmith / Budibase                        │  │
│  │  - Video preview                                          │  │
│  │  - Approve / Reject / Edit                                │  │
│  │  - Add notes                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         ▼                                   ▼                   │
│  ┌───────────────┐                   ┌───────────────┐         │
│  │   APPROVED    │                   │   REJECTED    │         │
│  │   ↓           │                   │   ↓           │         │
│  │   Publish     │                   │   Archive     │         │
│  └───────────────┘                   └───────────────┘         │
│                                                                 │
│  PUBLISHING                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TiktokAutoUploader + youtube-upload + Mixpost            │  │
│  │  - Schedule or immediate publish                          │  │
│  │  - Multi-platform distribution                            │  │
│  │  - Analytics tracking                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 API Design for Review Workflow

```typescript
// API routes for review workflow

// GET /api/videos?status=pending
interface Video {
  id: string;
  title: string;
  topic: string;
  script: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

// PATCH /api/videos/:id
interface ReviewAction {
  status: 'approved' | 'rejected';
  notes?: string;
  scheduledFor?: Date;
  platforms?: ('tiktok' | 'youtube' | 'instagram')[];
}

// POST /api/videos/:id/publish
interface PublishRequest {
  platforms: ('tiktok' | 'youtube' | 'instagram')[];
  scheduledFor?: Date;
  captions?: Record<string, string>;  // language -> caption
}
```

### 3.3 React-Admin Implementation

```tsx
// src/VideoReviewDashboard.tsx
import { Admin, Resource, List, Edit, Show, 
         DataTable, SimpleForm, TextInput, SelectInput,
         useRecordContext, Button, useUpdate } from 'react-admin';

// Custom approve button
const ApproveButton = () => {
    const record = useRecordContext();
    const [update] = useUpdate();
    
    return (
        <Button
            label="Approve"
            onClick={() => update('videos', { 
                id: record.id, 
                data: { status: 'approved' } 
            })}
        />
    );
};

// Custom reject button
const RejectButton = () => {
    const record = useRecordContext();
    const [update] = useUpdate();
    
    return (
        <Button
            label="Reject"
            onClick={() => update('videos', { 
                id: record.id, 
                data: { status: 'rejected' } 
            })}
        />
    );
};

// Video preview component
const VideoPreview = () => {
    const record = useRecordContext();
    return (
        <video 
            src={record.videoUrl} 
            controls 
            style={{ maxWidth: '100%' }}
        />
    );
};

// Main review list
const PendingReviewList = () => (
    <List filter={{ status: 'pending' }}>
        <DataTable>
            <DataTable.Col source="title" />
            <DataTable.Col source="topic" />
            <DataTable.Col source="duration" />
            <DataTable.Col source="createdAt" />
            <DataTable.Col>
                <ApproveButton />
                <RejectButton />
            </DataTable.Col>
        </DataTable>
    </List>
);

// Video review detail
const VideoReview = () => (
    <Show>
        <VideoPreview />
        <SimpleForm>
            <TextInput source="title" disabled />
            <TextInput source="script" multiline disabled />
            <SelectInput source="status" choices={[
                { id: 'approved', name: 'Approved' },
                { id: 'rejected', name: 'Rejected' },
            ]} />
            <TextInput source="reviewNotes" multiline />
        </SimpleForm>
    </Show>
);
```

### 3.4 Publishing Integration

```typescript
// src/services/publisher.ts
import { TiktokUploader } from './tiktok';
import { YoutubeUploader } from './youtube';
import { Queue } from 'bullmq';

interface PublishJob {
  videoId: string;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  platforms: string[];
  scheduledFor?: Date;
}

const publishQueue = new Queue('publishing');

export async function schedulePublish(job: PublishJob) {
  const delay = job.scheduledFor 
    ? job.scheduledFor.getTime() - Date.now() 
    : 0;
    
  await publishQueue.add('publish', job, {
    delay,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
  });
}

// Worker
import { Worker } from 'bullmq';

const worker = new Worker('publishing', async (job) => {
  const { platforms, videoPath, title, description, tags } = job.data;
  
  const results = [];
  
  if (platforms.includes('tiktok')) {
    const tiktok = new TiktokUploader();
    results.push(await tiktok.upload({
      videoPath,
      title: `${title} #viral #fyp`,
    }));
  }
  
  if (platforms.includes('youtube')) {
    const youtube = new YoutubeUploader();
    results.push(await youtube.upload({
      videoPath,
      title,
      description,
      tags,
      categoryId: '28',  // Science & Tech
    }));
  }
  
  return results;
});
```

---

## 4. Document Metadata

| Field | Value |
|-------|-------|
| **Document ID** | DD-075 |
| **Created** | 2026-01-02 |
| **Author** | Research Agent |
| **Status** | Complete |
| **Dependencies** | DD-068, DD-073 |

---

## 5. Key Takeaways

1. **TiktokAutoUploader** is fastest for TikTok (request-based)
2. **Mixpost** provides complete social media management
3. **youtube-upload** uses official API for YouTube
4. **React-Admin** is best for custom review workflows
5. **Appsmith** enables quick dashboard prototyping
6. **Budibase** excels at approval applications
7. **BullMQ** connects review UI to publishing

---

## 6. Recommendations for content-machine

| Component | Tool | Rationale |
|-----------|------|-----------|
| **TikTok Upload** | TiktokAutoUploader | Fast, reliable |
| **YouTube Upload** | youtube-upload | Official API |
| **Multi-platform** | Mixpost | Comprehensive |
| **Review UI** | React-Admin | Custom, type-safe |
| **Quick Prototype** | Appsmith | Low-code |
| **Queue** | BullMQ | TypeScript native |

---

## 7. Quick Reference

### TiktokAutoUploader

```python
python cli.py upload -v video.mp4 -t "Title #viral" -n account
```

### youtube-upload

```python
uploader.upload(video_path='video.mp4', options={'title': 'Title'})
```

### React-Admin Resource

```tsx
<Resource name="videos" list={VideoList} edit={VideoEdit} />
```

### Appsmith Query

```javascript
await Api1.run({ status: 'pending_review' });
```
