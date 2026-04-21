# Benchmark Interpretation and Model Selection

## Public benchmark interpretation ladder

Use this ladder every time you see a benchmark claim.

### 1. Identify the unit of work

What is the model actually doing?

- Answering a multiple-choice question?
- Writing a standalone function?
- Editing code with tests?
- Resolving a real GitHub issue?
- Using a terminal?
- Reading screenshots?
- Browsing and gathering evidence?
- Operating tools through an agent harness?

Never compare two scores until the unit of work is clear.

### 2. Identify the harness

Models do not act alone. A benchmark score often measures:

**base model + prompt + scaffold + tools + retry rules + timeouts + verifier + cost budget.**

A weaker model with a better harness can beat a stronger model with a worse harness.

### 3. Identify the verifier

What decides success?

- Unit tests?
- Hidden tests?
- Human judges?
- LLM judges?
- Browser screenshot comparison?
- Static analysis?
- Financial/accounting correctness?
- Production metrics?

For coding agents, the verifier is often more important than the prompt.

### 4. Check contamination and staleness

Static public benchmarks can become overfitted, leaked, or saturated. Look for:

- benchmark release date;
- whether tasks are public;
- whether tasks are new/live;
- whether test cases are sufficient;
- whether the model provider could have trained on related data;
- whether the benchmark has human-validated or dynamic variants.

### 5. Check whether the score maps to your task distribution

A SaaS founder/product-builder needs to know whether the agent can:

- add an event-tracking plan;
- build an onboarding flow;
- fix a production bug;
- write migration scripts;
- build a realistic demo;
- integrate with Stripe/Auth/CRM/email;
- extract evidence from support tickets;
- create internal dashboards;
- run tests and explain risk.

A generic coding score does not answer this. Your eval does.

## Method-selection matrix

See `48_model_selection_matrix.csv` for the sortable version.

| Situation | Choose | Why | Verification |
|---|---|---|---|
| Hard multi-file refactor | Opus 4.7 or strongest coding agent | Higher long-horizon reasoning may reduce supervision | Typecheck, unit tests, integration tests, human PR review |
| Small bug with obvious reproduction | Sonnet/default coding model | Lower cost, enough capability | Failing test first, then fix |
| Bulk copy variants | Cheap/fast model | High volume, low risk | Human sample review, conversion test |
| Buyer-research synthesis | Strong research model + citations | Requires source judgment | Source audit, claim ledger |
| Prototype landing page + app flow | Coding agent + visual verification | Can build and self-check UI | Screenshot comparison, Lighthouse, manual UX review |
| Support-ticket mining | Cheap extractor + strong summarizer | Volume first, strategy second | Precision/recall on labeled sample |
| Security-sensitive change | Strong model + human expert + strict sandbox | High downside | No secrets, branch isolation, security tests, review gate |
| API integration | Coding agent with docs access | Tools can read docs, implement, test | Real sandbox API calls, mocked error cases |
| Product analytics instrumentation | Coding agent + analytics schema | Repetitive but easy to break | Event contract tests, dashboard validation |
| Enterprise buyer-facing agent | Strong model + retrieval + policy layer | Trust and correctness matter | Hallucination eval, refusal tests, red-team prompts |

## The model-selection rule

Start with the cheapest model-agent that can pass the task with verification. Escalate only when failure cost, ambiguity, or coordination burden justifies it.

A high-end model is not an identity symbol. It is a scarce reasoning resource. Spend it where it changes the unit economics of work.
