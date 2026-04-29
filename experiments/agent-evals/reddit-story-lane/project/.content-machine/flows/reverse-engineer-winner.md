# Reverse Engineer Winner Flow

## Purpose

Produce the file set needed to study an existing short and reuse
its structure in later generation steps.

## Inputs

- `videoPath`
- `outputDir`
- frame-analysis settings (optional)

## Skills Called

1. `reverse-engineer-winner`
2. `brief-to-script` for any follow-up topic that should inherit the
   extracted blueprint

## Completion Gates

- `videospec.v1.json` exists
- `theme.v1.json` exists when classification is enabled
- `blueprint.v1.json` exists when blueprint generation is enabled

## Current Status

Documentation-first. The core runtime script exists and can already be
called by Claude Code or Codex CLI over JSON-stdio.
