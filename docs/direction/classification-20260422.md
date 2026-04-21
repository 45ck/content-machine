---
document: classification-20260422
status: authoritative
ratified: 2026-04-22
scope: Phase 0 — freeze and classify
consumed-by: [phase-1-contracts, phase-2-runtime, phase-3-scripts, phase-4-skills, phase-5-cli-decision]
---

# Phase 0 Classification — Keep / Move / Archive / Delete

Authoritative freeze-and-classify table. **Does not move files.** Later
phases execute actions per row `phase` column.

Vocabulary: **keep** (stays in place) · **move** (path change, same concept) ·
**split** (divide across 2+ destinations) · **refactor** (logic change) ·
**archive** (to `archive/legacy-cli/<subdir>`) · **delete** (remove outright) ·
**decide-later** (open question blocking action).

See `03-reorg-synthesis.md` for the target architecture this classification
lands into, and `phases/phase-0-freeze-and-classify.md` for the Phase 0
entry/exit criteria.

## Summary counts

| action       | rows |
|--------------|-----:|
| keep         |   47 |
| move         |  118 |
| split        |    9 |
| refactor     |    4 |
| archive      |   83 |
| delete       |    2 |
| decide-later |   13 |
| **total**    |  **276** |

## src/cli/ core

CLI infrastructure. Most ergonomics keep; `runtime.ts` gets the critical
coupling fix in Phase 2.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/cli/index.ts | refactor | src/cli/index.ts | 3 | Shrink COMMAND_LOADERS to surviving commands |
| src/cli/runtime.ts | refactor | — | 2 | Delete `setCliRuntime`; pass context explicitly |
| src/cli/hooks.ts | keep | — | — | Commander preAction plumbing |
| src/cli/colors.ts | keep | — | — | CLI-local ergonomics |
| src/cli/format.ts | keep | — | — | CLI-local ergonomics |
| src/cli/output.ts | keep | — | — | CLI-local ergonomics |
| src/cli/progress.ts | keep | — | — | CLI-local ergonomics |
| src/cli/ui.ts | keep | — | — | CLI-local ergonomics |
| src/cli/inquirer.ts | keep | — | — | CLI-local ergonomics |
| src/cli/template-code.ts | keep | — | — | CLI-local ergonomics |
| src/cli/paths.ts | keep | — | — | CLI-local ergonomics |
| src/cli/utils.ts | keep | — | — | CLI-local ergonomics |
| src/cli/meta.ts | keep | — | — | CLI-local ergonomics |

## src/cli/commands/ — 43 subcommands

Minimal survivors: doctor, mcp, config, render. Everything else archives
to `archive/legacy-cli/commands/`.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/cli/commands/doctor.ts | keep | — | — | Host diagnostic — irreplaceable by harness |
| src/cli/commands/mcp.ts | keep | — | — | MCP adapter launcher |
| src/cli/commands/config.ts | keep | — | — | `cm config show` — debugging aid |
| src/cli/commands/render.ts | refactor | src/cli/commands/render.ts | 3 | Wrapper over `scripts/harness/render.ts` |
| src/cli/commands/annotate.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic surface — harness skill replaces |
| src/cli/commands/archetypes.ts | archive | archive/legacy-cli/commands/ | 4 | Registry op — moves to runtime API |
| src/cli/commands/assets.ts | archive | archive/legacy-cli/commands/ | 4 | Vendor refresh — replaced by flow |
| src/cli/commands/audio.ts | archive | archive/legacy-cli/commands/ | 3 | Stage-runner — replaced by harness script |
| src/cli/commands/bench.ts | archive | archive/legacy-cli/commands/ | 3 | Dev-only bench; keep impl, drop command |
| src/cli/commands/blueprint.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic — becomes skill |
| src/cli/commands/caption-quality-gate.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes flow gate |
| src/cli/commands/caption-quality.ts | archive | archive/legacy-cli/commands/ | 4 | Demoted to skill |
| src/cli/commands/captions.ts | archive | archive/legacy-cli/commands/ | 3 | Stage-runner |
| src/cli/commands/classify.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic |
| src/cli/commands/demo.ts | archive | archive/legacy-cli/commands/ | 4 | Marketing artefact |
| src/cli/commands/evaluate.ts | archive | archive/legacy-cli/commands/ | 3 | Replaced by evaluate-batch flow |
| src/cli/commands/extract-features.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/feedback.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic |
| src/cli/commands/frame-analyze.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/generate.ts | archive | archive/legacy-cli/commands/ | 3 | Replaced by generate-short flow |
| src/cli/commands/generate-defaults.ts | archive | archive/legacy-cli/commands/ | 3 | Helper for generate.ts |
| src/cli/commands/generate-output.ts | archive | archive/legacy-cli/commands/ | 3 | Helper |
| src/cli/commands/generate-preflight.ts | archive | archive/legacy-cli/commands/ | 3 | Helper → preflight-check flow |
| src/cli/commands/generate-quality.ts | archive | archive/legacy-cli/commands/ | 3 | Helper |
| src/cli/commands/generate-sync.ts | archive | archive/legacy-cli/commands/ | 3 | Helper |
| src/cli/commands/hooks.ts | archive | archive/legacy-cli/commands/ | 3 | Content-hook CLI → runtime API |
| src/cli/commands/import.ts | archive | archive/legacy-cli/commands/ | 3 | Importer CLI wrapper |
| src/cli/commands/init.ts | archive | archive/legacy-cli/commands/ | 4 | Scaffolding command |
| src/cli/commands/lab.ts | archive | archive/legacy-cli/commands/ | 4 | Launches src/lab (also archived) |
| src/cli/commands/media.ts | archive | archive/legacy-cli/commands/ | 3 | Stage-runner |
| src/cli/commands/package.ts | archive | archive/legacy-cli/commands/ | 3 | Runtime API instead |
| src/cli/commands/prompts.ts | archive | archive/legacy-cli/commands/ | 4 | Prompt registry CLI |
| src/cli/commands/publish.ts | archive | archive/legacy-cli/commands/ | 3 | Runtime API instead |
| src/cli/commands/qa.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic |
| src/cli/commands/quality-rank.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/quality-score.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/rate.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/research.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic — migrates to skill |
| src/cli/commands/retrieve.ts | archive | archive/legacy-cli/commands/ | 4 | Replaced by runtime API |
| src/cli/commands/score.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/script.ts | archive | archive/legacy-cli/commands/ | 3 | Stage-runner |
| src/cli/commands/setup.ts | archive | archive/legacy-cli/commands/ | 4 | Scaffolding |
| src/cli/commands/telemetry.ts | archive | archive/legacy-cli/commands/ | 4 | Agentic surface |
| src/cli/commands/templates.ts | archive | archive/legacy-cli/commands/ | 4 | Template CLI → runtime API |
| src/cli/commands/timestamps.ts | archive | archive/legacy-cli/commands/ | 3 | Stage-runner |
| src/cli/commands/validate.ts | archive | archive/legacy-cli/commands/ | 3 | Becomes flow + skill |
| src/cli/commands/videospec.ts | archive | archive/legacy-cli/commands/ | 4 | Becomes skill |
| src/cli/commands/visuals.ts | archive | archive/legacy-cli/commands/ | 3 | Stage-runner |
| src/cli/commands/workflows.ts | archive | archive/legacy-cli/commands/ | 4 | Entire workflows system replaced |

