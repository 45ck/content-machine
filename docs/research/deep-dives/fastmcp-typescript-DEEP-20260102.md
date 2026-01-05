# Deep Dive: FastMCP (TypeScript) - MCP Server Framework

**Date:** 2026-01-02  
**Repo:** `vendor/mcp/fastmcp-typescript/`  
**Priority:** ⭐ CRITICAL - MCP Server Infrastructure

---

## Executive Summary

**FastMCP** is a TypeScript framework for building Model Context Protocol (MCP) servers. It provides a high-level, opinionated API on top of the official MCP SDK, handling connection management, tool registration, authentication, and transport (HTTP streaming, SSE, stdio).

### Why This Matters

- ✅ **Simple tool/resource/prompt definition** - Declarative API
- ✅ **Multiple transports** - HTTP streaming, SSE, stdio
- ✅ **Authentication** - Session-based auth support
- ✅ **OAuth proxy** - Built-in OAuth 2.1 support
- ✅ **TypeScript native** - Full type safety
- ✅ **Standard Schema** - Zod, ArkType, Valibot support

---

## Quick Start

```typescript
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

const server = new FastMCP({
  name: 'My Server',
  version: '1.0.0',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.start({
  transportType: 'httpStream',
  httpStream: { port: 8080 },
});
```

---

## Core Concepts

### 1. Tools

```typescript
server.addTool({
  name: 'fetch-content',
  description: 'Fetch content from a URL',
  parameters: z.object({
    url: z.string(),
  }),
  annotations: {
    title: 'Web Content Fetcher',
    readOnlyHint: true,
    openWorldHint: true,
  },
  execute: async (args, context) => {
    // Log during execution
    context.log.info('Fetching...', { url: args.url });

    // Report progress
    await context.reportProgress({ progress: 50, total: 100 });

    return 'Content here';
  },
});
```

### 2. Resources

```typescript
server.addResource({
  uri: 'file:///logs/app.log',
  name: 'Application Logs',
  mimeType: 'text/plain',
  async load() {
    return {
      text: await readLogFile(),
    };
  },
});

// Resource templates
server.addResourceTemplate({
  uriTemplate: 'file:///logs/{name}.log',
  name: 'Application Logs',
  mimeType: 'text/plain',
  arguments: [
    {
      name: 'name',
      description: 'Name of the log',
      required: true,
      complete: async (value) => {
        // Auto-completion
        return { values: ['app', 'error', 'debug'] };
      },
    },
  ],
  async load({ name }) {
    return { text: `Log content for ${name}` };
  },
});
```

### 3. Prompts

```typescript
server.addPrompt({
  name: 'git-commit',
  description: 'Generate a Git commit message',
  arguments: [
    {
      name: 'changes',
      description: 'Git diff or description of changes',
      required: true,
    },
  ],
  load: async (args) => {
    return `Generate a commit message for:\n\n${args.changes}`;
  },
});
```

---

## Transport Options

### HTTP Streaming (Recommended)

```typescript
server.start({
  transportType: 'httpStream',
  httpStream: {
    port: 8080,
    // Also exposes SSE at /sse
  },
});
```

### Stdio (for CLI tools)

```typescript
server.start({
  transportType: 'stdio',
});
```

### Stateless Mode (Serverless)

```typescript
server.start({
  transportType: 'httpStream',
  httpStream: {
    port: 8080,
    stateless: true, // No persistent sessions
  },
});
```

---

## Authentication

```typescript
const server = new FastMCP({
  name: 'My Server',
  version: '1.0.0',
  authenticate: async (request) => {
    const apiKey = request.headers['x-api-key'];

    if (apiKey !== 'secret') {
      throw new Response(null, {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    // Return session data
    return { userId: 1, role: 'admin' };
  },
});

// Access session in tools
server.addTool({
  name: 'admin-only',
  // Authorization check
  canAccess: (auth) => auth?.role === 'admin',
  execute: async (args, { session }) => {
    return `Hello, user ${session.userId}!`;
  },
});
```

---

## Response Types

### Text

```typescript
execute: async (args) => {
  return 'Hello, world!';
};
```

### Multiple Messages

```typescript
execute: async (args) => {
  return {
    content: [
      { type: 'text', text: 'First message' },
      { type: 'text', text: 'Second message' },
    ],
  };
};
```

### Image Content

```typescript
import { imageContent } from 'fastmcp';

execute: async (args) => {
  return imageContent({
    url: 'https://example.com/image.png',
    // or: path: '/path/to/image.png',
    // or: buffer: Buffer.from('...'),
  });
};
```

### Audio Content

```typescript
import { audioContent } from 'fastmcp';

execute: async (args) => {
  return audioContent({
    url: 'https://example.com/audio.mp3',
  });
};
```

### Streaming Output

```typescript
server.addTool({
  name: 'generateText',
  annotations: { streamingHint: true },
  execute: async (args, { streamContent }) => {
    await streamContent({ type: 'text', text: 'Starting...\n' });

    // Generate incrementally
    for (const word of words) {
      await streamContent({ type: 'text', text: word + ' ' });
    }

    // Return void or final content
    return;
  },
});
```

---

## Sessions

```typescript
// Access all sessions
server.sessions;

// Listen to connection events
server.on('connect', (event) => {
  console.log('Client connected:', event.session);

  // Listen to session-specific events
  event.session.on('rootsChanged', (e) => {
    console.log('Roots changed:', e.roots);
  });
});

server.on('disconnect', (event) => {
  console.log('Client disconnected:', event.session);
});
```

### Session Context in Tools

