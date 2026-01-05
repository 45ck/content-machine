# Deep Dive #81: MCP Ecosystem & Server Infrastructure

**Date:** 2026-01-02
**Category:** MCP Infrastructure & AI Integration
**Complexity:** High
**Dependencies:** DD-079 (Connectors), DD-080 (Orchestration)

---

## Executive Summary

This deep dive synthesizes the complete Model Context Protocol (MCP) ecosystem for content-machine, covering **MCP SDKs** (FastMCP Python/TypeScript), **specialized MCP servers** (Qdrant, Plainly, Nano-Banana, GenAI Toolbox), and **integration patterns**. MCP is the "USB-C for AI"—a standardized protocol that lets LLM applications connect to external tools and data sources.

**Key Findings:**

- **FastMCP (Python):** Production-ready framework with auth, deployment, OpenAPI generation
- **FastMCP (TypeScript):** Full-featured with sessions, streaming, auth
- **Qdrant MCP:** Semantic memory layer for vector search
- **Plainly MCP:** Video rendering API for templated content
- **Nano-Banana MCP:** Gemini-based image generation/editing
- **GenAI Toolbox:** Database tools for LLM agents
- **content-machine opportunity:** Build custom MCP servers for video pipeline

---

## 1. MCP Fundamentals

### 1.1 What is MCP?

The **Model Context Protocol (MCP)** is an open standard for connecting LLM applications to external data and tools. It provides:

| Concept       | Description                        | HTTP Analogy   |
| ------------- | ---------------------------------- | -------------- |
| **Tools**     | Execute code, produce side effects | POST endpoints |
| **Resources** | Read-only data loading             | GET endpoints  |
| **Prompts**   | Reusable interaction templates     | API schemas    |

### 1.2 Transport Options

| Transport     | Use Case                 | Latency |
| ------------- | ------------------------ | ------- |
| **stdio**     | Local tools, CLI         | Lowest  |
| **HTTP/SSE**  | Remote servers           | Medium  |
| **WebSocket** | Bi-directional streaming | Low     |

---

## 2. FastMCP (Python)

**Repository:** vendor/mcp/fastmcp-python
**Stars:** 10k+ | **Language:** Python | **License:** Apache-2.0

FastMCP is the standard Python framework for building MCP servers, created by Prefect. FastMCP 1.0 was incorporated into the official MCP SDK; version 2.0 extends it significantly.

### 2.1 Key Features

| Feature                | Description                                 |
| ---------------------- | ------------------------------------------- |
| **Simple Decorators**  | `@mcp.tool`, `@mcp.resource`, `@mcp.prompt` |
| **Enterprise Auth**    | Google, GitHub, WorkOS, Azure, Auth0        |
| **Deployment Tools**   | CLI for running and testing                 |
| **OpenAPI Generation** | Auto-generate FastAPI from MCP              |
| **Server Composition** | Combine multiple MCP servers                |
| **Proxy Servers**      | Route between MCP servers                   |

### 2.2 Quick Start

```python
# server.py
from fastmcp import FastMCP

mcp = FastMCP("Video Pipeline 🎬")

@mcp.tool
def generate_script(topic: str, style: str = "viral") -> str:
    """Generate a video script from a topic."""
    # Call LLM
    script = llm.invoke(f"Write a {style} TikTok script about {topic}")
    return script

@mcp.tool
def render_video(script: str, output_path: str) -> dict:
    """Render a video from a script."""
    # Call Remotion
    result = remotion_render(script, output_path)
    return {"path": result.path, "duration": result.duration}

@mcp.resource("videos://list")
def list_videos() -> list[dict]:
    """List all rendered videos."""
    return get_all_videos()

if __name__ == "__main__":
    mcp.run()
```

```bash
# Run server
fastmcp run server.py

# Test interactively
fastmcp dev server.py
```

### 2.3 Authentication

```python
from fastmcp import FastMCP
from fastmcp.auth import GoogleAuth

mcp = FastMCP("Secure Pipeline")

# Enterprise auth
mcp.auth = GoogleAuth(
    client_id="...",
    client_secret="...",
    allowed_domains=["company.com"]
)

@mcp.tool(require_auth=True)
def sensitive_operation(data: str) -> str:
    # Only authenticated users can call this
    user = mcp.current_user
    return f"Processed by {user.email}"
```