## src/core/

Split across `src/infra/` (cross-cutting), `src/adapters/` (external bridges),
`src/runtime/` (deterministic core).

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/core/config.ts | move+refactor | src/infra/config.ts | 2 | Drop CLI-global coupling |
| src/core/logger.ts | move | src/infra/logger.ts | 2 | Pino wrapper |
| src/core/errors.ts | move | src/infra/errors.ts | 2 | CMError type |
| src/core/retry.ts | move | src/infra/retry.ts | 2 | Generic retry util |
| src/core/require.ts | move | src/infra/require.ts | 2 | Dynamic require shim |
| src/core/events/ | move | src/infra/events/ | 2 | Emitter/observer infra |
| src/core/pipeline.ts | move | src/runtime/pipeline.ts | 2 | Runtime pipeline bus |
| src/core/pipeline.events.ts | move | src/runtime/pipeline.events.ts | 2 | Event defs |
| src/core/providers/ | move | src/adapters/providers/ | 2 | Provider-wrapping decorators |
| src/core/llm/ | move | src/adapters/llm/ | 2 | openai/anthropic/gemini clients |
| src/core/doctor/ | move | src/infra/doctor/ | 2 | Feeds `cm doctor` |
| src/core/assets/ | move | src/adapters/asr/whisper-assets/ | 2 | Whisper model mgmt |
| src/core/video/ | move | src/runtime/media/ | 2 | ffmpeg wrapper |
| src/core/ocr/ | move | src/adapters/ocr/ | 2 | Tesseract binding |
| src/core/text/ | move | src/runtime/text/ | 2 | Similarity utils |
| src/core/embeddings/ | move | src/runtime/embeddings/ | 2 | Pure embedder |
| src/core/retrieval/ | move | src/runtime/retrieval/ | 2 | Brute-force retrieval |

## src/domain/ (implicit contracts barrel)

Phase 1 lift — highest-risk mechanical move.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/domain/index.ts | refactor | src/contracts/index.ts | 1 | Contracts barrel |
| src/domain/ids.ts | move | src/contracts/ids.ts | 1 | Stable type |
| src/domain/doctor.ts | move | src/contracts/doctor.ts | 1 | Stable type |
| src/domain/render-templates.ts | move | src/contracts/render-templates.ts | 1 | Stable type |
| src/domain/repo-facts.generated.ts | move | src/contracts/generated/ | 1 | Generated — update gen script path |
| src/domain/ubiquitous-language.generated.ts | move | src/contracts/generated/ | 1 | Generated — update gen script path |

## src/types/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/types/kokoro-js.d.ts | move | src/contracts/ambient/kokoro-js.d.ts | 1 | Until kokoro-js ships types |

