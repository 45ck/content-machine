# Deep Dive #72: OpenAI Agents SDK, Langfuse & Promptfoo

**Document ID:** DD-072  
**Date:** 2026-01-02  
**Category:** Agents, Observability, LLM Evals  
**Status:** Complete  
**Word Count:** ~6,500

---

## Executive Summary

This document covers three critical tools for building and monitoring AI applications:

1. **OpenAI Agents SDK (JS/TS)** – Multi-agent workflows with tools, handoffs, and voice
2. **Langfuse** – LLM observability, prompt management, and evaluation
3. **Promptfoo** – LLM evaluation and red teaming framework

---

## 1. OpenAI Agents SDK (JavaScript/TypeScript)

**Source:** `vendor/openai-agents-js/`  
**Creator:** OpenAI  
**License:** MIT  
**Runtime:** Node.js 22+, Deno, Bun

### 1.1 Overview

The OpenAI Agents SDK is a **lightweight yet powerful framework** for building multi-agent workflows. It is provider-agnostic, supporting OpenAI APIs and other LLM providers.

### 1.2 Core Concepts

| Concept        | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| **Agents**     | LLMs configured with instructions, tools, guardrails, and handoffs |
| **Handoffs**   | Specialized tool calls for transferring control between agents     |
| **Guardrails** | Configurable safety checks for input/output validation             |
| **Tracing**    | Built-in tracking of agent runs for debugging and optimization     |

### 1.3 Supported Features

| Feature                           | Status    |
| --------------------------------- | --------- |
| Multi-Agent Workflows             | ✅        |
| Tool Integration                  | ✅        |
| Handoffs                          | ✅        |
| Structured Outputs                | ✅        |
| Streaming Responses               | ✅        |
| Tracing & Debugging               | ✅        |
| Guardrails                        | ✅        |
| Parallelization                   | ✅        |
| Human-in-the-Loop                 | ✅        |
| Realtime Voice Agents             | ✅        |
| **Local MCP Server Support**      | ✅        |
| Browser Package                   | ✅        |
| Non-OpenAI Models (Vercel AI SDK) | ✅        |
| Long-running Functions            | 🔜 Future |
| Voice Pipeline                    | 🔜 Future |

### 1.4 Installation

```bash
npm install @openai/agents zod@3
```

### 1.5 Basic Example

```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
});

const result = await run(agent, 'Write a haiku about recursion in programming.');
console.log(result.finalOutput);
```

### 1.6 Tool Integration

```typescript
import { z } from 'zod';
import { Agent, run, tool } from '@openai/agents';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  execute: async (input) => {
    return `The weather in ${input.city} is sunny`;
  },
});

const agent = new Agent({
  name: 'Data agent',
  instructions: 'You are a data agent',
  tools: [getWeatherTool],
});

const result = await run(agent, 'What is the weather in Tokyo?');
console.log(result.finalOutput);
```

### 1.7 Multi-Agent Handoffs

```typescript
import { z } from 'zod';
import { Agent, run, tool } from '@openai/agents';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  execute: async (input) => `The weather in ${input.city} is sunny`,
});

const dataAgent = new Agent({
  name: 'Data agent',
  instructions: 'You are a data agent',
  handoffDescription: 'You know everything about the weather',
  tools: [getWeatherTool],
});

const agent = Agent.create({
  name: 'Basic test agent',
  instructions: 'You are a basic agent',
  handoffs: [dataAgent],
});

const result = await run(agent, 'What is the weather in San Francisco?');
console.log(result.finalOutput);
```

### 1.8 Realtime Voice Agent

```typescript
import { z } from 'zod';
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents-realtime';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  execute: async (input) => `The weather in ${input.city} is sunny`,
});

const agent = new RealtimeAgent({
  name: 'Data agent',
  instructions: 'You are a data agent. When asked to check weather, use the tools.',
  tools: [getWeatherTool],
});

// Browser: Get ephemeral key from backend
const { apiKey } = await fetch('/path/to/ephemeral/key').then((r) => r.json());

// Auto-configures audio I/O
const session = new RealtimeSession(agent);
await session.connect({ apiKey });
```

### 1.9 MCP Server Integration

The SDK supports **local MCP servers** for providing tools:

```typescript
import { Agent, run, mcpTools } from '@openai/agents';

const agent = new Agent({
  name: 'Content Agent',
  instructions: 'You help create video content',
  tools: await mcpTools({
    command: 'uvx',
    args: ['mcp-server-reddit'],
  }),
});
```

### 1.10 Agent Loop

The SDK executes a loop until final output:

