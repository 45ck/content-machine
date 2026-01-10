# Narrative: Non-Interactive UX Overhaul for `cm` CLI (20260110)

**Status:** Draft  
**Date:** 2026-01-10  
**Owners:** Unassigned  

## 1) What you mean (restated)

You are not asking for a full-screen interactive TUI right now.

You want the existing `cm` commands (`cm generate`, `cm script`, `cm audio`, etc.) to feel "insane" purely through better CLI UX:

- clearer, more disciplined output (better formatting, better summaries, better progress)
- more actionable errors ("what failed" + "how to fix")
- better discoverability (help/examples/presets)
- better trust during long runs (honest progress, artifact paths, next steps)
- without requiring keyboard navigation, panels, or an app-like TUI.

In other words: keep it non-interactive, but make it feel like a best-in-class modern CLI (Wrangler/Vercel/Prisma/pnpm tier).

## 2) Context

`content-machine` is a CLI-first pipeline:

```
topic -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4
```

The repo already has strong foundations for high-quality CLI UX:

- A stdout/stderr discipline and JSON envelope (`src/cli/output.ts`)
- A structured progress event model (`src/core/events/*`)
- Per-command UX standards docs (`docs/guides/guide-cli-ux-standards-20260106.md`)

The gap is not capability - it's presentation consistency and "product-grade" ergonomics.

## 3) Customer problem

Users experience long-running CLI operations as risky if they cannot answer these questions at all times:

1. What is happening right now?
2. Is it making progress?
3. Where are my files?
4. If it fails, what do I do next?

Today, different commands answer these differently, and some outputs are either too sparse or too noisy depending on TTY/verbose mode.

## 4) Goals (what "insane UX" means without a TUI)

1. **Trustworthy progress**: always show stage/phase/percent where possible, and never fake ETAs.
2. **Artifact clarity**: always show (a) artifacts directory and (b) the paths of produced outputs on success.
3. **Actionable failures**: errors must include a short fix line and relevant context.
4. **Scriptability preserved**: `--json` remains one object to stdout with no extra bytes.
5. **Consistency**: the same patterns across commands, not custom one-offs.
6. **ASCII-first**: default output must not break in PowerShell/Windows terminals.

## 5) Non-goals

- No interactive wizard, no panel navigation, no keybindings.
- No changes to artifact schemas in phase 1.
- No new network dependencies beyond what commands already do.

## 6) Users / personas

From `docs/guides/guide-cli-ux-standards-20260106.md`:

- Creator-operator: wants a video fast, minimal setup.
- Engineer-operator: wants stable automation and deterministic stdout.
- Contributor/debugger: wants `--mock`, `--dry-run`, `--verbose`, reproducibility.

This proposal primarily improves Creator + Engineer experience without adding complexity.

## 7) Proposed solution: "UX Pack" + standardized renderers

Add a small internal "UX pack" layer that every command uses for:

- headers + run context
- progress rendering
- artifact/output summaries
- errors with fix lines

This is not a new UI. It's consistent formatting and behavior.

### 7.1 Output contract (strict)

Reaffirm the existing contract:

- **stdout**: one line path (human mode) OR one JSON envelope (`--json`).
- **stderr**: progress, logs, warnings, and human summaries.

Reference: `docs/guides/guide-cli-stdout-stderr-contract-20260107.md`.

### 7.2 Progress contract (event-first)

Use structured events everywhere:

- stage start/complete/fail
- phase + percent where available
- coarse updates in non-TTY (avoid log spam)

Reference: `docs/features/feature-cli-progress-events-20260106.md`.

### 7.3 Success summary contract (the "receipt")

Every command prints a final "receipt" to stderr with:

- outputs (paths)
- timings (total + per-stage if relevant)
- costs/tokens if available
- next recommended command(s)

Example pattern (ASCII-safe):

```
[+] generate completed in 41.2s
    Artifacts: out/
    Script:    out/script.json
    Audio:     out/audio.wav
    Captions:  out/timestamps.json
    Visuals:   out/visuals.json
    Video:     out/video.mp4
    Next: cm validate out/video.mp4
```

This is the single biggest UX win for confidence.

### 7.4 Error contract (best-in-class)

Errors must include:

- stable code (use `CMError` taxonomy)
- short message
- "Fix:" line (exact action)
- relevant context (paths/env vars/provider)
- exit code mapping (usage=2, runtime=1, canceled=130)

Pattern inspired by Wrangler/Vercel/Firebase, and consistent with `docs/guides/guide-cli-ux-standards-20260106.md:108`.

