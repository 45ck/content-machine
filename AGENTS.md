# AGENTS.md

**content-machine** – CLI-first automated short-form video generator for TikTok, Reels, and Shorts.

> **Status:** Research Complete → Implementation Ready  
> **Version:** System Design v8.0  
> **License:** MIT (Open Source)  
> **Architecture:** 4-stage CLI pipeline (TypeScript + Remotion)

---

## 🎯 North Star Vision

**What:** A command-line tool that transforms a topic into a ready-to-upload short-form video in under 5 minutes.

**How:** Four composable commands that can run independently or as a pipeline:

```bash
cm generate "Redis vs PostgreSQL for caching" --archetype versus --output video.mp4
```

Or run each stage independently:

```bash
cm script --topic "Redis vs PostgreSQL"       # → script.json
cm audio --input script.json                  # → audio.wav + timestamps.json
cm visuals --input timestamps.json            # → visuals.json
cm render --input visuals.json                # → video.mp4
```

**Output:** 1080×1920 vertical MP4 (TikTok/Reels/Shorts ready), 30-60 seconds, with TikTok-style word-highlighted captions.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        content-machine CLI Pipeline                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │  cm script   │───▶│   cm audio   │───▶│  cm visuals  │───▶│ cm render │ │
│  │              │    │              │    │              │    │           │ │
│  │ Topic → JSON │    │ JSON → WAV   │    │ JSON → Stock │    │ All → MP4 │ │
│  │   (LLM)      │    │ (TTS + ASR)  │    │  (Pexels)    │    │ (Remotion)│ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│        │                   │                   │                   │       │
│        ▼                   ▼                   ▼                   ▼       │
│   script.json          audio.wav          visuals.json        video.mp4   │
│                    timestamps.json                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Stages

| Stage          | Input           | Output                          | Key Tech                            |
| -------------- | --------------- | ------------------------------- | ----------------------------------- |
| **cm script**  | Topic string    | `script.json`                   | LLM (OpenAI/Anthropic)              |
| **cm audio**   | Script JSON     | `audio.wav` + `timestamps.json` | kokoro-js (TTS) + whisper.cpp (ASR) |
| **cm visuals** | Timestamps JSON | `visuals.json`                  | Pexels API, LLM keyword extraction  |
| **cm render**  | All artifacts   | `video.mp4`                     | Remotion (React-based rendering)    |

---

## Recommended Pipeline (Default)

For best audio/caption sync, use audio-first timestamps (Whisper required) with ASR
reconciliation enabled. This is now the default for `cm generate`.

```bash
# One-time Whisper setup (needed for audio-first)
node --input-type=module -e "import('@remotion/install-whisper-cpp').then(async (w)=>{ await w.downloadWhisperModel({ model: 'base', folder: './.cache/whisper' }); await w.installWhisperCpp({ to: './.cache/whisper', version: '1.5.5' }); console.log('whisper ready'); })"

# Recommended end-to-end command
cm generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4 --keep-artifacts
```

---

## 📦 Content Archetypes

Six pre-built content patterns optimized for short-form engagement:

| Archetype    | Structure                         | Best For                     |
| ------------ | --------------------------------- | ---------------------------- |
| **listicle** | "5 things..." with numbered items | Tips, facts, recommendations |
| **versus**   | "X vs Y" comparison               | Tool comparisons, decisions  |
| **howto**    | Step-by-step instructions         | Tutorials, quick wins        |
| **myth**     | "Myth: X / Reality: Y"            | Debunking misconceptions     |
| **story**    | Narrative arc with hook           | Case studies, journeys       |
| **hot-take** | Provocative opinion               | Engagement bait, discussions |

Usage:

```bash
cm generate "5 JavaScript tips" --archetype listicle
cm generate "Docker vs Kubernetes" --archetype versus
```

---

## 🔧 Tech Stack (Final Decisions)

