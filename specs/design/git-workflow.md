# Git Workflow

## Branch model

```
main  ←── feature/xxx  (PR)
          feature/yyy  (PR)
          fix/zzz      (PR)
```

- `main` — production branch. Never push directly. All changes via PR.
- Feature/fix branches — cut from `main`, merged back to `main` via PR.
- No long-lived `develop` or `staging` branch. `main` is always the target.

---

## Worktree pattern

Use git worktrees to work on multiple branches simultaneously without stashing or switching.

### Setup

```bash
# From repo root
git worktree add .worktrees/<branch-name> <branch-name>

# Example: start new feature
git worktree add .worktrees/feature/parser-rewrite -b feature/parser-rewrite
```

`.worktrees/` is in `.gitignore` — worktrees never appear in commits.

### Working in a worktree

```bash
cd .worktrees/feature/parser-rewrite
# normal git workflow — commits, stash, etc.
# each worktree has its own working tree and index
```

### Remove when done

```bash
git worktree remove .worktrees/feature/parser-rewrite
git branch -d feature/parser-rewrite  # after PR merge
```

### List active worktrees

```bash
git worktree list
```

---

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<slug>` | `feature/production-parser` |
| Bug fix | `fix/<slug>` | `fix/null-narrowing` |
| Chore | `chore/<slug>` | `chore/update-deps` |
| Release | `release/<version>` | `release/0.2.0` |

---

## PR rules

- All PRs target `main`.
- Branch must be up to date with `main` before merging (rebase or merge commit — project default: squash merge).
- PR title follows conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
- At least one review before merge (self-merge allowed only for trivial chores when solo).

### Create PR

```bash
gh pr create --base main --title "feat: production parser" --body "..."
```

---

## Day-to-day commands

```bash
# Cut new branch from latest main
git fetch origin
git checkout -b feature/my-feature origin/main

# Or via worktree (preferred for parallel work)
git fetch origin
git worktree add .worktrees/feature/my-feature -b feature/my-feature origin/main

# Keep branch up to date
git rebase origin/main          # inside the worktree or branch

# Push and open PR
git push -u origin feature/my-feature
gh pr create --base main
```

---

## What NOT to do

- `git push origin main` — blocked by branch protection (or by convention).
- Long-lived feature branches (>2 weeks) — split into smaller PRs.
- Committing directly on `main` locally even if branch protection is off.
