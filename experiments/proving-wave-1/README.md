# Proving Wave 1

First proving wave after the archetype rollout plan in
[docs/direction/08-archetype-rollout-20260427.md](../../docs/direction/08-archetype-rollout-20260427.md).

Lanes in this wave:

- `gameplay-confession-split/`
- `text-thread-reveal/`
- `stock-b-roll-explainer/`
- `fast-facts-countdown/`
- `saas-problem-solution/`

Goal:

- one lane folder per archetype
- one concrete proving report per lane
- one real final MP4 per lane when the runtime path allows it

Current lane results:

- `gameplay-confession-split`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/report.md)
  status: real split-screen MP4 produced; current review still fails on cadence and large caption drift
- `text-thread-reveal`
  final: [text-thread-reveal.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render/text-thread-reveal.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/report.md)
  status: promoted to the stronger render-backed MP4; remaining review failures are cadence and caption sync
- `stock-b-roll-explainer`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/render/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/report.md)
  status: promoted to the stronger render-backed MP4; remaining review failures are cadence, freeze, and caption-sync outliers
- `fast-facts-countdown`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/report.md)
  status: real MP4 produced; review still fails because the proving cut is intentionally short and the audio track is effectively silent
- `saas-problem-solution`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-002-manual/render/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/report.md)
  status: promoted to the stronger manual-render MP4; caption sync now passes and the remaining failures are cadence/freeze only

Constraint:

- Reddit split-screen stays the flagship example while these lanes are
  being proven
- proving runs should expose runtime gaps honestly instead of hiding
  them behind manual polish

Current review bundles live under:

- [review-bundles/](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/review-bundles)

The promoted review folder uses the best current MP4 per lane, not
necessarily the first fallback file that was rendered:

- [review/](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/review)
