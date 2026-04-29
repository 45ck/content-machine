# Command Patterns

Use the installed runner with JSON on stdin.

## Script To Audio

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs script-to-audio
{
  "scriptPath": "outputs/work/script.json",
  "outputDir": "outputs/work/audio",
  "voice": "af_heart",
  "ttsSpeed": 1,
  "outputMetadataPath": "outputs/work/audio/audio.json"
}
JSON
```

## Video Render

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs video-render
{
  "visualsPath": "outputs/work/visuals.json",
  "timestampsPath": "outputs/work/audio/timestamps.json",
  "audioPath": "outputs/work/audio/audio.wav",
  "outputPath": "outputs/final/video.mp4",
  "orientation": "portrait",
  "fps": 30,
  "downloadAssets": false,
  "outputMetadataPath": "outputs/final/render.json"
}
JSON
```

## Publish Prep

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs publish-prep
{
  "videoPath": "outputs/final/video.mp4",
  "scriptPath": "outputs/work/script.json",
  "outputDir": "outputs/final/publish-prep",
  "platform": "tiktok"
}
JSON
```
