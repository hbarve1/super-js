> **Archived feedback — no longer actionable.** Superseded by `specs/roadmap/`. Read-only reference.

# Plan Critique: SuperJS Production Roadmap

**Critique date:** 2026-05-30
**Plan critiqued:** `2026-05-30-superjs-production-roadmap.md` (1654 lines, ~12.5k words)
**Reviewer stance:** Adversarial. Goal is to find every gap before the team commits.

---

## Overall Assessment

This plan is a reasonably well-structured *outline* of a new language project, but it is **not yet an executable roadmap**. It reads like an aspirational table of contents: section after section names the right deliverable ("LSP", "stdlib", "edition system", "WASM playground") without specifying the hard technical decisions that determine whether each one is feasible in the claimed time. The Sprint Breakdown in §13 commits a solo maintainer to building, in 32 weeks, what took TypeScript 5+ years, Rust 8+ years, and Swift Apple's entire compiler team — and the timeline allocates *two weeks* to "VS Code Extension + Vite Plugin" while glossing over the fact that JS interop and the `.d.ts → .d.sjs` translator (which is essentially "re-implement the hard parts of TypeScript") get a single sprint each.

The three biggest gaps are: (1) **JS/TS interop is dramatically under-specified** for a compile-to-JS language — the `.d.ts` translator alone is a 12-18 month project for a team of 3, and "coerce intersection types to `dynamic`" silently breaks 80%+ of typed npm packages; (2) **the bootstrapping/stdlib chicken-and-egg problem is never named, let alone solved** (you cannot write `@superjs/std` in `.sjs` until the compiler ships, but the plan implies you will); (3) **timeline estimates are off by 3-10x across the board**, with no buffer, no parallel work breakdown, no acknowledgment of the solo-maintainer constraint flagged in the risk table.

The plan is also strategically silent on the question that should be answered first: **who is the user, and why would they switch from TypeScript?** Without that, prioritisation is rudderless.

---

## Critical Gaps (must fix before plan is usable)

### 1. JS/TS interop is treated as a side project, not the defining problem

**What's missing:** This is a compile-to-JS language. **Interop is the entire product.** §6.5 (JS Interop Layer) is 13 lines. §11.8 (JS Interop Edge Cases) is 8 bullet points. §4.11 (`.d.ts` translator) is 6 bullet points and is allocated a single sprint (Sprint 12, weeks 23-24, *shared with DOM stdlib and Node fs/path/http stdlibs*).

**Why it matters:** The `.d.ts` ecosystem on DefinitelyTyped has ~9,000 packages, 80%+ of which use at least one banned feature: intersection types, conditional types, mapped types, template literal types, declaration merging, namespaces, `infer`, `unique symbol`, recursive conditional types. The plan's stated strategy ("coerce to `dynamic` with a warning") will silently make every typed `react`, `lodash`, `zod`, `express`, `aws-sdk`, `rxjs`, `prisma`, `next`, `vite` import return `dynamic` — at which point users get **none** of the type safety SuperJS is selling. The whole pitch collapses.

**What the plan should say instead:**
- An explicit compatibility matrix: for each of the top 100 npm packages, what percentage of the public API survives translation? Target: ≥90% typed surface, or the package is in a deny-list.
- A strategy for the banned features that does **not** lose typing: at minimum, intersection types must be representable (probably as auto-generated composed interfaces; possibly as a special internal "structural sum" type that mirrors `A & B` semantics without exposing the syntax).
- A decision on whether `.d.ts` translation is on-the-fly per import (slow, simple) or eagerly built and cached at `npm install` (fast, requires a `postinstall` hook in `superjs` itself).
- A budget for hand-curated typings for the top 50 packages, since translation will not be enough.
- An owner and an effort estimate measured in *engineer-quarters*, not "Sprint 12, half a sprint".

### 2. The bootstrapping problem is never named

**What's missing:** §5 (Standard Library) says stdlib lives at `stdlib/` and is "published as `@superjs/std`". §13 Sprint 7 says "Publish `@superjs/std@0.1.0` to npm". But:
- If stdlib is written in `.sjs`, it cannot be compiled until the Phase 2 compiler ships (Sprint 6).
- If stdlib is written in `.sjs` and depends on itself (e.g. `Result<T,E>` is used inside `parseInt`), there is a circular dependency.
- The Phase 2 compiler is written in TypeScript (per §2 line 197), so it cannot use `@superjs/std`. But the stdlib is the thing that defines what `Result` and `Option` and `Iterator` *mean*. The compiler will need its own internal copies of these types for type-checking — they will inevitably drift from stdlib.
- §2.9 says the compiler will be rewritten in SJS in Phase 2.5 "after the language is stable", but that rewrite will need the stdlib, which… requires the compiler.

**Why it matters:** Every successful self-hosting language has explicitly solved this: Rust bootstrapped via OCaml, then carefully managed a "stage 0 / stage 1" build that ships a snapshot compiler binary alongside the source. Go shipped a C compiler for years. TypeScript was always JS-first. The plan punts on this entirely.

