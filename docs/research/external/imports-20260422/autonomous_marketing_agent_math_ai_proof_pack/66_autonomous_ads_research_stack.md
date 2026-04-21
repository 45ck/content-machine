# Autonomous Ads Research Stack

## How to read this layer

Read in this order:

1. Platform API mechanics.
2. Platform policies.
3. AI/agent architecture.
4. Advertising measurement and experimentation.
5. AI advertising and consumer response.
6. Legal/privacy/compliance.

The goal is to understand not just how to generate ads, but how to build a reliable machine that knows when not to generate, not to launch, or not to scale.

## Platform API and automation sources

### Google Ads API: Search campaigns and responsive search ads

Why it matters: shows that campaign and ad creation can be done programmatically, including responsive search ads.

Read for:

- campaign budgets,
- campaigns,
- ad groups,
- responsive search ad requirements,
- final URLs,
- API mutation patterns.

Mindset: Google Ads can be controlled by code, but every object should be tied to a hypothesis and claim ledger.

### Google AI Max for Search campaigns

Why it matters: shows platform-native AI is already moving toward automated reach expansion, creative tailoring, and landing-page optimization.

Read for:

- AI Max as optimization layer,
- text customization,
- final URL expansion,
- settings control.

Mindset: platform AI is a powerful optimizer, not your strategist or compliance officer.

### Meta Marketing API and Advantage+ Creative

Why it matters: Meta supports programmatic campaign creation and AI creative variation.

Read for:

- campaign/ad set/ad/ad creative objects,
- creative uploads,
- Advantage+ creative,
- ad standards.

Mindset: on social, creative volume matters, but misleading native-style creative creates trust risk.

### LinkedIn Marketing API

Why it matters: useful for B2B software ads, role/company targeting, lead forms, and professional proof assets.

Read for:

- campaign creation,
- creative management,
- lead gen,
- analytics,
- professional ad policies.

Mindset: B2B buyers punish vague hype; use proof assets.

### TikTok API for Business

Why it matters: built for batch delivery and creative material management at scale.

Read for:

- campaign creation,
- ad group/ad objects,
- creative material management,
- reporting.

Mindset: high-volume creative requires high-volume governance.

### Microsoft Advertising API

Why it matters: complements Google Search and supports responsive search ads.

Read for:

- responsive search ads,
- campaign management,
- bulk operations,
- audience ads.

Mindset: do not ignore non-Google search if the buyer audience is professional or B2B.

## AI/agent architecture sources

### OpenAI Agents SDK, function calling, structured outputs, tools, image generation

Why it matters: these are the primitives for building ad agents that produce structured JSON, call tools, search files/web, generate images, and use guardrails/tracing.

Read for:

- tool calling,
- structured outputs,
- web/file search,
- agent handoffs,
- guardrails,
- tracing,
- sandbox/computer use,
- image generation.

Mindset: agents must be instrumented systems, not magic prompts.

### NIST Generative AI Profile

Why it matters: gives a risk-management frame for GenAI systems.

Read for:

- governance,
- risk mapping,
- measurement,
- mitigations,
- synthetic content risks,
- information integrity.

Mindset: GenAI risk is not just hallucination; it includes misuse, privacy, provenance, bias, and overreliance.

## AI advertising research

### Grewal et al. - How generative AI is shaping the future of marketing

Why it matters: broad academic view of how GenAI affects marketing communication, content creation, and customer interaction.

Mindset: GenAI changes production and interaction, but buyer psychology remains.

### Kshetri - Generative AI in marketing: applications, opportunities, challenges

Why it matters: practical survey of GenAI in content, lead generation, and marketing productivity.

Mindset: use GenAI to improve insight and relevance, not only output volume.

### AI disclosure and consumer response research

Why it matters: consumers can respond positively to AI novelty but negatively to reduced authenticity.

Mindset: disclosure and trust design matter; hiding AI use is not a strategy.

## Experimentation and optimization sources

### Multi-armed bandit advertising papers

Why it matters: ad testing is a learn-and-earn problem.

Read for:

- exploration/exploitation,
- creative allocation,
- contextual bandits,
- performance marketing constraints.

Mindset: use bandits for adaptive allocation, not for causal certainty.

### Digital advertising measurement literature

Why it matters: platform metrics can mislead; incrementality is hard.

Read for:

- causal inference,
- randomized experiments,
- ad effectiveness measurement,
- attribution limits.

Mindset: never confuse dashboard conversions with incremental profit.

## Policy and legal sources

### FTC AI, endorsements, and dark patterns

Why it matters: truth-in-advertising rules apply to AI-generated marketing. Fake reviews, deceptive claims, hidden terms, and manipulative interfaces are major risk areas.

Mindset: AI does not create an exemption from advertising law.

### ACCC advertising and misleading claims

Why it matters for Australia: businesses must be able to prove advertised claims; social media and online ads are included.

Mindset: if you cannot prove it, the autonomous system should not say it.

### OAIC privacy and AI guidance

Why it matters for Australia: AI use involving personal information is still subject to privacy obligations; direct marketing and tracking pixels carry specific duties.

Mindset: personalization without lawful data discipline becomes risk.

## Reading sequence for the next 30 days

### Week 1: API reality

- Google Ads Search campaign and RSA docs.
- Meta campaign creation and creative docs.
- LinkedIn campaign/creative docs.
- TikTok API for Business overview.

Output: draw the object model for each platform.

### Week 2: Guardrails

- Google misrepresentation/editorial policies.
- Meta advertising standards.
- LinkedIn ad policies.
- FTC dark patterns and endorsements.
- ACCC false/misleading claims.

Output: build a policy checklist.

### Week 3: Agent architecture

- OpenAI Agents SDK.
- Function calling.
- Structured outputs.
- Tools/file search/web search.
- NIST GenAI Profile.

Output: define schemas for campaign briefs, claims, variants, and approvals.

### Week 4: Experimentation

- Multi-armed bandit ad papers.
- Digital ad measurement papers from earlier pack.
- Your own experiment ledger.

Output: create kill/scale rules and a bandit-vs-A/B decision matrix.

## Research question to keep asking

> Which parts of the advertising system can be safely automated because the decision is bounded, observable, and reversible? Which parts require human judgment because they create new claims, new risk, or irreversible trust damage?