```
1. Agent invoked with input
2. LLM returns response (may include tool calls/handoffs)
3. If final output → loop ends
4. If handoff → switch agent, continue
5. If tool calls → execute tools, continue
```

Control iterations with `maxTurns` parameter.

### 1.11 Use Cases for content-machine

| Use Case         | Implementation                          |
| ---------------- | --------------------------------------- |
| Content Planning | Multi-agent workflow for trend → script |
| Review Workflow  | Human-in-the-loop for video approval    |
| Voice Narration  | Realtime voice for preview              |
| Tool Integration | MCP servers for Reddit, capture, render |

---

## 2. Langfuse

**Source:** `vendor/observability/langfuse/`  
**Creator:** Langfuse (YC W23)  
**License:** MIT  
**Stars:** 7k+

### 2.1 Overview

Langfuse is an **open source LLM engineering platform** for developing, monitoring, evaluating, and debugging AI applications.

### 2.2 Core Features

| Feature               | Description                                           |
| --------------------- | ----------------------------------------------------- |
| **LLM Observability** | Trace LLM calls, retrieval, embeddings, agent actions |
| **Prompt Management** | Version control, central management, iteration        |
| **Evaluations**       | LLM-as-judge, user feedback, manual labeling          |
| **Datasets**          | Test sets and benchmarks                              |
| **LLM Playground**    | Test prompts directly                                 |
| **Comprehensive API** | Build custom LLMOps workflows                         |

### 2.3 Deployment Options

#### Langfuse Cloud

```bash
# Sign up at https://cloud.langfuse.com
# Generous free tier, no credit card required
```

#### Self-Host (Docker Compose)

```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up
```

#### Kubernetes (Helm)

Production-grade deployment with Helm charts.

#### Terraform Templates

Available for AWS, Azure, GCP.

### 2.4 Integrations

| Integration       | Languages     | Description            |
| ----------------- | ------------- | ---------------------- |
| **SDK**           | Python, JS/TS | Manual instrumentation |
| **OpenAI**        | Python, JS/TS | Drop-in replacement    |
| **LangChain**     | Python, JS/TS | Callback handler       |
| **LlamaIndex**    | Python        | Callback system        |
| **Haystack**      | Python        | Content tracing        |
| **LiteLLM**       | Python, JS/TS | 100+ LLMs support      |
| **Vercel AI SDK** | JS/TS         | React/Next.js/Vue      |
| **Mastra**        | JS/TS         | Agent frameworks       |

### 2.5 Python SDK Usage

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Create a trace
trace = langfuse.trace(
    name="video-generation",
    user_id="user-123",
    metadata={"topic": "AI news"}
)

# Create a span for LLM call
generation = trace.generation(
    name="script-generation",
    model="gpt-4o",
    input={"prompt": "Generate a script about..."},
)

# Log the output
generation.end(
    output={"script": "..."},
    usage={"input_tokens": 100, "output_tokens": 500}
)

# Add score
trace.score(
    name="quality",
    value=0.9,
    comment="Good script quality"
)
```

### 2.6 JavaScript SDK Usage

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse();

// Create trace
const trace = langfuse.trace({
  name: 'video-generation',
  userId: 'user-123',
});

// Create generation
const generation = trace.generation({
  name: 'script-generation',
  model: 'gpt-4o',
  input: { prompt: 'Generate a script about...' },
});

// End generation
generation.end({
  output: { script: '...' },
  usage: { inputTokens: 100, outputTokens: 500 },
});

// Add score
trace.score({
  name: 'quality',
  value: 0.9,
});

await langfuse.flushAsync();
```

### 2.7 OpenAI Drop-in Replacement

```python
from langfuse.openai import openai

# All OpenAI calls are automatically traced
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 2.8 Prompt Management

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Get prompt
prompt = langfuse.get_prompt("video-script-generator")

# Compile with variables
compiled = prompt.compile(topic="AI news", duration=60)

# Use with OpenAI
from langfuse.openai import openai

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=compiled,
    langfuse_prompt=prompt  # Links trace to prompt
)
```

### 2.9 Use Cases for content-machine

| Use Case                 | Implementation                       |
| ------------------------ | ------------------------------------ |
| **Trace Video Pipeline** | Track each step from trend → publish |
| **Prompt Versioning**    | Manage script generation prompts     |
| **Quality Evaluation**   | LLM-as-judge for video quality       |
| **Cost Tracking**        | Monitor LLM token usage              |
| **Debug Issues**         | Trace failed generations             |

---

## 3. Promptfoo

**Source:** `vendor/observability/promptfoo/`  
**Creator:** Promptfoo  
**License:** MIT

