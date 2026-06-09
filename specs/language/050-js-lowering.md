# 050 — JS Lowering (Prototype)

**Status:** Stage 1

---

## Overview

The JS prototype backend compiles `.sjs` source to standard JavaScript via two sequential passes:

1. **Type erasure pass** — removes all SJS-only type-level constructs. Output is syntactically valid JS with SJS extensions still intact.
2. **Syntax transform pass** — lowers SJS runtime constructs (sum type constructors, `match`, JSX, constructor parameter properties) to plain JS.

The final output targets the JavaScript version specified by `--target` (`es5` / `es2015` / `es2022` / `esnext`). Lower targets apply additional Babel-style transforms. Source maps are produced throughout; see `054-source-maps.md`.

---

## Type Erasure Pass

All type-level syntax is removed. The resulting AST is structurally identical to TypeScript after erasure.

| SJS construct | JS output |
|---|---|
| `: T` annotation on variable / parameter / return | removed |
| `interface I {}` declaration | removed entirely |
| `type X = ...` alias | removed entirely |
| `import type { }` / `export type { }` | removed entirely |
| `abstract` modifier on class or method | removed |
| `public` / `private` / `protected` access modifier | removed (does NOT affect `#field` — see below) |
| `readonly` modifier | removed |
| `declare ...` ambient declaration | removed |
| `<T>` type parameter list on function / class / method | removed |
| `expr as T` type assertion | `expr` (assertion removed, expression kept) |
| `T?` nullable shorthand annotation | annotation removed |
| `[key: string]: T` index signature in interface / object | removed |
| Non-null assertion suffix `!` | forbidden (SJS-E011 before erasure) |

Note: `private` keyword (access modifier) is removed. The JS private-field syntax `#field` is **not** a modifier — it is a distinct identifier form and is preserved as-is.

---

## Syntax Transform Pass

SJS runtime constructs are lowered to object literals, IIFEs, and standard JS syntax.

| SJS construct | JS output |
|---|---|
| `type Result<T,E> = Ok(T)\|Err(E)` declaration | removed (type-level — no runtime output) |
| `Ok(42)` tuple variant constructor | `{ _tag: "Ok", _0: 42 }` |
| `None` unit variant constructor | `{ _tag: "None" }` |
| `Circle({ radius: 5 })` record variant constructor | `{ _tag: "Circle", radius: 5 }` |
| `Pair(a, b)` two-field tuple variant | `{ _tag: "Pair", _0: a, _1: b }` |
| `match expr { Ok(v) => body }` | IIFE with `_tag` equality checks (see `053-match-lowering.md`) |
| `Ok` used as higher-order value `arr.map(Ok)` | `arr.map(v => ({ _tag: "Ok", _0: v }))` |
| `import type { … }` | erased entirely (no import emitted) |
| JSX `<Foo p={v} />` | `React.createElement(Foo, { p: v })` |
| JSX fragment `<>…</>` | `React.createElement(React.Fragment, null, …)` |
| Constructor parameter property `constructor(public x: T)` | `this.x = x` assignment emitted in constructor body |
| `for (const x: T of arr)` | `for (const x of arr)` (type annotation dropped) |

Variant constructors are inlined as object literals — no helper functions are generated. When a constructor is used as a first-class callback (not directly applied), a wrapping arrow function is emitted. See `052-sum-type-encoding.md`.

---

## Target-Specific Transforms

After type erasure and syntax transforms, a target-specific pass lowers language features to the ES level required by `--target`.

| Feature | `es5` | `es2015` | `es2022` | `esnext` |
|---|---|---|---|---|
| Classes | Prototype-chain constructors + `Object.create` | Native `class` | Native `class` | Native `class` |
| Arrow functions | `function` expressions (with `this` binding fix) | Native arrows | Native arrows | Native arrows |
| `async` / `await` | Promise-chain rewrite | Promise-chain rewrite | Native (requires target ≥ es2017) | Native |
| Generators `function*` | `regenerator-runtime` polyfill | Native generators | Native generators | Native generators |
| `let` / `const` | `var` (with block-scope rename for conflicts) | Native | Native | Native |
| Template literals `` `…` `` | String concatenation | Native | Native | Native |
| `?.` optional chaining | Conditional expression with `null` check | Conditional expression | Native (requires target ≥ es2020) | Native |
| `??` nullish coalescing | `value != null ? value : fallback` | `value != null ? value : fallback` | Native (requires target ≥ es2020) | Native |
| `**` exponentiation | `Math.pow(base, exp)` | `Math.pow(base, exp)` | Native (requires target ≥ es2016) | Native |
| Destructuring | Manual extraction with temp variables | Native | Native | Native |
| Spread / rest `...` | `Array.prototype.slice` / `.apply` | Native | Native | Native |
| `for…of` | Index loop or iterator protocol via `Symbol.iterator` | Native | Native | Native |
| Private fields `#field` | WeakMap backing map per class | WeakMap backing map per class | Native | Native |

The `esnext` target passes through all constructs that the JS engine is expected to support natively. No polyfills are injected — the consumer is responsible for runtime environment compatibility.

---

## Diagnostics

None. The lowering pass runs after all type errors have been resolved. Internal lowering failures are compiler bugs, not user-facing diagnostics.
