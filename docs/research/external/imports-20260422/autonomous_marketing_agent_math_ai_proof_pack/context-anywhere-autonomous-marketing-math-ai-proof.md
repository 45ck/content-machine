# Context Anywhere: Autonomous Marketing Math AI Proof Extension

This bundle contains the core mathematical and AI engineering extension files for quick agent ingestion.

## 400_MATH_AI_PROOF_README.md

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


## MATHEMATICAL_OPERATING_LAW.md

# Mathematical Operating Law

The autonomous marketing system should treat every campaign as a controlled learning process.

## Core equation

```text
Expected profit
= traffic × attention_rate × inspection_rate × conversion_rate × gross_profit_per_conversion
  − media_spend − creative_cost − operational_cost − risk_cost
```

## Campaign posterior

Each campaign has a belief state:

```text
belief = {
  demand_probability,
  attention_probability,
  inspection_probability,
  conversion_probability,
  activation_probability,
  paid_probability,
  expected_ltv,
  expected_cac,
  uncertainty,
  fatigue_risk,
  measurement_confidence
}
```

The agent's job is to reduce uncertainty while preserving upside.

## Decision rule

```text
Choose the next action that maximizes:
E[profit_or_learning] − downside_penalty − opportunity_cost
```

Where learning has value when it changes the next action.

## Agent rule

No campaign is allowed to remain in an undefined state.

Every campaign must be one of:

- observing demand,
- testing attention,
- testing offer,
- testing proof path,
- testing conversion,
- testing activation,
- testing monetization,
- scaling,
- pausing,
- diagnosing,
- retired with learning memo.


## math_models/000_index.md

# Math Models Index

- [Autonomous Marketing State Space Model](./001_autonomous_marketing_state_space_model.md) — Use when modeling the whole system as state, action, observation, reward.
- [Buyer State POMDP](./002_buyer_state_pomdp.md) — Use when buyer intent is hidden and only inferred from behavior.
- [Funnel Probability Model](./003_funnel_probability_model.md) — Use for first-principles campaign decomposition.
- [Logistic Conversion Model](./004_logistic_conversion_model.md) — Use when predicting conversion probability from features.
- [Bayesian Beta-Binomial Model](./005_bayesian_beta_binomial_model.md) — Use for click/conversion rates with small samples.
- [Normal / Lognormal Revenue Model](./006_normal_model_for_revenue_and_profit.md) — Use when conversion value varies.
- [Adstock Carryover Model](./007_adstock_carryover_model.md) — Use when media effects persist over time.
- [Saturation and Hill Response Model](./008_saturation_hill_response_model.md) — Use when extra spend has diminishing returns.
- [Frequency, Fatigue, and Wearout Model](./009_frequency_fatigue_wearout_model.md) — Use when repeated exposures degrade response.
- [Bayesian Media Mix Model](./010_bayesian_media_mix_model.md) — Use when estimating cross-channel effects with uncertainty.
- [Geo Lift Model](./011_geo_lift_model.md) — Use when randomizing users is not practical but geos can be compared.
- [Difference-in-Differences Model](./012_difference_in_differences_model.md) — Use with pre/post treatment and control groups.
- [CausalImpact Structural Time Series Model](./013_causalimpact_structural_time_series_model.md) — Use when estimating campaign impact from time-series counterfactuals.
- [CUPED Variance Reduction Model](./014_cuped_variance_reduction_model.md) — Use when pre-experiment data can reduce variance.
- [Ratio Metric and Delta Method](./015_ratio_metric_delta_method.md) — Use for CPA, ROAS, conversion rate, revenue per visitor.
- [Sequential Testing and Always-Valid Inference](./016_sequential_testing_anytime_valid_model.md) — Use when the system wants to monitor live tests continuously.
- [Thompson Sampling for Bernoulli Bandits](./017_thompson_sampling_bernoulli_bandit.md) — Use for creative/ad variants with binary outcomes.
- [Contextual Bandit Model](./018_contextual_bandit_model.md) — Use when variant choice depends on audience/context.
- [Nonstationary Bandit with Decay](./019_nonstationary_bandit_decay_model.md) — Use when creative performance drifts or fatigues.
- [Bayesian Optimization for Landing Pages](./020_bayesian_optimization_for_landing_pages.md) — Use when testing continuous or structured design variables.
- [Uplift Model for Incrementality](./021_uplift_model_incrementality.md) — Use when targeting persuadable users instead of likely responders.
- [Response Surface and Budget Allocation](./022_response_surface_and_budget_allocation.md) — Use when allocating budget across channels/campaigns.
- [LTV, CAC, and Payback Model](./023_ltv_cac_payback_model.md) — Use when campaign economics matter more than surface conversions.
- [Unit Economics Guardrail Model](./024_unit_economics_guardrail_model.md) — Use to prevent scaling unprofitable demand.
- [Attribution as Weak Evidence Model](./025_attribution_as_weak_evidence_model.md) — Use when platform attribution is useful but not causal.
- [Risk-Adjusted Profit Utility Model](./026_profit_utility_decision_model.md) — Use for deciding whether to launch, scale, pause, or diagnose.
- [Power, Sample Size, and MDE](./027_power_sample_size_mde.md) — Use before tests to avoid underpowered nonsense.
- [Creative Fatigue Detection Model](./028_creative_fatigue_detection_model.md) — Use to detect declining response from repeated exposure.
- [Pricing and Offer Elasticity Model](./029_pricing_offer_elasticity_model.md) — Use when offer/pricing changes are central.
- [Probabilistic Roadmap](./030_probabilistic_roadmap.md) — Use to sequence tests by expected value of information.
- [Model Selection Table](./031_model_selection_table.md) — Use to choose models by problem and data.
- [Model Failure Modes](./032_model_failure_modes.md) — Use when a mathematical model is giving false certainty.
- [Formula Cheat Sheet](./033_formula_cheat_sheet.md) — Use as the quick reference for campaign math.


