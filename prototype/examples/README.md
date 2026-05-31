# SJS Examples

A curated collection of Super.js (SJS) programs — from hello world to production-ready patterns.

---

## 1. Prerequisites

- **Node.js 18+**
- Install the compiler:
  ```bash
  npm install -g superjs
  # — or, build from source —
  cd prototype && npm run build && npm link
  ```
- Confirm: `superjs --version`

---

## 2. Quickstart

```bash
# Write a minimal program
cat > hello.sjs << 'EOF'
const msg: string = "Hello, SJS!"
console.log(msg)
EOF

# Compile and run
superjs build --source hello.sjs --outDir /tmp/out && node /tmp/out/hello.js
```

---

## 3. Reading order

Follow this path for the best learning experience:

1. `basics/` — variables, functions, control flow, loops, arrays, objects, template literals
2. `null-safety/` — nullable types (`T?`), `??`, `?.` chaining, nullable iteration
3. `sum-types/` — `type Result<T,E> = | Ok(T) | Err(E)`, basic/generic/recursive variants
4. `match/` — pattern matching, destructuring, exhaustiveness
5. `dynamic/` — when to use `dynamic`, JS interop escape hatches
6. `structural-interfaces/` — duck-typed interfaces, generic interfaces
7. `generics/` — generic functions, constraints, generic sum types
8. `gradual-typing/` — step-by-step migration from plain JS to full SJS
9. `async/` — async/await, `Promise<Result<T,E>>`, async iterators
10. `oop/` — classes, inheritance, private fields, abstract classes
11. `algorithms/` — hash-map and other data structure implementations
12. `patterns/` — dependency injection, events, state, observable, middleware
13. `types/` — type aliases, interfaces, literal types, union types, tuples, generics advanced
14. `modules/` — exported generic collections, async HTTP module
15. `node/` — Node.js file I/O integration, code analysis
16. `jsx/` — JSX basics, fragments, composition, server-side rendering
17. `errors/` — SJS-E001 null safety, SJS-E007 exhaustiveness (with fixes)
18. `testing/` — `Result<T,E>` test helpers, async test patterns

---

## 4. How to run any example

```bash
superjs build --source <file> --outDir /tmp/out && node /tmp/out/<filename>.js
```

Example:

```bash
superjs build --source null-safety/01-basics.sjs --outDir /tmp/out && node /tmp/out/01-basics.js
```

---

## 5. SJS idiom cheatsheet

| Idiom | Syntax |
|-------|--------|
| Nullable type | `const x: string? = null` |
| Null coalesce | `const v = x ?? "default"` |
| Optional chain | `const n = obj?.prop?.value` |
| Match expression | `match color { Red => "red"; Blue => "blue"; _ => "other" }` |
| Sum type declaration | `type Result<T,E> = \| Ok(T) \| Err(E)` |
| Generic constraint | `function max<T extends number>(a: T, b: T): T` |

---

## 6. Error reference

| Error | File | Description |
|-------|------|-------------|
| SJS-E001 | `errors/SJS-E001-null-deref.sjs` | Assigning `null` to a non-nullable type — and three fixes |
| SJS-E007 | `errors/SJS-E007-nonexhaustive.sjs` | Non-exhaustive `match` arms — and three fixes |

---

## 7. File a bug

[https://github.com/hbarve1/super-js/issues](https://github.com/hbarve1/super-js/issues)

---

## 8. What's NOT supported

| Avoid | Use instead |
|-------|-------------|
| `any` | `dynamic` |
| `enum Color { Red, Green }` | `type Color = \| Red \| Green` |
| `Partial<T>` | Explicit interface with optional fields (`field?: T`) |
| `x!` (non-null assertion) | Null check: `if (x === null) ...` or `x ?? fallback` |
| `value as T` | Assign to `dynamic` local, then narrow with `typeof` checks |
| Mapped types (`{ [K in keyof T]: ... }`) | Explicit interface |
| Conditional types (`T extends U ? A : B`) | Sum type with explicit variants |

---

## 9. License

MIT — see [LICENSE](../../LICENSE) in the repository root.
