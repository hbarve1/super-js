# Stage 2: JS/TS Interop

## Goal
Make `superjs add <pkg>` produce useful types for any of the top 30 npm packages immediately, and produce best-effort `.d.sjs` types with explicit `dynamic` fall-back markers for everything else on DefinitelyTyped — so the SJS user gets at least as much type safety as `tsc --strict` would on the same package.

This is the product. The framing from §3 of the monolith stands: if a user runs `superjs add fastify` and Fastify is `dynamic`, the deal is broken. Interop is **product priority #1** but **staging priority #2** (it cannot start until the Stage-1 compiler API is stable).

Round-3 changes: wave-1 reordered backend-first (T1, React moves to wave-2); `superjs add` implementation owned by Sprint 2.1 (B6); typed-surface metric formula published in Sprint 2.1 (B7); `@sjs:dynamic reason=` values bound to a closed set (M8); license audit per wrapper in Sprint 2.3 (R6); ESM/CJS compatibility declaration per wrapper (R2); `typescript` dev-dep pin policy (R7); spec text authored per feature (B8).

## Entry Criteria
- Stage 1 done. `@superjs/compiler` API (`parseTypeDecl`, `emitTypeDecl`, `compile`, `transform`) is **frozen**. 200-fixture `parseTypeDecl`/`emitTypeDecl` round-trip corpus green (B5).
- Stage 1 solo-path decision gate A merged (S2) — Stage 2 ownership assigned (maintainer or co-maintainer per the decision).
- `spec/error-codes.md` includes interop-specific codes (`SJS-I001..I099`) — added in Stage 0 and refined in Stage 1.
- `@superjs/compiler-types` exports `SuperJSType` discriminator the translator targets.
- Module resolver in Stage 1 honours `node_modules/@superjs/types/*` as the location of hand-curated wrappers, and resolves `extends`-clause `paths` from `tsconfig.json` (M9, Sprint 1.4).
- `typescript` dev-dep version chosen and pinned (R7) — `typescript@5.5.x` baseline; bumps require an explicit changeset noting "translator-affecting" or "translator-safe".

