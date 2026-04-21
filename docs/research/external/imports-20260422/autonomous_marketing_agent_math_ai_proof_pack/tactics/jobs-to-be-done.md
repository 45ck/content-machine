# Tactic: Jobs-To-Be-Done Ad

## When to use

Use when features are not enough to explain purchase motivation.

## Why it works

People hire products to make progress in a situation.

## Mindset

Sell the progress, not the feature list.

## Best channels

All channels, especially SaaS landing pages

## Inputs required

- Product facts.
- Buyer state.
- Buyer language.
- Proof or demo path.
- Offer.

## Generation prompt

```text
Using the Jobs-To-Be-Done Ad tactic, create campaign assets for [PRODUCT] targeting [BUYER] in [BUYER STATE] on [CHANNEL].
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

Activation quality, demo quality, conversion rate

## Failure modes

- Generic copy not tied to a buyer state.
- Too many claims without proof.
- Weak landing-page match.
- Measuring clicks when the tactic is meant to drive activation or pipeline.

## Memory update

After use, update:

- `memory/experiment_memory.md`
- `memory/tactic_performance.md`
- `runs/YYYY-MM-DD-jobs-to-be-done.md`
