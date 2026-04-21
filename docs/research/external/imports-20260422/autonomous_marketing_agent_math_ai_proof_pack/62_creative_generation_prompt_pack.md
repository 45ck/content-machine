# Autonomous Ad Creative Prompt Pack

Use these prompts inside a governed system. Do not use them as free-form commands to publish ads. They assume a fact bank, claim ledger, buyer-state diagnosis, and policy gate.

## Prompt 1: Product fact extraction

```text
You are extracting product facts for a governed ad system.

Input sources:
{{docs_or_page_text}}

Extract only facts directly supported by the input. Do not infer.

Return JSON:
{
  "features": [{"fact": "", "source_excerpt": "", "confidence": "high|medium|low"}],
  "integrations": [],
  "limitations": [],
  "pricing_facts": [],
  "security_facts": [],
  "unsupported_or_ambiguous_claims": []
}
```

## Prompt 2: Voice-of-customer mining

```text
You are mining customer language for ad strategy.

Input:
{{reviews_tickets_calls}}

Do not create claims. Extract patterns.

Return JSON:
{
  "jobs_to_be_done": [],
  "pain_phrases": [],
  "desired_outcomes": [],
  "objections": [],
  "triggers": [],
  "buyer_words_to_reuse": [],
  "buyer_words_to_avoid": [],
  "segments_detected": [],
  "evidence_strength_notes": ""
}
```

## Prompt 3: Buyer-state diagnosis

```text
Given product facts, customer language, and campaign context, classify the buyer state.

Buyer states:
- unaware
- problem_aware
- solution_aware
- vendor_aware
- active_evaluator
- trial_user
- paid_expansion
- churn_risk

Return JSON:
{
  "buyer_state": "",
  "dominant_problem": "",
  "current_belief": "",
  "belief_to_move": "",
  "risk_to_reduce": "",
  "best_proof_path": "",
  "recommended_platforms": [],
  "avoid_platforms": [],
  "reasoning_summary": ""
}
```

## Prompt 4: Hypothesis generator

```text
Create testable ad hypotheses.

Inputs:
Product facts: {{facts}}
VOC: {{voc}}
Buyer state: {{buyer_state}}
Approved claims: {{claim_ledger}}
Platform: {{platform}}

Rules:
- Use only approved claims.
- Each hypothesis must have a single belief or risk target.
- Each must specify proof path, metric, and kill rule.

Return JSON array:
[
  {
    "hypothesis_id": "",
    "angle": "",
    "buyer_state": "",
    "belief_or_risk_target": "",
    "approved_claim_ids": [],
    "ad_promise": "",
    "proof_path": "",
    "landing_page_required": "",
    "primary_metric": "",
    "secondary_metrics": [],
    "kill_rule": "",
    "risk_level": "low|medium|high"
  }
]
```

## Prompt 5: Google responsive search ad generator

```text
Generate Google responsive search ad assets.

Inputs:
Hypothesis: {{hypothesis}}
Approved claims: {{claim_ledger}}
Search intent cluster: {{search_intent}}
Landing page: {{landing_page}}
Policy constraints: {{policy_constraints}}

Rules:
- At least 10 headlines, max 30 characters each if requested by platform settings.
- At least 4 descriptions, max platform character limit.
- No unsupported claims.
- No gimmicky punctuation.
- Match query intent.
- Include final URL.

Return JSON:
{
  "headlines": [],
  "descriptions": [],
  "final_url": "",
  "claim_ids_used": [],
  "policy_notes": [],
  "message_match_notes": ""
}
```

## Prompt 6: Meta ad variant generator

```text
Generate Meta ad variants for a software product.

Inputs:
Hypothesis: {{hypothesis}}
Buyer state: {{buyer_state}}
Approved claims: {{claim_ledger}}
Visual assets available: {{asset_library}}
Landing page: {{landing_page}}
Policy constraints: {{policy_constraints}}

Rules:
- Do not assert personal attributes.
- Do not imply the user has a sensitive trait or failure.
- Do not invent testimonials.
- Do not use fake urgency.
- Prefer product demonstration or concrete workflow.

Return JSON:
{
  "variants": [
    {
      "primary_text": "",
      "headline": "",
      "description": "",
      "cta": "",
      "visual_brief": "",
      "video_script": "",
      "claim_ids_used": [],
      "risk_notes": []
    }
  ]
}
```