### 2.4 Server Composition

```python
from fastmcp import FastMCP

# Individual servers
reddit_mcp = FastMCP("Reddit")
youtube_mcp = FastMCP("YouTube")
render_mcp = FastMCP("Render")

# Compose into single server
main_mcp = FastMCP("Content Machine")
main_mcp.mount("/reddit", reddit_mcp)
main_mcp.mount("/youtube", youtube_mcp)
main_mcp.mount("/render", render_mcp)

main_mcp.run()
```

### 2.5 OpenAPI Generation

```python
from fastmcp import FastMCP
from fastmcp.contrib.fastapi import generate_fastapi

mcp = FastMCP("My Server")

@mcp.tool
def my_tool(x: int) -> int:
    return x * 2

# Generate FastAPI app
app = generate_fastapi(mcp)

# Now you have REST API + MCP!
```

---

## 3. FastMCP (TypeScript)

**Repository:** vendor/mcp/fastmcp-typescript
**Stars:** 2k+ | **Language:** TypeScript | **License:** MIT

TypeScript implementation with additional features for web environments.

### 3.1 Key Features

| Feature                    | Description                  |
| -------------------------- | ---------------------------- |
| **Session Management**     | Track client sessions        |
| **HTTP Streaming**         | SSE-compatible remote access |
| **Image/Audio Content**    | Built-in media handling      |
| **Progress Notifications** | Real-time updates            |
| **Stateless Mode**         | Serverless deployments       |
| **Health Checks**          | Built-in endpoint            |

### 3.2 Quick Start

```typescript
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

const server = new FastMCP({
  name: 'Video Pipeline',
  version: '1.0.0',
});

server.addTool({
  name: 'generate_script',
  description: 'Generate a video script',
  parameters: z.object({
    topic: z.string(),
    style: z.enum(['viral', 'educational', 'promotional']),
  }),
  execute: async (args) => {
    const script = await generateScript(args.topic, args.style);
    return script;
  },
});

server.addTool({
  name: 'render_video',
  description: 'Render video from script',
  parameters: z.object({
    script: z.string(),
    format: z.enum(['mp4', 'webm']).default('mp4'),
  }),
  execute: async (args, { reportProgress }) => {
    // Report progress
    await reportProgress({ progress: 0, total: 100 });

    const result = await renderVideo(args.script, args.format);

    await reportProgress({ progress: 100, total: 100 });

    return JSON.stringify(result);
  },
});

// Start with stdio (local)
server.start({ transportType: 'stdio' });

// Or HTTP (remote)
server.start({
  transportType: 'httpStream',
  httpStream: { port: 8000 },
});
```

### 3.3 Image/Audio Content

```typescript
import { imageContent, audioContent } from 'fastmcp';
import * as fs from 'fs';

server.addTool({
  name: 'generate_thumbnail',
  description: 'Generate video thumbnail',
  parameters: z.object({ videoPath: z.string() }),
  execute: async (args) => {
    const thumbnailPath = await generateThumbnail(args.videoPath);
    const data = fs.readFileSync(thumbnailPath);

    return imageContent({
      data: data.toString('base64'),
      mimeType: 'image/png',
    });
  },
});

server.addTool({
  name: 'extract_audio',
  description: 'Extract audio from video',
  parameters: z.object({ videoPath: z.string() }),
  execute: async (args) => {
    const audioPath = await extractAudio(args.videoPath);
    const data = fs.readFileSync(audioPath);

    return audioContent({
      data: data.toString('base64'),
      mimeType: 'audio/mp3',
    });
  },
});
```

### 3.4 Sessions

```typescript
const server = new FastMCP({
  name: 'Stateful Server',
  version: '1.0.0',
});

// Access session in tools
server.addTool({
  name: 'track_progress',
  parameters: z.object({ step: z.string() }),
  execute: async (args, { session }) => {
    // Store progress in session
    session.set('lastStep', args.step);
    session.set('timestamp', Date.now());

    return `Step ${args.step} recorded`;
  },
});

server.addTool({
  name: 'get_progress',
  parameters: z.object({}),
  execute: async (args, { session }) => {
    const lastStep = session.get('lastStep');
    return `Last step: ${lastStep}`;
  },
});
```

