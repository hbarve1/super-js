# ADR-002 — Structural object types without `implements`

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Addendum — 2026-06-16: `interface` keyword merged into `type`

As of this change, the structural-typing model described below is **unchanged**, but the
`interface` keyword has been removed and folded into `type`. What was an `interface`
declaration is now the **brace form** of `type` (keyword swapped, no `=`):
`type X { … }` and `type X extends A, B { … }`. The alias form (`type Id = string`)
is unchanged. Using the `interface` keyword is now a parse error (SJS-P001). Everywhere
this ADR says "interface", read "object type" (a `type` brace-form declaration); everywhere
it shows `interface C extends A, B {}`, read `type C extends A, B {}`. The rest of the ADR's
rationale — structural conformance, no `implements`, `extends` as the combination mechanism
in place of banned `A & B` — still holds in full.

## Context

TypeScript and Java both support `implements` — an explicit declaration on a class that it satisfies a named object type. This is a form of nominal tracking: conformance is recorded at the class definition site and checked there. The alternative, used by Go, is structural typing: a class satisfies an object type if it provides all required members with compatible types, checked at each use site where the object type is expected.

Both approaches have tradeoffs. Nominal `implements` makes intent explicit and produces errors at the class definition rather than at dispersed call sites. Structural typing eliminates boilerplate, enables retroactive satisfaction of object types (a class can satisfy an object type declared after the class), and decouples class hierarchies from object-type hierarchies.

SJS needed to choose one model as the baseline and document why.

## Decision

SJS uses **structural typing** for object types, Go-style. A class or object satisfies an object type if it structurally provides all required members with compatible types. The `implements` keyword is not part of the SJS grammar — its presence is a parse error. Conformance is checked implicitly at every use site where an object type appears as the expected type.

Object-type extension (`type C extends A, B {}`) is the mechanism for combining multiple object types into a named type. This produces a declared, named object type that compilers and tools can reason about — unlike TypeScript intersection types (`A & B`), which are anonymous and banned in SJS (see ADR-004).

## Rationale

1. **No boilerplate on class definitions.** Classes in SJS do not need to list which object types they satisfy. A `Circle` class with a `draw(): void` method automatically satisfies `Drawable` without any annotation. This is especially valuable when a class satisfies many object types, or when it satisfies object types that were written after the class.

2. **Retroactive conformance.** Structural typing allows a class to satisfy a new object type without editing the class. This is critical for interop — a value from a third-party library can satisfy a locally-defined object type without a wrapper.

3. **Eliminates `implements` drift.** With nominal `implements`, a class that removes a method no longer satisfies the object type — but the error appears on the class declaration, not at the use site. The compiler catches this either way; structural typing just avoids the redundant annotation.

4. **Consistent with JS semantics.** JavaScript itself is structurally typed — "duck typing" is the norm. The SJS structural object-type model aligns with how JS programmers already reason about values. The compiled output exploits this directly: object types are fully erased at compile time, and the JS runtime's duck typing is the actual conformance mechanism.

5. **LLVM target supports direct call resolution.** When the concrete type at a call site is statically known (the common case, via monomorphization), the LLVM backend resolves object-type method calls to direct function calls — no vtable needed. Structural checking is done entirely at the type-checker level before IR generation.

6. **`type … extends` as the combination mechanism.** Rather than intersection types (`A & B`), SJS uses named object-type extension (`type C extends A, B {}`) for combining object types. This gives the result a stable declared name, a fixed layout, and a location in the source for error reporting.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Require `implements` (Java/TypeScript nominal style) | Introduces boilerplate; prevents retroactive conformance; couples class definitions to object types. Conflicts with SJS's JS-aligned design. |
| Allow `implements` as optional annotation | Creates two conformance mechanisms; tools must handle both. `implements` as optional hint adds complexity without safety benefit — errors would still be caught structurally at use sites regardless. |
| Use `A & B` intersection types for object-type combination | Intersection types are banned (SJS-E005) because they produce anonymous merged types with no stable name or layout, which blocks LLVM monomorphization. `type … extends` is the named, declared alternative. |
| Nominal sum types only, structural everywhere else | Sum types are already nominally typed in SJS (two structurally identical sum type declarations are distinct types). Mixing models for the same construct (object types) would be confusing. The object-type model is uniformly structural. |

## Consequences

**Easier:** Class definitions are concise — no `implements` lists to maintain. Retroactive object-type satisfaction enables lightweight adapter patterns. Object-type libraries can evolve without touching class code.

**Harder:** It is not immediately obvious from a class definition which object types it satisfies. IDEs and language servers need to actively surface this (e.g., "this class satisfies Drawable, Serializable") rather than it being readable from source. The SJS LSP server is expected to provide this.

**Off the table:** `implements` as a keyword. The grammar explicitly lists it as a parse error to prevent confusion with TypeScript code being pasted into `.sjs` files.

## Related

- `specs/language/006-interfaces.md` — full object-type (`type` brace form) syntax, type rules, JS and LLVM lowering
- `specs/language/000-keywords.md` — §4 (TypeScript-borrowed active keywords) and §4 note on `implements`
- ADR-004 — banning `A & B` intersection types (the alternative to `type … extends`)
