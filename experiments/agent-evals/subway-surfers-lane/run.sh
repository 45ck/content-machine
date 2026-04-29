#!/usr/bin/env bash
set -euo pipefail

ROOT="experiments/agent-evals/subway-surfers-lane"

mkdir -p "$ROOT/logs"

if [ -f .env ]; then
  set -a
  . <(tr -d '\r' < .env)
  set +a
fi

export CM_CONFIG="$PWD/$ROOT/content-machine.toml"
export CM_WHISPER_AUTO_INSTALL=1

if [ -f "$ROOT/artifacts/script/script.json" ]; then
  printf '{\n  "ok": true,\n  "skipped": true,\n  "reason": "using existing script artifact"\n}\n' \
    | tee "$ROOT/logs/brief-to-script.result.json"
else
  node --import tsx scripts/harness/brief-to-script.ts \
    < "$ROOT/inputs/brief-to-script.request.json" \
    | tee "$ROOT/logs/brief-to-script.result.json"
fi

node --import tsx scripts/harness/script-to-audio.ts \
  < "$ROOT/inputs/script-to-audio.request.json" \
  | tee "$ROOT/logs/script-to-audio.result.json"

node --import tsx scripts/harness/timestamps-to-visuals.ts \
  < "$ROOT/inputs/timestamps-to-visuals.request.json" \
  | tee "$ROOT/logs/timestamps-to-visuals.result.json"

node --import tsx "$ROOT/tools/render-split-screen.ts" \
  "$ROOT/inputs/render-split-screen.request.json" \
  | tee "$ROOT/logs/render-split-screen.result.json"

node --import tsx scripts/harness/publish-prep.ts \
  < "$ROOT/inputs/publish-prep.request.json" \
  | tee "$ROOT/logs/publish-prep.result.json"
