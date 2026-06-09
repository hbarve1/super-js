# ES2020 Highlights — Super.js Reference

**Edition**: ES11 / ES2020
**Versioned spec**: https://262.ecma-international.org/11.0/
**Living spec**: https://tc39.es/ecma262/

---

## Overview

ES2020 is the **null-safety release**. Optional chaining (`?.`) and nullish
coalescing (`??`) together form a coherent system for handling `null` and
`undefined` without verbose guard chains. Super.js ties both operators directly
to its `T?` nullable type syntax, making null safety a first-class type-system
concern rather than a runtime convention.

Beyond null safety, ES2020 introduced `BigInt` (arbitrary-precision integers),
`Promise.allSettled` (wait for all promises regardless of outcome), dynamic
`import()`, `import.meta`, `globalThis`, and `String.prototype.matchAll`.

---

## BigInt
- **ECMA-262 section**: §21.2 (object); §6.1.6.2 (type); §12.9.3 (literals)
- **SJS role**: Exposes `bigint` as a first-class primitive keyword. SJS enforces
  that `bigint` and `number` cannot be mixed in arithmetic or comparisons without
  an explicit conversion — violations raise `SJS-E004`. BigInt literals (`42n`)
  are inferred as `bigint`. Future LLVM backend maps small `bigint` values to
  `i128`; larger values fall back to a heap-allocated big-number type.
- **SJS example**:
  ```sjs
  // Declare and operate on bigint values
  const a: bigint = 9007199254740993n;   // exceeds Number.MAX_SAFE_INTEGER
  const b: bigint = 100n;
  const product: bigint = a * b;         // 900719925474099300n

  // TYPE ERROR — mixing bigint and number is SJS-E004
  // const bad = a + 1;

  // Explicit conversion required
  const n: number = 42;
  const asBig: bigint = BigInt(n);

  // Typed function using bigint
  function factorial(n: bigint): bigint {
    if (n <= 1n) return 1n;
    return n * factorial(n - 1n);
  }

  const f20: bigint = factorial(20n);
  ```
- **Compiled output**:
  ```js
  // bigint syntax is native ES2020 — no transformation needed for --target es2020+
  const a = 9007199254740993n;
  const b = 100n;
  const product = a * b;

  const n = 42;
  const asBig = BigInt(n);

  function factorial(n) {
    if (n <= 1n) return 1n;
    return n * factorial(n - 1n);
  }

  const f20 = factorial(20n);
  // For --target es5/es2015: compiler emits an error — BigInt has no polyfill path.
  ```

---

## Promise.allSettled
- **ECMA-262 section**: §27.2.4.3
- **SJS role**: Fully typed. Return type is
  `Promise<Array<PromiseSettledResult<T>>>` where `PromiseSettledResult<T>` is
  the discriminated union `{ status: "fulfilled"; value: T } | { status:
  "rejected"; reason: unknown }`. SJS narrows the result shape inside
  `if (r.status === "fulfilled")` branches via discriminant narrowing.
- **SJS example**:
  ```sjs
  async function fetchAllUsers(ids: number[]): Promise<string[]> {
    const results = await Promise.allSettled(
      ids.map((id: number) => fetchUser(id))
    );

    const names: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        names.push(r.value);        // r narrowed to fulfilled shape
      } else {
        console.warn("failed:", r.reason);
      }
    }
    return names;
  }
  ```
- **Compiled output**:
  ```js
  async function fetchAllUsers(ids) {
    const results = await Promise.allSettled(
      ids.map((id) => fetchUser(id))
    );

    const names = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        names.push(r.value);
      } else {
        console.warn("failed:", r.reason);
      }
    }
    return names;
  }
  // Types are erased; runtime logic is pass-through for --target es2020+.
  ```

---

## String.prototype.matchAll
- **ECMA-262 section**: §22.1.3.12
- **SJS role**: Fully supported. Return type is
  `IterableIterator<RegExpExecArray>`. SJS enforces that the regex argument
  carries the `g` (global) flag; passing a regex literal without `g` is a
  compile-time error (`SJS-E006`). Named capture groups (`?<name>`) are typed
  as `{ [key: string]: string } | undefined` on the `.groups` property.
- **SJS example**:
  ```sjs
  // Extract all tagged values with named groups
  const text: string = "[tag1] content [tag2] more [tag3]";
  const tagRe: RegExp = /\[(?<tag>[^\]]+)\]/g;   // g flag required

  for (const match of text.matchAll(tagRe)) {
    const tag: string = match.groups?.tag ?? "";
    console.log(tag);   // "tag1", "tag2", "tag3"
  }

  // Collect all match positions
  function findAll(
    source: string,
    pattern: RegExp
  ): Array<{ value: string; index: number }> {
    return [...source.matchAll(pattern)].map((m) => ({
      value: m[0],
      index: m.index ?? 0,
    }));
  }
  ```
