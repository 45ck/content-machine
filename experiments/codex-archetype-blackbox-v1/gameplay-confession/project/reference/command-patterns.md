Export the correct runtime first:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
export npm_config_script_shell=/bin/bash
```

Install dependencies:

```bash
npm install --no-bin-links
```

Then materialize the local skill pack:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs install-skill-pack
{
  "targetDir": ".content-machine",
  "includeFlows": true
}
JSON
```

Visuals:

- start from `reference/visuals.example.json`
- replace every `/ABSOLUTE/PATH/TO/...` path with the real absolute path
  inside this project
- adjust scene durations, keywords, and `totalDuration` so they cover
  the full spoken runtime from `outputs/work/audio/timestamps.json`
- keep `gameplayClip.path` pointed at the local gameplay MP4
- keep the top lane turning over every `2s` to `4s`

Audio:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs script-to-audio
{
  "scriptPath": "outputs/work/script.json",
  "outputDir": "outputs/work/audio"
}
JSON
```

After audio:

- inspect `outputs/work/audio/audio.json` with `node`, not `python`
- if `duration` is above `50`, shorten `outputs/work/script.json` and
  rerun audio before building `visuals.json`
- do not stack multiple concurrent `script-to-audio` retries; wait for
  the packaged command to finish or fail

Render:

```bash
node reference/resolve-video-render-request.mjs | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs video-render
```

The resolver injects `browserExecutable` and `chromeMode` only if it
finds a cached Remotion browser in a common local location.

Do not switch to ad hoc local render helpers. The experiment should use
the shipped runner or explicitly report a packaged-runtime failure.

Review:

```bash
cat reference/publish-prep.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs publish-prep
```
