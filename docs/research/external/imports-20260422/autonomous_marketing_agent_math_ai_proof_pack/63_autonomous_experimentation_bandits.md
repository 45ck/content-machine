# Autonomous Experimentation, Bandits, and Creative Optimization

## The problem

AI can create more ad variants than you can responsibly test. The bottleneck becomes allocation: which variants get traffic, when to stop, when to scale, and how to avoid fooling yourself.

## Testing methods

### Fixed A/B or A/B/n test

**Use when:** You need clean comparison and can afford equal allocation.

**Strength:** Easier interpretation.

**Weakness:** Can waste traffic on losers.

**Mindset:** use when learning quality matters more than immediate return.

### Sequential testing

**Use when:** You want planned interim checks without completely invalidating inference.

**Strength:** Can stop early with rules.

**Weakness:** Requires discipline.

**Mindset:** predefine looks and decisions.

### Multi-armed bandit

**Use when:** You want to balance learning and performance during live traffic.

**Strength:** Sends more traffic to winners as evidence accumulates.

**Weakness:** Harder to interpret causally; can prematurely exploit noisy winners.

**Mindset:** exploration is the price of avoiding local maxima.

### Contextual bandit

**Use when:** Different segments or contexts likely respond to different creatives.

**Strength:** Learns which creative works for which context.

**Weakness:** Requires enough context data and careful privacy controls.

**Mindset:** personalization must be justified by value and privacy.

### Platform auto-optimization

**Use when:** Conversion volume is enough and platform algorithms have reliable signals.

**Strength:** Fast and practical.

**Weakness:** Black-box; may optimize for low-quality conversions.

**Mindset:** feed it clean conversion events and guardrails.

### Holdout/incrementality test

**Use when:** You need to know whether ads caused additional conversions.

**Strength:** Stronger causal insight.

**Weakness:** More complex and sometimes expensive.

**Mindset:** ROAS is not incrementality.

## Minimum data discipline

Before automating decisions, define:

- primary metric,
- guardrail metrics,
- minimum spend,
- minimum impressions,
- minimum conversions,
- maximum CPA/CAC,
- fatigue threshold,
- policy rejection response,
- tracking failure response,
- sample contamination risks.

## Creative fatigue rules

Watch:

- rising frequency,
- declining CTR,
- rising CPM/CPC,
- rising CPA,
- negative comments,
- reduced thumb-stop/watch rate,
- declining landing-page engagement.

Auto-actions:

- rotate fresh variant from same approved claim,
- reduce budget,
- expand only if quality holds,
- trigger new creative generation if fatigue persists.

## Kill rules

Examples:

- Pause if tracking is broken for more than 30 minutes.
- Pause if spend exceeds test cap with zero primary conversions.
- Pause if policy warning appears.
- Pause if complaint rate exceeds threshold.
- Pause if landing page returns error.
- Pause if lead quality is materially below baseline.
- Pause if the system detects unsupported claim leakage.

## Scale rules

Examples:

- Increase budget only after primary and quality metrics pass.
- Increase no more than a preset percentage per day.
- Do not scale based only on CTR.
- Do not scale if conversion event is low-quality or easy to game.
- Require landing-page and downstream activation confirmation.

## What AI should optimize for

Bad target:

- CTR alone.
- Cheapest leads alone.
- Platform-reported ROAS alone.

Better target:

- qualified activation,
- pipeline quality,
- retention proxy,
- gross-margin-adjusted CAC,
- payback period,
- trust and complaint guardrails.

## Experiment ledger

```csv
experiment_id,hypothesis_id,platform,buyer_state,variants,primary_metric,guardrail_metrics,budget_cap,start_date,end_date,decision,learning,next_test
EXP-001,HYP-014,Google,solution_aware,"A,B,C",activated_demo,"CPA,lead_quality,policy_rejections",500,2026-04-22,2026-05-05,iterate,"Workflow-specific copy beat generic productivity",Test proof-led landing page
```

## Bandit pseudocode

```text
Initialize each creative with equal prior.
For each decision interval:
  Pull performance by creative.
  Validate tracking and policy state.
  Exclude creatives that breached hard guardrails.
  Update each creative's estimated reward.
  Allocate next traffic share:
    - reserve exploration budget
    - give more to high-posterior variants
    - cap daily changes to avoid instability
  Log decision and rationale.
  Escalate if results conflict with guardrails.
```

## Do not automate these interpretations

The system may suggest, but a human should review:

- "This campaign is profitable" when attribution is weak.
- "This claim works" when downstream activation is poor.
- "This segment is bad" from small sample size.
- "This ad is compliant" after platform rejection.
- "This result generalizes" across different markets or platforms.

## Operating law

> The machine can allocate traffic. It cannot absolve you from causal thinking.
