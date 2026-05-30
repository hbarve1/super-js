# Stage 1: Compiler Core

## Goal
Ship a Phase-2 compiler that lexes, parses, type-checks, and emits ES2022 + source maps for every SuperJS construct — replacing the prototype's Babel-backed pipeline entirely — and expose a **stable in-process and async API** (frozen at Sprint 1.6) the LSP, formatter, linter, build plugins, test transforms, and interop translator can build on. Also ship the **`@superjs/runtime`** package (`inspect`, `attachIteratorSymbol`, sum-type helpers) that downstream stages depend on, and run a **hard determinism gate** on compiler output at the end of the stage.

Round-3 changes vs round-2 plan: `transform()` async API added (B1); `@superjs/runtime` published as semver-stable package (B4); `parseTypeDecl`/`emitTypeDecl` validated via a 200-fixture round-trip corpus (B5); per-phase perf targets set in Sprint 1.1 (S6); pnpm-workspace resolver test in Sprint 1.4 (S4); hard determinism gate at end of Sprint 1.6 for compiler output (S3); async stack-trace fidelity in exit criteria (T4); `algorithm.md` covers structural extensions (M1); cache key drops mtime, adds config-hash (M3); `apiHash`/`docHash` spec published (M4); source-map fidelity score defined (M5); BiDi-codepoint rejection in lexer (C9); `superjs migrate from-prototype` stub (C2); spec text authored per-feature, not deferred (B8); solo-path decision gate A at end of stage (S2).

## Entry Criteria
- Stage 0 done. `@superjs/compiler-types`, `spec/grammar.ebnf`, `spec/error-codes.md`, `spec/diagnostics.schema.json`, `spec/config-schema.json` (with `language` placeholder and `extends`), `spec/parser-recovery.md`, `docs/security/threat-model.md`, RFCs 0001–0005 are all published / committed and CI-validated.
- Prototype's type checker and codegen exist as a reference; their test corpus exists in `prototype/tests/`.
- CI matrix green on three OSes; nightly Node 24-dev job exists (non-blocking).

## Exit Criteria (Done When)
- [ ] `packages/compiler/` builds; `superjs build src/**/*.sjs` compiles via the new pipeline end-to-end (lex → parse → check → codegen) with **no Babel dependency**.
- [ ] Hand-written lexer covers every token in `spec/grammar.ebnf`; produces `SourceSpan` for every token; error-recovery never throws; **BiDi-spoofing codepoints (U+202A–U+202E, U+2066–U+2069) emit `SJS-W012` and are stripped from identifiers in default mode; rejection-mode opt-in via `--strict-bidi` (C9)**.
- [ ] Recursive-descent / Pratt parser covers every production in `spec/grammar.ebnf` and implements the sync-sets in `spec/parser-recovery.md`; passes 100 % of the prototype-derived parser fixtures plus 2,000 new fixtures (including 500 negative tests).
- [ ] Parser recovery passes the golden-recovery test suite (`tests/fixtures/parser-recovery/`): for every input, the *sequence* of emitted error codes matches expected, per `spec/parser-recovery.md` phrase-vs-panic distinction.
- [ ] Bidirectional type checker (Dunfield-Krishnaswami algorithm with structural-subtyping extensions) passes the full prototype checker test corpus plus new fixtures for cross-file inference, narrowing, exhaustiveness, structural interfaces, and generics. **`packages/compiler/src/checker/algorithm.md` includes formal rules for `Sub-Object-Width`, `Sub-Object-Depth`, generic variance (invariant default; declared-site `+T` covariant / `-T` contravariant per RFC-0002 deferred to v1.1 — at v1.0 invariant only), and nullable refinement, each with one worked example (M1).**
- [ ] Cross-file inference works: a function imported from another module is checked against its declared signature; type errors at call sites surface with the correct span.
- [ ] Codegen emits ES2022; source maps v3 with `names`; both default (`{ _tag, _0 }`) and `classes` variant representations supported.
- [ ] **Source-map fidelity score ≥ 0.85 average** on the 100-frame corpus per `spec/source-map-fidelity.md` (M5). Score formula: `(correct line) + 0.5×(correct col) + 0.3×(names present)`, normalised by frame count. **Async stack-trace fidelity (T4): a test in `tests/fixtures/async-stack/` throws an error across three `await` boundaries; resulting Node `--enable-source-maps` stack shows three distinct `.sjs` frames with correct file + line.**
- [ ] Incremental compilation: file-dependency graph + `apiHash` / `docHash` per module per **`packages/compiler/src/cache/hashing.md` (M4)**; warm rebuild on single-file change ≤ 100 ms on a 10k-LOC fixture.
- [ ] Build is deterministic: cache key = `(file SHA-256, compiler version, config-hash)` per `cache/hashing.md` (M3 — **mtime dropped**); config-hash covers variant mode, source-map mode, JSX runtime, env-allowlist, `"language"` placeholder, `extends`-resolved paths. `(input set, compiler version, config-hash, env-allowlist)` → byte-identical output and source map. **HARD GATE at end of Sprint 1.6** (S3): CI rejects the merge of Sprint 1.6 if two consecutive builds of any fixture in `tests/fixtures/codegen/` differ. Stage 4 extends this to stdlib; Stage 5 extends to plugins.
- [ ] Compile-error UX: `picocolors`-rendered spans, multi-error grouping, per-file cap 50 / per-build cap 500, JSON output via `--format json|ndjson` validating against `spec/diagnostics.schema.json`.
- [ ] `superjs explain SJS-EXXX` prints the relevant `spec/error-codes/SJS-EXXX.md` content.
- [ ] CLI subcommands shipped: `build`, `check`, `format` (stub — full formatter in Stage 3), `init`, `explain`, **`migrate from-prototype` (stub — full impl Stage 6 Sprint 6.1, C2)**, **`add <pkg>` (stub — full impl Stage 2 Sprint 2.1, B6)**. (`lint`, `lsp`, `doctor`, `test`, `repl`, `verify` stubbed for later stages.)
- [ ] `typeAt(file, line, col): SuperJSType | null` API exposed and tested.
- [ ] **`transform(source, filename, opts): Promise<{ code, map, diagnostics }>` async API exposed (B1)** — single-file in-memory transform for Jest/Vitest transforms, Vite plugin, esbuild plugin. Source map composes with caller's bundler maps via standard sourcemap v3 chain.
- [ ] **`packages/runtime/` published as `@superjs/runtime@0.x` with semver-stable surface (B4)**: `attachIteratorSymbol(ctor)`, `inspect` helper (registers `Symbol.for('nodejs.util.inspect.custom')` for `_tag`-shaped variant literals), `panic`/`assert`/`todo`/`unreachable` runtime forms (Layer-0 runtime backing). Documented in `packages/runtime/README.md`; `packages/runtime/SEMVER.md` policy mirrors `compiler-types`.
- [ ] **Per-phase performance targets met (S6)** per `bench/per-phase-targets.md`:
  - Lexer ≥ 500k tokens/sec (cold, single-thread).
  - Parser ≥ 200k AST-nodes/sec.
  - Checker ≥ 50k constraints/sec.
  - Codegen ≥ 100k AST-nodes/sec.
  - Aggregate cold compile 10k LOC ≤ 2 s.
  CI enforces per-sprint regression: soft-fail at +10 %, hard-fail at +25 %, on every sprint's done-signal PR (not just Sprint 1.6).
