---
sidebar_position: 6
---

# Changelog

## v0.1.0 — 2026-05-30 (Phase 1 Prototype)

The first release of SuperJS. Phase 1 delivers a complete, working language and toolchain built on Babel.

### CLI

- `superjs build` — compile `.sjs` files to JavaScript
  - `--source <file>` / `--dir <dir>` — single file or directory input
  - `--outDir <dir>` — output directory (default `./dist`)
  - `--target` — JS version target: es5, es2015–es2022 (default: es2022)
  - `--watch` — file-system watch mode, recompiles on change
  - `--strict` — enable strict mode (SJS-W001 implicit-any warnings)
  - `--no-emit` — type-check only, no output files
  - `--sourcemap` — emit `.js.map` alongside output
  - `--json` — diagnostics as ndjson (one JSON object per line)
- `superjs lint` — static analysis with `--fix` and `--json` flags
- `superjs format` — code formatting with `--check` flag for CI
- `superjs test` — test runner with `--watch` and `--coverage` flags

### Type Checker

- **Sound null safety** (SJS-E001): all types are non-nullable by default; `T?` syntax opts a type into nullability
- **Type mismatch detection** (SJS-E002): errors on mismatched assignment and return types
- **Implicit-any warnings** (SJS-W001): reported in strict mode (`--strict`)

### Preprocessor

- **Sum type declarations**: `type Result<T, E> = Ok(T) | Err(E)` syntax compiled to discriminated union objects
- **Match expressions**: `match expr { Variant(v) => ... }` syntax compiled to exhaustive switch IIFEs
- **Exhaustiveness checking** (SJS-E007): compile-time error when a match does not cover all sum type variants

### Configuration

- `superjs.config.json` project configuration file: `target`, `outDir`, `jsxFactory`, `jsxFragment`, `strict`
- CLI flags always override config file values

### JSX

- JSX enabled by default in `.sjs` files
- Configurable `jsxFactory` and `jsxFragment` via config or CLI

### Demo Projects

- **Algorithms**: data structures (stack, queue, linked list, binary tree)
- **Web**: todo application
- **JSX/React**: markdown editor
- **Node.js**: code stats analyzer

### Test Suite

- 202 tests passing across 18 suites

---

## What's Next

Phase 2 (v1.0) will replace the Babel/TypeScript parser with a hand-written recursive-descent parser, add cross-file type inference, improve error messages with source spans, and ship an LSP server for editor integration.

See the [Roadmap](/docs/roadmap) for the full plan.
