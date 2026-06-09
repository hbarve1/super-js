# ES2025 Features — SuperJS (SJS) Reference

ES2025 (ECMA-262, 16th Edition, June 2025). **SJS primary compilation target.**
`target: es2025` is the default in `sjs.config.json`. All ES2025 features
listed below compile through as-is with no downlevel transformation when this
target is active.

---

## Iterator Helpers Protocol

- **ECMA-262 section**: §27.1.x
- **SJS role**: SJS types the result of `Iterator.from()` and every chained
  method as `Iterator<T>`, preserving the element type through the pipeline.
  Callback parameter and return types are inferred: e.g.
  `.map<U>(fn: (value: T) => U): Iterator<U>`. The full set of helper methods
  surfaced is: `Iterator.from()`, `.map()`, `.filter()`, `.take()`, `.drop()`,
  `.flatMap()`, `.reduce()`, `.toArray()`, `.forEach()`, `.some()`,
  `.every()`, `.find()`. Iteration is lazy — values are pulled only as the
  consuming code requests them. SJS lint rule `prefer-iterator-helpers` flags
  `Array.from(iter).map(...)` patterns that should use the lazy protocol.
- **SJS example**:
  ```sjs
  function* naturals(): Generator<number> {
    let n = 0
    while (true) yield n++
  }

  // Lazy pipeline — no intermediate array allocated until .toArray()
  const first5Squares: number[] = naturals()
    .map((n: number): number => n * n)   // Iterator<number>
    .take(5)                              // Iterator<number>
    .toArray()                            // number[]
  // [0, 1, 4, 9, 16]

  // .filter preserves element type
  const evenSquares: number[] = naturals()
    .map((n): number => n * n)
    .filter((n): boolean => n % 2 === 0)
    .take(4)
    .toArray()
  // [0, 4, 16, 36]

  // .drop + .take — pagination over an iterator
  const page2: number[] = naturals().drop(10).take(5).toArray()
  // [10, 11, 12, 13, 14]

  // .flatMap — one-level flatten
  const words = [["hello", "world"], ["foo", "bar"]]
  const flat: string[] = words.values()
    .flatMap((arr: string[]): string[] => arr)
    .toArray()
  // ["hello", "world", "foo", "bar"]

  // .reduce — eager accumulation
  const sum: number = naturals()
    .take(5)
    .reduce((acc: number, n: number): number => acc + n, 0)
  // 10

  // Iterator.from — wrap any iterable
  const fromSet: Iterator<string> = Iterator.from(new Set(["a", "b", "c"]))
  const upper: string[] = fromSet.map((s) => s.toUpperCase()).toArray()
  // ["A", "B", "C"]
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged (type annotations erased)
  function* naturals() {
    let n = 0;
    while (true) yield n++;
  }
  const first5Squares = naturals().map((n) => n * n).take(5).toArray();
  const sum = naturals().take(5).reduce((acc, n) => acc + n, 0);
  ```

---

## Promise.try

- **ECMA-262 section**: §27.2.4.x
- **SJS role**: Typed as `Promise.try<T>(fn: () => T | PromiseLike<T>): Promise<T>`.
  Works with both synchronous and asynchronous functions. A synchronous throw
  inside `fn` becomes a rejection rather than an uncaught exception. SJS lint
  rule `prefer-promise-try` flags the `new Promise(resolve => resolve(fn()))`
  anti-pattern and suggests `Promise.try(fn)` as a replacement.
- **SJS example**:
  ```sjs
  // Synchronous throw becomes rejection — safe JSON parse
  async function safeParse(input: string): Promise<unknown> {
    return Promise.try((): unknown => JSON.parse(input))
  }

  await safeParse('{"ok":true}')   // resolves { ok: true }
  await safeParse("bad json")       // rejects with SyntaxError — no uncaught throw

  // Generic typed form
  function trySync<T>(fn: () => T): Promise<T> {
    return Promise.try(fn)
  }

  // Works with async functions too
  const data: Promise<string> = Promise.try(async (): Promise<string> => {
    const res = await fetch("https://api.example.com/data")
    return res.text()
  })

  // Combine with .catch for safe fallback
  const port: number = await Promise.try<number>(() => {
    const cfg = JSON.parse(process.env.CONFIG ?? "{}")
    return cfg.port ?? 3000
  }).catch((): number => 3000)
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged
  async function safeParse(input) {
    return Promise.try(() => JSON.parse(input));
  }
  const port = await Promise.try(() => {
    const cfg = JSON.parse(process.env.CONFIG ?? "{}");
    return cfg.port ?? 3000;
  }).catch(() => 3000);
  ```

---

## RegExp.escape

