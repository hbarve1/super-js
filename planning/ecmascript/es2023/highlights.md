# ECMAScript 2023 (ES14) — Highlights for Super.js

**Spec**: ECMA-262, 14th Edition | **TC39 release**: June 2023
**SJS relevance**: ES2023's primary contribution is a suite of **non-mutating array methods** that align well with SJS's preference for immutable-by-default data patterns. The typed array method signatures are directly expressible in the SJS type system.

---

## 1. Array.prototype.findLast and findLastIndex — §23.1.3.10 / §23.1.3.11

`findLast(predicate)` scans from the end of the array and returns the **last** element matching the predicate (or `undefined`). `findLastIndex` returns the index instead (-1 if none found). These mirror `find`/`findIndex` but search in reverse without reversing or mutating the array.

```sjs
const records: Array<{ id: number; status: "active" | "inactive" }> = [
  { id: 1, status: "inactive" },
  { id: 2, status: "active" },
  { id: 3, status: "active" },
  { id: 4, status: "inactive" },
]

// Find the last active record — no reverse(), no mutation
const lastActive: { id: number; status: "active" | "inactive" } | undefined =
  records.findLast(r => r.status === "active")
// { id: 3, status: "active" }

const lastActiveIdx: number = records.findLastIndex(r => r.status === "active")
// 2

// Typed generic utility
function findLastWhere<T>(arr: T[], pred: (item: T) => boolean): T | undefined {
  return arr.findLast(pred)
}

// SJS return type: T | undefined — callers must handle undefined
const highScore: number | undefined = [10, 80, 60, 90, 45].findLast(n => n > 70)
if (highScore !== undefined) {
  console.log("Last high score:", highScore)   // 90
}

// findLastIndex returns -1 when not found — same contract as findIndex
const idx: number = [1, 2, 3].findLastIndex(n => n > 100)
console.log(idx === -1)   // true
```

**SJS typed array support**: `TypedArray.prototype.findLast` and `findLastIndex` (§23.2.3.11 / §23.2.3.12) share the same semantics and are typed identically for `Int8Array`, `Uint8Array`, `Float64Array`, etc.

---

## 2. Non-Mutating Array Methods — §23.1.3

ES2023 adds four methods that return a **new array** instead of mutating the original. They are the non-mutating equivalents of `sort`, `reverse`, `splice`, and indexed assignment.

| Mutating (original) | Non-mutating (ES2023) | Spec section |
|---------------------|----------------------|--------------|
| `arr.sort(fn)` | `arr.toSorted(fn)` | §23.1.3.30 |
| `arr.reverse()` | `arr.toReversed()` | §23.1.3.28 |
| `arr.splice(s,d,...i)` | `arr.toSpliced(s,d,...i)` | §23.1.3.29 |
| `arr[i] = v` | `arr.with(i, v)` | §23.1.3.35 |

### toSorted

```sjs
const prices: number[] = [49.99, 9.99, 199.99, 1.99]

// Original is preserved
const sorted: number[] = prices.toSorted((a, b) => a - b)
// [1.99, 9.99, 49.99, 199.99]
console.log(prices)   // [49.99, 9.99, 199.99, 1.99] — unchanged

// Typed comparator — SJS enforces (a: T, b: T) => number signature
interface Product { name: string; price: number }
const products: Product[] = [
  { name: "Widget", price: 10 },
  { name: "Gadget", price: 5  },
  { name: "Doohickey", price: 15 },
]
const byPrice: Product[] = products.toSorted((a, b) => a.price - b.price)
```

### toReversed

```sjs
const history: string[] = ["v1.0", "v1.1", "v2.0", "v2.1"]

// Non-mutating reverse for display purposes
const newest: string[] = history.toReversed()
// ["v2.1", "v2.0", "v1.1", "v1.0"]
console.log(history.at(0))   // "v1.0" — original unchanged

// Common pattern: reverse before rendering without affecting source
function renderTimeline(events: string[]): string {
  return events.toReversed().join(" → ")
}
```

### toSpliced

```sjs
const tasks: string[] = ["plan", "design", "implement", "deploy"]

// Insert "review" at index 3 without mutation
const withReview: string[] = tasks.toSpliced(3, 0, "review")
// ["plan", "design", "implement", "review", "deploy"]

// Remove one element at index 1 without mutation
const withoutDesign: string[] = tasks.toSpliced(1, 1)
// ["plan", "implement", "deploy"]

// Replace element at index 2 without mutation
const withTest: string[] = tasks.toSpliced(2, 1, "test", "implement")
// ["plan", "design", "test", "implement", "deploy"]

console.log(tasks)   // original unchanged
```

### with

