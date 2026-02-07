#!/usr/bin/env sh
set -eu

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

# Run quality gates against the exact code being pushed (HEAD), regardless of local WIP.
# This avoids stashing (which can be unreliable if files are marked assume-unchanged/skip-worktree).
tmp_dir="$(mktemp -d 2>/dev/null || mktemp -d -t cm-prepush)"

cleanup() {
  rm -rf "$tmp_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

git archive --format=tar HEAD | tar -x -C "$tmp_dir"

# Reuse local dependencies for speed (no npm install during push).
if [ -d "$repo_root/node_modules" ]; then
  ln -s "$repo_root/node_modules" "$tmp_dir/node_modules"
fi

scripts/quality/with-node20.sh sh -c "cd \"$tmp_dir\" && npm run quality"
