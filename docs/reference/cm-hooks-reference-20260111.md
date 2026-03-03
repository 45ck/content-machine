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

- `--hook <idOrPath>`: use a hook clip by id, local path, or URL (use `"none"` to explicitly disable)
- `--no-hook`: disable hook intro clip (equivalent to `--hook none`)
- `--download-hook`: download the hook clip if missing (library id mode)

### Default behavior

By default, **no hook is added** to generated videos. To enable a hook, pass
`--hook <id>` explicitly or set `default_hook` in your config file:

```toml
# .content-machine.toml
[hooks]
default_hook = "no-crunch"
```

To disable a hook when one is configured as the default:

```bash
cm generate "..." --no-hook
# or
cm generate "..." --hook none
```

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

# Use a hook by id (auto-download when opted in)
cm generate "..." --hook no-crunch --download-hook

# Generate without any hook
cm generate "..." --no-hook

# Disable hook when a default is configured
cm generate "..." --hook none
```
