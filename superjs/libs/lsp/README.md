# @superjs/lsp

The SuperJS Language Server (Stage 3, M1). A standard
[LSP](https://microsoft.github.io/language-server-protocol/) server over JSON-RPC
that backs the VS Code extension and any LSP-aware editor (Neovim, Helix, Zed, …).

It wraps `@superjs/compiler`'s session API (`setFile` / `removeFile` /
`diagnosticsFor` / `typeAt` / `symbolAt`) and speaks the wire protocol.

## Status — M1 slice 1

Implemented: lifecycle (`initialize`, `initialized`, `shutdown`, `exit`), full
text sync (`textDocument/didOpen` / `didChange` / `didClose`), and live
`textDocument/publishDiagnostics`.

Following slices add `hover`, `definition`, `completion`, `signatureHelp`,
`documentSymbol`, `foldingRange`, and `semanticTokens/full`, plus the memory
budget (M6). See `specs/roadmap/stage-3-dx-tools.md`.