## src/script/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/script/schema.ts | split | src/contracts/script.ts + src/runtime/script/ | 1 | Types vs runtime |
| src/script/generator.ts | move | src/runtime/script/generator.ts | 2 | Calls adapter/llm |
| src/script/blueprint-compliance.ts | move | src/runtime/script/blueprint-compliance.ts | 2 | Deterministic helper |
| src/script/sanitize.ts | move | src/runtime/script/sanitize.ts | 2 | Deterministic helper |
| src/script/research-context.ts | move | src/runtime/script/research-context.ts | 2 | Consumer of adapters/research |
| src/script/prompts/ | move | src/prompts/script/ | 2 | Consolidate prompts |

## src/audio/

Split: runtime deterministic code stays, TTS/ASR providers move to adapters.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/audio/pipeline.ts | move | src/runtime/audio/pipeline.ts | 2 | Runtime entry |
| src/audio/alignment.ts | move | src/runtime/audio/alignment.ts | 2 | Deterministic |
| src/audio/schema.ts | split | src/contracts/audio.ts + src/runtime/audio/ | 1 | — |
| src/audio/tts/ | move | src/adapters/tts/ | 2 | kokoro/elevenlabs clients |
| src/audio/tts/kokoro.ts | move | src/adapters/tts/kokoro.ts | 2 | External TTS |
| src/audio/tts/elevenlabs.ts | move | src/adapters/tts/elevenlabs.ts | 2 | External TTS |
| src/audio/tts/text-chunking.ts | move | src/adapters/tts/text-chunking.ts | 2 | Provider util |
| src/audio/tts/types.ts | move | src/contracts/tts.ts | 1 | Type defs |
| src/audio/tts/index.ts | move | src/adapters/tts/index.ts | 2 | Barrel |
| src/audio/asr/whisper-cpp/ | move | src/adapters/asr/whisper-cpp/ | 2 | External ASR |
| src/audio/asr/gemini-asr.ts | move | src/adapters/asr/gemini-asr.ts | 2 | External ASR |
| src/audio/asr/elevenlabs-forced-alignment.ts | move | src/adapters/asr/elevenlabs-forced-alignment.ts | 2 | External |
| src/audio/asr/post-processor.ts | move | src/runtime/audio/asr/post-processor.ts | 2 | Deterministic |
| src/audio/asr/reconcile.ts | move | src/runtime/audio/asr/reconcile.ts | 2 | Deterministic |
| src/audio/asr/script-match.ts | move | src/runtime/audio/asr/script-match.ts | 2 | Deterministic |
| src/audio/asr/validator.ts | move | src/runtime/audio/asr/validator.ts | 2 | Deterministic |
| src/audio/asr/index.ts | move | src/runtime/audio/asr/index.ts | 2 | Barrel |
| src/audio/sync/ | move | src/runtime/audio/sync/ | 2 | Deterministic |
| src/audio/mix/ | move | src/runtime/audio/mix/ | 2 | Deterministic |
| src/audio/mix/schema.ts | split | src/contracts/mix.ts + src/runtime/audio/mix/ | 1 | Type lift |

## src/visuals/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/visuals/schema.ts | split | src/contracts/visuals.ts + src/runtime/visuals/ | 1 | — |
| src/visuals/matcher.ts | move | src/runtime/visuals/matcher.ts | 2 | Deterministic |
| src/visuals/duration.ts | move | src/runtime/visuals/duration.ts | 2 | Deterministic |
| src/visuals/keywords.ts | move | src/runtime/visuals/keywords.ts | 2 | Deterministic |
| src/visuals/evaluation.ts | move | src/runtime/visuals/evaluation.ts | 2 | Deterministic |
| src/visuals/observability.ts | move | src/runtime/visuals/observability.ts | 2 | Deterministic |
| src/visuals/gameplay.ts | move | src/runtime/visuals/gameplay.ts | 2 | Deterministic |
| src/visuals/provider-router.ts | move | src/runtime/visuals/provider-router.ts | 2 | Deterministic |
| src/visuals/motion/ | move | src/runtime/visuals/motion/ | 2 | Deterministic |
| src/visuals/providers/pexels*.ts | move | src/adapters/visuals/pexels.ts | 2 | External API |
| src/visuals/providers/pixabay*.ts | move | src/adapters/visuals/pixabay.ts | 2 | External API |
| src/visuals/providers/nanobanana-provider.ts | move | src/adapters/visuals/nanobanana.ts | 2 | External |
| src/visuals/providers/local-provider.ts | move | src/adapters/visuals/local.ts | 2 | Local fs provider |
| src/visuals/providers/local-image-provider.ts | move | src/adapters/visuals/local-image.ts | 2 | Local fs provider |
| src/visuals/providers/mock-provider.ts | move | src/adapters/visuals/mock.ts | 2 | Test double |
| src/visuals/providers/types.ts | move | src/contracts/visuals-provider.ts | 1 | Type defs |
| src/visuals/providers/index.ts | move | src/adapters/visuals/index.ts | 2 | Barrel |

