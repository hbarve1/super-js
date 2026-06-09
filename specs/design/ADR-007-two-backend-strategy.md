# ADR-007 — Two active backends: Babel prototype and plain-JS compiler

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

A language toolchain needs a compiler backend — something that takes the type-checked AST and produces runnable output. Several distinct requirements pull in different directions:

- **Speed to working prototype:** The team needs a functional compiler quickly to validate the language spec against real programs, generate diagnostic fixtures, and test the type checker against examples.
- **Production distribution:** A production compiler must be self-contained, zero-dependency at runtime, and small enough to ship as a CLI tool without requiring users to install a large dependency tree.
- **Correctness guarantee:** With one backend, spec bugs may go undetected — the implementer's assumptions may diverge from the spec's intent. Two independent implementations checking against each other provide an automatic consistency check.
- **Native performance (future):** Eventually, compiling SJS to native code via LLVM is a goal for performance-sensitive workloads. But LLVM integration requires deep compiler infrastructure work that is not appropriate for early stages.

These requirements suggest different backends at different stages. The question is how many to maintain simultaneously and which to treat as authoritative.

## Decision

SJS maintains **two active backends in parallel** during Stages 0–2:

1. **`prototype/` — TypeScript + Babel** (reference implementation, current production CLI): The Babel-based prototype uses TypeScript Babel plugins to parse and transform `.sjs` files. It is the fastest path to a working compiler. It serves as the reference implementation that validates the language spec and drives the diagnostic fixture corpus. It is the current `superjs` CLI.

2. **`compiler/` — Plain JavaScript** (correctness-check backend): A second compiler written in plain JavaScript with no external runtime dependencies. It is compiled independently against the same spec and run against the same fixture corpus. Divergences between the two backends surface spec ambiguities and implementation bugs.

A third backend, **`llvm/` — C++/LLVM 17**, is planned for Stage 3+ (native performance, sub-50ms compile for typical files). It is not yet active as a production target.

## Rationale

1. **Prototype catches spec bugs early.** The Babel-based prototype is fast to write and fast to run. Writing it forces specification of every language construct concretely. Bugs in the spec surface as prototype behavior that conflicts with expectations — discovered before the production compiler is built.

2. **Plain-JS compiler validates the spec independently.** By implementing the same spec in plain JavaScript without Babel's parser infrastructure, the plain-JS compiler forces independent interpretation of the spec. Where the two backends agree, the spec is unambiguous. Where they diverge, the spec needs clarification. This is a form of cross-validation that a single implementation cannot provide.

3. **Zero-dependency production distribution.** The plain-JS compiler has no runtime dependencies — it ships as a self-contained CLI. Users do not need to install TypeScript, Babel, or any transformation toolchain. This is important for the `npm install -g superjs` distribution path and for embedding in build systems that minimize their dependency footprint.

4. **Determinism check in CI.** Both backends are run against the same golden-fixture corpus on every CI run. A determinism check (`build twice, diff -r`) verifies that each backend produces identical output across builds. The two-backend cross-check is a superset of this: it verifies both backends agree with each other on every fixture.

5. **LLVM deferred until stable spec.** LLVM IR generation requires the language spec to be stable enough that the IR encoding of every construct is settled. Beginning LLVM work before sum types, null safety, and the type system are proven out via the two JS backends would mean rewriting the LLVM backend as the spec evolves. The staged approach: JS backends first, LLVM after Stage 2 exits.

6. **Prototype is the CLI today; plain-JS will replace it.** The Babel prototype is the `superjs` command users install. As the plain-JS compiler reaches feature parity (Stage 2), it becomes the production CLI and the Babel prototype is retired. The transition is smooth because both compile the same fixture corpus.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Single Babel prototype only | No cross-validation; spec bugs survive undetected until users report them. Babel dependency makes distribution heavier. |
| Single plain-JS compiler from the start | Writing a production-quality compiler from scratch is slower than iterating on a Babel prototype. The time-to-working-language would significantly delay spec validation. |
| Start with LLVM backend immediately | LLVM requires a stable AST, stable type representation, and a mature spec. Starting with LLVM before the spec is proven means constant churn in IR generation as language decisions evolve. |
| TypeScript compiler API as the backend | The TypeScript compiler API would provide a free parser but would tightly couple SJS to TypeScript's AST and type system — including TypeScript's banned constructs. Independence from TypeScript's internals is a design goal. |
| Transpile SJS → TypeScript → JS | Would require maintaining TypeScript compatibility for all SJS constructs. Sum types, `dynamic`, and `match` have no TypeScript equivalent, forcing encoding hacks. Debugging would show TypeScript output rather than SJS source. |

## Consequences

**Easier:** Spec bugs are caught by backend divergence before user-facing releases. Production distribution is zero-dep. The two-backend model creates a forcing function for spec precision — any ambiguous spec text will produce divergent behavior that must be resolved.

**Harder:** Maintaining two backends doubles the implementation work for every language feature. Every spec change must be implemented in both. CI must run both backends' full fixture suites. The team accepts this cost explicitly because correctness is Principle 2 ("Correctness over performance").

**Off the table:** Shipping only the Babel prototype as a permanent production compiler (too heavy, too TypeScript-coupled). Skipping the plain-JS compiler and going directly to LLVM (too risky without proven spec stability).

## Related

- `specs/mission.md` — Backends table, "Correctness over performance" principle
- `specs/roadmap/stage-0-foundations.md` — Stage 0 foundation work; CI determinism check
- `specs/design/superjs-prototype-design.md` — Babel prototype architecture details
- RFC-0003 (`rfcs/0003-sum-type-tag-representation.md`) — encoding that both backends must implement identically
