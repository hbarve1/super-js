> **SUPERSEDED — DO NOT EXECUTE FROM THIS FILE.**
> This monolith has been split into per-stage documents. Use [`superjs-production-roadmap/README.md`](superjs-production-roadmap/README.md) as the entry point; each stage lives in its own file in that directory.
> This file is kept for historical context only. Round-2 critique at [`2026-05-30-critique-round2.md`](2026-05-30-critique-round2.md).

---

# SuperJS — Production Readiness Roadmap (v2)

**Version:** 0.1.0 → 1.0.0
**Date:** 2026-05-30
**Owner:** Himank Barve (solo maintainer; explicit goal to recruit 1–2 co-maintainers in the first 8 weeks)
**Status:** Superseded by `superjs-production-roadmap/` directory. See README.md there.
**Reading time:** ~45 min. Skim §0, §1, §3, §14, §15, §16 first.

> This is a complete rewrite. Round 1 was an aspirational table of contents that was 200–400% optimistic on timeline, demoted JS/TS interop to Sprint 12, never named the bootstrapping problem, and never identified a target user. This revision fixes all of that. It is shorter than round 1 because scope was cut, not because detail was removed.

---

## 0. Target User & North Star

### 0.1 Primary user (a single sentence)

> **The TypeScript-fluent Node.js backend developer who is frustrated with TS's complexity tax — `any`, intersection types, conditional types, declaration merging, three ways to express `null`, and the "I have to read a 600-page handbook to use someone else's library" problem — and who ships REST/GraphQL services, CLIs, and serverless functions on Node 22+ to npm / Docker / Cloudflare Workers / AWS Lambda.**

This user:

- Already writes TypeScript daily.
- Uses Vite or esbuild, not webpack.
- Uses Vitest or Jest.
- Consumes `express` / `fastify` / `hono`, `zod` / `valibot`, `prisma` / `drizzle` / `kysely`, `@aws-sdk/*`, `node:fs`/`node:path`, `pino`/`winston`.
- Authors npm libraries occasionally.
- Will switch *only if* SJS is (a) drop-in compatible with their npm dependencies, (b) provably less error-prone than TS for their day-to-day, (c) at least as fast at compile / type-check / test, and (d) has VS Code support that does not feel like a downgrade.

**Secondary users (in priority order):**

1. **React/Next.js frontend developers** — supported via the same compiler + a JSX target, but UI-specific niceties (DOM stdlib, React types, RSC support) are explicitly *post-1.0*.
2. **Full-stack TypeScript refugees** — same user as primary, just with a frontend.
3. **New programmers** — explicitly *not* a v1.0 user. The migration story from TS is the wedge; new-programmer onboarding is a v1.1+ workstream.

### 0.2 What SJS gives this user that TS doesn't

| Pain in TS | SJS answer at v1.0 |
|---|---|
| `any` leaks into types via DT packages, `JSON.parse`, etc. | No `any` keyword. `dynamic` exists but is explicit and contagious in obvious ways. |
| Three nullish flavours (`undefined`, `null`, `T \| undefined`) | One: `T?` means "T or null". `undefined` is normalised to `null` at the boundary. |
| Type complexity arms race (conditional, mapped, template literal types) | Banned. Small surface area; if you cannot express it in SJS types, drop to `dynamic` + runtime `Schema`. |
| `switch` is not exhaustive | `match` is exhaustive by construction. |
| Errors are `unknown` | First-class `Result<T, E>`; JS exceptions wrapped via `try` expression. |
| Decorator semantics shift quarterly | TC39 Stage 3 only, decorator that does not change signature, enforced statically. |
| Tooling: `tsc` is slow, ESLint is slow, Prettier is slow, vitest is slow | Single binary CLI; cold check on 10k LOC ≤ 2 s; warm rebuild ≤ 100 ms; LSP idle memory ≤ 250 MB. |
| Lib type definitions are inconsistent in quality | Curated hand-written wrappers for the top 30 packages; auto-translated declarations for the rest, with explicit `dynamic`-fallback markers. |

### 0.3 What SJS does NOT try to be at 1.0

- A self-hosted compiler.
- A native (non-JS) target. JS-only at v1.0. LLVM/WASM is a *post-1.0 R&D track*.
- A React/DOM-first language. JSX works; DOM stdlib is post-1.0.
- A version manager / channel manager (no `svm`).
- A property-testing framework, snapshot framework killer, benchmark framework, or Jest replacement — those are post-1.0.
- A Temporal-style date library — uses `Date` + a thin typed shim at 1.0.
- An editions system at launch — that lands when the first breaking change demands it, no sooner.

### 0.4 North-star principles (arbitrate every disagreement)

1. **Drop-in interop with npm.** Any package the primary user already depends on must work, with typings that are at least as useful as `tsc --strict`. If we cannot achieve that for a package, we say so in a public compatibility matrix.
2. **Cut before adding.** Default answer to any new feature is "no, defer". The plan that ships is the plan that fits in the available person-weeks, not the plan that imagines them.
3. **Errors are the UI.** Every diagnostic has a code (`SJS-EXXX`), a span, a fix suggestion when possible, and an explainer page. No exceptions.
4. **One canonical format.** No formatter config knobs. Style debates do not exist.
5. **Stability is a feature.** From 1.0 onwards: no breakage outside an explicit deprecation window. Pre-1.0: rapid iteration is fine; tag a frozen window 8 weeks before 1.0.
6. **Honesty in the roadmap.** If something is hard, the plan says so. If a deadline is at risk, it slips publicly. No vibes-based estimating.

---

## 1. What "Production Ready" Means for SJS

A binary checklist. Each item is either done or not done. No "in progress" middle state at the 1.0 release gate.

### 1.1 Language

- [ ] Spec frozen for 8 weeks before 1.0. Single file: `spec/language.md` (~150 pages). EBNF grammar in `spec/grammar.ebnf` is parser-tested.
- [ ] All v1.0 features have at least 20 golden fixtures and 5 negative-test fixtures.
- [ ] All `SJS-EXXX` codes have a docs page (`docs/errors/SJS-EXXX.md`).

### 1.2 Compiler

- [ ] `superjs build` cold-compiles a 10k-LOC project in ≤ 2 s (median, 4-core M-series or equivalent x86_64).
- [ ] `superjs build --watch` warm-rebuilds a single-file change in ≤ 100 ms.
- [ ] Parser recovers from at least 90% of single-typo test inputs (see §12.7 recovery spec).
- [ ] Compiler emits at most 1 cascading error per root cause (see §12.7 poison-set).
- [ ] Build is deterministic: same `(input file set, compiler version, config hash, env-allowlist)` → byte-identical output. CI enforces.

### 1.3 Interop with npm (the gate)

- [ ] `superjs add <pkg>` works for the **top 30 npm packages** in §3.5 with a hand-curated `.d.sjs` shim.
- [ ] `.d.ts → .d.sjs` translator handles the **top 200 packages from npm-stat** with ≥ 70% typed-surface preservation, and produces an explicit `// @sjs:dynamic` marker (not a silent drop) for unmappable constructs.
- [ ] A `superjs doctor` command reports, per imported package, what % of its public API is typed vs `dynamic`.

### 1.4 Tooling

- [ ] LSP server (`@superjs/lsp`) implements the methods in §5.1; idle memory ≤ 250 MB on a 100k-LOC monorepo; P99 latency for hover/completion ≤ 200 ms.
- [ ] VS Code extension on the marketplace; survives a `code --extensionDevelopmentPath` smoke test on Windows / macOS / Linux.
- [ ] `superjs format` is idempotent and runs ≤ 50 ms on a single file.
- [ ] `superjs lint` ships 15 rules (not 50). Custom rule API is `@beta` — not stable at 1.0.
- [ ] Debugger: launch config in the VS Code extension; `console.log(Ok(1))` prints `Ok(1)` not `{ tag: "Ok", _0: 1 }` in DAP-attached inspectors; sum types have `util.inspect.custom`; source maps map to `.sjs` lines.

### 1.5 Standard library (minimal v1.0)

Only:

- `@superjs/std/core` — `Option`, `Result`, `Iterator`, `Comparable`, `Display`, `Eq`, `Clone`, `panic`, `assert`, `todo`, `unreachable`.
- `@superjs/std/collections` — `List<T>` only (Map/Set are thin typed wrappers around JS `Map`/`Set`, not bespoke types).
- `@superjs/std/string`, `@superjs/std/math` — small.
- `@superjs/std/async` — `sleep`, `timeout`, `all`, `allSettled`, `race`. No `Channel`. No CSP.
- `@superjs/std/json` — `parse`, `stringify`, `Schema<T>` builder.
- `@superjs/std/fs`, `@superjs/std/path`, `@superjs/std/process` — Node-only, thin `Result`-returning wrappers.
- `@superjs/std/time` — `Instant`, `Duration` wrapping `Date` and `number`. Not Temporal.

Explicitly **not in v1.0**: `Channel`, `CancellationToken`, Temporal-style time, DOM, Web Streams, crypto, child_process, net, dgram, http server (use `node:http` or `hono` via interop), events (EventEmitter wrapper), Intl.

### 1.6 Testing

- [ ] Phase 2: SJS test files (`*.test.sjs`) are compiled by `superjs build` and run via Jest using `@superjs/jest-transform` (1-file adapter). This is the **default** at v1.0.
- [ ] Phase 2.5 (post-1.0): native `@superjs/test` runner with `describe`/`it`/`expect`/spies/timer-mocking. Not in v1.0 scope.

### 1.7 Documentation

- [ ] Language tour: 20 lessons (not 50). Each ≤ 5 min.
- [ ] Error code reference: every `SJS-EXXX` has a page.
- [ ] Migration guide from TypeScript: covers banned features with explicit rewrites for the top 30 packages.
- [ ] API reference auto-generated from doc comments in stdlib.
- [ ] No video tutorials in v1.0 (post-1.0).

### 1.8 Infrastructure

- [ ] CI matrix: Ubuntu / macOS / Windows × Node 20 LTS, 22 LTS. Browser tests via Playwright (Chrome stable + Firefox ESR) on Linux only.
- [ ] PR feedback (lint + check + unit tests) ≤ 10 min P95.
- [ ] Changesets-driven release. `superjs` and `@superjs/*` publish to npm on tag with `--provenance`.
- [ ] Benchmark dashboard runs nightly; PR-level perf check on a single representative project (not full matrix).

### 1.9 Governance (light)

- [ ] CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md.
- [ ] MIT license (chosen; see §11). No CLA.
- [ ] RFC process via GitHub Discussions (not a separate RFC repo).
- [ ] Semver for compiler + stdlib + CLI flags.
- [ ] Public deprecation policy: feature marked `@deprecated` in v1.x lives until v2.0 with at least 6 months' notice.

### 1.10 Ecosystem (proof of life)

- [ ] At least 3 friendly beta projects in production-like use, each ≥ 1k LOC SJS, contracted by week 24.
- [ ] At least 3 third-party plugins or libraries (build plugin, framework integration, type wrapper).

If any of the above is not done, **v1.0 slips**. Cutting scope is allowed at any review gate; missing the checklist silently is not.

---

## 2. The Bootstrapping Problem & Phase Dependencies

The round-1 plan ignored this. Here is the resolution.

### 2.1 The problem

- The Phase 2 compiler is written in **TypeScript**, not SJS. (Pragmatic: we cannot bootstrap SJS-in-SJS without a working SJS compiler, and the round-1 idea of "self-host in Phase 2.5" is post-1.0.)
- The standard library (`@superjs/std`) is written in **SJS**.
- The compiler must type-check user code that imports `@superjs/std`. So the compiler must know about `Option`, `Result`, `Iterator`, etc. — but those are defined in SJS, which the compiler has not yet compiled.
- The compiler must compile stdlib SJS to JS for users to actually run it. But the stdlib uses itself (e.g. `parseInt` returns `Result<number, ParseError>`).
- `@superjs/std` must publish to npm, but cannot be published until it has been compiled, but cannot be compiled until the compiler ships.