### 3.1 Overview

Promptfoo is a **developer-friendly local tool** for testing LLM applications. It supports evaluations, red teaming, and security scanning.

### 3.2 Key Features

| Feature               | Description                             |
| --------------------- | --------------------------------------- |
| **Prompt Evals**      | Test prompts with automated evaluations |
| **Red Teaming**       | Vulnerability scanning for LLM apps     |
| **Model Comparison**  | Side-by-side comparison                 |
| **CI/CD Integration** | Automated checks in pipelines           |
| **Code Scanning**     | PR reviews for LLM security             |
| **Team Sharing**      | Share results with team                 |

### 3.3 Quick Start

```bash
# Install and initialize
npx promptfoo@latest init

# Run evaluation
npx promptfoo eval
```

### 3.4 Configuration (promptfooconfig.yaml)

```yaml
prompts:
  - 'Generate a {{duration}}-second video script about {{topic}}'
  - 'Create an engaging short-form video script. Topic: {{topic}}, Length: {{duration}}s'

providers:
  - openai:gpt-4o
  - openai:gpt-4o-mini
  - anthropic:claude-3-sonnet

tests:
  - vars:
      topic: 'AI news'
      duration: 60
    assert:
      - type: contains
        value: 'AI'
      - type: llm-rubric
        value: 'The script is engaging and informative'
      - type: javascript
        value: output.length > 200

  - vars:
      topic: 'Climate change'
      duration: 30
    assert:
      - type: llm-rubric
        value: 'The script is accurate and not misleading'
```

### 3.5 Assertion Types

| Type           | Description               |
| -------------- | ------------------------- |
| `contains`     | Output contains substring |
| `not-contains` | Output doesn't contain    |
| `equals`       | Exact match               |
| `llm-rubric`   | LLM judges output quality |
| `javascript`   | Custom JS assertion       |
| `python`       | Custom Python assertion   |
| `regex`        | Regular expression match  |
| `is-json`      | Valid JSON output         |
| `cost`         | Token cost threshold      |
| `latency`      | Response time threshold   |

### 3.6 Red Teaming

```bash
npx promptfoo redteam init
npx promptfoo redteam run
```

#### Red Team Attack Types

| Attack           | Description                       |
| ---------------- | --------------------------------- |
| Prompt Injection | Attempts to override instructions |
| Jailbreaking     | Bypass safety restrictions        |
| Data Extraction  | Extract training data             |
| Harmful Content  | Generate harmful outputs          |
| PII Leakage      | Expose personal information       |
| Bias Detection   | Detect demographic biases         |

### 3.7 Model Comparison

```yaml
providers:
  - id: openai:gpt-4o
    config:
      temperature: 0.7

  - id: openai:gpt-4o-mini
    config:
      temperature: 0.7

  - id: anthropic:claude-3-opus
    config:
      max_tokens: 1000

  - id: together:meta-llama/Llama-3-70b-chat
```

### 3.8 CI/CD Integration

```yaml
# .github/workflows/llm-eval.yml
name: LLM Evaluation

on: [push]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install promptfoo
        run: npm install -g promptfoo

      - name: Run evaluations
        run: promptfoo eval --exit-code
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### 3.9 Programmatic Usage

```javascript
import { evaluate } from 'promptfoo';

const results = await evaluate({
  prompts: ['Generate a video script about {{topic}}'],
  providers: ['openai:gpt-4o'],
  tests: [
    {
      vars: { topic: 'AI' },
      assert: [
        { type: 'contains', value: 'AI' },
        { type: 'llm-rubric', value: 'Script is engaging' },
      ],
    },
  ],
});

console.log(results.stats);
```

### 3.10 Use Cases for content-machine

| Use Case               | Implementation                      |
| ---------------------- | ----------------------------------- |
| **Prompt Testing**     | Evaluate script generation prompts  |
| **Model Selection**    | Compare Groq, OpenAI, Anthropic     |
| **Quality Gates**      | Block deployments with poor quality |
| **Security Scanning**  | Red team content generation         |
| **Regression Testing** | Catch prompt regressions in CI      |

---

## 4. Integration Architecture

### 4.1 Complete Observability Stack

```
┌────────────────────────────────────────────────────────────────┐
│                    Observability Architecture                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DEVELOPMENT                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Promptfoo                                                │  │
│  │  - Prompt evaluation                                      │  │
│  │  - Model comparison                                       │  │
│  │  - Red teaming                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  PRODUCTION                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Langfuse                                                 │  │
│  │  - Request tracing                                        │  │
│  │  - Prompt management                                      │  │
│  │  - Cost tracking                                          │  │
│  │  - Quality scoring                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  AGENT FRAMEWORK                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OpenAI Agents SDK                                        │  │
│  │  - Multi-agent workflows                                  │  │
│  │  - MCP tool integration                                   │  │
│  │  - Human-in-the-loop                                      │  │
│  │  - Built-in tracing                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Integration Code Example

