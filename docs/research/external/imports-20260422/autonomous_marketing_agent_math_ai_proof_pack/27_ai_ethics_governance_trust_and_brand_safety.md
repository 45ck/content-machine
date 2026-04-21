# AI Ethics, Governance, Trust, and Brand Safety

## The hard rule

AI does not remove accountability. It concentrates it.

If an AI-generated ad, chatbot, email, review, sales claim, or landing page misleads someone, the responsibility is still yours.

## Persuasion versus manipulation with GenAI

Ethical persuasion:
- helps the user understand their options,
- states material limitations,
- makes costs clear,
- uses accurate proof,
- lets users leave or decline,
- respects privacy,
- avoids exploiting vulnerability,
- makes the next useful step easier.

Manipulation:
- hides material information,
- invents evidence,
- fakes social proof,
- impersonates humans,
- makes cancellation hard,
- uses false urgency/scarcity,
- exploits fear or vulnerability,
- disguises ads or sponsorship,
- overstates AI capability,
- uses personal data in ways the user would not expect.

## The GenAI trust problem

AI can:
- hallucinate,
- sound confident while wrong,
- create fake authenticity,
- flatten brand voice,
- generate biased or exclusionary outputs,
- leak sensitive information,
- create copyright/IP issues,
- produce false reviews/testimonials,
- impersonate people,
- scale dark patterns,
- automate bad sales behavior.

This is why governance is not bureaucracy. It is part of the product and brand.

## AI marketing risk levels

### Low risk

Examples:
- internal brainstorming,
- summarizing public articles,
- drafting non-factual copy for human review,
- rewriting tone,
- creating interview question drafts.

Controls:
- human review,
- no private data,
- no factual publication without checking.

### Medium risk

Examples:
- ad variants,
- landing pages,
- email sequences,
- market research synthesis,
- competitor comparison drafts,
- sales follow-up drafts,
- personalization by segment.

Controls:
- claim ledger,
- proof review,
- privacy review,
- brand review,
- experiment guardrails.

### High risk

Examples:
- public chatbots,
- AI-generated testimonials/reviews,
- legal/security/privacy claims,
- pricing/contract statements,
- financial/earnings claims,
- healthcare/education/safety claims,
- personalized targeting using sensitive data,
- AI acting through tools.

Controls:
- approved knowledge base,
- legal/SME review,
- logs,
- human escalation,
- refusal rules,
- red-team testing,
- least-privilege tools,
- clear disclosure where material.

### Severe risk / avoid

Examples:
- fake reviews,
- synthetic customer endorsements,
- impersonation without consent,
- deepfake spokespersons without clear rights/disclosure,
- hidden AI advice in contexts users expect professionals,
- manipulative vulnerable-user targeting,
- false scarcity/urgency at scale,
- AI-generated legal/medical/financial guarantees without qualified review,
- making unsupported claims about earnings or guaranteed outcomes.

## AI claims checklist

Before publishing any AI-related claim, ask:

1. What exactly are we claiming the AI does?
2. Can we demonstrate it with a real workflow?
3. What is the evidence?
4. Is the evidence current?
5. Does the claim imply autonomy when human review is required?
6. Does the claim imply guaranteed accuracy?
7. Does the claim imply a guaranteed business outcome?
8. Does the claim compare us to competitors?
9. Are limitations stated?
10. Would a reasonable buyer be misled?
11. Would legal/security/product approve it?
12. Does the product experience match the claim?

Weak claim:
> Our AI eliminates manual work.

Stronger claim:
> Our AI drafts invoice reconciliation exceptions from Stripe and Xero data. Finance teams review and approve each exception before export.

Weak claim:
> AI-powered sales growth guaranteed.

Stronger claim:
> AI-assisted call briefs help reps prepare faster by summarizing approved CRM notes, public company information, and previous objections.

## Disclosure decision tree

Disclosure is not only a legal question. It is also a trust question.

Ask:

### 1. Would the user reasonably expect a human?

Examples:
- customer support,
- advice,
- sales communication,
- testimonials,
- social content,
- expert commentary.

If yes, consider disclosure or clear labeling.

### 2. Does AI involvement affect the user's decision?

If AI generated a product recommendation, price, eligibility result, or advice, disclosure and explainability become more important.

### 3. Is there a risk of deception?

If content looks like a real customer, real employee, real expert, real review, or real event but is synthetic, disclose or avoid.

### 4. Is AI used only as back-office assistance?

If AI only drafted copy that humans reviewed and approved, disclosure may be less material, depending on jurisdiction and content type.

### 5. Does disclosure reduce trust because it is unexplained?

If disclosure is needed, pair it with control/proof:

