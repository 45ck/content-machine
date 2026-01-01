# Research Report: MCP Reddit Connector

**Repo:** `adhikasp/mcp-reddit`  
**Location:** `connectors/mcp-reddit/`  
**License:** MIT  
**Language:** Python

---

## What It Does

Model Context Protocol (MCP) server that provides tools for **fetching and analyzing Reddit content**.

Allows LLMs (Claude, GPT) to directly query Reddit via standardized tools.

## Key Features

| Feature | Details |
|---------|---------|
| **Protocol** | MCP (Model Context Protocol) |
| **Fetch Hot Threads** | Get trending posts from any subreddit |
| **Post Details** | Full content including comments |
| **Post Types** | Text, link, gallery support |
| **Installation** | Smithery or manual uvx |

## Tech Stack

- **Language:** Python
- **Protocol:** MCP (Model Context Protocol)
- **Runtime:** uvx (uv Python runner)
- **Installation:** Smithery CLI

## MCP Tools Provided

1. **`fetch_hot_threads`** - Get hot threads from a subreddit
2. **`get_post_content`** - Get detailed post with comments

## What We Can Reuse

### ✅ High Value
- **Trend fetching** - Discover what's hot in target niches
- **MCP pattern** - Agent-callable Reddit access
- **Subreddit analysis** - Research phase for content ideas

### ⚠️ Medium Value
- **Comment analysis** - What questions people are asking

### ❌ Not Needed
- **Post creation** - Read-only is fine for research

## How It Helps Us

1. **Content research** - Find trending topics in target niches
2. **Audience questions** - What are people asking/struggling with?
3. **Hook inspiration** - What titles get engagement?
4. **Agent integration** - MCP means our agent can call it directly

## Integration Pattern

With Claude/agent:
```
> What are the hot threads in r/SaaS?

[Agent calls fetch_hot_threads(subreddit="SaaS")]

Here are the trending topics...
```

For content machine, we can:
1. Feed subreddit to agent
2. Agent discovers trending pain points
3. Generate video content addressing those topics

## Key Files to Study

```
src/
└── mcp_reddit/
    ├── server.py      # MCP server implementation
    └── tools.py       # Reddit fetching tools
```

## Gaps / Limitations

- Read-only (no posting)
- Python-based (we might want TS version)
- Rate limiting not clear
- No authentication persistence

---

## Verdict

**Value: HIGH** - Critical for the **research phase**. Our content machine can use MCP Reddit to discover trending topics, pain points, and viral hooks. The agent can directly query Reddit to inform content strategy.