### 2.2 The resolution: three layers

**Layer 0 — Built-in types (live in the compiler binary, written in TS):**

```ts
// compiler/src/builtins/lib.sjs.d.ts equivalent — embedded TS declarations
type Option<T> = { tag: 'Some', value: T } | { tag: 'None' };
type Result<T, E> = { tag: 'Ok', value: T } | { tag: 'Err', error: E };
type Iterator<T> = { next(): IterResult<T> };
type IterResult<T> = { tag: 'Done' } | { tag: 'Value', value: T };
interface Comparable<T> { compareTo(other: T): -1 | 0 | 1; }
interface Display { toString(): string; }
interface Eq<T> { equals(other: T): boolean; }
```

These are **canonical**. The SJS stdlib does not re-declare them; it re-exports them. The compiler treats `import { Option } from "@superjs/std/core"` as a reference to the built-in `Option`.

**Layer 1 — Pure SJS stdlib modules** that use *only* Layer 0 types:

- `@superjs/std/string` (uses `Option`, `Result`)
- `@superjs/std/math`
- `@superjs/std/collections.List` (uses `Iterator`, `Option`)
- `@superjs/std/async` (uses `Promise`, `Result`)

These compile with the bare compiler. No circular dependency on themselves because they only consume Layer 0.

**Layer 2 — SJS stdlib modules** that may use Layer 1:

- `@superjs/std/json` (uses string parsing from Layer 1)
- `@superjs/std/fs`, `@superjs/std/path` (use string + Result)
- `@superjs/std/time` (uses number + Result)

### 2.3 The build pipeline

```
1. Compile the TS compiler:                npm run -w compiler build
2. Compile Layer 1 stdlib using (1):       superjs build --self-bootstrap stdlib/L1/**/*.sjs
3. Compile Layer 2 stdlib using (1)+(2):   superjs build --self-bootstrap stdlib/L2/**/*.sjs
4. Pack each stdlib subpackage:            for pkg in stdlib/L1/* stdlib/L2/*; npm publish $pkg
```

A `--self-bootstrap` flag tells the compiler "Layer 0 types are built-in; do not require `import` resolution to find them in `node_modules`." Normal user builds resolve `@superjs/std` normally through `node_modules`.

### 2.4 No self-hosting at v1.0

Removed from scope. Reasoning: self-hosting is dogfood but provides zero new user value. It would also force the stdlib to grow to support compiler implementation patterns (visitors, big trees, file I/O scaling) before we know what users want. Post-1.0 R&D ticket.

### 2.5 Phase dependency graph (corrected)

```
Phase 2 = the only phase before v1.0
  Sprint 0: TS compiler scaffold + Layer-0 types embedded
  Sprint 1: parser + AST
  Sprint 2: type checker port to new AST
  Sprint 3: codegen + source maps
  Sprint 4: .d.ts → .d.sjs translator + top-30 hand-curated wrappers ←─ INTEROP GATE
  Sprint 5: incremental + watch + CLI
  Sprint 6: LSP M1 (diagnostics + hover + definition + completion)
  Sprint 7: Layer-1 stdlib + Layer-2 stdlib
  Sprint 8: VS Code extension + Vite plugin + Jest transform
  Sprint 9: formatter rewrite + linter (15 rules)
  Sprint 10: server-side playground + migration tool (TS → SJS)
  Sprint 11: docs (tour 20 lessons + error reference + migration guide)
  Sprint 12: LSP M2 (rename, references, code actions, inlay hints) + REPL
  Sprint 13: beta program kick-off; 3 friendly teams onboarded
  Sprint 14: bug bash, perf pass, memory audit, security review
  Sprint 15: RC1 → RC2 → RC3
  Sprint 16: 1.0 GA

Each sprint = 4 weeks (NOT 2). Total: 17 sprints × 4 weeks = 68 weeks ≈ 16 months for one person.
With 1 co-maintainer recruited at sprint 3: ~12 months.
With 2 co-maintainers: ~9 months.
```

Phase 3 (LLVM, native binaries, WASM compiler) is **removed from this plan** and tracked as a separate post-1.0 R&D document.

---

## 3. Priority #1: JS/TS Interop

**This is the product.** SJS is a compile-to-JS language that promises drop-in npm interop. If a TS user runs `superjs add react` and React is `dynamic`, the deal is broken.

### 3.1 Two-track strategy

**Track A — Hand-curated wrappers for the top 30 packages.** Lives in `@superjs/types/*`. Hand-written `.d.sjs` files. Quality bar: at least as useful as `@types/*` would be in `tsc --strict`. Updated alongside upstream releases.

**Track B — `.d.ts → .d.sjs` auto-translator.** Best-effort translation for everything else. Explicit `dynamic` markers, never silent.

### 3.2 The `.d.ts → .d.sjs` translator

Located at `compiler/src/dts/`. Strategy per TS construct:

| TS construct | SJS translation | Loss? |
|---|---|---|
| `interface I { x: T }` | `interface I { x: T }` | None |
| `type A = T` | `type A = T` | None |
| `T \| U` (union) | `T \| U` | None |
| `T & U` (intersection of object types) | Auto-merge into a composed interface `interface IT_U extends T, U {}` when both are object types and their property sets do not conflict. Otherwise `dynamic` with `// @sjs:dynamic reason="intersection-not-mergeable"`. | Partial (some intersections lost) |
| `keyof T`, `T[K]` | `dynamic` with `@sjs:dynamic reason="indexed-access"` and a `string` fallback for `keyof` returns | High |
| Mapped types `{ [K in keyof T]: ... }` | `dynamic` with marker | High |
| Conditional types `T extends U ? X : Y` | `dynamic` with marker; if both branches collapse to same type after substitution at translate time, use that | High |
| Template literal types `\`prefix-${T}\`` | `string` with marker | Medium |
| `enum E { A, B }` | `type E = "A" \| "B"` (string union) for string enums; `type E = 0 \| 1` for numeric | None for simple enums |
| `namespace N` | Re-shape to module if importer permits; otherwise `dynamic` with marker | Medium |
| Declaration merging | First declaration wins; subsequent ones emit a translator warning | Medium |
| `infer X` | `dynamic` with marker | High |
| `this` types in method chains | Replaced with class name (loses `F-bound` polymorphism for fluent builders) | Medium |
| Overloaded function signatures | Translated as a union return type; SJS user pattern-matches | Low (verbose but typed) |
| `unknown` | `dynamic` | None |
| `any` | `dynamic` (with a translator warning, since `any` indicates upstream weak typing) | None |
| Generic constraints `<T extends U>` | `<T: U>` | None |
| Default generics `<T = X>` | Same | None |

**Caching.** Translation is per-package, keyed on `(package name, version, translator version)`. Cached in `.superjs/dts-cache/`. Eager translation runs on `superjs add <pkg>`; lazy translation on first import of an unknown package, with a one-line "translating @types/foo (3.4.2) …" status line.

**Reporting.** `superjs doctor` prints, per imported package:

```
react@18.3.1: 87% typed (134/154 exports), 20 dynamic markers
  - top dynamic causes:
    - `useReducer`: conditional type → dynamic (1 export)
    - `forwardRef`: this-type → dynamic (1 export)
    - JSX intrinsic attributes: mapped type → string-keyed dynamic
```

### 3.3 Hand-curated wrappers (Track A)

Located at `@superjs/types/*`. For each package, the wrapper is a `.d.sjs` file plus a thin runtime adapter when needed (e.g. promise-returning APIs auto-wrapped to `Promise<Result<T, dynamic>>` via a `wrap` helper).

**Top 30 packages (v1.0 commitment):**

| # | Package | Why | Effort |
|---|---|---|---|
| 1 | `react` | Frontend baseline | L |
| 2 | `react-dom` | | M |
| 3 | `@types/node` (Node built-ins) | Every Node app | L |
| 4 | `express` | REST baseline | M |
| 5 | `fastify` | Alt REST | M |
| 6 | `hono` | Workers/edge | S |
| 7 | `zod` | Schema-heavy; needs special handling (see §12.4) | L |
| 8 | `valibot` | Lighter schema lib | M |
| 9 | `prisma` (Prisma Client) | ORM; banned features collide (see §12.5) | XL |
| 10 | `drizzle-orm` | Alt ORM | L |
| 11 | `kysely` | Query builder | L |
| 12 | `pino` | Logging | S |
| 13 | `winston` | Logging | S |
| 14 | `lodash` / `lodash-es` | Util | M |
| 15 | `date-fns` | Date util | M |
| 16 | `axios` | HTTP client | S |
| 17 | `node-fetch` / built-in `fetch` | | S |
| 18 | `@aws-sdk/client-s3`, `client-dynamodb`, `client-lambda`, `client-sqs` | AWS baseline | L (codegen from AWS spec) |
| 19 | `dotenv` | Env loading | S |
| 20 | `jsonwebtoken` | Auth | S |
| 21 | `bcrypt` | Auth | S |
| 22 | `commander` / `yargs` | CLI args | M |
| 23 | `chalk` | Terminal colours | S |
| 24 | `vitest` / `jest` | Test frameworks (consumed via transform layer) | M |
| 25 | `next` | Next.js | L |
| 26 | `vite` | Build | M |
| 27 | `esbuild` | Build | S |
| 28 | `cloudflare:workers` types | Workers runtime | M |
| 29 | `@cloudflare/workers-types` | | M |
| 30 | `puppeteer` / `playwright` | E2E testing | M |

For each: a `STATUS.md` in the wrapper documents what is typed, what is `dynamic`, and any deliberate behavioural shims (e.g. Result-wrapping for `fs.readFile`).

### 3.4 Banned features that hurt npm interop — and what we do about each

| Banned feature | What we lose | Mitigation |
|---|---|---|
| Intersection types `A & B` | Fluent builders, mixin patterns (Express middleware augmentation, Prisma extends) | Auto-merge object-type intersections in `.d.ts` translator (§3.2). For dynamic augmentation (e.g. Express `Request` augmentation), users `import { Request } from "@superjs/types/express"` which is a frozen interface; further augmentation requires a hand-curated extension `.d.sjs`. |
| Mapped types `{ [K in keyof T]: U }` | Zod inference, Prisma model types, `Pick`/`Omit` patterns | For Zod: hand-curated wrapper that exposes typed parser results without mapped types — see §12.4. For Prisma: see §12.5. For `Pick`/`Omit`: re-emit as flattened interfaces at translate time, with translator emitting one declaration per pick site. |
| Conditional types `T extends U ? X : Y` | Library-defined utility types | Translated to `dynamic` with marker. Wrapper authors can hand-substitute. |
| Template literal types | Route typing (`/users/${id}`), CSS-in-JS keys | Translated to `string`. Frameworks that depend on this (e.g. typed routing in `@tanstack/router`) get hand-curated wrappers post-1.0. |
| Decorators (TS legacy form) | Class libraries (TypeORM, NestJS) | SJS supports TC39 Stage 3 decorators only. TypeORM/NestJS adoption is post-1.0; documented as a known limitation. |
| `declare module "x"` augmentation | Express `Request`, React `JSX.IntrinsicElements` extension | Hand-curated wrappers expose extension points as named types the user can extend via composition. Documented in migration guide. |

### 3.5 Compatibility matrix

Maintained at `docs/compat/`. One row per npm package; columns:

- Hand-curated wrapper available? (Y/N)
- Auto-translation typed-surface %
- Known runtime caveats
- Recommended approach
- Last verified version

Published as a sortable HTML table on the docs site.

### 3.6 Effort budget for interop

- Translator (Track B): Sprint 4 alone (4 weeks). One person. Bare-minimum coverage.
- Top-30 hand-curated wrappers (Track A): Sprint 4 starts; concurrent with all later sprints; not finished until Sprint 13. ~80 person-days total.
- Compat matrix tooling: Sprint 6 (rolled into LSP work; reuses module-resolution).

If Track B does not reach the §1.3 gate by Sprint 8 (week 32), v1.0 slips. This is the highest-risk single item in the roadmap.

---