- [ ] Compiler crash handler: top-level `try`/`catch` writes `.superjs/crash-YYYYMMDD-HHMMSS.log` (basenames-only by default per R4); prints prefilled GitHub-issue URL.
- [ ] Prototype Babel backend deprecated (kept in `prototype/` only); `prototype/src/cli.ts` flagged with "use packages/compiler" deprecation warning.
- [ ] Cold compile of 10k-LOC fixture ≤ 2 s median on 4-core M-series / x86_64. Recorded in benchmark dashboard.
- [ ] **Spec text authored per feature (B8)**: every Stage-1 feature PR includes its `spec/language.md/` section under `spec/language.md/` directory (assembled in Stage 6 Sprint 6.1). PR template gains a "spec section updated" checkbox; CI rejects feature PRs to `packages/compiler/src/` that don't touch `spec/language.md/`.
- [ ] **Solo-path decision gate A invoked (S2)**: at end of Sprint 1.6, maintainer publishes a roadmap-update post declaring either (a) co-maintainers committed, full parallel plan continues, or (b) solo path engaged with documented Tier-2-to-Tier-3 cuts per README "Solo-Path Decision Gates" section.

## Sprints

### Sprint 1.1 — Lexer (BiDi-safe) + per-phase perf targets published (2 weeks)

**Deliverables:**
- `packages/compiler/src/lexer/` — hand-written lexer; one `Token` per call to `nextToken()`; produces `SourceSpan` per token.
- Token kinds: all keywords (per `spec/grammar.ebnf`), all punctuation, identifiers (Unicode-aware via `\p{ID_Start}` / `\p{ID_Continue}`), numeric literals (int / float / bigint), string literals (single/double/template), regex literals, JSX-bracket tokens (parser-driven, lexer cooperates via context flag), comments (line, block, doc).
- Error tokens: lexer never throws; on invalid byte sequences, emits `SJS-L001..L010` tokens with span and continues.
- Tab expansion + UTF-8 width handled (via `string-width`) for diagnostic rendering.
- Line-ending normalisation: CRLF → LF internally; tracked in span byte offsets so output preserves source bytes.
- **BiDi-spoofing rejection (C9):** codepoints U+202A–U+202E and U+2066–U+2069 emit `SJS-W012: bidi-codepoint-in-source` warning; in `--strict-bidi` mode (off by default, on in `superjs build --release`), emit `SJS-L011: bidi-codepoint-rejected` error. Inside string literals: warning + comment in diagnostic ("use `‮` escape if intentional"). Inside identifiers: always rejected even without `--strict-bidi`.
- **`bench/per-phase-targets.md` published (S6)** documenting the per-phase numbers in exit criteria; CI bench job for the lexer hits ≥ 500k tokens/sec baseline by end of sprint.
- **Spec contribution (B8):** `spec/language.md/lexical.md` — token grammar prose with examples, including BiDi handling.

