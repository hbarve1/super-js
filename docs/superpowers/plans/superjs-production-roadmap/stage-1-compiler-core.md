# Stage 1: Compiler Core

## Goal
Ship a Phase-2 compiler that lexes, parses, type-checks, and emits ES2022 + source maps for every SuperJS construct — replacing the prototype's Babel-backed pipeline entirely — and expose a stable in-process API the LSP, formatter, linter, and interop translator can build on.

## Entry Criteria
- Stage 0 done. `@superjs/compiler-types`, `spec/grammar.ebnf`, `spec/error-codes.md`, `spec/diagnostics.schema.json`, `spec/config-schema.json` are all published / committed and CI-validated.
- Prototype's type checker and codegen exist as a reference; their test corpus exists in `prototype/tests/`.
- CI matrix green on three OSes.

## Exit Criteria (Done When)
- [ ] `packages/compiler/` builds; `superjs build src/**/*.sjs` compiles via the new pipeline end-to-end (lex → parse → check → codegen) with **no Babel dependency**.
- [ ] Hand-written lexer covers every token in `spec/grammar.ebnf`; produces `SourceSpan` for every token; error-recovery never throws.
- [ ] Recursive-descent / Pratt parser covers every production in `spec/grammar.ebnf`; passes 100 % of the prototype-derived parser fixtures plus 2,000 new fixtures (including 500 negative tests).
- [ ] Parser recovery passes the golden-recovery test suite (`tests/fixtures/parser-recovery/`): for every input, the *sequence* of emitted error codes matches expected.
- [ ] Bidirectional type checker (Dunfield-Krishnaswami algorithm with structural-subtyping extensions) passes the full prototype checker test corpus plus new fixtures for cross-file inference, narrowing, exhaustiveness, structural interfaces, and generics.
- [ ] Cross-file inference works: a function imported from another module is checked against its declared signature; type errors at call sites surface with the correct span.
- [ ] Codegen emits ES2022; source maps v3 with `names`; both default (`{ _tag, _0 }`) and `classes` variant representations supported.
- [ ] Source-map quality: a stack trace from a Vite-bundled production build points to original `.sjs` lines (manual smoke test on a fixture project).
- [ ] Incremental compilation: file-dependency graph + `apiHash` / `docHash` per module; warm rebuild on single-file change ≤ 100 ms on a 10k-LOC fixture.
- [ ] Build is deterministic: `(input set, compiler version, config hash, env-allowlist)` → byte-identical output and source map. CI determinism check passes.
- [ ] Compile-error UX: `picocolors`-rendered spans, multi-error grouping, per-file cap 50 / per-build cap 500, JSON output via `--format json|ndjson` validating against `spec/diagnostics.schema.json`.
- [ ] `superjs explain SJS-EXXX` prints the relevant `spec/error-codes/SJS-EXXX.md` content.
- [ ] CLI subcommands shipped: `build`, `check`, `format` (stub — full formatter in Stage 3), `init`, `explain`. (`lint`, `lsp`, `add`, `doctor`, `test`, `repl` stubbed for later stages.)
- [ ] `typeAt(file, line, col): SuperJSType | null` API exposed and tested.
- [ ] Compiler crash handler: top-level `try`/`catch` writes `.superjs/crash-YYYYMMDD-HHMMSS.log`; prints prefilled GitHub-issue URL.
- [ ] Prototype Babel backend deprecated (kept in `prototype/` only); `prototype/src/cli.ts` flagged with "use packages/compiler" deprecation warning.
- [ ] Cold compile of 10k-LOC fixture ≤ 2 s median on 4-core M-series / x86_64. Recorded in benchmark dashboard.

## Sprints

### Sprint 1.1 — Lexer (2 weeks)

**Deliverables:**
- `packages/compiler/src/lexer/` — hand-written lexer; one `Token` per call to `nextToken()`; produces `SourceSpan` per token.
- Token kinds: all keywords (per `spec/grammar.ebnf`), all punctuation, identifiers (Unicode-aware via `\p{ID_Start}` / `\p{ID_Continue}`), numeric literals (int / float / bigint), string literals (single/double/template), regex literals, JSX-bracket tokens (parser-driven, lexer cooperates via context flag), comments (line, block, doc).
- Error tokens: lexer never throws; on invalid byte sequences, emits `SJS-L001..L010` tokens with span and continues.
- Tab expansion + UTF-8 width handled (via `string-width`) for diagnostic rendering.
- Line-ending normalisation: CRLF → LF internally; tracked in span byte offsets so output preserves source bytes.

