#!/usr/bin/env bash
set -euo pipefail

ROOT="experiments/codex-archetype-blackbox-v1/text-message-drama"
PROJECT="$ROOT/project"
LOG_DIR="$ROOT/logs"

mkdir -p "$LOG_DIR"
rm -rf \
  "$PROJECT/node_modules" \
  "$PROJECT/.content-machine" \
  "$PROJECT/outputs" \
  "$PROJECT/assets/messages"

export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
export npm_config_script_shell=/bin/bash

codex exec \
  --dangerously-bypass-approvals-and-sandbox \
  --skip-git-repo-check \
  --json \
  -C "$PROJECT" \
  -o "$LOG_DIR/final-message.txt" \
  - < "$ROOT/prompt.md" | tee "$LOG_DIR/run.jsonl"
