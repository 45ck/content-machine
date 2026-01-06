# guide-cli-ux-cm-init-20260106

UX review for `cm init` (interactive setup). References `docs/guides/guide-cli-ux-standards-20260106.md`.

## Current UX (observed)

- Interactive prompts via `inquirer` (provider, model, archetype, orientation, voice).
- Writes `.content-machine.toml` into the current working directory.
- Prints reminders for API keys and a “Ready!” hint.

## UX gaps / risks

- Generated TOML is “simplified”; it drops nested keys/objects not handled by `generateToml()` (objects beyond one level).
- The printed env var hints are shell-specific (`export …`) and not Windows-friendly.
- No `--json` output mode for tooling/automation.

## Improvements (proposed)

- Use a real TOML writer or implement nested section emission (e.g., `[llm]`, `[audio]` already).
- Print OS-aware environment variable instructions (PowerShell + bash) and recommend `.env`.
- Add `--json` with `{configPath}` and optionally `--print` to stdout for CI templates.
- Validate “already exists” case with a prompt to overwrite/backup.
