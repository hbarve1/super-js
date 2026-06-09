# ADR-005 — `match` expression over `switch` for sum types

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

SJS introduces first-class sum types (`type Result<T,E> = Ok(T) | Err(E)`). Any language with sum types needs a principled way to branch on which variant a value holds and extract the payload. JavaScript's `switch` statement is the closest existing primitive, but it has three properties that make it problematic for sum types:

1. **Not exhaustive.** `switch` does not warn when a `case` is missing. Adding a new variant to a sum type will silently fall through to `default` (or produce `undefined`) without any compiler error.
2. **Statement, not expression.** `switch` cannot appear inline as a value. Extracting a value from a `switch` requires a `let` declaration and assignment in each arm — boilerplate that obscures intent.
3. **No structured payload binding.** `switch` cases must manually access payload fields via indexing (`result._0`, `rect.width`). There is no integrated destructuring or binding syntax.

SJS also needed to decide whether `match` compiles to `switch` internally or to a different construct, and what the fallback compilation target should be for the JS prototype backend.

## Decision

SJS introduces `match` as a new reserved keyword and expression form. `match` is:

- **An expression** — it produces a value and can appear anywhere an expression is valid.
- **Exhaustive by default** — if any variant of the matched sum type is not covered and no `default` arm is present, SJS-E007 is emitted at compile time.
- **Pattern-binding** — each arm binds payload fields into typed variables via destructuring syntax (`Ok(v)`, `Rect({ width, height })`).

The JS prototype backend compiles `match` to an immediately-invoked function expression (IIFE) containing a chain of `if` / `_tag ===` checks. A trailing `throw new Error("[SJS] Non-exhaustive match")` guards against impossible non-exhaustive paths at runtime (never reached for well-typed programs).

`switch` is still valid SJS syntax for non-sum-type use cases (e.g., branching on a string or number value). The spec recommends `match` for all sum type branching and uses `switch` only where exhaustiveness checking and pattern binding are not needed.

## Rationale

1. **Exhaustiveness is the primary motivation.** When a sum type gains a new variant, every `match` over that type that lacks a `default` arm becomes a compile error (SJS-E007). This is the key safety property: adding a variant to `Ok | Err | Loading` forces every call site to handle `Loading` explicitly. `switch` with `default` silently absorbs new variants.

2. **Expression form eliminates boilerplate.** Returning a value from a `match` is direct: `const label = match color { Red => "stop", Green => "go", ... }`. The equivalent `switch` requires declaring a `let label` before the switch, assigning in each case, and ensuring no arm forgets the assignment. `match` as expression matches how developers think: "what is the value for this case?"

3. **Integrated payload binding.** Pattern syntax (`Ok(v)`, `Rect({ width, height })`, `Node({ value: x, left: l })`) binds payload fields into typed, scoped variables in a single step. There is no need to access `result._0` or `rect.width` manually. Record field renaming (`{ left: l }`) is supported inline.

4. **IIFE compilation for expressions.** The JS prototype compiles `match` to an IIFE (`(() => { ... })()`). This preserves `match` as an expression in the output: it can appear as an initializer, return value, or argument without any syntactic transform. Modern JS engines optimize IIFEs; the LLVM backend compiles `match` directly to a `switch` on the integer tag, which is optimal.

5. **`default` arm for open-world cases.** `default` suppresses exhaustiveness checking for a specific `match`, allowing forward-compatible handling of sum types that may gain new variants. The binding pattern form (`other => ...`) is equivalent but introduces a binding for the unmatched value.

6. **Literal patterns for non-sum-type matching.** `match` also handles literal patterns (`0 => "zero"`, `"ok" => true`), making it usable for primitive branching as well. Exhaustiveness is not checked for literal patterns — it is only checked when the matched type is a known sum type.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Extend `switch` with exhaustiveness checking | `switch` is a statement; adding expression semantics retroactively would require significant JS syntax extension and would confuse JS developers expecting standard `switch` behavior. |
| Require `switch` with mandatory `default` | `default` silently absorbs new variants — exactly what we want to prevent. A mandatory `default` means no exhaustiveness guarantee at all. |
| Compile `match` to `switch` in JS output | `switch` is a statement, not an expression. Compiling an expression `match` to a statement `switch` would require lifting it out to a separate statement, complicating code generation and making the output harder to read. The IIFE form is cleaner and remains an expression. |
| Compile `match` to a nested ternary chain | Nested ternaries are unreadable and their evaluation order is subtle. The IIFE `if`-chain is structurally equivalent but readable and debuggable. |

## Consequences

**Easier:** Sum type refactoring is safe — adding a variant to a sum type causes compile-time errors at every non-default `match`, giving an explicit checklist of call sites to update. Pattern binding eliminates manual payload extraction. `match` as an expression integrates cleanly into functional patterns (`const x = match ...`).

**Harder:** Developers coming from JavaScript or TypeScript must learn that `switch` is no longer the idiomatic branching construct for discriminated unions. The `match` expression form — especially the trailing comma requirement on the last arm — has minor ergonomic learning curve.

**Off the table:** Using `switch` for sum type branching in idiomatic SJS code. The spec, formatter, and linter will guide developers toward `match` for sum types. `switch` is retained for primitive value branching only.

## Related

- `specs/language/003-match.md` — match expression syntax, semantics, exhaustiveness algorithm, JS/LLVM lowering
- `specs/language/040-control-flow.md` — `switch` statement semantics, SJS-W008 (implicit fallthrough)
- `specs/language/000-keywords.md` — §1 (`match` as SJS-new keyword)
- `specs/language/002-sum-types.md` — sum type syntax and variant constructors
