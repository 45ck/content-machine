# OpenAI Agents SDK & Research Systems Deep Dive

**Date:** 2026-01-02
**Status:** Research Complete
**Category:** Agent Frameworks & Research Automation

---

## Executive Summary

This document provides comprehensive analysis of the OpenAI Agents JavaScript SDK, research automation systems (GPT Researcher, Open Deep Research), and their integration patterns for content-machine. These tools represent the cutting edge of agent orchestration for automated research and content planning.

---

## 1. OpenAI Agents SDK (JavaScript/TypeScript)

### 1.1 Overview

**Repository:** `vendor/openai-agents-js/`  
**Package:** `@openai/agents`  
**Type:** Official OpenAI multi-agent framework  
**Language:** TypeScript  
**Runtime:** Node.js 22+, Deno, Bun

The OpenAI Agents SDK is a lightweight yet powerful framework for building multi-agent workflows. It's provider-agnostic, supporting OpenAI and other LLM providers through adapters.

### 1.2 Core Concepts

| Concept        | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| **Agents**     | LLMs configured with instructions, tools, guardrails, and handoffs |
| **Handoffs**   | Specialized tool calls for transferring control between agents     |
| **Guardrails** | Configurable safety checks for input/output validation             |
| **Tracing**    | Built-in tracking for debugging and optimization                   |
| **Sessions**   | Memory management across conversation turns                        |

### 1.3 Supported Features

```
✅ Multi-Agent Workflows    ✅ Tool Integration
✅ Agent Handoffs           ✅ Structured Outputs (Zod)
✅ Streaming Responses      ✅ Tracing & Debugging
✅ Input/Output Guardrails  ✅ Parallelization
✅ Human-in-the-Loop        ✅ Realtime Voice Agents
✅ Local MCP Server Support ✅ Non-OpenAI Model Support
⏳ Long-running Functions   ⏳ Voice Pipeline (Future)
```

### 1.4 Basic Agent Pattern

```typescript
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// Define a tool with Zod schema
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  execute: async (input) => {
    return `The weather in ${input.city} is sunny`;
  },
});

// Create an agent
const agent = new Agent({
  name: 'Weather Agent',
  instructions: 'You are a helpful weather assistant',
  tools: [getWeatherTool],
});

// Run the agent
const result = await run(agent, 'What is the weather in Tokyo?');
console.log(result.finalOutput);
```

### 1.5 Agent Handoffs Pattern

```typescript
import { Agent, run } from '@openai/agents';

// Specialized agents
const spanishAgent = new Agent({
  name: 'spanish_agent',
  instructions: "Translate the user's message to Spanish",
  handoffDescription: 'Use for Spanish translations',
});

const frenchAgent = new Agent({
  name: 'french_agent',
  instructions: "Translate the user's message to French",
  handoffDescription: 'Use for French translations',
});

// Orchestrator agent with handoffs
const orchestratorAgent = Agent.create({
  name: 'orchestrator',
  instructions: 'Route translation requests to appropriate agents',
  handoffs: [spanishAgent, frenchAgent],
});

const result = await run(orchestratorAgent, 'Translate "hello" to Spanish');
```

### 1.6 Agents-as-Tools Pattern

```typescript
const orchestratorAgent = new Agent({
  name: 'orchestrator_agent',
  instructions: 'Use tools to translate messages',
  tools: [
    spanishAgent.asTool({
      toolName: 'translate_to_spanish',
      toolDescription: 'Translate to Spanish',
      runConfig: { model: 'gpt-5' },
      runOptions: { maxTurns: 3 },
    }),
    frenchAgent.asTool({
      toolName: 'translate_to_french',
      toolDescription: 'Translate to French',
    }),
  ],
});
```

### 1.7 Structured Outputs with Zod

```typescript
import { z } from 'zod';

const reportSchema = z.object({
  shortSummary: z.string().describe('A 2-3 sentence summary'),
  markdownReport: z.string().describe('The full report'),
  followUpQuestions: z.array(z.string()).describe('Suggested topics'),
});

const writerAgent = new Agent({
  name: 'WriterAgent',
  instructions: 'Write comprehensive research reports',
  model: 'o3-mini',
  outputType: reportSchema,
});

// Result is typed and validated
const result = await run(writerAgent, 'Research AI trends');
console.log(result.finalOutput.markdownReport);
```

### 1.8 MCP Integration

