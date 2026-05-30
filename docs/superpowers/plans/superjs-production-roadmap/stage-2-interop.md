# Stage 2: JS/TS Interop

## Goal
Make `superjs add <pkg>` produce useful types for any of the top 30 npm packages immediately, and produce best-effort `.d.sjs` types with explicit `dynamic` fall-back markers for everything else on DefinitelyTyped — so the SJS user gets at least as much type safety as `tsc --strict` would on the same package.

This is the product. The framing from §3 of the monolith stands: if a user runs `superjs add react` and React is `dynamic`, the deal is broken. Interop is **product priority #1** but **staging priority #2** (it cannot start until the Stage-1 compiler API is stable).

## Entry Criteria
- Stage 1 done. `@superjs/compiler` API (`parseTypeDecl`, `emitTypeDecl`, `compile`) is frozen.
- `spec/error-codes.md` includes interop-specific codes (`SJS-I001..I099`) — added in Stage 0 and refined in Stage 1.
- `@superjs/compiler-types` exports `SuperJSType` discriminator the translator targets.
- Module resolver in Stage 1 honours `node_modules/@superjs/types/*` as the location of hand-curated wrappers.

## Exit Criteria (Done When)
- [ ] `compiler/src/dts/` package implements `.d.ts → .d.sjs` translation for every construct in §3.2 of the monolith (interface, type alias, union, intersection, generic, mapped, conditional, template literal, enum, namespace, declaration merging, `infer`, `this`-type, overload, `unknown`, `any`, constraints, defaults).
- [ ] Translator emits `// @sjs:dynamic reason="..."` for every unmappable construct — never silent.
- [ ] Translator passes its **200-package smoke test** with average ≥ 70 % typed-surface preservation. Each result archived in `tests/fixtures/dts-translate/results/<pkg>.json`.
- [ ] `.superjs/dts-cache/` cache keyed on `(package name, version, translator version)`; cache invalidation on translator version bump.
- [ ] `superjs add <pkg>` resolves the package, kicks off translation (or uses a hand-curated wrapper if present), and writes the result.
- [ ] `superjs doctor` prints per-package typed-surface % and dynamic-cause breakdown per §3.2 of the monolith.
- [ ] All **30 top packages** (§3.3 of monolith) have hand-curated `@superjs/types-<pkg>` wrappers published to npm at `0.x` with `--provenance`. Each wrapper ships with a `STATUS.md` documenting typed-vs-dynamic surface and behavioural shims.
- [ ] **ORM strategy:** `@superjs/prisma-codegen` reads a `prisma/schema.prisma` and emits `@superjs/types-prisma-client.d.sjs` with concrete model types (Tier-2; ship if stage has headroom — see Risk register).
- [ ] **`@superjs/interop` package:** `fromJS<T>(val: dynamic, schema: Schema<T>): Result<T, ValidationError>` published; documented as the canonical boundary cast.
- [ ] Compatibility-matrix MVP page live on docs site: one row per supported package with hand-curated/auto-translation status, typed surface %, last verified version.
- [ ] Banned-feature mitigations (§3.4 of monolith) documented per top-30 wrapper: how does each wrapper handle intersection, mapped, conditional, template-literal, declaration-merging?
- [ ] Sum-type representation choice (`default` vs `classes` per Stage 1) documented per wrapper that does `instanceof` checks (e.g. error classes).

## Sprints

### Sprint 2.1 — Translator MVP + cache (2 weeks)

**Deliverables:**
- `compiler/src/dts/translator.ts` — walks TS AST (via TypeScript compiler API as a dev-only dependency on `typescript`) and emits SJS-shaped declarations through `@superjs/compiler` `emitTypeDecl`.
- Supported constructs (MVP): `interface`, `type alias`, function/method signatures, union types, classes, generic constraints, generic defaults, simple enums (`enum E { A, B }`), `unknown`/`any` → `dynamic`.
- Falls-back-to-`dynamic` constructs (MVP): intersection types (no auto-merge yet), mapped, conditional, template-literal, `infer`, namespaces, declaration merging, `this` types, indexed access (`T[K]`, `keyof T`).
- `// @sjs:dynamic reason="..."` marker emission for every fall-back.
- `.superjs/dts-cache/<pkg>@<ver>/index.d.sjs` cache.
- 30-package smoke test: random sample of DefinitelyTyped packages; CI asserts translator does not crash on any.

**Key tasks:**
- [ ] TypeScript-API-based traversal walking `SourceFile.getChildren()`.
- [ ] One handler per `ts.SyntaxKind` we care about.
- [ ] `// @sjs:dynamic` marker emission helper.
- [ ] Cache write/read with hash key.
- [ ] Smoke test runner: `dts-translate-bench` script.

**Done signal:** Translator processes 30 random DT packages without throwing; cache directory populated; output files validate against `@superjs/compiler` parser.