**Key tasks:**
- [ ] Token-kind enum and `Token` interface in `packages/compiler/src/lexer/token.ts`.
- [ ] State-machine lexer in `packages/compiler/src/lexer/lex.ts`.
- [ ] Unicode identifier handling via `unicode-properties` or hand-rolled `RegExp(/\p{ID_Start}/u)`.
- [ ] Template literal lexing with `${…}` interpolation modes (push/pop lexer state).
- [ ] JSX cooperation: lexer exposes `enterJSXMode()` / `exitJSXMode()` called by the parser.
- [ ] Comments preserved as `Trivia` attached to the next token (formatter consumes this in Stage 3).
- [ ] 1,000 lexer golden tests in `tests/fixtures/lexer/`.

**Done signal:** Lexer round-trips every `prototype/examples/**/*.sjs` byte-for-byte (modulo trivia) and every fixture's `expected-tokens.json` matches.

### Sprint 1.2 — Parser + recovery (2 weeks)

**Deliverables:**
- `packages/compiler/src/parser/` — recursive-descent + Pratt-expression parser.
- AST per `@superjs/compiler-types` `AstNode` shape; every node carries `SourceSpan`; visitor pattern (`walk`, `traverse`) in `packages/compiler/src/ast/`.
- Error recovery per the monolith's §4.4 spec: panic-mode at item/statement boundaries, phrase-level inside expressions/types/patterns, error productions for common typos (`SJS-P001..P005`), recovery streak counter with `SJS-P099` after 3 failed recoveries.
- 2,000 parser fixtures (1,500 positive + 500 negative with expected error sequences in `errors.txt`).
- `tests/fixtures/parser-recovery/` — each negative test asserts the *sequence* of error codes (not just final AST), proving recovery suppresses phantom errors.

**Key tasks:**
- [ ] Item parsers (`parseImport`, `parseExport`, `parseFunction`, `parseClass`, `parseInterface`, `parseType`, `parseLet`, `parseConst`).
- [ ] Statement parsers (`parseIf`, `parseWhile`, `parseFor`, `parseMatch`, `parseReturn`, `parseExprStmt`).
- [ ] Expression parser (Pratt): identifiers, calls, members, indexers, generic instantiation, arrow functions, object literals, array literals, JSX, template literals, `try` expression.
- [ ] Type-expression parser: primitives, named refs, generics, unions, tuples, function types, object types, `T?`, variant types.
- [ ] Pattern parser for `match`: literal, identifier, variant, object destructure, array destructure, wildcard, guards.
- [ ] Recovery state machine with sync sets per §4.4 of the monolith.
- [ ] Error productions for `SJS-P001..P005`.
- [ ] `SJS-P099` recovery-streak suppression after 3 consecutive failures.
- [ ] Visitor + traversal API in `packages/compiler/src/ast/walk.ts`.

**Done signal:** Parser accepts every prototype fixture; 500 negative-fixture recovery sequences match expected; zero phantom-error reports across the corpus.

### Sprint 1.3 — Type checker port + bidirectional algorithm (2 weeks)

**Deliverables:**
- `packages/compiler/src/checker/` — port of the prototype's type checker to the new AST.
- Bidirectional algorithm: `synth(Γ, e): SuperJSType` and `check(Γ, e, T): void` per Dunfield-Krishnaswami 2013, adapted for structural object types.
- Inference rules documented in `packages/compiler/src/checker/algorithm.md` with one worked example per rule (`Var`, `Sub`, `Anno`, `→I`, `→E`, `→I⇒`, `MatchE`, `Variant`).
- Annotation enforcement: exported function params/returns, exported `let`/`const`, exported class fields require annotations; locals may be inferred.
- Narrowing: flow-sensitive on `if (x == null) return; …`, on match arms, on `typeof` for `dynamic`, on `instanceof` for classes.
- Subtyping: structural for objects/interfaces; nominal for classes/variants; `T <: T?`; `null <: T?`; covariant return / contravariant params; invariant generics.
- Match exhaustiveness: per arm, narrow discriminant by subtracting matched pattern; residual `never` after all arms means complete; non-`never` residual → `SJS-E007`; redundant arm → `SJS-W003`; guarded arms require unguarded fallback.

**Key tasks:**
- [ ] Implement `Γ` (typing context) as a persistent map keyed by symbol id.
- [ ] Implement `synth` and `check` mutually recursive.
- [ ] Implement subtyping `<:` with memoised structural compare (cycle-safe via `WeakSet<[A, B]>`).
- [ ] Implement narrowing engine on top of the AST visitor.
- [ ] Implement match exhaustiveness with pattern subtraction.
- [ ] Port prototype's negative tests; assert error codes match `spec/error-codes.md`.
- [ ] Author `algorithm.md` with rules and worked examples.

**Done signal:** Type checker passes the entire prototype test corpus, plus 200 new bidirectional / narrowing / exhaustiveness fixtures.

### Sprint 1.4 — Cross-file inference + codegen + source maps (2 weeks)

