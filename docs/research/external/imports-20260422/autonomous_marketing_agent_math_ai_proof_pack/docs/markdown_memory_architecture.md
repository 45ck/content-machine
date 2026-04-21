# Markdown Memory Architecture

## Principle

Everything the marketing agent learns should become Markdown.

Markdown is:

- easy for Claude Code and Codex to read;
- easy to diff;
- easy to search;
- easy to bundle into context;
- easy for humans to inspect only when needed;
- durable across tools.

## Memory layers

### 1. Product memory

File: `memory/product_facts.md`

Contains:

- product name;
- target users;
- features;
- integrations;
- pricing;
- proof;
- screenshots or demo links;
- known limitations;
- forbidden claims.

### 2. Buyer memory

File: `memory/buyer_language.md`

Contains:

- exact buyer phrases;
- pains;
- objections;
- desired outcomes;
- triggers;
- alternatives;
- switching concerns;
- purchase anxieties.

### 3. Tactic memory

Folder: `tactics/`

Each tactic card explains when to use a tactic, why it works, the mindset, prompts, metrics, and failure modes.

### 4. Experiment memory

File: `memory/experiment_memory.md`

Contains:

- hypothesis;
- variants;
- channel;
- budget;
- metric;
- result;
- decision;
- learning.

### 5. Performance memory

File: `memory/tactic_performance.md`

Tracks which tactics work by channel, buyer state, offer type, creative style, and audience.

### 6. Run memory

Folder: `runs/`

Every autonomous work session creates a run log.

## File naming

Use lowercase kebab case:

```text
runs/2026-04-20-google-search-demo-proof-test.md
campaigns/2026-04-20-support-ticket-ai-tool.md
tactics/demo-proof-ads.md
research/source-notes/google-ads-api-rsa.md
```

## Every run log must contain

```markdown
# Run: short name

## Objective
## Context loaded
## Assumptions
## Buyer state
## Tactic selected
## Output created
## Files changed
## Metrics to inspect later
## Next autonomous action
```

## Agent memory update rule

After every campaign or analysis task, update at least one of:

- `memory/buyer_language.md`
- `memory/experiment_memory.md`
- `memory/tactic_performance.md`
- a tactic card under `tactics/`
- a source note under `research/source-notes/`
