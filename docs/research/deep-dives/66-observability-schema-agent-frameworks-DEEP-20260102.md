# Deep Dive 066: Observability, Schema Validation & Agent Frameworks Ecosystem

**Date:** 2026-01-02
**Category:** Development Infrastructure & AI Frameworks
**Tools Analyzed:** Langfuse, Promptfoo, Sentry, Zod, Instructor, PydanticAI, CrewAI, CapCut Mate

---

## Executive Summary

This deep dive analyzes the **development infrastructure** critical for building production-ready AI-powered video generation systems: LLM observability for debugging and monitoring, schema validation for type-safe data handling, and agent frameworks for orchestrating AI-driven workflows. These tools transform content-machine from a prototype into a maintainable, debuggable, and reliable production system.

**Key Findings:**
- **Observability:** Langfuse is the go-to for LLM tracing; Promptfoo for evals and red-teaming; Sentry for error tracking
- **Schema Validation:** Zod for TypeScript runtime validation; Instructor for structured LLM outputs
- **Agent Frameworks:** PydanticAI for TypeScript-first agent development; CrewAI for multi-agent orchestration
- **Video Processing:** CapCut Mate provides interesting API patterns for programmatic video editing

---

## Part 1: LLM Observability

### The Debugging Challenge

LLM applications are notoriously hard to debug:
- Non-deterministic outputs
- Multi-step chains with hidden failures
- Token costs that spiral out of control
- Prompt drift and regression

Content-machine uses LLMs for:
- Script generation
- Caption timing
- Trend analysis
- Product feature extraction

### 1.1 Langfuse - LLM Engineering Platform

**Repository:** `vendor/observability/langfuse/`
**GitHub Stars:** 10k+
**License:** MIT
**Tech Stack:** TypeScript + Python SDKs

#### Overview

Langfuse is an **open-source LLM engineering platform** that provides observability, prompt management, evaluations, and datasets. It's the de facto standard for LLM debugging in production.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Tracing** | Visualize multi-step LLM chains |
| **Prompt Management** | Version control for prompts |
| **Evaluations** | LLM-as-judge, user feedback, manual labels |
| **Datasets** | Test sets for regression testing |
| **Playground** | Test prompts interactively |
| **Cost Tracking** | Token usage and cost analysis |

#### Architecture

```
[Your Application]
    ├── Langfuse SDK (Python/JS)
    │   ├── @observe() decorator
    │   ├── trace() context manager
    │   └── OpenAI drop-in replacement
          ↓
[Langfuse Server]
    ├── Trace Storage
    ├── Prompt Registry
    ├── Evaluation Engine
    └── Analytics Dashboard
```

#### Content-Machine Integration

```typescript
// TypeScript Integration with Langfuse
import Langfuse from 'langfuse';
import { observeOpenAI } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// Wrap OpenAI for automatic tracing
const openai = observeOpenAI(new OpenAI());

// Generate script with automatic tracing
async function generateScript(trend: Trend): Promise<Script> {
  const trace = langfuse.trace({
    name: 'script-generation',
    metadata: { trendId: trend.id, source: trend.source }
  });
  
  try {
    const generation = trace.generation({
      name: 'script-llm-call',
      model: 'gpt-4o',
      input: { trend },
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SCRIPT_PROMPT },
        { role: 'user', content: JSON.stringify(trend) }
      ]
    });
    
    const script = parseScriptResponse(response);
    
    generation.end({
      output: script,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      }
    });
    
    return script;
  } catch (error) {
    trace.update({ level: 'ERROR', statusMessage: error.message });
    throw error;
  }
}
```