---

## 4. Specialized MCP Servers

### 4.1 Qdrant MCP Server

**Repository:** vendor/mcp-servers/qdrant-mcp-server
**Purpose:** Semantic memory layer for vector search

#### Tools

| Tool           | Description                       |
| -------------- | --------------------------------- |
| `qdrant-store` | Store information with embeddings |
| `qdrant-find`  | Semantic search for relevant info |

#### Configuration

```bash
# Environment variables
QDRANT_URL="http://localhost:6333"
COLLECTION_NAME="video-ideas"
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

#### Claude Desktop Config

```json
{
  "mcpServers": {
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "video-ideas"
      }
    }
  }
}
```

#### content-machine Use Case

```
Agent: "Store this video idea: AI coding assistants comparison"
→ qdrant-store stores with embedding

Agent: "Find video ideas about developer productivity"
→ qdrant-find returns semantically similar ideas
```

---

### 4.2 Plainly MCP Server

**Repository:** vendor/mcp-servers/plainly-mcp-server
**Purpose:** Video rendering via Plainly API

#### Tools

| Tool                           | Description                      |
| ------------------------------ | -------------------------------- |
| `list_renderable_items`        | List available designs/templates |
| `get_renderable_items_details` | Get template parameters          |
| `render_item`                  | Submit render job                |
| `check_render_status`          | Check render progress            |

#### Configuration

```json
{
  "mcpServers": {
    "plainly": {
      "command": "npx",
      "args": ["-y", "@plainly-videos/mcp-server@latest"],
      "env": {
        "PLAINLY_API_KEY": "<API_KEY>"
      }
    }
  }
}
```

#### content-machine Use Case

- **Template-based video generation**
- **Dynamic text/image insertion**
- **Batch rendering for multiple variations**

---

### 4.3 Nano-Banana MCP

**Repository:** vendor/mcp-servers/Nano-Banana-MCP
**Purpose:** AI image generation/editing with Gemini

#### Features

| Feature               | Description                         |
| --------------------- | ----------------------------------- |
| **Generate Images**   | Text-to-image with Gemini 2.5 Flash |
| **Edit Images**       | Modify existing images              |
| **Iterative Editing** | Continue editing last image         |
| **Reference Images**  | Style transfer/guidance             |

#### Configuration

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"],
      "env": {
        "GEMINI_API_KEY": "<API_KEY>"
      }
    }
  }
}
```

#### Usage Examples

```
"Generate an image of a sunset over mountains"
"Edit this image to add some birds in the sky"
"Continue editing to make it more dramatic"
```

#### content-machine Use Case

- **Thumbnail generation** for videos
- **Background images** for text overlays
- **Visual assets** for video scenes

---

### 4.4 GenAI Toolbox for Databases

**Repository:** vendor/mcp-servers/genai-toolbox
**Purpose:** Database tools for LLM agents

#### Features

| Feature                      | Description                    |
| ---------------------------- | ------------------------------ |
| **Natural Language Queries** | SQL generation from English    |
| **Connection Pooling**       | Efficient database connections |
| **Auth Integration**         | Secure data access             |
| **OpenTelemetry**            | Built-in observability         |

#### Supported Databases

- PostgreSQL
- MySQL
- SQLite
- BigQuery
- Cloud SQL

#### content-machine Use Case

```
Agent: "How many videos did we generate last week?"
→ Generates: SELECT COUNT(*) FROM videos WHERE created_at > ...

Agent: "What's our most popular video topic?"
→ Generates: SELECT topic, COUNT(*) as count FROM videos GROUP BY topic ORDER BY count DESC LIMIT 1
```

---

## 5. Building Custom MCP Servers

### 5.1 content-machine MCP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT-MACHINE MCP                           │
│                    (FastMCP Python)                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────────────────────┐
        │                   │                                   │
        ▼                   ▼                                   ▼