- **Compiled output**:
  ```js
  const text = "[tag1] content [tag2] more [tag3]";
  const tagRe = /\[(?<tag>[^\]]+)\]/g;

  for (const match of text.matchAll(tagRe)) {
    const tag = match.groups?.tag ?? "";
    console.log(tag);
  }

  function findAll(source, pattern) {
    return [...source.matchAll(pattern)].map((m) => ({
      value: m[0],
      index: m.index ?? 0,
    }));
  }
  // Types stripped; optional chaining on .groups preserved as native ?. syntax.
  ```

---

## globalThis
- **ECMA-262 section**: §19.1
- **SJS role**: Fully supported as the canonical environment-agnostic global
  reference. SJS types `globalThis` as `typeof globalThis` (the intersection
  of all well-known globals). Accessing unknown properties on `globalThis`
  requires an explicit `as any` cast. The linter rule `no-env-global` warns
  when `window`, `global`, or `self` are used where `globalThis` would be
  portable.
- **SJS example**:
  ```sjs
  // Environment-agnostic feature detection
  function isInBrowser(): boolean {
    return typeof globalThis.window !== "undefined";
  }

  // Polyfill registration
  function ensurePolyfill(): void {
    if (!globalThis.fetch) {
      (globalThis as any).fetch = myFetchPolyfill;
    }
  }

  // Conditional dynamic import using globalThis check
  async function loadIfNeeded(): Promise<void> {
    if (!globalThis.IntersectionObserver) {
      await import("./polyfills/intersection-observer");
    }
  }
  ```
- **Compiled output**:
  ```js
  function isInBrowser() {
    return typeof globalThis.window !== "undefined";
  }

  function ensurePolyfill() {
    if (!globalThis.fetch) {
      globalThis.fetch = myFetchPolyfill;
    }
  }

  async function loadIfNeeded() {
    if (!globalThis.IntersectionObserver) {
      await import("./polyfills/intersection-observer");
    }
  }
  // Types and casts stripped; globalThis reference is pass-through.
  ```

---

## Optional Chaining `?.`
- **ECMA-262 section**: §13.5.7
- **SJS role**: Core null-safety operator. SJS ties `?.` directly to its `T?`
  nullable type syntax (`T | null | undefined`). Using `?.` on a provably
  non-nullable value emits `SJS-W004`. Accessing a property with `.` (not `?.`)
  on a `T?` value is `SJS-E005`. The type-checker propagates nullability through
  entire chains: `a?.b?.c` is typed `C | undefined` when either `a` or `b` is
  nullable. Three forms are supported: `obj?.prop`, `arr?.[i]`, `fn?.()`.
- **SJS example**:
  ```sjs
  type Address = { city: string; zip: string };
  type User = { name: string; address: Address? };

  // Property access on nullable
  function getCity(user: User?): string {
    return user?.address?.city ?? "Unknown";
  }

  // Method call on nullable
  type Logger = { log: (msg: string) => void };

  function debug(logger: Logger?, msg: string): void {
    logger?.log(msg);
  }

  // Bracket access on nullable
  type Dict = { [key: string]: string };

  function lookup(dict: Dict?, key: string): string | undefined {
    return dict?.[key];
  }

  // Callable ?. on nullable function
  type Callback = (() => void)?;

  function runIfSet(cb: Callback): void {
    cb?.();
  }
  ```
- **Compiled output**:
  ```js
  function getCity(user) {
    return user?.address?.city ?? "Unknown";
  }

  function debug(logger, msg) {
    logger?.log(msg);
  }

  function lookup(dict, key) {
    return dict?.[key];
  }

  function runIfSet(cb) {
    cb?.();
  }
  // For --target es2020+: ?. emitted as-is.
  // For --target es2019 and below: SJS transforms to explicit null checks:
  //   user === null || user === void 0 ? void 0 : (_a = user.address) === null ...
  ```

---

## Nullish Coalescing `??`
- **ECMA-262 section**: §13.13
- **SJS role**: Companion to `?.` for the SJS null-safety model. `a ?? b`
  evaluates to `b` only when `a` is `null` or `undefined` — unlike `||`, it
  does not short-circuit on `0`, `""`, or `false`. SJS types `a ?? b` as
  `T | U` where `a: T | null | undefined` and `b: U`. Using `??` on a
  provably non-nullable left operand emits `SJS-W005`. Mixing `??` with `&&`
  or `||` without parentheses is a parse error per spec; SJS surfaces this as
  `SJS-E007`.
