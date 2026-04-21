# Deep Autonomous Marketing Agent Pack - Research Expansion

This expansion turns the Markdown-only autonomous marketing pack into a deeper research-and-execution repository.

It keeps the original stance: **do not build a committee-heavy marketing process**. Build a repo and harness strong enough that Claude Code, Codex, or another frontier agent can run the loop, produce campaign artifacts, and update memory.

The constraint is practical rather than bureaucratic:

> Put the facts, tactics, platform constraints, buyer psychology, campaign history, and measurement rules in Markdown so the agent can retrieve and reuse them.

## What was added

- Deeper source notes for advertising effectiveness, digital measurement, skeptical buyer psychology, SaaS buying, platform APIs, AI marketing, and agent harnesses.
- A larger tactic library with buyer-state mapping, when-to-use rules, prompts, metrics, and failure modes.
- Campaign recipe files for SaaS, product-led growth, services, ecommerce, AI tools, B2B, and local businesses.
- New skills for market research, tactic selection, creative hypothesis generation, platform payload planning, measurement, and AI-search visibility.
- Markdown memory protocols so each agent run records what it learned.
- More detailed Claude/Codex runbooks for using the repo as persistent context.

## The operating principle

**Autonomy is not the absence of structure. Autonomy is a model running inside a high-quality context and harness.**

The pack uses Markdown as the harness memory layer. Ad APIs, CLIs, browser tools, analytics exports, screenshots, ad-library notes, product facts, and customer language should all be converted into Markdown records before the agent makes strategy decisions.

## Core loop

```text
Research market → diagnose buyer state → choose tactic → generate campaign → package launch plan → measure → write learnings → update memory → repeat
```

## Source count

This expansion includes 70 source notes. It does not bundle copyrighted full-text papers or paywalled reports. It links to source pages, public PDFs, official docs, and research abstracts.

## File map

- `deep_research/` - source notes and research synthesis.
- `agent_os/` - operating system files for Claude/Codex-style marketing agents.
- `tactics_deep/` - tactic cards.
- `campaign_recipes/` - campaign blueprints by product/business type.
- `skills/` - additional Markdown skills.
- `memory/` - persistent Markdown records the agent should update.
- `runbooks/` - repeatable agent workflows.
