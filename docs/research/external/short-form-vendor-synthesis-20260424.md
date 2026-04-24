# Short-Form Vendor Synthesis 20260424

## Objective

Consolidate the three-agent repo research pass into a concrete local build direction for high-quality TikTok, Instagram Reels, and YouTube Shorts generation.

This pass inspected local research clones under `C:\Projects\content-machine-research\repos` and the original worktree vendor area under `C:\Projects\content-machine\vendor` where useful. The clean master worktree does not currently contain a top-level `vendor/` directory, so the active evidence source is the research clone set plus existing repo docs.

## Repo Evidence

| Area                    | Strongest references                                                                                           | What to adopt                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| End-to-end architecture | `short-video-maker-gyori`, `vidosy`, `MoneyPrinterTurbo`, `ShortGPT`, `youtube-shorts-pipeline`, `clipforge`   | JSON artifact contracts, resumable stages, provider fallback ladders, data-first Remotion props, profile-driven generation.                             |
| Longform clipping       | `yt-short-clipper`, `ViriaRevive`, `video-editing-skill`, `whisperX`, `FunClip`, `Clip-Anything`               | Highlight discovery before render, approval loop, transcript-to-timestamp recovery, audio/scene signals, sentence boundary snap, speaker/crop metadata. |
| Render and captions     | `remotion-template-tiktok`, `remotion-dev-skills`, `captacity`, `clipforge`, `video-editing-skill`, `whisperX` | Pixel-fitted captions, Remotion-native caption artifacts, ASS/SRT/VTT sidecars, timestamp reconciliation, render quality knobs, still-frame QA.         |
| Style and platform fit  | `youtube-shorts-pipeline`, `video-podcast-maker`, viral hypothesis imports                                     | Niche/style profiles that shape hooks, captions, visuals, music, thumbnails, packaging, and platform defaults.                                          |

## Current Fit

The local system already matches the right high-level architecture:

- Stage artifacts are explicit: script, audio/timestamps, visuals, render output, quality sidecars.
- The new longform stack has useful starting contracts: `highlight-candidates.v1`, approval artifacts, media index, source media analysis, and style profile storage.
- Caption/render code is stronger than most references in terms of presets, safe zones, paging/chunking modes, visual tests, and OCR/sync scoring.
- The local-first CLI/harness direction is correct for agent-driven iteration.

The gap is not architecture. The gap is measured media intelligence and workflow maturity.

## Key Gaps

1. **Highlight ranking is still only partially multi-signal.**
   `source-media-analyze` now measures scene changes, silence gaps, and audio RMS/peak, and `longform-highlight-select` can consume those signals. The remaining gap is richer per-span scoring and optional `llmNarrativeScore`.

2. **Approval exists, but preview is not strong enough.**  
   The target workflow should show candidate transcript, score breakdown, preview clip path/command, rejection reasons, and regenerate options before rendering final shorts.

3. **Caption layout is not pixel-fitted.**  
   Current caption safety is mostly count/heuristic based. High-quality Shorts need actual font/stroke/viewport fit checks, especially with large TikTok-style captions.

4. **Quality gates are too post-hoc.**  
   Sync/OCR/visual scoring exists, but render/generate does not yet use it as a retry or stop condition.

5. **Style memory is shallow.**  
   `style-profile` exists, but profiles should eventually drive hook patterns, caption density, visual language, music/energy, crop rules, thumbnails, platform metadata, and avoid lists.

6. **Media index is storage, not selection.**  
   It needs transcript segment paths, scene lists, quality flags, tags, platform fit, prior approval/outcome metadata, and later embeddings/reuse ranking.

## Build Decision

Prioritize measured source intelligence and previewable clip approval before adding heavier smart-crop or upload automation.

The strongest repos do not make good Shorts by only rendering prettier captions. They first choose better moments, prove the moment has a complete hook/payoff loop, then make captions and visual framing safe. Our next work should therefore connect source analysis into highlight selection and approval.

## Next Implementation Order

### 1. Real Source Signals

Status: v1 implemented.

`source-media-analyze` measures and writes:

- audio RMS / peak summaries
- silence gaps
- rough scene-change density via ffmpeg
- sampled-frame count from probe metadata

Remaining follow-up:

- audio energy by second
- optional OCR/burned-in text risk
- stronger probe validation for cached media

Why: this unlocks multi-signal highlight selection and avoids LLM-only timestamp guesses.

### 2. Multi-Signal Highlight Ranking

Upgrade `longform-highlight-select` so candidate scores combine:

- transcript hook/coherence/payoff
- silence and filler risk
- audio energy peaks
- scene-change support
- sentence boundary quality
- optional LLM narrative score

Keep deterministic scoring as the fallback and record score breakdowns in every candidate.

### 3. Preview Approval Loop

Create a practical candidate review artifact:

- candidate id, source, start/end/duration
- transcript excerpt
- score breakdown
- source signals
- preview clip path or preview command
- approval/rejection notes
- regenerate/re-snap hints

Why: `yt-short-clipper` shows that separating highlight discovery from processing is a product-quality multiplier.

### 4. Pixel-Fit Captions

Add a measured caption fit pass based on actual font, stroke width, viewport, and safe zone:

- prevent long-token overflow
- choose line/page/chunk breaks from measured width
- preserve emphasis metadata through render
- add visual tests for large caption presets

Why: the render stack is already strong; pixel fit is the biggest remaining quality gap.

### 5. Quality-Gated Render

Expose quality gates in the active local workflow:

- render output controls: CRF, bitrate, audio bitrate, pixel format
- optional `render --quality-gate` behavior
- still-frame QA before full render
- post-render OCR/sync/visual score summary

Why: high-quality shorts need repeatable accept/reject criteria, not only a successful MP4 file.

### 6. Profile-Driven Generation

Expand style profiles toward `youtube-shorts-pipeline`/`video-podcast-maker`:

- hook templates
- caption rules
- visual and crop rules
- music/energy defaults
- thumbnail/first-frame rules
- platform-specific metadata
- avoid lists

Why: repeatable quality comes from reusing learned style constraints across runs.

## What Not To Do Yet

- Do not add upload automation next. Publish prep and quality gates matter first.
- Do not add YOLO/dynamic crop before scene boundaries and approved spans are stable.
- Do not replace deterministic highlight scoring with LLM-only scoring.
- Do not add more prose-only skills until the current contracts are executable and wired into workflows.

## Practical MVP Path

The next useful local workflow should be:

```text
source-media-analyze
  -> longform-highlight-select
  -> boundary-snap
  -> highlight-approval
  -> preview clip
  -> style-profile-driven render
  -> quality-gated final MP4
```

That path best matches the stronger vendored repos and directly supports the product goal: short-form videos that are not only generated, but worth watching.