## 4. Phase 2 — Custom Compiler (Scoped)

### 4.1 What is in scope at v1.0

- Hand-written lexer + Pratt-style parser with explicit error recovery (§12.7).
- AST with stable schema (versioned via `astVersion: 1`).
- Type checker with bidirectional checking (see §4.3).
- Codegen to ES2022; source maps v3 with `names`.
- Incremental compilation with module-level dependency graph and public-API hashing.
- Single CLI binary `superjs` with subcommands `build | check | lint | format | test | repl | lsp | explain | init | add | doctor`.

### 4.2 What is out of scope at v1.0

- LLVM / native binaries / WASM compiler (post-1.0 R&D).
- Self-hosting (post-1.0).
- Variance annotations on generics (post-1.0; invariant only at v1.0).
- Top-level `await` (post-1.0).
- Property-test framework, bench framework, snapshot framework.
- Operator overloading.
- Channels / CSP.
- Decimal type, Rational type.
- DOM stdlib.
- Custom linter plugin API (`@beta` at v1.0).

### 4.3 Type checker — bidirectional checking

Round 1 said "Hindley-Milner-style local inference". HM does not extend to structural subtyping (which SJS has) cleanly. Commit to **bidirectional type checking** (Pierce & Turner, "Local Type Inference") with these specifics:

- Two judgements: `Γ ⊢ e ⇒ T` (e synthesises T) and `Γ ⊢ e ⇐ T` (e checks against T).
- **Synthesise** for: literals, identifiers, function applications, member access, generic instantiation, `match` discriminants (synthesise then narrow per arm).
- **Check** for: function bodies (against declared return type), match arms (against expected match type or LUB), object literals (against declared object type), array literals (against expected element type).
- **Annotation requirements:** parameters of exported functions, return types of exported functions, exported `let`/`const` bindings, exported class fields. Locals may be inferred.
- **Narrowing:** flow-sensitive narrowing on `if (x == null) return; …`, on match arms, on `typeof` checks for `dynamic`, on `instanceof` for classes.
- **Subtyping:** structural for object types and interfaces; nominal for classes and variant constructors; `T <: T?` always; `null <: T?` always; covariant return / contravariant parameter for function types; invariant generics (no variance annotations at v1.0).
- **Unification:** local unification within a function body for inferring generic type arguments at call sites. No global inference across module boundaries.
- **Algorithm reference:** implement Dunfield & Krishnaswami's bidirectional algorithm (their 2013 paper) adapted for structural object types. Specifically: rules `Var`, `Sub`, `Anno`, `→I`, `→E`, `→I⇒`, plus a `MatchE` rule for match expressions and a `Variant` rule for sum-type constructors.

Implementer-level deliverable: `compiler/src/checker/algorithm.md` — concrete inference rules, all written down, with one numbered worked example per rule.

### 4.4 Parser — error recovery spec

Round 1 said "synchronisation tokens". Here is the actual recovery design.

**Strategy: panic-mode recovery at statement and item boundaries, with phrase-level recovery inside expressions.**

| Failure point | Strategy | Sync set |
|---|---|---|
| Top-level item | Panic | `function`, `class`, `interface`, `type`, `let`, `const`, `import`, `export`, `;`, EOF |
| Statement | Panic | `;`, `}`, top-level keywords, EOF |
| Expression in parens / brackets / braces | Phrase-level: scan to matching close-bracket, ignoring nested brackets. If close-bracket not found, panic to statement sync set. | matching `)`, `]`, `}` |
| Match arm | Phrase-level: scan to next `,` or `}`. If next arm parse also fails, panic. | `,`, `}` |
| Type expression | Phrase-level: scan to `,`, `>`, `)`, `=`, `{`, `;`. | `,`, `>`, `)`, `=`, `{`, `;` |
| Pattern | Phrase-level: scan to `=>`, `,`, `)`, `}`. | `=>`, `,`, `)`, `}` |
| Decorator | Skip the decorator; continue with the following declaration. | `function`, `class`, `let`, `const`, `;` |

**Error productions** (specific common typos):

- Missing `;` at end of statement: emit `SJS-P001` once per missing `;`, insert virtual `;`, continue.
- `=` instead of `==` in `if`: emit `SJS-P002`, continue with `==` interpretation.
- `let x: = 1` (missing type): emit `SJS-P003`, treat as inferred.
- `function foo() => { ... }` (arrow on declaration): emit `SJS-P004`, accept as function decl.
- `match x { ... }` (missing parens): emit `SJS-P005`, continue.

**Cascading suppression in the parser:**

- The parser maintains a "recovery streak counter". After 3 consecutive recoveries without successfully parsing an item, emit `SJS-P099` ("parser cannot make progress; subsequent errors suppressed") and skip to next top-level item.

**Recovery golden tests:**

- `tests/fixtures/parser-recovery/` — each test is an input `.sjs` with deliberate errors plus an expected `errors.txt` containing the *sequence* of error codes, not just the final AST. We assert that recovery does not produce phantom errors.

### 4.5 Compile error UX — full spec

Round 1 said "Rust-style errors". Here is the concrete UX.

**Rendering library:** `picocolors` (zero-dep) for colour; custom span-rendering module `compiler/src/diagnostics/render.ts`. We do not depend on `chalk` (transitive dep weight) or write our own ANSI escape parser.

**Terminal width detection:** `process.stdout.columns || 100`. Wraps to terminal width with proper Unicode width handling via `string-width` (one dep, vetted).

**Span rendering algorithm:**

1. For each diagnostic, compute the source lines covered.
2. Render with format:
   ```
   error[SJS-E001]: possible null dereference
     ┌─ src/foo.sjs:10:5
     │
   10│     console.log(maybeName.length)
     │                 ^^^^^^^^^ this could be null
     │
     note: `maybeName` was declared `string?` at src/foo.sjs:8:9
     help: pattern match: `match (maybeName) { null => …, n => console.log(n.length) }`
   ```
3. Multi-line spans render with a vertical bar in the gutter.
4. Two errors sharing the same root cause are grouped: the root is rendered first, dependent ones rendered as "(also caused by SJS-E001 at line 10) at line 12, 15, 23".

**Error grouping policy:**

- A "poisoned" symbol (one whose declaration produced an error) suppresses all references to that symbol.
- Two errors at distinct sites pointing to the same span are deduplicated.
- Per-file cap: 50 errors. After 50, render "(50+ more errors suppressed; fix above first)".
- Per-build cap: 500 errors. After 500, abort.

**JSON / machine-readable output (`--format json` or `--format ndjson`):**

Schema (versioned in `spec/diagnostics.schema.json`):

```json
{
  "version": "1",
  "diagnostic": {
    "code": "SJS-E001",
    "severity": "error",
    "message": "possible null dereference",
    "span": {
      "file": "src/foo.sjs",
      "startLine": 10, "startCol": 17,
      "endLine": 10, "endCol": 26,
      "byteStart": 142, "byteEnd": 151
    },
    "labels": [
      { "span": {...}, "message": "this could be null" }
    ],
    "notes": ["`maybeName` was declared `string?` at src/foo.sjs:8:9"],
    "helps": ["pattern match: ..."],
    "fix": {
      "edits": [
        { "span": {...}, "newText": "match (maybeName) { ... }" }
      ]
    }
  }
}
```

Schema is semver-stable from v1.0. Editor extensions consume this.

**Error code stability:**

- Each `SJS-EXXX` code, once shipped in a stable release, is permanent. Codes are never reused.
- Splitting an error class: the original code remains as a deprecated alias mapping to one of the new codes for at least 6 months.

**i18n:** English-only at v1.0. The internal message templates are parameterised (positional args) so future translation tables can be added without changing call sites.

### 4.6 Tree shaking + sum types

**The problem:** Round-1 plan promised tree shaking *and* `{ tag, value }` runtime representation. Bundlers cannot statically prove that an unused variant constructor is dead because the discriminator (`tag`) is a runtime string.

**The decision: representation per build mode.**

| Build mode | Representation | Tree-shakeable? | Use when |
|---|---|---|---|
| `default` | `{ _tag: "Ok", _0: value }` plain object literals; constructors compile to inline object literals at call sites | Yes, because constructors are inlined, no per-variant import is needed | App code, libraries, default |
| `classes` (opt-in via `superjs.config.json` `output.variants: "classes"`) | One class per variant: `class Ok { constructor(_0) { this._0 = _0 } }`; `match` compiles to `if (x instanceof Ok) ...` | Yes (per-class import), and `instanceof` works | When npm interop demands `instanceof` checks |

**Why inlining the constructor works:** A variant constructor in SJS like `Ok(42)` desugars to `{ _tag: "Ok", _0: 42 }` directly at the call site. No `Ok` function exists at runtime in the default mode. Hence no per-variant symbol exists for the bundler to keep alive. Pattern matching is compiled to `if (x._tag === "Ok") ...` — a string comparison, no symbol reference.

**Cost of the default mode:** Loses `instanceof`. JS interop that does `if (e instanceof HttpError) ...` cannot work on SJS-emitted variants in default mode. The compatibility matrix flags this per-package.

**Class mode trade-off:** Larger bundle (one class per variant), slower allocation (`new` vs literal), but `instanceof` works and per-variant tree shaking via named imports is straightforward.

Both modes documented in §12 and in the user-facing migration guide.

### 4.7 Source maps + optimisations

Round 1 promised "per-token source maps" *and* "constant folding, DCE, switchify, inline". These conflict. Resolution:

- `superjs build` emits source maps mapped per AST node, not per token. Token-level mapping is over-precise and the V8 source-map consumer collapses adjacent positions anyway.
- `superjs build --release` runs the optimisation passes and *also* emits source maps, but maps are best-effort: optimised nodes that no longer exist in output are mapped to their original span; nodes that were inlined are mapped to the inline site (with a `names` entry pointing back to the original).
- `superjs build --debug` (default during `--watch`) skips optimisations entirely and produces high-fidelity source maps.

This is the standard convention (TypeScript, esbuild, swc all do this); round 1 just didn't say so.

### 4.8 Build determinism

Same `(input file set, compiler version, config hash, env-allowlist)` → byte-identical output JS and source map.

Enforcement:

