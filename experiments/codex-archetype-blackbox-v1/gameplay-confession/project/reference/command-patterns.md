Export the correct runtime first:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
export npm_config_script_shell=/bin/bash
```

Then install or verify the local skill pack:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs install-skill-pack
{
  "targetDir": ".content-machine",
  "includeFlows": true
}
JSON
```

Audio:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs script-to-audio
{
  "scriptPath": "outputs/work/script.json",
  "outputDir": "outputs/work/audio"
}
JSON
```

Render:

```bash
cat reference/video-render.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs video-render
```

The checked-in render request already points at the repo-local cached
Remotion browser. Do not remove `browserExecutable` or `chromeMode`
unless the project has its own cached browser path.

Review:

```bash
cat reference/publish-prep.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs publish-prep
```
