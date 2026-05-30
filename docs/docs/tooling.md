---
sidebar_position: 5
---

# Tooling

SuperJS ships a unified CLI that covers every stage of the development workflow: compilation, linting, formatting, and testing. There are no separate packages to install or plugins to configure.

## Installation

SuperJS is currently built from source:

```bash
git clone https://github.com/hbarve1/super-js.git
cd super-js/prototype
npm install
npm run build
npm link
```

After `npm link`, the `superjs` command is available globally.

## CLI Reference

### `superjs build`

Compiles `.sjs` files to JavaScript.

```bash
superjs build --source <file>
superjs build --dir <dir> [--outDir <dir>]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--source <file>` | Compile a single `.sjs` file |
| `--dir <dir>` | Compile all `.sjs` files in a directory |
| `--outDir <dir>` | Output directory (default: `./dist`) |
| `--target <version>` | JS target version (see below) |
| `--watch` | Watch mode — recompile on file change |
| `--strict` | Enable strict mode (SJS-W001 implicit-any warnings) |
| `--no-emit` | Type-check only, no output files written |
| `--sourcemap` | Emit `.js.map` source maps alongside output |
| `--json` | Output diagnostics as ndjson (one JSON object per line) |

**Supported `--target` values:**

`es5`, `es2015`, `es2016`, `es2017`, `es2018`, `es2019`, `es2020`, `es2021`, `es2022` (default)

**Examples:**

```bash
# Compile a single file
superjs build --source src/main.sjs

# Compile a directory to ./dist
superjs build --dir src --outDir dist

# Type-check without emitting output
superjs build --dir src --no-emit

# Watch mode with source maps
superjs build --dir src --outDir dist --watch --sourcemap

# Compile to ES2019 with strict mode
superjs build --dir src --target es2019 --strict

# Machine-readable diagnostics
superjs build --dir src --json
```

### `superjs lint`

Runs the SJS linter against your source files.

```bash
superjs lint --source <file>
superjs lint --dir <dir> [--fix] [--json]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--source <file>` | Lint a single `.sjs` file |
| `--dir <dir>` | Lint all `.sjs` files in a directory |
| `--fix` | Auto-fix fixable issues in place |
| `--json` | Output diagnostics as ndjson |

**Examples:**

```bash
# Lint all files in src/
superjs lint --dir src

# Auto-fix fixable issues
superjs lint --dir src --fix

# Lint a single file with JSON output
superjs lint --source src/main.sjs --json
```

### `superjs format`

Formats `.sjs` source files using the built-in formatter.

```bash
superjs format --source <file>
superjs format --dir <dir> [--check]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--source <file>` | Format a single `.sjs` file |
| `--dir <dir>` | Format all `.sjs` files in a directory |
| `--check` | Check formatting only — exit non-zero if any file would change |

**Examples:**

```bash
# Format all files in src/
superjs format --dir src

# Check formatting in CI (no writes)
superjs format --dir src --check
```

### `superjs test`

Runs the test suite for your SJS project.

```bash
superjs test [--source <file>] [--watch] [--coverage]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--source <file>` | Run a specific test file |
| `--watch` | Watch mode — re-run tests on file change |
| `--coverage` | Collect and report coverage |

**Examples:**

```bash
# Run all tests
superjs test

# Run a specific test file
superjs test --source tests/typecheck.test.sjs

# Watch mode during development
superjs test --watch

# Run with coverage report
superjs test --coverage
```

## Project Configuration

SuperJS looks for a `superjs.config.json` file in the project root. All fields are optional and have defaults.

```json
{
  "target": "es2022",
  "outDir": "./dist",
  "jsxFactory": "React.createElement",
  "jsxFragment": "React.Fragment",
  "strict": false
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `target` | string | `"es2022"` | JavaScript output target version |
| `outDir` | string | `"./dist"` | Output directory for compiled files |
| `jsxFactory` | string | `"React.createElement"` | JSX factory function |
| `jsxFragment` | string | `"React.Fragment"` | JSX fragment component |
| `strict` | boolean | `false` | Enable strict mode (SJS-W001 warnings) |

**CLI flags always override config file values.**

## Error Output

### Terminal Output (default)

By default, `superjs build` and `superjs lint` print colored diagnostics to the terminal:

```
error SJS-E001  src/main.sjs:12:5
  Null/undefined assigned to non-nullable type 'string'.

warning SJS-W001  src/utils.sjs:8:10
  Implicit 'any' type — use '--strict' to enforce annotations.
```

Each diagnostic includes:
- Severity (`error` / `warning`)
- Diagnostic code (e.g., `SJS-E001`)
- File path and line/column position
- Human-readable message

### JSON / ndjson Mode (`--json`)

Pass `--json` to receive one JSON object per line (ndjson), suitable for editor integrations, CI pipelines, and automated tooling:

```jsonl
{"severity":"error","code":"SJS-E001","file":"src/main.sjs","line":12,"col":5,"message":"Null/undefined assigned to non-nullable type 'string'."}
{"severity":"warning","code":"SJS-W001","file":"src/utils.sjs","line":8,"col":10,"message":"Implicit 'any' type."}
```

## Diagnostic Codes

| Code | Severity | Description |
|------|----------|-------------|
| SJS-E001 | error | Null or undefined assigned to a non-nullable type |
| SJS-E002 | error | Type mismatch on assignment or return |
| SJS-W001 | warning | Implicit `any` type (strict mode only, `--strict`) |
| SJS-E007 | error | Non-exhaustive match — a sum type variant is not handled |

### SJS-E001 — Null Safety

SJS types are non-nullable by default. Use `T?` to declare a nullable type:

```sjs
// error: 'string' is not nullable
const name: string = null  // SJS-E001

// correct: use T? for nullable
const name: string? = null
```

### SJS-E002 — Type Mismatch

```sjs
const count: number = "hello"  // SJS-E002: expected number, got string
```

### SJS-W001 — Implicit Any (strict mode)

```sjs
// with --strict, this emits SJS-W001
function process(data) {
  return data
}

// fix: annotate the parameter
function process(data: string): string {
  return data
}
```

### SJS-E007 — Non-Exhaustive Match

```sjs
type Status = Active | Inactive | Pending

const s: Status = Active

// SJS-E007: 'Pending' variant not handled
const label = match s {
  Active   => "active",
  Inactive => "inactive",
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — no errors |
| `1` | One or more errors found |
| `2` | CLI usage error (bad flags, missing arguments) |
