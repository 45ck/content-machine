# Schema Validation, Research Agents & Observability Infrastructure - DEEP DIVE #42

**Created:** 2026-01-02
**Category:** Infrastructure Analysis
**Repos Analyzed:** 14 (Schema: 4, Research: 6, Observability: 4)
**Status:** ✅ Complete

---

## Executive Summary

This deep dive analyzes three critical infrastructure categories for content-machine:

1. **Schema Validation** (4 repos): Zod, Pydantic, Instructor, AJV
2. **Research Agents** (6 repos): GPT Researcher, Open Deep Research, Nano Banana collection
3. **Observability** (4 repos): Langfuse, Promptfoo, OpenTelemetry, Sentry

**Key Finding:** These tools form the "nervous system" of the content-machine pipeline - ensuring data integrity (schema), enabling intelligent content research (research agents), and providing visibility into LLM operations (observability).

---

## Part 1: Schema Validation Tools

### 1.1 Tool Comparison Matrix

| Tool | Language | Purpose | Stars | Key Feature |
|------|----------|---------|-------|-------------|
| **Zod** | TypeScript | Runtime validation + static types | 35k+ | Type inference |
| **Pydantic** | Python | Data validation via type hints | 20k+ | Python ecosystem |
| **Instructor** | Python | LLM structured outputs | 10k+ | Multi-provider |
| **AJV** | JavaScript | JSON Schema validation | 14k+ | Fastest validator |

### 1.2 Zod (TypeScript - RECOMMENDED)

**Repository:** `vendor/schema/zod/`
**License:** MIT
**Bundle Size:** 2kb core (gzipped)

#### Why Zod for content-machine:
- **Zero dependencies** - critical for production bundle size
- **Type inference** - schema → TypeScript types automatically
- **Immutable API** - functional programming patterns
- **JSON Schema conversion** - interop with other tools

#### Code Pattern:

```typescript
import * as z from "zod";

// Video content schema for content-machine
const VideoContentSchema = z.object({
  title: z.string().max(100),
  duration: z.number().min(3).max(60), // 3-60 seconds
  platform: z.enum(["tiktok", "reels", "shorts"]),
  aspectRatio: z.literal("9:16"),
  captions: z.array(z.object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number(),
  })),
  audioUrl: z.string().url(),
  scenes: z.array(z.object({
    type: z.enum(["capture", "stock", "text"]),
    durationMs: z.number(),
    assetPath: z.string(),
  })),
});

// Extract type from schema
type VideoContent = z.infer<typeof VideoContentSchema>;

// Parse with validation
const content = VideoContentSchema.parse(rawData);
// Throws ZodError on invalid data

// Safe parse (no throw)
const result = VideoContentSchema.safeParse(rawData);
if (result.success) {
  console.log(result.data.title);
} else {
  console.error(result.error.issues);
}
```

### 1.3 Pydantic (Python - Core Validation)

**Repository:** `vendor/schema/pydantic/`
**License:** MIT
**Version:** V2 (ground-up rewrite, much faster)

#### Why Pydantic for content-machine:
- **Python ecosystem** - works with FastAPI, LangChain, etc.
- **Type hints** - native Python 3.9+ typing
- **V2 rewrite** - significantly faster with Rust core
- **Logfire integration** - observability built-in

#### Code Pattern:

```python
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class CaptionSegment(BaseModel):
    text: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    
class VideoContent(BaseModel):
    title: str = Field(max_length=100)
    duration: int = Field(ge=3, le=60)  # 3-60 seconds
    platform: Literal["tiktok", "reels", "shorts"]
    aspect_ratio: Literal["9:16"] = "9:16"
    captions: list[CaptionSegment] = []
    audio_url: str
    created_at: Optional[datetime] = None

# Usage
content = VideoContent(
    title="Amazing AI Tool Demo",
    duration=30,
    platform="tiktok",
    audio_url="https://storage.example.com/audio.mp3"
)

# Validation with error details
try:
    bad_content = VideoContent(duration=120, ...)  # Too long!
except ValidationError as e:
    print(e.errors())
```

### 1.4 Instructor (LLM Structured Outputs)