## Prompt 7: LinkedIn B2B ad generator

```text
Generate LinkedIn ad variants for a B2B software buyer.

Inputs:
Role: {{role}}
Company context: {{company_context}}
Hypothesis: {{hypothesis}}
Approved claims: {{claim_ledger}}
Proof asset: {{proof_asset}}

Rules:
- Professional tone.
- No unverifiable outcome promises.
- Use precise operational pain.
- Prefer proof assets: guide, demo, calculator, case study, comparison page.

Return JSON:
{
  "variants": [],
  "lead_magnet_ideas": [],
  "proof_requirements": [],
  "risk_notes": []
}
```

## Prompt 8: Creative critic

```text
Critique these ad variants before compliance screening.

Inputs:
Variants: {{variants}}
Hypothesis: {{hypothesis}}
Buyer state: {{buyer_state}}
Landing page: {{landing_page}}

Score each 1-5:
- relevance
- specificity
- proof alignment
- clarity
- novelty
- trustworthiness
- risk

Return JSON:
{
  "ranked_variants": [],
  "rejects": [],
  "revision_instructions": [],
  "best_variant_reason": ""
}
```

## Prompt 9: Policy/claim checker

```text
Check ad variants against claim ledger and policy constraints.

Inputs:
Variants: {{variants}}
Claim ledger: {{claim_ledger}}
Platform policy notes: {{platform_policy_notes}}
Privacy/targeting rules: {{privacy_rules}}

Rules:
- Objective claim without approved claim ID = blocked.
- Invented customer/testimonial = blocked.
- Fake urgency/scarcity = blocked.
- Personal attribute assertion = blocked or revise.
- Sensitive targeting = escalate.
- If uncertain, escalate.

Return JSON:
{
  "status": "passed|needs_revision|blocked|escalate",
  "variant_results": [],
  "required_changes": [],
  "approved_variants": []
}
```

## Prompt 10: Experiment plan generator

```text
Create an experiment plan for approved ad variants.

Inputs:
Approved variants: {{approved_variants}}
Platform: {{platform}}
Budget: {{budget}}
Traffic/conversion history: {{history}}
Business goal: {{goal}}

Return JSON:
{
  "experiment_type": "ab_test|bandit|holdout|sequential|platform_auto",
  "why_this_type": "",
  "primary_metric": "",
  "secondary_metrics": [],
  "guardrail_metrics": [],
  "sample_or_budget_rule": "",
  "kill_rules": [],
  "scale_rules": [],
  "interpretation_cautions": []
}
```

## Prompt 11: Learning report

```text
Summarize campaign results without overclaiming causality.

Inputs:
Hypothesis: {{hypothesis}}
Experiment plan: {{plan}}
Results: {{results}}
Tracking caveats: {{tracking_caveats}}

Return JSON:
{
  "decision": "scale|iterate|pause|inconclusive",
  "what_happened": "",
  "what_we_can_infer": "",
  "what_we_cannot_infer": "",
  "buyer_learning": "",
  "creative_learning": "",
  "landing_page_learning": "",
  "next_tests": [],
  "claim_ledger_updates": [],
  "risk_notes": []
}
```

## Prompt 12: Anti-slop rewrite

```text
Rewrite this ad to remove generic AI marketing language.

Input ad:
{{ad}}

Rules:
- Replace vague words with concrete workflow details.
- Remove hype.
- Preserve only approved claims.
- Make the next step inspectable.
- Do not make it longer unless necessary.

Return:
- revised_ad
- removed_phrases
- why_revision_is_more_trustworthy
```

## Banned default phrases

Unless explicitly supported, avoid:

- unleash,
- unlock your potential,
- revolutionize,
- game-changing,
- seamless,
- effortless,
- supercharge,
- powerful,
- all-in-one,
- 10x,
- future-proof,
- take your business to the next level,
- never worry about,
- in minutes,
- guaranteed,
- no brainer.

## Better phrase pattern

Use this pattern:

> Specific input + specific transformation + inspectable next step.

Examples:

- "Paste a messy support email. See it become a triaged Linear issue."
- "Connect Stripe. Export unpaid invoices before Friday payroll."
- "Upload one CSV. Preview the cleaned version before creating an account."
- "Compare our SSO, audit-log, and data-retention limits before booking a demo."
