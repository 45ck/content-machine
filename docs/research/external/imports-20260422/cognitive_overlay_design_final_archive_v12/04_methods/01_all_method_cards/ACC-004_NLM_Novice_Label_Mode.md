# ACC-004 / NLM — Novice Label Mode

## Reference label

ACC-004 / NLM — Novice Label Mode

## Classification

| Field | Value |
|---|---|
| Category | Personalization / Access |
| Family | Accessibility and Personalization |
| Class | Rule / Mode |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Strong adjacent |
| Status | Backlog |

## Definition

Add labels for unfamiliar concepts before compressing heavily.

## Mechanism

Builds pretraining/context.

## Expected direction

Better beginner comprehension.

## Failure mode

More text load.

## Minimum viable experiment

Labels vs no labels for beginners.

## Primary metrics

Beginner gist; effort

## Source IDs

S09; S10

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