**Repository:** `vendor/schema/instructor/`
**License:** MIT
**Downloads:** 3M+ monthly
**Tagline:** "Get reliable JSON from any LLM"

#### Critical Insight:
> "Use Instructor for fast extraction, reach for PydanticAI when you need agents"

#### Why Instructor for content-machine:
- **Multi-provider** - OpenAI, Anthropic, Google, Ollama
- **Pydantic integration** - schema validation built-in
- **Retry logic** - handles LLM parsing failures
- **Production-ready** - 3M+ monthly downloads

#### Code Pattern:

```python
import instructor
from pydantic import BaseModel, Field
from openai import OpenAI

# Define schema for script generation
class ScriptSegment(BaseModel):
    """A single segment of video script"""
    text: str = Field(description="Voiceover text")
    duration_estimate: float = Field(description="Estimated duration in seconds")
    visual_hint: str = Field(description="What should be shown on screen")

class VideoScript(BaseModel):
    """Complete video script"""
    title: str
    hook: str = Field(description="Opening hook to grab attention")
    segments: list[ScriptSegment]
    cta: str = Field(description="Call to action")

# Patch OpenAI client with Instructor
client = instructor.from_openai(OpenAI())

# Generate structured script
script = client.chat.completions.create(
    model="gpt-4o",
    response_model=VideoScript,
    messages=[
        {"role": "system", "content": "You are a short-form video scriptwriter."},
        {"role": "user", "content": "Write a 30-second TikTok script about VS Code extensions."}
    ],
)

# script is now a validated VideoScript instance
print(f"Title: {script.title}")
print(f"Hook: {script.hook}")
for seg in script.segments:
    print(f"  - {seg.text} ({seg.duration_estimate}s)")
```

### 1.5 AJV (JSON Schema - JavaScript)

**Repository:** `vendor/schema/ajv/`
**License:** MIT
**Claim:** "50% faster than the second place"

#### Why AJV for content-machine:
- **JSON Schema standard** - interop with external tools
- **Fastest validator** - code generation for V8 optimization
- **OpenAPI support** - discriminator, nullable keywords
- **i18n support** - error messages in multiple languages

#### Code Pattern:

```javascript
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

const videoContentSchema = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 100 },
    duration: { type: "integer", minimum: 3, maximum: 60 },
    platform: { enum: ["tiktok", "reels", "shorts"] },
    aspectRatio: { const: "9:16" },
    captions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          startMs: { type: "integer", minimum: 0 },
          endMs: { type: "integer", minimum: 0 }
        },
        required: ["text", "startMs", "endMs"]
      }
    }
  },
  required: ["title", "duration", "platform"]
};

const validate = ajv.compile(videoContentSchema);
const valid = validate(data);

if (!valid) {
  console.log(validate.errors);
  // [{ keyword: 'maximum', instancePath: '/duration', message: 'must be <= 60' }]
}
```

### 1.6 Schema Validation Recommendations

| Use Case | Recommended Tool | Reason |
|----------|------------------|--------|
| TypeScript runtime validation | **Zod** | Type inference, zero deps |
| Python data models | **Pydantic** | Python ecosystem, V2 speed |
| LLM structured outputs | **Instructor** | Multi-provider, retry logic |
| JSON Schema compliance | **AJV** | Fastest, standards-compliant |
| Cross-language schemas | **JSON Schema + AJV** | Interop between TS/Python |

---

## Part 2: Research Agents

### 2.1 Research Agent Comparison