```python
# Python Integration with Langfuse
from langfuse.decorators import observe, langfuse_context
from langfuse.openai import openai  # Drop-in replacement

@observe()
async def generate_script(trend: Trend) -> Script:
    """Generate video script from trend - fully traced"""
    
    # Nested spans are automatically captured
    features = await extract_product_features(trend.product)
    
    response = await openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SCRIPT_PROMPT},
            {"role": "user", "content": f"Trend: {trend.title}\nFeatures: {features}"}
        ]
    )
    
    # Add custom scores
    langfuse_context.score_current_trace(
        name="script_quality",
        value=0.8,
        comment="Auto-scored"
    )
    
    return parse_script(response.choices[0].message.content)
```

#### Prompt Management

```typescript
// Fetch versioned prompts from Langfuse
async function getScriptPrompt(): Promise<string> {
  const prompt = await langfuse.getPrompt('video-script-generator');
  
  return prompt.compile({
    product: 'GitHub Copilot',
    style: 'casual',
    duration: '30s'
  });
}
```

#### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ MIT license, self-hostable | ⚠️ Another service to maintain |
| ✅ Excellent TypeScript support | ⚠️ Learning curve for full features |
| ✅ Drop-in OpenAI replacement | |
| ✅ Production-proven (BullMQ uses it) | |
| ✅ Prompt version control | |

---

### 1.2 Promptfoo - LLM Evals & Red-Teaming

**Repository:** `vendor/observability/promptfoo/`
**GitHub Stars:** 5k+
**License:** MIT
**Tech Stack:** TypeScript/Node.js

#### Overview

Promptfoo is a **developer-first LLM testing platform**. It's focused on evaluations, red-teaming, and CI/CD integration—complementary to Langfuse's runtime observability.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Prompt Testing** | Compare prompts side-by-side |
| **Model Comparison** | Evaluate multiple models |
| **Red Teaming** | Security vulnerability scanning |
| **CI/CD Integration** | Automate eval in pipelines |
| **Code Scanning** | PR review for LLM issues |
| **100% Local** | No data leaves your machine |

#### Content-Machine Integration

```yaml
# promptfoo.yaml - Script Generation Eval
description: Video script generation quality
prompts:
  - file://prompts/script-v1.txt
  - file://prompts/script-v2.txt

providers:
  - openai:gpt-4o
  - anthropic:claude-sonnet-4-20250514

tests:
  - description: Product demo script
    vars:
      trend: "AI coding assistants"
      product: "GitHub Copilot"
    assert:
      - type: contains
        value: "Copilot"
      - type: llm-rubric
        value: "Script mentions at least 3 product features"
      - type: not-contains
        value: "competitor names"
      
  - description: Tutorial script
    vars:
      trend: "Python best practices"
      product: "Ruff linter"
    assert:
      - type: llm-rubric
        value: "Script is suitable for a 30-second video"
      - type: cost
        threshold: 0.05
```

```bash
# Run evals
npx promptfoo eval

# Generate red-team report
npx promptfoo redteam generate --purpose "Video script generator"
npx promptfoo redteam run
```

#### Eval Output

```
┌─────────────────────────────────┬────────────┬────────────┐
│ Test Case                       │ GPT-4o     │ Claude     │
├─────────────────────────────────┼────────────┼────────────┤
│ Product demo script             │ ✅ Pass    │ ✅ Pass    │
│ Tutorial script                 │ ✅ Pass    │ ⚠️ Partial │
│ Complex technical topic         │ ❌ Fail    │ ✅ Pass    │
└─────────────────────────────────┴────────────┴────────────┘

Cost Analysis:
- GPT-4o: $0.032 avg per test
- Claude: $0.028 avg per test
```

#### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ 100% local, private | ⚠️ Not runtime observability |
| ✅ CI/CD integration | ⚠️ Learning curve for complex evals |
| ✅ Red-teaming built-in | |
| ✅ Model comparison | |
| ✅ MIT license | |

---

### 1.3 Sentry - Error Tracking

**Repository:** `vendor/observability/sentry/`
**GitHub Stars:** 39k+
**License:** FSL (functional source license)
**Tech Stack:** Python + JavaScript SDKs

#### Overview

