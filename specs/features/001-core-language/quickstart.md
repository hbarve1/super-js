# Quickstart: Super.js

**Branch**: `001-superjs-core-language` | **Date**: 2026-05-26 | **Status**: ✅ Implemented

---

## Prerequisites

- Node.js 14 or higher
- npm 6 or higher

---

## Installation

```bash
npm install -g superjs
```

Verify the installation:

```bash
superjs --version
# superjs 0.1.0
```

---

## Your First Super.js File

Create a file `hello.sjs`:

```js
// hello.sjs
let message: string = "Hello from Super.js!"
console.log(message)
```

Compile it:

```bash
superjs build --source hello.sjs --outDir dist
```

Run the output:

```bash
node dist/hello.js
# Hello from Super.js!
```

---

## Type Safety in Action

Super.js catches type errors at compile time:

```js
// typed.sjs
let count: number = 42
count = "not a number"   // ← type error
```

```bash
superjs build --source typed.sjs --outDir dist
```

Output:
```
error[SJS-E001]: I expected a value of type `number` but found `string`
  --> typed.sjs:2:9
   |
 2 | count = "not a number"
   |         ^^^^^^^^^^^^^^ string is not assignable to number
   |
   = help: Change the value to a number, or update the annotation to `string`
   = docs: https://superjs.dev/errors/SJS-E001
```

---

## Gradual Typing

You don't have to annotate everything. Unannotated code is still valid:

```js
// gradual.sjs — valid, zero annotations required
function greet(name) {
  return "Hello, " + name
}

console.log(greet("World"))
```

Add annotations incrementally as you grow confidence:

```js
function greet(name: string): string {
  return "Hello, " + name
}
```

---

## JSX Support

```jsx
// App.sjs
function Button({ label }: { label: string }) {
  return <button>{label}</button>
}
```

Add a `superjs.config.json` to configure JSX:

```json
{
  "target": "es2022",
  "jsxFactory": "React.createElement",
  "jsxFragment": "React.Fragment",
  "outDir": "dist"
}
```

Compile:

```bash
superjs build --source App.sjs
```

---

## Project-Level Compilation

Compile an entire directory:

```bash
superjs build --dir src --outDir dist
```

Or configure a `superjs.config.json` at the project root and run:

```bash
superjs build
```

---

## Watch Mode

Automatically recompile on changes:

```bash
superjs build --watch --dir src --outDir dist
```

Changes to any `.sjs` file trigger incremental recompilation of only the changed file and its dependents.

---

## Formatting

Format all `.sjs` files in the current directory:

```bash
superjs format
```

Check formatting without modifying files (useful in CI):

```bash
superjs format --check
```

---

## Linting

Lint all `.sjs` files:

```bash
superjs lint
```

Auto-fix fixable violations:

```bash
superjs lint --fix
```

---

## Testing

Write test files with the `.test.sjs` or `.spec.sjs` suffix:

```js
// math.test.sjs
import { add } from "./math.sjs"

test("adds two numbers", () => {
  expect(add(1, 2)).toBe(3)
})
```

Run all tests:

```bash
superjs test
```

---

## Strict Mode

Enable strict mode to warn on unannotated positions (like TypeScript's `--noImplicitAny`):

```bash
superjs build --strict --source app.sjs
```

```
warning[SJS-W001]: 'count' implicitly has type 'any' because it lacks a type annotation.
```

---

## Type-Check Only (no output)

Run the type checker without writing any `.js` files:

```bash
superjs build --no-emit --source app.sjs
```

---

## JSON Diagnostics

Emit diagnostics as SARIF-compatible ndjson (one object per line) for CI tooling:

```bash
superjs build --json --source app.sjs
# {"code":"SJS-E001","severity":"error","message":"...","line":3,"column":10,...}
```

---

## Next Steps

- Read the [language specification](../../docs/) for the full type system reference
- See [examples/](../../prototype/examples/) for real-world `.sjs` programs
- Check the [Diagnostic Code Reference](../../docs/docs/language-reference.md#diagnostic-code-reference) for all SJS-E/W/L codes
