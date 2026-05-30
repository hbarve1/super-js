# Stage 3: DX Tools

## Goal
Ship the developer-experience surface that a TS user will judge SJS on within five minutes: a VS Code extension backed by an LSP that hovers, completes, navigates and reports errors in real time; a working debugger; a formatter; a 15-rule linter; and a server-side playground at a public URL. If the DX is bad on day one, no one switches.

## Entry Criteria
- Stage 1 done. `@superjs/compiler` API frozen with `typeAt(file, line, col)`, `symbolAt(file, line, col)`, `diagnosticsFor(file)` stable.
- `spec/diagnostics.schema.json` finalised (Stage 0); VS Code extension and LSP both consume it.
- Stage 1 codegen + parser available for the formatter to reuse.

## Exit Criteria (Done When)
- [ ] `packages/language-server/` (`@superjs/lsp`) implements all 9 M1 methods from §5.1 of monolith: `publishDiagnostics`, `hover`, `definition`, `completion`, `signatureHelp`, `formatting`, `documentSymbol`, `foldingRange`, `semanticTokens/full`.
- [ ] LSP idle memory ≤ 250 MB on a 100k-LOC fixture monorepo; CI enforces via memory-leak test (1,000-file open/close cycle; RSS does not grow monotonically).
- [ ] LSP active memory ≤ 500 MB on the same fixture.
- [ ] LSP P99 latency: hover ≤ 200 ms; completion ≤ 200 ms; diagnostics debounce 150 ms.
- [ ] LSP cold start ≤ 3 s on the 100k-LOC fixture.
- [ ] `packages/vscode-extension/` published to VS Code Marketplace; manually smoke-tested on Windows, macOS, Linux.
- [ ] TextMate grammar (`syntaxes/superjs.tmLanguage.json`) covers every keyword, JSX, template literal, comment, regex.
- [ ] Snippets shipped: `fn`, `class`, `match`, `result`, `option`, `interface`, `type`.
- [ ] DAP launch configuration with custom inspect formatters for sum types in both `default` and `classes` representation.
- [ ] `superjs format` is idempotent: `format(format(x)) === format(x)` on every fixture; property test included; ≤ 50 ms on a 1k-line file.
- [ ] `superjs lint` ships 15 rules (per §5.6 of monolith); `--fix` works for declared rules; plugin API marked `@beta`.
- [ ] `superjs migrate from-ts <dir>` rewrites a curated 5k-LOC TS corpus to SJS; produces `MIGRATION_REPORT.md`; idempotent on already-migrated input.
- [ ] Server-side playground (`packages/playground/`) live at the canonical URL; share-by-URL works; Layer-1/2 stdlib + top-30 wrappers pre-bundled into the worker.
- [ ] Playground rate-limit: 60 compiles/minute/IP; exceeded → 429.
- [ ] Playground "run" step: executes compiled JS in a Cloudflare Sandbox SDK isolate with 1 s CPU, 128 MB memory, no network, no FS.
- [ ] LSP tested in Neovim and Helix (config snippets documented in `docs/editors/`).

## Sprints

### Sprint 3.1 — LSP M1 methods + memory budget (2 weeks)

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
- Memory strategy:
  - Module graph holds `WeakRef<AstNode>` to evictable AST nodes.
  - Per-file diagnostic cache TTL 5 minutes idle.
  - `superjs.config.json` `lsp.memoryBudgetMB` hard-caps; oldest caches evicted first.
- CI tests:
  - `tests/lsp/memory-leak.test.ts` — open 1,000 files sequentially, edit each once, sample RSS every 50 files; assert no monotonic growth.
  - `tests/lsp/heap-snapshot.test.ts` — `node --inspect`-based test asserting no retained references after closing a file.
  - `tests/lsp/latency.test.ts` — 100 hover queries, 100 completion queries; assert P99 ≤ 200 ms.

**Key tasks:**
- [ ] LSP server scaffold + transport (stdio + WebSocket).
- [ ] Handler per M1 method.
- [ ] WeakRef AST cache + eviction policy.
- [ ] Debounce wrapper for diagnostics.
- [ ] Memory leak test in CI.
- [ ] Heap snapshot test in CI.
- [ ] Latency test in CI; record numbers in `bench/lsp-baseline.json`.

**Done signal:** A 10-file fixture project opens in a script-driven LSP client, hovers/completes/jumps-to-def all return correctly; CI memory + heap + latency tests pass.

