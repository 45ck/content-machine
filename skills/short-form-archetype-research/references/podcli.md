# Podcli

Source: <https://podcli.com/>

## Archetype

`longform-clip-factory`

## Production Pattern

Local podcast clip studio with transcription, clip suggestion, face crop,
caption rendering, export, and an MCP tool surface for coding agents.

## Useful Extraction

- word-level timestamps and speaker diarization
- speaker-aware face crop and split-screen handling
- caption style modes: branded, Hormozi, karaoke, subtle
- knowledge base for show voice, title formulas, and banned words
- duplicate clip history
- MCP tools around the same pipeline stages

## Content-Machine Implication

This is a close target shape for content-machine's local-first direction:
skills and harnesses should expose stage artifacts and let agents operate the
pipeline without hiding decisions inside a monolithic CLI.

## Asset Policy

Use documentation as design reference. Do not copy code or demo media without
license review.
