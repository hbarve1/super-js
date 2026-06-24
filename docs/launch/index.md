---
title: Launch drafts
sidebar_position: 1
description: Draft posts for HN, lobste.rs, and r/typescript — edit before publishing at GA.
section: launch
---

# Launch announcement drafts

**Do not publish until `superjs@1.0.0` GA.** Edit URLs and version numbers before posting.

## Show HN (draft)

**Title:** Show HN: SuperJS – a sound superset of JS with sum types (not TypeScript++

**Body:**

We built SuperJS (SJS) — a strict superset of JavaScript with a hand-written compiler (no Babel/tsc at runtime). It's designed for teams who want null safety and algebraic types without TypeScript's unsound escape hatches (`any`, intersections, conditional types).

What's in 1.0:
- Sound null safety, sum types, exhaustive `match`
- CLI + LSP + VS Code extension
- 20-lesson tour, migration guide, 30 `@superjs/types-*` wrappers
- Playground with server-side compile+run

Bench on ~14k LOC: cold compile ~81ms vs tsc typecheck ~721ms (not apples-to-apples — we codegen too).

Try: https://superjs.org/playground  
Docs: https://superjs.org/docs  
Repo: https://github.com/hbarve1/super-js

Happy to answer questions on interop (`dynamic` vs banning `any`), the LLVM roadmap, and where we deliberately cut scope (no DAP in 1.0).

---

## lobste.rs (draft)

**Title:** SuperJS 1.0 – sound types for JavaScript without the TS complexity budget

**Tags:** javascript, typescript, compilers, programming

**Body:** (shorter than HN — link to Why SJS page)

SuperJS compiles `.sjs` to ES2022. We banned `any` and TS-only type features that break soundness; we added sum types and `match`. Compiler is from scratch, GPL-3.0.

https://superjs.org/docs/why

---

## r/typescript (draft)

**Title:** SuperJS 1.0 GA — a sound alternative when TS's escape hatches hurt

**Body:**

If this isn't appropriate for r/typescript, mod please remove.

SuperJS isn't "TS with different syntax" — we removed features (any, intersections, conditionals) and added sum types + default null safety. Migration guide for common patterns: https://superjs.org/docs/migration

We'd love feedback from teams who've hit `any`-shaped holes in large codebases.
