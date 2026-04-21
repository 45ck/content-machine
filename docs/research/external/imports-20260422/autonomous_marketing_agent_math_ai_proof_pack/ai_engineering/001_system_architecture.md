# System Architecture

## Objective

Build an autonomous marketing agent that can research, plan, generate, test, measure, and learn with Markdown as its durable operating memory.

## Core loop

```text
observe
→ diagnose buyer state
→ select math model
→ select tactic
→ generate variants
→ construct proof path
→ prepare platform packet
→ launch or simulate
→ measure
→ update posterior
→ write learning memo
→ update memory
```

## Components

```text
/agent_os
/math_models
/proof_system
/memory
/campaigns
/experiments
/source_notes
/tactics
/templates
/skills
/runbooks
```

## Recommended agent design

Use one strong general agent with skills by default.

Add specialist subagents only when context isolation or tool restriction is useful:

```text
Research Agent
Math Model Agent
Creative Agent
Proof Path Agent
Measurement Agent
Learning Agent
```

## Hard rule

The LLM owns reasoning. Deterministic code owns state checks, schema validation, budgeting, and execution boundaries.
