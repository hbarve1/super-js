# SuperJS (SJS)

SuperJS is a new programming language that compiles to JavaScript. It is a strict superset of JavaScript — every valid `.js` file is also valid `.sjs` — extended with a sound, Go-inspired type system, first-class null safety, algebraic sum types, match expressions, and JSX support with no configuration required.

SuperJS is **not** TypeScript with a different extension. It deliberately bans the parts of TypeScript that make type systems unsound (`any`, mapped types, conditional types, `infer`) and replaces them with simpler, safer constructs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-202%20passing-brightgreen.svg)](#)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](#roadmap)

---

## Key Features

- **Strict superset of JavaScript** — valid JS is valid SJS, no migration cliff
- **Sound null safety** — types are non-nullable by default; `T?` is the explicit nullable form
- **Sum types and match expressions** — algebraic variants with exhaustiveness checking
- **Go-style structural interfaces** — implicit satisfaction, no `implements` boilerplate
- **Gradual static typing** — annotate where you want guarantees; untyped code still runs
- **`dynamic` instead of `any`** — runtime-checked, not a soundness hole
- **JSX on by default** — no plugin or config required
- **Unified CLI** — `superjs build | lint | format | test`

---

## What SJS Bans (by design)

| Banned | Reason | SJS Alternative |
|--------|--------|-----------------|
| `any` | Soundness hole | `dynamic` (runtime-checked) |
| Mapped types `{ [K in keyof T]: ... }` | Complexity without safety | Structural interfaces |
| Conditional types `T extends U ? A : B` | Unpredictable | Sum types |
| Template literal types | Complexity | — |
| `infer`, `namespace`, TS-style `enum` | Complexity | Explicit constructs |
| Intersection types `A & B` | Hidden unsoundness | Interface composition |
| `!` non-null assertion | Bypasses null safety | Narrowing |

---

## Quick Start

SJS 0.1.0 is a prototype — install from source:

```bash
git clone https://github.com/hbarve1/super-js.git
cd super-js/backends/prototype
npm install
npm run build
npm link          # makes `superjs` available globally
```

Verify:

```bash
superjs build --source examples/basics/hello-world.sjs
```

---

## Example Code

### Hello World

```sjs
// hello-world.sjs
const message: string = "Hello, World!"
console.log(message)

function greet(name: string): string {
  return `Hello, ${name}!`
}

console.log(greet("SuperJS"))
```

### Null Safety

```sjs
function findUser(id: number): string? {
  if (id === 1) return "Alice"
  return null
}

const name = findUser(42)
const display = name ?? "Unknown"   // type-checked: name is string?
console.log(display)
```

### Sum Types and Match

```sjs
type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

const result = divide(10, 2)
const msg = match result {
  Ok(val) => `Result: ${val}`,
  Err(e)  => `Error: ${e}`,
}
console.log(msg)
```

### Generics and Structural Interfaces

```sjs
interface Comparable<T> {
  compareTo(other: T): number
}

class Stack<T> {
  private items: T[] = []
  push(item: T): void { this.items.push(item) }
  pop(): T? { return this.items.pop() ?? null }
  get size(): number { return this.items.length }
}
```

---

## CLI Reference

```
superjs build  --source <file> | --dir <dir>  [--outDir <dir>] [--target <ver>]
               [--watch] [--strict] [--no-emit] [--sourcemap] [--json]

superjs lint   --source <file> | --dir <dir>  [--fix] [--json]

superjs format --source <file> | --dir <dir>  [--check]

superjs test   [--source <file>] [--watch] [--coverage]
```

### Config file: `superjs.config.json`

```json
{
  "target": "es2022",
  "outDir": "./dist",
  "jsxFactory": "React.createElement",
  "strict": false
}
```

---

## Diagnostic Codes

| Code | Severity | Meaning |
|------|----------|---------|
| SJS-E001 | Error | Null assigned to non-nullable type |
| SJS-E002 | Error | Type mismatch on assignment |
| SJS-E007 | Error | Non-exhaustive match (missing sum type variant) |
| SJS-W001 | Warning | Implicit `dynamic` (strict mode only) |

---

## Repo Structure

```
super-js/
├── backends/
│   ├── prototype/       # Babel-based compiler + tools (reference impl, active)
│   │   ├── src/
│   │   │   ├── compiler/    # Babel pipeline
│   │   │   ├── preprocessor/# SJS-specific syntax transforms
│   │   │   ├── typeChecker/ # Static type checker
│   │   │   ├── linter/
│   │   │   ├── formatter/
│   │   │   └── tester/
│   │   └── tests/       # 202 passing tests
│   └── llvm/            # Future: LLVM native backend (C++/LLVM 17)
├── compiler/            # Plain-JS correctness-check compiler (validates vs prototype)
├── examples/            # .sjs demo files
├── packages/            # npm packages (@superjs/stdlib, etc.)
├── specs/               # Formal spec — grammar.ebnf, error codes, language docs
├── rfcs/                # RFC-NNNN-title.md proposals
├── tools/               # VS Code extension, playground, etc.
└── website/             # Next.js documentation site
```

---

## Roadmap

| Phase | Version | Status | Description |
|-------|---------|--------|-------------|
| 1 | 0.1.0 | **Complete** | Babel prototype — TypeChecker + Preprocessor + Babel transforms |
| 2 | 1.0.0 | In progress | Custom JS compiler — recursive descent, zero external deps |
| 3 | 2.0.0 | Planned | LLVM native backend — C++17 + LLVM, <50ms compile target |

---

## Documentation

Full documentation is available at the [docs site](./website).

---

## License

MIT
