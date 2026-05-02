---
name: publish-prep-review
description: Score the script, validate the rendered video, and produce publish metadata so the agent can decide whether a short is ready to upload.
allowedTools:
  - shell
  - read
  - write
entrypoint: node --import tsx scripts/harness/publish-prep-review.ts
inputs:
  - name: videoPath
    description: Path to the final rendered MP4.
    required: true
  - name: scriptPath
    description: Path to the source script.json artifact.
    required: true
  - name: outputDir
    description: Directory that will receive the review bundle.
    required: false
  - name: platform
    description: Target platform such as tiktok, reels, or shorts.
    required: false
  - name: captionExportPath
    description: Optional captions.remotion.json sidecar for rendered caption-sync review.
    required: false
  - name: assetLedgerPath
    description: Optional asset ledger for rights, license, attribution, generated-asset, and audio claim review.
    required: false
  - name: mediaIndexPath
    description: Optional media-index.v1.json with metadata.provenance or metadata.audioSource entries.
    required: false
outputs:
  - name: validate.json
    description: Video validation and gate report.
  - name: score.json
    description: Script and readiness score report.
  - name: publish.json
    description: Publish metadata and checklist.
  - name: provenance.json
    description: Optional rights and asset provenance review when provenance inputs are supplied.
---

# Publish Prep Review

## Use When

- The user asks whether a render is ready to post.
- The agent needs a serious readiness gate before human review.
- Claude Code or Codex needs upload metadata plus validation in one
  bounded step.

## What This Skill Owns

- Final readiness judgment for a short.
- Combining script quality, video validation, and publish metadata in
  one review step.
- Failing bad outputs closed instead of pretending they are publishable.
- Pointing the agent back to the right fix path using
  [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md).
- Applying content-machine policy on top of reusable analyzer evidence
  from `@45ck/video-evaluator` when generic video facts, contact sheets,
  layout safety, or OCR evidence are available.

## Core Approach

1. Judge the rendered short, not the intent behind it.
2. Treat validation warnings as editorial signals, not just technical
   noise.
3. Reject source-text collisions, unreadable cadence, freeze, and weak
   pacing even if the MP4 is technically valid.
4. Reject archetype violations: pure gameplay modes cannot contain
   random stock clips, split-screen lanes cannot preserve accidental
   black gutters, and cards/receipts cannot be cropped beyond
   readability.
5. Use the review bundle to decide whether to rework script, audio,
   visuals, or captions.
6. When the bundle fails, route the fix through
   [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
   instead of retrying the same bad plan.

## Inputs

- final `video.mp4`
- source `script.json`
- target platform
- optional validation preferences
- optional `assetLedgerPath` and `mediaIndexPath` provenance evidence

## Outputs

- `validate.json`
- `score.json`
- `publish.json`
- optional `provenance.json`
- optional packaging metadata

## Output Contract

- Writes `validate.json`, `score.json`, and `publish.json` under the
  requested `outputDir`.
- Optionally writes `packaging.json` if packaging generation is enabled.
- Optionally writes `provenance.json` if `assetLedgerPath` or
  `mediaIndexPath` is supplied. Any provenance error fails the final
  `passed` result.
- Validation can include cadence, visual quality, temporal quality,
  audio signal, freeze detection, flow consistency, and automatic
  rendered-caption sync checks in addition to the base
  format/resolution/duration checks.
- When the render shipped a `captions.remotion.json` sidecar, this step
  should OCR the final MP4 and verify the burned-in caption timing
  against the expected caption export instead of trusting the pre-render
  caption plan.
- If the lane used FFmpeg or any local fallback assembly, generate the
  caption sidecars first with
  `node --import tsx scripts/harness/caption-export.ts` and pass the
  resulting `captionExportPath` into review. Missing sidecars should be
  treated as a lane failure, not waved away.
- This step reviews the final render. It does not retroactively make
  already-captioned source footage acceptable; source-text hygiene
  belongs in the visuals selection step.
- The goal is a trustworthy go/no-go decision, not paperwork.

## Native-Feel Hard Rejects

- Reject `reddit-post-over-gameplay` if any random clip, stock B-roll,
  generated scene, support footage, or top lane appears.
- Reject visible black gutters, boxed intermediates, or default blank
  template backgrounds unless the format explicitly calls for them.
- For public examples, run `npm run review:demo-videos` and inspect the
  aggregate contact sheet before linking the MP4 from `docs/demo` or the
  README.
- Demo review keeps the content-machine output contract but delegates
  `.layout.json` sidecar checks to `@45ck/video-evaluator` when the
  package or a built sibling checkout is available.
- Reject any crop that cuts off the primary face, card text, receipt,
  UI target, gameplay affordance, or other key subject.
- Reject missing, silent, near-silent, or music-only audio when
  narration is expected.
- Reject missing caption sidecars, failed OCR caption sync, unreadable
  captions, or captions outside safe zones.
- Reject if the first `1s` to `3s` does not look native: no visible
  stakes, no hook asset, or only generic gameplay/stock without context.

## Rights And Provenance Gate

- This gate verifies the existing ledger, source notes, media index, or
  provenance files. Do not rerun scouting here; fail with a fix path if
  evidence is missing.
- Runtime review accepts `assetLedgerPath` with `assets[]` or `items[]`,
  plus `mediaIndexPath` whose entries store evidence under
  `metadata.provenance` or `metadata.audioSource`.
- `generate-short` emits `provenance/asset-ledger.json` automatically
  and passes it into publish-prep unless a custom
  `publishPrep.assetLedgerPath` is supplied.
- Public examples need source notes or an asset ledger for every
  external model, texture, clip, image, icon, font, audio track,
  component copy, and AI-generated asset.
- Fail public readiness when rights are unknown, source evidence is
  missing, attribution is required but absent, or the asset is
  editorial-only, non-commercial, no-derivatives, watermarked,
  scraper-only, or likely to trigger a platform claim without proof.
- Fail public readiness when YouTube-origin audio lacks ownership,
  explicit permission, official download/export evidence, or compatible
  license plus permitted access.
- Music, SFX, ambience, and extracted audio need Content ID risk notes
  plus license certificate or permission evidence when the source
  provides it.
- AI-generated media needs provider, model, prompt/reference, job id or
  workflow, settings, and output hash so the render can be audited later.

## Optional Runtime Surface

- Repo-side runner:
  `node --import tsx scripts/harness/publish-prep-review.ts`
- Supporting code:
  `src/harness/publish-prep.ts`,
  `src/validate/*`,
  `src/score/*`

## Validation Checklist

- `validate.json` exists and `passed` is true.
- `score.json` exists and `passed` is true.
- `publish.json` exists and includes a checklist and description.
- The review outcome clearly tells you what to fix next if it fails.
- The rendered video still matches the named archetype selected in the
  plan.
- No black gutters, unrelated media layers, cropped-off cards, or
  cropped-off subjects are visible in the final MP4.