| Category              | Technology            | Rationale                                      |
| --------------------- | --------------------- | ---------------------------------------------- |
| **Language**          | TypeScript            | Type safety, ecosystem, Remotion compatibility |
| **CLI Framework**     | Commander.js          | Proven in vidosy, simple, declarative          |
| **LLM Provider**      | OpenAI / Anthropic    | Structured outputs, reliable                   |
| **TTS Engine**        | kokoro-js             | Local, free, high quality                      |
| **ASR Engine**        | @remotion/whisper-cpp | Word-level timestamps, Remotion integration    |
| **Stock Footage**     | Pexels API            | Free, good quality, orientation filtering      |
| **Video Rendering**   | Remotion              | React-based, programmatic, captions support    |
| **Schema Validation** | Zod                   | Runtime validation, TypeScript inference       |
| **Configuration**     | dotenv + TOML         | Secrets in env, settings in config             |

**Documentation Date Convention:** All docs use `YYYYMMDD` suffix (e.g., `feature-caption-system-20260102.md`)

---

## 📁 Repository Structure

```
content-machine/
├── src/                          # Implementation (Starting now)
│   ├── cli/                     # Commander.js entry points
│   │   ├── index.ts             # Main CLI entry
│   │   └── commands/            # script.ts, audio.ts, visuals.ts, render.ts
│   ├── script/                  # Script generation pipeline
│   │   ├── generator.ts         # LLM script generation
│   │   ├── prompts/             # YAML prompt templates
│   │   └── schema.ts            # ScriptOutput Zod schema
│   ├── audio/                   # TTS + ASR pipeline
│   │   ├── tts/                 # kokoro-js wrapper
│   │   ├── asr/                 # whisper.cpp wrapper
│   │   └── schema.ts            # AudioOutput Zod schema
│   ├── visuals/                 # Footage matching
│   │   ├── providers/           # Pexels, Pixabay adapters
│   │   ├── matcher.ts           # Keyword → footage matching
│   │   └── schema.ts            # VisualsOutput Zod schema
│   ├── render/                  # Remotion integration
│   │   ├── remotion/            # React components
│   │   ├── service.ts           # Bundle + render pipeline
│   │   └── schema.ts            # RenderProps Zod schema
│   ├── core/                    # Shared infrastructure
│   │   ├── config.ts            # Configuration loader
│   │   ├── llm.ts               # LLM provider abstraction
│   │   ├── logger.ts            # Structured logging (pino)
│   │   ├── pipeline.ts          # Pipeline orchestration
│   │   └── errors.ts            # Error taxonomy
│   └── test/                    # Test infrastructure
│       └── stubs/               # FakeLLMProvider, FakeTTSProvider
├── docs/                         # Documentation
│   ├── architecture/            # SYSTEM-DESIGN-20260104.md (authoritative spec)
│   └── research/                # 86+ research documents, 23 investigations
├── vendor/                       # 139 vendored repos (reference only)
├── templates/                    # Remotion templates
├── tasks/                        # Task management (INVEST + TDD)
└── tests/                        # Test suites (Vitest)
```

---

## 📋 Command Reference

| Command       | Description                     | Primary Output                 |
| ------------- | ------------------------------- | ------------------------------ |
| `cm generate` | Full pipeline: topic → video    | `video.mp4`                    |
| `cm script`   | Generate script from topic      | `script.json`                  |
| `cm audio`    | Generate voiceover + timestamps | `audio.wav`, `timestamps.json` |
| `cm visuals`  | Find matching stock footage     | `visuals.json`                 |
| `cm render`   | Render final video              | `video.mp4`                    |
| `cm init`     | Interactive setup wizard        | `.content-machine.toml`        |
| `cm help`     | Show help for all commands      | —                              |

### Common Options

```bash
--output, -o <path>    # Output file path
--archetype <type>     # Content archetype (listicle, versus, etc.)
--voice <voice>        # TTS voice selection
--orientation <type>   # portrait (default), landscape, square
--caption-font-family <name>  # Caption font family (e.g., Inter)
--caption-font-weight <weight> # Caption font weight (normal, bold, 100-900)
--caption-font-file <path>     # Caption font file to bundle (ttf/otf/woff/woff2)
--verbose, -v          # Enable debug logging
--json                 # Output as JSON (for scripting)
--dry-run              # Preview without execution
```

---

## 🔧 Vendored Repos (139 total)