### Sprint 2.2 — Intersection auto-merge, enum / namespace handling, doctor (2 weeks)

**Deliverables:**
- Intersection auto-merge: when both branches of `A & B` are object types and their property sets do not conflict, emit `interface AB extends A, B {}`. Conflict → `dynamic` with `reason="intersection-not-mergeable"`.
- Numeric enum + string enum translation to union types.
- `namespace N { export ... }` re-shape to module when the importer permits; otherwise `dynamic` with marker.
- Overloaded function signatures translated as a union return type.
- `superjs doctor`: per-imported-package report (typed-surface %, top dynamic causes per §3.2 of monolith).
- 200-package smoke test runs in CI nightly; results archived; regressions flagged.

**Key tasks:**
- [ ] Intersection compatibility check (no overlapping property names with different types).
- [ ] Enum → string-union or number-union codegen.
- [ ] Namespace flattening with collision detection.
- [ ] Overload union builder.
- [ ] `superjs doctor` CLI subcommand wired to translator output cache.
- [ ] Top-200 package list curated from `npm-stat` (per-week downloads).
- [ ] Nightly CI job that re-translates all 200; diff against `tests/fixtures/dts-translate/baseline/`.

**Done signal:** Top-200 smoke test runs green; average typed-surface ≥ 70 % across the corpus; `superjs doctor` on a sample project produces a meaningful report.

### Sprint 2.3 — Top-30 wrappers wave 1 (2 weeks)

**Deliverables:** Hand-curated `@superjs/types-<pkg>` wrappers published for:

| # | Package | Notes |
|---|---|---|
| 1 | `react` | JSX-intrinsic-attributes via hand-frozen interface; `useReducer` reducer-typed via explicit `Schema`; `forwardRef` returns concrete typed function (loses some `this`-typing). |
| 2 | `react-dom` | Render APIs only; legacy `unmountComponentAtNode` deprecated. |
| 3 | `@types/node` core | `fs`, `path`, `process`, `crypto`, `stream`, `events`, `http`, `net`, `child_process` — typed surface; `fs.readFile` exposed both as Node-native (callback) and via `@superjs/std/fs` Result-returning wrapper (Stage 4). |
| 4 | `express` | `Request` / `Response` frozen interface; user augmentation via composition (`interface MyRequest extends ExpressRequest { user: User }`); middleware signatures typed. |
| 5 | `fastify` | Schema-based routing; types parameterised on the user's schema. |
| 6 | `hono` | Workers-friendly; small surface. |
| 7 | `zod` | Hand-curated wrapper exposing `Schema.*` API parallel to native zod; user declares output type explicitly (no mapped-type inference) — see §12.4 of monolith. |
| 8 | `valibot` | Same shape as zod wrapper. |
| 9 | `prisma` (Prisma Client) | Wrapper returns `dynamic` for `findMany`/`findUnique` with `select`; codegen tool ships in Sprint 2.4 if scheduled. |
| 10 | `drizzle-orm` | Codegen-friendly; same strategy. |
| 11 | `kysely` | Query builder typed via user-declared schema. |
| 12 | `pino` | Trivial. |
| 13 | `winston` | Trivial. |
| 14 | `lodash` / `lodash-es` | Function-by-function curated; tree-shake-friendly. |
| 15 | `date-fns` | Function-by-function curated. |

**Key tasks:**
- [ ] Per-package: write `.d.sjs`, run translator on the actual upstream `.d.ts` for diff context, write `STATUS.md`, write a 50-line user-style integration example in `examples/`.
- [ ] CI: each wrapper has its own test that imports it and runs a smoke usage.

**Done signal:** All 15 wrappers published to npm at `@superjs/types-<pkg>@0.1.0`; example projects compile and run.

### Sprint 2.4 — Top-30 wrappers wave 2 + Prisma codegen + matrix (2 weeks)

**Deliverables:** Remaining 15 wrappers:

| # | Package | Notes |
|---|---|---|
| 16 | `axios` | Promise → typed `Result` wrapper. |
| 17 | `node-fetch` / built-in `fetch` | Same. |
| 18 | `@aws-sdk/client-s3`, `client-dynamodb`, `client-lambda`, `client-sqs` | Codegen from AWS Smithy specs; large surface. |
| 19 | `dotenv` | Trivial. |
| 20 | `jsonwebtoken` | Schema-validated payload types. |
| 21 | `bcrypt` | Trivial. |
| 22 | `commander` / `yargs` | Both. |
| 23 | `chalk` | Trivial. |
| 24 | `vitest` / `jest` | Adapter shape; full integration deferred to Stage 5. |
| 25 | `next` | App-router types; pages-router deprecated. |
| 26 | `vite` | Plugin API typed; user-facing API typed. |
| 27 | `esbuild` | Build-API typed. |
| 28 | `cloudflare:workers` types | Runtime types. |
| 29 | `@cloudflare/workers-types` | Bindings. |
| 30 | `puppeteer` / `playwright` | Browser-control APIs. |