- **ECMA-262 section**: §22.2.x
- **SJS role**: Typed as `RegExp.escape(s: string): string`. Escapes all RegExp
  metacharacters in `s` so it can be safely embedded in a `RegExp` constructor
  as a literal pattern. SJS lint rule `no-unescaped-regexp-input` (alias
  `SJS-L060`) flags any raw string variable passed directly to `new RegExp()`
  without a `RegExp.escape()` call, preventing ReDoS and injection.
- **SJS example**:
  ```sjs
  // Safe user-input search
  function createSearchPattern(term: string, flags = "gi"): RegExp {
    return new RegExp(RegExp.escape(term), flags)
  }

  const search = createSearchPattern("(hello.world)")
  // Escaped: /\(hello\.world\)/gi

  // Highlight matches in a string
  function highlightAll(text: string, term: string): string {
    const pattern = new RegExp(RegExp.escape(term), "g")
    return text.replace(pattern, (match) => `**${match}**`)
  }

  // ✗ new RegExp(userQuery)                  — SJS-L060: potential ReDoS
  // ✓ new RegExp(RegExp.escape(userQuery))   — safe
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged
  function createSearchPattern(term, flags = "gi") {
    return new RegExp(RegExp.escape(term), flags);
  }
  ```

---

## Float16Array

- **ECMA-262 section**: §22.2.x
- **SJS role**: Typed as a standard `TypedArray<number>` with element type
  `number` (JavaScript has no native `f16` numeric type; values are stored as
  16-bit floats but read back as 64-bit doubles). SJS exposes accompanying
  `Math.f16round(x: number): number` and `DataView.prototype.getFloat16` /
  `setFloat16`. Lint rule `float16-precision-loss` warns when a `number`
  literal with more than ~3 significant decimal digits is assigned into a
  `Float16Array` slot, since values are rounded on storage.
- **SJS example**:
  ```sjs
  // GPU / ML weight storage — half-precision floats
  const weights: Float16Array = new Float16Array(4)
  weights[0] = 0.5
  weights[1] = 1.0
  weights[2] = -0.25
  weights[3] = 3.14159   // SJS-W: float16-precision-loss — stored as ~3.14

  // Read back as number (upcast to float64)
  const w0: number = weights[0]   // 0.5 (exact)

  // Round to float16 precision before storage
  const precise = Math.f16round(3.14159)   // 3.140625
  weights[3] = precise

  // SharedArrayBuffer backing for worker threads
  const shared = new Float16Array(new SharedArrayBuffer(8))
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged
  const weights = new Float16Array(4);
  weights[0] = 0.5;
  weights[1] = 1.0;
  weights[2] = -0.25;
  weights[3] = Math.f16round(3.14159);
  ```

---

## Math.sumPrecise

- **ECMA-262 section**: §21.3.x
- **SJS role**: Typed as `Math.sumPrecise(values: Iterable<number>): number`.
  Uses an exact summation algorithm (extended-precision accumulator) that avoids
  floating-point drift across many additions. SJS lint rule `prefer-sum-precise`
  flags `array.reduce((a, b) => a + b, 0)` patterns where the array element
  type is `number`, suggesting `Math.sumPrecise(array)` for improved accuracy.
- **SJS example**:
  ```sjs
  // Classic floating-point drift example
  const values: number[] = [0.1, 0.2, 0.3]
  const naive = values.reduce((a, b) => a + b, 0)
  // 0.6000000000000001  <-- drift

  const precise: number = Math.sumPrecise(values)
  // 0.6  <-- exact

  // Works with any Iterable<number>
  function* rates(): Generator<number> {
    yield 0.1; yield 0.2; yield 0.3
  }
  const total: number = Math.sumPrecise(rates())
  // 0.6

  // Financial totals
  const lineItems: number[] = [9.99, 14.50, 0.01]
  const invoice: number = Math.sumPrecise(lineItems)
  // 24.5  (exact)
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged
  const precise = Math.sumPrecise([0.1, 0.2, 0.3]);
  const total   = Math.sumPrecise(rates());
  ```

---

## Set Methods

- **ECMA-262 section**: §24.2.x
- **SJS role**: SJS types all seven new `Set.prototype` methods. Methods
  returning a new `Set` are typed as `Set<T>` preserving the element type.
  Predicate methods return `boolean`. All methods accept any `Iterable<T>`
  (not just another `Set`) as their argument. SJS emits `SJS-E060` when
  element types are incompatible (e.g. `Set<number>.union(Set<string>)`)
  without an explicit widening cast.
