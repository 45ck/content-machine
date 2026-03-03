# cm-visuals reference (20260106)

Match visuals (e.g., stock footage) to scenes using the timestamps output.

## Synopsis

```bash
cm visuals [options]
```

## Inputs

- `--input`: timestamps JSON from `cm audio`

## Outputs

- Visuals JSON written to `--output` (default `visuals.json`)

## Options

- `-i, --input <path>`: input timestamps JSON file (required)
- `-o, --output <path>`: output visuals file path (default: `visuals.json`)
- `--provider <provider>`: visuals provider id or provider chain (comma-separated). Examples: `pexels` | `nanobanana` | `pexels,local,nanobanana`
- `--asset-provider <provider>`: alias for `--provider` (preferred name in ADRs)
- `--fallback-providers <providers>`: comma-separated fallback providers appended after `--provider` (only when `--provider` is a single value)
- `--motion-strategy <strategy>`: motion strategy for image providers (`none|kenburns|depthflow|veo`)
- `--routing-policy <policy>`: provider routing policy (`configured|balanced|cost-first|quality-first`)
- `--max-generation-cost-usd <amount>`: hard cap for AI image generation spend during visuals stage (USD)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--local-dir <path>`: directory for `--provider local/localimage` (bring your own assets)
- `--local-manifest <path>`: optional JSON mapping `sceneId -> assetPath` (deterministic BYO visuals)
- `--gameplay <path>`: gameplay library directory or clip file path
- `--gameplay-style <name>`: gameplay subfolder name (e.g., `subway-surfers`)
- `--gameplay-strict`: fail if gameplay clip is missing
- `--mock`: use mock visuals (no API calls)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm visuals -i out/timestamps.json -o out/visuals.json --provider pexels
```

```bash
# AI images only
cm visuals -i out/timestamps.json -o out/visuals.json --provider nanobanana --motion-strategy kenburns
```

```bash
# Hybrid provider chain (try stock first, then local assets, then AI images)
cm visuals -i out/timestamps.json -o out/visuals.json --provider pexels,local,nanobanana
```

## See also

- `docs/dev/guides/guide-cli-ux-cm-visuals-20260106.md`
- `docs/reference/cm-media-reference-20260217.md`
- `docs/reference/cm-render-reference-20260106.md`
