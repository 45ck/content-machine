# CLI Compatibility Reference

The `cm` CLI remains available as a compatibility and migration surface.
It is no longer the primary repo interface.

If you are working from Claude Code, Codex CLI, or another coding
harness, start with [Harness Quickstart](HARNESS-QUICKSTART.md).

Discover commands and options:

```bash
cm --help
cm <command> --help
```

Global flags:

- `--json` for schema-versioned machine output
- `--verbose` for debug logging
- `--offline` to disable on-demand downloads
- `--yes` to allow safe auto-downloads where supported

Pipeline commands:

- `cm generate`
- `cm script`
- `cm audio`
- `cm visuals`
- `cm media`
- `cm render`

Utilities:

- `cm demo`
- `cm doctor`
- `cm setup`
- `cm research`
- `cm init`

Command references (dated, compatibility path):

- [`docs/reference/cm-generate-reference-20260106.md`](../reference/cm-generate-reference-20260106.md)
- [`docs/reference/cm-script-reference-20260106.md`](../reference/cm-script-reference-20260106.md)
- [`docs/reference/cm-audio-reference-20260106.md`](../reference/cm-audio-reference-20260106.md)
- [`docs/reference/cm-visuals-reference-20260106.md`](../reference/cm-visuals-reference-20260106.md)
- [`docs/reference/cm-media-reference-20260217.md`](../reference/cm-media-reference-20260217.md)
- [`docs/reference/cm-render-reference-20260106.md`](../reference/cm-render-reference-20260106.md)

Canonical CLI output/error rules (generated): [`docs/reference/CLI-CONTRACT.md`](../reference/CLI-CONTRACT.md)
