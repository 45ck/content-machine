# Tactic 001: Search Intent Capture

## Buyer state

Solution-aware / active buyer

## What it does

Capture high-intent demand when buyer is already searching for category, competitor, problem, or integration.

## When to use

Use when there is existing search demand and a clear landing page.

## When not to use

Do not use when the category is unknown or search volume is irrelevant.

## Required inputs

Keyword cluster, buyer intent, destination URL, offer, proof assets.

## Why it works

This tactic works when the campaign aligns with a real buyer state instead of forcing generic persuasion. It should either increase relevance, make proof easier to inspect, reduce risk, increase perceived usefulness, increase perceived ease, or provide a timely prompt.

## Source anchors

Google Ads API, AI Max, DataReportal, Lewis/Rao/Reiley measurement.

## Agent mindset

Do not ask the buyer to believe. Give them a reason to inspect, test, compare, or continue.

## Creative output prompt

```text
Using the product facts, buyer language, and proof assets, create 10 ad variants for the tactic "Search Intent Capture".
For each variant include:
- buyer state
- hook
- body
- proof path
- CTA
- landing page destination
- risk / unsupported claim check
- expected metric
```

## Landing page proof path

```markdown
## Above the fold
- Problem:
- Specific promise:
- Proof cue:
- CTA:

## Proof section
- Demo/screenshot:
- Example:
- Testimonial/review/source:
- Limitation:

## Objection section
- Main objection:
- Direct answer:
- Evidence:
```

## Metrics

Impressions, CTR, CVR, qualified trials, CPA, incrementality if possible.

## Failure modes

- The ad is clever but not tied to buyer state.
- The claim is broader than the proof.
- The destination does not continue the same promise.
- The metric does not match the campaign job.
- The agent fails to update memory after results.

## Memory update

After use, update:

- `memory/creative_variants.md`
- `memory/tactic_performance.md`
- `memory/experiment_memory.md`