┌───────────────┐   ┌───────────────┐                   ┌───────────────┐
│  Research     │   │    Script     │                   │    Render     │
│  MCP Server   │   │  MCP Server   │                   │  MCP Server   │
├───────────────┤   ├───────────────┤                   ├───────────────┤
│ reddit_search │   │ generate_hook │                   │ render_video  │
│ hn_trends     │   │ generate_body │                   │ add_captions  │
│ youtube_ideas │   │ generate_cta  │                   │ add_music     │
│ google_trends │   │ optimize_script│                  │ export_mp4    │
└───────────────┘   └───────────────┘                   └───────────────┘
        │                   │                                   │
        └───────────────────┼───────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Claude     │
                    │   (or other)  │
                    └───────────────┘
```

### 5.2 Example: Research MCP Server

```python
# research_mcp.py
from fastmcp import FastMCP
from praw import Reddit
from pytrends.request import TrendReq

mcp = FastMCP("Research Tools 🔍")

reddit = Reddit(
    client_id="...",
    client_secret="...",
    user_agent="content-machine"
)

@mcp.tool
def search_reddit(
    query: str,
    subreddit: str = "programming",
    limit: int = 10
) -> list[dict]:
    """Search Reddit for trending topics."""
    posts = []
    for post in reddit.subreddit(subreddit).search(query, limit=limit):
        posts.append({
            "title": post.title,
            "score": post.score,
            "url": post.url,
            "comments": post.num_comments,
        })
    return posts

@mcp.tool
def get_google_trends(keywords: list[str]) -> dict:
    """Get Google Trends data for keywords."""
    pytrends = TrendReq(hl='en-US', tz=360)
    pytrends.build_payload(keywords, timeframe='now 7-d')

    interest = pytrends.interest_over_time()
    related = pytrends.related_queries()

    return {
        "interest": interest.to_dict(),
        "related": {k: v['rising'].to_dict() if v['rising'] is not None else []
                    for k, v in related.items()}
    }

@mcp.tool
def get_hn_top_stories(limit: int = 10) -> list[dict]:
    """Get top stories from Hacker News."""
    import httpx

    resp = httpx.get("https://hacker-news.firebaseio.com/v0/topstories.json")
    story_ids = resp.json()[:limit]

    stories = []
    for sid in story_ids:
        resp = httpx.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
        stories.append(resp.json())

    return stories

if __name__ == "__main__":
    mcp.run()
```

### 5.3 Example: Render MCP Server

```python
# render_mcp.py
from fastmcp import FastMCP
import subprocess
import json

mcp = FastMCP("Video Rendering 🎬")

