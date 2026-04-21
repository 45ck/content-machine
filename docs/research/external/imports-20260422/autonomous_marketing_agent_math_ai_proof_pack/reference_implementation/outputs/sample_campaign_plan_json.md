# Sample Campaign Plan

Converted from `reference_implementation/outputs/sample_campaign_plan.json` so the pack remains Markdown-only.

```json
{
  "note": "Mock output only. No platform APIs called. No spend possible.",
  "ads": [
    {
      "ad": {
        "variant_id": "AD-001",
        "channel": "google_search",
        "buyer_state": "solution_aware",
        "primary_text": "Convert support emails into structured ticket drafts your team can review.",
        "headline": "Turn Support Emails Into Ticket Drafts",
        "cta": "Watch the workflow",
        "claim_ids": [
          "CLM-001",
          "CLM-002"
        ],
        "landing_page": "/demo/support-ticket-drafts",
        "risk_score": 20,
        "review_required": false,
        "notes": []
      },
      "policy_review": {
        "status": "needs_review",
        "risk_score": 20,
        "unsupported_claims": [],
        "required_disclaimers": [
          "AI-generated drafts should be reviewed before use."
        ],
        "safe_rewrite": "Use only approved claim wording and route to proof before asking for belief.",
        "notes": []
      },
      "payload_draft": {
        "platform": "google_ads",
        "type": "responsive_search_ad_draft",
        "ad_group_ad": {
          "final_urls": [
            "https://example.com/demo/support-ticket-drafts"
          ],
          "responsive_search_ad": {
            "headlines": [
              {
                "text": "Turn Support Emails Into Ticke"
              },
              {
                "text": "AI Drafts You Review"
              },
              {
                "text": "Watch The Workflow"
              }
            ],
            "descriptions": [
              {
                "text": "Convert support emails into structured ticket drafts your team can review."
              },
              {
                "text": "Use sample data first before connecting tools."
              }
            ]
          }
        },
        "metadata": {
          "claim_ids": [
            "CLM-001",
            "CLM-002"
          ],
          "variant_id": "AD-001"
        }
      }
    },
    {
      "ad": {
        "variant_id": "AD-002",
        "channel": "linkedin",
        "buyer_state": "vendor_aware",
        "primary_text": "See the permission preview before connecting your inbox. Use sample data first.",
        "headline": "Review permissions before setup",
        "cta": "View permission preview",
        "claim_ids": [
          "CLM-003"
        ],
        "landing_page": "/security/permissions",
        "risk_score": 10,
        "review_required": false,
        "notes": []
      },
      "policy_review": {
        "status": "approved",
        "risk_score": 10,
        "unsupported_claims": [],
        "required_disclaimers": [],
        "safe_rewrite": null,
        "notes": []
      },
      "payload_draft": {
        "platform": "linkedin",
        "type": "sponsored_content_draft",
        "objectiveType": "WEBSITE_CONVERSION",
        "creative": {
          "introductory_text": "See the permission preview before connecting your inbox. Use sample data first.",
          "headline": "Review permissions before setup",
          "landing_page": "https://example.com/security/permissions"
        },
        "metadata": {
          "claim_ids": [
            "CLM-003"
          ],
          "variant_id": "AD-002"
        }
      }
    },
    {
      "ad": {
        "variant_id": "AD-003_BLOCKED_EXAMPLE",
        "channel": "meta",
        "buyer_state": "problem_aware",
        "primary_text": "Guaranteed 100% accurate AI tickets that replace your support team.",
        "headline": "Save 10 hours every week",
        "cta": "Start now",
        "claim_ids": [
          "CLM-004",
          "CLM-005"
        ],
        "landing_page": "/start",
        "risk_score": 60,
        "review_required": false,
        "notes": []
      },
      "policy_review": {
        "status": "blocked",
        "risk_score": 100,
        "unsupported_claims": [
          "guaranteed",
          "100% accurate",
          "Claim not approved: CLM-004 (evidence_pending)",
          "Claim not approved: CLM-005 (blocked)"
        ],
        "required_disclaimers": [],
        "safe_rewrite": "Use only approved claim wording and route to proof before asking for belief.",
        "notes": [
          "High-risk pattern detected: save 10 hours"
        ]
      },
      "payload_draft": null
    }
  ],
  "experiment_plan": {
    "experiment_id": "EXP-001",
    "hypothesis": "Proof-first sandbox offer generates more activated trials than a generic trial CTA for skeptical solution-aware buyers.",
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
    "budget_cap": 300.0,
    "kill_rules": [
      "pause if policy disapproved",
      "pause if spend reaches variant cap with zero meaningful downstream events",
      "pause if cost per activated trial exceeds 2x baseline after minimum exposure"
    ]
  }
}
```
