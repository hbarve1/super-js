# ECMAScript 2021 (ES12) — Highlights for Super.js

**Spec**: ECMA-262, 12th Edition | **TC39 release**: June 2021
**SJS relevance**: Baseline compatibility layer — all ES2021 features are valid `.sjs` input and compile-through without transformation.

---

## 1. Logical Assignment Operators — §13.15

ES2021 adds three compound assignment forms that combine a logical short-circuit with assignment. They only assign if the logical condition is satisfied.

| Operator | Equivalent | Short-circuits when |
|----------|-----------|---------------------|
| `x ??= y` | `x ?? (x = y)` | `x` is not `null` / `undefined` |
| `x \|\|= y` | `x \|\| (x = y)` | `x` is truthy |
| `x &&= y` | `x && (x = y)` | `x` is falsy |

**Key distinction from `+=`**: these operators do NOT assign when the condition short-circuits, preserving reactive setters and avoiding unnecessary writes.

### SJS typed examples

```sjs
// Nullish assignment — set default only when absent
let config: Record<string, string> | null = null
config ??= {}                         // assigns {} because config is null

let port: number | undefined
port ??= 3000                         // assigns 3000
port ??= 4000                         // no assignment — port is already 3000

// OR assignment — fill falsy slots
function ensureDefaults(opts: { debug?: boolean; timeout?: number }): void {
  opts.debug   ||= false
  opts.timeout ||= 5_000
}

// AND assignment — update only if flag is set
let userFlags: { mutable?: boolean; value: number } = { mutable: true, value: 1 }
userFlags.mutable && (userFlags.value = 99)   // classic pattern
userFlags.mutable &&= false                    // ES2021: clear flag after use

// SJS type-checks each side independently
// ✓ string | undefined ??= string  →  string
// ✓ boolean | undefined ||= boolean →  boolean
// ✗ number &&= string              →  SJS-E012: right-hand type must match left-hand type
```

**SJS compiler note**: logical assignment operators are emitted as-is for ES2021+ targets. When targeting ES5/ES6, the prototype backend desugars them to the equivalent `if`-form above.

---

## 2. String.prototype.replaceAll — §22.1.3.18

Replaces every occurrence of a search string (or non-global RegExp) without requiring a global regex flag. This closes a long-standing footgun where `str.replace(pattern, fn)` silently replaced only the first match.

```sjs
// Before ES2021 — error-prone
const bad: string = "a.b.c".replace(".", "-")   // "a-b.c"  — only first!

// ES2021 — explicit and clear
const good: string = "a.b.c".replaceAll(".", "-")  // "a-b-c"

// With typed transformer function — §22.1.3.18 step 14
function sanitize(input: string): string {
  return input
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&", "&amp;")
}

// RegExp must have /g flag when passed to replaceAll
const pattern: RegExp = /\d+/g
const masked: string = "order 42 of 100".replaceAll(pattern, "X")
// "order X of X"

// SJS types the replacer overload
function highlight(text: string, term: string): string {
  return text.replaceAll(
    term,
    (match: string) => `[${match}]`,
  )
}
```

**SJS diagnostic**: passing a non-global RegExp to `replaceAll` throws a `TypeError` at runtime — SJS lint rule `SJS-L031` flags this statically.

---

## 3. Promise.any — §27.2.4.2

Races a collection of promises and resolves with the value of the **first fulfilled** promise. Rejects only if **all** promises reject, yielding an `AggregateError` containing all rejection reasons.

Contrast with existing combinators:

| Combinator | Resolves when | Rejects when |
|------------|--------------|-------------|
| `Promise.all` | all fulfill | first rejects |
| `Promise.allSettled` | all settle | never |
| `Promise.race` | first settles | first rejects |
| `Promise.any` | **first fulfills** | **all reject** |

