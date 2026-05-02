# Experiments

This directory holds tracked proving reports, prompts, eval notes, and
small reference artifacts for Content Machine lanes.

## Policy

- Track source prompts, request files, summaries, review notes, and
  compact evidence that explains a decision.
- Do not track generated run outputs, downloaded media, local
  `node_modules/`, large videos, frame dumps, or temporary review
  bundles.
- Promote polished public examples to `docs/demo/` only after the
  quality and demo-video review gates pass.
- Move old or non-public rendered outputs to Releases, external
  storage, or local ignored paths instead of committing them here.

The public user path should not require reading this directory. Use
`docs/user/EXAMPLES.md` for user-facing examples and this directory for
honest maturity/proving evidence.
