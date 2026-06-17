# @superjs/lsp

The SuperJS Language Server (Stage 3, M1). A standard
[LSP](https://microsoft.github.io/language-server-protocol/) server over JSON-RPC
that backs the VS Code extension and any LSP-aware editor (Neovim, Helix, Zed, …).

It wraps `@superjs/compiler`'s session API (`setFile` / `removeFile` /
`diagnosticsFor` / `typeAt` / `symbolAt`) and speaks the wire protocol.

## Status — M1 complete

All nine M1 methods implemented:
- lifecycle (`initialize`, `initialized`, `shutdown`, `exit`)
- full text sync (`textDocument/didOpen` / `didChange` / `didClose`)
- live `textDocument/publishDiagnostics`
- `textDocument/hover` (type under the cursor) and `textDocument/definition`
  (go-to-declaration), backed by the compiler's `typeAt` / `symbolAt`.
- `textDocument/documentSymbol` (outline) and `textDocument/foldingRange`,
  computed from the parsed AST.
- `textDocument/completion` (MVP: local declarations + keywords + primitive
  types; scope-aware filtering and member completion are later work).
- `textDocument/signatureHelp` — the callee signature and active argument when
  the cursor is inside a call.
- `textDocument/semanticTokens/full` — lexer-driven token classification
  (keyword / string / number / variable; richer binder-aware classes later).
- `textDocument/formatting` — a whole-document edit via the compiler's safe
  `format()` (no edits when already canonical).

M2 navigation (complete):
- `textDocument/references`, `textDocument/documentHighlight`, and
  `textDocument/rename` — name-based occurrence matching within a single
  document (the v1.0 rename model). Cross-file and scope-precise resolution
  are later work once the LSP shares the checker's binder.
- `textDocument/codeAction` — quick fixes drawn from lint findings that carry
  an auto-fix (e.g. `var` → `let`, remove `debugger`), as `quickfix` actions
  with a WorkspaceEdit.
- `textDocument/inlayHint` — inferred-type hints after un-annotated `const` /
  `let` bindings (variable hints only at MVP).

Memory budget (M6): the source/AST cache is bounded by a byte budget
(`lsp.memoryBudgetMB`, default 128 MB, set via `initializationOptions`).
When the cache exceeds it, the least-recently-touched document is evicted
(re-added on the next edit), so a long editing session over many files does
not grow without bound. Byte size is estimated from source length; true
heap measurement and an over-budget client diagnostic are later work.

The `superjs lsp` CLI command is wired to `serveStdio`. Next: the VS Code
extension (Sprint 3.2) consuming this binary. See
`specs/roadmap/stage-3-dx-tools.md`.
