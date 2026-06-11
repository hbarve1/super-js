# 060 — Diagnostic Codes Reference

**Status:** Stage 0 — authoritative

---

## Overview

Master cross-reference for all SJS diagnostic codes. Each code links to the feature spec that defines it in detail. For per-code explanation, fix guidance, and examples, see `specs/error-codes/SJS-EXXX.md`.

Codes are grouped into four series:

- **E** — hard errors (compilation halts)
- **W** — warnings (compilation continues; configurable as errors via `--strict`)
- **L** — lint / style (configurable; off by default in `--loose` mode)
- **P** — parse errors (always fatal; halt before type-checking)

---

## Error Codes (SJS-E) — Hard Errors

| Code | Message summary | Feature area | Spec file |
|---|---|---|---|
| SJS-E001 | Null or undefined assigned to non-nullable type | Null safety | `001-null-safety.md` |
| SJS-E002 | Type mismatch — expression type not assignable to target type | Type system | `010-primitives.md` |
| SJS-E003 | Property access on a possibly-null or possibly-undefined value | Null safety | `001-null-safety.md` |
| SJS-E004 | `any` is not a valid type — use `dynamic` instead | Banned features | `007-banned-features.md` |
| SJS-E005 | Intersection type `A & B` not allowed in SJS | Banned features | `007-banned-features.md` |
| SJS-E006 | Mapped type, indexed access type, or `typeof` type operator not allowed | Banned features | `007-banned-features.md` |
| SJS-E007 | Non-exhaustive `match` expression — one or more variants not covered | Match | `003-match.md` |
| SJS-E020 | Ambiguous variant constructor — name is shared by multiple sum types and context is insufficient to resolve | Sum types | `002-sum-types.md` |
| SJS-E009 | `infer` keyword not allowed | Banned features | `007-banned-features.md` |
| SJS-E010 | `enum` keyword not allowed — use sum types instead | Banned features | `007-banned-features.md` |
| SJS-E011 | Non-null assertion operator `!` not allowed | Null safety | `001-null-safety.md` |
| SJS-E012 | `namespace` keyword not allowed — use ES modules | Modules | `023-modules.md` |
| SJS-E013 | `with` statement not allowed (SJS is always strict mode) | Control flow | `040-control-flow.md` |
| SJS-E014 | Private or protected member not accessible from this scope | Access modifiers | `008-access-modifiers.md` |
| SJS-E015 | Cannot narrow an access modifier on an overriding method or property | Access modifiers | `008-access-modifiers.md` |
| SJS-E016 | Cannot instantiate an abstract class directly with `new` | Classes | `022-classes.md` |
| SJS-E017 | Circular import detected — module graph contains a cycle | Modules | `023-modules.md` |
| SJS-E018 | Top-level `await` used outside an ES module context | Async/await | `037-async-await.md` |
| SJS-E019 | Unknown JSX element type — identifier not in scope or not a valid component | JSX | `039-jsx.md` (future) |

---

## Warning Codes (SJS-W) — Non-fatal

Warnings are emitted but do not halt compilation. All warnings become errors under `--strict`.

| Code | Message summary | Feature area | Spec file |
|---|---|---|---|
| SJS-W001 | Implicit `dynamic` — unannotated position in `--strict` mode | dynamic type | `004-dynamic.md` |
| SJS-W002 | `dynamic` value assigned to a typed position without a narrowing check | dynamic type | `004-dynamic.md` |
| SJS-W003 | Unreachable `match` arm — earlier arm already covers this variant | Match | `003-match.md` |
| SJS-W004 | Reserved or future SJS keyword used as an identifier | Keywords | `000-keywords.md` |
| SJS-W005 | Explicit `public` modifier is redundant — class members are public by default | Access modifiers | `008-access-modifiers.md` |
| SJS-W006 | Excess property on a fresh object literal assigned to a typed position | Object types | `014-object-types.md` |
| SJS-W007 | Missing `key` prop on JSX element in a list or iterator context | JSX | `039-jsx.md` (future) |
| SJS-W008 | Implicit switch fallthrough between non-empty case clauses | Control flow | `040-control-flow.md` |
| SJS-W009 | Unreachable code following a terminator statement (`return`, `throw`, `break`, `continue`) | Control flow | `040-control-flow.md` |
| SJS-W010 | `catch` binding not typed as `Error` or `unknown` — untyped catch may hide bugs | Try/catch | `041-try-catch.md` |

---

## Lint Codes (SJS-L) — Style / Best Practice

Lint codes are off by default in `--loose` mode and on by default in `--strict` mode. Configurable per-code in `superjs.config.json` under `"lint"`.

| Code | Message summary | Feature area | Spec file |
|---|---|---|---|
| SJS-L001 | Prefer `const` — `let` binding is never reassigned | Variables | `020-variables.md` |
| SJS-L002 | Prefer `let` or `const` over `var` | Variables | `020-variables.md` |
| SJS-L003 | Use `===` / `!==` — `==` / `!=` performs type coercion | Operators | `030-operators.md` |
| SJS-L004 | Prefer `for…of` over `for…in` for array and iterable iteration | Iteration | `042-for-of-for-in.md` |
| SJS-L005 | `debugger` statement found in committed code | Control flow | `040-control-flow.md` |

---

## Parser Codes (SJS-P) — Parse Errors

Parser errors are always fatal and halt compilation before type-checking begins.

| Code | Message summary |
|---|---|
| SJS-P001 | Unexpected token |
| SJS-P002 | Missing semicolon (when ASI does not apply) |
| SJS-P003 | Unmatched bracket, brace, or parenthesis |
| SJS-P004 | Invalid type annotation syntax |
| SJS-P005 | Prefix cast syntax `<T>expr` is not valid in SJS — use `expr as T` |

---

## Code Assignment Policy

| Range | Series |
|---|---|
| E001–E099 | Type system and semantic hard errors |
| W001–W099 | Type system and semantic warnings |
| L001–L099 | Lint and style |
| P001–P099 | Parser errors |

To add a new diagnostic code:

1. Assign the next available number in the appropriate series.
2. Document it in this file (060-error-codes-map.md) in the correct table.
3. Document it in the relevant feature spec file under its "Diagnostic codes" section.
4. Create `specs/error-codes/SJS-EXXX.md` (or WXXX / LXXX / PXXX) with the full per-code spec: description, examples, suggested fix.
5. Add a fixture to `specs/fixtures/` covering the diagnostic.

Do not reuse or retire code numbers. Retired codes must remain in this table marked `[retired]` with the date of retirement.
