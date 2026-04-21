# Data, Instrumentation, and Attribution for Autonomous Ads

## Why this matters

An autonomous ad system is only as good as its feedback. If the feedback signal is wrong, the system will optimize toward the wrong behavior faster than a human would.

## Required event model for SaaS

### Acquisition events

- ad_impression,
- ad_click,
- landing_page_view,
- CTA_click,
- signup_started,
- signup_completed,
- demo_started,
- demo_completed,
- lead_submitted.

### Activation events

- workspace_created,
- integration_connected,
- first_project_created,
- first_value_action,
- activation_milestone_reached.

### Revenue events

- trial_started,
- trial_converted,
- subscription_started,
- subscription_upgraded,
- invoice_paid,
- churned,
- expansion.

### Quality events

- lead_qualified,
- sales_accepted,
- meeting_attended,
- opportunity_created,
- retained_30d,
- retained_90d,
- support_burden_flag.

## Conversion hierarchy

Use a metric hierarchy so the system does not chase cheap noise.

1. North-star business outcome: retained profitable customer.
2. Primary campaign metric: qualified activation or qualified lead.
3. Secondary metrics: CTR, CVR, CPC, CPL, demo completion.
4. Guardrails: complaint rate, rejection rate, unsubscribes, low-quality leads, churn proxy.

## UTM discipline

Every ad should include:

- source,
- medium,
- campaign ID,
- ad group/ad set ID,
- creative ID,
- hypothesis ID,
- buyer state,
- claim IDs.

Example:

```text
utm_source=google&utm_medium=cpc&utm_campaign=CMP-2026-001&utm_content=CR-044&utm_term=HYP-014_CLM-002
```

## Naming convention

```text
PLATFORM__BUYERSTATE__ANGLE__HYPID__DATE__RISK
GOOGLE__SOLUTIONAWARE__WORKFLOWPROOF__HYP014__20260420__LOW
```

## Tracking failure auto-pause

Auto-pause when:

- final URL is broken,
- conversion event disappears,
- ad platform spend continues but analytics sees no sessions,
- UTMs missing,
- wrong landing page served,
- form submissions not stored,
- duplicate conversions spike abnormally.

## Attribution caution

Autonomous systems should not assume platform-reported conversions are incremental. Platform dashboards are useful operationally, but the stronger question is:

> What happened because we ran this ad that would not have happened otherwise?

Use:

- holdout tests,
- geo tests,
- conversion lift tests where available,
- incrementality experiments,
- blended CAC,
- cohort retention,
- pipeline quality.

## AI measurement risks

AI can make these worse:

- false narrative after weak data,
- overfitting to short-term CTR,
- comparing campaigns with different audiences,
- ignoring seasonality,
- ignoring auction changes,
- ignoring landing-page/product changes,
- scaling low-quality leads,
- optimizing for easy conversions that do not retain.

## Dashboard sections

### Executive view

- spend,
- qualified conversions,
- CAC/CPA,
- activation,
- pipeline/revenue,
- trend vs baseline,
- risk alerts.

### Learning view

- hypotheses tested,
- angles tested,
- claim performance,
- buyer-state performance,
- landing page performance,
- what changed this week.

### Compliance view

- ads generated,
- ads approved,
- ads rejected by internal gate,
- platform disapprovals,
- reasons,
- policy incident recurrence.

### Autonomy view

- number of autonomous actions,
- paused campaigns,
- escalations,
- false positives,
- budget changes,
- agent errors.

## Quality scoring for software leads

Do not treat all leads as equal. Score using:

- role match,
- company size match,
- use-case fit,
- urgency,
- integration needs,
- budget signal,
- activation behavior,
- sales notes,
- retention proxy.

## Minimum viable stack

For a small software operator:

- ad platform conversion tracking,
- server-side events where possible,
- product analytics,
- CRM or lead store,
- warehouse/spreadsheet for experiment ledger,
- dashboard,
- manual review loop.

For a serious autonomous system:

- event warehouse,
- identity resolution with privacy controls,
- server-side conversion API integrations,
- API-based ad reporting,
- automatic anomaly detection,
- claim/creative/experiment database,
- audit logs for every autonomous action.

## Measurement mindset

> The system should not ask “which ad got clicks?” It should ask “which promise brought the right buyer to the right proof and created durable value?”
