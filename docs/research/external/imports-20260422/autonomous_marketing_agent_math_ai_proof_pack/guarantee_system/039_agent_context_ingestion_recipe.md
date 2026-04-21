# Agent Context Ingestion Recipe

For Claude Code, Codex, or another repo agent, load context in this order.

## Minimal load

```text
AGENTS.md
CLAUDE.md or CODEX.md
300_GUARANTEE_SYSTEM_README.md
guarantee_system/000_index.md
guarantee_system/040_agent_prompt_master.md
guarantee_templates/001_campaign_packet_template.md
memory/product_facts.md
memory/buyer_language.md
memory/experiment_memory.md
```

## Prompt shape

```text
Use this repo as your memory and operating system.
Create Markdown artifacts.
Do not stop at advice.
Produce a campaign packet, proof path, measurement plan, and memory update.
```
