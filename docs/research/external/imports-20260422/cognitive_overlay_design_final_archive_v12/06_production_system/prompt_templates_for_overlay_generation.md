# Prompt Templates for Overlay Generation

## Transcript to proposition

```text
Extract the underlying proposition from this short-form script. Return:
1. main claim,
2. false belief if present,
3. correction,
4. mechanism,
5. action/takeaway,
6. risks of over-compression.

Script:
[PASTE SCRIPT]
```

## Proposition to semantic beats

```text
Convert the proposition into 2–6 semantic beats for short-form video.
Rules:
- 2–7 words per beat.
- One idea per beat.
- Use contrast structures where possible.
- Preserve meaning.
- Avoid cryptic shorthand.

Proposition:
[PASTE PROPOSITION]
```

## Semantic beats to BCC

```text
Apply BCC styling:
- Bold full operator words: not, no, stop, start, less, more, first, then.
- Apply partial/bionic anchoring only to key concept words.
- Do not style filler words.
- Return plain text plus HTML/Markdown variants.

Beats:
[PASTE BEATS]
```

## BCC+ placement recommendation

```text
Given this video context, recommend placement and density:
- video type:
- face present:
- mouth important:
- hands/product/action important:
- visual load:
- UI conflicts:
- native captions position:

Return:
1. safest placement zone,
2. words per beat,
3. whether to use micro-rests,
4. obstruction risks,
5. fallback if crowded.
```
