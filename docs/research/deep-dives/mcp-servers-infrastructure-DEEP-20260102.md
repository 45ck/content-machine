# Deep Dive: MCP Servers Infrastructure

**Created:** 2026-01-02  
**Type:** Research Deep Dive  
**Category:** Model Context Protocol Servers

---

## Executive Summary

This document provides comprehensive analysis of the MCP (Model Context Protocol) servers available in the vendor directory. These servers enable AI assistants to interact with external services, databases, and APIs through a standardized protocol.

**Key MCP Servers for content-machine:**
- **qdrant-mcp-server:** Semantic memory/RAG for content research
- **postgres-mcp-server:** Database persistence for video metadata
- **plainly-mcp-server:** Video rendering API integration
- **gemini-image-mcp-server:** AI image generation
- **upstash-mcp-server:** Redis/cache integration
- **reddit-mcp-ts:** Reddit content research (covered in connectors doc)

---

## 1. Qdrant MCP Server - Semantic Memory

**Repository:** `vendor/mcp-servers/qdrant-mcp-server/`  
**Purpose:** Vector database integration for semantic search and memory  
**License:** Apache-2.0

### Tools

| Tool | Purpose | Parameters |
|------|---------|------------|
| `qdrant-store` | Store information | `information`, `metadata`, `collection_name` |
| `qdrant-find` | Semantic search | `query`, `collection_name` |

### Configuration

```bash
# Environment Variables
QDRANT_URL="http://localhost:6333"      # Qdrant server URL
QDRANT_API_KEY="your-api-key"           # API key (optional)
COLLECTION_NAME="content-memory"        # Default collection
EMBEDDING_PROVIDER="fastembed"          # Provider (fastembed)
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

### Installation

```bash
# Run with uvx
QDRANT_URL="http://localhost:6333" \
COLLECTION_NAME="content-memory" \
uvx mcp-server-qdrant

# Docker
docker run -p 8000:8000 \
  -e FASTMCP_HOST="0.0.0.0" \
  -e QDRANT_URL="http://qdrant:6333" \
  -e COLLECTION_NAME="content-memory" \
  mcp-server-qdrant

# Smithery install
npx @smithery/cli install mcp-server-qdrant --client claude
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "content-memory"
      }
    }
  }
}
```

### Content-Machine Integration

- **Trend Research Memory:** Store researched trends for reference
- **Script Context:** Retrieve relevant past scripts for style consistency
- **Content Deduplication:** Check if topic was already covered
- **RAG for Script Generation:** Provide context to LLM agents

---

## 2. PostgreSQL MCP Server - Database Persistence

**Repository:** `vendor/mcp-servers/postgres-mcp-server/`  
**Purpose:** PostgreSQL database interaction for metadata storage  
**License:** MIT

### Features

- **Dual Transport:** HTTP (StreamableHTTP) and Stdio
- **Database Resources:** List tables, retrieve schemas
- **Query Tool:** Execute read-only SQL queries
- **Session Management:** Stateful HTTP sessions
- **Docker Support:** Containerized deployment

### Configuration

```bash
# Environment Variables
POSTGRES_URL="postgresql://user:pass@localhost:5432/dbname"
# Or individual settings:
POSTGRES_USERNAME="your_username"
POSTGRES_PASSWORD="your_password"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DATABASE="content_machine"

# HTTP Server
PORT="3000"
HOST="0.0.0.0"
CORS_ORIGIN="http://localhost:8080,http://localhost:3000"
```

### Installation

```bash
# HTTP mode (default)
npx @ahmedmustahid/postgres-mcp-server

# Stdio mode
npx @ahmedmustahid/postgres-mcp-server stdio

# With verbose logging
npx @ahmedmustahid/postgres-mcp-server --port 3000 --verbose
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@ahmedmustahid/postgres-mcp-server", "stdio"],
      "env": {
        "POSTGRES_USERNAME": "user",
        "POSTGRES_PASSWORD": "password",
        "POSTGRES_HOST": "localhost",
        "POSTGRES_DATABASE": "content_machine"
      }
    }
  }
}
```

### Content-Machine Integration

- **Video Metadata:** Store video titles, descriptions, performance
- **Script Archive:** Archive generated scripts
- **Analytics:** Query video performance data
- **Content Calendar:** Schedule management

---

## 3. Plainly MCP Server - Video Rendering

**Repository:** `vendor/mcp-servers/plainly-mcp-server/`  
**Purpose:** LLM-powered video rendering via Plainly API  
**License:** MIT

### Tools

| Tool | Purpose |
|------|---------|
| `list_renderable_items` | List available designs and projects |
| `get_renderable_items_details` | Get design details (parameters, previews, aspect ratios) |
| `render_item` | Submit render with parameters |
| `check_render_status` | Check render status, get preview links |

### Installation

```bash
# Get API key from Plainly dashboard
# https://app.plainlyvideos.com/dashboard/user/settings/general