## Exit Criteria (Done When)
- [ ] `compiler/src/dts/` package implements `.d.ts → .d.sjs` translation for every construct in §3.2 of the monolith (interface, type alias, union, intersection, generic, mapped, conditional, template literal, enum, namespace, declaration merging, `infer`, `this`-type, overload, `unknown`, `any`, constraints, defaults).
- [ ] Translator emits `// @sjs:dynamic reason="..."` for every unmappable construct — never silent. **`reason` is drawn from the closed set in `spec/dts-dynamic-reasons.md` (M8)**: `intersection-not-mergeable | mapped-type | conditional-type | template-literal-type | declaration-merging | this-type | infer-type | indexed-access | keyof | unknown | any | module-augmentation | circular-type`. CI rejects translator commits that emit values outside this set.
- [ ] Translator passes its **200-package smoke test** with average ≥ 70 % typed-surface preservation, **measured per the locked formula in `tools/typed-surface-metric.md` (B7)**. Each result archived in `tests/fixtures/dts-translate/results/<pkg>.json`.
- [ ] `.superjs/dts-cache/` cache keyed on `(package name, version, translator version, typescript dev-dep version)`; cache invalidation on translator version or typescript-pin bump.
- [ ] **`superjs add <pkg>` (B6) fully implemented** (Sprint 2.1; stub shipped in Stage 1 Sprint 1.5): resolves `<pkg>` to its `package.json` in `node_modules/`, looks for a hand-curated `@superjs/types-<pkg>` first, falls back to running the translator on the package's published `.d.ts`, writes output to `node_modules/@superjs/types/<pkg>/index.d.sjs`, updates the project's `superjs.config.json` `paths` to find it.
- [ ] `superjs doctor` prints per-package typed-surface % (using the locked formula B7) and dynamic-cause breakdown per `spec/dts-dynamic-reasons.md` (M8).
- [ ] All **30 top packages** have hand-curated `@superjs/types-<pkg>` wrappers published to npm at `0.x` with `--provenance`. Each wrapper ships with a `STATUS.md` documenting typed-vs-dynamic surface, behavioural shims, **license-compatibility audit result (R6)**, and **ESM/CJS compatibility declaration (R2)**.
- [ ] **License audit (R6):** every wrapper's `STATUS.md` includes a `license-compat:` field. MIT/ISC/BSD/Apache-2.0 upstream `.d.ts` content may be re-distributed in our wrapper; LGPL/GPL upstream forces the wrapper to ship as a separate opt-in `@superjs/types-<pkg>-gpl` package with a header LICENSE notice. CI step `tools/license-audit.ts` enumerates wrapper deps and flags incompatible licenses.
- [ ] **ESM/CJS dual-mode (R2):** every SJS-published wrapper has `"exports"` map with both `"import"` and `"require"` conditions; CI tests both `import x from "@superjs/types-fastify"` (ESM) and `require("@superjs/types-fastify")` (CJS).
- [ ] **ORM strategy:** `@superjs/prisma-codegen` reads a `prisma/schema.prisma` and emits `@superjs/types-prisma-client.d.sjs` with concrete model types (Tier-2; ship if stage has headroom — see Risk register).
- [ ] **`@superjs/interop` package:** `fromJS<T>(val: dynamic, schema: Schema<T>): Result<T, ValidationError>` published; documented as the canonical boundary cast.
- [ ] Compatibility-matrix MVP page live on docs site: one row per supported package with hand-curated/auto-translation status, typed surface % (locked formula), last verified version.
- [ ] Banned-feature mitigations documented per top-30 wrapper: how does each wrapper handle intersection, mapped, conditional, template-literal, declaration-merging.
- [ ] Sum-type representation choice (`default` vs `classes` per Stage 1) documented per wrapper that does `instanceof` checks (e.g. error classes).
- [ ] **`tools/typed-surface-metric.md` published (B7)** before Sprint 2.2's measurements start — the formula is locked there.
- [ ] **Spec contribution (B8):** `spec/language.md/interop.md` covers `// @sjs:dynamic` markers, `fromJS` / `toJS` semantics, hand-curated-vs-translated wrapper resolution order.

## Sprints

### Sprint 2.1 — Translator MVP + cache + `superjs add` impl + typed-surface metric + dynamic-reasons spec (2 weeks)

**Deliverables:**
- `compiler/src/dts/translator.ts` — walks TS AST (via TypeScript compiler API as a dev-only dependency on `typescript`, pinned per R7) and emits SJS-shaped declarations through `@superjs/compiler` `emitTypeDecl`.
- Supported constructs (MVP): `interface`, `type alias`, function/method signatures, union types, classes, generic constraints, generic defaults, simple enums (`enum E { A, B }`), `unknown`/`any` → `dynamic`.
- Falls-back-to-`dynamic` constructs (MVP): intersection types (no auto-merge yet), mapped, conditional, template-literal, `infer`, namespaces, declaration merging, `this` types, indexed access (`T[K]`, `keyof T`).
- **`// @sjs:dynamic reason="..."` marker emission** drawing only from the closed set in `spec/dts-dynamic-reasons.md` (M8). Helper: `emitDynamic(reason: DtsDynamicReason)` where `DtsDynamicReason` is a literal union; TS compile error if a new reason is added without spec update.
- `.superjs/dts-cache/<pkg>@<ver>/index.d.sjs` cache keyed on `(pkg, ver, translator-ver, typescript-pin)`.
- 30-package smoke test: random sample of DefinitelyTyped packages; CI asserts translator does not crash on any.
- **`superjs add <pkg>` (B6) implementation** in `packages/compiler/src/cli/add.ts`:
  - Resolves `<pkg>` in current project's `node_modules`.
  - Looks for `@superjs/types-<pkg>` on npm (hand-curated wrapper); if present, installs it.
  - Otherwise runs translator against the package's `.d.ts` entry point (or DefinitelyTyped `@types/<pkg>`) and writes to `node_modules/@superjs/types/<pkg>/index.d.sjs`.
  - Updates `superjs.config.json` `paths` to map `<pkg>` → `node_modules/@superjs/types/<pkg>`.
  - Reports translator stats (typed surface % per B7, dynamic-reason histogram per M8).