Sentry is a **debugging platform** for detecting, tracing, and fixing issues across all application types. While not LLM-specific, it's essential for production error tracking.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Error Tracking** | Automatic exception capture |
| **Distributed Tracing** | Cross-service request tracing |
| **Session Replay** | See what users experienced |
| **Performance Monitoring** | Identify slow paths |
| **Release Tracking** | Correlate errors with deploys |

#### Content-Machine Integration

```typescript
// Sentry initialization
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_COMMIT,
  integrations: [
    Sentry.prismaIntegration(),
  ],
});

// Capture render failures
async function renderVideo(config: RenderConfig): Promise<Video> {
  const transaction = Sentry.startTransaction({
    name: 'video-render',
    op: 'render',
  });
  
  try {
    const result = await remotionRender(config);
    transaction.finish();
    return result;
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        renderConfig: config,
        templateId: config.template.id,
      }
    });
    throw error;
  }
}
```

---

### Observability Stack Recommendation

| Use Case | Tool | Rationale |
|----------|------|-----------|
| **LLM Tracing** | Langfuse | Purpose-built for LLM debugging |
| **Prompt Evals** | Promptfoo | CI/CD integration, red-teaming |
| **Error Tracking** | Sentry | Industry standard, full-stack |
| **Metrics** | OpenTelemetry | Vendor-neutral, extensible |

---

## Part 2: Schema Validation

### The Type Safety Challenge

Content-machine processes complex data structures:
- Trend objects from various sources
- Video render configurations
- Caption timing data
- LLM structured outputs

Without validation:
- Runtime crashes from malformed data
- Silent failures from missing fields
- Debugging nightmares

### 2.1 Zod - TypeScript Schema Validation

**Repository:** `vendor/schema/zod/`
**GitHub Stars:** 34k+
**License:** MIT
**Tech Stack:** TypeScript

#### Overview

Zod is a **TypeScript-first schema validation library** with static type inference. It's the standard for runtime validation in TypeScript applications.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Type Inference** | `z.infer<typeof schema>` |
| **Zero Dependencies** | 2kb gzipped |
| **Immutable API** | Methods return new instances |
| **JSON Schema** | Built-in conversion |
| **Ecosystem** | zod-to-json-schema, zod-openapi, etc. |

#### Content-Machine Schemas

```typescript
import { z } from 'zod';

// Trend schema
export const TrendSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  source: z.enum(['reddit', 'hackernews', 'youtube', 'twitter']),
  score: z.number().int().min(0),
  url: z.string().url().optional(),
  subreddit: z.string().optional(),
  created_at: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type Trend = z.infer<typeof TrendSchema>;

// Video render config
export const RenderConfigSchema = z.object({
  template: z.enum(['product-demo', 'tutorial', 'comparison']),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  duration: z.number().positive().max(60), // Max 60 seconds
  fps: z.number().int().min(24).max(60).default(30),
  scenes: z.array(z.object({
    id: z.string(),
    type: z.enum(['intro', 'demo', 'cta', 'outro']),
    duration: z.number().positive(),
    text: z.string().optional(),
    asset: z.string().url().optional(),
  })),
});

export type RenderConfig = z.infer<typeof RenderConfigSchema>;

// Caption schema
export const CaptionSchema = z.object({
  text: z.string(),
  start: z.number().min(0),
  end: z.number().positive(),
  words: z.array(z.object({
    word: z.string(),
    start: z.number().min(0),
    end: z.number().positive(),
    confidence: z.number().min(0).max(1).optional(),
  })).optional(),
});

export type Caption = z.infer<typeof CaptionSchema>;
```

```typescript
// Runtime validation
function processTrend(data: unknown): Trend {
  const result = TrendSchema.safeParse(data);
  
  if (!result.success) {
    console.error('Validation failed:', result.error.issues);
    throw new Error(`Invalid trend data: ${result.error.message}`);
  }
  
  return result.data; // Fully typed!
}

// API route validation
app.post('/api/render', async (req, res) => {
  const config = RenderConfigSchema.parse(req.body);
  // config is now typed as RenderConfig
  const video = await renderVideo(config);
  res.json({ videoUrl: video.url });
});
```