# Add to Claude Desktop
npx -y @plainly-videos/mcp-server@latest

# Smithery install
npx -y @smithery/cli@latest install @plainly-videos/mcp-server --client claude
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "plainly": {
      "command": "npx",
      "args": ["-y", "@plainly-videos/mcp-server@latest"],
      "env": {
        "PLAINLY_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

### Content-Machine Integration

- **Alternative to Remotion:** Cloud-based rendering service
- **Template-based:** Use pre-designed templates
- **Natural Language Rendering:** "Render a product demo video"
- **Status Monitoring:** Track render progress

---

## 4. Gemini Image MCP Server

**Repository:** `vendor/mcp-servers/gemini-image-mcp-server/`  
**Purpose:** AI image generation with Google Gemini 2.5 Flash  
**License:** MIT

### Features

- **Text-to-Image:** Generate images from prompts
- **Image Editing:** Modify existing images
- **Multi-Image Composition:** Combine multiple images
- **Aspect Ratios:** 10 different aspect ratios
- **Character Consistency:** Maintain character across generations

### Installation

```bash
# Get API key from Google AI Studio
# https://aistudio.google.com/apikey

# npx (easiest)
npx -y github:brunoqgalvao/gemini-image-mcp-server
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "gemini-image": {
      "command": "npx",
      "args": ["-y", "github:brunoqgalvao/gemini-image-mcp-server"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Content-Machine Integration

- **Background Generation:** Generate backgrounds for videos
- **Thumbnail Creation:** AI-generated thumbnails
- **Character Images:** Consistent character visuals
- **Style Transfer:** Edit existing images

---

## 5. Upstash MCP Server - Redis/Caching

**Repository:** `vendor/mcp-servers/upstash-mcp-server/`  
**Purpose:** Serverless Redis for caching and queues  
**License:** MIT

### Example Commands

Natural language operations:
- "Create a new Redis database in us-east-1"
- "List my databases"
- "List keys starting with 'video:' in content-db"
- "Create a backup"
- "Give me the spikes in throughput during the last 7 days"

### Installation

```bash
# Get credentials from Upstash Console
# https://console.upstash.com/account/api

# HTTP transport (for web apps)
npx @upstash/mcp-server@latest --transport http --port 3000 \
  --email YOUR_EMAIL --api-key YOUR_API_KEY
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "upstash": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/mcp-server@latest",
        "--email", "YOUR_EMAIL",
        "--api-key", "YOUR_API_KEY"
      ]
    }
  }
}
```

### Content-Machine Integration

- **Job Queue:** Cache BullMQ job state
- **Rate Limiting:** API rate limit tracking
- **Session State:** User session management
- **Real-time Analytics:** Live view counts

---

## 6. MCP Server Architecture Patterns

### 6.1 Transport Modes

| Transport | Use Case | Configuration |
|-----------|----------|---------------|
| **stdio** | Local MCP clients | Default, no network |
| **SSE** | Remote clients | Port-based, web-friendly |
| **Streamable HTTP** | Modern web apps | Port-based, latest spec |

### 6.2 FastMCP Environment Variables

All FastMCP-based servers support:

```bash
FASTMCP_DEBUG=false           # Enable debug mode
FASTMCP_LOG_LEVEL=INFO        # DEBUG, INFO, WARNING, ERROR, CRITICAL
FASTMCP_HOST=127.0.0.1        # Host address
FASTMCP_PORT=8000             # Port number
```

### 6.3 Docker Patterns

```dockerfile
# Standard MCP server Dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install -g @your/mcp-server
EXPOSE 8000
CMD ["your-mcp-server"]
```

---

## 7. Integration Architecture

### 7.1 Full MCP Stack for content-machine

```
┌─────────────────────────────────────────────────────────────────┐
│                      Claude / LLM Agent                          │
│                   (via Pydantic AI or LangGraph)                 │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │        MCP Protocol         │
                    └──────────────┬──────────────┘
                                   │
    ┌──────────────────────────────┼──────────────────────────────┐
    │                              │                              │
    ▼                              ▼                              ▼