### Sprint 3.2 — VS Code extension + DAP debugger (2 weeks)

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
    "skipFiles": ["<node_internals>/**", "**/.superjs/runtime-helpers.js"]
  }
  ```
- `@superjs/runtime/inspect` helper: registers `Symbol.for('nodejs.util.inspect.custom')` on variant literals so `console.log(Ok(42))` renders `Ok(42)` not `{ _tag: "Ok", _0: 42 }`. Variant codegen in Stage 1 attaches this symbol.
- Chrome DevTools "Custom Formatter" included with the extension; users enable it manually.
- Source-map composition tested through a Vite + SJS + React fixture: a thrown error from `.sjs` source produces a stack trace pointing at the original `.sjs` line in a Vite-bundled production build.
- Extension manually tested on Windows, macOS, Linux via `code --extensionDevelopmentPath`.
- Published to VS Code Marketplace as `superjs.superjs-vscode`.

**Key tasks:**
- [ ] Extension scaffold via `yo code`.
- [ ] Hand-write TextMate grammar; test against `prototype/examples/`.
- [ ] LSP client init + reconnect logic.
- [ ] Snippets.
- [ ] DAP launch config + variable formatters.
- [ ] `runtime-helpers.js` inspect bridge.
- [ ] Source-map composition smoke test with Vite + SJS fixture.
- [ ] Marketplace listing: screenshots, README, repo link.
- [ ] CI: extension build + lint; manual cross-OS smoke documented in `docs/editors/vscode-smoke.md`.

**Done signal:** Extension installs from Marketplace on three OSes; opens a `.sjs` file; LSP attaches; hover/completion/diagnostics all work; F5 launches with debugger; sum-type vars render as `Ok(42)` in the debug view.

### Sprint 3.3 — Formatter + linter + migration tool (2 weeks)

**Deliverables:**
- Formatter at `packages/compiler/src/formatter/` (already stubbed in Stage 1; this sprint completes it).
- Gofmt-style: one canonical output, zero config knobs.
- Idempotent: CI runs `format(format(x))` against every fixture and asserts byte-equality.
- Property test (fast-check): random valid `.sjs` inputs → formatted output reparses to same AST.
- Comment handling: doc comments stay attached to their declaration; line comments retain position; trailing comments stay trailing.
- Performance: ≤ 50 ms for a 1k-line file (benched).
- Linter at `packages/compiler/src/linter/` ships **15 rules** (per §5.6 of monolith):
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
- `superjs lint --fix` for rules that declare auto-fix.
- Plugin API: documented in `docs/lint-plugin-api.md` as `@beta` — not semver-stable at v1.0.
- TS→SJS migration tool at `tools/migrate/`: `superjs migrate from-ts <dir>`.
  - Handled rewrites: enums → unions; namespaces → modules; intersection of object types → composed interface; `any` → `dynamic` (warning); `unknown` → `dynamic`; legacy decorators flagged.
  - Manual-review flags via `// TODO@sjs-migrate: ...`: mapped types, conditional types, `infer`, template literal types, declaration merging.
  - Emits `MIGRATION_REPORT.md` summarising counts.
  - Idempotent on already-migrated input.

**Key tasks:**
- [ ] Formatter implementation using AST + comment-attachment passes.
- [ ] Formatter idempotency test in CI.
- [ ] Formatter property test with fast-check.
- [ ] 15 lint rules — each in its own file under `packages/compiler/src/linter/rules/`.
- [ ] Per-rule auto-fix where declared.
- [ ] Lint plugin API doc.
- [ ] Migration tool with rewrite rules.
- [ ] Migration tool integration test against a 5k-LOC TS fixture in `tools/migrate/fixtures/`.

**Done signal:** `superjs format src/` on a 1k-line file completes in < 50 ms; CI's idempotency test green across all fixtures; `superjs lint --fix` cleans up a fixture with planted violations; `superjs migrate from-ts tools/migrate/fixtures/sample-ts/` produces a report and a working SJS project.

### Sprint 3.4 — Server-side playground + REPL stub + LSP M2 stretch (2 weeks)

