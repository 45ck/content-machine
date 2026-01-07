# cm-generate reference (20260106)

Generate a full short-form video from a topic (script -> audio -> visuals -> render).

## Synopsis

```bash
cm generate [options] <topic>
```

## Inputs

- `topic`: a short description of what the video is about

## Outputs

- Final MP4 at `--output` (default `video.mp4`)
- Intermediate artifacts may be created in the output directory (see Notes)

## Options

- `-a, --archetype <type>`: content archetype (default: `listicle`)
- `-o, --output <path>`: output MP4 path (default: `video.mp4`)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--voice <voice>`: TTS voice id (default: `af_heart`)
- `--duration <seconds>`: target duration seconds (default: `45`)
- `--research [path]`: enable research before script (see Research Integration below)
- `--keep-artifacts`: keep intermediate files (default: false)
- `--mock`: use mock providers (testing)
- `--dry-run`: preview configuration without execution

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure

## Research Integration

The `--research` option enables evidence-based script generation:

**Flag only (auto-run research):**

```bash
cm generate "Redis caching" --research
# Automatically runs: cm research -q "Redis caching" before script generation
```

**With file path (load existing):**

```bash
cm generate "Redis caching" --research research.json
# Loads research from file and injects into script prompt
```

When research is enabled:

1. Research evidence is formatted into a prompt context (max 2500 chars, top 10 items)
2. Context is prepended to the script generation prompt
3. Source URLs are tracked in the script metadata (`extra.research`)

## Examples

```bash
# Basic usage
cm generate "Redis vs PostgreSQL" --archetype versus --output out/video.mp4

# Dry run (preview without execution)
cm generate "5 JavaScript tips" --dry-run

# With mock providers (testing)
cm generate "Docker vs Kubernetes" --mock --keep-artifacts

# With auto-research (runs research before script)
cm generate "TypeScript best practices" --research --output out/video.mp4

# With existing research file
cm research -q "TypeScript best practices" -o research.json
cm generate "TypeScript best practices" --research research.json --output out/video.mp4
```

## Notes

- Intermediate artifacts are placed in `dirname(--output)` by default.
- `--keep-artifacts` keeps `script.json`, `audio.wav`, `timestamps.json`, and `visuals.json` alongside the final output.
- When `--research` is used with a path, the file must be valid `ResearchOutput` JSON from `cm research`.

## See also

- `docs/guides/guide-cli-ux-cm-generate-20260106.md`
- `docs/reference/cm-script-reference-20260106.md`
- `docs/reference/cm-research-reference-20260106.md`
- `docs/reference/cm-validate-reference-20260106.md`
- `docs/features/feature-research-script-integration-20260107.md`