**Blueprint Repos (Primary Reference):**

- **short-video-maker-gyori** ⭐ – TypeScript + Remotion + MCP (ARCHITECTURE PATTERN)
- **vidosy** ⭐ – JSON config → video (CLI PATTERN)
- **MoneyPrinterTurbo** – Multi-provider LLM, search term generation
- **ShortGPT** – EdgeTTS (30+ languages), YAML prompts

**Core Technologies:**

- **Remotion** – React-based video rendering
- **kokoro-js** – Local TTS engine
- **@remotion/install-whisper-cpp** – ASR with word timestamps
- **Pexels API** – Stock footage

**Full analysis:** See `docs/research/` (86+ documents)

---

## 🚀 Development Roadmap

### Week 1-2: Foundation (Current Phase)

- [ ] TypeScript project setup (tsconfig, ESLint, Vitest)
- [ ] Core infrastructure (config, logger, errors)
- [ ] Zod schemas for all pipeline stages
- [ ] LLM provider abstraction

### Week 3-4: Pipeline Stages

- [ ] `cm script` with OpenAI structured outputs
- [ ] `cm audio` with kokoro-js + whisper.cpp
- [ ] `cm visuals` with Pexels API
- [ ] `cm render` with Remotion

### Week 5-6: Integration & Polish

- [ ] `cm generate` full pipeline
- [ ] `cm init` setup wizard
- [ ] Error handling + recovery
- [ ] Documentation + examples

### Post-MVP (v1.5+)

- Background music integration
- Multiple TTS engines (EdgeTTS, ElevenLabs)
- Semantic footage matching (embeddings)
- Web dashboard for review
- Auto-upload to platforms

---

## 🧪 Testing & Validation Strategy

| Type            | Coverage  | Tool         | Scope                        |
| --------------- | --------- | ------------ | ---------------------------- |
| **Unit**        | 70%       | Vitest       | Schema validation, utilities |
| **Integration** | 20%       | Vitest + MSW | LLM calls, API responses     |
| **E2E**         | 10%       | Vitest       | Full pipeline, video output  |
| **LLM Evals**   | Per stage | promptfoo    | Quality scoring, regression  |

### V&V Framework (4-Layer Approach)

| Layer | Type                | Example                                      |
| ----- | ------------------- | -------------------------------------------- |
| 1     | Schema Validation   | Zod safeParse for JSON structure             |
| 2     | Programmatic Checks | Word count, scene count, duration            |
| 3     | LLM-as-Judge        | Hook quality, TikTok voice, visual relevance |
| 4     | Human Review        | Random sample QA                             |

**Key Evaluation Metrics:**

- Script hook score: ≥0.85
- Archetype adherence: ≥0.90
- Visual relevance: ≥0.80
- Video PSNR: ≥35 dB

**Documentation:**

- [RQ-24: LLM Evaluation](docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md)
- [V&V Framework Guide](docs/guides/VV-FRAMEWORK-20260105.md)
- [evals/](evals/) — promptfoo configurations

### Test Stubs (Required for All Providers)

```typescript
// src/test/stubs/fake-llm.ts
export class FakeLLMProvider implements LLMProvider {
  queueResponse(response: LLMResponse): void;
  queueJsonResponse<T>(data: T): void;
  getCalls(): LLMMessage[][];
}
```

---

## 📚 Key Documentation

