# content-machine Documentation

**Date Convention:** All documentation files MUST include `YYYYMMDD` suffix before file extension.

---

## Quick Links

- [AGENTS.md](../AGENTS.md) - Project overview, north star, commands
- [SYSTEM-DESIGN-20260104.md](architecture/SYSTEM-DESIGN-20260104.md) - Authoritative spec (3,100 lines)
- [On-Demand Assets Feature](features/feature-on-demand-assets-20260111.md) - Minimal install + targeted downloads
- [On-Demand Assets Implementation](architecture/IMPL-ON-DEMAND-ASSETS-20260111.md) - Options + rollout plan
- [Ubiquitous Language Guide](guides/guide-ubiquitous-language-20260110.md) - Canonical terminology
- [VENDORING.md](../VENDORING.md) - Vendored repo policy
- [Tasks](../tasks/README.md) - Task management system
- [Templates](templates/README.md) - Documentation templates

---

## Documentation Structure

```
docs/
  architecture/       # SYSTEM-DESIGN, ADRs
  research/
    investigations/   # 25 research investigations (RQ-01 to RQ-25)
    deep-dives/       # 13 deep-dive analyses
    sections/         # 8 section-specific research docs
    synthesis/        # Cross-cutting patterns
  features/           # Feature specifications
  bugs/               # Bug reports
  guides/             # How-to guides
  reference/          # API documentation
  tutorials/          # Step-by-step tutorials
  postmortems/        # Incident postmortems
  templates/          # Documentation templates
```

---

## Key Documents

| Document                                                            | Purpose                                   | Lines   |
| ------------------------------------------------------------------- | ----------------------------------------- | ------- |
| [SYSTEM-DESIGN-20260104.md](architecture/SYSTEM-DESIGN-20260104.md) | **Authoritative technical specification** | 3,100   |
| [00-SUMMARY-20260102.md](research/00-SUMMARY-20260102.md)           | Research overview                         | ~500    |
| [investigations/](research/investigations/)                         | 25 RQ documents (RQ-01 to RQ-25)          | ~16,000 |
| [deep-dives/](research/deep-dives/)                                 | 13 deep-dive analyses                     | ~8,000  |
| [sections/](research/sections/)                                     | 8 pipeline section research               | ~4,000  |

---

## Research Reports

Located in `research/`, these document findings from 139 vendored repos:

### Top-Level Reports

| Report                                                                        | Topic                                  | Date       |
| ----------------------------------------------------------------------------- | -------------------------------------- | ---------- |
| [00-SUMMARY](research/00-SUMMARY-20260102.md)                                 | Master summary + architecture          | 2026-01-02 |
| [10-short-video-maker-gyori](research/10-short-video-maker-gyori-20260102.md) | Blueprint repo (TypeScript + Remotion) | 2026-01-02 |
| [12-vidosy](research/12-vidosy-20260102.md)                                   | JSON config -> video pattern           | 2026-01-02 |
| [01-moneyprinter-turbo](research/01-moneyprinter-turbo-20260102.md)           | Multi-provider LLM                     | 2026-01-02 |
| [08-shortgpt](research/08-shortgpt-20260102.md)                               | EdgeTTS (30+ languages)                | 2026-01-02 |
| [16-BATCH2-SUMMARY](research/16-BATCH2-SUMMARY-20260102.md)                   | Infrastructure repos summary           | 2026-01-02 |

### Investigations (research/investigations/)

25 investigation documents (RQ-01 to RQ-25) covering:

- Pipeline resumability, concurrency, schema versioning
- TTS timestamps, forced alignment, drift handling
- Video testing, memory management, licensing
- Error taxonomy, cost tracking, rate limiting
- Extensibility architecture, expert code review

### Deep Dives (research/deep-dives/)

13 deep-dive analyses including:

- CLI architecture patterns
- LLM structured JSON output
- TTS/ASR patterns
- Remotion patterns
- Footage matching strategies

### Section Research (research/sections/)

