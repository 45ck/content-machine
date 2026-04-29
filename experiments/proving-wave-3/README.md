# Proving Wave 3

Status: `building archetypes one at a time`

This wave is for turning each lane into a visible repo capability:
skill docs, user docs, a real MP4/GIF-style preview, and an honest
review record.

## Results

| Lane                        | Demo MP4                                                                                                   | Status               | Notes                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `reddit-post-over-gameplay` | [`docs/demo/demo-9-reddit-post-over-gameplay.mp4`](../../docs/demo/demo-9-reddit-post-over-gameplay.mp4)   | `golden showcase`    | Correct visual mode; OCR caption-sync gate still needs active-word handling.                                         |
| `stock-b-roll-explainer`    | [`docs/demo/demo-10-stock-broll-explainer.mp4`](../../docs/demo/demo-10-stock-broll-explainer.mp4)         | `showcase candidate` | Non-OCR validation passes; needs stable OCR caption-sync on final flashed render.                                    |
| `text-thread-reveal`        | [`docs/demo/demo-11-text-thread-reveal.mp4`](../../docs/demo/demo-11-text-thread-reveal.mp4)               | `showcase candidate` | Visual lane works; direct cadence passes; full publish-prep unstable locally.                                        |
| `saas-problem-solution`     | [`docs/demo/demo-12-saas-problem-solution.mp4`](../../docs/demo/demo-12-saas-problem-solution.mp4)         | `showcase candidate` | Product-card lane works; needs more native UGC/demo motion before it is strong.                                      |
| `fast-facts-countdown`      | [`docs/demo/demo-13-fast-facts-countdown.mp4`](../../docs/demo/demo-13-fast-facts-countdown.mp4)           | `showcase candidate` | Portrait publish-prep passes; card layout works; needs caption sidecar/OCR integration for full sync gate.           |
| `motion-card-lesson`        | [`docs/demo/demo-14-motion-card-lesson.mp4`](../../docs/demo/demo-14-motion-card-lesson.mp4)               | `showcase candidate` | Rebuilt with a frame-driven SVG motion system, motion brief, caption-safe holds, and repo video audit pass.          |
| `faceless-mixed-short`      | [`docs/demo/demo-15-faceless-mixed-short.mp4`](../../docs/demo/demo-15-faceless-mixed-short.mp4)           | `showcase candidate` | Portrait publish-prep passes; includes mixed visual modes, captions, and low music bed.                              |
| `gameplay-confession-split` | [`docs/demo/demo-16-gameplay-confession-split.mp4`](../../docs/demo/demo-16-gameplay-confession-split.mp4) | `showcase candidate` | Strong native split-screen story lane; non-OCR gates pass; OCR caption-sync still needs cleanup.                     |
| `micro-doc-breakdown`       | [`docs/demo/demo-17-micro-doc-breakdown.mp4`](../../docs/demo/demo-17-micro-doc-breakdown.mp4)             | `proving candidate`  | Base publish-prep passes; OCR caption-sync still fails median/P95 drift; evidence cards need stronger design polish. |

## Next Lanes

1. `ugc-avatar-short`
2. `animation-explainer`
3. `myth-vs-fact-debunk`

Keep `reddit-story-split-screen` as the tracked hybrid showcase, but
keep `reddit-post-over-gameplay` as the default generic Reddit mode.
