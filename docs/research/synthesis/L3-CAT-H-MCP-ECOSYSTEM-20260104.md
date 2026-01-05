# Layer 3 Category H: MCP Ecosystem

**Date:** 2026-01-04  
**Synthesized From:** 7 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 3 - AI & Orchestration

---

## Category Summary

Model Context Protocol (MCP) enables LLMs to call external tools. Our research analyzed **20+ MCP servers** across the vendor repos.

---

## MCP Overview

### What is MCP?

```
┌─────────────┐     MCP Protocol     ┌─────────────┐
│   LLM       │◄───────────────────►│  MCP Server │
│  (Client)   │     JSON-RPC        │   (Tools)   │
└─────────────┘                      └─────────────┘
```

### Core Concepts

| Concept       | Description                  |
| ------------- | ---------------------------- |
| **Tools**     | Functions the LLM can call   |
| **Resources** | Data the LLM can read        |
| **Prompts**   | Pre-defined prompt templates |
| **Sampling**  | LLM can request completions  |

---

## Primary Framework: FastMCP 2.0

### Why FastMCP

1. **Decorator-based** - Clean Python API
2. **Type-safe** - Pydantic integration
3. **Enterprise features** - Auth, rate limiting
4. **Streaming** - Real-time responses
5. **Testing utilities** - Mock clients

### Installation

```bash
pip install fastmcp
```

### Basic Server

```python
from fastmcp import FastMCP

mcp = FastMCP("content-machine")

@mcp.tool()
async def search_trends(topic: str, platform: str = "reddit") -> list[dict]:
    """Search for trending topics on a platform."""
    return await trend_api.search(topic, platform)

@mcp.tool()
async def generate_script(topic: str, length: int = 60) -> dict:
    """Generate a video script for a topic."""
    return await script_service.generate(topic, length)

@mcp.resource("templates://list")
async def list_templates() -> list[dict]:
    """List available video templates."""
    return await template_service.list()

# Run server
mcp.run()
```

### TypeScript (fastmcp-typescript)

```typescript
import { FastMCP, tool, resource } from 'fastmcp';

const mcp = new FastMCP('content-machine');

mcp.addTool(
  tool({
    name: 'render_video',
    description: 'Render video from configuration',
    parameters: z.object({
      config: VideoConfigSchema,
    }),
    execute: async ({ config }) => {
      return await renderService.render(config);
    },
  })
);

mcp.addResource(
  resource({
    uri: 'videos://recent',
    name: 'Recent Videos',
    load: async () => {
      return await videoService.getRecent(10);
    },
  })
);

mcp.listen(3000);
```

---

## Vendored MCP Servers

### Content Sources

| Server                     | Purpose             | Auth       |
| -------------------------- | ------------------- | ---------- |
| **reddit-mcp-buddy**       | Reddit browsing     | No API key |
| **reddit-mcp-ts**          | Reddit TypeScript   | API key    |
| **youtube-transcript-api** | YouTube transcripts | No key     |
| **mcp-hackernews**         | Hacker News         | No key     |

### Databases

| Server                 | Database         |
| ---------------------- | ---------------- |
| **postgres-mcp**       | PostgreSQL       |
| **qdrant-mcp-server**  | Qdrant vector DB |
| **upstash-mcp-server** | Redis/Kafka      |

### Video & Rendering

| Server                | Purpose                      |
| --------------------- | ---------------------------- |
| **chuk-mcp-remotion** | Remotion video composition   |
| **plainly-mcp**       | Programmatic video rendering |

### Utilities

| Server              | Purpose                |
| ------------------- | ---------------------- |
| **genai-toolbox**   | Multi-DB agent toolkit |
| **firecrawl-mcp**   | Web crawling           |
| **browserbase-mcp** | Browser automation     |

---

## chuk-mcp-remotion (Video MCP)

### 51 Production Components

```python
@mcp.tool()
async def create_video_project(
    name: str,
    platform: Literal["tiktok", "instagram", "youtube"],
    theme: str = "modern"
) -> dict:
    """Create a new video project with platform-specific settings."""
    return {
        "project_id": str(uuid4()),
        "config": PLATFORM_CONFIGS[platform],
        "theme": THEMES[theme]
    }

@mcp.tool()
async def add_scene(
    project_id: str,
    component: str,  # e.g., "animated-heading", "caption-sequence"
    props: dict,
    duration: float
) -> dict:
    """Add a scene using a component."""
    return await project_service.add_scene(project_id, component, props, duration)

@mcp.tool()
async def render_project(project_id: str) -> dict:
    """Render the project to MP4."""
    return await render_service.render(project_id)
```

### Available Components

```python
COMPONENTS = [
    "animated-heading",
    "caption-sequence",
    "countdown",
    "floating-icon",
    "image-gallery",
    "logo-animation",
    "particle-overlay",
    "progress-bar",
    "quote-display",
    "social-proof",
    "text-reveal",
    "video-player",
    # ... 39 more
]
```

---

## reddit-mcp-buddy (No API Key)

### Scrapes Without API

```python
@mcp.tool()
async def browse_subreddit(
    subreddit: str,
    sort: Literal["hot", "new", "top"] = "hot",
    limit: int = 10
) -> list[dict]:
    """Browse posts from a subreddit."""
    # Uses web scraping, no API key needed
    return await reddit_scraper.browse(subreddit, sort, limit)

@mcp.tool()
async def get_post_comments(post_url: str, limit: int = 20) -> list[dict]:
    """Get comments from a Reddit post."""
    return await reddit_scraper.get_comments(post_url, limit)
```

