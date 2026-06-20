#!/usr/bin/env bash
# Create an isolated git worktree for a v1.0 workstream.
# Usage: ./scripts/worktree-create.sh WS-A8
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WS_ID="${1:?Usage: $0 WS-A8 (see specs/roadmap/v1.0/manifest.json)}"

WS_JSON="$(node "$ROOT/scripts/worktree-lib.mjs" get "$WS_ID")"
BRANCH="$(node -e "console.log(JSON.parse(process.argv[1]).branch)" "$WS_JSON")"
WORKTREE_REL="$(node -e "console.log(JSON.parse(process.argv[1]).worktree)" "$WS_JSON")"
WORKTREE="$ROOT/$WORKTREE_REL"
TITLE="$(node -e "console.log(JSON.parse(process.argv[1]).title)" "$WS_JSON")"

echo "→ Workstream: $WS_ID — $TITLE"
echo "→ Branch:     $BRANCH"
echo "→ Worktree:   $WORKTREE"

git fetch origin main 2>/dev/null || git fetch origin

if [[ -d "$WORKTREE" ]]; then
  echo "Worktree already exists at $WORKTREE"
  echo "  cd $WORKTREE"
  exit 0
fi

mkdir -p "$(dirname "$WORKTREE")"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$WORKTREE" "$BRANCH"
else
  git worktree add "$WORKTREE" -b "$BRANCH" origin/main
fi

echo ""
echo "Installing monorepo deps (superjs/)…"
if [[ -f "$WORKTREE/superjs/pnpm-lock.yaml" ]]; then
  (cd "$WORKTREE/superjs" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install)
fi

AGENT="$(node -e "console.log(JSON.parse(process.argv[1]).agent)" "$WS_JSON")"
echo ""
echo "✓ Ready. Next steps:"
echo "  1. Open Cursor at: $WORKTREE"
echo "  2. Start agent:    @$AGENT"
echo "  3. Agent reads:    specs/roadmap/v1.0/manifest.json + its WS-*.md spec"
echo ""
echo "When done, agent opens PR → main and updates manifest status to pr_open."
