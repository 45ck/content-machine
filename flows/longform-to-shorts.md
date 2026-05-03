# Longform To Shorts Flow

## Purpose

Turn a longform transcript and optional source media file into a
reviewable short-form clip plan before any expensive clipping,
reframing, or rendering happens.

Use it when the source already contains the content and the immediate
job is to find the strongest moments, not write a net-new faceless
script.

## Inputs

- `timestampsPath` — required word-level timestamps from ASR or an
  existing transcript artifact.
- `sourceMediaPath` — optional local source video or audio path.
- `approvedCandidateIds` — optional explicit approval list after human
  or agent review.
- `autoApproveSelected` — optional shortcut for smoke tests; keep false
  when user review is required.
- duration and count controls such as `minDuration`, `targetDuration`,
  `maxDuration`, and `maxCandidates`.

## Primary Skill

- `longform-to-shorts`

## Stage Skills Used Internally

1. `source-media-analyze` when `sourceMediaPath` is present and source
   analysis is not already supplied
2. `longform-highlight-select`
3. `boundary-snap` by default
4. `highlight-approval` only when explicit approval inputs or
   `autoApproveSelected` are provided

## Current Status

Executable for selection, boundary cleanup, optional approval, and
render handoff. Use `longform-clip-extract` after approval to cut the
source clip and write clip-local `audioPath`, `timestampsPath`, and
`visualsPath` artifacts. The flow still does not call `video-render`
directly because crop/reframe review may be needed between extraction
and render.

## Suggested Claude Code / Codex Path

1. Run once without `approvedCandidateIds`.
2. Read `highlights/highlight-candidates.v1.json` and
   `handoff/render-handoff.v1.json`.
3. Ask the user which candidate to approve, or approve only when the
   brief already authorizes automatic selection.
4. Rerun with `approvedCandidateIds` to write
   `highlights/highlight-approval.v1.json`.
5. Run `longform-clip-extract` to cut the approved source range and
   create clip-local render inputs.
6. Reframe if needed, then call `video-render` and
   `publish-prep-review`.

## Example Request

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "longform-to-shorts",
  "runId": "podcast-clips-1",
  "input": {
    "timestampsPath": "input/podcast/timestamps.json",
    "sourceMediaPath": "input/podcast/source.mp4",
    "targetDuration": 35,
    "maxDuration": 60,
    "maxCandidates": 3
  }
}
JSON
```

To approve a candidate after review:

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "longform-to-shorts",
  "runId": "podcast-clips-1-approved",
  "input": {
    "timestampsPath": "input/podcast/timestamps.json",
    "sourceMediaPath": "input/podcast/source.mp4",
    "approvedCandidateIds": ["highlight-001"],
    "notesByCandidateId": {
      "highlight-001": "Strong standalone hook and clear payoff."
    }
  }
}
JSON
```

## Outputs

Expected run root:
`runs/<run-id>/longform-to-shorts/`.

Key artifacts:

- `highlights/source-media-analysis.v1.json` when source media is
  analyzed
- `highlights/highlight-candidates.v1.json`
- `highlights/boundary-snap.v1.json`
- `highlights/highlight-approval.v1.json` when approvals are provided
- `handoff/render-handoff.v1.json`

## Completion Gates

- Candidate output exists and has at least one viable candidate, or
  warnings explain why none were selected.
- Boundary snap output exists unless `snapBoundaries` is false.
- First-pass handoff can be `needs-approval`; before extraction or
  render work starts, rerun with approval so
  `highlight-approval.v1.json` exists.
- Render handoff explicitly names missing clip, reframe, audio,
  timestamp, visuals, render, and publish-prep steps.

## Failure And Retry Notes

- If `sourceMediaPath` cannot be probed, rerun with a valid local file
  or skip source analysis and keep the limitation visible.
- If no candidate clears duration or word-count limits, loosen duration
  controls or improve the transcript before rendering anything.
- If the user rejects all candidates, rerun selection with different
  duration bounds rather than polishing weak clips with captions.
- Do not treat this flow as final MP4 generation; after approval, run
  `longform-clip-extract`, then reframe/render/review.