- **`tools/typed-surface-metric.md` (B7)** — the locked formula and CI tooling:
  - **Definition (locked):** "Typed surface" = the set of identifier-position tokens in the original `.d.ts` (function names, parameter names, type alias names, interface names, class member names, exported variable names) whose translated SJS counterpart resolves to a type that is NOT `dynamic` and NOT `dynamic`-containing in immediate position (a `T?` whose `T` is `dynamic` counts as `dynamic`). Properties of an object type whose enclosing type is `dynamic` are NOT counted at all (they were never resolvable). Typed-surface % = `typed-identifiers / total-counted-identifiers`.
  - **Implementation:** `tools/typed-surface-metric.ts` walks both ASTs (TS via the pinned `typescript`, SJS via `parseTypeDecl`), enumerates identifier positions, classifies each, emits JSON.
  - **Lock:** any change to the formula requires a major version bump on `tools/typed-surface-metric.ts` AND a roadmap-blog entry — gates against silent re-tuning to make the 70 % threshold look hit.
- **`spec/dts-dynamic-reasons.md` (M8)** — closed-set reason enum; cross-referenced from `spec/error-codes.md` `SJS-I010` (dynamic-emitted-by-translator info).
- **Spec contribution (B8):** `spec/language.md/interop.md` first draft.

**Key tasks:**
- [ ] TypeScript-API-based traversal walking `SourceFile.getChildren()`.
- [ ] One handler per `ts.SyntaxKind` we care about.
- [ ] `// @sjs:dynamic` marker emission helper (closed-enum-typed).
- [ ] Cache write/read with hash key (incl. typescript-pin).
- [ ] Smoke test runner: `dts-translate-bench` script.
- [ ] Author `tools/typed-surface-metric.md` + `tools/typed-surface-metric.ts` (B7).
- [ ] Author `spec/dts-dynamic-reasons.md` (M8).
- [ ] Implement `superjs add` per spec (B6).
- [ ] Wire `add` CLI integration test: `superjs add fastify` in a fresh `tmp-project/`; assert `paths` updated and types found.
- [ ] Author `spec/language.md/interop.md`.

**Done signal:** Translator processes 30 random DT packages without throwing; cache directory populated; output files validate against `@superjs/compiler` parser; `superjs add fastify` works in an integration fixture; `tools/typed-surface-metric.ts` runs against fastify's output and produces a reproducible number.

### Sprint 2.2 — Intersection auto-merge, enum / namespace handling, doctor (2 weeks)

**Deliverables:**
- Intersection auto-merge: when both branches of `A & B` are object types and their property sets do not conflict, emit `interface AB extends A, B {}`. Conflict → `dynamic` with `reason="intersection-not-mergeable"` (per M8 closed set).
- Numeric enum + string enum translation to union types.
- `namespace N { export ... }` re-shape to module when the importer permits; otherwise `dynamic` with `reason="module-augmentation"` (per M8).
- Overloaded function signatures translated as a union return type.
- `superjs doctor`: per-imported-package report (typed-surface % per locked formula B7, top dynamic causes per `spec/dts-dynamic-reasons.md` M8).
- 200-package smoke test runs in CI nightly; results archived; regressions flagged. **Measurement uses the locked formula** (B7) — any change to the formula is blocked behind the major-bump policy.

**Key tasks:**
- [ ] Intersection compatibility check (no overlapping property names with different types).
- [ ] Enum → string-union or number-union codegen.
- [ ] Namespace flattening with collision detection.
- [ ] Overload union builder.
- [ ] `superjs doctor` CLI subcommand wired to translator output cache.
- [ ] Top-200 package list curated from `npm-stat` (per-week downloads).
- [ ] Nightly CI job that re-translates all 200; diff against `tests/fixtures/dts-translate/baseline/`; typed-surface % per package recorded.

**Done signal:** Top-200 smoke test runs green; average typed-surface ≥ 70 % across the corpus (locked formula); `superjs doctor` on a sample project produces a meaningful report.

### Sprint 2.3 — Top-30 wrappers wave 1 (backend-first per T1) + license audit (2 weeks)