| Agent | Framework | RACE Score | Cost | Key Feature |
|-------|-----------|------------|------|-------------|
| **GPT Researcher** | Custom + LangGraph | N/A | ~$0.4/report | Plan-and-Solve + RAG |
| **Open Deep Research** | LangGraph | 0.4344 (#6) | Variable | MCP compatible |
| **Nano Banana** | Image generation | N/A | N/A | Gemini 2.5 Flash Image |

### 2.2 GPT Researcher

**Repository:** `vendor/research/gpt-researcher/`
**Architecture:** Plan-and-Solve + RAG
**Sources:** 20+ per research
**Cost:** ~$0.4/research with o3-mini

#### Why GPT Researcher for content-machine:
- **Deep research** - comprehensive multi-source analysis
- **Multi-agent** - LangGraph orchestration
- **MCP integration** - pluggable data sources
- **Export formats** - PDF, Word, Markdown

#### Architecture Pattern:

```
┌─────────────────┐
│   User Query    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Planner Agent  │  ← Generates research plan
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Research Agents │  ← 20+ sources queried
│ (Parallel)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  RAG Pipeline   │  ← Synthesizes findings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Writer Agent  │  ← Produces report
└─────────────────┘
```

#### Code Pattern:

```python
from gpt_researcher import GPTResearcher

# Initialize researcher
researcher = GPTResearcher(
    query="Latest trends in AI video generation for TikTok",
    report_type="research_report",
    source_urls=["https://arxiv.org", "https://github.com"]
)

# Conduct research
research_result = await researcher.conduct_research()

# Generate report
report = await researcher.write_report()

# Export
await researcher.export_to_markdown("research_output.md")
```

### 2.3 Open Deep Research (LangChain)

**Repository:** `vendor/research/open-deep-research/`
**Framework:** LangGraph
**RACE Score:** 0.4344 (#6 on Deep Research Bench)
**MCP Support:** Yes

#### Why Open Deep Research for content-machine:
- **LangGraph-based** - matches our agent architecture
- **Leaderboard performance** - top 10 on benchmarks
- **Configurable models** - summarization, research, compression
- **MCP compatible** - integrates with our MCP servers

#### Model Configuration:

```python
# Configurable model roles
{
    "summarization_model": "gpt-4o-mini",  # Fast summarization
    "research_model": "gpt-4o",            # Deep analysis
    "compression_model": "gpt-4o-mini",    # Context compression
    "final_report_model": "gpt-4o"         # High-quality output
}
```

### 2.4 Nano Banana Resources (Gemini Image Generation)

**Repositories:**
- `vendor/research/awesome-nano-banana/` - Prompt collection
- `vendor/research/awesome-nano-banana-samurai/` - Resources hub
- `vendor/research/awesome-nanobanana-pro/` - Advanced prompts
- `vendor/research/nano-banana-hackathon-kit/` - Google hackathon kit

#### What is Nano Banana?
Gemini 2.5 Flash Image (codename "Nano Banana") is Google's revolutionary AI image model:

- **Context-aware editing** - understands lighting, physics, relationships
- **Surgical precision** - add/replace items with perfect occlusion
- **Deep 3D understanding** - perceives structure within 2D images
- **Style consistency** - maintains visual worlds across generations
- **Collaborative creation** - "inspiration communication" vs "master-servant"

#### Relevance to content-machine:
- **Thumbnail generation** - viral cover images for videos
- **Product visualization** - virtual try-ons, product shots
- **Creative assets** - 3D chibi characters, infographics
- **Style transfer** - film grain, era-specific aesthetics

#### Prompt Pattern Examples:

```text
# Professional Headshot from Selfie
"A professional, high-resolution profile photo, maintaining the 
exact facial structure, identity, and key features of the person 
in the input image. Shot from a high angle with bright and airy 
soft, diffused studio lighting... Captured on an 85mm f/1.8 lens 
with a shallow depth of field..."

# Viral Video Thumbnail
"Design a viral video thumbnail using the person from Image 1.
Face Consistency: Keep the person's facial features exactly the same.
Expression: excited and surprised. Action: Pose the person on the 
left side, pointing their finger towards the right side..."

# 3D Brand Store
"3D chibi-style miniature concept store of {Brand Name}, creatively 
designed with an exterior inspired by the brand's most iconic product..."
```

---

## Part 3: Observability Infrastructure

### 3.1 Observability Tool Comparison

| Tool | Focus | Language | License | Key Feature |
|------|-------|----------|---------|-------------|
| **Langfuse** | LLM observability | TS/Python | MIT | Prompt management |
| **Promptfoo** | LLM testing/red team | Node.js | MIT | Security scanning |
| **OpenTelemetry** | General tracing | Multiple | Apache-2.0 | Industry standard |
| **Sentry** | Error tracking | Multiple | BSL | Production debugging |

### 3.2 Langfuse (LLM Engineering Platform) ⭐ RECOMMENDED

**Repository:** `vendor/observability/langfuse/`
**License:** MIT (except `ee` folders)
**Stars:** 16k+
**Status:** YC W23, production battle-tested

#### Why Langfuse for content-machine:
- **LLM-specific** - built for AI application monitoring
- **Prompt management** - version control for prompts
- **Evaluations** - LLM-as-judge, user feedback, manual labeling
- **Self-hostable** - Docker Compose in 5 minutes
- **Integrations** - LangChain, LlamaIndex, OpenAI, Anthropic

#### Core Features:

1. **Tracing** - Instrument LLM calls, track chains, debug sessions
2. **Prompt Management** - Version control, caching, collaboration
3. **Evaluations** - Automated and manual quality assessment
4. **Datasets** - Test sets and benchmarks
5. **Playground** - Interactive prompt testing

#### Integration Pattern:

```python
from langfuse import observe
from langfuse.openai import openai  # Drop-in replacement

@observe()
def generate_video_script(topic: str) -> str:
    """Generate video script with automatic tracing"""
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a video scriptwriter."},
            {"role": "user", "content": f"Write a 30-second script about {topic}"}
        ],
    ).choices[0].message.content

@observe()
def main():
    script = generate_video_script("AI coding assistants")
    return script

# All calls are automatically traced to Langfuse
```

#### Deployment Options:

```bash
# Local deployment (5 minutes)
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up

# Environment variables
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_BASE_URL="https://cloud.langfuse.com"
```

### 3.3 Promptfoo (LLM Testing & Red Teaming)

**Repository:** `vendor/observability/promptfoo/`
**License:** MIT
**Focus:** Security + Quality Testing

#### Why Promptfoo for content-machine:
- **Red teaming** - vulnerability scanning for LLM apps
- **Eval framework** - systematic prompt testing
- **CI/CD integration** - automated checks in pipeline
- **Local-first** - prompts never leave your machine
- **Code scanning** - PR reviews for LLM security

#### Core Capabilities:

1. **Evaluations** - Test prompts against multiple providers
2. **Red Teaming** - Security vulnerability detection
3. **Comparisons** - Side-by-side model analysis
4. **CI/CD** - Automated testing in pipelines
5. **Code Scanning** - Security-focused PR reviews

#### Usage Pattern:

```bash
# Initialize project
npx promptfoo@latest init

# Run evaluation
npx promptfoo eval

# View results
npx promptfoo view
```

```yaml
# promptfooconfig.yaml
providers:
  - openai:gpt-4o
  - anthropic:claude-3-opus-20240229

prompts:
  - "Write a {{duration}}-second video script about {{topic}}"

tests:
  - vars:
      duration: 30
      topic: "VS Code extensions"
    assert:
      - type: contains
        value: "hook"
      - type: llm-rubric
        value: "Script should be engaging and concise"
```

### 3.4 Observability Stack Recommendation

```
┌─────────────────────────────────────────────────────────┐
│                  content-machine                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Langfuse  │  │  Promptfoo  │  │   Sentry    │     │
│  │   (Trace)   │  │   (Test)    │  │   (Error)   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│                          ▼                             │
│              ┌───────────────────┐                     │
│              │  OpenTelemetry    │                     │
│              │  (Standard Wire)  │                     │
│              └───────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Recommendation:**
- **Langfuse** for LLM tracing, prompt management, evaluations
- **Promptfoo** for pre-deployment testing and red teaming
- **Sentry** for production error tracking
- **OpenTelemetry** as the standard wire format between tools

---

## Part 4: Integration Architecture

### 4.1 Schema + LLM Integration

```typescript
// Zod + Instructor pattern for TypeScript
import * as z from "zod";
import Instructor from "@instructor-ai/instructor";
import OpenAI from "openai";

const VideoScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  segments: z.array(z.object({
    text: z.string(),
    visualHint: z.string(),
  })),
  cta: z.string(),
});