| Document                                                                                                 | Purpose                                       |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [SYSTEM-DESIGN-20260104.md](docs/architecture/SYSTEM-DESIGN-20260104.md)                                 | **Authoritative specification** (3,300 lines) |
| [IMPL-PHASE-0-FOUNDATION](docs/architecture/IMPL-PHASE-0-FOUNDATION-20260105.md)                         | Phase 0: Project setup, core infrastructure   |
| [IMPL-PHASE-1-SCRIPT](docs/architecture/IMPL-PHASE-1-SCRIPT-20260105.md)                                 | Phase 1: Script generation pipeline           |
| [IMPL-PHASE-2-AUDIO](docs/architecture/IMPL-PHASE-2-AUDIO-20260105.md)                                   | Phase 2: TTS and ASR integration              |
| [IMPL-PHASE-3-VISUALS](docs/architecture/IMPL-PHASE-3-VISUALS-20260105.md)                               | Phase 3: Stock footage matching               |
| [IMPL-PHASE-4-RENDER](docs/architecture/IMPL-PHASE-4-RENDER-20260105.md)                                 | Phase 4: Remotion video rendering             |
| [IMPL-PHASE-5-INTEGRATION](docs/architecture/IMPL-PHASE-5-INTEGRATION-20260105.md)                       | Phase 5: Pipeline integration, polish         |
| [RQ-24: LLM Evaluation](docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md) | LLM-as-judge, promptfoo patterns              |
| [V&V Framework](docs/guides/VV-FRAMEWORK-20260105.md)                                                    | Validation & verification guide               |
| [00-SUMMARY-20260102.md](docs/research/00-SUMMARY-20260102.md)                                           | Research overview                             |
| [investigations/](docs/research/investigations/)                                                         | 24 investigation documents (RQ-01 to RQ-24)   |
| [deep-dives/](docs/research/deep-dives/)                                                                 | 13 deep-dive analyses                         |
| [sections/](docs/research/sections/)                                                                     | 7 section-specific research docs              |

---

## ⚙️ Configuration

### Environment Variables (Secrets)

```bash
# .env (never commit)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PEXELS_API_KEY=...
```

### Project Configuration

```toml
# .content-machine.toml
[defaults]
archetype = "listicle"
orientation = "portrait"
voice = "af_heart"

[llm]
provider = "openai"
model = "gpt-4o"
temperature = 0.7

[audio]
tts_engine = "kokoro"
asr_engine = "whisper"

[captions]
font_family = "Inter"
font_weight = 700
font_file = "assets/fonts/Inter/Inter-Bold.woff2"
```

---

## 📝 Documentation Standards

**Date Convention:** ALL documentation files MUST include `YYYYMMDD` suffix.

**Examples:**

- ✅ `feature-caption-system-20260102.md`
- ✅ `investigation-tts-latency-20260120.md`
- ❌ `feature-caption-system.md` (NO DATE)

**Templates:** All templates in `docs/templates/` (use these, never start from scratch)

---

## Task Management

**Location:** `tasks/`

**Structure:**

```
tasks/
├── todo/               # Ready to start
├── in_progress/        # Currently working (max 3 per person)
├── done/               # Completed (archive after 30 days)
├── blocked/            # Waiting on external dependency
└── templates/          # Task templates (MANDATORY to use)
```

**Task Naming:** `TASK-NNN-type-short-description-YYYYMMDD.md`

**Examples:**

- `TASK-001-feature-mcp-reddit-connector-20260102.md`
- `TASK-002-bug-whisper-timestamp-20260115.md`
- `TASK-003-research-remotion-patterns-20260110.md`

**Mandatory Phases (Every Task):**

1. **Documentation Planning** – What docs does this require?
2. **Testing Considerations** – What needs testing? Edge cases?
3. **Testing Plan** – Specific test cases BEFORE implementation
4. **Implementation** – TDD: Red → Green → Refactor
5. **Verification (V&V)** – Complete checklist, CI passed, deployed

**TDD Workflow (Non-Negotiable):**

```
🔴 RED     → Write failing test that defines expected behavior
🟢 GREEN   → Write minimal code to pass the test
🔵 REFACTOR → Improve code while keeping tests green
```

**Completion Criteria (ALL Required):**

- [ ] All acceptance criteria met
- [ ] Testing Plan fully executed (all tests passing)
- [ ] All required documentation created and linked
- [ ] Code committed to main branch
- [ ] CI passed
- [ ] Verification Checklist 100% checked

**Full guide:** `tasks/README.md`

---

## Architecture Principles

### 1. CLI-First Design

- **Commands are composable** (pipe stages together)
- Each stage produces JSON artifacts
- No web UI required for MVP

### 2. LLM-First Reasoning

- Avoid keyword matching / regex heuristics
- Use structured outputs (Zod schemas)
- Implement evals for non-deterministic behavior

### 3. Dependency Injection

