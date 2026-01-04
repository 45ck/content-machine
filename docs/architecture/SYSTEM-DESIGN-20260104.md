# content-machine: System Design Document

**Version:** 8.0  
**Date:** 2026-01-05  
**Status:** Ready for Implementation  
**Authors:** content-machine team  
**Critical Evaluation Iterations:** 6 (Converged)  
**Research Questions Resolved:** 23  
**Target Demographics:** Gen Z (16-25), Millennials, Gen X — All content styles supported  
**Extension Points:** 12 modular extension mechanisms for future scope expansion

---

## Table of Contents

### Part I: Vision & User Experience
- [Executive Summary](#executive-summary) — Problem, solution, differentiation
- [User Experience & Interaction](#user-experience--interaction) — Installation, CLI demos, workflows
- [MVP Scope & Boundaries](#mvp-scope--boundaries) — What's in, what's out
- [Expectations](#expectations-what-you-can--cant-expect) — Realistic capabilities and limitations
- [Post-MVP Roadmap](#post-mvp-roadmap) — Future features v1.5 through v3.0

### Part II: Technical Specification
- [§1. Introduction](#1-introduction) — Document purpose, product vision
- [§2. Design Principles](#2-design-principles) — LLM-native, config-first, embeddings
- [§3. System Overview](#3-system-overview) — Architecture, pipeline stages
- [§4. Configuration System](#4-configuration-system) — ~/.cmrc.json, providers
- [§5. Content Archetype System](#5-content-archetype-system) — 6 content styles
- [§6. Data Schemas](#6-data-schemas) — Zod schemas, JSON structures
- [§7. Command Specifications](#7-command-specifications) — CLI commands
- [§8. Technology Stack](#8-technology-stack) — Dependencies, tools
- [§9. Performance Expectations](#9-performance-expectations) — Timing, costs, outputs

### Part III: Quality & Implementation
- [§10. Testing Strategy](#10-testing-strategy) — Test pyramid, LLM evals
- [§11. Implementation Plan](#11-implementation-plan) — Development order
- [§12. Security Considerations](#12-security-considerations) — API keys, content safety
- [§13. References](#13-references) — Research documents

### Part IV: Critical Evaluation & Iterations
- [§14. Critical Evaluation](#14-critical-evaluation) — Gaps, risks, questions
- [§15. Updated Design Decisions](#15-updated-design-decisions-post-investigation) — Post-investigation
- [§16. Critical Evaluation — Iterations 2-5](#16-critical-evaluation--iteration-2) — Convergence
- [§17. Implementation Readiness Assessment](#17-implementation-readiness-assessment) — Go/no-go

### Part V: Extensibility & Appendices
- [§18. Extensibility Architecture](#18-extensibility-architecture) — 12 extension points
- [§19. Appendix: Investigation Documents](#19-appendix-investigation-documents-index) — RQ-01 to RQ-23

---

## Executive Summary

**content-machine** is an open-source command-line tool that transforms ideas into publication-ready short-form videos for TikTok, Instagram Reels, and YouTube Shorts.

### The Problem

Creating short-form video content today requires:
- **Video editing skills** — Learning Premiere Pro, DaVinci Resolve, or CapCut
- **Voice recording** — Quality microphone, quiet room, confident delivery
- **Stock footage hunting** — Manually searching Pexels/Pixabay, downloading clips
- **Caption timing** — Painstakingly syncing words to audio
- **Platform knowledge** — Different aspect ratios, length limits, trending styles

A single 60-second video takes 2-4 hours for a skilled creator. For developers, marketers, and educators who need content but aren't video editors, this is prohibitive.

### The Solution

content-machine automates the entire pipeline:

```
Your topic → AI script → AI voice → AI visuals → Rendered video
```

**One command. One video. Under 5 minutes.**

```bash
# Generate a complete video from a topic
cm generate "Why Redis is faster than PostgreSQL for caching"
```

The system handles:
- ✅ Script writing with viral hooks and clear structure
- ✅ Natural-sounding voiceover (no robotic TTS)
- ✅ Automatic stock footage matching (semantic, not keyword)
- ✅ Word-level animated captions (TikTok style)
- ✅ Professional rendering at 1080x1920 (9:16)

### Who Is This For?

| Persona | Use Case | Content Style |
|---------|----------|---------------|
| **Developer Advocates** | Explain technical concepts | Educational |
| **Indie Hackers** | Promote SaaS products | Product Demo |
| **Content Agencies** | Scale video production | All styles |
| **Educators** | Create learning content | Educational |
| **Meme Creators** | Gen Z entertainment | Brainrot, Meme |
| **Story Narrators** | Reddit stories, drama | Story |

### What Makes This Different?

| Feature | Existing Tools | content-machine |
|---------|----------------|-----------------|
| **Video quality** | Stock templates, generic | LLM-reasoned, semantic |
| **Voice quality** | Robotic TTS | Kokoro (human-like) |
| **Footage matching** | Keyword search | Embedding similarity |
| **Customization** | Limited presets | Full archetype system |
| **Price** | $20-100/month | Free (open source) |
| **Privacy** | Cloud-only | Local-first option |

---

## User Experience & Interaction

### Installation

```bash
# Install globally via npm
npm install -g content-machine

# Verify installation
cm --version
# content-machine v1.0.0
```

### First-Time Setup

```bash
$ cm init

  ╭─────────────────────────────────────────────────────╮
  │                                                     │
  │   🎬 Welcome to content-machine!                    │
  │                                                     │
  │   Let's set up your environment.                    │
  │                                                     │
  ╰─────────────────────────────────────────────────────╯

? OpenAI API key: sk-...
  ✓ API key validated

? Default content style:
  ❯ educational (clear, informative, professional)
    brainrot (fast cuts, Gen Z energy)
    story (dramatic, suspenseful)
    meme (punchy, ironic)
    product (demo-focused)
    motivational (inspiring quotes)

? TTS voice preference:
  ❯ af_heart (warm, natural female)
    am_fenrir (deep, authoritative male)
    af_nicole (energetic female)

  ✓ Configuration saved to ~/.cmrc.json
  
  You're ready! Try: cm generate "Your topic here"
```

### Basic Usage: One-Command Video Generation

```bash
$ cm generate "5 JavaScript tricks senior devs use"

  ╭─────────────────────────────────────────────────────╮
  │  🎬 content-machine                                 │
  │  Topic: 5 JavaScript tricks senior devs use         │
  │  Style: educational                                 │
  ╰─────────────────────────────────────────────────────╯

  [1/4] 📝 Generating script...
        ├─ Hook: "Stop writing JavaScript like a junior..."
        ├─ Scenes: 6
        ├─ Duration: ~45 seconds
        └─ ✓ script.json (2.3s)

  [2/4] 🎤 Creating voiceover...
        ├─ TTS engine: kokoro (af_heart)
        ├─ Words: 127
        ├─ Extracting timestamps...
        └─ ✓ audio.mp3, timestamps.json (8.1s)

  [3/4] 🎥 Matching visuals...
        ├─ Searching Pexels...
        ├─ Scene 1: "coding on laptop" → laptop-typing.mp4
        ├─ Scene 2: "frustrated developer" → stressed-coder.mp4
        ├─ Scene 3: "code on screen" → javascript-code.mp4
        ├─ Scene 4: "aha moment" → lightbulb-idea.mp4
        ├─ Scene 5: "professional coding" → dev-workspace.mp4
        ├─ Scene 6: "subscribe gesture" → follow-cta.mp4
        └─ ✓ visuals.json, assets/ (12.4s)

  [4/4] 🎞️ Rendering video...
        ├─ Resolution: 1080x1920 (9:16)
        ├─ Captions: tiktok-bold
        ├─ Compositing 6 scenes...
        ├─ Encoding: H.264 CRF 18
        └─ ✓ output.mp4 (45.2s)

  ╭─────────────────────────────────────────────────────╮
  │  ✅ Video generated successfully!                   │
  │                                                     │
  │  📁 Output: ./js-tricks/output.mp4                  │
  │  ⏱️  Duration: 45 seconds                           │
  │  💰 Cost: $0.04 (GPT-4o + embeddings)               │
  │                                                     │
  │  Preview: open ./js-tricks/output.mp4               │
  ╰─────────────────────────────────────────────────────╯
```

### Advanced Usage: Stage-by-Stage Control

For power users who want to edit intermediate outputs:

```bash
# Create project directory with research
mkdir redis-video && cd redis-video
echo '{"topic": "Why Redis beats PostgreSQL for caching"}' > research.json

# Step 1: Generate script (editable)
cm script research.json --archetype educational
# → Creates script.json (you can edit scenes, text, visual directions)

# Step 2: Generate audio from script
cm audio script.json --voice af_heart --speed 1.1
# → Creates audio.mp3, timestamps.json

# Step 3: Match visuals (provide your own footage)
cm visuals script.json --footage ./my-clips/ --stock
# → Creates visuals.json, assets/

# Step 4: Render final video
cm render . --quality high
# → Creates output.mp4
```

### Editing Intermediate Files

**script.json** is human-editable:

```json
{
  "scenes": [
    {
      "id": "scene-001",
      "text": "Stop using PostgreSQL for caching. Here's why Redis wins.",
      "visualDirection": "developer looking frustrated at slow loading screen",
      "mood": "dramatic"
    },
    {
      "id": "scene-002", 
      "text": "Redis stores everything in RAM. That means microsecond reads.",
      "visualDirection": "server room with blinking lights, fast motion",
      "mood": "energetic"
    }
  ]
}
```

You can:
- Edit the spoken text
- Change visual directions for better footage matches
- Add/remove scenes
- Adjust mood indicators

Then re-run downstream stages:
```bash
cm audio script.json    # Re-generate audio with your edits
cm visuals script.json  # Re-match visuals
cm render .             # Re-render
```

### Content Style Examples

**Brainrot Style (Gen Z):**
```bash
cm generate "POV: you mass mass assignment in production" --archetype brainrot
```
- Split-screen with Minecraft parkour
- Rapid 1.5-second cuts
- Bouncing captions, red highlights
- "bro", "literally", "lowkey" language
- 120 WPM speech rate

**Educational Style:**
```bash
cm generate "How DNS actually works" --archetype educational
```
- Clean stock footage
- 5-8 second scenes
- Professional font, bottom captions
- Formal language, clear explanations
- 95 WPM speech rate

**Reddit Story Style:**
```bash
cm generate "AITA for refusing to cook for my roommate's guests?" --archetype story
```
- Moody, abstract backgrounds
- Dramatic pauses
- Suspenseful music
- Narrative structure with tension

---

## MVP Scope & Boundaries

### ✅ What MVP Includes

| Capability | Implementation |
|------------|----------------|
| **Script generation** | GPT-4o with archetype-specific prompts |
| **Voice synthesis** | Kokoro (local, free, high-quality English) |
| **Stock footage** | Pexels API (free, semantic matching) |
| **Caption rendering** | Word-level timing, 17 caption styles |
| **Video output** | 1080x1920 (9:16), H.264, 30fps |
| **Content styles** | 6 archetypes (brainrot, meme, educational, story, product, motivational) |
| **CLI interface** | `cm generate`, `cm script`, `cm audio`, `cm visuals`, `cm render` |

### ❌ What MVP Does NOT Include

| Not Included | Why | Post-MVP Plan |
|--------------|-----|---------------|
| **Web UI** | Complexity, needs API server | v2.0 with React dashboard |
| **Auto-publishing** | ToS risks, API complexity | v2.0 with official APIs |
| **Trend research** | Scope creep, needs MCP servers | v1.5 with Reddit/YouTube MCP |
| **Batch processing** | Needs job queue infrastructure | v1.5 with BullMQ |
| **Screen recording** | Playwright complexity | v2.0 for product demos |
| **Music/background audio** | Licensing complexity | v1.5 with royalty-free sources |
| **Multi-language** | TTS quality varies | v2.0 with Edge TTS fallback |
| **Team collaboration** | Needs database, auth | v3.0 with Supabase |

### 🎯 MVP Success Criteria

1. Generate a complete 60-second video from topic in under 5 minutes
2. Output quality comparable to manual CapCut/Premiere workflow
3. All 6 archetypes produce stylistically appropriate content
4. Zero Python dependencies (pure TypeScript)
5. Works on macOS, Windows, Linux
6. Total API cost under $0.10 per video

---

## Expectations: What You Can & Can't Expect

### ✅ You CAN Expect

| Expectation | Confidence | Evidence |
|-------------|------------|----------|
| **Professional-quality output** | High | Remotion rendering, Kokoro TTS |
| **Semantic footage matching** | High | Embedding similarity + LLM reasoning |
| **Consistent styling** | High | Archetype system with 50+ parameters |
| **Fast generation** | High | ~4 minutes per video with GPU |
| **Low cost** | High | ~$0.05/video with GPT-4o-mini |
| **Reproducibility** | High | JSON configs, seed control |
| **Extensibility** | High | 12 extension points, plugin system |

### ⚠️ You SHOULD Expect (With Caveats)

| Expectation | Caveat | Mitigation |
|-------------|--------|------------|
| **Good scripts** | LLMs can produce generic content | Edit script.json before rendering |
| **Relevant footage** | Pexels doesn't cover everything | Provide your own clips via `--footage` |
| **Natural voice** | Kokoro is English-only | Edge TTS fallback for other languages |
| **Fast on CPU** | Whisper/Remotion are GPU-optimized | Allow 10+ minutes without GPU |

### ❌ You CANNOT Expect

| Don't Expect | Reality | Alternative |
|--------------|---------|-------------|
| **Viral videos guaranteed** | Content quality ≠ virality | A/B test, iterate on hooks |
| **Zero editing needed** | AI isn't perfect | Review and edit script.json |
| **Free stock for everything** | Pexels has gaps | Upload custom footage |
| **Real product demos** | No screen recording yet | Manually record, use as footage |
| **One-click publishing** | Not in MVP | Manual upload to platforms |
| **Offline mode** | LLM/TTS need internet | Post-MVP local model support |

### ⚙️ Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **API rate limits** | Pexels: 200 req/hour | Multi-key rotation, caching |
| **Remotion memory** | 4-8GB RAM needed | Reduce concurrency, split scenes |
| **Long videos** | >90s may OOM | Split into multiple videos |
| **Copyright** | User's responsibility | Use your own footage for sensitive content |
| **Prompt injection** | User input goes to LLM | Don't run on untrusted input |

---

## Post-MVP Roadmap

### v1.5: Research & Batch (Q2 2026)

| Feature | Description |
|---------|-------------|
| **cm research** | MCP-powered trend discovery from Reddit, Hacker News, YouTube |
| **Batch mode** | Generate multiple videos from CSV/JSON list |
| **Music library** | Royalty-free background tracks, auto-matched to mood |
| **Local caching** | Don't re-download same stock footage |
| **--offline flag** | Ollama + local Whisper for air-gapped usage |

### v2.0: Web Interface (Q3 2026)

| Feature | Description |
|---------|-------------|
| **Dashboard** | Web UI for non-technical users |
| **Project library** | Browse and manage generated videos |
| **Template editor** | Visual archetype customization |
| **Team sharing** | Share projects, templates, footage |
| **Auto-publish** | One-click TikTok/YouTube/Instagram upload |

### v2.5: Product Demos (Q4 2026)

| Feature | Description |
|---------|-------------|
| **Playwright capture** | Record real product UI automatically |
| **Product-truthful** | Sync voiceover to actual UI actions |
| **Cursor animations** | Natural mouse movements |
| **Highlight regions** | Auto-zoom on clicked elements |

### v3.0: Enterprise (2027)

| Feature | Description |
|---------|-------------|
| **Multi-tenant** | Isolated workspaces for agencies |
| **Usage analytics** | Track generation stats, costs |
| **SSO/SAML** | Enterprise authentication |
| **API access** | REST/GraphQL for integrations |
| **White-label** | Remove content-machine branding |

---

## 1. Introduction

### 1.1 Document Purpose

This document serves as the authoritative technical specification for content-machine. It is designed for:

- **Implementers** — Detailed schemas, interfaces, and patterns for building the system
- **Contributors** — Understanding design decisions and extension points
- **Evaluators** — Assessing the architecture's soundness and trade-offs

The document consolidates research from 139 vendored repositories and 86 deep-dive analysis documents into a single source of truth.

### 1.2 Product Vision

**content-machine democratizes short-form video creation.**

Today, creating a single 60-second TikTok video requires:
1. Writing a compelling script (30 min)
2. Recording or sourcing voiceover (30 min)
3. Finding and downloading stock footage (30 min)
4. Editing in Premiere/CapCut (60 min)
5. Adding captions and timing (30 min)

**Total: 3+ hours for a single video.**

content-machine reduces this to **one command, under 5 minutes**:

```bash
cm generate "Why PostgreSQL JSONB is underrated" --archetype educational
```

The AI handles script writing, voice synthesis, footage matching, and rendering. The human reviews and publishes.

### 1.3 Scope

The system generates short-form videos (15-60 seconds) for TikTok, Instagram Reels, and YouTube Shorts. The minimum viable product (MVP) focuses on a command-line interface that transforms research inputs into rendered videos through a four-stage pipeline: script generation, audio production, visual assembly, and video rendering.

**Multi-Demographic Support:** The system supports multiple content archetypes to serve diverse audiences:

| Archetype | Target Demographic | Style |
|-----------|-------------------|-------|
| **Brainrot** | Gen Z (13-24) | Fast cuts, gameplay background, meme energy |
| **Meme/Comedy** | Gen Z/Millennials (16-35) | Punchy, ironic, reaction-based |
| **Educational** | All ages (18-55) | Clear, well-paced, informative |
| **Reddit Story** | Millennials/Gen Z (16-40) | Dramatic, suspenseful, narrative |
| **Product Demo** | Professionals (20-45) | Clean, focused, product-truthful |
| **Motivational** | Millennials (18-40) | Inspiring, quote-driven, aspirational |

### 1.3 Research Foundation

This design draws from extensive analysis of existing solutions. The synthesis pyramid documented in [synthesis/README.md](../research/synthesis/README.md) organizes 139 repositories into four layers:

- **Layer 4 (Base):** 86 individual deep-dive documents analyzing specific repositories
- **Layer 3:** 12 category syntheses grouping repositories by function
- **Layer 2:** 4 theme syntheses identifying cross-cutting patterns
- **Layer 1:** Master architecture document consolidating all findings

Key blueprint repositories that inform this design:

| Repository | Analysis | Key Contribution |
|------------|----------|------------------|
| short-video-maker-gyori | [10-short-video-maker-gyori-20260102.md](../research/10-short-video-maker-gyori-20260102.md) | TypeScript + Remotion + MCP architecture |
| vidosy | [12-vidosy-20260102.md](../research/12-vidosy-20260102.md) | JSON-driven video configuration pattern |
| MoneyPrinterTurbo | [01-moneyprinter-turbo-20260102.md](../research/01-moneyprinter-turbo-20260102.md) | End-to-end pipeline with multi-provider TTS |
| template-tiktok | [04-template-tiktok-20260102.md](../research/04-template-tiktok-20260102.md) | Remotion caption rendering patterns |
| captacity | [09-captacity-20260102.md](../research/09-captacity-20260102.md) | Word-level caption timing and styling |

---

## 2. Design Principles

### 2.1 LLM-Native Architecture

The system treats large language models as first-class components rather than bolt-on features. All decision-making that involves understanding content, matching semantics, or generating creative output uses LLM reasoning rather than rule-based heuristics.

**No keyword matching.** Research into existing video generation tools ([L3-CAT-A-VIDEO-GENERATORS-20260104.md](../research/synthesis/L3-CAT-A-VIDEO-GENERATORS-20260104.md)) revealed that keyword-based footage matching produces poor results. The phrase "car accident" fails to match "vehicle collision"; "happy person" fails to match "joyful celebration." This system uses embedding-based semantic similarity combined with LLM reasoning to select footage.

**Flexible schemas.** Analysis of MoneyPrinterTurbo's Pydantic models ([01-moneyprinter-turbo-20260102.md](../research/01-moneyprinter-turbo-20260102.md)) showed that rigid schemas constrain LLM creativity. This system defines minimal required fields with freeform sections that allow LLMs to include additional context they deem relevant.

**Chain of thought reasoning.** For complex decisions like footage selection, the system prompts reasoning models to explain their choices. This produces auditable decisions and enables iterative prompt improvement.

### 2.2 Configuration-First Design

All behaviors are configurable. Models, prompts, voice settings, and rendering templates can be changed without code modifications. This supports:

- Experimentation with different LLM providers
- A/B testing of prompt variations
- User customization for different content styles
- Local development with cheaper models

### 2.3 Embeddings from Day One

Semantic search using vector embeddings is built into the core architecture rather than added as an optimization. Visual direction text from scripts is embedded and matched against embedded footage descriptions. This approach was validated by reviewing Clip-Anything's multimodal analysis pipeline ([14-clip-anything-20260102.md](../research/14-clip-anything-20260102.md)).

---

## 3. System Overview

### 3.1 Architecture Pattern

The MVP uses a CLI-first architecture where each pipeline stage is an independent command. Stages communicate through JSON files on the local filesystem.

This pattern was selected based on analysis of orchestration approaches in [L3-CAT-I-ORCHESTRATION-QUEUES-20260104.md](../research/synthesis/L3-CAT-I-ORCHESTRATION-QUEUES-20260104.md). The CLI approach offers advantages for an MVP:

| Benefit | Description |
|---------|-------------|
| Debuggable | JSON outputs between stages can be inspected and edited |
| Composable | Individual stages can be re-run without restarting the pipeline |
| Testable | Each command can be tested in isolation |
| Scriptable | Commands can be chained in shell scripts or CI/CD workflows |
| No infrastructure | No Redis, PostgreSQL, or Docker required |

### 3.2 Pipeline Stages

```
research.json ──▶ cm script ──▶ cm audio ──▶ cm visuals ──▶ cm render ──▶ output.mp4
```

The four-stage MVP pipeline transforms research input into rendered video:

1. **cm script** — Generates structured video script from research context
2. **cm audio** — Produces voiceover audio and extracts word-level timestamps
3. **cm visuals** — Matches footage to scene descriptions using embeddings
4. **cm render** — Composes final video using Remotion

Research and publishing commands (cm research, cm publish) are deferred to post-MVP. The core pipeline can be tested with manually-created research.json files.

### 3.3 Project Directory Structure

Each video project is a folder containing standardized files:

```
project/
├── research.json      # Input: topic and research context
├── script.json        # cm script output: scenes with visual directions
├── audio.mp3          # cm audio output: voiceover audio
├── timestamps.json    # cm audio output: word-level timing
├── visuals.json       # cm visuals output: footage-to-scene mapping
├── assets/            # cm visuals output: copied/downloaded clips
│   ├── scene-001.mp4
│   ├── scene-002.mp4
│   └── ...
└── output.mp4         # cm render output: final video
```

---

## 4. Configuration System

> **Research:** [SECTION-CONFIG-SYSTEMS-20260104.md](../research/sections/SECTION-CONFIG-SYSTEMS-20260104.md) — TOML, Pydantic BaseSettings, dotenv patterns from MoneyPrinterTurbo, short-video-maker-gyori

### 4.1 Global Configuration File

The system reads configuration from `~/.cmrc.json`. This file defines LLM providers, embedding settings, and per-command options.

```json
{
  "llm": {
    "default": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.7
    },
    "reasoning": {
      "provider": "openai",
      "model": "o1-preview",
      "temperature": 1.0
    },
    "fast": {
      "provider": "anthropic",
      "model": "claude-3-haiku-20240307",
      "temperature": 0.5
    }
  },
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "commands": {
    "script": {
      "llm": "default"
    },
    "visuals": {
      "llm": "reasoning",
      "stockApis": ["pexels", "pixabay"]
    },
    "audio": {
      "ttsEngine": "kokoro",
      "ttsVoice": "af_heart",
      "asrEngine": "whisperx"
    },
    "render": {
      "defaultTemplate": "default",
      "quality": "standard"
    }
  },
  "promptsDir": "~/.cm-prompts/"
}
```

The configuration schema supports multiple named LLM configurations. Commands reference these by name, allowing different stages to use different models. The visuals command, which requires reasoning about footage selection, defaults to a reasoning model.

### 4.2 Environment Variables

API keys are never stored in configuration files. They are read from environment variables:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export PEXELS_API_KEY="..."
```

Environment variables can override configuration settings for quick experimentation:

```bash
export CM_LLM_PROVIDER="anthropic"
export CM_LLM_MODEL="claude-3-5-sonnet-20241022"
```

### 4.3 LLM Provider Abstraction

The system defines a provider interface that abstracts LLM interactions:

```typescript
interface LLMProvider {
  chat(messages: LLMMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    schema?: z.ZodSchema;
  }): Promise<LLMResponse>;
  
  embed(texts: string[]): Promise<number[][]>;
}
```

A factory function instantiates the appropriate provider based on configuration. Supported providers include OpenAI, Anthropic, Google, Ollama, and Azure. This abstraction was informed by MoneyPrinterTurbo's multi-provider LLM implementation ([01-moneyprinter-turbo-20260102.md](../research/01-moneyprinter-turbo-20260102.md)).

### 4.4 Prompt Template System

Prompt templates are stored as external Markdown files with YAML frontmatter:

```markdown
---
name: default
version: 1.0.0
variables:
  - topic
  - research
  - targetDuration
---

# System
You are a viral short-form video scriptwriter.

# Task
Generate a {{targetDuration}}-second video script about: {{topic}}

# Research Context
{{research}}
```

Templates are versioned to enable A/B testing and reproducibility. The system tracks which template version produced each output in metadata fields.

---

## 5. Content Archetype System

> **Research:** [RQ-21-CONTENT-ARCHETYPES-20260105.md](../research/investigations/RQ-21-CONTENT-ARCHETYPES-20260105.md) — Multi-demographic content styles, pacing, captions, visuals

### 5.1 Archetype Overview

Content archetypes are preset configurations that define the entire video style — pacing, audio, captions, visuals, and script generation. Users select an archetype via CLI flag, and all downstream decisions inherit from it.

```bash
# Generate brainrot-style content for Gen Z
cm script research.json --archetype brainrot

# Generate educational content
cm script research.json --archetype educational

# Generate Reddit story
cm script research.json --archetype reddit-story
```

### 5.2 Built-in Archetypes

| ID | Name | Target | Pacing | Background |
|----|------|--------|--------|------------|
| `brainrot` | Gen Z Brainrot | 13-24 | 30 cuts/min | Gameplay split-screen |
| `meme` | Meme/Comedy | 16-35 | 20 cuts/min | Stock + reactions |
| `educational` | Educational | 18-55 | 10 cuts/min | Stock footage |
| `story` | Reddit Story | 16-40 | 12 cuts/min | Abstract/moody |
| `product` | Product Demo | 20-45 | 15 cuts/min | Screen capture |
| `motivational` | Motivational | 18-40 | 15 cuts/min | Stock + quotes |

### 5.3 Archetype Configuration Structure

Each archetype configures five subsystems:

```typescript
interface ContentArchetype {
  id: string;
  name: string;
  description: string;
  
  // Target audience
  targetDemographic: {
    ageRange: { min: number; max: number };
    interests: string[];
  };
  
  // Pacing controls
  pacing: {
    sceneDurationMs: { min: number; max: number };
    cutsPerMinute: { target: number; tolerance: number };
    transitionStyle: 'cut' | 'fade' | 'zoom' | 'glitch';
  };
  
  // Audio configuration
  audio: {
    voiceRate: number;        // 0.8-1.4
    musicMood: MusicMood;     // happy, dark, euphoric, etc.
    musicVolume: 'off' | 'low' | 'medium' | 'high';
    useMemeAudio: boolean;
  };
  
  // Caption styling
  captions: {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'black';
    position: 'top' | 'center' | 'bottom';
    textColor: string;
    strokeColor: string;
    highlightCurrentWord: boolean;
    highlightColor: string;
    animation: 'none' | 'bounce' | 'scale' | 'karaoke';
    wordsPerCaption: number;
  };
  
  // Visual configuration
  visuals: {
    backgroundType: 'stock-footage' | 'gameplay' | 'screen-capture' | 
                    'split-screen' | 'abstract' | 'user-footage';
    gameplayStyle?: 'minecraft-parkour' | 'subway-surfers' | 'car-racing';
    splitScreenRatio?: number;
    useEffects: boolean;
    effectTypes?: ('zoom' | 'shake' | 'glitch' | 'emoji-overlay')[];
    colorGrading?: 'none' | 'vibrant' | 'muted' | 'dark' | 'retro';
  };
  
  // Script generation
  script: {
    wordCountRange: { min: number; max: number };
    tone: 'casual' | 'energetic' | 'serious' | 'humorous' | 'dramatic';
    structure: 'hook-body-cta' | 'question-answer' | 'story-arc' | 'meme-format';
    language: 'formal' | 'informal' | 'slang' | 'gen-z';
    useHook: boolean;
    useCTA: boolean;
  };
  
  // Platform targeting
  platform: {
    platform: 'tiktok' | 'youtube-shorts' | 'instagram-reels' | 'all';
    maxDurationSeconds: number;
  };
}
```

### 5.4 Archetype Examples

**Gen Z Brainrot:**
```typescript
{
  id: 'brainrot',
  pacing: { sceneDurationMs: { min: 1500, max: 2500 }, cutsPerMinute: { target: 30 } },
  audio: { voiceRate: 1.3, musicMood: 'euphoric', musicVolume: 'high', useMemeAudio: true },
  captions: { fontFamily: 'Bangers', fontSize: 130, position: 'center', 
              highlightCurrentWord: true, highlightColor: '#FF0000', animation: 'bounce' },
  visuals: { backgroundType: 'split-screen', gameplayStyle: 'minecraft-parkour' },
  script: { tone: 'energetic', language: 'gen-z', wordCountRange: { min: 80, max: 120 } },
}
```

**Educational:**
```typescript
{
  id: 'educational',
  pacing: { sceneDurationMs: { min: 5000, max: 8000 }, cutsPerMinute: { target: 10 } },
  audio: { voiceRate: 0.95, musicMood: 'contemplative', musicVolume: 'low' },
  captions: { fontFamily: 'Inter', fontSize: 60, position: 'bottom', 
              highlightCurrentWord: false, animation: 'none' },
  visuals: { backgroundType: 'stock-footage', useEffects: false },
  script: { tone: 'informative', language: 'formal', wordCountRange: { min: 120, max: 180 } },
}
```

### 5.5 Custom Archetypes

Users can create custom archetypes or extend built-in ones:

```json
// ~/.cm/archetypes/my-style.json
{
  "extends": "brainrot",
  "name": "My Custom Style",
  "captions": {
    "fontFamily": "Comic Sans MS",
    "textColor": "#00FF00"
  }
}
```

### 5.6 Archetype-Specific Prompts

Each archetype has a corresponding script generation prompt:

```markdown
---
name: script-brainrot
archetype: brainrot
---

# System
You are a Gen Z content creator making viral TikToks.
Use slang, be chaotic, be unhinged but relatable.

# Rules
- HOOK in first 2 seconds (shocking statement or question)
- SHORT sentences (3-5 words max)
- Use filler: "bro", "literally", "lowkey", "no cap"
- Be dramatic and exaggerated
- NO formal language, NO CTAs
- Target: 80-120 words

# Topic
{{topic}}
```

### 5.7 Split-Screen Implementation (Brainrot)

For brainrot content with gameplay backgrounds:

```typescript
// Remotion composition
const SplitScreenComposition = ({ mainContent, gameplayFootage, ratio = 0.5 }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ height: `${ratio * 100}%` }}>
      <OffthreadVideo src={mainContent} />
    </AbsoluteFill>
    <AbsoluteFill style={{ top: `${ratio * 100}%`, height: `${(1-ratio) * 100}%` }}>
      <OffthreadVideo src={gameplayFootage} />
    </AbsoluteFill>
  </AbsoluteFill>
);
```

### 5.8 Gameplay Asset Library

Brainrot content requires a gameplay clip library:

```
~/.cm/assets/gameplay/
├── minecraft-parkour/
│   ├── clip-001.mp4
│   └── clip-002.mp4
├── subway-surfers/
├── car-racing/
└── satisfying-asmr/
```

Users must provide their own gameplay clips (copyright compliance).

---

## 6. Data Schemas

> **Research:** [SECTION-SCHEMAS-VALIDATION-20260104.md](../research/sections/SECTION-SCHEMAS-VALIDATION-20260104.md) — Zod safeParse, z.infer, two-tier validation patterns from vidosy, short-video-maker-gyori

### 5.1 Design Philosophy

Schemas define minimal required structure with optional freeform sections. This approach balances type safety with LLM flexibility. Research into ShortGPT's rigid schemas ([08-shortgpt-20260102.md](../research/08-shortgpt-20260102.md)) revealed that overly constrained outputs limit creativity and force awkward workarounds.

### 5.2 Research Input Schema

The research document requires only a topic. All other fields are optional:

```typescript
const ResearchDocumentSchema = z.object({
  topic: z.string(),
  targetDuration: z.number().optional(),
  targetPlatform: z.string().optional(),
  research: z.unknown(),  // Freeform LLM output
  structured: z.object({
    facts: z.array(z.string()).optional(),
    quotes: z.array(z.object({
      text: z.string(),
      source: z.string().optional(),
    })).optional(),
    suggestedAngles: z.array(z.string()).optional(),
  }).optional(),
  sources: z.array(z.object({
    url: z.string().optional(),
    title: z.string().optional(),
  })).optional(),
  meta: z.object({
    createdAt: z.string().datetime(),
    researchModel: z.string().optional(),
  }).optional(),
  extra: z.record(z.unknown()).optional(),
});
```

The `research` field accepts any structure the LLM produces. The `structured` field provides optional typed sections for common elements. The `extra` field catches additional LLM output.

### 5.3 Script Output Schema

The generated script requires scenes and reasoning. Everything else is optional:

```typescript
const SceneSchema = z.object({
  text: z.string(),
  visualDirection: z.string(),
  id: z.string().optional(),
  duration: z.number().optional(),
  mood: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
});

const GeneratedScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(1),
  reasoning: z.string(),
  title: z.string().optional(),
  hook: z.string().optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  meta: z.object({
    estimatedDuration: z.number().optional(),
    generatedAt: z.string().datetime(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
  }).optional(),
  extra: z.record(z.unknown()).optional(),
});
```

The required `reasoning` field captures the LLM's thought process, enabling debugging and prompt iteration.

### 5.4 Timestamps Schema

Word-level timestamps enable synchronized caption rendering:

```typescript
const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().optional(),
});

const TimestampsSchema = z.object({
  scenes: z.array(z.object({
    sceneId: z.string(),
    audioStart: z.number(),
    audioEnd: z.number(),
    words: z.array(WordTimestampSchema),
  })),
  allWords: z.array(WordTimestampSchema),
  totalDuration: z.number(),
  ttsEngine: z.string(),
  asrEngine: z.string(),
});
```

This structure was designed based on analysis of WhisperX output formats ([L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md](../research/synthesis/L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md)).

### 5.5 Visual Plan Schema

The visual plan maps scenes to footage with reasoning metadata:

```typescript
const MatchReasoningSchema = z.object({
  reasoning: z.string(),
  conceptsMatched: z.array(z.string()).optional(),
  moodAlignment: z.string().optional(),
  alternatives: z.array(z.object({
    path: z.string(),
    whyNotChosen: z.string(),
  })).optional(),
});

const VisualAssetSchema = z.object({
  sceneId: z.string(),
  source: z.enum(['user-footage', 'stock-pexels', 'stock-pixabay', 'fallback-color']),
  assetPath: z.string(),
  embeddingSimilarity: z.number(),
  llmConfidence: z.number(),
  matchReasoning: MatchReasoningSchema,
  visualCue: z.string(),
  duration: z.number(),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
  trimReasoning: z.string().optional(),
});

const VisualPlanSchema = z.object({
  scenes: z.array(VisualAssetSchema),
  totalAssets: z.number(),
  fromUserFootage: z.number(),
  fromStock: z.number(),
  fallbacks: z.number(),
  embeddingModel: z.string(),
  reasoningModel: z.string(),
});
```

The `matchReasoning` field preserves the LLM's explanation for each footage selection, enabling review and debugging.

---

## 7. Command Specifications

> **CLI Research:** [SECTION-CLI-ARCHITECTURE-20260104.md](../research/sections/SECTION-CLI-ARCHITECTURE-20260104.md) — Commander.js, ora spinners, chalk logging from vidosy, budibase

### 7.1 cm script

> **Research:** [SECTION-SCRIPT-GENERATION-20260104.md](../research/sections/SECTION-SCRIPT-GENERATION-20260104.md) — YAML prompts, 13 LLM providers, structured output from ShortGPT, MoneyPrinterTurbo

**Purpose:** Generate video script from research input using archetype-specific prompts and settings.

**Usage:**
```bash
cm script <research.json> [--archetype <name>] [--prompt <template>] [--llm <config>]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--archetype` | Content archetype (brainrot, meme, educational, story, product, motivational) | `educational` |
| `--prompt` | Override prompt template | archetype default |
| `--llm` | LLM config name from ~/.cmrc.json | `default` |

**Processing:**

1. Load configuration from ~/.cmrc.json
2. Load archetype configuration (built-in or custom)
3. Read and validate research.json against ResearchDocumentSchema
4. Load archetype-specific prompt template
5. Inject variables (topic, research, targetDuration, archetype settings) into template
6. Call LLM with populated prompt, requesting JSON output matching archetype word count
7. Validate response against GeneratedScriptSchema
8. Write script.json with generation metadata including archetype

**Error handling:**

| Condition | Behavior |
|-----------|----------|
| research.json not found | Exit 1 with usage message |
| Schema validation fails | Exit 1 with validation errors |
| LLM returns invalid JSON | Retry 5x with progressive repair |
| Unknown archetype | Exit 1 with list of valid archetypes |

### 7.2 cm audio

> **Research:** [SECTION-AUDIO-PIPELINE-20260104.md](../research/sections/SECTION-AUDIO-PIPELINE-20260104.md) — Edge TTS SubMaker (built-in timestamps), Kokoro, Whisper.cpp from MoneyPrinterTurbo, short-video-maker-gyori

**Purpose:** Generate voiceover audio with archetype-specific voice rate and style.

**Usage:**
```bash
cm audio <script.json> [--voice <name>] [--speed <factor>]
```

**Processing:**

1. Read script.json and load archetype (from script metadata)
2. Apply archetype audio settings (voiceRate, musicMood, musicVolume)
3. Concatenate scene text, track scene boundaries
4. Call TTS engine (Kokoro or EdgeTTS) with archetype voice rate
5. Call ASR engine (whisper.cpp) to extract word timestamps
5. Align words back to scene boundaries
6. Normalize audio volume with FFmpeg
7. Write audio.mp3 and timestamps.json

**TTS options** were evaluated in [L3-CAT-F-TTS-AUDIO-20260104.md](../research/synthesis/L3-CAT-F-TTS-AUDIO-20260104.md):

| Engine | Quality | Cost | Languages |
|--------|---------|------|-----------|
| Kokoro | Excellent | Free (local) | English |
| EdgeTTS | Good | Free (cloud) | 30+ |
| ElevenLabs | Excellent | Paid | Many |

Kokoro is the default for English content. EdgeTTS provides free multilingual fallback.

**Error handling:**

| Condition | Behavior |
|-----------|----------|
| Kokoro unavailable | Fall back to EdgeTTS |
| WhisperX fails | Retry with different model size |
| Timestamp alignment fails | Use estimated timings, log warning |
| FFmpeg not installed | Exit 1 with install instructions |

### 7.3 cm visuals

> **Research:** [SECTION-VISUAL-MATCHING-20260104.md](../research/sections/SECTION-VISUAL-MATCHING-20260104.md) — Pexels API patterns, keyword matching, joker fallbacks from short-video-maker-gyori, MoneyPrinterTurbo

**Purpose:** Match footage to scene descriptions using archetype-specific visual sources.

**Usage:**
```bash
cm visuals <script.json> [--footage <dir>] [--gameplay <dir>] [--stock] [--dry-run]
```

**Archetype-Specific Behavior:**

| Archetype | Primary Source | Fallback |
|-----------|----------------|----------|
| `brainrot` | `--gameplay` directory | Solid color + effects |
| `meme` | Stock footage + reactions | User footage |
| `educational` | Pexels/Pixabay | Abstract gradients |
| `story` | Abstract loops, moody stock | User footage |
| `product` | Screen capture (user-provided) | Stock |

**Processing:**

1. Read script.json and extract archetype + visual directions
2. Based on archetype, determine footage source priority
3. For brainrot: load gameplay clips from `--gameplay` or `~/.cm/assets/gameplay/`
4. For others: index user footage, enable stock if `--stock` flag
5. For each scene:
   - Embed visual direction + scene context
   - Search for candidates by archetype source + cosine similarity
   - For split-screen archetypes: select both main content AND gameplay clip
   - Copy/download selected assets to assets/
6. Write visuals.json with archetype metadata

**Split-Screen Handling (Brainrot):**
When archetype uses `split-screen` background type, visuals.json includes:
```json
{
  "sceneId": "scene-001",
  "mainContent": { "path": "assets/stock-clip.mp4" },
  "gameplayClip": { "path": "assets/gameplay/minecraft-001.mp4" },
  "splitRatio": 0.5
}
```

### 7.4 cm render

> **Research:** [SECTION-VIDEO-RENDERING-20260104.md](../research/sections/SECTION-VIDEO-RENDERING-20260104.md) — Remotion compositions, TikTok captions, scene sequencing from short-video-maker-gyori, vidosy, template-tiktok-base

**Purpose:** Compose final video using archetype-specific caption styling, pacing, and effects.

**Usage:**
```bash
cm render <project-dir> [--quality <level>]
```

**Archetype-Driven Rendering:**

The archetype (stored in script.json) controls all rendering decisions:

| Setting | Brainrot | Educational | Story |
|---------|----------|-------------|-------|
| Caption font | Bangers 130px | Inter 60px | LuckiestGuy 100px |
| Caption position | center | bottom | center |
| Word highlight | ✓ red | ✗ | ✓ blue |
| Animation | bounce | none | karaoke |
| Transition | cut | fade | fade |
| Color grading | vibrant | none | dark |
| Background | split-screen | stock | abstract |

**Processing:**

1. Validate project directory contains required files
2. Load archetype from script.json metadata
3. Apply archetype pacing (scene duration, transition style)
4. Apply archetype captions (font, size, position, highlight, animation)
5. Apply archetype visuals (split-screen if needed, color grading, effects)
6. Build Remotion composition with all archetype settings
7. Invoke Remotion render
8. Post-process with FFmpeg (add background music at archetype volume)
9. Write output.mp4

**Remotion composition** layers (updated for split-screen):

```
┌─────────────────────────────────────┐
│     Layer 3: Audio                  │  ← Voiceover + optional music
├─────────────────────────────────────┤
│     Layer 2: Captions               │  ← Word-by-word animation
├─────────────────────────────────────┤
│     Layer 1: Background             │  ← Footage sequences
└─────────────────────────────────────┘
```

**Caption styling** uses patterns from remotion-subtitles with 17 presets:

| Style | Description |
|-------|-------------|
| tiktok-bold | White text, black stroke, bounce animation |
| karaoke | Word-by-word highlight |
| typewriter | Character-by-character reveal |
| minimal | Simple fade |

**Templates** define style presets:

| Template | Use Case |
|----------|----------|
| default | General purpose |
| gaming-hype | Gaming content with effects |
| story-dramatic | Reddit stories with tension |
| product-demo | Clean, focused on UI |

**Quality levels** control encoding:

| Level | Resolution | Bitrate | Use Case |
|-------|------------|---------|----------|
| draft | 720p | Low | Preview |
| standard | 1080p | Medium | General |
| high | 1080p | High | Final export |

### 7.5 cm generate (Convenience Wrapper)

**Purpose:** One-command video generation that runs all four stages automatically.

**Usage:**
```bash
cm generate <topic> [--archetype <name>] [--output <dir>] [--quality <level>]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--archetype` | Content style preset | `educational` |
| `--output` | Output directory | `./<topic-slug>/` |
| `--quality` | Render quality (draft, standard, high) | `standard` |
| `--voice` | TTS voice override | archetype default |
| `--stock` | Enable stock footage from Pexels | `true` |
| `--dry-run` | Generate script.json only, don't render | `false` |

**Example:**
```bash
cm generate "Why Redis is faster than PostgreSQL" --archetype educational --quality high
```

**Processing:**

1. Create project directory with sanitized topic name
2. Generate `research.json` with topic
3. Run `cm script` → `script.json`
4. Run `cm audio` → `audio.mp3`, `timestamps.json`
5. Run `cm visuals` → `visuals.json`, `assets/`
6. Run `cm render` → `output.mp4`
7. Display cost summary and output path

### 7.6 cm init (Setup Wizard)

**Purpose:** Interactive first-time setup for API keys and preferences.

**Usage:**
```bash
cm init
```

**Processing:**

1. Prompt for OpenAI API key (required)
2. Validate API key with test request
3. Prompt for default content archetype
4. Prompt for TTS voice preference
5. Write `~/.cmrc.json` with configuration
6. Display getting started message

### 7.7 CLI Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cm generate <topic>` | One-command video generation | `--archetype`, `--quality` |
| `cm script <research.json>` | Generate video script | `--archetype`, `--prompt` |
| `cm audio <script.json>` | Generate voiceover + timestamps | `--voice`, `--speed` |
| `cm visuals <script.json>` | Match footage to scenes | `--footage`, `--stock` |
| `cm render <project-dir>` | Render final video | `--quality` |
| `cm init` | First-time setup | — |
| `cm --version` | Show version | — |
| `cm --help` | Show help | — |

---

## 8. Technology Stack

### 8.1 MVP Dependencies

Technology choices were evaluated across synthesis documents. Final selections:

| Component | Technology | Reference |
|-----------|------------|-----------|
| Language | TypeScript | Remotion compatibility |
| CLI Framework | Commander.js | Node.js standard |
| Validation | Zod | TypeScript-native schemas |
| Rendering | Remotion | [L3-CAT-C-RENDERING-COMPOSITION-20260104.md](../research/synthesis/L3-CAT-C-RENDERING-COMPOSITION-20260104.md) |
| Captions | remotion-subtitles | [04-template-tiktok-20260102.md](../research/04-template-tiktok-20260102.md) |
| TTS | Kokoro / EdgeTTS | [L3-CAT-F-TTS-AUDIO-20260104.md](../research/synthesis/L3-CAT-F-TTS-AUDIO-20260104.md) |
| ASR | WhisperX | [L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md](../research/synthesis/L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md) |
| Encoding | FFmpeg | Industry standard |
| Stock Footage | Pexels / Pixabay | Free commercial use |

### 8.2 Future Additions

Post-MVP infrastructure evaluated in [L2-THEME-4-INFRASTRUCTURE-PUBLISHING-20260104.md](../research/synthesis/L2-THEME-4-INFRASTRUCTURE-PUBLISHING-20260104.md):

| Component | Technology | Trigger |
|-----------|------------|---------|
| Job Queue | BullMQ | Batch processing needed |
| API Server | Hono | Web interface needed |
| Database | PostgreSQL + Drizzle | Persistence needed |
| Object Storage | MinIO | Cloud deployment |
| Vector Search | Qdrant | Large footage libraries |
| Observability | Langfuse | LLM debugging |

---

## 9. Performance Expectations

### 9.1 Processing Time

Estimated times for a 60-second video on a machine with GPU:

| Stage | Time | Notes |
|-------|------|-------|
| cm script | ~5s | LLM API call |
| cm audio | ~30s | TTS + ASR with GPU |
| cm visuals | ~10s | Embedding + reasoning |
| cm render | ~3min | Remotion + FFmpeg |
| **Total** | **~4min** | With GPU acceleration |

CPU-only processing increases cm audio time to approximately 5 minutes.

### 9.2 Cost per Video

Estimated costs using standard API pricing:

| Component | Cost |
|-----------|------|
| GPT-4o (script) | ~$0.02 |
| GPT-4o (visuals reasoning) | ~$0.03 |
| Embeddings | ~$0.001 |
| TTS (Kokoro) | Free |
| Stock API | Free |
| **Total** | **~$0.05** |

### 9.3 Output Examples

This section shows what content-machine produces at each stage.

#### Example Topic
**"Why Redis is faster than PostgreSQL for caching"**

#### Generated Script (script.json)
```json
{
  "schemaVersion": "1.0.0",
  "archetype": "educational",
  "scenes": [
    {
      "id": "scene-001",
      "text": "Stop using PostgreSQL for caching. You're wasting milliseconds on every request.",
      "visualDirection": "frustrated developer staring at slow loading screen",
      "mood": "dramatic"
    },
    {
      "id": "scene-002",
      "text": "Redis stores everything in RAM. That means reads in microseconds, not milliseconds.",
      "visualDirection": "fast motion server room with blinking lights",
      "mood": "energetic"
    },
    {
      "id": "scene-003",
      "text": "PostgreSQL writes to disk. Great for durability, terrible for speed.",
      "visualDirection": "slow hard drive spinning, data visualization",
      "mood": "explanatory"
    },
    {
      "id": "scene-004",
      "text": "Use Redis for sessions, rate limiting, and hot data. Your users will thank you.",
      "visualDirection": "happy user with fast loading website",
      "mood": "positive"
    }
  ],
  "reasoning": "Used hook-body-CTA structure. Opened with pain point (slow caching), explained the solution (Redis RAM storage), contrasted with the problem (PostgreSQL disk), closed with practical advice.",
  "meta": {
    "estimatedDuration": 28,
    "wordCount": 62,
    "generatedAt": "2026-01-05T14:32:00Z",
    "model": "gpt-4o",
    "promptVersion": "educational-v1.0.0"
  }
}
```

#### Generated Timestamps (timestamps.json)
```json
{
  "schemaVersion": "1.0.0",
  "totalDuration": 28.4,
  "ttsEngine": "kokoro",
  "asrEngine": "whisper-cpp",
  "scenes": [
    {
      "sceneId": "scene-001",
      "audioStart": 0.0,
      "audioEnd": 6.2,
      "words": [
        { "word": "Stop", "start": 0.0, "end": 0.35, "confidence": 0.98 },
        { "word": "using", "start": 0.35, "end": 0.62, "confidence": 0.99 },
        { "word": "PostgreSQL", "start": 0.62, "end": 1.45, "confidence": 0.97 },
        { "word": "for", "start": 1.45, "end": 1.58, "confidence": 0.99 },
        { "word": "caching.", "start": 1.58, "end": 2.10, "confidence": 0.98 }
      ]
    }
  ]
}
```

#### Visual Plan (visuals.json)
```json
{
  "schemaVersion": "1.0.0",
  "scenes": [
    {
      "sceneId": "scene-001",
      "source": "stock-pexels",
      "assetPath": "assets/scene-001.mp4",
      "embeddingSimilarity": 0.82,
      "llmConfidence": 0.88,
      "matchReasoning": {
        "reasoning": "Selected 'stressed programmer' clip because visual direction mentions frustration and loading screens. The clip shows a developer rubbing temples while looking at a laptop, conveying the pain point effectively.",
        "conceptsMatched": ["developer", "frustration", "computer screen"],
        "moodAlignment": "dramatic — matches the urgency of the hook"
      },
      "duration": 6.2,
      "trimStart": 2.0,
      "trimEnd": 8.2
    }
  ],
  "totalAssets": 4,
  "fromUserFootage": 0,
  "fromStock": 4,
  "fallbacks": 0
}
```

#### Final Output Specifications

| Property | Value |
|----------|-------|
| **Resolution** | 1080 × 1920 (9:16 portrait) |
| **Frame rate** | 30 fps |
| **Codec** | H.264 (libx264) |
| **Audio** | AAC 128kbps stereo |
| **Duration** | 28.4 seconds |
| **File size** | ~15 MB |
| **Captions** | Word-level, bottom-positioned, Inter font |

---

## 10. Testing Strategy

### 10.1 Test Pyramid

| Level | Coverage | Tools |
|-------|----------|-------|
| Unit | 70% | Vitest |
| Integration | 20% | Vitest + MSW |
| E2E | 10% | Playwright |

### 10.2 LLM Evals

Script generation and visual matching quality are measured using evaluation datasets:

```json
{
  "input": {"topic": "Minecraft parkour fails"},
  "expectedQualities": {
    "hasHook": true,
    "sceneCount": {"min": 3, "max": 8},
    "hasVisualDirections": true
  }
}
```

Evaluation frameworks from [L3-CAT-G-AGENT-FRAMEWORKS-20260104.md](../research/synthesis/L3-CAT-G-AGENT-FRAMEWORKS-20260104.md) (promptfoo, Langfuse) track quality over prompt iterations.

### 10.3 Test Fixtures

```
tests/fixtures/
├── research-minecraft.json
├── script-minecraft.json
├── footage/
│   ├── minecraft-parkour-01.mp4
│   ├── minecraft-parkour-01.json
│   └── gameplay-tense-moment.mp4
└── expected/
    └── visuals-minecraft.json
```

---

## 11. Implementation Plan

### 11.1 Development Order

Build the core pipeline first using TDD with mocked inputs:

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1 | Weeks 1-2 | cm script: schemas, prompts, LLM abstraction, evals |
| 2 | Weeks 3-4 | cm audio: TTS integration, WhisperX, timestamp alignment |
| 3 | Weeks 5-6 | cm visuals: embedding pipeline, reasoning, stock APIs |
| 4 | Weeks 7-8 | cm render: Remotion composition, templates, encoding |
| 5 | Weeks 9-10 | Integration: cm generate wrapper, error handling, docs |

### 11.2 Infrastructure (Week 1)

Before command implementation, establish core infrastructure:

- LLM provider abstraction
- Embedding provider abstraction
- Prompt template loader
- Configuration system
- Project directory utilities
- Zod schemas

### 11.3 Post-MVP

After core pipeline is stable:

- cm research: Web search, Reddit scraping, product capture
- cm publish: YouTube/TikTok/Instagram upload APIs
- Queue-based architecture for batch processing
- Web interface for non-technical users

---

## 12. Security Considerations

### 12.1 API Key Management

API keys are stored in environment variables, never in configuration files or committed to version control. The configuration file only contains non-sensitive settings.

### 12.2 Content Safety

User-provided footage is the user's responsibility for copyright compliance. The system does not automatically filter or validate content. Future versions may integrate content moderation APIs.

### 12.3 Platform Compliance

Publishing to social platforms uses official APIs where available. Unofficial API usage (documented in [L3-CAT-L-PUBLISHING-20260104.md](../research/synthesis/L3-CAT-L-PUBLISHING-20260104.md)) carries ToS violation risk and is documented as such.

---

## 13. References

### 13.1 Research Documents

| Document | Path |
|----------|------|
| Master Architecture | [synthesis/L1-MASTER-ARCHITECTURE-20260104.md](../research/synthesis/L1-MASTER-ARCHITECTURE-20260104.md) |
| Content Pipeline Theme | [synthesis/L2-THEME-1-CONTENT-PIPELINE-20260104.md](../research/synthesis/L2-THEME-1-CONTENT-PIPELINE-20260104.md) |
| Video Production Theme | [synthesis/L2-THEME-2-VIDEO-PRODUCTION-20260104.md](../research/synthesis/L2-THEME-2-VIDEO-PRODUCTION-20260104.md) |
| AI Orchestration Theme | [synthesis/L2-THEME-3-AI-ORCHESTRATION-20260104.md](../research/synthesis/L2-THEME-3-AI-ORCHESTRATION-20260104.md) |
| Infrastructure Theme | [synthesis/L2-THEME-4-INFRASTRUCTURE-PUBLISHING-20260104.md](../research/synthesis/L2-THEME-4-INFRASTRUCTURE-PUBLISHING-20260104.md) |
| Blueprint Repos | [synthesis/L3-CAT-B-BLUEPRINT-REPOS-20260104.md](../research/synthesis/L3-CAT-B-BLUEPRINT-REPOS-20260104.md) |
| Rendering | [synthesis/L3-CAT-C-RENDERING-COMPOSITION-20260104.md](../research/synthesis/L3-CAT-C-RENDERING-COMPOSITION-20260104.md) |
| Captions | [synthesis/L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md](../research/synthesis/L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md) |
| TTS/Audio | [synthesis/L3-CAT-F-TTS-AUDIO-20260104.md](../research/synthesis/L3-CAT-F-TTS-AUDIO-20260104.md) |

### 12.2 Section Research Documents

Each major system component has a dedicated research document with vendor code evidence:

| Section | Research Document | Key Patterns |
|---------|-------------------|--------------|
| Configuration System (§4) | [SECTION-CONFIG-SYSTEMS-20260104.md](../research/sections/SECTION-CONFIG-SYSTEMS-20260104.md) | TOML, Pydantic BaseSettings, dotenv |
| Data Schemas (§5) | [SECTION-SCHEMAS-VALIDATION-20260104.md](../research/sections/SECTION-SCHEMAS-VALIDATION-20260104.md) | Zod safeParse, z.infer, two-tier validation |
| cm script (§6.1) | [SECTION-SCRIPT-GENERATION-20260104.md](../research/sections/SECTION-SCRIPT-GENERATION-20260104.md) | YAML prompts, 13 LLM providers, structured output |
| cm audio (§6.2) | [SECTION-AUDIO-PIPELINE-20260104.md](../research/sections/SECTION-AUDIO-PIPELINE-20260104.md) | Edge TTS SubMaker, Kokoro, Whisper.cpp |
| cm visuals (§6.3) | [SECTION-VISUAL-MATCHING-20260104.md](../research/sections/SECTION-VISUAL-MATCHING-20260104.md) | Pexels API, keyword matching, joker fallbacks |
| cm render (§6.4) | [SECTION-VIDEO-RENDERING-20260104.md](../research/sections/SECTION-VIDEO-RENDERING-20260104.md) | Remotion compositions, TikTok captions |
| CLI Architecture | [SECTION-CLI-ARCHITECTURE-20260104.md](../research/sections/SECTION-CLI-ARCHITECTURE-20260104.md) | Commander.js, ora, chalk, pino |

### 12.3 External Documentation

| Resource | URL |
|----------|-----|
| Remotion | https://www.remotion.dev/docs/ |
| Zod | https://zod.dev/ |
| Commander.js | https://github.com/tj/commander.js |
| WhisperX | https://github.com/m-bain/whisperX |
| Kokoro | https://github.com/hexgrad/kokoro |

---

## 14. Critical Evaluation

This section provides a candid assessment of architectural gaps, engineering risks, and unresolved questions that require further research before implementation.

### 13.1 Architectural Gaps

#### GAP-1: No Idempotency or Resume Capability

**Problem:** The pipeline has no mechanism to resume from failure. If `cm visuals` crashes after downloading 8 of 10 clips, the entire stage must restart.

**Impact:** High. Video rendering is expensive (3+ minutes). Network failures, API rate limits, or OOM crashes waste significant time.

**Missing pieces:**
- No checkpointing mechanism
- No partial output handling
- No cleanup of orphaned assets on failure
- No `--resume` flag specified

**Question to research:** How do existing pipelines (FFmpeg, Remotion, MoviePy) handle partial state and resumption?

---

#### GAP-2: No Concurrency Model Defined

**Problem:** The document assumes sequential execution but doesn't address parallelism opportunities or thread safety.

**Missed opportunities:**
- Embedding multiple visual directions in parallel
- Downloading stock footage concurrently
- Rendering scenes in parallel (Remotion supports this)
- TTS generation could overlap with early ASR processing

**Missing pieces:**
- No `Promise.all()` patterns
- No worker pool sizing strategy
- No discussion of Node.js event loop implications
- No rate limiting strategy for parallel API calls

**Question to research:** What concurrency patterns do short-video-maker-gyori and MoneyPrinterTurbo use? How does Remotion handle parallel rendering?

---

#### GAP-3: No Versioning Strategy for Inter-Stage Contracts

**Problem:** Schema changes between stages could break saved projects. If `script.json` schema evolves, old projects become incompatible.

**Missing pieces:**
- No schema version field in JSON outputs
- No migration strategy for existing projects
- No backwards compatibility guarantees
- No deprecation policy

**Question to research:** How does vidosy handle config version migrations? What patterns exist for evolving JSON schemas without breaking clients?

---

#### GAP-4: State Management Across Stages is File-Based Only

**Problem:** JSON files work for MVP but create issues at scale:
- No atomic writes (crash during write = corrupted file)
- No locking (concurrent pipeline runs could collide)
- No change detection (can't tell if input changed since last run)

**Missing pieces:**
- No content hashing for change detection
- No file locking mechanism
- No transactional write pattern (write to temp, rename)

**Question to research:** How do build systems (Make, Bazel) handle incremental builds and change detection?

---

#### GAP-5: Error Taxonomy is Incomplete

**Problem:** Error handling tables exist but lack systematic classification:
- No distinction between retryable vs. fatal errors
- No error codes for programmatic handling
- No structured error output for CI/CD integration
- No guidance on user-facing vs. debug messages

**Missing pieces:**
- Error code taxonomy (E001, E002, etc.)
- Retry policies (exponential backoff? max attempts?)
- Error serialization format for JSON output mode

**Question to research:** How do professional CLIs (npm, cargo, gh) structure error output? What error taxonomies do they use?

---

### 13.2 Software Engineering Risks

#### RISK-1: LLM Output Validation is Naive (Single Retry)

**Problem:** §6.1 says "LLM returns invalid JSON → Retry once, then exit 1". This is insufficient:
- LLMs may consistently produce invalid output for certain inputs
- Single retry doesn't address systematic prompt issues
- No feedback loop to improve prompts from failures

**Better approaches:**
- Structured output modes (OpenAI JSON mode, Anthropic tool_use)
- Multiple validation attempts with progressive prompt fixes
- Logging failed outputs for prompt debugging
- Schema-guided generation (not just post-validation)

**Question to research:** How does Vercel AI SDK handle structured output validation? What recovery patterns exist for LLM parsing failures?

---

#### RISK-2: Embedding Dimension Mismatch Not Addressed

**Problem:** Config allows `embedding.dimensions: 1536` but different models produce different dimensions. Switching models without reindexing footage breaks similarity search.

**Missing pieces:**
- No validation that footage embeddings match current model
- No re-embedding trigger when config changes
- No dimension normalization strategy

**Question to research:** How do vector databases (Qdrant, Pinecone) handle embedding migration? What's the cost of re-embedding large footage libraries?

---

#### RISK-3: TTS-ASR Timestamp Alignment is Hand-Waved

**Problem:** §6.2 says "Align words back to scene boundaries" without specifying the algorithm. This is a non-trivial problem:
- TTS may change word timing (pauses, emphasis)
- ASR confidence affects word boundaries
- Scene boundaries are character-based, timestamps are time-based

**Missing pieces:**
- Alignment algorithm (DTW? Forced alignment?)
- Handling of ASR errors (missed words, hallucinated words)
- Confidence thresholds for fallback to estimation

**Question to research:** How does Edge TTS SubMaker align timestamps? What forced alignment algorithms exist (Montreal Forced Aligner, Gentle)?

---

#### RISK-4: No Observability Design

**Problem:** §7.2 mentions "Langfuse for LLM debugging" as post-MVP but there's no structured logging strategy for MVP:
- No trace IDs across pipeline stages
- No structured log format defined
- No metrics collection strategy
- No way to correlate failures across stages

**Missing pieces:**
- Correlation ID passed through all stages
- Structured log schema
- Timing metrics for performance analysis
- Cost tracking per video

**Question to research:** What observability patterns do vidosy and short-video-maker-gyori use? How to correlate logs across CLI invocations?

---

#### RISK-5: Testing Strategy Gaps

**Problem:** §9 defines a test pyramid but misses critical testing scenarios:
- No mocking strategy for LLM calls (expensive, non-deterministic)
- No snapshot testing for video frames
- No visual regression testing for caption styling
- No performance benchmarks defined

**Missing pieces:**
- LLM response fixtures for reproducible tests
- Golden video frame snapshots
- CSS snapshot testing for caption styles
- Benchmark suite for rendering performance

**Question to research:** How does Remotion test video output? What LLM mocking strategies exist (recorded responses, deterministic seeds)?

---

### 13.3 Design Principle Contradictions

#### CONTRADICTION-1: "Flexible Schemas" vs. Type Safety

**Problem:** §2.1 advocates "flexible schemas" with `z.unknown()` and `extra: z.record(z.unknown())`, but §5 shows extensive typed schemas. This tension is unresolved:
- Where exactly should flexibility exist?
- How do downstream stages handle unknown fields?
- Does `extra` get passed through or dropped?

**Question to research:** What schema versioning patterns exist for LLM outputs? How do Anthropic's tool schemas balance structure vs. flexibility?

---

#### CONTRADICTION-2: "No Keyword Matching" vs. Pexels API

**Problem:** §2.1 emphasizes "no keyword matching" for footage selection, but Pexels API is keyword-based. The document doesn't explain how semantic embeddings translate to API queries.

**Missing pieces:**
- LLM-generated keyword extraction from visual directions
- Query expansion strategy
- Handling of Pexels API limitations (max 80 chars, English only)

**Question to research:** How does short-video-maker-gyori translate visual directions to Pexels queries? What query generation patterns exist?

---

#### CONTRADICTION-3: CLI-First vs. LLM-Native

**Problem:** CLI architecture (§3.1) optimizes for human debugging ("JSON outputs can be inspected and edited"), but LLM-native architecture (§2.1) assumes automated decision-making. These create tension:
- Who is the user? Developers debugging? End users generating?
- Should outputs be human-readable or machine-optimized?
- How does "chain of thought reasoning" help a CLI user?

**Question to research:** What's the right balance? Should there be `--verbose` vs. `--json` modes? How do other AI CLIs (copilot, cursor) handle this?

---

### 13.4 Missing Non-Functional Requirements

#### NFR-1: No Resource Limits Defined

- Maximum input video file size?
- Maximum footage library size?
- Maximum concurrent API calls?
- Memory limits for Remotion rendering?

#### NFR-2: No Accessibility Considerations

- Captions are for entertainment, not accessibility
- No audio descriptions
- No color contrast requirements for captions
- No screen reader support for CLI output

#### NFR-3: No Internationalization Strategy

- Prompts are English-only
- Pexels queries are English-only
- No RTL language support for captions
- No locale-aware date/number formatting

#### NFR-4: No Offline Mode

- All stages require network access (LLM, TTS, embeddings)
- No local-only operation mode
- No caching strategy for repeated queries

---

### 13.5 Research Questions Requiring Investigation

The following questions must be answered before implementation can proceed confidently:

#### Pipeline Architecture

| ID | Question | Priority | Research Approach |
|----|----------|----------|-------------------|
| RQ-1 | How do we implement resumable/idempotent pipeline stages? | P0 | Study Make, Bazel, dvc patterns |
| RQ-2 | What concurrency model fits Node.js + external processes? | P0 | Analyze short-video-maker-gyori, Remotion |
| RQ-3 | How do we version inter-stage JSON schemas? | P1 | Review JSON Schema evolution patterns |

#### LLM Integration

| ID | Question | Priority | Research Approach |
|----|----------|----------|-------------------|
| RQ-4 | How do we reliably get structured output from LLMs? | P0 | Test OpenAI JSON mode, Anthropic tool_use |
| RQ-5 | How do we translate semantic visual directions to keyword queries? | P0 | Analyze existing implementations |
| RQ-6 | What's the optimal embedding model for visual matching? | P1 | Benchmark CLIP, text-embedding-3, voyage |

#### Audio Pipeline

| ID | Question | Priority | Research Approach |
|----|----------|----------|-------------------|
| RQ-7 | How does Edge TTS SubMaker extract timestamps? | P0 | Code review of MoneyPrinterTurbo |
| RQ-8 | What forced alignment algorithms are production-ready? | P1 | Evaluate MFA, Gentle, WhisperX align |
| RQ-9 | How do we handle TTS/ASR timestamp drift? | P1 | Measure error rates in practice |

#### Rendering

| ID | Question | Priority | Research Approach |
|----|----------|----------|-------------------|
| RQ-10 | How do we test video output for correctness? | P0 | Study Remotion testing patterns |
| RQ-11 | What's the memory footprint of Remotion for 1080p? | P1 | Benchmark on target hardware |
| RQ-12 | How do we handle Remotion licensing for commercial use? | P0 | Review Remotion license terms |

#### Quality & Operations

| ID | Question | Priority | Research Approach |
|----|----------|----------|-------------------|
| RQ-13 | How do we measure video quality programmatically? | P1 | Research VMAF, SSIM, perceptual metrics |
| RQ-14 | What error taxonomy should we adopt? | P1 | Study npm, cargo, gh CLI patterns |
| RQ-15 | How do we implement cost tracking across LLM calls? | P2 | Review Langfuse, Helicone patterns |

---

### 13.6 Research Questions — Resolved

All 15 research questions from §13.5 have been investigated. Findings are documented in individual investigation reports. This section summarizes resolutions and recommended implementations.

#### Pipeline Architecture (RQ-1 to RQ-3)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-1 | Resumable/idempotent pipelines | **Content-addressable caching** with SHA256 hashes, atomic write-rename pattern, BullMQ job deduplication. Use `pipeline-state.json` per project. | [RQ-01-RESUMABLE-PIPELINES](../research/investigations/RQ-01-RESUMABLE-PIPELINES-20260104.md) |
| RQ-2 | Concurrency model | **p-limit** for API rate limiting (Remotion pattern), Pool class for worker management, sequential queue for dependent operations. Default: 4 concurrent embeddings, 2 concurrent downloads. | [RQ-02-CONCURRENCY-MODEL](../research/investigations/RQ-02-CONCURRENCY-MODEL-20260104.md) |
| RQ-3 | Schema versioning | **Zod `.extend()`** for backwards-compatible additions, `schemaVersion` field in all JSON outputs, two-tier validation (strict for new, lenient for legacy). | [RQ-03-SCHEMA-VERSIONING](../research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md) |

#### LLM Integration (RQ-4 to RQ-6)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-4 | Structured LLM output | **OpenAI JSON mode with strict schema** as primary. 5-retry with progressive prompt repair (MoneyPrinterTurbo pattern). Regex fallback extraction. pydantic-ai ModelRetry for Anthropic. | [RQ-04-STRUCTURED-LLM-OUTPUT](../research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md) |
| RQ-5 | Visual-to-keyword translation | **LLM-generated keywords** (3-5 per scene). Cascading search: exact → relaxed → joker fallback terms ("nature", "abstract"). 1-3 word constraint per query. | [RQ-05-VISUAL-TO-KEYWORD](../research/investigations/RQ-05-VISUAL-TO-KEYWORD-20260104.md) |
| RQ-6 | Embedding model selection | **text-embedding-3-small** (1024 dimensions, $0.02/1M tokens). CLIP is for image-text, not text-text. Threshold: 0.65 cosine similarity for matches. Cache embeddings with content hash. | [RQ-06-EMBEDDING-MODEL-SELECTION](../research/investigations/RQ-06-EMBEDDING-MODEL-SELECTION-20260104.md) |

#### Audio Pipeline (RQ-7 to RQ-9)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-7 | Edge TTS timestamps | **SubMaker captures WordBoundary WebSocket events** during streaming. Timestamps in 100-nanosecond ticks (divide by 10,000 for ms). Offset compensation for >4KB text chunks. | [RQ-07-EDGE-TTS-TIMESTAMPS](../research/investigations/RQ-07-EDGE-TTS-TIMESTAMPS-20260104.md) |
| RQ-8 | Forced alignment | **WhisperX wav2vec2 CTC alignment** at 70x realtime. Per-word confidence scores. Interpolation fills gaps (nearest-neighbor for NaN). whisper.cpp fallback for edge deployment. | [RQ-08-FORCED-ALIGNMENT](../research/investigations/RQ-08-FORCED-ALIGNMENT-20260104.md) |
| RQ-9 | Timestamp drift | **Levenshtein similarity matching** (>80% threshold). VAD filtering prevents hallucinations. Proportional character distribution when word boundaries unavailable. | [RQ-09-TIMESTAMP-DRIFT](../research/investigations/RQ-09-TIMESTAMP-DRIFT-20260104.md) |

#### Rendering (RQ-10 to RQ-12)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-10 | Video output testing | **Vitest + jest-image-snapshot** for frame comparison. ffprobe for metadata validation. PSNR/SSIM for quality regression. `@remotion/deterministic-randomness` ESLint rule enforced. | [RQ-10-VIDEO-OUTPUT-TESTING](../research/investigations/RQ-10-VIDEO-OUTPUT-TESTING-20260104.md) |
| RQ-11 | Remotion memory | **4-8GB production**, 3-4GB minimum. Default concurrency = CPUs/2, max 8. `offthreadVideoCacheSizeInBytes` = 512MB. `--gl=angle` has memory leaks — split renders >20 scenes. | [RQ-11-REMOTION-MEMORY](../research/investigations/RQ-11-REMOTION-MEMORY-20260104.md) |
| RQ-12 | Remotion licensing | **Free for ≤3 employees**, $100+/month for larger companies. NOT triggered by revenue/renders. content-machine (MIT) must document users need their own Remotion license. | [RQ-12-REMOTION-LICENSING](../research/investigations/RQ-12-REMOTION-LICENSING-20260104.md) |

#### Quality & Operations (RQ-13 to RQ-15)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-13 | Video quality metrics | **PSNR >35dB good, SSIM >0.95 good, VMAF >80 good**. CRF 18 default (h264). PSNR fastest for CI, VMAF slowest for nightly. | [RQ-13-VIDEO-QUALITY-METRICS](../research/investigations/RQ-13-VIDEO-QUALITY-METRICS-20260104.md) |
| RQ-14 | Error taxonomy | **Exit codes 0-143** (POSIX compatible). Semantic string codes (E_NETWORK_TIMEOUT). Categories: retryable vs fatal. Structured JSON error output for CI. | [RQ-14-ERROR-TAXONOMY](../research/investigations/RQ-14-ERROR-TAXONOMY-20260104.md) |
| RQ-15 | Cost tracking | **Langfuse Trace→Span hierarchy**. Token counting per request. Model-specific pricing tables. BullMQ for budget threshold alerts. ~$0.05/video with gpt-4o-mini. | [RQ-15-COST-TRACKING](../research/investigations/RQ-15-COST-TRACKING-20260104.md) |

#### Iteration 2 Research (RQ-16 to RQ-20)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-16 | Python subprocess management | **Avoid Python**: use kokoro-js (TypeScript) and whisper.cpp (Remotion package). When unavoidable, use `child_process.spawn` with `windowsHide: true` and `.cmd` extension on Windows. Promise wrapper with timeout. | [RQ-16-PYTHON-SUBPROCESS](../research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md) |
| RQ-17 | FFmpeg concatenation | **Concat demuxer** (no re-encode) for same-format clips. 20ms micro-fades prevent audio pops. AAC frame alignment at 1024 samples. `-fflags +genpts` regenerates timestamps. | [RQ-17-FFMPEG-CONCATENATION](../research/investigations/RQ-17-FFMPEG-CONCATENATION-20260105.md) |
| RQ-18 | Rate limiting | **p-limit** for concurrency (Remotion pattern). Per-provider config. OpenAI `x-ratelimit-remaining-tokens` header for adaptive limiting. Exponential backoff on HTTP 429. | [RQ-18-RATE-LIMITING](../research/investigations/RQ-18-RATE-LIMITING-20260105.md) |
| RQ-19 | GPU detection | **systeminformation** package for cross-platform GPU detection. nvidia-smi for CUDA verification. Device selection: cuda > mps > cpu. Graceful fallback always available. | [RQ-19-GPU-DETECTION](../research/investigations/RQ-19-GPU-DETECTION-20260105.md) |
| RQ-20 | Offline mode | **Minimum viable: ~6.6GB** (Ollama llama3.1:8b + Kokoro + whisper.cpp medium.en + MiniLM). Edge profile: ~2.5GB. FastEmbed (ONNX) for local embeddings. Not for MVP but architecture supports it. | [RQ-20-OFFLINE-MODE](../research/investigations/RQ-20-OFFLINE-MODE-20260105.md) |

#### Iteration 3 Research (RQ-21)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-21 | Multi-demographic content support | **Content Archetype System** with 6 presets (brainrot, meme, educational, story, product, motivational). Each archetype configures pacing, audio, captions, visuals, and script generation. Supports Gen Z (13-24) through older demographics. Split-screen for brainrot. | [RQ-21-CONTENT-ARCHETYPES](../research/investigations/RQ-21-CONTENT-ARCHETYPES-20260105.md) |

#### Iteration 4 Research (RQ-22 — Extensibility)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-22 | Extensibility architecture | **12 extension points**: Provider interfaces (LLM, TTS, ASR, Stock), ProviderRegistry for dynamic registration, PipelineBuilder for stage insertion, Hook system for cross-cutting concerns, Plugin system with activate/deactivate lifecycle, Event emitter for observability, Middleware chain for request interception, Config extensibility with plugin-specific keys, Feature flags for gradual rollout. | [RQ-22-EXTENSIBILITY-ARCHITECTURE](../research/investigations/RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md) |

#### Iteration 5 Research (RQ-23 — Expert Code Review)

| ID | Question | Resolution | Investigation |
|----|----------|------------|---------------|
| RQ-23 | Implementation gaps from expert review | **10 critical patterns adopted**: (1) Constructor injection + static factory (short-video-maker-gyori), (2) FakeLLM/FakeTTS test stubs (openai-agents-js), (3) Multi-key API rotation (MoneyPrinterTurbo), (4) Joker term fallback for stock footage, (5) FFprobe video validation after download, (6) 3-retry within TTS provider before fallback, (7) AbortSignal propagation for SIGINT handling, (8) CostTracker accumulator class, (9) Typed lifecycle hooks with exact signatures, (10) Reasoning model settings (P2). | [RQ-23-EXPERT-REVIEW-GAPS](../research/investigations/RQ-23-EXPERT-REVIEW-GAPS-20260105.md) |

---

## 15. Updated Design Decisions (Post-Investigation)

Based on RQ investigations, the following design decisions are now finalized:

### 14.1 Pipeline State Management

```typescript
// pipeline-state.json structure
interface PipelineState {
  projectId: string;
  schemaVersion: "1.0.0";
  stages: {
    script: { status: "pending" | "complete"; hash?: string; completedAt?: string };
    audio: { status: "pending" | "complete"; hash?: string; completedAt?: string };
    visuals: { status: "pending" | "complete"; hash?: string; completedAt?: string };
    render: { status: "pending" | "complete"; hash?: string; completedAt?: string };
  };
  checkpoints: Array<{ stage: string; file: string; hash: string }>;
}
```

**Atomic write pattern:**
```typescript
async function atomicWrite(path: string, content: string): Promise<void> {
  const tempPath = `${path}.tmp.${process.pid}`;
  await fs.writeFile(tempPath, content);
  await fs.rename(tempPath, path);  // Atomic on POSIX
}
```

### 14.2 Concurrency Configuration

```typescript
// Default concurrency limits
const CONCURRENCY_DEFAULTS = {
  embeddings: 4,      // OpenAI rate limit friendly
  downloads: 2,       // Network bandwidth
  llmCalls: 1,        // Sequential for context
  remotionWorkers: Math.min(os.cpus().length / 2, 8),
};
```

### 14.3 Error Handling Pattern

```typescript
// Base error class
class ContentMachineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number,
    public readonly retryable: boolean,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Exit code ranges
const EXIT_CODES = {
  SUCCESS: 0,
  USER_ERROR: 1,        // 1-19: User input/config errors
  NETWORK_ERROR: 20,    // 20-39: External service errors
  RESOURCE_ERROR: 40,   // 40-59: File/memory errors
  PIPELINE_ERROR: 60,   // 60-79: Stage-specific errors
  INTERNAL_ERROR: 100,  // 100+: Bugs
};
```

### 14.4 Schema Versioning Pattern

```typescript
// All output schemas include version
const BaseOutputSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  generatedAt: z.string().datetime(),
  generatedBy: z.string(),  // "cm script v1.0.0"
});

// Extend for specific outputs
const ScriptOutputSchema = BaseOutputSchema.extend({
  scenes: z.array(SceneSchema),
  // ...
});
```

### 14.5 Cost Tracking Integration

```typescript
// Per-video cost accumulator
interface CostEntry {
  category: "llm" | "tts" | "embedding" | "stock" | "compute";
  service: string;
  amount: number;
  metadata: Record<string, unknown>;
}

// Displayed at end of each command
// ────────────────────────────
// Cost Summary:
//   llm:       $0.032
//   embedding: $0.001
//   Total:     $0.033
// ────────────────────────────
```

### 14.6 Remotion Configuration

```typescript
// Rendering defaults
const REMOTION_DEFAULTS = {
  concurrency: Math.min(os.cpus().length / 2, 8),
  offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024,  // 512MB
  gl: process.platform === "win32" ? "angle" : "swangle",
  crf: 18,
};

// Memory-based concurrency adjustment
function getConcurrency(availableMemoryGB: number): number {
  if (availableMemoryGB < 4) return 1;
  if (availableMemoryGB < 8) return 2;
  return Math.min(4, os.cpus().length / 2);
}
```

### 14.7 Python-Free Audio Pipeline (RQ-16)

Based on investigation, the MVP avoids Python entirely:

```typescript
// TTS: kokoro-js (TypeScript native)
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained(
  "onnx-community/Kokoro-82M-v1.0-ONNX",
  { dtype: "q8" }
);
const audio = await tts.generate(text, { voice: "af_heart" });

// ASR: @remotion/install-whisper-cpp (C++ via Remotion)
import { installWhisperCpp, transcribe } from "@remotion/install-whisper-cpp";

await installWhisperCpp({ to: "./whisper", version: "1.7.4" });
const result = await transcribe({
  inputPath: audioPath,
  model: "medium.en",
  tokenLevelTimestamps: true,
});
```

### 14.8 FFmpeg Concatenation Pattern (RQ-17)

```typescript
// Create file list for concat demuxer (no re-encoding)
async function concatenateClips(clips: string[], output: string): Promise<void> {
  const listPath = `${output}.list.txt`;
  const listContent = clips.map(c => `file '${c}'`).join('\n');
  await fs.writeFile(listPath, listContent);

  await execFile('ffmpeg', [
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',           // No re-encode
    '-fflags', '+genpts',   // Regenerate timestamps
    output
  ]);

  await fs.unlink(listPath);
}

// For mismatched formats, use filter with micro-fade
async function concatenateWithFade(clips: string[], output: string): Promise<void> {
  const inputs = clips.flatMap(c => ['-i', c]);
  const filterParts = clips.map((_, i) => 
    `[${i}:v]scale=1080:1920,setsar=1[v${i}];[${i}:a]afade=t=in:d=0.02:curve=exp,afade=t=out:st=${getDuration(clips[i]) - 0.02}:d=0.02[a${i}]`
  );
  
  await execFile('ffmpeg', [
    ...inputs,
    '-filter_complex', filterParts.join(';') + ';' + 
      clips.map((_, i) => `[v${i}][a${i}]`).join('') + 
      `concat=n=${clips.length}:v=1:a=1[outv][outa]`,
    '-map', '[outv]', '-map', '[outa]',
    output
  ]);
}
```

### 14.9 Rate Limiting Configuration (RQ-18)

```typescript
import pLimit from 'p-limit';

// Per-provider rate limiters
const rateLimiters = {
  openai: pLimit(4),        // 4 concurrent
  anthropic: pLimit(2),     // Conservative
  pexels: pLimit(1),        // Sequential (200/hour limit)
  pixabay: pLimit(2),
};

// Exponential backoff for 429 responses
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HTTPError && error.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
        await sleep(delay);
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}
```

### 14.10 GPU Detection (RQ-19)

```typescript
import si from 'systeminformation';
import { execSync } from 'child_process';

type WhisperDevice = 'cuda' | 'mps' | 'cpu';

async function detectBestDevice(): Promise<WhisperDevice> {
  const graphics = await si.graphics();
  
  // Check for NVIDIA GPU
  const hasNvidia = graphics.controllers.some(c => 
    c.vendor?.toLowerCase().includes('nvidia')
  );
  
  if (hasNvidia) {
    try {
      execSync('nvidia-smi', { encoding: 'utf-8', timeout: 5000 });
      return 'cuda';
    } catch {
      // nvidia-smi failed, CUDA not available
    }
  }
  
  // Check for Apple Silicon
  if (process.platform === 'darwin') {
    const hasAppleGpu = graphics.controllers.some(c =>
      c.vendor?.toLowerCase().includes('apple')
    );
    if (hasAppleGpu) return 'mps';
  }
  
  return 'cpu';
}
```

---

## 16. Critical Evaluation — Iteration 2

*Conducted: 2026-01-05*

After integrating RQ investigation findings, a second critical evaluation identifies remaining gaps.

### 15.1 Resolved Issues ✅

The following issues from §13 are now resolved:

| Original Issue | Resolution |
|----------------|------------|
| GAP-1: No idempotency | Content-addressable caching + atomic writes (RQ-01) |
| GAP-2: No concurrency model | p-limit + Pool pattern defined (RQ-02) |
| GAP-3: No schema versioning | schemaVersion field + Zod extend (RQ-03) |
| GAP-4: No atomic writes | Write-temp-rename pattern adopted (RQ-01) |
| GAP-5: Error taxonomy incomplete | Full exit code + semantic code taxonomy (RQ-14) |
| RISK-1: Naive LLM validation | 5-retry + regex fallback pattern (RQ-04) |
| RISK-2: Embedding dimension mismatch | Cache invalidation on model change (RQ-06) |
| RISK-3: Timestamp alignment | Edge TTS SubMaker + Levenshtein matching (RQ-07, RQ-09) |
| RISK-4: No observability | Langfuse integration + cost tracking (RQ-15) |
| RISK-5: Testing gaps | Frame snapshots + ffprobe validation (RQ-10) |
| CONTRADICTION-2: Keywords vs embeddings | LLM keyword extraction defined (RQ-05) |

### 15.2 Partially Resolved Issues ⚠️ → Now Resolved ✅

| Issue | Status | Resolution |
|-------|--------|------------|
| GAP-6: Python dependencies | ✅ Resolved | Avoid Python entirely — use kokoro-js + whisper.cpp (RQ-16) |
| RISK-6: Concatenation artifacts | ✅ Resolved | Concat demuxer + 20ms micro-fades (RQ-17) |
| RISK-7: Rate limiting | ✅ Resolved | p-limit per-provider + exponential backoff (RQ-18) |
| GAP-8: GPU degradation | ✅ Resolved | systeminformation detection + graceful fallback (RQ-19) |
| NFR-4: Offline mode | ✅ Documented | ~6.6GB minimum stack defined, post-MVP (RQ-20) |

### 15.3 Issues Remaining After Iteration 2

| Issue | Status | Remaining Work |
|-------|--------|----------------|
| CONTRADICTION-1: Flexible vs strict schemas | Open | Need concrete guidance on which fields allow flexibility |
| CONTRADICTION-3: CLI vs LLM-native | Open | Need `--json` vs `--human` output modes |
| NFR-1: Resource limits | Open | Need file size limits (max input video size) |
| GAP-7: Asset cleanup | Open | When are downloaded assets safe to delete? |
| GAP-9: Multi-language | Deferred | Prompts English-only for MVP |
| RISK-8: Data privacy | Documented | User responsibility, documented in README |

---

### 16.6 Critical Evaluation — Iteration 3

*Conducted: 2026-01-05*

#### 16.6.1 Newly Resolved in Iteration 2-3 ✅

All P0 and P1 research questions are now answered. The following design decisions are final:

| Component | Decision | Confidence |
|-----------|----------|------------|
| Audio pipeline | TypeScript-native (kokoro-js + whisper.cpp) | High |
| Video concatenation | FFmpeg concat demuxer + micro-fades | High |
| Rate limiting | p-limit + per-provider config | High |
| GPU detection | systeminformation + nvidia-smi fallback | High |
| Offline architecture | Ollama + Kokoro + whisper.cpp (post-MVP) | Medium |

#### 16.6.2 Remaining Open Issues (Prioritized)

| ID | Issue | Priority | Resolution Strategy |
|----|-------|----------|---------------------|
| OPEN-1 | `--json` vs `--human` output modes | P1 | Add `--format json|human` flag, default human |
| OPEN-2 | Asset cleanup strategy | P2 | Add `cm cleanup` command, 30-day retention |
| OPEN-3 | Max input file size | P2 | Document 2GB limit (Remotion constraint) |
| OPEN-4 | Multi-language prompts | P3 | Post-MVP with community contributions |
| OPEN-5 | Schema flexibility guidance | P3 | Document in contributing guide |

#### 16.6.3 Final Trade-off Decisions

These are explicitly **accepted** and **documented** trade-offs for MVP:

| Trade-off | Justification | Future Path |
|-----------|---------------|-------------|
| **English-only prompts** | 80%+ short-form content is English. Edge TTS/Whisper support other languages at runtime. | Community-contributed prompt translations |
| **No offline mode** | Requires 6.6GB+ local models. Most users have internet. | Post-MVP `--offline` profile |
| **No RTL captions** | Complex CSS/rendering changes. Tiny user base for MVP. | v2 with proper bidi support |
| **No accessibility** | MVP targets entertainment creators, not accessibility. | Add audio descriptions in v2 |
| **No batch processing** | CLI handles one video at a time. Simple is better for MVP. | Add BullMQ queue post-MVP |
| **Data sent to cloud APIs** | Required for LLM/TTS quality. Document in README. | Add local-first option post-MVP |

#### 16.6.4 Risk Assessment Summary

| Risk Level | Count | Examples |
|------------|-------|----------|
| 🟢 Low | 15 | Schema versioning, error handling, cost tracking |
| 🟡 Medium | 4 | Memory limits, long video splitting, rate limits |
| 🔴 High | 0 | All high-risk issues resolved |

#### 16.6.5 Convergence Status

**Iteration 3 finds no new P0/P1 issues.** All identified issues are either:
- ✅ Resolved with documented patterns
- ⚠️ Documented as accepted trade-offs
- 📋 Logged as P2/P3 for post-MVP

**The design is ready for implementation.**

---

### 16.7 Critical Evaluation — Iteration 4 (Extensibility)

*Conducted: 2026-01-05*

#### 16.7.1 Extensibility Additions Verified ✅

The new extensibility architecture (§18) provides comprehensive extension mechanisms:

| Extension Point | Completeness | Notes |
|-----------------|--------------|-------|
| Provider Interfaces | ✅ Complete | LLM, TTS, ASR, Stock, Render defined |
| ProviderRegistry | ✅ Complete | Generic registry with lazy instantiation |
| PipelineBuilder | ✅ Complete | Insert before/after, remove stage |
| Hook System | ✅ Complete | Pipeline and stage-level hooks |
| Plugin System | ✅ Complete | Activate/deactivate lifecycle |
| Event System | ✅ Complete | Typed events for observability |
| Middleware | ✅ Complete | Request/response interception |
| Config Extension | ✅ Complete | Plugin-specific keys in ~/.cmrc.json |
| Archetype Extension | ✅ Complete | JSON/YAML files + extends pattern |
| Feature Flags | ✅ Complete | Env var overrides |

#### 16.7.2 Extensibility Gap Analysis

| Potential Gap | Assessment | Resolution |
|---------------|------------|------------|
| Plugin versioning | Low risk | Plugins declare version, core checks compatibility |
| Plugin dependencies | Medium risk | Plugins can require other plugins, load order matters |
| Registry conflicts | Low risk | Error thrown on duplicate registration |
| Breaking interface changes | Medium risk | Use semantic versioning, deprecation warnings |
| Hot reloading | Deferred | Post-MVP feature, not needed for CLI |

#### 16.7.3 Software Engineering Verification

| Principle | Implementation | Status |
|-----------|----------------|--------|
| **SOLID: Open-Closed** | Registry pattern, no switch statements | ✅ |
| **SOLID: Dependency Inversion** | All stages depend on interfaces | ✅ |
| **SOLID: Interface Segregation** | Separate interfaces per concern | ✅ |
| **SOLID: Single Responsibility** | Each stage/provider has one job | ✅ |
| **SOLID: Liskov Substitution** | Providers interchangeable | ✅ |

#### 16.7.4 AI/ML Engineering Verification

| Concern | Implementation | Status |
|---------|----------------|--------|
| **Model Swapping** | LLMProvider interface, config-driven | ✅ |
| **Evals Integration** | Event system + Langfuse hooks | ✅ |
| **Cost Tracking** | Cost events, middleware pattern | ✅ |
| **Prompt Versioning** | Template system with versions | ✅ |
| **A/B Testing** | Feature flags, config overrides | ✅ |
| **Observability** | Typed events, trace IDs | ✅ |

#### 16.7.5 Convergence Status

**Iteration 4 finds no new P0/P1 issues.** The extensibility architecture:

- ✅ Enables new providers without core changes
- ✅ Supports plugin ecosystem for community contributions
- ✅ Allows pipeline customization for different use cases
- ✅ Provides hooks for observability and analytics
- ✅ Uses industry-standard patterns (registry, middleware, events)

**The design remains ready for implementation.**

---

### 16.8 Critical Evaluation — Iteration 5 (Expert Code Review)

*Conducted: 2026-01-05*

Expert code review of vendored blueprint repos (short-video-maker-gyori, MoneyPrinterTurbo, openai-agents-js) revealed 10 critical implementation patterns missing from the design.

#### 16.8.1 P0 Gaps Resolved ✅

| Gap | Pattern Adopted | Source |
|-----|-----------------|--------|
| **Constructor injection** | Static factory + pure DI, `createForTest()` method | short-video-maker-gyori |
| **Test stub infrastructure** | `FakeLLMProvider`, `FakeTTSProvider` classes | openai-agents-js |

**Constructor Injection Pattern:**

```typescript
class AudioPipeline {
  private constructor(
    private tts: TTSProvider,
    private asr: ASRProvider,
  ) {}

  static async create(config: Config): Promise<AudioPipeline> {
    const tts = await ttsProviders.get(config.audio.ttsEngine);
    const asr = await asrProviders.get(config.audio.asrEngine);
    return new AudioPipeline(tts, asr);
  }

  static createForTest(fakes: { tts: TTSProvider; asr: ASRProvider }): AudioPipeline {
    return new AudioPipeline(fakes.tts, fakes.asr);
  }
}
```

#### 16.8.2 P1 Gaps Resolved ✅

| Gap | Pattern Adopted | Implementation |
|-----|-----------------|----------------|
| **Multi-key rotation** | `ApiKeyRotator` class with round-robin | Config supports `string \| string[]` |
| **Joker term fallback** | `JOKER_TERMS` array appended to search | `['nature', 'abstract', 'sky', 'ocean']` |
| **Video validation** | FFprobe check after download | Delete corrupt files, return null |
| **Retry-within-provider** | 3 retries before fallback | Configurable `retries` per provider |
| **AbortSignal propagation** | SIGINT → AbortController → all calls | Signal passed to fetch, TTS, render |
| **CostTracker class** | Usage accumulator with pricing table | `add()`, `getTotalCost()`, `getSummary()` |
| **Typed lifecycle hooks** | `PipelineEvents` interface with signatures | 10 event types with exact payloads |

**AbortSignal Pattern:**

```typescript
class Pipeline {
  private abortController = new AbortController();
  
  constructor() {
    process.on('SIGINT', () => {
      console.log('\n⚠️  Cancelling...');
      this.abortController.abort();
    });
  }
  
  get signal(): AbortSignal {
    return this.abortController.signal;
  }
}

// All async operations respect signal
await fetch(url, { signal: pipeline.signal });
await llm.chat(messages, { signal: pipeline.signal });
```

**CostTracker Pattern:**

```typescript
class CostTracker {
  private entries: UsageEntry[] = [];
  private static PRICING = {
    'gpt-4o': { input: 2.50, output: 10.00 },  // $ per 1M tokens
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
  };
  
  add(entry: UsageEntry): void { ... }
  getTotalCost(): number { ... }
  getSummary(): string { ... }
}
```

#### 16.8.3 P2 Gap Deferred

| Gap | Status | Notes |
|-----|--------|-------|
| **Reasoning model settings** | Deferred to post-MVP | o1/o3 `reasoning.effort` config |

#### 16.8.4 Risk Assessment After Iteration 5

| Risk Level | Count | Change |
|------------|-------|--------|
| 🟢 Low | 17 | +2 (test stubs, cost tracking) |
| 🟡 Medium | 3 | -1 (cancellation resolved) |
| 🔴 High | 0 | No change |

#### 16.8.5 Convergence Status

**Iteration 5 found 10 implementation gaps; all 9 P0/P1 gaps are now resolved.**

The design now includes:
- ✅ Constructor injection with testable factory pattern
- ✅ Complete test stub infrastructure
- ✅ Multi-key API rotation for rate limit scaling
- ✅ Joker term fallback guaranteeing footage is found
- ✅ Video validation preventing corrupt assets
- ✅ Retry-within-provider reducing unnecessary fallbacks
- ✅ SIGINT cancellation flowing through entire pipeline
- ✅ CostTracker with per-model pricing tables
- ✅ Typed lifecycle hooks for full observability

**The design is now comprehensively production-ready.**

---

## 17. Implementation Readiness Assessment

### 17.1 Ready for Implementation ✅

| Component | Confidence | Evidence |
|-----------|------------|----------|
| Configuration system | High | TOML/JSON patterns from MoneyPrinterTurbo |
| Schema definitions | High | Zod patterns validated, versioning solved |
| `cm script` command | High | LLM structured output patterns proven |
| Error handling | High | Exit codes + semantic codes defined |
| Cost tracking | High | Langfuse integration documented |
| Audio pipeline | High | kokoro-js + whisper.cpp (no Python) |
| Rate limiting | High | p-limit + per-provider config |
| Provider abstraction | High | Interface patterns documented |
| Plugin system | High | Lifecycle + registry defined |

### 17.2 Ready with Documented Patterns ✅

| Component | Confidence | Pattern Source |
|-----------|------------|----------------|
| `cm audio` command | High | kokoro-js + @remotion/install-whisper-cpp |
| `cm visuals` command | High | p-limit + exponential backoff |
| `cm render` command | High | Remotion + FFmpeg concat demuxer |
| GPU acceleration | High | systeminformation + nvidia-smi |
| Extensibility | High | 12 extension points defined |
| Content archetypes | High | 6 presets + extension pattern |

### 17.3 Extensibility Readiness ✅

| Mechanism | Implementation Status | Notes |
|-----------|----------------------|-------|
| Provider interfaces | Ready | TypeScript interfaces defined |
| ProviderRegistry | Ready | Generic class implementation |
| PipelineBuilder | Ready | Stage manipulation methods |
| Hook system | Ready | Event-based hooks |
| Plugin system | Ready | Activate/deactivate lifecycle |
| Event emitter | Ready | Typed events pattern |
| Middleware chain | Ready | Compose pattern |
| Archetype extension | Ready | JSON/YAML + extends |
| Feature flags | Ready | Env var pattern |
| Config extension | Ready | Plugin-specific keys |

### 17.4 Post-MVP Items 📋

| Component | Effort | Dependency |
|-----------|--------|------------|
| Offline mode | Medium | Ollama + local embeddings |
| Multi-language prompts | Low | Community contributions |
| `--json` output mode | Low | None |
| `cm cleanup` command | Low | None |
| Batch processing | Medium | BullMQ |
| Web interface | High | API server |
| Plugin marketplace | High | Registry infrastructure |
| Hot reloading | Medium | File watcher |

### 17.5 Development Sequence (Updated)

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 1 | Project setup, Zod schemas, config system, ProviderRegistry | None |
| 2 | LLM provider abstraction, `cm script`, Plugin loader | Week 1 |
| 3 | kokoro-js TTS, whisper.cpp ASR, `cm audio` | Week 1 |
| 4 | Embedding pipeline, Pexels API, `cm visuals` | Weeks 1-2 |
| 5 | Remotion composition, `cm render` | Weeks 1-4 |
| 6 | Integration, `cm generate`, error handling, hooks | Weeks 1-5 |
| 7 | Testing, documentation, polish | Weeks 1-6 |

---

## 18. Extensibility Architecture

> **Research:** [RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md](../research/investigations/RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md) — Provider abstraction, plugin systems, registry patterns

### 18.1 Design Principles for Extensibility

The architecture is designed for **extension without core modification** (Open-Closed Principle):

| Principle | Implementation |
|-----------|----------------|
| **Open-Closed** | New providers added via registry, not switch statements |
| **Dependency Inversion** | Components depend on interfaces, not implementations |
| **Interface Segregation** | Focused interfaces (TTSProvider, LLMProvider) vs. god objects |

### 18.2 Provider Interface System

All external services are abstracted behind interfaces. New providers are added by implementing the interface and registering with the system.

#### LLM Provider Interface

```typescript
export interface LLMProvider {
  readonly name: string;
  readonly supportedFeatures: ('json-mode' | 'tool-calling' | 'streaming' | 'vision')[];
  
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  embed?(texts: string[]): Promise<EmbeddingResult>;
  streamChat?(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}
```

#### TTS Provider Interface

```typescript
export interface TTSProvider {
  readonly name: string;
  readonly supportedVoices: Voice[];
  readonly supportedLanguages: string[];
  
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;
  synthesizeWithTimestamps?(text: string, options: TTSOptions): Promise<TTSResultWithTimestamps>;
}
```

#### ASR Provider Interface

```typescript
export interface ASRProvider {
  readonly name: string;
  readonly supportedLanguages: string[];
  readonly supportsWordTimestamps: boolean;
  
  transcribe(audio: Buffer | string, options?: ASROptions): Promise<ASRResult>;
}
```

#### Stock Footage Provider Interface

```typescript
export interface StockFootageProvider {
  readonly name: string;
  readonly requiresApiKey: boolean;
  readonly supportedMediaTypes: ('video' | 'image')[];
  
  search(query: string, options?: SearchOptions): Promise<StockResult[]>;
  download(asset: StockResult, destination: string): Promise<string>;
}
```

### 18.3 Provider Registry System

A generic registry enables dynamic provider registration:

```typescript
export class ProviderRegistry<T> {
  private providers = new Map<string, () => T>();
  private instances = new Map<string, T>();
  
  register(name: string, factory: () => T): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider "${name}" already registered`);
    }
    this.providers.set(name, factory);
  }
  
  get(name: string): T {
    // Lazy instantiation with caching
    if (!this.instances.has(name)) {
      const factory = this.providers.get(name);
      if (!factory) {
        throw new Error(
          `Provider "${name}" not found. Available: ${this.list().join(', ')}`
        );
      }
      this.instances.set(name, factory());
    }
    return this.instances.get(name)!;
  }
  
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

**Global Registries:**

```typescript
// src/providers/index.ts
export const llmProviders = new ProviderRegistry<LLMProvider>();
export const ttsProviders = new ProviderRegistry<TTSProvider>();
export const asrProviders = new ProviderRegistry<ASRProvider>();
export const stockProviders = new ProviderRegistry<StockFootageProvider>();
export const archetypeRegistry = new ProviderRegistry<ContentArchetype>();

// Built-in registrations
llmProviders.register('openai', () => new OpenAIProvider());
llmProviders.register('anthropic', () => new AnthropicProvider());
llmProviders.register('ollama', () => new OllamaProvider());

ttsProviders.register('kokoro', () => new KokoroProvider());
ttsProviders.register('edge-tts', () => new EdgeTTSProvider());

asrProviders.register('whisper-cpp', () => new WhisperCppProvider());

stockProviders.register('pexels', () => new PexelsProvider());
stockProviders.register('pixabay', () => new PixabayProvider());
```

### 18.4 Pipeline Extensibility

The pipeline supports stage insertion, removal, and replacement:

```typescript
export interface PipelineStage<TInput, TOutput> {
  readonly name: string;
  readonly version: string;
  
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
  beforeExecute?(input: TInput, context: PipelineContext): Promise<TInput>;
  afterExecute?(output: TOutput, context: PipelineContext): Promise<TOutput>;
  onError?(error: Error, context: PipelineContext): Promise<void>;
}

export class PipelineBuilder {
  addStage<TIn, TOut>(stage: PipelineStage<TIn, TOut>): this;
  insertBefore<TIn, TOut>(existingName: string, stage: PipelineStage<TIn, TOut>): this;
  insertAfter<TIn, TOut>(existingName: string, stage: PipelineStage<TIn, TOut>): this;
  removeStage(name: string): this;
  build(): Pipeline;
}
```

**Example: Adding a Research Stage:**

```typescript
const researchPipeline = new PipelineBuilder()
  .addStage(new ResearchStage())     // New stage
  .addStage(new ScriptStage())
  .addStage(new AudioStage())
  .addStage(new VisualsStage())
  .addStage(new RenderStage())
  .addStage(new PublishStage())      // New stage
  .build();
```

### 18.5 Hook System

Hooks enable cross-cutting concerns without modifying core logic:

```typescript
export interface PipelineHooks {
  onPipelineStart?: (context: PipelineContext) => Promise<void>;
  onPipelineEnd?: (result: PipelineResult, context: PipelineContext) => Promise<void>;
  onStageStart?: (stage: string, input: unknown, context: PipelineContext) => Promise<void>;
  onStageEnd?: (stage: string, output: unknown, context: PipelineContext) => Promise<void>;
  onStageError?: (stage: string, error: Error, context: PipelineContext) => Promise<void>;
  onProgress?: (stage: string, progress: number, message: string) => void;
}

// Usage
const pipeline = new PipelineBuilder()
  .addStage(new ScriptStage())
  .addStage(new AudioStage())
  .withHooks({
    onStageEnd: async (stage, output, ctx) => {
      await langfuse.logStage(stage, output);  // Observability
    },
    onProgress: (stage, progress, message) => {
      progressBar.update(progress, { message });  // UI
    },
  })
  .build();
```

### 18.6 Plugin System

Plugins bundle providers and extensions for easy distribution:

```typescript
export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  
  activate(context: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
}

export interface PluginContext {
  llmProviders: ProviderRegistry<LLMProvider>;
  ttsProviders: ProviderRegistry<TTSProvider>;
  asrProviders: ProviderRegistry<ASRProvider>;
  stockProviders: ProviderRegistry<StockFootageProvider>;
  archetypeRegistry: ProviderRegistry<ContentArchetype>;
  pipelineBuilder: PipelineBuilder;
  config: Config;
  logger: Logger;
}
```

**Example Plugin (ElevenLabs TTS):**

```typescript
// ~/.cm/plugins/elevenlabs-tts.ts
import type { Plugin, TTSProvider } from 'content-machine';

class ElevenLabsTTS implements TTSProvider {
  readonly name = 'elevenlabs';
  readonly supportedVoices = [{ id: 'adam', name: 'Adam' }, /* ... */];
  readonly supportedLanguages = ['en', 'es', 'fr', /* ... */];
  
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    // ElevenLabs API implementation
  }
}

const plugin: Plugin = {
  name: 'elevenlabs-tts',
  version: '1.0.0',
  description: 'Adds ElevenLabs TTS support',
  
  async activate(ctx) {
    ctx.ttsProviders.register('elevenlabs', () => new ElevenLabsTTS());
    ctx.logger.info('ElevenLabs TTS provider registered');
  },
};

export default plugin;
```

**Plugin Loading:**

```typescript
// Auto-load from ~/.cm/plugins/
async function loadPlugins(): Promise<void> {
  const pluginDir = path.join(os.homedir(), '.cm', 'plugins');
  const loader = new PluginLoader();
  await loader.loadFromDirectory(pluginDir);
}
```

### 18.7 Content Archetype Extensibility

Archetypes can be extended or created from JSON/YAML:

```typescript
// Extend existing archetype
export function extendArchetype(
  baseId: string, 
  overrides: DeepPartial<ContentArchetype>
): ContentArchetype {
  const base = archetypeRegistry.get(baseId);
  return deepMerge(base, overrides);
}

// Register custom archetype
const gamingReview = extendArchetype('brainrot', {
  id: 'gaming-review',
  name: 'Gaming Review',
  captions: { fontFamily: 'Press Start 2P' },
  visuals: { gameplayStyle: 'fps-highlights' },
});
archetypeRegistry.register('gaming-review', () => gamingReview);
```

**File-Based Archetypes:**

```yaml
# ~/.cm/archetypes/my-style.yaml
extends: brainrot
id: my-style
name: My Custom Style
captions:
  fontFamily: Comic Sans MS
  textColor: "#00FF00"
audio:
  voiceRate: 1.5
```

### 18.8 Event System for AI/ML Integration

Typed events enable observability and analytics:

```typescript
export interface ContentMachineEvents {
  'llm:request': (event: LLMRequestEvent) => void;
  'llm:response': (event: LLMResponseEvent) => void;
  'tts:start': (event: TTSStartEvent) => void;
  'tts:complete': (event: TTSCompleteEvent) => void;
  'render:progress': (event: RenderProgressEvent) => void;
  'pipeline:stage:start': (event: StageStartEvent) => void;
  'pipeline:stage:end': (event: StageEndEvent) => void;
  'cost:incurred': (event: CostEvent) => void;
}

// Integration points
events.on('llm:response', async (event) => {
  await langfuse.logGeneration(event);  // Evals
});

events.on('cost:incurred', (event) => {
  budgetTracker.add(event);  // Budget alerts
});
```

### 18.9 Middleware Pattern

Middleware enables request/response interception:

```typescript
export type Middleware<T> = (
  input: T, 
  next: () => Promise<T>
) => Promise<T>;

// Example: Add middleware for caching, retry, logging
const llmMiddleware = new MiddlewareChain<ChatRequest>()
  .use(promptCacheMiddleware)
  .use(retryMiddleware)
  .use(costTrackingMiddleware)
  .use(loggingMiddleware);
```

### 18.10 Configuration Extensibility

The config system supports plugin-specific keys:

```json
{
  "schemaVersion": "1.0.0",
  "llm": { /* core config */ },
  "plugins": ["elevenlabs-tts", "youtube-publish"],
  "customProviders": {
    "elevenlabs": {
      "apiKey": "env:ELEVENLABS_API_KEY",
      "defaultVoice": "adam"
    }
  }
}
```

### 18.11 Future-Proofing Patterns

#### Version Negotiation

```typescript
export interface VersionedProvider {
  readonly apiVersion: string;
  supports(feature: string): boolean;
}

// Graceful degradation
async function callLLM(provider: LLMProvider, request: ChatRequest) {
  if (provider.supports('json-mode')) {
    return provider.chat(request, { jsonMode: true });
  }
  return parseJsonFromText(await provider.chat(request));
}
```

#### Feature Flags

```typescript
export const featureFlags = {
  'experimental:split-screen': false,
  'beta:offline-mode': false,
  'provider:elevenlabs': false,
};

export function isFeatureEnabled(flag: keyof typeof featureFlags): boolean {
  const envKey = `CM_FEATURE_${flag.toUpperCase().replace(/[:-]/g, '_')}`;
  if (process.env[envKey]) return process.env[envKey] === 'true';
  return featureFlags[flag];
}
```

### 18.12 Extension Points Summary

| Extension Point | Mechanism | User Action |
|-----------------|-----------|-------------|
| **LLM Providers** | `llmProviders.register()` | Implement `LLMProvider` interface |
| **TTS Providers** | `ttsProviders.register()` | Implement `TTSProvider` interface |
| **ASR Providers** | `asrProviders.register()` | Implement `ASRProvider` interface |
| **Stock Providers** | `stockProviders.register()` | Implement `StockFootageProvider` interface |
| **Content Archetypes** | `archetypeRegistry.register()` | JSON/YAML file or `extendArchetype()` |
| **Pipeline Stages** | `pipelineBuilder.insertAfter()` | Implement `PipelineStage` interface |
| **Hooks** | `pipeline.withHooks()` | Provide hook functions |
| **Plugins** | `~/.cm/plugins/` directory | Export `Plugin` object |
| **Events** | `events.on()` | Subscribe to typed events |
| **Middleware** | `middleware.use()` | Implement middleware function |
| **Config** | `~/.cmrc.json` | Add provider/archetype configs |
| **Feature Flags** | `CM_FEATURE_*` env vars | Set environment variables |

---

## 19. Appendix: Investigation Documents Index

### 19.1 Iteration 1 (RQ-01 to RQ-15)

| ID | Title | File |
|----|-------|------|
| RQ-01 | Resumable Pipelines | [RQ-01-RESUMABLE-PIPELINES-20260104.md](../research/investigations/RQ-01-RESUMABLE-PIPELINES-20260104.md) |
| RQ-02 | Concurrency Model | [RQ-02-CONCURRENCY-MODEL-20260104.md](../research/investigations/RQ-02-CONCURRENCY-MODEL-20260104.md) |
| RQ-03 | Schema Versioning | [RQ-03-SCHEMA-VERSIONING-20260104.md](../research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md) |
| RQ-04 | Structured LLM Output | [RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md](../research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md) |
| RQ-05 | Visual to Keyword Translation | [RQ-05-VISUAL-TO-KEYWORD-20260104.md](../research/investigations/RQ-05-VISUAL-TO-KEYWORD-20260104.md) |
| RQ-06 | Embedding Model Selection | [RQ-06-EMBEDDING-MODEL-SELECTION-20260104.md](../research/investigations/RQ-06-EMBEDDING-MODEL-SELECTION-20260104.md) |
| RQ-07 | Edge TTS Timestamps | [RQ-07-EDGE-TTS-TIMESTAMPS-20260104.md](../research/investigations/RQ-07-EDGE-TTS-TIMESTAMPS-20260104.md) |
| RQ-08 | Forced Alignment | [RQ-08-FORCED-ALIGNMENT-20260104.md](../research/investigations/RQ-08-FORCED-ALIGNMENT-20260104.md) |
| RQ-09 | Timestamp Drift | [RQ-09-TIMESTAMP-DRIFT-20260104.md](../research/investigations/RQ-09-TIMESTAMP-DRIFT-20260104.md) |
| RQ-10 | Video Output Testing | [RQ-10-VIDEO-OUTPUT-TESTING-20260104.md](../research/investigations/RQ-10-VIDEO-OUTPUT-TESTING-20260104.md) |
| RQ-11 | Remotion Memory | [RQ-11-REMOTION-MEMORY-20260104.md](../research/investigations/RQ-11-REMOTION-MEMORY-20260104.md) |
| RQ-12 | Remotion Licensing | [RQ-12-REMOTION-LICENSING-20260104.md](../research/investigations/RQ-12-REMOTION-LICENSING-20260104.md) |
| RQ-13 | Video Quality Metrics | [RQ-13-VIDEO-QUALITY-METRICS-20260104.md](../research/investigations/RQ-13-VIDEO-QUALITY-METRICS-20260104.md) |
| RQ-14 | Error Taxonomy | [RQ-14-ERROR-TAXONOMY-20260104.md](../research/investigations/RQ-14-ERROR-TAXONOMY-20260104.md) |
| RQ-15 | Cost Tracking | [RQ-15-COST-TRACKING-20260104.md](../research/investigations/RQ-15-COST-TRACKING-20260104.md) |

### 19.2 Iteration 2 (RQ-16 to RQ-20)

| ID | Title | File |
|----|-------|------|
| RQ-16 | Python Subprocess Management | [RQ-16-PYTHON-SUBPROCESS-20260105.md](../research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md) |
| RQ-17 | FFmpeg Concatenation | [RQ-17-FFMPEG-CONCATENATION-20260105.md](../research/investigations/RQ-17-FFMPEG-CONCATENATION-20260105.md) |
| RQ-18 | Rate Limiting | [RQ-18-RATE-LIMITING-20260105.md](../research/investigations/RQ-18-RATE-LIMITING-20260105.md) |
| RQ-19 | GPU Detection | [RQ-19-GPU-DETECTION-20260105.md](../research/investigations/RQ-19-GPU-DETECTION-20260105.md) |
| RQ-20 | Offline Mode | [RQ-20-OFFLINE-MODE-20260105.md](../research/investigations/RQ-20-OFFLINE-MODE-20260105.md) |

### 19.3 Iteration 3 (RQ-21 — Multi-Demographic Support)

| ID | Title | File |
|----|-------|------|
| RQ-21 | Content Archetypes | [RQ-21-CONTENT-ARCHETYPES-20260105.md](../research/investigations/RQ-21-CONTENT-ARCHETYPES-20260105.md) |

### 19.4 Iteration 4 (RQ-22 — Extensibility Architecture)

| ID | Title | File |
|----|-------|------|
| RQ-22 | Extensibility Architecture | [RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md](../research/investigations/RQ-22-EXTENSIBILITY-ARCHITECTURE-20260105.md) |

### 19.5 Iteration 5 (RQ-23 — Expert Code Review)

| ID | Title | File |
|----|-------|------|
| RQ-23 | Expert Review Critical Gaps | [RQ-23-EXPERT-REVIEW-GAPS-20260105.md](../research/investigations/RQ-23-EXPERT-REVIEW-GAPS-20260105.md) |

---

*Document version: 8.0 — AWS-Style Narrative Spec*  
*Last updated: 2026-01-05*  
*Critical evaluation iterations: 6 (converged)*  
*Research questions resolved: 23/23*  
*Content archetypes: 6 (brainrot, meme, educational, story, product, motivational)*  
*Extension points: 12 (providers, archetypes, stages, hooks, plugins, events, middleware)*  
*CLI commands: 7 (generate, script, audio, visuals, render, init, help)*  
*Based on: 139 vendored repositories, 86 deep-dive documents, 12 category syntheses, 4 theme syntheses, 7 section research documents, 23 investigation documents*
