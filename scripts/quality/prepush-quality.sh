#!/usr/bin/env sh
set -eu

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

stash_count() {
  git stash list 2>/dev/null | wc -l | tr -d ' '
}

is_dirty=0
git diff --quiet || is_dirty=1
git diff --cached --quiet || is_dirty=1
if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
  is_dirty=1
fi

before="$(stash_count)"

if [ "$is_dirty" -eq 1 ]; then
  # Avoid blocking pushes when the working tree contains WIP changes unrelated to the commits being pushed.
  # This runs quality gates against HEAD in a clean tree using existing dependencies.
  git stash push -u -m "cm pre-push quality (auto)" >/dev/null || true
fi

after="$(stash_count)"
did_stash=0
if [ "$after" -gt "$before" ]; then
  did_stash=1
fi

restore() {
  if [ "$did_stash" -eq 1 ]; then
    git stash pop --quiet || {
      echo "content-machine: failed to restore auto-stash from pre-push." >&2
      echo "Your changes are still in git stash; run: git stash list && git stash pop" >&2
      exit 1
    }
  fi
}

trap restore EXIT INT TERM

scripts/quality/with-node20.sh npm run quality

