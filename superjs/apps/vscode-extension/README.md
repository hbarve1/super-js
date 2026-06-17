# SuperJS Syntax Highlighting

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/hbarve1.superjs-syntax?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=hbarve1.superjs-syntax)
[![Open VSX](https://img.shields.io/open-vsx/v/hbarve1/superjs-syntax?label=Open%20VSX)](https://open-vsx.org/extension/hbarve1/superjs-syntax)

> **Note:** Theme screenshots will be added after the first VS Code Extension Development Host smoke test. See [Known Limitations](#known-limitations) for current v0.1 status.

Syntax highlighting, snippets, and full language-server support for
[SuperJS](https://github.com/hbarve1/super-js) (`.sjs`) files in Visual Studio Code.

## Language server

The extension launches the SuperJS language server (`superjs lsp`) and connects
it as an LSP client, so the compiler powers the editor directly:

- diagnostics, hover types, and go-to-definition
- completion, signature help, and inlay type hints
- document outline, folding, and semantic-token highlighting
- formatting, rename, find-all-references, and quick-fix code actions

It looks for `superjs` on your `PATH`; set `superjs.server.path` to point at a
specific binary, and `superjs.lsp.memoryBudgetMB` to size the server's cache.
The **SuperJS: Restart Language Server** command reloads it. (Install the CLI
with `npm install -g @superjsorg/cli`.)

## Features

- **Sum type declarations** — `type Result<T, E> = Ok(T) | Err(E)` with full variant coloring
- **`match` expressions** — keyword highlighting, match arms, `default` arm, destructuring patterns
- **Nullable types** — `T?` suffix operator highlighted as `keyword.operator.optional`
- **`dynamic` keyword** — type-position `dynamic` highlighted as `support.type.dynamic`
- **Variant constructors** — `Ok(42)`, `Err("x")`, `None` in value position
- **Generic constraints** — `<T: Comparable<T>>` with constraint operator
- **Banned keywords** — `any`, `namespace`, `enum` visually de-emphasized as `invalid.deprecated`
- **Full TypeScript/JSX inheritance** — everything else (classes, async/await, JSX, imports, template literals) reuses VS Code's built-in TypeScript grammar
- **Snippets** — 13 high-leverage snippets for common SJS patterns (see below)
- **Config schema** — `superjs.config.json` gets JSON validation
- **Bracket matching** — `{}`, `[]`, `()`; `<>` is available as a surrounding pair (select + press `<`) but excluded from bracket-match to avoid false positives with comparison operators
- **Comment toggling** — `//` and `/* */`

## Snippets

| Trigger | Description |
|---------|-------------|
| `match` | Match expression with two arms and default |
| `matchres` | Match a `Result<T, E>` |
| `matchopt` | Match an `Option<T>` or nullable |
| `type` | Sum type (algebraic data type) declaration |
| `typeu` | Unit-variant sum type (enum-like) |
| `result` | Function returning `Result<T, E>` |
| `okret` | Return `Ok(value)` |
| `errret` | Return `Err(message)` |
| `iface` | Interface declaration |
| `fnopt` | Function returning `T?` (nullable) |
| `genc` | Generic function with type constraint |
| `dyn` | Function using `dynamic` type |
| `asyncres` | Async function returning `Promise<Result<T, E>>` |

## Emmet inside JSX

Add this to your VS Code user settings to enable Emmet in `.sjs` JSX files:

```json
"emmet.includeLanguages": {
  "superjs": "javascriptreact"
}
```

## File Icon

The custom `.sjs` file icon is visible when using VS Code's built-in **Seti** icon theme, or when no icon theme is active.

> **Note:** Popular icon themes (Material Icon Theme, vscode-icons) will override with their own icons. SJS support for these themes is planned for v0.2.

## Known Limitations

- **TextMate coloring heuristics** — without the language server running, `new MyClass()` and `class Foo extends Bar {}` color the class as a variant constructor (PascalCase heuristic), and generic constraints past the first parameter (`<T: A, U: B>`) aren't fully colored. The language server's semantic tokens supersede these heuristics when active.
- **Material Icon Theme** — overrides the custom file icon. A PR to [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme) is tracked for v0.2.

## Roadmap

Phase 1 shipped syntax highlighting; Phase 2 (this release) adds the language
server — diagnostics, hover, completion, navigation, formatting, and code
actions. See the [SuperJS production roadmap](https://github.com/hbarve1/super-js/tree/main/specs/roadmap).

## Contributing

This extension lives inside the [super-js monorepo](https://github.com/hbarve1/super-js) at `superjs/apps/vscode-extension/` (a standalone npm package — own lockfile, outside the pnpm workspace).

Tests (grammar snapshots + server-command unit): `cd superjs/apps/vscode-extension && npm test`
Add a failing fixture: create `test/fixtures/NN-description.sjs`, run `UPDATE_SNAPSHOTS=1 npm test`, verify the snapshot, commit.

## License

MIT. This extension uses the VS Code TypeScript grammar by reference (via `source.tsx` scope inclusion). The TypeScript grammar itself is not distributed in this VSIX.
