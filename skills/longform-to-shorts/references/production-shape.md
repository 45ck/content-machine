# Longform To Shorts Production Shape

Use this sequence rather than jumping straight from URL to clip:

1. ingest transcript and word timings
2. select candidate moments from transcript text, not freehand
   timestamps
3. recover exact timing from selected text
4. snap boundaries to words, sentence ends, and silences
5. classify source type:
   talking head, podcast, screen recording, mixed
6. choose crop strategy per scene:
   face-led, two-person, cursor-led, or safe-center fallback
7. export captions only after the clip itself is coherent
8. run clip review before bulk rendering more variants

## Specific Patterns Worth Preserving

- transcript-text selection back to word timings
- silence-aware boundary cleanup
- scene-aware portrait crop changes
- approve/regenerate loop before full render
- per-clip review bundle instead of one giant end-of-run verdict
