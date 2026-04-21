# EXP-002 — SCC vs BCC Ablation Trial

## Status

| Field | Value |
|---|---|
| Priority | P0 |
| Phase | Pilot first |
| Linked methods | SCC, BCC, HBC |
| Source IDs | S06, S14, S18 |

## Purpose

Isolate whether bionic concept anchors add value after semantic compression has already reduced the text.

## Mechanism bundle

- Sparse Attention Anchoring
- Bionic Dose Response
- Semantic Compression

## Why this experiment exists

This experiment converts a design assumption into a falsifiable comparison. It should be run before promoting any related method into production defaults. The goal is not to make a style look good; the goal is to determine whether the method improves the metric that its mechanism predicts.

## Conditions

| Code | Condition |
| --- | --- |
| SCC | Compression-only captions. |
| BCC | Compression plus sparse bionic concept anchors. |
| HBC | Heavy bionic formatting across most words. |

## Falsifiable hypotheses

- H1: BCC improves concept recall over SCC if sparse anchors work.
- H2: HBC increases effort and visual noise compared with BCC.
- H3: If SCC equals or beats BCC, bionic anchoring is not core.

## Primary metric

Gist recall and concept-word recall.

## Secondary metrics

Reading ease, perceived clarity, fixation count on text, saccades, preference.

## Sample and participants

Pilot n=40; validation n=120. Within-subject but counterbalance video-condition assignment.

Participant notes:

- Test on mobile-sized playback whenever possible.
- Record whether participants watched audio-on or muted.
- Record native language / L2 status where relevant.
- Record prior familiarity with the content domain where relevant.
- Exclude trials where participants did not actually view enough of the video to answer.

## Study design

Ablation design with identical semantic captions, differing only in anchor treatment.

Design requirements:

1. Hold source footage constant across conditions.
2. Change only the target overlay variable unless the experiment explicitly tests a package such as BCC+.
3. Counterbalance order to avoid fatigue/order effects.
4. Prevent participants from seeing the same script in multiple overlay conditions unless the experiment explicitly tests repeated exposure.
5. Keep full accessibility captions available where accessibility is not the manipulated variable.

## Stimulus requirements

Short conceptual clips with clear key terms: motivation/structure, friction/start, recall/rereading, visibility/budgeting.

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

Planned contrasts BCC>SCC and BCC>HBC. Use non-inferiority guardrail for effort: BCC must not feel harder than SCC.

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

BCC passes if it improves concept recall or attention efficiency over SCC without increasing effort.

## Fail / demotion rule

If BCC fails, keep SCC as default and use bionic anchors only as optional style or segment-specific variant.

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
