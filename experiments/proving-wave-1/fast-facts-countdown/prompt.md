# Lane Intent

Prove that `content-machine` can produce a reviewable short-form countdown
artifact from an isolated experiment folder without editing repo runtime
code or relying on external stock providers.

Constraints for this lane:

- use only files under `experiments/proving-wave-1/fast-facts-countdown`
  for authored inputs and outputs
- prefer repo-local harness scripts
- avoid hidden assumptions about API keys, stock providers, or external
  media libraries
- if a real MP4 render is blocked, capture the exact failing stage and the
  exact output paths that were or were not produced