---

### 2.2 Instructor - Structured LLM Outputs

**Repository:** `vendor/schema/instructor/`
**GitHub Stars:** 8k+
**License:** MIT
**Tech Stack:** Python + TypeScript

#### Overview

Instructor provides **reliable structured outputs from LLMs**. It handles JSON parsing, validation, retries, and works with any LLM provider.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Pydantic Integration** | Define schemas as Pydantic models |
| **Automatic Retries** | Retry on validation failures |
| **Streaming** | Stream partial objects |
| **Provider Agnostic** | OpenAI, Anthropic, Gemini, Ollama |
| **Nested Objects** | Complex data structures |

#### Content-Machine Integration

```python
import instructor
from pydantic import BaseModel, Field
from typing import List

# Define output schema
class VideoScript(BaseModel):
    """Video script for short-form content"""
    title: str = Field(..., max_length=100)
    hook: str = Field(..., description="Opening hook (first 3 seconds)")
    scenes: List[Scene] = Field(..., min_length=3, max_length=10)
    cta: str = Field(..., description="Call to action")
    
class Scene(BaseModel):
    """Individual scene in the video"""
    description: str = Field(..., max_length=200)
    duration_seconds: float = Field(..., ge=2, le=15)
    visual_type: str = Field(..., pattern="^(screen_capture|b_roll|text_overlay)$")
    narration: str = Field(..., max_length=300)

# Get structured output
client = instructor.from_provider("openai/gpt-4o")

script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[
        {"role": "system", "content": "You are a video script writer..."},
        {"role": "user", "content": f"Write a script about: {trend.title}"}
    ],
    max_retries=3,  # Retry on validation failures
)

# script is now a fully validated VideoScript object
print(script.title)  # IDE autocomplete works!
print(script.scenes[0].duration_seconds)  # Type-safe access
```

```typescript
// TypeScript version with zod-to-openai
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import OpenAI from 'openai';

const VideoScriptSchema = z.object({
  title: z.string().max(100),
  hook: z.string().describe('Opening hook (first 3 seconds)'),
  scenes: z.array(z.object({
    description: z.string().max(200),
    duration_seconds: z.number().min(2).max(15),
    visual_type: z.enum(['screen_capture', 'b_roll', 'text_overlay']),
    narration: z.string().max(300),
  })).min(3).max(10),
  cta: z.string().describe('Call to action'),
});

const openai = new OpenAI();

async function generateScript(trend: Trend): Promise<z.infer<typeof VideoScriptSchema>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a video script writer...' },
      { role: 'user', content: `Write a script about: ${trend.title}` }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'video_script',
        schema: zodToJsonSchema(VideoScriptSchema),
        strict: true,
      }
    }
  });
  
  const content = JSON.parse(response.choices[0].message.content!);
  return VideoScriptSchema.parse(content); // Validate with Zod
}
```

---

## Part 3: Agent Frameworks

### The Orchestration Challenge

Content-machine requires complex AI workflows:
- Multi-step reasoning (trend → script → scenes)
- Tool use (search, product data, image generation)
- Human-in-the-loop approvals
- Durable execution across failures

### 3.1 PydanticAI - FastAPI for Agents

**Repository:** `vendor/agents/pydantic-ai/`
**GitHub Stars:** 3k+
**License:** MIT
**Tech Stack:** Python

#### Overview

PydanticAI is an **agent framework from the Pydantic team**. It brings the "FastAPI feeling" to AI agent development with type safety, dependency injection, and structured outputs.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Type-Safe** | Full IDE support, static checking |
| **Model Agnostic** | All major providers |
| **Dependency Injection** | Clean, testable code |
| **Durable Execution** | Survive failures and restarts |
| **MCP Integration** | Model Context Protocol support |
| **Human-in-the-Loop** | Tool approval workflows |

