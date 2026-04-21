# Ad Agent Roles and Workflows

## Why separate agents?

A single general-purpose ad agent will tend to blur research, strategy, copywriting, compliance, and measurement. That is dangerous. Separate roles force the system to think in stages and produce inspectable artifacts.

## Minimum viable autonomous team

### 1. Product Truth Agent

Purpose: maintain the product fact bank.

Inputs:

- docs,
- website,
- release notes,
- pricing page,
- product analytics,
- customer-facing claims,
- support docs.

Outputs:

- approved features,
- integrations,
- constraints,
- limitations,
- substantiated claims,
- forbidden claims.

Mindset: no claim without provenance.

### 2. Voice-of-Customer Agent

Purpose: find buyer language and pain.

Inputs:

- reviews,
- tickets,
- sales calls,
- demo notes,
- churn reasons,
- community posts,
- search queries.

Outputs:

- customer phrases,
- objections,
- emotional intensity,
- jobs-to-be-done,
- buying triggers.

Mindset: steal language from reality, not from other marketers.

### 3. Strategy Agent

Purpose: choose the campaign logic.

Outputs:

- target buyer state,
- angle,
- offer,
- proof path,
- platform choice,
- metric hierarchy,
- experiment type.

Mindset: every ad exists to move one belief, reduce one risk, or trigger one low-friction action.

### 4. Creative Generation Agent

Purpose: create variants.

Outputs:

- headlines,
- primary text,
- descriptions,
- hooks,
- CTAs,
- visual briefs,
- video scripts,
- landing page sections.

Mindset: quantity is cheap; specificity is the filter.

### 5. Creative Critic Agent

Purpose: attack weak creative before the market does.

Checks:

- vague language,
- fake urgency,
- generic AI wording,
- unsupported claims,
- mismatch between ad and landing page,
- weak proof path,
- unclear target buyer,
- overpromising.

Mindset: the critic protects the budget.

### 6. Policy Agent

Purpose: screen against legal and platform rules.

Checks:

- misleading claims,
- privacy-sensitive personalization,
- personal attribute assertions,
- special ad categories,
- endorsements and disclosures,
- AI-generated people/voices,
- fake reviews,
- scarcity claims,
- cancellation/price omissions.

Mindset: remove future account-risk before it compounds.

### 7. Experiment Agent

Purpose: choose how the campaign learns.

Outputs:

- experiment design,
- sample rules,
- budget rules,
- stop rules,
- promotion rules,
- confidence standards,
- incrementality caveats.

Mindset: a campaign that cannot teach should not spend much.

### 8. Launch Agent

Purpose: convert approved plans into platform-ready payloads.

Outputs:

- Google Ads API objects,
- Meta campaign/ad set/ad creative objects,
- LinkedIn campaign/creative objects,
- Microsoft responsive search ad objects,
- UTMs,
- naming conventions,
- budget caps.

Mindset: launch is mechanical; validation is strategic.

### 9. Monitor Agent

Purpose: watch performance and risk.

Checks:

- spend anomalies,
- CPA/CAC limits,
- conversion tracking failures,
- landing page errors,
- disapprovals,
- negative comments,
- high frequency,
- fatigue,
- irrelevant search terms,
- low-quality leads.

Mindset: the first job after launch is preventing damage.

### 10. Learning Agent

Purpose: transform results into institutional knowledge.

Outputs:

- what worked,
- what failed,
- what remains uncertain,
- updated angle library,
- updated claim ledger,
- product proof gaps,
- landing page improvements,
- next test queue.

Mindset: the campaign is only complete when the system is smarter.

## Standard workflow: L3 human-approved launch

1. Product Truth Agent updates fact bank.
2. Voice-of-Customer Agent extracts pain, language, objections.
3. Strategy Agent creates 3-5 hypotheses.
4. Human picks or approves hypothesis.
5. Creative Generation Agent creates variants.
6. Creative Critic Agent scores variants.
7. Policy Agent screens variants.
8. Experiment Agent builds test plan.
9. Launch Agent prepares payloads.
10. Human approves launch.
11. Monitor Agent tracks guardrails.
12. Learning Agent writes result memo.

## Standard workflow: L4 bounded autonomous launch

1. Human pre-approves product claims, offers, budgets, audiences, and platforms.
2. Agents generate hypotheses only inside approved boundaries.
3. Policy Agent must pass all variants.
4. Launch Agent can publish campaigns under budget and risk caps.
5. Monitor Agent can pause, reduce budget, or refresh variants.
6. System escalates to human for any new claim, high-risk wording, policy issue, or budget expansion.

## Autonomy test before granting L4

The system must pass 20 dry-run campaigns with:

- zero unsupported claims,
- zero invented facts,
- zero prohibited audience/personality targeting,
- correct UTMs,
- correct budget caps,
- clean ad-to-landing-page message match,
- correct escalation behavior,
- useful experiment ledgers.

## Failure modes by agent

| Agent | Failure mode | Control |
|---|---|---|
| Product Truth | uses outdated facts | versioned source ingestion and expiry dates |
| VOC | overfits a few loud reviews | sample size and source diversity notes |
| Strategy | creates unfalsifiable hypotheses | require metric and kill rule |
| Creative | produces generic AI slop | specificity scoring and banned phrase list |
| Critic | over-prunes creative | keep a controlled exploration budget |
| Policy | false positives | human appeal path and reason logging |
| Experiment | confuses correlation with causation | incrementality checklist |
| Launch | payload/API mistakes | dry-run validation and sandbox mode |
| Monitor | optimizes too early | minimum data thresholds |
| Learning | invents narratives after results | pre-registered hypotheses |
