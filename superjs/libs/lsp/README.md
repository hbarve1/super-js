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

Next: the memory budget + `SJS-W010` over-budget behaviour (M6), the M2
methods (rename, references, code actions, inlay hints), and wiring the
`superjs lsp` CLI command to `serveStdio` with the VS Code extension
(Sprint 3.2). See `specs/roadmap/stage-3-dx-tools.md`.
