# content-machine Documentation

**Date Convention:** All documentation files MUST include `YYYYMMDD` suffix before file extension.

---

## Quick Links

- [AGENTS.md](../AGENTS.md) — Project overview, architecture, commands
- [VENDORING.md](../VENDORING.md) — Vendored repo policy
- [Tasks](../tasks/README.md) — Task management system
- [Templates](templates/README.md) — Documentation templates

---

## Documentation Structure

```
docs/
├── research/           # Research reports on vendored repos
├── architecture/       # ADRs and system design
├── features/          # Feature specifications
├── bugs/              # Bug reports
├── guides/            # How-to guides
├── reference/         # API documentation
├── tutorials/         # Step-by-step tutorials
├── investigations/    # Technical investigations
├── postmortems/       # Incident postmortems
└── templates/         # Documentation templates
```

---

## Research Reports

Located in `research/`, these document findings from vendored repos:

| Report | Topic | Date |
|--------|-------|------|
| [00-SUMMARY](research/00-SUMMARY.md) | Master summary + architecture | 2026-01-01 |
| [01-07](research/) | Original 7 vendored repos | 2026-01-01 |
| [08-16](research/) | 76 infrastructure/dependency repos | 2026-01-01 |

---

## Architecture

Located in `architecture/`, contains ADRs (Architecture Decision Records):

**Format:** `adr-NNN-[decision]-YYYYMMDD.md`

### Planned ADRs

- [ ] ADR-001: Choose rendering approach (Remotion vs alternatives)
- [ ] ADR-002: MCP server architecture
- [ ] ADR-003: TTS provider selection (EdgeTTS vs Kokoro vs Piper)
- [ ] ADR-004: Storage strategy (local vs cloud)
- [ ] ADR-005: Job queue selection (BullMQ vs Temporal)

---

## Guides

Located in `guides/`, task-oriented how-to documentation:

**Format:** `guide-[topic]-YYYYMMDD.md`

### Planned Guides

- [ ] Setup Development Environment
- [ ] Add New MCP Connector
- [ ] Create Remotion Template
- [ ] Deploy to Production
- [ ] Debug Video Rendering Issues

---

## Reference

Located in `reference/`, information-oriented technical docs:

**Format:** `[name]-reference-YYYYMMDD.md`

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

### Planned Features

- [ ] MCP Reddit Connector
- [ ] Content Planning Agent
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

## Diátaxis Framework

All docs follow [Diátaxis](https://diataxis.fr/):

| Type | Purpose | Example |
|------|---------|---------|
| **Tutorial** | Learning | "Your first video" |
| **Guide** | Problem-solving | "How to add MCP connector" |
| **Reference** | Information | "API documentation" |
| **Explanation** | Understanding | "Why Remotion over X?" |

---

## Writing Standards

### Date Suffix (MANDATORY)

✅ **Correct:**
- `feature-caption-system-20260102.md`
- `adr-001-use-remotion-20260102.md`
- `guide-setup-dev-20260102.md`

❌ **Wrong:**
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

**Last Updated:** 2026-01-02
