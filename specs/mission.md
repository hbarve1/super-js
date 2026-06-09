# SuperJS — Mission

## What

SuperJS (`.sjs`) is a strict superset of JavaScript that adds:

- **Gradual static typing** — annotate when you want, infer when you don't
- **Null safety by default** — `T` is non-nullable; `T?` is nullable
- **Sum types + pattern matching** — `type Result<T,E> = Ok(T) | Err(E)` with exhaustive `match`
- **`dynamic` escape hatch** — explicit runtime-checked replacement for `any`
- **Unified CLI** — `superjs build | lint | format | test` in one tool
- **Native JSX** — first-class without separate transform config

## Why

JavaScript's type system has accumulated escape hatches (`any`, mapped types, conditional types, non-null assertions `!`) that let unsafety spread silently. TypeScript added power but kept the exits open. SuperJS closes them:

- No `any` — use `dynamic` with intent
- No `!` non-null assertion — use `?.` or explicit null checks
- No `enum`, mapped types, conditional types, intersection types — simpler mental model
- Structural interfaces (Go-style) — no `implements` boilerplate needed

## End Goal

Ship **SuperJS 1.0** — a production-grade language toolchain usable by real projects:

| Stage | Goal |
|---|---|
| 0 — Foundations | Monorepo, `@superjs/compiler-types`, formal spec (grammar.ebnf, error codes, schemas), CI matrix, RFCs 0001–0005 |
| 1 — Compiler Core | Production parser with error recovery, full type checker, LSP server, deterministic output |
| 2 — Interop | `.d.ts` consumption, npm package wrappers, `tsconfig.json` paths inheritance |
| 3 — DX Tools | Formatter, linter (17 rules), test runner, watch mode, VS Code extension on marketplace |
| 4 — Stdlib | `@superjs/stdlib` — typed Result, Option, Iterator, collections |
| 5 — Ecosystem | React wrapper, Node.js stdlib types, Jest transform, Vite plugin |
| 6 — Stability & Launch | 1.0 semver, migration guide, public docs, community open |

## Principles (non-negotiable)

1. **ECMA superset** — every valid ES5–ES2022 program is valid `.sjs`
2. **Correctness over performance** — prototype + plain-JS compiler validate against each other; LLVM backend follows
3. **Spec first** — `spec/grammar.ebnf` and `spec/error-codes.md` lead implementation
4. **No silent unsafety** — every escape hatch is explicit and warned in strict mode
5. **DX non-negotiable** — `<500ms` compile for files under 1000 lines; errors point to `.sjs` source not generated output

## Backends

| Backend | Language | Status | Purpose |
|---|---|---|---|
| `prototype/` | TypeScript + Babel | Active — reference impl | Production CLI |
| `compiler/` | Plain JS | Active — correctness check | Validates against prototype |
| `llvm/` | C++ / LLVM 17 | In progress | Native performance (<50ms) |

## Key Language Facts (for agents)

- Sum types: `type Result<T,E> = Ok(T) | Err(E)` → runtime `{ _tag, _0 }`
- Match: `match expr { Ok(v) => ..., Err(e) => ... }` — exhaustive, guards supported
- Null safety: `T?` = `T | null | undefined`; non-nullable by default; no `!`
- Banned: `any`, `enum`, mapped types, conditional types, `A & B` intersections
- `dynamic` = runtime-checked escape hatch, warns in strict mode
- Structural interfaces — conformance checked structurally, no explicit `implements`
- Error codes: `SJS-E001`–`SJS-E019` (type errors), `SJS-W001`–`SJS-W012` (warnings), `SJS-L001`–`SJS-L011` (lint/security), `SJS-P001`–`SJS-P099` (parser)
- CLI: `superjs build | lint | format | test [--watch] [--strict] [--json]`
