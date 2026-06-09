# ES2024 Features — SuperJS (SJS) Reference

ES2024 (ECMA-262, 15th Edition, June 2024). Use as reference when `target: es2024`
is set in `sjs.config.json`, and as a baseline for polyfill decisions when
targeting older environments.

---

## Object.groupBy and Map.groupBy

- **ECMA-262 section**: §20.1.2.x (`Object.groupBy`), §24.1.2.x (`Map.groupBy`)
- **SJS role**: Exposed as first-class typed builtins. SJS infers the key type
  from the callback return type and annotates the result as
  `Partial<Record<K, T[]>>` for `Object.groupBy` (null-prototype object; any key
  may be absent) and `Map<K, T[]>` for `Map.groupBy`. Lint rule
  `prefer-group-by` flags manual `reduce`-into-object patterns that replicate
  this behaviour.
- **SJS example**:
  ```sjs
  const items: { name: string; type: string }[] = [
    { name: "apple",  type: "fruit"  },
    { name: "banana", type: "fruit"  },
    { name: "carrot", type: "veggie" },
  ]

  // key inferred as string; result is Partial<Record<string, typeof items>>
  const byType = Object.groupBy(items, (item) => item.type)

  // Map variant — preserves non-string key types (objects, symbols, null, etc.)
  const byTypeMap = Map.groupBy(items, (item) => item.type)
  ```
- **Compiled output**:
  ```js
  // target: es2024 — passed through unchanged
  const byType    = Object.groupBy(items, (item) => item.type);
  const byTypeMap = Map.groupBy(items,    (item) => item.type);

  // target: es2022 — SJS injects a runtime helper
  const byType    = __sjs_groupBy(items, (item) => item.type, false);
  const byTypeMap = __sjs_groupBy(items, (item) => item.type, true);
  ```

---

## Promise.withResolvers

- **ECMA-262 section**: §27.2.4.x
- **SJS role**: Fully typed; return type is inferred as
  `{ promise: Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void }`.
  SJS enforces that `resolve`/`reject` are not called after the promise has
  already settled via lint rule `no-double-settle`.
- **SJS example**:
  ```sjs
  function makeDeferred<T>(): {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject:  (reason?: unknown) => void
  } {
    return Promise.withResolvers<T>()
  }

  const { promise, resolve, reject } = makeDeferred<number>()
  resolve(42)
  ```
- **Compiled output**:
  ```js
  // target: es2024 — passed through unchanged (generic T erased)
  function makeDeferred() {
    return Promise.withResolvers();
  }
  const { promise, resolve, reject } = makeDeferred();
  resolve(42);

  // target: es2021 — polyfill injected
  function makeDeferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }
  ```

---

## ArrayBuffer.prototype.resize and transfer

- **ECMA-262 section**: §25.1.x (`resize`, `transfer`, `transferToFixedLength`)
- **SJS role**: SJS surfaces resizable buffers via a typed `ResizableArrayBuffer`
  alias (overloaded constructor that accepts `{ maxByteLength }`). The compiler
  emits `new ArrayBuffer(size, { maxByteLength })` from SJS source. `transfer()`
  is typed as returning a new `ArrayBuffer` and detaching the source. Lint rule
  `no-use-after-transfer` flags any read of a buffer variable after `.transfer()`
  is called on it. Calling `.resize()` on a non-resizable buffer is a
  `SJS-E050` compile-time type error.
- **SJS example**:
  ```sjs
  // Resizable buffer — initial 1 KB, max 64 KB
  const buf = new ArrayBuffer(1024, { maxByteLength: 65536 })
  buf.resize(2048)                     // grow in-place; returns undefined

  const transferred = buf.transfer()   // buf is now detached
  // buf.byteLength                    // SJS-E050: no-use-after-transfer
  ```
- **Compiled output**:
  ```js
  // target: es2024 — passed through unchanged
  const buf = new ArrayBuffer(1024, { maxByteLength: 65536 });
  buf.resize(2048);
  const transferred = buf.transfer();
  ```

---

## RegExp /v Flag (Unicode Sets)

- **ECMA-262 section**: §22.2.x
- **SJS role**: SJS allows the `/v` flag in regex literals without additional
  syntax. The type checker validates mutual exclusion between `/u` and `/v`
  (combining both is a `regexp-v-u-conflict` compile error). Set notation
  (`[\p{Letter}--\p{ASCII}]`, `[\p{Sc}&&\p{ASCII}]`) and string Unicode
  property escapes (`\p{RGI_Emoji}`) are understood by the SJS regex linter.
  When the output target is below ES2024, SJS emits `SJS-W030` — the `/v`
  flag cannot be transpiled; use the `polyfill: "regexp-v"` config option to
  inject the `regexpu-core` runtime polyfill instead.
- **SJS example**:
  ```sjs
  // Set difference: Unicode letters that are not ASCII
  const nonAsciiLetter = /[\p{Letter}--\p{ASCII}]/v

  // Set intersection: currency symbols that are ASCII
  const asciiCurrency = /[\p{Sc}&&\p{ASCII}]/v

  // String property (matches multi-codepoint emoji sequences)
  const emojiSeq = /^\p{RGI_Emoji}$/v

  const result = emojiSeq.test("👨‍👩‍👧")   // true
  ```
- **Compiled output**:
  ```js
  // target: es2024 — passed through unchanged
  const nonAsciiLetter = /[\p{Letter}--\p{ASCII}]/v;
  const asciiCurrency  = /[\p{Sc}&&\p{ASCII}]/v;
  const emojiSeq       = /^\p{RGI_Emoji}$/v;
  const result         = emojiSeq.test("👨‍👩‍👧");

  // target < es2024 — SJS-W030 emitted; no automatic downlevel transform.
  // Enable polyfill: "regexp-v" in sjs.config.json to use regexpu-core.
  ```

