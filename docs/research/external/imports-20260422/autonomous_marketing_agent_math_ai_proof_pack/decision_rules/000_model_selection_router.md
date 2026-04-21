# Model Selection Router

## Question 1: What decision is being made?

| Decision | Model |
|---|---|
| Which ad variant gets traffic? | bandit or A/B test |
| Did the campaign cause conversions? | lift test, holdout, geo test, CausalImpact |
| Which channel deserves more budget? | MMM + marginal response |
| Is this campaign profitable? | LTV/CAC/payback + posterior profit |
| Which audience should receive treatment? | uplift model |
| Is creative fatiguing? | fatigue model / nonstationary bandit |
| Why no sales? | funnel probability model |

## Question 2: Is causal proof required?

If yes, prefer controlled experiments/lift tests.

If no, use operational posterior decision-making but label it as such.

## Question 3: Is sample size small?

If yes, use Bayesian updates and learning decisions. Do not overclaim.
