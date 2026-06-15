# SuperJS (SJS)

SuperJS is a new programming language that compiles to JavaScript. It is a strict superset of JavaScript — every valid `.js` file is also valid `.sjs` — extended with a sound, Go-inspired type system, first-class null safety, algebraic sum types, match expressions, and JSX support with no configuration required.

SuperJS is **not** TypeScript with a different extension. It deliberately bans the parts of TypeScript that make type systems unsound (`any`, mapped types, conditional types, `infer`) and replaces them with simpler, safer constructs.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Tests](https://img.shields.io/badge/tests-1011%20passing-brightgreen.svg)](#)
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

SJS emits structured diagnostic codes. Full registry: [`specs/error-codes.md`](specs/error-codes.md). Per-code fix guidance: [`specs/error-codes/`](specs/error-codes/).

| Series | Range | Purpose |
|--------|-------|---------|
| `SJS-E` | E001–E019 | Hard type errors — compilation halts |
| `SJS-W` | W001–W010 | Warnings — configurable as errors via `--strict` |
| `SJS-L` | L001–L005 | Lint rules — off by default in `--loose` mode |
| `SJS-P` | P001–P099 | Parser errors — always fatal |

---

## Repo Structure

```
super-js/
├── backends/
│   ├── prototype/       # Active reference compiler — TypeScript, 1011 tests (Stage 1)
│   └── llvm/            # Future: LLVM native backend (C++/LLVM 17) — see v2.0 vision
├── compiler/            # Earlier standalone JS compiler exploration — not in workspaces/CI
├── examples/            # .sjs demo files with reading order
├── packages/
│   ├── compiler-types/  # @superjs/compiler-types — shared AST/Diagnostic types
│   └── stdlib/          # @superjs/stdlib — placeholder, planned Stage 4
├── specs/               # Formal spec: grammar, error codes, language docs, ADRs, roadmap
├── docs/                # HOWTO guides + language comparisons (docs/comparisons/)
├── rfcs/                # RFC-NNNN-title.md proposals
├── tools/               # AST graph tooling
├── vscode-extension/    # VS Code extension
└── website/             # Next.js documentation site + playground
```

> **Forward direction:** the next major step is a fresh NX monorepo rewrite in
> TypeScript (see [`ADR-008`](specs/design/ADR-008-nx-monorepo.md)). The current
> tree is frozen as reference — `backends/prototype` is the working compiler;
> `compiler/` is an earlier exploration kept for history, not built or tested.

---

## Roadmap

| Stage | Status | Goal |
|-------|--------|------|
| 0 — Foundations | **Complete** | Monorepo, shared types, grammar spec, error codes, CI, RFCs 0001–0005 |
| 1 — Compiler Core | **In progress** | Production parser, full type checker, deterministic codegen, LSP API |
| 2 — Interop | Planned | `.d.ts` consumption, npm package wrappers, `tsconfig.json` paths |
| 3 — DX Tools | Planned | Formatter, linter (17 rules), VS Code extension, watch mode |
| 4 — Stdlib | Planned | `@superjs/stdlib` — Result, Option, Iterator, collections |
| 5 — Ecosystem | Planned | React wrapper, Node.js types, Jest transform, Vite plugin |
| 6 — Stability | Planned | 1.0 semver, migration guide, public docs, community open |

Full per-stage plans: [`specs/roadmap/`](specs/roadmap/)

**Version vision:**

| Doc | Scope |
|-----|-------|
| [`v1.0-product-vision.md`](specs/roadmap/v1.0-product-vision.md) | Full working SJS — compiler, CLI, interop, stdlib, tooling, `superjs doc` |
| [`v2.0-native-compiler.md`](specs/roadmap/v2.0-native-compiler.md) | Self-hosted compiler — JS, LLVM native binaries, and WASM targets via SJS-IR |

---

## Documentation

| Resource | Purpose |
|----------|---------|
| [`specs/`](specs/) | Formal language spec — grammar, error codes, type rules |
| [`docs/`](docs/) | HOWTO guides — add a diagnostic, add a type-checker rule, add a language feature |
| [`docs/comparisons/`](docs/comparisons/) | SJS vs JS, TypeScript, Rust, Go, Dart, JVM languages |
| [`specs/design/`](specs/design/) | Architecture Decision Records (ADRs) |
| [`rfcs/`](rfcs/) | Language change proposals |
| [`website/`](website/) | Public docs site |

---

## License

GPL-3.0-or-later — see [LICENSE](./LICENSE).
