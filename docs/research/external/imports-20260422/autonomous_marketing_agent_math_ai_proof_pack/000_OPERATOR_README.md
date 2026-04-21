# Autonomous Marketing Agent — Markdown-Only Operating Pack

This pack is the corrected direction: agent-native, Markdown-first, tactics-heavy, and built for Claude Code/Codex-style operation.

It keeps the prior research and autonomous ad factory material, but adds an explicit operating stance:

> Do not build a committee. Build a self-running marketing agent repo.

The agent should read Markdown, create Markdown, update Markdown memory, and run through a CLI harness. The core unit is not a meeting or approval flow. The core unit is a Markdown artifact: tactic cards, buyer-state cards, claim/fact cards, experiment cards, platform payload notes, campaign run logs, and learning memos.

## Priority order

When using this pack in an agent harness, load these first:

1. `AGENTS.md`
2. `CLAUDE.md` or `CODEX.md`
3. `docs/no_committee_autonomous_marketing_model.md`
4. `docs/markdown_memory_architecture.md`
5. `docs/campaign_autopilot_loop.md`
6. `docs/marketing_agent_roles.md`
7. `docs/tactic_library_index.md`
8. relevant skills under `skills/`
9. relevant tactic cards under `tactics/`
10. logs and templates under `templates/`

## Operating law

Autonomous marketing is not an AI that randomly invents ads.

Autonomous marketing is a closed-loop system that:

1. reads product facts, market evidence, buyer language, and performance logs;
2. chooses a strategy and tactic;
3. generates assets;
4. produces launch-ready platform payload notes;
5. records what it did;
6. measures what happened;
7. updates the tactic and learning memory.

## Everything Markdown

This archive intentionally contains only Markdown files. Former CSV, JSON, YAML, SQL, HTML, TOML, BibTeX, Python, and text files from the previous pack have been converted into Markdown wrappers or Markdown tables.

## Important distinction

This is not a governance pack. It is a harness pack.

- Governance mindset: meetings, committees, slow review.
- Harness mindset: repo instructions, skills, facts, budgets, run logs, platform constraints, and automatic self-checks.

The agent should run hard inside the harness.


## Deep Research Expansion Added

This version adds a deeper researched Markdown-only layer: `deep_research/`, `agent_os/`, `tactics_deep/`, `campaign_recipes/`, new skills, runbooks, and memory templates. Use `200_DEEP_RESEARCH_README.md` as the entrypoint for the expanded pack.