**What the plan should say instead:**
- A specification of the bootstrap dependency graph: TS-compiler v0 → minimal `.sjs` runtime types → `@superjs/std/core` (in `.sjs`) → richer stdlib modules.
- A decision on whether stdlib types live in the compiler binary (as built-in declarations, like TypeScript's `lib.d.ts`) or as user-importable `.sjs` files.
- A snapshot-binary policy for Phase 2.5: how do users build the self-hosted compiler without already having it?
- A test plan: every commit must build a stage-0 compiler with the previous compiler version, then build a stage-1 compiler with stage 0, then verify stage-1 == stage-2.

### 3. The 32-week solo-maintainer timeline is fictional

**What's missing:** §13 commits one person (per §10.6 the core team is "currently 1; recruit 2-3 more before 1.0") to:
- Sprint 1 (2 weeks): repo reorg + npm publish + CI matrix + golden test runner + EBNF skeleton + RFC-0000.
- Sprint 9 (2 weeks): "LSP scaffolding... hover, definition, references, completion, signatureHelp, publishDiagnostics, incremental cache wired in for sub-100ms responses". The TypeScript LSP team has worked on this for a decade and still ships fixes monthly.
- Sprint 12 (2 weeks): `.d.ts` translator + DOM stdlib + Node fs/path/http stdlib + import React from npm test. Each one is a multi-month project on its own.
- Sprint 13 (2 weeks): write a 50-lesson language tour + API reference auto-gen pipeline + JS migration guide + TS migration guide + error code reference for every `SJS-EXXX`. That's roughly 100,000 words of technical writing in 14 days.
- Sprint 15 (2 weeks): implement Rust-style editions in the compiler, write deprecation tooling, recruit and onboard 2-3 maintainers, *and* backfill RFCs for "all major existing decisions" (likely 30+ RFCs of 1500 words each).

**Why it matters:** Risk #6 in §14 acknowledges "solo maintainer bus factor" but only mitigates with "recruit maintainers in Sprint 15". By Sprint 15 the maintainer is already burnt out from doing Sprints 1-14 alone. The plan is internally inconsistent.

**What the plan should say instead:**
- An explicit FTE budget per sprint, with bottlenecks called out.
- A "minimum viable 1.0" track that defers anything not strictly needed (e.g. property testing, video tutorials, JetBrains plugin, `svm`, snapshot testing, Phase 2.5 self-hosting, channel/CSP in stdlib, custom linter plugins, JUnit/TAP reporters).
- A realistic timeline. Comparable single-engineer projects (Bun's runtime, Zig 0.1→1.0) took 3-5 years. Even with parallel hires, a 1.0 in 36 weeks is implausible; 18-24 months is the honest number.
- A failure mode: what does the team do if Sprint 4 (type checker port) slips by 4 weeks? Do all subsequent sprints slide, or does scope get cut? The plan has no slippage protocol.

### 4. Error recovery in the parser is named but not specified

**What's missing:** §2.2 says "synchronisation tokens: `;`, `}`, top-level keyword. When a production fails, emit `SJS-PXXX`, skip to nearest sync token, continue." This is the *idea* of error recovery, not the *design*. Real recovery design requires answering:
- How does the parser distinguish a missing `;` from a multi-line expression that legitimately spans the next line? (SJS rejects ASI but allows multi-line.)
- What does recovery do inside a parenthesised expression where there is no `;`? Does it scan to the matching `)`? What if the `)` is itself missing?
- How is recovery tested? Golden fixtures only test the happy AST; recovery quality is about which errors get *suppressed* after the first, which the plan doesn't address.
- What happens when recovery produces an `ErrorNode` that's the discriminant of a match? Does the checker pretend the match is `dynamic`? Suppress all arm errors? Continue?
- Does the LSP wait for recovery or stream partial diagnostics?

**Why it matters:** Bad error recovery is the #1 reason languages feel "amateur". TypeScript's recovery quality took years of tuning. Rust's `rustc_parse` recovery is a multi-thousand-line module.

**What the plan should say instead:** A recovery design doc (sub-spec) referenced from §2.2. At minimum: a taxonomy of recovery strategies (panic-mode, phrase-level, error productions), a chosen strategy per AST level (statement, expression, type, pattern), and a set of golden recovery fixtures with expected diagnostic *sequences*, not just expected ASTs.

### 5. The playground is impossible as described in the timeline

**What's missing:** §4.4 says the playground runs Monaco + the LSP in a Web Worker + the compiler in WASM. §13 Sprint 14 allocates 2 weeks to "Web playground + WASM-bundled compiler + share-via-URL + Next.js plugin + embed in docs."

**Why it matters:**
- The Phase 2 compiler is written in TypeScript (per §2). It does not compile to WASM. To get a WASM compiler you either (a) run the JS compiler in a worker (not WASM), (b) write a separate WASM build (Phase 3, not done yet per §3 line 340), or (c) ship the compiled JS as a bundle and call it "WASM-bundled" loosely.
- Even option (a) requires solving: how does the LSP do module resolution when there is no filesystem? How are imported npm packages resolved? Does the playground bundle every popular `@types/*`? How does the user's `superjs.config.json` work? How big is the bundle (probably 5-15MB before compression)?
- Running a *language server* in a Web Worker is not a 2-week project. The TypeScript Playground took the TS team months even with the compiler already isomorphic.

**What the plan should say instead:**
- Either: ship a server-rendered playground (compiler runs on a backend, simpler) and pay the latency cost; or: budget 8-12 weeks for the WASM/in-browser approach with concrete sub-tasks.
- Address the npm resolution problem explicitly (the answer is probably: snapshot a curated set of `.d.sjs` files at playground build time).
- A bundle-size budget. If the playground is 12MB it will not be used.

### 6. Toolchain distribution glosses over the hardest parts

**What's missing:** §6.1 says `superjs` ships via npm with a postinstall that downloads the native binary in Phase 3. §6.2 says `svm` is "shell script + minimal Go binary for Windows". §3.3 lists Homebrew, apt/yum, winget, scoop.

**Why it matters:**
- `npm install -g superjs` on Windows requires an `.exe` shim, not a shell script. Postinstall scripts on `npm install -g` run as a different user and frequently fail behind corporate proxies.
- Air-gapped environments (a real enterprise concern) cannot download binaries postinstall.
- Code signing (Apple Developer ID, Windows Authenticode) is required for users not to see scary warnings. Apple notarisation is mandatory on macOS 10.15+. This requires paid Apple Developer membership and is not free CI.
- Auto-updates (`superjs upgrade`) are dangerous without signing and a rollback mechanism.
- `apt`/`yum` repos require a hosted package repository (and a GPG signing key). Homebrew formulas need to be in homebrew-core or a custom tap. Winget submissions are reviewed by Microsoft and take weeks.
- The plan says nothing about source distributions, reproducible builds, or supply-chain attestation (despite §9.4 promising signed releases with Sigstore — but Sigstore for npm is `--provenance`, which only covers npm, not Homebrew, apt, etc.).

**What the plan should say instead:** A distribution sub-plan with: signing strategy (Apple, Windows), notarisation, hosting (CDN), rollback, air-gapped install (offline tarball), corporate proxy support, and the cost (Apple Dev membership $99/yr, Windows EV cert $300+/yr, hosting). And acknowledgement that Linux distro packaging (apt/yum) is a half-year effort if you want it in mainstream repos.

### 7. The edition system claim is not validated against the problem it solves

**What's missing:** §10.1 says editions work "like Rust editions". But:
- Rust editions work because cargo + rustc maintain *crate-level* edition. A single project mixes crates at different editions because each crate compiles independently and the ABI is the same. The plan says "a single project can have files of different editions (per-file override)" — file-level edition mixing is *much harder* than crate-level because file boundaries are not compilation unit boundaries.
- If `a.sjs` (edition 2026) imports from `b.sjs` (edition 2027), and 2027 introduces a new reserved word `query` that 2026 uses as an identifier, what happens at the import?
- If editions can change semantics (e.g. integer overflow becomes a panic), and a 2026 function calls a 2027 function that calls a 2026 function, which semantics apply at each layer?
- Rust's edition migration tool relies on `rustfix` and is still a manual-review-required process for any non-trivial codebase.

**Why it matters:** Editions sold as a backward-compat solution often *aren't* — Rust's 2024 edition adoption is still incomplete years in. The plan promises editions as the safety valve for breaking changes but provides no semantics for inter-edition calls.

**What the plan should say instead:** A formal sub-spec on edition semantics. At minimum: only crate (package) level, not file level; types and identifiers must be lossless across editions; the compiler internally normalises to the newest edition and tracks an "edition lens" per declaration; lint rules per edition; the migration tool ships green-field code transformations with `// edition-fix:` markers for manual review.

### 8. Compile error UX is asserted, not designed

**What's missing:** Principle #3 ("Errors are user interfaces") and §8.7 (error code reference) promise Rust-style errors. §2.4 says "Primary span + secondary spans, suggested fix when available, note lines, multiple errors per file". §11.12 says the checker tracks "poisoned symbols" to suppress cascading errors.

**Why it matters:** Rust's error UX took years to mature. Specific things the plan doesn't address:
- **Coloured terminal output:** which library? Does it work in CI logs? On Windows cmd.exe?
- **Error grouping:** when two errors share a root cause (e.g. one bad import causes 20 reference errors), how are they grouped? Rust's approach is `--explain`; the plan says `superjs explain` but doesn't address grouping.
- **Span rendering:** Rust's spans require knowing terminal width, Unicode width of source characters (emoji are wide), tab expansion, and multi-line ranges. This is a multi-thousand-line module in `rustc`.
- **Diagnostic stability:** error codes must be stable across versions (users link to `SJS-E001` from blog posts). What is the policy when a class of errors needs to be split into two new codes?
- **Internationalisation:** is the plan English-only forever?
- **JSON output:** §2.8 says `--json` emits ndjson. What's the schema? Is it semver-stable? Used by editor extensions; breaking it breaks every editor.

**What the plan should say instead:** A dedicated error UX sub-section with: a chosen terminal-rendering library, span algorithms, error grouping strategy, code stability policy, JSON schema for diagnostics (versioned), i18n plan (even if "not yet, but architected for it"), and a "before/after" comparison vs. tsc and rustc on five representative examples.

### 9. The test framework is hand-waved past a decade of competition

**What's missing:** §7.1 says `@superjs/test` is a Jest-like framework. §4.10 also ships `@superjs/jest` and `@superjs/vitest` adapters. §13 Sprint 11 allocates 2 weeks to "describe/it/expect, matchers, async, snapshot."

**Why it matters:** Jest is 10 years old with 600+ contributors. Vitest emerged 4 years ago specifically because rebuilding Jest is a 2-year project for a team. Things `@superjs/test` will need on day one for it to be credible:
- Module mocking (`jest.mock`) — Jest's killer feature, requires monkey-patching the module loader.
- Timer mocking (`jest.useFakeTimers`) — requires patching `setTimeout`, `Date.now`, etc.
- Spies / mocks / stubs.
- Watch mode that integrates with the type checker.
- Coverage reporting via V8 inspector or NYC.
- Snapshot diffing UI in CI (annotated PR comments? GitHub Actions step summary?).
- Parallelism that doesn't deadlock on shared resources.
- ESM + CJS interop.
- The matchers Jest ships: `toBe`, `toEqual`, `toMatchObject`, `toMatchInlineSnapshot`, `toContain`, `toHaveBeenCalledWith`, `toThrowError`, `resolves`, `rejects`, custom matcher API, `expect.extend`, `expect.any`, `expect.objectContaining`, etc. The plan lists 5.

The plan instead lists 5 matchers, no mocking story, no timer mocking, no spy story.

**What the plan should say instead:** Either (a) ship a Vitest/Jest adapter as the default and write a thin SJS-typed matcher layer (faster to credibility), or (b) commit 2-3 sprints to building `@superjs/test`, not half a sprint. The plan currently does both, which is the worst of both worlds.

### 10. Debugger plan is a stub, not a plan

**What's missing:** §4.7 says: "source maps + Node Inspector / Chrome DevTools. No custom debugger UI initially." That's not a plan, that's a statement that debugging will be inherited from whatever debugger the user already has.

**Why it matters:**
- Source maps map *positions* but not *concepts*. A breakpoint in a `match` arm sets a JS breakpoint on the desugared `if/else` — the user sees the `if` highlighted, not the `match` arm. The plan doesn't address how match, sum types, async-await desugaring will look in the debugger.
- Stepping through async/await is unreliable in Node Inspector when source maps are present, especially with optimised codegen.
- `console.log` of an SJS value (e.g. `Ok(42)`) prints `{ tag: "Ok", value: 42 }` in the terminal. The plan addresses this for VS Code via "custom formatter installed by the VS Code extension" — what about `node --inspect`? Chrome DevTools standalone? Bun's debugger? Deno's? The custom formatter API is browser-only.
- Debugging compiled SJS that uses npm packages with stack traces crossing the boundary requires source map composition (`@superjs/std` source maps + user code source maps + Webpack/Vite bundler source maps). This is not currently solved by any compile-to-JS language well.
- No mention of Debug Adapter Protocol. If the answer is "use Node debugger", the experience for non-Node targets (Bun, Deno, browsers) is unspecified.
- Hot-module replacement (HMR) for SJS+React in Vite is not addressed. Without HMR, the Vite/Next.js plugins are toys.

**What the plan should say instead:** A debugger sub-plan with: source map composition strategy across bundlers; custom inspect handling for sum types in Node (`util.inspect.custom`), Chrome formatter, Bun, Deno; a position on DAP (implement, or wrap Node DAP); explicit HMR support story for the Vite plugin and React Fast Refresh; budget for this work (2-3 sprints, not zero).

---

## Section-by-Section Issues

### Executive Summary (lines 11-17)

- Line 15 claims "Go, Rust, Swift, Kotlin, and TypeScript each crossed this bar with different sequencing — SuperJS will follow a deliberate three-phase ramp." This is misleading: each of those languages had a corporate sponsor with 10-100+ FTE. The comparison sets expectations the project cannot meet.
- Line 17: "Governance ships *before* 1.0, not after, so we can break things now and stop breaking them forever at 1.0." Governance is currently the line item with no concrete owner and is squeezed into Sprint 15. The plan asserts a value it does not enforce in the schedule.

### §1.1 Formal Grammar (lines 60-102)

- Line 100 claims "full grammar (~1200 productions)" without showing them. The sketch shown is ~30 productions. Where are the other 1170? This is a load-bearing deliverable for the parser; the actual grammar work is much more than "fill in the rest".
- The grammar shown has ambiguities the plan doesn't address: `PrimaryType ::= Identifier TypeArgs? | "(" TypeExpr ")"` collides with `FunctionType ::= "(" ParamList? ")" "=>" TypeExpr` — both start with `(`. This is exactly the kind of ambiguity that distinguishes "EBNF sketch" from "parser-generator-compatible grammar".
- Line 102: "byte-for-byte agreement with the handwritten parser" is the wrong acceptance criterion — a handwritten parser typically accepts a *superset* of an EBNF grammar (because it handles disambiguation that EBNF can't express cleanly). What's the policy when they disagree?

### §1.2 Type System Edge Cases (lines 104-118)

- "Higher-rank generics supported behind a `strict.higherRank` flag at 1.0; default off" — shipping a flag-gated feature *at* 1.0 is a smell. Either ship it or don't.
- "Hindley-Milner-style local inference at function bodies; explicit annotations required at module boundaries." HM doesn't handle subtyping cleanly, and SJS has subtyping (structural object types, nominal classes). The plan needs to say which inference algorithm (HM with rank-1, MLF, bidirectional type checking, etc.) — these are very different implementations.
- "Tuple types... fixed-arity. Variadic tuples deferred to post-1.0." But the rest spread examples in §1.10 imply spreading arrays into tuples works. Spec contradiction.
- Decimal/Rational numerics: not mentioned. JS has `BigInt` (mentioned line 209) but no `Decimal`. For any finance/money use case this matters; the plan doesn't take a position.

### §1.3 Module System (lines 120-128)

- "File = module. No multi-file modules." What about re-export barrels (`index.sjs`)? They work (still one file, just exports from other files), but the implications for tree-shaking are not discussed.
- "Node-style resolution by default" — Node has at least three resolution algorithms (CJS, ESM, conditional exports). Which one? The `exports` field in `package.json` is its own complexity (`./*`, conditional, nested). The plan doesn't say.
- Path alias support (`@/foo`) is a near-universal need in TS projects via `tsconfig.json` `paths`. The plan doesn't mention `superjs.config.json` paths.
- Workspaces / monorepos: §4.9 line 517 says "respects `pnpm-workspace.yaml` and `npm workspaces`" but doesn't specify how cross-workspace dependencies that span SJS↔SJS get type-checked incrementally. This is the dominant case in modern frontends.

### §1.4 Error Handling (lines 130-135)

- "No exceptions in idiomatic SJS" + "JS interop exceptions wrapped via `try` expression" — but every npm package throws. The plan says `try expr` returns `Result<T, dynamic>` — that means every npm call must be wrapped. This is a huge ergonomic tax and is the kind of thing that loses TS users.
- `dynamic` as the error type means the user gets *no type information about errors from npm*. Compare to TypeScript where `try { ... } catch (e: unknown) { ... }` at least gives narrowing tools.
- No mention of error chains / cause (TC39 Error cause). No mention of stack traces being preserved through `Result` wrapping.

### §1.5 Async / Await (lines 137-143)

- "Cancellation built on stdlib `CancellationToken` — passed explicitly. No magic; no AbortSignal coupling at language level." Then every npm fetch (which takes `AbortSignal`) requires manual conversion. This will be a constant friction point. The plan should commit to either AbortSignal compatibility or a stdlib adapter.
- "`async` in match arms allowed; result type is `Promise<U>` where `U` is the LUB of all arm types." Mixing async and non-async arms is then *implicitly* lifting non-async arms to `Promise<...>`. This is a footgun. What about a sync arm that throws (via `panic`)? Does it become `Promise<never>`?

### §1.6 Decorators (lines 145-150)

- The plan ships decorators but says nothing about emit semantics (TC39 Stage 3 emit is complex; many implementations differ subtly). Browsers don't natively support Stage 3 decorators yet — what's the polyfill story?
- Built-in `@inline` decorator is listed but the implementation in §2.7 says "Single-expression body only". The interaction with type checking is unspecified (what if the inlined body contains a `return`?).

### §1.7 Operator Overloading (lines 153-160)

- Reasonable position. But the equality story is incomplete: structural equality on cyclic structures will infinite-loop. The plan doesn't address it.
- `Comparable` for `<` etc. is invoked but the stdlib `Comparable` interface (line 557) returns `-1 | 0 | 1` — a literal union type. The implementation cost of literal type narrowing for return values is non-trivial.

### §2 (Phase 2 Compiler)

- Line 197: "Written in TypeScript for now (bootstrap pragmatism)". OK but then **the team is maintaining a TS codebase that defines an SJS language**. Two type systems to keep in sync forever. No mention of how this is managed.
- §2.3 line 244: AST nodes have `parent?: Node` "set after parse, not during". With visitors that replace nodes (line 250), parent pointers go stale instantly. The plan needs a policy: re-link after each transform? Use a stable id + a side map?
- §2.4 line 271: "reuse / port of existing `prototype/src/typeChecker/`". The current type checker is Babel-AST-shaped. Reuse is a polite word for "rewrite with a different AST" — that's not a port, it's a rewrite. Sprint 4 (2 weeks) is unrealistic.
- §2.6 line 290: "Cold build budget: 10k LOC project compiles in <2s (Phase 2 goal)". For comparison, `tsc` on 10k LOC takes ~3-5s; SWC takes ~200ms. Where does "2s" come from? Achievable but only with care. The plan should specify what it's NOT including (lint, format, codegen vs. check-only).
- §2.6 incremental compilation depends on "Public API hashing" — what's hashed exactly? Type-erased signatures only? What about default values, decorators, doc comments (which affect LSP)? The plan needs a precise definition.
- §2.7 optimisation passes: "Tree-shake stdlib imports. Per-export module shape so bundlers can drop unused." This conflicts with §6.5: "Sum types are exposed as `{ tag, value }` objects". A sum type with 20 variants where the user uses 1 will not tree-shake — the discriminator is dynamic, the bundler sees all variants as live. **This is the "tree shaking with sum types" gap** the brief asked about. The plan does not address it.
- §2.8 CLI: `superjs add <package>` is listed but not specified. Does it call `npm`? `pnpm`? Detect which? What happens when the user's project is yarn-only? Does it actually install or just generate `.d.sjs`?

### §3 (Phase 3 LLVM)

- Entire section is 30 lines and is honestly labelled "long-horizon". Fine to defer. But "Rust-style ownership/borrow checker for `no-runtime` subset (deferred to Phase 4 RFC)" is a single sentence describing one of the hardest features in any language. Should be removed entirely from this plan until Phase 2 ships.
- §3.2: "GC strategy... reference counting + Boehm-style optional GC" for WASM is naive. WASM GC proposal (Garbage Collection Proposal) has shipped in V8 and is the right target. The plan doesn't mention it.

### §4 (Developer Experience)

- §4.1 LSP method list is good but missing: `textDocument/onTypeFormatting` (format-on-type), `textDocument/willSaveWaitUntil` (format-on-save), `textDocument/codeLens`, `textDocument/documentHighlight`, `textDocument/prepareCallHierarchy`, `textDocument/linkedEditingRange`. Each is small individually; collectively they're 2-3 weeks of work.
- §4.2 VS Code Extension: "TextMate grammar bootstrapped from grammar.ebnf." TextMate grammars are regex-based and notoriously cannot be derived from EBNF — they're hand-written. Naming this as auto-generated is wrong.
- §4.3 REPL: no mention of source map preservation through `vm.Script`, no story for top-level `let`/`const` re-declaration (a real Node REPL UX issue), no policy on `import` statements in REPL (Node REPL only got this recently).
- §4.5 Formatter: "Idempotent: `format(format(x)) === format(x)`" — this is a property tests can verify; the plan should mention they will exist. Also: comment handling is the bulk of any formatter's complexity; the plan dismisses it in one bullet.
- §4.6 Linter: "Plugin API: `defineRule({...})`" — exposing a plugin API at 1.0 means the API is locked. Most languages regret their first linter plugin API. The plan should either gate this behind `beta` or explicitly accept it.
- §4.8 Migration tools: "Idempotent: running the tool twice produces no diff." That's *aspirational*. Real-world migration tools touch comments, whitespace, and re-export shapes nondeterministically. Achievable but a separate engineering effort.
- §4.11 .d.ts story (see Critical Gap #1).

### §5 (Stdlib)

- §5.2 line 572-580: "Each type is its own opaque class, not a wrapper around JS Array/Map/Set." For native code (Phase 3) this matters; for JS-compiled code today this is a **significant performance penalty** — every `List<T>` is an extra allocation versus `T[]`. The plan handwaves this. Real Q: do users get to use `[1, 2, 3]` literal syntax for `List<number>` (then it's compiled to `List.from([1,2,3])`), or do they use `List.of(1, 2, 3)`?
- §5.6 fs module returns `Result` everywhere. But fs is async — every read involves `Promise<Result<...>>` — three layers of unwrapping for what would be `await fs.readFile(p)` in JS. The ergonomics need addressing.
- §5.7 DOM: "Auto-generated from MDN data with manual curation". MDN data has known gaps (event types, Touch APIs, Web Components). The plan doesn't say what "manual curation" means in time/effort terms.
- §5.8 JSON: `parseAs<T>(s, schema)` is a great pattern. But the plan never specifies whether SJS has reified generics (`schema` needs to be runtime-available even though `T` is erased). Compare to Zod (which is type-only) vs Effect Schema (which is value-only). Decision needed.
- §5.9 Time: "Modelled on Temporal API". Temporal is huge (~100 classes/methods). 1 sprint allocation is wrong.
- Notably absent stdlib modules: **crypto** (every server needs it), **process / env** (every CLI needs it), **streams** (Node `Readable/Writable`), **buffer / typed arrays** (binary protocols), **child_process**, **net / dgram** (sockets), **assert** (already in core, but the Node `assert` deep-equal semantics need a typed equivalent), **url** (URL parsing), **querystring**, **events** (EventEmitter typed wrapper), **logging** (every production app needs a structured logger), **i18n** (Intl).

### §6 (Ecosystem & Distribution)

- §6.2 svm: A version manager for a language at 0.1.0 with no users is wildly premature. Most language version managers (nvm, pyenv, rbenv) emerged years after the language. This should be post-1.0.
- §6.3: "No separate registry. Use npm." Sound. But the implication that `.d.sjs` files travel inside npm tarballs (line 728) means every package must be re-published to gain SJS typings — chicken-and-egg with the `@types/*` ecosystem. No discussion of a `@superjs/types` analog to `@types/*`.
- §6.6 Project Conventions: `superjs init` template is bare. Missing: README template, license, EditorConfig, .nvmrc / `.superjs-version`, GitHub Actions workflow template, Dockerfile?, ESLint/Prettier sibling configs?

### §7 (Testing)

- See Critical Gap #9 for the test framework.
- §7.2 Snapshot: "Snapshots are typed: deserialised against a schema, so renaming a field breaks the test loudly". How is the schema generated — auto from the call site, or written by the user? If auto, the schema can change as the test author refactors; what's the migration path?
- §7.3 Property testing: budget shown is half a sprint; building fast-check took ~2 years of part-time work. The plan should pick: build it lite, or wrap fast-check.
- §7.5 Fuzzing: "grammar-aware fuzzer (initially based on tree-sitter or custom)". Tree-sitter generates a parser, not a fuzzer; the plan confuses tools.
- §7.7 Type-level testing: `@expect-error SJS-E001` is good. But the plan needs to address how this interacts with multi-error reporting from §2.4 — if the line has *also* an unrelated error, does the test pass?
- §7.8 Coverage: "Native code coverage instrumentation by codegen pass" — implementing this correctly (especially branch coverage) is its own multi-sprint effort. The plan allocates "M" effort.

### §8 (Documentation)

- 50-lesson tour, full migration guides, full error reference, video tutorials — in 2 sprints. See Critical Gap #3.
- §8.7 error reference: "Every error code is required to have a reference page before its compiler change can merge." This is a great policy. It will slow down compiler development. The plan needs to acknowledge this and allocate doc-writing time per compiler PR.

### §9 (CI/CD)

- §9.1: "Major: once per year, alongside a new edition." Editions yearly is Rust's cadence — Rust has done two editions in ~9 years (2015 → 2018 → 2021 → 2024). The plan's cadence claim doesn't match historical reality for any language.
- §9.2 CI: tests "across all OS and Node versions" — this is matrix-heavy. Windows CI is 3-5x slower than Linux. The plan needs a per-PR vs nightly split, otherwise PR latency will be 30+ minutes.
- §9.4 Security: §4 says "Compiler fuzz: random valid + invalid `.sjs` programs" but no mention of fuzzing the codegen output. If the codegen emits broken JS, that's a silent miscompilation bug.
- §9.5: "100k LOC synthetic project" — how is it generated? Hand-rolled? Templated? Without specifying, you'll game your own benchmark.
- No mention of CI cost. GitHub Actions on a matrix of (3 OS × 3 Node × 3 browser) × full test suite × every PR × dependabot updates can easily be $500-2000/month.

### §10 (Governance)

- §10.6: "Core team (currently 1; recruit 2-3 more before 1.0)". How? No recruitment plan, no funding, no compensation model. Open-source language projects struggle to recruit volunteers; this is a major risk pretending to be a checklist item.
- §10.7: "JS interop stability. Compiled JS output shape... is part of the spec and won't change within an edition." This is a *huge* commitment that constrains every future optimisation. Most compilers explicitly do not promise output stability. The plan should reconsider.

### §11 (Edge Cases)

- This is the strongest section in the plan and the most detailed. But several edges are still hand-waved:
  - §11.3 Variance: "Default 1.0 has invariant generics with documented sub-pattern for variance via reified wrappers." What's the sub-pattern? Reified wrappers in JS are not free.
  - §11.7 Dynamic at runtime: `is<T>(value, schema)` returns `value is T`. But schema-based runtime checks fail on functions, promises, classes-by-instance, cyclic structures. Spec needs to say "works for plain data".
  - §11.9 JSX: "Pragma's createElement signature must match a stdlib interface" — but React's `createElement` signature is famously hard to type (variadic children, ref forwarding, generic components). The plan understates the complexity.
  - §11.11 Decorators: "Polyfill where Stage 3 not supported". The polyfill is non-trivial and incurs runtime cost. Plan should specify which targets need it.

### §12 Priority Matrix

- 63 line items, all without an owner. Without owners, the matrix is decorative.
- "Effort: S/M/L/XL" is too coarse. S could be 1 day or 1 week. XL could be 1 month or 1 year. Add hour/day/week estimates.
- Phase columns (P2.0-P2.5) map to ~1 month each per the legend, but each phase has 8-12 items. Even at "S" effort, 8 items in a month for one person is implausible.

### §13 Sprint Breakdown

- See Critical Gap #3 for the timeline reality check.
- Sprints have no dependency graph. Sprint 9 (LSP) depends on Sprint 6 (incremental compilation), but if Sprint 4 (type checker) slips, the entire chain ripples. The plan needs a dependency view.
- No buffer sprints. No retro sprints. No on-call rotation for bugs from previous releases.
- Sprint 16 includes "Public announcement plan" — public launch in week 32 with no community-building lead time means you launch to no one. Outreach should start by Sprint 8-10.

### §14 Risks & Mitigations

- The risk table is the most candid part of the plan but mitigations are weak:
  - "Solo maintainer bus factor: probability H, impact XL" — mitigation is "Sprint 15 recruits maintainers". XL impact + H probability deserves a mitigation in Sprint 1.
  - "Phase 2 parser takes longer: probability M, impact H" — mitigation "keep Babel pipeline as fallback" — but the plan never specifies the architecture that allows swapping parsers. Adding this later is much harder than designing for it.
  - "TS users see SJS as less powerful TS: probability H, impact M" — impact should be **H** (this kills adoption). Mitigation is "lead with positive framing" — that's PR, not engineering.
- Missing risks:
  - **Funding / sustainability.** Solo maintainer eventually needs income.
  - **Trademark.** "SuperJS" trademark not addressed. There are at least two npm packages currently named `super-js`.
  - **Domain squatting.** `superjs.dev`, `playground.superjs.dev`, `docs.superjs.dev` — are these owned?
  - **Microsoft adopts/clones the idea.** TypeScript could add `--strictNoAny`, `--strictMatch`, `--noEnum` modes and erase SJS's differentiation.
  - **The chosen target audience doesn't exist.** Plan never identifies who the user is.

### §15 Definition of Done

- "≥4-star rating" on VS Code Marketplace as a DoD item is misguided — depends on launch luck, not engineering.
- "10+ third-party packages built with SJS" — by whom? With what incentive? Without an outreach plan this checkbox doesn't get ticked.
- "3+ production deployments by friendly beta teams" — same issue. The plan needs an outreach workstream.
- Missing DoD items: stable LSP under sustained load, memory leak audit on watch mode, fuzz corpus size threshold, accessibility audit on the playground and docs site, GDPR compliance for analytics on docs site.

---

## Missing Domains

Entire areas the plan does not cover:

1. **WebAssembly as a compilation target.** WASM is the natural ally for a typed language but only appears in the playground context. SJS-to-WASM (skipping JS) would be a differentiator.
2. **React Server Components / Server-Side Rendering** specifics. The Next.js plugin is listed but RSC has type-checker implications (the `use client` boundary, the `use server` boundary, serialisable props).
3. **Workers (Web Workers, Service Workers, Cloudflare Workers, Node Workers).** Different module/runtime semantics. Type system implications for `postMessage` (structured clone constraints).
4. **Streaming and backpressure.** Node Streams, Web Streams API, async iterators with backpressure.
5. **Binary data.** ArrayBuffer, Uint8Array, DataView, TextEncoder/Decoder.
6. **Internationalisation.** Intl API, locale-aware formatting, RTL handling. Even saying "we wrap Intl" is something.
7. **Accessibility.** If SJS ships JSX-first and React-first, a11y lints (`@superjs/lint-jsx-a11y`) are table stakes.
8. **Database / ORM ergonomics.** Modern TS users live in Prisma, Drizzle, Kysely. SJS's banned features (mapped types, conditional types) directly conflict with the way these libraries type their query builders. This will break Prisma adoption. Critical gap.
9. **GraphQL ecosystem.** Codegen tools (`graphql-codegen`) produce TS using mapped types. SJS users will not be able to consume them.
10. **Tooling stability for editors other than VS Code.** Vim, Emacs, IntelliJ, Cursor, Zed, Sublime — LSP gets most for free, but `gd`/`gr`/snippet/format-on-save needs per-editor docs.
11. **Documentation generation for user code.** `superjs docgen` is mentioned for stdlib only. What about user libraries? TypeDoc analog needed.
12. **Package authoring.** Library authors have different needs: bundling, dual ESM/CJS publish, treeshaking-friendly exports, version constraints. The plan addresses consumption but not authoring.
13. **Monorepo type-checking incrementality across packages.** The plan handles single-package incremental builds; cross-package type-graph updates in pnpm workspaces are a separate problem.
14. **Refactoring tools.** Beyond rename: "extract function", "inline variable", "convert callback to async", "move file" (updates imports), "convert match to if/else". Modern languages need these.
15. **Telemetry / opt-in usage data.** Without it, the team is flying blind on which features users actually use. Privacy-respecting opt-in telemetry is standard for Rust, Deno, etc.
16. **Crash reporting from the compiler.** Currently if `superjs build` crashes the user files a GitHub issue manually. Sentry-style auto-reporting is standard.
17. **The Windows experience.** Mentioned as a CI target but not as a development target. Windows paths, CRLF line endings, `cmd.exe` vs PowerShell vs Git Bash, antivirus interference with watch mode, long path support — all unaddressed.
18. **Determinism / reproducibility of builds.** Mentioned briefly ("same input → same output, byte-for-byte") but not enforced via CI. Determinism breaks when codegen depends on hashmap iteration order, timestamp insertion, etc.
19. **Memory budget for the LSP.** Editors keep the LSP alive for days. Memory leak audits, heap snapshots, max-heap policy — all unaddressed.
20. **Profiling user code.** Tracy, Pprof, Chrome DevTools profiler integration. Source maps for stack traces in profilers.
21. **The trademark, legal, IP story.** Apache-2.0 vs MIT vs BSD for the compiler? Contributor License Agreement? Trademark policy for "SuperJS"?
22. **Funding.** GitHub Sponsors? OpenCollective? Foundation? Without a funding strategy a solo-maintainer project at this scope is unsustainable.
23. **Comparison and positioning vs ReScript, Elm, PureScript, Imba, Flow, Hegel, Civet, TypeScript itself.** "Why SJS" is named in §14 risks but no comparison document is specified. ReScript in particular occupies almost exactly SJS's niche.
24. **Browser-only language constructs.** CSS-in-JS interop, `<style>` tag emission, web component lifecycle, custom elements with typed props.
25. **Type system feature parity table.** What can users do in TS that they cannot do in SJS? Without an explicit "here's what you lose" doc, the migration tool will surprise users.

---

## Technical Correctness Issues

1. **Hindley-Milner with subtyping is unsolved.** §1.2 says HM-style inference but SJS has structural subtyping (and `null` subtyping `T?`). HM does not extend to subtyping cleanly. Bidirectional type checking (Pierce/Turner) is the standard approach for languages in SJS's design space. The plan should commit to a specific algorithm.

2. **`{ tag, value }` runtime layout blocks tree-shaking.** §2.7 promises tree-shaking; §6.5 mandates the layout. They contradict. A discriminated union with a runtime tag means **the bundler sees all variant constructors as live unless the user explicitly imports only one**. The plan needs either: (a) per-variant constructor exports (so `import { Ok } from ...` shakes `Err`), (b) compile-time variant elimination when the checker proves only one is used (very hard), or (c) accept the cost.

3. **Source map fidelity through optimisation passes is incompatible with §2.6's claim.** Constant folding, DCE, switchify, inline (§2.7) all destroy source positions. The plan promises "per-token, not per-line" source maps in §2.5 *and* these passes — both cannot be true without significant additional engineering (typically: separate optimised + debug builds).

4. **Async iteration desugaring across `match` arms.** §1.5 line 144 allows `async` in match arms. Combined with §1.8 generators (`function* gen(): Iterator<T>`), the desugaring is complex (state machines + iterators + promises + variants). Not impossible, but not a small implementation. Plan doesn't acknowledge.

5. **Structural typing + nominal sum types creates inference edge cases.** A function returning `{ tag: "Ok", value: T }` is structurally identical to `Ok(T)` but nominally distinct. What happens when JS interop returns the former and the user pattern-matches as if it were the latter? Plan doesn't address.

6. **`Promise<T?>` vs `Promise<T>?`** (line 140, 1190-1191). The distinction is correct but the runtime cannot tell the difference (both are JS Promises that may resolve to `null`). For type-safe interop with promise-returning JS APIs, the plan needs to specify which the type system defaults to inferring.

7. **`dynamic` is contagious.** Once a value is `dynamic`, every operation on it stays `dynamic`. The plan needs to address: (a) does `(d: dynamic).foo` stay `dynamic`? (b) Does `let x: number = d` need an explicit `Schema.parse` (per principle) or a runtime check (per pragma)? Open Q #8 names this without resolving it.

8. **`equals` interface and structural equality.** §1.7 says "==/!= use structural equality by default". For cyclic objects this infinite-loops. For objects with non-data fields (functions, classes), equality semantics are unclear. Plan needs to specify (probably: data-only, breadth-first with cycle detection, opt-out via `@noStructuralEq` per the plan but mechanism unspecified).

9. **Symbol type as first-class.** §11.8 line 1174 says `symbol` is a first-class type. But symbols are reference-equal, not structurally equal, breaking the principle from #8. And the type system has no way to express `unique symbol` (which TS uses for the iterator/asyncIterator typing). Plan needs to take a position.

10. **The `Decorator<Sig>` interface from stdlib (§1.6) cannot be expressed without higher-kinded types.** "A decorator that wraps a method must preserve the signature, enforced by a compile-time contract" — this requires `<F extends (...args: any) => any>(target: F) => F` style. SJS allows generic constraints but bans mapped/conditional types — the standard tools for this are missing. Plan needs to specify how this enforcement actually works.

11. **Bigint literals (`123n`) in the lexer (line 209) but no semantics specified.** Are bigint and number assignment-compatible? Implicitly coerced? Comparable? `123n == 123` in JS is `true` but `===` is `false`. SJS has only `==`/`!=` (per §1.7), what's the answer?

12. **JSX pragma signature constraint (line 1186) is under-specified.** "Pragma's `createElement` signature must match a stdlib interface `JSX.PragmaSignature`." React's createElement has at least 8 overloads. Solid's is different. Preact's is different. A single signature interface cannot match all of them without `any`/`dynamic`. Plan needs to reconsider.

13. **Top-level `await` (TLA) constraints (line 1193).** Allowed only at module scope. But TLA changes module evaluation order in subtle ways (siblings await, deadlocks possible). The plan doesn't address.

14. **`for...of` on Iterator vs Iterable (line 165).** JS's protocol is: `Iterable` has `[Symbol.iterator]()` returning `Iterator`. SJS uses `.iterator()` instead. This breaks compat with JS iterables (Map, Set, Array). The plan says "works on `Iterator<T>` and `Iterable<T>`" but doesn't specify how the bridge from JS's symbol-keyed protocol to SJS's named-method protocol works. This will silently break `for (const x of jsArray)`.

15. **Variant constructors and `instanceof`.** Open Q #3 names this. The decision matters for: error handling (`if (e instanceof HttpError)`), React `ErrorBoundary`s, JS-side libraries that introspect with `instanceof`. The plan delegates this to the critic but it's a Phase 2 blocker.

---

## Priority Problems

### Things deprioritised that should be first

1. **JS interop / `.d.ts` translator** — currently Sprint 12 (week 23). Should be Sprint 2-3. Without it, no one can use SJS for anything real. The whole roadmap is upside-down.
2. **Who the user is** — never addressed. Should be the first thing in §0 before "North Star Principles". The user defines the priority of everything else.
3. **A real "Why SJS over TS" doc** — listed in §14 as mitigation but not in §13's sprints. This is the marketing artefact that determines whether anyone shows up.
4. **Recruiting maintainers** — Sprint 15. Should be Sprint 1. Bus factor at H × XL is the project's #1 risk; mitigation can't be at the end.
5. **Distribution and signing** — barely mentioned. Should be a Sprint 1 deliverable so that every nightly release is signed and tested on Windows/macOS/Linux.

### Things prioritised that can wait

1. **`svm` version manager** (P2.4, item #54) — irrelevant at <100 users.
2. **JetBrains plugin** (mentioned in §4.2) — VS Code first, JetBrains can be community-contributed.
3. **Self-hosting** (Phase 2.5, item #55) — XL effort for no user benefit. Should be post-1.0.
4. **LLVM backend** (item #56) — already deferred but still in the plan. Remove entirely; replace with "JS-only at 1.0; LLVM is a Phase 4 R&D ticket."
5. **Channel/CSP in stdlib** (line 625) — exotic for a JS-targeted language; no clear demand. Defer.
6. **Property testing, bench framework, fuzzing** — quality nice-to-haves but if `@superjs/test` happens via Vitest adapter, all of these can use fast-check + tinybench + jazzer.js. The plan reinvents.
7. **Edition system** — premature. Get to v1.0 first; introduce editions only when the first breaking change demands them. Rust didn't have editions in 1.0.
8. **20 backfilled RFCs** (Sprint 15) — 20 docs of 1500 words each = 30k words of bureaucracy. Backfill the 3 most important decisions; defer the rest.

### Things missing from any sprint

- Threat modelling / security review.
- A real beta program with 5 friendly teams, scheduled.
- A marketing/community lead-up *before* Sprint 16 launch.
- Funding strategy.
- Legal/IP (trademark, license, CLA).
- The "Why SJS" positioning document.

---

## Risks Not Addressed

1. **The user doesn't exist.** If SJS is positioned for TS users, they have TS and don't switch. If for JS users, they don't see types as a benefit. If for new programmers, the JS ecosystem is too hostile. The plan never identifies a target audience whose pain SJS solves.
2. **TypeScript adds the same features.** `--erasableSyntaxOnly`, `--strict`, exhaustiveness checking in switch, etc. are all evolving in TS itself. SJS's differentiation could be eaten in 2 years.
3. **The compile-to-JS niche is crowded.** ReScript, Civet, CoffeeScript (still alive!), Imba, Elm, PureScript, Hegel, Flow — none cracked >1% market share against TS. The plan has no theory for why SJS wins where they didn't.
4. **Solo maintainer burnout.** 32 weeks of full-time work for one person without external support is unrealistic; burnout is near-certain. The risk table notes this but mitigates with "recruit later" which is the wrong direction.
5. **Funding.** Languages cost money (CI, hosting, signing certs, conferences, marketing). The plan has no budget. Open-source-only without sponsorship is sustainable at small scope but not at "world-class production language" scope.
6. **Dependency on Babel during Phase 1 → Phase 2 cutover.** What if the Babel-based v0.1 has a critical bug discovered late in Phase 2? The plan needs a maintenance policy.
7. **The npm registry could deprecate features SJS depends on.** ESM-only is fine today; if registry policy changes (e.g. requires `provenance`), surprise breakage.
8. **GitHub Actions free-tier limits.** A matrix CI on every PR with 9 OS/Node/browser combos burns minutes fast. At scale this is paid; budget unaddressed.
9. **VS Code Marketplace policy changes.** Microsoft has changed publication terms before; ungrouping the extension from the marketplace would hurt adoption.
10. **WebAssembly + npm interop.** If SJS playground compiles to WASM, npm packages it imports must also work in WASM context — most don't (Node APIs are not available).
11. **A core stdlib bug at 1.0.** "Stability is a feature" means a critical stdlib bug requires a major release to fix (or a deprecation cycle). The plan has no escape hatch.
12. **Acquisition / acqui-hire of the maintainer.** The plan assumes continuous maintenance; what if the maintainer takes a full-time job?
13. **Cloud / runtime changes.** Cloudflare Workers, Bun, Deno are listed as compat targets (§9.3) but their semantics differ from Node (no `fs` in Workers, different ESM behavior in Bun). The plan claims compat without specifying a contract.
14. **The MIT/Apache license question for the compiler.** Not addressed. SBOM not addressed. Required for any enterprise adoption.
15. **Backward compat *of compiled output*.** A v1.1 compiler that emits subtly different JS will silently break users whose tests pinned snapshot output. Plan doesn't address.
16. **Editor extension maintenance.** VS Code extension API changes annually. Long-term cost not in plan.
17. **Documentation hosting.** `docs.superjs.dev` will face traffic spikes from HN/Reddit launches. Static hosting fine; the playground (WASM compiler) is heavy.
18. **Compliance.** Some users need FedRAMP, SOC2, ISO27001 boundaries; relevant for the playground if it stores user code.

---

## Verdict

**This plan is approximately 40% complete and 200-400% optimistic on timeline.**

Before this plan is ready to execute, the team must:

1. **Identify the user.** Who switches to SJS, and why? Write that doc first. Every prioritisation decision flows from it.
2. **Rewrite the timeline.** Honest estimate: 18-24 months solo, or 12 months with 3 FTE, to reach a 1.0 that matches the current Definition of Done. Sprint 13 alone (docs blitz) is a full quarter of work.
3. **Solve the bootstrapping problem.** A document specifying how the TS-based Phase 2 compiler, the stdlib, and (eventually) the self-hosted compiler all interlock without circular dependencies or version drift.
4. **Treat JS interop as the product.** Move `.d.ts` translation to Sprint 2-3. Build the top-100-npm-packages compatibility matrix before committing to banning features. Decide whether intersection types are "translated to composed interfaces" (hard but feasible) or "translated to `dynamic`" (which kills typings for most of npm).
5. **Cut scope ruthlessly to a "minimum 1.0".** Remove from 1.0: LLVM, self-hosting, JetBrains, svm, channel/CSP, property testing (use fast-check), bench framework (use tinybench), 50 lint rules (ship 15), variance annotations, decorators (defer to 1.1), top-level await (defer), DOM stdlib (defer or auto-gen-only), Temporal-style time module (use a shim), 20 backfilled RFCs (do 3-5). Re-time the residual.
6. **Specify the hard things.** Parser recovery (with golden test sequences), the `Result<T,E>` ergonomics for npm exceptions, structural equality on cycles, source map fidelity through optimisation, `instanceof` for sum types, the JS Symbol-iterator bridge, source-map composition across bundlers, the debugger experience for sum types in Node/Chrome/Bun.
7. **Build an actual community plan.** Beta partner program, outreach calendar, comparison docs, funding strategy, license decision, trademark check, recruitment plan with concrete asks.
8. **Add owners and effort budgets** to every line item in §12 — without them, the matrix is a wishlist.
9. **Reduce risk #6 (bus factor) to L immediately,** not by Sprint 15. Either commit to a co-maintainer in Sprint 1 or pre-scope the whole roadmap to "what one person can sustainably do in 18 months without burning out."
10. **Defer Phase 3 entirely** until after 1.0 ships and there is real usage data. Remove §3 from this plan; revisit in a year.

If the team executes the current plan as written, the most likely outcomes are: a slipped timeline (1.0 in 18-24 months instead of 8), an underspecified interop layer that limits adoption, a burnt-out solo maintainer, and a feature checklist that says "done" while the language has no users. That outcome is recoverable, but it is also avoidable with a revision pass that takes 1-2 weeks now.

The plan has good bones — the principles, the §1 type system rigour, the §11 edge cases — and a clear writer with strong instincts. The discipline is in trimming back the scope to match the team. The next iteration should be 30% shorter and 100% more honest about timeline and dependencies.

---

*End of critique. ~6,400 words. The single highest-leverage change: cut scope by 50% and double the timeline. The second-highest: make `.d.ts` translation the #1 engineering priority, before the parser.*
