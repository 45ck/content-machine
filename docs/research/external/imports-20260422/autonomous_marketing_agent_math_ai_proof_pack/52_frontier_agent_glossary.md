# Frontier Agent Glossary

## Agentic loop
A repeated cycle where the model gathers context, acts through tools, observes results, and adjusts.

## Harness
The surrounding system that gives a model prompts, tools, memory, retries, context, permissions, and evaluation rules.

## Scaffold
A particular agent architecture or wrapper around a model. Public benchmark scores often depend heavily on scaffold quality.

## SWE-bench
A benchmark family where models or agents solve real software issues by generating patches for repositories.

## SWE-bench Verified
A human-filtered SWE-bench subset intended to contain solvable, valid tasks.

## SWE-bench Pro
A harder long-horizon benchmark variant for more production-like software-engineering tasks.

## Aider Polyglot
A code-editing benchmark based on challenging Exercism tasks across multiple languages. Especially relevant to edit-following and test-feedback loops.

## Terminal-Bench
A benchmark of tasks in terminal environments. Useful for command-line agent competence.

## Data contamination
When benchmark data or related solutions appear in model training or tuning data, potentially inflating scores.

## Test oracle
The mechanism deciding whether an answer is correct. For coding, this is often a set of tests; if the tests are weak, wrong patches may pass.

## Fail-to-pass test
A test that fails before the patch and passes after the patch, used to validate bug fixes.

## Pass-to-pass test
A test expected to pass both before and after the patch, used to catch regressions.

## Private eval
Your own benchmark built from real tasks, repos, and acceptance criteria. This is the highest-value evaluation for deployment decisions.

## CLAUDE.md
A project instruction file read by Claude Code at the start of sessions. It should contain stable rules, commands, and conventions.

## Plan mode
A read-only/exploration mode used before implementation. Best for unclear, risky, or multi-file tasks.

## Hook
A deterministic script triggered at certain workflow points. Use hooks for rules that must always happen.

## Skill
A reusable instruction/workflow package loaded when relevant.

## Subagent
A specialized assistant with separate context, useful for isolated reviews, searches, or domain-specific tasks.

## MCP
Model Context Protocol; a way to connect agents to external tools and context providers.

## Claim ledger
A table mapping marketing/sales claims to evidence, risk, and safer wording.

## Proof surface
Any public or buyer-facing asset that helps buyers verify a product claim: docs, demo, changelog, pricing, security page, case study, integration page, review profile.
