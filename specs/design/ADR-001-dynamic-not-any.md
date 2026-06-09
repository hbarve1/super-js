# ADR-001 — `dynamic` replaces `any`

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

TypeScript's `any` type disables all type checking for the value it annotates. A value of type `any` is assignable to every type and every type is assignable to `any`, with no diagnostic at any boundary. When `any` appears in a codebase it spreads silently: a function that returns `any` contaminates every downstream variable without emitting a single warning, even in the strictest TypeScript configuration.

SJS was designed to eliminate silent unsafety as a first principle ("No silent unsafety — every escape hatch is explicit and warned in strict mode"). The language also targets a native LLVM backend where `any` is fundamentally incompatible: the backend needs a concrete memory layout for every value, and `any` provides none.

At the same time, a realistic language must handle genuine unknowns: third-party libraries without type declarations, `JSON.parse` results, and incremental migration from untyped JavaScript. A language with no escape hatch at these boundaries would require fully typing all JS interop before compiling a single file — that is impractical.

The design challenge: provide an explicit, traceable escape hatch that does not silently propagate, warns developers when its use is inadvertent, and can be extended to carry runtime type information in the LLVM backend.

## Decision

`any` is banned in SJS (error SJS-E004). Its role is replaced by `dynamic`, a new reserved keyword and primitive type. `dynamic` participates in the type system through a *consistency relation* (`T ~ dynamic` for all `T`) rather than subtyping. It propagates through all operations — `dynamic.prop`, `dynamic(args)`, and `dynamic + x` all yield `dynamic`. Implicit `dynamic` (unannotated positions the compiler cannot infer) emits SJS-W001 in `--strict` mode.

## Rationale

The key distinction between `any` and `dynamic` is intentionality and traceability:

1. **Explicit vs. invisible.** `any` was TypeScript's implicit escape — enabled by default, spreading without warning. `dynamic` requires an explicit annotation (or triggers SJS-W001 when implicit in `--strict`). Developers who write `dynamic` are acknowledging a boundary, not silently avoiding the type system.

2. **Propagation preserves the boundary.** Because all operations on `dynamic` return `dynamic`, the boundary does not silently stop. A developer who receives a `dynamic` value cannot accidentally treat it as a typed value without an explicit narrowing step (e.g., `typeof val === "string"`).

3. **LLVM backend path.** The LLVM backend (Stage 3+) assigns `dynamic` a tagged-union representation (`{ i8 tag, [8 x i8] payload }`) with runtime dispatch for operations. `any` has no equivalent mapping to a concrete IR type. `dynamic`'s design anticipates this backend requirement from day one.

4. **`unknown` fills the "I will narrow before use" case.** SJS retains TypeScript's `unknown` as the safe top type — every type is a subtype of `unknown`, but operations on `unknown` without narrowing are compile errors. `dynamic` is for genuine interop boundaries where programmatic narrowing is deferred or impractical; `unknown` is for "I know I'll check before using."

5. **Consistency vs. subtyping.** `dynamic` uses a consistency relation (symmetric, non-transitive) rather than subtyping. This means `int ~ dynamic` and `dynamic ~ string` does NOT imply `int ~ string` — the type system does not silently widen through dynamic boundaries.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Keep `any` unchanged | Silent propagation defeats the core no-escape-hatch principle. Incompatible with LLVM backend memory layout requirements. |
| Keep `any`, add explicit-only annotation requirement | Still provides no runtime story for LLVM. `noImplicitAny`-style warnings alone would not structurally distinguish SJS from TypeScript strict mode. |
| Remove all escape hatches | Impractical for JS interop and incremental migration. Would require fully typing all third-party dependencies before compiling a single file. |
| Use `unknown` for everything | `unknown` requires narrowing before any operation. Existing JS interop commonly accesses properties and calls methods without first narrowing — `dynamic` allows this with tracked intent and explicit surface. |

## Consequences

**Easier:** Pinpointing all interop boundaries in a codebase is trivial — search for `dynamic`. The `--strict` flag promotes implicit `dynamic` to SJS-W001 warnings, giving teams a clear migration path toward full annotation. The LLVM backend can safely assume all non-`dynamic` values have a statically known layout.

**Harder:** Developers migrating from TypeScript must replace every `any` annotation with either `dynamic`, `unknown`, a union type, or a type parameter. This is mechanical but non-trivial in large codebases. The `as` cast from a `dynamic` source to a typed position still emits SJS-W002 in `--strict`, requiring explicit narrowing patterns.

**Off the table:** Re-introducing `any` as an alias, pragma opt-in, or transitional form. The spec and grammar permanently reserve `any` as a banned identifier (SJS-E004) to prevent future erosion of this invariant.

## Related

- `specs/language/004-dynamic.md` — full semantics, type rules, JS and LLVM lowering
- `specs/language/007-banned-features.md` — §1 (`any`)
- `specs/language/000-keywords.md` — §6 (banned keywords)
- `specs/language/001-null-safety.md` — interaction with null safety
- RFC-0001 (`rfcs/0001-no-any-introduce-dynamic.md`)
