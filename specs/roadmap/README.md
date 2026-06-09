# SuperJS — Production Readiness Roadmap

**Version target:** 0.1.0 → 1.0.0
**Owner:** Himank Barve (solo maintainer; explicit goal to recruit 1–2 co-maintainers in Stage 0)
**Status:** Living document; round-3 revision. Modular stage breakdown supersedes `2026-05-30-superjs-production-roadmap.md` and round-1 / round-2 critiques.
**Last revised:** 2026-05-30 (round-3)

This directory is the executable plan for SuperJS 1.0. The previous monolith is preserved for context but is no longer the source of truth — see the header note on `../2026-05-30-superjs-production-roadmap.md`. Round-3 changes are itemised in `critique-round3.md` and the round-3 commit message.

---

## North Star

> SuperJS (SJS) is a compile-to-JS language for the **TypeScript-fluent Node.js backend developer** who is tired of TS's complexity tax (`any`, intersection types, conditional types, declaration merging, three flavours of `null`, slow tooling) and ships REST/GraphQL services, CLIs, and serverless functions on Node 22+ to npm / Docker / Cloudflare Workers / AWS Lambda.

**Pitch in one paragraph.** Smaller surface than TS. No `any` — `dynamic` exists but is explicit. One null model (`T?`). `match` is exhaustive. `Result<T,E>` is first-class. One canonical formatter. Single binary CLI: cold check on 10k LOC ≤ 2 s; warm rebuild ≤ 100 ms; LSP idle ≤ 250 MB. Drop-in interop with the top 30 npm packages on day one; auto-translation for everything else with explicit `dynamic` markers (never silent).

**What SJS is NOT at 1.0:** a self-hosted compiler, a native/WASM/LLVM target, a React/DOM-first language, a version manager, a Jest replacement, a Temporal-style date library, or an editions system. All of those are post-1.0 R&D.

---

## Target User (single sentence)

The TS-fluent backend developer on Node 22+ who already uses Vite/esbuild, Vitest/Jest, and `express`/`fastify`/`hono`, `zod`/`valibot`, `prisma`/`drizzle`/`kysely`, `@aws-sdk/*`, `pino`/`winston` — and who will switch only if SJS is (a) drop-in compatible with their npm dependencies, (b) provably less error-prone than TS, (c) at least as fast at compile / type-check / test, and (d) has VS Code support that does not feel like a downgrade.

**Secondary users:** React/Next.js frontend devs (JSX works; DOM stdlib is post-1.0); full-stack TS refugees. **Explicitly not v1.0:** new programmers — the migration story from TS is the wedge.

---

## Definition of Production-Ready (1.0 Gate)

Six categories. Each is a binary checklist completed in its owning stage. Aggregated in Stage 6's exit criteria.

| Category | Stage owner | Headline criterion |
|---|---|---|
| Language | Stage 0–6 (spec authored continuously) | `spec/language.md` frozen 8 weeks before 1.0; `spec/grammar.ebnf` parses every fixture |
| Compiler | Stage 1 | Cold compile 10k LOC ≤ 2 s; warm rebuild ≤ 100 ms; deterministic (hard gate at end of Stage 1); recovery passes golden tests |
| Interop | Stage 2 | All 30 top packages have `.d.sjs` wrappers; `.d.ts → .d.sjs` translator ≥ 70 % typed surface on 200-package smoke test using the locked formula in `tools/typed-surface-metric.md` |
| Tooling | Stage 3 | LSP M1 ≤ 250 MB idle; VS Code extension on Marketplace; formatter idempotent; **17 lint rules** |
| Stdlib | Stage 4 | All §6 modules published; > 90 % line coverage; bootstrap test stage-1 == stage-2 on **downstream user-code** outputs |
| Ecosystem | Stage 5 + 6 | 10+ official npm packages with `--provenance`; 3+ beta teams running v1.0-rc; 3+ third-party plugins |

If any category fails its checklist, v1.0 slips. Cutting scope at a stage gate is allowed; missing the checklist silently is not.

---

## Priority Matrix

Three tiers carried over from the monolith and re-keyed to stages.

### Tier 1 — v1.0 critical (every stage)

