# Campaign Artifact Contract

Every autonomous campaign should be represented as one Markdown directory.

```text
campaigns/YYYY-MM-DD_slug/
  00_campaign_brief.md
  01_research_notes.md
  02_buyer_state.md
  03_tactic_selection.md
  04_creative_variants.md
  05_landing_page_proof_path.md
  06_platform_packet.md
  07_measurement_plan.md
  08_launch_log.md
  09_learning_memo.md
  10_memory_updates.md
```

## Why this matters

This structure lets the agent run without losing state. It also lets future agents inspect what was tried, why, what changed, and what happened.

## Minimum campaign brief fields

```markdown
# Campaign Brief

## Product
## Audience
## Buyer state
## Trigger event
## Job to be done
## Main pain
## Main desire
## Main objection
## Core offer
## Product proof
## Channel
## Tactic
## Destination
## Measurement
## Next action
```
