# Short-Form Archetype Map

Use this before generating examples. Pick one lane, make it good, then
move to the next one.

`laneId` means visual/editing lane. `scriptArchetype` means script
shape such as `story`, `listicle`, `versus`, `howto`, or
`product-demo`. Do not pass a lane ID as a script archetype unless the
runtime explicitly asks for `laneId`.

## Story / Gameplay

| Lane ID | Script Archetype | Default Visual Mode | Use When | Do Not Add |
| --- | --- | --- | --- | --- |
| `reddit-post-over-gameplay` | `story` | full-screen gameplay with Reddit card opener and captions | classic Reddit/TikTok story request | stock clips, top-lane footage, random B-roll |
| `reddit-story-split-screen` | `story` | Reddit opener, then story support on top and gameplay bottom | story needs receipts, clips, or visual proof after opener | unrelated clips, generic AI illustrations |
| `gameplay-confession-split` | `story` | subject-safe top story-support lane plus bottom gameplay | non-Reddit confession or storytime | Reddit chrome unless source is Reddit-native |
| `text-thread-reveal` | `story` | message UI plus optional gameplay/support lane | drama unfolds through texts | tiny unreadable chat bubbles |

## Faceless Information

| Lane ID | Script Archetype | Default Visual Mode | Use When | Do Not Add |
| --- | --- | --- | --- | --- |
| `stock-b-roll-explainer` | `howto` / `explainer` | stock/B-roll plus active captions | explanation needs real-world visual support | unrelated generic montage |
| `fast-facts-countdown` | `listicle` | fast numbered beats/cards plus supporting motion | list of facts, rankings, myths | slow card holds |
| `animation-explainer` | `explainer` | generated/simple animation scenes | abstract concept needs visual metaphor | static slide deck |
| `motion-card-lesson` | `howto` / `explainer` | designed cards with motion accents | compact lesson or framework | long unchanged cards |

## Product / Persona

| Lane ID | Script Archetype | Default Visual Mode | Use When | Do Not Add |
| --- | --- | --- | --- | --- |
| `saas-problem-solution` | `product-demo` | problem card, proof/demo motion, solution card | product/service explainer | fake UI that looks broken |
| `ugc-avatar` | `testimonial` / `product-demo` | creator/avatar/talking-head style with captions | persona-led ad or testimonial | faceless stock-only filler |

## Fill Modes

- `crop-fill`: use for gameplay and generic motion when the subject
  remains visible.
- `contained-blur`: use when crop-fill would cut off a card, receipt,
  face, phone screen, UI, or important subject.
- `fit-pad`: last resort for diagrams/cards where geometry must remain
  exact. Do not use plain black padding in final output.

## Generation Order

1. `reddit-post-over-gameplay`
2. `stock-b-roll-explainer`
3. `gameplay-confession-split`
4. `text-thread-reveal`
5. `reddit-story-split-screen`
6. `fast-facts-countdown`
7. `saas-problem-solution`
8. `animation-explainer`
9. `motion-card-lesson`
10. `ugc-avatar`
