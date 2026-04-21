# Ad Agent Output Schemas

Converted from `124_ad_agent_output_schemas.json` so the pack remains Markdown-only.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Autonomous Ad Factory Output Schemas",
  "schemas": {
    "AdVariant": {
      "type": "object",
      "required": [
        "variant_id",
        "channel",
        "buyer_state",
        "primary_text",
        "headline",
        "cta",
        "claim_ids",
        "landing_page",
        "risk_score"
      ],
      "properties": {
        "variant_id": {
          "type": "string"
        },
        "channel": {
          "type": "string"
        },
        "buyer_state": {
          "type": "string"
        },
        "primary_text": {
          "type": "string"
        },
        "headline": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "cta": {
          "type": "string"
        },
        "claim_ids": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "landing_page": {
          "type": "string"
        },
        "risk_score": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "review_required": {
          "type": "boolean"
        },
        "notes": {
          "type": "string"
        }
      }
    },
    "PolicyReview": {
      "type": "object",
      "required": [
        "status",
        "risk_score",
        "unsupported_claims",
        "required_disclaimers",
        "safe_rewrite"
      ],
      "properties": {
        "status": {
          "enum": [
            "approved",
            "needs_review",
            "blocked"
          ]
        },
        "risk_score": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "unsupported_claims": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "required_disclaimers": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "safe_rewrite": {
          "type": "string"
        }
      }
    },
    "ExperimentPlan": {
      "type": "object",
      "required": [
        "experiment_id",
        "hypothesis",
        "channel",
        "arms",
        "primary_metric",
        "guardrails",
        "budget_cap",
        "kill_rules"
      ],
      "properties": {
        "experiment_id": {
          "type": "string"
        },
        "hypothesis": {
          "type": "string"
        },
        "channel": {
          "type": "string"
        },
        "arms": {
          "type": "array",
          "items": {
            "type": "object"
          }
        },
        "primary_metric": {
          "type": "string"
        },
        "guardrails": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "budget_cap": {
          "type": "number"
        },
        "kill_rules": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
}
```
