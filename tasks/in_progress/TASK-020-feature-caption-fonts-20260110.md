# TASK-020-feature: Caption Fonts Config + Bundled Pack

**Type:** Feature
**Priority:** P1
**Estimate:** M
**Created:** 2026-01-10
**Owner:** Unassigned
**Status:** In Progress

---

## Feature Description

**Goal:** Let users set caption fonts via config files and ship a small bundled font pack.

**User Story:**
> As a content creator,
> I want to configure caption fonts globally and optionally bundle custom fonts,
> So that every render uses consistent, high-quality typography.

**Value Proposition:**
Better readability and consistent branding without needing to pass CLI flags on every run.

---

## Acceptance Criteria

- [x] Given a config file with caption font settings, when running `cm generate` or `cm render`, then captions use the configured font family/weight.
- [x] Given a config file with a bundled font file path, when rendering, then the font is loaded into Remotion and applied.
- [x] Given invalid font config, when running commands, then a clear validation error is returned.

---

## Documentation Planning

**Required updates:**
- [x] Update `README.md` with caption font flags + config examples
- [x] Update `AGENTS.md` with font defaults + config references

---

## Testing Considerations

**Happy Path:**
- Config defaults apply when CLI flags are omitted.
- Bundled font file loads and is used during render.

**Edge Cases:**
- Invalid font weight values.
- Missing font file path.
- Config file with no font settings.

**Error Scenarios:**
- Non-existent font file path.
- Invalid config schema for fonts.

---

## Testing Plan (TDD)

### Unit Tests

- [x] Config schema accepts caption font settings and applies defaults.
- [x] Config loader accepts font array in JSON config.
- [x] Render props include custom fonts and caption font overrides.

---

## Implementation Plan

### Phase 1: Foundation
- [x] Define config schema for caption fonts
- [x] Write failing tests
- [x] Implement config parsing

### Phase 2: Integration
- [x] Wire config defaults into CLI + pipeline
- [x] Bundle font assets into Remotion render

### Phase 3: Polish
- [x] Add docs and examples
- [x] Validate bundled font pack inclusion

---

## Verification Checklist

- [x] All acceptance criteria met
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [x] Documentation updated

---

## Notes

Focus on JSON config support for font arrays; TOML can provide simple font defaults.

---

**Last Updated:** 2026-01-10
