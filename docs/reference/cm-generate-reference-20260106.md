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
- `--template <idOrPath>`: video template id or path to `template.json`
- `--workflow <idOrPath>`: workflow id or path to `workflow.json`
- `--workflow-allow-exec`: allow workflow exec hooks to run
- `--script <path>`: use existing `script.json` (skip script generation)
- `--audio <path>`: use existing audio file (requires `--timestamps`)
- `--audio-mix <path>`: use existing audio mix plan (optional)
- `--timestamps <path>`: use existing `timestamps.json`
- `--visuals <path>`: use existing `visuals.json` (skip visuals matching)
- `-o, --output <path>`: output MP4 path (default: `video.mp4`)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--voice <voice>`: TTS voice id (default: `af_heart`)
- `--music <pathOrPreset>`: background music track or preset name
- `--no-music`: disable background music
- `--music-volume <db>`: music volume in dB
- `--music-duck <db>`: duck music under voice in dB
- `--music-loop` / `--no-music-loop`: toggle music looping
- `--music-fade-in <ms>` / `--music-fade-out <ms>`: music fades
- `--sfx <path>`: SFX file path (repeatable)
- `--sfx-pack <name>`: SFX pack name
- `--sfx-at <placement>`: auto placement (hook, scene, list-item, cta)
- `--sfx-volume <db>`: SFX volume in dB
- `--sfx-min-gap <ms>`: minimum gap between SFX
- `--sfx-duration <seconds>`: default SFX duration
- `--no-sfx`: disable SFX
- `--ambience <pathOrPreset>`: ambience bed track or preset name
- `--no-ambience`: disable ambience
- `--ambience-volume <db>`: ambience volume in dB
- `--ambience-loop` / `--no-ambience-loop`: toggle ambience looping
- `--ambience-fade-in <ms>` / `--ambience-fade-out <ms>`: ambience fades
- `--mix-preset <preset>`: mix preset (clean, punchy, cinematic, viral)
- `--lufs-target <db>`: target loudness for final mix
- `--duration <seconds>`: target duration seconds (default: `45`)
- `--pipeline <mode>`: pipeline mode: `audio-first` (default, requires Whisper) or `standard`
- `--whisper-model <model>`: whisper model size: `tiny|base|small|medium` (default: `base`)
- `--hook <idOrPath>`: hook intro clip id, local path, or URL
- `--hook-library <id>`: hook library id (defaults to config)
- `--hooks-dir <path>`: root directory for hook libraries (defaults to config)
- `--download-hook`: download hook clip from the selected library if missing (default: false)
- `--download-assets` / `--no-download-assets`: download remote visuals into the render bundle (default: download)
- `--research [path]`: enable research before script (see Research Integration below)
- `--keep-artifacts`: keep intermediate files (default: false)
- `--mock`: use mock providers (testing)
- `--dry-run`: preview configuration without execution
- `--preflight`: validate dependencies and exit without execution

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

# With audio mix options
cm generate "Redis vs PostgreSQL" --music lofi-01 --sfx-pack pops --mix-preset viral

# With auto-research (runs research before script)
cm generate "TypeScript best practices" --research --output out/video.mp4

# With existing research file
cm research -q "TypeScript best practices" -o research.json
cm generate "TypeScript best practices" --research research.json --output out/video.mp4

# Use external script/audio/timestamps/visuals
cm generate "Launch teaser" \
  --script assets/script.json \
  --audio assets/voiceover.wav \
  --timestamps assets/timestamps.json \
  --visuals assets/visuals.json \
  --output out/video.mp4

# Use a workflow definition
cm generate "Product recap" --workflow acme-marketing --workflow-allow-exec --output out/video.mp4
```

## Notes

- Intermediate artifacts are placed in `dirname(--output)` by default.
- `--keep-artifacts` keeps `script.json`, `audio.wav`, `timestamps.json`, `visuals.json`, and `audio.mix.json` (when present) alongside the final output.
- When `--research` is used with a path, the file must be valid `ResearchOutput` JSON from `cm research`.
- External inputs skip their corresponding stages; `--audio` requires `--timestamps`.
- Workflow external stages default to artifacts in the output directory (unless `workflow.inputs` override them).
- External render stages are not supported in `cm generate` yet (use `cm render`).

## See also

- `docs/guides/guide-cli-ux-cm-generate-20260106.md`
- `docs/guides/guide-audio-options-20260110.md`
- `docs/reference/cm-script-reference-20260106.md`
- `docs/reference/cm-timestamps-reference-20260110.md`
- `docs/reference/cm-import-reference-20260110.md`
- `docs/reference/cm-workflows-reference-20260110.md`
- `docs/reference/cm-research-reference-20260106.md`
- `docs/reference/cm-validate-reference-20260106.md`
- `docs/features/feature-research-script-integration-20260107.md`
