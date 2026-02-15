# `cm templates` Reference (20260210)

Manage video **render templates** (template packs).

A **render template** is a `template.json` file that selects a Remotion `compositionId` and provides render defaults.

A **code template** is a render template that also ships a Remotion project via `template.json -> remotion`. Code templates execute arbitrary JS/TS during bundling/rendering and require explicit opt-in (`--allow-template-code`).

## Commands

- `cm templates list [--source <builtin|user|project>]`
- `cm templates show <idOrPath>`
- `cm templates validate <path>`
- `cm templates new <id> [--root <dir>] [--from <idOrPath>] [--mode <data|code>] [--force]`
- `cm templates import <source> [options]`
- `cm templates pack <path> [-o, --output <path>]`
- `cm templates install <path> [--force]`

## `cm templates import`

Import a Remotion project/template into a CM **code template** directory under `~/.cm/templates/<id>/`.

Importing does not execute the imported code. Rendering later will require `--allow-template-code`.

### Sources

`<source>` can be:

- local directory
- GitHub repo: `owner/repo` or `github:owner/repo` or `https://github.com/owner/repo[/tree/<ref>/<subdir>]`
- Remotion gallery page: `https://www.remotion.dev/templates/<slug>` (CM will resolve the GitHub source link)
- direct `.zip` URL

### Options

- `--root <dir>`: destination templates root (default: `~/.cm/templates`)
- `--id <id>`: template id (kebab-case). If omitted, derived from the source
- `--name <name>`: template display name override
- `--description <text>`: template description override
- `--composition <ShortVideo|SplitScreenGameplay>`: base CM composition for the generated wrapper (default: `ShortVideo`)
- `--ref <ref>`: Git ref (branch/tag) for GitHub sources
- `--subdir <path>`: import only a subdirectory inside the repo/zip (relative)
- `--template-deps <auto|prompt|never>`: default dependency install preference written into `template.json` (default: `prompt`)
- `--template-pm <npm|pnpm|yarn>`: default package manager preference written into `template.json`
- `--force`: overwrite the destination template directory if it exists

### Output

In human mode, `cm templates import` prints:

- imported template id
- install location
- resolved source (when known)
- a next-step hint

In `--json` mode, it emits a single JSON envelope with `command: "templates:import"`.

### Layout Created

`cm templates import` produces a directory like:

```
~/.cm/templates/<id>/
  template.json
  package.json
  public/
    README.txt
  remotion/
    index.ts
    root.tsx
    Main.tsx
    README.txt
  imported/
    ...upstream Remotion project (filtered: no node_modules/.git)
```

Edit `remotion/Main.tsx` to customize, and pull animations/components from `imported/` as needed.

## Examples

```bash
# Import from Remotion's template gallery (auto-resolves GitHub source)
cm templates import https://www.remotion.dev/templates/tiktok --id remotion-tiktok

# Import from GitHub shorthand
cm templates import remotion-dev/template-tiktok --id remotion-tiktok

# Import from a GitHub URL with a specific ref/subdir
cm templates import https://github.com/acme/video-templates/tree/v2/templates/tiktok --id acme-tiktok

# Render (code templates require explicit opt-in)
cm render -i visuals.json --audio audio.wav --timestamps timestamps.json \
  --template remotion-tiktok --allow-template-code -o out/video.mp4
```

## See Also

- `docs/dev/guides/guide-remotion-template-import-20260210.md`
- `docs/dev/guides/guide-video-templates-20260107.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/reference/cm-render-reference-20260106.md`
