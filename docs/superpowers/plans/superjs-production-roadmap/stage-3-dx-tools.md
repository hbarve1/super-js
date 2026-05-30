# Stage 3: DX Tools

## Goal
Ship the developer-experience surface that a TS user will judge SJS on within five minutes: a VS Code extension backed by an LSP that hovers, completes, navigates and reports errors in real time; a working debugger; a formatter (with `.sjsignore` + Prettier coexistence story); a **17-rule** linter; and a server-side playground at a public URL — including a **Workers demo mode** with mocked bindings so backend developers can actually test their target deployment shape. If the DX is bad on day one, no one switches.

Round-3 changes: 15 rules → **17 rules** (T7: `no-unhandled-result`, `no-dynamic-without-schema-at-boundary`); playground gains Workers demo mode (T5); migration tool gated on a real beta-team 5-10k-LOC TS codebase (S5); LSP over-budget behaviour speced (M6); VS Code Marketplace co-publisher enrolled (R5); external security reviewer booked at Stage entry (S7); `.sjsignore` + Prettier coexistence + Husky recipe documented (C1); spec text authored per feature (B8); solo-path decision gate B invoked at entry (S2).

## Entry Criteria
- Stage 1 done. `@superjs/compiler` API frozen with `typeAt(file, line, col)`, `symbolAt(file, line, col)`, `diagnosticsFor(file)`, `transform()` stable.
- Stage 1 solo-path decision gate A merged (S2) — Stage 3 ownership assigned (maintainer or co-maintainer per the decision).
- **Solo-path decision gate B (S2)** — entered explicitly at Sprint 3.1 kick-off: re-confirm staffing for parallel Stages 2 + 3 + 4. If co-maintainer is "partial parallel" per gate B options, Stage 3 may compress to 6 weeks by deferring Tier-2 stretches.
- **External security reviewer booked (S7)** — engagement letter signed for delivery by Sprint 6.2 (week 32 calendar / 8 weeks ahead of Stage 6). Booking happens here at the start of Stage 3 (week 17 in the 42-week plan).
- `spec/diagnostics.schema.json` finalised (Stage 0); VS Code extension and LSP both consume it.
- Stage 1 codegen + parser available for the formatter to reuse.
- VS Code Marketplace publisher account active **with a co-publisher enrolled** before Sprint 3.2 publish (R5) — at least two distinct people have publish rights, with `marketplace.json` documenting both.

## Exit Criteria (Done When)
- [ ] `packages/language-server/` (`@superjs/lsp`) implements all 9 M1 methods: `publishDiagnostics`, `hover`, `definition`, `completion`, `signatureHelp`, `formatting`, `documentSymbol`, `foldingRange`, `semanticTokens/full`.
- [ ] LSP idle memory ≤ 250 MB on a 100k-LOC fixture monorepo; CI enforces via memory-leak test (1,000-file open/close cycle; RSS does not grow monotonically).
- [ ] LSP active memory ≤ 500 MB on the same fixture.
- [ ] LSP P99 latency: hover ≤ 200 ms; completion ≤ 200 ms; diagnostics debounce 150 ms.
- [ ] LSP cold start ≤ 3 s on the 100k-LOC fixture.
- [ ] **LSP over-budget behaviour (M6) specced and tested:** when `lsp.memoryBudgetMB` (default 128 MB; user-configurable in `superjs.config.json`) is exceeded mid-operation, the LSP runs LRU eviction on the AST cache (oldest-touched first); if the operation still cannot complete, returns a partial result (e.g. hover returns `{ contents: "(unavailable — memory pressure)", range }`) and emits `SJS-W010: lsp-memory-pressure` diagnostic to the client. CI test `tests/lsp/memory-pressure.test.ts` exhausts budget mid-hover and asserts no crash + correct W010 emission.
- [ ] `packages/vscode-extension/` published to VS Code Marketplace under the **superjs publisher with co-publisher (R5)**; manually smoke-tested on Windows, macOS, Linux.
- [ ] TextMate grammar (`syntaxes/superjs.tmLanguage.json`) covers every keyword, JSX, template literal, comment, regex.
- [ ] Snippets shipped: `fn`, `class`, `match`, `result`, `option`, `interface`, `type`.
- [ ] DAP launch configuration with custom inspect formatters for sum types in both `default` and `classes` representation, using `@superjs/runtime`'s `inspect` (per Stage 1 Sprint 1.5).
- [ ] `superjs format` is idempotent: `format(format(x)) === format(x)` on every fixture; property test included; ≤ 50 ms on a 1k-line file.
- [ ] **Formatter coexistence story documented (C1)** in `docs/formatter-integration.md`:
  - `.sjsignore` file (one path glob per line; mirrors `.gitignore`).
  - Prettier coexistence: `.sjs` files are owned by `superjs format`; `.js`/`.ts`/`.md` continue to be owned by Prettier. `.prettierignore` should add `*.sjs` (snippet provided).
  - Husky pre-commit recipe: `npx lint-staged` with `"*.sjs": ["superjs format", "superjs lint"]`.
  - `superjs format --check` exit-code semantics for CI integration.
