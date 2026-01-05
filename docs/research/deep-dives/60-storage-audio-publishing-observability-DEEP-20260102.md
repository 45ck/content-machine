# Deep Dive #60: Storage, Audio/TTS, Publishing & Observability Infrastructure

**Date:** 2026-01-02  
**Category:** Infrastructure, Distribution  
**Status:** Complete  
**Priority:** High - Production Infrastructure Layer

---

## Executive Summary

This deep dive documents the storage (vector databases, object storage), audio/TTS, publishing/distribution, and observability infrastructure in content-machine's vendored repositories. These components form the production infrastructure layer of the video generation pipeline.

**Key Findings:**

1. **Kokoro + Kokoro-FastAPI** provides production-ready, Apache-licensed TTS with 82M parameters
2. **Qdrant + Weaviate** provide enterprise-grade vector search for content recommendations
3. **TiktokAutoUploader + youtube-upload** enable automated multi-platform publishing
4. **LangFuse + promptfoo** provide comprehensive LLM observability and evaluation
5. **Celery + RQ** offer battle-tested Python task queues for distributed processing

---

## Part 1: Audio/TTS Infrastructure

### 1.1 Kokoro - Lightweight Open-Weight TTS

**Location:** `vendor/audio/kokoro`  
**Language:** Python  
**License:** Apache 2.0  
**Parameters:** 82 million  
**Stars:** 16k+

**Core Concept:** Lightweight, high-quality TTS that can run anywhere - from production to personal projects.

**Key Features:**

- 🎯 82M parameters (small but high quality)
- 🌍 Multi-language: English (US/UK), Spanish, French, Hindi, Italian, Japanese, Portuguese, Chinese
- ⚡ Fast inference
- 🆓 Apache-licensed weights

**Basic Usage:**

```python
from kokoro import KPipeline
import soundfile as sf

# Initialize pipeline (a = American English)
pipeline = KPipeline(lang_code='a')

# Synthesize text
text = "This is a product demo video showing our new AI features."
generator = pipeline(text, voice='af_heart')

# Save audio files
for i, (graphemes, phonemes, audio) in enumerate(generator):
    sf.write(f'{i}.wav', audio, 24000)
```

**Voice Options:**

- `af_heart` - Female American English
- Multiple voices available per language

**Language Codes:**
| Code | Language |
|------|----------|
| `a` | American English |
| `b` | British English |
| `e` | Spanish |
| `f` | French |
| `h` | Hindi |
| `i` | Italian |
| `j` | Japanese |
| `p` | Brazilian Portuguese |
| `z` | Mandarin Chinese |

**content-machine Relevance:**

- Primary TTS engine for video narration
- Apache license allows commercial use
- Small enough for local deployment
- Multi-language support for global content

---

### 1.2 Kokoro-FastAPI - Production TTS Server

**Location:** `vendor/audio/kokoro-fastapi`  
**Language:** Python  
**License:** Apache 2.0  
**Framework:** FastAPI + Docker

**Core Concept:** Production-ready REST API for Kokoro TTS with OpenAI-compatible endpoints.

**Key Features:**

- 🚀 35x-100x realtime speed (GPU)
- 🔊 OpenAI-compatible `/v1/audio/speech` endpoint
- 🎚️ Voice mixing with weighted combinations
- ⏱️ Word-level timestamp generation
- 📝 Caption generation
- 🐳 Docker-ready (CPU + GPU)

**Quick Start:**

```bash
# GPU version
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU version
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

**OpenAI-Compatible Usage:**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Stream audio
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky+af_bella",  # Voice mixing!
    input="Welcome to our product demo!"
) as response:
    response.stream_to_file("output.mp3")
```

**Voice Mixing:**

```python
# Equal mix (50/50)
voice = "af_bella+af_sky"

# Weighted mix (67%/33%)
voice = "af_bella(2)+af_sky(1)"
```

**Captioned Speech (Word Timestamps):**

```python
import requests
import json

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

result = response.json()
audio = result["audio"]  # Base64 encoded
timestamps = result["timestamps"]  # Word-level timestamps
```