const client = Instructor({
  client: new OpenAI(),
  mode: "TOOLS",
});

const script = await client.chat.completions.create({
  model: "gpt-4o",
  response_model: { schema: VideoScriptSchema, name: "VideoScript" },
  messages: [
    { role: "user", content: "Write a TikTok script about AI tools" }
  ],
});
```

### 4.2 Research + Content Planning

```python
# GPT Researcher for trend research → Content planning
from gpt_researcher import GPTResearcher
from langfuse import observe

@observe()
async def research_trends(topic: str) -> dict:
    """Research current trends for content planning"""
    researcher = GPTResearcher(
        query=f"Current viral trends in {topic} for TikTok/Reels",
        report_type="research_report"
    )
    
    await researcher.conduct_research()
    report = await researcher.write_report()
    
    return {
        "report": report,
        "sources": researcher.get_source_urls(),
        "key_themes": extract_themes(report)
    }
```

### 4.3 Observability Integration

```python
# Full observability stack integration
from langfuse import observe
from langfuse.openai import openai
import sentry_sdk

sentry_sdk.init(dsn="...")

@observe()
def content_generation_pipeline(topic: str):
    """Full pipeline with observability"""
    try:
        # Research phase (traced by Langfuse)
        trends = research_trends(topic)
        
        # Script generation (traced by Langfuse)
        script = generate_script(trends)
        
        # Validation (Pydantic)
        validated_script = VideoScript.model_validate(script)
        
        return validated_script
        
    except Exception as e:
        # Error captured by Sentry
        sentry_sdk.capture_exception(e)
        raise
