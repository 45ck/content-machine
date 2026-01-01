# AGENTS.md

**content-machine** – Open-source automated short-form video generation platform for TikTok, Reels, and Shorts.

> **Status:** Research/Architecture Phase → Implementation Starting
> **License:** MIT (Open Source)
> **Target:** TypeScript + Remotion + MCP + REST architecture

---

## Project Summary

**Vision:** Automate creation of product-truthful, engaging short-form videos (TikTok, Instagram Reels, YouTube Shorts) for developer tools, SaaS products, and technical content.

**Architecture:** Modular pipeline with 7 core components:

| Component | Status | Description |
|-----------|--------|-------------|
| **Trend Intake** | Planned | Reddit/HN/YouTube trend research via MCP connectors |
| **Content Planning** | Planned | LLM agent orchestration (LangGraph/LangChain) |
| **Capture** | Planned | Product-truthful UI recording (Playwright + MCP) |
| **Script Generation** | Planned | Product-aware voiceover scripts + TTS |
| **Rendering** | Planned | JSON → Video via Remotion (vidosy patterns) |
| **Review/Approval** | Planned | Internal ops dashboard (Appsmith/Budibase) |
| **Distribution** | Future | Auto-upload to TikTok/YouTube/Instagram |

**Key Flow:** Trends → Planning Agent → Capture → Script → Render → Review → Publish

**Blueprint Repos:** 
- `short-video-maker-gyori` (TypeScript + Remotion + MCP + REST)
- `vidosy` (JSON config → video pattern)
- `ShortGPT` (EdgeTTS for multi-language TTS)

**Tech Stack:** TypeScript, Node.js, Remotion, Playwright, MCP, LangChain/LangGraph, FFmpeg, Whisper, EdgeTTS/Kokoro, Pexels/Unsplash

**Documentation Date Convention:** All docs use `YYYYMMDD` suffix (e.g., `feature-caption-system-20260102.md`)

---

## Repo Structure

```
content-machine/
├── src/                          # Implementation (EMPTY - awaiting development)
│   ├── connectors/              # MCP servers (Reddit, YouTube, HN, DB, etc.)
│   ├── planner/                 # Content planning agent (LangGraph orchestration)
│   ├── capture/                 # Playwright-based UI recording
│   ├── script/                  # Script generation + TTS pipeline
│   ├── render/                  # Remotion rendering engine
│   ├── review/                  # Review API + approval workflow
│   └── common/                  # Shared types, utils, config
├── vendor/                       # 118 vendored repos (git submodules)
│   ├── orchestration/           # temporal, n8n, airflow
│   ├── queue/                   # bullmq, celery, rq
│   ├── mcp/                     # MCP SDKs + reference servers
│   ├── connectors/              # Reddit, YouTube, HN, web crawling
│   ├── agents/                  # langchain, langgraph, llama_index
│   ├── storage/                 # minio, qdrant, weaviate, pgvector
│   ├── capture/                 # playwright + MCP servers
│   ├── render/                  # remotion + templates
│   ├── video-processing/        # ffmpeg, moviepy, pyav
│   ├── captions/                # whisper variants, captacity
│   ├── audio/                   # kokoro, piper, coqui-tts
│   ├── clipping/                # auto-editor, pyscenedetect
│   ├── publish/                 # postiz, tiktok-uploader
│   └── review-ui/               # appsmith, budibase, react-admin
├── templates/                    # Remotion templates + patterns
│   ├── template-tiktok-base/   # Baseline captions (Remotion official)
│   ├── template-audiogram/      # Caption patterns
│   ├── vidosy/                  # JSON → video config system
│   └── Short-Video-Creator/
├── connectors/                   # MCP connector configs
│   └── mcp-reddit/              # Reddit trend research
├── docs/                         # Documentation (Diátaxis)
│   ├── research/                # Research reports (00-16, dated YYYYMMDD)
│   ├── architecture/            # System design, ADRs
│   ├── guides/                  # How-to docs
│   ├── reference/               # API docs, glossaries
│   ├── tutorials/               # Step-by-step learning
│   └── templates/               # Doc templates
├── tasks/                        # Task management (INVEST + TDD)
│   ├── todo/                    # Ready to start
│   ├── in_progress/             # Currently working (max 3)
│   ├── done/                    # Completed (archive after 30 days)
│   ├── blocked/                 # Waiting on dependency
│   └── templates/               # Task templates
├── scripts/                      # Automation scripts
│   ├── vendor.ps1               # Update/init submodules
│   ├── dev/                     # Development helpers
│   └── test/                    # Testing utilities
├── .github/                      # GitHub Actions CI/CD
│   └── workflows/               # CI pipeline
└── tests/                        # Test suites
    ├── unit/                    # Unit tests
    ├── integration/             # Integration tests
    └── e2e/                     # End-to-end tests
```

---

## Vendored Repos (118 total)