> AI helps draft responses from our approved documentation. A human support specialist reviews the answer before sending when the issue involves billing, security, or account access.

## Never fake social proof

Do not use GenAI to create:
- fake reviews,
- fake testimonials,
- fake case studies,
- fake social comments,
- fake customer photos,
- fake logos,
- fake screenshots,
- fake awards,
- fake analyst quotes,
- fake communities,
- fake scarcity.

Social proof works because it transfers trust from other humans. Fake social proof is trust theft.

## AI-authored emotional copy

Be careful using AI for:
- apology emails,
- founder notes,
- values statements,
- social impact campaigns,
- grief/sensitive messages,
- customer empathy content.

AI can help structure, edit, and reduce ambiguity, but the substance must come from human responsibility.

Practical rule:
- For rational/informational content, AI assistance is often useful.
- For emotional/authenticity-dependent content, human authorship and review matter more.

## Data and privacy rules

Do not paste into public AI tools:
- customer PII,
- private emails,
- health/financial/legal data,
- confidential contracts,
- API keys,
- security reports,
- proprietary source code,
- unreleased product strategy,
- private sales notes,
- personal data without permission.

Use:
- enterprise AI controls,
- redaction,
- anonymization,
- approved tools,
- data retention settings,
- access control,
- logs,
- internal policy.

## Prompt injection and agent risk

If you deploy a public AI assistant, it can be attacked. Risks include:
- prompt injection,
- malicious retrieved content,
- data exfiltration,
- unauthorized tool use,
- insecure output handling,
- hallucinated policies,
- hidden instructions in webpages,
- excessive agency.

Controls:
- retrieval only from approved sources,
- least-privilege tools,
- no sensitive actions without confirmation,
- separate instructions from user content,
- output validation,
- refusal rules,
- monitoring/logging,
- red-team prompts,
- human escalation.

## Claim ledger

Maintain a simple table:

- claim,
- asset,
- source/evidence,
- owner,
- date approved,
- review date,
- risk level,
- limitations,
- required disclaimer,
- status.

Example:

| Claim | Evidence | Risk | Status |
|---|---|---:|---|
| "Cuts invoice reconciliation time by 35%" | Customer case study, Feb 2026, n=1 | High | Use only with case-study context |
| "Integrates with Xero" | Product docs, integration page | Medium | Approved |
| "Best AI finance automation tool" | No independent evidence | High | Block |

## AI governance workflow

### Step 1: Source control

Maintain approved:
- product descriptions,
- pricing facts,
- feature list,
- security statements,
- customer quotes,
- case studies,
- brand voice rules,
- legal disclaimers,
- prohibited claims.

### Step 2: Creation

AI drafts from approved context.

### Step 3: Review

Review for:
- accuracy,
- claims,
- privacy,
- IP,
- brand,
- ethics,
- buyer-state fit.

### Step 4: Testing

Run:
- human review,
- red-team prompts for chatbots,
- small experiments,
- monitoring.

### Step 5: Logging

Keep:
- prompt/input,
- model/tool used,
- asset version,
- reviewer,
- approval date,
- performance result,
- incidents.

### Step 6: Monitoring

Watch:
- complaints,
- hallucinations,
- wrong answers,
- conversion quality,
- trust signals,
- legal/regulator updates,
- platform policy changes.

## AI-specific dark patterns

Watch for:

### Synthetic authority

Making AI-generated content look like independent expert judgment.

Better:
- disclose authorship/review process,
- cite sources,
- show human accountability.

### Personalized pressure

Using inferred vulnerability to create urgency or fear.

Better:
- personalize help, not pressure.

### Infinite objection handling

A chatbot that keeps arguing instead of accepting "no."

Better:
- let users exit and escalate.

### Cancellation sludge

AI assistant makes joining easy but leaving hard.

Better:
- cancellation should be clear and direct.

### Fake consensus

AI-generated comments/reviews create the illusion that many people agree.

Better:
- use real reviews, clearly sourced.

### AI-washing

Calling something "AI-powered" when AI is minor, irrelevant, or misleading.

Better:
- explain exact capability and outcome.

## The brand safety rule

Every AI asset should answer:

1. Is it true?
2. Is it useful?
3. Is it fair?
4. Is it clearly sourced?
5. Is it respectful of user autonomy?
6. Is it safe if misunderstood?
7. Is it still acceptable if a critic posts it publicly?

If not, revise or block.

## The governing mindset

AI gives you leverage. Leverage without discipline becomes risk.

The correct mindset:

> Move faster, but publish slower. Generate broadly, but approve narrowly. Personalize usefully, not creepily. Automate tasks, not responsibility.
