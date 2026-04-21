# Context Loading Strategy

## Context layers

1. Core doctrine: `AGENTS.md`, `CLAUDE.md`, `CODEX.md`.
2. Marketing law: `400_MATH_AI_PROOF_README.md`, `MATHEMATICAL_OPERATING_LAW.md`.
3. Current memory: product facts, buyer language, experiment memory.
4. Relevant tactic cards.
5. Relevant math model card.
6. Campaign packet.
7. Source notes only when needed.

## Loading rule

Load the minimum context that lets the agent act correctly.

## Retrieval prompts

```text
Find the current product fact file.
Find prior experiments for this buyer segment.
Find the math model for low-sample conversion rates.
Find tactics for solution-aware SaaS buyers.
Find the latest learning memo for this channel.
```

## Avoid

- loading every source note for every task,
- using stale campaign memories without checking dates,
- mixing product claims with unverified ideas.
