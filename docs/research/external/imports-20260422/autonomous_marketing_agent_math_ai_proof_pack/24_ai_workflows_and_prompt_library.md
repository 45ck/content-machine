# Generative AI Workflows and Prompt Library

## How to use this file

A prompt is not a magic sentence. A prompt is a brief for an assistant.

Bad prompts ask for output from nothing:

> Write me ads for my SaaS.

Good prompts give:
- product context,
- audience,
- buyer state,
- evidence,
- constraints,
- proof available,
- channel,
- success metric,
- prohibited claims,
- examples of good/bad voice.

The more serious the business decision, the more the prompt must force evidence, uncertainty, and verification.

## Universal prompt wrapper

Use this before most marketing prompts:

```text
You are helping me improve marketing for a digital/software product.

Do not invent facts, customer quotes, numbers, integrations, benchmarks, or legal claims.
Separate:
1. evidence from the inputs,
2. reasonable inference,
3. speculation that needs validation.

Product:
[describe product]

Target buyer:
[role, company type, pains, buying authority]

Buyer state:
[unaware / problem-aware / solution-aware / vendor-aware / active buyer / trial user / paid customer]

Goal:
[what output should accomplish]

Evidence available:
[paste customer quotes, reviews, call notes, analytics, docs, demo notes, pricing, testimonials]

Constraints:
[brand voice, compliance, claims not allowed, pricing rules, privacy rules]

Output format:
[table / bullet list / draft / critique / experiment plan]
```

## Workflow 1: Buyer-language extraction

Use when: you have reviews, call transcripts, tickets, forum comments, or interview notes.

```text
Analyze the pasted buyer evidence.

Tasks:
1. Extract exact phrases buyers use to describe pain, desired outcomes, risk, alternatives, objections, and triggers.
2. Group phrases into themes.
3. For each theme, include 2-5 exact supporting quotes.
4. Mark whether the theme is evidence, inference, or speculation.
5. Suggest how this language could appear in ads, landing pages, demos, or sales objections.
6. List what still needs validation through interviews or analytics.

Do not invent quotes. Only quote from the input.
Input:
[paste evidence]
```

Mindset: do not write yet. Extract before creating.

## Workflow 2: Jobs-to-Be-Done interview guide

Use when: you need to interview buyers without leading them.

```text
Create a Jobs-to-Be-Done interview guide for this product and buyer.

Product:
[product]

Target buyer:
[buyer]

Known hypothesis:
[hypothesis]

Design questions that uncover:
- trigger event,
- old workflow,
- alternatives considered,
- desired progress,
- emotional/social risk,
- switching barriers,
- buying committee influence,
- proof required,
- moment of purchase,
- post-purchase success.

Rules:
- Avoid leading questions.
- Avoid pitching the product.
- Ask for concrete recent examples.
- Include follow-up probes.
- Include questions that could falsify my assumptions.
```

Mindset: interviews are for discovery, not validation theatre.

## Workflow 3: Review-mining competitor map

Use when: you want category insight from public reviews.

```text
I will paste competitor reviews and notes.

Build a competitor opportunity map with columns:
- competitor/product,
- repeated praise,
- repeated complaints,
- buyer job,
- buyer segment,
- emotional tone,
- switching trigger,
- potential positioning gap,
- proof we would need to credibly use that gap.

Rules:
- Use exact quotes.
- Do not exaggerate competitor weakness.
- Mark sample-size limitations.
- Suggest interview questions to validate each gap.

Input:
[paste reviews]
```

Mindset: competitor weakness is only useful if your product can credibly solve it.

## Workflow 4: ICP pressure test

Use when: you need to narrow who you should sell to.

```text
Pressure test this ICP.

Current ICP:
[describe]

Product:
[describe]

Evidence:
[paste data]

Evaluate the ICP across:
- problem intensity,
- budget,
- trigger events,
- urgency,
- adoption difficulty,
- competitive alternatives,
- reachable channels,
- proof required,
- retention likelihood,
- support burden,
- expansion potential.

Then give:
1. strongest ICP version,
2. segments to exclude,
3. trigger events to target,
4. messages likely to resonate,
5. risks in this ICP hypothesis,
6. validation experiments.
```