#### Content-Machine Agent

```python
from dataclasses import dataclass
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

# Dependencies for the content planning agent
@dataclass
class ContentPlannerDeps:
    product_db: ProductDatabase
    trend_api: TrendAPI
    render_service: RenderService

# Output schema
class ContentPlan(BaseModel):
    title: str = Field(..., max_length=100)
    hook: str = Field(..., max_length=50)
    scenes: list[Scene]
    estimated_duration: float
    target_platforms: list[str]

# Define the agent
content_planner = Agent(
    'anthropic:claude-sonnet-4-20250514',
    deps_type=ContentPlannerDeps,
    output_type=ContentPlan,
    instructions="""You are a content planning agent for short-form videos.
    Your goal is to create engaging, product-truthful video plans.""",
)

# Dynamic instructions based on context
@content_planner.instructions
async def add_product_context(ctx: RunContext[ContentPlannerDeps]) -> str:
    product = await ctx.deps.product_db.get_featured_product()
    return f"The current featured product is: {product.name}"

# Tools the agent can use
@content_planner.tool
async def search_trends(ctx: RunContext[ContentPlannerDeps], query: str) -> list[dict]:
    """Search for trending topics related to the query"""
    return await ctx.deps.trend_api.search(query, limit=5)

@content_planner.tool
async def get_product_features(ctx: RunContext[ContentPlannerDeps], product_id: str) -> dict:
    """Get detailed features of a product"""
    product = await ctx.deps.product_db.get(product_id)
    return product.to_dict()

@content_planner.tool(require_approval=True)  # Human-in-the-loop!
async def queue_render(ctx: RunContext[ContentPlannerDeps], plan: ContentPlan) -> str:
    """Queue a video for rendering. Requires approval."""
    job = await ctx.deps.render_service.queue(plan)
    return f"Render job {job.id} queued"

# Run the agent
async def main():
    deps = ContentPlannerDeps(
        product_db=ProductDatabase(),
        trend_api=TrendAPI(),
        render_service=RenderService(),
    )
    
    result = await content_planner.run(
        "Create a video about AI coding assistants",
        deps=deps,
    )
    
    print(result.output)  # ContentPlan object
```

#### Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Type-safe, IDE-friendly | ⚠️ Python only |
| ✅ Built by Pydantic team | ⚠️ Newer framework |
| ✅ MCP integration | |
| ✅ Human-in-the-loop built-in | |
| ✅ Durable execution support | |

---

### 3.2 CrewAI - Multi-Agent Orchestration

**Repository:** `vendor/agents/crewai/`
**GitHub Stars:** 25k+
**License:** MIT
**Tech Stack:** Python

#### Overview

CrewAI is a **multi-agent orchestration framework** where specialized agents collaborate to complete complex tasks. It's designed for enterprise-grade automation.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Crews** | Teams of autonomous agents |
| **Flows** | Event-driven production workflows |
| **Role-Based** | Agents with defined expertise |
| **Tool Integration** | Extensive tool ecosystem |
| **Enterprise Ready** | Control plane, observability |
| **100k+ Developers** | Large community |

#### Content-Machine Crew

