# Change Log

All notable changes to the SuperJS extension will be documented here.

## [0.2.0] — 2026-06-17

### Added
- **Language-server support.** The extension now launches `superjs lsp` and
  connects it as an LSP client: diagnostics, hover, go-to-definition,
  completion, signature help, inlay hints, document outline, folding, semantic
  tokens, formatting, rename, references, and quick-fix code actions.
- Settings: `superjs.server.path` (binary location) and
  `superjs.lsp.memoryBudgetMB` (server cache budget).
- Command: **SuperJS: Restart Language Server**.

## [0.1.0] — 2026-05-31

### Added
- Syntax highlighting for SuperJS (`.sjs`) files
- Sum type declarations: `type Result<T, E> = Ok(T) | Err(E)`
- `match` expression keyword, arms, `default` arm
- Nullable `T?` suffix operator
- `dynamic` type keyword
- Variant constructors in value position: `Ok(42)`, `None`
- Generic type constraints: `<T: Comparable<T>>`
- Banned keyword de-emphasis: `any`, `namespace`, `enum`
- Full TypeScript/JSX syntax inheritance via `source.tsx`
- 13 code snippets for common SJS patterns
- Language configuration: bracket matching, comment toggling, auto-indent for `match`
- `superjs.config.json` JSON schema validation
- Custom file icons (Seti theme compatible)
- Works on vscode.dev (browser VS Code)
