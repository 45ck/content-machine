# ADR: Data-First Video Templates (20260107)

**Status:** Accepted  
**Date:** 2026-01-07  
**Owners:** content-machine core

---

## Context

content-machine needs to support multiple **short-form video formats** (TikTok captions, split-screen “brainrot” gameplay like Subway Surfers, audiograms, reddit story, screen-recorded product demos) while remaining:

- **CLI-first** (one-flag selection, composable stages)
- **Safe by default** (no arbitrary code execution from untrusted templates)
- **Deterministic & reproducible** (same inputs produce same output as much as possible)
- **Backwards compatible** (existing `cm render` / pipeline behavior must not break)
- **Testable** (Zod schemas + integration tests; no “it works on my machine” templates)

We also want a path to become a “platform”: community templates, internal team style packs, and future marketplace-like sharing.

---

## Decision

Adopt **data-first** video templates as the primary extensibility mechanism:

- Templates are **JSON + optional assets**, validated with Zod (`schemaVersion` required).
- Templates select a Remotion **composition id** (`compositionId`) and provide defaults:
  - `orientation`, `fps`
  - `captionPreset` + partial `captionConfig`
  - optional `archetype` default (for future style resolution)
- Templates are resolved by **id or path** and loaded from:
  1. Built-in templates shipped with the app
  2. Project templates: `./.cm/templates/<id>/template.json`
  3. User templates: `~/.cm/templates/<id>/template.json`
- **Precedence rule:** Template defaults apply only when a CLI flag is still at its default value.
  - Explicit CLI flags always win.

We explicitly do **not** execute template-provided code (custom Remotion projects) in the default mode.

We may add an optional **trusted plugin mode** later (explicit opt-in) for loading a user-provided Remotion project, but it is out-of-scope for the recommended engineering path.

---

## Consequences

### Positive

- Strong security posture: templates remain **data**, not executable code.
- Compatibility: templates are additive and do not break existing commands.
- Great UX: one flag can swap formats; users can still override individual flags.
- Testability: schema validation + reproducible integration tests.
- Platform-friendly: templates can be shared as zip “packs” without granting code execution.

### Negative / Trade-offs

- New layouts still require implementing **built-in compositions** (React/Remotion code).
- Template power is limited to exposed knobs (`params/assets`) until compositions consume them.
- A fully open ecosystem (arbitrary custom compositions) is deferred to “trusted mode” later.

---

## Alternatives Considered

1. **Code plugins first (custom Remotion project per template)**
   - Pros: unlimited custom layouts.
   - Cons: security risk, dependency conflicts, hard support/debugging, unstable across versions.
2. **Hardcode template-like variants in CLI flags only**
   - Pros: simplest implementation.
   - Cons: quickly becomes unmaintainable; users can’t share or standardize formats.
3. **Archetype-only styling**
   - Pros: fewer concepts.
   - Cons: archetypes are about _content structure_, not _visual format_; conflates concerns.

---

## Implementation Notes

Initial slice (implemented):

- `cm render --template <id|path>` loads a template and applies defaults safely.
- Renderer accepts `compositionId` with a fallback to `ShortVideo`.

Next steps:

- Thread templates through `cm generate` and the pipeline.
- Introduce typed `template.params` and `template.assets` consumed by built-in compositions.
- Add template management commands (`cm templates list|validate|install`).

---

## Related

- `docs/features/feature-video-templates-20260107.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/architecture/IMPL-VIDEO-TEMPLATES-20260107.md`
- `docs/architecture/TDD-TEST-PLAN-VIDEO-TEMPLATES-20260107.md`
