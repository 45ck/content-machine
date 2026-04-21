# Executive Summary

## Thesis

Short-form overlay performance can be improved by reducing required reading, making semantic structure visible, protecting gaze-critical regions, adapting to visual load, and preserving full accessibility captions.

## Core architecture

| Layer | Purpose |
|---|---|
| Full captions | Accessibility, exact speech, speaker IDs, meaningful non-speech audio. |
| Semantic overlay | Gist, action, contrast, memory, and muted-first comprehension. |
| Placement engine | Protects face, mouth, hands, product, action, and UI. |
| Visual-load engine | Reduces word count when the frame is busy. |
| Timing engine | Reveals semantic beats before, on, or after the spoken/visual beat depending on experiment. |
| Adaptive router | Selects the best verified method by context. |

## The likely winning stack

> SCC + OFC/PCFB + GSP + VLAC + MFC + DLC

Plain English:

> Compress the idea, show its structure, place it safely, adapt it to visual load, make it work muted, and keep full captions for access.
