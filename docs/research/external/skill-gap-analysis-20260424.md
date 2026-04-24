# Skill Gap Analysis 20260424

## Objective

Compare the local `skills/` and `flows/` system against the vendored and externally researched short-form video repositories, then identify where our skills match, where they only partially match, and why.

This uses source evidence from local skill manifests plus external repo notes. Where a point is inferred from patterns rather than directly implemented behavior, it is labeled as inference.

## Sources Checked

Local evidence:

- `skills/README.md` and `flows/README.md`
- `flows/generate-short.md`
- `src/harness/skill-manifest.ts`
- `src/harness/skill-catalog.ts`
- `skills/generate-short/SKILL.md`
- `skills/video-render/SKILL.md`
- `skills/timestamps-to-visuals/SKILL.md`
- `skills/short-form-captions/SKILL.md`
- `skills/karaoke-ass-captions/SKILL.md`
- `skills/longform-to-shorts/SKILL.md`
- `skills/reframe-vertical/SKILL.md`
- `skills/scene-aware-smart-crop/SKILL.md`
- `skills/niche-profile-draft/SKILL.md`
- `skills/reverse-engineer-winner/SKILL.md`
- `skills/publish-prep-review/SKILL.md`
- `skills/doctor-report/SKILL.md`

External evidence:

- `short-video-maker-gyori`
- `vidosy`
- `MoneyPrinterTurbo`
- `ShortGPT`
- `remotion-dev-skills`
- `video-editing-skill`
- `claude-code-video-toolkit`
- `youtube-shorts-pipeline`
- `video-podcast-maker`
- `yt-short-clipper`
- `clipforge`
- `ViriaRevive`
- `remotion-template-tiktok`
- `whisperX`
- `prompt-language`

## Match Matrix

| Capability                  | Local match                                                                                                                       | External reference                                                                | Gap                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| End-to-end short generation | Strong. `generate-short` orchestrates script, audio, visuals, render, and publish prep.                                           | `youtube-shorts-pipeline`, `claude-code-video-toolkit`, `short-video-maker-gyori` | Runtime exists, but skill manifest metadata lagged behind harness execution before this analysis.              |
| Stage-level harnesses       | Strong for `brief-to-script`, `script-to-audio`, `timestamps-to-visuals`, `video-render`, `publish-prep-review`, `doctor-report`. | `vidosy`, `video-editing-skill`                                                   | Some adjacent craft skills are not executable and do not clearly declare whether that is intentional.          |
| Captions                    | Strong and improving. Caption presets, timing logic, SRT/ASS/Remotion export, and quality scoring now exist in runtime.           | `clipforge`, `remotion-template-tiktok`, `video-editing-skill`                    | Skill docs need to stay aligned with sidecar exports and quality gates.                                        |
| Visual quality              | Partial. Metadata preflight exists for fallback rate, coverage, confidence, static image motion, and orientation.                 | `ViriaRevive`, `video-editing-skill`, `yt-short-clipper`                          | No frame-level subject/caption overlap gate, no face/cursor crop validation, and no visual salience check yet. |
| Longform-to-shorts          | Conceptual match. Skills describe moment selection, boundary snapping, reframing, and captions.                                   | `yt-short-clipper`, `video-editing-skill`, `ViriaRevive`                          | No executable highlight finder, silence/filler detector, moment scoring harness, or transcript review loop.    |
| Portrait reframing          | Conceptual match. `reframe-vertical` and `scene-aware-smart-crop` capture the right decision rules.                               | `yt-short-clipper`, `ViriaRevive`, `video-editing-skill`                          | No runtime crop planner, face/speaker/cursor detector contract, or preview artifact.                           |
| Reverse-engineering winners | Good match. `reverse-engineer-winner` has a harness and produces blueprint/theme artifacts.                                       | `video-podcast-maker`, `claude-code-video-toolkit`                                | No persistent style-reference library that feeds later runs automatically.                                     |
| Niche/style profiles        | Partial. `niche-profile-draft` captures the upstream artifact shape.                                                              | `youtube-shorts-pipeline`, `video-podcast-maker`                                  | No stored profile schema, preference library, or design-learning feedback loop.                                |
| Media library and caching   | Partial. Skills exist for asset fingerprinting, generated asset versioning, and retry cache.                                      | `video-editing-skill`                                                             | No runtime media index with searchable local assets, provenance, fingerprint, and reuse policy.                |
| Progress reporting          | Partial. Harnesses return JSON envelopes.                                                                                         | `claude-code-video-toolkit`, `video-editing-skill`                                | No uniform `ProgressEvent` contract or long-running JSONL progress stream policy.                              |
| Doctor diagnostics          | Good baseline. `doctor-report` exposes JSON diagnostics.                                                                          | `video-editing-skill`, `claude-code-video-toolkit`                                | Less deep on GPU, Whisper, ffmpeg capability advice, Windows/WSL edge cases, and install remediation.          |
| Publish preparation         | Good for review metadata and pass/fail gating.                                                                                    | `yt-short-clipper`, `youtube-shorts-pipeline`                                     | Upload automation and richer platform packaging are intentionally outside the current MVP.                     |