```typescript
execute: async (args, context) => {
  // Session ID (HTTP transports only)
  const sessionId = context.sessionId;

  // Request ID
  const requestId = context.requestId;

  return `Session: ${sessionId}, Request: ${requestId}`;
};
```

---

## Sampling (LLM Invocation)

```typescript
server.on('connect', (event) => {
  const session = event.session;

  // Request LLM to generate a response
  const result = await session.requestSampling({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'What files are in the current directory?',
        },
      },
    ],
    systemPrompt: 'You are a helpful file system assistant.',
    includeContext: 'thisServer',
    maxTokens: 100,
  });
});
```

---

## Error Handling

```typescript
import { UserError } from 'fastmcp';

execute: async (args) => {
  if (args.url.startsWith('https://evil.com')) {
    throw new UserError('This URL is not allowed');
  }
  return 'OK';
};
```

---

## CLI Tools

```bash
# Test with mcp-cli
npx fastmcp dev server.ts

# Inspect with MCP Inspector
npx fastmcp inspect server.ts
```

---

## Integration Pattern for content-machine

### MCP Server for Video Generation

```typescript
// src/mcp/video-server.ts
import { FastMCP, imageContent } from 'fastmcp';
import { z } from 'zod';
import { VideoGenerator } from '../render/generator';

const server = new FastMCP({
  name: 'Content Machine Video Server',
  version: '1.0.0',
});

// Tool: Generate Video
server.addTool({
  name: 'generate_video',
  description: 'Generate a short-form video from a script',
  parameters: z.object({
    script: z.string().describe('The script/narration for the video'),
    style: z.enum(['tiktok', 'reels', 'shorts']).default('tiktok'),
    language: z.string().default('en'),
  }),
  annotations: {
    streamingHint: true,
  },
  execute: async (args, { streamContent, reportProgress }) => {
    const generator = new VideoGenerator();

    await reportProgress({ progress: 0, total: 100 });
    await streamContent({ type: 'text', text: 'Starting video generation...\n' });

    // Step 1: Generate audio
    await reportProgress({ progress: 10, total: 100 });
    const audioPath = await generator.generateAudio(args.script, args.language);
    await streamContent({ type: 'text', text: 'Audio generated.\n' });

    // Step 2: Generate captions
    await reportProgress({ progress: 30, total: 100 });
    const captions = await generator.transcribe(audioPath);
    await streamContent({ type: 'text', text: 'Captions generated.\n' });

    // Step 3: Source assets
    await reportProgress({ progress: 50, total: 100 });
    const assets = await generator.sourceAssets(args.script);
    await streamContent({ type: 'text', text: 'Assets sourced.\n' });

    // Step 4: Render
    await reportProgress({ progress: 70, total: 100 });
    const videoPath = await generator.render({
      audio: audioPath,
      captions,
      assets,
      style: args.style,
    });

    await reportProgress({ progress: 100, total: 100 });

    return {
      content: [{ type: 'text', text: `Video generated: ${videoPath}` }],
    };
  },
});

// Resource: Generated Videos
server.addResourceTemplate({
  uriTemplate: 'video://generated/{id}',
  name: 'Generated Video',
  mimeType: 'video/mp4',
  arguments: [{ name: 'id', required: true }],
  async load({ id }) {
    const path = await getVideoPath(id);
    return { blob: await fs.readFile(path, 'base64') };
  },
});

// Prompt: Video Script
server.addPrompt({
  name: 'video-script',
  description: 'Generate a video script for a topic',
  arguments: [
    { name: 'topic', required: true },
    { name: 'tone', enum: ['professional', 'casual', 'humorous'] },
    { name: 'duration', description: 'Target duration in seconds' },
  ],
  load: async ({ topic, tone, duration }) => {
    return `Generate a ${tone || 'professional'} video script about "${topic}" that's approximately ${duration || 30} seconds when read aloud. Include:
- A hook in the first 3 seconds
- Clear, concise points
- A call to action at the end`;
  },
});

export default server;
```

### MCP Server for Trend Research

```typescript
// src/mcp/trend-server.ts
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

const server = new FastMCP({
  name: 'Trend Research Server',
  version: '1.0.0',
});

server.addTool({
  name: 'search_reddit_trends',
  description: 'Search Reddit for trending topics in a subreddit',
  parameters: z.object({
    subreddit: z.string(),
    timeframe: z.enum(['hour', 'day', 'week', 'month']).default('day'),
    limit: z.number().default(25),
  }),
  execute: async (args) => {
    const trends = await searchReddit(args);
    return JSON.stringify(trends, null, 2);
  },
});

server.addTool({
  name: 'analyze_trend_virality',
  description: 'Analyze the viral potential of a topic',
  parameters: z.object({
    topic: z.string(),
    platform: z.enum(['tiktok', 'youtube', 'instagram']),
  }),
  execute: async (args) => {
    const analysis = await analyzeVirality(args);
    return JSON.stringify(analysis, null, 2);
  },
});
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **FastMCP framework** - Use as-is for MCP servers
2. **Tool definition pattern** - Zod schemas + execute functions
3. **Transport flexibility** - HTTP streaming for web, stdio for CLI
4. **Session management** - Per-client state tracking

### Integration Pattern 🔧

1. Create MCP servers for each pipeline component
2. Use HTTP streaming for service-to-service communication
3. Leverage prompts for standardized LLM interactions

---

## Lessons Learned

1. **FastMCP simplifies MCP significantly** - Handles boilerplate
2. **Multiple transports are essential** - Different use cases
3. **Authentication built-in** - Security from the start
4. **Streaming output enables UX** - Real-time feedback
5. **Standard Schema = flexibility** - Use preferred validation lib

---

**Status:** Research complete. FastMCP is our MCP server framework.
