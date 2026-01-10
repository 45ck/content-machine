# TASK-019-feature: Audio Options + Mix Integration

**Type:** Feature  
**Priority:** P1  
**Estimate:** L  
**Created:** 2026-01-10  
**Owner:** Unassigned  
**Status:** Todo  

---

## Feature Description

**Goal:** Add optional music/SFX/ambience support with a mix plan that stays in sync with captions and visuals.

**User Story:**
> As a content creator,
> I want to add background music and SFX via CLI flags,
> So that my short-form videos feel more engaging without manual editing.

**Value Proposition:**
Improves perceived production quality and retention while keeping the pipeline composable and deterministic.

---

## Acceptance Criteria

- [ ] Given `cm audio --music lofi-01`, when audio completes, then `audio.mix.json` is written and references the voice track and music layer.
- [ ] Given `cm render --audio-mix audio.mix.json`, when rendering, then the output includes mix layers without breaking captions.
- [ ] Given missing music/SFX assets, when rendering, then the system logs a warning and renders voice-only.
- [ ] Given `cm generate` with audio options, when pipeline completes, then the mix plan is passed through to render.
- [ ] Given no audio options, when running any stage, then behavior is unchanged and no mix plan is required.

---

## ÐY"s Required Documentation

**Pre-Work (read these first):**
- [ ] `docs/features/feature-audio-options-mix-integration-20260110.md`
- [ ] `docs/architecture/IMPL-PHASE-2-AUDIO-20260105.md`
- [ ] `docs/architecture/SYNC-ARCHITECTURE-20260610.md`

**Deliverables (create these):**
- [ ] `docs/guides/guide-audio-options-20260110.md`
- [ ] Update `docs/reference/cm-audio-reference-20260106.md`
- [ ] Update `docs/reference/cm-render-reference-20260106.md`
- [ ] Update `docs/reference/cm-generate-reference-20260106.md` (if new flags exposed)
- [ ] Update `docs/reference/SYNC-CONFIG-REFERENCE-20260107.md` (if config changes)

---

## ÐYõ¦ Testing Considerations

**Happy Path:**
- Mix plan generated for music/SFX options.
- Render consumes mix plan and includes extra audio layers.

**Edge Cases:**
- No mix layers provided (voice-only).
- Missing local asset files (should warn + skip layer).
- Mix plan voice path mismatch with `--audio`.
- Hook clip present (audio timing offsets handled).

**Error Scenarios:**
- Invalid mix schema.
- Invalid CLI values (non-numeric volume, negative fade).

**Performance:**
- Mix plan generation is lightweight (<10ms).
- Render bundling copies only referenced audio assets.

**Security:**
- Path traversal prevention when resolving local asset paths.
- No remote audio downloads unless explicitly supported.

---

## ÐY"? Testing Plan (TDD)

**CRITICAL:** Write these tests BEFORE writing implementation code

### Unit Tests

- [ ] Mix schema validation and defaults.
- [ ] Mix plan builder: hook/scene/cta placement from timestamps.
- [ ] Mix plan builder: clamp layers to voice duration.
- [ ] Render mix resolver: missing assets are dropped with warnings.

### Integration Tests

- [ ] `cm audio` generates `audio.mix.json` when `--music` provided.
- [ ] `cm render --audio-mix` uses mix plan without altering captions.

### E2E Tests

- [ ] `cm generate` with `--music` completes and outputs video with mix plan.

---

## Technical Design

### Architecture

**Components Involved:**
- `src/audio/mix/` — mix schema + plan builder
- `src/audio/pipeline.ts` — optional mix plan creation
- `src/render/service.ts` — bundle and pass mix plan to Remotion
- `src/render/remotion/` — render audio layers
- `src/cli/commands/audio.ts` — new CLI flags
- `src/cli/commands/render.ts` — `--audio-mix` flag
- `src/cli/commands/generate.ts` — pass-through flags

**Data Flow:**
```
cm audio: script.json -> audio.wav + timestamps.json + audio.mix.json
cm render: visuals.json + timestamps.json + audio.wav (+ audio.mix.json) -> video.mp4
```

**Dependencies:**
- Remotion `Audio` component for layer playback.
- Local asset resolution (no new external APIs).

### API Changes (if applicable)

**New CLI Flags:**
```
cm audio --music <path|preset> --sfx-pack <name> --mix-preset <preset>
cm render --audio-mix <path>
cm generate --music <path|preset> --sfx-pack <name> --mix-preset <preset>
```

### Database Changes (if applicable)

None.

---

## Implementation Plan

### Phase 1: Foundation
- [ ] Define mix schemas (Zod)
- [ ] Write failing tests for mix schema + planner
- [ ] Implement mix plan builder

### Phase 2: Integration
- [ ] Wire `cm audio` options and mix output
- [ ] Update render service + Remotion components
- [ ] Add CLI support to `cm render` and `cm generate`

### Phase 3: Polish
- [ ] Update docs + references
- [ ] Add logging and warnings
- [ ] Run full test suite

---

## ƒo. Verification Checklist

**Before moving to `done/`:**

- [ ] All acceptance criteria met
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Feature specification written (`docs/features/`)
- [ ] User guide written (`docs/guides/`)
- [ ] ADR written (if architectural decision)
- [ ] Code committed to main branch
- [ ] CI passed (when CI is implemented)
- [ ] Manual testing completed
- [ ] Performance tested (if performance-critical)
- [ ] Security reviewed (if security-sensitive)
- [ ] Error messages are user-friendly
- [ ] Logging added (structured logs)
- [ ] No hardcoded secrets
- [ ] API documentation updated (if API changes)

---

## Related

**Related Tasks:**
- None

**Related Features:**
- `docs/features/feature-audio-options-mix-integration-20260110.md`

**Related Docs:**
- `docs/architecture/IMPL-PHASE-2-AUDIO-20260105.md`
- `docs/architecture/SYNC-ARCHITECTURE-20260610.md`
- `docs/specs/audio-breathing-room-spec-20260109.md`

---

## Open Questions

- [ ] Should `audio.mix.json` always be generated when `--audio-mix` is omitted?  
- [ ] Do we want to support looping for short music beds (needs Remotion loop semantics)?

---

## Notes

Keep audio as the master clock; mix plan must not alter `timestamps.json`.

---

**Last Updated:** 2026-01-10
