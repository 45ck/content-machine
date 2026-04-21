# 90-Day Implementation Roadmap: Autonomous Ad Factory

## Goal

Move from manual ad creation to a bounded autonomous system that can research, generate, validate, launch, monitor, and learn from low-risk campaigns.

## Days 1-15: Build the truth base

### Outputs

- Product fact bank.
- Claim ledger.
- Brand voice guide.
- Offer library.
- Audience rules.
- Platform policy checklist.
- Basic analytics map.

### Tasks

1. Scrape or export website, docs, pricing, release notes.
2. Extract supported product facts.
3. Create claim IDs for each approved claim.
4. Mark high-risk claims requiring human approval.
5. Build banned-phrase and blocked-claim list.
6. Define initial buyer states and jobs-to-be-done.
7. Define conversion events.

### Exit criteria

- No ad can be generated without a claim ledger reference.
- Product owner can review claims quickly.
- You know what the product can and cannot say.

## Days 16-30: Build generation and review loop

### Outputs

- Hypothesis generator.
- Platform-specific creative generator.
- Creative critic.
- Policy/claim checker.
- Experiment plan generator.
- Human approval interface, even if simple spreadsheet.

### Tasks

1. Generate 20 campaign hypotheses.
2. Score them by buyer state, proof availability, and risk.
3. Generate ads for Google, Meta, LinkedIn.
4. Run internal policy check.
5. Dry-run review with humans.
6. Revise prompts and gates.

### Exit criteria

- 20 dry-run campaigns completed.
- Zero invented facts after revisions.
- Clear reject/escalate reasons.

## Days 31-45: Instrument and launch L2/L3 tests

### Outputs

- UTM convention.
- Experiment ledger.
- Landing page message-match checklist.
- Reporting dashboard.
- Manual launch process from approved variants.

### Tasks

1. Set up campaign naming and UTM schema.
2. Create 3-5 low-risk campaigns manually from AI-generated approved assets.
3. Track results through ad platform and product analytics.
4. Record learning reports.
5. Fix tracking gaps.

### Exit criteria

- Every spend dollar maps to hypothesis ID and creative ID.
- Results can be tied to activation/lead quality, not just clicks.

## Days 46-60: Add API payload generation

### Outputs

- Normalized campaign schema.
- Platform-specific payload builders.
- Dry-run API validation.
- Preview generation.
- Approval log.

### Tasks

1. Build schema for campaign, creative, audience, budget, tracking.
2. Generate Google payloads in sandbox/dry-run mode.
3. Generate Meta payloads in sandbox/dry-run mode.
4. Validate final URLs, budgets, and claims.
5. Store exact payloads before launch.

### Exit criteria

- System can produce API-ready payloads.
- No write action occurs without explicit approval.

## Days 61-75: Controlled API launch

### Outputs

- Launch agent.
- Monitor agent.
- Auto-pause rules.
- Disapproval logger.
- Incident log.

### Tasks

1. Launch a small low-risk Google Search campaign through approved API workflow.
2. Launch a small Meta/LinkedIn test if relevant.
3. Monitor spend, tracking, and policy state.
4. Auto-pause on tracking or policy failure.
5. Compare platform metrics with internal analytics.

### Exit criteria

- API launch works.
- Auto-pause works.
- Logs are complete.
- No uncontrolled spend.

## Days 76-90: Move selected campaigns to L4

### Outputs

- Bounded autonomy policy.
- Approved reusable claim set.
- Budget caps.
- Refresh rules.
- Kill/scale rules.
- Human escalation protocol.

### Tasks

1. Pick one low-risk campaign family.
2. Allow autonomous creative refresh inside approved claims.
3. Allow autonomous pause/reduce/increase within small budget range.
4. Require approval for new claims or major budget increase.
5. Run weekly learning review.

### Exit criteria

- System can refresh and optimize within boundaries.
- Human receives clear escalation requests.
- Learning reports improve future campaigns.

## What not to build in the first 90 days

- Unbounded L5 autonomous spend.
- Fully automated competitor attack campaigns.
- AI-generated testimonials.
- Sensitive personal-data personalization.
- Complex cross-channel attribution model before clean event tracking.
- Agent that changes pricing or offer terms without approval.

## Team roles

Minimum:

- Product owner: owns facts and claims.
- Marketer/operator: owns strategy and performance.
- Engineer: owns API and tracking.
- Reviewer/legal/compliance: owns risk gates.

Solo version:

- You play all roles, but separate the checklists. Do not let the same mental mode generate and approve.

## The 90-day standard

By day 90, success is not "the AI made profitable ads."

Success is:

- a working claim-led ad generation system,
- clean measurement,
- controlled API launch,
- safe auto-pause,
- campaign learning memory,
- one low-risk L4 campaign loop.
