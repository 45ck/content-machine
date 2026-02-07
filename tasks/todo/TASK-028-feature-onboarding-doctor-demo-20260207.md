# TASK-028-feature: Onboarding (Doctor + Demo)

**Type:** Feature  
**Priority:** P1  
**Estimate:** M  
**Created:** 2026-02-07  
**Owner:** Unassigned  
**Status:** Todo

---

## Feature Description

**Goal:** Make Content Machine easy to set up and self-diagnosing on fresh machines.

**User Story:**

> As a new user,
> I want a single command to tell me what is missing and how to fix it,
> So that I can generate my first video quickly without guessing.

**Value Proposition:**
Onboarding friction is the biggest adoption blocker. A doctor + demo path reduces support burden and
makes the tool feel reliable.

## Acceptance Criteria

- [ ] Given a machine without API keys, when running `cm demo`, then it renders a mock MP4 and exits 0.
- [ ] Given missing Whisper/model, when running `cm doctor`, then it reports the missing dependency with a one-line `Fix: ...`.
- [ ] Given `cm doctor --json`, when a check fails, then the JSON envelope includes stable error context and exit code is non-zero.
- [ ] Given `cm generate --preflight`, when dependencies are missing, then it uses the same checks as `cm doctor`.

## Required Documentation

**Pre-Work (read these first):**

- [ ] `docs/features/feature-on-demand-assets-20260111.md`
- [ ] `docs/guides/guide-cli-errors-and-fix-lines-20260107.md`

**Deliverables (create these):**

- [x] `docs/features/feature-onboarding-doctor-and-demo-20260207.md` - Feature specification
- [ ] `docs/guides/guide-cm-doctor-20260207.md` - How to use doctor + demo
- [ ] Update `docs/reference/` for new commands/flags

## Testing Considerations

**Happy Path:**

- `cm demo --mock` produces an MP4 quickly.

**Edge Cases:**

- Offline mode enabled.
- CI environment (no browser open).
- Windows paths and CRLF config files.

**Error Scenarios:**

- Missing API keys.
- Missing Whisper binary/model.
- Missing ffmpeg/ffprobe where required.

## Testing Plan (TDD)

**CRITICAL:** Write these tests BEFORE writing implementation code.

### Unit Tests

- [ ] Doctor check registry emits deterministic results for mocked env/fs.
- [ ] Demo harness emits deterministic artifacts.

### Integration Tests

- [ ] CLI: `cm doctor --json` schema and exit codes.
- [ ] CLI: `cm demo --mock` renders and exits 0.

### E2E Tests

- [ ] Fresh install smoke: `cm demo --mock` and `cm lab review` prints a URL (browser open best-effort).

## Technical Design

### Architecture

Components:

- `src/core/doctor/*`: check registry and shared check runners
- `src/cli/commands/doctor.ts`: CLI surface
- `src/cli/commands/demo.ts`: demo harness and helpers

Data Flow:
`env/fs/config -> doctor checks -> (fix lines + json envelope) -> exit code`

## Implementation Plan

### Phase 1: Doctor core

- [ ] Define check result schema and registry
- [ ] Implement initial checks and JSON output

### Phase 2: Demo harness

- [ ] Deterministic mock artifacts generation
- [ ] Render via existing render service

### Phase 3: Preflight integration

- [ ] Share checks with `--preflight` paths

## Verification Checklist

- [ ] All acceptance criteria met
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Linting clean (`npm run lint`)
- [ ] Format check passes (`npm run format:check`)

## Related

- `docs/features/feature-platform-expansion-roadmap-20260207.md`

---

**Last Updated:** 2026-02-07
