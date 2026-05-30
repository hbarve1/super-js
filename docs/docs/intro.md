---
sidebar_position: 1
---

# Introduction to SuperJS

SuperJS (SJS) is a new programming language that compiles `.sjs` files to JavaScript. It is a strict superset of JavaScript — every valid `.js` file is also valid `.sjs` — extended with a sound, Go-inspired type system designed for clarity and safety.

SuperJS is **not** TypeScript. It deliberately discards the parts of TypeScript that make reasoning about types difficult (`any`, mapped types, conditional types, `infer`) and replaces them with simpler, safer constructs: sum types, match expressions, and non-nullable types by default.

---

## How SJS Differs from TypeScript

| Feature | TypeScript | SuperJS |
|---------|-----------|---------|
| `any` | Allowed (soundness hole) | Banned — use `dynamic` instead |
| Null safety | Opt-in (`strictNullChecks`) | On by default; `T?` is the nullable form |
| Mapped types | Supported | Banned — use interfaces |
| Conditional types | Supported | Banned — use sum types |
| Algebraic sum types | Not supported | First-class: `type R<T,E> = Ok(T) \| Err(E)` |
| Match expressions | Not supported | Built-in with exhaustiveness checking |
| `!` non-null assertion | Supported | Banned — use narrowing |
| JSX | Requires config | On by default |
| Type philosophy | Structural + escape hatches | Sound, gradual, Go-inspired |

---

## The 10 SJS Types

`number` `string` `boolean` `bigint` `symbol` `void` `null` `never` `dynamic` `object T`

Types are **non-nullable by default**. A `string` cannot hold `null`. Use `string?` to declare a nullable string.

---

## Quick Start

SJS 0.1.0 is a prototype — install from source:

```bash
git clone https://github.com/hbarve1/super-js.git
cd super-js/prototype
npm install
npm run build
npm link          # makes `superjs` available globally
```

Compile your first file:

```bash
superjs build --source hello.sjs
```

---

## Your First SJS File

```sjs
// hello.sjs
const message: string = "Hello, World!"
console.log(message)

function greet(name: string): string {
  return `Hello, ${name}!`
}

console.log(greet("SuperJS"))
```

### Null Safety

Types are non-nullable by default. Use `T?` to opt into nullability:

```sjs
function findUser(id: number): string? {
  if (id === 1) return "Alice"
  return null
}

const name = findUser(42)            // type: string?
const display = name ?? "Unknown"    // ?? is type-checked against string?
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
  Err(e)  => `Error: ${e}`,   // compiler enforces all variants are covered
}
console.log(msg)
```

---

## CLI at a Glance

```bash
superjs build  --source <file>   # compile .sjs → .js
superjs lint   --source <file>   # lint with SJS rules
superjs format --source <file>   # format code
superjs test                     # run tests
```

Config lives in `superjs.config.json`:

```json
{ "target": "es2022", "outDir": "./dist", "strict": false }
```

---

## What's Next

- [Language Reference](./language-reference) — full syntax and type system documentation
- [Type System](./type-system) — null safety, sum types, generics, and structural interfaces
- [Tooling](./tooling) — CLI options, config schema, and diagnostic codes
- [Examples](./examples) — practical SJS code samples
