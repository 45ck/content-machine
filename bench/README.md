# Video Scoring Benchmark Pack

Minimal benchmark protocol for validating the video scoring system with very little data:

- `bench/pro/*.mp4` — 3–5 “PRO reference” videos (burned-in captions, target style)
- `bench/our/*.mp4` — 3–5 “OUR_GEN” videos (your current outputs)
- `bench/stress/` — auto-generated degraded variants (ffmpeg)
- `bench/results/report.json` — benchmark report (gitignored)

## Generate stress variants

```bash
npm run cm -- bench generate
```

## Run benchmark

```bash
npm run cm -- bench run
```

Outputs a JSON report to `bench/results/report.json` and exits non-zero if the benchmark fails.

Useful flags:

- `--caption-fps 2` (default) keeps OCR fast
- `--sync-fps 6` (default) improves sync detection for word-by-word captions

## Update baseline (optional)

Create or update `bench/results/baseline.json` from the latest report:

```bash
npm run cm -- bench baseline
```

## Notes

- `bench/results/baseline.json` is intentionally **not** gitignored; you can commit it if you want to enforce “no regression” checks later.
- Videos (`*.mp4`) are gitignored globally in this repo.
- Some stress tests (e.g. audio desync) require Whisper to be installed: `cm setup whisper --model base`.