**Core Dependencies (use as-is):**
- **Orchestration:** temporal, n8n, airflow
- **Job Queues:** bullmq, celery, rq
- **MCP SDKs:** modelcontextprotocol/python-sdk, jlowin/fastmcp, punkpeye/fastmcp
- **Agents:** langchain, langgraph, llama_index, pydantic-ai
- **Capture:** microsoft/playwright, playwright-mcp
- **Video:** FFmpeg, ffmpeg-python, moviepy
- **ASR:** openai/whisper, whisper.cpp, faster-whisper, whisperX
- **TTS:** kokoro, piper, coqui-tts
- **Storage:** minio, qdrant, pgvector
- **ORM:** prisma, drizzle-orm

**Study/Reference (extract patterns):**
- **short-video-maker-gyori** ⭐ – TypeScript + Remotion + MCP + REST (BLUEPRINT)
- **vidosy** ⭐ – JSON config → video (ARCHITECTURE PATTERN)
- **ShortGPT** – EdgeTTS (free multi-language), dubbing
- **viralfactory** – Auto-upload patterns
- **captacity** – Caption styling patterns
- **Clip-Anything** – Virality scoring + multimodal analysis
- **MoneyPrinterTurbo** – Script prompts, asset pipeline
- **postiz/mixpost** – Social media scheduling patterns

**Fork/Modify (customize for our needs):**
- **remotion-dev/template-tiktok** – Baseline captions, adapt for product demos
- **unconv/captacity** – Caption rendering, add product-specific styles
- **reddit-mcp servers** – Trend research, add filters for tech content

**Full list:** See `docs/research/00-SUMMARY.md` and `docs/research/16-BATCH2-SUMMARY.md`

---

## Command Index

| Command | Purpose |
|---------|---------|
| `.\scripts\vendor.ps1` | Init/update all 118 submodules |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server (when implemented) |
| `pnpm test` | Run test suite |
| `pnpm build` | Build production bundle |
| `pnpm lint` | Lint TypeScript code |
| `pnpm type-check` | TypeScript type checking |

**PowerShell Best Practices:**
- Always use `-UseBasicParsing` with `Invoke-WebRequest`
- Disable AWS CLI pager: `$env:AWS_PAGER=""`
- Never use output filters like `Select-Object -First N` (capture full output)

---

## Documentation Standards

**Date Convention:** ALL documentation files MUST include `YYYYMMDD` suffix before file extension.

**Naming Examples:**
- ✅ `feature-caption-system-20260102.md`
- ✅ `bug-render-crash-20260115.md`
- ✅ `investigation-tts-latency-20260120.md`
- ✅ `adr-001-use-remotion-20260102.md`
- ❌ `feature-caption-system.md` (NO DATE)

**Location by Type:**

| Type | Path | Example |
|------|------|---------|
| Research | `docs/research/` | `17-playwright-mcp-patterns-20260102.md` |
| Architecture | `docs/architecture/` | `adr-001-use-remotion-20260102.md` |
| Bug Reports | `docs/bugs/` | `bug-001-ffmpeg-crash-20260115.md` |
| Features | `docs/features/` | `feature-caption-system-20260102.md` |
| Guides | `docs/guides/` | `guide-setup-playwright-20260102.md` |
| Investigations | `docs/investigations/` | `investigation-tts-latency-20260120.md` |
| Postmortems | `docs/postmortems/` | `incident-render-failure-20260125.md` |
| Tutorials | `docs/tutorials/` | `tutorial-first-video-20260102.md` |
| Reference | `docs/reference/` | `api-reference-20260102.md` |

**Diátaxis Framework:**
- **Tutorials:** Learning-oriented (step-by-step)
- **How-To Guides:** Task-oriented (solve specific problem)
- **Reference:** Information-oriented (technical description)
- **Explanation:** Understanding-oriented (clarify concepts)

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

## Development Workflow

### Phase 1: Research → Architecture (CURRENT)
- [x] Vendor 118 repos
- [x] Create research reports (00-16)
- [ ] Deep dive into blueprint repos (short-video-maker-gyori, vidosy)
- [ ] Finalize architecture decisions (ADRs)
- [ ] Define component contracts (schemas)

### Phase 2: Foundation
- [ ] Setup TypeScript project structure
- [ ] Implement core types/schemas (Zod)
- [ ] MCP server infrastructure
- [ ] Playwright capture pipeline
- [ ] Remotion rendering pipeline

### Phase 3: MVP Implementation
- [ ] Reddit trend connector (MCP)
- [ ] Content planning agent (LangGraph)
- [ ] Product capture workflow (Playwright)
- [ ] Script generation + TTS
- [ ] Caption rendering (Remotion)
- [ ] Review dashboard

### Phase 4: Distribution
- [ ] Upload automation (TikTok/YouTube/Instagram)
- [ ] Scheduling system
- [ ] Analytics integration

---

## Testing Strategy

**Test Pyramid:**
- **Unit Tests (70%):** Vitest, fast, isolated
- **Integration Tests (20%):** Component interactions, MCP servers
- **E2E Tests (10%):** Full pipeline, expensive but critical