**Deliverables:**
- Import resolver: file-based + `node_modules` resolution per Node ESM rules; honours `superjs.config.json` `paths` aliases.
- Module-type cache; cross-file `synth` resolves through cached module exports.
- Codegen: `packages/compiler/src/codegen/` emits ES2022; sum types compile per `output.variants` config (`default` = inlined `{ _tag, _0 }`, `classes` = one class per variant); pattern matching compiles to `if (x._tag === "Ok") …` chains in default mode, `if (x instanceof Ok) …` in classes mode.
- Source maps v3 with `names` field; per-AST-node mappings (not per-token).
- `--debug` (default in watch mode): skip optimisations; high-fidelity maps.
- `--release`: constant folding, DCE, switchify, inline; best-effort maps with `names` reference back to original symbols.
- `[Symbol.iterator]` bridge per §6 / §12.11 of monolith: SJS user types implementing `Iterator<T>` get the symbol auto-attached via `attachIteratorSymbol` runtime helper inlined at class definition.
- Runtime helpers package: `packages/compiler/src/runtime/` emits a 0-dependency `runtime-helpers.js` consumed by output bundles.

**Key tasks:**
- [ ] Module resolver in `packages/compiler/src/resolver/`.
- [ ] Module-type cache keyed on resolved file path.
- [ ] Codegen for every AST node; both variant modes.
- [ ] Source-map builder using `source-map` npm package (vetted).
- [ ] `attachIteratorSymbol` helper + codegen for SJS `Iterator<T>` classes.
- [ ] 500 codegen golden fixtures (`.sjs` → `.js` + `.js.map`).
- [ ] Determinism CI step: build twice, `diff -r`.

**Done signal:** A 50-file fixture project compiles end-to-end; emitted JS runs correctly under Node 22; source maps make `node --enable-source-maps` print original `.sjs` filenames in stack traces.

### Sprint 1.5 — Incremental + watch + CLI + error UX (2 weeks)

**Deliverables:**
- Incremental compilation: file-dependency graph; per-module `apiHash` (re-checks downstream importers) and `docHash` (invalidates LSP doc caches only).
- Persistent cache on disk at `.superjs/cache/` keyed on `(file mtime, file SHA-256, compiler version)`.
- Watch mode: `superjs build --watch` using `chokidar`; warm rebuild on single-file change ≤ 100 ms on 10k-LOC fixture.
- CLI subcommands shipped (Stage-1 surface): `build`, `check`, `format` (stub), `init`, `explain`. Each documented in `docs/cli/`.
- Error rendering: `packages/compiler/src/diagnostics/render.ts` with `picocolors` + `string-width`; multi-error grouping; per-file/per-build caps; `--format json|ndjson` produces schema-compliant output.
- `superjs explain SJS-EXXX`: looks up `spec/error-codes/SJS-EXXX.md` and prints rendered.
- Crash handler: top-level `try`/`catch`; writes `.superjs/crash-*.log`; prints prefilled issue URL.
- Prototype CLI marked deprecated: `prototype/src/cli.ts` prints `[DEPRECATED] use packages/compiler`.

**Key tasks:**
- [ ] Module graph + SCC for circular-import detection (§12.1: type-only allowed, value cycles → `SJS-W005` / `SJS-E021`).
- [ ] `apiHash` / `docHash` per §4.9 of the monolith.
- [ ] Cache layer with file-locking for concurrent CLI invocations.
- [ ] `chokidar`-based watcher.
- [ ] Diagnostic rendering with per-error grouping (poisoned-symbol suppression).
- [ ] CLI argument parsing via `cac` or built-in (no `commander` runtime dep at v1.0).
- [ ] `superjs explain` lookup table.
- [ ] Crash report writer.
- [ ] Benchmark: cold + warm timings on 1k / 10k / 100k LOC fixtures; recorded vs Stage-0 baseline.

**Done signal:** `superjs build --watch` on a 10k-LOC fixture rebuilds in < 100 ms; `superjs build --format json src/foo.sjs` emits valid diagnostic JSON; `superjs explain SJS-E001` prints content from `spec/error-codes/SJS-E001.md`.

### Sprint 1.6 — `typeAt` API + self-hosting smoke + retirement of Babel backend (2 weeks)

