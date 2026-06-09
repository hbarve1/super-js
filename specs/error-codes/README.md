# Error Codes — Directory Index

This directory contains one file per SuperJS diagnostic code. The **authoritative registry**
(full table with severity, category, short message, and owning stage for every code) lives in
[`specs/error-codes.md`](../error-codes.md). This file is a navigational index only.

---

## P Series — Parser (Stage 1)

Emitted by the SuperJS parser during syntactic analysis. All parser diagnostics have severity
**error**.

| Code | Short message | File |
|---|---|---|
| SJS-P001 | Unexpected token | [SJS-P001.md](SJS-P001.md) |
| SJS-P002 | Unexpected end of file | [SJS-P002.md](SJS-P002.md) |
| SJS-P003 | Invalid syntax in type annotation | [SJS-P003.md](SJS-P003.md) |
| SJS-P004 | Invalid sum type declaration | [SJS-P004.md](SJS-P004.md) |
| SJS-P005 | Invalid match expression | [SJS-P005.md](SJS-P005.md) |
| SJS-P099 | Too many parse errors; recovery abandoned | [SJS-P099.md](SJS-P099.md) |

---

## E Series — Type Errors (Stage 0 / Stage 1 / Stage 2)

Emitted by the type checker. Codes marked Stage 0 are already emitted by the prototype.

| Code | Short message | File |
|---|---|---|
| SJS-E001 | Null or undefined assigned to non-nullable type `T` | [SJS-E001.md](SJS-E001.md) |
| SJS-E002 | Type mismatch: expected `T`, found `U` | [SJS-E002.md](SJS-E002.md) |
| SJS-E003 | Property access on possibly-null value | [SJS-E003.md](SJS-E003.md) |
| SJS-E004 | `any` is not a valid type in SJS; use `dynamic` | [SJS-E004.md](SJS-E004.md) |
| SJS-E005 | Intersection type `A & B` is not allowed; use interface extension | [SJS-E005.md](SJS-E005.md) |
| SJS-E006 | Mapped type is not allowed in SJS | [SJS-E006.md](SJS-E006.md) |
| SJS-E007 | Match expression is not exhaustive: missing variant `V` | [SJS-E007.md](SJS-E007.md) |
| SJS-E008 | Conditional type `T extends U ? A : B` is not allowed | [SJS-E008.md](SJS-E008.md) |
| SJS-E009 | `infer` keyword is not allowed in SJS | [SJS-E009.md](SJS-E009.md) |
| SJS-E010 | TypeScript `enum` is not allowed; use sum types | [SJS-E010.md](SJS-E010.md) |
| SJS-E011 | Non-null assertion `!` is not allowed; use narrowing | [SJS-E011.md](SJS-E011.md) |
| SJS-E012 | `namespace` is not allowed; use ES modules | [SJS-E012.md](SJS-E012.md) |
| SJS-E013 | `with` statement not allowed (SJS is always strict mode) | [SJS-E013.md](SJS-E013.md) |
| SJS-E014 | Private or protected member not accessible from this scope | [SJS-E014.md](SJS-E014.md) |
| SJS-E015 | Cannot narrow an access modifier on an overriding method or property | [SJS-E015.md](SJS-E015.md) |
| SJS-E016 | Cannot instantiate an abstract class directly with `new` | [SJS-E016.md](SJS-E016.md) |
| SJS-E017 | Circular import detected — module graph contains a cycle | [SJS-E017.md](SJS-E017.md) |
| SJS-E018 | Top-level `await` used outside an ES module context | [SJS-E018.md](SJS-E018.md) |
| SJS-E019 | Unknown JSX element type — identifier not in scope or not a valid component | [SJS-E019.md](SJS-E019.md) |

---

## W Series — Warnings (Stage 0 / Stage 1 / Stage 2)

Emitted by the type checker or compiler pipeline for conditions that are not hard errors but
likely indicate problems.

| Code | Short message | File |
|---|---|---|
| SJS-W001 | Implicit `dynamic` — unannotated position in `--strict` mode | [SJS-W001.md](SJS-W001.md) |
| SJS-W002 | `dynamic` value assigned to a typed position without a narrowing check | [SJS-W002.md](SJS-W002.md) |
| SJS-W003 | Unreachable `match` arm — earlier arm already covers this variant | [SJS-W003.md](SJS-W003.md) |
| SJS-W004 | Reserved or future SJS keyword used as an identifier | [SJS-W004.md](SJS-W004.md) |
| SJS-W005 | Explicit `public` modifier is redundant — class members are public by default | [SJS-W005.md](SJS-W005.md) |
| SJS-W006 | Excess property on a fresh object literal assigned to a typed position | [SJS-W006.md](SJS-W006.md) |
| SJS-W007 | Missing `key` prop on JSX element in a list or iterator context | [SJS-W007.md](SJS-W007.md) |
| SJS-W008 | Implicit switch fallthrough between non-empty case clauses | [SJS-W008.md](SJS-W008.md) |
| SJS-W009 | Unreachable code following a terminator statement | [SJS-W009.md](SJS-W009.md) |
| SJS-W010 | `catch` binding not typed as `Error` or `unknown` | [SJS-W010.md](SJS-W010.md) |
| SJS-W012 | BiDi control character in source file | [SJS-W012.md](SJS-W012.md) |

---

## L Series — Lint / Security (Stage 1 / Stage 3)

Emitted by the linter (Stage 3) or the lexer for security-critical conditions (Stage 1).

| Code | Short message | File |
|---|---|---|
| SJS-L001 | Prefer `const` — `let` binding is never reassigned | [SJS-L001.md](SJS-L001.md) |
| SJS-L002 | Prefer `let` or `const` over `var` | [SJS-L002.md](SJS-L002.md) |
| SJS-L003 | Use `===` / `!==` — `==` / `!=` performs type coercion | [SJS-L003.md](SJS-L003.md) |
| SJS-L004 | Prefer `for…of` over `for…in` for array and iterable iteration | [SJS-L004.md](SJS-L004.md) |
| SJS-L005 | `debugger` statement found in committed code | [SJS-L005.md](SJS-L005.md) |
| SJS-L011 | BiDi control character rejected | [SJS-L011.md](SJS-L011.md) |

---

## Notes

- Code numbers are **permanent**. Retired codes remain listed in
  [`specs/error-codes.md`](../error-codes.md) and are never reused.
- To add a new code, follow the process in the [Adding New Codes](../error-codes.md#adding-new-codes)
  section of the registry, then add the per-code `.md` file here and update this index.
- The `superjs explain SJS-XXXX` CLI command reads these files directly to render diagnostic
  help text in the terminal.
