# Split-Screen Gameplay + Pexels (Render Template)

This produces the same style as `output/demo-subway-pexels/video.mp4`: gameplay on one half,
Pexels B-roll on the other, word-highlighted captions, muted gameplay audio.

Prereqs:

- `.env` has `OPENAI_API_KEY` (keyword extraction) and `PEXELS_API_KEY` (stock footage).
- Gameplay clips live in `~/.cm/assets/gameplay/<style>/` (or pass `--gameplay <path>`).

```bash
# 1) Prepare gameplay clips
mkdir -p ~/.cm/assets/gameplay/subway-surfers
cp /path/to/subway.mp4 ~/.cm/assets/gameplay/subway-surfers/

# 2) Generate script
cat <<'JSON' | npx tsx scripts/harness/brief-to-script.ts
{
  "topic": "Redis vs PostgreSQL for caching",
  "archetype": "versus",
  "outputPath": "output/script.json"
}
JSON

# 3) Generate audio + timestamps
cat <<'JSON' | npx tsx scripts/harness/script-to-audio.ts
{
  "scriptPath": "output/script.json",
  "audioOutputPath": "output/audio.wav",
  "timestampsOutputPath": "output/timestamps.json",
  "voice": "af_heart"
}
JSON

# 4) Match Pexels visuals + gameplay
cat <<'JSON' | npx tsx scripts/harness/timestamps-to-visuals.ts
{
  "timestampsPath": "output/timestamps.json",
  "provider": "pexels",
  "orientation": "portrait",
  "gameplayStyle": "subway-surfers",
  "outputPath": "output/demo-subway-pexels/visuals.json"
}
JSON

# 5) Render split-screen (gameplay on top, Pexels on bottom)
cat <<'JSON' | npx tsx scripts/harness/video-render.ts
{
  "visualsPath": "output/demo-subway-pexels/visuals.json",
  "timestampsPath": "output/timestamps.json",
  "audioPath": "output/audio.wav",
  "outputPath": "output/demo-subway-pexels/video.mp4",
  "template": "brainrot-split-gameplay-top",
  "downloadAssets": true
}
JSON
```

Layout options:

- Swap positions: `--split-layout gameplay-bottom`
- Force full-screen: `--gameplay-position full` or `--content-position full`

Troubleshooting:

- If Remotion fails to decode a gameplay clip, transcode to H.264 baseline:

```bash
ffmpeg -y -i input.mp4 -vf "scale=1080:-2" -c:v libx264 -profile:v baseline -level 3.1 \
  -pix_fmt yuv420p -preset veryfast -crf 23 -an -movflags +faststart output.mp4
```

See also:

- [`docs/reference/cm-import-reference-20260110.md`](../../reference/cm-import-reference-20260110.md)
- [`docs/reference/cm-render-reference-20260106.md`](../../reference/cm-render-reference-20260106.md)
- [`docs/reference/cm-templates-reference-20260210.md`](../../reference/cm-templates-reference-20260210.md)