```typescript
import { Agent, run, hostedMcpTool } from '@openai/agents';

// Hosted MCP server
const agent = new Agent({
  name: 'MCP Assistant',
  instructions: 'Use MCP tools to answer questions',
  tools: [
    hostedMcpTool({
      serverLabel: 'gitmcp',
      serverUrl: 'https://gitmcp.io/openai/codex',
    }),
  ],
});

// Local MCP server with filesystem access
import { MCPServerStdio } from '@openai/agents';

const mcpServer = new MCPServerStdio({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', './sample_files'],
});

const agent = new Agent({
  name: 'File Agent',
  mcpServers: [mcpServer],
});
```

### 1.9 Memory Sessions

```typescript
import { Agent, run, MemorySession, OpenAIConversationsSession } from '@openai/agents';

// Local memory session
const session = new MemorySession();

let result = await run(agent, 'What is the capital of France?', { session });
// Paris

result = await run(agent, 'What is its population?', { session });
// Context maintained: "its" refers to Paris

// OpenAI-managed conversations
const oaiSession = new OpenAIConversationsSession();
await run(agent, 'Remember: my name is Alice', { session: oaiSession });
await run(agent, 'What is my name?', { session: oaiSession }); // Alice
```

### 1.10 Parallel Execution & Best-of-N

```typescript
import { Agent, run, extractAllTextOutput } from '@openai/agents';

const translatorAgent = new Agent({
  name: 'translator',
  instructions: 'Translate to Spanish',
});

const pickerAgent = new Agent({
  name: 'picker',
  instructions: 'Pick the best translation',
});

// Run 3 translations in parallel
const [res1, res2, res3] = await Promise.all([
  run(translatorAgent, msg),
  run(translatorAgent, msg),
  run(translatorAgent, msg),
]);

// Pick the best one
const outputs = [res1, res2, res3].map((r) => extractAllTextOutput(r.newItems));
const best = await run(pickerAgent, `Choose best: ${outputs.join('\n\n')}`);
```

### 1.11 Research Bot Pattern

The SDK includes a complete research bot example that's highly relevant for content-machine:

```typescript
// agents.ts
export const plannerAgent = new Agent({
  name: 'PlannerAgent',
  instructions: 'Generate 5-20 web searches for the query',
  model: 'gpt-5.2',
  outputType: z.object({
    searches: z.array(
      z.object({
        reason: z.string(),
        query: z.string(),
      })
    ),
  }),
});

export const searchAgent = new Agent({
  name: 'SearchAgent',
  instructions: 'Search and summarize in 2-3 paragraphs',
  tools: [webSearchTool()],
  modelSettings: { toolChoice: 'required' },
});

export const writerAgent = new Agent({
  name: 'WriterAgent',
  instructions: 'Write cohesive 5-10 page report',
  model: 'o3-mini',
  outputType: reportSchema,
});

// manager.ts
class ResearchManager {
  async run(query: string) {
    const searchPlan = await this._planSearches(query);
    const searchResults = await this._performSearches(searchPlan);
    const report = await this._writeReport(query, searchResults);
    return report;
  }

  async _performSearches(plan) {
    // Parallel execution
    const tasks = plan.searches.map((item) => this._search(item));
    return Promise.all(tasks);
  }
}
```

### 1.12 Guardrails Pattern

```typescript
import { Agent, run, InputGuardrail, OutputGuardrail } from '@openai/agents';

// Input guardrail
const inputGuard: InputGuardrail = async (input) => {
  if (input.includes('harmful')) {
    return { tripwire: true, message: 'Harmful content detected' };
  }
  return { tripwire: false };
};

// Output guardrail
const outputGuard: OutputGuardrail = async (output) => {
  if (output.includes('secret')) {
    return { tripwire: true, message: 'Sensitive info detected' };
  }
  return { tripwire: false };
};

const agent = new Agent({
  name: 'Safe Agent',
  instructions: '...',
  inputGuardrails: [inputGuard],
  outputGuardrails: [outputGuard],
});
```

---

## 2. GPT Researcher

### 2.1 Overview

**Repository:** `vendor/research/gpt-researcher/`  
**Package:** `gpt-researcher` (PyPI)  
**Type:** Deep research agent  
**Language:** Python

GPT Researcher is an open deep research agent for web and local research. It produces detailed, factual, unbiased reports with citations.

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GPT Researcher Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Query → [Planner Agent] → Research Questions               │
│                 ↓                                           │
│         [Crawler Agents] → Gather Information (parallel)    │
│                 ↓                                           │
│         [Summarizer] → Filter & Aggregate                   │
│                 ↓                                           │
│         [Publisher] → Final Research Report                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Key Features

