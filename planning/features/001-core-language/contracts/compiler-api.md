# Compiler API Contract

**Branch**: `001-superjs-core-language` | **Date**: 2026-05-26

The programmatic API exposed by the Super.js compiler package (`superjs` npm package). This allows build tools, editors, and other tooling to invoke the compiler without going through the CLI.

---

## Core API

### `compile(file: string, options?: CompileOptions): CompileResult`

Compile a single `.sjs` file to JavaScript.

**Parameters**:
- `file` — Absolute or project-relative path to the `.sjs` source file
- `options` — Optional compilation options (overrides `superjs.config.json`)

**Returns**: `CompileResult`

```
CompileResult {
  success: boolean               // true if no error-severity diagnostics
  code: string | null            // emitted JavaScript (null if success=false)
  sourcemap: string | null       // JSON sourcemap (null unless sourceMap=true)
  diagnostics: Diagnostic[]      // all errors, warnings, notes
  outputPath: string | null      // absolute path where output was written (null if noEmit=true)
}
```

---

### `compileDir(dir: string, options?: CompileOptions): CompileResult[]`

Compile all `.sjs` files in a directory recursively.

**Returns**: One `CompileResult` per `.sjs` file found.

---

### `typeCheck(file: string, options?: CompileOptions): Diagnostic[]`

Type-check a file without emitting output (equivalent to `--noEmit`).

**Returns**: All diagnostics for the file.

---

### `watch(dir: string, options?: WatchOptions, onChange: (results: CompileResult[]) => void): Watcher`

Start watch mode on a directory. Calls `onChange` with results for all affected files on each change.

**Returns**: `Watcher` with a `.stop()` method to terminate the watcher.

---

### `format(file: string): FormatResult`

Format a `.sjs` file in memory.

```
FormatResult {
  changed: boolean    // true if formatting changed the content
  code: string        // formatted source code
}
```

---

### `lint(file: string, options?: LintOptions): Diagnostic[]`

Lint a `.sjs` file. Returns only lint-rule diagnostics (not type errors).

---

## Option Types

### `CompileOptions`

```
CompileOptions {
  target?:      "es5" | "es2015" | "es2022"   // default: "es2022"
  outDir?:      string                          // default: "dist"
  sourceMap?:   boolean                         // default: false
  strict?:      boolean                         // default: false
  noEmit?:      boolean                         // default: false
  jsxFactory?:  string                          // default: "React.createElement"
  jsxFragment?: string                          // default: "React.Fragment"
}
```

### `WatchOptions`

```
WatchOptions extends CompileOptions {
  debounce?:   number   // ms to debounce rapid file changes (default: 100)
  incremental?: boolean // use buildinfo cache (default: true in watch mode)
}
```

---

## Compiler Pipeline Stages

The compiler exposes each pipeline stage as a separate function for tooling integration:

| Stage | Function | Input | Output |
|-------|----------|-------|--------|
| Lex | `tokenize(source: string)` | source text | `Token[]` |
| Parse | `parse(source: string)` | source text | `ASTNode (Program)` |
| Type Check | `check(ast, scope)` | AST + scope | `Diagnostic[]` |
| Emit | `emit(ast, options)` | type-checked AST | `{ code, sourcemap }` |

Each stage can be invoked independently for tooling (language server, linter, etc.).

---

## Error Codes Reference

| Code | Severity | Description |
|------|----------|-------------|
| `SJS-E001` | error | Type mismatch: expected X, found Y |
| `SJS-E002` | error | Undeclared identifier |
| `SJS-E003` | error | Missing return type for function with explicit annotation |
| `SJS-E004` | error | Circular import detected |
| `SJS-E005` | error | JSX element missing required prop |
| `SJS-E006` | error | Unknown type name |
| `SJS-E007` | error | Cannot assign to const |
| `SJS-W001` | warning | Implicit `any` type (enabled in strict mode) |
| `SJS-W002` | warning | Unused variable |
| `SJS-W003` | warning | Unused import |
| `SJS-W004` | warning | Unreachable code |
| `SJS-L001` | warning | Lint: use `const` instead of `let` where reassignment doesn't occur |
| `SJS-L002` | warning | Lint: prefer arrow functions for anonymous callbacks |
