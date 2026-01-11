# Feature: On-Demand Assets (Minimal Install + Auto-Setup)

**Date:** 2026-01-11  
**Status:** Draft  
**Owners:** content-machine maintainers

---

## Overview

Content Machine should be small to install and only download heavyweight assets when a user actually needs them (Whisper models, hook clips, remote stock footage, template packs, etc.). When a download is needed, the CLI should:

- detect it early (preflight)
- explain why it’s needed (human-readable)
- provide a one-line fix (machine-usable)
- optionally download it automatically _when explicitly allowed_

This feature standardizes “on-demand assets” across commands without requiring users to “download the whole library”.

---

## Current State (Baseline in Repo)

Already implemented patterns:

- Remote stock footage: downloaded per-URL during render when `--download-assets` (default) is enabled; can be disabled via `--no-download-assets`.
- Whisper:
  - `cm setup whisper` installs whisper.cpp + downloads a model.
  - runtime auto-install is **opt-in** via `CM_WHISPER_AUTO_INSTALL=1` (default is off).
- Hooks:
  - `cm hooks download <id>` downloads a single hook clip by id.
  - `cm generate` / `cm render` support `--download-hook` to download a missing hook clip on demand.

Gaps / inconsistencies:

- No single global “offline / allow-download / prompt” policy.
- Cache directories differ by subsystem (project `.cache/*` vs `~/.cm/*`).
- `cm generate --preflight` doesn’t currently check for Whisper/hook availability (only inputs + API keys + workflow/template basics).

---

## User Value

- Faster onboarding: install doesn’t imply gigabytes of media/models.
- Lower disk usage: download only assets actually used.
- Better “it failed” UX: missing prereqs become actionable fixes.
- CI friendliness: preflight can enumerate missing dependencies deterministically.

---

## Goals

- Minimal default install footprint (npm package should not ship `vendor/`, docs, tests, large binaries).
- Targeted downloads:
  - Whisper: only the model requested.
  - Hooks: only the clip(s) referenced.
  - Remote visuals: only URLs referenced by `visuals.json`.
- Deterministic cache behavior:
  - stable paths
  - atomic writes
  - safe extraction (for packs)
- CLI contracts remain intact:
  - stdout/stderr separation
  - `--json` envelope purity
  - “Fix:” lines for recoverability

---

## Non-goals

- Shipping large media libraries inside the repo or npm package.
- Auto-downloading licensing-sensitive music/SFX by default.
- A background updater/daemon.

---

## UX / CLI

### Concepts

- **Install**: install the CLI (npm / clone).
- **Setup**: download optional runtime dependencies (Whisper, packs).
- **On-demand download**: fetch missing assets only when a command needs them, _if the user explicitly opted in_.
- **Preflight**: validate and report missing dependencies _before_ doing expensive work.

### Commands (existing + baseline)

- `cm setup whisper --model <tiny|base|small|medium|large>`
- `cm hooks list`
- `cm hooks download <hookId> [--library <id>] [--hooks-dir <path>] [--force]`
- `cm generate ... [--download-hook] [--download-assets|--no-download-assets]`
- `cm render ... [--download-hook] [--download-assets|--no-download-assets]`

### Proposed UX additions (next)

- `cm generate --preflight` and `cm render --preflight` should include checks for:
  - Whisper required by chosen pipeline mode (and whether it’s installed/configured)
  - hook clip presence when `--hook <id>` resolves to a library entry
  - FFmpeg/ffprobe requirements when relevant
- A consistent set of global “download policy” switches:
  - `--offline` (deny downloads; fail fast with fix)
  - `--yes` (non-interactive “accept downloads” when allowed)
  - `CM_AUTO_DOWNLOAD=1` (future) or config-based defaults (future)

### User Flows

#### Flow A: First run (audio-first pipeline)

1. User runs `cm generate ...` (default audio-first).
2. Whisper is missing.
3. CLI response:
   - human mode: explain Whisper is required and show `cm setup whisper --model base`
   - `--json` mode: include error with `context.fix`
4. User runs setup once, then retries generate.

Optional future enhancement:

- If the user explicitly enabled auto-download (config/env/flag), auto-run Whisper setup.

#### Flow B: Hook id requested

1. User runs `cm generate ... --hook no-crunch`.
2. Hook file missing locally.
3. Either:
   - fail with `Fix: cm hooks download no-crunch`, or
   - if `--download-hook`, download that single clip and continue.

#### Flow C: Remote visuals

1. `cm render` sees remote URLs in `visuals.json`.
2. With `--download-assets` (default), download only referenced URLs into the render bundle.
3. With `--no-download-assets`, stream URLs directly (best-effort).

---

## Data Contracts

This feature should not change artifact schemas (`script.json`, `timestamps.json`, `visuals.json`).

Where required, new command outputs should follow the existing JSON envelope contract:

- `command`: `setup:whisper`, `hooks:download`, etc.
- `outputs`: include installed paths and a boolean indicating whether a download occurred.

---

## Architecture

The repo currently implements on-demand downloads per subsystem. The recommended near-term path is:

1. Keep subsystem-owned downloaders (Whisper, hooks, remote assets).
2. Standardize:
   - “Fix:” guidance
   - cache path conventions (config/env)
   - preflight dependency checks

A centralized Asset Manager (registry + planner + installer) is a possible later evolution, but is not required to reach “download only what you need” for the current system.

---

## Testing

### Unit

- Hook resolver can download missing library clip when opted in (mock fetch).
- Whisper setup command validates model values and returns stable JSON output.

### Integration

- CLI help works for `cm setup --help` and `cm hooks --help` without loading unrelated commands.

### V&V

- Layer 4: run “missing Whisper” and “missing hook” drills in:
  - TTY mode
  - non-TTY mode
  - `--json` mode

---

## Rollout

- Defaults should remain conservative:
  - do not auto-download heavyweight assets without explicit opt-in (`CM_WHISPER_AUTO_INSTALL=1`, `--download-hook`)
- Expand `--preflight` to surface missing assets + fixes.
- Add global “offline” behavior after preflight coverage is complete.

---

## Related

- Guides:
  - `docs/guides/guide-cli-ux-standards-20260106.md`
  - `docs/guides/guide-cli-errors-and-fix-lines-20260107.md`
  - `docs/guides/guide-cli-json-envelope-20260107.md`
- Reference:
  - `docs/reference/cm-hooks-reference-20260111.md`
  - `docs/reference/cm-setup-reference-20260111.md`
  - `docs/reference/cm-render-reference-20260106.md`
  - `docs/reference/cm-generate-reference-20260106.md`
- Implementation:
  - `src/cli/commands/setup.ts`
  - `src/cli/commands/hooks.ts`
  - `src/audio/asr/index.ts`
  - `src/hooks/resolve.ts`
  - `src/render/assets/remote-assets.ts`
