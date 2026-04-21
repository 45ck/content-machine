# Payload Examples Google Meta Linkedin Tiktok

Converted from `92_payload_examples_google_meta_linkedin_tiktok.json` so the pack remains Markdown-only.

```json
{
  "google_responsive_search_ad": {
    "campaign_name": "SFLOW_Search_Australia_ProblemAware_TicketDrafts_2026Q2",
    "ad_group_name": "support_email_to_ticket",
    "final_urls": [
      "https://example.com/demo/support-ticket-drafts?utm_source=google&utm_medium=cpc&utm_campaign={{campaign}}"
    ],
    "headlines": [
      {
        "text": "Turn Support Emails Into Ticket Drafts",
        "claim_ids": [
          "CLM-001"
        ]
      },
      {
        "text": "AI Drafts. Your Team Reviews.",
        "claim_ids": [
          "CLM-002"
        ]
      },
      {
        "text": "Watch The 90-Second Workflow",
        "claim_ids": []
      }
    ],
    "descriptions": [
      {
        "text": "Convert messy customer emails into structured ticket drafts with fields your team can review.",
        "claim_ids": [
          "CLM-001",
          "CLM-002"
        ]
      },
      {
        "text": "Use sample data first. See the workflow before connecting your inbox.",
        "claim_ids": [
          "CLM-003"
        ]
      }
    ],
    "minimum_requirements_note": "Google RSA requires at least 3 headlines, 2 descriptions, and 1 final URL."
  },
  "meta_ad_draft": {
    "campaign": {
      "objective": "OUTCOME_LEADS",
      "name": "SFLOW_Meta_Retargeting_DemoProof_2026Q2"
    },
    "ad_set": {
      "audience": "site_visitors_30d_no_trial",
      "daily_budget_minor_units": 2000,
      "optimization_goal": "LEAD"
    },
    "creative": {
      "format": "single_image",
      "primary_text": "Still turning support emails into developer tickets by hand? Watch one messy email become a structured draft.",
      "headline": "AI ticket drafts you review before publishing",
      "cta": "WATCH_MORE",
      "claim_ids": [
        "CLM-001",
        "CLM-002"
      ]
    }
  },
  "linkedin_sponsored_content_draft": {
    "objectiveType": "WEBSITE_CONVERSION",
    "costType": "CPM",
    "creativeSelection": "OPTIMIZED",
    "targeting": {
      "job_functions": [
        "Support",
        "Engineering"
      ],
      "seniorities": [
        "Manager",
        "Director"
      ]
    },
    "creative": {
      "introductory_text": "For B2B SaaS teams: reduce support-to-engineering handoff friction with structured ticket drafts.",
      "headline": "From customer email to developer-ready ticket draft",
      "landing_page": "https://example.com/linkedin/support-handoff-demo",
      "claim_ids": [
        "CLM-001"
      ]
    }
  },
  "tiktok_ad_draft": {
    "campaign_objective": "TRAFFIC",
    "ad_group": {
      "placement_type": "AUTOMATIC_PLACEMENT",
      "optimization_goal": "CLICK"
    },
    "creative_brief": {
      "hook": "Your support inbox should not become an engineering guessing game.",
      "video_length_seconds": 20,
      "scenes": [
        "messy email",
        "structured draft",
        "human review",
        "sandbox CTA"
      ],
      "claim_ids": [
        "CLM-001",
        "CLM-002"
      ]
    }
  }
}
```