**Deliverables:** Hand-curated `@superjs/types-<pkg>` wrappers published for the wave-1 set. **Reordered backend-first (T1)** since the target user is the Node-backend developer; React moves to wave-2:

| # | Package | Notes | License |
|---|---|---|---|
| 1 | `@types/node` core | `fs`, `path`, `process`, `crypto`, `stream`, `events`, `http`, `net`, `child_process` — typed surface; `fs.readFile` exposed both as Node-native (callback) and via `@superjs/std/fs` Result-returning wrapper (Stage 4). | MIT (DefinitelyTyped) |
| 2 | `express` | `Request` / `Response` frozen interface; user augmentation via composition (`interface MyRequest extends ExpressRequest { user: User }`); middleware signatures typed. | MIT (DT) |
| 3 | `fastify` | Schema-based routing; types parameterised on the user's schema. | MIT (DT) |
| 4 | `hono` | Workers-friendly; small surface. | MIT |
| 5 | `zod` | Hand-curated wrapper exposing `Schema.*` API parallel to native zod; user declares output type explicitly (no mapped-type inference). | MIT |
| 6 | `pino` | Trivial. | MIT |
| 7 | `drizzle-orm` | Codegen-friendly; same strategy as Prisma. | Apache-2.0 |
| 8 | `kysely` | Query builder typed via user-declared schema. | MIT |
| 9 | `@aws-sdk/client-s3` | Codegen-driven from Smithy specs. | Apache-2.0 |
| 10 | `@aws-sdk/client-dynamodb` | Codegen from Smithy. | Apache-2.0 |
| 11 | `dotenv` | Trivial. | BSD-2 |
| 12 | `jsonwebtoken` | Schema-validated payload types. | MIT (DT) |
| 13 | `node-fetch` / built-in `fetch` | Promise → typed wrapper. | MIT (DT) / native |
| 14 | `axios` | Promise → typed `Result` wrapper. | MIT (DT) |
| 15 | `vitest` | Adapter shape; full integration deferred to Stage 5. | MIT |

- License audit (R6) per `tools/license-audit.ts`: every wrapper's `STATUS.md` carries `license-compat: pass | review-needed | gpl-opt-in`. Any `gpl-opt-in` wrapper ships as a separately-installable `@superjs/types-<pkg>-gpl` package with header notice.

**Key tasks:**
- [ ] Per-package: write `.d.sjs`, run translator on the actual upstream `.d.ts` for diff context, write `STATUS.md` (incl. license-compat + ESM/CJS declaration), write a 50-line user-style integration example in `examples/`.
- [ ] CI: each wrapper has its own test that imports it and runs a smoke usage **in both ESM and CJS mode (R2)**.
- [ ] Run `tools/license-audit.ts` on the full dep set; resolve any conflicts before publish.

**Done signal:** All 15 wave-1 wrappers published to npm at `@superjs/types-<pkg>@0.1.0`; example projects compile and run; ESM + CJS tests green for each; license audit clean.

### Sprint 2.4 — Top-30 wrappers wave 2 (frontend + tooling) + Prisma codegen + matrix (2 weeks)

**Deliverables:** Remaining 15 wrappers. Wave-2 is **frontend + tooling + cloud edge** (React lives here per T1):

| # | Package | Notes |
|---|---|---|
| 16 | `react` | JSX-intrinsic-attributes via hand-frozen interface; `useReducer` reducer-typed via explicit `Schema`; `forwardRef` returns concrete typed function (loses some `this`-typing). |
| 17 | `react-dom` | Render APIs only; legacy `unmountComponentAtNode` deprecated. |
| 18 | `valibot` | Same shape as zod wrapper. |
| 19 | `prisma` (Prisma Client) | Wrapper returns `dynamic` for `findMany`/`findUnique` with `select`; codegen tool (this sprint, Tier-2). |
| 20 | `winston` | Trivial. |
| 21 | `lodash` / `lodash-es` | Function-by-function curated; tree-shake-friendly. |
| 22 | `date-fns` | Function-by-function curated. |
| 23 | `bcrypt` | Trivial. |
| 24 | `commander` / `yargs` | Both. |
| 25 | `chalk` | Trivial. |
| 26 | `jest` | Adapter shape (Vitest already in wave 1). |
| 27 | `next` | App-router types; pages-router deprecated. |
| 28 | `vite` | Plugin API typed; user-facing API typed. |
| 29 | `esbuild` | Build-API typed. |
| 30 | `@cloudflare/workers-types` | Runtime + bindings types. |

