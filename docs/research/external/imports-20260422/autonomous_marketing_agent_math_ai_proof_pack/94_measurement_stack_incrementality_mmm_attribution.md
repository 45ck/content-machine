# Measurement Stack: Attribution, Incrementality, MMM

## Three layers

### 1. Operational attribution

Purpose: day-to-day optimisation.

Examples:

- CTR,
- CPC,
- CPM,
- conversion rate,
- cost per lead,
- cost per activated trial,
- pipeline by source.

Weakness: can over-credit ads that merely captured people who would have converted anyway.

### 2. Incrementality

Purpose: causal evidence.

Question: what happened because ads ran that would not have happened otherwise?

Methods:

- platform conversion lift,
- geo holdout,
- audience holdout,
- PSA/control ads,
- matched-market tests,
- time-based switchback tests.

### 3. Marketing mix modelling

Purpose: budget allocation across channels over longer horizons.

Use when:

- spend is high enough,
- multiple channels interact,
- privacy limits user-level tracking,
- sales cycles are long,
- brand demand matters.

## Decision hierarchy

Do not use only one measurement method.

| Decision | Best evidence |
|---|---|
| Pause a bad creative | Operational metrics |
| Scale a winner inside same channel | Operational metrics + holdout if possible |
| Decide whether a channel deserves budget | Incrementality |
| Allocate annual budget | Incrementality + MMM + business constraints |
| Judge ad claim/message learning | Experiment-level results and qualitative review |

## Incrementality rules

- Pre-register the hypothesis.
- Define primary metric before launch.
- Keep treatment/control clean.
- Avoid stopping early because the dashboard looks good.
- Report uncertainty.
- Store negative results.
- Do not use platform lift as the only source of business truth.

## Sources

- Google Ads conversion lift: https://support.google.com/google-ads/answer/12003020?hl=en-AU
- Google Ads API experiments: https://developers.google.com/google-ads/api/docs/experiments/overview
- Meta lift studies: https://developers.facebook.com/docs/marketing-api/guides/lift-studies/
- Designing Experiments to Measure Incrementality on Facebook: https://arxiv.org/abs/1806.02588