---

## String.prototype.isWellFormed and toWellFormed

- **ECMA-262 section**: §22.1.3.x
- **SJS role**: Typed as `(s: string).isWellFormed(): boolean` and
  `(s: string).toWellFormed(): string`. SJS introduces a branded type
  `WellFormedString` (a subtype of `string`) returned by `toWellFormed()`,
  making lone-surrogate strings distinguishable in typed APIs. Lint rule
  `require-well-formed-before-encode` warns when a raw `string` is passed to
  `TextEncoder`, `encodeURIComponent`, or `URL` without a prior `isWellFormed()`
  guard or `toWellFormed()` call.
- **SJS example**:
  ```sjs
  const raw: string = "Hello\uD800World"   // contains lone surrogate

  if (!raw.isWellFormed()) {
    const safe: WellFormedString = raw.toWellFormed()
    console.log(safe)   // "Hello�World"
  }

  // Safe encode helper — no lint warning
  const encoded = encodeURIComponent(raw.toWellFormed())
  ```
- **Compiled output**:
  ```js
  // target: es2024 — passed through unchanged (WellFormedString brand erased)
  const raw = "Hello\uD800World";
  if (!raw.isWellFormed()) {
    const safe = raw.toWellFormed();
    console.log(safe);
  }
  const encoded = encodeURIComponent(raw.toWellFormed());

  // target: es2021 — polyfill helpers injected
  if (!__sjs_isWellFormed(raw)) {
    const safe = __sjs_toWellFormed(raw);
    console.log(safe);
  }
  ```

---

## Top-Level Await (Module Evaluation Order Clarification)

- **ECMA-262 section**: §16.2.1.1 (AsyncModuleEvaluation)
- **SJS role**: Top-level `await` is permitted in any `.sjs` file treated as an
  ES module (has `import`/`export` or `"use module"` directive). SJS enforces
  correct ordering — a module with TLA blocks all dependent modules from
  continuing until its top-level awaited expression resolves. The compiler emits
  diagnostic `tla-in-cjs-context` if the output format is CommonJS (CJS cannot
  represent async module graphs). SJS also warns `tla-cycle` when a circular
  import chain contains TLA.
- **SJS example**:
  ```sjs
  // db.sjs — module with top-level await
  export const connection = await initDatabase()

  // app.sjs — blocked until db.sjs resolves
  import { connection } from "./db.sjs"
  console.log("DB ready:", connection.id)
  ```
- **Compiled output**:
  ```js
  // target: es2024, format: esm — passed through unchanged
  // db.js
  export const connection = await initDatabase();
  // app.js
  import { connection } from "./db.js";
  console.log("DB ready:", connection.id);

  // format: cjs — compile-time error: tla-in-cjs-context
  // Switch to format: esm or use a TLA-aware bundler.
  ```

---

## Temporal Proposal — Status Note

- **ECMA-262 section**: Not in ES2024 standard (Stage 3 at ES2024 freeze;
  targeting ES2025/ES2026 ratification).
- **SJS role**: SJS provides an opt-in `temporal` polyfill flag. When
  `compilerOptions.polyfills` includes `"temporal"`, SJS injects the
  `@js-temporal/polyfill` package and exposes the `Temporal` global with full
  SJS type definitions mirroring the Stage 3 spec:
  `Temporal.PlainDate`, `Temporal.ZonedDateTime`, `Temporal.Duration`, etc.
  Once `Temporal` ships natively in the target runtime, the polyfill import is
  automatically dropped by the SJS build.
- **SJS example**:
  ```sjs
  // sjs.config.json: { "compilerOptions": { "polyfills": ["temporal"] } }
  const today: Temporal.PlainDate = Temporal.Now.plainDateISO()
  const tomorrow = today.add({ days: 1 })
  console.log(tomorrow.toString())   // e.g. "2024-07-16"
  ```
- **Compiled output**:
  ```js
  // polyfill injected at bundle entry point when target lacks native Temporal
  import { Temporal } from "@js-temporal/polyfill";

  const today    = Temporal.Now.plainDateISO();
  const tomorrow = today.add({ days: 1 });
  console.log(tomorrow.toString());
  ```

---

## Summary Table

| Feature | ECMA-262 Section | SJS Typed | Downlevel Transform | Lint Rules |
|---|---|---|---|---|
| `Object.groupBy` / `Map.groupBy` | §20.1.2.x, §24.1.2.x | Yes — `Partial<Record<K,T[]>>` / `Map<K,T[]>` | Helper injection (`__sjs_groupBy`) | `prefer-group-by` |
| `Promise.withResolvers` | §27.2.4.x | Yes — `{promise, resolve, reject}<T>` | Inline polyfill | `no-double-settle` |
| `ArrayBuffer.resize` / `transfer` | §25.1.x | Yes — `ResizableArrayBuffer` brand | Pass-through only (no downlevel) | `no-use-after-transfer` |
| RegExp `/v` flag | §22.2.x | Yes — mutual exclusion with `/u` enforced | Error + opt-in `regexpu-core` polyfill | `regexp-v-u-conflict` |
| `String.isWellFormed` / `toWellFormed` | §22.1.3.x | Yes — `WellFormedString` brand | Helper injection (`__sjs_isWellFormed`) | `require-well-formed-before-encode` |
| Top-level `await` order semantics | §16.2.1.1 | Yes — ESM-only guard | Error in CJS mode | `tla-in-cjs-context`, `tla-cycle` |
| Temporal (polyfill opt-in) | Not in ES2024 | Yes — Stage 3 type shapes | `@js-temporal/polyfill` injection | — |
