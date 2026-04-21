# Autonomous Ads Guardrail Checklist

Converted from `70_autonomous_ads_guardrail_checklist.csv` so the pack remains Markdown-only.

| gate | check | pass_condition | action_if_fail | risk_level |
| --- | --- | --- | --- | --- |
| Product truth | Every objective claim maps to approved claim ID | All claims have valid non-expired claim IDs | Block or escalate | high |
| Product truth | Landing page proves ad promise | Page contains evidence/demo/info matching claim | Revise ad or page | medium |
| Legal | No unsupported quantified claim | All numbers have evidence and approval | Block | high |
| Legal | No fake testimonial/review/customer | All endorsements trace to real approved source | Block | very_high |
| Legal | No fake scarcity/urgency | Scarcity is real and documented | Block/revise | high |
| Platform | Google misrepresentation screen passed | No misleading omissions or business misrepresentation | Revise/block | high |
| Platform | Meta personal attribute screen passed | No sensitive or direct personal-attribute assertion | Revise/block | high |
| Platform | LinkedIn professional claim screen passed | No unrealistic professional/business outcomes | Revise/block | medium |
| Platform | TikTok synthetic/native-content screen passed | No fake UGC or undisclosed AI where disclosure required | Revise/escalate | high |
| Privacy | Audience data allowed | Data source has consent/lawful basis and exclusions | Block/escalate | very_high |
| Privacy | Tracking pixels disclosed/controlled | Privacy policy and consent requirements handled | Escalate | high |
| Budget | Daily and total caps present | Caps set and under autonomy policy | Block launch | high |
| Measurement | Primary conversion event works | Test event verified before launch | Block launch | high |
| Measurement | UTMs complete | Campaign/hypothesis/creative IDs present | Block launch | medium |
| Brand | No generic AI slop | Specific workflow/proof language | Revise | low |
| Brand | No fear/insecurity exploitation | Tone respectful and non-manipulative | Revise/escalate | medium |
| Autonomy | Escalation rules configured | High-risk actions require human approval | Block L4 | high |
| Autonomy | Auto-pause rules configured | Tracking/policy/spend failures pause campaign | Block L4 | high |
