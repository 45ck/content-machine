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
  status: real local-only split-screen MP4 produced
- `text-thread-reveal`
  final: [text-thread-reveal-local.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render/text-thread-reveal-local.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/report.md)
  status: real local-only MP4 produced
- `stock-b-roll-explainer`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/render-local/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/report.md)
  status: real local-only MP4 produced
- `fast-facts-countdown`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/report.md)
  status: real MP4 produced; publish-prep still fails because the cut is intentionally short and uses mock audio
- `saas-problem-solution`
  final: [video.mp4](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/output/attempt-003-ffmpeg/video.mp4)
  report: [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/saas-problem-solution/report.md)
  status: real local-only MP4 produced

Constraint:

- Reddit split-screen stays the flagship example while these lanes are
  being proven
- proving runs should expose runtime gaps honestly instead of hiding
  them behind manual polish
