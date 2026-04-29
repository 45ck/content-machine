# Platform Packaging And Publish Deep Dive

Date: 2026-04-29

## Purpose

Publishing is not just upload metadata. Platform-native shorts need export
profiles, safe zones, cover text, descriptions, hashtags, title constraints,
checklists, rights checks, and scheduling or handoff state. This report maps
repo signals to publish-ready content-machine artifacts.

## Source Signals

| Source                     | Signal                                                                                                                                 | Content-machine takeaway                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `mutonby__openshorts`      | Platform descriptions for TikTok/Instagram, YouTube Shorts title, hook overlay, thumbnails, gallery metadata, Upload-Post distribution | Publish metadata should be platform-specific and linked to rendered output |
| Current `src/package`      | Generates packaging variants with title, cover text, on-screen hook, angle, score                                                      | Keep variant scoring and add platform compliance/risk gates                |
| Current `src/publish`      | Produces platform, title, description, hashtags, cover text, checklist                                                                 | Publish output should reference package, review, rights, and asset ledger  |
| Platform snapshot research | Vertical export defaults, safe-zone cautions, platform metadata differences                                                            | Publish prep should load platform profile before approving upload          |
| Asset acquisition policy   | Public references are metadata-only until rights are cleared                                                                           | Publish checklist should block unclear source footage or audio             |

## Artifact Stack

### `publish-package.v2.json`

Purpose: platform-specific public-facing package tied to final video.

Fields:

- `video_path`
- `platform`
- `selected_packaging_variant_id`
- `title`
- `description`
- `hashtags`
- `cover_text`
- `thumbnail_path`
- `hook_overlay_text`
- `rights_status`
- `review_bundle_path`
- `asset_ledger_path`
- `platform_profile_path`

### `thumbnail-plan.v1.json`

Purpose: plan cover frames and thumbnails.

Fields:

- `thumbnail_mode`: frame_grab, generated, designed_card
- `source_frame_sec`
- `cover_text`
- `safe_zone`
- `face_or_subject_position`
- `generated_prompt`
- `output_path`

### `publish-checklist.v2.json`

Purpose: explicit pre-upload gate.

Fields:

- `platform`
- `video_profile_passed`
- `caption_profile_passed`
- `rights_cleared`
- `description_ready`
- `hashtags_ready`
- `cover_ready`
- `review_status`
- `manual_approval`
- `blockers`

### `distribution-handoff.v1.json`

Purpose: prepare for upload or scheduling without forcing upload from the
generation pipeline.

Fields:

- `target_platforms`
- `publish_package_paths`
- `schedule_window`
- `upload_provider`
- `manual_steps`
- `credentials_required`
- `status`

## Implementation Delta

Current publish artifacts produce the basics. The next layer should connect
publish metadata to:

- selected packaging variant
- review bundle status
- rights and asset ledger status
- thumbnail/cover status
- platform profile validation
- manual approval or upload handoff

This keeps generation local-first while still making the output publish-ready.

## Quality Gates

- Publish package cannot pass if final review failed.
- Publish package cannot pass if rights or asset provenance are unclear.
- Cover text must be readable and not conflict with burned-in captions.
- Hashtags and description should match platform and content, not generic spam.
- Distribution handoff must not require hidden credentials.

## Bead Targets

This report supports:

- `content-machine-ar4`: platform export and safe-zone validators.
- `content-machine-ar17`: final review bundle.
- `content-machine-ar22`: publish package and distribution handoff artifacts.
