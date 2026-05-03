# Quality And Review

The repo should not hand back a short just because an MP4 exists. A
short is ready only when the edit has real motion, audible sound,
readable captions, platform-safe framing, and a review record that says
what passed and what still failed.

## Minimum Ready-To-Review Bar

Every public example should have:

- `1080x1920` portrait output unless the example explicitly documents a
  different target.
- MP4/H.264 video and AAC audio.
- audible voiceover or intentional audio bed, not silence.
- visible motion or meaningful scene changes, not a default static
  fallback.
- captions inside mobile safe zones.
- no source clip with baked-in captions unless the skill intentionally
  uses that as part of the visual design.
- source notes, an asset ledger, or media-index provenance for external,
  generated, and audio assets.
- a contact sheet or manual visual review note for the final MP4.
- publish-prep output or an explicit reason the gate could not run.
- the demo-video audit passes if the MP4 will be linked from
  `docs/demo`.

## Review Order

Use this order because it catches expensive mistakes early:

1. Source media: reject wrong aspect ratio, silent files, baked-in
   captions, watermarks, unusable stock clips, and default fallback
   backgrounds before render.
2. Hook packaging: generate and choose the hook/title/cover promise
   before the script and render inherit a weak angle.
3. Script and timing: check hook, duration, scene count, and whether the
   captions can be chunked into readable phrases.
4. Visual plan: verify each narration beat has a specific visual job.
5. Virality and retention: check hook, clarity, payoff, pacing,
   repetition, platform fit, and mobile skim value before final approval.
6. Render: inspect the actual MP4, not only JSON artifacts.
7. Publish-prep: run platform, cadence, audio, caption, and provenance
   checks.
8. Send-back: fix the first upstream cause instead of patching symptoms
   in the final export.

## Required Gates

| Gate                | What It Catches                                                  | Skills Or Runtime Surface                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source media review | bad footage, silence, baked text, wrong crop, reused junk        | [`source-media-review`](../../skills/source-media-review/SKILL.md), [`source-media-analyze`](../../skills/source-media-analyze/SKILL.md)                                                                                                     |
| Hook packaging      | weak promise, vague title, unreadable cover, unsupported CTA     | [`hook-packaging`](../../skills/hook-packaging/SKILL.md), [`hook-overlay`](../../skills/hook-overlay/SKILL.md), [`platform-packaging`](../../skills/platform-packaging/SKILL.md)                                                             |
| Caption timing      | captions drifting away from voiceover                            | [`token-level-caption-timestamps`](../../skills/token-level-caption-timestamps/SKILL.md), [`timing-sync`](../../skills/timing-sync/SKILL.md), [`short-form-captions`](../../skills/short-form-captions/SKILL.md)                             |
| Caption design      | captions outside frame, too many words, unreadable styling       | [`short-form-captions`](../../skills/short-form-captions/SKILL.md), [`karaoke-ass-captions`](../../skills/karaoke-ass-captions/SKILL.md)                                                                                                     |
| Scene variation     | slideshow risk, repeated cards, weak motion                      | [`scene-variation-check`](../../skills/scene-variation-check/SKILL.md), [`slideshow-risk-review`](../../skills/slideshow-risk-review/SKILL.md)                                                                                               |
| Scene pacing        | visuals not matching narration cues                              | [`scene-pacing-verifier`](../../skills/scene-pacing-verifier/SKILL.md), [`timing-sync`](../../skills/timing-sync/SKILL.md)                                                                                                                   |
| Virality review     | weak hook, unclear promise, missing payoff, platform mismatch    | [`virality-review`](../../skills/virality-review/SKILL.md), [`short-form-archetype-research`](../../skills/short-form-archetype-research/SKILL.md), [`short-form-production-playbook`](../../skills/short-form-production-playbook/SKILL.md) |
| Retention pass      | dead air, slow first frame, visual repetition, caption overload  | [`retention-pass`](../../skills/retention-pass/SKILL.md), [`scene-pacing-verifier`](../../skills/scene-pacing-verifier/SKILL.md), [`slideshow-risk-review`](../../skills/slideshow-risk-review/SKILL.md)                                     |
| Safe vertical crop  | faces, UI, text, or story footage cut off                        | [`reframe-vertical`](../../skills/reframe-vertical/SKILL.md), [`scene-aware-smart-crop`](../../skills/scene-aware-smart-crop/SKILL.md)                                                                                                       |
| Layout safety       | cards, diagrams, captions, and UI layers overlapping             | `@45ck/video-evaluator` `layout-safety-review`; demo sidecars use `docs/demo/*.layout.json`                                                                                                                                                  |
| Platform packaging  | one caption pasted everywhere, bad hashtags, missing disclosures | [`platform-packaging`](../../skills/platform-packaging/SKILL.md), [`publish-prep-review`](../../skills/publish-prep-review/SKILL.md), [`asset-ledger`](../../skills/asset-ledger/SKILL.md)                                                   |
| Publish prep        | platform format, cadence, audio signal, captions, metadata       | [`publish-prep-review`](../../skills/publish-prep-review/SKILL.md), [`scripts/harness/publish-prep.ts`](../../scripts/harness/publish-prep.ts)                                                                                               |
| Provenance          | unknown rights, missing licenses, risky audio, weak AI traces    | [`publish-prep-review`](../../skills/publish-prep-review/SKILL.md), [`media-index`](../../skills/media-index/SKILL.md), asset ledgers                                                                                                        |

## Publish-Prep Command

Run this against a finished render:

