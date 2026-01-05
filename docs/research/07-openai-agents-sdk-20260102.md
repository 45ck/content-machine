# Research Report: OpenAI Agents SDK (JavaScript/TypeScript)

**Repo:** `openai/openai-agents-js`  
**Location:** `vendor/openai-agents-js/`  
**License:** MIT  
**Language:** TypeScript

---

## What It Does

Official OpenAI framework for building **multi-agent workflows** in JavaScript/TypeScript.

Lightweight but powerful - supports tools, handoffs, guardrails, tracing, and MCP integration.

## Key Features

| Feature               | Details                              |
| --------------------- | ------------------------------------ |
| **Multi-Agent**       | Multiple agents with handoffs        |
| **Tools**             | Function calling with Zod schemas    |
| **Guardrails**        | Input/output validation              |
| **Tracing**           | Built-in debugging UI                |
| **Streaming**         | Real-time responses                  |
| **Parallelization**   | Concurrent agent/tool execution      |
| **Human-in-the-Loop** | Approval workflows                   |
| **MCP Support**       | Local MCP server integration         |
| **Realtime Voice**    | WebRTC/WebSocket voice agents        |
| **Model Agnostic**    | Vercel AI SDK adapter for non-OpenAI |

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js 22+, Deno, Bun, Cloudflare Workers
- **Dependencies:** Zod for schemas
- **Models:** OpenAI default, Vercel AI SDK for others

## Core Concepts

1. **Agents** - LLMs with instructions, tools, guardrails, handoffs
2. **Handoffs** - Transfer control between agents
3. **Guardrails** - Safety checks for input/output
4. **Tracing** - Debug and optimize workflows

## What We Can Reuse

### ✅ High Value

- **Agent framework** - Our AI orchestration layer
- **Tool patterns** - Define content machine tools as agent functions
- **MCP integration** - Connect MCP Reddit, future MCP tools
- **Human-in-the-loop** - Approval before render/publish
- **Structured outputs** - Zod schema validation

### ⚠️ Medium Value

- **Multi-agent** - Could split research/script/render agents
- **Tracing** - Debug complex content flows

### ❌ Not Needed

- **Realtime voice** - Not for content generation
- **Browser package** - Server-side for us

## How It Helps Us

1. **Agent orchestration** - Our content machine IS an agent
2. **Tool system** - Each step (research, script, TTS, render) = tool
3. **MCP bridge** - Connect to MCP Reddit for research
4. **Approval workflows** - Human review before posting
5. **Structured outputs** - Validate script format, video params

## Example Integration

```typescript
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const researchTool = tool({
  name: 'research_topic',
  description: 'Research trending topics in a niche',
  parameters: z.object({ subreddit: z.string() }),
  execute: async ({ subreddit }) => {
    // Call MCP Reddit or scrape
    return trendingTopics;
  },
});

const generateScriptTool = tool({
  name: 'generate_script',
  description: 'Generate video script from topic',
  parameters: z.object({
    topic: z.string(),
    style: z.enum(['educational', 'viral', 'story']),
  }),
  execute: async ({ topic, style }) => {
    // Call LLM for script
    return script;
  },
});

const contentAgent = new Agent({
  name: 'ContentCreator',
  instructions: `You are a short-form video content creator.
    Use research_topic to find trends, then generate_script.`,
  tools: [researchTool, generateScriptTool],
});

const result = await run(contentAgent, 'Create a viral video about SaaS pain points');
```

## Key Files to Study

```
packages/
├── agents/
│   └── src/
│       ├── agent.ts       # Core Agent class
│       ├── tool.ts        # Tool definition
│       ├── run.ts         # Execution loop
│       └── guardrails.ts  # Validation
└── agents-realtime/       # (skip - voice)

examples/
├── tools/                 # Tool examples ⭐
├── handoffs/              # Multi-agent patterns
└── mcp/                   # MCP integration ⭐
```

## Gaps / Limitations

- Node 22+ requirement (check compatibility)
- No video-specific features (expected)
- We wrap with our content domain logic

---

## Verdict

**Value: CRITICAL** - This is our **AI orchestration foundation**. The content machine agent is built on this. Tools, MCP integration, human-in-the-loop, structured outputs - all directly applicable. We're already using this pattern in VibeCoord.
