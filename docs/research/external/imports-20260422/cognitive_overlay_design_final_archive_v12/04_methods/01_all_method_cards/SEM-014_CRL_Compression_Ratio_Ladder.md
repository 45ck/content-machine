# SEM-014 / CRL — Compression Ratio Ladder

## Reference label

SEM-014 / CRL — Compression Ratio Ladder

## Classification

| Field | Value |
|---|---|
| Category | Semantic / Compression |
| Family | Semantic Compression |
| Class | Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong adjacent |
| Status | Backlog |

## Definition

Test 100%, 60%, 30%, 15%, and 5% transcript equivalents.

## Mechanism

Finds minimum viable text.

## Expected direction

Identifies optimal text density by content type.

## Failure mode

Too low loses context; too high overloads.

## Minimum viable experiment

Same clip at multiple compression ratios.

## Primary metrics

Gist recall; text dwell; effort

## Source IDs

S06; S07; S09; S10; S27

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