**Tools:**
- **Unit:** Vitest
- **Integration:** Vitest + MSW (mock APIs)
- **E2E:** Playwright
- **LLM Evaluation:** promptfoo, langfuse
- **Video Quality:** Manual review + automated metrics

**Coverage Target:** 80% overall, 90% for critical paths (capture, render)

---

## Architecture Principles

### 1. Product Truthfulness
- **Always capture real product UI** (never stock footage for product demos)
- Use Playwright for authentic interaction recording
- Validate captions match actual feature behavior

### 2. Modularity
- Each component is independently deployable
- MCP servers for cross-component communication
- Clear contracts (Zod schemas) between components

### 3. LLM-First Reasoning
- Avoid keyword matching / regex heuristics
- Use structured outputs (Zod schemas)
- Implement evals for non-deterministic behavior
- Keep decision traces for debugging

### 4. Configuration-Driven
- Video specs as JSON (vidosy pattern)
- Template system for style variants
- Environment-based feature flags

### 5. Observability
- LangFuse for LLM tracing
- Sentry for error tracking
- OpenTelemetry for metrics
- Structured logging (no console.log in production)

---

## Design Decisions (ADR Pattern)

**Process:**
1. **Problem statement** – What needs deciding? Why now?
2. **Options (3-10)** – Generate alternatives (never just one)
3. **Criteria** – Define factors (performance, maintainability, cost, complexity)
4. **Evaluate** – Score each option against criteria
5. **Select** – Pick winner, document trade-offs
6. **Document** – Write ADR in `docs/architecture/adr-NNN-title-YYYYMMDD.md`
7. **Review** – Validate decision after implementation

**Location:** `docs/architecture/`

**Naming:** `adr-NNN-short-title-YYYYMMDD.md`

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
9. **Document everything** – postmortem if needed

**Tip:** When a test fails, don't assume the test is wrong. Gather evidence first.

---

## Security Considerations

### API Keys & Secrets
- Never commit secrets (`.env` in `.gitignore`)
- Use environment variables for all API keys
- Rotate keys regularly

### Content Safety
- Implement content filters (OpenAI moderation API)
- Validate all user inputs (Zod schemas)
- Rate limiting on public endpoints

### Vendor Dependencies
- Pin submodule commits (don't use `main` branches)
- Review vendored code before use
- Document security constraints (e.g., snscrape ToS risks)

**OWASP Top 10:** Always validate inputs, parameterize queries, escape outputs

---

## Constraints & Licensing

### Remotion Licensing
**CRITICAL:** Remotion has a special company license requirement depending on use case. Review before commercial use.
- Repo: https://github.com/remotion-dev/remotion
- License discussion in README

### Deprecated/Archived Repos
- `google-api-python-client` – Maintenance mode only
- `not-an-aardvark/snoowrap` – Archived, avoid for production
- `fluent-ffmpeg/node-fluent-ffmpeg` – Archived, patterns only

### High ToS Risk (Study Only)
- `snscrape` – Violates platform ToS, research only
- `instaloader` – Same risk, don't use in production
- `tiktok-uploader` – Unofficial API, may break anytime

---

## Contributing

### Before Starting Work
1. Check `tasks/todo/` for prioritized work
2. Move task to `in_progress/` (max 3 concurrent)
3. Read relevant research reports
4. Review architecture decisions (ADRs)
5. Write failing tests first (TDD)

### Pull Request Checklist
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Documentation updated (with date suffix)
- [ ] Task moved to `done/`
- [ ] Verification checklist complete

### Code Review Standards
- No merge without tests
- No merge without docs
- No hardcoded secrets
- Proper error handling
- Domain terminology used correctly

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

1. **Deep dive `short-video-maker-gyori`** – Study TypeScript + Remotion + MCP patterns
2. **Study `vidosy` JSON config** – Video-as-data approach
3. **Define schemas** – Content Object, Scene, Render Config (Zod)
4. **Write ADR-001** – Choose rendering approach (Remotion vs alternatives)
5. **Write ADR-002** – MCP server architecture
6. **Setup TypeScript project** – src/ structure, tsconfig, dependencies

---

## Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol (how LLMs call tools/APIs) |
| **Remotion** | React-based programmatic video rendering |
| **TTS** | Text-to-Speech |
| **ASR** | Automatic Speech Recognition (transcription) |
| **EdgeTTS** | Microsoft Edge's free TTS API (30+ languages) |
| **Kokoro** | Open-weight local TTS (English only) |
| **Playwright** | Browser automation for UI capture |
| **LangGraph** | Agent orchestration framework (LangChain) |
| **Vidosy Pattern** | JSON config → video generation |
| **Product Truthful** | Videos show real product UI, not stock footage |
| **Shorts** | TikTok/Reels/YouTube Shorts (vertical video < 60s) |

---

**Last Updated:** 2026-01-02
