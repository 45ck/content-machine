# Narrative: CLI UX Overhaul - Setup, Templates, Packaging, Publish (20260110)

**Status:** Draft  
**Date:** 2026-01-10  
**Owners:** Unassigned  

This document proposes concrete, non-interactive UX upgrades for the "ops" commands:

- `cm init`
- `cm templates` (list/show/validate/install)
- `cm package`
- `cm publish`

These commands improve onboarding, creative iteration, and the "ship it" workflow around the pipeline.

## Method: Nielsen heuristics adapted for CLIs

See the heuristic rubric in `docs/specs/cli-ux-command-overhaul-pipeline-20260110.md`.

**Scale:** 1 (poor) to 5 (excellent).

## Vendored references used (patterns to copy)

From `vendor/cli/examples/*`:

- `vendor/cli/examples/firebase-tools`: onboarding + diagnostics patterns and large-surface consistency.
- `vendor/cli/examples/vercel`: guided-feeling flows without requiring a TUI; strong "next steps".
- `vendor/cli/examples/pnpm`: minimal, disciplined output.
- `vendor/cli/examples/prisma`: clear checklists and structured receipts.

From `vendor/cli/output/*`:

- `vendor/cli/output/boxen`: prominent "cards" for warnings and next steps (use sparingly).

## Shared tactical principles (apply to all in this doc)

1. Onboarding output must be OS-aware (PowerShell + bash).
2. Avoid silent overwrites; default behavior should be safe and explicit.
3. Every command ends with a compact receipt and a `Next:` hint.
4. Keep stdout strictly reserved for a single path (human) or one JSON envelope (`--json`).

## `cm init`

**JTBD:** "Create a valid config quickly and tell me what secrets/settings I still need."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 3, H5 2, H6 4, H7 3, H8 4, H9 3, H10 3

**Top gaps**
- Config write correctness (TOML nesting limitations) is a trust risk.
- Env var guidance should be OS-aware and copy/paste ready.
- Overwrite behavior needs a safe story.

**10 improvement ideas**
1. **Round-trip validation (H5,H9):** After writing `.content-machine.toml`, immediately parse it with the config loader and fail if it cannot be read. Print `Fix:` if parsing fails. (Error prevention.)
2. **Safe overwrite flow (H3,H5):** If config exists, default to no overwrite; add `--force` or `--backup` and print what happened. (User control.)
3. **OS-aware secret setup (H2,H6,H10):** Always print both PowerShell and bash examples (session and persistent) plus recommend `.env`. (Match to user environment.)
4. **`--json` envelope (H4):** Implement `--json` for init with `{configPath, wrote, backupPath}` while keeping stdout clean.
5. **Detect common misconfig (H5,H9):** If user picks an LLM provider but the env var is missing, print `Fix: set OPENAI_API_KEY=...` and point to `.env.example`.
6. **Show effective defaults (H6):** Print a short "Defaults:" block (archetype/orientation/voice/model) so users know what's active.
7. **Non-interactive mode improvements (H7):** Extend `--yes` to allow `--provider`, `--model`, etc. (fully scriptable init).
8. **Config location clarity (H1):** Print absolute path for where config was written in TTY mode; stdout remains the path.
9. **Add `cm doctor` hook (H9,H10):** After init success, print `Next: cm doctor` suggestion to validate install before first generate.
10. **Minimal output mode (H8):** Add `--quiet` for init so CI can create config with near-zero stderr output; still prints stdout path.

## `cm templates`

**JTBD:** "Discover templates, inspect them, validate them, and install packs safely."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 4, H5 3, H6 3, H7 3, H8 4, H9 3, H10 2

**Top gaps**
- Help/examples can be richer (how to use templates with `cm generate`).
- List output should be more scannable (columns, filters, counts).
- Install behavior should clearly address overwrites and destination paths.