- Stage 0: repo layout, grammar spec, error registry, CI, diagnostic schema, shared types, **RFC-0001..0005 published in Sprint 0.2**, threat model.
- Stage 1: lexer (with BiDi-spoof rejection), parser, AST, bidirectional checker, codegen, source maps (incl. async stack-trace fidelity), incremental, watch, CLI (`build`/`check`/`format`-stub/`init`/`explain`/`add`-stub/`migrate from-prototype`-stub), `@superjs/runtime` published, `transform()` API for build/test tooling.
- Stage 2: `.d.ts → .d.sjs` translator + top-30 hand-curated wrappers (backend-first wave-1) + `superjs doctor` + `superjs add` implementation.
- Stage 3: LSP M1 (9 methods); VS Code extension; server-side playground (with Workers demo mode); DAP launch config; formatter (with `.sjsignore` + Prettier coexistence docs); **17-rule linter**; TS→SJS migration tool (gated on real beta-team codebase).
- Stage 4: Layer-0 built-ins (compiler-resident); Layer-1 and Layer-2 stdlib modules; bootstrap pipeline (correctness proved on downstream fixtures); stdlib determinism gate.
- Stage 5: npm publish; Vite plugin; esbuild plugin; Jest transform; Vitest transform; `@superjs/test-matchers`; `superjs init <template>` for `node-cli` / `fastify-api` / `workers-api` / `lambda-handler`; `superjs verify` subcommand.
- Stage 6: docs (tour with serverless lesson 18, errors, migration, API, "Why SJS"); compat matrix; beta program (with `dynamic` usage survey); bug bash; RC; 1.0 GA.

### Tier 2 — v1.0 nice-to-have (cut if any Tier 1 slips)

- LSP M2 (rename, references, code actions, inlay hints) — Stage 3 stretch.
- REPL — Stage 3 stretch.
- Prisma codegen tool — Stage 2 stretch.
- Compat matrix HTML dashboard — Stage 6 stretch.
- Snapshot testing in Jest transform — Stage 5 stretch.

### Tier 3 — post-v1.0 (explicit)

Self-hosting; LLVM / WASM / native binaries; `svm`; JetBrains plugin; editions system; native `@superjs/test`; property/bench/snapshot frameworks; top-level await; variance annotations; channels/CSP; DOM stdlib; Temporal; crypto/net/dgram/http-server/EventEmitter/Intl; RSC; advanced refactorings; Homebrew/apt/yum/winget/scoop; code-signing for native binaries; i18n for errors; telemetry; 50 lint rules; custom-lint-plugin API stabilisation.

---

## Stage Dependency Graph

```
Stage 0 (Foundations)
    └── Stage 1 (Compiler Core)
            ├── Stage 2 (JS/TS Interop)
            ├── Stage 3 (DX Tools)
            └── Stage 4 (Standard Library)
                    └── Stage 5 (Ecosystem)  [also blocks on Stage 3 LSP M1]
                            └── Stage 6 (Stability & Launch)
```