**Key tasks:**
- [ ] Token-kind enum and `Token` interface in `packages/compiler/src/lexer/token.ts`.
- [ ] State-machine lexer in `packages/compiler/src/lexer/lex.ts`.
- [ ] Unicode identifier handling via `unicode-properties` or hand-rolled `RegExp(/\p{ID_Start}/u)`.
- [ ] Template literal lexing with `${…}` interpolation modes (push/pop lexer state).
- [ ] JSX cooperation: lexer exposes `enterJSXMode()` / `exitJSXMode()` called by the parser.
- [ ] Comments preserved as `Trivia` attached to the next token (formatter consumes this in Stage 3).
- [ ] BiDi-codepoint detection + `SJS-W012` / `SJS-L011` emission.
- [ ] 1,000 lexer golden tests in `tests/fixtures/lexer/`, including 50 BiDi-spoofing negative fixtures (the WebKit/Trojan-Source corpus adapted).
- [ ] Author `bench/per-phase-targets.md`.
- [ ] Wire CI bench job for the lexer with soft/hard regression thresholds.
- [ ] Author `spec/language.md/lexical.md`.

**Done signal:** Lexer round-trips every `prototype/examples/**/*.sjs` byte-for-byte (modulo trivia) and every fixture's `expected-tokens.json` matches; BiDi-corpus fixtures emit `SJS-W012`/`SJS-L011` as expected; lexer benchmark ≥ 500k tokens/sec.

### Sprint 1.2 — Parser + recovery (2 weeks)

**Deliverables:**
- `packages/compiler/src/parser/` — recursive-descent + Pratt-expression parser.
- AST per `@superjs/compiler-types` `AstNode` shape; every node carries `SourceSpan`; visitor pattern (`walk`, `traverse`) in `packages/compiler/src/ast/`.
- Error recovery **per `spec/parser-recovery.md`** (M2): panic-mode at item/statement boundaries, phrase-level inside expressions/types/patterns, error productions for common typos (`SJS-P001..P005`), recovery streak counter with `SJS-P099` after 3 failed recoveries.
- 2,000 parser fixtures (1,500 positive + 500 negative with expected error sequences in `errors.txt`).
- `tests/fixtures/parser-recovery/` — each negative test asserts the *sequence* of error codes (not just final AST), proving recovery suppresses phantom errors.
- Parser benchmark integrated into per-sprint regression CI (target ≥ 200k AST-nodes/sec).
- **Spec contribution (B8):** `spec/language.md/syntax.md` — concrete-syntax tree per production, cross-referencing `spec/grammar.ebnf` and `spec/parser-recovery.md`.

**Key tasks:**
- [ ] Item parsers (`parseImport`, `parseExport`, `parseFunction`, `parseClass`, `parseInterface`, `parseType`, `parseLet`, `parseConst`).
- [ ] Statement parsers (`parseIf`, `parseWhile`, `parseFor`, `parseMatch`, `parseReturn`, `parseExprStmt`).
- [ ] Expression parser (Pratt): identifiers, calls, members, indexers, generic instantiation, arrow functions, object literals, array literals, JSX, template literals, `try` expression.
- [ ] Type-expression parser: primitives, named refs, generics, unions, tuples, function types, object types, `T?`, variant types.
- [ ] Pattern parser for `match`: literal, identifier, variant, object destructure, array destructure, wildcard, guards.
- [ ] Recovery state machine per `spec/parser-recovery.md`.
- [ ] Error productions for `SJS-P001..P005`.
- [ ] `SJS-P099` recovery-streak suppression after 3 consecutive failures.
- [ ] Visitor + traversal API in `packages/compiler/src/ast/walk.ts`.
- [ ] Parser benchmark wired to per-sprint CI gate.
- [ ] Author `spec/language.md/syntax.md`.

**Done signal:** Parser accepts every prototype fixture; 500 negative-fixture recovery sequences match expected; zero phantom-error reports across the corpus; parser benchmark ≥ 200k AST-nodes/sec.

### Sprint 1.3 — Type checker port + bidirectional algorithm (2 weeks)

