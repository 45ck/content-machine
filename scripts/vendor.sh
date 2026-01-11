#!/usr/bin/env bash
set -euo pipefail

echo "Updating all submodules..."

git submodule update --init --recursive --depth 1

echo ""
echo "Submodules updated successfully."
count="$(git submodule status | wc -l | tr -d ' ')"
echo "Total submodules: ${count}"
