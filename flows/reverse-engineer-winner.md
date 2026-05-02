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

Follow-up only: call `brief-to-script` manually after this flow when a
new topic should inherit the extracted blueprint. The executable
`reverse-engineer-winner.flow` currently runs only the
`reverse-engineer-winner` ingest path.

## Completion Gates

- `videospec.v1.json` exists
- `theme.v1.json` exists when classification is enabled
- `blueprint.v1.json` exists when blueprint generation is enabled

## Failure And Retry Notes

- URL inputs can fail because of download permissions, source terms, or
  `yt-dlp` availability; prefer local files when reproducibility matters.
- If frame analysis is too expensive, rerun with lighter analysis
  settings rather than skipping the whole reverse-engineering step.
- Treat extracted blueprints as structure references, not permission to
  reuse the source footage.

## Current Status

Executable. The manifest dispatches to the `reverse-engineer-winner`
runtime path and writes the reverse-engineering artifact bundle under
the bound output directory.
