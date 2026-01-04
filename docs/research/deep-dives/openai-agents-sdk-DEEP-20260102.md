# Deep Dive: OpenAI Agents SDK - Agent Orchestration Framework

**Date:** 2026-01-02  
**Repo:** `vendor/openai-agents-js/`  
**Priority:** ⭐ HIGH - Agent Architecture Patterns

---

## Executive Summary

The **OpenAI Agents SDK** (JavaScript/TypeScript) provides a framework for building AI agents with tool calling, handoffs between agents, guardrails, and MCP integration. This is OpenAI's official approach to agent orchestration.

### Why This Matters

- ✅ **Official OpenAI agent framework** - Well-designed patterns
- ✅ **MCP integration** - Native MCP server support
- ✅ **Handoffs** - Agent-to-agent delegation
- ✅ **Guardrails** - Input/output validation
- ✅ **Tool system** - Structured tool definitions
- ✅ **TypeScript native** - Full type safety

---

## Package Structure

```
packages/
├── agents/              # Main package (re-exports)
├── agents-core/         # Core agent functionality
├── agents-extensions/   # Additional extensions
├── agents-openai/       # OpenAI model integration
└── agents-realtime/     # Real-time voice support
```

---

## Core Concepts

### 1. Agent Definition

```typescript
import { Agent } from '@openai/agents';
import { z } from 'zod';

const agent = new Agent({
  name: 'ContentPlanner',
  
  // System prompt
  instructions: `You are a content planning assistant. 
    Help users plan short-form video content.`,
  
  // Optional: Dynamic instructions
  instructions: async (runContext, agent) => {
    const trends = await fetchTrends();
    return `You are a content planner. Current trends: ${trends}`;
  },
  
  // Human-readable description (for handoffs)
  handoffDescription: 'Plans video content based on trends',
  
  // Model configuration
  model: 'gpt-4.1',
  modelSettings: {
    temperature: 0.7,
  },
  
  // Tools the agent can use
  tools: [searchTrendsTool, generateScriptTool],
  
  // Sub-agents for delegation
  handoffs: [scriptWriterAgent, researchAgent],
  
  // Output type (Zod schema or 'text')
  outputType: z.object({
    topic: z.string(),
    script: z.string(),
    assets: z.array(z.string()),
  }),
});
```

### 2. Tools

```typescript
import { tool } from '@openai/agents';
import { z } from 'zod';

const searchTrendsTool = tool({
  name: 'search_trends',
  description: 'Search for trending topics on social media',
  parameters: z.object({
    platform: z.enum(['tiktok', 'youtube', 'instagram']),
    category: z.string().optional(),
    limit: z.number().default(10),
  }),
  strict: true,
  
  execute: async (args, context) => {
    const trends = await trendService.search(args);
    return JSON.stringify(trends);
  },
});

// Tool with approval requirement
const publishTool = tool({
  name: 'publish_video',
  description: 'Publish a video to a platform',
  parameters: z.object({
    videoId: z.string(),
    platform: z.string(),
  }),
  needsApproval: true, // Requires user confirmation
  execute: async (args) => {
    // ...
  },
});

// Tool with dynamic enablement
const adminTool = tool({
  name: 'admin_action',
  isEnabled: async (runContext, agent) => {
    return runContext.context.userRole === 'admin';
  },
  execute: async (args) => {
    // ...
  },
});
```

### 3. Handoffs

```typescript
import { Agent, Handoff } from '@openai/agents';

// Simple handoff (to another agent)
const plannerAgent = new Agent({
  name: 'Planner',
  handoffs: [scriptWriterAgent, researchAgent],
  // ...
});

// Custom handoff with transformation
const customHandoff: Handoff = {
  name: 'to_script_writer',
  description: 'Hand off to script writer for detailed script',
  agent: scriptWriterAgent,
  
  // Transform input before handoff
  inputTransform: async (input, context) => {
    return `Write a script for: ${input}`;
  },
  
  // Check if handoff is available
  isEnabled: async ({ runContext, agent }) => {
    return runContext.context.hasScriptWriterAccess;
  },
};
```

### 4. Guardrails

```typescript
import { Agent, InputGuardrail, OutputGuardrail } from '@openai/agents';

// Input guardrail - runs before agent
const contentFilter: InputGuardrail = {
  name: 'content_filter',
  runInParallel: true, // Don't block
  execute: async (input, context) => {
    const isSafe = await moderationCheck(input);
    if (!isSafe) {
      return { blocked: true, reason: 'Content policy violation' };
    }
    return { blocked: false };
  },
};

// Output guardrail - runs on final output
const outputValidator: OutputGuardrail = {
  name: 'output_validator',
  execute: async (output, context) => {
    // Validate output meets requirements
    return { valid: true };
  },
};

const agent = new Agent({
  name: 'SafeAgent',
  inputGuardrails: [contentFilter],
  outputGuardrails: [outputValidator],
  // ...
});
```

