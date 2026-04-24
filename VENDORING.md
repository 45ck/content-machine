# Reference Repo Policy

Content Machine uses external repositories as references for local
implementation decisions, but the current `master` branch does not ship
a top-level `vendor/` directory.

## Current Source Of Truth

Reference findings are kept in docs, not in committed vendor trees:

- `docs/research/` — original short-form and video-generation research
- `docs/research/external/` — imported bundles and current synthesis
- `docs/research/external/short-form-vendor-synthesis-20260424.md` —
  current short-form implementation synthesis
- `docs/research/external/repo-deep-dive-implementation-priorities-20260424.md`
  — repo-pattern implementation priorities
- `docs/research/external/skill-gap-analysis-20260424.md` — local skill
  coverage versus reference repos

Local developer machines may also have research clones outside this repo,
for example:

- `C:\Projects\content-machine-research\repos`
- `C:\Projects\content-machine\vendor`

Those paths are useful for investigation, but they are not part of the
committed `master` tree.

## Most Useful Reference Families

| Family                | References                                                                        | Use                                                                                |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| End-to-end generators | `short-video-maker-gyori`, `vidosy`, `MoneyPrinterTurbo`, `ShortGPT`, `clipforge` | Artifact contracts, resumable stages, provider fallbacks, data-first render props. |
| Longform clipping     | `yt-short-clipper`, `ViriaRevive`, `video-editing-skill`, `whisperX`, `FunClip`   | Highlight discovery, approval, source signals, boundary snap, ASR alignment.       |
| Render and captions   | `remotion-template-tiktok`, `remotion-dev-skills`, `captacity`, `clipforge`       | Pixel-fit captions, sidecar exports, render knobs, still-frame checks.             |
| Style memory          | `youtube-shorts-pipeline`, `video-podcast-maker`                                  | Niche profiles, style profiles, packaging defaults, reusable reference memory.     |

## Adding A Committed Vendor

Do this only when the repo needs a pinned source tree for reproducible
local development. Prefer docs-only research notes unless source code
must be available offline inside this checkout.

```bash
git submodule add https://github.com/owner/repo.git vendor/repo-name
git config -f .gitmodules submodule.vendor/repo-name.shallow true
git add .gitmodules vendor/repo-name
git commit -m "vendor: add repo-name"
```

If a committed vendor is added, update this file with:

- owner/repo and pinned commit
- license
- reason it must be committed rather than referenced in docs
- what parts are allowed to influence local implementation

## Updating Reference Research

When researching external repos:

1. Read the upstream README and license first.
2. Inspect concrete files, not only marketing copy.
3. Record findings in a dated doc under `docs/research/external/`.
4. Convert useful findings into local runtime contracts or roadmap
   items.
5. Do not copy large upstream code blocks into this repo.

## Current Patches

None.
