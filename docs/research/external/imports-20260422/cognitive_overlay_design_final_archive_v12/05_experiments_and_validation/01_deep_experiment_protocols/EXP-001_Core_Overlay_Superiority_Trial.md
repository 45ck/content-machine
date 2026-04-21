# EXP-001 — Core Overlay Superiority Trial

## Status

| Field | Value |
|---|---|
| Priority | P0 |
| Phase | Pilot first |
| Linked methods | NCO, FTO, KHT, SCC, BCC, BCC+, HBC |
| Source IDs | S01, S02, S03, S04, S05, S06, S14 |

## Purpose

Test the full overlay stack against baseline captioning conditions and establish the first proof ladder for SCC, BCC, and BCC+.

## Mechanism bundle

- Compression Load Reduction
- Structured Signaling
- Sparse Attention Anchoring
- Gaze-Safe Placement
- Visual-Load Adaptation
- Muted-First Resilience

## Why this experiment exists

This experiment converts a design assumption into a falsifiable comparison. It should be run before promoting any related method into production defaults. The goal is not to make a style look good; the goal is to determine whether the method improves the metric that its mechanism predicts.

## Conditions

| Code | Condition |
| --- | --- |
| NCO | Native captions only, no creative overlay. |
| FTO | Full transcript overlay, burned-in or simulated. |
| KHT | Full transcript with sparse keyword highlights. |
| SCC | Semantic compression captions. |
| BCC | SCC plus operator anchors and bionic concept anchors. |
| BCC+ | BCC plus gaze-safe placement, visual-load adaptation, muted-first design, and full captions. |
| HBC | Heavy bionic formatting as negative/control stress condition. |

## Falsifiable hypotheses

- H1: SCC beats FTO on gist/action recall and perceived effort.
- H2: BCC beats SCC only if bionic anchors add measurable attention or memory value.
- H3: BCC+ beats BCC on muted comprehension and visual recall because placement/density reduce interference.
- H4: HBC underperforms BCC on effort and readability.

## Primary metric

Gist recall + action recall composite.

## Secondary metrics

Exact recall, perceived effort, visual recall, completion rate, preference, confusion rate.

## Sample and participants

Pilot n=30–50; validation n=120–250. Use mobile display. Include audio-on and muted groups.

Participant notes:

- Test on mobile-sized playback whenever possible.
- Record whether participants watched audio-on or muted.
- Record native language / L2 status where relevant.
- Record prior familiarity with the content domain where relevant.
- Exclude trials where participants did not actually view enough of the video to answer.

## Study design

Mixed within/between design. Each participant sees multiple videos but only one version of each video. Use Latin-square assignment to prevent seeing the same script twice.

Design requirements:

1. Hold source footage constant across conditions.
2. Change only the target overlay variable unless the experiment explicitly tests a package such as BCC+.
3. Counterbalance order to avoid fatigue/order effects.
4. Prevent participants from seeing the same script in multiple overlay conditions unless the experiment explicitly tests repeated exposure.
5. Keep full accessibility captions available where accessibility is not the manipulated variable.

## Stimulus requirements

12–24 videos, 15–45 seconds, across talking-head, demo/tutorial, fitness/health, education, finance/business, and emotional/story contexts.

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

Mixed-effects models with participant and video/item as random effects; planned contrasts: SCC>FTO, BCC>SCC, BCC+>BCC, BCC>HBC. Report effect sizes and practical significance.

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

Pass if SCC beats FTO and/or BCC+ beats BCC by practical threshold without visual recall or accessibility regression. BCC passes only if it beats SCC on a pre-declared metric.

## Fail / demotion rule

If BCC does not beat SCC, demote bionic anchors to optional styling. If BCC+ does not beat BCC, simplify the system and test placement/adaptation separately.

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
