# CLI Interface Contract: `superjs`

**Branch**: `001-superjs-core-language` | **Date**: 2026-05-26

The `superjs` binary is the single entry point for all Super.js toolchain operations.

---

## Global Options

```
superjs [--version | -v] [--help | -h]
```

| Flag | Description |
|------|-------------|
| `--version`, `-v` | Print `superjs x.y.z` and exit |
| `--help`, `-h` | Print usage summary and exit |

---

## `superjs build`

Compile one or more `.sjs` files to JavaScript.

```
superjs build [options]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--source <file>` | path | — | Single `.sjs` file to compile |
| `--dir <directory>` | path | — | Compile all `.sjs` files in directory recursively |
| `--outDir <dir>` | path | `dist/` | Output directory |
| `--target <version>` | `es5\|es2015\|es2022` | `es2022` | Output ECMAScript version |
| `--watch`, `-w` | flag | false | Watch mode — recompile on file changes |
| `--incremental` | flag | false | Use `superjs.buildinfo` cache |
| `--sourcemap` | flag | false | Emit `.js.map` sourcemap files |
| `--strict` | flag | false | Disallow implicit `any` |
| `--json` | flag | false | Emit diagnostics as JSON to stdout |
| `--noEmit` | flag | false | Type-check only; do not write output files |
| `--config <file>` | path | `superjs.config.json` | Path to config file |

**Exit codes**:
- `0` — Success (no errors)
- `1` — Compilation errors (diagnostics with severity `error`)
- `2` — Invalid CLI arguments
- `3` — Internal compiler error

**Stdout** (normal mode): Per-file progress and diagnostic messages in human-readable format.
**Stdout** (--json mode): One JSON object per line, each conforming to the `Diagnostic` schema.
**Stderr**: Used only for internal/unexpected errors.

---

## `superjs format`

Format `.sjs` files in-place according to the Super.js style guide.

```
superjs format [options] [file...]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[file...]` | paths | `**/*.sjs` | Files or glob patterns to format |
| `--check` | flag | false | Dry-run: exit 1 if any files need formatting |
| `--config <file>` | path | `superjs.config.json` | Path to config file |

**Exit codes**: `0` = formatted or already formatted; `1` = `--check` found unformatted files; `2` = argument error.

---

## `superjs lint`

Check `.sjs` files for lint rule violations.

```
superjs lint [options] [file...]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[file...]` | paths | `**/*.sjs` | Files or glob patterns to lint |
| `--fix` | flag | false | Auto-fix fixable violations |
| `--rule <rule-id>` | string | — | Check only this specific rule |
| `--config <file>` | path | `superjs.config.json` | Path to config file |
| `--json` | flag | false | Emit diagnostics as JSON |

**Exit codes**: `0` = no violations; `1` = violations found; `2` = argument error.

---

## `superjs test`

Discover and run test files.

```
superjs test [options] [pattern]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `[pattern]` | glob | `**/*.test.sjs,**/*.spec.sjs` | Test file glob pattern |
| `--watch`, `-w` | flag | false | Re-run tests on file changes |
| `--coverage` | flag | false | Collect and report code coverage |
| `--timeout <ms>` | number | `5000` | Per-test timeout in milliseconds |
| `--json` | flag | false | Emit results as JSON (TAP-compatible) |

**Exit codes**: `0` = all pass; `1` = test failures; `2` = argument error; `3` = internal error.

---

## Diagnostic Output Format (human-readable)

```
error[SJS-E001]: I expected a value of type `number` but found `string`
  --> src/app.sjs:42:14
   |
42 |   let x: number = "hello"
   |                   ^^^^^^^ string is not assignable to number
   |
   = help: Change the value to a number, or change the type annotation to `string`
   = docs: https://superjs.dev/errors/SJS-E001
```

## Diagnostic Output Format (--json)

Each line is a valid JSON object:
```json
{
  "code": "SJS-E001",
  "severity": "error",
  "message": "I expected a value of type `number` but found `string`",
  "file": "/abs/path/src/app.sjs",
  "line": 42,
  "column": 14,
  "endLine": 42,
  "endColumn": 21,
  "suggestion": {
    "description": "Change the value to a number",
    "replacement": "42"
  },
  "notes": [],
  "docsUrl": "https://superjs.dev/errors/SJS-E001"
}
```
