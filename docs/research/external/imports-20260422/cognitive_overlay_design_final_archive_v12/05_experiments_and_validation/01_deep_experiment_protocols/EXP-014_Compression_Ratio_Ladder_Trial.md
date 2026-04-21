# EXP-014 — Compression Ratio Ladder Trial

## Status

| Field | Value |
|---|---|
| Priority | P0 |
| Phase | Pilot first |
| Linked methods | CRL, SCC, KOC, GET, L2SM |
| Source IDs | S04, S05, S02, S03 |

## Purpose

Find the best ratio of transcript reduction for different video types and viewer groups.

## Mechanism bundle

- Compression Load Reduction
- Minimum Context Floor
- Over-Compression Risk

## Why this experiment exists

This experiment converts a design assumption into a falsifiable comparison. It should be run before promoting any related method into production defaults. The goal is not to make a style look good; the goal is to determine whether the method improves the metric that its mechanism predicts.

## Conditions

| Code | Condition |
| --- | --- |
| 100 | Full transcript, 100%. |
| 70 | Reduced transcript, ~70%. |
| 40 | Semantic compression, ~40%. |
| 25 | Aggressive compression, ~25%. |
| 10 | Keyword-only, ~10%. |
| ADAPTIVE | Compression ratio selected by clip complexity. |

## Falsifiable hypotheses

- H1: mid compression improves effort without losing gist.
- H2: extreme compression increases distortion, especially for novices/L2 viewers.
- H3: optimal ratio varies by content type.

## Primary metric

Gist recall and distortion/error rate.

## Secondary metrics

Effort, exact recall, action recall, L2 comprehension.

## Sample and participants

Pilot n=60; validation n=200 with native/L2 segmentation.

Participant notes:

- Test on mobile-sized playback whenever possible.
- Record whether participants watched audio-on or muted.
- Record native language / L2 status where relevant.
- Record prior familiarity with the content domain where relevant.
- Exclude trials where participants did not actually view enough of the video to answer.

## Study design

Compression ratio ladder with balanced content types.

Design requirements:

1. Hold source footage constant across conditions.
2. Change only the target overlay variable unless the experiment explicitly tests a package such as BCC+.
3. Counterbalance order to avoid fatigue/order effects.
4. Prevent participants from seeing the same script in multiple overlay conditions unless the experiment explicitly tests repeated exposure.
5. Keep full accessibility captions available where accessibility is not the manipulated variable.

## Stimulus requirements

Scripts that can be compressed at multiple controlled ratios.

Each stimulus should have:

- exact transcript;
- semantic beat sheet;
- overlay condition file;
- placement map;
- visual-load label;
- video-type label;
- expected gist answer;
- expected action/takeaway answer;
- exact-recall question;
- visual-recall question.

## Procedure

1. Consent / instructions.
2. Device check: mobile or mobile-sized player.
3. Randomized exposure to assigned videos.
4. Immediate recall questions after each clip.
5. Effort/clarity/obstruction rating after each clip.
6. Preference comparison at end if participant has seen multiple styles.
7. Optional delayed recall follow-up for memory experiments.
8. Optional eye-tracking or webcam-gaze capture if available.

## Data fields

| Field | Definition |
| --- | --- |
| participant_id | Anonymous participant identifier. |
| video_id | Stimulus identifier. |
| condition_code | Overlay condition assigned. |
| viewing_mode | Audio-on, muted, or platform-native. |
| video_type | Talking head, demo, tutorial, emotional story, etc. |
| visual_load | Low, medium, high or numeric frame-load score. |
| gist_recall | Main-point score, 0/1 or percentage. |
| action_recall | Action/takeaway score. |
| exact_recall | Exact wording/details score. |
| visual_recall | Scene/object/action recall score. |
| perceived_effort | Likert rating, e.g. 1–7. |
| clarity | Likert rating. |
| obstruction | Likert or coded complaint. |
| preference | Chosen preferred variant. |
| completion | Whether video was completed. |
| watch_time | Seconds watched. |
| notes | Qualitative observations. |

## Analysis plan

Dose-response curve; estimate compression floor by content type.

Recommended model:

```text
outcome ~ condition + video_type + viewing_mode + visual_load + condition:video_type + (1|participant_id) + (1|video_id)
```

For binary recall outcomes, use logistic mixed-effects models. For Likert outcomes, use ordinal or linear mixed models depending on measurement design. For platform tests, compare practical uplift against predetermined metrics rather than relying on raw statistical significance alone.

## Planned contrasts

Declare planned contrasts before running the study.

General contrasts:

- Target method vs its baseline.
- Target method vs negative control.
- Target method vs simpler lower-cost method.
- Segment-specific comparison by video type and viewing mode.

## Pass rule

Adopt compression bands only where gist remains above threshold and effort drops.

## Fail / demotion rule

If compression creates distortion, set minimum context floor.

## Guardrails

A condition cannot be accepted if it:

- worsens accessibility;
- meaningfully reduces visual recall when visual information matters;
- increases confusion comments or distortion errors;
- improves watch time only by making the content harder to understand;
- obscures mouth, eyes, hands, product, action, captions, or platform UI in a content-relevant way.

## Interpretation guide

| Result pattern | Interpretation |
|---|---|
| Target beats baseline on primary metric and guardrails hold | Promote or move to larger validation. |
| Target improves watch time but harms recall | Reject for educational/comprehension use. |
| Target equals baseline but is simpler/faster to produce | Consider operational adoption only if no quality regression. |
| Target only works in one segment | Route by context; do not globalize. |
| Negative control performs well | Check task, metrics, and stimulus validity. |

## Production implication

If this experiment passes, update the routing rules and production checklist. If it fails, demote the method, restrict it to a segment, or revise the mechanism.
