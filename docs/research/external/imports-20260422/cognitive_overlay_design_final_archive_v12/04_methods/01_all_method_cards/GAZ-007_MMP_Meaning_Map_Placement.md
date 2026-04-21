# GAZ-007 / MMP — Meaning-Map Placement

## Reference label

GAZ-007 / MMP — Meaning-Map Placement

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Place text where it supports the semantic region of the scene.

## Mechanism

Combines semantic value with gaze tendencies.

## Expected direction

Better comprehension than visually loud placement.

## Failure mode

Meaning maps hard to automate.

## Minimum viable experiment

Meaning-aware vs low-level saliency placement.

## Primary metrics

Gist recall; gaze alignment

## Source IDs

S11; S12

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