- [ ] `superjs lint` ships **17 rules (T7)**; `--fix` works for declared rules; plugin API marked `@beta`. The new rules vs the round-2 list of 15:
  - **16. `no-unhandled-result`** — flags expressions of type `Result<T, E>` whose value is not consumed via `match`, `.ok`, `.err`, `?` operator, explicit `let _ = ...`, or `return ...`. Auto-fix offers `match` skeleton. Critical for the target user since `Result` is first-class.
  - **17. `no-dynamic-without-schema-at-boundary`** — flags any call to a function whose return type is `dynamic` at a public-exported-symbol boundary (exported function, public class method, REST handler return) where the result is then used as a typed value without going through `fromJS<T>` + `Schema`. Auto-fix offers `fromJS` skeleton with a placeholder schema.
- [ ] `superjs migrate from-ts <dir>` rewrites the **real beta-team-supplied 5-10k-LOC TS codebase (S5)** to SJS; produces `MIGRATION_REPORT.md`; idempotent on already-migrated input. The curated synthetic fixtures move to **unit tests only** — they no longer gate the milestone.
- [ ] Server-side playground (`packages/playground/`) live at the canonical URL; share-by-URL works; Layer-1/2 stdlib + top-30 wrappers pre-bundled into the worker.
- [ ] **Playground "Workers demo mode" (T5)** — toggle in the playground UI that surfaces mocked Cloudflare bindings: `KV` (in-memory `Map`-backed), `D1` (in-memory SQLite-shaped object), `R2` (in-memory `Map`), `fetch` (mocked with a configurable response table). User code can `await env.KV.get("foo")` and see it round-trip. Documentation in the tour calls out the difference from real Workers (no network egress, no real persistence).
- [ ] Playground rate-limit: 60 compiles/minute/IP; exceeded → 429.
- [ ] Playground "run" step: executes compiled JS in a Cloudflare Sandbox SDK isolate with 1 s CPU, 128 MB memory, no network, no FS (Workers demo mode adds the mocked-binding shim layer on top of this).
- [ ] LSP tested in Neovim and Helix (config snippets documented in `docs/editors/`).
- [ ] **Spec contribution (B8):** `spec/language.md/tooling-surface.md` covers LSP method semantics, lint rule semantics (all 17), formatter idempotency invariant, migration-tool rewrite rules.

## Sprints

### Sprint 3.1 — LSP M1 methods + memory budget + over-budget spec (2 weeks)

