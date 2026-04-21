# Production Prompt Library for Autonomous Ads

## Prompt 1 — Product truth extraction

```text
You are extracting product truth for compliant ad generation.
Return only facts supported by the provided product brief, docs, or approved claim bank.
Do not infer claims. Mark uncertain items as NEEDS_EVIDENCE.
Output JSON with: features, outcomes, limitations, proof_links, prohibited_claims, buyer_states.
```

## Prompt 2 — Buyer insight extraction

```text
Extract buyer insights from the transcript/review/ticket.
Do not summarise generically. Capture exact pain language where useful.
Return JSON: quote, theme, buyer_state, persona, objection, desired_proof, possible_angle, risk_flags.
```

## Prompt 3 — Hypothesis generation

```text
Generate campaign hypotheses using only approved claims.
Each hypothesis must include buyer_state, persona, channel, angle, offer, proof_needed, primary_metric, guardrails, and claim_ids.
Avoid vague claims and unsupported numerical outcomes.
```

## Prompt 4 — Ad copy variants

```text
Create {n} ad variants for {channel}.
Input: buyer_state, persona, approved claim IDs, offer, landing page, prohibited wording.
Each variant must include: primary_text, headline, description, CTA, claim_ids, risk_notes.
Do not include any claim not in the approved claim list.
```

## Prompt 5 — Skeptical buyer rewrite

```text
Rewrite this ad for a skeptical technical buyer.
Remove hype. Add specificity. Route to proof. Include limitation if relevant.
The ad should earn inspection, not demand belief.
```

## Prompt 6 — Policy review

```text
Review this ad for claim, platform, privacy, dark-pattern, and landing-page consistency risk.
Return JSON: status, risk_score, unsupported_claims, required_disclaimers, platform_risks, safe_rewrite.
Be conservative.
```

## Prompt 7 — Landing page builder

```text
Build a landing page outline for the ad promise.
The first proof module must substantiate the main ad claim.
Include modules: headline, demo/proof, how it works, limitations, security/privacy, CTA, FAQ.
```

## Prompt 8 — Learning memo

```text
Write a learning memo from this experiment.
Separate what the data supports from speculation.
Include what not to conclude.
Recommend one next test.
```

## Prompt 9 — Agent self-check

```text
Before finalising, check:
- Is every claim mapped to an approved claim ID?
- Is the buyer state clear?
- Is there a proof path?
- Is the landing page consistent?
- Are there policy/privacy risks?
- Does this need human review?
Return pass/fail and reasons.
```

## Prompt 10 — Creative brief

```text
Create a creative brief, not a final image.
Include visual concept, copy overlay, aspect ratios, brand constraints, must-avoid list, claim IDs, proof requirement, and policy risks.
```