```

---

## Part 5: Recommendations for content-machine

### 5.1 Immediate Adoption

| Category | Tool | Priority | Reason |
|----------|------|----------|--------|
| TypeScript Schema | **Zod** | P0 | Core data validation |
| Python Schema | **Pydantic** | P0 | Python ecosystem |
| LLM Outputs | **Instructor** | P0 | Structured generation |
| LLM Tracing | **Langfuse** | P1 | Prompt management, evals |
| LLM Testing | **Promptfoo** | P1 | Security, quality gates |

### 5.2 Integration Priorities

1. **Phase 1: Schema Foundation**
   - Define Zod schemas for all video content types
   - Define Pydantic models for Python services
   - Use Instructor for LLM script generation

2. **Phase 2: Observability**
   - Deploy Langfuse (self-hosted)
   - Integrate with all LLM calls
   - Set up prompt versioning

3. **Phase 3: Quality Gates**
   - Integrate Promptfoo in CI/CD
   - Run red teaming on LLM endpoints
   - Automated regression testing

4. **Phase 4: Research Integration**
   - GPT Researcher for trend discovery
   - Open Deep Research for deep analysis
   - Nano Banana for creative assets

### 5.3 Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                    content-machine Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RESEARCH          PLANNING          GENERATION       RENDER   │
│  ────────          ────────          ──────────       ──────   │
│  GPT Researcher    LangGraph         Instructor       Remotion │
│  Open Deep Res.    Pydantic AI       + Pydantic       + Zod    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     VALIDATION LAYER                            │
│  ────────────────────────────────────────────────────────────── │
│  Zod (TypeScript)  │  Pydantic (Python)  │  AJV (JSON Schema)  │
├─────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY LAYER                          │
│  ────────────────────────────────────────────────────────────── │
│  Langfuse (Trace)  │  Promptfoo (Test)   │  Sentry (Error)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## References

### Schema Validation
- Zod Docs: https://zod.dev/
- Pydantic Docs: https://docs.pydantic.dev/
- Instructor Docs: https://python.useinstructor.com/
- AJV Docs: https://ajv.js.org/

### Research Agents
- GPT Researcher: https://gptr.dev/
- Open Deep Research: https://github.com/langchain-ai/open-deep-research
- Nano Banana (Gemini 2.5 Flash): https://ai.google.dev/gemini-api/docs/image-generation

### Observability
- Langfuse: https://langfuse.com/
- Promptfoo: https://www.promptfoo.dev/
- OpenTelemetry: https://opentelemetry.io/
- Sentry: https://sentry.io/

---

**Document Status:** Complete
**Next Steps:** 
1. Define Zod/Pydantic schemas for VideoContent, Scene, Caption
2. Deploy Langfuse (self-hosted)
3. Integrate Promptfoo in CI/CD
4. Evaluate GPT Researcher for trend intake

