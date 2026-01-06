# TTS Engines: Coqui StyleTTS (Research Notes)

**Date:** 2026-01-06  
**Status:** Research notes (not a commitment)

---

## What It Is

Coqui StyleTTS (and related “StyleTTS2”-style approaches) represent a family of TTS models focused on natural prosody and style control.

This doc is a research note about whether that family should influence `content-machine`’s audio roadmap.

---

## Why We Care

For short-form, voiceover quality impacts:

- perceived professionalism,
- comprehension speed,
- retention (especially when paired with word-highlighted captions).

---

## Fit with content-machine Principles

### Good fit

- Local-first audio generation aligns with “offline mode” and cost control.
- Higher naturalness can reduce the need for post-processing.

### Poor fit (today)

- Packaging and distribution complexity on Windows.
- GPU/compute demands may violate the “under 5 minutes” goal for the default path.

---

## Recommended Direction

1. Keep Kokoro/EdgeTTS as the default path for MVP (`cm audio`).
2. Track StyleTTS-family engines as a future optional provider behind an interface boundary.
3. Focus near-term quality improvements on:
   - pacing control
   - pronunciation dictionaries
   - timestamp alignment reliability
