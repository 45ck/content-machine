○ content-machine-7tf ● P0 [epic] Adopt harness-first content runtime plan (2026-04-12 findings)
├── ○ content-machine-7tf.1 ● P0 Phase 0 — Freeze and classify current surface
│ ├── ○ content-machine-7tf.1.2 ● P1 Decide evaluations/_.json disposition (golden fixtures vs captured runs)
│ ├── ○ content-machine-7tf.1.3 ● P1 Decide test-e2e-output/ gitignore policy
│ ├── ○ content-machine-7tf.1.4 ● P1 Audit experiments/videointel-_ for unique logic vs src/videointel/
│ ├── ○ content-machine-7tf.1.5 ● P1 Audit src/lab/ for real users before Phase 4 archive
│ ├── ○ content-machine-7tf.1.6 ● P1 Decide docs/research/ npm-tarball publish policy
│ ├── ○ content-machine-7tf.1.7 ● P1 Decide docs/direction/ npm-tarball publish policy
│ ├── ○ content-machine-7tf.1.8 ● P1 Decide whether content-machine continues shipping an MCP server
│ ├── ○ content-machine-7tf.1.9 ● P1 Mark Phase 0 complete once all decide-later questions resolved
│ └── ✓ content-machine-7tf.1.1 ● P2 task TEST bead - delete me
├── ○ content-machine-7tf.2 ● P0 Phase 1 — Extract typed content contracts
│ ├── ○ content-machine-7tf.2.1 ● P1 Create src/contracts/ scaffold with public barrel index.ts
│ ├── ○ content-machine-7tf.2.11 ● P1 Merge videospec + videointel schemas into src/contracts/videospec.ts
│ ├── ○ content-machine-7tf.2.2 ● P1 Lift src/domain/_ to src/contracts/ (ids, doctor, render-templates, generated)
│ ├── ○ content-machine-7tf.2.3 ● P1 Lift src/script/schema.ts to src/contracts/script.ts (types out, runtime refs updated)
│ ├── ○ content-machine-7tf.2.32 ● P1 Remove runtime deps from src/contracts/ (no imports from infra/runtime/adapters)
│ ├── ○ content-machine-7tf.2.33 ● P1 Update all importers across src/ to reference src/contracts/
│ ├── ○ content-machine-7tf.2.34 ● P1 tsc green after Phase 1 schema lift (exit criteria)
│ ├── ○ content-machine-7tf.2.4 ● P1 Lift audio schema to src/contracts/audio.ts
│ ├── ○ content-machine-7tf.2.6 ● P1 Lift visuals schema to src/contracts/visuals.ts
│ ├── ○ content-machine-7tf.2.8 ● P1 Lift render schema to src/contracts/render.ts
│ ├── ○ content-machine-7tf.2.9 ● P1 Lift media schema to src/contracts/media.ts
│ ├── ○ content-machine-7tf.2.10 ● P2 Lift media-synthesis schema to src/contracts/media-synthesis.ts
│ ├── ○ content-machine-7tf.2.12 ● P2 Lift validate schema to src/contracts/validate.ts
│ ├── ○ content-machine-7tf.2.13 ● P2 Lift score schema to src/contracts/score.ts
│ ├── ○ content-machine-7tf.2.14 ● P2 Lift sync schema to src/contracts/sync.ts
│ ├── ○ content-machine-7tf.2.15 ● P2 Lift quality-score schema to src/contracts/quality-score.ts
│ ├── ○ content-machine-7tf.2.16 ● P2 Lift evaluate schema to src/contracts/evaluate.ts
│ ├── ○ content-machine-7tf.2.17 ● P2 Lift preference schema to src/contracts/preference.ts
│ ├── ○ content-machine-7tf.2.18 ● P2 Lift research schema to src/contracts/research.ts
│ ├── ○ content-machine-7tf.2.19 ● P2 Lift research-tool schema to src/contracts/research-tool.ts
│ ├── ○ content-machine-7tf.2.20 ● P2 Lift feedback schema to src/contracts/feedback.ts
│ ├── ○ content-machine-7tf.2.21 ● P2 Lift policy schema to src/contracts/policy.ts
│ ├── ○ content-machine-7tf.2.22 ● P2 Lift hooks schema to src/contracts/openers.ts (rename hooks to openers)
│ ├── ○ content-machine-7tf.2.23 ● P2 Lift archetypes schema to src/contracts/archetypes.ts
│ ├── ○ content-machine-7tf.2.24 ● P2 Lift archetypes-types to src/contracts/archetypes-types.ts
│ ├── ○ content-machine-7tf.2.25 ● P2 Lift tts schema to src/contracts/tts.ts
│ ├── ○ content-machine-7tf.2.26 ● P2 Lift package schema to src/contracts/package.ts
│ ├── ○ content-machine-7tf.2.27 ● P2 Lift publish schema to src/contracts/publish.ts
│ ├── ○ content-machine-7tf.2.28 ● P2 Lift prompts schema to src/contracts/prompts.ts
│ ├── ○ content-machine-7tf.2.5 ● P2 Lift audio/mix schema to src/contracts/audio-mix.ts
│ ├── ○ content-machine-7tf.2.7 ● P2 Lift visuals-provider schema to src/contracts/visuals-provider.ts
│ ├── ○ content-machine-7tf.2.29 ● P3 Lift bench schema to src/contracts/bench.ts
│ ├── ○ content-machine-7tf.2.30 ● P3 Lift minimal workflows schema to src/contracts/workflows.ts (archive-bound, keep small)
│ └── ○ content-machine-7tf.2.31 ● P3 Add kokoro-js ambient module declaration to src/contracts/ambient.d.ts
├── ○ content-machine-7tf.3 ● P0 Phase 2 — Extract deterministic runtime/library core
│ ├── ○ content-machine-7tf.3.1 ● P1 Create src/runtime/, src/adapters/, src/infra/ scaffolds
│ ├── ○ content-machine-7tf.3.11 ● P1 Merge src/videospec/ + src/videointel/ into src/runtime/videospec/
│ ├── ○ content-machine-7tf.3.19 ● P1 tsc + tests green after Phase 2 carve (exit criteria)
│ ├── ○ content-machine-7tf.3.2 ● P1 Move src/core/config.ts to src/infra/config.ts and drop setCliRuntime coupling
│ ├── ○ content-machine-7tf.3.3 ● P1 Delete src/cli/runtime.ts and setCliRuntime exports
│ ├── ○ content-machine-7tf.3.4 ● P1 Move src/core/{logger,errors,retry,events,require} to src/infra/
│ ├── ○ content-machine-7tf.3.5 ● P1 Move src/core/{pipeline,pipeline.events,text,embeddings,retrieval} to src/runtime/
│ ├── ○ content-machine-7tf.3.6 ● P1 Move src/core/{llm,ocr,assets,providers} to src/adapters/
│ ├── ○ content-machine-7tf.3.7 ● P1 Split src/audio/ between src/runtime/audio/ (pipeline/alignment/sync/mix/asr-postproc) and src/adapters/{tts,asr}/
│ ├── ○ content-machine-7tf.3.8 ● P1 Split src/visuals/ between src/runtime/visuals/ and src/adapters/visuals/
│ ├── ○ content-machine-7tf.3.9 ● P1 Move src/render/ to src/runtime/render/
│ ├── ○ content-machine-7tf.3.10 ● P2 Move src/media/ to src/runtime/media/ + src/adapters/media-synthesis/
│ ├── ○ content-machine-7tf.3.12 ● P2 Move src/validate/, src/score/, src/quality-score/, src/evaluate/ to src/runtime/
│ ├── ○ content-machine-7tf.3.13 ● P2 Split src/research/: tools to adapters, orchestrator marked for Phase 4 archive
│ ├── ○ content-machine-7tf.3.14 ● P2 Move src/feedback/store.ts to src/runtime/feedback/store.ts
│ ├── ○ content-machine-7tf.3.15 ● P2 Move src/hooks/ to src/runtime/openers/ (rename)
│ ├── ○ content-machine-7tf.3.16 ● P2 Move src/archetypes/ to src/runtime/archetypes/
│ ├── ○ content-machine-7tf.3.17 ● P2 Move src/package/, src/publish/, src/importers/, src/analysis/ to src/runtime/
│ └── ○ content-machine-7tf.3.18 ● P2 Move src/server/mcp/ to src/adapters/mcp/ and drop CLI coupling
├── ○ content-machine-7tf.4 ● P0 Phase 3 — Build deterministic script/hook surfaces
│ ├── ○ content-machine-7tf.4.1 ● P1 Create scripts/harness/ with shared helpers (json-io, exit codes, logging)
│ ├── ○ content-machine-7tf.4.12 ● P1 Rewrite src/cli/index.ts COMMAND_LOADERS to thin survivors
│ ├── ○ content-machine-7tf.4.13 ● P1 tsc + tests green after Phase 3 cull (exit criteria)
│ ├── ○ content-machine-7tf.4.2 ● P1 Author scripts/harness/ingest.ts (video-to-spec)
│ ├── ○ content-machine-7tf.4.3 ● P1 Author scripts/harness/render.ts (deterministic render entry)
│ ├── ○ content-machine-7tf.4.7 ● P1 Archive src/cli/commands/ stage-runner set (script,audio,visuals,media,generate_,captions,timestamps,import,package,publish)
│ ├── ○ content-machine-7tf.4.8 ● P1 Archive src/cli/commands/ agentic set (evaluate,validate,score,rate,quality*,extract-features,frame-analyze,blueprint,classify,videospec,qa,annotate,retrieve,archetypes,templates,prompts,hooks,feedback,telemetry,research,demo,init,setup,lab,bench,workflows)
│ ├── ○ content-machine-7tf.4.10 ● P2 Demote src/bench/ to scripts/harness/bench/
│ ├── ○ content-machine-7tf.4.11 ● P2 Move src/research/orchestrator.ts + indexer.ts to archive/legacy-cli/research/
│ ├── ○ content-machine-7tf.4.4 ● P2 Author scripts/harness/publish-prep.ts
│ ├── ○ content-machine-7tf.4.5 ● P2 Author scripts/harness/analyze-video.ts
│ ├── ○ content-machine-7tf.4.6 ● P2 Author scripts/harness/score.ts
│ └── ○ content-machine-7tf.4.9 ● P2 Reorganise scripts/{gen,ops,dev,quality,python} with ~45 files total
├── ○ content-machine-7tf.5 ● P0 Phase 4 — Build the first harness skills
│ ├── ○ content-machine-7tf.5.1 ● P1 Create skills/ scaffold with SKILL.md template + shared skill-manifest schema
│ ├── ○ content-machine-7tf.5.10 ● P1 Skill: brand-safety-enforcer (Wave 1)
│ ├── ○ content-machine-7tf.5.2 ● P1 Create flows/ scaffold for .flow files
│ ├── ○ content-machine-7tf.5.3 ● P1 Integrate @45ck/prompt-language as runtime dependency + gates.yaml stub
│ ├── ○ content-machine-7tf.5.35 ● P1 Flow: generate-short (Wave 1 composition)
│ ├── ○ content-machine-7tf.5.36 ● P1 Flow: doctor (Wave 1, no skill deps)
│ ├── ○ content-machine-7tf.5.4 ● P1 Skill: virality-hook-scorer (Wave 1)
│ ├── ○ content-machine-7tf.5.5 ● P1 Skill: retention-survival-predictor (Wave 1)
│ ├── ○ content-machine-7tf.5.6 ● P1 Skill: tts-prompt-compiler (Wave 1)
│ ├── ○ content-machine-7tf.5.7 ● P1 Skill: audio-feature-extractor (Wave 1)
│ ├── ○ content-machine-7tf.5.8 ● P1 Skill: caption-overlay-generator (Wave 1)
│ ├── ○ content-machine-7tf.5.9 ● P1 Skill: product-brief-loader (Wave 1)
│ ├── ○ content-machine-7tf.5.11 ● P2 Skill: audio-asset-scorer (Wave 2)
│ ├── ○ content-machine-7tf.5.12 ● P2 Skill: overlay-qa-gate (Wave 2)
│ ├── ○ content-machine-7tf.5.13 ● P2 Skill: overlay-method-ranker (Wave 2)
│ ├── ○ content-machine-7tf.5.14 ● P2 Skill: visual-load-scorer (Wave 2)
│ ├── ○ content-machine-7tf.5.15 ● P2 Skill: trend-freshness-evaluator (Wave 2)
│ ├── ○ content-machine-7tf.5.16 ● P2 Skill: multi-platform-ranker (Wave 2)
│ ├── ○ content-machine-7tf.5.17 ● P2 Skill: shareability-psychology-scorer (Wave 2)
│ ├── ○ content-machine-7tf.5.18 ● P2 Skill: music-selector (Wave 2)
│ ├── ○ content-machine-7tf.5.19 ● P2 Skill: sfx-compiler (Wave 2)
│ ├── ○ content-machine-7tf.5.20 ● P2 Skill: accessibility-condition-matcher (Wave 2)
│ ├── ○ content-machine-7tf.5.37 ● P2 Flow: preflight-check
│ ├── ○ content-machine-7tf.5.38 ● P2 Flow: evaluate-batch
│ ├── ○ content-machine-7tf.5.39 ● P2 Flow: parallel-script-variants
│ ├── ○ content-machine-7tf.5.40 ● P2 Flow: parallel-visual-search
│ ├── ○ content-machine-7tf.5.41 ● P2 Flow: caption-sweep
│ ├── ○ content-machine-7tf.5.43 ● P2 Flow: vendor-refresh
│ ├── ○ content-machine-7tf.5.44 ● P2 Flow: regenerate-fixtures
│ ├── ○ content-machine-7tf.5.46 ● P2 Archive src/lab/ (all subsystems) to archive/legacy-cli/lab/
│ ├── ○ content-machine-7tf.5.47 ● P2 Archive src/demo/, templates/*, tasks/, experiments/complex-plane-rotation/, src/workflows/, src/research/{orchestrator,indexer,index}
│ ├── ○ content-machine-7tf.5.21 ● P3 Skill: bandit-optimizer (orchestrator)
│ ├── ○ content-machine-7tf.5.22 ● P3 Skill: campaign-measurement-system (orchestrator)
│ ├── ○ content-machine-7tf.5.23 ● P3 Skill: legal-review-orchestrator (orchestrator)
│ ├── ○ content-machine-7tf.5.24 ● P3 Skill: hypothesis-prioritizer (orchestrator)
│ ├── ○ content-machine-7tf.5.25 ● P3 Skill: virality-qa-gate (orchestrator)
│ ├── ○ content-machine-7tf.5.26 ● P3 Skill: hypothesis-family-navigator (orchestrator)
│ ├── ○ content-machine-7tf.5.27 ● P3 Skill: hypothesis-evidence-synthesizer (orchestrator)
│ ├── ○ content-machine-7tf.5.28 ● P3 Skill: experiment-protocol-runner (orchestrator)
│ ├── ○ content-machine-7tf.5.29 ● P3 Skill: content-brief-generator (orchestrator)
│ ├── ○ content-machine-7tf.5.30 ● P3 Skill: manufactured-traction-detector (orchestrator)
│ ├── ○ content-machine-7tf.5.31 ● P3 Skill: ethics-boundary-checker (orchestrator)
│ ├── ○ content-machine-7tf.5.32 ● P3 Skill: tactic-card-matcher (orchestrator)
│ ├── ○ content-machine-7tf.5.33 ● P3 Skill: claim-generator-and-vetter (orchestrator)
│ ├── ○ content-machine-7tf.5.34 ● P3 Skill: traction-risk-scorer (orchestrator)
│ ├── ○ content-machine-7tf.5.42 ● P3 Flow: lab-sweep
│ └── ○ content-machine-7tf.5.45 ● P3 Flow: showcase-replay
├── ○ content-machine-7tf.6 ● P0 Phase 5 — Decide CLI fate with trial evidence
│ ├── ○ content-machine-7tf.6.1 ● P1 Run CLI-demotion trial: measure usage of surviving commands vs skill+flow equivalents
│ ├── ○ content-machine-7tf.6.2 ● P1 Author ADR-001 CLI keep/minimise/delete decision
│ ├── ○ content-machine-7tf.6.3 ● P1 Author ADR-002 skill manifest schema + JSON-stdio invocation contract
│ ├── ○ content-machine-7tf.6.5 ● P1 Collapse src/cli/commands/ to the surviving set
│ ├── ○ content-machine-7tf.6.4 ● P2 Author ADR-003 prompt-language runtime dependency
│ ├── ○ content-machine-7tf.6.6 ● P2 Update completions / docs for minimal CLI surface
│ └── ○ content-machine-7tf.6.7 ● P2 Publish CLI-minimisation migration guide for downstream users
└── ○ content-machine-7tf.7 ● P0 Phase 6 — Rewrite product story + docs to harness-first
├── ○ content-machine-7tf.7.1 ● P1 Rewrite README.md harness-first
├── ○ content-machine-7tf.7.4 ● P1 Re-scope src/index.ts public exports to contracts+runtime facades only
├── ○ content-machine-7tf.7.6 ● P1 Update CHANGELOG.md release notes for the pivot
├── ○ content-machine-7tf.7.7 ● P1 Tag and publish harness-first release (major bump)
├── ○ content-machine-7tf.7.2 ● P2 Rewrite docs/user/_ to skills+flows story
├── ○ content-machine-7tf.7.3 ● P2 Rewrite docs/dev/architecture/_ for contracts/runtime/adapters/infra split
└── ○ content-machine-7tf.7.5 ● P2 Update package.json description, keywords, files field

---

Total: 144 issues (143 open, 0 in progress)

Status: ○ open ◐ in_progress ● blocked ✓ closed ❄ deferred
