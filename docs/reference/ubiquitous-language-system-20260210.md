# Ubiquitous Language System (20260210)

This repo has a few loaded words (template, workflow, archetype, preset, pack). The goal of this system is:

- One meaning per word (no silent synonyms).
- Canonical definitions live in one place.
- Code exports are anchored to the definitions via types/schemas + JSDoc.
- The glossary is generated and checked in CI.

## Canonical Sources

- **Registry (source of truth):** `docs/reference/ubiquitous-language.yaml`
- **Generated glossary (do not edit):** `docs/reference/GLOSSARY.md`
- **Enforcement:** `scripts/quality/check-ubiquitous-language.mjs`

If a term is ambiguous, add/adjust it in the registry, then regenerate/check the glossary:

```bash
npm run glossary:gen
npm run glossary:check
```

## The Big Three (What You Meant By "Don’t Hardcode Archetypes")

These three are intentionally **data-driven**. You can add or change them without changing CM source code.

### 1) Script Archetype

**What it is:** a script-format definition for the script stage (hook + structure + pacing rules).

**Where it lives:**

- Built-in examples: `assets/archetypes/*.yaml` (+ `assets/archetypes/baseline.md`)
- Project overrides: `./.cm/archetypes/`
- User installs: `~/.cm/archetypes/`

**How it’s used:**

- `cm script --archetype <idOrPath>`
- `cm generate --archetype <idOrPath>`

### 2) Render Template

**What it is:** a `template.json` file that selects a Remotion composition and provides render defaults.

**Where it lives:**

- Built-in examples: `assets/templates/<id>/template.json`
- Project templates: `./.cm/templates/<id>/template.json`
- User installs: `~/.cm/templates/<id>/template.json`

**How it’s used:**

- `cm render --template <idOrPath>`
- `cm generate --template <idOrPath>`

### 3) Pipeline Workflow

**What it is:** a workflow definition for `cm generate` that orchestrates stage modes + defaults (+ optional exec hooks).

**Where it lives:**

- Project workflows: `./.cm/workflows/<id>/workflow.json`
- User installs: `~/.cm/workflows/<id>/workflow.json`

**How it’s used:**

- `cm generate --workflow <idOrPath> [--workflow-allow-exec]`

## Relationship Map (How They Fit Together)

- `cm generate` is the orchestrator.
- A **Workflow** decides how the pipeline is run (builtin vs import vs external exec) and can provide defaults.
- A **Script Archetype** affects only the **script stage** output format.
- A **Render Template** affects only the **render stage** (composition + render defaults).
- Artifacts are the stable contracts between stages (`script.json`, `timestamps.json`, `visuals.json`, etc.).

## Packs vs Presets (Stop Reusing the Same Word)

### Pack (distribution)

A **pack** is something you install (directory/zip).

- **Template Pack:** installs into `~/.cm/templates/<id>/`
- **Workflow Pack:** installs into `~/.cm/workflows/<id>/`
- **Archetype Pack:** installs into `~/.cm/archetypes/<id>.yaml`

### Preset (a named baseline inside CM)

A **preset** is a named baseline configuration you select (and can override).

Important split:

- **Caption Preset** (`--caption-preset`): burned-in captions config (`CaptionConfig`), see `src/render/captions/presets.ts`
- **Theme Caption Preset**: style-system preset used by themes (`src/render/presets/caption.ts`)

If you say "caption preset" without qualifying which one, it’s ambiguous.

### Audio Mix Preset vs SFX Pack

- **Audio Mix Preset:** a named set of defaults for music/SFX/ambience levels + LUFS target (selected via `--mix-preset`).
- **SFX Pack:** a named bundle of SFX sources (selected via `--sfx-pack`).

Both are intended to be data-defined and installable via packs; CM ships built-in examples.

## Code Templates (Trusted Mode)

Render Templates are data-only by default. A template becomes a **Code Template** if it includes `template.json -> remotion`.

- This means CM will execute template-local Remotion code during bundling/rendering.
- This must be explicitly allowed (security).

See schema: `src/render/templates/schema.ts` (`RemotionTemplateProjectSchema`).

## What To Do Next (If You Want Max Customization)

1. Expand the registry with any remaining overloaded words you see in docs/CLI output.
2. For each new term, add:
   - Definition + non-examples.
   - Canonical code symbols (types/schemas) and make sure they have JSDoc.
3. Keep user-extensible things as data in `assets/`, `./.cm/`, and `~/.cm/`.
