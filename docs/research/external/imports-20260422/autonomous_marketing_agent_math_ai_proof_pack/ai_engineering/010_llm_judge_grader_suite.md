# LLM Judge Grader Suite

## Purpose

Use model graders to score fuzzy marketing outputs.

## Graders

```text
Buyer State Fit Grader
Tactic Fit Grader
Specificity Grader
Skeptical Buyer Proof Grader
Claim Support Grader
Landing Proof Path Grader
Measurement Plan Grader
Learning Memo Grader
```

## Grading prompt shape

```text
You are grading a marketing artifact.
Score 0-5.
Cite the exact evidence from the artifact.
Penalize vague claims.
Penalize tactics that do not fit buyer state.
Penalize missing measurement.
Return score and required fixes.
```

## Rule

The same model that writes the artifact should not be the only grader.
