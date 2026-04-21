# Autonomous Ad Agent Schemas

Converted from `69_autonomous_ad_agent_schemas.json` so the pack remains Markdown-only.

```json
{
  "campaign_brief_schema": {
    "type": "object",
    "required": [
      "campaign_id",
      "hypothesis_id",
      "buyer_state",
      "platform",
      "offer",
      "claims",
      "budget",
      "tracking",
      "approval"
    ],
    "properties": {
      "campaign_id": {
        "type": "string"
      },
      "hypothesis_id": {
        "type": "string"
      },
      "buyer_state": {
        "type": "string",
        "enum": [
          "unaware",
          "problem_aware",
          "solution_aware",
          "vendor_aware",
          "active_evaluator",
          "trial_user",
          "paid_expansion",
          "churn_risk"
        ]
      },
      "platform": {
        "type": "string",
        "enum": [
          "google_ads",
          "meta_ads",
          "linkedin_ads",
          "tiktok_ads",
          "microsoft_ads"
        ]
      },
      "offer": {
        "type": "object",
        "required": [
          "type",
          "url"
        ],
        "properties": {
          "type": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        }
      },
      "claims": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "budget": {
        "type": "object",
        "required": [
          "daily_cap",
          "total_cap",
          "currency"
        ],
        "properties": {
          "daily_cap": {
            "type": "number"
          },
          "total_cap": {
            "type": "number"
          },
          "currency": {
            "type": "string"
          }
        }
      },
      "tracking": {
        "type": "object"
      },
      "approval": {
        "type": "object"
      }
    }
  },
  "claim_schema": {
    "type": "object",
    "required": [
      "claim_id",
      "claim_text",
      "claim_type",
      "evidence_url",
      "approval_status",
      "risk_level"
    ],
    "properties": {
      "claim_id": {
        "type": "string"
      },
      "claim_text": {
        "type": "string"
      },
      "claim_type": {
        "type": "string"
      },
      "evidence_url": {
        "type": "string"
      },
      "approval_status": {
        "type": "string",
        "enum": [
          "draft",
          "approved",
          "expired",
          "blocked"
        ]
      },
      "risk_level": {
        "type": "string",
        "enum": [
          "low",
          "medium",
          "high",
          "very_high"
        ]
      }
    }
  },
  "ad_variant_schema": {
    "type": "object",
    "required": [
      "variant_id",
      "platform",
      "copy",
      "claim_ids_used",
      "landing_page_url",
      "risk_notes"
    ],
    "properties": {
      "variant_id": {
        "type": "string"
      },
      "platform": {
        "type": "string"
      },
      "copy": {
        "type": "object"
      },
      "claim_ids_used": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "landing_page_url": {
        "type": "string"
      },
      "risk_notes": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    }
  },
  "approval_result_schema": {
    "type": "object",
    "required": [
      "status",
      "claim_checks",
      "policy_risks",
      "required_changes",
      "approved_variants"
    ],
    "properties": {
      "status": {
        "type": "string",
        "enum": [
          "passed",
          "needs_revision",
          "blocked",
          "escalate"
        ]
      },
      "claim_checks": {
        "type": "array"
      },
      "policy_risks": {
        "type": "array"
      },
      "required_changes": {
        "type": "array"
      },
      "approved_variants": {
        "type": "array"
      }
    }
  }
}
```
