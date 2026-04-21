# Reference Implementation Pseudocode

This is not production code. It defines the control flow for an autonomous ad factory.

## Core services

```text
FactBankService
ClaimLedgerService
ResearchService
HypothesisService
CreativeService
PolicyService
ExperimentService
PlatformPayloadService
ApprovalService
LaunchService
MonitorService
LearningService
```

## Main flow

```python
def create_campaign_family(product_id, buyer_state, platform, autonomy_level):
    facts = FactBankService.get_current_facts(product_id)
    claims = ClaimLedgerService.get_approved_claims(product_id, platform)
    research = ResearchService.summarize_customer_language(product_id, buyer_state)

    hypotheses = HypothesisService.generate(
        facts=facts,
        claims=claims,
        research=research,
        buyer_state=buyer_state,
        platform=platform,
    )

    approved_hypotheses = []
    for h in hypotheses:
        if h.risk_level in ["high", "very_high"]:
            ApprovalService.escalate(h)
        elif ExperimentService.is_testable(h):
            approved_hypotheses.append(h)

    for h in approved_hypotheses:
        variants = CreativeService.generate(platform=platform, hypothesis=h, claims=claims)
        variants = CreativeService.critic_filter(variants)
        policy_result = PolicyService.check(variants=variants, claims=claims, platform=platform)

        if policy_result.status == "blocked":
            LearningService.log_blocked(h, policy_result)
            continue

        if policy_result.status == "escalate":
            ApprovalService.escalate(policy_result)
            continue

        plan = ExperimentService.plan(hypothesis=h, variants=policy_result.approved_variants)
        payload = PlatformPayloadService.build(platform=platform, plan=plan)
        PlatformPayloadService.validate(payload)

        if autonomy_level < 4:
            ApprovalService.request_human_launch_approval(payload)
        else:
            if ApprovalService.is_inside_l4_bounds(payload):
                LaunchService.launch(payload)
            else:
                ApprovalService.request_human_launch_approval(payload)
```

## Monitor loop

```python
def monitor_campaign(campaign_id):
    while campaign_is_active(campaign_id):
        status = LaunchService.read_platform_status(campaign_id)
        metrics = MonitorService.fetch_metrics(campaign_id)
        tracking = MonitorService.check_tracking(campaign_id)
        policy = MonitorService.check_policy_status(campaign_id)

        if not tracking.ok:
            LaunchService.pause(campaign_id, reason="tracking_failure")
            ApprovalService.notify("tracking_failure", campaign_id)
            break

        if policy.has_warning_or_rejection:
            LaunchService.pause_affected_ads(campaign_id)
            ApprovalService.notify("policy_issue", campaign_id)
            continue

        if metrics.spend > metrics.allowed_spend_cap:
            LaunchService.pause(campaign_id, reason="spend_cap")
            ApprovalService.notify("spend_cap", campaign_id)
            break

        decision = ExperimentService.evaluate(metrics)

        if decision.action == "pause":
            LaunchService.pause_ad(decision.variant_id, reason=decision.reason)
        elif decision.action == "scale_within_cap":
            LaunchService.adjust_budget(campaign_id, decision.new_budget)
        elif decision.action == "refresh_creative":
            create_refresh_variant(campaign_id)

        LearningService.log_monitor_decision(campaign_id, metrics, decision)
```

## Refresh flow

```python
def create_refresh_variant(campaign_id):
    campaign = CampaignStore.get(campaign_id)
    approved_claims = ClaimLedgerService.get_claims(campaign.claim_ids)

    new_variants = CreativeService.generate_refresh(
        original_hypothesis=campaign.hypothesis,
        claims=approved_claims,
        fatigue_notes=MonitorService.get_fatigue_notes(campaign_id)
    )

    policy_result = PolicyService.check(new_variants, approved_claims, campaign.platform)

    if policy_result.status == "passed" and ApprovalService.is_inside_l4_bounds(policy_result):
        payload = PlatformPayloadService.build_refresh(campaign, policy_result.approved_variants)
        PlatformPayloadService.validate(payload)
        LaunchService.launch(payload)
    else:
        ApprovalService.escalate(policy_result)
```

## Key implementation details

- Store every model input and output.
- Use structured outputs, not free text, for anything downstream.
- Never let generated text become a platform payload without validation.
- Use idempotency keys for API writes.
- Store platform object IDs after creation.
- Read back created objects and compare with approved payload.
- Keep an audit trail for every launch, pause, budget change, and creative refresh.
- Human approval should be a state transition, not a Slack message lost in history.

## Minimal database tables

```text
products
product_facts
claims
buyer_states
hypotheses
creative_variants
policy_checks
experiment_plans
platform_payloads
approvals
launches
metrics_snapshots
autonomy_actions
incidents
learning_memos
```

## Testing strategy

### Unit tests

- claim extraction,
- schema validation,
- policy phrase detection,
- budget validation,
- UTM generation,
- platform payload construction.

### Integration tests

- dry-run platform payloads,
- tracking event verification,
- approval state transitions,
- auto-pause simulation.

### Red-team tests

- invented testimonial,
- unsupported 10x claim,
- fake scarcity,
- sensitive targeting,
- broken final URL,
- prompt injection in competitor page,
- policy-evading wording.

## Deployment rule

Do not connect write access to ad accounts until dry-runs prove the system can reject bad campaigns.