8 section-specific research documents:

- Script generation (LLM prompts)
- Audio pipeline (TTS + ASR)
- Visual matching (Pexels/Pixabay)
- Video rendering (Remotion)
- CLI architecture
- Configuration systems
- Schema validation
- Virality engineering (packaging, hook, retention, publish): [SECTION-VIRALITY-ENGINEERING-20260105.md](research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md)

---

## Architecture

Located in `architecture/`:

### Current Documents

| Document                                                                                                      | Purpose                                                   |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [SYSTEM-DESIGN-20260104.md](architecture/SYSTEM-DESIGN-20260104.md)                                           | **AWS-style narrative spec** (authoritative, 3,100 lines) |
| [adr-003-data-first-video-templates-20260107.md](architecture/adr-003-data-first-video-templates-20260107.md) | Decision: data-first video templates (safe extensibility) |
| [IMPL-VIDEO-TEMPLATES-20260107.md](architecture/IMPL-VIDEO-TEMPLATES-20260107.md)                             | Implementation plan: expand templates into platform       |
| [TDD-TEST-PLAN-VIDEO-TEMPLATES-20260107.md](architecture/TDD-TEST-PLAN-VIDEO-TEMPLATES-20260107.md)           | TDD plan: template system milestones + regression suite   |

### Planned ADRs

- [ ] ADR-001: LLM provider selection
- [ ] ADR-002: TTS engine selection (Kokoro vs EdgeTTS)
- [ ] ADR-004: Stock footage provider strategy

---

## Implementation Roadmap

From [AGENTS.md](../AGENTS.md):

### Week 1-2: Foundation

- [ ] TypeScript project setup
- [ ] Core infrastructure (config, logger, errors)
- [ ] Zod schemas for all pipeline stages

### Week 3-4: Pipeline Stages

- [ ] `cm script` with OpenAI structured outputs
- [ ] `cm audio` with kokoro-js + whisper.cpp
- [ ] `cm visuals` with Pexels API
- [ ] `cm render` with Remotion

### Week 5-6: Integration

- [ ] `cm generate` full pipeline
- [ ] `cm init` setup wizard
- [ ] Documentation + examples

---

## Guides

Located in `guides/`, task-oriented how-to documentation:

**Format:** `guide-[topic]-YYYYMMDD.md`

### CLI UX guides

- `guides/guide-cli-ux-standards-20260106.md`
- `guides/guide-cli-ux-cm-generate-20260106.md`
- `guides/guide-cli-ux-cm-script-20260106.md`
- `guides/guide-cli-ux-cm-audio-20260106.md`
- `guides/guide-cli-ux-cm-visuals-20260106.md`
- `guides/guide-cli-ux-cm-render-20260106.md`
- `guides/guide-cli-ux-cm-init-20260106.md`
- `guides/guide-cli-ux-cm-package-20260106.md`
- `guides/guide-cli-ux-cm-research-20260106.md`
- `guides/guide-cli-ux-cm-validate-20260106.md`
- `guides/guide-cli-stdout-stderr-contract-20260107.md`
- `guides/guide-cli-json-envelope-20260107.md`
- `guides/guide-cli-progress-events-20260107.md`
- `guides/guide-cli-errors-and-fix-lines-20260107.md`
- `guides/guide-cli-tdd-vv-execution-20260107.md`

### Rendering & templates guides

- `guides/guide-video-templates-20260107.md`
- `guides/guide-audio-options-20260110.md`

### Planned Guides

- [ ] Setup Development Environment
- [ ] Add New MCP Connector
- [ ] Create Remotion Template (see `guides/guide-video-templates-20260107.md`)
- [ ] Deploy to Production
- [ ] Debug Video Rendering Issues
- [ ] CLI UX V&V + TDD Playbook (see `guides/guide-cli-ux-vv-tdd-plan-20260106.md`)

---

## Reference

Located in `reference/`, information-oriented technical docs:

**Format:** `[name]-reference-YYYYMMDD.md`

