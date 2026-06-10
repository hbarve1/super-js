# SJS vs JavaScript

## TL;DR

JavaScript lets you ship fast and break things silently. SJS lets you ship fast and catch the breaks before production. Every valid `.js` file is valid `.sjs` — you do not rewrite anything, you just turn the safety on.

---

## What SJS Adds to JavaScript

JavaScript has no static type system. Errors like passing the wrong type to a function, calling a method on `null`, or forgetting a property name are runtime crashes — found in production, not at save time.

SJS adds a type layer on top of JavaScript without removing anything:

```js
// JavaScript — no error until runtime
function greet(user) {
  return "Hello, " + user.name.toUpperCase()
}

greet(null)  // TypeError: Cannot read properties of null — crashes at runtime
```

```sjs
// SJS — error at compile time
function greet(user: { name: string }): string {
  return "Hello, " + user.name.toUpperCase()
}

greet(null)  // SJS-E005: argument type null is not assignable to { name: string }
```

---

## Side-by-Side: Core Differences

### Null crashes

```js
// JS
const user = getUser(id)
console.log(user.email)  // crashes if getUser returns null
```

```sjs
// SJS
const user: User? = getUser(id)
console.log(user.email)          // SJS-E005: user is nullable — must check first
console.log(user?.email ?? "—")  // OK: explicit nullable path
```

### Wrong argument types

```js
// JS — no warning
function add(a, b) { return a + b }
add("5", 3)   // returns "53" — silent string coercion
```

```sjs
// SJS
function add(a: number, b: number): number { return a + b }
add("5", 3)   // SJS-E001: argument 1 is string, expected number
```

### Missing properties

```js
// JS
const config = loadConfig()
const port = config.server.port  // crashes if config.server is undefined
```

```sjs
// SJS
const config: Config = loadConfig()
const port = config.server.port  // SJS checks Config has server.port: number
```

### Refactoring safety

```js
// JS — rename a function, forget a callsite — no error until test or production
function processOrder(order) { ... }
// ... 50 callsites in 20 files ...
// rename to fulfillOrder — find-and-replace is the only tool
```

```sjs
// SJS — rename tracked by compiler
// Every callsite that still uses processOrder emits SJS-P: undefined identifier
```

---

## What SJS Does NOT Take Away

SJS is a strict superset. Zero migration cliff.

| JavaScript feature | Works in SJS? |
|-------------------|--------------|
| Dynamic objects (`{}`) | Yes — inferred or `dynamic` |
| Prototype chains | Yes |
| `typeof`, `instanceof` | Yes — type-narrowing aware |
| `async`/`await` | Yes — typed |
| Generators | Yes — typed |
| JSX | Yes — on by default |
| `import`/`export` (ESM) | Yes |
| `require` (CJS) | Yes |
| Destructuring | Yes — typed |
| Spread/rest | Yes — typed |
| `eval`, `with` | Yes (not recommended; emits SJS-W) |

---

## Gradual Adoption

You do not have to type everything at once. Unannotated code runs exactly as it did in JavaScript. Add types file by file, function by function:

```sjs
// Week 1: rename .js → .sjs, ship zero changes
function process(data) {
  return data.value * 2   // data is dynamic — no type error
}

// Week 2: add types where you got burned
function process(data: { value: number }): number {
  return data.value * 2   // now checked
}
```

`dynamic` is the escape hatch — it is explicit, visible in code review, and searchable. `any` in TypeScript is silent; `dynamic` in SJS is loud.

---

## Performance

SJS compiles to ES2022 JavaScript. Runtime performance is **identical** to the equivalent JavaScript — SJS types are erased at compile time, they do not exist at runtime. The only overhead is the compile step, which is ≤ 2 s for 10k LOC cold and ≤ 100 ms warm.

---

## When to Stay with Plain JavaScript

- Tiny throwaway scripts (< 100 lines, one-off use)
- Projects where you control zero files (consuming a third-party JS codebase read-only)
- Teams with no appetite for a build step

For every other case — anything you maintain, anything with more than one contributor, anything that gets refactored — SJS catches bugs that JavaScript silently ships.

---

## Migration Path

```bash
# Step 1: rename files
mv src/app.js src/app.sjs

# Step 2: check (zero annotations needed)
superjs check --dir src/

# Step 3: add types incrementally where check flags dynamic usage
# Step 4: enable --strict when you want tighter enforcement
```

No tooling changes. Same bundler, same test runner, same deploy pipeline. SJS plugs in at the build step.
