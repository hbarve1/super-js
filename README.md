# SuperJS (SJS)

SuperJS is a strict, type-safe superset of JavaScript that follows the ECMAScript standard — every valid `.js` file is also valid `.sjs`, with every modern JS feature (ES5 through ES2025) type-checked. It adds a sound, Go-inspired type system, first-class null safety, algebraic sum types, match expressions, and JSX support with no configuration required. It compiles to clean JavaScript today; native binaries and WebAssembly are on the roadmap — one source, every target.

SuperJS is **not** TypeScript with a different extension. It deliberately bans the parts of TypeScript that make type systems unsound (`any`, mapped types, conditional types, `infer`) and replaces them with simpler, safer constructs.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](#roadmap)

---

## Key Features

- **Strict superset of JavaScript** — valid JS is valid SJS, no migration cliff
- **ECMAScript-faithful** — tracks the standard; every feature ES5 through ES2025 is type-checked
- **Sound null safety** — types are non-nullable by default; `T?` is the explicit nullable form
- **Sum types and match expressions** — algebraic variants with exhaustiveness checking
- **Go-style structural object types** — defined with `type X { … }`, implicit satisfaction, no `implements` boilerplate
- **`dynamic` instead of `any`** — runtime-checked, not a soundness hole
- **Gradual static typing** — annotate where you want guarantees; untyped code still runs
- **JSX on by default** — no plugin or config required
- **One source, every target** — compiles to clean JS today; native binaries and WASM on the roadmap

---

## What SJS Bans (by design)

| Banned | Reason | SJS Alternative |
|--------|--------|-----------------|
| `any` | Soundness hole | `dynamic` (runtime-checked) |
| Mapped types `{ [K in keyof T]: ... }` | Complexity without safety | Structural object types |
| Conditional types `T extends U ? A : B` | Unpredictable | Sum types |
| Template literal types | Complexity | — |
| `infer`, `namespace`, TS-style `enum` | Complexity | Explicit constructs |
| Intersection types `A & B` | Hidden unsoundness | `type X extends A, B { … }` |
| `!` non-null assertion | Bypasses null safety | Narrowing |

---

## Quick Start

Install the CLI from npm — it ships as a self-contained bundle with no runtime dependencies:

```bash
npm install -g @superjsorg/cli      # provides the `superjs` command
```

Compile your first file:

```bash
superjs build hello.sjs             # → hello.js (+ source map)
superjs check src/                  # type-check a directory
superjs explain SJS-E001            # explain a diagnostic code
```

Or use the compiler as a library:

```bash
npm install @superjsorg/compiler
```

```js
import { transform } from '@superjsorg/compiler'

const { code, diagnostics } = await transform(
  'const name: string? = null\nconsole.log(name ?? "world")',
  'app.sjs',
  {},
)
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

### Generics and Structural Object Types

```sjs
type Comparable<T> {
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

The compiler and tooling live in an [NX](https://nx.dev) monorepo under `superjs/`
(see [`ADR-008`](specs/design/ADR-008-nx-monorepo.md)):

```
super-js/
├── superjs/                  # NX monorepo (pnpm workspace)
│   ├── libs/                 # The compiler pipeline, by tier:
│   │   ├── types/            # @superjs/types — shared AST / Diagnostic / Type model
│   │   ├── diagnostics/      # @superjs/diagnostics — error-code registry + factory
│   │   ├── config/           # @superjs/config — superjs.config.json loader/validator
│   │   ├── lexer/            # @superjs/lexer
│   │   ├── parser/           # @superjs/parser — recursive-descent + Pratt, error recovery
│   │   ├── checker/          # @superjs/checker — bidirectional type checker
│   │   ├── ir/               # @superjs/ir — TypedAST → SJS-IR lowering
│   │   ├── codegen-js/       # @superjs/codegen-js — SJS-IR → ES2022 + source maps
│   │   ├── compiler/         # @superjs/compiler — public API façade (published)
│   │   ├── interop/          # @superjs/interop — .d.ts → .sjs translator (Stage 2)
│   │   ├── runtime/          # @superjs/runtime — panic/iterator/inspect helpers
│   │   └── test-utils/       # @superjs/test-utils — shared test harness (private)
│   └── apps/
│       ├── cli/              # superjs binary (published as @superjsorg/cli)
│       ├── e2e/              # end-to-end corpus harness
│       ├── vscode-extension/ # VS Code extension (TextMate grammar)
│       └── website/          # Next.js documentation site + playground (superjs.org)
├── specs/                    # Formal spec: grammar, error codes, language docs, ADRs, roadmap
├── docs/                     # HOWTO guides + language comparisons (docs/comparisons/)
└── rfcs/                     # RFC-NNNN-title.md proposals
```

> Published npm packages: [`@superjsorg/cli`](https://www.npmjs.com/package/@superjsorg/cli)
> (the `superjs` command) and [`@superjsorg/compiler`](https://www.npmjs.com/package/@superjsorg/compiler)
> (the programmatic API). Internal libraries use the `@superjs/*` workspace scope.

---

## Roadmap

| Stage | Status | Goal |
|-------|--------|------|
| 0 — Foundations | **Complete** | NX monorepo, shared types, grammar spec, error codes, CI, RFCs 0001–0005 |
| 1 — Compiler Core | **Complete** | Production parser, full type checker, deterministic codegen, incremental cache, `superjs` CLI, compiler API |
| 2 — Interop | **In progress** | `.d.ts` → `.sjs` translator landed (`@superjs/interop`); npm wrappers, `tsconfig.json` paths next |
| 3 — DX Tools | **In progress** | VS Code extension + `--watch` shipped; formatter & linter (17 rules) next |
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
| [`superjs/apps/website/`](superjs/apps/website/) | Public docs site + playground ([superjs.org](https://superjs.org)) |

---

## License

GPL-3.0-or-later — see [LICENSE](./LICENSE).
