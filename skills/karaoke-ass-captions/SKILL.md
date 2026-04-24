---
name: karaoke-ass-captions
description: Build ASS-based karaoke captions with fixed-position word highlighting so the active word changes in place without the whole subtitle block jumping around.
---

# Karaoke ASS Captions

## Use When

- The short needs active-word highlighting rather than static subtitle
  pages.
- You want karaoke-style timing but do not want the caption block to
  shift position every word.
- The output stack can burn ASS subtitles or convert them downstream.

## Core Rule

- Keep the subtitle block anchored.
- Only the active word should change emphasis, not the whole layout.

## Inputs

- word-level transcript timestamps
- video resolution or ASS play resolution
- highlight color and normal color
- chunking constraints:
  max words per display group, max duration per group

## Outputs

- `.ass` subtitle file
- `.srt` subtitle file when exported through the render harness
- `captions.remotion.json` when exported through the render harness
- grouped caption chunks suitable for burn-in

## Workflow

1. Start from word-level timestamps, not segment-only timings.
2. Clean punctuation from individual words for display.
3. Group words into short chunks by word count, duration, and natural
   sentence breaks.
4. For each chunk, write one dialogue line per active word.
5. Keep a shared `\pos()` and alignment for the whole chunk so the text
   block stays fixed while the highlight moves.

## Good Pattern

- 2-4 words per visible chunk
- one active word highlighted at a time
- same screen position across the chunk
- high contrast:
  white text with one colored active word and heavy outline

## Bad Pattern

- rebuilding line breaks every word
- long sentence chunks that become unreadable
- active-word timing without word-level timestamps
- karaoke mode used on footage where standard short-form captions would
  read better

## Pair With

- Use with [`short-form-captions`](../short-form-captions/SKILL.md) when
  the chosen caption role is karaoke or word-led emphasis.
- Feed the result into [`video-render`](../video-render/SKILL.md) or any
  FFmpeg burn stage that accepts ASS input.
- The repo-side render harness now emits `captions.ass`,
  `captions.srt`, and `captions.remotion.json` by default when caption
  export is enabled.

## Aggregated From

- `alhazacod/clipforge` `subtitles_transcription.py`
- `iDoust/youtube-clip` ASS-first subtitle practice

## Validation Checklist

- Subtitle block position stays stable inside each chunk.
- Active word timing maps to real spoken timing.
- Chunk size stays readable on a phone viewport.
- ASS output is valid and burnable by FFmpeg.
- SRT and Remotion JSON sidecars stay consistent with the same caption
  grouping.
