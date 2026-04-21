# **Manifest**

## **00_overview**

- `README.md` — top-level project explanation.
- `MANIFEST.md` — file inventory.
- `GLOSSARY.md` — key terms and model concepts.

## **01_conversation**

- `FULL_CONVERSATION_TRACE.md` — visible prompts and response trace.
- `HOW_WE_GOT_HERE.md` — shareable reasoning path and project evolution.
- `KEY_DECISIONS.md` — major design decisions made during the conversation.

## **02_research**

- `RESEARCH_SYNTHESIS.md` — research-backed explanation of short-form audio mechanisms.
- `SOURCE_MAP.md` — source-by-source map of how sources support the model.
- `BIBLIOGRAPHY.md` — bibliography with URLs.

## **03_models**

- `MATHEMATICAL_MODELS.md` — full mathematical framework.
- `VIRAL_AUDIO_SCORE.md` — VAS scoring formula and components.
- `RETENTION_SURVIVAL_MODEL.md` — watch-time survival/dropout model.
- `CAUSAL_UPLIFT_BANDIT_MODELS.md` — treatment effects, uplift, and bandits.
- `FEATURE_DEFINITIONS.md` — audio, visual, text, and metadata features.

## **04_ai_engineering**

- `PIPELINE_ARCHITECTURE.md` — end-to-end system architecture.
- `DATASET_DESIGN.md` — database tables and feature stores.
- `EVALUATION_AND_TESTING.md` — experiment design and metrics.
- `IMPLEMENTATION_ROADMAP.md` — phased build plan.

## **05_prompts**

- `TTS_PROMPTS.md` — generated speech prompt templates.
- `MUSIC_PROMPTS.md` — generated music prompt templates.
- `SFX_PROMPTS.md` — SFX and foley prompt templates.
- `PROMPT_COMPILER.md` — structured prompt compiler design.

## **06_code**

- `requirements.txt` — Python dependencies.
- `extract_audio_features.py` — librosa-based feature extraction scaffold.
- `score_audio.py` — Viral Audio Score scaffold.
- `pipeline_skeleton.py` — ingest/extract/score/train loop skeleton.
- `prompt_compiler.py` — prompt compiler functions.
- `bandit_selector.py` — Thompson sampling/contextual bandit scaffold.
- `train_baseline.py` — baseline supervised model scaffold.
- `schema.sql` — database schema.

## **07_templates**

- `audio_asset_schema.json` — audio asset metadata schema.
- `video_metrics_schema.json` — video metrics schema.
- `experiment_plan_template.md` — controlled audio test template.
- `model_card_template.md` — model card for the predictor.

## **08_exports**

- `ONE_PAGE_STRATEGY.md` — compact strategy.
- `IMPLEMENTATION_CHECKLIST.md` — execution checklist.
