# AIA-002 / GEN — Overlay Variant Generator

## Reference label

AIA-002 / GEN — Overlay Variant Generator

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | System Module |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Auto-generates transcript, keyword, compression, BCC, BCC+, and controls.

## Mechanism

Speeds A/B testing.

## Expected direction

More experiments per clip.

## Failure mode

Quality depends on prompts/rules.

## Minimum viable experiment

Manual vs generated variants.

## Primary metrics

Production time; quality score

## Source IDs

S11; S12; S14; S30; S31

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
