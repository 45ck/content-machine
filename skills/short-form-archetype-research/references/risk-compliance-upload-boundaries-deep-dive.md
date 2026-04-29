# Risk, Compliance, And Upload Boundary Deep Dive

Date: 2026-04-29

## Purpose

Several researched repos include download, repost, upload, scheduling, or
social distribution features. Those patterns are useful for metadata and
handoff design, but content-machine should keep rights, credentials, platform
terms, and upload approval explicit. This report defines the risk gates around
assets, public references, upload providers, and generated publish packages.

## Source Signals

| Source                           | Signal                                                                 | Content-machine takeaway                                                       |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Asset acquisition policy         | Public video references are metadata-only unless rights are cleared    | Reference videos must not silently become production media                     |
| Platform snapshot research       | Platform constraints and policies change over time                     | Export and publish gates should load dated platform profiles                   |
| `brolyroly` repo research        | Download, repost, metadata, queueing, analytics, and upload patterns   | Ingestion and validation ideas are useful; repost automation is a risk surface |
| `mutonby__openshorts`            | Upload-Post integration and platform publish metadata                  | Upload should remain a handoff unless credentials and approval are explicit    |
| Current publish package research | Distribution handoff records target platforms and credentials required | Credentials and manual steps must be visible in artifacts                      |
| Review bundle research           | Rights status, asset ledger, source review, and review action          | Risk checks belong in final review, not only in docs                           |

## Boundary Model

Content-machine can prepare, validate, and package shorts for publishing. It
should only upload when a separate explicit implementation task defines the
provider, credential handling, approval policy, and platform terms review.

Recommended boundary:

- Allowed: metadata-only public references.
- Allowed: user-supplied or licensed source media with provenance.
- Allowed: generated or stock assets with rights metadata.
- Allowed: publish packages and manual upload handoff.
- Conditional: scheduler or uploader integration with explicit credentials,
  platform, and approval gates.
- Blocked by default: reposting public videos, copying unknown assets, hidden
  credential use, and unreviewed platform automation.

## Artifact Stack

### `upload-boundary-review.v1.json`

Purpose: decide whether a run is package-only, handoff, or upload-capable.

Fields:

- `publish_package_path`
- `target_platform`
- `mode`: package_only, manual_handoff, scheduled_upload, direct_upload
- `approval_required`
- `credentials_required`
- `provider`
- `terms_review_status`
- `status`
- `blockers`

### `rights-gate.v1.json`

Purpose: summarize asset and source-media rights before publish.

Fields:

- `asset_ledger_path`
- `source_media_review_path`
- `rights_status`
- `blocked_assets`
- `attribution_required`
- `license_notes`
- `public_reference_only`
- `status`

### `credential-requirement.v1.json`

Purpose: record upload or provider credential needs without exposing secrets.

Fields:

- `provider`
- `credential_names`
- `required_for`
- `present`
- `storage_location_hint`
- `secret_values_in_artifacts`
- `status`

### `repost-risk-review.v1.json`

Purpose: prevent public-video reference workflows from turning into repost
automation.

Fields:

- `source_url`
- `source_kind`
- `downloaded`
- `used_in_render`
- `rights_cleared`
- `transformative_use_notes`
- `status`
- `blockers`

### `public-reference-use.v1.json`

Purpose: keep YouTube, TikTok, and Reels references metadata-only unless
rights are separately cleared.

Fields:

- `reference_id`
- `url`
- `platform`
- `used_for`
- `metadata_fields`
- `asset_copied`
- `downloaded`
- `rights_clearance_path`
- `status`

## Implementation Delta

The existing research already separates public references from production
assets. The next implementation should make that separation machine-enforced:
publish prep should read rights, credential, and upload boundary artifacts
before passing a package or distribution handoff.

## Quality Gates

- Public references cannot be used as rendered media unless a rights clearance
  artifact is linked.
- Upload-capable modes must declare credentials, provider, approval, and terms
  review.
- Publish packages cannot hide manual steps or upload requirements.
- Repost-like workflows should fail by default unless the user supplies clear
  rights and a separate explicit upload implementation exists.
- Secrets must never be written into queue logs, publish packages, or review
  bundles.

## Bead Targets

This report supports:

- `content-machine-ar16`: source media review and asset provenance.
- `content-machine-ar17`: final review bundle.
- `content-machine-ar22`: distribution handoff.
- `content-machine-ar27`: upload boundary, rights gate, credential, repost
  risk, and public-reference artifacts.
