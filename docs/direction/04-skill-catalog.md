---
document: skill-catalog
status: authoritative
ratified: 2026-04-22
phase: 0
---

# Content-Machine Skill Catalogue

## Overview

This catalogue documents the 31 core skills in the Content-Machine architecture, organized across six domains and deployed in three implementation phases. Each skill is a stateless, JSON-in/JSON-out microservice invoked via `cm-skill <name>`. For integration patterns, orchestration sequences, and deprecation timelines, see `03-reorg-synthesis.md`.

---

## Skill Manifest Template

Each skill entry includes:
- **name**: kebab-case identifier
- **description**: <=400 chars, third-person
- **domain**: One of six thematic groupings
- **source-pack**: Research material grounding
- **inputs**: JSON schema snippet
- **outputs**: JSON schema snippet
- **invocation**: Runtime calling convention
- **gates**: Pass/fail predicates over outputs
- **dependencies**: Contracts, runtime modules, adapters
- **phase**: 4-wave1 / 4-wave2 / 5
- **status**: Current readiness
- **notes**: Non-obvious constraints

---

## Skills by Domain: 31 Total

### Virality & Ranking (6 skills)

1. **virality-hook-scorer** (4-wave1) - Scores scroll-stop hooks [0,1] using retention models. Pack 1: shortform_virality_greybox_system/02_signal_models/02_scroll_stop_hook_model.md, 01_foundations/retention_math.md

2. **retention-survival-predictor** (4-wave1) - Forecasts viewer completion via Weibull decay. Pack 1: 01_foundations/retention_math.md

3. **trend-freshness-evaluator** (4-wave2) - Classifies trend lifecycle (emerging/peak/declining). Pack 3: viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md

4. **multi-platform-ranker** (4-wave2) - Ranks content variants across TikTok, Instagram, YouTube, Twitter. Pack 3: viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md

5. **shareability-psychology-scorer** (4-wave2) - Scores psychological appeal for sharing. Pack 3: viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md

6. **virality-qa-gate** (5) - Final QA gate for virality-critical content. Pack 1: shortform_virality_greybox_system/02_signal_models/02_scroll_stop_hook_model.md

---

### Audio & Media (5 skills)

1. **tts-prompt-compiler** (4-wave1) - Transforms narrative to TTS directives with emphasis/pause. Pack 4: audio_synthesis_and_feature_extraction_pack/05_prompts/tts_directive_spec.md, 06_code/tts_compiler.py

2. **audio-feature-extractor** (4-wave1) - Extracts 50+ features (MFCC, tempo, readability). Pack 4: audio_synthesis_and_feature_extraction_pack/06_code/feature_extractor.py, schema.sql

3. **music-selector** (4-wave2) - Selects tracks by vibe/intensity/platform compliance. Pack 4: audio_synthesis_and_feature_extraction_pack/05_prompts/music_selector_prompt.md, 06_code/bandit_selector.py

4. **sfx-compiler** (4-wave2) - Layers sound effects ensuring no clipping, readability >0.7. Pack 4: audio_synthesis_and_feature_extraction_pack/05_prompts/sfx_compilation_prompt.md, 06_code/sfx_compiler.py

5. **audio-asset-scorer** (4-wave2) - QA checks loudness (LUFS), codec, licensing. Pack 4: audio_synthesis_and_feature_extraction_pack/06_code/audio_qa_validator.py, schema.sql

---

### Overlay & Captions (5 skills)

1. **caption-overlay-generator** (4-wave1) - Generates synced caption overlays with brand schema. Pack 5: cognitive_overlay_design_final_archive_v12/02_naming_registry/full_method_registry.md, 07_adaptive_engine_ASOE/index.md

2. **overlay-qa-gate** (4-wave2) - QA for readability, WCAG AA contrast, flicker, occlusion. Pack 5: cognitive_overlay_design_final_archive_v12/07_adaptive_engine_ASOE/asoe_quality_checks.md

3. **overlay-method-ranker** (4-wave2) - Ranks 5 methods (bottom-banner/center-float/side-rail/full-screen/adaptive). Pack 5: cognitive_overlay_design_final_archive_v12/02_naming_registry/full_method_registry.md

