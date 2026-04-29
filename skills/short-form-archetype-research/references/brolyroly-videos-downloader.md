# brolyroly Videos Downloader

Local path:
`vendor/imports-20260423-shortform-downloads-direct/direct-repos/brolyroly007__Videos_downloader`

## Archetype

`caption-export-primitives` and platform ingestion.

## Production Pattern

Multi-platform downloader and processing dashboard for TikTok, Reels, Shorts,
and Facebook videos, with subtitles, metadata, queueing, analytics, and upload
automation.

## Useful Extraction

- platform-specific download abstraction
- video validation before processing
- subtitle generation with SRT and burned-in variants
- task queue and progress tracking
- metadata for captions, hashtags, and viral score

## Content-Machine Implication

The ingestion, validation, and queue patterns are useful. Repost automation
and anti-copyright effects should become explicit rejection conditions in
publish prep.

## Asset Policy

Do not adopt mirror/speed/color-shift evasion tactics. Do not reuse downloaded
third-party platform media without rights.
