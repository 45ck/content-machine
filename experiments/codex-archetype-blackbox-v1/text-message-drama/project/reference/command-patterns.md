Export the correct runtime first:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
export npm_config_script_shell=/bin/bash
```

Install dependencies:

```bash
npm install
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
node reference/resolve-video-render-request.mjs | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs video-render
```

The resolver injects `browserExecutable` and `chromeMode` only if it
finds a cached Remotion browser in a common local location.

Review:

```bash
cat reference/publish-prep.request.example.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs publish-prep
```
