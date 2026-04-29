# News Lane Run Log

## 2026-04-26

- Initialized isolated eval workspace under `codex-project/`.
- Materialized the local skill pack into `codex-project/.content-machine/` using the repo's `install-skill-pack` tool.
- Selected topic from dated source notes in `sources/2026-04-24-to-26-topic-notes.md`:
  `Why oil keeps swinging even as tech stocks hit records: Intel's surge and the U.S.-Iran talks wobble`.
- Attempted full `generate-short` with `artifacts/generate-short-request.json`.
  Result: failed immediately with `CONFIG_ERROR` because `OPENAI_API_KEY` was not set.
  Evidence: `artifacts/generate-short-response.json`.
- Wrote a manual fallback script at `artifacts/manual-pipeline/script/script.json` so the downstream harness stages could still be exercised.
- Ran `script-to-audio` in mock mode.
  Result: success, `35.7s`, `119` words.
  Evidence: `logs/script-to-audio.stdout.json`.
- Ran `timestamps-to-visuals` in mock mode.
  Result: success, `6` fallback-color scenes, visual quality preflight `passed=false`, score `0.7`.
  Evidence: `logs/timestamps-to-visuals.stdout.json`.
- Ran `video-render` with `mock=true` and `mockRenderMode=real`.
  Result: success, real MP4 written at `artifacts/manual-pipeline/render/video.mp4`, `1080x1920`, `35.7s`, captions exported.
  Note: Remotion downloaded Chrome Headless Shell during the run, so the stdout capture includes progress lines before the final JSON envelope.
- Ran `publish-prep`.
  Result: success, top-level `passed=true`.
  Evidence: `logs/manual-publish-prep.stdout.json`.
- Publish-prep details:
  `validate.json` passed resolution, duration, and format; cadence was a warning only.
  `score.json` passed with overall `0.9708`.