**Deliverables:**
- `packages/language-server/src/` server built on `vscode-languageserver` npm package; in-process import of `@superjs/compiler`.
- M1 methods implemented:
  - `textDocument/publishDiagnostics` — push on change with 150 ms debounce; consumes `diagnosticsFor(file)`.
  - `textDocument/hover` — uses `typeAt`; renders type + doc comment as markdown.
  - `textDocument/definition` — uses `symbolAt` + symbol-table → file/span.
  - `textDocument/completion` — context-aware: identifiers in scope, members, variant constructors in match patterns, JSX attribute names.
  - `textDocument/signatureHelp` — current call signature with active parameter.
  - `textDocument/formatting` — delegates to Stage-3 formatter (Sprint 3.3).
  - `textDocument/documentSymbol` — outline derived from AST.
  - `textDocument/foldingRange` — derived from braces, multi-line strings, comment blocks.
  - `textDocument/semanticTokens/full` — semantic highlighting (variant vs constructor vs function vs class).
- Memory strategy + **over-budget spec (M6)** at `packages/language-server/MEMORY.md`:
  - Module graph holds `WeakRef<AstNode>` to evictable AST nodes.
  - LRU eviction policy: per-file diagnostic + AST cache evicted oldest-touched-first when `lsp.memoryBudgetMB` exceeded.
  - Default `lsp.memoryBudgetMB` = 128 MB (configurable per `superjs.config.json` Stage 0 schema).
  - **Over-budget behaviour:** hover/definition/completion return partial result (`unavailable — memory pressure` for hover; `null` for definition; empty list for completion) and the LSP emits `SJS-W010: lsp-memory-pressure` to the client's diagnostics stream. The operation never throws.
- CI tests:
  - `tests/lsp/memory-leak.test.ts` — open 1,000 files sequentially, edit each once, sample RSS every 50 files; assert no monotonic growth.
  - `tests/lsp/heap-snapshot.test.ts` — `node --inspect`-based test asserting no retained references after closing a file.
  - `tests/lsp/latency.test.ts` — 100 hover queries, 100 completion queries; assert P99 ≤ 200 ms.
  - **`tests/lsp/memory-pressure.test.ts` (M6)** — set `lsp.memoryBudgetMB` to 32 MB; load 100k-LOC fixture; assert no crash; assert `SJS-W010` is emitted; assert hover returns partial response.
- **External security reviewer booked (S7)** — engagement letter signed within Sprint 3.1 (week 17); reviewer scope covers compiler input parsing, LSP message handling, playground sandbox, `--provenance` correctness; delivery deadline Sprint 6.2 (week 32 calendar).

**Key tasks:**
- [ ] LSP server scaffold + transport (stdio + WebSocket).
- [ ] Handler per M1 method.
- [ ] WeakRef AST cache + LRU eviction policy.
- [ ] Author `packages/language-server/MEMORY.md` with over-budget behaviour spec (M6).
- [ ] Debounce wrapper for diagnostics.
- [ ] Memory leak test in CI.
- [ ] Heap snapshot test in CI.
- [ ] Latency test in CI; record numbers in `bench/lsp-baseline.json`.
- [ ] Memory-pressure test in CI (M6).
- [ ] Book external security reviewer (S7); confirm scope + deadline in writing.

**Done signal:** A 10-file fixture project opens in a script-driven LSP client; hovers/completes/jumps-to-def all return correctly; CI memory + heap + latency + memory-pressure tests pass; security reviewer engagement letter on file.

### Sprint 3.2 — VS Code extension + DAP debugger + co-publisher enrolment (2 weeks)

**Deliverables:**
- `packages/vscode-extension/` extension scaffold (TypeScript).
- TextMate grammar `syntaxes/superjs.tmLanguage.json` — hand-written; covers keywords, identifiers, template literals, JSX, comments, regex, numeric literals.
- LSP client wiring (`vscode-languageclient`); spawns `@superjs/lsp` server process; sends initialise + workspace folders.
- Snippets file: `fn`, `class`, `match`, `result`, `option`, `interface`, `type`.
- Command palette commands: "Run current file", "Restart LSP", "Show compilation output".
- DAP launch configuration (`debugger.json`):
  ```json
  {
    "type": "node", "request": "launch", "name": "Launch SJS file",
    "program": "${file}", "preLaunchTask": "superjs: build",
    "outFiles": ["${workspaceFolder}/dist/**/*.js"],
    "sourceMaps": true, "smartStep": true,
    "skipFiles": ["<node_internals>/**", "**/@superjs/runtime/**"]
  }
  ```
