# AIA-014 / HLE — Human-in-the-Loop Editor

## Reference label

AIA-014 / HLE — Human-in-the-Loop Editor

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | Adaptive System |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

AI proposes; editor approves proposition, anchor, placement, timing.

## Mechanism

Balances speed with correctness.

## Expected direction

Fewer hallucinations than full automation.

## Failure mode

Still requires training/editor time.

## Minimum viable experiment

AI-only vs human-in-loop.

## Primary metrics

Accuracy; time saved

## Source IDs

S30

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