## src/render/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/render/schema.ts | split | src/contracts/render.ts + src/runtime/render/ | 1 | — |
| src/render/service.ts | move | src/runtime/render/service.ts | 2 | Render entry |
| src/render/audio-mix.ts | move | src/runtime/render/audio-mix.ts | 2 | Runtime |
| src/render/index.ts | move | src/runtime/render/index.ts | 2 | Barrel |
| src/render/template-sdk.ts | move | src/runtime/render/template-sdk.ts | 2 | Template API |
| src/render/remotion/ | move | src/runtime/render/remotion/ | 2 | Remotion compositions (tsx) |
| src/render/templates/ | move | src/runtime/render/templates/ | 2 | Registry + installer |
| src/render/captions/ | move | src/runtime/render/captions/ | 2 | Caption pipeline |
| src/render/presets/ | move | src/runtime/render/presets/ | 2 | Style presets |
| src/render/styles/ | move | src/runtime/render/styles/ | 2 | — |
| src/render/themes/ | move | src/runtime/render/themes/ | 2 | — |
| src/render/tokens/ | move | src/runtime/render/tokens/ | 2 | Design tokens |
| src/render/assets/ | move | assets/render/ | 2 | Static assets out of src/ |

## src/media/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/media/schema.ts | split | src/contracts/media.ts + src/runtime/media/ | 1 | — |
| src/media/service.ts | move | src/runtime/media/service.ts | 2 | Runtime |
| src/media/synthesis/orchestrator.ts | move | src/runtime/media/synthesis/orchestrator.ts | 2 | Runtime |
| src/media/synthesis/registry.ts | move | src/runtime/media/synthesis/registry.ts | 2 | — |
| src/media/synthesis/types.ts | move | src/contracts/media-synthesis.ts | 1 | Type defs |
| src/media/synthesis/google-auth.ts | move | src/adapters/media-synthesis/google-auth.ts | 2 | External |
| src/media/synthesis/http.ts | move | src/adapters/media-synthesis/http.ts | 2 | External HTTP |
| src/media/synthesis/adapters/ | move | src/adapters/media-synthesis/ | 2 | Veo/Nanobanana/DepthFlow |

## src/videospec/ + src/videointel/

Merge into one location. Two modules doing the same work.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/videospec/schema.ts | split | src/contracts/videospec.ts + src/runtime/videospec/ | 1 | V1 namespace |
| src/videospec/analyze.ts | move | src/runtime/videospec/analyze.ts | 2 | Merge target |
| src/videospec/features.ts | move | src/runtime/videospec/features.ts | 2 | — |
| src/videospec/cache.ts | move | src/runtime/videospec/cache.ts | 2 | — |
| src/videospec/ingest.ts | move | src/runtime/videospec/ingest.ts | 2 | — |
| src/videospec/index.ts | move | src/runtime/videospec/index.ts | 2 | Barrel |
| src/videointel/schema.ts | split | src/contracts/videospec.ts (merged) | 1 | Merge into videospec contract |
| src/videointel/blueprint.ts | move | src/runtime/videospec/blueprint.ts | 2 | Merge |
| src/videointel/blueprint-context.ts | move | src/runtime/videospec/blueprint-context.ts | 2 | Merge |
| src/videointel/classify.ts | move | src/runtime/videospec/classify.ts | 2 | Merge |
| src/videointel/compare.ts | move | src/runtime/videospec/compare.ts | 2 | Merge |
| src/videointel/test-fixtures.ts | move | fixtures/videospec/ | 2 | Promote to top-level fixtures |
| src/videointel/index.ts | delete | — | 2 | Merge duplicates videospec index |

## src/validate/

All runtime; Python bridge preserved.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/validate/schema.ts | split | src/contracts/validate.ts + src/runtime/validate/ | 1 | — |
| src/validate/cadence.ts | move | src/runtime/validate/cadence.ts | 2 | Deterministic |
| src/validate/ffprobe.ts | move | src/runtime/validate/ffprobe.ts | 2 | Deterministic |
| src/validate/ffprobe-audio.ts | move | src/runtime/validate/ffprobe-audio.ts | 2 | Deterministic |
| src/validate/flow-consistency.ts | move | src/runtime/validate/flow-consistency.ts | 2 | — |
| src/validate/frame-bounds.ts | move | src/runtime/validate/frame-bounds.ts | 2 | — |
| src/validate/freeze.ts | move | src/runtime/validate/freeze.ts | 2 | — |
| src/validate/gates.ts | move | src/runtime/validate/gates.ts | 2 | Flow gate impls |
| src/validate/profiles.ts | move | src/runtime/validate/profiles.ts | 2 | — |
| src/validate/python-json.ts | move | src/runtime/validate/python-json.ts | 2 | Python bridge |
| src/validate/python-probe.ts | move | src/runtime/validate/python-probe.ts | 2 | Update script path |
| src/validate/quality.ts | move | src/runtime/validate/quality.ts | 2 | — |
| src/validate/safety.ts | move | src/runtime/validate/safety.ts | 2 | — |
| src/validate/scene-detect.ts | move | src/runtime/validate/scene-detect.ts | 2 | Python bridge |
| src/validate/temporal.ts | move | src/runtime/validate/temporal.ts | 2 | — |
| src/validate/validate.ts | move | src/runtime/validate/validate.ts | 2 | — |
| src/validate/video-info.ts | move | src/runtime/validate/video-info.ts | 2 | — |
| src/validate/audio-signal.ts | move | src/runtime/validate/audio-signal.ts | 2 | — |
| src/validate/content-type.ts | move | src/runtime/validate/content-type.ts | 2 | — |