---

## Running Agents

### Basic Run

```typescript
import { Runner } from '@openai/agents';

const runner = new Runner();

// Simple run
const result = await runner.run(agent, 'Create a video about coding tips');

console.log(result.finalOutput);
```

### Streaming Run

```typescript
const result = await runner.run(agent, 'Create a video about coding tips', {
  stream: true,
});

// Consume stream events
for await (const event of result) {
  switch (event.type) {
    case 'tool_call':
      console.log('Calling tool:', event.toolName);
      break;
    case 'agent_output':
      console.log('Agent says:', event.output);
      break;
    case 'handoff':
      console.log('Handing off to:', event.targetAgent);
      break;
  }
}

// Wait for completion
const finalResult = await result.completed;
```

### With Context

```typescript
interface MyContext {
  userId: string;
  preferences: UserPreferences;
  trends: Trend[];
}

const runner = new Runner();

const result = await runner.run(agent, 'Create a video', {
  context: {
    userId: '123',
    preferences: userPrefs,
    trends: currentTrends,
  } as MyContext,
});
```

---

## MCP Integration

```typescript
import { Agent, MCPServer } from '@openai/agents';

// Create MCP server connection
const trendServer = new MCPServer({
  name: 'TrendServer',
  url: 'http://localhost:8080/mcp',
  // or: transport: 'stdio', command: 'node', args: ['trend-server.js']
});

// Connect before use
await trendServer.connect();

const agent = new Agent({
  name: 'TrendAgent',
  mcpServers: [trendServer], // Tools from MCP servers
  // ...
});

// Run agent (will use MCP tools)
const result = await runner.run(agent, 'Find trending topics');

// Cleanup
await trendServer.cleanup();
```

---

## Tool Use Behavior

```typescript
const agent = new Agent({
  name: 'MyAgent',
  
  // Option 1: Run LLM again after tools (default)
  toolUseBehavior: 'run_llm_again',
  
  // Option 2: Stop on first tool
  toolUseBehavior: 'stop_on_first_tool',
  
  // Option 3: Stop on specific tools
  toolUseBehavior: {
    stopAtToolNames: ['generate_video', 'publish'],
  },
  
  // Option 4: Custom function
  toolUseBehavior: async (context, toolResults) => {
    if (toolResults.some(r => r.name === 'final_answer')) {
      return {
        isFinalOutput: true,
        finalOutput: toolResults.find(r => r.name === 'final_answer').output,
      };
    }
    return { isFinalOutput: false };
  },
});
```

---

## Agent as Tool

```typescript
// Convert an agent into a tool for another agent
const researchTool = researchAgent.asTool({
  toolName: 'research',
  toolDescription: 'Research a topic in depth',
  
  // Custom output extraction
  customOutputExtractor: async (result) => {
    return result.finalOutput.summary;
  },
  
  // Approval requirement
  needsApproval: true,
  
  // Stream events from nested run
  onStream: (event) => {
    console.log('Nested agent event:', event);
  },
});

const orchestratorAgent = new Agent({
  name: 'Orchestrator',
  tools: [researchTool, writeTool, publishTool],
});
```

---

## Lifecycle Hooks

```typescript
class ContentAgent extends Agent {
  // Before agent runs
  async onAgentStart(context) {
    console.log('Agent starting...');
  }
  
  // After each LLM call
  async onModelResponse(response, context) {
    console.log('Model responded');
  }
  
  // Before tool execution
  async onToolStart(toolName, args, context) {
    console.log(`Calling ${toolName}...`);
  }
  
  // After tool execution
  async onToolEnd(toolName, result, context) {
    console.log(`${toolName} returned:`, result);
  }
  
  // On handoff
  async onHandoff(targetAgent, context) {
    console.log(`Handing off to ${targetAgent.name}`);
  }
  
  // On completion
  async onAgentEnd(result, context) {
    console.log('Agent completed');
  }
}
```

---

## Integration Pattern for content-machine

### Content Pipeline Agents