## 8) Research summary: patterns to copy (vendored)

These repos are vendored under `vendor/cli/examples/*` and are worth directly imitating:

- **Cloudflare Wrangler** (`vendor/cli/examples/workers-sdk`): concise errors + fix guidance; clean progress and summaries.
- **Vercel** (`vendor/cli/examples/vercel`): developer-first flows; clear next steps.
- **Netlify** (`vendor/cli/examples/netlify-cli`): workflow clarity and environment diagnostics.
- **Firebase CLI** (`vendor/cli/examples/firebase-tools`): consistent commands across a large surface area.
- **pnpm** (`vendor/cli/examples/pnpm`): disciplined output; avoids noise.
- **Prisma** (`vendor/cli/examples/prisma`): guided-feeling output without necessarily being interactive; strong "what's next".

UX building blocks to use in headless mode (vendored under `vendor/cli/motion` + `vendor/cli/output`):

- **ora** / **cli-spinners**: spinners for long phases in TTY.
- **listr2**: staged task lists for multi-step commands (great for generate).
- **boxen**: boxed callouts for warnings/errors/summaries (use sparingly).

Rule: do not combine multiple redraw systems at once. Pick one per mode (TTY human).

## 9) Detailed UX plan by command (non-interactive)

### 9.1 `cm generate` (golden path)

Improve:

- Always print `Artifacts: <dir>` early (already present; enforce everywhere).
- Emit per-stage artifact paths as they are written (not only at the end).
- On success, print the full receipt (script/audio/timestamps/visuals/video).
- On failure, print the failed stage + last successful artifact path + `Next:` suggestions.
- Add a one-line hint for presets: `--sync-preset fast|standard|quality|maximum`.

Reference: `docs/guides/guide-cli-ux-cm-generate-20260106.md`.

### 9.2 `cm script` / `cm audio` / `cm visuals` / `cm render` (stage commands)

Standardize:

- Header: what input is being used, where outputs will land.
- Progress: stage phases + percent where possible.
- Receipt: include every output path and a recommended next command.

Examples of next-step hints:

- `cm script` -> `Next: cm audio --input script.json`
- `cm audio` -> `Next: cm visuals --input timestamps.json`
- `cm visuals` -> `Next: cm render --input visuals.json`
- `cm render` -> `Next: cm validate <video>`

### 9.3 `cm validate` / `cm score` / `cm rate`

These are "quality products", not just utilities:

- Always summarize pass/fail in one ASCII-safe line.
- Always print failing gate names and "Fix:" hint.
- Provide recommended thresholds and links to docs.

### 9.4 `cm init` / `cm templates`

- Make `cm init` print where config was written and what defaults are active.
- Make `cm templates` print a short list plus how to select one in `generate`.

## 10) Metrics (how we know it worked)

Quantitative (from tests / CI / telemetry if added later):

- In `--json` mode: stdout is exactly one parseable JSON object (0 extra bytes).
- In non-TTY mode: no spinners, no ANSI.
- Failure messages include `Fix:` for known error classes (missing env, missing file, schema invalid).

Qualitative:

- A new user can successfully run `cm generate` and find outputs without reading docs.
- A CI user can parse `--json` output without brittle parsing.

## 11) Rollout plan (safe)

1. Implement shared renderers behind internal helpers (no behavior changes yet).
2. Apply to `cm generate` first (highest ROI).
3. Apply to stage commands (`script/audio/visuals/render`).
4. Apply to quality commands (`validate/score/rate`).
5. Add regression tests for stdout purity, exit codes, and receipts.

## 12) FAQ

**Why not a full TUI now?**  
Non-interactive UX improvements are lower risk, faster, and preserve automation better. A TUI can be added later as an optional mode.

**Will this break scripts?**  
No - stdout discipline becomes stricter, and `--json` remains one envelope object.

**Is this "terminal theater"?**  
No - progress and summaries are designed to increase trust and clarity, not to add noise.

## Related

- `docs/guides/guide-cli-ux-standards-20260106.md`
- `docs/guides/guide-cli-stdout-stderr-contract-20260107.md`
- `docs/features/feature-cli-progress-events-20260106.md`
- `docs/features/feature-cli-json-contract-20260106.md`
- Vendored references:
  - `VENDORING.md`
  - `vendor/cli/examples/workers-sdk`
  - `vendor/cli/examples/prisma`
  - `vendor/cli/motion/listr2`
  - `vendor/cli/output/boxen`