**Deliverables:**
- `packages/compiler/src/checker/` — port of the prototype's type checker to the new AST.
- Bidirectional algorithm: `synth(Γ, e): SuperJSType` and `check(Γ, e, T): void` per Dunfield-Krishnaswami 2013, adapted for structural object types.
- **`packages/compiler/src/checker/algorithm.md` (M1)** — formal rules with one worked example per rule:
  - Base rules: `Var`, `Sub`, `Anno`, `→I`, `→E`, `→I⇒`, `MatchE`, `Variant`.
  - **Structural extensions (M1):** `Sub-Object-Width` (object subtype may add fields), `Sub-Object-Depth` (field types subtype pointwise), `Sub-Func` (return covariant, params contravariant), `Sub-Generic` (invariant at v1.0; declared-site variance reserved for post-1.0 per RFC), `Sub-Null` (`T <: T?`, `null <: T?`).
  - **Nullable refinement rule:** narrowing `if (x == null) return; …` removes `null` from `T?` in the else branch; algorithmic justification documented.
- Annotation enforcement: exported function params/returns, exported `let`/`const`, exported class fields require annotations; locals may be inferred.
- Narrowing: flow-sensitive on `if (x == null) return; …`, on match arms, on `typeof` for `dynamic`, on `instanceof` for classes.
- Subtyping: structural for objects/interfaces; nominal for classes/variants; `T <: T?`; `null <: T?`; covariant return / contravariant params; invariant generics.
- Match exhaustiveness: per arm, narrow discriminant by subtracting matched pattern; residual `never` after all arms means complete; non-`never` residual → `SJS-E007`; redundant arm → `SJS-W003`; guarded arms require unguarded fallback.
- Checker benchmark wired (target ≥ 50k constraints/sec).
- **Spec contribution (B8):** `spec/language.md/type-system.md` — narrative reference for the algorithm, cross-referencing `algorithm.md` rules and `spec/error-codes.md`.

**Key tasks:**
- [ ] Implement `Γ` (typing context) as a persistent map keyed by symbol id.
- [ ] Implement `synth` and `check` mutually recursive.
- [ ] Implement subtyping `<:` with memoised structural compare (cycle-safe via `WeakSet<[A, B]>`).
- [ ] Implement narrowing engine on top of the AST visitor.
- [ ] Implement match exhaustiveness with pattern subtraction.
- [ ] Port prototype's negative tests; assert error codes match `spec/error-codes.md`.
- [ ] Author `algorithm.md` with all rules (incl. structural extensions M1) and worked examples.
- [ ] Author `spec/language.md/type-system.md`.

**Done signal:** Type checker passes the entire prototype test corpus, plus 200 new bidirectional / narrowing / exhaustiveness fixtures; `algorithm.md` includes worked examples for every rule including the four structural extensions.

### Sprint 1.4 — Cross-file inference + codegen + source maps + pnpm-workspace resolver test (2 weeks)

**Deliverables:**
- Import resolver: file-based + `node_modules` resolution per Node ESM rules; honours `superjs.config.json` `paths` aliases and **resolves `extends` clauses (M9)** — when `superjs.config.json` includes `"extends": "tsconfig.json"`, `paths` is merged with extended-file `paths` (this-file wins on conflict).
- **pnpm-workspace acceptance test (S4):** `tests/fixtures/resolver/pnpm-workspace/` is a 5-workspace fixture using pnpm's `node_modules/.pnpm/` flat-store layout; resolver navigates it correctly; cross-workspace `.sjs` imports type-check. CI gate. (Stage 5 Sprint 5.3 = docs + edge cases only; the foundational behaviour ships here.) Yarn-Berry PnP and npm workspaces also smoke-tested.
- Module-type cache; cross-file `synth` resolves through cached module exports.
- Codegen: `packages/compiler/src/codegen/` emits ES2022; sum types compile per `output.variants` config (`default` = inlined `{ _tag, _0 }`, `classes` = one class per variant); pattern matching compiles to `if (x._tag === "Ok") …` chains in default mode, `if (x instanceof Ok) …` in classes mode.
- Source maps v3 with `names` field; per-AST-node mappings (not per-token).
- **Source-map fidelity spec at `spec/source-map-fidelity.md` (M5)** — formula `score = (correct line) + 0.5×(correct col) + 0.3×(names present)`; average over 100-frame corpus including 30 async frames; threshold ≥ 0.85; CI step `npm run check:sourcemap-fidelity`.
- `--debug` (default in watch mode): skip optimisations; high-fidelity maps.
- `--release`: constant folding, DCE, switchify, inline; best-effort maps with `names` reference back to original symbols.
- `[Symbol.iterator]` bridge per §6 / §12.11 of monolith: SJS user types implementing `Iterator<T>` get the symbol auto-attached via **`@superjs/runtime`'s `attachIteratorSymbol(ctor)` (B4)** inlined at class definition.
- Codegen benchmark wired (target ≥ 100k AST-nodes/sec).
- **Spec contribution (B8):** `spec/language.md/codegen-semantics.md` — observable semantics of emitted JS (sum-type representation choice; iterator bridge; source-map guarantees).