Mindset: narrowing is power. A wide ICP is usually avoidance.

## Workflow 5: Positioning hypothesis lab

Use when: the product can be framed in multiple ways.

```text
Generate 8 positioning hypotheses for this software product.

For each:
- category frame,
- target buyer,
- enemy/old way,
- core promise,
- key proof required,
- best channel,
- who it excludes,
- risk of the position,
- one landing-page headline,
- one demo angle.

Rules:
- Avoid unsupported superiority claims.
- Include at least two narrow/niche positions.
- Include at least two anti-positions: where we should not compete.
- Rank by credibility, urgency, and differentiation.
```

Mindset: choose the battlefield, not the prettiest tagline.

## Workflow 6: Proof architecture builder

Use when: you have claims but weak supporting evidence.

```text
Build a proof architecture for the following claims.

Claims:
[paste claims]

For each claim, identify:
- buyer belief it is trying to create,
- skeptic's objection,
- minimum proof needed,
- stronger proof,
- best asset type,
- where it should appear in the funnel,
- source/evidence currently available,
- missing evidence,
- risk if claim is unsupported.

Output as a table.
```

Mindset: every claim creates a proof debt.

## Workflow 7: Ad angle matrix

Use when: you need structured variants instead of random ads.

```text
Create an ad angle matrix for this offer.

Product:
[product]

Buyer:
[buyer]

Buyer state:
[state]

Evidence:
[paste quote bank / proof / demos]

Create angles across:
- pain recognition,
- hidden cost,
- desired outcome,
- workflow transformation,
- social proof,
- comparison,
- risk reversal,
- demo/show-me,
- contrarian insight,
- urgency/trigger event.

For each angle:
- headline,
- body copy,
- CTA,
- proof needed after click,
- likely buyer skepticism,
- test hypothesis,
- metric to watch beyond CTR.

Rules:
- No unsupported claims.
- No fake urgency.
- No vague words like revolutionary, effortless, game-changing unless concretely explained.
```

Mindset: the ad is not belief; it is the first inspection request.

## Workflow 8: Hook skepticism audit

Use when: you have headlines or hooks.

```text
Act as a highly skeptical technical buyer.

Audit these hooks:
[paste hooks]

Score each 1-5 on:
- specificity,
- believability,
- relevance,
- inspectability,
- differentiation,
- risk of sounding like AI slop,
- risk of overclaiming.

For each, rewrite it to be more concrete and proof-seeking.
Also state what proof the landing page must show immediately.
```

Mindset: if a skeptical buyer would say "bullshit", rewrite.

## Workflow 9: Landing-page proof path

Use when: traffic lands but does not convert or trust is weak.

```text
Design a landing page for this buyer state.

Product:
[product]

Buyer state:
[state]

Source of traffic:
[channel]

Primary objection:
[objection]

Proof available:
[proof]

Create:
1. section order,
2. section purpose,
3. draft headline/body,
4. proof asset used,
5. buyer question answered,
6. CTA type,
7. risk reversal,
8. what to avoid.

Make the page feel like guided inspection, not hype.
```

Mindset: the landing page is a courtroom for the claim.

## Workflow 10: SaaS pricing-page critique

Use when: pricing is unclear or conversion suffers.

```text
Audit this SaaS pricing page copy and structure.

Inputs:
[paste pricing copy, plan names, limits, target buyers, known objections]

Evaluate:
- who each plan is for,
- what changes between plans,
- hidden ambiguity,
- upgrade logic,
- downgrade/cancel confidence,
- implementation cost clarity,
- risk reversal,
- security/procurement concerns,
- enterprise buying needs,
- usage-based pricing clarity.

Give:
- top 10 friction points,
- rewrite recommendations,
- FAQ additions,
- experiment ideas,
- ethical risks to avoid.
```

Mindset: pricing is not only money; pricing is risk communication.

## Workflow 11: Product demo script

Use when: your demo shows features instead of progress.

