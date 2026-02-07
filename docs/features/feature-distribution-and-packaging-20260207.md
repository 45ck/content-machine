# Feature: Distribution and Packaging (Easy Install, Minimal Footprint)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine maintainers

---

## Overview

Adoption increases when installation is simple and reliable. Today, the repo expects Node and some
optional native/system dependencies (ffmpeg, whisper downloads). This feature clarifies and
improves distribution options while keeping installs small via on-demand assets.

## User Value

- Fewer environment issues and faster onboarding.
- CI and dev setups become more reproducible.

## Goals

- Keep `npm i -g content-machine` working as the default install path.
- Provide a Docker image for a fully pinned environment (optional).
- Optionally provide platform binaries if the maintenance cost is acceptable.
- Ensure the published npm package is minimal (no `vendor/`, no test fixtures, no large media).

## Non-goals

- A hosted SaaS.

## UX / CLI

- `cm doctor` becomes the first-line install validator.
- `cm assets` remains the on-demand dependency manager (whisper models, packs).

## Architecture

- Prefer pure JS/TS where possible.
- Keep heavy dependencies download-on-demand and cached in stable paths.
- Maintain a stable stdout/stderr contract for automation.

## Testing

### Integration

- Smoke test: install from packed artifact, run `cm --help`, run `cm demo --mock`.

### E2E

- Docker image: run `cm demo --mock` and ensure MP4 is produced.

## Rollout

- Start with docs + CI checks (package size, minimal file list).
- Add Docker after `cm doctor` is stable.
- Evaluate binaries only after API surface stabilizes.

## Related

- On-demand assets: `docs/features/feature-on-demand-assets-20260111.md`
- CLI contracts: `docs/features/feature-cli-json-contract-20260106.md`