```python
from crewai import Agent, Task, Crew, Process

# Define specialized agents
trend_researcher = Agent(
    role="Trend Researcher",
    goal="Find viral content opportunities",
    backstory="Expert at identifying trending topics before they peak",
    tools=[reddit_search_tool, hn_search_tool, youtube_trends_tool],
)

script_writer = Agent(
    role="Script Writer",
    goal="Write engaging 30-second video scripts",
    backstory="Former TikTok creator with 1M+ followers",
    tools=[product_feature_tool, caption_generator_tool],
)

video_director = Agent(
    role="Video Director",
    goal="Create compelling visual sequences",
    backstory="Award-winning short-form video director",
    tools=[scene_planner_tool, render_queue_tool],
)

# Define tasks
research_task = Task(
    description="Find 3 trending topics related to {product_category}",
    agent=trend_researcher,
    expected_output="List of 3 trends with engagement metrics",
)

script_task = Task(
    description="Write a 30-second script for the top trend",
    agent=script_writer,
    expected_output="Complete video script with hook, scenes, and CTA",
    context=[research_task],  # Depends on research
)

direct_task = Task(
    description="Create scene-by-scene visual plan",
    agent=video_director,
    expected_output="Render-ready video specification",
    context=[script_task],
)

# Create the crew
content_crew = Crew(
    agents=[trend_researcher, script_writer, video_director],
    tasks=[research_task, script_task, direct_task],
    process=Process.sequential,  # Or Process.hierarchical
    verbose=True,
)

# Run the crew
result = content_crew.kickoff(
    inputs={"product_category": "developer tools"}
)

print(result)
```

#### CrewAI Flows (Production Architecture)

```python
from crewai.flow.flow import Flow, listen, start

class ContentGenerationFlow(Flow):
    @start()
    def fetch_trends(self):
        """Entry point - fetch trending topics"""
        trends = self.trend_api.fetch_daily()
        return trends
    
    @listen(fetch_trends)
    def select_best_trend(self, trends):
        """Score and select the best trend"""
        scored = [(t, self.score_trend(t)) for t in trends]
        return max(scored, key=lambda x: x[1])[0]
    
    @listen(select_best_trend)
    def generate_script(self, trend):
        """Generate video script using crew"""
        return self.script_crew.kickoff(inputs={"trend": trend})
    
    @listen(generate_script)
    def await_approval(self, script):
        """Human review step"""
        self.send_for_review(script)
        return self.wait_for_approval(script.id, timeout="7d")
    
    @listen(await_approval)
    def queue_render(self, approval):
        """Queue approved scripts for rendering"""
        if approval.approved:
            return self.render_service.queue(approval.script)
        return None

# Run the flow
flow = ContentGenerationFlow()
result = flow.kickoff()
```

---

## Part 4: Video Processing - CapCut Mate

**Repository:** `vendor/video-processing/capcut-mate/`
**License:** Unknown
**Tech Stack:** Python + FastAPI

### Overview

CapCut Mate is a **FastAPI-based API for programmatic video editing** using CapCut (剪映) as the backend. It provides REST endpoints for creating and editing video drafts.

### Key Features

| Feature | Description |
|---------|-------------|
| **Draft Management** | Create, save, get drafts |
| **Video/Audio/Image** | Add media assets |
| **Captions** | Add subtitles with styling |
| **Effects** | Filters, animations, masks |
| **Keyframes** | Animation control |
| **Cloud Render** | Generate final video |

### API Endpoints

```
POST /create_draft          Create new project
POST /add_videos            Add video clips
POST /add_audios            Add audio tracks
POST /add_captions          Add subtitles
POST /add_effects           Add visual effects
POST /add_keyframes         Animation keyframes
POST /gen_video             Queue cloud render
GET  /gen_video_status      Check render progress
```

### Integration Pattern

```typescript
// Content-machine could use this pattern for local rendering
const capcutMate = new CapCutMateClient('http://localhost:30000');

async function renderWithCapCut(script: VideoScript, assets: Assets): Promise<string> {
  // Create draft
  const draft = await capcutMate.createDraft({
    width: 1080,
    height: 1920, // TikTok format
  });
  
  // Add video clips
  await capcutMate.addVideos(draft.id, assets.clips.map((clip, i) => ({
    url: clip.url,
    start: script.scenes[i].startMs * 1000,
    end: script.scenes[i].endMs * 1000,
  })));
  
  // Add captions
  await capcutMate.addCaptions(draft.id, script.captions.map(cap => ({
    text: cap.text,
    start: cap.start * 1000000, // microseconds
    end: cap.end * 1000000,
    keywords: cap.highlightWords,
  })));
  
  // Add background music
  await capcutMate.addAudios(draft.id, [{
    url: assets.music.url,
    start: 0,
    end: script.durationMs * 1000,
    volume: 0.3,
  }]);
  
  // Save and render
  await capcutMate.saveDraft(draft.id);
  const { taskId } = await capcutMate.genVideo(draft.id);
  
  // Poll for completion
  while (true) {
    const status = await capcutMate.getVideoStatus(taskId);
    if (status.complete) return status.videoUrl;
    await sleep(5000);
  }
}
```

