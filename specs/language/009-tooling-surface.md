# Tooling Surface (B8)

Semantics of the SuperJS developer-tooling surface: the language server's
methods, the linter's rules, and the formatter's invariants. This consolidates
the contracts the CLI, LSP, and editor integrations depend on.

## Language server (`@superjs/lsp`, `superjs lsp`)

A standard LSP server over stdio. Each server owns an isolated compiler session;
text-sync notifications drive that session and republish diagnostics.

### M1 methods

| Method | Semantics |
|--------|-----------|
| `initialize` / `initialized` / `shutdown` / `exit` | Lifecycle. `exit` returns code 0 only if `shutdown` preceded it. |
| `textDocument/didOpen` / `didChange` / `didClose` | Full-document text sync; each edit re-checks and republishes diagnostics. `didClose` clears them. |
| `textDocument/publishDiagnostics` | Compiler diagnostics, with SJS spans (1-based line) mapped to LSP ranges (0-based) and severities to `DiagnosticSeverity`. |
| `textDocument/hover` | Type under the cursor, rendered via the checker's `display`, as a `sjs` markdown block. |
| `textDocument/definition` | Declaration site of the identifier under the cursor (in-file). |
| `textDocument/documentSymbol` | Outline of top-level declarations with `SymbolKind`; full decl as `range`, identifier as `selectionRange`. |
| `textDocument/foldingRange` | Every top-level declaration spanning more than one line. |
| `textDocument/completion` | Local declarations + keywords + primitive type names (position-insensitive at MVP). |
| `textDocument/signatureHelp` | Callee signature + active parameter (top-level comma count) when inside a call. |
| `textDocument/semanticTokens/full` | Lexer-driven token classification (keyword / string / number / variable). |
| `textDocument/formatting` | A whole-document edit via the safe formatter, or no edits when already canonical. |

### M2 methods

| Method | Semantics |
|--------|-----------|
| `textDocument/references` | Every same-name identifier occurrence (single document) as a `Location`. |
| `textDocument/documentHighlight` | The same occurrences as `Text` highlights. |
| `textDocument/rename` | A `WorkspaceEdit` replacing every occurrence with the new name. |
| `textDocument/codeAction` | Quick fixes drawn from lint findings carrying an auto-fix, as `quickfix` actions. |
| `textDocument/inlayHint` | Inferred-type hints after un-annotated `const`/`let` bindings. |

References / rename match by name within a single document (the v1.0 model);
cross-file and scope-precise resolution are post-v1.0.

### Memory budget (M6)

The source/AST cache is bounded by `lsp.memoryBudgetMB` (default 128 MB; set via
`initializationOptions`). When the cache exceeds the budget, the
least-recently-touched document is evicted (re-added on its next edit), so a long
multi-file session does not grow without bound.

## Linter (`superjs lint`)

17 rules, each emitting a registry diagnostic (`SJS-L*`). `--fix` applies the
auto-fixes that rules declare (right-to-left, skipping overlaps).

| Code | Rule | Notes |
|------|------|-------|
| SJS-L001 | prefer-const | `let` never reassigned. |
| SJS-L002 | no-var | auto-fix → `let`. |
| SJS-L003 | eqeqeq | `==` / `!=`. |
| SJS-L004 | no-for-in | prefer `for…of`. |
| SJS-L005 | no-debugger | auto-fix removes the statement. |
| SJS-L006 | no-empty-match | a `match` with no arms. |
| SJS-L007 | no-redundant-match-arm | a variant handled twice. |
| SJS-L008 | prefer-arrow-callback | anonymous `function` expression as a call argument. |
| SJS-L009 | no-unused-import | import binding referenced nowhere. |
| SJS-L010 | import-order | sources sorted within an import block. |
| SJS-L012 | no-unused-var | non-exported top-level binding referenced nowhere. |
| SJS-L013 | no-explicit-dynamic | explicit `dynamic`; opt out with `// @sjs:dynamic-ok`. |
| SJS-L014 | no-shadowing | binding shadowing an enclosing scope. |
| SJS-L015 | no-floating-promise | `Promise`-typed expression statement (type-aware). |
| SJS-L016 | no-unhandled-result | `Result`-typed expression statement (type-aware). |
| SJS-L017 | prefer-result-over-throw | a `throw` statement (RFC-0004). |
| SJS-L018 | no-mixed-spaces-tabs | mixed leading indentation. |

(`SJS-L011` is a Stage-1 lexer security diagnostic, not a style rule.) The
type-aware rules (L015/L016) run a type-check pass and inspect the synthesized
type at each expression statement; on any checker failure they yield no findings.

`no-non-null-assertion` from earlier plans is **not applicable** — the postfix
`!` non-null assertion is a banned construct in SJS (see `007-banned-features.md`).

## Formatter (`superjs format`)

Invariants:

- **Safe by construction.** The formatter re-parses its own output and only
  rewrites a file when the result is provably the same program (AST-equal,
  ignoring spans). Anything it can't reproduce faithfully is left unchanged.
- **Idempotent.** `format(format(x)) === format(x)` for every input; the second
  pass reports `changed: false`.
- **Whitespace-invariant.** Formatting is stable under input whitespace
  variation (verified by a property test).
- **Fast.** Well under the 50 ms budget on a 1,000-line file.

`.sjsignore` (gitignore-style) excludes files from directory walks across
`format` / `lint` / `check` / `build` / `doc`; explicitly-named files are always
processed. See `specs/design/formatter-integration.md` for the syntax and the
Prettier / Husky coexistence story.