**Key tasks:**
- [ ] Module resolver in `packages/compiler/src/resolver/`.
- [ ] `extends` clause resolution + `paths` merge logic (M9).
- [ ] pnpm-workspace fixture + CI test (S4); npm and yarn smoke tests.
- [ ] Module-type cache keyed on resolved file path.
- [ ] Codegen for every AST node; both variant modes.
- [ ] Source-map builder using `source-map` npm package (vetted).
- [ ] `attachIteratorSymbol` import-and-call site emitted by codegen for SJS `Iterator<T>` classes (helper itself lives in `@superjs/runtime`, sprint 1.5 publishes the package).
- [ ] Author `spec/source-map-fidelity.md` (M5); build 100-frame corpus including 30 async-await frames.
- [ ] CI step `check:sourcemap-fidelity`.
- [ ] 500 codegen golden fixtures (`.sjs` → `.js` + `.js.map`).
- [ ] Determinism CI step on codegen corpus: build twice, `diff -r` (this is the precursor to the hard gate at 1.6).
- [ ] Author `spec/language.md/codegen-semantics.md`.

**Done signal:** A 50-file fixture project compiles end-to-end; emitted JS runs correctly under Node 22; source maps make `node --enable-source-maps` print original `.sjs` filenames in stack traces; pnpm-workspace fixture resolves cross-workspace `.sjs` imports; source-map fidelity score ≥ 0.85 on the 100-frame corpus.

### Sprint 1.5 — Incremental + watch + CLI + error UX + `@superjs/runtime` + `transform()` + Jest transform stub + migrate-from-prototype stub (2 weeks)

**Deliverables:**
- Incremental compilation: file-dependency graph; per-module `apiHash` (re-checks downstream importers) and `docHash` (invalidates LSP doc caches only). **Algorithm spec at `packages/compiler/src/cache/hashing.md` (M4)**: `apiHash` = SHA-256 of (sorted export list × normalised type-printer output); `docHash` = SHA-256 of (concatenated doc comments + JSDoc tags); fuzz test in CI mutates exported signatures and asserts correct downstream invalidation, mutates non-exported internals and asserts no false-positive invalidation.
- Persistent cache on disk at `.superjs/cache/` **keyed on `(file SHA-256, compiler version, config-hash)` (M3)** — mtime dropped (unreliable on NFS / git checkouts). `config-hash` = SHA-256 of canonicalised JSON of `(variants, sourceMap, jsx.runtime, env.allowlist, language, resolved paths after extends)`.
- Watch mode: `superjs build --watch` using `chokidar`; warm rebuild on single-file change ≤ 100 ms on 10k-LOC fixture.
- CLI subcommands shipped (Stage-1 surface): `build`, `check`, `format` (stub), `init`, `explain`, **`add <pkg>` (stub — prints "implemented in Stage 2; tracking-issue link", B6)**, **`migrate from-prototype <dir>` (stub — prints "implemented in Stage 6; will rewrite `prototype/src` to `packages/compiler/src` directory layout + import paths", C2)**. Each documented in `docs/cli/`.
- Error rendering: `packages/compiler/src/diagnostics/render.ts` with `picocolors` + `string-width`; multi-error grouping; per-file/per-build caps; `--format json|ndjson` produces schema-compliant output.
- `superjs explain SJS-EXXX`: looks up `spec/error-codes/SJS-EXXX.md` and prints rendered.
- Crash handler: top-level `try`/`catch`; writes `.superjs/crash-*.log` (basenames-only per R4); prints prefilled issue URL.
- Prototype CLI marked deprecated: `prototype/src/cli.ts` prints `[DEPRECATED] use packages/compiler`.
- **`@superjs/runtime` package published (B4)** at `packages/runtime/`:
  - `attachIteratorSymbol(ctor)` — attaches `Symbol.iterator` (or registers `[Symbol.iterator]` getter) on user `Iterator<T>` classes.
  - `inspect` — sets `Symbol.for('nodejs.util.inspect.custom')` on sum-type prototypes so `console.log(Ok(42))` prints `Ok(42)` (consumed by Stage 3 DAP — was previously called `@superjs/runtime/inspect` and unowned).
  - `panic`, `assert`, `todo`, `unreachable` — Layer-0 runtime forms; Layer-1 `@superjs/std-core` re-exports them (Stage 4).
  - `SEMVER.md` policy: additive non-breaking → minor; signature change → major; every PR documents bump category.
  - Published `0.1.0-alpha.0`; freeze at Sprint 1.6 mirrors the compiler API freeze.
