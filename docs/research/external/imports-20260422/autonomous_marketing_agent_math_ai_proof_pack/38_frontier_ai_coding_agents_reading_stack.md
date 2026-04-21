# Frontier AI Coding Agents Reading Stack

Generated: 2026-04-20

This layer extends the original advertising, persuasion, SaaS, and generative-AI study pack into **frontier coding agents**: Claude Code, Claude Opus 4.7, software-engineering benchmarks, and how those capabilities change product-building and software-business execution.

## Core thesis

Generative AI changes marketing and software businesses most when it shortens the loop from:

**buyer insight → product hypothesis → prototype → demo → measurement → product improvement → proof asset → distribution.**

Claude Code and similar tools matter because they move AI from “copy and analysis assistant” into “operational agent”: it can inspect a codebase, edit files, run tests, use CLIs, create PRs, and verify work. But that does not make benchmarks equal to business value. The disciplined operator treats benchmarks as **screening signals**, then builds a private eval using their own repo, product, customers, and acceptance tests.

## Priority reading order

### Level 1 — Official capability and usage facts

1. Anthropic — *Introducing Claude Opus 4.7*  
   Use this to understand the vendor’s positioning: long-running coding tasks, agents, high-resolution vision, and enterprise workflows.

2. Anthropic — *Claude API models overview*  
   Study model IDs, price, context window, max output, and recommended model-selection logic.

3. Anthropic — *What’s new in Claude Opus 4.7*  
   Critical for implementation: 1M context, 128k output, adaptive thinking, xhigh effort, task budgets, tokenizer differences, and API-breaking parameter changes.

4. Anthropic — *Model System Cards*  
   The system-card index is the canonical entry point for the Claude Opus 4.7 System Card and safety/capability evaluation disclosure.

### Level 2 — Claude Code operating model

5. Claude Code — *How Claude Code works*  
   Understand the agentic loop: gather context, act, verify, repeat. This is the correct mental model for coding agents.

6. Claude Code — *Best practices*  
   Study verification, plan mode, CLAUDE.md, permissions, CLI tools, MCP, hooks, skills, and subagents.

7. Claude Code — *Common workflows*  
   Use for day-to-day engineering: unfamiliar codebases, debugging, refactoring, writing tests, PRs, and managing sessions.

### Level 3 — Benchmarks and benchmark criticism

8. SWE-bench and SWE-bench Verified  
   Learn what “real GitHub issue resolution” does and does not measure.

9. SWE-bench Pro and SWE-bench Multilingual  
   Use to understand harder long-horizon tasks and cross-language measurement.

10. Terminal-Bench 2.0  
   Learn what terminal-agent competence looks like.

11. Aider Polyglot  
   Understand code-editing benchmark design and why tool harnesses matter.

12. UTBoost / rigorous SWE-bench evaluation  
   Read as an antidote to benchmark worship: tests can be insufficient, and accepted patches can be wrong.

13. Data-contamination and benchmark-survey papers  
   Study why old/static public benchmarks can overstate capability.

14. ProdCodeBench and SWE-bench-Live  
   These are the bridge to your real goal: build an internal eval from recent/production-derived tasks.

## The mindset to install

Do not think: “Which AI is best?”

Think: **“Which model-agent-tool stack wins on my task distribution, under my verification rules, at acceptable cost and risk?”**

A public benchmark is a map. Your product, codebase, customers, constraints, and buyer journey are the terrain.

## What this means for digital/software businesses

AI coding agents let you build more proof, faster:

- Faster prototypes for landing-page claims.
- More realistic demos instead of fake mockups.
- Faster instrumentation for funnel analytics.
- Faster A/B testing infrastructure.
- Faster onboarding flows and in-app guidance.
- Faster integrations that unlock distribution.
- Faster customer-support analysis and product-roadmap feedback.

The strategic danger: using AI to generate **more claims** instead of **more proof**. The winning move is to use AI agents to close the promise–proof gap.