- **Detailed Reports:** 2,000+ word factual reports
- **Multi-Source:** Aggregates 20+ sources for objectivity
- **Smart Images:** Image scraping and filtering
- **JavaScript Scraping:** Full browser rendering for JS sites
- **Memory & Context:** Maintains research context
- **Export Formats:** PDF, Word, Markdown
- **MCP Support:** Integrate with MCP servers for specialized data

### 2.4 Basic Usage

```python
from gpt_researcher import GPTResearcher

researcher = GPTResearcher(query="Why is Nvidia stock going up?")
research_result = await researcher.conduct_research()
report = await researcher.write_report()
```

### 2.5 MCP Integration

```python
import os

os.environ["RETRIEVER"] = "tavily,mcp"  # Hybrid web + MCP

researcher = GPTResearcher(
    query="What are the top open source web research agents?",
    mcp_configs=[
        {
            "name": "github",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.getenv("GITHUB_TOKEN")}
        }
    ]
)

research_result = await researcher.conduct_research()
report = await researcher.write_report()
```

### 2.6 Deep Research Mode

Tree-like exploration with configurable depth and breadth:

```
🌳 Deep Research Features:
- Tree-like exploration pattern
- Configurable depth and breadth
- Concurrent processing
- Smart context management
- ~5 minutes per research
- ~$0.4 per research (o3-mini)
```

---

## 3. Open Deep Research

### 3.1 Overview

**Repository:** `vendor/research/open-deep-research/`  
**Type:** LangGraph-based deep research agent  
**Language:** Python  
**Framework:** LangGraph

Open Deep Research is a fully configurable, open source deep research agent that achieves competitive results on the Deep Research Bench leaderboard.

### 3.2 Architecture

```
┌───────────────────────────────────────────────────────────┐
│                Open Deep Research Flow                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Input → [Summarization] → Summarize search results       │
│               ↓                                           │
│         [Research Agent] → Search & gather                │
│               ↓                                           │
│         [Compression] → Compress findings                 │
│               ↓                                           │
│         [Final Report] → Generate report                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 3.3 Configurable Models

| Stage         | Default Model | Purpose                    |
| ------------- | ------------- | -------------------------- |
| Summarization | gpt-4.1-mini  | Summarize search results   |
| Research      | gpt-4.1       | Power search agent         |
| Compression   | gpt-4.1       | Compress research findings |
| Final Report  | gpt-4.1       | Write final report         |

### 3.4 Search API Support

- **Tavily** (default)
- **MCP** (configurable)
- **Native web search** (Anthropic, OpenAI)
- Custom search APIs

### 3.5 Performance Results

| Model Config      | RACE Score | Total Cost |
| ----------------- | ---------- | ---------- |
| GPT-5             | 0.4943     | -          |
| Claude Sonnet 4   | 0.4401     | $187       |
| gpt-4.1 (default) | 0.4309     | $46        |

### 3.6 Running Open Deep Research

```bash
# Install and run with LangGraph
uvx --from "langgraph-cli[inmem]" langgraph dev --allow-blocking
```

---

## 4. Integration Patterns for content-machine

### 4.1 Trend Research Pipeline

```typescript
// Using OpenAI Agents SDK for trend research
import { Agent, run, tool, hostedMcpTool } from '@openai/agents';
import { z } from 'zod';

// Reddit MCP for trend detection
const redditMcpTool = hostedMcpTool({
  serverLabel: 'reddit',
  serverUrl: 'http://localhost:3000/reddit',
});

// Trend analysis output schema
const trendSchema = z.object({
  trending_topics: z.array(
    z.object({
      topic: z.string(),
      subreddit: z.string(),
      score: z.number(),
      relevance: z.string(),
    })
  ),
  recommended_topics: z.array(z.string()),
});

const trendAgent = new Agent({
  name: 'TrendAgent',
  instructions: `
    Analyze trending content on Reddit for developer tools and SaaS.
    Focus on topics with high engagement and technical relevance.
    Return structured trend analysis.
  `,
  tools: [redditMcpTool],
  outputType: trendSchema,
});

// Run trend analysis
const trends = await run(trendAgent, 'Find trending AI developer tool topics');
```

### 4.2 Script Generation Pipeline

```typescript
const scriptSchema = z.object({
  hook: z.string().describe('Attention-grabbing first 3 seconds'),
  main_points: z.array(z.string()).describe('Key talking points'),
  call_to_action: z.string().describe('Ending CTA'),
  visual_cues: z.array(
    z.object({
      timestamp: z.string(),
      description: z.string(),
    })
  ),
  duration_estimate: z.number().describe('Seconds'),
});

