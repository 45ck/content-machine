# Showcase Video Lab

Archived experiment. This is no longer part of the main skill-pack
surface.

This experiment makes actual vertical short videos from local repo
render paths with no browser dependency.

Why it exists:

- prove we can ship real motion output even when Remotion is not the
  fastest path in the current environment
- explore punchier product-story formats than the current examples
- force every concept through a review pass instead of stopping at a
  rendered file
- keep showcase outputs caption-clean by default instead of remixing
  already-finished demo shorts back into the pipeline

Source rule:

- already-published or already-captioned shorts are reference material,
  not raw footage
- this lab now builds procedural motion backgrounds by default
- if someone adds a direct clip source later, the lab audits it for
  persistent burned-in text before render

## Concepts

- `latency-is-a-feeling`
  Product-speed short. Turns response time into an emotional narrative.
- `small-loops-win`
  Product manifesto short. Sells tight creation loops over tool sprawl.
- `escape-velocity-storytelling`
  Creative-direction short. Focus and repetition versus feature gravity.

## Run

```bash
npx tsx archive/experiments/showcase-video-lab/make.ts
```

Outputs are written to `archive/experiments/showcase-video-lab/results/`:

- `<slug>/video.mp4`
- `<slug>/script.json`
- `<slug>/publish-prep/`

`results/` is gitignored. The tracked surface here is the experiment
code and concept definitions, not the rendered binaries.
