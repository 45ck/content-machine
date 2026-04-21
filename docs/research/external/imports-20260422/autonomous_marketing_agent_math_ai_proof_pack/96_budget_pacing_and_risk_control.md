# Budget Pacing and Risk Control

## Budget architecture

Use four nested layers:

1. Account maximum daily spend controlled by agent.
2. Channel maximum daily spend.
3. Experiment maximum spend.
4. Variant maximum spend.

The agent cannot move money across layers without permission.

## Example budget policy

```yaml
account_daily_cap: 200
channel_caps:
  google_search: 80
  meta: 60
  linkedin: 40
  tiktok: 20
experiment_cap: 150
variant_cap: 30
max_budget_increase_per_day_pct: 20
requires_human_approval_above: 50
```

## Pacing checks

Run hourly or daily:

- spend vs expected pace,
- spend vs conversions,
- budget cap proximity,
- cost per activated user,
- CPA vs threshold,
- abnormal click spikes,
- geographic anomalies,
- policy disapprovals,
- landing page errors.

## Risk tiers

| Tier | Spend | Claim risk | Autonomy |
|---|---:|---|---|
| Sandbox | $0 | Any | Generate only |
| Lab | <$50/day | Low | Auto-launch allowed |
| Pilot | <$250/day | Low/medium | Approval for medium risk |
| Production | Higher | Controlled | Human budget approval |
| Sensitive | Any | High | Manual review |

## Fraud and anomaly detection

Flag:

- unusually high CTR with zero downstream engagement,
- sudden geographic concentration,
- bot-like session duration,
- repeated form spam,
- bounce spikes,
- clicks from excluded locations,
- conversion events without activation quality.

## Automatic actions

Allow:

- pause ad,
- pause ad set/ad group,
- lower budget within approved floor,
- notify owner,
- open incident,
- create replacement draft.

Require approval:

- increase budget,
- expand targeting,
- change offer,
- use new claims,
- launch high-risk category ads.

## Mindset

Budget is a blast radius. Control it before increasing autonomy.
