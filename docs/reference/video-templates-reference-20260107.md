# video-templates reference (20260107)

This document defines the proposed **video template** contract: how templates are stored, resolved, and applied by the CLI.

## Definitions

- **Template**: a versioned JSON file that selects a Remotion composition and provides defaults for styling + assets.
- **Template pack**: a zip containing a template directory (`template.json` + optional local assets).
- **Composition**: a Remotion composition id registered in `src/render/remotion/index.ts` and selected by the renderer.

## Resolution order (proposed)

1. `--template <id|path>` CLI option
2. Config default (e.g. `.content-machine.toml` → `defaults.template`)
3. Archetype → default template mapping
4. Fallback: `tiktok-captions`

## Template locations (proposed)

- Built-in templates: shipped with the app (read-only)
- User-installed templates: `~/.cm/templates/<id>/template.json`
- Project templates: `./.cm/templates/<id>/template.json` (optional)

## `template.json` schema (draft v1)

Required:

- `schemaVersion` (string, e.g. `"1.0.0"`)
- `id` (string, URL-safe)
- `name` (string)
- `compositionId` (string)

Optional:

- `description` (string)
- `defaults.orientation` (`portrait|landscape|square`)
- `defaults.fps` (number)
- `defaults.captionPreset` (`tiktok|youtube|reels|bold|minimal|neon`)
- `defaults.captionConfig` (partial, merged onto preset)
- `defaults.archetype` (`listicle|versus|howto|myth|story|hot-take`)
- `assets` (object)
- `params` (object; composition-specific)

### Asset slots (recommended)

`assets` is template-defined, but common slots should standardize early:

- `assets.gameplay.library`: gameplay directory (external, user-provided)
- `assets.gameplay.style`: subfolder name (`subway-surfers`, `minecraft-parkour`, ...)
- `assets.overlays[]`: local video/image overlays bundled with the template
- `assets.fonts[]`: fonts bundled with the template (optional)
- `assets.music`: background music selection (optional; licensing-sensitive)

## Template directory layout

```
<id>/
├── template.json
├── assets/
│   ├── overlays/
│   └── fonts/
├── previews/
└── README.md
```

Rules:

- Paths inside `template.json` are resolved relative to the directory containing `template.json`.
- The CLI should reject packs with absolute paths by default (security).

## CLI surface (proposed)

### Selection

- `cm generate ... --template <id|path>`
- `cm render ... --template <id|path>`

### Management

- `cm templates list`
- `cm templates show <id>`
- `cm templates validate <path>`
- `cm templates install <zip|dir>`

## Compatibility / migrations

- Templates must include `schemaVersion`.
- On breaking changes, the CLI should support `cm templates migrate` or apply a best-effort migration when loading.

## Related

- `docs/features/feature-video-templates-20260107.md`
- `docs/guides/guide-video-templates-20260107.md`
- `docs/architecture/IMPL-RENDER-STYLE-SYSTEM-V2-20260105.md`
