## SuperJS — Agent Context

Read `specs/mission.md` first for project goal, principles, and key language facts.

## Specs structure

```
specs/
├── mission.md                  # Project goal, principles, key facts — READ FIRST
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

## Formal spec (not planning)

`spec/` — canonical language spec: `grammar.ebnf`, `error-codes.md`, JSON schemas. Do not confuse with `specs/`.

## Git workflow

Full rules: `specs/design/git-workflow.md`

Key rules for agents:
- `main` is production — never push directly, all changes via PR
- Feature branches cut from `main`; PRs always `--base main`
- Worktrees live in `.worktrees/<branch-name>/` (gitignored)
- Branch naming: `feature/`, `fix/`, `chore/`, `release/`
- `gh pr create --base main` — always

## Next stage

`specs/roadmap/stage-0-foundations.md` — start here for next work.
