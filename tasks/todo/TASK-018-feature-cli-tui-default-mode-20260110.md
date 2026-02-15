# TASK-018-feature: Default Interactive TUI Mode for `cm`

**Type:** Feature  
**Priority:** P1  
**Estimate:** L  
**Created:** 2026-01-10  
**Owner:** Unassigned  
**Status:** Todo

---

## Feature Description

**Goal:** Make `cm` feel like a product by default: `cm` with no args launches an interactive TUI (Ink-based) that guides users through the pipeline with live progress, previews, and recovery - while preserving headless/scriptable behavior for automation.

**User Story:**

> As a creator/dev,
> I want `cm` to open an interactive "home screen" when I run it with no args,
> So that I can generate videos and inspect artifacts without memorizing flags.

**Value Proposition:**

- Dramatically improves onboarding and daily UX.
- Enables faster iteration loops (rerun stages, edit artifacts, preview outputs).
- Keeps the CLI pipeline contract intact for power users and automation.

---

## Acceptance Criteria

- [ ] Given I run `cm` with no args in a TTY, when the process starts, then it launches a full-screen interactive TUI home screen.
- [ ] Given I run `cm` with no args in a non-TTY environment, when the process starts, then it prints help (or a concise usage message) and exits non-interactively.
- [ ] Given I run `cm --json`, when executed, then it never launches a TUI and stdout remains machine-readable.
- [ ] Given I run `cm --no-tui`, when executed in a TTY, then it does not launch a TUI and behaves like the current CLI.
- [ ] Given a pipeline stage fails in TUI mode, when the error view renders, then it shows the failed stage, last successful artifact path, and at least one recovery action (retry/open artifact/switch preset).

---

## 🧾 Required Documentation

**Pre-Work (read these first):**

- [ ] `docs/dev/features/feature-cli-progress-events-20260106.md`
- [ ] `docs/dev/features/feature-cli-json-contract-20260106.md`
- [ ] `docs/dev/guides/guide-cli-stdout-stderr-contract-20260107.md`

**Deliverables (create these):**

- [ ] `docs/dev/features/feature-cli-tui-mode-20260110.md`
- [ ] `docs/dev/guides/guide-cli-tui-mode-20260110.md`
- [ ] `docs/dev/architecture/ADR-004-DEFAULT-TUI-MODE-20260110.md`

---

## 🧪 Testing Considerations

**Happy Path:**

- `cm` opens TUI, user selects "Generate", pipeline runs, artifacts and output are produced, summary view renders.

**Edge Cases:**

- Terminal not TTY (CI, pipes) => no TUI.
- User hits `Ctrl+C` mid-run => graceful shutdown, artifacts flushed, helpful message.
- Very narrow terminal width => UI degrades gracefully.

**Error Scenarios:**

- Missing API keys, missing whisper binaries, missing template/gameplay clips.
- Stage failures should show recovery actions without losing state.

**Performance:**

- UI must not materially slow down pipeline execution (observer-only design).

**Security:**

- Never display secrets in UI panels.
- Avoid echoing full request payloads unless `--verbose` and still scrub secrets.

---

## 🧪 Testing Plan (TDD)

**CRITICAL:** Write these tests BEFORE writing implementation code

### Unit Tests

- [ ] Routing tests: `cm` no args -> TUI only when TTY and not `--json` / `--no-tui`
- [ ] UI state machine tests: Home -> Wizard -> Running -> Summary/Error
- [ ] Output contract tests: in `--json` mode no TUI and stdout remains JSON only

### Integration Tests

- [ ] Ink rendering test: renders home screen and responds to a keybinding
- [ ] Pipeline observer integration: stage events update UI model consistently

### E2E Tests

- [ ] Spawn `cm` in non-TTY mode and ensure it exits with help (no hang)
- [ ] Spawn `cm --no-tui --help` and confirm help output includes `--no-tui`

---

## Technical Design

### Architecture

**Components Involved:**

- `src/cli/index.ts` → route to TUI when appropriate
- `src/cli/tui/` → Ink app, views, state machine, keybindings (new)
- `src/core/events/` → pipeline progress + cost observers
- `src/cli/commands/*` → refactor toward "evented runner" used by both headless and TUI

**Data Flow:**

```
[User Input] -> [TUI Wizard] -> [Run Pipeline] -> [Events] -> [UI State] -> [Summary + Artifacts]
```

**Dependencies:**

- `ink` → terminal React renderer (interactive TUI)
- Optional test deps: Ink renderer testing utility (TBD)

---

## Implementation Plan

### Phase 1: Foundation

- [ ] Add feature-flagged `cm ui` command (opt-in)
- [ ] Create UI state model + routing without pipeline execution
- [ ] Add tests for routing and basic rendering

### Phase 2: Pipeline Integration

- [ ] Run `cm generate` pipeline through an evented runner
- [ ] Render stage progress + summary via `PipelineEventEmitter` observers
- [ ] Add error view + retry hooks

### Phase 3: Make Default + Polish

- [ ] Make `cm` (no args) default to TUI in TTY
- [ ] Add keymap overlay, reduced motion, narrow-terminal fallbacks
- [ ] Add demo tape script (VHS) and update README (follow doc standards)

---

## ✅ Verification Checklist

- [ ] All acceptance criteria met
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Docs delivered and linked
- [ ] Manual testing completed in TTY + non-TTY contexts
- [ ] Output contract preserved (stdout clean for JSON/artifacts)

---

## Related

- `docs/dev/features/feature-cli-tui-mode-20260110.md`
- `docs/dev/architecture/ADR-004-DEFAULT-TUI-MODE-20260110.md`

---

## Open Questions

- [ ] Which Ink testing library should we standardize on for Vitest?
- [ ] Should "recent runs" be inferred from filesystem or tracked in a small index file?
- [ ] Do we need to change the CLI build output (CJS vs ESM) to support ESM-only UI dependencies like `ink` (and existing deps like `ora`)?
- [ ] Do we want `cm` with no args to open TUI immediately, or show help with a one-line hint when the terminal is too small?

---

## Notes

The codebase already has:

- A CLI JSON contract (`src/cli/output.ts`)
- A pipeline event bus + observers (`src/core/events/`)

This feature should build on those primitives to avoid duplicating progress and cost logic.

---

**Last Updated:** 2026-01-10