### Relevance to Content-Machine

- **Pattern Study:** API design for programmatic video editing
- **Not Primary Tool:** Chinese platform, cloud dependency
- **Alternative to Remotion:** For teams already using CapCut

---

## Part 5: Unified Development Stack

### Complete Development Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTENT-MACHINE DEV INFRASTRUCTURE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      OBSERVABILITY LAYER                         │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │    │
│  │  │  Langfuse   │    │  Promptfoo  │    │      Sentry         │  │    │
│  │  │ LLM Tracing │    │   Evals     │    │  Error Tracking     │  │    │
│  │  │  Prompts    │    │ Red-teaming │    │   Performance       │  │    │
│  │  └─────────────┘    └─────────────┘    └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      SCHEMA VALIDATION                           │    │
│  │  ┌─────────────────────────┐    ┌───────────────────────────┐   │    │
│  │  │          Zod            │    │       Instructor          │   │    │
│  │  │  TypeScript Schemas     │    │   Structured LLM Output   │   │    │
│  │  │  Runtime Validation     │    │   Pydantic Models         │   │    │
│  │  │  Type Inference         │    │   Automatic Retries       │   │    │
│  │  └─────────────────────────┘    └───────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      AGENT FRAMEWORKS                            │    │
│  │  ┌─────────────────────────┐    ┌───────────────────────────┐   │    │
│  │  │      PydanticAI         │    │        CrewAI             │   │    │
│  │  │  Single-Agent Focus     │    │   Multi-Agent Teams       │   │    │
│  │  │  Type-Safe Tools        │    │   Role-Based Agents       │   │    │
│  │  │  Human-in-Loop          │    │   Enterprise Flows        │   │    │
│  │  └─────────────────────────┘    └───────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Recommendations Summary

### Final Stack Recommendations

| Layer | Primary Tool | Alternative | Rationale |
|-------|--------------|-------------|-----------|
| **LLM Tracing** | Langfuse | OpenTelemetry | Purpose-built, MIT license |
| **Evals** | Promptfoo | - | CI/CD integration, red-teaming |
| **Error Tracking** | Sentry | - | Industry standard |
| **TS Schema** | Zod | - | TypeScript-first, tiny bundle |
| **LLM Schema** | Instructor | zod-to-openai | Provider agnostic |
| **Agent (Python)** | PydanticAI | CrewAI | Type-safe, FastAPI-feeling |
| **Multi-Agent** | CrewAI | LangGraph | Enterprise-ready, Flows |

### Implementation Priority

1. **Phase 1 (Day 1):** Zod schemas for all data structures
2. **Phase 2 (MVP):** Langfuse for LLM debugging
3. **Phase 3 (Pre-Prod):** Promptfoo for eval pipeline
4. **Phase 4 (Production):** Sentry for error tracking
5. **Phase 5 (Agents):** PydanticAI or CrewAI for orchestration

---

## Cross-References

- **DD-065:** Review UI, Orchestration & Infrastructure (Temporal, n8n, BullMQ)
- **DD-063:** End-to-End Generators (pipeline patterns)
- **DD-057:** MCP Servers, Capture, Orchestration
- **DD-050:** Master Architecture Synthesis

---

**Document Stats:**
- Tools Analyzed: 8
- Code Examples: 15
- Architecture Diagrams: 1
- Comparison Tables: 4
- Word Count: ~6,500

