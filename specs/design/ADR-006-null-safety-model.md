# ADR-006 — Null safety model: non-nullable by default, no `!`

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

JavaScript's `null` and `undefined` are the source of the most common class of runtime errors in the language — "TypeError: Cannot read properties of null" and its variants. Tony Hoare famously called the introduction of null a "billion dollar mistake." TypeScript addressed this with `strictNullChecks`, but only as an opt-in flag, and it retained the `!` non-null assertion operator as an escape hatch.

SJS needed a null safety policy that is:
1. **Non-negotiable** — not a compiler flag. Every SJS program has null safety.
2. **Explicit** — nullable types must be opted into; they do not appear silently.
3. **Without a silent override** — the `!` operator in TypeScript allows programmers to disable null checking with a single character, without any runtime guard. This is incompatible with a safety-first language.
4. **Aligned with ECMAScript** — `null` and `undefined` are distinct values with distinct purposes in JS; the model should not conflate them.

## Decision

Every type `T` in SJS is **non-nullable by default**. The value `null` is not a member of any non-nullable type. Assigning `null` to a `string`, `number`, or any interface type is a compile error (SJS-E001).

**Nullable shorthand:** `T?` desugars to the union `T | null`. `undefined` is NOT included by `T?` — to include both, write `T | null | undefined` explicitly. This keeps `null` and `undefined` semantically distinct.

**Optional properties and parameters:** `prop?: T` on an interface/object means `T | undefined` (the property may be absent). `param?: T` on a function parameter means the argument may be omitted; inside the body, `param` has type `T | undefined`.

**No `!` operator:** The non-null assertion postfix `x!` is banned (SJS-E011). There is no compile-time-only assertion that discards null without a runtime check.

**Narrowing mechanisms:** Null can be eliminated from a type only by explicit narrowing: an `if (x !== null)` check, optional chaining `?.`, nullish coalescing `??`, an early return guard, or a `match` arm. After narrowing, the compiler tracks that the value is non-null in the relevant scope.

## Rationale

1. **Non-nullable by default is the only coherent null safety model.** If nullable is the default (as in TypeScript without `strictNullChecks`), every type annotation silently includes null and the type annotations provide no null safety information. The model only works if `T` strictly means "non-null T" and `T?` means "T or null." SJS adopts this and makes it non-optional — there is no `--no-null-checks` flag.

2. **`T?` means `T | null`, not `T | null | undefined`.** JavaScript distinguishes `null` (intentional absence, programmer-set) from `undefined` (uninitialized, property-absent, omitted argument). Conflating them into a single nullable type loses this signal. `T?` specifically means the programmer has acknowledged that `null` is a valid value; `undefined` requires explicit opt-in. This forces intentional handling of both cases when both are possible.

3. **Banning `!` closes the most-abused TypeScript escape hatch.** TypeScript's `!` operator is a runtime-free assertion: `x!` is a compile-time claim that `x` is not null, with no generated code to verify this. When `x` is actually null at runtime, the program proceeds with a null value typed as non-null — the exact scenario null safety exists to prevent. By banning `!` entirely, SJS ensures that every null elimination goes through a verifiable narrowing step.

4. **Narrowing via `?.` and `??` is idiomatic and safe.** Optional chaining (`a?.b`) and nullish coalescing (`a ?? fallback`) are ECMAScript 2020 features that provide ergonomic null handling without unsafe assertions. `a?.b` produces `U | undefined` when `a: T?` (explicitly signaling the short-circuit path). `a ?? b` eliminates `null | undefined` from the left side by providing a fallback. These are the idiomatic SJS null-handling patterns.

5. **LLVM representation is zero-overhead for non-nullable types.** Non-nullable types compile to bare values in the LLVM backend — no null tag, no pointer check, no indirection. Nullable `T?` compiles to a tagged union `{ i1 hasValue, T value }` (or a null pointer for reference types). The non-nullable-by-default model maximizes the fraction of values that benefit from zero-overhead representation.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| `strictNullChecks` as an opt-in flag | Creates a two-tier language. Code without the flag is unanalyzable for null safety. SJS's guarantee is unconditional. |
| `T?` includes both `null` and `undefined` (Kotlin style) | Conflates intentional absence (`null`) with uninitialized/omitted (`undefined`). Loses the semantic distinction that JS developers already understand. |
| Allow `!` with a runtime check emitted | Would change the semantics of `!` from TypeScript's (which is compile-time only) but would add overhead. More importantly, it would create a SJS-specific `!` behavior that confuses TypeScript migrants. The right pattern is explicit `if` guards or `??` — `!` in any form should not exist. |
| Use `Option<T>` sum type instead of nullable shorthand | Forces all null handling through `match`, which is verbose for the extremely common "return null when not found" pattern. `T?` as built-in nullable is more ergonomic. Libraries may still provide `Option<T>` sum types for explicit functional-style handling; the nullable shorthand is complementary. |

## Consequences

**Easier:** Null pointer exceptions are impossible in fully-typed SJS code. The type checker statically proves that every property access, method call, and function invocation on a non-nullable value is safe. LLVM backend generates optimal code for non-nullable types (no null checks at call sites).

**Harder:** TypeScript code with pervasive `x!` assertions requires replacing each assertion with an explicit null check, `?.` chain, or `??` fallback. This is the primary null-safety porting cost. The effort is roughly proportional to how much TypeScript code relied on `!` to suppress errors rather than actually handling null.

**Off the table:** The `!` operator in any form. Per-file or per-project opt-out of null safety. Adding `undefined` to `T?` — the `T | null` desugaring is fixed and documented.

## Related

- `specs/language/001-null-safety.md` — full null safety semantics, type rules, JS and LLVM lowering
- `specs/language/007-banned-features.md` — §2 (`!` non-null assertion)
- `specs/language/000-keywords.md` — §8 (banned operator forms — `x!`)
- ADR-004 — the full set of banned TypeScript constructs
