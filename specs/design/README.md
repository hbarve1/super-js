# specs/design — Architecture and Design Documents

This directory contains architecture decision records (ADRs) and design documents for the SuperJS compiler toolchain. Read `specs/mission.md` first for the project overview and guiding principles.

---

## Architecture Decision Records

ADRs document the *why* behind key design choices — the constraints considered, alternatives rejected, and consequences accepted. They are written after a decision is made and serve as institutional memory for future developers and agents.

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-dynamic-not-any.md) | `dynamic` replaces `any` | Accepted |
| [ADR-002](ADR-002-structural-interfaces.md) | Structural interfaces without `implements` | Accepted |
| [ADR-003](ADR-003-sum-type-runtime-encoding.md) | Sum type runtime encoding as `{ _tag, _0, ... }` | Accepted |
| [ADR-004](ADR-004-banned-ts-constructs.md) | Banned TypeScript constructs | Accepted |
| [ADR-005](ADR-005-match-over-switch.md) | `match` expression over `switch` for sum types | Accepted |
| [ADR-006](ADR-006-null-safety-model.md) | Null safety model: non-nullable by default, no `!` | Accepted |
| [ADR-007](ADR-007-two-backend-strategy.md) | Two active backends: Babel prototype and plain-JS compiler | Accepted |

### ADR Quick Reference

**ADR-001 — `dynamic` not `any`**  
`any` is permanently banned (SJS-E004). The `dynamic` keyword is the explicit, traceable escape hatch for interop boundaries. It propagates through operations and emits SJS-W001 on implicit use in `--strict` mode.

**ADR-002 — Structural interfaces**  
Go-style structural conformance: no `implements` keyword. A class satisfies an interface if it provides all required members. Conformance is checked at use sites, not class definitions. Interface combination uses `extends`, not `A & B`.

**ADR-003 — Sum type encoding**  
Sum type values are plain JS objects: `{ _tag: "VariantName", _0: payload }` for tuple variants, named fields for record variants, tag-only for unit variants. `_tag` is always first (hidden-class optimization). Constructors inline to object literals.

**ADR-004 — Banned TS constructs**  
Twelve TypeScript constructs are permanently banned: `any`, `!`, `enum`, `namespace`, `A & B`, conditional types, mapped types, `infer`, indexed access, `typeof` in type position, angle-bracket cast, and `==`/`!=`. Each has a specific error code and a documented SJS alternative.

**ADR-005 — `match` over `switch`**  
`match` is an expression (not a statement), exhaustive by default (SJS-E007 on missing variants), with integrated payload binding. Compiles to an IIFE `if`-chain in the JS backend. `switch` is still valid for non-sum-type branching.

**ADR-006 — Null safety**  
Every type `T` is non-nullable. `T?` desugars to `T | null` (not `T | null | undefined`). No `!` operator. Narrowing via `if` check, `?.`, `??`, or `match` is the only way to eliminate null from a type.

**ADR-007 — Two-backend strategy**  
Two active backends: `prototype/` (TypeScript + Babel, current CLI) and `compiler/` (plain JS, correctness check). They cross-validate against the same fixture corpus. An LLVM backend is planned for Stage 3+. The plain-JS compiler is the production target; the Babel prototype will be retired at Stage 2.

---

## Design Documents

Design documents capture implementation decisions for specific subsystems or features. They are broader than ADRs and may cover multiple related decisions.

| Document | Topic | Date |
|----------|-------|------|
| [superjs-prototype-design.md](superjs-prototype-design.md) | Babel prototype architecture: parser, type-checker, code generation | 2026-05-30 |
| [git-workflow.md](git-workflow.md) | Branch model, PR workflow, worktree conventions | — |
| [compiler-mindmap.md](compiler-mindmap.md) | Compiler architecture overview (mindmap) | — |
| [website-design.md](website-design.md) | Next.js marketing site and playground design | 2026-05-31 |
| [website-polish-design.md](website-polish-design.md) | Website polish pass design spec | 2026-06-01 |

---

## Writing a New ADR

When a significant design decision is made, document it here. Use this template:

```markdown
# ADR-NNN — Title

**Status:** Accepted | Superseded by ADR-NNN | Deprecated  
**Date:** YYYY-MM-DD  
**Deciders:** SuperJS core team

## Context
What problem were we solving? What were the constraints?

## Decision
What we decided.

## Rationale
Why this choice over alternatives. The key tradeoffs.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| ...         | ...          |

## Consequences
What becomes easier. What becomes harder. What is now off the table.

## Related
Links to relevant spec files.
```

Number ADRs sequentially (`ADR-008`, `ADR-009`, …). Once merged, an ADR is immutable — it may be superseded by a newer ADR but is never edited in place.

---

## Related

- `specs/mission.md` — Project goal, principles, key language facts
- `specs/language/` — Language feature specifications (the *what*)
- `specs/roadmap/` — Stage-by-stage delivery plans
- `specs/features/` — Per-feature implementation specs