**Deliverables:**
- `packages/playground/` — Cloudflare Workers + static frontend (Next.js or Astro on Cloudflare Pages).
- Monaco editor + run button + share URL (base64 of gzipped `{ code, version }`); state is client-side; no server storage.
- Backend execution: Worker per request runs `@superjs/compiler` against input, returns compiled JS + diagnostics.
- Optional "run" step: Cloudflare Sandbox SDK isolate, 1 s CPU, 128 MB memory, no network, no FS.
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
- [ ] Static frontend (Monaco + share-by-URL).
- [ ] Sandbox SDK integration for "run" step.
- [ ] Pre-bundle stdlib + wrappers; verify import resolution within the Worker isolate.
- [ ] Workers KV rate-limit counter.
- [ ] Per-version Worker deployment (lazy-load).
- [ ] LSP M2 (stretch, drop if behind).
- [ ] REPL (stretch).
- [ ] Neovim + Helix configs in `docs/editors/`.

**Done signal:** Playground live at canonical URL; sample share URL renders the same code in a fresh browser; "run" returns expected output for a simple SJS fixture; rate-limit 429 fires after 60 rapid requests from one IP.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LSP memory budget missed on real-world projects (250 MB exceeded) | M | H | Sprint 3.1 includes CI leak test; if missed, restrict AST cache size further (LRU 50 files); fall back to "open files only" caching. |
| LSP latency P99 > 200 ms on hover/completion | M | M | Sprint 3.1 profiles hot paths; reuse incremental compilation cache from Stage 1; if missed, ship slower with documented number, file v1.1 perf issue. |
| Source-map composition through Vite breaks for production builds | M | H | Smoke test in Sprint 3.2; if broken, ship with explicit "use --debug for prod debugging" note; file v1.1. |
| Formatter comment-handling edge cases produce non-idempotent output | M | M | Property test in 3.3; expand fixture corpus on every reported bug; ship known-issue list. |
| VS Code Marketplace publishing rejected (missing fields, naming conflict) | L | M | Submit early in Sprint 3.2; resolve any blockers immediately. |
| Cloudflare Worker cost spirals beyond free tier | L | M | Rate limit + per-version Worker isolation; estimated < 100k req/day. Paid plan ($5/mo) covers 10M req. |
| Playground bundle size > 10 MB compressed | M | M | Pre-bundled stdlib + wrappers might push beyond budget; if so, lazy-load wrappers on first import in playground. |
| TextMate grammar regressions vs VS Code TS highlighting (users expect parity) | M | L | Iterate from prototype's existing grammar; user-reported issues in Stage 6 beta. |
| Migration tool emits broken code on real TS projects (5k-LOC corpus passes, real projects don't) | H | M | Sprint 3.3 corpus is hand-selected easy cases; document migration tool as "best-effort, manual review required"; collect real-project failures during beta. |
| LSP M2 (rename, references, code-action) does not ship | M | M | Tier-2 from the start. v1.0 ships M1; docs say "renaming is text-find-and-replace at v1.0, semantic rename in v1.1". |

## API Contract

This stage **consumes** the Stage-1 compiler API (`typeAt`, `symbolAt`, `diagnosticsFor`, `compile`, `parseTypeDecl`).

This stage **produces**:

1. **LSP wire protocol** — standard LSP; client of `vscode-languageserver`. M1 methods per the exit criteria above. Consumed by the VS Code extension and any LSP-aware editor (Neovim, Helix, Sublime, Zed, Emacs).

2. **`@superjs/runtime/inspect`** — runtime helper attaching `util.inspect.custom` symbol on sum-type values; consumed by user-built apps via the compiler's inlined helper insertion. Stage 5's build plugins must include this helper in user bundles.

3. **Linter plugin API** (`@beta`) — TypeScript interface documented in `docs/lint-plugin-api.md`. Not semver-stable until v2.0.

4. **VS Code extension API surface** — settings (`superjs.lsp.memoryBudgetMB`, `superjs.format.onSave`), command palette commands, contributed file extensions (`.sjs`, `.d.sjs`).

5. **Playground URL contract** — `https://play.superjs.dev/?v=<version>&c=<base64>` is the canonical share format; consumed by docs (tour lessons embed playground URLs).

## Dependencies

- **Requires Stage 1:** `typeAt`, `symbolAt`, `diagnosticsFor` from `@superjs/compiler` (the LSP cannot start without these).
- **Requires Stage 0:** `spec/diagnostics.schema.json` (extension parses LSP `publishDiagnostics` payloads against it).
- **Parallel with Stages 2 + 4** — none of those produce outputs this stage depends on. The playground bundles Stage 4's stdlib output **when it exists** — if Stage 4 finishes late, the playground ships with a placeholder stdlib and updates on Stage 4 completion.
- **Unlocks Stage 6** — docs (tour lessons embed playground URLs); "Why SJS" page shows VS Code screenshots; migration guide assumes the migration tool exists.
