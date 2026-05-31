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

---

## Warning Codes (SJS-W001–W099)

These codes are emitted by the type checker or compiler pipeline for conditions that are not hard errors but likely indicate problems. Codes marked **Stage 0 (prototype)** are already emitted by the current prototype.

| Code | Severity | Category | Short Message | Owning Stage |
|------|----------|----------|---------------|--------------|
| SJS-W001 | warning | strict | Parameter or variable has implicit type `dynamic` (strict mode) | Stage 0 (prototype) |
| `SJS-W002` | — | reserved | Reserved for future use | — |
| SJS-W003 | warning | match | Unreachable match arm | Stage 1 |
| `SJS-W004` | — | reserved | Reserved for future use | — |
| SJS-W005 | warning | type-check | Circular value reference detected | Stage 1 |
| `SJS-W006` | — | reserved | Reserved for future use | — |
| `SJS-W007` | — | reserved | Reserved for future use | — |
| SJS-W008 | warning | api | Use of deprecated symbol | Stage 1 |
| `SJS-W009` | — | reserved | Reserved for future use | — |
| SJS-W010 | warning | lsp | LSP server memory pressure: usage exceeds budget | Stage 3 |
| `SJS-W011` | — | reserved | Reserved for future use | — |
| SJS-W012 | warning | security | Bidirectional Unicode codepoint in source file | Stage 1 |

---

## Lint Codes (SJS-L001–L099)

These codes are emitted by the SuperJS linter (Stage 3). Lint rules can be configured in the project's `superjs.config` file.

| Code | Severity | Category | Short Message | Owning Stage |
|------|----------|----------|---------------|--------------|
| SJS-L001 | warning | lint | `dynamic` value used without narrowing | Stage 3 |
| SJS-L002 | warning | lint | Function result is ignored (use `void` to suppress) | Stage 3 |
| SJS-L011 | error | lint | Bidirectional codepoint in identifier name | Stage 1 |

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
