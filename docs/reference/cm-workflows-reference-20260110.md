# cm-workflows reference (20260110)

Manage workflow presets for repeatable content formats and content pipelines.

## Synopsis

```bash
cm workflows <command> [options]
```

## Commands

- `list`: list available workflows
- `show <idOrPath>`: print a workflow definition
- `validate <path>`: validate a workflow file or directory
- `install <path>`: install a workflow pack (.zip or directory)

## Examples

```bash
# List workflows
cm workflows list

# Show a built-in workflow
cm workflows show brainrot-gameplay

# Show a workflow definition
cm workflows show acme-marketing

# Validate a workflow directory
cm workflows validate ./.cm/workflows/acme-marketing

# Install from a zip pack
cm workflows install workflow-pack.zip
```

## Built-in workflows

These ship with the repo under `assets/workflows/` and are available without installing anything. Think of them as reusable format defaults, not a separate subsystem:

- `brainrot-gameplay`: gameplay-heavy split-screen preset using `brainrot-split-gameplay-top`, `nanobanana,pexels`, and chunkier CapCut-style captions
- `gemini-meme-explainer`: Gemini-image-led meme explainer preset using `nanobanana,pexels`
- `absurdist-edutainment`: Gemini-image-led surreal education preset with bolder caption styling
- `clean-educational-control`: cleaner stock-first educational control preset using `pexels,nanobanana`

In practice, workflows are one of the main building blocks for a CM content format:

- `archetype`: script shape
- `template`: render/layout shape
- `workflow`: pipeline defaults and format setup

## Workflow definition

```json
{
  "schemaVersion": "1.0.0",
  "id": "acme-custom-assets",
  "name": "Acme Custom Assets",
  "description": "Use local footage and external audio",
  "defaults": {
    "template": "tiktok-captions",
    "caption-preset": "capcut"
  },
  "inputs": {
    "audio": "assets/audio/voiceover.wav",
    "timestamps": "assets/audio/timestamps.json",
    "visuals": "assets/visuals/visuals.json"
  },
  "stages": {
    "audio": { "mode": "external" },
    "visuals": { "mode": "import" }
  }
}
```

Stage modes:

- `builtin`: run the cm stage as normal.
- `external`: expect external artifacts (and optional exec hook).
- `import`: external artifacts, usually created via `cm import` or other asset tooling.

## Notes

- Workflow search order:
  1. explicit path passed to `--workflow`
  2. `./.cm/workflows/<id>/workflow.json`
  3. `~/.cm/workflows/<id>/workflow.json`
  4. built-in workflows shipped in `assets/workflows/`
- Use `cm generate --workflow <id|path> --workflow-allow-exec` to run workflow hooks.
- `defaults` keys accept CLI attribute names (camelCase) or flag names (kebab-case).
- External stages default to artifacts in the output directory (`script.json`, `audio.wav`, etc).
- `inputs` paths are resolved relative to the workflow.json location (or cwd if none).
- `stages.<stage>.exec` runs only when `--workflow-allow-exec` is set.
- `workflow-allow-exec` can only be set via CLI (workflow defaults cannot enable it).
- If `stages.<stage>.exec` is provided without a `mode`, it is treated as external.
- Use `--visuals-motion-strategy veo --media --media-veo-adapter google-veo` to upgrade the Gemini image-led workflows to Veo once Vertex auth is available.

## See also

- `docs/reference/cm-generate-reference-20260106.md`
