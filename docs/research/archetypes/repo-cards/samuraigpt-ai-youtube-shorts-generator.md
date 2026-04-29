# SamurAIGPT AI YouTube Shorts Generator

Local path:
`vendor/imports-20260423-shortform-downloads-direct/direct-repos/SamurAIGPT__AI-Youtube-Shorts-Generator`

## Archetype

`longform-clip-factory`

## Production Pattern

YouTube or local video in, transcript and LLM-selected highlight in the
middle, vertical subtitled short out.

## Useful Extraction

- command-line URL or local file input
- Whisper transcription to timestamped segments
- LLM highlight selection from timestamped transcript text
- approval/regeneration loop with timeout
- crop to vertical before subtitles
- subtitle source-time offset after clip extraction
- session-scoped temp files and cleanup

## Content-Machine Implication

Add explicit `highlight-candidates`, `highlight-approval`,
`crop-plan`, and `captions` artifacts to the longform path. The repo proves
that a one-shot render is too thin for longform clipping.

## Asset Policy

Do not copy generated clips or downloaded YouTube media. Treat code as
implementation evidence only until license review is complete.
