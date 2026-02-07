# TASK-030-feature: Brand Kits

**Type:** Feature  
**Priority:** P1  
**Estimate:** L  
**Created:** 2026-02-07  
**Owner:** Unassigned  
**Status:** Todo

---

## Feature Description

**Goal:** Introduce brand kits so teams can enforce house style across templates and workflows.

**User Story:**

> As a team,
> I want brand defaults (fonts, colors, watermark, safe zones),
> So that every generated video matches our identity without repeated flags.

## Acceptance Criteria

- [ ] Given `--brand <idOrPath>`, when rendering, then watermark/fonts/colors apply predictably.
- [ ] Given template defaults and brand defaults, when both set the same field, then precedence is explicit and tested.
- [ ] Given `cm brands list|show|validate|install`, then brand kits are discoverable and portable.

## Required Documentation

- [x] `docs/features/feature-brand-kits-20260207.md`
- [ ] `docs/guides/guide-brand-kits-20260207.md`
- [ ] Reference updates for brand flags/commands

## Testing Plan (TDD)

- [ ] Unit: schema + resolver + precedence
- [ ] Integration: render with a sample brand kit

## Technical Design

- New module `src/render/brands/*` mirroring templates/workflows patterns.

## Related

- `docs/features/feature-platform-expansion-roadmap-20260207.md`

---

**Last Updated:** 2026-02-07
