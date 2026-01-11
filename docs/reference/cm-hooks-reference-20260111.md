# cm-hooks reference (20260111)

Manage hook libraries (short intro clips that can be prepended to a video).

## Synopsis

```bash
cm hooks <subcommand> [options]
```

## Subcommands

### `cm hooks list`

List known hook ids for a library.

```bash
cm hooks list [--library <id>]
```

#### Options

- `--library <id>`: hook library id (default: from config)

### `cm hooks download`

Download a single hook clip by id into the local hooks directory.

```bash
cm hooks download <hookId> [options]
```

#### Options

- `--library <id>`: hook library id (default: from config)
- `--hooks-dir <path>`: hooks root directory (default: from config; typically `~/.cm/assets/hooks`)
- `--force`: re-download even if cached
- `--offline`: disable downloads (fails fast)

#### Outputs

- Downloads to `<hooks-dir>/<library>/<filename>`
- Prints the downloaded file path to stdout (human mode)
- In `--json` mode, outputs `{ downloaded, path }`

## Related generate/render flags

- `--hook <idOrPath>`: use a hook clip by id, local path, or URL
- `--download-hook`: download the hook clip if missing (library id mode)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout
- `--offline`: disable on-demand downloads
- `-y, --yes`: allow safe auto-downloads where supported

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments

## Examples

```bash
# List available hook ids
cm hooks list

# Download a single clip
cm hooks download no-crunch

# Use the hook by id (auto-download when opted in)
cm generate "..." --hook no-crunch --download-hook
```