- All providers via constructor injection
- Static factories for production: `AudioPipeline.create(config)`
- Test factories for testing: `AudioPipeline.createForTest(fakes)`

### 4. Configuration-Driven

- Video specs as JSON/TOML
- Template system for style variants
- Environment-based feature flags

### 5. Observability

- Structured logging (pino)
- Cost tracking per LLM call
- Progress callbacks for long operations

---

## Debugging Workflow (Scientific Method + TDD)

1. **Problem statement**
2. **Hypotheses (5-11)** – generate multiple explanations
3. **Criteria** – define evaluation metrics
4. **Rank** – score hypotheses against criteria
5. **Failing test** – write test for top hypothesis
6. **Document** – what you tried, what's next
7. **Fix** – change code until test passes
8. **Verify** – confirm problem solved, else repeat

---

## Security & Licensing

### API Keys

- Never commit secrets (`.env` in `.gitignore`)
- Support multiple API keys for rotation
- Validate presence at startup

### Remotion Licensing

**CRITICAL:** Remotion requires company license for commercial use. Review before commercial deployment.

### Content Safety

- Validate all LLM outputs against schemas
- Rate limiting on API calls

---

## Contributing

### Before Starting Work

1. Check `tasks/todo/` for prioritized work
2. Move task to `in_progress/` (max 3 concurrent)
3. Read [SYSTEM-DESIGN-20260104.md](docs/architecture/SYSTEM-DESIGN-20260104.md)
4. Write failing tests first (TDD)

### Pull Request Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] Documentation updated (with date suffix)
- [ ] Task moved to `done/`

---

## Resources

### Research Reports

- `docs/research/00-SUMMARY.md` – Master summary, architecture
- `docs/research/10-short-video-maker-gyori.md` – Blueprint repo (TypeScript + MCP)
- `docs/research/12-vidosy.md` – JSON config → video pattern
- `docs/research/08-shortgpt.md` – EdgeTTS (30+ languages)
- `docs/research/16-BATCH2-SUMMARY.md` – All 76 infrastructure repos

### External Links

- Remotion Docs: https://www.remotion.dev/docs/
- MCP Specification: https://modelcontextprotocol.io/
- LangChain Docs: https://python.langchain.com/docs/
- Playwright Docs: https://playwright.dev/

### Free Resources

- **TTS:** EdgeTTS (30+ languages), Kokoro (English), Piper
- **Stock Footage:** Pexels API, Unsplash API
- **ASR:** OpenAI Whisper (local, no API costs)

---

## Next Steps (Immediate)

1. **Setup TypeScript project** – src/ structure, tsconfig, dependencies
2. **Implement core infrastructure** – config.ts, logger.ts, errors.ts
3. **Define Zod schemas** – ScriptOutput, AudioOutput, VisualsOutput, RenderProps
4. **Create LLM provider abstraction** – OpenAI + Anthropic support
5. **Implement `cm script`** – First pipeline stage

---

## Glossary

| Term                 | Definition                                           |
| -------------------- | ---------------------------------------------------- |
| **MCP**              | Model Context Protocol (how LLMs call tools/APIs)    |
| **Remotion**         | React-based programmatic video rendering             |
| **TTS**              | Text-to-Speech                                       |
| **ASR**              | Automatic Speech Recognition (transcription)         |
| **EdgeTTS**          | Microsoft Edge's free TTS API (30+ languages)        |
| **Kokoro**           | Open-weight local TTS (English only)                 |
| **Playwright**       | Browser automation for UI capture                    |
| **LangGraph**        | Agent orchestration framework (LangChain)            |
| **Vidosy Pattern**   | JSON config → video generation                       |
| **Product Truthful** | Videos show real product UI, not stock footage       |
| **Shorts**           | TikTok/Reels/YouTube Shorts (vertical video < 60s)   |
| **Archetype**        | Pre-built content structure (listicle, versus, etc.) |
| **Pipeline Stage**   | One of: script, audio, visuals, render               |

---

**Last Updated:** 2026-01-05  
**System Design Version:** 8.1  
**Implementation Phases:** 6 (Phase 0-5 fully documented)  
**Status:** Ready for Implementation