```typescript
// src/agents/content-pipeline.ts
import { Agent, Runner, tool } from '@openai/agents';
import { z } from 'zod';

// Research Agent
const researchAgent = new Agent({
  name: 'ResearchAgent',
  instructions: `Research trending topics and validate content ideas.
    Focus on topics suitable for short-form video.`,
  handoffDescription: 'Researches trends and validates ideas',
  tools: [searchRedditTool, searchYouTubeTool, analyzeViralityTool],
  outputType: z.object({
    topic: z.string(),
    viralityScore: z.number(),
    keyPoints: z.array(z.string()),
    suggestedHooks: z.array(z.string()),
  }),
});

// Script Writer Agent
const scriptAgent = new Agent({
  name: 'ScriptWriter',
  instructions: `Write engaging scripts for short-form video.
    Scripts should be 30-60 seconds when read aloud.
    Include a hook, key points, and call to action.`,
  handoffDescription: 'Writes video scripts from research',
  tools: [checkReadingTimeTool],
  outputType: z.object({
    script: z.string(),
    estimatedDuration: z.number(),
    speakerNotes: z.string(),
  }),
});

// Asset Planner Agent
const assetAgent = new Agent({
  name: 'AssetPlanner',
  instructions: `Plan visual assets for video scenes.
    Generate search queries for stock footage and images.`,
  handoffDescription: 'Plans visual assets for video',
  tools: [searchPexelsTool, searchUnsplashTool],
  outputType: z.object({
    scenes: z.array(z.object({
      startTime: z.number(),
      endTime: z.number(),
      description: z.string(),
      assetUrl: z.string(),
    })),
  }),
});

// Orchestrator Agent
const orchestratorAgent = new Agent({
  name: 'ContentOrchestrator',
  instructions: `You orchestrate content creation for short-form video.
    Use the research agent to validate topics.
    Use the script writer to create the script.
    Use the asset planner to plan visuals.`,
  handoffs: [researchAgent, scriptAgent, assetAgent],
  outputType: z.object({
    topic: z.string(),
    script: z.string(),
    assets: z.array(z.object({
      time: z.number(),
      url: z.string(),
    })),
    metadata: z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
    }),
  }),
});

// Run the pipeline
export async function createContent(request: ContentRequest) {
  const runner = new Runner();
  
  const result = await runner.run(orchestratorAgent, request.prompt, {
    context: {
      platform: request.platform,
      style: request.style,
      constraints: request.constraints,
    },
    stream: true,
  });
  
  // Handle streaming events
  for await (const event of result) {
    if (event.type === 'handoff') {
      console.log(`Phase: ${event.targetAgent}`);
    }
  }
  
  return result.completed.finalOutput;
}
```

### Integration with MCP Servers

```typescript
// src/agents/with-mcp.ts
import { Agent, MCPServer, Runner } from '@openai/agents';

export async function createAgentWithMCP() {
  // Connect to our custom MCP servers
  const trendServer = new MCPServer({
    name: 'TrendResearch',
    url: 'http://localhost:8081/mcp',
  });
  
  const videoServer = new MCPServer({
    name: 'VideoGeneration',
    url: 'http://localhost:8082/mcp',
  });
  
  await Promise.all([
    trendServer.connect(),
    videoServer.connect(),
  ]);
  
  const agent = new Agent({
    name: 'ContentMachine',
    instructions: 'Create short-form video content.',
    mcpServers: [trendServer, videoServer],
  });
  
  return {
    agent,
    cleanup: async () => {
      await trendServer.cleanup();
      await videoServer.cleanup();
    },
  };
}
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **Agent architecture** - Agent/Tool/Handoff pattern
2. **Guardrails** - Input/output validation
3. **MCP integration** - Native support
4. **Streaming** - Real-time event handling
5. **Type safety** - Full TypeScript support

### Pattern Extraction 🔧

1. **Tool use behavior** - Flexible tool handling strategies
2. **Agent as tool** - Compose agents hierarchically
3. **Lifecycle hooks** - Observability and logging
4. **Context passing** - State management across runs

---

## Comparison: OpenAI Agents vs LangGraph

| Feature | OpenAI Agents SDK | LangGraph |
|---------|------------------|-----------|
| Language | TypeScript | Python |
| MCP Support | Native | Via integration |
| Handoffs | Built-in | Manual |
| Guardrails | Built-in | Custom |
| Streaming | Native | Native |
| Ecosystem | OpenAI | LangChain |

---

## Lessons Learned

1. **Handoffs enable modularity** - Separate concerns into agents
2. **Guardrails are essential** - Validate inputs/outputs
3. **MCP is first-class** - Tool servers are native
4. **Agent-as-tool enables composition** - Hierarchical agents
5. **Streaming enables UX** - Real-time feedback

---

**Status:** Research complete. OpenAI Agents SDK provides excellent patterns for agent orchestration.