- Hashmaps must use insertion-ordered iteration (Node's `Map` is fine; bare `{}` is not).
- No `Date.now()` in codegen output (no banner with build time).
- No `Math.random()` for fresh identifier generation; use deterministic counter seeded from file path.
- CI step: build twice in two different cache directories, `diff -r` the outputs; CI fails if any byte differs.

### 4.9 Incremental compilation — public API hashing definition

Round 1 said "public API hashing" without defining what's hashed. Here is the spec:

The **public API hash** of a module `M` is a stable hash over:

- Names and types of every `export`ed value, including default values where they are part of the type (e.g. `export function foo(x: number = 0)` — the type is `(x?: number) => …`).
- Names and shapes of every `export`ed type / interface / class. Class shapes include method signatures and field types but exclude method bodies.
- Names of every `export *` re-export target (but not the targets' content; transitivity handled by re-evaluation of the re-exported module's hash).
- Decorators on exported declarations (since decorators may change runtime behaviour or interface shape).
- Doc comments on exported declarations (since LSP hover surfaces them; a doc change must re-issue hovers but does not re-check downstream code — so we maintain two hashes: `apiHash` for re-checking and `docHash` for LSP cache invalidation).

When `apiHash` of `M` changes, every direct importer of `M` is re-checked. When only `docHash` changes, importers are not re-checked but their LSP caches for symbols re-exported from `M` are invalidated.

---

## 5. DX Tools (Prioritised by user impact)

In strict priority order. Each item has a milestone (M1 = v1.0 ship; M2 = v1.1+).

### 5.1 LSP server (`@superjs/lsp`) — M1

The single most important tool. If the LSP is bad, no one switches from TS.

**M1 methods (v1.0 ship):**

- `textDocument/publishDiagnostics` — push on change, debounced 150 ms.
- `textDocument/hover` — type at cursor, doc comments. Implementation: `typeChecker.typeAt(file, line, col)` API on the Phase 2 checker.
- `textDocument/definition` — go to declaration.
- `textDocument/completion` — context-aware (identifiers in scope, members, variant constructors in match patterns, JSX attribute names).
- `textDocument/signatureHelp` — current call signature with active parameter highlighted.
- `textDocument/formatting` — delegates to formatter.
- `textDocument/documentSymbol` — outline.
- `textDocument/foldingRange` — folding.
- `textDocument/semanticTokens/full` — semantic highlighting (variants vs constructors vs functions).

**M2 (post-v1.0):**

- `textDocument/references`, `rename`, `codeAction`, `inlayHint`, `prepareCallHierarchy`, `documentHighlight`, `onTypeFormatting`, `willSaveWaitUntil`, `codeLens`, `linkedEditingRange`, `workspace/symbol`.

**LSP memory budget (the round-1 plan ignored this; the critic flagged it):**

- Idle (no edits, project loaded): ≤ 250 MB for a 100k LOC project.
- Active editing: ≤ 500 MB.
- Strategy:
  - The module graph holds weak references to AST nodes; ASTs of files not currently visible to the user are evictable.
  - Per-file diagnostic caches expire after 5 minutes idle.
  - A `superjs.config.json` `lsp.memoryBudgetMB` setting hard-caps; when exceeded, the LSP evicts oldest caches.
  - CI memory-leak test: open 1000 files in sequence, edit each once, watch RSS. Must not grow monotonically.
  - Heap snapshot test: `node --inspect`-based test that asserts no retained references after closing a file.

**Implementation:** built on `vscode-languageserver` npm package, talks to the Phase 2 compiler API directly (in-process — the LSP and the compiler are the same Node process).

**Cold start:** ≤ 3 s on a 100k-LOC project (parse + initial check). Warm: instant.

### 5.2 VS Code extension — M1

- TextMate grammar at `tools/vscode-extension/syntaxes/superjs.tmLanguage.json` — **hand-written** (round 1's "auto-derived from EBNF" was wrong; TextMate grammars are regex-based and cannot be derived).
- Embeds the LSP.
- Ships a Debug Adapter Protocol launch configuration (see §5.4).
- Custom debugger formatter for sum types via `inspect` extension (see §5.4).
- Snippets: `fn`, `class`, `match`, `result`, `option`, `interface`, `type`.
- Marketplace listing with screenshots; tested on Windows / macOS / Linux.

No JetBrains plugin, no Vim plugin, no Neovim plugin at v1.0. LSP is editor-agnostic; community can write configs.

### 5.3 Server-side playground — M1

Round 1's "WASM compiler in the browser" is infeasible — the Phase 2 compiler is TypeScript, not Rust, and a JS-compiler-in-WASM still requires bundling 5–15 MB of compiler. Solution: **server-side execution.**

**Architecture:**

- Static frontend (Next.js or Astro) hosted on Cloudflare Pages: Monaco editor + run button + share URL.
- Backend execution: a Cloudflare Worker per request that runs the compiler against the input, returns compiled JS + diagnostics. Worker uses Workers' isolated V8 contexts for sandbox.
- Optional "run" step: execute the compiled JS in a Cloudflare Sandbox SDK isolate with 1 s CPU budget, 128 MB memory, no network, no FS.
- Share: state encoded as URL fragment via base64 of gzipped `{ code, version }`. State stays client-side; no server storage; GDPR-trivial.
- Rate limiting: per-IP, 60 compiles/minute (Workers KV counter). Exceeded → 429.
- Versioning: `?version=0.9.3` selects an older compiler (one Worker per published version, lazy-loaded).

**Cost:** Cloudflare Workers free tier covers ~100k requests/day. Beyond that, paid plan ~$5/month for 10M requests. Affordable.

**Not in v1.0:** in-browser LSP, in-browser bundler, npm-package resolution in the playground (Layer-1 + Layer-2 stdlib + the top-30 wrappers are pre-bundled into the playground's worker; arbitrary npm packages don't work).

### 5.4 Debugger — DAP-based, M1

Round 1 said "use source maps + Node Inspector". That is necessary but not sufficient. Specification:

**Strategy:** The VS Code extension ships a launch config that uses the **built-in Node Debug Adapter** (DAP) plus SJS-specific extensions delivered via the extension itself.

**DAP launch config:**

```json
{
  "type": "node",
  "request": "launch",
  "name": "Launch SJS file",
  "program": "${file}",
  "preLaunchTask": "superjs: build",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "sourceMaps": true,
  "smartStep": true,
  "skipFiles": ["<node_internals>/**", "**/.superjs/runtime-helpers.js"],
  "console": "integratedTerminal"
}
```

**Variable formatters (sum types):**

The VS Code extension contributes a `debug.inlineValuesProvider` and a `node.util.inspect` extension that the SJS runtime helpers register. The runtime helpers file (`@superjs/runtime/inspect`) defines:

```ts
const customInspect = Symbol.for('nodejs.util.inspect.custom');

function attachInspect(obj) {
  Object.defineProperty(obj, customInspect, {
    enumerable: false,
    value(depth, opts) {
      // Renders Ok(42) instead of { _tag: 'Ok', _0: 42 }
    }
  });
}
```

In the **default** representation (§4.6), variant literals get the `customInspect` symbol attached at construction (via a tiny helper inlined into the variant literal). In **classes** mode, each variant class has the symbol on its prototype.

**For Chrome DevTools** (browser debugging): a "Chrome Formatter" extension is included with the VS Code extension; users enable "Custom Formatters" in DevTools. We do not ship a separate Chrome extension at v1.0.

**For Bun / Deno:** Bun uses Node's inspect protocol; works automatically. Deno uses V8 Inspector; documented setup in the migration guide.

**Source map composition** (SJS → JS → bundled JS): Vite plugin chains source maps via `magic-string` (Vite's standard). Tested end-to-end: stack trace in a Vite-bundled prod build points to original `.sjs` lines.

### 5.5 Formatter — M1

- Gofmt-style: one canonical output, zero config.
- Implemented in `compiler/src/formatter/`. Reuses the Phase 2 lexer + parser.
- Idempotent: CI test runs `format(format(x))` and asserts byte-equality.
- Property test: random valid `.sjs` inputs → formatted output reparses to same AST.
- Comment handling: doc comments stay attached to the declaration; line comments retain their position relative to the statement they precede; trailing comments stay trailing.
- Performance: ≤ 50 ms for a 1k-line file.

### 5.6 Linter — M1

- Ships **15 rules**, not 50. The 15 to ship:
  1. `no-unused-import`
  2. `no-unused-var`
  3. `no-unused-function`
  4. `no-shadowing`
  5. `no-explicit-dynamic` (warns; can be allowed via `// @sjs:dynamic-ok`)
  6. `prefer-const`
  7. `no-empty-match`
  8. `no-redundant-match-arm`
  9. `prefer-result-over-throw`
  10. `no-floating-promise`
  11. `no-non-null-assertion-without-comment`
  12. `prefer-arrow-callback`
  13. `no-circular-import`
  14. `no-mixed-spaces-tabs` (handled by formatter, but lint provides clearer error)
  15. `import-order`

- Auto-fix declared per rule; `superjs lint --fix`.
- Plugin API is `@beta` at v1.0. Documented but not semver-stable until v2.0.

### 5.7 REPL — M2

Not v1.0. Defer.

### 5.8 Migration tool (TS → SJS) — M1

- `superjs migrate from-ts <dir>` walks `.ts`/`.tsx` files; produces `.sjs`/`.sjs` (we keep the same file naming, JSX is detected from content).
- Handled rewrites: enums → unions or sum types; namespaces → modules; intersection of object types → composed interface; `any` → `dynamic` (with warning); `unknown` → `dynamic`; class field decorators (legacy) → flagged for manual review.
- Errors flagged for manual review (with `// TODO@sjs-migrate:` comments): mapped types, conditional types, `infer`, template literal types, declaration merging.
- Emits `MIGRATION_REPORT.md` summarising counts of automated / manual / failed.
- Idempotent on already-migrated input (no-op).

### 5.9 Migration tool (JS → SJS) — M2

Not v1.0. Defer. Plain `.js` → `.sjs` is essentially "type everything as `dynamic`", which provides little value at v1.0.

### 5.10 Refactoring tools — M1 (minimal)

At v1.0 only:

- Rename symbol (via LSP `rename`, planned M2 — yes, this means rename is **post-1.0**; we are honest).

Actually, given the v1.0 LSP only ships M1 methods (no rename), **all refactoring is post-1.0**. The migration guide documents this explicitly: "Renaming is supported by your editor's text-based find-and-replace at v1.0; semantic rename ships in v1.1."

Post-1.0 refactorings (M2):

- Rename symbol
- Extract function
- Inline variable
- Introduce type alias
- Convert callback to async/await
- Convert match to if/else and back
- Move file (updates imports)

### 5.11 Build tool integrations — M1 only the essentials

- `@superjs/vite-plugin` — required.
- `@superjs/jest-transform` — required (Jest is the v1.0 test path).
- `@superjs/vitest-transform` — required (also widely used).
- `@superjs/esbuild-plugin` — required (small effort, big surface).

Not v1.0:

- Webpack loader, Rollup plugin, Next.js plugin (deferred to v1.1), Cloudflare Wrangler plugin (deferred to v1.1; primary user uses Workers but Vite plugin + Workers types covers the common case).

---

## 6. Standard Library (Scoped to v1.0)

Restated for emphasis from §1.5. This is small on purpose.

```
@superjs/std/core
  Option<T>          // Layer 0, compiler built-in
  Result<T, E>       // Layer 0
  Iterator<T>        // Layer 0
  IterResult<T>      // Layer 0
  Comparable<T>      // Layer 0
  Display            // Layer 0
  Eq<T>              // Layer 0
  Clone<T>           // Layer 0
  panic              // Layer 0
  assert, todo, unreachable  // Layer 0

@superjs/std/collections
  List<T>            // Layer 1; wraps Array internally, exposes Result-returning ops
  // Map and Set are thin typed wrappers around JS Map/Set, not bespoke types.

@superjs/std/string
  split, join, trim, lower, upper, replace, includes, startsWith, endsWith
  parseInt(s): Result<number, ParseError>
  parseFloat(s): Result<number, ParseError>
  format(template, args): string  // small printf-style helper

@superjs/std/math
  abs, sign, min, max, clamp, lerp, round, floor, ceil, trunc
  sin, cos, tan, exp, log, sqrt, pow
  PI, E, INFINITY
  random(), randomInt(min, max)

@superjs/std/async
  sleep(ms): Promise<void>
  timeout<T>(p, ms): Promise<Result<T, TimeoutError>>
  all<T>(promises): Promise<Result<T[], dynamic>>
  allSettled<T>(promises): Promise<Result<T, dynamic>[]>
  race<T>(promises): Promise<T>
  // No Channel, no CancellationToken at v1.0; AbortSignal interop via the adapter:
  fromAbortSignal(s): /* something */
  toAbortSignal(): AbortSignal

@superjs/std/json
  parse(s): Result<dynamic, ParseError>
  parseAs<T>(s, schema: Schema<T>): Result<T, ParseError>
  stringify(v, opts?): string
  // Schema builder:
  Schema.string(), Schema.number(), Schema.boolean(), Schema.null_(),
  Schema.object<T>({...}), Schema.array<T>(item),
  Schema.union<A,B>(a, b), Schema.optional<T>(t),
  Schema.refine<T>(s, pred, msg)

@superjs/std/fs (Node only)
  readFile(path): Promise<Result<string, IoError>>
  writeFile(path, content): Promise<Result<void, IoError>>
  readDir(path): Promise<Result<string[], IoError>>
  stat(path): Promise<Result<FileStat, IoError>>
  exists(path): Promise<boolean>

@superjs/std/path
  join, resolve, dirname, basename, extname, relative, isAbsolute
  // sep: "/" on POSIX, "\\" on Windows (matches Node)

@superjs/std/process
  argv(): string[]
  env(name): Option<string>
  cwd(): string
  exit(code?: number): never
  platform(): "darwin" | "linux" | "win32"

@superjs/std/time
  Instant         // wraps Date / number-of-ms
  Duration        // wraps number-of-ms
  now(): Instant
  parseISO(s): Result<Instant, ParseError>
  Instant.toISO(): string
```

**Not in v1.0 stdlib:** Channel, CancellationToken, Temporal-style types, DOM, fetch (use `globalThis.fetch` via interop), Web Streams, crypto, child_process, net, dgram, http server, EventEmitter wrapper, Intl, querystring, url, buffer/TypedArray ergonomics.

**Reified generics:** The `Schema<T>` builder is **runtime-reified** — `Schema.object({...})` creates a runtime value that knows the field shape. `T` itself is erased; the schema is the runtime witness. `parseAs<T>(s, schema)` is the only safe path from `dynamic` to `T`.

**`Symbol.iterator` bridge** (the round-1 plan promised `.iterator()` and JS uses `[Symbol.iterator]()`; the critic flagged the gap):

- SJS `Iterator<T>` interface requires `.next(): IterResult<T>` *and* an internal `[Symbol.iterator]()` method that returns `this`.
- SJS `for (const x of e)` desugars to:
  ```ts
  let _it = (e[Symbol.iterator] ?? e.iterator)?.call(e);
  if (!_it) panic("not iterable");
  while (true) {
    const r = _it.next();
    if ('done' in r && r.done) break;
    const x = r.value;
    // body
  }
  ```
- Native JS Array/Map/Set/Generator are iterable via `[Symbol.iterator]`. SJS user types implementing `Iterator<T>` get the symbol automatically via a tiny `attachIteratorSymbol` runtime helper inlined at the class definition site.
- Result: `for (const x of jsArray)` works. `for (const x of sjsList)` works. No surprises.

---

## 7. Testing Infrastructure

**Phase 2 (v1.0):** SJS test files (`*.test.sjs`) are run via **Jest** using `@superjs/jest-transform`. This is the default at v1.0. Same for Vitest via `@superjs/vitest-transform`.

The transform:

1. Reads `.sjs` source.
2. Calls `compiler.transformAsync(source)`.
3. Returns `{ code, map }` to Jest/Vitest.

That is it. No invented matchers, no rebuilt watch mode, no rebuilt parallelism — Jest and Vitest have spent 10 years getting those right.

**A thin SJS-facing matchers shim** ships as `@superjs/test-matchers`:

- Re-exports `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll` from Jest under typed signatures.
- Adds `expect(r).toMatchVariant("Ok")` for sum-type assertions.
- Adds `expect(r).toMatchVariantWith("Ok", v => v > 0)` for assertion + payload check.

That's the entire testing story at v1.0.

**Phase 2.5 (post-1.0): `@superjs/test` native runner.**

- Scope: `describe`, `it`, `expect`, `beforeEach`/`afterEach`/`beforeAll`/`afterAll`, async tests, mocks (spy/stub), timer mocking (`fakeTimers`), snapshot, watch mode, parallel file execution.
- **Not in scope ever:** trying to replace Jest's full ecosystem (custom reporters, custom resolvers, custom transformers — Jest stays the right tool when you need that complexity).
- Released as v1 only after dogfooding on the SJS compiler's own test suite for 3+ months.

**Property testing:** use `fast-check` via npm interop with the `@superjs/types/fast-check` wrapper. Not a native framework.

**Benchmarking:** use `tinybench` via interop. Not a native framework.

**Fuzzing the compiler:** custom AST-mutation fuzzer in `tools/fuzz/`; runs nightly in CI; corpus of crashing inputs grows over time. Each becomes a golden negative test.

**Coverage:** v8 native coverage via `c8`. Already works on JS output; SJS source maps make it work on `.sjs` source. No need for a custom instrumentation pass at v1.0.

---

## 8. Ecosystem & Distribution

### 8.1 npm publish

- `superjs` — the CLI. Pure JS at v1.0 (no native binary, no postinstall download). `npm install -g superjs` works on Windows / macOS / Linux without any extra steps.
- `@superjs/std-*` — split into one package per top-level subdirectory (`std-core`, `std-collections`, `std-string`, `std-math`, `std-async`, `std-json`, `std-fs`, `std-path`, `std-process`, `std-time`). Round 1 proposed a single `@superjs/std`; split-per-module is better for tree shaking.
- `@superjs/lsp`, `@superjs/jest-transform`, `@superjs/vitest-transform`, `@superjs/vite-plugin`, `@superjs/esbuild-plugin`, `@superjs/test-matchers`.
- `@superjs/types/*` — one package per top-30 wrapped npm package (`@superjs/types-react`, `@superjs/types-express`, …).

All published with `--provenance`. Changesets-driven releases. CI publishes on tag push.

### 8.2 No version manager at v1.0

`svm` (round 1's proposed nvm-equivalent) is removed. Reasons: too few users to justify, npm + `npx superjs@x.y.z` covers it, post-1.0 if demand materialises.

### 8.3 Windows support (the critic flagged this — round 1 had nothing concrete)

- File paths: all internal path handling goes through `@superjs/std/path` or Node's `node:path` — never string-concatenate with `/`.
- Line endings: source files may be LF or CRLF; the lexer normalises to LF internally. Output files use `os.EOL` by default; a `superjs.config.json` `output.eol` setting can override.
- Shell quoting in CLI: the CLI uses `cross-spawn` for any subprocess spawn (formatter pipelines, lint plugin loading) to avoid shell-quoting differences.
- The `superjs` binary on Windows: npm publishes a `bin/superjs.cmd` wrapper alongside `bin/superjs.js`. Standard npm convention; works out of the box.
- CI matrix includes Windows (windows-latest); all unit tests + integration tests + LSP smoke tests run on Windows.
- Long path support: respects `LongPathsEnabled` registry setting; tests with deep nesting (>260 chars) are part of the CI suite.

### 8.4 Distribution channels at v1.0

- npm (`npm install -g superjs` or per-project `npm install --save-dev superjs`).
- GitHub Releases: tagged release with changelog. No prebuilt native binaries at v1.0 (pure JS).
- No Homebrew, no apt/yum, no winget, no scoop at v1.0. Documented as "post-1.0 if community demand emerges". (Round 1 listed all of these; each is a multi-month commitment with ongoing maintenance.)

### 8.5 Code signing

Not required at v1.0 because there is no native binary. JS-only distribution via npm uses npm `--provenance` for attestation; no Apple Developer cert needed; no Windows Authenticode cert needed.

When native binaries arrive (post-1.0): the costs are real (Apple Dev $99/yr, Windows EV cert $300+/yr) and are tracked in a separate post-1.0 funding doc.

### 8.6 Auto-update

No `superjs upgrade` command at v1.0. Users update via npm. Documented as preferred path.

### 8.7 Air-gapped environments

- `superjs` and stdlib all install via npm with no postinstall network calls. Air-gapped environments that mirror npm internally (Verdaccio, Nexus, JFrog) work transparently.
- `superjs add <pkg>` does not require network beyond `npm install`.

### 8.8 Funding / sustainability

The honest position:

- No revenue model at v1.0. Solo maintainer + (hopefully) 1–2 co-maintainers.
- GitHub Sponsors enabled from day 1 of v0.2.
- Open to fiscal sponsorship through OpenCollective or a foundation post-1.0 if traction warrants.
- License: **MIT** for compiler, stdlib, and tooling. Permissive. No CLA required for contributions (DCO sign-off only). Trademark: "SuperJS" name not yet trademarked; explicit non-claim at v1.0 ("we have not registered a trademark; nothing prevents respectful forks").

---

## 9. Documentation & Learning

### 9.1 Language tour — M1

20 lessons (not 50). Each ≤ 5 min. Sequence:

1. Hello world
2. Variables & types
3. Functions
4. Control flow (`if`, `while`, `for`)
5. Null safety (`T?`)
6. Pattern matching basics
7. Sum types (Result, Option)
8. Records / interfaces
9. Generics (basics)
10. Classes
11. Modules / imports / exports
12. Async/await
13. JSX
14. Calling JS from SJS
15. Using `dynamic` and `Schema` for runtime safety
16. Errors and `Result`
17. Iterators and `for...of`
18. Decorators (the v1.0 subset)
19. Tooling tour (CLI, LSP, formatter)
20. Migrating a TS file

Each lesson has runnable code via the embedded server-side playground (§5.3).

### 9.2 Error code reference — M1

One Markdown file per `SJS-EXXX` at `docs/errors/`. Each: short description, broken code example, why it's wrong, three fix patterns, related codes.

`superjs explain SJS-EXXX` prints this from the CLI.

Every error code change requires the docs PR before the compiler PR can merge. This is enforced by a CI check that validates "for every code emitted by the compiler, a `docs/errors/SJS-EXXX.md` file exists".

### 9.3 Migration guide from TypeScript — M1

Three parts:

1. **Syntax differences** (banned features and how to rewrite them; concrete table).
2. **Idiom translation** (TS `try`/`catch` → SJS `Result`; TS `switch` → SJS `match`; TS enums → SJS unions).
3. **Library migration**: per top-30-package notes ("If you used `zod.object({a: z.string()}).parse(input)`, in SJS the equivalent is `import { Schema } from '@superjs/std/json'; Schema.object({ a: Schema.string() }).parse(input)`").

### 9.4 API reference — M1

Auto-generated from doc comments in stdlib source. Tool: `superjs docgen`. Lives at `docs/api/`.

### 9.5 Why SJS — M1

A single canonical "Why SJS" page that addresses:

- Why not just TypeScript?
- Why not ReScript? (See §13.)
- Why not Flow / Hegel / Civet / Imba / Elm / PureScript?
- What does SJS lose compared to TS? (Honest list.)
- What does SJS gain? (Concrete.)

### 9.6 Not at v1.0

- Video tutorials (post-1.0).
- "Best practices" guide as a separate document (folded into the tour and migration guide).

---

## 10. CI/CD & Release Process

### 10.1 Release cadence

- Patch: as needed (bug fixes).
- Minor: every 6–8 weeks.
- Major: only when breaking changes accumulate, no fixed schedule. No editions system at v1.0.

### 10.2 Tooling

- **Changesets** for version + changelog.
- **GitHub Actions** for CI.
- **`--provenance`** on every npm publish.
- **Sigstore** attestation on GitHub Release assets (no native binaries at v1.0, just the source-tagged release).

### 10.3 CI matrix

Per-PR (fast, ≤ 10 min P95):

- Lint + format check on the compiler source.
- Unit tests on Ubuntu × Node 22 LTS (the fast path).
- Golden tests (parser, codegen, formatter).
- Build the compiler against itself (sanity).

Nightly (slower):

- Full matrix: (Ubuntu, macOS, Windows) × (Node 20 LTS, Node 22 LTS).
- Stdlib tests.
- LSP smoke tests on all OS.
- Compatibility matrix run: re-translate top-200 packages, diff vs baseline.
- Compiler fuzz (1 hour budget).
- Benchmark suite; commit deltas to a perf database; flag regressions ≥ 5%.
- Memory leak test for LSP.
- Determinism test (build twice, byte-diff).
- Determinism test for the stdlib bootstrap.

### 10.4 PR benchmarks

Single representative project (the compiler itself); 3-run median; comment posted to PR. Soft fail at 10% regression; hard fail at 25%. No full matrix on every PR.

### 10.5 Security

- Dependabot enabled.
- `npm audit` advisory: high-severity → CI fail.
- Codeql on the compiler source.
- SECURITY.md with `security@superjs.dev` (or maintainer email).
- Disclosure SLA: 7 days triage, 30 days patch for critical (realistic for solo maintainer; round 1's 48h was unrealistic).

### 10.6 CI cost budget

Estimated GitHub Actions usage at projected v1.0 PR volume (~20 PRs/week):

- Per-PR (10 min × 1 machine) × 20 PRs/week = 200 min/week.
- Nightly (60 min × 6 machines) × 7 = 2520 min/week.
- Total ≈ 11,000 min/month, well within GitHub free tier (2000 min/month) plus Pro at $4/month (3000 min) — needs **paid runners** at small scale. Budget: ~$50/month at v1.0.

---

## 11. Language Stability & Governance

### 11.1 Governance for a small team

No formal RFC repo, no foundation, no quorum vote at v1.0. The lightweight equivalent:

- **GitHub Discussions** for proposal threads. A proposal needs:
  - Motivation
  - Detailed design (concrete enough to implement)
  - Alternatives considered
  - Migration / deprecation impact
  - Open questions
- Maintainer (+ co-maintainers once recruited) approve via reactions and a final-comment-period of 7 days for substantive proposals.
- No anonymous voting; decisions are public threads.
- Larger proposals (anything affecting the type system or breaking semantics) require a Markdown doc in `rfcs/` — but the rest can be Discussion threads.

### 11.2 Backfilled RFCs

Round 1 promised "20 backfilled RFCs (1500 words each)" in 2 weeks. Removed. We backfill **5** RFCs covering the most consequential pre-1.0 decisions:

1. No `any`; introduce `dynamic`.
2. Banning intersection / conditional / mapped / template-literal types.
3. Sum types with explicit `_tag` runtime representation (and `classes` opt-in).
4. `Result<T, E>` as the canonical error type; no exceptions in idiomatic SJS.
5. Edition system **deferred to post-1.0**.

### 11.3 Semver

- MAJOR: language break. No editions; we bump major.
- MINOR: new features, including new language syntax that doesn't conflict.
- PATCH: bug fixes.

Compiler output JS shape: explicitly **not** semver-stable (round 1 promised stability; we reverse that — the cost is too high). Users who depend on output shape (e.g. snapshot tests on compiled output) are warned in docs.

### 11.4 Deprecation policy

- A feature marked `@deprecated("reason")` emits `SJS-W008`.
- Removal requires: appear in deprecation notice for ≥ 6 months, then removal in next MAJOR.
- Stdlib deprecations tracked in `STABILITY.md`.

### 11.5 No editions at v1.0

Editions are deferred to "when we first need to break something post-1.0". When that day comes, we adopt **crate-level** editions (per-package, not per-file). File-level edition mixing as round 1 proposed is too complex.

### 11.6 Stability tiers

- **stable** — default for v1.0 surface.
- **beta** — opt-in via `import` from `@superjs/std-*/beta/`. Documented.
- **unstable** — nightly-only.

### 11.7 Compatibility guarantees at v1.0

- Source compatibility within a major version: programs that compile under v1.0 compile under v1.x.
- CLI flag stability: subcommands and flags are semver-protected.
- Config schema (`superjs.config.json`): semver-protected with deprecation policy.
- LSP protocol additions: only additive within a major.
- Diagnostic JSON schema: semver-protected (independent semver line).
- Compiled JS output shape: **not** stable. Documented warning.

---

## 12. Edge Cases & Hard Problems

Each: problem, proposed solution, open questions.

### 12.1 Circular imports

**Problem:** A imports from B which imports from A.

**Solution:**

- **Type-only cycles** (only `import type` participates in the cycle): allowed unconditionally. The type checker resolves to a fixed point — first pass collects declarations, second pass resolves types.
- **Value cycles, function-only:** allowed. JS hoisting + lazy reference handles it.
- **Value cycles with eager top-level initialisation:** warning `SJS-W005`; runtime may see `undefined`. Suggested fix in the warning.
- **Module-level side-effect cycles:** error `SJS-E021`.

Detection: post-resolution graph SCC analysis (Tarjan). Test fixtures: `tests/fixtures/circular/`.

**Open question:** how should the LSP surface cycles in real time (badge on the file? diagnostic on every file in the cycle? single diagnostic on the offending import?). Defer; pick at LSP M2.

### 12.2 Recursive sum types (Tree<T>)

**Problem:** `type Tree<T> = Leaf(T) | Node({ left: Tree<T>, right: Tree<T> })` — the recursion goes through a generic.

**Solution:**

- Allowed. The type checker treats variant constructors as nominal; recursion through a nominal type is fine.
- Mutual recursion across modules: allowed if the cycle is via type-only imports.
- Infinite type construction (`type Bad<T> = T | Bad<List<T>>`) → `SJS-E022`. Detected by bounding the unfolding depth at 100; exceeding means non-regular recursion.

**Open question:** equality on recursive structures may infinite-loop (see §12.10). Documented.

### 12.3 Sum types + tree shaking

(Already covered in §4.6.) Summary:

- Default representation `{ _tag, _0 }` with constructors inlined at call sites → tree shakes naturally.
- `classes` opt-in mode → `instanceof`-friendly but each variant is a separate class and a separate import.
- The compatibility matrix flags packages that need `instanceof` interop.

### 12.4 Zod-style schema libraries

**Problem:** Zod uses mapped types and conditional types heavily for type inference: `z.object({ a: z.string() })` infers `{ a: string }` via mapped types.

**Solution at v1.0:**

- Hand-curated wrapper `@superjs/types-zod` that exposes a parallel `Schema.object({...})` API. The wrapper does **not** try to derive types via mapped types — instead, the user declares the output type explicitly:
  ```sjs
  type User = { name: string, age: number }
  let schema: Schema<User> = Schema.object({ name: Schema.string(), age: Schema.number() })
  ```
- The compiler verifies that the schema shape matches the declared type via a structural check; mismatch is `SJS-E045`.
- Migration guide explains the pattern.
- Alternative: `@superjs/std/json` `Schema` builder (§6) is the SJS-native equivalent. We recommend that for new code; Zod wrapper is for migrating existing TS code.

### 12.5 Prisma / ORM interop

**Problem:** Prisma's query builder uses mapped types and conditional types extensively for typed query results. `prisma.user.findMany({ where: { name: "x" }, select: { id: true } })` infers a return type via mapped types.

**Solution at v1.0:**

- Hand-curated `@superjs/types-prisma` wrapper that exposes a narrower-but-typed API:
  - `findMany` returns `dynamic`; the user must pass an explicit `Schema<T>` to validate:
    ```sjs
    let users = await prisma.user.findMany({ where: { name: "x" } })
    let parsed: User[] = Schema.array(UserSchema).parse(users).unwrap()
    ```
- A `prisma generate` post-processing tool (`@superjs/prisma-codegen`) reads `prisma/schema.prisma` and emits `@superjs/types/prisma-client.d.sjs` with concrete types per model. This avoids the dynamic step for the common `findMany` / `findUnique` use cases.
- Drizzle and Kysely are similar but slightly less reliant on conditional types; same strategy (codegen from the user's schema).
- Documented as a known v1.0 limitation: dynamic `select` clauses with conditional return types are not statically typed; explicit schema parsing required.

**Open question:** whether to ship the Prisma codegen tool in v1.0 or v1.1. Stretch goal for v1.0.

### 12.6 JS `this` binding

**Problem:** SJS classes use ES classes; method references lose `this` like in JS. `let m = obj.method; m()` breaks.

**Solution:**

- Compiler emits class methods as standard ES methods (not arrow-bound).
- Linter rule `unbound-method-reference` warns when a method is referenced without immediate invocation; suggested fix is `obj.method.bind(obj)` or `() => obj.method(...args)`.
- Class fields declared with arrow values get auto-bound `this`: `class Foo { bar = () => { /* this is Foo */ } }`. Documented pattern.

### 12.7 Parser recovery details

(Covered in §4.4 in full.)

### 12.8 Decorator semantics

**Problem:** TC39 Stage 3 decorators ship behaviour different from TS legacy decorators; npm packages straddle both.

**Solution:**

- SJS supports **Stage 3 only**.
- Compiler emits Stage 3-conformant code at default target (ES2022).
- For older targets, a tiny polyfill is inlined.
- Decorators **may not change the static type** of the decorated declaration; enforced via the stdlib `Decorator<Sig>` interface. The enforcement does **not** require higher-kinded types because we leverage SJS's structural subtyping: a decorator wraps a method and the wrapped function must structurally implement the same call signature.
- TypeORM / NestJS adoption is post-1.0; documented as a known limitation.

### 12.9 Async + null safety

**Problem:** `Promise<T?>` vs `Promise<T>?` are distinct types but the runtime cannot tell them apart.

**Solution:**

- The type system tracks both distinctly.
- The compiler emits no runtime check at the type boundary; user code must pattern-match.
- Type inference default for promise-returning JS APIs (via `.d.ts` translation): `Promise<T>` if the TS signature says `Promise<T>`; `Promise<T | null>` becomes `Promise<T?>`; `Promise<T | undefined>` becomes `Promise<T?>`.
- `Promise.resolve(null)` synthesises `Promise<null>`, assignable to `Promise<T?>` for any T.

### 12.10 Structural equality + cycles

**Problem:** `==` on user types is structural by default; cyclic objects → infinite loop.

**Solution:**

- v1.0: structural equality uses cycle detection (a WeakSet of seen pairs). If the same pair is revisited, returns `true` (rational fixpoint).
- Opt out per-class via `@noStructuralEq` decorator → reference equality.
- Documented in stdlib `Eq` interface; users may override `equals` for value-typed classes.

### 12.11 `for...of` and `Symbol.iterator` bridge

(Already covered in §6.) Summary:

- SJS `for...of` desugars to JS code that prefers `[Symbol.iterator]` (native iterables) and falls back to `.iterator()` (SJS `Iterator<T>`).
- SJS user types implementing `Iterator<T>` get `[Symbol.iterator]` auto-attached.
- Result: native JS Array/Map/Set/generators iterate; SJS user iterators iterate; mixing works.

### 12.12 Match exhaustiveness + type narrowing

**Problem:** narrowing across arms must be sound and complete; missing arms must error; redundant arms must warn.

**Solution:**

- Each arm narrows the discriminant by subtracting the matched pattern from the discriminant type.
- After all arms, if residual type is not `never`, missing arm error `SJS-E007`.
- An arm whose pattern matches `never` (because all previous arms covered the type) is `SJS-W003`.
- Guards (`if cond`) do not contribute to exhaustiveness; an unguarded fallback is required after any guarded arm.

### 12.13 Windows support

(Covered in §8.3.) Summary:

- Path handling via `node:path`.
- Line endings normalised in lexer; preserved on output via `os.EOL`.
- Subprocess via `cross-spawn`.
- `.cmd` wrapper for the CLI.
- CI matrix includes `windows-latest`.

### 12.14 LSP memory management

(Covered in §5.1.) Summary:

- Weak references to evictable AST nodes.
- Time-based diagnostic cache TTL.
- Configurable memory budget.
- CI memory-leak test + heap snapshot test.

### 12.15 Compiler crash reporting

**Problem:** if the compiler crashes, the user's only recourse is `superjs build 2>&1 > log.txt` then file a manual issue.

**Solution at v1.0:**

- A top-level `try`/`catch` in the CLI: on uncaught exception, write a crash report to `.superjs/crash-YYYYMMDD-HHMMSS.log` containing: compiler version, OS, Node version, redacted env, the input file list, the stack trace, and the position in the input where the crash occurred (if available).
- A one-line message to the user: "Compiler bug — please file: https://github.com/.../issues/new?template=crash.md&log=…". The URL pre-fills a GitHub issue body with the crash-report file contents (or a hash if it exceeds URL limits).
- **No** telemetry / network call at v1.0. The user explicitly opts-in by filing the issue.

### 12.16 Determinism

(Covered in §4.8.) Same input + same compiler version + same config → byte-identical output.

### 12.17 HMR for the Vite plugin

**Problem:** Vite's HMR requires the plugin to expose module IDs and transform hooks correctly.

**Solution:**

- `@superjs/vite-plugin` implements Vite's `transform` and `handleHotUpdate` hooks. On a `.sjs` file change, the plugin re-transforms the file and emits Vite's HMR signal.
- React Fast Refresh integration: the plugin detects React-using files (via JSX presence) and injects the standard React Fast Refresh runtime, same as `@vitejs/plugin-react`.
- Tested with a sample SJS+React+Vite project; HMR round-trip < 200 ms.

### 12.18 LSP for non-VS-Code editors

LSP is editor-agnostic. Editors that support LSP (Vim/Neovim with coc.nvim or built-in 0.5+ LSP, Emacs with lsp-mode, Sublime with LSP package, Helix, Zed) consume `@superjs/lsp` directly. v1.0 documents Neovim and Helix configs; others post-1.0.

---

## 13. Comparison: SJS vs ReScript

ReScript occupies almost exactly SJS's niche. We must address it head-on.

### 13.1 What ReScript got right

- **Honest about being a different language from JS.** ReScript stopped pretending to be "TypeScript-but-better" and committed to OCaml semantics. Users who buy in get genuine type safety.
- **Fast compiler.** ReScript's compiler is among the fastest in the ecosystem.
- **A clear functional core.** Pattern matching, variants, sound type inference — all done well.
- **Honest about losing things.** ReScript does not promise to type all of npm; it provides curated bindings.

### 13.2 What ReScript struggles with

- **Adoption is bounded.** ReScript users are mostly ex-Reason / OCaml / Bucklescript users. Mainstream TS users find the OCaml syntax (`let`, `module`, `->` for pipe) too foreign.
- **JSX is a second-class citizen.** ReScript's JSX requires a separate parser mode and the React bindings have edge cases.
- **Binding ecosystem is sparse.** Many npm packages have no ReScript bindings, or stale ones.
- **Tooling is OCaml-flavoured.** The LSP is good but the editor experience feels different from TS.

### 13.3 How SJS differs

| Dimension | ReScript | SJS |
|---|---|---|
| Syntax | OCaml-derived | JS/TS-derived |
| Adoption target | Functional-curious devs | Mainstream TS users |
| `null` model | `option<T>` | `T?` with `null` as the value |
| Generics | OCaml-style, very powerful | TS-style, simpler, structurally subtyped |
| JSX | Separate parser mode | First-class, in the default grammar |
| npm interop | Curated bindings (`rescript-react` etc.) | Auto-translation + curated top-30 wrappers |
| Compiler | Native (fast) | TypeScript (slower at v1.0, native post-1.0) |
| `match` | First-class | First-class |
| Output JS | Idiomatic JS | Idiomatic JS |

**Bet:** SJS wins where ReScript struggles by staying in TS syntactic neighbourhoods. Loses where ReScript wins (functional purity, type-system depth) — and that's a deliberate trade.

### 13.4 What SJS borrows from ReScript

- **Honest about banned features.** ReScript banned `null` everywhere; SJS bans `any`/intersection/conditional types. Both are unapologetic about the trade.
- **Curated bindings for top packages.** Track A in §3.
- **Fast compiler as a north star.** Even though SJS v1.0 is TS-implemented, the ≤ 2 s / ≤ 100 ms targets force the architecture in the right direction.

### 13.5 What SJS deliberately rejects

- **OCaml-style syntax.** TS-familiar syntax is the wedge.
- **Tagged data via OCaml variants exposed in JS as integers.** SJS exposes `{ _tag: "Ok" }` — JS-debuggable, JSON-stringifiable.
- **The functional purist's stance.** SJS allows mutation, classes, `this`. The goal is "better TS", not "ML on JS".

---

## 14. Priority Matrix

3 tiers. Every major feature assigned.

### 14.1 Tier 1 — v1.0 critical

Without these, v1.0 does not ship.

- npm publish (`superjs` + stdlib + types packages)
- Phase 2 lexer + parser + recovery
- AST + visitor
- Type checker (bidirectional, port from prototype)
- Codegen + source maps (default mode)
- Incremental compilation + watch mode
- CLI (`build | check | lint | format | test | repl | lsp | explain | init | add | doctor`)
- `.d.ts → .d.sjs` translator (Track B)
- Top-30 hand-curated wrappers (Track A)
- Layer-0 built-in types + Layer-1 + Layer-2 stdlib
- LSP M1 (diagnostics, hover, definition, completion, signatureHelp, formatting, documentSymbol, foldingRange, semanticTokens)
- VS Code extension
- Jest transform + Vitest transform
- Vite plugin + esbuild plugin
- Formatter (gofmt-style, zero config)
- Linter (15 rules)
- TS → SJS migration tool
- Server-side playground (Cloudflare Workers)
- DAP launch config + sum-type formatters
- Docs: 20-lesson tour + error code reference + migration guide + auto-API + "Why SJS"
- CI/CD (matrix, changesets, --provenance, nightly fuzz)
- Windows support (paths, EOL, .cmd wrapper, CI matrix)
- LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- Beta program: 3 friendly teams in production-like use

### 14.2 Tier 2 — v1.0 nice-to-have (cut if any Tier-1 slips)

- LSP M2 methods (rename, references, code actions, inlay hints)
- REPL
- JS → SJS migration tool
- Webpack loader, Rollup plugin, Next.js plugin
- Snapshot testing in Jest transform
- Prisma codegen tool
- Compatibility matrix HTML dashboard
- 5 backfilled RFCs (if not done, do 3)

### 14.3 Tier 3 — post-v1.0

- Self-hosting compiler in SJS
- LLVM / native binaries
- WASM compiler target
- `svm` version manager
- JetBrains plugin (formal)
- Editions system
- Native `@superjs/test` runner
- Property testing framework
- Bench framework
- Snapshot testing framework
- Top-level `await`
- Variance annotations (`<out T>`, `<in T>`)
- Channels / CSP
- Decorators advanced features (metadata reflection, parameter decorators in stdlib)
- DOM stdlib + browser stdlib
- Temporal-style time
- Crypto / net / dgram / http server / EventEmitter / Intl stdlibs
- RSC support / server components type checking
- Web Workers / Service Workers / Cloudflare Workers explicit support
- HMR for React Fast Refresh beyond Vite plugin
- Refactoring tools (extract function, inline variable, …)
- Homebrew / apt / yum / winget / scoop distribution
- Code signing for native binaries
- i18n for error messages
- Telemetry (opt-in)
- 50 lint rules
- Custom lint plugin API stabilisation

---

## 15. Sprint Plan (Realistic)

**Sprint length: 4 weeks (not 2).** Round 1's 2-week sprints assumed full-time focus on one bucket; real solo-maintainer pace is 4-week cycles with overhead.

**Assumed team:** 1 person (the maintainer) at v1.0 start. Plan tracks +1 co-maintainer recruited by Sprint 3; without that, scope cuts move things from Tier 1 to Tier 2 or 3.

**Total: 17 sprints × 4 weeks = 68 weeks ≈ 16 months for one person.** With 1 co-maintainer joining at Sprint 3: ~12 months. With 2 by Sprint 5: ~9 months.

| Sprint | Weeks | Theme | Deliverables | Risks |
|---|---|---|---|---|
| 0 | 1–4 | Foundation | Repo reorg; `superjs@0.2.0` published to npm; Changesets set up; CI matrix; Layer-0 types embedded in compiler; golden-test infra; GitHub Sponsors; LICENSE/SECURITY/CONTRIBUTING; CO-MAINTAINER RECRUITMENT ANNOUNCEMENT | Repo churn |
| 1 | 5–8 | Parser | Lexer + Pratt parser + recovery spec + 2000 fixtures; EBNF skeleton | Recovery design takes longer than scoped |
| 2 | 9–12 | Type checker | Port prototype's checker to new AST; bidirectional algorithm; cross-file inference; multiple-error reporting; suggested fixes | Cross-file inference is harder than estimated |
| 3 | 13–16 | Codegen | Emit ES2022 + source maps; sum-type lowering (both default and classes mode); golden codegen fixtures; determinism CI | Source-map fidelity bugs |
| 4 | 17–20 | **Interop** | `.d.ts → .d.sjs` translator MVP; top-30 wrapper specs; first 10 wrappers shipped; `superjs doctor` | **Highest-risk sprint of the roadmap** |
| 5 | 21–24 | Incremental + CLI | Module graph; public-API hash; persistent cache; watch mode; CLI subcommands; `superjs explain` | Cache invalidation bugs |
| 6 | 25–28 | LSP M1 | LSP server with diagnostics + hover + definition + completion + signatureHelp + formatting + documentSymbol + foldingRange + semanticTokens; memory budget tests | LSP perf tuning eats sprint |
| 7 | 29–32 | Stdlib + bootstrapping | Layer-1 + Layer-2 stdlib published; bootstrap test (stage-0 / stage-1 / stage-2); `@superjs/std-*` packages on npm | Bootstrap surprises |
| 8 | 33–36 | Editor + bundler | VS Code extension on Marketplace; Vite plugin; esbuild plugin; Jest transform; Vitest transform; DAP launch config + sum-type formatters | Vite plugin HMR edge cases |
| 9 | 37–40 | Formatter + linter | Formatter rewrite (gofmt-style, idempotent); linter with 15 rules; auto-fix | Formatter comment handling |
| 10 | 41–44 | Playground + migration | Server-side playground on Cloudflare Workers; share URLs; TS → SJS migration tool; remaining 20 wrappers (top-30 complete) | Wrapper count slips |
| 11 | 45–48 | Docs | 20-lesson tour; error code reference (all SJS-EXXX); migration guide; auto-API generator; "Why SJS" page; compat matrix HTML page | Docs underestimated — likely needs Sprint 12 too |
| 12 | 49–52 | LSP M2 + REPL (cut to Tier 2 if time short) | Rename, references, code actions, inlay hints; REPL | Time pressure |
| 13 | 53–56 | Beta program | 3 friendly teams onboarded; collect & triage feedback; weekly check-ins | Beta teams need hand-holding |
| 14 | 57–60 | Bug bash + perf + security | Performance pass to hit ≤ 2 s / ≤ 100 ms targets; memory audit; security review; CodeQL & fuzz cleanup | Real perf work may need 2 sprints |
| 15 | 61–64 | RC | `superjs@1.0.0-rc.1` → `rc.2` → `rc.3`; respond to RC bug reports | RC cycle can extend |
| 16 | 65–68 | GA + launch | `1.0.0`; launch posts; community kickoff; on-call rotation for v1.0.x patches | Launch noise |

**No buffer sprints baked in.** Buffer is *cutting Tier 2 to Tier 3* when slippage occurs, not adding time. The plan explicitly accepts that Tier 2 may not ship at v1.0.

**Outreach starts Sprint 8** (not Sprint 16). That is: friendly-team recruitment, blog posts about progress, conference talks, public roadmap visibility — at least 9 months before launch.

---

## 16. Definition of Done for v1.0

Binary. Every item is yes/no. No subjective metrics.

**Language**

- [ ] `spec/language.md` frozen for 8 weeks before tag.
- [ ] `spec/grammar.ebnf` parses every fixture in `tests/fixtures/parser/`.
- [ ] All `SJS-EXXX` codes have a docs page.
- [ ] All §12 edge cases have at least one test fixture.

**Compiler**

- [ ] Cold compile of 10k-LOC project ≤ 2 s median (M-series or x86_64 4-core).
- [ ] Warm rebuild ≤ 100 ms.
- [ ] Parser passes recovery golden tests with 0 phantom errors.
- [ ] Build determinism enforced by CI (byte-diff identical).
- [ ] Compiler crash → crash report file + GitHub-issue prefilled URL.
- [ ] CLI exit codes documented and semver-stable.

**Interop**

- [ ] All 30 top packages have `.d.sjs` wrappers.
- [ ] `.d.ts → .d.sjs` translator passes its 200-package smoke test with average ≥ 70% typed-surface.
- [ ] `superjs doctor` reports per-package coverage.
- [ ] Sum-type representation choice (default vs classes) documented per wrapper.

**Tooling**

- [ ] LSP M1 methods all implemented and pass smoke tests.
- [ ] LSP idle memory ≤ 250 MB on 100k-LOC project.
- [ ] LSP P99 latency ≤ 200 ms for hover/completion.
- [ ] VS Code extension published, with screenshots, README, and launch config.
- [ ] Formatter idempotent (CI verified).
- [ ] Linter ships 15 rules; all have auto-fix where claimed.
- [ ] `superjs migrate from-ts` runs cleanly on the migration test corpus.
- [ ] Playground live at the canonical URL; share-URL works.
- [ ] DAP launch config tested on Windows / macOS / Linux.
- [ ] Sum-type custom inspect works in Node `console.log` and DevTools.

**Stdlib**

- [ ] All §6 modules published as `@superjs/std-*` packages.
- [ ] >90% line coverage on stdlib.
- [ ] Bootstrap test: stage-1 compiler output = stage-2 compiler output.

**Testing**

- [ ] Jest transform passes; sample project with 100+ SJS tests runs green.
- [ ] Vitest transform passes; sample project runs green.
- [ ] `@superjs/test-matchers` published.
- [ ] Compiler test suite is ≥ 85% coverage.
- [ ] Nightly fuzz has been running for ≥ 4 weeks with no unfixed crashes.

**Documentation**

- [ ] 20-lesson tour live, every lesson runs in the playground.
- [ ] Error code reference complete.
- [ ] Migration guide from TS complete; per-package notes for top-30.
- [ ] API reference auto-generated and live.
- [ ] "Why SJS" page live, includes ReScript comparison.
- [ ] Compatibility matrix live as sortable HTML.

**Infrastructure**

- [ ] CI matrix green on Ubuntu/macOS/Windows × Node 20/22 LTS.
- [ ] Changesets-driven release proven via at least 3 minor releases pre-1.0.
- [ ] Nightly builds tagged `nightly` on npm.
- [ ] PR-level benchmark check posts comment.
- [ ] Determinism check in CI.
- [ ] LSP memory leak check in CI (RSS does not grow monotonically over 1000-file open/close cycle).

**Governance**

- [ ] LICENSE (MIT), SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md.
- [ ] 5 backfilled RFCs merged.
- [ ] Deprecation policy doc.
- [ ] No CLA; DCO sign-off configured in GH.
- [ ] No editions yet; documented as post-1.0.

**Ecosystem**

- [ ] `superjs` and 10+ official packages on npm with `--provenance`.
- [ ] 3+ friendly beta teams running v1.0-rc in production-like environments.
- [ ] 3+ third-party plugins or libraries published.
- [ ] GitHub Sponsors enabled.

**Marketing / launch**

- [ ] Launch post draft reviewed.
- [ ] Discord / GitHub Discussions live with ≥ 50 members.
- [ ] HN / lobste.rs / r/typescript post drafts ready.
- [ ] Press kit (logo, screenshots, sample code, comparison to TS).

If any unchecked, v1.0 slips. No exceptions.

---

## 17. Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation in this plan | If realised |
|---|---|---|---|---|---|
| 1 | Solo-maintainer bus factor | H | XL | Co-maintainer recruitment in Sprint 0; documented from day 1; CONTRIBUTING.md from Sprint 0 | Pause feature work; project goes into maintenance mode for any in-flight critical bugs |
| 2 | `.d.ts → .d.sjs` translator does not hit 70% typed-surface | M | XL | Sprint 4 is fully dedicated; if slipping, cut top-30 wrappers from 30 to 15 and ship | v1.0 slips a sprint or two |
| 3 | LSP performance miss | M | H | Memory budget baked into CI; bidirectional checker designed for incrementality; Sprint 14 has perf headroom | Cut LSP M2 to Tier 3; ship LSP M1 only |
| 4 | TS users see SJS as "less powerful TS" | H | H | "Why SJS" page is M1; honest about losses; concrete wins for the primary user; demo-quality real project | Iterate on positioning; depends on actual user feedback |
| 5 | ReScript comparison is unfavourable | M | M | §13 explicit; SJS bets on TS-familiar syntax and JSX-first; if comparison still loses, iterate on stdlib ergonomics | Re-position; possibly merge / collaborate |
| 6 | Microsoft adds `--strictNoAny`, native exhaustiveness, etc. | M | M | SJS's edge is the *absence* of features (smaller surface), not the presence; TS cannot easily remove things | Continue; SJS's value remains |
| 7 | Phase 2 parser takes longer than scoped | M | H | Sprint 1 is dedicated; if slipping, fall back to using existing Babel pipeline for parsing while building the rest | Use Babel for v1.0-rc1; replace post-1.0 |
| 8 | Stdlib bootstrap fails subtly | L | H | Sprint 7 is dedicated; explicit stage-0/1/2 test in CI | Roll back bootstrap; revert to TS-only stdlib for v1.0 (lose some idioms but ship) |
| 9 | Funding runs out | M | XL | GitHub Sponsors from Sprint 0; transparent costs; OpenCollective option | Pause; recovery requires sponsorship |
| 10 | Trademark conflict on "SuperJS" | L | M | No claim made at v1.0; verify before any branding spend; have a rename plan (e.g. "Sjs", "Super") in reserve | Rename; cost is one week of busywork |
| 11 | Domain squatting on `superjs.dev` | L | M | Verify ownership now; alternative domain ready | Use alternative |
| 12 | CI cost spirals beyond budget | L | M | Per-PR fast path keeps PR cost low; nightly heavy work is amortised; CI cost dashboard | Cap matrix or move to self-hosted runner |
| 13 | Compiled JS output stability commitment proves too restrictive | M | M | Explicitly *not* semver-stable (see §11.7); users warned | None — we already declined the commitment |
| 14 | Vite / React HMR edge cases break the dev story | M | H | Sprint 8 includes HMR test with sample app; HMR is a v1.0 blocker for the React story | Ship without React Fast Refresh; document workaround; lose the React story for v1.0 |
| 15 | Beta program teams disappear / don't ship | M | M | 3 teams, not 1; SLA on responsiveness; backup pipeline of 5 candidates | Recruit replacement; slip v1.0 by 1 sprint |
| 16 | Prisma / ORM interop is unworkable in practice | M | H | Prisma codegen tool in Tier 2; document the limitation in the migration guide | Ship without Prisma codegen; users use Drizzle/Kysely or `dynamic` fallback |
| 17 | DAP debugger experience is degraded vs TS | M | M | Sprint 8 ships launch config + custom inspect; tested on Node / Bun / Chrome | Document the gaps; commit to fix in v1.1 |
| 18 | Compat matrix becomes unmaintainable | L | M | Automated weekly re-translation; flagged regressions | Cut from 200 to 100 packages |
| 19 | Spec ↔ docs drift | M | M | Single-source: spec is canonical; docs read from spec via codegen; CI fails if drift | Manual reconciliation |
| 20 | Burnout (specific to risk #1) | H | XL | Co-maintainer recruitment; sustainable 4-week sprints; explicit personal time-off built in (one off-week between sprints if needed) | Pause; let community step up; long-term: open conservatorship |

---

## Appendix A: File layout (post-Phase 2)

```
super-js/
├── compiler/                       # Phase 2 compiler (TypeScript)
│   ├── src/
│   │   ├── cli/                    # subcommands
│   │   ├── lexer/
│   │   ├── parser/
│   │   ├── ast/
│   │   ├── checker/                # bidirectional checker
│   │   ├── codegen/
│   │   ├── formatter/
│   │   ├── linter/
│   │   ├── incremental/
│   │   ├── optimize/
│   │   ├── dts/                    # .d.ts ↔ .d.sjs translator
│   │   ├── diagnostics/
│   │   ├── builtins/               # Layer-0 types
│   │   └── lsp/                    # in-process LSP server
│   └── tests/
│       ├── unit/
│       ├── golden/                 # parser/codegen/formatter golden tests
│       ├── parser-recovery/        # recovery sequence tests
│       └── fixtures/
├── stdlib/                         # SJS stdlib source
│   ├── L1/                         # Layer-1 modules (string, math, etc.)
│   ├── L2/                         # Layer-2 modules (json, fs, etc.)
│   └── tests/
├── packages/                       # publishable npm packages
│   ├── superjs/                    # CLI entry point
│   ├── lsp/                        # @superjs/lsp
│   ├── jest-transform/
│   ├── vitest-transform/
│   ├── vite-plugin/
│   ├── esbuild-plugin/
│   ├── test-matchers/
│   └── types/                      # @superjs/types-* wrappers
│       ├── react/
│       ├── express/
│       ├── zod/
│       ├── prisma/
│       └── ... (30 total)
├── tools/
│   ├── vscode-extension/
│   ├── playground/                 # Cloudflare Worker + frontend
│   ├── migrate/                    # @superjs/migrate
│   ├── prisma-codegen/             # Tier 2
│   └── fuzz/
├── spec/
│   ├── language.md
│   ├── grammar.ebnf
│   ├── diagnostics.schema.json
│   └── errors/                     # SJS-E001.md, etc. (source of truth)
├── rfcs/                           # 5 backfilled at v1.0
├── docs/                           # Docusaurus site
│   ├── tour/                       # 20 lessons
│   ├── reference/
│   ├── migration/
│   ├── compat/                     # compatibility matrix HTML
│   └── errors/                     # generated from spec/errors/
├── prototype/                      # Phase 1 (kept until Phase 2 ships)
├── .github/
│   └── workflows/
├── CLAUDE.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── LICENSE                         # MIT
└── README.md
```

---

## Appendix B: Open questions (deferred, not ignored)

These are explicitly open and tracked as GitHub Discussions. Decisions due before the relevant sprint.

1. **Default sum-type representation** — `{ _tag, _0 }` or class-per-variant? (§4.6) Default chosen as `{ _tag, _0 }`; classes is opt-in. Decision is documented; revisit if interop pain mounts.
2. **`dynamic` inference** — should reading from `dynamic` produce `dynamic` silently, or require an explicit cast / Schema? (Likely silent for ergonomics; Schema required at concrete-type boundaries.)
3. **JSX-by-default in parser** — yes at v1.0; the JSX disambiguation against generics (`<T>(x)` vs `<T>x</T>`) is handled by a parser context bit set by enclosing braces.
4. **Stdlib as one package or many** — many (one per module). Decided.
5. **`Result` vs throwing for stdlib I/O** — Result throughout. Decided.
6. **Prisma codegen in v1.0 or v1.1** — Tier 2; ship if Sprint 10 has headroom.
7. **Co-maintainer recruitment channel** — GitHub Sponsors page, Twitter/X, HN "Show HN" with explicit ask, friendly outreach to ReScript / TS contributors. Action item in Sprint 0.
8. **Whether to commit to Cloudflare Workers as the only playground host** — yes for cost reasons; if Workers becomes restrictive, fallback to Fly.io / Render.
9. **Top-level await** — out of v1.0; if user demand mounts, re-evaluate at v1.1.
10. **Decorator metadata reflection** — out of v1.0; the Stage 3 metadata proposal is not stable yet anyway.

---

*End of plan v2. Approximately 9,500 words. The critic's mandatory changes are addressed in:*

- *Critic items 1, 3 (interop), 3.x (top-30 + matrix), 16 (ReScript), 17 (Prisma): §3, §13, §12.4, §12.5.*
- *Critic item 2 (bootstrapping): §2.*
- *Critic item 3 (timeline): §1, §15, plus scope cuts throughout.*
- *Critic item 4 (target user): §0.*
- *Critic items 5, 18 (tree shaking + determinism): §4.6, §4.8.*
- *Critic item 6 (type inference): §4.3.*
- *Critic item 7 (parser recovery): §4.4.*
- *Critic item 8 (compile error UX): §4.5.*
- *Critic item 9 (playground): §5.3.*
- *Critic item 10 (debugger / DAP): §5.4.*
- *Critic item 11 (`@superjs/test`): §7.*
- *Critic item 12 (`for...of` + Symbol.iterator): §6, §12.11.*
- *Critic item 13 (Windows): §8.3, §12.13.*
- *Critic item 14 (distribution): §8.4, §8.5.*
- *Critic item 15 (license + CLA + trademark): §8.8, §11.*
- *Critic items 19, 20 (LSP memory + refactoring): §5.1, §5.10, §12.14.*

*Next step: socialise this plan with prospective co-maintainers; begin Sprint 0.*
