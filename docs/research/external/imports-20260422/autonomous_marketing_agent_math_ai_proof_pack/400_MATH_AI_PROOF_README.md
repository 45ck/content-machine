# Mathematical and AI Engineering Proof System

This extension turns the autonomous marketing pack into a mathematical control system.

The aim is not to pretend that one ad can guarantee revenue. The aim is to make the system as hard as possible to fool, stall, or waste:

1. model the buyer journey as probabilities and state transitions,
2. model campaign performance as posterior belief, not vibes,
3. allocate traffic with bandits when learning-while-earning matters,
4. use controlled tests, lift tests, CUPED, and MMM when causal proof matters,
5. force every campaign into Markdown artifacts the agent can read, update, and reuse,
6. make every failure produce a sharper next experiment.

## New directories

```text
math_models/
ai_engineering/
proof_system/
decision_rules/
guarantee_math/
model_cards/
source_notes_math_ai/
simulation_lab/
templates/math_ai/
runbooks/math_ai/
skills/* math/AI skills
```

## Core line

```text
Foolproof does not mean every market buys.
Foolproof means the agent cannot stay vague: it must model, test, measure, update, and try the next best path.
```

## Use order

1. Read `proof_system/001_foolproof_definition.md`.
2. Read `math_models/033_formula_cheat_sheet.md`.
3. Use `decision_rules/000_model_selection_router.md`.
4. Create a campaign folder using `templates/math_ai/001_full_campaign_math_packet_template.md`.
5. Run `skills/math-model-router/SKILL.md`.
6. Run `skills/bayesian-campaign-update/SKILL.md`.
7. Run `skills/failure-to-next-experiment/SKILL.md`.
