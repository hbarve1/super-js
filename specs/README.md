# specs/

Formal SuperJS language specification. Everything authoritative lives here.

## Contents

| Path | Purpose |
|------|---------|
| `mission.md` | Project goal, principles, key language facts — read first |
| `grammar.ebnf` | Formal EBNF grammar — machine-consumed by Stage 1 parser |
| `error-codes.md` | Diagnostic code registry (E/W/L/P series) |
| `error-codes/` | Per-code spec files with description, example, fix guidance |
| `language/` | Per-feature language spec (syntax, semantics, type rules, JS + LLVM lowering) |
| `config-schema.json` | JSON schema for `superjs.config.json` |
| `diagnostics.schema.json` | JSON schema for diagnostic fixtures |
| `fixtures/` | Config + diagnostic test fixtures |
| `ecmascript/` | ES5–ES2025 reference docs per year |
| `features/` | Per-feature implementation specs (compiler work items) |
| `design/` | Architecture and design decision records |
| `roadmap/` | Stage 0–6 production plans |
| `archive/` | Superseded docs — read-only reference |

## Where to start

- **Language reference:** `language/README.md` → per-feature files `NNN-feature-name.md`
- **Error codes:** `error-codes.md` for the registry, `error-codes/SJS-EXXX.md` for per-code detail
- **Grammar:** `grammar.ebnf` is the single source of truth for syntax
- **Next stage work:** `roadmap/stage-0-foundations.md`
