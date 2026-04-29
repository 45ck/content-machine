# News Lane Final Report

## Scope

Owned work stayed inside `experiments/agent-evals/news-lane/**`.

## Isolated Project Result

An isolated Codex-style project was created at `project/` with:

- local package install from a repo-generated tarball
- materialized skill pack at `project/.content-machine/`
- request payloads and run logs stored inside the eval directory

## Topic Chosen

`2026 NFL Draft weekend: how NIL-era money is changing the draft story`

Grounding is documented in `notes/source-packet.md`, using locally captured sources dated within the April 24-25, 2026 news window:

- AP News on NIL-era players taking a pay cut by going pro, published April 24, 2026
- NFL.com trade tracker, updated April 25, 2026
- NFL.com day-3 pick analysis, published April 25, 2026

## Run Outcome

### Setup

- `npm pack` succeeded and produced `artifacts/45ck-content-machine-0.2.2.tgz`.
- First install attempt failed because the tarball's `postinstall` expects `scripts/postinstall.mjs`, but that file was not included in the tarball.
- Install succeeded after retrying with `--ignore-scripts`.
- `install-skill-pack` succeeded and materialized the local pack.

### Diagnostics

`doctor-report` wrote `project/output/content-machine/doctor/doctor.json` and reported:

- missing Whisper model
- missing Whisper binary
- missing `OPENAI_API_KEY`
- missing `PEXELS_API_KEY`
- `ffmpeg` and `ffprobe` available

### Generate-Short Attempt

Request file:

- `project/requests/generate-short-news.json`

Execution artifacts:

- `logs/generate-short.stdout.json`
- `logs/generate-short.stderr.log`

Result:

- failed before stage 1 output creation
- exact blocker: `CONFIG_ERROR`
- exact message: `Required environment variable OPENAI_API_KEY is not set. Add it to your .env file or set it in your environment.`

I intentionally set audio, visuals, and render to mock mode so missing Whisper and Pexels would not hide the first real blocker. Even with those downstream stages mocked, the run could not begin because script generation requires an LLM provider key.

### Publish-Prep Attempt

Execution artifacts:

- `logs/publish-prep.stdout.json`
- `logs/publish-prep.stderr.log`

Result:

- failed with `ENOENT` on `outputs/generate-short-news/script/script.json`
- this is downstream fallout from the blocked `generate-short` run, not an independent publish-prep issue

## Farthest Successful Stage

The farthest successful stage was:

- isolated project setup
- local skill-pack materialization
- environment diagnostics

No content-generation stage completed, and no `script/`, `audio/`, `visuals/`, `render/`, or `publish-prep/` output tree was produced for the news run.

## Primary Blockers

1. `OPENAI_API_KEY` missing
2. Packaged tarball install defect: missing `scripts/postinstall.mjs` during normal install
3. Whisper assets absent, which would matter for non-mock audio/timestamp work after the LLM blocker is cleared
4. `PEXELS_API_KEY` absent, which would matter for non-mock stock-visual retrieval after the LLM blocker is cleared

## Key Files

- `notes/source-packet.md`
- `logs/run-log.md`
- `logs/generate-short.stdout.json`
- `logs/publish-prep.stdout.json`
- `project/.content-machine/README.md`
- `project/output/content-machine/doctor/doctor.json`
