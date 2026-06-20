## SuperJS — Agent Context

Read `specs/mission.md` first for project goal, principles, and key language facts.

## Specs structure

```
specs/
├── mission.md                  # Project goal, principles, key facts — READ FIRST
├── grammar.ebnf                # Formal grammar (machine-consumed by Stage 1 parser)
├── error-codes.md              # Error code registry
├── error-codes/                # Per-code spec files (SJS-E001 … SJS-E012)
├── config-schema.json          # JSON schema for superjs.config.json
├── diagnostics.schema.json     # JSON schema for diagnostic fixtures
├── fixtures/                   # Config + diagnostic test fixtures
├── language/                   # Language reference docs
├── roadmap/                    # Stage 0–6 production plans
├── features/                   # Per-feature implementation specs
│   ├── 001-core-language/      # Core language + CLI (COMPLETE)
│   ├── 002-ecmascript/         # ES5–ES2025 type-checking (COMPLETE)
│   ├── 003-website/            # Next.js marketing site + playground (COMPLETE)
│   ├── 004-vscode-extension/   # VS Code extension plans
│   └── 005-sjs-examples/       # SJS examples rewrite plans
├── ecmascript/                 # ES5–ES2025 reference docs per year
├── design/                     # Architecture and design docs
└── archive/                    # Superseded docs (read-only reference)
```

## Git workflow

Full rules: `specs/design/git-workflow.md`

Key rules for agents:
- `main` is production — never push directly, all changes via PR
- Feature branches cut from `main`; PRs always `--base main`
- Worktrees live in `.worktrees/<branch-name>/` (gitignored)
- Branch naming: `feature/`, `fix/`, `chore/`, `release/`
- `gh pr create --base main` — always

## v1.0 parallel agents

Workstreams: `specs/roadmap/v1.0/README.md` · state: `specs/roadmap/v1.0/manifest.json`

```bash
./scripts/worktree-create.sh WS-A8   # spawn isolated worktree
./scripts/worktree-list.sh           # status
```

Each workstream = one branch under `.worktrees/`, one Cursor agent (`.cursor/agents/v1.0-ws-*.md`).
Agents open PRs to `main` when done. Docs single source: repo-root `docs/` + `superjs/apps/website` (ADR-011).

## Next stage

`specs/roadmap/stage-0-foundations.md` — start here for next work.