- **`@aws-sdk/client-lambda`, `client-sqs`** — additional AWS SDK clients (covered by Smithy codegen from wave 1 if calendar permits; otherwise document as wave-3 / community contribution).
- **`puppeteer` / `playwright`** — moved to community-contributed wrappers post-1.0 (browser-control APIs are not target-user critical).
- `@superjs/prisma-codegen` CLI tool (Tier-2; ship if calendar permits). Reads `prisma/schema.prisma`, emits `@superjs/types-prisma-client.d.sjs` with per-model concrete types.
- Compatibility-matrix HTML page: sortable table at `docs/compat/`; one row per package; columns: name | status | typed-surface % (locked) | wave | last-verified-version | license | ESM/CJS support.
- `@superjs/interop` package published: `fromJS<T>(val, schema): Result<T, ValidationError>`, `toJS(val): dynamic`, `wrapPromise<T>(p): Promise<Result<T, dynamic>>`.
- **Real-world "5–10k-LOC SJS-via-interop" test:** before sprint end, take a 5-10k-LOC TS project from a friendly team (recruited in Sprint 2.1 for arrival by 2.4 — see S5; same beta team also feeds Sprint 3.3 migration tool) and run it through interop end-to-end. Measure %dynamic at call sites; threshold ≤ 20 %. If exceeds, file Stage-2.5 stretch work before Stage 6 launch.

