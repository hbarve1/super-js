# spec/language.md — Per-Feature Language Spec

This directory is the assembly point for the canonical SuperJS language specification.
Each file covers one language feature and is authoritative for the compiler, LSP, and formatter.

## Status

Populated incrementally during Stage 1 as each feature is implemented.
Stage 6 assembles these files into the published `SPEC.md`.

## Structure

Each feature file follows the naming convention `NNN-feature-name.md` and contains:

- **Syntax** — EBNF excerpt from `spec/grammar.ebnf`
- **Semantics** — normative prose
- **Type rules** — inference and checking rules
- **Diagnostic codes** — which `SJS-EXXX` codes this feature can emit
- **Examples** — valid and invalid, with expected diagnostics

## File index

| File | Feature | Status |
|---|---|---|
| `001-null-safety.md` | Nullable types (`T?`) and null narrowing | Stage 0 — prototype implemented |
| `002-sum-types.md` | Sum type declarations and variant constructors | Stage 0 — prototype implemented |
| `003-match.md` | Match expressions and exhaustiveness | Stage 0 — prototype implemented |
| `004-dynamic.md` | `dynamic` escape hatch and propagation rules | Stage 1 — planned |
| `005-generics.md` | Generic functions, interfaces, and classes | Stage 1 — planned |
| `006-banned-features.md` | Banned TypeScript features and their SJS replacements | Stage 1 — planned |

## Adding a new feature file

1. Choose the next available number.
2. Copy the template from `spec/language.md/_template.md`.
3. Fill in Syntax, Semantics, Type rules, Diagnostic codes, and Examples.
4. Add a row to the index table above.
5. Open a PR that touches this file alongside the compiler implementation — CI enforces this (Stage 1 gate).
