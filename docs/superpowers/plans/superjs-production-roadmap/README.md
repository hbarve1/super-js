# SuperJS — Production Readiness Roadmap

**Version target:** 0.1.0 → 1.0.0
**Owner:** Himank Barve (solo maintainer; explicit goal to recruit 1–2 co-maintainers in Stage 0)
**Status:** Living document; modular stage breakdown supersedes `2026-05-30-superjs-production-roadmap.md` and round-1 / round-2 critiques.
**Last revised:** 2026-05-30

This directory is the executable plan for SuperJS 1.0. The previous monolith is preserved for context but is no longer the source of truth — see the header note on `../2026-05-30-superjs-production-roadmap.md`.

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
| Language | Stage 0 + 6 | `spec/language.md` frozen 8 weeks before 1.0; `spec/grammar.ebnf` parses every fixture |
| Compiler | Stage 1 | Cold compile 10k LOC ≤ 2 s; warm rebuild ≤ 100 ms; deterministic; recovery passes golden tests |
| Interop | Stage 2 | All 30 top packages have `.d.sjs` wrappers; `.d.ts → .d.sjs` translator ≥ 70 % typed surface on 200-package smoke test |
| Tooling | Stage 3 | LSP M1 ≤ 250 MB idle; VS Code extension on Marketplace; formatter idempotent; 15 lint rules |
| Stdlib | Stage 4 | All §6 modules published; > 90 % line coverage; bootstrap test stage-1 == stage-2 |
| Ecosystem | Stage 5 + 6 | 10+ official npm packages with `--provenance`; 3+ beta teams running v1.0-rc; 3+ third-party plugins |

If any category fails its checklist, v1.0 slips. Cutting scope at a stage gate is allowed; missing the checklist silently is not.

---

## Priority Matrix

Three tiers carried over from the monolith and re-keyed to stages.

### Tier 1 — v1.0 critical (every stage)

- Stage 0: repo layout, grammar spec, error registry, CI, diagnostic schema, shared types.
- Stage 1: lexer, parser, AST, bidirectional checker, codegen, source maps, incremental, watch, CLI.
- Stage 2: `.d.ts → .d.sjs` translator + top-30 hand-curated wrappers + `superjs doctor`.
- Stage 3: LSP M1 (9 methods); VS Code extension; server-side playground; DAP launch config; formatter; 15-rule linter; TS→SJS migration tool.
- Stage 4: Layer-0 built-ins (compiler-resident); Layer-1 and Layer-2 stdlib modules; bootstrap pipeline.
- Stage 5: npm publish; Vite plugin; esbuild plugin; Jest transform; Vitest transform; `@superjs/test-matchers`.
- Stage 6: docs (tour, errors, migration, API, "Why SJS"); compat matrix; beta program; bug bash; RC; 1.0 GA.

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
                    └── Stage 5 (Ecosystem)
                            └── Stage 6 (Stability & Launch)