**Performance:**
| Metric | GPU | CPU |
|--------|-----|-----|
| First Token Latency | ~300ms | ~3500ms |
| Realtime Factor | 35x-100x | 2x-5x |
| Memory | ~2GB VRAM | ~1GB RAM |

**content-machine Relevance:**

- Production TTS API for video pipeline
- Word-level timestamps for animated captions
- OpenAI-compatible = easy integration
- Voice mixing for variety

---

## Part 2: Storage Infrastructure

### 2.1 Qdrant - Vector Search Engine

**Location:** `vendor/storage/qdrant`  
**Language:** Rust  
**License:** Apache 2.0  
**Stars:** 23k+

**Core Concept:** Production-ready vector similarity search with extended filtering.

**Key Features:**

- ⚡ Fast: Sub-millisecond searches over billions of vectors
- 🔍 Extended filtering: JSON payloads with complex queries
- 🔄 Horizontal scaling: Sharding + replication
- 🛡️ Production-ready: High availability, cloud-native

**Quick Start:**

```bash
docker run -p 6333:6333 qdrant/qdrant
```

**Python Client:**

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Connect
client = QdrantClient(":memory:")  # In-memory for testing
# client = QdrantClient("http://localhost:6333")  # Production

# Create collection
client.create_collection(
    collection_name="video_content",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Insert vectors with payloads
client.upsert(
    collection_name="video_content",
    points=[
        PointStruct(
            id=1,
            vector=embedding_vector,  # 1536-dim OpenAI embedding
            payload={
                "title": "AI Tools Review",
                "platform": "tiktok",
                "views": 150000,
                "tags": ["ai", "tools", "review"]
            }
        )
    ]
)

# Semantic search with filters
results = client.search(
    collection_name="video_content",
    query_vector=query_embedding,
    query_filter={
        "must": [
            {"key": "platform", "match": {"value": "tiktok"}},
            {"key": "views", "range": {"gte": 10000}}
        ]
    },
    limit=10
)
```

**Use Cases for content-machine:**

- Find similar trending topics
- Content recommendation
- Duplicate detection
- Semantic search over scripts/captions

---

### 2.2 Weaviate - Vector Database

**Location:** `vendor/storage/weaviate`  
**Language:** Go  
**License:** BSD-3  
**Stars:** 14k+

**Core Concept:** Cloud-native vector database with integrated ML models and RAG support.

**Key Features:**

- 🤖 Integrated vectorizers (OpenAI, Cohere, HuggingFace)
- 🔍 Hybrid search (vector + keyword BM25)
- 🧠 Built-in RAG and reranking
- 📊 Multi-tenancy, RBAC, horizontal scaling

**Quick Start:**

```yaml
# docker-compose.yml
services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.32.2
    ports:
      - '8080:8080'
    environment:
      ENABLE_MODULES: text2vec-openai
```

**Python Client:**

```python
import weaviate
from weaviate.classes.config import Configure, DataType, Property

# Connect
client = weaviate.connect_to_local()

# Create collection with auto-vectorization
client.collections.create(
    name="VideoScript",
    properties=[
        Property(name="title", data_type=DataType.TEXT),
        Property(name="content", data_type=DataType.TEXT),
        Property(name="platform", data_type=DataType.TEXT),
    ],
    vector_config=Configure.Vectors.text2vec_openai(),  # Auto-vectorize!
)

# Insert (vectors generated automatically)
scripts = client.collections.get("VideoScript")
scripts.data.insert_many([
    {"title": "AI Tools Review", "content": "Top 5 AI tools...", "platform": "tiktok"},
    {"title": "Python Tips", "content": "Best Python practices...", "platform": "youtube"},
])

# Semantic search
results = scripts.query.near_text(
    query="artificial intelligence tools",
    limit=5
)
```

**Hybrid Search:**

```python
# Combine semantic + keyword search
results = scripts.query.hybrid(
    query="AI coding tools",
    alpha=0.5,  # 0 = pure keyword, 1 = pure semantic
    limit=10
)
```

**content-machine Relevance:**

- Content discovery and recommendation
- Script similarity matching
- Trend clustering
- RAG for script generation

---

### 2.3 MinIO - Object Storage

**Location:** `vendor/storage/minio`  
**Language:** Go  
**License:** AGPL-3.0  
**Stars:** 50k+

**Core Concept:** S3-compatible high-performance object storage.

**⚠️ Status:** Maintenance mode - source-only distribution.

**Key Features:**

- 📦 S3-compatible API
- ⚡ High performance
- 🔒 Erasure coding for data protection

**Quick Start:**

```bash
go install github.com/minio/minio@latest
minio server /data
```

**content-machine Relevance:**

- Video asset storage
- Generated content storage
- S3-compatible backup

**Note:** Consider alternatives like R2, Backblaze B2, or S3 for production.

---

## Part 3: Publishing & Distribution Infrastructure

### 3.1 TiktokAutoUploader - Fast TikTok Upload

**Location:** `vendor/publish/TiktokAutoUploader`  
**Language:** Python  
**License:** MIT  
**Method:** Direct API (not Selenium)

**Core Concept:** Fast, reliable TikTok video upload using direct API calls.

**Key Features:**

- ⚡ Upload in ~3 seconds (not Selenium!)
- 📅 Schedule up to 10 days ahead
- 👥 Multiple account support
- 🎬 YouTube Shorts to TikTok

**Installation:**

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
pip install -r requirements.txt
cd tiktok_uploader/tiktok-signature/
npm i
```

**Usage:**

```bash
# Login (saves cookies)
python cli.py login -n my_account

# Upload from file
python cli.py upload --user my_account -v "video.mp4" -t "My video title"

# Upload from YouTube Shorts
python cli.py upload --user my_account -yt "https://youtube.com/shorts/xxx" -t "Title"
```

**content-machine Integration:**

```python
import subprocess

def upload_to_tiktok(video_path: str, title: str, user: str = "main"):
    """Upload video to TikTok."""
    result = subprocess.run([
        "python", "cli.py", "upload",
        "--user", user,
        "-v", video_path,
        "-t", title
    ], capture_output=True, text=True)

    if result.returncode == 0:
        return {"success": True}
    return {"success": False, "error": result.stderr}
```

**⚠️ Disclaimer:** Unofficial API, may violate ToS. Use at own risk.

---

### 3.2 youtube-upload - YouTube API Upload

**Location:** `vendor/publish/youtube-upload`  
**Language:** Python  
**License:** MIT  
**Method:** Official YouTube Data API v3

**Core Concept:** Upload YouTube videos via official API with OAuth authentication.

**Installation:**

```bash
pip install pillar-youtube-upload
```

**Setup:**

1. Create project in Google Cloud Console
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Download `client_secret.json`

**Usage:**

```python
from youtube_upload.client import YoutubeUploader

# Initialize
uploader = YoutubeUploader(client_id, client_secret)
# Or use client_secrets.json in working directory
uploader = YoutubeUploader()

# Authenticate (opens browser first time)
uploader.authenticate()

# Upload
options = {
    "title": "AI Tools Review - Top 5 for 2026",
    "description": "The best AI tools for developers...",
    "tags": ["ai", "tools", "review"],
    "categoryId": "22",  # People & Blogs
    "privacyStatus": "private",  # public, private, unlisted
    "kids": False,
    "thumbnailLink": "https://example.com/thumbnail.jpg"
}

uploader.upload("video.mp4", options)

# Cleanup
uploader.close()
```

**content-machine Relevance:**

- Official API = reliable
- YouTube Shorts support
- Scheduled publishing
- Thumbnail support

---

### 3.3 Mixpost - Social Media Management

**Location:** `vendor/publish/mixpost`  
**Language:** PHP (Laravel)  
**License:** MIT  
**Type:** Self-hosted platform

**Core Concept:** Comprehensive social media management platform for scheduling and analytics.

**Key Features:**

- 📅 Content scheduling
- 📊 Analytics across platforms
- 👥 Team collaboration
- 🔄 Post templates
- 📚 Media library

**Use Case:** Review dashboard / social media ops tool.

**content-machine Relevance:**

- Pattern reference for review dashboard
- Scheduling system architecture
- Multi-platform publishing patterns

---

### 3.4 Other Publishing Tools

| Tool                              | Platform        | Method                  |
| --------------------------------- | --------------- | ----------------------- |
| `rednote-instagram-auto-uploader` | Instagram Reels | Instagrapi (unofficial) |
| `go-youtube-reddit-automation`    | YouTube         | End-to-end pipeline     |
| `my-youtube-automation`           | YouTube         | Custom scripts          |

---

## Part 4: Observability & Evaluation Infrastructure

### 4.1 LangFuse - LLM Observability Platform

**Location:** `vendor/observability/langfuse`  
**Language:** TypeScript  
**License:** MIT  
**Stars:** 16k+

**Core Concept:** Open-source LLM engineering platform for tracing, evaluation, and prompt management.

**Key Features:**

- 📊 **Tracing:** Full observability for LLM calls
- 🧪 **Evaluations:** LLM-as-judge, user feedback, custom evals
- 📝 **Prompt Management:** Version control, collaborative editing
- 📈 **Datasets:** Test sets and benchmarks
- 🎮 **Playground:** Prompt testing and iteration
- 🔌 **Integrations:** LangChain, LlamaIndex, OpenAI, Anthropic

**Quick Start:**

```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up
```

**Python Integration:**

```python
from langfuse import observe
from langfuse.openai import openai  # Drop-in replacement

@observe()
def generate_script(topic: str) -> str:
    """Generate video script with full tracing."""
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Create a 60-second video script."},
            {"role": "user", "content": f"Topic: {topic}"}
        ],
    ).choices[0].message.content

@observe()
def create_video(topic: str):
    """Full pipeline with nested tracing."""
    script = generate_script(topic)
    # ... more steps, all traced
    return script
```

**Evaluation Integration:**

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Score a trace
langfuse.score(
    trace_id=trace.id,
    name="quality",
    value=0.9,
    comment="Good script structure"
)

# Create dataset for evals
dataset = langfuse.create_dataset(name="video_scripts")
dataset.add_item(
    input={"topic": "AI tools"},
    expected_output={"hook": "...", "body": "...", "cta": "..."}
)
```

**content-machine Relevance:**

- Full tracing for video generation pipeline
- Script quality evaluation
- Prompt version control
- A/B testing for different prompts

---

### 4.2 Promptfoo - LLM Testing & Red Teaming

**Location:** `vendor/observability/promptfoo`  
**Language:** TypeScript  
**License:** MIT  
**Stars:** 8k+

**Core Concept:** Developer-friendly tool for testing LLM applications and security scanning.

**Key Features:**

- 🧪 **Automated evaluations:** Test prompts systematically
- 🔐 **Red teaming:** Vulnerability scanning
- 🔀 **Model comparison:** Side-by-side testing
- 🔄 **CI/CD integration:** Automated checks
- 💻 **100% local:** Prompts never leave your machine

**Quick Start:**

```bash
npx promptfoo@latest init
npx promptfoo eval
```

**Configuration (promptfooconfig.yaml):**

```yaml
providers:
  - openai:gpt-4o
  - anthropic:claude-sonnet-4-0

prompts:
  - 'Create a 60-second video script about {{topic}}'
  - 'Write an engaging TikTok script for: {{topic}}'

tests:
  - vars:
      topic: 'AI coding tools'
    assert:
      - type: contains
        value: 'hook'
      - type: llm-rubric
        value: 'The script should have a clear call to action'
  - vars:
      topic: 'Python tips'
    assert:
      - type: javascript
        value: output.length < 500
```

**Red Teaming:**

```yaml
# Security vulnerability scanning
redteam:
  plugins:
    - prompt-injection
    - jailbreak
    - harmful-content
  strategies:
    - crescendo
    - multi-turn
```

**content-machine Relevance:**

- Test script generation prompts
- Compare different LLM providers
- Red team content generation
- CI/CD quality gates

---

### 4.3 Celery - Distributed Task Queue

**Location:** `vendor/job-queue/celery`  
**Language:** Python  
**License:** BSD-3  
**Stars:** 25k+

**Core Concept:** Production-ready distributed task queue for asynchronous processing.

**Key Features:**

- 📨 **Message Brokers:** RabbitMQ, Redis, SQS
- ⚡ **Fast:** Millions of tasks/minute
- 🔄 **Flexible:** Custom serializers, compression
- 📊 **Result Stores:** Redis, SQLAlchemy, Cassandra

**Basic Usage:**

```python
from celery import Celery

app = Celery('content_machine', broker='redis://localhost//')

@app.task
def render_video(project_id: str):
    """Render video in background."""
    # Long-running render process
    return {"status": "complete", "path": "/videos/output.mp4"}

@app.task
def generate_script(topic: str):
    """Generate script in background."""
    # LLM call
    return {"script": "..."}
```

**Chaining Tasks:**

```python
from celery import chain

# Sequential pipeline
pipeline = chain(
    generate_script.s("AI tools"),
    generate_audio.s(),
    render_video.s()
)
result = pipeline.apply_async()
```

**content-machine Relevance:**

- Video rendering queue
- LLM call management
- Asset processing pipeline
- Rate limiting for API calls

---

### 4.4 RQ (Redis Queue) - Simple Python Job Queue

**Location:** `vendor/job-queue/rq`  
**Language:** Python  
**License:** MIT  
**Stars:** 10k+

**Core Concept:** Lightweight Redis-based job queue with minimal configuration.

**Key Features:**

- 🪶 **Simple:** Minimal setup
- ⏰ **Scheduling:** Built-in cron and interval jobs
- 🔁 **Retry:** Configurable retry policies
- 📊 **Dashboard:** rq-dashboard for monitoring

**Basic Usage:**

```python
from redis import Redis
from rq import Queue

# Create queue
queue = Queue(connection=Redis())

# Enqueue job
job = queue.enqueue(render_video, project_id="123")

# Check status
print(job.get_status())
```

**Scheduling:**

```python
from datetime import datetime, timedelta
from rq import Queue

queue = Queue(connection=Redis())

# Schedule for specific time
queue.enqueue_at(datetime(2026, 1, 3, 9, 0), publish_video, video_id="123")

# Schedule relative
queue.enqueue_in(timedelta(minutes=30), send_notification, user_id="456")
```

**Worker:**

```bash
rq worker --with-scheduler
```

**content-machine Relevance:**

- Lighter alternative to Celery
- Good for simpler pipelines
- Built-in scheduling for publishing

---

## Part 5: Integration Architecture

### 5.1 Complete Publishing Pipeline

```python
from rq import Queue
from redis import Redis

queue = Queue(connection=Redis())

def publish_video(video_path: str, platforms: list[str], metadata: dict):
    """Publish video to multiple platforms."""
    results = {}

    for platform in platforms:
        if platform == "tiktok":
            job = queue.enqueue(upload_tiktok, video_path, metadata["title"])
        elif platform == "youtube":
            job = queue.enqueue(upload_youtube, video_path, metadata)
        elif platform == "instagram":
            job = queue.enqueue(upload_instagram, video_path, metadata)

        results[platform] = job.id

    return results

async def upload_tiktok(video_path: str, title: str):
    """Upload to TikTok via TiktokAutoUploader."""
    import subprocess
    result = subprocess.run([
        "python", "cli.py", "upload",
        "-v", video_path,
        "-t", title
    ])
    return result.returncode == 0

async def upload_youtube(video_path: str, metadata: dict):
    """Upload to YouTube via official API."""
    from youtube_upload.client import YoutubeUploader

    uploader = YoutubeUploader()
    uploader.authenticate(oauth_path="oauth.json")
    uploader.upload(video_path, metadata)
    uploader.close()
```

### 5.2 Observability-Wrapped Pipeline

```python
from langfuse import observe
from langfuse.openai import openai

@observe()
def video_pipeline(topic: str) -> dict:
    """Full pipeline with LangFuse tracing."""

    # 1. Script generation (traced)
    script = generate_script(topic)

    # 2. TTS (traced)
    audio_path = generate_audio(script)

    # 3. Caption generation
    captions = generate_captions(audio_path)

    # 4. Render
    video_path = render_video(script, audio_path, captions)

    return {
        "video": video_path,
        "script": script,
        "captions": captions
    }

@observe()
def generate_script(topic: str) -> str:
    """Generate script with prompt management."""
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": f"Create video script about {topic}"}
        ]
    ).choices[0].message.content
