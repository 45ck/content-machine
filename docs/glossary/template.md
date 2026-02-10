# Template

**Purpose:** A **template** is a render preset (`template.json`) that selects a Remotion **composition** and provides default render styling.

Templates are data-first by default, but can optionally become **code templates** by including a `remotion` block that points to a template-local Remotion entrypoint (explicit opt-in required to execute).

**Canonical terms:**

- **Template** (preferred)
- **Video template** (synonym)
- Avoid: "theme" (too broad), "render profile" (ambiguous)

**Data shape:**

- `template.json` (schema: `VideoTemplateSchema`)
- Required: `schemaVersion`, `id`, `name`, `compositionId`
- Optional:
  - `defaults.orientation`, `defaults.fps`, `defaults.captionPreset`, `defaults.captionConfig`, `defaults.archetype`
  - `remotion` (code templates only): `entryPoint`, `rootDir`, `publicDir`, `installDeps`, `packageManager`
  - `assets` (template-owned asset slots, e.g. gameplay)
  - `params` (composition-specific knobs, e.g. `splitScreenRatio`)

**Where it lives:**

- Built-in: `assets/templates/<id>/template.json`
- Project: `./.cm/templates/<id>/template.json`
- User: `~/.cm/templates/<id>/template.json`

**Code references:**

- Schema: `src/render/templates/schema.ts` (`VideoTemplateSchema`) (also re-exported via `src/domain/render-templates.ts`)
- Resolve by id/path: `src/render/templates/index.ts` (`resolveVideoTemplate`)
- Template params/assets helpers: `src/render/templates/slots.ts`
- CLI management: `src/cli/commands/templates.ts`
- Applied in `cm generate`: `src/cli/commands/generate.ts` (template defaults merged into CLI options)
- Applied in `cm render`: `src/cli/commands/render.ts` (template defaults + params influence render)

**Related:**

- `docs/guides/guide-ubiquitous-language-20260110.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/architecture/IMPL-VIDEO-TEMPLATES-20260107.md`