**Key tasks:**
- [ ] Remaining 15 wrappers per the table.
- [ ] AWS Smithy → `.d.sjs` codegen script in `tools/aws-smithy/` (carryover from wave 1).
- [ ] Prisma codegen tool (Tier-2 — see risk #1).
- [ ] Compat-matrix HTML generator reading from each wrapper's `STATUS.md`.
- [ ] `@superjs/interop` package design + publish.
- [ ] Real-world TS project interop test.

**Done signal:** All 30 wrappers published; `superjs add react && superjs add express && superjs add prisma` works on a fresh project; compat-matrix page renders; `npx @superjs/prisma-codegen` against the test Prisma schema emits a working `.d.sjs` file; real-world interop test reports ≤ 20 %dynamic at boundaries (or surface as Stage-2.5 work).

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Translator does not hit 70 % typed-surface average (locked formula) | M | XL | Sprint 2.1 has translator MVP only; 2.2 adds intersection auto-merge which is the biggest contributor; if missing target, cut Sprint 2.4 wave-2 from 15 to 8 (most popular) and ship — degrading interop breadth, not depth. |
| Top-30 wrapper effort underestimated (especially Prisma, AWS, React) | H | H | Sprints 2.3 + 2.4 budget 30 wrappers across 4 weeks ≈ 80 person-days estimate; if slip, drop AWS SDK count from 4 to 2 (s3 + dynamodb only) and ship; React drops to docs-link only. |
| Prisma codegen not feasible by 2.4 | M | M | Tier-2 from the start. Document as known limitation; users use Drizzle/Kysely or `dynamic` + Schema. |
| `superjs doctor` UX is unclear / users don't act on it | L | M | Ship `doctor` with a one-line "what to do" suggestion per dynamic cause (from M8 closed set); iterate post-1.0. |
| Wrapper drift as upstream packages release | M | M | Pin each wrapper to a major version; CI nightly checks upstream major bumps and files issues; document update SLA (best-effort within 4 weeks of upstream major). |
| **R2 — ESM/CJS split in top-30 wrappers** | M | M | Per-wrapper ESM/CJS compatibility declaration in `STATUS.md`; dual-mode `"exports"` for every SJS-published wrapper; CI tests both modes. |
| **R6 — License contamination from upstream `.d.ts`** | M | M | `tools/license-audit.ts` per wrapper in Sprint 2.3; LGPL/GPL wrappers ship separately as `@superjs/types-<pkg>-gpl` with header notice; rejection in CI for unaudited deps. |
| **R7 — Translator non-determinism via TypeScript-API internals** | M | H | Pin `typescript` dev-dep to `5.5.x`; lock `--langVersion`; run the 200-package smoke test against the locked pin only; bumping `typescript` requires a changeset declaring "translator-affecting" with full 200-package re-run. |
| `dynamic` proliferates in real user code despite wrappers (the deal breaks anyway) | M | XL | Sprint 2.4's real-world test (using the friendly-team 5-10k-LOC TS project) measures %dynamic at the call sites. If > 20 %, file Stage-2.5 stretch work before Stage 6 launch. |
| Friendly team's TS codebase not available by Sprint 2.4 (S5 dependency) | M | M | Recruit the team in Sprint 2.1; if not secured by end of 2.2, fall back to a synthetic 5k-LOC TS corpus assembled from open-source repos — degraded but not blocking. |
| Typed-surface formula is gamed by translator tweaks | L | H | Lock formula in `tools/typed-surface-metric.md` (B7); changes require major-bump of the tool + roadmap blog entry; the formula is referenced in README's "Definition of Production-Ready" so user-facing. |

## API Contract

This stage produces:

1. **`@superjs/types-<pkg>` packages** — hand-curated wrappers. Each is a normal npm package containing `.d.sjs` files plus optional runtime adapter `.js`. Each has dual ESM/CJS `"exports"` (R2). Each has `STATUS.md` with `license-compat` (R6) and `dynamic-reasons` histogram (M8). Consumed by **Stage 5** (build plugins resolve these automatically) and end-users.

2. **`@superjs/interop` package** — runtime helpers:
   ```ts
   export function fromJS<T>(val: dynamic, schema: Schema<T>): Result<T, ValidationError>;
   export function toJS(val: unknown): dynamic;
   export function wrapPromise<T>(p: Promise<T>): Promise<Result<T, dynamic>>;
   ```
   Consumed by user code and by **Stage 4** stdlib's `@superjs/std/json` (`parseAs`) and `@superjs/std/fs` (Result-returning wrappers).

3. **Translator output format** — `.d.sjs` files with `// @sjs:dynamic reason="..."` markers, `reason` drawn from `spec/dts-dynamic-reasons.md` closed set (M8). Consumed by **Stage 1** parser/checker (must accept these) and **Stage 3** LSP (must surface markers in hover).

4. **`superjs add` and `superjs doctor` CLI subcommands** (B6) — extend the Stage-1 CLI. Output schema documented in `docs/cli/add.md` and `docs/cli/doctor.md`. Typed-surface % uses the locked formula (B7).

5. **`tools/typed-surface-metric.md` and `tools/typed-surface-metric.ts`** (B7) — public, locked, major-version-gated. The 70 % threshold cited everywhere refers to this measurement.

6. **`spec/dts-dynamic-reasons.md`** (M8) — closed reason set.

## Dependencies

- **Requires Stage 1:** frozen `@superjs/compiler` API (`parseTypeDecl`, `emitTypeDecl`, `transform`); validated 200-fixture `typedecl-roundtrip` corpus (B5); module resolver that finds `@superjs/types/*` and resolves `extends`-clause paths (M9); `--format json` for the doctor output.
- **Unlocks:**
  - **Stage 5 (Ecosystem)** — Vite/esbuild plugins, Jest/Vitest transforms all assume `@superjs/types-vite`, `@superjs/types-vitest`, etc. exist.
  - **Stage 6 (Stability & Launch)** — beta program needs real npm packages typed; "Why SJS" page needs compat matrix as proof; the `dynamic` usage survey (C5) measures the same metric the typed-surface formula tracks.
- **Parallel with Stages 3 & 4** — none of those depend on Stage 2's outputs to start (LSP works without wrappers; stdlib doesn't import from npm). Stage 3 Sprint 3.3 migration tool uses the **same friendly-team 5-10k-LOC TS codebase** recruited here (S5) — shared dependency.