- **`transform(source, filename, opts): Promise<{ code, map, diagnostics }>` async API (B1)** exposed from `packages/compiler/src/api.ts`. Implementation: single-file in-memory compile that does **not** persist cache, returns the same diagnostics shape as `compile()`. Used by Jest/Vitest transforms (Sprint 5.2), Vite plugin (Sprint 5.1), and the **Jest-transform stub** below.
- **Jest-transform stub (B1)** at `packages/jest-transform/`: minimal `Transformer` that calls `transform()` and returns `{ code, map }`. Required to test Stage 4 stdlib in Sprint 4.1 (which writes tests in `.sjs`). The full `@superjs/jest-transform` with snapshot support ships in Sprint 5.2; this is the minimum viable stub published as `0.0.x` (pre-1.0; users are warned in README it'll be replaced).
- **Spec contribution (B8):** `spec/language.md/cli-surface.md` first draft (full text Stage 6 Sprint 6.1).

**Key tasks:**
- [ ] Module graph + SCC for circular-import detection (§12.1: type-only allowed, value cycles → `SJS-W005` / `SJS-E021`).
- [ ] `apiHash` / `docHash` per `cache/hashing.md` (M4); author the spec doc; author fuzz test.
- [ ] Cache layer with file-locking for concurrent CLI invocations.
- [ ] Drop mtime from cache key; verify on NFS-mounted fixture.
- [ ] `chokidar`-based watcher.
- [ ] Diagnostic rendering with per-error grouping (poisoned-symbol suppression).
- [ ] CLI argument parsing via `cac` or built-in (no `commander` runtime dep at v1.0).
- [ ] `superjs explain` lookup table.
- [ ] `superjs add` stub (B6); `superjs migrate from-prototype` stub (C2).
- [ ] Crash report writer with basename redaction by default; `--crash-full` opt-in.
- [ ] Benchmark: cold + warm timings on 1k / 10k / 100k LOC fixtures; recorded vs Stage-0 baseline; per-phase regression gates active.
- [ ] Implement and publish `packages/runtime/`; author `packages/runtime/SEMVER.md`.
- [ ] Implement `transform()` async API.
- [ ] Implement `packages/jest-transform/` stub.
- [ ] Author `spec/language.md/cli-surface.md`.

**Done signal:** `superjs build --watch` on a 10k-LOC fixture rebuilds in < 100 ms; `superjs build --format json src/foo.sjs` emits valid diagnostic JSON; `superjs explain SJS-E001` prints content from `spec/error-codes/SJS-E001.md`; `@superjs/runtime@0.1.0-alpha.0` and `@superjs/jest-transform@0.0.x` are publishable (npm dry-run); `transform()` API round-trips a single-file fixture; cache invalidation fuzz passes.

### Sprint 1.6 — `typeAt` / `transform` freeze + parseTypeDecl round-trip corpus + self-hosting smoke + hard determinism gate + Babel retirement + solo-path decision gate A (2 weeks)

**Deliverables:**
- Public API: `packages/compiler/src/api.ts` exports `compile`, `transform`, `typeAt`, `symbolAt`, `diagnosticsFor`, `parseTypeDecl`, `emitTypeDecl`. **Frozen at end of sprint** (semver-stable from this point; Stages 2/3/4/5 depend on this surface).
- API consumed by an internal smoke test that mimics what Stage 3 LSP will do (open a file, hover at 100 positions, assert types) and what Stage 5 Jest transform will do (call `transform()` on 50 fixtures).
- **`parseTypeDecl` / `emitTypeDecl` round-trip corpus (B5)** at `tests/fixtures/typedecl-roundtrip/`: ≥ 200 fixtures across categories — generics with constraints (40), unions and intersections (30), nullable variants (20), variant types with payload (30), function signatures (30), object types with optional fields (20), nested generics (15), recursive types (15). For each fixture: `parseTypeDecl(input) → ast → emitTypeDecl(ast) → output`; assert `parseTypeDecl(output)` produces an AST equal to the first. CI gate before API freeze. This validates the surface Stage 2's translator depends on.
- Self-hosting smoke: the compiler compiles the prototype's test suite of `.sjs` files using only the Stage-1 pipeline; output runs and produces identical test results to the prototype's Babel pipeline.
- Babel backend deleted from the build graph; `prototype/src/compiler/` left in place as legacy reference but excluded from `packages/`'s build.
- API documentation lives in `packages/compiler/README.md` and is semver-stable from this point — Stages 2, 3, 4, 5 depend on it. `packages/runtime/README.md` likewise.
- Final Stage-1 benchmarks: cold compile 10k LOC ≤ 2 s recorded; CI gate added (soft fail at +10 %, hard fail at +25 %).
- **HARD DETERMINISM GATE (S3)** at end of sprint:
  - CI step `check:determinism:compiler` builds every fixture under `tests/fixtures/codegen/` twice, with cold cache and warm cache, and `diff -r`s every output file (`.js`, `.js.map`, emitted `.d.sjs`).
  - Any byte-level diff fails the merge — no exceptions, no opt-out.
  - Three known causes of non-determinism are pre-emptively guarded: Map/Set iteration order (lint rule `codegen/no-unordered-iter` introduced in Sprint 1.4 enforces deterministic alternatives in codegen modules), `Date.now()` use (banned in codegen via lint), and `Math.random()` (banned in codegen via lint).
  - Stage 4 extends this gate to stdlib; Stage 5 extends to plugins.
- **Async stack-trace fidelity test (T4):** `tests/fixtures/async-stack/three-await.sjs` throws inside three nested `await` boundaries; runs the compiled output under `node --enable-source-maps`; asserts the captured stack contains three `.sjs:line` frames with correct file basenames and line numbers. CI gate.
- **Spec contribution (B8):** `spec/language.md/incremental-model.md` describing `apiHash` / `docHash` / cache invariants.
- **Solo-path decision gate A (S2):** maintainer authors `docs/blog/2026-XX-XX-stage-1-complete.md` posting one of:
  - "Co-maintainer X committed for Stage 2; co-maintainer Y for Stage 3 — parallel plan continues."
  - "Solo path engaged; Tier-2 items LSP M2 / REPL / Prisma codegen / snapshot-testing / compat-matrix-HTML moved to Tier 3; calendar revised to 56 weeks."
  - "Partial parallel: co-maintainer X owns Stage [2|4]; calendar revised to 44 weeks." PR merging this post is the gate; Stage 2 / 3 / 4 sprints cannot start until merged.

**Key tasks:**
- [ ] `typeAt` traversal: walk AST to find smallest enclosing typed node at the coordinates.
- [ ] `symbolAt` for go-to-definition support.
- [ ] `diagnosticsFor(file)` returns cached diagnostics; recomputes if dirty.
- [ ] Build `tests/fixtures/typedecl-roundtrip/` 200-fixture corpus (B5); wire `roundtrip` CI step.
- [ ] Internal "LSP smoke" test in `tests/lsp-smoke/`.
- [ ] Internal "Transform smoke" test in `tests/transform-smoke/`.
- [ ] Wire prototype test corpus through new pipeline; assert green.
- [ ] Remove Babel dependency from `packages/compiler/package.json`.
- [ ] Update CI: prototype is no longer the source of truth for codegen; `packages/compiler/` is.
- [ ] Performance pass: profile cold compile; cut allocations in hot paths; record numbers.
- [ ] Implement `check:determinism:compiler` CI gate; verify three causes of non-determinism are linted out.
- [ ] Implement async-stack-trace fidelity test (T4).
- [ ] Author `spec/language.md/incremental-model.md`.
- [ ] Author and merge `docs/blog/...-stage-1-complete.md` (solo-path decision gate A, S2).
- [ ] Freeze `packages/runtime/` semver at `0.1.0` (no longer alpha); freeze `packages/jest-transform/` stub at `0.0.x` until Stage 5 promotes it.

**Done signal:** `packages/compiler/` is the only compiler in CI; prototype CLI prints deprecation; `typeAt` smoke test passes on 100 hover positions across 10 fixtures; `transform` smoke test passes on 50 fixtures; 200-fixture `typedecl-roundtrip` corpus green; cold 10k-LOC build ≤ 2 s on the CI bench runner; **`check:determinism:compiler` green**; async-stack-trace test green; solo-path decision gate A blog post merged.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Parser recovery design takes longer than 2 weeks (sprint 1.2 slip) | H | H | Recovery is split: panic-mode in 1.2, polishing of error productions in 1.5; if 1.2 slips, defer error productions to 1.5. |
| Cross-file inference (sprint 1.4) reveals subtle module-resolution edge cases | M | H | Time-box to 1.4; pnpm-workspace fixture catches the worst (S4); if not done, fall back to "annotation required at module boundaries" — degraded UX but ships. |
| Source-map fidelity bugs under Vite bundling | M | M | Smoke test with a Vite+SJS fixture in 1.4; fidelity score gate at 0.85 (M5); if score below, ship best-effort and file v1.1 issue. |
| Cache invalidation bugs in sprint 1.5 (warm rebuild emits stale output) | M | H | `cache/hashing.md` fuzz test (M4); sprint includes 2 days of cache-bug bash. |
| Cold compile fails to hit ≤ 2 s on 10k LOC | M | H | Per-phase targets in Sprint 1.1 (S6) catch regressions earlier; if still missed in 1.6, slip Stage 1 by 1 sprint rather than ship a slow compiler. |
| Bidirectional algorithm produces type errors that disagree with prototype | M | M | Diff-test new checker vs prototype on the whole corpus in 1.3; any regression must be traceable to a documented soundness fix or held as a bug. |
| Determinism check fails due to unordered map iteration in codegen | L | M | Pre-emptive lint rule `codegen/no-unordered-iter` from 1.4; hard determinism gate at 1.6 catches escapes (S3). |
| `parseTypeDecl`/`emitTypeDecl` round-trip corpus uncovers gaps that delay Stage 2 | M | H | Built in Sprint 1.6 *before* API freeze (B5); if gaps surface, fix or document the unsupported subset — Stage 2 can plan around documented limits but not surprise gaps. |
| `@superjs/runtime` design surface insufficient for Stage 4 stdlib needs | L | H | Stage 4 design-review of runtime surface at end of Sprint 1.5; any addition lands in 1.6 before freeze. |
| `transform()` API insufficient for Stage 5 Jest/Vite/esbuild | L | H | Stage 5 design-review of `transform()` at end of Sprint 1.5; any addition lands in 1.6 before freeze. |
| Async stack-trace fidelity test fails (T4) due to V8 internal stack frames | L | M | Use `Error.captureStackTrace` + frame-filter helper; if V8 surfaces internal frames, document the noise and assert presence (not exact equality) of three `.sjs` frames. |
| R4 — crash log data leak | M | M | Basenames-only redaction default in Sprint 1.5; `--crash-full` opt-in only; SECURITY.md covers this (lands in Stage 0). |
| Solo-path decision at gate A made too late (post-Sprint 1.6) | L | XL | Gate is the PR merge of the blog post; Stage 2/3/4 sprints cannot start until merged. Forces the decision. |

## API Contract

This stage publishes the **`@superjs/compiler` package API** and the **`@superjs/runtime` package** that Stages 2, 3, 4, 5 depend on. Semver-stable from the Sprint-1.6 freeze.

```ts
// packages/compiler/src/api.ts
export interface CompileResult {
  outputs: Map<string, { code: string; map: SourceMap }>;
  diagnostics: Diagnostic[];
}

export function compile(sources: SourceFile[], opts: CompileOpts): Promise<CompileResult>;

// Single-file async transform — used by Jest, Vitest, Vite, esbuild plugins (B1).
export function transform(
  source: string,
  filename: string,
  opts?: TransformOpts
): Promise<{ code: string; map: SourceMap; diagnostics: Diagnostic[] }>;

// Stage 3 LSP depends on these three:
export function typeAt(file: string, line: number, col: number): SuperJSType | null;
export function symbolAt(file: string, line: number, col: number): Symbol | null;
export function diagnosticsFor(file: string): Diagnostic[];

// Stage 2 interop translator depends on (validated via 200-fixture round-trip corpus, B5):
export function parseTypeDecl(source: string): TypeDecl;
export function emitTypeDecl(decl: TypeDecl): string;

// Stage 4 stdlib bootstrap depends on:
export interface CompileOpts {
  selfBootstrap?: boolean; // Layer-0 types are built-in; do not resolve @superjs/std/core
  variants?: "default" | "classes";
  // ... per spec/config-schema.json (now includes "language" placeholder, "extends" for paths)
}

export interface TransformOpts {
  sourceMap?: "none" | "inline" | "external";
  jsx?: { runtime: "automatic" | "classic" };
  // ... subset of CompileOpts safe for single-file mode
}
```

**`@superjs/runtime` package surface (B4)** — semver-stable from `0.1.0`:

```ts
// packages/runtime/src/index.ts
export function attachIteratorSymbol<T extends object>(ctor: new (...a: never[]) => T): void;
export function inspect<T extends { _tag: string }>(value: T): string; // internal; sets util.inspect.custom on prototype
export function panic(msg?: string): never;
export function assert(cond: boolean, msg?: string): asserts cond;
export function todo(msg?: string): never;
export function unreachable(msg?: string): never;
```

Consumed by Stage 3 (DAP inspect bridge), Stage 4 (Layer-1 re-exports), Stage 5 (build plugins must bundle).

`typeAt`, `symbolAt`, `diagnosticsFor` are the LSP contract — Stage 3 cannot start until they exist and are stable.
`transform`, `compile`, `parseTypeDecl`, `emitTypeDecl` are the Stage 2 + Stage 5 contract — those stages cannot start until they are frozen.

## Dependencies

- **Requires Stage 0:** `@superjs/compiler-types` (with CHANGELOG + SEMVER), `spec/grammar.ebnf`, `spec/error-codes.md`, `spec/diagnostics.schema.json`, `spec/config-schema.json` (with `language` placeholder + `extends`), `spec/parser-recovery.md`, RFCs 0001–0005, `docs/security/threat-model.md`, CI matrix (incl. nightly Node 24-dev).
- **Unlocks:**
  - **Stage 2 (Interop)** — needs the parser/checker API to parse `.d.sjs` outputs and validate them; the `parseTypeDecl`/`emitTypeDecl` round-trip corpus (B5) is the proof.
  - **Stage 3 (DX Tools)** — needs `typeAt` / `symbolAt` / `diagnosticsFor` and the codegen for the formatter to reuse.
  - **Stage 4 (Stdlib)** — needs `--self-bootstrap` mode, `@superjs/runtime` package, and `@superjs/jest-transform` stub to compile Layer-1 / Layer-2 SJS modules and run their tests.
  - **Stage 5 (Ecosystem)** — needs `transform()` async API (B1) for Vite/esbuild/Jest/Vitest plugins.
- **Solo-path decision gate A (S2)** is the synchronisation barrier between Stage 1 completion and Stage 2/3/4 start.