```

Stages 2, 3, and 4 are independent of one another and can run in parallel once Stage 1 ships its API contract (see Stage 1's "API Contract" section). That parallelism is what makes the 1.0 target achievable with a maintainer + 1–2 co-maintainers; without parallelism the calendar adds ~14 weeks.

---

## Stage Gate Summary Table

| Stage | Deliverable | Gate criteria (must be true to enter) | Done signal | Est. duration |
|---|---|---|---|---|
| 0 | Foundations — repo, CI, grammar v1, error registry v1, shared types, diagnostic schema | Project decision to pursue 1.0 | `packages/compiler-types/` published v0.x; CI green on three OSes; `spec/grammar.ebnf` parses prototype fixtures | 4 weeks (2 sprints) |
| 1 | Compiler Core — lexer, parser, AST, bidirectional checker, codegen, source maps, incremental, watch, CLI | Stage 0 done | `superjs build` self-hosts on the new compiler end-to-end; prototype Babel backend retired | 12 weeks (6 sprints) |
| 2 | JS/TS Interop — translator, top-30 wrappers, `superjs doctor`, ORM strategy | Stage 1 compiler API frozen | `superjs add react` works; doctor reports per-package coverage; compat-matrix MVP live | 8 weeks (4 sprints) |
| 3 | DX Tools — LSP M1, VS Code extension, playground, formatter, debugger, linter | Stage 1 `typeAt` API frozen | VS Code extension on Marketplace; LSP smoke passes on 3 OSes; playground live; `superjs format` idempotent | 8 weeks (4 sprints) |
| 4 | Standard Library — Layer-0 built-ins + Layer-1 + Layer-2 SJS modules, bootstrap pipeline | Stage 1 codegen + module resolver stable | `@superjs/std-*` packages on npm with `--provenance`; bootstrap test stage-1 == stage-2 | 6 weeks (3 sprints) |
| 5 | Ecosystem — npm publish CLI, Vite/esbuild plugins, Jest/Vitest transforms, monorepo support | Stages 2 + 4 done | `npm install -g superjs` works on three OSes; Vite plugin HMR round-trip < 200 ms on sample app; determinism check enforced in CI | 6 weeks (3 sprints) |
| 6 | Stability & Launch — spec freeze, docs, beta program, bug bash, perf pass, security review, RC cycle, GA | Stages 2 + 3 + 5 done | `superjs@1.0.0` on npm with `--provenance`; launch post live; 3 beta teams in production-like use | 6 weeks (3 sprints) |

**Total calendar:** 4 + 12 + max(8, 8, 6) + 6 + 6 = **42 weeks (~10 months)** with parallel execution of Stages 2/3/4 by maintainer + 1 co-maintainer. **Serial:** 50 weeks (~12 months). **Solo serial fallback:** 56 weeks (~13 months), with Tier 2 cut.

These numbers replace the monolith's 68-week single-track estimate; the gain is from explicit parallelism, not from optimism.

---

## How to Use These Documents

- **Start any stage** by reading its own file end-to-end. Each stage is self-contained: entry criteria, exit criteria, sprint breakdown with tasks, risks, API contracts, dependencies. You do not need to re-read the others.
- **Verify a stage gate** by checking the entry criteria of the *next* stage. Those are the same as the exit criteria of the previous stage, restated from the consumer's viewpoint. If they don't match, file a defect on this document.
- **Estimate slip impact** by walking the dependency graph above. A two-week slip in Stage 1 pushes all of 2/3/4/5/6 by two weeks. A two-week slip in Stage 3 pushes only Stage 6 (Stages 2 and 4 are sibling-parallel, not dependent on 3).
- **Track progress** at the sprint level. Each sprint has a "Done signal" — one observable test. Until that test passes the sprint is in flight; once it passes the sprint is done.

---

## File Index

- [`stage-0-foundations.md`](stage-0-foundations.md) — repo, CI, grammar spec, error registry, shared types, diagnostic schema
- [`stage-1-compiler-core.md`](stage-1-compiler-core.md) — lexer, parser, checker, codegen, incremental, CLI
- [`stage-2-interop.md`](stage-2-interop.md) — `.d.ts → .d.sjs` translator, top-30 wrappers, ORM strategy
- [`stage-3-dx-tools.md`](stage-3-dx-tools.md) — LSP, VS Code extension, playground, debugger, formatter, linter
- [`stage-4-stdlib.md`](stage-4-stdlib.md) — Layer-0 built-ins + Layer-1 + Layer-2 stdlib, bootstrap pipeline
- [`stage-5-ecosystem.md`](stage-5-ecosystem.md) — npm publish, build-tool plugins, test transforms, monorepo support
- [`stage-6-stability-and-launch.md`](stage-6-stability-and-launch.md) — spec freeze, docs, beta, RC, 1.0 GA

---

## Open Questions (cross-stage, deferred)

The monolith's Appendix B carries forward. These remain open and tracked as GitHub Discussions; decisions due before the relevant stage starts.

1. Default sum-type representation: `{ _tag, _0 }` chosen; `classes` opt-in retained. Decision deferred-re-evaluation if interop pain mounts. (Stage 1.)
2. `dynamic` inference: silent propagation expected; Schema required at concrete-type boundaries. (Stage 1.)
3. JSX-by-default in parser: yes at v1.0. Disambiguation handled by parser context bits. (Stage 1.)
4. Stdlib package shape: many packages (`@superjs/std-core`, `@superjs/std-collections`, …) not one. Decided. (Stage 4.)
5. `Result` vs throwing for stdlib I/O: `Result` throughout. Decided. (Stage 4.)
6. Prisma codegen in v1.0 or v1.1: Tier 2; ship if Stage 2 has headroom. (Stage 2.)
7. Co-maintainer recruitment: GitHub Sponsors page, Twitter/X, HN "Show HN" with explicit ask, friendly outreach to ReScript / TS contributors. Action in Stage 0. (Stage 0.)
8. Cloudflare Workers as only playground host: yes for cost reasons; fallback to Fly.io / Render if Workers becomes restrictive. (Stage 3.)
9. Top-level await: out of v1.0; re-evaluate at v1.1.
10. Decorator metadata reflection: out of v1.0.

---

*End of index. Proceed to Stage 0.*
