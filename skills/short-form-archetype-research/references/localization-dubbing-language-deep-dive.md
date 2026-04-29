# Localization, Dubbing, And Language Deep Dive

Date: 2026-04-29

## Purpose

Short-form localization is more than translating captions. The researched repos
show translation, multilingual TTS, dubbing, subtitle generation, speaker
mapping, and platform-specific metadata as a linked production path. This report
defines the artifacts needed to make localized shorts reproducible and
reviewable.

## Source Signals

| Source                               | Signal                                                            | Content-machine takeaway                                                           |
| ------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Current `src/audio/asr`              | ASR accepts language options and emits word-level timing inputs   | Locale should be recorded before caption and dubbing decisions                     |
| Current ElevenLabs TTS adapter       | Uses multilingual voice generation                                | Voice casting needs language, provider, and voice compatibility fields             |
| Current caption sync and drift logic | Reconciles timing and detects drift                               | Dubs need independent timing review against localized captions                     |
| `RayVentura__ShortGPT`               | Translation and voice dubbing engine with multiple TTS providers  | Localization should be a staged pipeline, not a one-off prompt rewrite             |
| `chenwr727__AI-Short-Video-Engine`   | Conversational TTS prompts and multi-character voice assignment   | Multi-speaker localized shorts need speaker-to-voice plans                         |
| Platform packaging research          | Titles, descriptions, hashtags, and cover text differ by platform | Localized output must include localized publish packages, not only localized audio |

## Localization Model

Recommended lifecycle:

1. Create a locale plan from source language, target language, platform, and
   archetype.
2. Translate script, captions, title, description, hashtags, and cover text as
   separate fields.
3. Build a dubbing script with segment timing and speaker mapping.
4. Generate voiceover or sidecar dub audio.
5. Reconcile localized captions to localized audio.
6. Package localized publish metadata and review the whole localized output.

## Artifact Stack

### `locale-plan.v1.json`

Purpose: declare language targets and provider constraints.

Fields:

- `source_language`
- `target_language`
- `platform`
- `archetype`
- `translation_provider`
- `tts_provider`
- `voice_clone_allowed`
- `subtitle_mode`
- `publish_metadata_localized`

### `translation-map.v1.json`

Purpose: map source text units to translated units.

Fields:

- `source_unit_id`
- `source_text`
- `translated_text`
- `field_type`: script, caption, title, description, hashtag, cover
- `tone_notes`
- `literalness`
- `review_status`

### `dub-script.v1.json`

Purpose: prepare translated speech for TTS or dubbing.

Fields:

- `segments`
- `speaker_id`
- `translated_text`
- `target_duration_ms`
- `speed_policy`
- `pronunciation_notes`
- `emotion`
- `source_timing_ref`

### `voice-transfer-plan.v1.json`

Purpose: record speaker, voice, and rights choices.

Fields:

- `speaker_id`
- `source_voice_reference`
- `target_voice_id`
- `provider`
- `language_supported`
- `consent_status`
- `fallback_voice_id`
- `risk_notes`

### `localized-captions.v1.json`

Purpose: store caption groups after localization and audio reconciliation.

Fields:

- `target_language`
- `caption_groups`
- `timing_source`
- `drift_report_path`
- `safe_zone_profile`
- `burned_in_path`
- `sidecar_paths`

### `localized-publish-package.v1.json`

Purpose: connect localized media to localized platform metadata.

Fields:

- `locale`
- `video_path`
- `audio_path`
- `caption_paths`
- `title`
- `description`
- `hashtags`
- `cover_text`
- `localized_review_bundle_path`
- `rights_status`

## Implementation Delta

The current runtime has the pieces needed for a first implementation: ASR
language options, multilingual TTS, caption drift checks, and publish package
generation. The missing layer is a localization coordinator that writes the
locale plan, translation map, dubbing script, and localized package before
publish review.

## Quality Gates

- Localized captions must be timed against localized audio, not source audio.
- Voice transfer cannot pass without consent or an allowed fallback voice.
- Titles, descriptions, hashtags, and cover text must be localized together.
- Translation review should preserve the hook and payoff, not just literal
  meaning.
- Any language-specific provider downgrade must be recorded in the review
  bundle.

## Bead Targets

This report supports:

- `content-machine-ar20`: voice casting, audio segments, and mix review.
- `content-machine-ar22`: publish packages and distribution handoff.
- `content-machine-ar24`: localization, dubbing, language, and localized
  package artifacts.
