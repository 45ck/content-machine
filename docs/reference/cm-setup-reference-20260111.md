# cm-setup reference (20260111)

Download optional runtime dependencies (models, binaries, packs).

## Synopsis

```bash
cm setup <subcommand> [options]
```

## Subcommands

### `cm setup whisper`

Install whisper.cpp binaries and download a Whisper model for word-level timestamps.

```bash
cm setup whisper [options]
```

#### Options

- `--model <model>`: `tiny|base|small|medium|large` (default: `base`)
- `--dir <path>`: install directory for whisper assets (default: `./.cache/whisper`)
- `--version <version>`: whisper.cpp version (default: `1.5.5`)

#### Outputs

- Writes whisper assets into `--dir`
- Prints the `--dir` path to stdout (human mode)
- In `--json` mode, outputs `{ ok, dir, model, version }`

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments

## Examples

```bash
# Recommended default
cm setup whisper --model base

# Use a larger model (slower, better accuracy)
cm setup whisper --model medium

# Install to a custom directory
cm setup whisper --model base --dir ~/.cm/runtime/whisper
```

## Notes

- `cm generate --pipeline audio-first` requires Whisper; `cm setup whisper` is the recommended one-time setup.
- For CI, cache the whisper directory between runs to avoid repeated downloads.