- **SJS example**:
  ```sjs
  const admins:  Set<string> = new Set(["alice", "bob"])
  const editors: Set<string> = new Set(["bob", "carol", "dave"])

  // union — A ∪ B
  const allPrivileged: Set<string> = admins.union(editors)
  // Set { "alice", "bob", "carol", "dave" }

  // intersection — A ∩ B
  const adminEditors: Set<string> = admins.intersection(editors)
  // Set { "bob" }

  // difference — A − B
  const adminOnly: Set<string> = admins.difference(editors)
  // Set { "alice" }

  // symmetricDifference — (A ∪ B) − (A ∩ B)
  const exclusive: Set<string> = admins.symmetricDifference(editors)
  // Set { "alice", "carol", "dave" }

  // isSubsetOf — A ⊆ B
  console.log(adminEditors.isSubsetOf(admins))    // true
  console.log(admins.isSubsetOf(editors))          // false

  // isSupersetOf — A ⊇ B
  console.log(allPrivileged.isSupersetOf(admins))  // true

  // isDisjointFrom — A ∩ B = ∅
  const guests: Set<string> = new Set(["zara", "yuki"])
  console.log(admins.isDisjointFrom(guests))        // true
  console.log(admins.isDisjointFrom(editors))       // false

  // Accepts any iterable as argument
  const fromArray: Set<number> = new Set([1, 2, 3]).union([4, 5])
  // Set { 1, 2, 3, 4, 5 }
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged
  const allPrivileged = admins.union(editors);
  const adminEditors  = admins.intersection(editors);
  const adminOnly     = admins.difference(editors);
  const exclusive     = admins.symmetricDifference(editors);
  console.log(adminEditors.isSubsetOf(admins));
  console.log(allPrivileged.isSupersetOf(admins));
  console.log(admins.isDisjointFrom(guests));
  ```

---

## Error.isError

- **ECMA-262 section**: §20.5.x
- **SJS role**: Typed as `Error.isError(value: unknown): value is Error`.
  Returns `true` if `value` is a genuine `Error` object, including errors from
  other realms (e.g. cross-iframe or cross-worker contexts) where
  `value instanceof Error` returns `false`. SJS lint rule `prefer-error-is-error`
  flags `instanceof Error` checks inside `catch` blocks and suggests
  `Error.isError(e)` for cross-realm robustness.
- **SJS example**:
  ```sjs
  // instanceof fails across realm boundaries — Error.isError does not
  function handleCaught(e: unknown): string {
    if (Error.isError(e)) {
      // e is narrowed to Error inside this block
      return `Error: ${e.message}`
    }
    return `Unknown: ${String(e)}`
  }

  try {
    throw new TypeError("bad input")
  } catch (e) {
    console.log(handleCaught(e))   // "Error: bad input"
  }

  // Cross-realm example (iframe)
  const iframeError = iframe.contentWindow.eval("new Error('cross-realm')")
  console.log(iframeError instanceof Error)   // false — different realm
  console.log(Error.isError(iframeError))     // true  — works correctly

  // ✗ if (e instanceof Error)   — SJS-L: prefer-error-is-error
  // ✓ if (Error.isError(e))     — cross-realm safe, type-guard aware
  ```
- **Compiled output**:
  ```js
  // target: es2025 — passed through unchanged
  function handleCaught(e) {
    if (Error.isError(e)) {
      return `Error: ${e.message}`;
    }
    return `Unknown: ${String(e)}`;
  }
  ```

---

## Summary Table

SJS defaults to ES2025 (`target: es2025`). These features compile through as-is
with no downlevel transformation.

| Feature | ECMA-262 Section | SJS Result Type | Pass-Through (ES2025) | Lint Rules |
|---|---|---|---|---|
| `Iterator.from()` + helpers (`.map`, `.filter`, `.take`, `.drop`, `.flatMap`, `.reduce`, `.toArray`, etc.) | §27.1.x | `Iterator<T>` (generic, preserves element type through chain) | Yes | `prefer-iterator-helpers` |
| `Promise.try` | §27.2.4.x | `Promise<T>` | Yes | `prefer-promise-try` |
| `RegExp.escape` | §22.2.x | `string` | Yes | `no-unescaped-regexp-input` (`SJS-L060`) |
| `Float16Array` | §22.2.x | `TypedArray<number>` + `Math.f16round` | Yes | `float16-precision-loss` |
| `Math.sumPrecise` | §21.3.x | `number` | Yes | `prefer-sum-precise` |
| `Set.prototype.union` / `intersection` / `difference` / `symmetricDifference` | §24.2.x | `Set<T>` | Yes | `SJS-E060` (type mismatch) |
| `Set.prototype.isSubsetOf` / `isSupersetOf` / `isDisjointFrom` | §24.2.x | `boolean` | Yes | — |
| `Error.isError` | §20.5.x | `value is Error` (type guard) | Yes | `prefer-error-is-error` |
