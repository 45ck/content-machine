# Feature: Quality Loop (Score + Lab + Feedback as an Iteration System)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

The project already includes:

- `cm score` (heuristic scoring)
- `cm lab` (local A/B review UI)
- `cm feedback` (ratings store/export)

This feature connects them into an explicit iteration loop that supports rapid hypothesis testing
and continuous improvement of short-form output quality.

## User Value

- Faster iteration on caption styles, motion, templates, and prompts.
- Combines automated heuristics and human judgment without biasing reviewers.
- Creates a dataset of decisions that can be used to tune defaults and prompts.

## Goals

- One loop command that:
  - runs baseline and variant generations (or imports existing artifacts)
  - opens `cm lab compare`
  - collects ratings (without showing heuristic scores in the UI)
  - writes a single structured result artifact
- Make it easy to run repeated experiments across topics.

## Non-goals

- Training a model inside this repo.
- Building a remote annotation platform.

## UX / CLI

### Commands (proposal)

- `cm loop compare <pathA> <pathB> --hypothesis "<text>" [--tags ...]`
- `cm loop generate --baseline-config <path> --variant-config <path> --topic "<t>" ...`

Notes:

- `cm lab compare` stays the UI entrypoint; `cm loop` is an orchestrator.

## Data Contracts

- `experiment.json`:
  - references run ids and artifact paths
  - stores hypothesis, tags
  - stores human ratings and freeform notes
  - stores heuristic score summaries (hidden from reviewer during rating)

## Architecture

- Keep the Lab server the human interaction surface.
- Keep the stores append-only (JSONL) for robustness and diffability.
- Add a small orchestrator module that:
  - creates experiment IDs
  - starts the lab in one-shot mode
  - waits for submission and prints a short summary

## Testing

### Unit

- Experiment schema validation.
- Store append and retrieval behavior.

### Integration

- Start lab in one-shot compare mode and submit feedback via HTTP in an automated test.

### V&V

- Layer 4: periodic review sessions over golden topics and template variants.

## Rollout

- Keep existing commands; add `cm loop` as additive sugar.
- Start with compare-only; add generate-orchestration later.

## Related

- Lab: `src/cli/commands/lab.ts`
- Feedback: `src/cli/commands/feedback.ts`
- Scoring: `docs/reference/cm-score-reference-20260107.md`