```

### 5.3 Vector Search for Content Discovery

```python
from qdrant_client import QdrantClient
import openai

# Initialize
qdrant = QdrantClient("http://localhost:6333")
openai_client = openai.OpenAI()

def find_similar_content(query: str, limit: int = 10) -> list[dict]:
    """Find similar content using semantic search."""

    # Generate query embedding
    embedding = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    ).data[0].embedding

    # Search
    results = qdrant.search(
        collection_name="video_content",
        query_vector=embedding,
        limit=limit
    )

    return [
        {
            "id": hit.id,
            "score": hit.score,
            "payload": hit.payload
        }
        for hit in results
    ]

def recommend_topics(recent_videos: list[str]) -> list[str]:
    """Recommend topics based on recent successful videos."""

    # Get embeddings for recent videos
    embeddings = [get_embedding(v) for v in recent_videos]
    avg_embedding = sum(embeddings) / len(embeddings)

    # Find similar but unexplored topics
    results = qdrant.search(
        collection_name="trending_topics",
        query_vector=avg_embedding,
        query_filter={
            "must_not": [
                {"key": "already_covered", "match": {"value": True}}
            ]
        },
        limit=5
    )

    return [r.payload["topic"] for r in results]
```

---

## Summary

### TTS Recommendations

| Use Case           | Tool           | Reasoning                          |
| ------------------ | -------------- | ---------------------------------- |
| **Production API** | Kokoro-FastAPI | OpenAI-compatible, word timestamps |
| **Local Dev**      | Kokoro         | Direct Python, simple              |
| **Multi-language** | Kokoro         | 8+ languages, Apache licensed      |

### Storage Recommendations

| Use Case           | Tool     | Reasoning                                  |
| ------------------ | -------- | ------------------------------------------ |
| **Vector Search**  | Qdrant   | Fast, extended filtering, production-ready |
| **Hybrid Search**  | Weaviate | Vector + BM25, integrated ML               |
| **Object Storage** | S3/R2/B2 | Production alternatives to MinIO           |

### Publishing Recommendations

| Platform           | Tool               | Method                  |
| ------------------ | ------------------ | ----------------------- |
| **TikTok**         | TiktokAutoUploader | Direct API (fast)       |
| **YouTube**        | youtube-upload     | Official API (reliable) |
| **Instagram**      | instagrapi         | Unofficial (risky)      |
| **Multi-platform** | Mixpost            | Self-hosted scheduling  |

### Observability Recommendations

| Use Case               | Tool      | Reasoning                  |
| ---------------------- | --------- | -------------------------- |
| **LLM Tracing**        | LangFuse  | Open source, comprehensive |
| **Prompt Testing**     | promptfoo | Local, red teaming         |
| **Job Queue (Python)** | RQ        | Simple, Redis-based        |
| **Job Queue (Scale)**  | Celery    | Production-proven          |

### Key Integration Patterns

1. **TTS → Captions:** Kokoro-FastAPI generates audio + word timestamps → feed to Remotion
2. **Content Discovery:** Qdrant stores video embeddings → semantic search for similar content
3. **Observability:** LangFuse traces all LLM calls → promptfoo for offline testing
4. **Publishing:** RQ queue → TiktokAutoUploader + youtube-upload → multi-platform

---

## References

- [Kokoro HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M)
- [Kokoro-FastAPI GitHub](https://github.com/remsky/Kokoro-FastAPI)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Weaviate Documentation](https://docs.weaviate.io/)
- [LangFuse Documentation](https://langfuse.com/docs)
- [Promptfoo Documentation](https://www.promptfoo.dev/docs/)
- [RQ Documentation](https://python-rq.org/)
- [Celery Documentation](https://docs.celeryq.dev/)
