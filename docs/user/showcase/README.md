# Showcase Gallery

Use this page when someone needs to understand Content Machine fast:
pick a lane, look at the preview, then open the skill or example that
made it.

Content Machine is not one render template. It is a skill pack that lets
agents combine scripts, timestamps, visuals, captions, gameplay,
graphics, and review artifacts into inspectable short-form videos.

The machine-readable demo source is
[`docs/demo/manifest.json`](../../demo/manifest.json). The generated
demo index is [`docs/demo/README.md`](../../demo/README.md).

## Fast Read

1. Choose the content lane first: story, explainer, product, longform,
   motion lesson, or document-style breakdown.
2. Add a visual treatment only when it helps: gameplay, 3D/procedural
   motion, stock, cards, screen recordings, generated images, or local
   clips.
3. Render a normal MP4 plus sidecars so another agent can inspect what
   happened.
4. Promote only after review; a render is a preview until quality gates
   explain what passed.

## Start With The Golden Example

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-9-reddit-post-over-gameplay.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-9-reddit-post-over-gameplay.gif" alt="Reddit post over gameplay showcase" width="280" />
  </a>
</p>

Copy `demo-9` first when the request is a Reddit story, confession, or
AITA-style short. It shows the default shape: a Reddit opener card over
full-screen gameplay, then captions continuing over the same gameplay.

## Repo Explainer Previews

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.gif" alt="Content Machine Reddit gameplay remix preview" width="180" />
  </a>
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-19-content-machine-motion-cards.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-19-content-machine-motion-cards.gif" alt="Content Machine motion cards preview" width="180" />
  </a>
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-20-content-machine-3d-runner.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-20-content-machine-3d-runner.gif" alt="Content Machine 3D runner preview" width="180" />
  </a>
</p>

These are deterministic no-key previews for explaining the repo. They
are useful for onboarding and social clips. Automated demo-video review
evidence lives in the repo under `experiments/video-quality-review-demo`,
and demo source notes live in
[`docs/demo/provenance`](../../demo/provenance/README.md). These previews
are not golden public benchmarks until publish-prep sidecars are
attached too. `demo-20` is also intentionally experimental: it is a
`720x1280` 3D/procedural preview, not a README-promoted public benchmark.

## What Each Lane Shows

| Preview                                                                                                                      | What People Should Understand                                                           | Start Here                                                                                    | Maturity                        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| [`demo-9`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-9-reddit-post-over-gameplay.mp4)               | Reddit card opens over gameplay, then captions continue over full-screen gameplay       | [`reddit-post-over-gameplay-short`](../../../skills/reddit-post-over-gameplay-short/SKILL.md) | `golden showcase`               |
| [`demo-10`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-10-stock-broll-explainer.mp4)                 | Topic-to-explainer lane using stock-style support visuals                               | [`stock-footage-edutainment-short`](../../../skills/stock-footage-edutainment-short/SKILL.md) | `showcase candidate`            |
| [`demo-11`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-11-text-thread-reveal.mp4)                    | Chat/DM receipts become the primary visual grammar                                      | [`text-message-drama-short`](../../../skills/text-message-drama-short/SKILL.md)               | `showcase candidate`            |
| [`demo-12`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-12-saas-problem-solution.mp4)                 | Product pain, proof, demo, and CTA beats                                                | [`saas-problem-solution-short`](../../../skills/saas-problem-solution-short/SKILL.md)         | `showcase candidate`            |
| [`demo-13`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-13-fast-facts-countdown.mp4)                  | Numbered facts with one beat per fact                                                   | [`facts-listicle-short`](../../../skills/facts-listicle-short/SKILL.md)                       | `showcase candidate`            |
| [`demo-14`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-14-motion-card-lesson.mp4)                    | Designed cards and timed reveals explain a concept                                      | [`motion-card-lesson-short`](../../../skills/motion-card-lesson-short/SKILL.md)               | `showcase candidate`            |
| [`demo-15`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-15-faceless-mixed-short.mp4)                  | Mixed stock, local-style media, UI cards, diagrams, and captions                        | [`faceless-mixed-short`](../../../skills/faceless-mixed-short/SKILL.md)                       | `showcase candidate`            |
| [`demo-16`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-16-gameplay-confession-split.mp4)             | Story support footage plus gameplay pacing rail                                         | [`gameplay-confession-short`](../../../skills/gameplay-confession-short/SKILL.md)             | `showcase candidate`            |
| [`demo-17`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-17-micro-doc-breakdown.mp4)                   | Archival-style micro-doc with evidence inserts                                          | [`micro-doc-breakdown-short`](../../../skills/micro-doc-breakdown-short/SKILL.md)             | `proving candidate`             |
| [`demo-18`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.mp4) | Low-attention explanation of the repo using Reddit/gameplay packaging                   | [`content-machine-self-demo`](../examples/content-machine-self-demo.md)                       | `supporting showcase candidate` |
| [`demo-19`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-19-content-machine-motion-cards.mp4)          | Low-attention explanation of the repo using motion cards                                | [`content-machine-self-demo`](../examples/content-machine-self-demo.md)                       | `supporting showcase candidate` |
| [`demo-20`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-20-content-machine-3d-runner.mp4)             | 3D/procedural motion can be an additive gameplay background; current clip is `720x1280` | [`procedural-gameplay-backgrounds`](../examples/procedural-gameplay-backgrounds.md)           | `experimental preview`          |

## 3D Is Additive

Procedural 3D and generated gameplay backgrounds are useful when the
short needs motion but the user does not have rights-cleared gameplay.
They do not replace Reddit cards, captions, stock footage, local media,
screen recordings, longform clipping, or publish-prep review.

Use [`procedural-gameplay-backgrounds`](../../../skills/procedural-gameplay-backgrounds/SKILL.md)
as a background layer or gameplay lane after the archetype has already
been chosen.

## Related Indexes

- [`docs/demo`](../../demo/README.md) — preview assets and maturity
  labels.
- [`docs/user/examples`](../examples/README.md) — categorized example
  pages.
- [`docs/user/ARCHETYPES.md`](../ARCHETYPES.md) — lane selection rules
  before scripting or rendering.
