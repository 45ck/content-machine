---
document: 06-typescript-kernel-cut-line
status: authoritative
ratified: 2026-04-23
phase: phase-0
depends-on:
  - 01-boundaries.md
  - 02-keep-move-deprecate.md
  - 03-reorg-synthesis.md
  - classification-20260422.md
owner: architecture
last-reviewed: 2026-04-23
---

# 06 - TypeScript Kernel Cut Line

This document answers a narrower question than the general reorg docs:
if Content Machine becomes a skills library for Claude Code and Codex
CLI, with prompt-language flows and direct use of raw `ffmpeg` and
Remotion, **how much TypeScript should remain in-repo?**

Short answer: **far less than today, but not zero.**

Raw `ffmpeg`, Remotion, and prompt-language can replace most of the
repo-owned **control plane**. They do **not** replace the repo's
product-specific logic around caption semantics, audio/script
reconciliation, visual selection policy, reverse-engineering of winning
videos, and a small amount of quality logic. The right end state is a
**small TypeScript kernel** plus skills/flows, not a second monolithic
TypeScript orchestration stack.

## 1. Decision

Use this cut line when deciding whether a TypeScript surface stays:

- **Archive first** if the file is mainly command glue, pipeline
  orchestration, provider wrapping, discovery/catalog convenience, or a
  shell around an external binary or API.
- **Keep as kernel** if the file contains repo-specific media logic that
  would be tedious, fragile, or quality-losing to re-express directly in
  prompt-language or raw shell commands.
- **Borderline** if the current implementation is custom but shallow
  enough that it could move into prompt-language, plain shell, or an
  off-the-shelf evaluator after the kernel is stable.

## 2. What raw tools replace well

Skills should prefer direct use of:

- `ffmpeg` and `ffprobe` for probing, trimming, muxing, loudness passes,
  scene extraction, and simple validation.
- Remotion for composition/render execution.
- prompt-language for sequencing, retries, branching, and run-folder
  orchestration.
- Standard JSON files and markdown contracts for skill inputs, outputs,
  and human-facing playbooks.

This means the repo does **not** need a large TypeScript layer for:

- end-to-end pipeline orchestration,
- stage-to-stage command plumbing,
- skill discovery/catalog convenience,
- CLI compatibility beyond a thin shell,
- adapter wrappers whose only job is to call an external binary or API.

## 3. Archive First

These areas are the strongest archive targets because they mostly encode
the old control plane.

### 3.1 Legacy CLI and workflow control plane

- `src/cli/commands/generate.ts`
- `src/cli/commands/generate-defaults.ts`
- `src/cli/commands/generate-output.ts`
- `src/cli/commands/generate-preflight.ts`
- `src/core/pipeline.ts`
- `src/workflows/dev.ts`
- `src/workflows/installer.ts`
- `src/workflows/registry.ts`
- `src/workflows/runner.ts`

Reason: these files mostly stitch stages together, manage retries,
merge defaults, and decide run topology. That belongs in flows plus
skill playbooks, not in a repo-owned TypeScript super-orchestrator.

### 3.2 Concrete harness wrappers

- `src/harness/generate-short.ts`
- `src/harness/brief-to-script.ts`
- `src/harness/ingest.ts`
- `src/harness/publish-prep.ts`
- `src/harness/script-to-audio.ts`
- `src/harness/timestamps-to-visuals.ts`
- `src/harness/video-render.ts`
- `src/harness/skill-catalog.ts`
- `src/harness/flow-catalog.ts`
- `src/harness/flow-runner.ts`

Reason: these are a transitional compatibility layer. If `skills/` and
`flows/` are the primary surface, the repo should not keep duplicating
that topology in TypeScript.

### 3.3 Thin adapters and wrapper analyzers

- `src/audio/tts/index.ts`
- `src/audio/tts/elevenlabs.ts`
- `src/audio/asr/gemini-asr.ts`
- `src/audio/asr/elevenlabs-forced-alignment.ts`
- `src/visuals/providers/*.ts`
- `src/visuals/provider-router.ts`
- `src/validate/ffprobe.ts`
- `src/validate/ffprobe-audio.ts`
- `src/validate/python-probe.ts`
- `src/validate/python-json.ts`
- `src/validate/validate.ts`
- `src/validate/quality.ts`
- `src/validate/temporal.ts`
- `src/validate/audio-signal.ts`
- `src/validate/scene-detect.ts`
- `src/validate/safety.ts`
- `src/validate/freeze.ts`
- `src/validate/flow-consistency.ts`
- `src/validate/content-type.ts`
- `src/evaluate/evaluator.ts`
- `src/evaluate/batch.ts`
- `src/evaluate/diversity.ts`
- `src/score/dnsmos.ts`
- `src/score/image-reward.ts`
- `src/score/video-reward.ts`
- `src/score/intern-video.ts`
- `src/score/semantic-fidelity.ts`
- `src/videospec/ingest.ts`

Reason: most of these call an external engine, collect a result, and
package it. They do not justify permanent kernel status unless a specific
wrapper is proven necessary for portability.

### 3.4 Product surfaces already outside the target shape

- `src/lab/`
- `src/package/`
- `src/publish/`
- `src/server/mcp/`
- most of `src/core/doctor/`

Reason: these are not the center of a Claude Code / Codex skill library.
They can remain as migration aids or compatibility shims, but they are
not part of the long-term kernel.

## 4. Keep As The Minimal TypeScript Kernel

These areas contain product logic that raw `ffmpeg`, raw Remotion, or
prompt-language do not give us for free.

### 4.1 Contracts and machine boundaries

