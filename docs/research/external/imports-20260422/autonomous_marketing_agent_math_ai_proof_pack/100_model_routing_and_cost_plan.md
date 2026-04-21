# Model Routing and Cost Plan

## Principle

Use the most capable model to design and verify. Use cheaper/faster models for narrow production once outputs are constrained.

## Model task split

| Task | Model type | Reason |
|---|---|---|
| Strategy synthesis | Frontier reasoning model | High ambiguity, many constraints |
| Claim extraction | Strong structured-output model | Accuracy and schema adherence |
| Copy variants | Fast creative model | Volume |
| Policy review | Strong reasoning model + rules | Low tolerance for false negatives |
| Data cleaning | Cheap model or deterministic code | Repeatable low-risk work |
| Image prompts | Creative multimodal model | Visual specificity |
| Landing page outline | Strong writing/reasoning model | Structure and trust logic |
| Platform payload generation | Structured-output model | Schema correctness |
| Budget/rule execution | Deterministic code | Do not let LLM improvise money decisions |

## Routing ladder

1. Start with strongest model for the whole workflow to establish quality.
2. Build eval set.
3. Move low-risk subtasks to cheaper models.
4. Keep compliance, claim review, and final launch checks on stronger models plus deterministic validators.
5. Audit cost per launched experiment, not cost per generated variant.

## Cost metrics

- Cost per research memo.
- Cost per approved angle.
- Cost per approved ad variant.
- Cost per launched experiment.
- Cost per learning memo.
- Cost per activated trial/customer.

## Failure rule

If cheaper models increase policy failures, hallucinated claims, or review time, they are not cheaper.

## Mindset

Cost optimisation begins after reliability exists.
