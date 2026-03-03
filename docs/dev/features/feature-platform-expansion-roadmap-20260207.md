# Feature: Platform Expansion Roadmap (Adoption + Use Cases)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Content Machine is already architected as an artifact-first pipeline plus data-first templates:

`topic -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4`

This roadmap expands the project so more people can use it for more use cases without forking code.
The design bias is:

- data-first (templates/workflows/brands as validated JSON/TOML)
- safe by default (no untrusted code execution)
- composable (stages stay independently runnable)
- minimal duplication (single-source-of-truth schemas and resolvers)

## User Value

- Faster time-to-first-video (less setup and fewer mystery failures).
- More formats (templates) without rewriting the pipeline.
- Brand consistency across teams (brand kits).
- More visual sourcing strategies (stock video, BYO footage, images with motion).
- Tight iteration loops (score + lab + feedback) to systematically improve output quality.

## Goals

- `cm generate` produces a decent video on a fresh machine within 10 minutes (with mock mode requiring 0 API keys).
- Format as a file: a non-dev can install a template pack and get a new format working.
- Brand as a file: teams can enforce brand defaults across many videos without repeating flags.
- Visual source flexibility: support both video and image sources with deterministic motion behavior.
- Iteration loop: A/B compare and collect feedback with a single command path.

## Non-goals

- Auth, accounts, or multi-tenant hosting (this stays local and developer-oriented).
- Auto-upload to TikTok/IG/YouTube.
- Executing arbitrary untrusted code inside templates by default.

## Roadmap (Phased)

### Phase 1: Adoption Foundations (highest leverage)

- Onboarding, diagnosis, and demos (reduce setup friction and support burden).
- Template authoring ergonomics (scaffolding, preview).
- Brand kits (house style shared across templates/workflows).

### Phase 2: More Formats and Inputs

- Visual providers V2: unify on AssetProvider and support image sources with motion strategies.
- Asset packs: unify installation and directory conventions for hooks, templates, SFX, music, overlays, fonts.
- Curated workflows: ship a set of workflows that map to common short-form use cases.

### Phase 3: Quality Engine (systematic iteration)

- Integrate `cm score` + `cm lab` + `cm feedback` into an explicit iteration loop that can be automated.
- Add no-metrics-first review UX where human ratings are collected without showing heuristics.

### Phase 4: Distribution

- Make install and updates painless (npm, binaries, Docker) with minimal footprint via on-demand assets.

## Prioritization Matrix

Scoring: 1 (low) to 5 (high). This is a planning tool, not a guarantee.

| Initiative                           | Adoption | Use Cases | Eng Leverage | Risk | Effort | Priority |
| ------------------------------------ | -------- | --------- | ------------ | ---- | ------ | -------- |
| Onboarding (`cm doctor` + `cm demo`) | 5        | 3         | 5            | 2    | 2      | P1       |
| Template scaffolding + preview       | 4        | 5         | 5            | 2    | 3      | P1       |
| Brand kits                           | 4        | 4         | 4            | 3    | 3      | P1       |
| Visuals providers V2 + image motion  | 3        | 5         | 4            | 4    | 4      | P2       |
| Asset packs + import UX              | 3        | 4         | 4            | 3    | 3      | P2       |
| Curated workflows                    | 3        | 4         | 3            | 2    | 2      | P2       |
| Quality loop automation              | 2        | 4         | 4            | 3    | 3      | P2       |
| Distribution (binaries/Docker)       | 4        | 2         | 3            | 3    | 4      | P3       |

## Architecture Principles (Maintained)

- Single schema per contract: templates/workflows/brands/assets use Zod with versioning.
- Layering is explicit: CLI flags override template/workflow defaults override config defaults.
- No duplicated discovery logic: file resolution lives in core modules and is shared by CLI and library code.
- Fix-first errors: every failure mode includes a one-line fix suitable for automation.

## Testing and Verification Strategy

- Unit tests for: schema parsing/migrations, resolver precedence, path resolution.
- Integration tests for: CLI commands and JSON envelopes.
- E2E tests for: fresh install -> mock demo -> render -> lab review.
- V&V layer 4: curated golden videos per template/workflow and periodic human review.

## Rollout

- Keep defaults conservative: new functionality is opt-in until stable.
- Prefer additive configs and new commands over breaking flags.
- Publish example packs (template + brand + workflow) as reference implementations.

## Related

- Templates: `docs/dev/features/feature-video-templates-20260107.md`
- Workflows: `docs/dev/features/feature-custom-workflows-20260110.md`
- On-demand assets: `docs/dev/features/feature-on-demand-assets-20260111.md`
- Virality Director: `docs/dev/features/feature-virality-director-20260105.md`
- New plans:
  - `docs/dev/features/feature-onboarding-doctor-and-demo-20260207.md`
  - `docs/dev/features/feature-template-authoring-and-preview-20260207.md`
  - `docs/dev/features/feature-brand-kits-20260207.md`
  - `docs/dev/features/feature-visuals-asset-providers-v2-20260207.md`
  - `docs/dev/features/feature-asset-packs-and-imports-20260207.md`
  - `docs/dev/features/feature-curated-workflows-20260207.md` (curated workflows)
  - `docs/dev/features/feature-quality-loop-20260207.md`
  - `docs/dev/features/feature-distribution-and-packaging-20260207.md`