- `src/domain/ids.ts`
- `src/domain/doctor.ts`
- the extracted contracts surface described in `03-reorg-synthesis.md`
- `src/harness/json-stdio.ts`
- `src/harness/artifacts.ts`
- `src/harness/skill-manifest.ts`
- `src/harness/flow-manifest.ts`
- `src/core/errors.ts`
- `src/core/retry.ts`
- `src/core/require.ts`

Reason: even in a skills-first repo, the machine boundary needs stable
contracts, JSON parsing, artifact IO, and a minimal error model.

### 4.2 Render core that is more than "call Remotion"

- `src/render/service.ts`
- `src/render/audio-mix.ts`
- `src/render/templates/index.ts`
- `src/render/templates/remotion.ts`
- `src/render/templates/slots.ts`
- `src/render/templates/deps.ts`
- `src/render/captions/config.ts`
- `src/render/captions/presets.ts`
- `src/render/captions/paging.ts`
- `src/render/captions/chunking.ts`
- `src/render/captions/timing.ts`
- `src/render/captions/notation.ts`
- `src/render/captions/Caption.tsx`
- `src/render/remotion/ShortVideo.tsx`
- `src/render/remotion/visuals.tsx`
- `src/render/remotion/ListBadges.tsx`
- `src/render/remotion/SplitScreenGameplay.tsx`
- `src/render/remotion/split-screen-layout.ts`
- `src/render/assets/visual-asset-bundler.ts`

Reason: this is where the repo's caption behavior, template safety,
asset normalization, and composition semantics live. Raw Remotion will
render frames; it will not recreate these decisions by itself.

### 4.3 Audio alignment and sync logic

- `src/audio/alignment.ts`
- `src/audio/asr/post-processor.ts`
- `src/audio/asr/reconcile.ts`
- `src/audio/asr/script-match.ts`
- `src/audio/asr/validator.ts`
- `src/audio/sync/drift.ts`
- `src/audio/sync/strategies/standard.ts`
- `src/audio/sync/strategies/audio-first.ts`
- `src/audio/mix/planner.ts`
- `src/audio/mix/presets.ts`

Reason: these files encode the repo's quality bar for script/audio
reconciliation and caption timing. That is product logic, not just an
adapter layer.

### 4.4 Visual matching policy

- `src/visuals/matcher.ts`
- `src/visuals/keywords.ts`
- `src/visuals/duration.ts`
- `src/visuals/gameplay.ts`

Reason: provider SDKs can fetch candidates, but they do not decide how
to map beats to visuals, when to prefer gameplay, or how to manage
coverage and fallback strategy.

### 4.5 Reverse-engineering substrate

- `src/videospec/analyze.ts`
- `src/videospec/features.ts`
- `src/videospec/cache.ts`
- `src/videointel/classify.ts`
- `src/videointel/blueprint.ts`
- `src/videointel/compare.ts`
- `src/videointel/blueprint-context.ts`

Reason: this is the hardest part to replace with prompt-language alone.
It is the repo's core capability for understanding winning reference
videos and turning them into structured strategy.

### 4.6 Small quality kernel worth keeping

- `src/score/sync-rater.ts`
- `src/score/burned-in-caption-quality.ts`
- `src/score/caption-quality.ts`
- `src/score/audio-quality.ts`
- `src/score/pacing-quality.ts`
- `src/score/paging-quality.ts`
- `src/score/engagement-quality.ts`
- `src/score/scorer.ts`
- `src/validate/frame-bounds.ts`

Reason: these are closer to repo-specific heuristics than to generic
probe wrappers. Keep them until there is evidence that a simpler eval
stack preserves quality.

## 5. Borderline Surfaces

These should not be expanded. Keep only if they are actively serving the
kernel while migration is underway.

- `src/script/generator.ts`
- `src/script/prompts/`
- `src/audio/pipeline.ts`
- `src/audio/asr/index.ts`
- `src/audio/tts/kokoro.ts`
- `src/visuals/evaluation.ts`
- `src/visuals/observability.ts`
- `src/evaluate/compare.ts`
- `src/evaluate/calibrator.ts`
- `src/evaluate/active-learning.ts`
- `src/evaluate/diversity.ts`
- `src/evaluate/preference-schema.ts`
- `src/validate/gates.ts`
- `src/validate/profiles.ts`
- `src/validate/cadence.ts`
- `src/score/timestamps.ts`
- `src/score/caption-diagnostics.ts`

Reason: these contain some useful logic, but they also lean heavily on
repo-owned orchestration or simple heuristics that may be better
expressed as prompt-language flows, plain shell tooling, or external
evaluation packs.

## 6. Migration rule for new work

When adding a new skill for Claude Code or Codex CLI:

1. Prefer markdown contracts plus direct shelling to `ffmpeg`,
   `ffprobe`, Remotion, or other stable binaries.
2. If shared logic is needed across skills, add it to the small
   TypeScript kernel only if it is truly repo-specific.
3. Do not add new TypeScript whose main job is to re-create flow control,
   retry logic, or command dispatch that prompt-language already owns.
4. Do not add a new provider wrapper unless it hides meaningful,
   reusable complexity.

## 7. Practical conclusion

The repo should move toward:

- **skills as the primary UX** for Claude Code and Codex CLI,
- **prompt-language flows** as the orchestration layer,
- **raw tools** for execution where possible,
- **a small TypeScript kernel** for media semantics, reverse
  engineering, and quality-critical logic,
- **archival of most orchestration TypeScript** once the replacement
  surface is proven.

That is the cut line. The goal is not "no TypeScript." The goal is
"no unnecessary TypeScript control plane."
