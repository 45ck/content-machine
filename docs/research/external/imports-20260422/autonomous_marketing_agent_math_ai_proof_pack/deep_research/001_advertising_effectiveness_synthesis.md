# Advertising Effectiveness Synthesis

## Core position

Advertising works, but not in the naive way.

The naive model is:

```text
ad claim → belief → purchase
```

The stronger model is:

```text
attention/relevance → memory or inspection → evidence exposure → risk reduction → trial/purchase → reinforcement
```

## What the research says

### Advertising has multiple routes

Vakratsas and Ambler review a large advertising literature and show that advertising can work through cognition, affect, experience, memory, and behavior. This matters because an autonomous agent should not write every ad as if it must prove the whole sale inside the ad.

### Effects are real but usually bounded

Meta-analyses of advertising elasticity show that advertising effects are often real but modest. This implies the agent should generate systems of campaigns, proof paths, and measurement loops rather than expecting one clever line to dominate.

### Short-term and long-term jobs differ

Activation campaigns harvest current demand. Brand-building creates future mental availability and preference. The same ad cannot be judged by the same metric in every state.

## Agent decision rules

| Buyer state | Primary ad job | Main proof path | Primary metric |
|---|---|---|---|
| Unaware | Make problem or category visible | Educational content, POV, narrative | Engaged visits, scroll, saves, branded search lift |
| Problem-aware | Name pain and cost | Problem calculator, workflow breakdown | CTR to proof, lead magnet conversion |
| Solution-aware | Show mechanism | Demo, comparison, explainer | Demo starts, trial starts |
| Vendor-aware | Reduce risk | Reviews, case studies, docs, pricing, security | Trial activation, sales-qualified conversion |
| Active buyer | Remove friction | Pricing, migration, objection handling | Checkout/demo completion, pipeline |
| User/trial | Prove value fast | Onboarding, activation, lifecycle emails | Activation, retained usage, paid conversion |

## Practical implication

The agent should generate **ad plus proof path**, not ad alone.

Every campaign file should contain:

```markdown
- Buyer state
- Ad job
- Core claim
- Proof path
- Landing page destination
- Measurement plan
- Follow-up action if buyer clicks but does not convert
```