- **SJS example**:
  ```sjs
  // Default for nullable string
  function greet(name: string?): string {
    return `Hello, ${name ?? "World"}`;
  }

  // Safe default when 0 is a valid value
  function getPort(config: { port: number? }): number {
    return config.port ?? 3000;
    // contrast: config.port || 3000 would wrongly use 3000 when port === 0
  }

  // Chained with ?.
  type Config = { db: { host: string? }? };

  function getDbHost(cfg: Config?): string {
    return cfg?.db?.host ?? "localhost";
  }

  // Nullish assignment (??=, ES2021 — shown here for contrast)
  function applyDefaults(prefs: { theme: string?; fontSize: number? }) {
    prefs.theme ??= "light";
    prefs.fontSize ??= 14;
  }
  ```
- **Compiled output**:
  ```js
  function greet(name) {
    return `Hello, ${name ?? "World"}`;
  }

  function getPort(config) {
    return config.port ?? 3000;
  }

  function getDbHost(cfg) {
    return cfg?.db?.host ?? "localhost";
  }

  function applyDefaults(prefs) {
    prefs.theme ??= "light";
    prefs.fontSize ??= 14;
  }
  // For --target es2020+: ?? emitted as-is.
  // For --target es2019 and below: transformed to:
  //   name !== null && name !== void 0 ? name : "World"
  ```

---

## Dynamic `import()`
- **ECMA-262 section**: §13.3.10
- **SJS role**: Partially supported. `import(specifier)` is a call-like
  expression (not a function) that returns `Promise<Module>`. When the
  specifier is a string literal and the target module has type information,
  SJS infers `Promise<typeof import("./module")>`. Non-literal paths return
  `Promise<any>` in SJS v1. For `--target es5`/`es2015` with bundling enabled,
  SJS transforms dynamic imports to `require()` calls via the bundler hook.
  Enables code splitting and lazy loading patterns.
- **SJS example**:
  ```sjs
  // Lazy-load a heavy module
  async function loadChart(): Promise<void> {
    const { ChartRenderer } = await import("./chart-renderer");
    const renderer = new ChartRenderer();
    renderer.draw();
  }

  // Route-based code splitting
  const routes: { [key: string]: string } = {
    "/home":    "./pages/home",
    "/profile": "./pages/profile",
    "/admin":   "./pages/admin",
  };

  async function navigateTo(route: string): Promise<void> {
    const modulePath: string | undefined = routes[route];
    if (modulePath) {
      const page = await import(modulePath);   // returns Promise<any> — non-literal
      page.default.render();
    }
  }
  ```
- **Compiled output**:
  ```js
  async function loadChart() {
    const { ChartRenderer } = await import("./chart-renderer");
    const renderer = new ChartRenderer();
    renderer.draw();
  }

  const routes = {
    "/home":    "./pages/home",
    "/profile": "./pages/profile",
    "/admin":   "./pages/admin",
  };

  async function navigateTo(route) {
    const modulePath = routes[route];
    if (modulePath) {
      const page = await import(modulePath);
      page.default.render();
    }
  }
  // For --target es2020+: import() is pass-through.
  // For --target es5 with bundler: transformed to Promise.resolve().then(() => require(...)).
  ```

---

## `import.meta`
- **ECMA-262 section**: §13.3.12
- **SJS role**: Partially supported. `import.meta` is a module-scoped object
  carrying host-defined metadata. The most common property is
  `import.meta.url` (the URL of the current module). SJS types
  `import.meta` as `{ url: string; [key: string]: unknown }` — the `url`
  property is always present in conformant hosts. Using `import.meta` outside
  a module context (e.g., in a CommonJS file) emits `SJS-E008`. Properties
  beyond `url` must be accessed through bracket notation or a cast in strict
  mode.
- **SJS example**:
  ```sjs
  // Resolve a path relative to the current module (Node.js / Deno / browsers)
  import { fileURLToPath } from "url";
  import { dirname, resolve } from "path";

  const __filename: string = fileURLToPath(import.meta.url);
  const __dirname: string = dirname(__filename);
  const configPath: string = resolve(__dirname, "config.json");

  // Detect dev vs prod via Vite's import.meta.env convention
  const isDev: boolean =
    (import.meta as any).env?.MODE === "development";

  // Self-referencing dynamic import
  async function reloadSelf(): Promise<void> {
    await import(import.meta.url);
  }
  ```
- **Compiled output**:
  ```js
  import { fileURLToPath } from "url";
  import { dirname, resolve } from "path";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const configPath = resolve(__dirname, "config.json");

  const isDev = import.meta?.env?.MODE === "development";

  async function reloadSelf() {
    await import(import.meta.url);
  }
  // import.meta is pass-through for ES module output.
  // For CommonJS output (--target es5/cjs): SJS replaces import.meta.url with
  //   a require("url").pathToFileURL(__filename).href expression.
  ```

