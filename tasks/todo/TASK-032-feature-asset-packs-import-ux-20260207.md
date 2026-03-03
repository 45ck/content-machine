# TASK-032-feature: Asset Packs and Import UX

**Type:** Feature  
**Priority:** P2  
**Estimate:** M  
**Created:** 2026-02-07  
**Owner:** Unassigned  
**Status:** Todo

---

## Feature Description

**Goal:** Unify installation and validation for hooks/gameplay/SFX/music/overlays/fonts as safe packs.

## Acceptance Criteria

- [ ] Given a pack zip, when installing, then it rejects unsafe paths and installs atomically.
- [ ] Given installed packs, when listing, then it reports ids/types/paths deterministically.
- [ ] Given a template requiring a slot (gameplay), when missing, then errors include a `Fix:` line referencing pack install or directory placement.

## Required Documentation

- [x] `docs/dev/features/feature-asset-packs-and-imports-20260207.md`

## Related

- `docs/dev/features/feature-platform-expansion-roadmap-20260207.md`

---

**Last Updated:** 2026-02-07
