#!/usr/bin/env bash
set -euo pipefail

max_attempts=4
attempt=1

while true; do
  output_file="$(mktemp)"
  status=0

  if ! npx --no-install vitest run --coverage "$@" >"$output_file" 2>&1; then
    status=$?
  fi

  cat "$output_file"

  if [ "$status" -eq 0 ]; then
    rm -f "$output_file"
    exit 0
  fi

  if grep -Eq "coverage/\\.tmp/coverage-[0-9]+\\.json" "$output_file" && [ "$attempt" -lt "$max_attempts" ]; then
    echo "Retrying Vitest coverage after transient coverage shard ENOENT (attempt $attempt/$max_attempts)..." >&2
    attempt=$((attempt + 1))
    rm -f "$output_file"
    continue
  fi

  rm -f "$output_file"
  exit "$status"
done