**10 improvement ideas**
1. **Scannable list format (H8,H6):** Print columns (id, source, name, short desc) and show a total count. (pnpm-style disciplined output.)
2. **Better filtering (H7):** Add filters: `--source`, `--id`, `--search <text>`. (Efficiency.)
3. **Explain "source" (H2,H10):** In `templates list`, add one line explaining builtin/user/project and the user templates dir path.
4. **`templates show` summary first (H8):** Print a compact summary (id, name, fps, dimensions) then raw JSON only with `--raw`.
5. **Install receipts (H1,H6):** After install, print where it went and the next command: `cm generate ... --template <id>`.
6. **Install conflict UX (H3,H5):** If template exists and no `--force`, fail with `Fix: re-run with --force` or `Fix: uninstall old template` (future).
7. **Template pack validation (H5):** Before installing, validate the pack structure and fail fast with clear errors.
8. **`templates doctor` (H9,H10):** Add a subcommand that validates all templates and prints a pass/fail list (useful after installing packs).
9. **Project template discovery (H6):** If `cm` sees a `templates/` folder in the repo, `templates list` should mention it explicitly in a header line.
10. **JSON envelope stability (H4):** Ensure `templates:* --json` always returns a stable envelope with consistent keys and schemaVersion.

## `cm package`

**JTBD:** "Generate multiple packaging variants (title/hook/cover) and pick one to apply to scripts."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 4, H5 3, H6 4, H7 3, H8 4, H9 3, H10 3

**Top gaps**
- Selection is opaque (cannot choose which variant becomes selected).
- Human output should make the selected variant immediately visible.
- Support iteration workflows (compare packaging variants across runs).

**10 improvement ideas**
1. **Explicit selection control (H3,H7):** Add `--select <index|strategy>` and print what was selected and why.
2. **Variant preview in stderr (H6,H8):** Print the selected variant fields (title/hook/cover) in human mode; keep it short.
3. **`--variants` UX (H10):** In help, explain recommended variant counts and performance implications.
4. **`--platform` discoverability (H6,H10):** Provide `--list-platforms` or list valid values in help and error messages.
5. **Compare mode (H7):** Add `cm package diff a.json b.json` to show how selected changed (helps creators iterate).
6. **Stable JSON outputs (H4):** Ensure root `--json` envelope includes `selectedIndex`, `platform`, and variant count.
7. **Fix lines for missing deps (H9):** If LLM provider missing key, print OS-aware fix snippet and suggest `cm init`.
8. **`--dry-run` precision (H5):** Print the prompt plan and output path, and guarantee no network calls.
9. **Receipt with next step (H6):** Always print the exact follow-up command: `cm script --topic ... --package <path>`.
10. **Consistency with `cm script` (H4):** Make packaging output summary format match script summary (same headings, same path formatting).

## `cm publish`

**JTBD:** "Create upload metadata (title/hashtags/description/checklist) for a platform, deterministic by default, LLM-enhanced optionally."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 4, H5 3, H6 3, H7 3, H8 4, H9 3, H10 2

**Top gaps**
- Help/docs are thin for non-obvious modes (`--llm`, platform differences).
- Output could be more checklist-oriented and directly actionable.
- Platform-specific guidance (TikTok vs Shorts) should be clearer.

**10 improvement ideas**
1. **Mode clarity (H2,H10):** In help and receipt, explicitly print `Mode: deterministic|llm` and what changes (fields derived vs generated).
2. **Platform validation UX (H5,H9):** If platform invalid, list allowed values and provide examples.
3. **Checklist-first output (H6):** Print the checklist items in human mode (top 5), not just counts. (Prisma-style checklists.)
4. **Hashtag formatting (H8):** Print hashtags wrapped and capped; provide `--max-hashtags` and default to platform-appropriate max.
5. **Copy/paste blocks (H6,H7):** Add `--copy` output mode (or `--print`) that prints description/hashtags in a block for easy pasting (stderr).
6. **`--json` envelope stability (H4):** Ensure envelope includes title, hashtag count, checklist count, and platform.
7. **Fix guidance for missing keys (H9):** If `--llm` is set but API key missing, print `Fix: set OPENAI_API_KEY...` and suggest running `cm init`.
8. **Artifact linking (H1):** Include references to which input script/package were used (paths) in receipt.
9. **Quality chaining suggestion (H6):** On publish success, print `Next: cm validate <video>` or `Next: cm rate <video>` depending on workflow stage.
10. **Deterministic defaults (H5,H3):** Keep deterministic mode as default and document the implications for reproducibility and CI.

## Related docs

- `docs/specs/cli-ux-overhaul-noninteractive-20260110.md`
- `docs/guides/guide-cli-ux-standards-20260106.md`
- Existing per-command UX reviews:
  - `docs/guides/guide-cli-ux-cm-init-20260106.md`
  - `docs/guides/guide-cli-ux-cm-package-20260106.md`