const scriptAgent = new Agent({
  name: 'ScriptWriter',
  instructions: `
    Write engaging short-form video scripts for TikTok/Reels/Shorts.
    Focus on developer tools and AI products.
    Scripts should be 30-60 seconds when spoken.
    Include visual cues for product demos.
  `,
  outputType: scriptSchema,
});

const script = await run(
  scriptAgent,
  `
  Create a script about: ${trends.recommended_topics[0]}
  Target audience: Developers
  Tone: Excited but authentic
`
);
```

### 4.3 Multi-Agent Video Production Flow

```typescript
// Planner → Script → Visual → Audio → Render pipeline
const plannerAgent = new Agent({
  name: 'ContentPlanner',
  instructions: 'Plan video content based on trends',
  outputType: contentPlanSchema,
});

const scriptAgent = new Agent({
  name: 'ScriptWriter',
  instructions: 'Write engaging scripts',
  outputType: scriptSchema,
});

const visualAgent = new Agent({
  name: 'VisualPlanner',
  instructions: 'Plan visual sequence and product shots',
  outputType: visualPlanSchema,
});

// Orchestrator coordinates the pipeline
const orchestrator = new Agent({
  name: 'VideoOrchestrator',
  instructions: 'Coordinate video production pipeline',
  tools: [
    plannerAgent.asTool({ toolName: 'plan_content' }),
    scriptAgent.asTool({ toolName: 'write_script' }),
    visualAgent.asTool({ toolName: 'plan_visuals' }),
  ],
});

const video = await run(
  orchestrator,
  `
  Create a TikTok video about: ${topic}
  Product: ${productName}
  Key features: ${features.join(', ')}
`
);
```

### 4.4 Research → Content Pipeline

```typescript
import { ResearchManager } from './research-bot/manager';

class ContentPipeline {
  private researchManager: ResearchManager;
  private contentAgents: ContentAgents;

  async generateVideo(topic: string) {
    // Step 1: Deep research on topic
    const research = await this.researchManager.run(topic);

    // Step 2: Extract key points for video
    const keyPoints = await run(this.contentAgents.extractor, {
      research: research.markdownReport,
      target_duration: 45, // seconds
    });

    // Step 3: Generate script
    const script = await run(this.contentAgents.scriptWriter, {
      key_points: keyPoints,
      style: 'educational-entertaining',
    });

    // Step 4: Plan visuals
    const visuals = await run(this.contentAgents.visualPlanner, {
      script: script,
      product_screenshots: true,
    });

    return { script, visuals, research };
  }
}
```

---

## 5. Framework Comparison

### 5.1 OpenAI Agents SDK vs Pydantic AI vs LangGraph

| Feature           | OpenAI Agents SDK | Pydantic AI     | LangGraph     |
| ----------------- | ----------------- | --------------- | ------------- |
| Language          | TypeScript        | Python          | Python        |
| Structured Output | Zod schemas       | Pydantic models | Custom        |
| MCP Support       | ✅ Native         | ✅ Native       | Via tools     |
| Handoffs          | ✅ First-class    | ✅ Delegation   | Via edges     |
| Tracing           | ✅ Built-in       | ✅ Logfire      | ✅ LangSmith  |
| Memory            | Sessions          | Deps injection  | Checkpointing |
| Voice/Realtime    | ✅ WebRTC         | ❌              | ❌            |
| Streaming         | ✅                | ✅              | ✅            |
| Parallelization   | ✅                | ✅              | ✅            |

### 5.2 Recommended Stack for content-machine

**Primary Agent Framework:** OpenAI Agents SDK (TypeScript)

- Native TypeScript aligns with Remotion
- Excellent MCP support
- Built-in tracing
- Research bot pattern fits our needs

**Secondary (Python Services):**

- Pydantic AI for typed Python agents
- LangGraph for complex stateful workflows

---

## 6. Additional Video Generators Analyzed

### 6.1 Crank

**Repository:** `vendor/Crank/`  
**Language:** Python (uv)  
**Key Feature:** Plugin-based background video system

```python
# Plugin architecture
class BackgroundVideoPlugin(ABC):
    @abstractmethod
    def get_media(self, data: Dict[str, Any]) -> Path:
        """Generate background video from pipeline data"""
        pass

# Orchestrator coordinates pipeline
class Orchestrator:
    def __init__(self, preset, plugin, gemini, editor, caption, uploader):
        self.plugin = plugin
        self.gemini = gemini  # For TTS
        self.editor = editor  # FFmpeg assembly
        self.caption = caption  # Whisper captions
        self.uploader = uploader  # YouTube upload
