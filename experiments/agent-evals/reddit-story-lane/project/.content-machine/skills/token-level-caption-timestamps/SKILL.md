---
name: token-level-caption-timestamps
description: Use token-level ASR timestamps as the caption timing source so word highlights, tight subtitle chunks, and narration-linked edits are based on real spoken timing instead of coarse segment estimates.
---

# Token-Level Caption Timestamps

## Use When

- The short needs active-word highlighting or tight word-group caption
  timing.
- Segment-level transcript timestamps are too coarse for the caption
  style.
- Edit timing, motion beats, or subtitle emphasis depend on real spoken
  word timing.

## Core Rule

- If the caption treatment depends on individual words, capture
  token-level timing.
- Do not fake word timing by evenly splitting long transcript segments.

## Inputs

- narration audio
- ASR tool that can emit token or word timestamps
- caption grouping rules:
  max words per chunk, max duration, punctuation handling

## Outputs

- token-level or word-level timestamp stream
- caption-ready word groups
- timing notes for highlight or edit systems

## Workflow

1. Transcribe with token-level timestamps enabled.
2. Drop empty or artifact tokens before display grouping.
3. Merge tokens carefully when the ASR emits split punctuation or
   spacing artifacts.
4. Build higher-level caption chunks from the cleaned token stream.
5. Feed those timings into caption render, karaoke logic, or timing
   verification rather than falling back to segment timestamps.

## Good Pattern

- token timings come from the real audio pass
- cleanup happens before styling
- chunking preserves readability on a phone screen
- downstream caption systems can still choose standard, karaoke, or
  emphasis-heavy rendering

## Bad Pattern

- estimating each word as `segment_duration / word_count`
- styling captions before removing bogus ASR tokens
- relying on sentence-level timestamps for active-word highlighting
- pretending segment timestamps are accurate enough for tight beat cuts

## Pair With

- Use before [`short-form-captions`](../short-form-captions/SKILL.md)
  when the caption design needs precise timing.
- Use with
  [`karaoke-ass-captions`](../karaoke-ass-captions/SKILL.md) for
  fixed-position active-word captions.

## Aggregated From

- `gyoridavid/short-video-maker` `Whisper.ts`
- `@remotion/install-whisper-cpp` token-level timestamp workflow

## Validation Checklist

- Word timings come from ASR output, not inferred splits.
- Empty or control tokens are removed before caption grouping.
- Resulting chunks read cleanly at phone size.
- Highlight timing matches spoken words closely enough to notice if it
  slips.
