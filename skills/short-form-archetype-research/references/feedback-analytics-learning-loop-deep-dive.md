# Feedback, Analytics, And Learning Loop Deep Dive

Date: 2026-04-29

## Purpose

A content machine improves only when review, creator judgment, and platform
outcomes feed back into the next generation. Content-machine already has
feedback entries, feature vectors, quality scoring, and active-learning
rankers. This report connects those pieces to short-form archetype learning.

## Source Signals

| Source                                        | Signal                                                                                     | Content-machine takeaway                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Current `src/feedback/schema.ts`              | Stores run, experiment, variant, ratings, notes, tags, and auto metric snapshots           | Creator feedback should link to concrete run and variant artifacts                  |
| Current `src/quality-score/feature-schema.ts` | Captures sync, caption, pacing, audio, engagement, temporal, freeze, and metadata features | Performance snapshots should preserve both automatic metrics and published outcomes |
| Current `src/evaluate/active-learning.ts`     | Ranks borderline and diverse samples for human labeling                                    | Review queues should prioritize uncertain shorts, not random samples                |
| Current `src/evaluate/*`                      | Batch comparison, calibrator, diversity, preference schema                                 | Variant outcomes can train future style and hook choices                            |
| Review and publish research                   | Review bundles, package variants, platform handoff                                         | Outcome data must link back to package, hook, style profile, and platform           |

## Learning Model

Recommended lifecycle:

1. Record automatic quality features for every reviewable render.
2. Capture creator feedback at sample, render, and post-publish stages.
3. Import platform outcome snapshots when the user supplies them.
4. Link each outcome to hook, narrative package, style profile, platform, and
   archetype.
5. Rank uncertain or disputed samples for review.
6. Promote durable findings into archetype learning notes and profile updates.

## Artifact Stack

### `performance-snapshot.v1.json`

Purpose: store manual or imported platform performance at a point in time.

Fields:

- `platform`
- `captured_at`
- `publish_package_path`
- `video_id`
- `views`
- `watch_time_avg`
- `retention_curve`
- `likes`
- `comments`
- `shares`
- `saves`
- `follows`
- `source`

### `creator-feedback.v1.json`

Purpose: preserve structured human review.

Fields:

- `feedback_id`
- `run_id`
- `variant_id`
- `ratings`
- `notes`
- `tags`
- `approved`
- `requested_changes`
- `reviewer`
- `created_at`

### `variant-outcome.v1.json`

Purpose: compare hooks, packages, profiles, or templates.

Fields:

- `experiment_id`
- `variant_id`
- `archetype`
- `style_profile_id`
- `hook_id`
- `publish_package_path`
- `review_bundle_path`
- `performance_snapshot_path`
- `creator_feedback_path`
- `winner`
- `reason`

### `quality-label.v1.json`

Purpose: labeled training or calibration item.

Fields:

- `video_id`
- `feature_vector_path`
- `labeler`
- `label`
- `confidence`
- `failure_tags`
- `notes`

### `archetype-learning-note.v1.json`

Purpose: turn repeated outcomes into reusable production knowledge.

Fields:

- `archetype`
- `finding`
- `evidence_paths`
- `affected_profiles`
- `recommended_change`
- `confidence`
- `created_at`

## Implementation Delta

The runtime already has pieces of this loop, but they are not yet connected to
publish packages and archetype research. The next implementation should make
the review bundle and publish package the join keys for feedback, platform
outcomes, active-learning labels, and style-profile updates.

## Quality Gates

- Outcome imports must name platform, capture time, and source.
- Creator feedback should never be detached from run, variant, or artifact
  paths when those exist.
- Learning notes need evidence paths; anecdotal advice stays in notes, not
  profile defaults.
- Active-learning queues should rank uncertain, diverse, and high-impact
  samples first.
- Style profile updates should cite the feedback or performance snapshots that
  justified the change.

## Bead Targets

This report supports:

- `content-machine-ar17`: final review bundle.
- `content-machine-ar18`: archetype parity eval fixtures.
- `content-machine-ar25`: reusable style profiles.
- `content-machine-ar26`: feedback, analytics, variant outcome, quality label,
  and archetype learning artifacts.