### CLI command references

- `reference/cm-generate-reference-20260106.md`
- `reference/cm-script-reference-20260106.md`
- `reference/cm-audio-reference-20260106.md`
- `reference/cm-visuals-reference-20260106.md`
- `reference/cm-render-reference-20260106.md`
- `reference/cm-init-reference-20260106.md`
- `reference/cm-package-reference-20260106.md`
- `reference/cm-research-reference-20260106.md`
- `reference/cm-validate-reference-20260106.md`
- `reference/cm-hooks-reference-20260111.md`
- `reference/cm-setup-reference-20260111.md`

### Rendering references

- `reference/video-templates-reference-20260107.md`

### Planned References

- [ ] API Reference
- [ ] MCP Server Protocol
- [ ] Video Schema (JSON config)
- [ ] Environment Variables
- [ ] CLI Commands

---

## Tutorials

Located in `tutorials/`, learning-oriented step-by-step guides:

**Format:** `tutorial-[topic]-YYYYMMDD.md`

### Planned Tutorials

- [ ] Your First Video
- [ ] Custom Caption Styles
- [ ] Product Demo Workflow
- [ ] Reddit Trend Research

---

## Features

Located in `features/`, feature specifications:

**Format:** `feature-[name]-YYYYMMDD.md`

### Implemented Features

- [Research -> Script Integration](features/feature-research-script-integration-20260107.md) - Evidence-based script generation with source tracking

### CLI UX Features

- [CLI UX Observability](features/feature-cli-ux-observability-20260106.md)
- [CLI Progress Events](features/feature-cli-progress-events-20260106.md)
- [CLI JSON Contract](features/feature-cli-json-contract-20260106.md)
- [LLM Streaming UX](features/feature-llm-streaming-cli-20260106.md)
- [Virality Director](features/feature-virality-director-20260105.md) - Packaging + Publish Metadata

### Planned Features

- [ ] MCP Reddit Connector
- [ ] Content Planning Agent
- [ ] [Video Templates (render templates)](features/feature-video-templates-20260107.md)
- [ ] [Audio Options + Mix Integration](features/feature-audio-options-mix-integration-20260110.md)
- [ ] Playwright Capture Pipeline
- [ ] Script Generation + TTS
- [ ] Remotion Rendering
- [ ] Review Dashboard

---

## Bugs

Located in `bugs/`, bug reports and fixes:

**Format:** `bug-NNN-[description]-YYYYMMDD.md`

---

## Investigations

Located in `investigations/`, technical research and RCA:

**Format:** `investigation-[topic]-YYYYMMDD.md`

---

## Postmortems

Located in `postmortems/`, incident reports:

**Format:** `incident-[name]-YYYYMMDD.md`

---

## Diataxis Framework

All docs follow [Diataxis](https://diataxis.fr/):

| Type            | Purpose         | Example                    |
| --------------- | --------------- | -------------------------- |
| **Tutorial**    | Learning        | "Your first video"         |
| **Guide**       | Problem-solving | "How to add MCP connector" |
| **Reference**   | Information     | "API documentation"        |
| **Explanation** | Understanding   | "Why Remotion over X->"    |

---

## Writing Standards

### Date Suffix (MANDATORY)

**Correct:**

- `feature-caption-system-20260102.md`
- `adr-001-use-remotion-20260102.md`
- `guide-setup-dev-20260102.md`

**Wrong:**

- `feature-caption-system.md` (NO DATE)
- `adr-001-use-remotion.md` (NO DATE)

### Cross-Referencing

Always link related docs:

```markdown
## Related

**ADRs:** [ADR-001](architecture/adr-001-use-remotion-20260102.md)
**Tasks:** [TASK-005](../tasks/todo/TASK-005-feature-captions-20260110.md)
**Research:** [vidosy](research/12-vidosy.md)
```

### Templates

**ALWAYS use templates** from `templates/`, never start from scratch.

---

**Last Updated:** 2026-01-05
