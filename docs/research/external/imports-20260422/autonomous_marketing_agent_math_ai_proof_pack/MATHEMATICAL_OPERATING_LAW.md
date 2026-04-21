# Mathematical Operating Law

The autonomous marketing system should treat every campaign as a controlled learning process.

## Core equation

```text
Expected profit
= traffic × attention_rate × inspection_rate × conversion_rate × gross_profit_per_conversion
  − media_spend − creative_cost − operational_cost − risk_cost
```

## Campaign posterior

Each campaign has a belief state:

```text
belief = {
  demand_probability,
  attention_probability,
  inspection_probability,
  conversion_probability,
  activation_probability,
  paid_probability,
  expected_ltv,
  expected_cac,
  uncertainty,
  fatigue_risk,
  measurement_confidence
}
```

The agent's job is to reduce uncertainty while preserving upside.

## Decision rule

```text
Choose the next action that maximizes:
E[profit_or_learning] − downside_penalty − opportunity_cost
```

Where learning has value when it changes the next action.

## Agent rule

No campaign is allowed to remain in an undefined state.

Every campaign must be one of:

- observing demand,
- testing attention,
- testing offer,
- testing proof path,
- testing conversion,
- testing activation,
- testing monetization,
- scaling,
- pausing,
- diagnosing,
- retired with learning memo.
