# cm-assets reference (20260111)

Manage on-demand assets (models/binaries) and show resolved cache paths.

## Synopsis

```bash
cm assets <subcommand> [options]
```

## Subcommands

### `cm assets paths`

Print resolved asset/cache directories.

```bash
cm assets paths [--json]
```

#### Outputs

- `whisperDir`: resolved Whisper directory (respects `CM_WHISPER_DIR`)
- `hooksDir`: resolved hooks directory (from config)
- `assetCacheDir`: resolved remote-asset cache directory (respects `CM_ASSET_CACHE_DIR`)

### `cm assets whisper status`

Check whether Whisper binaries + a model are installed.

```bash
cm assets whisper status [--model base] [--dir <path>] [--version 1.5.5] [--json]
```

Exit codes:

- `0`: Whisper is installed
- `1`: Whisper is missing (dependency missing)
- `2`: invalid arguments

### `cm assets whisper install`

Install whisper.cpp binaries and download a model.

```bash
cm assets whisper install [--model base] [--dir <path>] [--version 1.5.5]
```

Notes:

- Respects `--offline` / `CM_OFFLINE=1` (fails fast without downloading).
- Equivalent in effect to `cm setup whisper`, but grouped under `cm assets`.

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout
- `--offline`: disable on-demand downloads
- `-y, --yes`: allow safe auto-downloads where supported
