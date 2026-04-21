# Feature extraction

## Multimodal features

### Visual

```text
first-frame object clarity
face presence
face size
emotion expression
screen clutter
text size
text position
motion in first 0.5s
contrast
before/after split
proof screenshot present
```

### Text

```text
hook length
hook specificity
problem wording
keyword presence
CTA specificity
caption alignment
hashtag relevance
series naming
```

### Audio

```text
voice clarity
music intensity
sound-effect timing
trend audio presence
lyrics competing with speech
```

### Structure

```text
time-to-first-payoff
number of story beats
visual resets per 10s
proof timing
CTA timing
ending type
```

## Extraction methods

```text
manual tagging for early phase
LLM-assisted tagging for text and scripts
vision-model tagging for frames/screenshots
speech-to-text for transcript
embedding clustering for topics and formats
```

## Validation

Every automated feature should be spot-checked:

```text
20% manual audit during early use
10% manual audit once stable
full audit when model drift suspected
```
