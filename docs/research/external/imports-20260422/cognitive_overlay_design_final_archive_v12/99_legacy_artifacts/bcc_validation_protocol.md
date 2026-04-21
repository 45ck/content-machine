# Cognitive Overlay Design / BCC+ Validation Protocol

## Locked framing

**Cognitive Overlay Design** is the broad field: designing text, timing, motion, placement, and emphasis in video to reduce visual load, guide attention, improve comprehension, and preserve accessibility.

**Physiological Retention Typography** is the short-form branch: overlay design based on how viewers process TikTok/Reels/Shorts through foveal vision, parafoveal reading, working memory, gaze saliency, screen ergonomics, fatigue, and swipe behavior.

**Semantic Compression Captions** are the method family: rewrite speech into compact meaning units rather than verbatim subtitles.

**Bionic Compression Captioning (BCC)** is one candidate method:

> semantic compression + operator anchors + bionic concept anchors + beat timing

**BCC+** is the advanced protocol:

> BCC + gaze-safe placement + visual-load adaptation + muted-first design + full accessibility captions

## Core law

Do not make viewers read faster. Engineer the video so they need fewer fixations to understand more.

## Primary question

Does BCC add measurable value beyond semantic compression alone?

Comparison:

- Semantic compression: `Not motivation. / Structure.`
- BCC: `**Not** **moti**vation. / **Struc**ture.`

If BCC does not improve recall, clarity, effort, or retention beyond semantic compression, bionic anchors should remain optional styling.

## Secondary question

Does BCC+ add value beyond BCC?

Comparison:

- BCC: compressed anchored text.
- BCC+: compressed anchored text + gaze-safe placement + adaptive density + muted-first pass.

If BCC+ wins, the product advantage is placement, timing, and visual-load adaptation rather than typography alone.

## Pilot conditions

1. Native/full captions only.
2. Full burned-in transcript.
3. Keyword-highlight transcript.
4. Semantic compression.
5. BCC.
6. BCC+.
7. Heavy bionic control.

## Pilot stimulus corpus

Use 12 short videos, 15–45 seconds each:

- productivity / behavior
- study / learning
- fitness / health
- finance / business
- tutorial / demo
- emotional / story / commentary
- coding / screen recording
- product demonstration
- creator strategy
- time management

Each video must keep the same base edit across variants. Only the overlay changes.

## Measurements

Primary:

- gist recall
- action recall
- contrast recall
- perceived effort
- completion rate

Secondary:

- exact recall
- visual recall
- helpfulness of text
- distraction from text
- clarity rating
- saves/shares/comments in platform tests

Master metric:

> meaning retained per second watched

Advanced metric:

> meaning retained per fixation

## Decision gates

### Gate 1: Semantic compression effect
Semantic compression should beat full transcript overlays on gist/action recall or effort. If not, rewrite the compression grammar.

### Gate 2: Bionic anchor effect
BCC should beat semantic compression on at least one useful metric without increasing distraction. If not, keep bionic anchors optional.

### Gate 3: BCC+ physiology effect
BCC+ should beat BCC on visual recall, effort, muted comprehension, or completion. If yes, prioritize placement and adaptive density.

### Gate 4: Heavy bionic control
Heavy bionic formatting should underperform sparse BCC. If it does not, re-check whether test stimuli accidentally rewarded word-by-word scanning.

## Production rules

1. Keep full closed captions as the accessibility layer.
2. Use overlay text as semantic compression, not a transcript replacement.
3. Use 2–7 words per beat.
4. Use full-bold operator words: not, no, stop, start, less, more, first, then.
5. Use partial bionic emphasis only on concept words.
6. Use 1–3 emphasized items per screen.
7. Protect eyes, mouth, hands, product, diagram, cursor, and platform UI.
8. Use micro-rests between dense caption beats.
9. Test muted.
10. Test with audio.

## Minimum experiment

Use one script:

> Most people don’t fail because they lack motivation. They fail because their day has no structure. If you want to change the habit, reduce the friction around the first step.

Create variants:

- Full transcript
- Keyword highlight
- Semantic compression
- BCC
- BCC+
- Heavy bionic

Expected result:

- Full transcript: best exact wording, weaker efficiency.
- Keyword highlight: moderate improvement.
- Semantic compression: strong gist recall.
- BCC: possible small memory/clarity gain beyond compression.
- BCC+: likely best muted comprehension and visual efficiency.
- Heavy bionic: noisy, likely weaker.

## Source URLs

- W3C captions overview: https://www.w3.org/WAI/media/av/captions/
- PLOS ONE sound-off subtitled videos study: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0306251
- Partial and synchronized captioning: https://www.cambridge.org/core/journals/recall/article/partial-and-synchronized-captioning-a-new-tool-to-assist-learners-in-developing-second-language-listening-skill/9394E3F0AD25FD5F32895F965F7ECCAD
- Caption keyword highlighting: https://cair.rit.edu/share/kafle-et-al-2019-assets.pdf
- Bionic Reading no-effect study: https://www.sciencedirect.com/science/article/pii/S0001691824001811
- Bionic Reading eye-tracking study: https://pmc.ncbi.nlm.nih.gov/articles/PMC12565662/
- Meaning maps and attention: https://www.nature.com/articles/s41598-018-31894-5
- AViMoS / video saliency challenge: https://github.com/msu-video-group/ECCVW24_Saliency_Prediction
- Visual working memory review: https://www.sciencedirect.com/science/article/abs/pii/S1364661313001265
- Parafoveal processing in reading: https://link.springer.com/article/10.3758/s13414-011-0219-2
