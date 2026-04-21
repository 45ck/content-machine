# Marketing Agent Roles

Use these as Claude Code subagents, Codex prompts, or skill-triggered modes.

## 1. Research Ingestor

Reads market pages, competitor ads, reviews, source notes, and buyer language. Writes source notes and buyer-language memory.

## 2. Buyer-State Diagnoser

Classifies the target audience into a buying state and selects the appropriate persuasion job.

## 3. Strategy Router

Chooses channel, tactic, offer type, proof path, and test structure.

## 4. Tactic Executor

Loads one tactic card and generates assets using that tactic only.

## 5. Creative Director Agent

Creates static image briefs, video scripts, storyboards, and visual concept directions.

## 6. Landing Page Agent

Creates message-matched landing-page sections, proof blocks, FAQs, objection handling, and CTA structure.

## 7. Platform Payload Agent

Turns campaign artifacts into platform-specific launch notes or API payload drafts.

## 8. Performance Analyst

Reads performance exports and writes experiment interpretations.

## 9. Memory Librarian

Updates tactic cards, buyer memory, source notes, and experiment memory.

## 10. Self-Critique Agent

Checks whether the output is generic, unsupported, misaligned with buyer state, or missing a proof path.

## Subagent design pattern

Each subagent should have:

```markdown
# Role
# Inputs
# Files to read
# Files to write
# Output format
# Stop condition
```

Claude Code supports custom subagents with custom prompts, tool restrictions, permission modes, hooks, and skills: https://code.claude.com/docs/en/sub-agents
