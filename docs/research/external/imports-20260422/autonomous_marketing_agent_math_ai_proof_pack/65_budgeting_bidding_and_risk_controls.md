# Budgeting, Bidding, and Risk Controls for Autonomous Ads

## Why budget controls matter

Autonomy connected to spend is a financial system. It needs circuit breakers.

## Budget hierarchy

| Level | Control |
|---|---|
| Account | monthly max spend |
| Platform | max spend per platform |
| Campaign | daily and total test cap |
| Hypothesis | max learning budget |
| Creative | max spend before minimum signal |
| Segment | max spend before quality review |
| Autonomy | max system-initiated budget increase |

## Default budget rules

1. No campaign launches without total test cap.
2. No campaign launches without daily cap.
3. No budget increase above pre-approved threshold.
4. No new platform expansion without approval.
5. No new objective optimization event without approval.
6. No scaling from CTR alone.
7. No scaling if tracking caveats are unresolved.
8. No scaling if lead quality is below threshold.
9. No spend if final URL or checkout/signup path is broken.
10. No spend on unapproved claims.

## Learning budget concept

A test budget is not meant to buy profit immediately. It buys information.

For each test, define:

- What will we learn?
- Why is that learning valuable?
- How much are we willing to spend to learn it?
- What result would stop us?
- What result would justify iteration?
- What result would justify scale?

## Auto-pause thresholds

Examples:

| Trigger | Action |
|---|---|
| Spend > 30% cap with no tracked sessions | pause immediately |
| Tracking event missing | pause campaign |
| Platform policy warning | pause affected ad |
| CPA > 3x target after minimum data | reduce or pause |
| CTR extremely high but activation near zero | review for clickbait/mismatch |
| Sudden spend spike | pause and alert |
| Complaint/negative feedback spike | pause creative |
| Lead quality below threshold | pause or switch optimization event |

## Auto-scale thresholds

Examples:

| Trigger | Action |
|---|---|
| CPA below target and activation quality good | increase budget within cap |
| Winner persists across two measurement windows | increase budget slowly |
| Search term quality strong | expand keywords cautiously |
| Creative fatigue low and conversion stable | maintain/increase |
| Downstream quality unverified | hold budget |

## Exploration allocation

Reserve a fixed percentage for exploration.

Example:

- 70% proven winners.
- 20% adjacent variants.
- 10% new hypotheses.

Early-stage products may invert this because they need learning more than efficiency.

## Bidding strategy by maturity

### Low data

Use manual or conservative automated bidding. Focus on clean signals and learning.

### Moderate data

Use platform optimization carefully with qualified conversion events.

### High data

Use automated bidding with guardrails and periodic incrementality checks.

## Risk bands

| Risk band | Example campaign | Autonomy allowed |
|---|---|---|
| Low | Search ad for documented feature to docs/demo page | L4 possible |
| Medium | Competitor comparison with approved claims | L3 or gated L4 |
| High | AI capability claim with quantified result | human approval |
| Very high | Health/finance/political/personal vulnerability | strict human/legal review |

## Spend anomaly detection

Watch:

- spend velocity above expected,
- CPC spike,
- CPM spike,
- conversion drop,
- bot-like traffic,
- sudden geographic shift,
- placement anomaly,
- high bounce from paid traffic,
- duplicate conversion events.

## Post-spend review

Every autonomous campaign should produce:

- amount spent,
- what was learned,
- whether learning justified spend,
- whether budget rules were followed,
- any policy/quality incidents,
- next action.

## Budget mindset

> Do not give autonomy a blank cheque. Give it a laboratory budget, strict doors, and a logbook.