**Deliverables:**
- Public API: `packages/compiler/src/api.ts` exports `compile(sources, opts)`, `typeAt(file, line, col): SuperJSType | null`, `symbolAt(file, line, col): Symbol | null`, `diagnosticsFor(file): Diagnostic[]`.
- API consumed by an internal smoke test that mimics what Stage 3 LSP will do (open a file, hover at 100 positions, assert types).
- Self-hosting smoke: the compiler compiles the prototype's test suite of `.sjs` files using only the Stage-1 pipeline; output runs and produces identical test results to the prototype's Babel pipeline.
- Babel backend deleted from the build graph; `prototype/src/compiler/` left in place as legacy reference but excluded from `packages/`'s build.
- API documentation lives in `packages/compiler/README.md` and is semver-stable from this point — Stages 2 and 3 depend on it.
- Final Stage-1 benchmarks: cold compile 10k LOC ≤ 2 s recorded; CI gate added (soft fail at +10 %, hard fail at +25 %).

**Key tasks:**
- [ ] `typeAt` traversal: walk AST to find smallest enclosing typed node at the coordinates.
- [ ] `symbolAt` for go-to-definition support.
- [ ] `diagnosticsFor(file)` returns cached diagnostics; recomputes if dirty.
- [ ] Internal "LSP smoke" test in `tests/lsp-smoke/`.
- [ ] Wire prototype test corpus through new pipeline; assert green.
- [ ] Remove Babel dependency from `packages/compiler/package.json`.
- [ ] Update CI: prototype is no longer the source of truth for codegen; `packages/compiler/` is.
- [ ] Performance pass: profile cold compile; cut allocations in hot paths; record numbers.

**Done signal:** `packages/compiler/` is the only compiler in CI; prototype CLI prints deprecation; `typeAt` smoke test passes on 100 hover positions across 10 fixtures; cold 10k-LOC build ≤ 2 s on the CI bench runner.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Parser recovery design takes longer than 2 weeks (sprint 1.2 slip) | H | H | Recovery is split: panic-mode in 1.2, polishing of error productions in 1.5; if 1.2 slips, defer error productions to 1.5. |
| Cross-file inference (sprint 1.4) reveals subtle module-resolution edge cases | M | H | Time-box to 1.4; if not done, fall back to "annotation required at module boundaries" — degraded UX but ships. |
| Source-map fidelity bugs under Vite bundling | M | M | Smoke test with a Vite+SJS fixture in 1.4; if fidelity bad, ship best-effort maps and file v1.1 issue. |
| Cache invalidation bugs in sprint 1.5 (warm rebuild emits stale output) | M | H | Add a CI test: random fuzz of file edits + assertion of correctness; sprint includes 2 days of cache-bug bash. |
| Cold compile fails to hit ≤ 2 s on 10k LOC | M | H | Profile in 1.6; budget includes one perf pass; if missed, slip Stage 1 by 1 sprint rather than ship a slow compiler. |
| Bidirectional algorithm produces type errors that disagree with prototype (regression vs prototype users) | M | M | Diff-test new checker vs prototype on the whole corpus in 1.3; any regression must be traceable to a documented soundness fix or held as a bug. |
| Determinism check fails due to unordered map iteration in codegen | L | M | Lint rule banning bare object literals as maps in codegen; CI determinism check catches escapes. |

## API Contract

This stage publishes the **`@superjs/compiler` package API** that Stages 2, 3, 4, 5 depend on. Semver-stable from the Sprint-1.6 freeze.

```ts
// packages/compiler/src/api.ts
export interface CompileResult {
  outputs: Map<string, { code: string; map: SourceMap }>;
  diagnostics: Diagnostic[];
}

export function compile(sources: SourceFile[], opts: CompileOpts): Promise<CompileResult>;

// Stage 3 LSP depends on these three:
export function typeAt(file: string, line: number, col: number): SuperJSType | null;
export function symbolAt(file: string, line: number, col: number): Symbol | null;
export function diagnosticsFor(file: string): Diagnostic[];

// Stage 2 interop translator depends on:
export function parseTypeDecl(source: string): TypeDecl;
export function emitTypeDecl(decl: TypeDecl): string;

// Stage 4 stdlib bootstrap depends on:
export interface CompileOpts {
  selfBootstrap?: boolean; // Layer-0 types are built-in; do not resolve @superjs/std/core
  variants?: "default" | "classes";
  // ... per spec/config-schema.json
}
```

`typeAt`, `symbolAt`, `diagnosticsFor` are the LSP contract — Stage 3 cannot start until they exist and are stable.

## Dependencies

- **Requires Stage 0:** `@superjs/compiler-types`, `spec/grammar.ebnf`, `spec/error-codes.md`, `spec/diagnostics.schema.json`, `spec/config-schema.json`, CI matrix.
- **Unlocks:**
  - **Stage 2 (Interop)** — needs the parser/checker API to parse `.d.sjs` outputs and validate them.
  - **Stage 3 (DX Tools)** — needs `typeAt` / `symbolAt` / `diagnosticsFor` and the codegen for the formatter to reuse.
  - **Stage 4 (Stdlib)** — needs `--self-bootstrap` mode to compile Layer-1 / Layer-2 SJS modules.