Stages 2, 3, and 4 are independent of one another and can run in parallel once Stage 1 ships its API contract (see Stage 1's "API Contract" section). That parallelism is what makes the 1.0 target achievable with a maintainer + 1–2 co-maintainers; without parallelism the calendar adds ~14 weeks.

**New edge in round-3:** Stage 5 cannot tag `superjs@1.0.0-rc.0` until Stage 3 LSP M1 is shipped (so the CLI bundle that ships `superjs lsp` does not undergo a breaking re-publish later). If Stage 3 slips beyond Stage 5's calendar, Stage 5 ships the CLI **without** `lsp` subcommand at v1.0 — explicitly documented, not silently breaking.

---

## Stage Gate Summary Table

| Stage | Deliverable | Gate criteria (must be true to enter) | Done signal | Est. duration |
|---|---|---|---|---|
| 0 | Foundations — repo, CI, grammar v1, error registry v1, shared types, diagnostic schema, RFC-0001..0005, threat model | Project decision to pursue 1.0 | `packages/compiler-types/` published v0.x; CI green on three OSes; `spec/grammar.ebnf` parses prototype fixtures; RFCs 0001–0005 merged | 4 weeks (2 sprints) |
| 1 | Compiler Core — lexer, parser, AST, bidirectional checker (with `algorithm.md`), codegen, source maps, incremental, watch, CLI, `@superjs/runtime`, `transform()` API | Stage 0 done | `superjs build` runs end-to-end on new pipeline; prototype Babel backend retired; **hard determinism gate green**; **solo-path decision gate** | 12 weeks (6 sprints) |
| 2 | JS/TS Interop — translator, top-30 wrappers (backend-first wave-1), `superjs doctor`, `superjs add` impl, ORM strategy | Stage 1 compiler API frozen | `superjs add fastify` works; doctor reports per-package coverage using the locked typed-surface formula; compat-matrix MVP live | 8 weeks (4 sprints) |
| 3 | DX Tools — LSP M1, VS Code extension, playground (with Workers demo mode), formatter, debugger, 17-rule linter, migration tool gated on real codebase | Stage 1 `typeAt` API frozen; **solo-path decision gate at entry**; external security reviewer booked | VS Code extension on Marketplace; LSP smoke passes on 3 OSes; playground live; `superjs format` idempotent | 8 weeks (4 sprints) |
| 4 | Standard Library — Layer-0 built-ins + Layer-1 + Layer-2 SJS modules, bootstrap pipeline, stdlib determinism gate | Stage 1 codegen + module resolver stable | `@superjs/std-*` packages on npm with `--provenance`; bootstrap correctness on downstream user-code fixtures; stdlib-level determinism CI green | 6 weeks (3 sprints) |
| 5 | Ecosystem — npm publish CLI, Vite/esbuild plugins, Jest/Vitest transforms, monorepo support, `superjs init` templates, `superjs verify` | Stages 2 + 4 done; Stage 3 LSP M1 done (else ship CLI w/o `lsp`) | `npm install -g superjs` works on three OSes; Vite plugin HMR round-trip < 200 ms; plugin-level determinism check enforced in CI | 6 weeks (3 sprints) |
| 6 | Stability & Launch — spec polish + freeze, docs, beta program, bug bash, perf pass, security review, RC cycle, GA | Stages 2 + 3 + 5 done | `superjs@1.0.0` on npm with `--provenance`; launch post live; 3 beta teams in production-like use | 6 weeks (3 sprints; +2-week buffer per Risk R9) |

**Total calendar:** 4 + 12 + max(8, 8, 6) + 6 + 6 = **42 weeks (~10 months)** with parallel execution of Stages 2/3/4 by maintainer + 1 co-maintainer. **Serial:** 50 weeks (~12 months). **Solo serial fallback:** 56 weeks (~13 months), with Tier 2 cut per the solo-path decision gates below.

These numbers replace the monolith's 68-week single-track estimate; the gain is from explicit parallelism, not from optimism.

---

## Solo-Path Decision Gates (round-3 addition)

A 56-week solo-serial fallback is acknowledged in the calendar above. Round-3 requires explicit **decision dates**, not "we'll figure it out":

1. **Gate A — end of Stage 1 (week 16).** If zero co-maintainers are committed by this date, formally invoke solo path. Required scope cuts (documented as merged PRs against this README + stage files):
   - Tier-2 → Tier-3: LSP M2, REPL, Prisma codegen, snapshot testing, compat-matrix HTML dashboard.
   - Tier-1 trim: top-30 wrappers becomes **top-20** (drop wave-2 entries 23–30 below); 200-package smoke target becomes 100; Schema combinators ship without `refine` initially.
   - Calendar revises to 56 weeks; Stage 6 +2-week buffer becomes +4-week.

2. **Gate B — Stage 3 entry (week 24, parallel branches assigned).** If at least one co-maintainer is committed but cannot own a full stage, downgrade to **partial parallel**:
   - Maintainer owns Stages 1, 3, 5, 6.
   - Co-maintainer owns Stage 2 OR Stage 4 (their choice based on familiarity).
   - The unowned stage of {2, 4} slips by 2 weeks; calendar becomes 44 weeks; Tier-2 stretches in the unowned stage are dropped.

Both gates produce a public roadmap update post in `docs/blog/` describing what was cut and why. This is non-negotiable — silently shipping a slipping plan destroys trust.

---

## Cross-Cutting Obligations (round-3 addition)

These items are distributed across stages but tracked here for visibility:

| ID | Obligation | Stage owner | Sprint |
|---|---|---|---|
| C1 | `.sjsignore` file + Prettier coexistence story + Husky pre-commit recipe in formatter docs | Stage 3 | 3.3 |
| C2 | `superjs migrate from-prototype` CLI: stub in Stage 1 (1.5), completed in Stage 6 (6.1) | Stage 1 + 6 | 1.5, 6.1 |
| C3 | Docs-site infra (build, search, nav) for 80+ error-code pages — not just the content | Stage 6 | 6.1 |
| C4 | `"language": "1.0"` placeholder in `superjs.config.json` schema; reserved, does nothing, prevents post-1.0 pain | Stage 0 | 0.2 |
| C5 | Beta-program structured survey: count `dynamic` occurrences per kLOC | Stage 6 | 6.2 |
| C6 | `@superjs/compiler-types` CHANGELOG.md + semver bump policy published in Stage 0; every later PR documents any bump | Stage 0 | 0.1 |
| C7 | Node 24-dev added to CI nightly in Stage 0 (non-blocking); added to blocking matrix before Stage 6 launch | Stage 0 + 6 | 0.2, 6.3 |
| C8 | `RELEASING.md` with publish-rights list, patch CI bar, CVE fast-patch protocol | Stage 5 | 5.3 |
| C9 | BiDi-spoofing rejection (CVE-2021-42574): U+202A–U+202E and U+2066–U+2069 codepoints rejected or warned in lexer | Stage 1 | 1.1 |
| C10 | `superjs verify <input-dir> <output-dir>` CLI: re-runs build and byte-diffs; turns determinism into user-auditable feature | Stage 5 | 5.3 |

---

## How to Use These Documents

- **Start any stage** by reading its own file end-to-end. Each stage is self-contained: entry criteria, exit criteria, sprint breakdown with tasks, risks, API contracts, dependencies. You do not need to re-read the others.
- **Verify a stage gate** by checking the entry criteria of the *next* stage. Those are the same as the exit criteria of the previous stage, restated from the consumer's viewpoint. If they don't match, file a defect on this document.
- **Estimate slip impact** by walking the dependency graph above. A two-week slip in Stage 1 pushes all of 2/3/4/5/6 by two weeks. A two-week slip in Stage 3 pushes Stage 6 and (per round-3) the `lsp` subcommand of Stage 5's CLI bundle.
- **Track progress** at the sprint level. Each sprint has a "Done signal" — one observable test. Until that test passes the sprint is in flight; once it passes the sprint is done.
- **Track cross-cutting obligations** via the table above. Each is owned by a specific sprint; do not let them slip silently.

---

## File Index

### Version Vision Docs

- [`v1.0-product-vision.md`](v1.0-product-vision.md) — full working model of SJS at 1.0: language, compiler, CLI, interop, stdlib, tooling, ecosystem, docs, success criteria
- [`v2.0-native-compiler.md`](v2.0-native-compiler.md) — post-1.0 vision: self-hosted compiler, LLVM backend, native OS binaries, `superjs build --target native`, cross-compilation, native stdlib

### Stage Execution Plans (v1.0)

- [`stage-0-foundations.md`](stage-0-foundations.md) — repo, CI, grammar spec, error registry, shared types, diagnostic schema, RFC-0001..0005, threat model
- [`stage-1-compiler-core.md`](stage-1-compiler-core.md) — lexer (BiDi-safe), parser, checker (with `algorithm.md`), codegen, incremental, CLI, `@superjs/runtime`, `transform()` API, hard determinism gate
- [`stage-2-interop.md`](stage-2-interop.md) — `.d.ts → .d.sjs` translator, top-30 wrappers (backend-first), `superjs add` impl, typed-surface metric, ORM strategy
- [`stage-3-dx-tools.md`](stage-3-dx-tools.md) — LSP, VS Code extension, playground (Workers demo mode), debugger, formatter, 17-rule linter, migration tool on real codebase
- [`stage-4-stdlib.md`](stage-4-stdlib.md) — Layer-0 built-ins + Layer-1 + Layer-2 stdlib, bootstrap pipeline (downstream-fixture correctness), stdlib determinism gate
- [`stage-5-ecosystem.md`](stage-5-ecosystem.md) — npm publish, build-tool plugins, test transforms, monorepo support, `superjs init` templates, `superjs verify`
- [`stage-6-stability-and-launch.md`](stage-6-stability-and-launch.md) — spec polish + freeze, docs, beta (with `dynamic` usage survey), RC, 1.0 GA

---

## Open Questions (cross-stage, deferred)

The monolith's Appendix B carries forward. These remain open and tracked as GitHub Discussions; decisions due before the relevant stage starts.

1. Default sum-type representation: `{ _tag, _0 }` chosen; `classes` opt-in retained. Decision deferred-re-evaluation if interop pain mounts. (Stage 1.)
2. `dynamic` inference: silent propagation expected; Schema required at concrete-type boundaries. (Stage 1.)
3. JSX-by-default in parser: yes at v1.0. Disambiguation handled by parser context bits. (Stage 1.)
4. Stdlib package shape: many packages (`@superjs/std-core`, `@superjs/std-collections`, …) not one. Decided. (Stage 4.)
5. `Result` vs throwing for stdlib I/O: `Result` throughout. Decided. (Stage 4.)
6. Prisma codegen in v1.0 or v1.1: Tier 2; ship if Stage 2 has headroom. (Stage 2.)
7. Co-maintainer recruitment: GitHub Sponsors page, Twitter/X, HN "Show HN" with explicit ask, friendly outreach to ReScript / TS contributors. Action in Stage 0; **decision gates A and B per the section above**. (Stage 0.)
8. Cloudflare Workers as only playground host: yes for cost reasons; fallback to Fly.io / Render if Workers becomes restrictive. (Stage 3.)
9. Top-level await: out of v1.0; re-evaluate at v1.1.
10. Decorator metadata reflection: out of v1.0. **The tour does not teach decorators** (lesson 18 is "Serverless handler patterns" per round-3).

---

*End of index. Proceed to Stage 0.*