---

## postgres-mcp (Database Access)

### SQL via MCP

```python
@mcp.tool()
async def query(sql: str, params: list = []) -> list[dict]:
    """Execute SQL query and return results."""
    async with db.acquire() as conn:
        return await conn.fetch(sql, *params)

@mcp.tool()
async def execute(sql: str, params: list = []) -> int:
    """Execute SQL statement and return affected rows."""
    async with db.acquire() as conn:
        return await conn.execute(sql, *params)

@mcp.resource("schema://tables")
async def list_tables() -> list[dict]:
    """List all tables in the database."""
    return await db.fetch("SELECT table_name FROM information_schema.tables")
```

---

## qdrant-mcp-server (Vector Search)

### Semantic Search via MCP

```python
@mcp.tool()
async def search_similar(
    collection: str,
    query: str,
    limit: int = 5
) -> list[dict]:
    """Search for similar items using embeddings."""
    embedding = await embed(query)
    results = await qdrant.search(
        collection_name=collection,
        query_vector=embedding,
        limit=limit
    )
    return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]

@mcp.tool()
async def upsert_vectors(
    collection: str,
    items: list[dict]  # [{"id": "...", "text": "...", "metadata": {...}}]
) -> int:
    """Upsert items into a collection."""
    points = []
    for item in items:
        embedding = await embed(item["text"])
        points.append(PointStruct(
            id=item["id"],
            vector=embedding,
            payload=item.get("metadata", {})
        ))
    await qdrant.upsert(collection, points)
    return len(points)
```

---

## Building Custom MCP Servers

### Server Template

```python
from fastmcp import FastMCP
from pydantic import BaseModel

class VideoConfig(BaseModel):
    title: str
    scenes: list[dict]
    music: str | None = None

mcp = FastMCP("my-video-server")

@mcp.tool()
async def create_video(config: VideoConfig) -> dict:
    """Create a video from configuration."""
    job_id = await queue.add('render', config.model_dump())
    return {"job_id": job_id, "status": "queued"}

@mcp.tool()
async def get_job_status(job_id: str) -> dict:
    """Get status of a rendering job."""
    job = await queue.get(job_id)
    return {"status": job.status, "progress": job.progress}

@mcp.tool()
async def download_video(job_id: str) -> dict:
    """Get download URL for completed video."""
    job = await queue.get(job_id)
    if job.status != "completed":
        raise ValueError("Video not ready")
    return {"url": job.output_url}

if __name__ == "__main__":
    mcp.run()
```

### Client Usage

```python
from mcp import Client

async with Client("http://localhost:8000") as client:
    # List available tools
    tools = await client.list_tools()

    # Call a tool
    result = await client.call_tool("create_video", {
        "config": {
            "title": "AI Trends 2026",
            "scenes": [{"text": "Hello world", "duration": 5}]
        }
    })

    # Read a resource
    templates = await client.read_resource("templates://list")
```

---

## MCP in content-machine Architecture

### Server Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Agent (Claude/GPT)                    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  research-mcp   │ │   render-mcp    │ │  publish-mcp    │
    │  (Python)       │ │  (TypeScript)   │ │  (Python)       │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Reddit  │          │Remotion │          │ TikTok  │
    │ HN      │          │         │          │ YouTube │
    │ Tavily  │          │         │          │         │
    └─────────┘          └─────────┘          └─────────┘
```

### Server Definitions

```yaml
# mcp-servers.yaml
servers:
  research:
    url: http://localhost:8001
    tools:
      - search_trends
      - browse_reddit
      - get_transcripts

  render:
    url: http://localhost:8002
    tools:
      - create_video
      - add_scene
      - render_project

  publish:
    url: http://localhost:8003
    tools:
      - upload_tiktok
      - upload_youtube
      - schedule_post
```

---

## Authentication Patterns

### API Key Auth

```python
from fastmcp import FastMCP
from fastmcp.security import APIKeyAuth

mcp = FastMCP("secure-server")

@mcp.auth(APIKeyAuth(header="X-API-Key"))
async def require_auth():
    pass

@mcp.tool()
@mcp.requires_auth
async def sensitive_operation() -> dict:
    """This tool requires authentication."""
    pass
```

### OAuth2

```python
from fastmcp.security import OAuth2Auth

auth = OAuth2Auth(
    authorization_url="https://auth.example.com/authorize",
    token_url="https://auth.example.com/token"
)

@mcp.auth(auth)
async def oauth_protected():
    pass
```

---

## Source Documents

- DD-47: Connectors + publishing + MCP
- DD-62: MCP ecosystem + image generation + databases
- DD-67: MCP + agents + video + render + audio + research
- DD-69: Capture + MCP servers + advanced generators
- DD-81: MCP ecosystem + server infrastructure
- fastmcp-typescript-DEEP
- mcp-servers-infrastructure-DEEP

---

## Key Takeaway

> **FastMCP 2.0 is the best framework for building MCP servers (Python and TypeScript). Use reddit-mcp-buddy for no-API-key Reddit access, chuk-mcp-remotion for video composition, and postgres-mcp/qdrant-mcp for database access.**