## src/score/ and src/quality-score/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/score/schema.ts | split | src/contracts/score.ts + src/runtime/score/ | 1 | — |
| src/score/sync-schema.ts | move | src/contracts/sync.ts | 1 | Sync type defs |
| src/score/ (remaining ~19 scorers) | move | src/runtime/score/ | 2 | DNSMOS, image/video reward, engagement, pacing, semantic, sync |
| src/quality-score/feature-schema.ts | move | src/contracts/quality-score.ts | 1 | Type defs |
| src/quality-score/label-schema.ts | move | src/contracts/quality-score.ts | 1 | Type defs |
| src/quality-score/feature-extractor.ts | move | src/runtime/score/ml/feature-extractor.ts | 2 | — |
| src/quality-score/scorer.ts | move | src/runtime/score/ml/scorer.ts | 2 | — |
| src/quality-score/index.ts | move | src/runtime/score/ml/index.ts | 2 | Barrel |

## src/evaluate/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/evaluate/schema.ts | split | src/contracts/evaluate.ts + src/runtime/evaluate/ | 1 | — |
| src/evaluate/preference-schema.ts | move | src/contracts/preference.ts | 1 | Type defs |
| src/evaluate/active-learning.ts | move | src/runtime/evaluate/active-learning.ts | 2 | — |
| src/evaluate/batch.ts | archive | archive/legacy-cli/evaluate-batch/ | 3 | Replaced by evaluate-batch flow |
| src/evaluate/calibrator.ts | move | src/runtime/evaluate/calibrator.ts | 2 | — |
| src/evaluate/compare.ts | move | src/runtime/evaluate/compare.ts | 2 | — |
| src/evaluate/diversity.ts | move | src/runtime/evaluate/diversity.ts | 2 | — |
| src/evaluate/evaluator.ts | move | src/runtime/evaluate/evaluator.ts | 2 | Per-item scorer (keep) |
| src/evaluate/index.ts | move | src/runtime/evaluate/index.ts | 2 | Barrel |

## src/research/ — SPLIT

Orchestrator archives (replaced by skill); adapters move.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/research/schema.ts | move | src/contracts/research.ts | 1 | Type defs |
| src/research/orchestrator.ts | archive | archive/legacy-cli/research/ | 4 | Replaced by research skill |
| src/research/indexer.ts | archive | archive/legacy-cli/research/ | 4 | Replaced by skill |
| src/research/index.ts | archive | archive/legacy-cli/research/ | 4 | Barrel for archived surface |
| src/research/tools/hackernews.ts | move | src/adapters/research/hackernews.ts | 2 | External API |
| src/research/tools/reddit.ts | move | src/adapters/research/reddit.ts | 2 | External API |
| src/research/tools/tavily.ts | move | src/adapters/research/tavily.ts | 2 | External API |
| src/research/tools/web-search.ts | move | src/adapters/research/web-search.ts | 2 | External API |
| src/research/tools/base-tool.ts | move | src/adapters/research/base-tool.ts | 2 | Shared base |
| src/research/tools/types.ts | move | src/contracts/research-tool.ts | 1 | Type defs |
| src/research/tools/index.ts | move | src/adapters/research/index.ts | 2 | Barrel |

## src/feedback/, src/policy/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/feedback/schema.ts | move | src/contracts/feedback.ts | 1 | Type defs |
| src/feedback/store.ts | move | src/runtime/feedback/store.ts | 2 | JSONL store |
| src/policy/schema.ts | move | src/contracts/policy.ts | 1 | Type defs |

## src/hooks/ — content-hook openers (not git hooks)

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/hooks/schema.ts | move | src/contracts/openers.ts | 1 | Rename to avoid "hooks" overload |
| src/hooks/constants.ts | move | src/runtime/openers/constants.ts | 2 | — |
| src/hooks/download.ts | move | src/runtime/openers/download.ts | 2 | — |
| src/hooks/resolve.ts | move | src/runtime/openers/resolve.ts | 2 | — |
| src/hooks/libraries/ | move | src/runtime/openers/libraries/ | 2 | — |
| src/hooks/index.ts | move | src/runtime/openers/index.ts | 2 | Barrel |

