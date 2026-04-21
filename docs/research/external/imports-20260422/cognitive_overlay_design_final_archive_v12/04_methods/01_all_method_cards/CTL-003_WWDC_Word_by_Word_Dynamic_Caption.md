# CTL-003 / WWDC — Word-by-Word Dynamic Caption

## Reference label

CTL-003 / WWDC — Word-by-Word Dynamic Caption

## Classification

| Field | Value |
|---|---|
| Category | Negative Control |
| Family | Controls and Failure Modes |
| Class | Control / Baseline |
| Phase | Experiment control |
| Priority | P0 |
| Evidence grade | Control |
| Status | Backlog |

## Definition

Active word highlight following speech.

## Mechanism

Common creator-tool baseline.

## Expected direction

May perform well for rhythm; worse for learning.

## Failure mode

Forces tracking every word.

## Minimum viable experiment

Compare to semantic beats.

## Primary metrics

Gist; fatigue

## Source IDs

S19; S24

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
