> **Archived feedback — no longer actionable.** Superseded by `specs/roadmap/`. Read-only reference.

# Plan Critique: SuperJS Production Roadmap (Round 2)

**Critique date:** 2026-05-30
**Plan critiqued:** `2026-05-30-superjs-production-roadmap.md` (v2, ~1,714 lines)
**Reviewer stance:** Modularity-and-staging focused. Round 1 was about content gaps; round 2 is about structural gaps.

---

## Summary

The round-2 plan is content-complete: the bootstrapping problem is named, the interop strategy is concrete, the bidirectional checker is committed, the LSP memory budget is real. The problem now is shape. It is one 1,700-line monolith that conflates four orthogonal organising schemes (compiler-phase, sprint, priority-tier, definition-of-done), with no clean stage boundaries, no shippable per-stage deliverables, and no per-stage gate criteria. As written, the plan cannot be parallelised, cannot be reviewed incrementally, and cannot be tracked against itself.

---

## The Eight Modularity / Staging Problems

1. **No stage gates.** What must be true before "Sprint 5" or "LSP work" can start? The plan never says. A reader cannot derive an entry condition for any unit of work.
2. **No independently shippable stage.** Every section depends on every other. Nothing in the plan produces a user-visible artifact on its own — even the playground assumes the compiler, stdlib, and wrappers all exist.
3. **Implicit cross-stage dependencies.** The LSP needs `typeAt(file, line, col)` from the checker. Codegen needs the AST shape from the parser. Bootstrapping needs Layer-0 types from the compiler. None of these are stated as contracts; they are buried in narrative.
4. **Risks lumped at the end (§17).** Twenty risks listed once, far from the work they pertain to. A reader executing Sprint 4 has to scroll back to §17 to learn Sprint 4 is the highest-risk sprint of the roadmap. Risks belong with the work.
5. **Sprint plan and section structure are two organisations.** §15 enumerates 17 sprints; §§1–14 organise by topic (language, compiler, interop, DX, stdlib, …). They never cross-reference. Sprint 6 ships "LSP M1" but §5.1 lists LSP M1 methods without saying "sprint 6". Topics and sprints must collapse into one structure.
6. **Interop contradiction.** §3 says "interop is the product, priority #1" — yet interop cannot start until the Phase 2 compiler is parsing and type-checking. The plan's own sequencing puts interop in Sprint 4. Either the framing is wrong ("interop is priority #1") or the staging is wrong (interop should be Sprint 0). Resolution: interop is the **#1 product priority** but the **#2 staging priority**. Stage it after compiler core. Say so explicitly.
7. **"Phase 2" overloaded.** "Phase 2" is used for (a) the custom compiler milestone, (b) the v1.0 product release, and (c) the testing-via-Jest era. Three meanings, same label. Pick disjoint terms (Stage = compiler/product unit; Phase = legacy term, retired).
8. **No foundations stage.** Repo layout, grammar spec file, error-code registry, CI baseline, diagnostic JSON schema, and shared types (AST, Span, Diagnostic) must exist before anyone can do any other work. The plan scatters these across Sprint 0, §4.5, §4.8, Appendix A, and §11.7 — never as one coherent foundations milestone.

## New Gaps Spotted on Re-read

- **`@superjs/std-*` package split (§8.1) contradicts §2.2 import path `@superjs/std/core`.** Either the package is `@superjs/std` with subpaths, or it is `@superjs/std-core` etc. The plan ships both spellings. Pick one in Stage 0.
- **No spec source-of-truth lifecycle.** §11 says spec freezes 8 weeks before 1.0. But the grammar file is owned by §1.1 and the diagnostic schema by §4.5 and errors by §9.2. There is no single owner for "the spec" before freeze.
- **Beta-program acceptance criteria undefined.** §1.10 says "3 friendly teams, ≥ 1k LOC SJS each, by week 24." Recruitment process, contract, and what counts as "production-like" use is unstated. Belongs in Stage 6.
- **Determinism CI is mentioned twice (§1.2, §4.8) but never staged.** Belongs in Stage 0 (infrastructure) with the assertion added in Stage 1 (when codegen exists).
- **No prototype-retirement plan.** `prototype/` lives until Phase 2 ships (Appendix A), but no stage says "delete prototype/ on this date" or "freeze prototype/ now." Stage 1 should own this.

## Corrected Stage Ordering

The right structure is six stages plus a foundation. Each is independently shippable and gates the next.

```
Stage 0 — Foundations            (4 weeks)   no deps; unlocks everything
Stage 1 — Compiler Core         (12 weeks)   needs Stage 0
Stage 2 — JS/TS Interop          (8 weeks)   needs Stage 1 (stable compiler API)
Stage 3 — DX Tools               (8 weeks)   needs Stage 1 (typeAt API)
Stage 4 — Standard Library       (6 weeks)   needs Stage 1 (bootstrap mode)
Stage 5 — Ecosystem              (6 weeks)   needs Stages 2 + 4
Stage 6 — Stability & Launch     (6 weeks)   needs all previous
```

Stages 2, 3, and 4 are parallelisable once Stage 1 ships. That is the only parallelism the plan can credibly claim with one maintainer + one or two co-maintainers, and it is enough to compress 50 calendar weeks of serial work into ~36 weeks of parallel work.

Each stage produces a user-visible artefact: Stage 1 = `superjs build` self-hosted on the new compiler; Stage 2 = `superjs add react` works; Stage 3 = VS Code extension on Marketplace; Stage 4 = `npm install @superjs/std-core`; Stage 5 = Vite plugin published; Stage 6 = 1.0 GA. Each can be reviewed, demoed, and committed independently.

---

*~390 words. Round 2 critique complete.*
