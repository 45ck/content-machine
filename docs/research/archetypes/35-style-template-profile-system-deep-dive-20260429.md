# Style, Template, And Profile System Deep Dive

Date: 2026-04-29

## Purpose

Reference shorts win through repeated style systems: caption treatments,
pacing, hook typography, music mix defaults, visual language, and platform
packaging rules. Content-machine already has a style-profile skill and render
template controls; this report defines the contract layer that turns those
settings into reusable, testable production profiles.

## Source Signals

| Source                          | Signal                                                                         | Content-machine takeaway                                           |
| ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `skills/style-profile-library`  | Stores local reusable caption, pacing, visual, and render defaults             | Style selection should be a first-class production input           |
| `src/library/style-profiles.ts` | Upserts typed profiles through domain schemas                                  | Profiles should stay structured and versioned                      |
| Current render command options  | Template, caption presets, hook library, template code, and dependency options | Render templates need explicit capability and safety contracts     |
| Current audio mix presets       | Data-defined presets and custom preset support                                 | Audio style belongs in the profile, not only render defaults       |
| `rshorts` research              | Theme registry and reusable visual/caption conventions                         | Archetype-specific profiles should load theme defaults             |
| `OpenMontage` research          | Style playbooks, validation, and final self-review                             | Profiles need review gates for template promises and output parity |

## Profile Model

Style profiles should sit between archetype blueprints and concrete render
options. A profile describes the intended language of a recurring channel or
format; a template contract describes what a renderer can actually do.

Recommended resolution order:

1. Archetype blueprint default.
2. Channel or niche style profile.
3. Request-specific overrides.
4. Platform export profile.
5. Template capability validation.

## Artifact Stack

### `style-profile.v2.json`

Purpose: reusable channel or format style system.

Fields:

- `id`
- `name`
- `archetypes`
- `caption_style`
- `caption_density`
- `hook_treatment`
- `pacing`
- `visual_language`
- `audio_mix_preset`
- `thumbnail_style`
- `platform_defaults`
- `negative_constraints`
- `updated_at`

### `template-contract.v1.json`

Purpose: declare a render template's capabilities and requirements.

Fields:

- `template_id`
- `renderer`
- `supported_archetypes`
- `required_assets`
- `caption_modes`
- `hook_overlay_support`
- `safe_zone_support`
- `thumbnail_support`
- `config_schema_path`
- `known_limits`
- `license_notes`

### `preset-resolution-report.v1.json`

Purpose: record how a final render configuration was assembled.

Fields:

- `archetype`
- `style_profile_id`
- `platform_profile`
- `request_overrides`
- `selected_template_id`
- `caption_preset`
- `audio_mix_preset`
- `conflicts`
- `resolved_config_path`

### `hook-library.v1.json`

Purpose: maintain reusable hook patterns without hiding the selected promise.

Fields:

- `library_id`
- `patterns`
- `archetype`
- `platform`
- `first_frame_requirements`
- `risk_notes`
- `examples`
- `blocked_patterns`

### `template-safety-review.v1.json`

Purpose: verify that a template output matches its declared contract.

Fields:

- `template_id`
- `render_path`
- `contract_path`
- `safe_zone_passed`
- `caption_mode_passed`
- `asset_requirements_passed`
- `hook_overlay_passed`
- `known_limit_hits`
- `status`

## Implementation Delta

The repo already stores style profiles and exposes render template switches.
The next layer should connect them with a preset resolution artifact and a
template contract. That gives `generate-short`, `video-render`, and
`publish-prep-review` the same vocabulary for style, template limits, and
review expectations.

## Quality Gates

- A style profile must not override platform safe-zone constraints.
- Template contracts must list required assets and unsupported archetypes.
- Render review must fail if the selected template cannot express the chosen
  caption mode, hook overlay, or thumbnail plan.
- Preset resolution must record every override so repeated channel output is
  reproducible.
- Hook libraries must not produce promises that the narrative package cannot
  prove.

## Bead Targets

This report supports:

- `content-machine-ar18`: archetype parity fixtures.
- `content-machine-ar19`: hook tests and narrative packaging.
- `content-machine-ar21`: visual continuity and style artifacts.
- `content-machine-ar25`: style profile, template contract, preset
  resolution, hook library, and template safety artifacts.