```text
Create a product demo script that shows transformation.

Buyer:
[buyer]

Job:
[job]

Old workflow:
[old workflow]

Product workflow:
[workflow]

Proof:
[proof]

Structure:
1. set the context,
2. show old pain briefly,
3. show the key workflow,
4. explain why this matters,
5. show one proof point,
6. handle one objection,
7. invite a low-risk next step.

Rules:
- No fake data unless clearly labeled demo data.
- Include moments to pause and ask the buyer questions.
- Keep feature details tied to buyer progress.
```

Mindset: demo the job, not the feature list.

## Workflow 12: AI search / GEO content brief

Use when: you want content that answer engines can cite accurately.

```text
Create a generative-engine-optimization content brief.

Topic:
[topic]

Product/category:
[product]

Buyer questions:
[list]

Sources:
[paste URLs/titles/notes]

Output:
- target user intent,
- exact questions to answer,
- definitions needed,
- comparison tables,
- proof/citations needed,
- FAQ structure,
- schema/structured-data suggestions,
- freshness requirements,
- author/expertise signals,
- how to avoid thin AI content,
- internal pages to link,
- third-party evidence to seek.

Rules:
- Prioritize source clarity and factual accuracy over keyword stuffing.
- Include where the content should say "not a fit" or "limitations."
```

Mindset: become cite-worthy, not just keyword-visible.

## Workflow 13: Sales objection map

Use when: sales hears the same objections repeatedly.

```text
Map these sales objections into assets and responses.

Objections:
[paste objections]

For each:
- underlying fear,
- buyer state,
- type of objection: misunderstanding / missing proof / real weakness / price / timing / political risk / technical risk,
- best response,
- proof needed,
- asset to build,
- product issue to consider,
- risky response to avoid,
- follow-up question.

Output as a table.
```

Mindset: objections are product and proof intelligence.

## Workflow 14: Email lifecycle sequence

Use when: users sign up, trial, or consider upgrading.

```text
Design a lifecycle email sequence.

User state:
[state: new signup / inactive trial / activated trial / active free user / expansion candidate]

Goal:
[activation / retention / upgrade / education]

Product:
[product]

Known behaviors:
[events]

Constraints:
[frequency, tone, compliance]

Create:
- sequence logic,
- trigger condition,
- email subject,
- core message,
- user benefit,
- proof/help link,
- CTA,
- what not to say,
- metric.
```

Mindset: email should help the user make progress, not just chase revenue.

## Workflow 15: In-app nudge design

Use when: a user is inside the product and stuck before value.

```text
Design in-app nudges for this activation step.

Activation goal:
[goal]

User behavior:
[what user did/did not do]

Context:
[screen/workflow]

Constraints:
[space, tone, opt-out]

For each nudge:
- trigger,
- message,
- CTA,
- why it helps,
- possible annoyance risk,
- fallback if ignored,
- metric.

Rules:
- Keep it short.
- Do not guilt or pressure.
- Make it dismissible.
```

Mindset: inside the product, relevance and timing matter more than persuasion.

## Workflow 16: Experiment design assistant

Use when: you want to test an AI-generated asset.

```text
Design an experiment for this marketing hypothesis.

Hypothesis:
[hypothesis]

Asset:
[ad/page/email/onboarding/chatbot]

Audience:
[audience]

Current baseline:
[baseline metrics]

What variants differ:
[variable]

Constraints:
[traffic, budget, timeline]

Create:
- experiment design,
- primary metric,
- secondary metrics,
- guardrail metrics,
- sample-size considerations,
- segmentation plan,
- decision rule,
- risks/confounds,
- post-test learning questions.

Rules:
- Do not declare victory from CTR alone.
- Include downstream quality.
```

Mindset: AI creates hypotheses. Experiments create evidence.

## Workflow 17: Attribution critique

Use when: a campaign appears to perform well.

```text
Critique this marketing performance report.

Report:
[paste metrics]

Ask:
- What could be non-incremental?
- What attribution assumptions are hidden?
- What would have happened anyway?
- Are we measuring lead quantity or customer quality?
- Is the sales cycle long enough to judge?
- Are there channel interactions?
- What holdout or lift test would strengthen evidence?
- What should we stop claiming?

Output:
1. trustworthy conclusions,
2. questionable conclusions,
3. next measurement improvements.
```

Mindset: dashboards often reward confidence, not truth.

