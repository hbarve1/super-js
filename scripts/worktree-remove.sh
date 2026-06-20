#!/usr/bin/env bash
# Remove a v1.0 worktree after its PR is merged.
# Usage: ./scripts/worktree-remove.sh WS-A8 [--delete-branch]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WS_ID="${1:?Usage: $0 WS-A8 [--delete-branch]}"
DELETE_BRANCH=false
[[ "${2:-}" == "--delete-branch" ]] && DELETE_BRANCH=true

WS_JSON="$(node "$ROOT/scripts/worktree-lib.mjs" get "$WS_ID")"
BRANCH="$(node -e "console.log(JSON.parse(process.argv[1]).branch)" "$WS_JSON")"
WORKTREE="$(node -e "console.log(JSON.parse(process.argv[1]).worktree)" "$WS_JSON")"
WORKTREE_ABS="$ROOT/$WORKTREE"

if [[ -d "$WORKTREE_ABS" ]]; then
  git worktree remove "$WORKTREE_ABS" --force
  echo "Removed worktree $WORKTREE"
else
  echo "No worktree at $WORKTREE_ABS"
fi

if $DELETE_BRANCH; then
  git branch -d "$BRANCH" 2>/dev/null || echo "Branch $BRANCH not deleted (may be checked out elsewhere or unmerged)"
fi
