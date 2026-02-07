# Feature: Onboarding (Doctor + Demo + Better Init)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Reduce setup friction and make failures actionable. Today, users can run `cm init` and start the
pipeline, but missing dependencies (API keys, Whisper, ffmpeg/ffprobe, directories) still create
confusing failures.

This feature adds:

- `cm doctor`: a single, comprehensive diagnostic command with Fix guidance
- `cm demo`: a one-command good first video (mock-mode by default)
- `cm init` improvements: write config where it belongs and set correct defaults per platform

## User Value

- Time-to-first-video drops sharply.
- Support burden drops because failures are self-diagnosing.
- CI and automation become more deterministic (`--json` output + stable exit codes).

## Goals

- A new user can run `cm demo` without any API keys and get a playable MP4.
- `cm doctor` pinpoints missing prerequisites with one-line fixes.
- `cm generate --preflight` uses the same underlying checks as `cm doctor`.

## Non-goals

- Installing system packages automatically (we provide instructions, not root-level installers).
- Telemetry.

## UX / CLI

### Commands

- `cm doctor [--json] [--strict]`
- `cm demo [--template <idOrPath>] [--output <path>] [--open-lab]`

### Options

- `cm doctor --strict`: fail if any warning-level issue exists (useful in CI).
- `cm demo --open-lab`: renders and opens `cm lab review` directly.

## Data Contracts

- `doctor.json` (optional artifact): structured check results.
- Reuse the existing JSON envelope contract for stdout in `--json` mode.

## Architecture

- Add a core module: `src/core/doctor/*`
  - check registry (each check is a pure function returning { ok, severity, fix, details })
  - shared by CLI (`cm doctor`) and preflight hooks (`--preflight`)
- Integrate with existing on-demand assets patterns:
  - `cm assets whisper status/install` already exists and should be called internally

### Checks (initial set)

- Node version (warn if < engines.node)
- API keys present for selected providers (OpenAI, Anthropic, Pexels, etc.)
- Whisper availability if pipeline mode requires it
- ffmpeg/ffprobe availability when required
- Write access to output directory
- Resolved config + template + workflow validity
- Presence of key directories (`~/.cm/assets/hooks`, gameplay libraries when required)

### Failure modes / recovery

- Every failure includes `fix` (one command or one edit).
- In strict mode: warnings become failures.

## Testing

### Unit

- Each check returns deterministic output for mocked environment variables and filesystem stubs.

### Integration

- `cm doctor --json` returns stable schema and exit codes across scenarios.
- `cm demo --mock` produces an MP4 and exits 0.

### V&V

- Layer 4: run the fresh machine playbook monthly (Linux/macOS/Windows) and record time-to-first-video.

## Rollout

- `cm doctor` is additive, no breaking changes.
- `cm demo` ships with mock defaults; real-provider demo is opt-in.

## Related

- On-demand assets: `docs/features/feature-on-demand-assets-20260111.md`
- CLI JSON envelopes: `docs/features/feature-cli-json-contract-20260106.md`
- `cm init`: `docs/reference/cm-init-reference-20260106.md`
- `cm assets`: `docs/reference/cm-assets-reference-20260111.md`
