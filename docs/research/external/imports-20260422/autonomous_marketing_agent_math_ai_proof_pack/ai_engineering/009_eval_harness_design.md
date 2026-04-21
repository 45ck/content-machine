# Eval Harness Design

## Purpose

Evaluate the marketing agent before letting it run large campaigns.

## Eval types

```text
tactic_selection_eval
math_model_selection_eval
copy_quality_eval
claim_support_eval
proof_path_eval
measurement_plan_eval
failure_autopsy_eval
memory_update_eval
```

## Dataset

Use realistic cases:

```text
product_brief
buyer_segment
prior_campaign_results
budget
channel
constraints
expected_good_output
bad_output_examples
```

## Scoring

Use 0–5 scales:

| Score | Meaning |
|---|---|
| 0 | dangerous/wrong |
| 1 | poor |
| 2 | incomplete |
| 3 | usable |
| 4 | strong |
| 5 | excellent |

## Passing rule

A launch packet must pass:

```text
math_model_selection >= 4
proof_path >= 4
measurement_plan >= 4
copy_quality >= 3
claim_support >= 5
```
