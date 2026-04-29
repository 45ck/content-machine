# Proving Wave 2

Status: `real videos produced; one lane is the current native-feel example`

This wave used five parallel lane workers to generate stronger archetype
examples from the repo's skill surfaces and lane-local assets.

## Review Folder

Open the consolidated review folder:

- [review/](review)

Current files:

- `01-gameplay-confession-passed.mp4` (symlink to the current
  `gameplay-confession-split` final MP4)
- `02-stock-broll-close-failed-cadence.mp4`
- `03-reddit-story-failed-caption-sync.mp4`
- `04-text-thread-failed-review.mp4`
- `05-saas-card-failed-review.mp4`

## Results

| Lane                        | Canonical MP4                                                     | Review status | Main result                                                                    |
| --------------------------- | ----------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `gameplay-confession-split` | [video.mp4](gameplay-confession-split/output/final/video.mp4)     | `example`     | `41.3s`, full-bleed native split, strong opener hook, audio present            |
| `stock-b-roll-explainer`    | [video.mp4](stock-b-roll-explainer/outputs/final/video.mp4)       | `failed`      | Close miss: caption sync passed, but cadence was `3.20s` against a `3.0s` gate |
| `reddit-story`              | [video.mp4](reddit-story/outputs/final/video.mp4)                 | `failed`      | Cadence and audio passed; caption sync still failed                            |
| `text-thread-reveal`        | [video.mp4](text-thread-reveal/output/render/video.mp4)           | `failed`      | Real split-screen render, but cadence and caption sync failed                  |
| `saas-problem-solution`     | [video.mp4](saas-problem-solution/output/run-001/final/video.mp4) | `failed`      | Real card-based product promo, but cadence and caption sync failed             |

## Notes

- The strongest non-Reddit result in this wave is now
  `gameplay-confession-split`, using the `native-full-bleed-split`
  variant.
- The earlier technically valid version preserved black gutters from
  source clips. The current example rebuilds the lane with
  `gameplay-confession-split/tools/build-native-assembly.sh` so both
  halves feel full-bleed.
- `stock-b-roll-explainer` is the closest faceless-information lane; it
  needs slightly faster visual turnover to pass.
- `reddit-story` remains visually important, but this wave did not solve
  its caption-sync drift.
- `text-thread-reveal` needs shorter message beats and a better native
  message render system.
- `saas-problem-solution` needs more real proof/demo motion instead of
  long card holds.
