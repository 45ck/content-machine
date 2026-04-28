# Quality Gates And Eval Rubric

Date: 2026-04-29
Purpose: convert the research into review criteria for generated shorts.

## Universal Gates

| Gate                 | Pass Condition                                                               | Fail Condition                                                        |
| -------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Hook                 | First 1-3 seconds creates curiosity, value, emotion, or clear promise        | Slow context, throat-clearing, title card with no tension             |
| Standalone coherence | Viewer understands the clip without source context                           | Clip starts mid-thought or depends on unseen setup                    |
| Timing               | No mid-word cuts; captions align with speech                                 | Cut interrupts word/sentence; visible caption drift                   |
| Visual relevance     | Every shot supports the spoken beat or keeps attention without contradiction | Generic stock montage, unrelated gameplay, irrelevant generated image |
| Caption readability  | Text fits safe zone and is readable on phone                                 | Text overlaps UI/face/product or exceeds density                      |
| Audio                | Voice is clear; music is ducked; loudness is normalized                      | Music competes with speech; clipping; silence gaps                    |
| Provenance           | Source media and generated assets have provider/license/source notes         | Unknown background footage or unverifiable claims                     |
| Export               | H.264/AAC MP4, 1080x1920 default, platform profile applied                   | Bad aspect ratio, codec issue, unsafe dimensions                      |

## Archetype-Specific Gates

### Reddit/story over gameplay

- Story has a clear setup, escalation, and payoff.
- Background loop is licensed or generated and not visually distracting.
- Reddit/card opener is readable for at least 1.0 seconds.
- One-word captions do not hide the key gameplay/action area.

### Longform clip factory

- Candidate score includes hook, coherence, emotion, density, and payoff.
- Clip boundaries are snapped to sentence/word/silence points.
- Crop plan keeps active speaker, screen content, or proof object visible.
- Contact sheet confirms no blank frames, bad crops, or caption overlap.

### Topic-to-faceless explainer

- Script uses evidence from research notes where factual.
- Visual plan has one asset intent per beat.
- B-roll changes scene type/scale/motion across consecutive beats.
- No unsupported claim is presented as fact.

### UGC/avatar product short

- Product claim bank backs every benefit or proof statement.
- Avatar/voice asset provenance is recorded.
- Hook, face, product proof, and captions do not compete in the same zone.
- CTA is specific and honest.

### Motion graphics lesson

- One concept per beat.
- Text/cards do not behave like static slides for more than 4-5 seconds.
- Motion grammar clarifies the idea rather than decorating it.
- Final frame/payoff resolves the visual metaphor.

## Scoring Rubric

Use 0-5 per dimension:

| Dimension             | Weight |
| --------------------- | ------ |
| Hook strength         | 25     |
| Standalone coherence  | 20     |
| Visual relevance      | 15     |
| Caption/audio clarity | 15     |
| Payoff / completion   | 10     |
| Platform fit          | 10     |
| Provenance / safety   | 5      |

Score = `sum(score / 5 * weight)`.

Suggested thresholds:

- `85+`: publish-ready after visual review.
- `70-84`: usable but needs targeted fixes.
- `50-69`: regenerate the weakest stage.
- `<50`: choose another archetype or rewrite the brief.
