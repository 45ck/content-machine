# Format Workflows And Review Batch

Content Machine now ships a small set of built-in format workflows so you can mix workflow defaults with existing templates instead of hand-assembling the same flags every time.

Built-in workflows:

- `brainrot-gameplay`
- `gemini-meme-explainer`
- `absurdist-edutainment`
- `clean-educational-control`

## Examples

```bash
# Gameplay-heavy meme explainer
cm generate "Why 2026 feels like 2016 again" \
  --workflow brainrot-gameplay \
  --archetype meme-pov \
  --output output/review/brainrot.mp4

# Gemini image-led meme explainer
cm generate "Browser cache explained like the internet's most annoying roommate" \
  --workflow gemini-meme-explainer \
  --archetype hot-take \
  --visuals-motion-strategy kenburns \
  --output output/review/meme.mp4

# Cleaner educational control
cm generate "Redis vs PostgreSQL for caching in 45 seconds" \
  --workflow clean-educational-control \
  --archetype versus \
  --output output/review/control.mp4
```

## Review Batch Fixture

This fixed 5-item fixture is shipped as validated fixture data for review planning and reproducible topic selection:

- [`test-fixtures/generate/high-hook-review-batch-20260306.json`](../../../test-fixtures/generate/high-hook-review-batch-20260306.json)

It is not a first-class `cm generate` batch input yet; use the items as a curated set of workflow/topic combinations.

It covers:

- gameplay-heavy brainrot
- AI-image-led meme explainer
- absurdist edutainment
- practical tip with meme hook
- clean educational control

## Notes

- `brainrot-gameplay` expects gameplay footage through the normal gameplay library flow.
- `gemini-meme-explainer` expects `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
- The Gemini image-led workflows default to `kenburns`; upgrade them with `--visuals-motion-strategy veo --media --media-veo-adapter google-veo` once Vertex auth is working.
- Do not combine `--mock` with `--visuals-motion-strategy veo|depthflow` or `--media`; mock visuals are inline QA cards, not real local image assets for synthesis.
