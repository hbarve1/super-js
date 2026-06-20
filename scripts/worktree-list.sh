#!/usr/bin/env bash
# List v1.0 worktrees and manifest status.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Git worktrees ==="
git worktree list

echo ""
echo "=== v1.0 manifest ==="
node "$ROOT/scripts/worktree-lib.mjs" list
