# Imported Research — 2026-04-22

Second drop of external research materials, following
`../imports-20260421/`. Archives are kept alongside their extracted
contents so provenance is preserved; entry points are each subfolder's
own README / `00_*` / `START_HERE` file.

Context: these imports support the harness-first pivot documented in
[`DIRECTION.md`](../../../../DIRECTION.md) and its phase plan (beads
epic `content-machine-7tf`). Each item below flags the phase(s) it
most directly feeds.

## Short-form virality — algorithm and signal models

- `shortform_virality_greybox_system/` — 19 per-signal models (hook,
  retention, shareability, trend-freshness, cascade diffusion,
  audience-fit, saturation, negative-feedback, exploration, expansion
  wave, tribal neural response, multimodal quality, final-score
  calibration), plus foundations (ranking theory, expected utility,
  retention, normalization, bayesian wave, bandit exploration) and an
  `04_ai_engineering/` system architecture + data schema.
  **Feeds:** Phase 1 (contracts — data schema), Phase 4 (skills — each
  signal model becomes a scoring skill).
- `shortform_algorithm_export/` — models v1–v7 (multi-platform ranking
  → short-form core → grey-box architecture → calibrated stochastic →
  hypothesis ensemble → weighted reconstruction → validation), master
  equations, hypothesis register, input screenshots, video-metrics CSV
  template, model-inputs JSON schema.
  **Feeds:** reverse-engineering-of-winning-content pillar; Phase 1
  contracts (`model_inputs_schema.json`, `video_metrics_template.csv`).
- `viral_video_research_system_v6/` — newer version of the v4 library
  already in `../imports-20260421/`. Scientific naming registry,
  hypothesis ID system, metric codebook, platform-surface and
  content-form codes, and a master hypothesis library organised by
  families (ATT Attention, RET Retention, TEN Hook tension, FOR
  Content-form, MED Platform grammar, TRN Social transmission, FID
  Trust, ACT Action design, SEA Search, EXP Testing, MEM Series, RSK
  Risk, VER Vertical, COG Comprehension, CLS Classification).
  **Feeds:** canonical vocabulary for playbooks/skills and typed
  content contracts. Supersedes v4 for new work.

## Audio pipeline

- `shortform_audio_ai_engineering_export/` — end-to-end audio pipeline:
  TTS/music/SFX prompt libraries, causal-uplift bandit selector,
  retention survival model, viral-audio scoring, feature extraction
  (`extract_audio_features.py`), pipeline skeleton, `schema.sql`,
  evaluation & testing plan.
  **Feeds:** Phase 2 runtime (`cm audio` stage); Phase 4 skills (music
  selection, TTS prompt compilation).

## Visual overlays and captions

- `cognitive_overlay_design_final_archive_v12/` — overlay/caption
  design system: full method registry (~39 KB), condition codes,
  experiment compendium (~186 KB), ASOE adaptive engine spec +
  routing rules, QA checklist, prompt templates for overlay
  generation, legacy python `bcc_overlay_generator.py`, proof-refinery
  pack, supporting CSVs (method registry, condition codes, source
  index, experiment index).
  **Feeds:** Phase 2 runtime (overlay/caption generation), Phase 4
  skills (captions), evaluation layer (QA checklist, proof map).

## Ethics / guardrails / measurement

- `manufactured_traction_research_vault_v9_algorithmic_models/` —
  five-signal-layer framework, legitimate-growth vs manufactured
  traction distinction, deception and harms ladders, domain map
  (creator economy, reviews, SEO, attribution, app stores, synthetic
  media, startup finance, dark patterns), tactic cards, and algorithmic
  models layer (v9). Includes explicit scope/ethics/safety boundary
  docs in `00_START_HERE/`.
  **Feeds:** guardrail policy inputs, evaluation signals that
  distinguish organic vs manufactured traction, dark-patterns review
  for generated content.

## Autonomous marketing agent pack

- `autonomous_marketing_agent_math_ai_proof_pack/` — large curriculum
  and build-spec bundle (~150 files): six-month curriculum, annotated
  bibliography, method playbooks, AI method matrix, Claude-code
  operating system and prompt playbook, autonomous ad factory
  architecture, agent roles/workflows, platform API launch playbook,
  policy/claim approval gate, creative generation prompt pack,
  autonomous experimentation (bandits), data instrumentation &
  attribution, budgeting/bidding/risk controls, measurement stack
  (incrementality, MMM, attribution), experiment decision rules,
  guardrail config YAML, ad-agent output JSON schemas, 90-day
  implementation roadmap, sample product brief/claim bank/experiment
  plan/dashboard metrics templates, and MATH_AI_PROOF manifest.
  **Feeds:** ops layer around content-machine (scheduling, dashboards,
  guardrails); Phase 1 contracts
  (`69_autonomous_ad_agent_schemas_json.md`,
  `124_ad_agent_output_schemas_json.md`); Phase 4 skills (creative
  generation, competitive research, claim ledger).

## Notes

- `viral_video_research_system_v6` supersedes the v4 copy in
  `../imports-20260421/`. The v4 tree is kept there for provenance;
  new work should reference v6.
- `manufactured_traction_research_vault_v9_algorithmic_models_verified.zip`
  was delivered twice today (identical bytes); only one copy kept.
- `shortform_virality_greybox_system.zip` and
  `shortform_audio_ai_engineering_export_2026-04-21.zip` each arrived
  in multiple identical copies; only one of each kept.
- `autonomous_marketing_agent_math_ai_proof_markdown_only_pack.zip`
  has no top-level directory inside the archive, so its contents were
  extracted into `autonomous_marketing_agent_math_ai_proof_pack/` for
  tidiness.
- That same pack contains both `MANIFEST.md` and `manifest.md` at its
  root. Extracting on a case-insensitive filesystem (NTFS) collapses
  them. The lowercase `manifest.md` is extracted normally; the
  uppercase one is preserved as `MANIFEST-upper.md` to avoid the
  collision.
