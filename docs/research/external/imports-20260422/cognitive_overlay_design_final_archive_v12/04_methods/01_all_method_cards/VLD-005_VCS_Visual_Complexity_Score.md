# VLD-005 / VCS — Visual Complexity Score

## Reference label

VLD-005 / VCS — Visual Complexity Score

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

Compute frame-level complexity and use it to regulate overlay density.

## Mechanism

Makes density adaptive and testable.

## Expected direction

Better across mixed footage.

## Failure mode

Complexity metric may not match human load.

## Minimum viable experiment

Manual vs automated complexity rules.

## Primary metrics

Prediction accuracy; recall

## Source IDs

S12; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
