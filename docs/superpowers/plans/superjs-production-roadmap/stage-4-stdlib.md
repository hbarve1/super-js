# Stage 4: Standard Library

## Goal
Ship the minimal v1.0 standard library — Layer-0 compiler-resident types, Layer-1 pure SJS modules, Layer-2 dependent modules — and the documented bootstrap pipeline that makes it possible to develop and publish a SJS-written stdlib using a TS-written compiler without circular dependencies. Extend the determinism hard gate to stdlib output. Specify `Schema<T>` error format and composition rules.

The scope is **deliberately small**. Channels, CSP, Temporal, DOM, Web Streams, crypto, child_process, net, dgram, http server, EventEmitter, Intl: all post-1.0.

Round-3 changes: bootstrap correctness redefined as **downstream user-code byte-equality**, not stdlib-output self-comparison (B3); `Schema<T>` error format + composition spec at `stdlib/L2/json/SCHEMA.md` (M7); stdlib determinism hard gate extended from compiler (S3); compiler-version drift policy for stdlib (R3); spec text authored per feature (B8); `@superjs/runtime` is the import surface for Layer-0 runtime helpers (Stage 1 Sprint 1.5 delivered the package).

## Entry Criteria
- Stage 1 done. `@superjs/compiler` exposes `--self-bootstrap` mode (per `CompileOpts.selfBootstrap`). Hard determinism gate green on compiler output (S3).
- `@superjs/runtime` package published (B4, Stage 1 Sprint 1.5); Layer-1 re-exports its runtime forms.
- `@superjs/jest-transform` stub published (Stage 1 Sprint 1.5) — needed to run stdlib `.sjs` tests.
- Stage 0 done. `@superjs/compiler-types` exports `SuperJSType` discriminator. `@superjs/compiler-types` CHANGELOG + SEMVER policy active.
- Module resolver in Stage 1 honours both `@superjs/std/<sub>` (subpath imports) and `@superjs/std-<sub>` (separate packages); decision in `README.md` open question #4 stands — **many packages**, one per top-level subdirectory.
- Layer-0 built-in types are already embedded in the Stage 1 compiler binary; their *publish* as re-exports happens here.

