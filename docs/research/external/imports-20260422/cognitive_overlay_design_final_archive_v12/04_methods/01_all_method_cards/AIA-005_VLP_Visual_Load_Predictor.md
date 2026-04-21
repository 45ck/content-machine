# AIA-005 / VLP — Visual Load Predictor

## Reference label

AIA-005 / VLP — Visual Load Predictor

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | System Module |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

Estimate per-frame visual complexity to choose word count.

## Mechanism

Controls visual-channel load.

## Expected direction

Better comprehension in busy scenes.

## Failure mode

Metric may not match human load.

## Minimum viable experiment

Human-coded vs model-coded load.

## Primary metrics

Prediction validity; recall

## Source IDs

S12; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
