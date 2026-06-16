# ADR-004 — Banned TypeScript constructs

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

SJS is a strict superset of JavaScript that adds static typing. TypeScript is the dominant typed-JS language and served as the primary reference for SJS's type system design. However, TypeScript accumulated a set of features — primarily in its type system — that are incompatible with SJS's goals:

- **Decidability:** SJS targets a type system that can be checked in a single linear pass, without approximation or depth limits. TypeScript's conditional types and mapped types make type checking Turing-complete, requiring depth-limit heuristics.
- **LLVM backend compatibility:** The native LLVM backend requires every value to have a statically known memory layout. Types that produce anonymous merged shapes (intersections, mapped types) cannot be assigned a stable layout.
- **No silent unsafety:** Several TypeScript constructs (`any`, `!`) allow developers to silently disable type safety without acknowledgment.
- **ECMAScript alignment:** Constructs like `enum` and `namespace` generate non-ECMAScript runtime artifacts that conflict with ES modules and cannot be tree-shaken.

## Decision

Twelve TypeScript constructs are permanently banned in SJS. They are rejected at parse time or type-check time with no pragma, flag, or escape hatch to allow them:

| Construct | Error code | Category |
|-----------|-----------|----------|
| `any` type | SJS-E004 | Silent unsafety |
| `x!` non-null assertion | SJS-E011 | Silent unsafety |
| `enum` declaration | SJS-E010 | Non-ECMAScript runtime artifact |
| `namespace` declaration | SJS-E012 | Non-ECMAScript runtime artifact |
| `A & B` intersection types | SJS-E005 | Undecidable / no stable layout |
| `T extends U ? A : B` conditional types | SJS-E008 | Turing-complete type system |
| `{ [K in keyof T]: ... }` mapped types | SJS-E006 | Requires key enumeration; no stable layout |
| `infer` keyword | SJS-E009 | Only valid inside banned conditional types |
| `T['key']` indexed access types | SJS-E006 | Dependent types; blocks static layout |
| `typeof x` in type position | SJS-E006 | Structural inference bypass |
| `<T>expr` angle-bracket cast | Parse error | JSX ambiguity |
| `==` / `!=` abstract equality | SJS-L003 (lint) | Coercion-based; error in `--strict` |

## Rationale per construct

**`any` (SJS-E004):** Silent hole in the type system. Spreads without warning. No memory layout for LLVM. Replaced by `dynamic` (see ADR-001).

**`x!` non-null assertion (SJS-E011):** A pure compile-time lie — the programmer asserts `x` is non-null but the runtime makes no check. If `x` is actually `null`, the program proceeds with a null value typed as non-null, causing unpredictable failures downstream. SJS's null safety model (see ADR-006) requires explicit narrowing instead.

**`enum` (SJS-E010):** Not an ECMAScript construct. TypeScript `enum` compiles to a self-executing function that creates a mutable object with a reverse mapping (`Direction[0] === "Up"`). This is not tree-shakeable, generates unexpected runtime overhead, and has no sensible LLVM representation. Sum types with unit variants or string literal unions are the SJS equivalents.

**`namespace` (SJS-E012):** TypeScript's pre-ES-module bundling mechanism. Compiles to an IIFE that mutates a shared object. Conflicts with the ES module system that SJS uses (`import`/`export`). No valid LLVM representation. Replaced by ES modules and barrel files.

**`A & B` intersection types (SJS-E005):** Can produce unverifiable merged shapes (e.g., `{ x: string } & { x: number }` produces `{ x: never }`). Anonymous merged types have no stable name or declared layout, blocking LLVM monomorphization. `type C extends A, B {}` is the named, declared alternative.

**Conditional types `T extends U ? A : B` (SJS-E008):** Make the type system Turing-complete. TypeScript uses depth-limit heuristics to avoid non-termination. SJS targets decidable single-pass type checking. Explicit overloads or union return types are the alternatives.

**Mapped types `{ [K in keyof T]: ... }` (SJS-E006):** Require the compiler to enumerate a type's keys at type-check time as first-class type-level values. Produce anonymous derived types with no stable identity or layout. Incompatible with struct layout determination for LLVM.

**`infer` (SJS-E009):** Only exists inside conditional types, which are banned. No valid standalone use.

**Indexed access `T['key']` (SJS-E006):** Creates a dependent type — a type that depends on a string value. The general form (where the key is not a literal) is undecidable. Even the literal-key form is banned for consistency and because it enables composition with banned `keyof`/mapped types.

**`typeof x` in type position (SJS-E006):** Couples type identities to value shapes via inference, bypassing forward declarations. Can produce complex anonymous types equivalent to banned mapped/conditional results.

**`<T>expr` angle-bracket cast (Parse error):** Ambiguous with JSX syntax. Rather than require a JSX-mode flag, the angle-bracket form is banned universally. `expr as T` is the only cast syntax.

**`==` / `!=` abstract equality (SJS-L003):** Type-coercion comparisons are a persistent source of bugs (`null == undefined` being true is a common footgun). Promoted to an error in `--strict`. `===` and `!==` are always preferred.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Ban by lint rule rather than compiler error | Hard errors are necessary for constructs that block LLVM code generation. Lint rules can be silenced; compiler errors cannot. |
| Allow banned constructs behind a `// @sjs-allow` pragma | Creates a two-tier safety model that erodes the no-escape-hatch guarantee. The LLVM backend still cannot handle them even with a pragma. |
| Subset to just the "dangerous" bans (`any`, `!`) | Conditional/mapped types and intersections would block the native backend. Partial banning creates an inconsistent mental model. |
| Remove enum/namespace at lint level only | They generate runtime artifacts incompatible with ES module bundlers. Hard rejection prevents surprising build output. |

## Consequences

**Easier:** The SJS type system is decidable and can be type-checked in a single pass with no heuristics. Every value in a non-`dynamic` program has a statically known layout. Codebase-wide invariants are enforced structurally — no pragma can disable them.

**Harder:** Migrating TypeScript code to SJS requires replacing or removing all twelve construct categories. This is the primary porting cost. Tooling (a `ts-to-sjs` codemod) is planned to automate the mechanical cases.

**Off the table:** Any re-admission of these constructs in any form, including behind flags, pragmas, or version specifiers. The error codes and banned-keyword list in the grammar are permanently reserved.

## Related

- `specs/language/007-banned-features.md` — normative reference with before/after examples per construct
- `specs/language/000-keywords.md` — §6 (banned keywords), §8 (banned operator forms)
- ADR-001 — `dynamic` replaces `any`
- ADR-006 — null safety model (replaces `!`)
- RFC-0002 (`rfcs/0002-ban-complex-types.md`)
