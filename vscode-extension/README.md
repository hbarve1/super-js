# SuperJS Syntax Highlighting

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/hbarve1.superjs-syntax?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=hbarve1.superjs-syntax)
[![Open VSX](https://img.shields.io/open-vsx/v/hbarve1/superjs-syntax?label=Open%20VSX)](https://open-vsx.org/extension/hbarve1/superjs-syntax)

Syntax highlighting and snippets for [SuperJS](https://github.com/hbarve1/super-js) (`.sjs`) files in Visual Studio Code.

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
- **Bracket matching** — `{}`, `[]`, `()`, `<>`
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

The custom `.sjs` file icon is visible when using VS Code's built-in **Minimal** or **Seti** icon theme, or when no icon theme is active.

> **Note:** Popular icon themes (Material Icon Theme, vscode-icons) will override with their own icons. SJS support for these themes is planned for v0.2.

## Known Limitations

- **`new MyClass()`** — `MyClass` is colored as a variant constructor (PascalCase heuristic). Semantic tokens (LSP phase) will fix this.
- **Class names in `extends`** — `class Foo extends Bar {}` colors `Bar` as a variant. Same fix planned.
- **Generic constraints beyond first parameter** — `<T: A, U: B>` highlights `T: A` but not `U: B` (TextMate grammar limitation). Full support requires the Language Server.
- **Material Icon Theme** — overrides the custom file icon. Open a PR to [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme) is tracked for v0.2.

## Roadmap

Phase 1 (this extension) provides syntax highlighting only. Full IntelliSense, hover types, go-to-definition, diagnostics, and formatter integration are planned for Phase 2 (Language Server Protocol). See the [SuperJS production roadmap](https://github.com/hbarve1/super-js/blob/master/specs/002-production-roadmap/spec.md).

## Contributing

This extension lives inside the [super-js monorepo](https://github.com/hbarve1/super-js) at `vscode-extension/`. See [CONTRIBUTING.md](https://github.com/hbarve1/super-js/blob/master/CONTRIBUTING.md) for development setup.

Grammar tests: `cd vscode-extension && npm test`
Add a failing fixture: create `test/fixtures/NN-description.sjs`, run `UPDATE_SNAPSHOTS=1 npm test`, verify the snapshot, commit.

## License

MIT. This extension uses the VS Code TypeScript grammar by reference (via `source.tsx` scope inclusion). The TypeScript grammar itself is not distributed in this VSIX.