## src/archetypes/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/archetypes/schema.ts | move | src/contracts/archetypes.ts | 1 | Type defs |
| src/archetypes/types.ts | move | src/contracts/archetypes-types.ts | 1 | Type defs |
| src/archetypes/registry.ts | move | src/runtime/archetypes/registry.ts | 2 | — |
| src/archetypes/installer.ts | move | src/runtime/archetypes/installer.ts | 2 | — |
| src/archetypes/dev.ts | move | src/runtime/archetypes/dev.ts | 2 | — |

## src/workflows/ — ALL ARCHIVE

Replaced by prompt-language flows. Single biggest deletion in the plan.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/workflows/schema.ts | archive | archive/legacy-cli/workflows/ | 4 | Duplicate orchestration |
| src/workflows/runner.ts | archive | archive/legacy-cli/workflows/ | 4 | Reimplements spawn+timeout |
| src/workflows/registry.ts | archive | archive/legacy-cli/workflows/ | 4 | — |
| src/workflows/resolve.ts | archive | archive/legacy-cli/workflows/ | 4 | — |
| src/workflows/installer.ts | archive | archive/legacy-cli/workflows/ | 4 | — |
| src/workflows/dev.ts | archive | archive/legacy-cli/workflows/ | 4 | — |

## src/prompts/, src/importers/, src/package/, src/publish/, src/bench/, src/analysis/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/prompts/types.ts | move | src/contracts/prompts.ts | 1 | Type defs |
| src/prompts/registry.ts | move | src/prompts/registry.ts | 2 | Consolidate at top-level src/prompts/ |
| src/prompts/index.ts | move | src/prompts/index.ts | 2 | Barrel |
| src/prompts/sources/ | move | src/prompts/sources/ | 2 | Keep |
| src/prompts/templates/ | move | src/prompts/templates/ | 2 | Keep |
| src/prompts/README.md | keep | — | — | Docs |
| src/importers/timestamps.ts | move | src/runtime/importers/timestamps.ts | 2 | Thin adapter |
| src/importers/visuals.ts | move | src/runtime/importers/visuals.ts | 2 | Thin adapter |
| src/package/schema.ts | move | src/contracts/package.ts | 1 | Type defs |
| src/package/generator.ts | move | src/runtime/package/generator.ts | 2 | — |
| src/publish/schema.ts | move | src/contracts/publish.ts | 1 | Type defs |
| src/publish/generator.ts | move | src/runtime/publish/generator.ts | 2 | — |
| src/bench/types.ts | move | src/contracts/bench.ts | 1 | Type defs |
| src/bench/ffmpeg.ts | move | scripts/harness/bench/ffmpeg.ts | 3 | Demote to harness script |
| src/bench/generate.ts | move | scripts/harness/bench/generate.ts | 3 | Demote |
| src/bench/recipes.ts | move | scripts/harness/bench/recipes.ts | 3 | Demote |
| src/bench/run.ts | move | scripts/harness/bench/run.ts | 3 | Demote |
| src/bench/stats.ts | move | scripts/harness/bench/stats.ts | 3 | Demote |
| src/analysis/frame-analysis.ts | move | src/runtime/analysis/frame-analysis.ts | 2 | Single-file util |

## src/server/mcp/ — becomes src/adapters/mcp/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/server/mcp/server.ts | move | src/adapters/mcp/server.ts | 2 | MCP is an adapter |
| src/server/mcp/tools.ts | move | src/adapters/mcp/tools.ts | 2 | Tool exposure |
| src/server/mcp/session-store.ts | move+refactor | src/adapters/mcp/session-store.ts | 2 | Drop CLI coupling |
| src/server/mcp/fastmcp.ts | move | src/adapters/mcp/fastmcp.ts | 2 | — |
| src/server/mcp/index.ts | move | src/adapters/mcp/index.ts | 2 | Barrel + launchable entry |

## src/lab/ — ALL ARCHIVE

10-file HTTP review UI. Replaced by `publish-prep-review` skill in Phase 4.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/lab/server/ | archive | archive/legacy-cli/lab/ | 4 | HTTP server |
| src/lab/session/ | archive | archive/legacy-cli/lab/ | 4 | Session mgmt |
| src/lab/stores/ | archive | archive/legacy-cli/lab/ | 4 | Experiments store |
| src/lab/services/ | archive | archive/legacy-cli/lab/ | 4 | Services |
| src/lab/security/ | archive | archive/legacy-cli/lab/ | 4 | Security middleware |
| src/lab/metrics/ | archive | archive/legacy-cli/lab/ | 4 | Metrics |
| src/lab/feedback/ | archive | archive/legacy-cli/lab/ | 4 | Feedback subsystem |
| src/lab/schema/ | archive | archive/legacy-cli/lab/ | 4 | Lab-specific schema |
| src/lab/paths.ts | archive | archive/legacy-cli/lab/ | 4 | — |

## src/demo/, src/test/, src/index.ts

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| src/demo/runner.ts | archive | archive/legacy-cli/demo/ | 4 | Marketing artefact |
| src/test/stubs/ | keep | — | — | FakeLLMProvider etc. |
| src/test/fixtures/ | move | fixtures/ | 2 | Promote to top-level |
| src/index.ts | refactor | src/index.ts | 6 | Re-scope exports to contracts+runtime |

