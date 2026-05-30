# Stage 4: Standard Library

## Goal
Ship the minimal v1.0 standard library — Layer-0 compiler-resident types, Layer-1 pure SJS modules, Layer-2 dependent modules — and the documented bootstrap pipeline that makes it possible to develop and publish a SJS-written stdlib using a TS-written compiler without circular dependencies.

The scope is **deliberately small**. Channels, CSP, Temporal, DOM, Web Streams, crypto, child_process, net, dgram, http server, EventEmitter, Intl: all post-1.0.

## Entry Criteria
- Stage 1 done. `@superjs/compiler` exposes `--self-bootstrap` mode (per `CompileOpts.selfBootstrap`).
- Stage 0 done. `@superjs/compiler-types` exports `SuperJSType` discriminator.
- Module resolver in Stage 1 honours both `@superjs/std/<sub>` (subpath imports) and `@superjs/std-<sub>` (separate packages); decision in `README.md` open question #4 stands — **many packages**, one per top-level subdirectory.
- Layer-0 built-in types are already embedded in the Stage 1 compiler binary; their *publish* as re-exports happens here.

## Exit Criteria (Done When)
- [ ] **Layer-0 built-ins** finalised and embedded in compiler: `Option<T>`, `Result<T,E>`, `Iterator<T>`, `IterResult<T>`, `Comparable<T>`, `Display`, `Eq<T>`, `Clone<T>`, `Hashable`, `panic`, `assert`, `todo`, `unreachable`.
- [ ] **Layer-1 modules** written in SJS, compiled with the Stage-1 compiler in `--self-bootstrap` mode, published to npm with `--provenance`:
  - `@superjs/std-core` (re-exports Layer-0 types from compiler built-ins; no runtime code beyond `panic`/`assert`)
  - `@superjs/std-collections` (`List<T>` + thin typed wrappers for `Map`/`Set`/`Queue`/`Stack`)
  - `@superjs/std-string` (`split`, `join`, `trim`, `lower`, `upper`, `replace`, `includes`, `startsWith`, `endsWith`, `parseInt`, `parseFloat`, `format`, typed `RegExp<Groups>`, `StringBuilder`)
  - `@superjs/std-math` (`abs`, `sign`, `min`, `max`, `clamp`, `lerp`, `round`, `floor`, `ceil`, `trunc`, `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `pow`, `PI`, `E`, `INFINITY`, `random`, `randomInt`)
  - `@superjs/std-async` (`sleep`, `timeout`, `all`, `allSettled`, `race`; `Task<T>` typed Promise alias; AbortSignal interop helpers)
- [ ] **Layer-2 modules** written in SJS, published to npm:
  - `@superjs/std-json` (`parse`, `parseAs<T>`, `stringify`, `Schema` builder per §6 of monolith)
  - `@superjs/std-fs` (Result-returning Node `fs` wrapper)
  - `@superjs/std-path` (`join`, `resolve`, `dirname`, `basename`, `extname`, `relative`, `isAbsolute`, `sep`)
  - `@superjs/std-process` (`argv`, `env`, `cwd`, `exit`, `platform`)
  - `@superjs/std-time` (`Instant`, `Duration`, `now`, `parseISO`, `toISO`)
- [ ] **Bootstrap pipeline** documented at `stdlib/BOOTSTRAP.md` and automated in CI:
  1. Build TS compiler (`npm run -w packages/compiler build`).
  2. Compile Layer-1 stdlib (`superjs build --self-bootstrap stdlib/L1/**/*.sjs`).
  3. Compile Layer-2 stdlib using L1 outputs (`superjs build --self-bootstrap stdlib/L2/**/*.sjs`).
  4. Pack and publish each `@superjs/std-*` package.
- [ ] **Bootstrap correctness test**: stage-1 compiler output of stdlib === stage-2 compiler output (using stage-1's published stdlib). Byte-identical or AST-identical. CI enforced.
- [ ] **Stdlib test coverage** ≥ 90 % line coverage on every package, measured via `c8`.
- [ ] **`Symbol.iterator` bridge** verified end-to-end: `for (const x of myList)` works on `@superjs/std-collections` `List<T>`; native JS `for (const x of jsArray)` works; mixed iteration works.
- [ ] **Reified `Schema<T>` builder** verified: `Schema.object({...})` produces a runtime value usable with `parseAs<T>` to safely cast `dynamic` to `T`. Test covers all combinators (`string`, `number`, `boolean`, `null_`, `object`, `array`, `union`, `optional`, `refine`).
- [ ] **Layer-0 / stdlib name parity**: every Layer-0 built-in is re-exported by `@superjs/std-core` under the same name. User code importing `import { Option } from "@superjs/std-core"` works; compiler resolves to the built-in.
- [ ] **API docs** auto-generated from doc comments (consumed by Stage 6); doc-comment style guide documented in `stdlib/STYLE.md`.

## Sprints

### Sprint 4.1 — Layer-0 finalisation + Layer-1 implementation (2 weeks)

**Deliverables:**
- Finalise Layer-0 type definitions inside `packages/compiler/src/builtins/lib.sjs.d.ts` (TS-declared because the compiler is TS). Includes:
  - `Option<T>`, `Result<T,E>`, `Iterator<T>`, `IterResult<T>`, `Comparable<T>`, `Display`, `Eq<T>`, `Clone<T>`, `Hashable`.
  - Built-in functions: `panic(msg): never`, `assert(cond, msg?)`, `todo(msg?)`, `unreachable(msg?)`.
- Layer-1 SJS source in `stdlib/L1/`:
  - `stdlib/L1/core/index.sjs` — re-exports Layer-0; ships `panic`/`assert` runtime helpers.
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
- [ ] Unit tests in `stdlib/L1/tests/` — written in SJS, run via Stage-5's Jest transform (so this depends on **a working Jest transform stub**; that stub ships in Stage 1's CLI scaffolding for early stdlib testing).
- [ ] Doc comments on every public export.
- [ ] CI step: `npm run build:stdlib:L1` and `npm run test:stdlib:L1`.

**Done signal:** All Layer-1 packages compile under `--self-bootstrap`; all Layer-1 unit tests pass; coverage ≥ 90 % across L1.

### Sprint 4.2 — Layer-2 implementation + Schema + iterator bridge verification (2 weeks)

**Deliverables:**
- Layer-2 SJS source in `stdlib/L2/`:
  - `stdlib/L2/json/index.sjs` — `parse(s): Result<dynamic, ParseError>`; `parseAs<T>(s, schema): Result<T, ParseError>`; `stringify(v, opts?)`; `Schema` builder combinators.
  - `stdlib/L2/fs/index.sjs` — `readFile`, `writeFile`, `readDir`, `stat`, `exists`; all Result-returning, all `Promise`-based. Imports `node:fs/promises` internally.
  - `stdlib/L2/path/index.sjs` — wraps `node:path`; `sep` is `"/"` on POSIX, `"\\"` on Windows.
  - `stdlib/L2/process/index.sjs` — wraps `node:process`; `env(name): Option<string>` returns `Some(value)` or `None`.
  - `stdlib/L2/time/index.sjs` — `Instant` wraps `Date`/`number-ms`; `Duration` wraps `number-ms`; `parseISO` returns `Result<Instant, ParseError>`.
- `Schema<T>` runtime-reified implementation:
  - `Schema.string()`, `Schema.number()`, `Schema.boolean()`, `Schema.null_()` — primitive schemas.
  - `Schema.object<T>({field: subschema, ...})` — object schema with structural check.
  - `Schema.array<T>(item)` — array schema.
  - `Schema.union<A, B>(a, b)` — tagged-union schema.
  - `Schema.optional<T>(t)` — `T | null` schema.
  - `Schema.refine<T>(s, pred, msg)` — adds runtime predicate.
- `Symbol.iterator` bridge verification: `attachIteratorSymbol` runtime helper inlined by Stage-1 codegen for all SJS classes implementing `Iterator<T>`; verified with test that `for (const x of List.from([1,2,3]))` works.

**Key tasks:**
- [ ] Write Layer-2 SJS source per package list.
- [ ] Implement `Schema` combinators in pure SJS (no runtime metaprogramming).
- [ ] Implement `parseAs<T>` as schema-driven walk of the dynamic input.
- [ ] L2 unit tests in `stdlib/L2/tests/` — covers Schema combinators, fs Result behaviour (mock fs), path edge cases (Windows backslash, relative resolution).
- [ ] Iterator bridge integration test (compiles a fixture using `List<T>` and iterates).
- [ ] CI step: `npm run build:stdlib:L2` and `npm run test:stdlib:L2`.

**Done signal:** All Layer-2 packages compile under `--self-bootstrap` using Layer-1 dist; Layer-2 tests pass; iterator-bridge test green; Schema round-trip test passes for a 50-field object.

### Sprint 4.3 — Bootstrap correctness + publish + docs (2 weeks)

**Deliverables:**
- **Stage-1 vs stage-2 byte-equality test** in CI:
  1. Build stdlib with Stage-1 compiler (TS-implemented).
  2. Republish stdlib locally as `@superjs/std-*@local`.
  3. Re-build the compiler's test corpus using the freshly published stdlib.
  4. Diff the outputs of (1) and (3): must be byte-identical for stdlib outputs themselves; AST-equivalent for downstream test corpus.
- All `@superjs/std-*` packages published to npm at `0.x` with `--provenance` via Changesets.
- Stdlib `STABILITY.md` documenting which symbols are `stable` / `beta` / `unstable` (per §11.6 of monolith). v1.0 stable surface = everything in the exit-criteria module list.
- Stdlib `STYLE.md` for doc-comment style; consumed by Stage-6's auto-API generator.
- `docs/stdlib/` index page generated from each package's doc comments.
- **Bootstrap-failure fallback documented**: if Sprint 4.3's correctness test fails close to launch, fallback is to ship Layer-0 only (compiler-resident) and re-export it as a TS-implemented `@superjs/std-core` for v1.0; user-facing API stays the same; SJS-implementation moves to v1.1. (This is Risk #8 from §17 of the monolith made concrete.)
- "First L0 + L1 + L2 of stdlib runs in playground" smoke (cross-checks Stage 3's playground): a tour-lesson fixture that uses `Result`, `Schema`, `List` runs in the playground without `dynamic`.

**Key tasks:**
- [ ] Implement byte-equality CI step.
- [ ] Configure Changesets for stdlib packages.
- [ ] First publish wave: all L1 + L2 packages at `0.1.0`.
- [ ] Author `STABILITY.md` and `STYLE.md`.
- [ ] Generate `docs/stdlib/` index.
- [ ] Verify playground integration with newly published stdlib (Stage 3's playground swaps in real stdlib bundle).
- [ ] Author bootstrap-failure fallback note in `stdlib/BOOTSTRAP.md`.

**Done signal:** All `@superjs/std-*` packages published; `npm install @superjs/std-core @superjs/std-collections` in a fresh project works; bootstrap byte-equality CI step green; playground tour lesson runs.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bootstrap circular dependency surfaces (compiler needs stdlib type, stdlib needs compiled stdlib) | M | H | Layer-0 in compiler binary breaks the cycle (per §2 of monolith); Sprint 4.1's `--self-bootstrap` test validates this; if breaks, ship Layer-0 only and TS-implemented stdlib alias (documented fallback). |
| Stage-1 vs stage-2 byte-equality fails (non-determinism in codegen) | M | H | Stage 1's determinism CI step catches most causes; if surfaces in 4.3, debug iteration counter / map ordering; treat as Stage-1 regression. |
| Schema runtime overhead is unacceptable (Zod-class performance issue) | M | M | Benchmark Schema parsing of 1k-field object; if > 5x JSON.parse, optimise; if can't optimise, document and accept (Schema is a boundary tool, not hot-path). |
| `Symbol.iterator` bridge has subtle interop bugs (e.g. mixing SJS List inside JS Array.from) | M | M | Integration test in 4.2 covers cross-direction iteration; edge cases collected during beta. |
| Layer-2 `fs`/`process` wrappers fail on Windows path edge cases | M | L | Use `node:path` throughout; Windows CI matrix from Stage 0 catches; add specific Windows path fixtures. |
| Time API (`Instant`, `Duration` over `Date`) is criticised for not being Temporal | H | L | Documented v1.0 trade-off; Temporal is post-1.0 R&D track. |
| Coverage < 90 % on some module | M | L | CI gate at 90 %; add tests; do not ship below threshold. |
| Stdlib package naming (`@superjs/std-core` vs subpaths) confuses users | M | M | Resolved in Stage 0 README; document migration policy if we ever change. |

## API Contract

This stage produces:

1. **`@superjs/std-*` packages on npm** — exit-criteria list above; consumed by user code and by Stage 5 build plugins (which must resolve them when bundling).

2. **`Schema<T>` runtime API** — the documented bridge from `dynamic` to typed `T`. Consumed by user code and by `@superjs/interop`'s `fromJS<T>` (Stage 2). The Schema combinator surface is semver-stable from v1.0.

3. **Bootstrap pipeline contract** — `superjs build --self-bootstrap` mode. Consumed by stdlib build script and by anyone porting stdlib to a new package. Documented in `stdlib/BOOTSTRAP.md`.

4. **`@superjs/runtime/inspect` integration** — Stage 3's `util.inspect.custom` helper for sum types; this stage's `Result`, `Option`, `Iterator` variants get the inspect symbol via the codegen helper. Stage 5's build plugins must bundle the helper.

5. **Stdlib doc-comment format** — consumed by Stage 6's API auto-generator. Format documented in `stdlib/STYLE.md`.

## Dependencies

- **Requires Stage 1:** `--self-bootstrap` mode in `@superjs/compiler`; module resolver; codegen for `Iterator<T>` `Symbol.iterator` bridge; Stage-1-stub `@superjs/jest-transform` for running stdlib tests (the full Jest transform with all matchers ships in Stage 5; stdlib only needs a minimal compile-`.sjs`-for-Jest path here).
- **Requires Stage 0:** `@superjs/compiler-types` for `SuperJSType` references in Schema types.
- **Parallel with Stages 2 + 3** — none of those depend on stdlib outputs to start; Stage 3's playground only needs stdlib for full-fidelity tour examples (a placeholder works until Stage 4 completes).
- **Unlocks Stage 5** — `npm install @superjs/std-*` is part of the "set up a new SJS project" template; `@superjs/std/json` `Schema` is the canonical interop boundary recommended throughout Stage 5's plugin documentation.
- **Unlocks Stage 6** — tour lessons import from `@superjs/std-*`; API reference is generated from stdlib doc comments.