- `@superjs/prisma-codegen` CLI tool (Tier-2; ship if calendar permits). Reads `prisma/schema.prisma`, emits `@superjs/types-prisma-client.d.sjs` with per-model concrete types.
- Compatibility-matrix HTML page: sortable table at `docs/compat/`; one row per package; columns per §3.5 of monolith.
- `@superjs/interop` package published: `fromJS<T>(val, schema): Result<T, ValidationError>`, `toJS(val): dynamic`, `wrapPromise<T>(p): Promise<Result<T, dynamic>>`.

**Key tasks:**
- [ ] Remaining 15 wrappers per the table.
- [ ] AWS Smithy → `.d.sjs` codegen script in `tools/aws-smithy/`.
- [ ] Prisma codegen tool (Tier-2 — see risk #1).
- [ ] Compat-matrix HTML generator reading from each wrapper's `STATUS.md`.
- [ ] `@superjs/interop` package design + publish.

**Done signal:** All 30 wrappers published; `superjs add react && superjs add express && superjs add prisma` works on a fresh project; compat-matrix page renders; `npx @superjs/prisma-codegen` against the test Prisma schema emits a working `.d.sjs` file.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Translator does not hit 70 % typed-surface average | M | XL | Sprint 2.1 has translator MVP only; 2.2 adds intersection auto-merge which is the biggest contributor; if missing target, cut Sprint 2.4's 15 wrappers down to 8 (most popular) and ship — degrading interop breadth, not depth. |
| Top-30 wrapper effort underestimated (especially Prisma, AWS, React) | H | H | Sprints 2.3 + 2.4 budget 30 wrappers across 4 weeks ≈ 80 person-days estimate from monolith §3.6; if slip, drop AWS SDK count from 4 to 2 (s3 + dynamodb only) and ship. |
| Prisma codegen not feasible by 2.4 | M | M | Tier-2 from the start. Document as known limitation; users use Drizzle/Kysely or `dynamic` + Schema. |
| `superjs doctor` UX is unclear / users don't act on it | L | M | Ship `doctor` with a one-line "what to do" suggestion per dynamic cause; iterate post-1.0. |
| Wrapper drift as upstream packages release | M | M | Pin each wrapper to a major version; CI nightly checks upstream major bumps and files issues; document update SLA (best-effort within 4 weeks of upstream major). |
| TypeScript compiler API breaking changes block translator | L | M | Pin `typescript` dev-dep to a major; bump deliberately, not automatically. |
| `dynamic` proliferates in real user code despite wrappers (the deal breaks anyway) | M | XL | Sprint 2.4 includes a real-world test: take a 5k-LOC TS project from a friendly team, run it through interop, measure %dynamic at the call sites. If > 20 %, file Stage-2.5 stretch work before Stage 6 launch. |

## API Contract

This stage produces:

1. **`@superjs/types-<pkg>` packages** — hand-curated wrappers. Each is a normal npm package containing `.d.sjs` files plus optional runtime adapter `.js`. Consumed by **Stage 5** (build plugins resolve these automatically) and end-users.

2. **`@superjs/interop` package** — runtime helpers:
   ```ts
   export function fromJS<T>(val: dynamic, schema: Schema<T>): Result<T, ValidationError>;
   export function toJS(val: unknown): dynamic;
   export function wrapPromise<T>(p: Promise<T>): Promise<Result<T, dynamic>>;
   ```
   Consumed by user code and by **Stage 4** stdlib's `@superjs/std/json` (`parseAs`) and `@superjs/std/fs` (Result-returning wrappers).

3. **Translator output format** — `.d.sjs` files with `// @sjs:dynamic reason="..."` markers. Consumed by **Stage 1** parser/checker (must accept these) and **Stage 3** LSP (must surface markers in hover).

4. **`superjs doctor` CLI subcommand** — extends the Stage-1 CLI. Output schema documented in `docs/cli/doctor.md`.

## Dependencies

- **Requires Stage 1:** stable `@superjs/compiler` API (`parseTypeDecl`, `emitTypeDecl`); module resolver that finds `@superjs/types/*`; `--format json` for the doctor output.
- **Unlocks:**
  - **Stage 5 (Ecosystem)** — Vite/esbuild plugins, Jest/Vitest transforms all assume `@superjs/types-vite`, `@superjs/types-vitest`, etc. exist.
  - **Stage 6 (Stability & Launch)** — beta program needs real npm packages typed; "Why SJS" page needs compat matrix as proof.
- **Parallel with Stages 3 & 4** — none of those depend on Stage 2's outputs (LSP works without wrappers; stdlib doesn't import from npm).
