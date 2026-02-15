# TASK-001-feature: Virality Director (cm package + cm script --package)

**Type:** Feature  
**Priority:** P1  
**Estimate:** M  
**Created:** 2026-01-05  
**Owner:** Unassigned  
**Status:** In Progress

---

## Feature Description

**Goal:** Add a packaging-first step (title + cover text + muted hook text) and wire it into script generation.

**User Story:**

> As a content-machine user,  
> I want to generate packaging variants for a topic and reuse the selected package in `cm script`,  
> so that scripts are aligned to a strong title/cover promise from the start.

**Value Proposition:**

- Packaging is the ceiling-setter for short-form performance; forcing it early improves consistency.
- Enables lightweight A/B iteration without changing the 4-stage pipeline.

---

## Acceptance Criteria

- [x] Given a topic, when I run `cm package "<topic>" --mock`, then it writes a valid `packaging.json` with `schemaVersion`, `topic`, `platform`, `variants[]`, and `selected`.
- [x] Given a topic, when I run `cm package "<topic>" --mock`, then it writes a valid packaging artifact JSON (default `packaging.json`) with `schemaVersion`, `topic`, `platform`, `variants[]`, and `selected`. (Duplicate of the previous line; kept for traceability.)
- [x] Given a `packaging.json`, when I run `cm script --topic "<topic>" --package packaging.json --mock`, then the generated `script.json` includes the selected package in `script.extra.virality.packaging`.
- [x] Given an invalid `packaging.json` (missing required fields), when I run `cm script --package`, then it fails with a user-friendly schema error.
- [x] Unit tests cover schema validation, selection logic, and error handling (invalid JSON / invalid schema).

---

## Required Documentation

**Pre-Work (read these first):**

- [x] `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- [x] `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`
- [x] `docs/dev/features/feature-virality-director-20260105.md`

**Deliverables (create these):**

- [x] `docs/dev/features/feature-virality-director-20260105.md` — Feature specification
- [ ] `docs/dev/guides/guide-cm-package-20260105.md` — How to use `cm package` (optional for MVP)

---

## Testing Considerations

**Happy Path:**

- Generates 5 variants, selects one deterministically, and writes JSON.
- `cm script --package` causes the title/hook language in prompts to follow the package.

**Edge Cases:**

- LLM returns fewer/more variants than requested.
- Cover text is too long / empty.
- Topic is extremely long or contains quotes.

**Error Scenarios:**

- Missing input file / invalid JSON.
- LLM returns invalid JSON (parse failure).

---

## Testing Plan (TDD)

### Unit Tests

- [x] `PackageOutputSchema` validates a correct output.
- [x] Generator selects the best variant by deterministic heuristics (length rules).
- [x] Generator throws `SchemaError` on invalid LLM JSON.
- [ ] `cm script` integration preserves legacy behavior when `--package` is absent.

### Integration / CLI Smoke (local)

- [ ] `npm run cm -- package "Test topic" --mock --output .cache/packaging.json`
- [ ] `npm run cm -- script --topic "Test topic" --mock --package .cache/packaging.json --output .cache/script.json`
  - Alternative (Windows direct): `\.\node_modules\.bin\tsx.cmd src\cli\index.ts package "Test topic" --mock --output .cache\packaging.json`
  - Alternative (Windows direct): `\.\node_modules\.bin\tsx.cmd src\cli\index.ts script --topic "Test topic" --mock --package .cache\packaging.json --output .cache\script.json`

### Automated Integration Tests

- [x] Integration tests cover `cm package --mock` writing a valid artifact.
- [x] Integration tests cover `cm script --package` injecting `script.extra.virality.packaging`.
- [x] Integration tests cover invalid `--package` returning a JSON `SCHEMA_ERROR`.

---

## Technical Design

**Components Involved:**

- `src/package/` — Packaging schema + generator
- `src/cli/commands/package.ts` — CLI command
- `src/cli/commands/script.ts` — `--package` option
- `src/script/` — Prompt context + output `extra.virality.packaging`

**Data Flow:**

```
topic -> cm package -> packaging.json -> cm script --package -> script.json
```

---

## Implementation Plan

### Phase 1: Foundation

- [x] Define Zod schemas for `packaging.json`
- [x] Write failing tests for schema + generator selection

### Phase 2: Integration

- [x] Implement generator using existing `LLMProvider`
- [x] Add `cm package` command and mock mode
- [x] Add `--package` support to `cm script`

### Phase 3: Polish

- [x] Error messages and logging
- [ ] Update docs/README counts/links if needed

---

## Verification Checklist

- [ ] All acceptance criteria met
- [ ] All tests pass (`npm run test:run`)
- [x] TypeScript compiles (`npm run typecheck`)
- [ ] Linting clean (`npm run lint`)
- [ ] Manual smoke commands run successfully

Notes:

- In some sandboxed environments, running Vitest may fail with `spawn EPERM` due to esbuild worker restrictions. Run tests locally to confirm.

---

## Related

- `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`
- `docs/dev/features/feature-virality-director-20260105.md`