```typescript
import { Agent, run, tool } from '@openai/agents';
import { Langfuse } from 'langfuse';
import { z } from 'zod';

// Initialize Langfuse
const langfuse = new Langfuse();

// Create agent with tracing
const contentAgent = new Agent({
  name: 'Content Generator',
  instructions: 'Generate engaging video scripts',
  tools: [
    tool({
      name: 'research_trend',
      description: 'Research trending topics',
      parameters: z.object({ source: z.string() }),
      execute: async (input) => {
        // Trace tool execution
        const span = langfuse.span({ name: 'research_trend' });
        const result = await researchTrend(input.source);
        span.end({ output: result });
        return result;
      },
    }),
  ],
});

// Run agent with tracing
async function generateVideo(topic: string) {
  const trace = langfuse.trace({
    name: 'video-generation',
    metadata: { topic },
  });

  try {
    const result = await run(contentAgent, `Create a video about ${topic}`);

    trace.score({ name: 'success', value: 1 });
    return result.finalOutput;
  } catch (error) {
    trace.score({ name: 'success', value: 0 });
    throw error;
  } finally {
    await langfuse.flushAsync();
  }
}
```

### 4.3 Promptfoo Evaluation for Agents

```yaml
# promptfooconfig.yaml
prompts:
  - file://prompts/content-agent.txt

providers:
  - id: openai:gpt-4o
    config:
      model: gpt-4o

tests:
  - description: 'Video script generation'
    vars:
      topic: 'AI coding assistants'
    assert:
      - type: llm-rubric
        value: |
          The script should:
          - Be engaging and hook-driven
          - Be factually accurate
          - Be appropriate length (30-60 seconds)
          - Include a call to action
        threshold: 0.8

      - type: javascript
        value: |
          const wordCount = output.split(' ').length;
          return wordCount >= 80 && wordCount <= 200;

      - type: not-contains
        value: 'I cannot' # No refusals
```

---

## 5. Comparison Matrix

| Feature         | OpenAI Agents SDK | LangGraph    | LangChain    |
| --------------- | ----------------- | ------------ | ------------ |
| **Language**    | TypeScript        | Python       | Python + JS  |
| **Multi-agent** | ✅ Built-in       | ✅ Built-in  | ✅ Via tools |
| **Handoffs**    | ✅ Native         | ✅ Via edges | ❌ Manual    |
| **Voice**       | ✅ Realtime       | ❌           | ❌           |
| **MCP**         | ✅ Native         | ❌           | ❌           |
| **Tracing**     | ✅ Built-in       | Via Langfuse | Via Langfuse |
| **Guardrails**  | ✅ Built-in       | ✅ Via nodes | ✅ Via tools |

| Feature           | Langfuse | LangSmith | Arize |
| ----------------- | -------- | --------- | ----- |
| **Open Source**   | ✅ MIT   | ❌        | ❌    |
| **Self-Host**     | ✅ Easy  | ❌        | ❌    |
| **Prompt Mgmt**   | ✅       | ✅        | ❌    |
| **Evals**         | ✅       | ✅        | ✅    |
| **Cost Tracking** | ✅       | ✅        | ✅    |

---

## 6. Document Metadata

| Field            | Value          |
| ---------------- | -------------- |
| **Document ID**  | DD-072         |
| **Created**      | 2026-01-02     |
| **Author**       | Research Agent |
| **Status**       | Complete       |
| **Dependencies** | DD-066, DD-067 |

---

## 7. Key Takeaways

1. **OpenAI Agents SDK** is the best choice for TypeScript multi-agent workflows
2. **MCP support** makes it ideal for content-machine tool integration
3. **Langfuse** provides complete LLM observability with self-hosting
4. **Promptfoo** is essential for prompt testing and security scanning
5. **Combined stack** provides development → production observability
6. **Voice agents** enable real-time preview and narration features

---

## 8. Quick Reference

### OpenAI Agents

```typescript
import { Agent, run, tool } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are helpful',
  tools: [myTool],
});

await run(agent, 'Hello!');
```

### Langfuse Trace

```python
from langfuse import Langfuse
langfuse = Langfuse()
trace = langfuse.trace(name="my-trace")
```

### Promptfoo Eval

```bash
npx promptfoo eval
```
