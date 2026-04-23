#!/usr/bin/env sh
set -eu

need_major=20
need_minor=6
need_patch=0

current_version() {
  if command -v node >/dev/null 2>&1; then
    node -p "process.versions.node" 2>/dev/null || true
  fi
}

version_at_least() {
  version="$1"
  major="$(printf '%s' "$version" | sed -E 's/^v?([0-9]+).*/\1/' 2>/dev/null || echo 0)"
  minor="$(printf '%s' "$version" | sed -E 's/^v?[0-9]+\.([0-9]+).*/\1/' 2>/dev/null || echo 0)"
  patch="$(printf '%s' "$version" | sed -E 's/^v?[0-9]+\.[0-9]+\.([0-9]+).*/\1/' 2>/dev/null || echo 0)"

  if [ -z "${major:-}" ]; then major=0; fi
  if [ -z "${minor:-}" ] || [ "$minor" = "$version" ]; then minor=0; fi
  if [ -z "${patch:-}" ] || [ "$patch" = "$version" ]; then patch=0; fi

  if [ "$major" -gt "$need_major" ]; then return 0; fi
  if [ "$major" -lt "$need_major" ]; then return 1; fi
  if [ "$minor" -gt "$need_minor" ]; then return 0; fi
  if [ "$minor" -lt "$need_minor" ]; then return 1; fi
  [ "$patch" -ge "$need_patch" ]
}

current="$(current_version || true)"
if [ -n "${current:-}" ] && version_at_least "$current"; then
  exec "$@"
fi

NVM_VERSIONS_DIR="${HOME}/.nvm/versions/node"
best_bin=""
if [ -d "$NVM_VERSIONS_DIR" ]; then
  # Pick the highest installed Node 20.x as a fallback when current Node is below 20.
  if command -v sort >/dev/null 2>&1 && sort -V </dev/null >/dev/null 2>&1; then
    versions="$(ls -1 "$NVM_VERSIONS_DIR" 2>/dev/null | sort -V || true)"
  else
    versions="$(ls -1 "$NVM_VERSIONS_DIR" 2>/dev/null | sort || true)"
  fi

  for v in $versions; do
    if version_at_least "$v"; then
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

echo "content-machine: Node >= ${need_major}.${need_minor}.${need_patch} required for hooks." >&2
echo "Fix: install Node ${need_major}.x (recommended: nvm), then ensure it is on PATH." >&2
echo "Tip: in this repo run: nvm use" >&2
exit 1
