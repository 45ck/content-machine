# Template Pack

**Purpose:** A **template pack** is a distributable bundle (directory or `.zip`) that installs into the user templates directory as `~/.cm/templates/<id>/...`.

**Canonical terms:**

- **Template pack** (preferred)
- Avoid: "plugin" (reserved for code templates / trusted mode)

**Data shape:**

- Must contain exactly one `template.json` at the root of the pack (or in a single top-level folder).
- May contain additional files referenced by `template.json` (assets, previews, docs).

**Where it lives:**

- Installed to: `~/.cm/templates/<id>/`
- Packed from any template directory: `<dir>/template.json`

**Code references:**

- Install: `src/render/templates/installer.ts` (`installTemplatePack`)
- Pack: `src/render/templates/dev.ts` (`packVideoTemplate`)
- CLI commands: `src/cli/commands/templates.ts` (`cm templates pack|install`)

**Related:**

- `docs/reference/video-templates-reference-20260107.md`
