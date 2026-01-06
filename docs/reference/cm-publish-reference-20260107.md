# cm-publish reference (20260107)

Generate publish metadata and an upload checklist from `script.json` and write `publish.json`.

## Synopsis

```bash
cm publish [options]
```

## Outputs

- Publish JSON written to `--output` (default `publish.json`)

## Options

- `-i, --input <path>`: input `script.json` path (required)
- `--platform <platform>`: `tiktok|reels|shorts` (default: `tiktok`)
- `--package <path>`: optional `packaging.json` path (adds `coverText`)
- `-o, --output <path>`: output `publish.json` path (default: `publish.json`)
- `--llm`: generate description/hashtags/checklist via LLM (requires API key) (default: false)
- `--mock`: mock LLM output (for tests/dev) (default: false)
- `--json`: print the full `publish.json` to stdout (default: false)

## Examples

```bash
cm publish --input out/script.json --output out/publish.json
cm publish --input out/script.json --package out/packaging.json --output out/publish.json
cm publish --input out/script.json --llm --output out/publish.json
cm publish --input out/script.json --mock --json
```
