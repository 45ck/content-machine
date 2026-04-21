# Tactic: Mechanism Explanation

## When to use

Use when buyers need to understand why this solution works.

## Why it works

A clear mechanism makes claims more believable.

## Mindset

Explain the engine. Reduce magic. Increase inspectability.

## Best channels

Search, LinkedIn, technical audiences, landing pages

## Inputs required

- Product facts.
- Buyer state.
- Buyer language.
- Proof or demo path.
- Offer.

## Generation prompt

```text
Using the Mechanism Explanation tactic, create campaign assets for [PRODUCT] targeting [BUYER] in [BUYER STATE] on [CHANNEL].
Use only facts from product memory and buyer language memory.
Create:
1. 10 hooks
2. 10 headlines
3. 5 body copy variants
4. 3 CTAs
5. 1 creative brief
6. 1 landing-page section outline
7. 1 experiment hypothesis
```

## Launch pattern

1. Match the tactic to one buyer state.
2. Generate variants around one central hypothesis.
3. Create message-matched landing page or section.
4. Define the primary metric before launch.
5. Record result in `memory/tactic_performance.md`.

## Metrics

Time on page, demo starts, technical stakeholder engagement

## Failure modes

- Generic copy not tied to a buyer state.
- Too many claims without proof.
- Weak landing-page match.
- Measuring clicks when the tactic is meant to drive activation or pipeline.

## Memory update

After use, update:

- `memory/experiment_memory.md`
- `memory/tactic_performance.md`
- `runs/YYYY-MM-DD-mechanism-explanation.md`