## Workflow 18: Claims substantiation checker

Use when: you generated copy or sales claims.

```text
Review this marketing copy for unsupported claims.

Copy:
[paste copy]

For each claim:
- exact claim,
- type: factual / comparative / quantified / subjective / implied / AI capability / earnings / security / privacy,
- evidence required,
- evidence available from inputs,
- risk level,
- safer rewrite,
- whether legal/SME review is needed.

Rules:
- Be strict.
- Do not approve claims without evidence.
```

Mindset: the fastest way to destroy trust is to overclaim.

## Workflow 19: Dark-pattern audit

Use when: designing pricing, trial, checkout, signup, cancellation, or upgrade flows.

```text
Audit this flow for dark patterns and autonomy risks.

Flow:
[paste description/screens/copy]

Check for:
- hidden costs,
- fake scarcity,
- false urgency,
- forced continuity,
- confusing cancellation,
- preselected options,
- disguised ads,
- confirmshaming,
- obstructive friction,
- misleading comparisons,
- invasive personalization,
- AI impersonation,
- fake social proof.

For each issue:
- risk,
- why it is problematic,
- better ethical alternative,
- metric to monitor.
```

Mindset: ethical persuasion makes the user's real preference easier to act on.

## Workflow 20: Buyer concierge chatbot specification

Use when: building a website AI assistant.

```text
Write a specification for a buyer concierge chatbot.

Product:
[product]

Approved sources:
[docs/pricing/security/case studies/FAQ]

Allowed tasks:
[list]

Disallowed tasks:
[list]

Escalation rules:
[when human handoff is required]

Output:
- system role,
- source-grounding requirements,
- refusal rules,
- data privacy rules,
- handoff logic,
- success metrics,
- logging requirements,
- failure modes,
- red-team tests,
- sample conversations.

Rules:
- The bot must not invent pricing, discounts, legal terms, security claims, or integrations.
- The bot must cite approved sources where possible.
```

Mindset: a chatbot is a public representative. Treat it as a risk surface.

## Workflow 21: AI feature messaging

Use when: marketing an AI product or AI feature.

```text
Rewrite this AI feature messaging to be outcome-specific and credible.

Current messaging:
[paste]

Product capability:
[what AI actually does]

Limitations:
[limitations]

Human control:
[how users review/correct/override]

Proof:
[benchmarks/case studies/demos]

Create:
- clearer headline,
- plain-language explanation,
- proof section,
- limitation disclosure,
- skeptical-buyer FAQ,
- demo idea,
- risky claims to remove.

Rules:
- Do not use vague "AI-powered" as the main value claim.
- Explain the task, output, control, and failure mode.
```

Mindset: sell the task transformation, not the technology label.

## Workflow 22: AI asset QA checklist

Use before publishing AI-assisted marketing.

```text
Audit this asset before publication.

Asset:
[paste]

Check:
- factual accuracy,
- unsupported claims,
- hallucinated numbers,
- hallucinated customers or testimonials,
- brand voice,
- privacy/data concerns,
- IP/copyright concerns,
- bias/vulnerability concerns,
- dark patterns,
- disclosure needs,
- source citations,
- legal/SME review needs.

Output:
- publish / revise / block,
- required edits,
- evidence gaps,
- final checklist.
```

Mindset: AI accelerates production; governance protects the brand.

## The anti-hallucination operating rules

1. Ask for citations or exact input quotes.
2. Separate evidence from inference.
3. Keep a claim ledger.
4. Use retrieval from approved sources for factual outputs.
5. Do not let AI invent customers, numbers, integrations, competitors, awards, or benchmarks.
6. Review technical/security/legal claims with humans.
7. Keep generated assets versioned.
8. Test with real buyers.
9. Prefer fewer, stronger assets over high-volume sludge.
10. When uncertain, say so.

## Prompt quality checklist

Before running a prompt, check:

- Did I define the buyer state?
- Did I include real evidence?
- Did I define the channel and metric?
- Did I specify prohibited claims?
- Did I ask for skepticism?
- Did I ask for proof requirements?
- Did I ask it to separate evidence/inference/speculation?
- Did I plan how to validate output?

If not, fix the prompt.