```sjs
// Typed CDN failover — try three mirrors, use the first that responds
async function fetchWithFallback(mirrors: string[]): Promise<string> {
  const requests: Promise<string>[] = mirrors.map(url =>
    fetch(url).then(r => r.text()),
  )
  return Promise.any(requests)
}

// AggregateError — SJS types the rejection path
async function tryAll(): Promise<void> {
  try {
    const result: string = await Promise.any([
      Promise.reject(new Error("mirror-1 down")),
      Promise.reject(new Error("mirror-2 down")),
    ])
    console.log(result)
  } catch (err: unknown) {
    if (err instanceof AggregateError) {
      const messages: string[] = err.errors.map((e: Error) => e.message)
      console.error("All failed:", messages)
    }
  }
}

// SJS return type: Promise<Awaited<T>> where T is the union of input types
const result: Promise<number | string> = Promise.any([
  Promise.resolve(1),
  Promise.resolve("hello"),
])
```

---

## 4. WeakRef and FinalizationRegistry

`WeakRef<T>` holds a weak reference to an object — the GC may collect it at any time. `FinalizationRegistry` lets you register a callback that fires after an object is collected.

**Use cases**: caches, observing large objects without preventing GC, diagnostic tooling.
**Warning**: non-deterministic — do not use for application logic.

```sjs
// Typed cache with WeakRef
class WeakCache<K extends object, V> {
  #store: Map<K, WeakRef<V>> = new Map()

  set(key: K, value: V): void {
    this.#store.set(key, new WeakRef(value))
  }

  get(key: K): V | undefined {
    const ref: WeakRef<V> | undefined = this.#store.get(key)
    return ref?.deref()
  }
}

// FinalizationRegistry — cleanup side-effects
const registry: FinalizationRegistry<string> = new FinalizationRegistry(
  (heldValue: string) => {
    console.log(`Object collected, held value: ${heldValue}`)
  },
)

function trackObject(obj: object, label: string): void {
  registry.register(obj, label)
}
```

**SJS typing**: `WeakRef<T>` and `FinalizationRegistry<T>` are fully generic. `deref()` returns `T | undefined` — callers must handle the `undefined` case or SJS-E001 fires.

---

## 5. Numeric Separators — §12.9.3

Underscores (`_`) may appear between digits in any numeric literal for readability. They are purely syntactic — the runtime value is identical.

```sjs
// All of these produce the same value
const million:    number = 1_000_000
const million2:   number = 1000000
const hex:        number = 0xFF_FF_FF
const binary:     number = 0b1111_0000_1111_0000
const octal:      number = 0o7_7_7
const bigInt:     bigint = 9_007_199_254_740_991n

// Typed constant declarations
const TIMEOUT_MS:    number = 30_000          // 30 seconds
const MAX_PAYLOAD:   number = 5_242_880       // 5 MB
const EPOCH:         number = 1_609_459_200   // 2021-01-01 UTC

// SJS rule: underscores cannot appear at start, end, or adjacent to decimal point
// ✗ const bad = 1__000    — SJS-E099: adjacent underscores
// ✗ const bad = 1_.0      — SJS-E099: underscore adjacent to decimal
// ✗ const bad = _1000     — parsed as identifier, not numeric literal
```

---

## ES2021 Compliance Summary for SJS

| Feature | SJS Parse | SJS Type-check | Emit ES5 | Emit ES2021 |
|---------|-----------|----------------|----------|-------------|
| `??=` `\|\|=` `&&=` | Yes | Yes | Desugars | Pass-through |
| `String.replaceAll` | Yes | Yes (lib types) | Polyfill note | Pass-through |
| `Promise.any` | Yes | Yes (lib types) | Polyfill note | Pass-through |
| `WeakRef` | Yes | Yes (generic) | Not supported | Pass-through |
| `FinalizationRegistry` | Yes | Yes (generic) | Not supported | Pass-through |
| Numeric separators | Yes | N/A (syntax) | Stripped | Pass-through |

**Polyfill note**: `String.replaceAll` and `Promise.any` require a polyfill when targeting environments older than their native support date. SJS does not bundle polyfills — use `core-js` or equivalent.
