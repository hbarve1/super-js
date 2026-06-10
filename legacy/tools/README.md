# tools/

Developer tooling built on top of the SJS compiler.

| Tool | Stage | Status |
|------|-------|--------|
| VS Code extension | Stage 3 | Planned — see `specs/features/004-vscode-extension/` |
| Playground | Stage 5 | Planned — browser-based REPL at `website/` |

Tools in this directory share no runtime code with the compiler. They consume the compiler's public API and the LSP server output.

Build: `npm run build --workspace=tools/<name>` (once implemented).
