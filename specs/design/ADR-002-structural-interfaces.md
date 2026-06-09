# ADR-002 — Structural interfaces without `implements`

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

TypeScript and Java both support `implements` — an explicit declaration on a class that it satisfies a named interface. This is a form of nominal tracking: conformance is recorded at the class definition site and checked there. The alternative, used by Go, is structural typing: a class satisfies an interface if it provides all required members with compatible types, checked at each use site where the interface type is expected.

Both approaches have tradeoffs. Nominal `implements` makes intent explicit and produces errors at the class definition rather than at dispersed call sites. Structural typing eliminates boilerplate, enables retroactive satisfaction of interfaces (a class can satisfy an interface declared after the class), and decouples class hierarchies from interface hierarchies.

SJS needed to choose one model as the baseline and document why.

## Decision

SJS uses **structural typing** for interfaces, Go-style. A class or object satisfies an interface if it structurally provides all required members with compatible types. The `implements` keyword is not part of the SJS grammar — its presence is a parse error. Conformance is checked implicitly at every use site where an interface type appears as the expected type.

Interface extension (`interface C extends A, B {}`) is the mechanism for combining multiple interfaces into a named type. This produces a declared, named interface that compilers and tools can reason about — unlike TypeScript intersection types (`A & B`), which are anonymous and banned in SJS (see ADR-004).

## Rationale

1. **No boilerplate on class definitions.** Classes in SJS do not need to list which interfaces they satisfy. A `Circle` class with a `draw(): void` method automatically satisfies `Drawable` without any annotation. This is especially valuable when a class satisfies many interfaces, or when it satisfies interfaces that were written after the class.

2. **Retroactive conformance.** Structural typing allows a class to satisfy a new interface without editing the class. This is critical for interop — a value from a third-party library can satisfy a locally-defined interface without a wrapper.

3. **Eliminates `implements` drift.** With nominal `implements`, a class that removes a method no longer satisfies the interface — but the error appears on the class declaration, not at the use site. The compiler catches this either way; structural typing just avoids the redundant annotation.

4. **Consistent with JS semantics.** JavaScript itself is structurally typed — "duck typing" is the norm. The SJS structural interface model aligns with how JS programmers already reason about values. The compiled output exploits this directly: interfaces are fully erased at compile time, and the JS runtime's duck typing is the actual conformance mechanism.

5. **LLVM target supports direct call resolution.** When the concrete type at a call site is statically known (the common case, via monomorphization), the LLVM backend resolves interface method calls to direct function calls — no vtable needed. Structural checking is done entirely at the type-checker level before IR generation.

6. **`interface extends` as the combination mechanism.** Rather than intersection types (`A & B`), SJS uses named interface extension for combining interfaces. This gives the result a stable declared name, a fixed layout, and a location in the source for error reporting.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Require `implements` (Java/TypeScript nominal style) | Introduces boilerplate; prevents retroactive conformance; couples class definitions to interfaces. Conflicts with SJS's JS-aligned design. |
| Allow `implements` as optional annotation | Creates two conformance mechanisms; tools must handle both. `implements` as optional hint adds complexity without safety benefit — errors would still be caught structurally at use sites regardless. |
| Use `A & B` intersection types for interface combination | Intersection types are banned (SJS-E005) because they produce anonymous merged types with no stable name or layout, which blocks LLVM monomorphization. `interface extends` is the named, declared alternative. |
| Nominal sum types only, structural everywhere else | Sum types are already nominally typed in SJS (two structurally identical sum type declarations are distinct types). Mixing models for the same construct (interfaces) would be confusing. The interface model is uniformly structural. |

## Consequences

**Easier:** Class definitions are concise — no `implements` lists to maintain. Retroactive interface satisfaction enables lightweight adapter patterns. Interface libraries can evolve without touching class code.

**Harder:** It is not immediately obvious from a class definition which interfaces it satisfies. IDEs and language servers need to actively surface this (e.g., "this class satisfies Drawable, Serializable") rather than it being readable from source. The SJS LSP server is expected to provide this.

**Off the table:** `implements` as a keyword. The grammar explicitly lists it as a parse error to prevent confusion with TypeScript code being pasted into `.sjs` files.

## Related

- `specs/language/006-interfaces.md` — full interface syntax, type rules, JS and LLVM lowering
- `specs/language/000-keywords.md` — §4 (TypeScript-borrowed active keywords — `interface`) and §4 note on `implements`
- ADR-004 — banning `A & B` intersection types (the alternative to `interface extends`)