## math_models/033_formula_cheat_sheet.md

# Formula Cheat Sheet

## Funnel

```text
E[paid] = impressions × p_attention × p_click × p_inspect × p_signup × p_activate × p_pay
```

## Profit

```text
E[profit] = E[paid] × gross_profit_per_customer − spend − fixed_cost
```

## CAC

```text
CAC = spend / new_customers
```

## LTV

```text
LTV = ARPA × gross_margin / churn_rate
```

## Payback

```text
payback_months = CAC / (ARPA × gross_margin)
```

## Beta-binomial posterior

```text
p ~ Beta(α, β)
p | data ~ Beta(α + successes, β + failures)
```

## Logistic model

```text
p = 1 / (1 + exp(-(β0 + βX)))
```

## Adstock

```text
x*_t = x_t + λx*_{t-1}
```

## Hill saturation

```text
f(x) = x^s / (x^s + k^s)
```

## Difference-in-differences

```text
effect = (treat_post − treat_pre) − (control_post − control_pre)
```

## CUPED

```text
Y_cuped = Y − θ(X − mean(X))
θ = Cov(Y,X)/Var(X)
```

## Uplift

```text
τ(x) = E[Y(1) − Y(0) | X=x]
```

## Utility

```text
U = E[profit] + λ_learningE[learning] − λ_riskRisk − Cost
```


## ai_engineering/000_index.md

# AI Engineering Index

- [System Architecture](./001_system_architecture.md)
- [Markdown Data Contract](./002_markdown_data_contract.md)
- [Agent Roles](./003_agent_roles.md)
- [Single Agent With Skills vs Many Agents](./004_single_agent_with_skills_vs_many_agents.md)
- [Context Loading Strategy](./005_context_loading_strategy.md)
- [Memory Graph](./006_memory_graph.md)
- [Tool Contracts CLI First](./007_tool_contracts_cli_first.md)
- [Platform Adapter Contracts](./008_platform_adapter_contracts.md)
- [Eval Harness Design](./009_eval_harness_design.md)
- [LLM Judge Grader Suite](./010_llm_judge_grader_suite.md)
- [Deterministic Validators](./011_deterministic_validators.md)
- [Hooks and Permissions](./012_hooks_and_permissions.md)
- [Sandbox Execution](./013_sandbox_execution.md)
- [Trace Logging](./014_trace_logging.md)
- [Campaign Artifact Pipeline](./015_campaign_artifact_pipeline.md)
- [Research Ingestion Pipeline](./016_research_ingestion_pipeline.md)
- [Hypothesis Engine](./017_hypothesis_engine.md)
- [Variant Generation Engine](./018_variant_generation_engine.md)
- [Proof Path Generator](./019_proof_path_generator.md)
- [Measurement Agent](./020_measurement_agent.md)
- [Learning Agent](./021_learning_agent.md)
- [Quality Score System](./022_quality_score_system.md)
- [Failure Autopsy Agent](./023_failure_autopsy_agent.md)
- [Cost and Latency Budgeting](./024_cost_latency_budgeting.md)
- [Model Routing](./025_model_routing.md)
- [Agent Evaluation Benchmarks](./026_agent_evaluation_benchmarks.md)
- [Math Model Runner Prompt](./027_math_model_runner_prompt.md)
- [CLI Commands Contract](./028_cli_commands_contract.md)
- [Markdown Only Discipline](./029_markdown_only_discipline.md)


## proof_system/000_index.md

# Proof System Index