4. **visual-load-scorer** (4-wave2) - Measures cognitive load [0,1] from density/color/motion. Pack 5: cognitive_overlay_design_final_archive_v12/07_adaptive_engine_ASOE/visual_load_analysis.md

5. **accessibility-condition-matcher** (4-wave2) - Maps to WCAG 2.1 AA requirements. Pack 5: cognitive_overlay_design_final_archive_v12/07_adaptive_engine_ASOE/wcag_compliance_module.md

---

### Manufactured-Traction Detection (5 skills)

1. **product-brief-loader** (4-wave1) - Loads positioning, audience, guardrails, assets from YAML. Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/brief_schema.md

2. **brand-safety-enforcer** (4-wave1) - Scans content against guardrails (topics, competitors, tone). Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/guardrail_policy_schema.md

3. **manufactured-traction-detector** (4-wave1) - Detects synthetic engagement (bots, farms, anomalies). Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/fraud_detection_engine.md

4. **ethics-boundary-checker** (4-wave1) - Flags deception, stereotypes, illegal activity, exploitation. Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/ethics_framework.md

5. **traction-risk-scorer** (5) - Synthesizes fraud/ethics/brand outputs into holistic risk [0,1]. Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/risk_synthesis_framework.md

---

### Autonomous Marketing Agent (2 skills)

1. **campaign-measurement-system** (5) - Aggregates platform metrics, computes ROI, attribution, variance. Pack 7: autonomous_marketing_agent_math_ai_proof_pack/124_ad_agent_output_schemas_json.md

2. **bandit-optimizer** (5) - Thompson sampling or UCB1 budget allocation across variants. Pack 7: autonomous_marketing_agent_math_ai_proof_pack/63_autonomous_experimentation_bandits.md

---

### Hypothesis & Experimentation (8 skills)

1. **hypothesis-prioritizer** (5) - Ranks hypotheses by lift/effort/freshness. Pack 3: viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md

2. **hypothesis-family-navigator** (5) - Maps genealogy, validates/invalidates assumptions. Merged naming logic from hypothesis-naming-encoder. Pack 3: viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md

3. **hypothesis-evidence-synthesizer** (5) - Aggregates A/B test metrics, confidence, recommendation. Pack 3: viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md

4. **experiment-protocol-runner** (5) - Runs A/B tests, halts on p-value significance. Pack 7: autonomous_marketing_agent_math_ai_proof_pack/63_autonomous_experimentation_bandits.md

5. **content-brief-generator** (5) - Synthesizes brief+hypothesis+overlay into production spec. Pack 7: autonomous_marketing_agent_math_ai_proof_pack/124_ad_agent_output_schemas_json.md

6. **legal-review-orchestrator** (5) - Coordinates ethics/brand/accessibility/fraud gates. Pack 7: autonomous_marketing_agent_math_ai_proof_pack/124_ad_agent_output_schemas_json.md, 123_guardrail_policy_config_yaml.md

7. **tactic-card-matcher** (5) - Maps tactics to validated hypotheses, predicts win rate. Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/03_TACTIC_CARDS/tactic_card_schema.md

8. **claim-generator-and-vetter** (5) - Generates+vets claims and ad-copy variants. Merged ad-copy-variator. Pack 6: manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/claim_verification_framework.md

---

## Grounding Index (Research Packs)