- `@superjs/runtime`'s `inspect` helper (Stage 1 Sprint 1.5 — package now exists) registers `Symbol.for('nodejs.util.inspect.custom')` on variant literals so `console.log(Ok(42))` renders `Ok(42)` not `{ _tag: "Ok", _0: 42 }`. Stage 5 build plugins bundle `@superjs/runtime` automatically.
- Chrome DevTools "Custom Formatter" included with the extension; users enable it manually.
- Source-map composition tested through a Vite + SJS + React fixture: a thrown error from `.sjs` source produces a stack trace pointing at the original `.sjs` line in a Vite-bundled production build.
- **VS Code Marketplace co-publisher enrolment (R5)** — second account holder verified with publish rights to `superjs.superjs-vscode` before any publish action. Rotation policy documented in `packages/vscode-extension/RELEASING.md`.
- Extension manually tested on Windows, macOS, Linux via `code --extensionDevelopmentPath`.
- Published to VS Code Marketplace as `superjs.superjs-vscode`.

**Key tasks:**
- [ ] Extension scaffold via `yo code`.
- [ ] Hand-write TextMate grammar; test against `prototype/examples/`.
- [ ] LSP client init + reconnect logic.
- [ ] Snippets.
- [ ] DAP launch config + variable formatters (consuming `@superjs/runtime`'s `inspect`).
- [ ] Source-map composition smoke test with Vite + SJS fixture.
- [ ] Marketplace listing: screenshots, README, repo link.
- [ ] Enrol co-publisher (R5); update `RELEASING.md`.
- [ ] CI: extension build + lint; manual cross-OS smoke documented in `docs/editors/vscode-smoke.md`.

**Done signal:** Extension installs from Marketplace on three OSes; opens a `.sjs` file; LSP attaches; hover/completion/diagnostics all work; F5 launches with debugger; sum-type vars render as `Ok(42)` in the debug view; co-publisher access confirmed.

### Sprint 3.3 — Formatter + 17-rule linter + migration tool gated on real codebase + `.sjsignore` story (2 weeks)

**Deliverables:**
- Formatter at `packages/compiler/src/formatter/` (already stubbed in Stage 1; this sprint completes it).
- Gofmt-style: one canonical output, zero config knobs.
- Idempotent: CI runs `format(format(x))` against every fixture and asserts byte-equality.
- Property test (fast-check): random valid `.sjs` inputs → formatted output reparses to same AST.
- Comment handling: doc comments stay attached to their declaration; line comments retain position; trailing comments stay trailing.
- Performance: ≤ 50 ms for a 1k-line file (benched).
- **`.sjsignore` + Prettier coexistence + Husky (C1)** at `docs/formatter-integration.md`:
  - `.sjsignore` syntax (gitignore-style); precedence rules; CLI honours it via `superjs format`, `superjs lint`, `superjs check`.
  - Prettier coexistence: provide `.prettierignore` snippet adding `*.sjs`; document that Prettier never touches `.sjs`.
  - Husky recipe: `package.json` `lint-staged` config snippet for `*.sjs` → `["superjs format", "superjs lint"]`.
  - `superjs format --check` returns non-zero on first non-formatted file with `SJS-F001` diagnostic (for CI).
- Linter at `packages/compiler/src/linter/` ships **17 rules (T7)**:
  1. `no-unused-import`
  2. `no-unused-var`
  3. `no-unused-function`
  4. `no-shadowing`
  5. `no-explicit-dynamic` (warning; `// @sjs:dynamic-ok` opt-out)
  6. `prefer-const`
  7. `no-empty-match`
  8. `no-redundant-match-arm`
  9. `prefer-result-over-throw`
  10. `no-floating-promise`
  11. `no-non-null-assertion-without-comment`
  12. `prefer-arrow-callback`
  13. `no-circular-import`
  14. `no-mixed-spaces-tabs`
  15. `import-order`
  16. **`no-unhandled-result` (T7)** — flags unconsumed `Result<T, E>` expression results; auto-fix offers `match` skeleton.
  17. **`no-dynamic-without-schema-at-boundary` (T7)** — flags `dynamic` flowing across an exported function boundary, REST/RPC handler return, or `JSON.parse`-equivalent edge into a typed sink without `fromJS<T>(...)` + `Schema`; auto-fix offers `fromJS` skeleton with placeholder schema.
- `superjs lint --fix` for rules that declare auto-fix.
- Plugin API: documented in `docs/lint-plugin-api.md` as `@beta` — not semver-stable at v1.0.
- TS→SJS migration tool at `tools/migrate/`: `superjs migrate from-ts <dir>`.
  - Handled rewrites: enums → unions; namespaces → modules; intersection of object types → composed interface; `any` → `dynamic` (warning); `unknown` → `dynamic`; legacy decorators flagged.
  - Manual-review flags via `// TODO@sjs-migrate: ...`: mapped types, conditional types, `infer`, template literal types, declaration merging.
  - Emits `MIGRATION_REPORT.md` summarising counts.
  - Idempotent on already-migrated input.
  - **Gate (S5):** the milestone gate is migration of a **real 5-10k-LOC TS codebase** from a friendly beta team (the same team supplying Sprint 2.4's interop test). Curated fixtures in `tools/migrate/fixtures/` remain as unit tests, but the milestone gate is now: "team-X codebase migrates; emitted SJS builds under `superjs build`; team-X tests pass on the migrated output (or documented failure list)." If the beta team is unavailable, S5 fallback per Stage 2 risk table.

**Key tasks:**
- [ ] Formatter implementation using AST + comment-attachment passes.
- [ ] Formatter idempotency test in CI.
- [ ] Formatter property test with fast-check.
- [ ] Author `docs/formatter-integration.md` (C1) with `.sjsignore`, Prettier coexistence, Husky recipe.
- [ ] Implement `.sjsignore` parsing in CLI shared layer.
- [ ] 17 lint rules — each in its own file under `packages/compiler/src/linter/rules/`.
- [ ] Per-rule auto-fix where declared.
- [ ] Lint plugin API doc.
- [ ] Migration tool with rewrite rules.
- [ ] Migration tool integration test against the real beta-team TS codebase (S5).
- [ ] Author `spec/language.md/tooling-surface.md` (covers all 17 rules' semantics).

**Done signal:** `superjs format src/` on a 1k-line file completes in < 50 ms; CI's idempotency test green across all fixtures; `superjs lint --fix` cleans up a fixture with planted violations across all 17 rules; `superjs migrate from-ts <real-team-path>` produces a report and a working SJS project on the real beta-team codebase.

### Sprint 3.4 — Server-side playground + Workers demo mode + REPL stub + LSP M2 stretch (2 weeks)

**Deliverables:**
- `packages/playground/` — Cloudflare Workers + static frontend (Next.js or Astro on Cloudflare Pages).
- Monaco editor + run button + share URL (base64 of gzipped `{ code, version, mode }`); state is client-side; no server storage.
- Backend execution: Worker per request runs `@superjs/compiler` against input, returns compiled JS + diagnostics.
- Optional "run" step: Cloudflare Sandbox SDK isolate, 1 s CPU, 128 MB memory, no network, no FS.
- **Workers demo mode (T5)** — selectable from the playground UI ("Run as Worker"); the run step injects a shim layer that exposes mocked bindings:
  - `env.KV`: in-memory `Map`-backed shim implementing `get/put/delete/list`.
  - `env.D1`: in-memory SQLite-shaped object backed by `sql.js` (compiled to WASM, bundled into the Worker); supports `prepare(stmt).bind(...).run()`.
  - `env.R2`: in-memory `Map<key, ArrayBuffer>` shim implementing `get/put/delete/list`.
  - `fetch`: mocked against a configurable response table (`{ url-pattern: response-fixture }`) declared in a "Mocked fetch" UI panel.
  - The fact that bindings are mocked and have no persistence is shown as a banner; tour lesson 19 ("Tooling tour") + lesson 20 ("Migrating a TS file") + the Workers handler template (Stage 5 Sprint 5.1) document the difference from real Workers.
- Rate limiting via Workers KV counter: 60 compiles/minute/IP; 429 on exceed.
- Versioning: `?version=0.9.3` selects a per-version Worker.
- Pre-bundled into the Worker: Layer-1 + Layer-2 stdlib (output from Stage 4) + top-30 wrappers (from Stage 2). Arbitrary npm packages **not** supported at v1.0 (documented).
- **Tier-2 stretch goals** (ship only if Sprints 3.1–3.3 are on schedule):
  - REPL: `superjs repl` interactive shell, show types on hover-equivalent prompt.
  - LSP M2: `textDocument/references`, `textDocument/rename`, `textDocument/codeAction` (quick fixes for SJS-EXXX codes), `textDocument/inlayHint`.
- Editor configs documented for Neovim (built-in LSP + `nvim-lspconfig`) and Helix (`languages.toml`).
- Compiler crash reporting wired into the VS Code extension's status bar (clickable to file an issue per §12.15).

**Key tasks:**
- [ ] Cloudflare Worker scaffolding via `wrangler init`; deploy pipeline.
- [ ] Static frontend (Monaco + share-by-URL + mode toggle).
- [ ] Sandbox SDK integration for "run" step.
- [ ] Workers demo mode shim layer (T5): KV, D1, R2, fetch mocks.
- [ ] Pre-bundle stdlib + wrappers; verify import resolution within the Worker isolate.
- [ ] Workers KV rate-limit counter.
- [ ] Per-version Worker deployment (lazy-load).
- [ ] LSP M2 (stretch, drop if behind).
- [ ] REPL (stretch).
- [ ] Neovim + Helix configs in `docs/editors/`.

**Done signal:** Playground live at canonical URL; sample share URL renders the same code in a fresh browser; "run" returns expected output for a simple SJS fixture; Workers demo mode round-trips `env.KV.put("k","v"); env.KV.get("k")` correctly; rate-limit 429 fires after 60 rapid requests from one IP.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LSP memory budget missed on real-world projects (250 MB exceeded) | M | H | Sprint 3.1 includes CI leak test; over-budget LRU eviction + `SJS-W010` (M6); fall back to "open files only" caching. |
| LSP latency P99 > 200 ms on hover/completion | M | M | Sprint 3.1 profiles hot paths; reuse incremental compilation cache from Stage 1; if missed, ship slower with documented number, file v1.1 perf issue. |
| Source-map composition through Vite breaks for production builds | M | H | Smoke test in Sprint 3.2; source-map fidelity gate from Stage 1 Sprint 1.4 (M5) catches most; if still broken, ship with explicit "use --debug for prod debugging" note; file v1.1. |
| Formatter comment-handling edge cases produce non-idempotent output | M | M | Property test in 3.3; expand fixture corpus on every reported bug; ship known-issue list. |
| **R5 — VS Code Marketplace publisher SPOF** | L | M | Co-publisher enrolled before Sprint 3.2 publish; rotation documented in `RELEASING.md`. |
| **R8 — Playground Worker accumulation beyond Cloudflare free tier** | L | M | Archive Workers older than 2 major versions (e.g. `?version=0.7.x` becomes a static "deprecated, use 0.9.x" page); archival policy documented in `packages/playground/ARCHIVE.md`; per-version Worker isolation prevents one buggy version eating quota. |
| Cloudflare Worker cost spirals beyond free tier (separate from version accumulation) | L | M | Rate limit + per-version Worker isolation; estimated < 100k req/day. Paid plan ($5/mo) covers 10M req. |
| Playground bundle size > 10 MB compressed | M | M | Pre-bundled stdlib + wrappers might push beyond budget; if so, lazy-load wrappers on first import in playground; Workers demo mode mocks (sql.js WASM) add ~200KB. |
| TextMate grammar regressions vs VS Code TS highlighting (users expect parity) | M | L | Iterate from prototype's existing grammar; user-reported issues in Stage 6 beta. |
| Migration tool emits broken code on the beta-team codebase (S5 gate fails) | H | H | The point of S5 is that real-project failures surface **now**, not in beta. Sprint 3.3 includes a 3-day buffer after the first migration attempt for the most common failure-class fix. If the codebase has class-of-failure beyond budget, document and ship with the failure list in `MIGRATION_REPORT.md`; the tool is honest about what it can and cannot handle. |
| LSP M2 (rename, references, code-action) does not ship | M | M | Tier-2 from the start. v1.0 ships M1; docs say "renaming is text-find-and-replace at v1.0, semantic rename in v1.1". |
| External security reviewer (S7) booked but delivery slips | M | M | Engagement letter has hard delivery date; backup reviewer (e.g. Trail of Bits) pre-identified; if slip, ship RC with internal review note, flag for v1.0.1 — same fallback as Stage 6 Risk register. |

## API Contract

This stage **consumes** the Stage-1 compiler API (`typeAt`, `symbolAt`, `diagnosticsFor`, `compile`, `transform`, `parseTypeDecl`) and the Stage-1 `@superjs/runtime` package.

This stage **produces**:

1. **LSP wire protocol** — standard LSP; client of `vscode-languageserver`. M1 methods per the exit criteria above. Over-budget behaviour speced in `packages/language-server/MEMORY.md` (M6). Consumed by the VS Code extension and any LSP-aware editor (Neovim, Helix, Sublime, Zed, Emacs).

2. **VS Code extension** at `superjs.superjs-vscode` — Marketplace listing with co-publisher (R5). Settings (`superjs.lsp.memoryBudgetMB`, `superjs.format.onSave`), command palette commands, contributed file extensions (`.sjs`, `.d.sjs`).

3. **Linter rule API (`@beta`)** — TypeScript interface documented in `docs/lint-plugin-api.md`. 17 built-in rules per T7. Not semver-stable until v2.0.

4. **Formatter integration story** (`docs/formatter-integration.md`, C1) — `.sjsignore`, Prettier coexistence snippet, Husky recipe.

5. **Migration tool report format** (`MIGRATION_REPORT.md`) — table of (file, rewrite-class, count, manual-review-needed). Consumed by users; not a stable wire format but documented.

6. **Playground URL contract** — `https://play.superjs.dev/?v=<version>&m=<mode>&c=<base64>` where `mode ∈ {default, workers}` (T5). Consumed by docs (tour lessons embed playground URLs); `mode=workers` for backend lessons that need bindings.

## Dependencies

- **Requires Stage 1:** `typeAt`, `symbolAt`, `diagnosticsFor`, `transform` from `@superjs/compiler` (the LSP cannot start without these); `@superjs/runtime` (DAP inspect bridge consumes `inspect`).
- **Requires Stage 0:** `spec/diagnostics.schema.json` (extension parses LSP `publishDiagnostics` payloads against it); `spec/config-schema.json` `lsp.memoryBudgetMB`.
- **Requires Stage 2 (soft, shared dependency):** the beta team supplying the 5-10k-LOC TS codebase is recruited in Stage 2 Sprint 2.1 (S5). If unavailable by Sprint 3.3, fall back to synthetic corpus assembled from open source — degraded but not blocking.
- **Parallel with Stages 2 + 4** — none of those produce outputs this stage depends on. The playground bundles Stage 4's stdlib output **when it exists** — if Stage 4 finishes late, the playground ships with a placeholder stdlib and updates on Stage 4 completion.
- **Unlocks Stage 5** — Stage 5 may bundle `@superjs/lsp` into the CLI only if Stage 3 LSP M1 is done before Stage 5 publishes (per README dependency-graph round-3 update). If not done in time, Stage 5 ships CLI without `lsp` subcommand at v1.0.
- **Unlocks Stage 6** — docs (tour lessons embed playground URLs, including Workers demo mode lessons); "Why SJS" page shows VS Code screenshots; migration guide assumes the migration tool exists.
