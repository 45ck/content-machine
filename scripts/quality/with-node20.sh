#!/usr/bin/env sh
set -eu

need_major=20

current_major() {
  if command -v node >/dev/null 2>&1; then
    node -p "Number.parseInt(process.versions.node.split('.')[0] ?? '', 10)" 2>/dev/null || true
  fi
}

major="$(current_major || true)"
if [ -n "${major:-}" ] && [ "${major:-0}" -eq "$need_major" ]; then
  exec "$@"
fi

NVM_VERSIONS_DIR="${HOME}/.nvm/versions/node"
best_bin=""
if [ -d "$NVM_VERSIONS_DIR" ]; then
  # Pick the highest installed Node 20.x (aligns with `.nvmrc` and avoids Node 22+ incompatibilities).
  if command -v sort >/dev/null 2>&1 && sort -V </dev/null >/dev/null 2>&1; then
    versions="$(ls -1 "$NVM_VERSIONS_DIR" 2>/dev/null | sort -V || true)"
  else
    versions="$(ls -1 "$NVM_VERSIONS_DIR" 2>/dev/null | sort || true)"
  fi

  for v in $versions; do
    v_major="$(printf '%s' "$v" | sed -E 's/^v([0-9]+).*/\1/' 2>/dev/null || echo '')"
    if [ -n "${v_major:-}" ] && [ "$v_major" -eq "$need_major" ]; then
      cand="$NVM_VERSIONS_DIR/$v/bin/node"
      if [ -x "$cand" ]; then
        best_bin="$cand"
      fi
    fi
  done
fi

if [ -n "$best_bin" ]; then
  best_dir="$(dirname "$best_bin")"
  PATH="$best_dir:$PATH"
  export PATH
  exec "$@"
fi

echo "content-machine: Node >= ${need_major} required for hooks." >&2
echo "Fix: install Node ${need_major}.x (recommended: nvm), then ensure it is on PATH." >&2
echo "Tip: in this repo run: nvm use" >&2
exit 1