┌─────────┐                  ┌─────────┐                    ┌─────────┐
│ Qdrant  │                  │Postgres │                    │ Reddit  │
│   MCP   │                  │   MCP   │                    │   MCP   │
└────┬────┘                  └────┬────┘                    └────┬────┘
     │                            │                              │
     ▼                            ▼                              ▼
┌─────────┐                  ┌─────────┐                    ┌─────────┐
│ Qdrant  │                  │Postgres │                    │ Reddit  │
│   DB    │                  │   DB    │                    │   API   │
└─────────┘                  └─────────┘                    └─────────┘

    ┌──────────────────────────────┼──────────────────────────────┐
    │                              │                              │
    ▼                              ▼                              ▼
┌─────────┐                  ┌─────────┐                    ┌─────────┐
│ Plainly │                  │ Gemini  │                    │ Upstash │
│   MCP   │                  │ Image   │                    │   MCP   │
└────┬────┘                  └────┬────┘                    └────┬────┘
     │                            │                              │
     ▼                            ▼                              ▼
┌─────────┐                  ┌─────────┐                    ┌─────────┐
│ Plainly │                  │ Gemini  │                    │ Upstash │
│   API   │                  │   API   │                    │  Redis  │
└─────────┘                  └─────────┘                    └─────────┘
```

### 7.2 Recommended MCP Configuration

```json
{
  "mcpServers": {
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "content-memory"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["@ahmedmustahid/postgres-mcp-server", "stdio"],
      "env": {
        "POSTGRES_URL": "postgresql://user:pass@localhost:5432/content"
      }
    },
    "reddit": {
      "command": "npx",
      "args": ["reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "xxx",
        "REDDIT_CLIENT_SECRET": "xxx"
      }
    },
    "gemini-image": {
      "command": "npx",
      "args": ["-y", "github:brunoqgalvao/gemini-image-mcp-server"],
      "env": {
        "GEMINI_API_KEY": "xxx"
      }
    },
    "upstash": {
      "command": "npx",
      "args": ["-y", "@upstash/mcp-server@latest", "--email", "xxx", "--api-key", "xxx"]
    }
  }
}
```

---

## 8. Code Examples

### 8.1 Pydantic AI with MCP Tools

```python
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerHTTP

# Connect to MCP servers
qdrant_mcp = MCPServerHTTP(url="http://localhost:8000")
postgres_mcp = MCPServerHTTP(url="http://localhost:3000")

agent = Agent(
    'anthropic:claude-sonnet-4-0',
    mcp_servers=[qdrant_mcp, postgres_mcp]
)

# Agent now has access to MCP tools
result = await agent.run(
    "Store this trend: 'AI video generation is growing 400% YoY' "
    "and then find related trends we've seen before"
)
```

### 8.2 Direct MCP Client Usage

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def use_qdrant():
    server = StdioServerParameters(
        command="uvx",
        args=["mcp-server-qdrant"],
        env={
            "QDRANT_URL": "http://localhost:6333",
            "COLLECTION_NAME": "trends"
        }
    )
    
    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Store information
            result = await session.call_tool(
                "qdrant-store",
                {
                    "information": "AI video generators are trending on Product Hunt",
                    "metadata": {"source": "product_hunt", "date": "2026-01-02"}
                }
            )
            
            # Search
            results = await session.call_tool(
                "qdrant-find",
                {"query": "trending video tools"}
            )
            print(results)
```

---

## 9. Recommendations

### 9.1 Priority Order

| Priority | Server | Purpose |
|----------|--------|---------|
| **Critical** | reddit-mcp-ts | Trend research |
| **Critical** | qdrant-mcp-server | Semantic memory |
| **High** | postgres-mcp-server | Metadata storage |
| **High** | gemini-image-mcp-server | Image generation |
| **Medium** | upstash-mcp-server | Caching layer |
| **Medium** | plainly-mcp-server | Alternative rendering |

### 9.2 Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                   content-machine Services                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Qdrant    │  │  PostgreSQL │  │     Upstash Redis   │  │
│  │  :6333      │  │   :5432     │  │      (Cloud)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              MCP Servers (Docker Compose)                │ │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐  │ │
│  │  │Qdrant │ │Postgrs│ │Reddit │ │Gemini │ │ Playwright │  │ │
│  │  │ MCP   │ │ MCP   │ │ MCP   │ │ MCP   │ │    MCP     │  │ │
│  │  │:8001  │ │:8002  │ │:8003  │ │:8004  │ │   :8005    │  │ │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Plainly API Reference](https://app.plainlyvideos.com/api-reference.html)
- [Upstash Documentation](https://upstash.com/docs/)
