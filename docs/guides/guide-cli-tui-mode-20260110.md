# guide-cli-tui-mode-20260110

Use the interactive TUI mode to run the content-machine pipeline like an app, while keeping headless CLI commands for automation.

## When to use this

- You want the fastest "guided" way to generate a video locally.
- You don't remember flags or want to explore templates/presets interactively.
- You want to preview artifacts (script/timestamps/visuals) without opening JSON files manually.

## Prerequisites

- A TTY terminal (Windows Terminal / iTerm / etc.)
- Node.js `>=20`
- Project dependencies installed (`npm install`)
- Optional: API keys configured in `.env` if using online providers

## Steps

1. Launch the TUI:

   ```bash
   cm
   ```

2. Choose `Generate video` and fill in the wizard:
   - Topic
   - Archetype
   - Template (optional)
   - Preset (fast/standard/quality/maximum)
   - Output path

3. Watch the pipeline run screen:
   - Stage progress (script/audio/visuals/render)
   - Cost/time summary
   - Live logs

4. On completion, use the Summary/Artifacts views to:
   - Open artifact files (script/timestamps/visuals)
   - Re-run a stage (retry)
   - Run `validate` / `score` / `rate` tooling

## Examples

### Explicit TUI entrypoint

```bash
cm ui
```

### Disable TUI for scripting

```bash
cm --no-tui --help
```

### Never launch TUI

```bash
cm --no-tui
```

### Keep automation unchanged

```bash
cm generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4
```

## Troubleshooting

- **Symptom:** `cm` launches help instead of the TUI
  - **Fix:** Ensure you're in a TTY and avoid `--json`.
- **Symptom:** Output looks garbled / flickers
  - **Fix:** Use a modern terminal, disable terminal "bracketed paste" issues, and avoid running inside non-interactive shells.
- **Symptom:** CI scripts hang after `cm`
  - **Fix:** Use `cm --no-tui ...` or call a specific subcommand (`cm generate`, etc.).

## Related

- `docs/features/feature-cli-tui-mode-20260110.md`
- `docs/architecture/ADR-004-DEFAULT-TUI-MODE-20260110.md`
- `docs/guides/guide-cli-stdout-stderr-contract-20260107.md`
- `docs/guides/guide-cli-json-envelope-20260107.md`
