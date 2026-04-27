---
name: publish-prep-review
description: Score the script, validate the rendered video, and produce publish metadata so the agent can decide whether a short is ready to upload.
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

## Core Approach

1. Judge the rendered short, not the intent behind it.
2. Treat validation warnings as editorial signals, not just technical
   noise.
3. Reject source-text collisions, unreadable cadence, freeze, and weak
   pacing even if the MP4 is technically valid.
4. Use the review bundle to decide whether to rework script, audio,
   visuals, or captions.
5. When the bundle fails, route the fix through
   [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
   instead of retrying the same bad plan.

## Inputs

- final `video.mp4`
- source `script.json`
- target platform
- optional validation preferences

## Outputs

- `validate.json`
- `score.json`
- `publish.json`
- optional packaging metadata

## Output Contract

- Writes `validate.json`, `score.json`, and `publish.json` under the
  requested `outputDir`.
- Optionally writes `packaging.json` if packaging generation is enabled.
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

## Optional Runtime Surface

- Repo-side runner:
  `node --import tsx scripts/harness/publish-prep.ts`
- Supporting code:
  `src/harness/publish-prep.ts`,
  `src/validate/*`,
  `src/score/*`

## Validation Checklist

- `validate.json` exists and `passed` is true.
- `score.json` exists and `passed` is true.
- `publish.json` exists and includes a checklist and description.
- The review outcome clearly tells you what to fix next if it fails.
