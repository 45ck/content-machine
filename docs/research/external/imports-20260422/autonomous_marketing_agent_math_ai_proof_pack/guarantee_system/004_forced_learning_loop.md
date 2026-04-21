# Forced Learning Loop

Autonomous marketing works only if learning is forced into memory.

## The loop

```text
observe → diagnose → hypothesize → generate → package → test → measure → explain → update memory → generate next test
```

## Every run must create files

```text
campaigns/YYYY-MM-DD_slug/
  00_campaign_brief.md
  01_market_observations.md
  02_buyer_state_diagnosis.md
  03_hypotheses.md
  04_tactic_selection.md
  05_ad_variants.md
  06_proof_path.md
  07_platform_packet.md
  08_measurement_plan.md
  09_launch_log.md
  10_results_snapshot.md
  11_learning_memo.md
  12_next_campaign.md
  13_memory_updates.md
```

## Learning memo contract

A learning memo must contain:

```text
Tested hypothesis:
Result:
Confidence:
What improved:
What worsened:
Most likely cause:
Evidence for cause:
What to stop doing:
What to repeat:
What to modify:
Next action:
Memory updates:
```

## No dead-end rule

A failed test is invalid unless it produces at least one of:

- a better audience,
- a better offer,
- a better proof asset,
- a better channel,
- a better landing page,
- a better buyer-state model,
- a product problem that must be fixed.

## Memory files to update

```text
memory/product_facts.md
memory/buyer_language.md
memory/experiment_memory.md
memory/tactic_performance.md
memory/channel_findings.md
memory/offer_findings.md
memory/proof_assets.md
memory/failed_hypotheses.md
memory/winning_patterns.md
```

## Agent rule

If the agent cannot explain what it learned, it has not finished the run.
