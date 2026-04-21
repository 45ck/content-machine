# AI Marketing Autonomy Synthesis

## Core position

GenAI changes marketing most where work is repetitive, multivariate, and context-heavy:

- research compression,
- review mining,
- buyer-language extraction,
- creative variant generation,
- landing-page production,
- experiment design,
- report synthesis,
- AI-search content production,
- campaign memory.

It does not remove the need for facts, positioning, measurement, or platform mechanics.

## Autonomous marketing agent stack

| Layer | Agent responsibility | Markdown memory used |
|---|---|---|
| Research | Market, competitor, review, search, source synthesis | `memory/research_findings.md` |
| Buyer diagnosis | Buyer state, job, objections, trigger events | `memory/buyer_language.md` |
| Strategy | Channel, offer, creative platform, proof path | `memory/strategy_decisions.md` |
| Creative | Ads, hooks, scripts, landing sections | `memory/creative_variants.md` |
| Platform packaging | API-ready campaign payload descriptions | `memory/platform_payloads.md` |
| Measurement | Test design, result interpretation, next action | `memory/experiment_memory.md` |
| Learning | What worked, failed, and why | `memory/tactic_performance.md` |

## Key distinction

Do not build an agent that simply emits ad copy.

Build an agent that produces:

```text
research → hypothesis → creative → proof path → launch packet → measurement → learning memory
```

## AI use cases by leverage

| Use case | Leverage | Risk if weak |
|---|---|---|
| Review mining | High | Misread pain or sentiment |
| Competitive ad analysis | High | Copycat positioning |
| Landing-page drafting | High | Unsupported claims |
| Creative variant generation | High | Ad slop / sameness |
| Platform payload creation | Medium-High | Misconfigured campaigns |
| Autonomous budget changes | Medium | Overspend / wrong objective |
| AI-generated testimonials | Do not use | Deception |

## Agent instruction

The agent should treat every campaign as a structured research object. The copy is only one output.
