# Queue Worker and Scheduler

## Why this matters

Ad factories run on recurring work: fetch metrics, check spend, refresh variants, run policy scans, update stale claims, and produce learning memos.

## Jobs

| Job | Frequency | Action |
|---|---|---|
| `fetch_platform_metrics` | hourly/daily | Pull metrics from APIs |
| `check_budget_pacing` | hourly | Compare spend to caps |
| `run_kill_rules` | hourly/daily | Pause bad/risky variants |
| `scan_policy_status` | daily | Detect disapprovals and risky assets |
| `refresh_creative_candidates` | weekly | Generate new variants from learning memory |
| `expire_claims` | daily | Mark expired claims as unusable |
| `sync_crm_outcomes` | daily | Pull pipeline/revenue outcomes |
| `write_learning_memos` | after test | Summarise result and next test |
| `reconcile_platform_ids` | daily | Ensure internal/external object mapping |

## Queue priorities

1. Safety/kill-switch jobs.
2. Budget-control jobs.
3. Policy review jobs.
4. Metrics ingestion.
5. Creative generation.
6. Research tasks.

## Worker rule

A worker may never launch a campaign unless it receives:

- approved experiment ID,
- approved claim IDs,
- budget cap,
- channel cap,
- approval token or auto-launch policy match,
- valid landing page,
- UTM convention.

## Example scheduler

```yaml
jobs:
  fetch_metrics:
    cron: "0 * * * *"
  budget_guard:
    cron: "15 * * * *"
  kill_rules:
    cron: "30 * * * *"
  claim_expiry:
    cron: "0 4 * * *"
  weekly_learning_review:
    cron: "0 9 * * MON"
```