---

## `for...of` on Strings — Typed Iteration
- **ECMA-262 section**: §14.7.5.6 (iteration protocol); §22.1.5 (String iterator)
- **SJS role**: `for...of` on a `string` iterates Unicode code points (not
  UTF-16 code units), yielding each full character as a `string`. This was
  defined in ES2015 via the String iterator; ES2020 clarified that engines
  must use the same Unicode iteration semantics consistently. SJS adds static
  typing: the iteration variable is typed `string` (one code-point per
  iteration). SJS also provides a linter hint (`prefer-string-split-spread`)
  when spreading a string into an array — `[...str]` — where explicit
  iteration is clearer for Unicode-aware code.
- **SJS example**:
  ```sjs
  // Iterate code points — correctly handles emoji and surrogate pairs
  const emoji: string = "Hello 🌍";

  for (const char of emoji) {
    // char: string — each Unicode code point, not UTF-16 unit
    console.log(char);   // H, e, l, l, o, " ", 🌍  (7 iterations, not 8)
  }

  // Typed spread into array
  function codePoints(s: string): string[] {
    return [...s];   // string[] — each element is one code point
  }

  // Count visible characters (Unicode-aware)
  function charCount(s: string): number {
    let count: number = 0;
    for (const _ of s) count++;
    return count;
  }

  console.log(charCount("Hello 🌍"));   // 7, not 8
  ```
- **Compiled output**:
  ```js
  const emoji = "Hello 🌍";

  for (const char of emoji) {
    console.log(char);
  }

  function codePoints(s) {
    return [...s];
  }

  function charCount(s) {
    let count = 0;
    for (const _ of s) count++;
    return count;
  }

  console.log(charCount("Hello 🌍"));
  // for...of on strings is native in all ES2015+ targets; types are stripped.
  // For --target es5: transformed to [...str] spread via regenerator or helper.
  ```

---

## Null Safety in SJS — ES2020 Synthesis

ES2020's `?.` and `??` are the runtime underpinning of SJS's `T?` null safety
model. The relationship between spec features and SJS types:

| SJS concept | ES2020 operator | Spec section |
|-------------|----------------|--------------|
| `T?` type (nullable) | Guides where `?.` is required | n/a — type system |
| `?.` access on `T?` | `?.` — short-circuit on null/undefined | §13.5.7 |
| `?? fallback` for `T?` | `??` — nullish coalescing | §13.13 |
| `??=` default assignment | `??=` — nullish assignment (ES2021) | §13.15 |
| Non-null assertion `x!` | n/a — SJS strips at compile time | n/a |

The SJS type-checker enforces the contract: **any value typed `T?` must be
accessed via `?.` or narrowed with a null check before direct property access**.
This catches null-pointer-equivalent errors at compile time rather than at
runtime.

---

## SJS Diagnostics — ES2020 Features

| Code | Severity | Trigger |
|------|----------|---------|
| SJS-E004 | error | `bigint` + `number` arithmetic or comparison without explicit conversion |
| SJS-E005 | error | Non-optional property access (`.`) on a `T?` value — use `?.` or narrow first |
| SJS-E006 | error | `String.matchAll` called with a regex literal missing the `g` flag |
| SJS-E007 | error | `??` mixed with `&&` or `\|\|` without parentheses (grammar restriction) |
| SJS-E008 | error | `import.meta` used outside a module context (e.g., in a CommonJS file) |
| SJS-W003 | warning | Loose `==` comparison between `bigint` and `number` |
| SJS-W004 | warning | `?.` used on a provably non-nullable type |
| SJS-W005 | warning | `??` left operand is provably non-nullable |

---

## Summary Table

| Feature | ECMA-262 § |
|---------|-----------|
| `BigInt` type | §6.1.6.2 |
| BigInt literals (`42n`) | §12.9.3 |
| `BigInt` object | §21.2 |
| `Promise.allSettled` | §27.2.4.3 |
| `String.prototype.matchAll` | §22.1.3.12 |
| `globalThis` | §19.1 |
| Optional chaining `?.` | §13.5.7 |
| Nullish coalescing `??` | §13.13 |
| Dynamic `import()` | §13.3.10 |
| `import.meta` | §13.3.12 |
| `for...of` on strings (typed iteration) | §14.7.5.6 / §22.1.5 |

---

## See Also

- `specs/ecmascript/es2019/highlights.md` — `Array.flat`, `Object.fromEntries`, optional catch
- `specs/ecmascript/es2021/highlights.md` — `Promise.any`, `??=`, numeric separators
- `specs/001-superjs-core-language/type-system.md` — SJS `T?` type model
- `specs/ecmascript/README.md` — full compliance matrix
- `prototype/src/typeChecker/index.ts` — runtime type-checker implementation
