# Proving Wave 1 Review Summary

Review method:

- internal `publish-prep` / `publish-prep-review`
- caption sidecars exported with
  `node --import tsx scripts/harness/caption-export.ts` where fallback
  lanes were missing them
- validation profile: `portrait`
- enabled gates:
  `cadence`, `temporal`, `audio-signal`, `freeze`,
  `flow-consistency`, `caption-sync`
- `visual-quality` left off for this pass because the optional BRISQUE
  backend is not provisioned cleanly in this shell

Best current candidates by lane:

- `gameplay-confession-split`
  canonical file:
  [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/video.mp4)
  current blockers:
  `caption-sync`
- `text-thread-reveal`
  promoted file:
  [text-thread-reveal.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render/text-thread-reveal.mp4)
  current blockers:
  `cadence`, `caption-sync`
- `stock-b-roll-explainer`
  promoted file:
  [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/render/video.mp4)
  current blockers:
  `cadence`, `freeze`, `caption-sync`
- `fast-facts-countdown`
  canonical file:
  [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/video.mp4)
  current blockers:
  `duration`, `audio-signal`, `caption-sync`
- `saas-problem-solution`
  promoted file:
  [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/render/video.mp4)
  current blockers:
  `cadence`, `freeze`

Lane-level findings:

1. `gameplay-confession-split`
   The lane is structurally correct, but the top story-support changes
   are too subtle for the cadence detector. Caption OCR finds the words,
   but the rendered timing drifts badly enough that review still fails.

2. `text-thread-reveal`
   The promoted render is materially better than the old local fallback.
   Caption matching is now complete, but the chat lane still holds too
   long on effectively static frames and the caption timing is still too
   loose.

3. `stock-b-roll-explainer`
   Promoting the render-backed MP4 fixed the missing-caption problem.
   The remaining problem is still static-feeling visual pacing, plus one
   caption-sync tail problem that pushes the P95 drift too high.

4. `fast-facts-countdown`
   This is not a “bad analyzer” failure. The file is genuinely too short
   for the portrait review profile and the shipped audio is effectively
   silent. This lane needs a real voiced proving run before it counts as
   proven.

5. `saas-problem-solution`
   The promoted manual render is the strongest non-flagship lane in this
   wave. Caption sync passes there. The remaining issues are visual:
   cadence is too slow and the proof/demo beats still sit too still.

What changed in the repo because of this review:

- added first-class fallback caption export via
  [src/harness/caption-export.ts](/home/calvin/Documents/GitHub/content-machine/src/harness/caption-export.ts)
- wired `caption-export` into the packaged runner
- updated the archetype skills so fallback lanes are not considered
  proven unless they export caption sidecars and pass review on the
  actual final MP4
- updated the wave README to point at the strongest current candidate
  MP4 per lane instead of weaker fallback picks

Deeper root-cause read:

1. `gameplay-confession-split`
   The lane is not visually static in concept, but the fallback
   split-screen assembly is showing larger paragraph-like caption blocks
   than the exported caption pages expect. The sync checker finds all
   segments, but timing lands far too early or late because the
   on-screen text behaves like long held story cards rather than tight
   short-form pages.
   After the adaptive cadence-threshold fix, this lane no longer fails
   cadence review. The remaining problem is specifically fallback
   caption timing/display behavior.

2. `text-thread-reveal`
   The visual plan is built from five SVG chat screens and each scene in
   `visuals.json` still reports `motionApplied: false`. That means the
   lane reads like a screenshot slideshow even in the stronger promoted
   render. The caption matcher now finds every expected segment, so the
   remaining problem is mostly weak OCR on static chat images plus long
   scene holds.

3. `stock-b-roll-explainer`
   The “better” promoted render is still coming from a plan where every
   scene sets `motionStrategy: "none"` and `motionApplied: false`.
   Temporal and freeze failures are therefore honest. The caption-sync
   failure is no longer total; it is mostly one tail cluster where
   several pages bunch together and push the P95 drift over the line.

4. `fast-facts-countdown`
   This lane is not ready for polish work because it is still a proving
   stub. The real blocker is that the file is only about eight seconds
   long and the audio track is effectively silent. Caption drift is a
   secondary issue here, not the main reason it fails.

5. `saas-problem-solution`
   This is the strongest non-flagship lane because the manual render
   already passes caption sync. The remaining failures are visual:
   every scene in the chosen `visuals.json` still reports
   `motionStrategy: "none"` and `motionApplied: false`, so the proof
   beats are too still even though the script and captions are now close
   enough.

Cross-lane conclusion:

- `motionApplied: false` is the repeated smell across the weakest lanes.
- Static image lanes are the worst offenders, but “video” lanes that are
  effectively abstract looping backgrounds fail for the same reason.
- The old FFmpeg cadence threshold was also too insensitive for some
  split or low-contrast edits. After lowering it adaptively, that
  detector bug is no longer masking the true result on
  `gameplay-confession-split`.
- Caption sync failures split into two categories:
  real timing drift from fallback composition (`gameplay`, parts of
  `stock`) and OCR weakness on static/chat-heavy lanes (`text-thread`,
  `saas` confidence noise).
- The next real quality jump will come from better motion/staging in the
  visual plans, not from endlessly tweaking the caption scorer.

Recommended next iteration order:

1. `saas-problem-solution`
2. `text-thread-reveal`
3. `gameplay-confession-split`
4. `stock-b-roll-explainer`
5. `fast-facts-countdown`