## Exit Criteria (Done When)
- [ ] **Layer-0 built-ins** finalised and embedded in compiler: `Option<T>`, `Result<T,E>`, `Iterator<T>`, `IterResult<T>`, `Comparable<T>`, `Display`, `Eq<T>`, `Clone<T>`, `Hashable`, `panic`, `assert`, `todo`, `unreachable` (runtime forms live in `@superjs/runtime`).
- [ ] **Layer-1 modules** written in SJS, compiled with the Stage-1 compiler in `--self-bootstrap` mode, published to npm with `--provenance`:
  - `@superjs/std-core` (re-exports Layer-0 types from compiler built-ins; re-exports `panic`/`assert`/`todo`/`unreachable` from `@superjs/runtime`; no other runtime code)
  - `@superjs/std-collections` (`List<T>` + thin typed wrappers for `Map`/`Set`/`Queue`/`Stack`)
  - `@superjs/std-string` (`split`, `join`, `trim`, `lower`, `upper`, `replace`, `includes`, `startsWith`, `endsWith`, `parseInt`, `parseFloat`, `format`, typed `RegExp<Groups>`, `StringBuilder`)
  - `@superjs/std-math` (`abs`, `sign`, `min`, `max`, `clamp`, `lerp`, `round`, `floor`, `ceil`, `trunc`, `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `pow`, `PI`, `E`, `INFINITY`, `random`, `randomInt`)
  - `@superjs/std-async` (`sleep`, `timeout`, `all`, `allSettled`, `race`; `Task<T>` typed Promise alias; AbortSignal interop helpers)
- [ ] **Layer-2 modules** written in SJS, published to npm:
  - `@superjs/std-json` (`parse`, `parseAs<T>`, `stringify`, `Schema` builder per `stdlib/L2/json/SCHEMA.md` — M7)
  - `@superjs/std-fs` (Result-returning Node `fs` wrapper)
  - `@superjs/std-path` (`join`, `resolve`, `dirname`, `basename`, `extname`, `relative`, `isAbsolute`, `sep`)
  - `@superjs/std-process` (`argv`, `env`, `cwd`, `exit`, `platform`)
  - `@superjs/std-time` (`Instant`, `Duration`, `now`, `parseISO`, `toISO`)
- [ ] **Bootstrap pipeline** documented at `stdlib/BOOTSTRAP.md` and automated in CI:
  1. Build TS compiler (`npm run -w packages/compiler build`).
  2. Compile Layer-1 stdlib (`superjs build --self-bootstrap stdlib/L1/**/*.sjs`).
  3. Compile Layer-2 stdlib using L1 outputs (`superjs build --self-bootstrap stdlib/L2/**/*.sjs`).
  4. Pack and publish each `@superjs/std-*` package.
- [ ] **Bootstrap correctness test — REDEFINED (B3)**: the stage-1 vs stage-2 byte-equality assertion compares **downstream user-code outputs**, not stdlib-output self-comparison.
  - **Fixture set:** `tests/fixtures/bootstrap-downstream/` — 50 user-style `.sjs` files representative of real usage (each uses `Result`, `Option`, `List`, `Schema`, `fs`, `time`).
  - **Procedure:**
    1. Compile each fixture with `superjs build --self-bootstrap` (uses compiler-resident Layer-0 + locally-built Layer-1/Layer-2). Output to `dist-self/`.
    2. Compile each fixture with `superjs build` resolving against **published** `@superjs/std-*@local` (locally re-published via `npm pack && npm install file:./pkg.tgz`). Output to `dist-published/`.
    3. `diff -r dist-self/ dist-published/` — must be byte-identical for every downstream fixture.
  - **Why this is right:** `--self-bootstrap` injects the built-in Layer-0 types while the published `@superjs/std-core` is a re-export module — their ASTs differ. Comparing **downstream consumer output** is the only invariant that proves both paths are equivalent for users. CI gate.
- [ ] **Stdlib determinism hard gate (S3 extension):** `check:determinism:stdlib` builds every Layer-1 + Layer-2 package twice; `diff -r` must be byte-identical. Same lint rules from Stage 1 (`codegen/no-unordered-iter`, banned `Date.now()` / `Math.random()` in build-time code) apply to stdlib source.
- [ ] **Stdlib test coverage** ≥ 90 % line coverage on every package, measured via `c8`.
- [ ] **`Symbol.iterator` bridge** verified end-to-end: `for (const x of myList)` works on `@superjs/std-collections` `List<T>`; native JS `for (const x of jsArray)` works; mixed iteration works. Uses `@superjs/runtime`'s `attachIteratorSymbol`.
- [ ] **Reified `Schema<T>` builder** verified per **`stdlib/L2/json/SCHEMA.md` (M7)**:
  - Error shape: `type ValidationError = { path: string[]; code: string; message: string }`.
  - `parseAs` returns `Result<T, ValidationError>` (single first-error mode by default) or `Result<T, ValidationError[]>` when `--collect-errors` flag in `parseAs(opts: { collect?: boolean })`.
  - `refine(s, pred, opts: { code, message })` runs **after** structural check; short-circuits on first failure unless `collect: true`.
  - Composition: `Schema.object({...}).extend({...})` is the only composition primitive (no intersection); union via `Schema.union(a, b)` returns first match.
  - Performance: `parseAs` ≤ 3× `JSON.parse` on a 50-field object reference fixture (`bench/schema-vs-json-parse.bench.ts`).
- [ ] **Layer-0 / stdlib name parity**: every Layer-0 built-in is re-exported by `@superjs/std-core` under the same name. User code importing `import { Option } from "@superjs/std-core"` works; compiler resolves to the built-in.
- [ ] **Compiler-version drift policy documented (R3)** at `stdlib/COMPILER-COMPAT.md`: patch-level compiler fixes → stdlib patch bump (no behaviour change); minor compiler (additive features) → stdlib minor bump; major compiler → stdlib major. `peerDependencies` on each `@superjs/std-*` declare a compiler-version range; CI tests stdlib build under both edges of the range.
- [ ] **API docs** auto-generated from doc comments (consumed by Stage 6); doc-comment style guide documented in `stdlib/STYLE.md`.
- [ ] **Spec contribution (B8):** `spec/language.md/stdlib-surface.md` documenting the v1.0 stable surface (function signatures, error shape, perf guarantees).

## Sprints

### Sprint 4.1 — Layer-0 finalisation + Layer-1 implementation (2 weeks)

**Deliverables:**
- Finalise Layer-0 type definitions inside `packages/compiler/src/builtins/lib.sjs.d.ts` (TS-declared because the compiler is TS). Includes:
  - `Option<T>`, `Result<T,E>`, `Iterator<T>`, `IterResult<T>`, `Comparable<T>`, `Display`, `Eq<T>`, `Clone<T>`, `Hashable`.
  - Built-in functions: `panic(msg): never`, `assert(cond, msg?)`, `todo(msg?)`, `unreachable(msg?)`. Runtime forms live in `@superjs/runtime` (Stage 1); Layer-0 type declarations are in the compiler.
- Layer-1 SJS source in `stdlib/L1/`:
  - `stdlib/L1/core/index.sjs` — re-exports Layer-0 types; re-exports `panic`/`assert`/`todo`/`unreachable` from `@superjs/runtime`.
  - `stdlib/L1/collections/list.sjs` — `List<T>` wrapping JS `Array`; methods `push`, `pop`, `get`, `set`, `len`, `iter`, `map`, `filter`, `reduce`, `find`, `flatMap`.
  - `stdlib/L1/collections/index.sjs` — thin typed wrappers for `Map`, `Set`, `Queue` (linked-list-backed), `Stack`.
  - `stdlib/L1/string/index.sjs` — all string functions per exit criteria; `parseInt`/`parseFloat` return `Result<number, ParseError>`.
  - `stdlib/L1/math/index.sjs` — pure functions over `number`.
  - `stdlib/L1/async/index.sjs` — `sleep` (setTimeout-wrapped), `timeout`, `all`, `allSettled`, `race`, `Task<T>` alias, AbortSignal helpers.
- `stdlib/BOOTSTRAP.md` written: documents the four-step pipeline.
- Build script `stdlib/build.sh` (or `package.json` script) automates L1 compile under `--self-bootstrap`.

**Key tasks:**
- [ ] Implement Layer-0 declarations in compiler binary.
- [ ] Write Layer-1 SJS source per the package list.
- [ ] Implement `--self-bootstrap` correctness: compiler treats `import { Option } from "@superjs/std-core"` as a reference to the built-in (no `node_modules` lookup).
- [ ] Build script: compile L1, output to `stdlib/L1/dist/`.
- [ ] Unit tests in `stdlib/L1/tests/` — written in SJS, run via the Stage-1 `@superjs/jest-transform` stub. The full transform with all matchers ships in Stage 5; stdlib only needs the minimum that the stub provides.
- [ ] Doc comments on every public export.
- [ ] CI step: `npm run build:stdlib:L1` and `npm run test:stdlib:L1`.

**Done signal:** All Layer-1 packages compile under `--self-bootstrap`; all Layer-1 unit tests pass; coverage ≥ 90 % across L1.

### Sprint 4.2 — Layer-2 implementation + Schema + iterator bridge verification + SCHEMA.md (2 weeks)

**Deliverables:**
- Layer-2 SJS source in `stdlib/L2/`:
  - `stdlib/L2/json/index.sjs` — `parse(s): Result<dynamic, ParseError>`; `parseAs<T>(s, schema, opts?): Result<T, ValidationError>` (or `Result<T, ValidationError[]>` if `collect: true`); `stringify(v, opts?)`; `Schema` builder combinators.
  - `stdlib/L2/fs/index.sjs` — `readFile`, `writeFile`, `readDir`, `stat`, `exists`; all Result-returning, all `Promise`-based. Imports `node:fs/promises` internally.
  - `stdlib/L2/path/index.sjs` — wraps `node:path`; `sep` is `"/"` on POSIX, `"\\"` on Windows.
  - `stdlib/L2/process/index.sjs` — wraps `node:process`; `env(name): Option<string>` returns `Some(value)` or `None`.
  - `stdlib/L2/time/index.sjs` — `Instant` wraps `Date`/`number-ms`; `Duration` wraps `number-ms`; `parseISO` returns `Result<Instant, ParseError>`.
- `Schema<T>` runtime-reified implementation per **`stdlib/L2/json/SCHEMA.md` (M7)**:
  - `Schema.string()`, `Schema.number()`, `Schema.boolean()`, `Schema.null_()` — primitive schemas.
  - `Schema.object<T>({field: subschema, ...})` — object schema with structural check.
  - `Schema.array<T>(item)` — array schema.
  - `Schema.union<A, B>(a, b)` — tagged-union schema; first match wins.
  - `Schema.optional<T>(t)` — `T | null` schema.
  - `Schema.refine<T>(s, pred, opts: { code: string; message: string })` — adds runtime predicate; short-circuits unless `parseAs(..., { collect: true })`.
  - `.extend(...)` composition only (no intersection).
- **`stdlib/L2/json/SCHEMA.md` (M7)** publishes:
  - Error shape `ValidationError = { path: string[]; code: string; message: string }`. Path is a sequence of property names and array indices (e.g. `["user", "addresses", "0", "street"]`).
  - Standard error codes: `expected-string`, `expected-number`, `expected-boolean`, `expected-null`, `expected-object`, `expected-array`, `union-no-match`, `refine-failed`, plus user-supplied codes from `refine()`.
  - `parseAs(..., { collect: true })` semantics: returns `Result<T, ValidationError[]>`; default `collect: false` returns first error.
  - `refine` semantics: runs after structural validation; if `collect: true`, accumulates; if `false`, short-circuits.
  - Performance contract: `parseAs` on a 50-field object ≤ 3× `JSON.parse` baseline measured by `bench/schema-vs-json-parse.bench.ts`.
- `Symbol.iterator` bridge verification: `@superjs/runtime`'s `attachIteratorSymbol(ctor)` inlined by Stage-1 codegen for all SJS classes implementing `Iterator<T>`; verified with test that `for (const x of List.from([1,2,3]))` works.
- **Spec contribution (B8):** `spec/language.md/stdlib-surface.md` first complete pass (finalised Stage 6 Sprint 6.1).

**Key tasks:**
- [ ] Write Layer-2 SJS source per package list.
- [ ] Implement `Schema` combinators in pure SJS (no runtime metaprogramming).
- [ ] Implement `parseAs<T>` as schema-driven walk of the dynamic input; both single-error and `collect: true` modes.
- [ ] Author `stdlib/L2/json/SCHEMA.md` (M7).
- [ ] Implement `bench/schema-vs-json-parse.bench.ts`; assert ≤ 3× threshold.
- [ ] L2 unit tests in `stdlib/L2/tests/` — covers Schema combinators, fs Result behaviour (mock fs), path edge cases (Windows backslash, relative resolution).
- [ ] Iterator bridge integration test (compiles a fixture using `List<T>` and iterates).
- [ ] CI step: `npm run build:stdlib:L2` and `npm run test:stdlib:L2`.
- [ ] Author `spec/language.md/stdlib-surface.md` first pass.

**Done signal:** All Layer-2 packages compile under `--self-bootstrap` using Layer-1 dist; Layer-2 tests pass; iterator-bridge test green; Schema round-trip test passes for a 50-field object; Schema vs JSON.parse benchmark ≤ 3×; `SCHEMA.md` published.

### Sprint 4.3 — Bootstrap correctness (downstream comparison) + publish + docs + stdlib determinism gate + compiler-compat policy (2 weeks)

**Deliverables:**
- **Stage-1 vs stage-2 byte-equality test — REDEFINED (B3)** in CI per the exit-criteria procedure:
  - Build `tests/fixtures/bootstrap-downstream/` (50 user-style `.sjs` files) twice:
    1. With `--self-bootstrap` (compiler resolves Layer-0 internally, Layer-1/Layer-2 from local `stdlib/L1/dist/` and `stdlib/L2/dist/`).
    2. With regular resolution against locally-republished `@superjs/std-*@local` packages.
  - `diff -r dist-self/ dist-published/` — byte-identical.
  - Both paths consume the same Stage-1 compiler binary; the only difference is whether `import { Option } from "@superjs/std-core"` resolves to the built-in or to the re-export module.
  - If diff appears, the regression is in either (a) Layer-1's re-export semantics or (b) the compiler's `--self-bootstrap` mode — both must produce identical observable behaviour for downstream code.
- All `@superjs/std-*` packages published to npm at `0.x` with `--provenance` via Changesets. **Each package's `package.json` declares `peerDependencies: { "@superjs/compiler": "^x.y" }`** per the R3 compatibility policy.
- **Stdlib determinism hard gate (S3 extension):** new CI step `check:determinism:stdlib` builds every Layer-1 + Layer-2 package twice; `diff -r` byte-identical; PR rejected on diff.
- **`stdlib/COMPILER-COMPAT.md` (R3)**: documents the version-drift policy:
  - Compiler patch (`x.y.z` → `x.y.z+1`, no behaviour change) → stdlib patch (`a.b.c` → `a.b.c+1`).
  - Compiler minor (`x.y` → `x.y+1`, additive features) → stdlib minor (`a.b` → `a.b+1`).
  - Compiler major → stdlib major (synchronized).
  - CI matrix tests each `@superjs/std-*@latest` against the **lowest compiler version in its peer-dep range** and the **highest committed compiler version**. Diff in output between the two is a soundness bug and blocks release.
- Stdlib `STABILITY.md` documenting which symbols are `stable` / `beta` / `unstable` (per §11.6 of monolith). v1.0 stable surface = everything in the exit-criteria module list.
- Stdlib `STYLE.md` for doc-comment style; consumed by Stage-6's auto-API generator.
- `docs/stdlib/` index page generated from each package's doc comments.
- **Bootstrap-failure fallback documented**: if Sprint 4.3's correctness test fails close to launch, fallback is to ship Layer-0 only (compiler-resident) and re-export it as a TS-implemented `@superjs/std-core` for v1.0; user-facing API stays the same; SJS-implementation moves to v1.1. (This is Risk #8 from §17 of the monolith made concrete.)
- "First L0 + L1 + L2 of stdlib runs in playground" smoke (cross-checks Stage 3's playground): a tour-lesson fixture that uses `Result`, `Schema`, `List` runs in the playground without `dynamic`.

**Key tasks:**
- [ ] Build `tests/fixtures/bootstrap-downstream/` 50-fixture set (B3).
- [ ] Implement downstream-comparison CI step.
- [ ] Implement `check:determinism:stdlib` CI step (S3 extension).
- [ ] Configure Changesets for stdlib packages with `peerDependencies` ranges.
- [ ] First publish wave: all L1 + L2 packages at `0.1.0`.
- [ ] Author `stdlib/COMPILER-COMPAT.md` (R3); wire dual-version CI matrix.
- [ ] Author `STABILITY.md` and `STYLE.md`.
- [ ] Generate `docs/stdlib/` index.
- [ ] Verify playground integration with newly published stdlib (Stage 3's playground swaps in real stdlib bundle).
- [ ] Author bootstrap-failure fallback note in `stdlib/BOOTSTRAP.md`.

**Done signal:** All `@superjs/std-*` packages published; `npm install @superjs/std-core @superjs/std-collections` in a fresh project works; bootstrap downstream-comparison CI step green; stdlib determinism CI step green; playground tour lesson runs; CI dual-compiler-version matrix green.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bootstrap circular dependency surfaces (compiler needs stdlib type, stdlib needs compiled stdlib) | M | H | Layer-0 in compiler binary breaks the cycle; Sprint 4.1's `--self-bootstrap` test validates this; if breaks, ship Layer-0 only and TS-implemented stdlib alias (documented fallback). |
| Stage-1 vs stage-2 downstream byte-equality fails (B3) | M | H | The redefined test (downstream comparison, not stdlib self-comparison) is the right invariant; failure indicates a real compiler bug in `--self-bootstrap` vs re-export resolution. Stage 1's determinism gate catches most causes pre-Stage-4. If surfaces here, debug as a Stage-1 regression. |
| Schema runtime overhead is unacceptable (Zod-class performance issue) | M | M | `bench/schema-vs-json-parse.bench.ts` hard threshold 3× (M7); if missed, document and accept (Schema is a boundary tool, not hot-path) — but documented threshold means we know early. |
| `Symbol.iterator` bridge has subtle interop bugs | M | M | Integration test in 4.2 covers cross-direction iteration; edge cases collected during beta. |
| Layer-2 `fs`/`process` wrappers fail on Windows path edge cases | M | L | Use `node:path` throughout; Windows CI matrix from Stage 0 catches; add specific Windows path fixtures. |
| Time API (`Instant`, `Duration` over `Date`) is criticised for not being Temporal | H | L | Documented v1.0 trade-off; Temporal is post-1.0 R&D track. |
| Coverage < 90 % on some module | M | L | CI gate at 90 %; add tests; do not ship below threshold. |
| Stdlib package naming (`@superjs/std-core` vs subpaths) confuses users | M | M | Resolved in Stage 0 README; document migration policy if we ever change. |
| **R3 — Compiler-version drift in stdlib packages** | M | M | `stdlib/COMPILER-COMPAT.md` policy + `peerDependencies` ranges + dual-version CI matrix; failure to comply is a release blocker. |
| Stdlib determinism gate fails (S3 extension) | L | H | Reuse the codegen lint rules (`no-unordered-iter`, banned `Date.now()` / `Math.random()`) applied to stdlib source. |

## API Contract

This stage produces:

1. **`@superjs/std-*` packages on npm** — exit-criteria list above; each declares `peerDependencies` on `@superjs/compiler` per R3; consumed by user code and by Stage 5 build plugins (which must resolve them when bundling).

2. **`Schema<T>` runtime API** — the documented bridge from `dynamic` to typed `T` per `stdlib/L2/json/SCHEMA.md` (M7). Consumed by user code and by `@superjs/interop`'s `fromJS<T>` (Stage 2). The Schema combinator surface, error shape, and `collect` semantics are semver-stable from v1.0.

3. **Bootstrap pipeline contract** — `superjs build --self-bootstrap` mode. Consumed by stdlib build script and by anyone porting stdlib to a new package. Documented in `stdlib/BOOTSTRAP.md`. Correctness invariant: downstream user-code output equals `--self-bootstrap` vs published-stdlib output (B3).

4. **`@superjs/runtime` integration** — Stage 1's `inspect` helper is consumed by stdlib's variant types (`Result`, `Option`, `Iterator`). Stage 5's build plugins must bundle `@superjs/runtime`.

5. **Stdlib doc-comment format** — consumed by Stage 6's API auto-generator. Format documented in `stdlib/STYLE.md`.

6. **`stdlib/COMPILER-COMPAT.md` policy (R3)** — semver bump policy + `peerDependencies` declaration pattern; consumed by every future stdlib release.

## Dependencies

- **Requires Stage 1:** `--self-bootstrap` mode in `@superjs/compiler`; module resolver; codegen for `Iterator<T>` `Symbol.iterator` bridge; `@superjs/runtime` package; `@superjs/jest-transform` stub for running stdlib tests (full transform ships in Stage 5).
- **Requires Stage 0:** `@superjs/compiler-types` for `SuperJSType` references in Schema types; CHANGELOG/SEMVER policy active for `compiler-types`.
- **Parallel with Stages 2 + 3** — none of those depend on stdlib outputs to start; Stage 3's playground only needs stdlib for full-fidelity tour examples (a placeholder works until Stage 4 completes).
- **Unlocks Stage 5** — `npm install @superjs/std-*` is part of the "set up a new SJS project" template; `@superjs/std/json` `Schema` is the canonical interop boundary recommended throughout Stage 5's plugin documentation; `superjs init <template>` templates (Stage 5 Sprint 5.1) seed stdlib imports.
- **Unlocks Stage 6** — tour lessons import from `@superjs/std-*`; API reference is generated from stdlib doc comments; beta-program `dynamic` survey (C5) considers stdlib boundary as a reference point.