```

### 6.2 AutoTube

**Repository:** `vendor/Autotube/`  
**Type:** n8n workflow automation  
**Key Feature:** Complete Docker-based pipeline

```
n8n → Ollama → Python API → YouTube
  ↓      ↓          ↓           ↓
DB     LLaMA    AI Images    Upload
       3.1      + Video
```

### 6.3 OBrainRot

**Repository:** `vendor/OBrainRot/`  
**Type:** Reddit-to-video generator  
**Key Feature:** Forced alignment for captions

- Coqui xTTSv2 for TTS
- wav2vec2 for forced alignment
- VADER + LLaMA for sentiment filtering
- Custom image overlay system

### 6.4 VideoGraphAI

**Repository:** `vendor/VideoGraphAI/`  
**Type:** Streamlit-based generator  
**Key Feature:** Graph-based agent orchestration

- Tavily Search for research
- TogetherAI FLUX.schnell for images
- F5-TTS for voiceovers
- Gentle for subtitle alignment

---

## 7. Key Patterns for content-machine

### 7.1 Agent Orchestration Pattern

```typescript
// Recommended pattern from OpenAI Agents SDK examples
class VideoProductionManager {
  private runner: Runner;
  private agents: {
    planner: Agent;
    researcher: Agent;
    scriptWriter: Agent;
    visualPlanner: Agent;
    reviewer: Agent;
  };

  async produce(topic: string): Promise<VideoSpec> {
    return await withTrace('Video Production', async () => {
      // 1. Plan content
      const plan = await this.runner.run(this.agents.planner, topic);

      // 2. Research in parallel
      const researchTasks = plan.searches.map((q) => this.runner.run(this.agents.researcher, q));
      const research = await Promise.all(researchTasks);

      // 3. Write script
      const script = await this.runner.run(this.agents.scriptWriter, {
        topic,
        research,
      });

      // 4. Plan visuals
      const visuals = await this.runner.run(this.agents.visualPlanner, script);

      // 5. Review & refine
      const review = await this.runner.run(this.agents.reviewer, {
        script,
        visuals,
      });

      return { script: review.script, visuals: review.visuals };
    });
  }
}
```

### 7.2 MCP Server Integration Pattern

```typescript
// content-machine MCP configuration
const mcpServers = {
  reddit: new MCPServerStdio({
    command: 'npx',
    args: ['reddit-mcp-server'],
    env: { REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID },
  }),
  qdrant: new MCPServerStdio({
    command: 'uvx',
    args: ['mcp-server-qdrant'],
    env: { QDRANT_URL: 'http://localhost:6333' },
  }),
  playwright: new MCPServerStdio({
    command: 'npx',
    args: ['@playwright/mcp-server'],
  }),
};

const agent = new Agent({
  name: 'ContentMachine',
  instructions: '...',
  mcpServers: Object.values(mcpServers),
});
```

---

## 8. Recommendations

### 8.1 Primary Stack

| Component         | Recommendation         | Reason                             |
| ----------------- | ---------------------- | ---------------------------------- |
| Agent Framework   | OpenAI Agents SDK      | TypeScript, MCP, research patterns |
| Research          | GPT Researcher         | Proven deep research               |
| Structured Output | Zod                    | TypeScript native                  |
| Tracing           | Built-in + Langfuse    | Comprehensive observability        |
| Memory            | MemorySession + Qdrant | Local + semantic                   |

### 8.2 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 content-machine Agent Layer                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Trend Agent] ─┬─→ [Research Agent] ─→ [Script Agent]     │
│       ↓         │         ↓                  ↓              │
│  Reddit MCP     │    Web Search         Structured          │
│  YouTube MCP    │    GPT Researcher     Output (Zod)        │
│                 │                                           │
│                 └─→ [Visual Agent] ─→ [Render Pipeline]     │
│                          ↓                  ↓               │
│                     Playwright         Remotion             │
│                     Screenshot         Video                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. References

- OpenAI Agents SDK: https://github.com/openai/openai-agents-js
- GPT Researcher: https://github.com/assafelovic/gpt-researcher
- Open Deep Research: https://github.com/langchain-ai/open_deep_research
- Deep Research Bench: https://huggingface.co/spaces/Ayanami0730/DeepResearch-Leaderboard

---

**Next Steps:**

1. Implement TrendAgent with Reddit MCP integration
2. Create ScriptAgent with structured Zod schemas
3. Build VisualAgent for Playwright capture coordination
4. Integrate with Remotion render pipeline
5. Add Langfuse tracing for observability