```bash
cat <<'JSON' | node --import tsx scripts/harness/publish-prep.ts
{
  "videoPath": "runs/demo-run/render/video.mp4",
  "scriptPath": "runs/demo-run/script/script.json",
  "assetLedgerPath": "runs/demo-run/provenance/asset-ledger.json",
  "mediaIndexPath": "output/content-machine/library/media-index.v1.json",
  "outputDir": "runs/demo-run/publish-prep",
  "platform": "tiktok",
  "validate": {
    "cadence": true,
    "audioSignal": true
  }
}
JSON
```

Add stricter caption/OCR checks when the render has caption sidecars and
the local environment supports OCR. If OCR fails, do not hide it; mark
the lane as a candidate until the drift is fixed.

`generate-short` writes `provenance/asset-ledger.json` automatically and
passes that ledger into publish-prep unless `publishPrep.assetLedgerPath`
points to a custom reviewed ledger. Generated local artifacts can pass
from the automatic ledger; stock footage, user footage, gameplay,
external audio, or reusable library media still need explicit rights
evidence before public readiness passes.

For manually assembled demos or older runs, build the ledger directly:

```bash
cat skills/asset-ledger/examples/request.json | \
  node --import tsx scripts/harness/asset-ledger.ts
```

When `assetLedgerPath` or `mediaIndexPath` is supplied, publish-prep also
writes `provenance.json`. Any provenance error blocks `passed: true`;
warnings stay visible for human review.

Expected publish-prep output is inspectable, not just a console message:
`validate.json`, `score.json`, `publish.json`, optional
`provenance.json`, and a clear ready/not-ready verdict. The user-facing
gate is `publish-prep`; `publish-prep-review` remains an alias in skill
docs where older examples still name the review-focused wrapper.

## Post-Publish Learning

After a short has enough evidence, use
[`metrics-feedback-loop`](../../skills/metrics-feedback-loop/SKILL.md)
to separate meaningful outcomes from vanity metrics and propose
repeat/kill/test-next decisions. Durable lessons should become
reviewable updates to
[`style-profile-library`](../../skills/style-profile-library/SKILL.md)
or [`niche-profile-draft`](../../skills/niche-profile-draft/SKILL.md),
not hidden chat memory.

## Demo Video Audit

Run this before promoting anything into `docs/demo` or the README:

```bash
npm run review:demo-videos
npm run public-demo:check
```

It writes `experiments/video-quality-review-demo/README.md`,
`summary.json`, per-video frame samples, and an aggregate contact sheet.
The public demo check is static: it verifies demo source notes,
provenance entries, review-report paths, maturity labels, and package
intent without rerendering media.
If a promoted MP4 has a matching `docs/demo/*.layout.json` sidecar, the
audit delegates overlap and caption-safe-zone geometry checks to
`@45ck/video-evaluator` instead of using content-machine-only heuristics.
The adapter prefers an installed package and can also use a built sibling
checkout via `VIDEO_EVALUATOR_ROOT=../video-evaluator`; do not commit a
`file:` dependency for this while the package is not available from npm.
Use the evaluator output as shared evidence. Keep the actual promotion
decision in Content Machine because it depends on archetype fit, hook quality,
caption style, pacing, and publish readiness, not only generic video facts.
The default pass is intentionally lightweight (`--maxFrames 8`) so it
can run against the whole demo folder. For a deeper manual review, run:

```bash
node scripts/review/demo-video-audit.mjs \
  --inputDir docs/demo \
  --outputDir experiments/video-quality-review-demo-deep \
  --maxFrames 36
```

Treat these as hard send-backs for public examples: wrong resolution,
missing or near-silent audio, black/white frames, black gutters, white
edge artifacts, long static runs, and sparse caption/text signal that
does not match the intended style.

## Common Send-Backs

| Problem                                  | Send Back To                 | Fix                                                                             |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| background is static or default fallback | visual planning/source media | replace source clip and regenerate the visual plan                              |
| no sound or inaudible narration          | script-to-audio/render       | regenerate audio and verify audio signal before render                          |
| captions leave the frame                 | caption style/render         | reduce words per caption, lower font size, enforce safe zones                   |
| captions drift from speech               | timing/caption export        | use token-level timestamps or regenerate sidecars from real audio               |
| story footage is cropped off             | source media/reframe         | use 9:16 source or scene-aware crop before composition                          |
| black gutters or boxed source media      | source media/reframe         | crop-fill, motion-fill, or replace the clip; do not promote the render          |
| Reddit card looks fake or broken         | overlay asset                | regenerate the card as a first-class visual asset, not HTML pasted into a frame |
| stock clips feel random                  | visual plan                  | require each clip to support the exact narrated beat                            |
| output feels unlike TikTok/Reels         | archetype choice             | use the archetype guide before rendering another generic explainer              |

## Current Example Maturity

- `reddit-post-over-gameplay` is the default golden story showcase; its
  tracked render passes publish-prep, including OCR caption-sync.
- `reddit-story-split-screen` is a workflow lane until a gutter-free demo
  passes the demo-video audit.
- `stock-b-roll-explainer`, `text-thread-reveal`,
  `saas-problem-solution`, `fast-facts-countdown`,
  `motion-card-lesson`, `faceless-mixed-short`, and
  `gameplay-confession-split` are showcase candidates.
- `micro-doc-breakdown` is a proving candidate: base publish-prep
  passes, but OCR caption-sync still fails median/P95 drift.

See [Archetypes](ARCHETYPES.md) for the full lane table.
