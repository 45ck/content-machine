# cm-generate reference (20260106)

Generate a full short-form video from a topic (script → audio → visuals → render).

## Synopsis

```bash
cm generate [options] <topic>
```

## Options

- `-a, --archetype <type>`: `listicle|versus|howto|myth|story|hot-take` (default: `listicle`)
- `-o, --output <path>`: output video path (default: `video.mp4`)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--voice <voice>`: TTS voice id (default: `af_heart`)
- `--duration <seconds>`: target duration (default: `45`)
- `--keep-artifacts`: keep intermediate files (see Notes)
- `--mock`: run with mock providers (testing)
- `--dry-run`: print configuration without executing

## Output

- Video file at `--output`

## Examples

```bash
cm generate "Redis vs PostgreSQL" --archetype versus --output out/video.mp4
cm generate "5 JS tips" --dry-run
cm generate "Docker vs Kubernetes" --mock --keep-artifacts
```

## Notes

- Root options `--verbose` and `--json` exist, but are not yet consistently applied to this command’s output.
- `--keep-artifacts` currently does not guarantee `script.json`/`visuals.json` are written during `generate` (implementation detail as of 2026-01-06).