```sjs
const matrix: number[][] = [[1, 2], [3, 4], [5, 6]]

// Update a cell immutably — produces new outer array with new inner array
const updated: number[][] = matrix.with(1, matrix[1].with(0, 99))
// [[1, 2], [99, 4], [5, 6]]
console.log(matrix[1][0])   // 3 — original unchanged

// Typed tuple pattern — common in SJS state management
type State = readonly [number, string, boolean]
const state: State = [0, "idle", false]
const running: State = state.with(1, "running") as State
const progressed: State = running.with(0, 1) as State
```

---

## 3. Symbol as WeakMap and WeakSet Keys

ES2023 relaxes the `WeakMap` and `WeakSet` key constraint. Previously only objects were valid keys. Now **registered** or **non-registered** Symbols (except `Symbol.for(key)`) are also valid weak keys.

**Use case**: enables private-symbol keyed metadata without a separate `Map<object, ...>` pattern.

```sjs
// Private metadata using Symbol keys
const META: unique symbol = Symbol("metadata")

const symbolMap: WeakMap<symbol, string> = new WeakMap()
symbolMap.set(META, "this is metadata")
console.log(symbolMap.get(META))   // "this is metadata"

// Symbol set membership
const seen: WeakSet<symbol> = new WeakSet()
const requestId: symbol = Symbol("req-001")
seen.add(requestId)
console.log(seen.has(requestId))   // true

// SJS typing: WeakMap<symbol, V> and WeakSet<symbol> are now valid
// Symbol.for() keys are excluded — they are global and never collected
// ✗ const bad = new WeakMap<symbol, string>()
//   bad.set(Symbol.for("global"), "x")   // Runtime TypeError
```

---

## 4. Hashbang Grammar — §12.9.7

A hashbang comment (`#!/usr/bin/env node`) is now formally part of the ECMAScript grammar. It must be the very first line of the file, starting at character position 0. It is treated as a comment — no runtime effect.

```sjs
#!/usr/bin/env node
// ^ This is now valid ECMAScript 2023 syntax

const args: string[] = process.argv.slice(2)
console.log("Running with args:", args)
```

**SJS CLI integration**: the SJS compiler passes hashbang lines through unchanged in all output targets. The `superjs build` command detects hashbang lines and sets the output file's executable bit (`chmod +x`) automatically when `--executable` is passed.

---

## 5. Non-Mutating Methods on TypedArrays

`Int8Array`, `Uint8Array`, `Float64Array`, and all other TypedArray types also receive `toSorted`, `toReversed`, `with`, and `findLast`/`findLastIndex` in ES2023 (§23.2.3.x). TypedArrays do not have `toSpliced` (they have fixed length).

```sjs
const pixels: Uint8Array = new Uint8Array([255, 128, 64, 32])

// Non-mutating sort
const sorted: Uint8Array = pixels.toSorted()
// Uint8Array [32, 64, 128, 255]

// Non-mutating reverse
const reversed: Uint8Array = pixels.toReversed()
// Uint8Array [32, 64, 128, 255]

// Update single element
const brightened: Uint8Array = pixels.with(0, 200)
// Uint8Array [200, 128, 64, 32]

// SJS type: TypedArray.prototype.with returns the same TypedArray type
// Uint8Array.with → Uint8Array, Float64Array.with → Float64Array, etc.
```

---

## ES2023 and SJS Immutability Patterns

The ES2023 non-mutating methods complete a coherent immutable-operations API for arrays. In SJS, these methods combine naturally with `readonly` annotations:

```sjs
// SJS immutable pipeline — all operations return new arrays
function processScores(raw: readonly number[]): readonly number[] {
  return raw
    .toSorted((a, b) => b - a)                   // highest first
    .toSpliced(3, raw.length - 3)                 // keep top 3
    .with(0, raw.findLast(n => n > 90) ?? raw[0]) // pin last 90+ score at top
}

// SJS lint rule SJS-L040: prefer toSorted/toReversed/toSpliced/with
// over mutating equivalents when the result is assigned to a new binding.
// Example: `const s = [...arr].sort()` → suggest `arr.toSorted()`
```

## ES2023 Compliance Summary for SJS

| Feature | SJS Parse | SJS Type-check | Emit ES5 | Emit ES2023 |
|---------|-----------|----------------|----------|-------------|
| `findLast` / `findLastIndex` | Yes | Yes (T \| undefined) | Polyfill note | Pass-through |
| `toSorted` | Yes | Yes | Polyfill note | Pass-through |
| `toReversed` | Yes | Yes | Polyfill note | Pass-through |
| `toSpliced` | Yes | Yes | Polyfill note | Pass-through |
| `with` | Yes | Yes | Polyfill note | Pass-through |
| Symbol as WeakMap key | Yes | Yes | Not supported | Pass-through |
| Hashbang grammar | Yes | N/A (comment) | Stripped | Pass-through |
| TypedArray non-mutating | Yes | Yes | Polyfill note | Pass-through |

**Polyfill note**: all `Array.prototype` additions require a polyfill for Node.js < 20 and browsers older than 2023 baselines. SJS does not bundle polyfills — use `core-js@3.30+` or equivalent.
