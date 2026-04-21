# Budget Certainty Engine

The agent should be aggressive in generation and conservative in spend.

## Budget envelope

Every campaign packet must state:

```text
max_daily_spend:
max_total_test_spend:
max_cpa_for_learning:
max_cpa_for_scale:
auto_pause_conditions:
auto_scale_conditions:
review_required_conditions:
```

## Kill rules

Pause or rewrite when:

- tracking breaks,
- spend occurs with zero landing-page engagement,
- CTR is far below channel baseline,
- CPC is too high for viable CAC,
- landing page gets visits but no proof engagement,
- proof engagement occurs but no activation,
- ad comments expose a trust issue,
- product promise and product experience mismatch.

## Scale rules

Scale only when:

- conversion tracking is stable,
- event quality is high,
- the offer is understood,
- the proof path is being consumed,
- early economics are plausible,
- failure mode is not hidden by attribution noise.

## Spend posture

```text
High autonomy in generating tests.
Bounded autonomy in launching tests.
Strict autonomy in spending money.
```

This is not committee control. It is preventing stupidity.
