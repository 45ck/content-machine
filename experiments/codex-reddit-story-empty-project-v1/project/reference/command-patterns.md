# Command Patterns

Use the packaged runner with JSON on stdin.

Pin the shell to the repo-supported Node runtime first:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
export npm_config_script_shell=/bin/bash
```

## Reddit Opener Asset

```bash
cat reference/reddit-story-assets.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs reddit-story-assets
```

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
cat reference/video-render.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs video-render
```

## Publish Prep

```bash
cat reference/publish-prep.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs publish-prep
```