## connectors/, registry/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| connectors/mcp-reddit/ | keep | — | — | Vendored third-party; add VENDORED.md in Phase 2 |
| registry/repo-facts.yaml | keep | — | — | Canonical source |
| registry/ubiquitous-language.yaml | keep | — | — | Canonical source |

## templates/ (top-level) — ALL ARCHIVE

Third-party reference repos nothing imports.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| templates/Short-Video-Creator/ | archive | archive/legacy-cli/templates/ | 4 | Python reference project |
| templates/template-audiogram/ | archive | archive/legacy-cli/templates/ | 4 | Remotion template reference |
| templates/template-overlay/ | archive | archive/legacy-cli/templates/ | 4 | Remotion template reference |
| templates/template-tiktok-base/ | archive | archive/legacy-cli/templates/ | 4 | Remotion template reference |
| templates/vidosy/ | archive | archive/legacy-cli/templates/ | 4 | External tool reference |

## scripts/ — reorganise

### Python runtime dependencies (19 files) → scripts/python/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| scripts/audio_quality.py | move | scripts/python/audio_quality.py | 3 | Runtime dep (via python-probe) |
| scripts/clip_embeddings.py | move | scripts/python/clip_embeddings.py | 3 | Runtime dep |
| scripts/dnsmos_score.py | move | scripts/python/dnsmos_score.py | 3 | Runtime dep |
| scripts/flow_warp_error.py | move | scripts/python/flow_warp_error.py | 3 | Runtime dep |
| scripts/freeze_detect.py | move | scripts/python/freeze_detect.py | 3 | Runtime dep |
| scripts/image_reward.py | move | scripts/python/image_reward.py | 3 | Runtime dep |
| scripts/intern_video.py | move | scripts/python/intern_video.py | 3 | Runtime dep |
| scripts/onnx_inference.py | move | scripts/python/onnx_inference.py | 3 | Runtime dep |
| scripts/preference_server.py | move | scripts/python/preference_server.py | 3 | Preference loop server |
| scripts/safety_check.py | move | scripts/python/safety_check.py | 3 | Runtime dep |
| scripts/scene_detect.py | move | scripts/python/scene_detect.py | 3 | Runtime dep |
| scripts/semantic_similarity.py | move | scripts/python/semantic_similarity.py | 3 | Runtime dep |
| scripts/temporal_quality.py | move | scripts/python/temporal_quality.py | 3 | Runtime dep |
| scripts/text_embeddings.py | move | scripts/python/text_embeddings.py | 3 | Runtime dep |
| scripts/train_calibrator.py | move | scripts/python/train_calibrator.py | 3 | ML training |
| scripts/train_quality_scorer.py | move | scripts/python/train_quality_scorer.py | 3 | ML training |
| scripts/video_info.py | move | scripts/python/video_info.py | 3 | Runtime dep |
| scripts/video_quality.py | move | scripts/python/video_quality.py | 3 | Runtime dep |
| scripts/video_reward.py | move | scripts/python/video_reward.py | 3 | Runtime dep |

### Code-gen → scripts/gen/ · Ops → scripts/ops/ · Dev → scripts/dev/ · Quality → scripts/quality/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| scripts/gen-cspell.mjs | move | scripts/gen/gen-cspell.mjs | 3 | Regen spellcheck |
| scripts/gen-glossary.mjs | move | scripts/gen/gen-glossary.mjs | 3 | Regen glossary |
| scripts/gen-repo-facts.mjs | move | scripts/gen/gen-repo-facts.mjs | 3 | Regen repo facts |
| scripts/gen-ubiquitous-language-ts.mjs | move | scripts/gen/gen-ubiquitous-language-ts.mjs | 3 | Regen lang barrel |
| scripts/lib/ | move | scripts/gen/lib/ | 3 | Shared by gen scripts |
| scripts/postinstall.mjs | move | scripts/ops/postinstall.mjs | 3 | npm postinstall |
| scripts/install-whisper.ts | move | scripts/ops/install-whisper.ts | 3 | Whisper model installer |
| scripts/sync-hooks.ts | move | scripts/ops/sync-hooks.ts | 3 | Husky/git sync |
| scripts/vendor.ps1 | move | scripts/ops/vendor.ps1 | 3 | Vendor refresh (Win) |
| scripts/vendor.sh | move | scripts/ops/vendor.sh | 3 | Vendor refresh (nix) |
| scripts/download-gameplay.ps1 | move | scripts/ops/download-gameplay.ps1 | 3 | Gameplay assets |
| scripts/download-gameplay.sh | move | scripts/ops/download-gameplay.sh | 3 | Gameplay assets |
| scripts/make-demo-gif.sh | move | scripts/ops/make-demo-gif.sh | 3 | Demo asset builder |
| scripts/generate-gameplay-placeholder.sh | move | scripts/ops/generate-gameplay-placeholder.sh | 3 | Fallback gen |
| scripts/debug-hook.ts | move | scripts/dev/debug-hook.ts | 3 | Author debug |
| scripts/debug-timestamps.ts | move | scripts/dev/debug-timestamps.ts | 3 | Author debug |
| scripts/test-angles.ts | move | scripts/dev/test-angles.ts | 3 | One-off |
| scripts/phoenix-loop-caption-sweep.ts | archive | archive/legacy-cli/scripts/ | 4 | Replaced by caption-sweep flow |
| scripts/render-caption-demo.ts | move | scripts/dev/render-caption-demo.ts | 3 | Author demo |
| scripts/trace-spawn.cjs | move | scripts/dev/trace-spawn.cjs | 3 | Trace util |
| scripts/review-latest.mjs | move | scripts/dev/review-latest.mjs | 3 | Author aid |
| scripts/qa/extract-screenshots.mjs | move | scripts/dev/extract-screenshots.mjs | 3 | QA aid |
| scripts/test/ (smoke tests *.ts) | move | scripts/dev/smoke/ | 3 | Rename: smoke harnesses, not unit tests |
| scripts/quality/ | keep | — | — | Unchanged |
| scripts/run-vitest.mjs | move | scripts/quality/run-vitest.mjs | 3 | Test runner |
| scripts/vitest/coverage-provider.mjs | move | scripts/quality/coverage-provider.mjs | 3 | Vitest shim |

