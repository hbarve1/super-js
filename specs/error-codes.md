# SuperJS Diagnostic Code Registry

## Preamble

SuperJS emits structured diagnostic codes in the form **`SJS-XNNN`** where:

- **`X`** is the category letter:
  - `P` — Parser
  - `E` — Type Error
  - `W` — Warning
  - `L` — Lint
  - `F` — Formatter
- **`NNN`** is a zero-padded three-digit number within the category.

### Stability guarantees

- Codes are **permanent**. Once a code is assigned and shipped, it is never removed from this file or its number reused for a different diagnostic, even if the code is later retired.
- **Retired codes** are moved to the [Retired Codes](#retired-codes) section and marked as such; the number remains reserved.
- **Renaming** a code's short message (changing its meaning) constitutes a breaking change and requires a major RFC with community sign-off.
- **Adding new codes** requires updating this file; see [Adding New Codes](#adding-new-codes) for the process.

---

## Parser Codes (SJS-P001–P099)

These codes are emitted by the SuperJS parser (Stage 1) during syntactic analysis. All parser diagnostics have severity **error**.

| Code | Severity | Category | Short Message | Owning Stage |
|------|----------|----------|---------------|--------------|
| SJS-P001 | error | parser | Unexpected token | Stage 1 |
| SJS-P002 | error | parser | Unexpected end of file | Stage 1 |
| SJS-P003 | error | parser | Invalid syntax in type annotation | Stage 1 |
| SJS-P004 | error | parser | Invalid sum type declaration | Stage 1 |
| SJS-P005 | error | parser | Invalid match expression | Stage 1 |
| SJS-P099 | error | parser | Too many parse errors; recovery abandoned | Stage 1 |

---

## Type Error Codes (SJS-E001–E099)

These codes are emitted by the type checker. Codes marked **Stage 0 (prototype)** are already emitted by the current prototype implementation.

| Code | Severity | Category | Short Message | Owning Stage |
|------|----------|----------|---------------|--------------|
| SJS-E001 | error | null-safety | Null or undefined assigned to non-nullable type `T` | Stage 0 (prototype) |
| SJS-E002 | error | type-check | Type mismatch: expected `T`, found `U` | Stage 0 (prototype) |
| SJS-E003 | error | null-safety | Property access on possibly-null value | Stage 0 (prototype) |
| SJS-E004 | error | type-check | `any` is not a valid type in SJS; use `dynamic` | Stage 1 |
| SJS-E005 | error | type-check | Intersection type `A & B` is not allowed; use interface extension | Stage 1 |
| SJS-E006 | error | type-check | Mapped type is not allowed in SJS | Stage 1 |
| SJS-E007 | error | match | Match expression is not exhaustive: missing variant `V` | Stage 0 (prototype) |
| SJS-E008 | error | type-check | Conditional type `T extends U ? A : B` is not allowed | Stage 1 |
| SJS-E009 | error | type-check | `infer` keyword is not allowed in SJS | Stage 1 |
| SJS-E010 | error | type-check | TypeScript `enum` is not allowed; use sum types | Stage 1 |
| SJS-E011 | error | null-safety | Non-null assertion `!` is not allowed; use narrowing | Stage 1 |
| SJS-E012 | error | type-check | `namespace` is not allowed; use ES modules | Stage 1 |
| SJS-E013 | error | control-flow | `with` statement not allowed (SJS is always strict mode) | Stage 1 |
| SJS-E014 | error | access-modifiers | Private or protected member not accessible from this scope | Stage 1 |
| SJS-E015 | error | access-modifiers | Cannot narrow an access modifier on an overriding method or property | Stage 1 |
| SJS-E016 | error | classes | Cannot instantiate an abstract class directly with `new` | Stage 1 |
| SJS-E017 | error | modules | Circular import detected — module graph contains a cycle | Stage 1 |
| SJS-E018 | error | async-await | Top-level `await` used outside an ES module context | Stage 1 |
| SJS-E019 | error | jsx | Unknown JSX element type — identifier not in scope or not a valid component | Stage 2 |
| SJS-E020 | error | type-check | Ambiguous variant constructor `V` — multiple sum types declare it and the expected type is unknown | Stage 1 |

---

## Warning Codes (SJS-W001–W099)

These codes are emitted by the type checker or compiler pipeline for conditions that are not hard errors but likely indicate problems. Codes marked **Stage 0 (prototype)** are already emitted by the current prototype.

| Code | Severity | Category | Short Message | Owning Stage |
|------|----------|----------|---------------|--------------|
| SJS-W001 | warning | dynamic | Implicit `dynamic` — unannotated position in `--strict` mode | Stage 0 (prototype) |
| SJS-W002 | warning | dynamic | `dynamic` value assigned to a typed position without a narrowing check | Stage 1 |
| SJS-W003 | warning | match | Unreachable `match` arm — earlier arm already covers this variant | Stage 1 |
| SJS-W004 | warning | keywords | Reserved or future SJS keyword used as an identifier | Stage 1 |
| SJS-W005 | warning | access-modifiers | Explicit `public` modifier is redundant — class members are public by default | Stage 1 |
| SJS-W006 | warning | type-check | Excess property on a fresh object literal assigned to a typed position | Stage 1 |
| SJS-W007 | warning | jsx | Missing `key` prop on JSX element in a list or iterator context | Stage 2 |
| SJS-W008 | warning | control-flow | Implicit switch fallthrough between non-empty case clauses | Stage 1 |
| SJS-W009 | warning | control-flow | Unreachable code following a terminator statement | Stage 1 |
| SJS-W010 | warning | try-catch | `catch` binding not typed as `Error` or `unknown` | Stage 1 |
| SJS-W012 | warning | security | BiDi control character in source file | Stage 1 |

---

## Lint Codes (SJS-L001–L099)

These codes are emitted by the SuperJS linter (Stage 3). Lint rules can be configured in the project's `superjs.config` file. Security-critical lint codes (SJS-L011) are emitted by the lexer at Stage 1.

| Code | Severity | Category | Short Message | Owning Stage |
|------|----------|----------|---------------|--------------|
| SJS-L001 | warning | lint | Prefer `const` — `let` binding is never reassigned | Stage 3 |
| SJS-L002 | warning | lint | Prefer `let` or `const` over `var` | Stage 3 |
| SJS-L003 | warning | lint | Use `===` / `!==` — `==` / `!=` performs type coercion | Stage 3 |
| SJS-L004 | warning | lint | Prefer `for…of` over `for…in` for array and iterable iteration | Stage 3 |
| SJS-L005 | warning | lint | `debugger` statement found in committed code | Stage 3 |
| SJS-L006 | warning | lint | `match` expression has no arms | Stage 3 |
| SJS-L007 | warning | lint | Redundant match arm — variant is already handled | Stage 3 |
| SJS-L008 | warning | lint | Prefer an arrow function over a `function` expression callback | Stage 3 |
| SJS-L009 | warning | lint | Unused import — binding is never used | Stage 3 |
| SJS-L010 | warning | lint | Import out of order — sort imports by source | Stage 3 |
| SJS-L011 | error | security | BiDi control character rejected | Stage 1 |
| SJS-L012 | warning | lint | Unused declaration — binding is never used | Stage 3 |
| SJS-L013 | warning | lint | Explicit `dynamic` type — annotate precisely or opt out with `// @sjs:dynamic-ok` | Stage 3 |
| SJS-L014 | warning | lint | Binding shadows a name from an enclosing scope | Stage 3 |
| SJS-L015 | warning | lint | Floating promise — result not awaited, returned, or consumed | Stage 3 |

---

## Retired Codes

No codes have been retired yet.

> **Note:** Retired codes are listed here permanently to prevent accidental reuse. A retired code number is reserved forever and will never be reassigned to a different diagnostic.

---

## Adding New Codes

To add a new diagnostic code to the registry:

1. **Open a pull request** that adds the code to this file (`spec/error-codes.md`) before or alongside the implementation that emits it. The PR description must reference:
   - The owning stage (e.g., Stage 1, Stage 3).
   - The prototype or compiler issue/ticket that motivates the diagnostic.
2. **Choose the next available number** in the relevant category range. Do not skip numbers; gaps are reserved for codes that may be added later.
3. **Fill in all table columns**: code, severity, category, short message, and owning stage.
4. **Do not reuse** a number that appears anywhere in this file, including the Retired Codes section.
5. For **renaming** an existing code's short message or changing its semantic meaning, open a separate RFC. Renaming without an RFC is a breaking change.

> Formatter codes (`SJS-F`) follow the same process when the formatter (Stage 2) is introduced.