@mcp.tool
def render_video(
    script: str,
    style: str = "tiktok",
    output_path: str = "./output.mp4"
) -> dict:
    """Render a video using Remotion."""

    # Create props file
    props = {
        "script": script,
        "style": style,
    }

    with open("/tmp/props.json", "w") as f:
        json.dump(props, f)

    # Call Remotion
    result = subprocess.run([
        "npx", "remotion", "render",
        "src/Video.tsx",
        "Video",
        output_path,
        "--props=/tmp/props.json"
    ], capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Render failed: {result.stderr}")

    return {
        "path": output_path,
        "success": True,
    }

@mcp.tool
def add_captions(
    video_path: str,
    transcript: str,
    style: str = "bouncing"
) -> dict:
    """Add captions to a video."""
    output_path = video_path.replace(".mp4", "_captioned.mp4")

    # Use FFmpeg or Remotion for captions
    # ...

    return {"path": output_path}

@mcp.tool
def add_background_music(
    video_path: str,
    music_url: str,
    volume: float = 0.3
) -> dict:
    """Add background music to a video."""
    output_path = video_path.replace(".mp4", "_music.mp4")

    subprocess.run([
        "ffmpeg", "-i", video_path,
        "-i", music_url,
        "-filter_complex", f"[1:a]volume={volume}[a1];[0:a][a1]amix=inputs=2",
        "-c:v", "copy",
        output_path
    ])

    return {"path": output_path}

if __name__ == "__main__":
    mcp.run()
```

---

## 6. Claude Desktop Integration

### 6.1 Full Configuration

```json
{
  "mcpServers": {
    "content-research": {
      "command": "python",
      "args": ["-m", "fastmcp", "run", "research_mcp.py"],
      "env": {
        "REDDIT_CLIENT_ID": "${REDDIT_CLIENT_ID}",
        "REDDIT_CLIENT_SECRET": "${REDDIT_CLIENT_SECRET}"
      }
    },
    "content-render": {
      "command": "python",
      "args": ["-m", "fastmcp", "run", "render_mcp.py"]
    },
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "video-ideas"
      }
    },
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

### 6.2 Agent Workflow Example

```
User: "Create a TikTok video about AI coding assistants"

Claude:
1. [research_mcp] search_reddit("AI coding assistants", "programming")
   → Returns trending posts about Copilot, Cursor, etc.

2. [research_mcp] get_google_trends(["GitHub Copilot", "Cursor AI"])
   → Returns interest data showing rising trends

3. [qdrant] qdrant-find("AI coding video ideas")
   → Returns similar past ideas to avoid duplication

4. [script generation] Generate hook, body, CTA

5. [nano-banana] Generate thumbnail image

6. [content-render] render_video(script, "tiktok")
   → Returns rendered video path

7. [content-render] add_captions(video_path, transcript)
   → Returns captioned video

8. [qdrant] qdrant-store("AI coding assistants comparison video")
   → Stores for future deduplication
```

---

## 7. Comparison Matrix

### 7.1 FastMCP Python vs TypeScript

| Feature             | Python     | TypeScript |
| ------------------- | ---------- | ---------- |
| **Ecosystem**       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| **Enterprise Auth** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| **Deployment**      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| **Sessions**        | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Streaming**       | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ |
| **Media Content**   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |

**Recommendation:** Python for backend/ML tools, TypeScript for web/media.

### 7.2 MCP Server Selection

| Server          | Use Case          | Effort |
| --------------- | ----------------- | ------ |
| Qdrant MCP      | Semantic memory   | Low    |
| Plainly MCP     | Template videos   | Low    |
| Nano-Banana MCP | Image generation  | Low    |
| GenAI Toolbox   | Database queries  | Medium |
| Custom FastMCP  | Pipeline-specific | High   |

---

## 8. Implementation Priority

### Phase 1: Core MCP Servers (Week 1)

1. Research MCP server (Reddit, HN, Trends)
2. Qdrant MCP for idea storage
3. Claude Desktop configuration

### Phase 2: Render MCP Server (Week 2)

1. Remotion integration
2. Caption tools
3. Music/audio tools

### Phase 3: Publishing MCP (Week 3)

1. Upload tools (TikTok, YouTube)
2. Scheduling tools
3. Analytics integration

### Phase 4: Composition (Week 4)

1. Server composition
2. Proxy server for routing
3. Auth integration

---

## 9. Key Takeaways

1. **FastMCP is production-ready** - Both Python and TypeScript versions mature
2. **MCP is the integration standard** - Use it for all AI-tool communication
3. **Compose servers** - Build small, focused servers; combine as needed
4. **Qdrant MCP for memory** - Perfect for semantic idea storage
5. **Nano-Banana for images** - Quick thumbnail/asset generation
6. **Plainly for templates** - When you need consistent video formats
7. **Build custom servers** - FastMCP makes it easy (<100 lines)
8. **Claude Desktop = dev environment** - Test MCP tools interactively

---

## Related Documents

- [DD-079: Data Connectors](../79-data-connectors-storage-content-sources-DEEP-20260102.md) - Source tools to wrap in MCP
- [DD-080: Orchestration](./80-orchestration-job-queues-agent-frameworks-DEEP-20260102.md) - Temporal + MCP integration
- [DD-077: Rendering](./77-rendering-captions-composition-ecosystem-DEEP-20260102.md) - chuk-motion MCP patterns

---

**Document Statistics:**

- **Tools Covered:** 8 (2 SDKs + 6 servers)
- **Code Examples:** 15+
- **Architecture Diagrams:** 1
- **Configuration Examples:** 5
- **Estimated Reading Time:** 18 minutes
