# Context Loading Order

When a Claude/Codex-style agent starts a marketing task, load context in this order.

## 1. Operator instructions

- `000_OPERATOR_README.md`
- `AGENTS.md`
- `CLAUDE.md` or `CODEX.md`

## 2. Current product and buyer memory

- `memory/product_facts.md`
- `memory/buyer_language.md`
- `memory/research_findings.md`
- `memory/tactic_performance.md`
- `memory/experiment_memory.md`

## 3. Strategy and research

- `deep_research/000_master_source_index.md`
- One relevant synthesis file from `deep_research/`
- Relevant source notes from `deep_research/source_notes/`

## 4. Tactics

- One or more files from `tactics_deep/`
- Relevant campaign recipe from `campaign_recipes/`

## 5. Output templates

- `templates/`
- `runbooks/`

## Context discipline

Do not load the entire repo if a narrow task only needs one campaign recipe and three tactics. Use retrieval-style loading.
