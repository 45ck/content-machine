# Remotion Official Templates: Gap Analysis for Content Machine (2026-02-07)

## Goal

Study Remotion's official templates and identify high-ROI things to steal for `content-machine` ("CM"), then turn that into an actionable implementation plan.

This doc is intentionally practical: "what exists", "what we have", "what we're missing", "what to build next".

## Current State (CM)

CM already uses Remotion for the render stage:

- Remotion bundling/rendering: `src/render/service.ts` via `@remotion/bundler` + `@remotion/renderer`.
- Compositions:
  - `ShortVideo` (`src/render/remotion/ShortVideo.tsx`)
  - `SplitScreenGameplay` (`src/render/remotion/SplitScreenGameplay.tsx`)
- Template registry (data-only presets): `src/render/templates/index.ts`
  - Built-ins: `tiktok-captions`, `brainrot-split-gameplay`, `brainrot-split-gameplay-top`
- Captions:
  - Main caption system is `src/render/captions/` (CapCut/TikTok-style paged or chunked captions, safe zones, emphasis, presets).
  - Note: `src/render/remotion/Caption.tsx` exists and references `remotion-dev/template-tiktok`, but CM’s compositions import `Caption` from `src/render/captions/` (the newer system). That older file is likely legacy or unused.

## What Remotion’s Official Templates Offer (High-Level)

Remotion’s templates are not just “visual styles”. They also show productized patterns:

- Rendering modes beyond MP4: stills (PNG/JPEG), overlays with alpha, server-side rendering endpoints, prompt-to-video patterns, music visualization.
- Operational patterns: render queues, job lifecycle, progress reporting, caching, stable input schemas.

## Gap Analysis (Template -> What to Steal -> CM Status)

### 1) Template: Stills (Dynamic Images)

What to steal:

- A first-class “render still” flow.
- Patterns for deterministic frames, preview frames, and thumbnails.
- Fast iteration: render a single frame without a full MP4 render.

CM status:

- CM already uses `renderStill` in visual verification tests under `tests/vv/`, but there’s no user-facing CLI/API for stills.

Plan:

- Add `cm still` (or `cm render --still`) to render:
  - A thumbnail frame (hook frame, mid frame, last frame).
  - A “caption QA” frame (frame where caption is active).
- Use the same props/schema as `cm render`, with `--frame` or `--time`.

Implementation sketch:

- New service function in `src/render/service.ts` (or `src/render/stills/service.ts`) using `@remotion/renderer` `renderStill` + `selectComposition`.
- CLI command in `src/cli/commands/` (similar UX patterns to `render.ts`).

### 2) Template: Render Server (Express)

What to steal:

- A long-running render API that accepts jobs and returns outputs.
- Queueing, progress streaming, and “jobs not processes” operational mindset.

CM status:

- CM has an MCP server (`src/server/mcp/`) but not a straightforward HTTP render server that external systems can call.

Plan:

- Add `cm render-server`:
  - POST `/renders` with an input payload (same as `cm render` schema).
  - GET `/renders/:id` for status.
  - GET `/renders/:id/output` to download the MP4/ZIP artifact.
- Use an in-process queue with concurrency 1 by default (Remotion is memory heavy), configurable by env.

Implementation sketch:

- Server entry in `src/server/render-server/` (Express or Fastify).
- A minimal persistent job store (JSON file in `.cache/content-machine/`, or SQLite if we want robustness).
- Reuse existing progress callback support in `src/render/service.ts` (`onProgress`).

### 3) Template: Overlay (Alpha / Transparent)

What to steal:

- Rendering with transparent background to produce an “overlay layer” (captions, lower thirds, frames) that can be composited elsewhere.

CM status:

- CM renders fully composited MP4 only.

Plan:

- Add a composition that is “captions-only overlay”.
- Output formats:
  - ProRes 4444 (alpha) where supported.
  - PNG sequence (always works; heavy but interoperable).
- Expose via `cm render --overlay` or a template id like `overlay-captions`.

Implementation sketch:

- New composition in `src/render/remotion/` that renders captions and optional UI overlays but no background.
- Extend `VideoTemplate` schema to declare output type: `mp4`, `png-seq`, `prores4444`, etc.

### 4) Template: Music Visualization / Audiogram

What to steal:

- Waveform/spectrum visualization patterns for “audio-only” formats.

CM status:

- CM is script -> VO -> visuals -> render. No “audiogram” mode.

Plan:

- Add a new template `audiogram`:
  - Background: gradient/static image or simple motion.
  - Foreground: captions + waveform.
  - Use-case: quick repurposing of podcasts/voice notes.

Implementation sketch:

- New composition `Audiogram` plus minimal waveform component (FFT or amplitude sampling).
- This likely introduces `@remotion/media-utils` if we want better audio tooling.

### 5) Template: Prompt-to-Video

What to steal:

- The “input schema as a product” approach for compositions.
- The “safe defaults + typed props” patterns for reliability.

CM status:

- CM already has a strong artifact pipeline and typed props, but template installation and “composition-as-data” could go further.

Plan:

- Make templates more powerful (still data-only), but add optional “capabilities”:
  - Required assets (gameplay, hook, brand kit).
  - Output type.
  - Caption preset defaults.
  - Style tokens (colors, type scale, safe zones).

## What We Likely Aren’t Using From Remotion (Library Surface)

Based on CM dependencies today (no Lambda, no media-utils, no shapes):

- Cloud rendering: `@remotion/lambda` (or other cloud patterns).
- Media helpers: `@remotion/media-utils` (waveform/audio analysis).
- Extra primitives: `@remotion/shapes` (sometimes used for consistent vector UI).

Recommendation:

- Don’t add dependencies until we have a concrete template that needs them.

## Prioritized Roadmap

### Phase A (Quick Wins, 1-2 days)

- Expose still rendering (`cm still`) for thumbnails + QA frames.
- Add “caption-only stills” for V&V and debugging pacing.

Success criteria:

- Given an artifacts folder, we can produce `thumb.png` deterministically and fast.

### Phase B (Product Value, 3-5 days)

- Add `cm render-server` for integration with other apps and automation.
- Build a basic in-process queue and status endpoints.

Success criteria:

- Another process can POST a render job and poll/download the output.

### Phase C (Differentiators, 1-2 weeks)

- Overlay rendering (captions-only alpha output).
- Audiogram template (optional).
- Template packaging:
  - `cm template install <repo-or-path>` that installs into `~/.cm/templates/<id>/`.

Success criteria:

- Users can build re-usable branded templates without forking the repo.

## Open Questions

- Do we want HTTP render server, or is MCP the primary integration layer?
- Should overlay output be ProRes 4444, PNG sequence, or both?
- Do we want to ship more built-in templates, or keep CM minimal and push templates to userland?
