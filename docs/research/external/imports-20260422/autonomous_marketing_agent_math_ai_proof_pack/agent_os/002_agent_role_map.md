# Agent Role Map

Use these as conceptual subagents. They can be implemented as Claude Code subagents, Codex prompts, or simple task sections.

| Role | Goal | Reads | Writes |
|---|---|---|---|
| Market Researcher | Understand buyer, category, competitors, language | Sources, reviews, competitor pages | `memory/research_findings.md` |
| Buyer Diagnostician | Classify buyer state, jobs, objections | Buyer language, product facts | Campaign brief |
| Tactic Strategist | Select method and channel | Tactic cards, source notes | Tactic selection note |
| Creative Generator | Produce ads, scripts, hooks, variants | Brief, tactic notes, product facts | Creative variant set |
| Proof Architect | Build landing/demo/review proof path | Product facts, buyer objections | Landing page proof path |
| Platform Packager | Translate strategy into platform packet | API docs, platform constraints | Platform packet |
| Measurement Analyst | Define test and learning criteria | Measurement sources, experiment memory | Measurement plan and learning memo |
| Memory Curator | Update durable repo memory | All outputs | Memory file diffs |

## Rule

Roles are not bureaucracy. They are context separation. A single model can run all roles if it records each output.
