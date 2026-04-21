# Markdown Data Contract

## Rule

Every durable artifact must be Markdown.

Markdown is the data layer, memory layer, prompt layer, run log, and audit trail.

## Standard campaign folder

```text
campaigns/YYYY-MM-DD_slug/
  00_campaign_brief.md
  01_buyer_state.md
  02_math_model_selection.md
  03_hypotheses.md
  04_creative_variants.md
  05_proof_path.md
  06_platform_packet.md
  07_measurement_plan.md
  08_posterior_updates.md
  09_decision_log.md
  10_learning_memo.md
  11_memory_updates.md
```

## Required headings

Every campaign file should include:

```text
# Title
## Purpose
## Inputs
## Decisions
## Evidence
## Output
## Next Action
```

## Tables over JSON

Use Markdown tables for structured data unless the agent must include an API payload as a fenced example.

Even then, the file remains `.md`.