| Pack | Skills | File Paths |
|---|---|---|
| Pack 1: Virality | virality-hook-scorer, retention-survival-predictor, virality-qa-gate | shortform_virality_greybox_system/01_foundations/retention_math.md, 02_signal_models/02_scroll_stop_hook_model.md |
| Pack 3: Hypothesis Lib | trend-freshness-evaluator, multi-platform-ranker, hypothesis-prioritizer, hypothesis-family-navigator, hypothesis-evidence-synthesizer, shareability-psychology-scorer | viral_video_research_system_v6/03_Hypothesis_Library/master_named_hypothesis_index.md |
| Pack 4: Audio | tts-prompt-compiler, audio-feature-extractor, music-selector, sfx-compiler, audio-asset-scorer | audio_synthesis_and_feature_extraction_pack/05_prompts/tts_directive_spec.md, 06_code/tts_compiler.py, 06_code/feature_extractor.py, 06_code/bandit_selector.py, 06_code/audio_qa_validator.py, schema.sql |
| Pack 5: Overlay | caption-overlay-generator, overlay-qa-gate, overlay-method-ranker, visual-load-scorer, accessibility-condition-matcher | cognitive_overlay_design_final_archive_v12/02_naming_registry/full_method_registry.md, 07_adaptive_engine_ASOE/index.md, asoe_quality_checks.md, visual_load_analysis.md, wcag_compliance_module.md |
| Pack 6: Traction | product-brief-loader, brand-safety-enforcer, manufactured-traction-detector, ethics-boundary-checker, traction-risk-scorer, tactic-card-matcher, claim-generator-and-vetter | manufactured_traction_research_vault_v9_algorithmic_models/01_CORE_THESIS_AND_FRAMEWORKS/brief_schema.md, guardrail_policy_schema.md, fraud_detection_engine.md, ethics_framework.md, risk_synthesis_framework.md, claim_verification_framework.md, 03_TACTIC_CARDS/tactic_card_schema.md |
| Pack 7: AMA | campaign-measurement-system, bandit-optimizer, legal-review-orchestrator, experiment-protocol-runner, content-brief-generator | autonomous_marketing_agent_math_ai_proof_pack/63_autonomous_experimentation_bandits.md, 124_ad_agent_output_schemas_json.md, 123_guardrail_policy_config_yaml.md |

---

## Phase Mapping Summary

| Phase | Count | Window |
|---|---|---|
| 4-Wave1 | 9 skills | Week 1-4 |
| 4-Wave2 | 10 skills | Week 5-8 |
| 5 | 12 skills | Week 9-16 |
| TOTAL | 31 skills | — |

---

## Changes from Preliminary List

### Dropped: 2 skills (merged for atomicity)

1. **ad-copy-variator** merged into **claim-generator-and-vetter**
   - Rationale: Both perform text generation + vetting. Combining creates single source of truth for approved marketing copy. Ad-copy variants are natural output of claim vetting.
   - Integration: claim-generator-and-vetter now outputs claim list + ad-copy variants with full supporting documentation and compliance scoring.

2. **hypothesis-naming-encoder** merged into **hypothesis-family-navigator**
   - Rationale: Naming is subsidiary function of genealogy tracking. Family-navigator already maintains assumption lineage; adding naming logic is natural extension without breaking contract atomicity.
   - Integration: hypothesis-family-navigator outputs family genealogy with implicit encoded names derived from ancestor lineage and validation history.

### Renames: None

All 31 skills retain original kebab-case names for external consistency.

### Final Tally

- **Wave 1 (foundational)**: 9 skills
- **Wave 2 (validators/QA)**: 10 skills
- **Phase 5 (orchestrators)**: 12 skills
- **TOTAL**: 31 skills

---

## Domain Summary

1. **Virality & Ranking**: Hook scoring, retention prediction, trend freshness, platform ranking, shareability, virality QA gate.
2. **Audio & Media**: TTS compilation, feature extraction, music curation, sfx assembly, audio QA.
3. **Overlay & Captions**: Caption generation, overlay QA, method ranking, visual-load measurement, WCAG compliance.
4. **Manufactured-Traction Detection**: Product briefs, brand safety, fraud detection, ethics validation, risk synthesis.
5. **Autonomous Marketing Agent**: Campaign measurement, budget optimization via multi-armed bandits.
6. **Hypothesis & Experimentation**: Prioritization, genealogy navigation, evidence synthesis, experiment execution, content briefs, legal orchestration, tactic matching, claim vetting.

---

## Anti-Patterns in Skill Authoring

**DO NOT** violate these constraints in SKILL.md files:
1. **Stateful contracts**: Must be stateless JSON transformers. No file I/O, DB writes, side effects.
2. **Silent failures**: Output reasoning or error field documenting every decision.
3. **Mixed concerns**: Do not bundle pre-condition enforcement with core logic. Gates only.
4. **Unbounded outputs**: Declare bounds or enums. Prefer structured JSON with constraints.
5. **Hard-coded thresholds**: All numeric thresholds configurable via environment/config file, not hard-coded.

---

**Catalogue Version**: 2026-04-22
**Status**: Authoritative
**Next Review**: 2026-05-22