## What Matches Well

The local system is aligned with the main architecture direction from the stronger repos: independent stage boundaries, JSON artifacts, Remotion rendering, caption-first short-form output, and agent-callable harnesses.

The best local matches are:

- `generate-short` as the default full pipeline.
- `brief-to-script`, `script-to-audio`, `timestamps-to-visuals`, and `video-render` as composable stage runners.
- `reverse-engineer-winner` for reference short ingestion.
- `publish-prep-review` and `doctor-report` as deterministic closing and setup checks.
- `short-form-captions` as the local caption design authority.

## Gaps That Matter Next

### 1. Runtime Metadata Drift

Evidence: `src/harness/skill-catalog.ts` exposes `entrypoint`, `argumentHint`, `inputs`, and `outputs`, but several important skills originally had only prose despite having harnesses and examples.

Why it matters: external skill systems such as OpenClaw-style video skills make runtime requirements explicit. Agents can call the right runner without rereading prose.

Opportunity: keep every executable skill manifest complete. `generate-short`, `video-render`, and `timestamps-to-visuals` should declare all key quality sidecars.

### 2. Longform Moment Selection Is Still Playbook-Only

Evidence: `longform-to-shorts`, `reframe-vertical`, and `scene-aware-smart-crop` contain strong rules, but no harness comparable to highlight scoring in `yt-short-clipper`, audio/scene scoring in `ViriaRevive`, or transcript tooling in `video-editing-skill`.

Why it matters: high-quality short-form work often starts from selecting the right moment, not just polishing captions and render style.

Opportunity: add a `longform-highlight-select` harness that outputs candidate clips with transcript spans, silence/filler signals, scene boundaries, hook/payoff score, and approval status.

### 3. Visual Quality Is Metadata-Only

Evidence: current visual quality preflight can flag weak metadata and structural risks. External systems add scene detection, face/screen tracking, RMS/variance/moment scoring, and crop intelligence.

Why it matters: a video can pass metadata checks while the subject is obscured, captions cover the key UI, or the crop misses the speaker.

Opportunity: add a frame-level visual review artifact that samples frames, estimates subject/caption overlap, detects persistent source text, and reports portrait crop confidence.

### 4. Style Memory Is Not Persistent Enough

Evidence: `niche-profile-draft` and `reverse-engineer-winner` produce useful artifacts, but `video-podcast-maker` and `youtube-shorts-pipeline` show stronger profile/preference reuse.

Why it matters: repeatable quality depends on reusing learned style constraints, not rediscovering them per run.

Opportunity: define a `style-profile.v1.json` contract and a local profile library that links niche rules, reference winners, caption presets, visual language, and packaging patterns.

### 5. Progress Reporting Is Not a First-Class Contract

Evidence: harnesses return final JSON envelopes. `claude-code-video-toolkit` requires progress JSON for long-running tools and discourages blind background runs.

Why it matters: video generation can stall on TTS, ASR, asset downloads, Remotion bundling, and render. Agents need machine-readable progress and resumable status.

Opportunity: add `ProgressEvent` JSONL output for long-running harnesses, with event names for stage start, artifact write, warning, retry, and completion.

### 6. Media Library And Provenance Are Underdeveloped

Evidence: local cache/versioning skills exist, but `video-editing-skill` has a richer media library concept with tools around search, transcription, split, render, and subtitle burn.

Why it matters: quality improves when local assets can be reused intentionally with provenance and fingerprinting instead of rediscovered each run.

Opportunity: implement a media index with asset id, fingerprint, origin, license/provider, transcript, dimensions, duration, tags, and last-used metadata.

## Intentional Non-Gaps

- Upload automation is not urgent for the CLI-first MVP. `publish-prep-review` should produce metadata and checks before direct platform upload is added.
- Many craft-only skills should remain craft-only if they encode judgement rather than runnable code. The gap is not that every skill needs an entrypoint; the gap is when an executable skill lacks executable metadata.
- External monolithic scripts are useful references, but this repo should keep the modular JSON-artifact pipeline instead of copying one large runner.

## Recommended Next Work

1. Keep the skill manifest surface accurate for executable skills.
2. Update caption and visual skill docs whenever runtime sidecars change.
3. Add a progress JSONL contract before more long-running generation stages are added.
4. Build `longform-highlight-select` before investing deeper in smart crop.
5. Add a persistent `style-profile.v1.json` library so reference analysis and niche profiles compound over time.
6. Extend visual quality from metadata preflight into sampled-frame review.

## Bottom Line

The local skills match the short-form video objective at the pipeline and craft-guidance level. The main mismatch is maturity: external repos have more operational depth around progress reporting, media libraries, longform highlight selection, visual/crop analysis, and persistent style learning. The current implementation direction is right, but the next quality gains should come from making those contracts executable rather than adding more prose-only skills.
