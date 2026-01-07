# Feature: Video Templates ("render templates")

**Date:** 2026-01-07  
**Status:** Partially Implemented (render MVP)  
**Owners:** content-machine core

---

## Overview

We need a first-class **video template** system to support multiple short-form formats (e.g. full-screen captions, split-screen gameplay like Subway Surfers, audiograms, reddit story, screen-recording product demos) without hardcoding every style into the render pipeline.

A **video template** is a **data-first preset** that selects:

- **Layout / composition** (which Remotion composition to render)
- **Default render + style choices** (caption preset + overrides, theme)
- **Asset slots** (gameplay library, overlays, fonts, background music)

This is complementary to **content archetypes** (listicle/versus/howto/etc). Archetypes shape the _script/pacing_; templates shape the _visual presentation_.

## User Value

- Pick a viral format with one flag: `--template brainrot-split-gameplay`
- Reuse house style across many videos without repeating CLI flags
- Share templates across machines/projects as an installable pack

## Goals

- Data-only templates (JSON) usable by non-developers
- Built-in templates + user-defined templates loaded from disk
- Schema-validated, versioned, and safe-by-default (no executing arbitrary JS)
- CLI flag to select templates in `cm generate` and `cm render`

## Non-goals (MVP)

- Executing untrusted code templates (custom Remotion projects) by default
- Shipping copyrighted gameplay footage inside the repo or built-in templates
- A full marketplace/registry (start with local folders + zip packs)

---

## Current Implementation (as of 2026-01-07)

Implemented:

- `cm render --template <id|path>` loads a template (built-in id or file/dir path).
- Template defaults apply only when the corresponding CLI option was not explicitly set.
- Renderer supports selecting a Remotion composition via `compositionId` (defaults to `ShortVideo`).
- Built-in templates shipped:
  - `tiktok-captions`
  - `brainrot-split-gameplay` (caption defaults only; split-screen layout is still TBD)

Not yet implemented:

- `cm generate --template <id|path>`
- Template `assets` and `params` consumed by compositions
- Additional compositions (split-screen gameplay, audiogram)

---

## Template Catalog (Initial Targets)

These map directly to patterns found in `vendor/` and `templates/` research.

1. **`tiktok-captions`** (default)
   - Full-screen background (stock/video/color) + TikTok-style word-highlight captions
   - Research base: `docs/research/04-template-tiktok-20260102.md`
2. **`brainrot-split-gameplay`**
   - Split-screen: top captions/content, bottom gameplay (Minecraft parkour / Subway Surfers / car racing)
   - Gameplay clip library model: `docs/architecture/SYSTEM-DESIGN-20260104.md` (Gameplay Asset Library)
   - Vendor evidence: `vendor/ShortGPT/.database/template_asset_db.json`
3. **`audiogram`**
   - Waveform + cover image + captions for podcast-style cuts
   - Research base: `docs/research/05-template-audiogram-20260102.md`
4. **`reddit-story`** (future)
   - Static reddit post screenshot background + captions + subscribe overlay
   - Vendor evidence: `vendor/ShortGPT/.database/template_asset_db.json` (white_reddit_template + subscribe animation)
5. **`screen-recording`** (future)
   - Screen capture with callouts, zooms, and subtitle overlays (product demos)

---

## UX / CLI (Proposed)

### New option: `--template`

Add to:

- `cm generate --template <id|path>`
- `cm render --template <id|path>` (implemented)

Behavior:

- If `<id>`: resolve from template registry (built-in first, then user-installed)
- If `<path>`: load template JSON from disk

### Template management commands (Proposed)

- `cm templates list`
- `cm templates show <id>`
- `cm templates validate <path>`
- `cm templates install <path-to-zip-or-dir>`

---

## Data Contracts

### Template directory layout (recommended)

```
my-template/
├── template.json
├── assets/                  # optional (local fonts/overlays/etc)
├── previews/                # optional (preview.mp4/png)
└── README.md                # optional
```

### Template pack format (shareable)

- A `.zip` that contains exactly one template directory at the root.
- CLI installs it into `~/.cm/templates/<id>/` (or platform equivalent).

### `template.json` (v1 draft)

```json
{
  "schemaVersion": "1.0.0",
  "id": "brainrot-split-gameplay",
  "name": "Brainrot Split Screen (Gameplay)",
  "description": "Top captions + bottom gameplay background",
  "compositionId": "ShortVideo",
  "defaults": {
    "orientation": "portrait",
    "fps": 30,
    "captionPreset": "tiktok",
    "archetype": "story"
  },
  "assets": {
    "gameplay": {
      "library": "~/.cm/assets/gameplay",
      "style": "subway-surfers"
    },
    "overlays": [{ "path": "assets/subscribe-animation.mp4", "type": "video" }]
  },
  "params": {
    "splitScreenRatio": 0.55
  }
}
```

Notes:

- `compositionId` maps to a Remotion composition registered in `src/render/remotion/index.ts`.
- `defaults.captionPreset` maps to the existing caption preset system (`src/render/captions/presets.ts`).
- `assets.*.path` values inside a template dir are resolved relative to that dir.

---

## Architecture

### Resolution order

1. CLI `--template` (id/path) if provided
2. `defaults.template` from `.content-machine.toml` (future)
3. Archetype default template mapping (future)
4. Fallback: `tiktok-captions`

### Integration points

- `src/cli/commands/generate.ts`: choose template early and thread it through stages
- `src/cli/commands/render.ts`: accept `--template` and merge defaults with flags
- `src/render/service.ts`: select composition id dynamically (not hardcoded to `ShortVideo`)
- `src/render/schema.ts`: extend render inputs to include `templateId` + template params
- `src/render/themes/*`: templates should pick a theme/preset rather than duplicating tokens

### Why data-first?

It allows:

- Non-dev users to create templates
- Safe installs (no arbitrary code execution)
- Zod validation + schema migrations (pattern already used across the pipeline)

---

## Security / Licensing

- Treat templates as **data**, not code. Do not evaluate JS from template packs.
- Do not ship copyrighted gameplay. Templates can reference a user-provided gameplay library directory.
- Any template that includes third-party fonts/overlays should include attribution in its README.

---

## Testing

- Unit: `TemplateSchema.safeParse()` + path resolution
- Integration: `cm render --template <path> --mock` selects expected composition + caption preset
- V&V: Render 10s samples across templates and visually inspect caption alignment and layout

---

## Related

- `docs/architecture/adr-003-data-first-video-templates-20260107.md`
- `docs/architecture/IMPL-VIDEO-TEMPLATES-20260107.md`
- `docs/architecture/TDD-TEST-PLAN-VIDEO-TEMPLATES-20260107.md`
- `docs/guides/guide-video-templates-20260107.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/research/04-template-tiktok-20260102.md`
- `docs/research/05-template-audiogram-20260102.md`
- `docs/research/12-vidosy-20260102.md`
- `docs/research/18-demographic-patterns-research-20260105.md`
