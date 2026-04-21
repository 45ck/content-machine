# Experiments

Converted from `reference_implementation/ad_factory/experiments.py` so the pack remains Markdown-only.

```python
from .schemas import ExperimentPlan


def build_experiment_plan() -> ExperimentPlan:
    return ExperimentPlan(
        experiment_id='EXP-001',
        hypothesis='Proof-first sandbox offer generates more activated trials than a generic trial CTA for skeptical solution-aware buyers.',
        channel='google_search',
        arms=[
            {'arm': 'control', 'offer': 'free_trial', 'landing_page': '/start-trial'},
            {'arm': 'treatment', 'offer': 'sample_data_sandbox', 'landing_page': '/sandbox/support-ticket-drafts'},
        ],
        primary_metric='activated_trials_per_1000_clicks',
        guardrails=['cost_per_activated_trial','bounce_rate','policy_disapprovals','signup_completion_rate'],
        budget_cap=300.0,
        kill_rules=[
            'pause if policy disapproved',
            'pause if spend reaches variant cap with zero meaningful downstream events',
            'pause if cost per activated trial exceeds 2x baseline after minimum exposure',
        ],
    )
```