- [Foolproof Definition](./001_foolproof_definition.md)
- [No Magic Guarantees but Hard Loop](./002_no_magic_guarantees_but_hard_loop.md)
- [Demand Discovery Proof](./003_demand_discovery_proof.md)
- [Offer Strength Proof](./004_offer_strength_proof.md)
- [Creative Attention Proof](./005_creative_attention_proof.md)
- [Conversion Path Proof](./006_conversion_path_proof.md)
- [Measurement Proof](./007_measurement_proof.md)
- [Learning Proof](./008_learning_proof.md)
- [Compounding Memory Proof](./009_compounding_memory_proof.md)
- [Failure Mode Taxonomy](./010_failure_mode_taxonomy.md)
- [No Sales Diagnostic Tree](./011_no_sales_diagnostic_tree.md)
- [Failures to Math Models](./012_failures_to_math_models.md)
- [Control Limits and Pause Rules](./013_control_limits_and_pause_rules.md)
- [Scale Rules](./014_scale_rules.md)
- [Account Health Rules](./015_account_health_rules.md)
- [High Confidence Launch Criteria](./016_high_confidence_launch_criteria.md)
- [Market Not Ready Playbook](./017_market_not_ready_playbook.md)
- [Product Not Ready Playbook](./018_product_not_ready_playbook.md)
- [Automatic Recovery Loops](./019_automatic_recovery_loops.md)
- [Maturity Ladder](./020_maturity_ladder.md)


## decision_rules/000_model_selection_router.md

# Model Selection Router

## Question 1: What decision is being made?

| Decision | Model |
|---|---|
| Which ad variant gets traffic? | bandit or A/B test |
| Did the campaign cause conversions? | lift test, holdout, geo test, CausalImpact |
| Which channel deserves more budget? | MMM + marginal response |
| Is this campaign profitable? | LTV/CAC/payback + posterior profit |
| Which audience should receive treatment? | uplift model |
| Is creative fatiguing? | fatigue model / nonstationary bandit |
| Why no sales? | funnel probability model |

## Question 2: Is causal proof required?

If yes, prefer controlled experiments/lift tests.

If no, use operational posterior decision-making but label it as such.

## Question 3: Is sample size small?

If yes, use Bayesian updates and learning decisions. Do not overclaim.


## guarantee_math/000_index.md

# Guarantee Math Index

This directory defines the mathematical version of "guarantee."

The system cannot guarantee demand. It can guarantee:

- no undefined campaign state,
- no unmeasured launch,
- no unmodeled scaling decision,
- no failure without diagnosis,
- no result without memory update.


## guarantee_math/001_guarantee_equation.md

# Guarantee Equation

## System success

```text
System Success =
P(find_real_demand)
× P(find_relevant_angle | demand)
× P(find_strong_offer | angle)
× P(build_trusted_proof | offer)
× P(measure_correctly)
× P(update_memory)
× P(iterate_before_budget_exhaustion)
```

## Interpretation

The agent improves success by increasing each term.

## The strongest lever

```text
iteration_before_budget_exhaustion
```

The system needs cheap enough tests and fast enough learning to survive long enough to find signal.


## templates/math_ai/001_full_campaign_math_packet_template.md

# Campaign Math Packet

## Campaign

```text
name:
date:
owner:
product:
channel:
budget:
```

## Buyer state

```text
target_state:
evidence:
main_job:
main_objection:
```

## Hypothesis

```text
If:
Then:
Because:
```

## Math model selection

```text
decision:
selected_model:
why:
sample_needed:
uncertainty:
```

## Funnel assumptions

| Stage | Prior | Evidence |
|---|---:|---|
| attention | | |
| click | | |
| inspect | | |
| signup | | |
| activate | | |
| pay | | |

## Offer

```text
offer:
risk_reversal:
time_to_value:
```

## Proof path

```text
ad:
landing:
proof_asset:
CTA:
activation:
```

## Measurement

```text
primary_metric:
secondary_metrics:
guardrails:
events:
attribution_window:
test_type:
```

## Decision rules

```text
pause:
continue:
scale:
diagnose:
```


## skills/math-model-router/SKILL.md

---
name: math-model-router
description: Select the right mathematical model for a campaign decision.
---
# Math Model Router

## Use when

A campaign needs a decision, diagnosis, or measurement plan.

## Procedure

1. State the decision.
2. Identify data available.
3. Identify whether causal proof is required.
4. Identify sample size.
5. Select the simplest sufficient model.
6. Write assumptions.
7. Write next action.

## Output

```text
decision:
data_available:
causal_requirement:
sample_size:
recommended_model:
why:
assumptions:
next_action:
```


## skills/bayesian-campaign-update/SKILL.md

---
name: bayesian-campaign-update
description: Update campaign beliefs using Bayesian posterior logic.
---
# Bayesian Campaign Update

## Procedure

1. Identify metric.
2. Identify prior.
3. Count successes and failures.
4. Update posterior.
5. Compare to threshold.
6. Recommend continue, scale, pause, or diagnose.

## Rule

Never report posterior mean without uncertainty.


## skills/failure-to-next-experiment/SKILL.md

---
name: failure-to-next-experiment
description: Convert a failed campaign into the next best experiment.
---
# Failure to Next Experiment

## Procedure

1. Name failure stage.
2. Find evidence.
3. Select math model.
4. Generate new hypothesis.
5. Define next experiment.
6. Update memory.
