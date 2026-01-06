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
- `--keep-artifacts`: keep intermediate files (default: false)
- `--mock`: use mock providers (testing)
- `--dry-run`: preview configuration without execution

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure

## Examples

```bash
cm generate "Redis vs PostgreSQL" --archetype versus --output out/video.mp4
cm generate "5 JavaScript tips" --dry-run
cm generate "Docker vs Kubernetes" --mock --keep-artifacts
```

## Notes

- Intermediate artifacts are placed in `dirname(--output)` by default.
- As of 2026-01-06, `--keep-artifacts` does not guarantee `script.json` and `visuals.json` are written during `generate`.

## See also

- `docs/guides/guide-cli-ux-cm-generate-20260106.md`
- `docs/reference/cm-script-reference-20260106.md`
- `docs/reference/cm-validate-reference-20260106.md`
