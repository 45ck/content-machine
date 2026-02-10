# video-templates reference (20260107)

This document defines the **render template** contract: how templates are stored, resolved, and applied by the CLI.

## Definitions

- **Render Template**: a versioned JSON file (`template.json`) that selects a Remotion composition and provides defaults for styling + assets.
- **Template pack**: a zip containing a template directory (`template.json` + optional local assets).
- **Composition**: a Remotion composition id registered in `src/render/remotion/index.ts` and selected by the renderer.
- **Code template**: a template pack that also ships a Remotion project (entrypoint + compositions) and requires explicit opt-in to execute.

## Selection and resolution

### Selection order (CLI)

1. `--template <id|path>` CLI option
2. Config default (e.g. `.content-machine.toml` → `render.template`)
3. Fallback: no template (use CLI/config defaults for render settings)

If you want an explicit default template, set `render.template = "tiktok-captions"` in config.

### Resolution by id (search order)

When `--template` is an **id** (not a path), `cm` resolves it in this order:

1. Built-in templates (`assets/templates/<id>/template.json`)
2. Project templates (`./.cm/templates/<id>/template.json`)
3. User templates (`~/.cm/templates/<id>/template.json`)

## Template locations

- Built-in templates: shipped with the app (read-only)
- User-installed templates: `~/.cm/templates/<id>/template.json`
- Project templates: `./.cm/templates/<id>/template.json` (optional)

## `template.json` schema (draft v1)

Required:

- `schemaVersion` (string, e.g. `"1.0.0"`)
- `id` (string, kebab-case: letters/digits/hyphens)
- `name` (string)
- `compositionId` (string)

Optional:

- `description` (string)
- `defaults.orientation` (`portrait|landscape|square`)
- `defaults.fps` (number)
- `defaults.captionPreset` (caption preset id; built-in examples: `tiktok|youtube|reels|bold|minimal|neon`)
- `defaults.captionConfig` (partial, merged onto preset)
- `defaults.archetype` (script archetype id)
- `remotion` (object; code templates only)
  - `remotion.entryPoint` (string; required if `remotion` is present) Path to the Remotion entrypoint file that calls `registerRoot()`
  - `remotion.rootDir` (string; optional) Remotion project root (relative to template dir)
  - `remotion.publicDir` (string; optional) Public dir to copy (relative to `rootDir`, default `public`)
  - `remotion.installDeps` (`auto|prompt|never`; optional) Dependency install mode when `package.json` exists and `node_modules` is missing
  - `remotion.packageManager` (`npm|pnpm|yarn`; optional) Preferred package manager for installs
- `assets` (object)
- `params` (object; composition-specific)

Notes:

- If `remotion` is present, CM will bundle the template-provided Remotion project instead of the built-in one.
- Security: code templates execute arbitrary JS/TS during bundling/rendering. They are denied by default and require `--allow-template-code` (or config `render.allowTemplateCode=true`).

### Asset slots (recommended)

`assets` is template-defined, but common slots should standardize early:

- `assets.gameplay.library`: gameplay directory (external, user-provided)
- `assets.gameplay.style`: subfolder name (`subway-surfers`, `minecraft-parkour`, ...)
- `assets.overlays[]`: local video/image overlays bundled with the template (render-time layer)
- `assets.fonts[]`: custom fonts bundled with the template (optional)
- `assets.music`: background music selection (optional; licensing-sensitive)

`assets.overlays[]` entries may be strings or objects:

- `"assets/overlays/logo.png"`
- `{ "src": "assets/overlays/frame.png", "layer": "above-captions", "position": "top-right", "opacity": 0.9 }`

Overlay timing fields use **seconds** (`start`, `end`).

`assets.fonts[]` entries should match:

- `{ "family": "My Font", "src": "assets/fonts/MyFont.ttf", "weight": 700 }`

## Template directory layout

```
<id>/
├── template.json
├── remotion/                # optional (code templates only)
│   ├── index.ts             # entryPoint (registerRoot)
│   └── root.tsx             # registers compositions
│   └── public/              # optional (code templates only; when rootDir=remotion)
├── public/                  # optional (code templates only; when rootDir=.)
├── imported/                # optional (created by `cm templates import`)
├── assets/
│   ├── overlays/
│   └── fonts/
├── previews/
└── README.md
```

Rules:

- Paths inside `template.json` are resolved relative to the directory containing `template.json`.
- The CLI should reject packs with absolute paths by default (security).

## CLI surface

### Selection

- `cm generate ... --template <id|path>`
- `cm render ... --template <id|path>`

If the template is a code template:

- `cm generate ... --template <id|path> --allow-template-code`
- `cm render ... --template <id|path> --allow-template-code`

Dependency install helpers for code templates:

- `--template-deps <auto|prompt|never>`
- `--template-pm <npm|pnpm|yarn>`

### Management

- `cm templates list`
- `cm templates show <id>`
- `cm templates validate <path>`
- `cm templates new <id> [--from <idOrPath>]`
- `cm templates import <source>`
- `cm templates pack <dir> -o <pack.zip>`
- `cm templates install <zip|dir>`

## Artifacts

When running `cm generate --keep-artifacts` with a resolved template, `cm` writes:

- `template.resolved.json`: resolved template metadata + derived params/slots + effective defaults.

## Compatibility / migrations

- Templates must include `schemaVersion`.
- On breaking changes, the CLI should support `cm templates migrate` or apply a best-effort migration when loading.

## Related

- `docs/architecture/adr-003-data-first-video-templates-20260107.md`
- `docs/architecture/IMPL-VIDEO-TEMPLATES-20260107.md`
- `docs/architecture/TDD-TEST-PLAN-VIDEO-TEMPLATES-20260107.md`
- `docs/features/feature-video-templates-20260107.md`
- `docs/guides/guide-video-templates-20260107.md`
- `docs/architecture/IMPL-RENDER-STYLE-SYSTEM-V2-20260105.md`
