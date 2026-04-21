# Policy, Claim, and Approval Gate

## Why this exists

Autonomous ad systems fail when they learn that exaggeration, urgency, insecurity, or ambiguity can improve surface metrics. This gate prevents the system from converting speed into account risk, legal risk, or brand damage.

## The gate has five layers

1. Product truth.
2. Legal truth.
3. Platform policy.
4. Privacy and targeting.
5. Brand trust.

## Layer 1: Product truth

Every ad must answer:

- What exact product capability is being claimed?
- Where is that capability documented?
- Is the claim current?
- Does the landing page prove it?
- Is there any important limitation omitted?

### Claim classification

| Claim type | Example | Required evidence | Approval level |
|---|---|---|---|
| Feature claim | "Connects to Slack" | Product docs / release notes | Product owner |
| Performance claim | "Cuts reporting time by 40%" | Study / analytics / case study | Legal/exec |
| Comparative claim | "Faster than X" | controlled evidence | Legal/exec |
| Customer claim | "Acme uses us" | contract/logo approval | Customer/legal |
| Testimonial | customer quote | source and disclosure | Customer/legal |
| AI capability claim | "AI detects issues automatically" | eval / product docs | Product/legal |
| Pricing claim | "$19/month" | current pricing source | Revenue owner |
| Scarcity claim | "Only 5 spots" | real inventory/time constraint | Legal/ops |

## Layer 2: Legal truth

The system must block or escalate:

- unsupported objective claims,
- fake reviews,
- invented testimonials,
- hidden material terms,
- misleading pricing,
- misleading omissions,
- fake urgency or fake scarcity,
- deceptive AI capability claims,
- unclear sponsored endorsements,
- environmental or sustainability claims without evidence,
- medical/financial/legal outcomes without substantiation and approvals.

For Australia, maintain alignment with ACCC guidance: advertised claims should be true, accurate, based on reasonable grounds, and provable.

## Layer 3: Platform policy

### Google-style risks

- Misrepresentation.
- Missing relevant information.
- Destination mismatch.
- Unacceptable business practices.
- Editorial/gimmicky wording.
- Restricted content categories.

### Meta-style risks

- Personal attribute assertions.
- Misleading practices.
- Sensitive categories.
- Discriminatory targeting.
- AI/deepfake or synthetic-person issues.
- Low-quality landing pages.

### LinkedIn-style risks

- Unrealistic professional, employment, health, or business claims.
- Misleading claims.
- Low-quality or unprofessional creative.
- Restricted content.

### TikTok-style risks

- Fake native content.
- AI-generated or altered content disclosure gaps.
- Unsafe or misleading claims.
- Youth-sensitive issues.

## Layer 4: Privacy and targeting

Block or escalate when:

- using personal information without a lawful basis,
- using sensitive information for direct marketing without consent,
- uploading customer lists without consent/contractual basis,
- inferring vulnerabilities,
- generating ads based on private user data,
- using tracking pixels without proper disclosure and data handling,
- retargeting in sensitive contexts.

## Layer 5: Brand trust

Block or escalate when the ad:

- sounds like a scam,
- uses clickbait,
- uses fear without proportion,
- uses generic AI slop,
- insults the buyer,
- overstates certainty,
- creates pressure without real reason,
- hides tradeoffs,
- conflicts with the product experience.

## Autonomous approval states

| State | Meaning | Allowed action |
|---|---|---|
| Draft | Generated but not checked | no launch |
| Fact-passed | All claims map to approved facts | internal review |
| Policy-passed | Platform rules checked | prepare launch payload |
| Human-approved | Authorized for launch | launch allowed |
| L4-approved | Authorized for bounded autonomous reuse | launch/refresh within limits |
| Suspended | Risk or incident detected | pause/notify |

## Claim ledger template

```csv
claim_id,claim_text,claim_type,evidence_url,evidence_owner,approval_status,approved_channels,expiry_date,risk_level,allowed_variants,forbidden_variants,notes
CLM-001,"Connect Gmail and export invoices to CSV",feature,https://docs.example.com/gmail-export,Product,approved,"Google,Meta,LinkedIn",2026-09-30,low,"Connect Gmail to export invoices; Export Gmail invoices to CSV","Automatically finds every tax deduction",Feature available for Pro plan
```

## Compliance prompt for the Policy Agent

```text
You are the Policy and Claim Gate for an autonomous ad system.

Rules:
1. Every objective claim must map to a provided claim_id.
2. If a claim has no claim_id, mark it blocked.
3. Do not rewrite blocked claims into new factual claims unless the fact bank supports them.
4. Detect misleading omissions, fake urgency, fake scarcity, personal-attribute assertions, unapproved testimonials, and AI-generated endorsement risks.
5. Output structured JSON only.
6. When uncertain, escalate.

Return:
- status: passed | needs_revision | blocked | escalate
- claim_checks
- policy_risks
- privacy_risks
- required_changes
- final_allowed_copy
```

## Red-flag phrases for software/SaaS ads

Use with caution or block unless substantiated:

- guaranteed,
- risk-free,
- effortless,
- instant results,
- best,
- #1,
- revolutionary,
- 10x,
- never miss,
- eliminate all,
- fully automated,
- passive income,
- no work required,
- enterprise-grade security,
- bank-level security,
- GDPR compliant,
- SOC 2 compliant,
- AI-powered accuracy,
- human-level,
- unlimited,
- free forever,
- cancel anytime.

Many of these can be legitimate if true and qualified. The point is that the system must verify them.

## Pass/fail checklist

Before launch, every ad must pass:

- [ ] Buyer state identified.
- [ ] Hypothesis recorded.
- [ ] Offer and landing page match the ad.
- [ ] Every claim has claim ID.
- [ ] No invented customer names/logos/testimonials.
- [ ] No unsupported numbers.
- [ ] No fake urgency/scarcity.
- [ ] No prohibited personal-attribute assertion.
- [ ] No sensitive targeting issue.
- [ ] AI-generated images/voices disclosed where required.
- [ ] Platform-specific policy check passed.
- [ ] Budget cap set.
- [ ] Tracking configured.
- [ ] Auto-pause conditions set.
- [ ] Approval record stored.
