# Sample Experiment Plan

Converted from `121_sample_experiment_plan.json` so the pack remains Markdown-only.

```json
{
  "experiment_id": "EXP-001",
  "product_id": "sflow",
  "hypothesis": "A proof-first sandbox offer will generate more activated trials than a generic free-trial CTA for skeptical solution-aware buyers.",
  "buyer_state": "solution_aware",
  "channel": "google_search",
  "arms": [
    {
      "arm": "control",
      "offer": "free_trial",
      "landing_page": "/start-trial"
    },
    {
      "arm": "treatment",
      "offer": "sample_data_sandbox",
      "landing_page": "/sandbox/support-ticket-drafts"
    }
  ],
  "primary_metric": "activated_trials_per_1000_clicks",
  "guardrails": [
    "cost_per_activated_trial",
    "bounce_rate",
    "policy_disapprovals",
    "signup_completion_rate"
  ],
  "minimum_runtime_days": 14,
  "budget_cap": 300,
  "kill_rules": [
    "pause if policy disapproved",
    "pause if spend reaches 30 with zero landing_view events",
    "pause if cost_per_activated_trial exceeds 2x baseline after minimum exposure"
  ],
  "decision_rule": "Graduate treatment if activated_trials_per_1000_clicks beats control by target margin without guardrail breach; otherwise write learning memo."
}
```