## examples/, experiments/, evals/, evaluations/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| examples/complex-plane-rotation/ | move | fixtures/examples/complex-plane-rotation/ | 2 | Promote to top-level fixtures |
| experiments/complex-plane-rotation/ | archive | archive/legacy-cli/experiments/ | 4 | Duplicate of examples — confirm no uniques first |
| evals/configs/ | keep | — | — | Promptfoo configs |
| evals/rubrics/ | keep | — | — | Eval rubrics |
| evals/datasets/ | keep | — | — | Datasets |
| evals/results/ | keep | — | — | Captured eval runs |
| evals/README.md | keep | — | — | Docs |
| evaluations/*.json (10 files) | decide-later | — | 0 | Golden fixture or captured run? resolve collectively |

Default if unresolved in Phase 0: move to `output/evaluations/` (gitignored)
if captured runs; to `fixtures/showcase/` if referenced by tests.

## tasks/ — ARCHIVE

Pre-beads file-based tracker. AGENTS.md says use beads now.

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| tasks/todo/ | archive | archive/legacy-cli/tasks/ | 4 | Superseded by beads |
| tasks/in_progress/ | archive | archive/legacy-cli/tasks/ | 4 | Superseded |
| tasks/done/ | archive | archive/legacy-cli/tasks/ | 4 | Superseded |
| tasks/blocked/ | archive | archive/legacy-cli/tasks/ | 4 | Superseded |
| tasks/templates/ | archive | archive/legacy-cli/tasks/ | 4 | Superseded |

## test-fixtures/, test-e2e-output/, tests/, vendor/, assets/, config/

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| test-fixtures/ | move | fixtures/ | 2 | Promote + merge with src/test/fixtures/ |
| test-e2e-output/ | decide-later | — | 0 | Likely captured output — should be gitignored? |
| tests/ | keep | — | — | Integration tests |
| vendor/ | keep | — | — | Vendored binaries/datasets |
| assets/ | keep | — | — | Fonts, archetypes, templates, lab, demo |
| config/cspell/ | keep | — | — | Build-time data |

## Root config files

| path | action | destination | phase | notes |
|------|--------|-------------|-------|-------|
| package.json | refactor | — | 6 | Update description + files field in Phase 6 |
| tsconfig*.json | keep | — | — | TS config |
| eslint.config.js | keep | — | — | Lint config |
| vitest.config.ts | keep | — | — | Test config |
| stryker.conf.json | keep | — | — | Mutation testing |
| .husky/ | keep | — | — | Git hooks |
| .github/ | keep | — | — | CI workflows |
| .prompt-language/ | keep | — | — | prompt-language state dir |
| README.md | refactor | — | 6 | Phase 6 rewrites harness-first |
| CHANGELOG.md | keep | — | — | Release history |
| DIRECTION.md | keep | — | — | Living doc |
| CLAUDE.md, AGENTS.md | keep | — | — | Harness docs |

## Decide-later register

Every decide-later row above needs resolution before its phase acts.
Summary:

| row | question | blocker for |
|-----|----------|-------------|
| evaluations/*.json (10) | captured runs or golden fixtures? | Phase 0 close |
| test-e2e-output/ | should this be gitignored? | Phase 0 close |
| experiments/videointel-* | any unique logic vs src/videointel/? | Phase 4 archive |
| src/lab/ | real users relying on review UI? | Phase 4 archive |
| docs/research/ | publish in npm tarball? | .npmignore policy |
| docs/direction/ | publish in npm tarball? | .npmignore policy |
| MCP server | does content-machine continue shipping one? | Phase 2 adapter scope |

## Not moved

This document classifies only. Phases 1–4 execute moves per the schedule in
`03-reorg-synthesis.md` and the beads epic `content-machine-7tf`.
