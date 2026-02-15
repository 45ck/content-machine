# guide-cli-ux-cm-init-20260106

UX review for `cm init` (interactive setup). This command is the onboarding funnel. If it is confusing, users churn before they ever generate a video.

References: `docs/dev/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator (primary): wants a guided setup with defaults that "just work".
- Engineer-operator: wants non-interactive setup for CI or reproducible environments.

## Job to be done

"Create a valid config file quickly and tell me exactly what secrets I still need to set."

## Current behavior (as implemented today)

- Interactive prompts via `inquirer` (provider, model, archetype, orientation, voice).
- `--yes` writes defaults without prompting.
- Writes `.content-machine.toml` into the current working directory.
- Prints API key reminders and a final "Ready" hint.

## UX gaps (what will trip up first-time users)

- TOML writer limitations: the current TOML generation is simplified and can drop nested objects beyond one level (risk: config silently incomplete).
- Environment variable guidance is not OS-aware (PowerShell users get "export ..." examples that do not work).
- No automation output: there is no `--json` output (useful for CI and tooling).
- No explicit overwrite behavior: if the config file already exists, users need a safe "backup/overwrite" flow.

## Recommendations

### P0

- Make config writing correct and complete (use a real TOML writer or implement nested sections safely).
- Print both PowerShell and bash examples, and always recommend `.env` for local dev:
  - PowerShell (session): `$env:OPENAI_API_KEY="..."`
  - PowerShell (persist): `setx OPENAI_API_KEY "..."`
  - bash: `export OPENAI_API_KEY="..."`
- If `.content-machine.toml` exists, prompt: overwrite, keep, or write to a new path.

### P1

- Add `--json` output with `{configPath}` and optionally `--print` to stdout for templating.
- Add a quick validation step after writing (parse it and report the resolved defaults).

## Ideal onboarding success output (ASCII sketch)

```
Wrote config: D:\\path\\to\\.content-machine.toml
Next:
  1) Create .env with OPENAI_API_KEY and (optional) PEXELS_API_KEY
  2) Run: cm generate "Your topic"
```

## UX acceptance criteria

- Produces a complete, valid `.content-machine.toml` (round-trips through the config loader).
- If the config file exists, does not overwrite silently; offers a safe choice (overwrite/keep/new path).
- Prints OS-appropriate env var instructions (PowerShell + bash) and recommends `.env`.
