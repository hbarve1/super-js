# SJS Examples — Round 2 Revised Plan

**Date:** 2026-05-30
**Replaces:** `plan-round1.md`
**Addresses:** Every issue in `critique-round1.md`
**Spec authority:** `specs/001-superjs-core-language/type-system-v2.md` (normative)

---

## Spec-Grounded Clarifications (resolving critique §1 issues)

Before any file specs, the following questions from the critique are resolved against the spec:

| Question | Answer (spec citation) |
|---|---|
| `private` keyword | Supported — spec §6 (Classes) uses `private` fields; ES2022 `#field` is also valid. Both allowed. |
| `abstract` keyword | Spec §6 shows class examples with `abstract`; accepted as valid SJS. |
| `implements` keyword | Spec §5.4: optional, explicit, for early error checking. It IS valid SJS — the critique in Round 1 was wrong to remove it. Files should show it as optional, not remove it. |
| `T?` meaning | Spec §3.2: `T?` is `T \| null`. NOT `T \| null \| undefined`. Accessing optional params yields `T \| undefined`. |
| `Map.get()` return type | Spec §8.4: `Map<K,V>.get(key)` returns `V \| undefined`. Use `?? default` or explicit check. NOT `V?`. |
| `Partial<T>` | Spec §13.2: No built-in `Partial` in Phase 1. Replace with explicit interface having all-optional fields. |
| `as T` type casts | Spec §14.7: excluded ("Type assertions `x as T`"). Use narrowing or assign to `dynamic` local. |
| `<T: Interface>` syntax | Spec §9.2: constraint uses colon — `function f<T: Bar>(x: T)`. TypeScript's `extends` is wrong. |
| `<T: A & B>` multiple constraints | Spec §9.3: `&` in constraint position is allowed (constraint intersection, not type intersection). |
| `string \| number` unions | Spec §10.1: allowed. Narrow with `typeof`. Show narrowing technique every time. |
| `Map.get` in sum types | Spec §4.3: tuple variant syntax is `Ok(T)` — parentheses, not curly braces. Struct variant uses `Circle { radius: number }`. |
| Sum type construction | Spec §4.3: `const s = Circle { radius: 5 }` for struct variants; `const r = Ok(42)` for tuple variants. |
| Match arm syntax | Spec §4.5: `match shape { Circle { radius } => ... }` — no comma between arms. |

---

## Banned Pattern Reference (§3.11 / §13 of spec)

| # | Banned | SJS replacement |
|---|---|---|
| B1 | `any` | `dynamic` |
| B2 | `T \| undefined` for nullable (except optional params/Map.get — those ARE `T \| undefined` per spec) | `T?` for nullable fields/returns |
| B3 | `T extends U ? A : B` conditional type | generic constraints `<T: I>` |
| B4 | `{ [K in keyof T]: ... }` mapped type | explicit interface / interface extension |
| B5 | `A & B` user-facing intersection | interface extension or explicit record |
| B6 | `enum Foo { ... }` | `type Foo = \| A \| B \| C` sum type |
| B7 | `namespace Foo { ... }` | ES module export/import |
| B8 | `expr!` non-null assertion | null check + narrowing (spec §3.7) |
| B9 | `x as T` type cast | assign to `dynamic` local then access |
| B10 | `typeof X[keyof typeof X]` | direct type alias |
| B11 | `Partial<T>` | explicit interface with `?:` fields |
| B12 | `T extends string` constraint | `T: StringLike` with interface |
| B13 | `function f(): x is T` type predicate | Phase 2 feature — use `typeof` / `match` in Phase 1 |

---

## Directory Structure (Final)

```
prototype/examples/
  README.md                              root learning path, prerequisites, run commands
  
  basics/                                KEEP + MINOR FIX (8 files already written)
    README.md                            NEW
    hello-world.sjs                      AUDIT
    variables.sjs                        AUDIT
    functions.sjs                        AUDIT
    arrays.sjs                           AUDIT
    objects.sjs                          AUDIT
    loops.sjs                            AUDIT
    control-flow.sjs                     AUDIT
    template-literals.sjs                AUDIT
    classes.sjs                          REWRITE (T|undefined → T?)
    types.sjs                            REWRITE (remove Optional<T> alias)

  null-safety/                           NEW (3 files)
    README.md                            NEW
    01-basics.sjs                        T? declarations, null narrowing
    02-chaining.sjs                      ?. optional chain
    03-defaults.sjs                      ?? nullish coalescing
    04-nullable-iteration.sjs            iterating T?[] safely

  sum-types/                             NEW (4 files)
    README.md                            NEW
    01-basics.sjs                        type declarations, constructors
    02-match.sjs                         exhaustive match, wildcard arm
    03-generic-sum-types.sjs             Result<T,E>, Option<T>
    04-recursive.sjs                     Tree<T>, List<T>

  match/                                 NEW (3 files)
    README.md                            NEW
    01-patterns.sjs                      struct/tuple/unit variant patterns
    02-destructuring.sjs                 nested patterns, binding rename
    03-exhaustiveness.sjs                SJS-E007 — what it looks like and fixes

  dynamic/                               NEW (2 files)
    README.md                            NEW
    01-when-to-use.sjs                   dynamic vs T? vs sum type — decision guide
    02-js-interop.sjs                    dynamic at JS API boundary, runtime narrowing

  structural-interfaces/                 NEW (2 files)
    README.md                            NEW
    01-no-implements.sjs                 satisfaction by shape, no implements needed
    02-generic-interfaces.sjs            <T: Comparable<T>>, constraint syntax

  generics/                              REWRITE (merge advanced/generics + new)
    README.md                            NEW
    01-basic.sjs                         identity<T>, first<T>, T? returns
    02-constraints.sjs                   <T: Interface>, <T: A & B>
    03-generic-sum-types.sjs             generic Result/Option (cross-ref sum-types/)

  async/                                 REWRITE
    README.md                            NEW
    01-promises.sjs                      AUDIT/REWRITE
    02-async-await.sjs                   REWRITE (Result<T,E> errors, no `as Error`)
    03-error-handling.sjs                REWRITE (Result<T,E> wrap pattern)
    04-concurrent.sjs                    NEW — Promise.all, async iteration

  gradual-typing/                        KEEP + EXPAND
    README.md                            NEW
    plain-js.sjs                         KEEP (intentionally untyped)
    mixed.sjs                            KEEP (partially typed)
    step-by-step.sjs                     NEW — migration path plain→partial→full→sum-types

  jsx/                                   PARTIAL REWRITE + new sum-types file
    README.md                            NEW
    basic-counter.sjs                    AUDIT
    fragments-and-composition.sjs        REWRITE (children: dynamic not any)
    server-side-rendering.sjs            KEEP
    todo-list.sjs                        REWRITE (remove as cast)
    sum-types.sjs                        NEW — JSX component using Result<T,E> in props/render

  modules/                               EXPAND
    README.md                            NEW
    math.sjs                             KEEP
    main.sjs                             KEEP
    collections.sjs                      NEW — generic Stack<T>, Queue<T> exports
    http.sjs                             NEW — async module with Result<T,E>

  node/                                  KEEP (already good)
    src/analyzer.sjs                     KEEP
    src/formatter.sjs                    AUDIT
    src/fs-utils.sjs                     AUDIT
    src/main.sjs                         AUDIT

  oop/                                   AUDIT + FIX
    README.md                            NEW
    abstract-classes.sjs                 REWRITE (T|undefined → T?)
    inheritance.sjs                      AUDIT
    mixins.sjs                           REWRITE (any→dynamic, !→?.  , no applyMixins)

  patterns/                              REWRITE
    README.md                            NEW
    builder.sjs                          AUDIT/REWRITE (new file on branch 001)
    dependency-injection.sjs             REWRITE (Map<string,dynamic>)
    events.sjs                           REWRITE (remove mapped types)
    functional.sjs                       AUDIT/REWRITE
    middleware.sjs                       REWRITE (body: dynamic)
    observable.sjs                       KEEP
    state.sjs                            REWRITE (SJS sum type Action)

  types/                                 REWRITE ALL
    README.md                            NEW
    interfaces.sjs                       REWRITE (structural, no banned patterns)
    literal-and-enum.sjs                 REWRITE (enum → sum types)
    generics-advanced.sjs                REWRITE (remove all TS-specific)
    tuple-types.sjs                      REWRITE (remove labeled tuples if unsupported)
    type-aliases.sjs                     REWRITE (remove mapped/conditional types)
    union-types.sjs                      REWRITE (add narrowing guidance)

  algorithms/                            REWRITE nullable
    README.md                            KEEP
    hash-map.sjs                         REWRITE
    binary-search-tree.sjs               REWRITE
    graph.sjs                            REWRITE
    linked-list.sjs                      REWRITE
    sorting.sjs                          AUDIT
    stack-queue.sjs                      REWRITE

  real-world/                            NEW (3 mini-apps)
    README.md                            NEW
    task-manager.sjs                     CRUD + Result + nullable + async
    http-client.sjs                      fetch wrapper + Result<T,HttpError> + retry
    config-loader.sjs                    file parse + sum-type errors

  errors/                                NEW (2 files)
    README.md                            NEW
    SJS-E001-null-deref.sjs              what E001 looks like + 3 fixes
    SJS-E007-nonexhaustive.sjs           what E007 looks like + 3 fixes

  testing/                               NEW (2 files)
    README.md                            NEW
    01-basic.test.sjs                    basic assertions, Result testing
    02-async.test.sjs                    testing async functions returning Result
```

**Counts:**
- Net new files: 3 (null-safety) + 4 (sum-types) + 3 (match) + 2 (dynamic) + 2 (structural-interfaces) + 3 (generics) + 1 (async/concurrent) + 1 (gradual-typing/step-by-step) + 1 (jsx/sum-types) + 2 (modules) + 3 (real-world) + 2 (errors) + 2 (testing) + ~16 (README files) = **45 new files**
- Full rewrites: 23
- Audit + minor fix: 20
- Keep as-is: 6
- **Total files touched: ~94**

---

## Reading Order (Canonical Learning Path)

Files are numbered where order matters. The root README defines this sequence:

1. `basics/hello-world.sjs` → `variables.sjs` → `functions.sjs` → `arrays.sjs` → `objects.sjs` → `loops.sjs` → `control-flow.sjs` → `template-literals.sjs` → `classes.sjs` → `types.sjs`
2. `null-safety/01-basics.sjs` → `02-chaining.sjs` → `03-defaults.sjs` → `04-nullable-iteration.sjs`
3. `sum-types/01-basics.sjs` → `02-match.sjs` → `03-generic-sum-types.sjs` → `04-recursive.sjs`
4. `match/01-patterns.sjs` → `02-destructuring.sjs` → `03-exhaustiveness.sjs`
5. `dynamic/01-when-to-use.sjs` → `02-js-interop.sjs`
6. `structural-interfaces/01-no-implements.sjs` → `02-generic-interfaces.sjs`
7. `generics/01-basic.sjs` → `02-constraints.sjs`
8. `gradual-typing/plain-js.sjs` → `mixed.sjs` → `step-by-step.sjs`
9. `async/01-promises.sjs` → `02-async-await.sjs` → `03-error-handling.sjs` → `04-concurrent.sjs`
10. `oop/` → `algorithms/` → `patterns/` → `types/` (reference material)
11. `real-world/` → `jsx/` (synthesis — uses all concepts)
12. `errors/` (troubleshooting reference)
13. `testing/` (how to test SJS code)

**Max 3 new SJS concepts introduced per file** — enforced in each spec below.

---

## Quality Criteria (Per-File)

A file is DONE when all hold:

1. **No banned patterns** (B1–B13 above) present anywhere.
2. **Compiles clean:** `superjs build --source <file> --outDir /tmp/sjs-out && node /tmp/sjs-out/<name>.js`
3. **Runs and prints expected output** (demo block produces at least one console.log line).
4. **Header comment** states exactly what concept is taught, max 3 concepts named.
5. **≤200 lines**.
6. **"Must not contain" list** from per-file spec below is respected.
7. **Per-category README** lists the file in reading order with its run command.

---

## Sprint Plan

### Sprint 0 — Delete wrong files + establish baseline (1 day)

**Goal:** Remove files with no salvageable content. Confirm compile pipeline works.

| Action | Files | Time |
|---|---|---|
| DELETE | `advanced/decorators.sjs` — decorator syntax not in SJS spec; replacement is `patterns/functional.sjs` | 0.5h |
| DELETE | `types/generics-advanced.sjs` original — full rewrite, not preserve | 0.5h |
| DELETE | `types/literal-and-enum.sjs` original — full rewrite | 0.5h |
| CONFIRM BUILD | `superjs build --source prototype/examples/node/src/analyzer.sjs --outDir /tmp/test && node /tmp/test/analyzer.js` — baseline for "it works" | 1h |
| CONFIRM BUILD | `superjs build --dir prototype/examples/basics --outDir /tmp/test` — smoke test basics | 1h |

**Done signal:** `node /tmp/test/analyzer.js` prints without error. `superjs build --dir prototype/examples/basics` produces 0 type errors.

---

### Sprint A — New categories: null-safety, sum-types, match, dynamic, structural-interfaces (3 days)

Each file: 1h straightforward, 2h new file, 3h complex new file.

| File | Hours | Done signal |
|---|---|---|
| `null-safety/01-basics.sjs` | 2h | |
| `null-safety/02-chaining.sjs` | 2h | |
| `null-safety/03-defaults.sjs` | 2h | |
| `null-safety/04-nullable-iteration.sjs` | 2h | |
| `null-safety/README.md` | 0.5h | |
| `sum-types/01-basics.sjs` | 2h | |
| `sum-types/02-match.sjs` | 2h | |
| `sum-types/03-generic-sum-types.sjs` | 3h | |
| `sum-types/04-recursive.sjs` | 3h | |
| `sum-types/README.md` | 0.5h | |
| `match/01-patterns.sjs` | 2h | |
| `match/02-destructuring.sjs` | 2h | |
| `match/03-exhaustiveness.sjs` | 2h | |
| `match/README.md` | 0.5h | |
| `dynamic/01-when-to-use.sjs` | 2h | |
| `dynamic/02-js-interop.sjs` | 2h | |
| `dynamic/README.md` | 0.5h | |
| `structural-interfaces/01-no-implements.sjs` | 2h | |
| `structural-interfaces/02-generic-interfaces.sjs` | 2h | |
| `structural-interfaces/README.md` | 0.5h | |

**Sprint A done signal:** `superjs build --dir prototype/examples/null-safety --outDir /tmp/ns && node /tmp/ns/01-basics.js` (and each file in each new dir) — all compile clean and print expected output.

---

### Sprint B — High-value rewrites: types/, patterns/, generics (2 days)

| File | Hours |
|---|---|
| `types/interfaces.sjs` | 1h |
| `types/literal-and-enum.sjs` (REWRITE) | 2h |
| `types/generics-advanced.sjs` (REWRITE) | 3h |
| `types/tuple-types.sjs` | 1h |
| `types/type-aliases.sjs` | 1h |
| `types/union-types.sjs` | 1h |
| `types/README.md` | 0.5h |
| `generics/01-basic.sjs` | 2h |
| `generics/02-constraints.sjs` | 2h |
| `generics/03-generic-sum-types.sjs` | 2h |
| `generics/README.md` | 0.5h |
| `patterns/events.sjs` | 2h |
| `patterns/state.sjs` | 2h |
| `patterns/dependency-injection.sjs` | 1h |
| `patterns/middleware.sjs` | 1h |
| `patterns/README.md` | 0.5h |

**Sprint B done signal:** `superjs build --dir prototype/examples/types --outDir /tmp/types` — 0 errors. Same for `generics/`, `patterns/`.

---

### Sprint C — Algorithm/OOP/async rewrites (2 days)

| File | Hours |
|---|---|
| `algorithms/hash-map.sjs` | 1h |
| `algorithms/binary-search-tree.sjs` | 2h |
| `algorithms/linked-list.sjs` | 2h |
| `algorithms/graph.sjs` | 2h |
| `algorithms/stack-queue.sjs` | 1h |
| `algorithms/sorting.sjs` (audit) | 0.5h |
| `oop/abstract-classes.sjs` | 1h |
| `oop/mixins.sjs` | 2h |
| `oop/inheritance.sjs` (audit) | 0.5h |
| `oop/README.md` | 0.5h |
| `async/01-promises.sjs` | 1h |
| `async/02-async-await.sjs` | 2h |
| `async/03-error-handling.sjs` | 2h |
| `async/04-concurrent.sjs` | 2h |
| `async/README.md` | 0.5h |

**Sprint C done signal:** `superjs build --dir prototype/examples/algorithms --outDir /tmp/alg` — 0 errors. Same for `oop/`, `async/`.

---

### Sprint D — Real-world, errors, testing, gradual-typing, jsx, modules, README (3 days)

| File | Hours |
|---|---|
| `real-world/task-manager.sjs` | 3h |
| `real-world/http-client.sjs` | 3h |
| `real-world/config-loader.sjs` | 3h |
| `real-world/README.md` | 0.5h |
| `errors/SJS-E001-null-deref.sjs` | 2h |
| `errors/SJS-E007-nonexhaustive.sjs` | 2h |
| `errors/README.md` | 0.5h |
| `testing/01-basic.test.sjs` | 2h |
| `testing/02-async.test.sjs` | 2h |
| `testing/README.md` | 0.5h |
| `gradual-typing/step-by-step.sjs` | 2h |
| `gradual-typing/README.md` | 0.5h |
| `jsx/sum-types.sjs` | 2h |
| `jsx/fragments-and-composition.sjs` | 1h |
| `jsx/todo-list.sjs` | 1h |
| `jsx/README.md` | 0.5h |
| `modules/collections.sjs` | 2h |
| `modules/http.sjs` | 2h |
| `modules/README.md` | 0.5h |
| `basics/classes.sjs` | 1h |
| `basics/types.sjs` | 1h |
| `basics/README.md` | 0.5h |
| Root `README.md` | 2h |
| `node/README.md` | 0.5h |
| Audit: `basics/` (8 files) | 2h total |
| Audit: `jsx/basic-counter.sjs`, `server-side-rendering.sjs` | 1h |
| Audit: `node/src/` (3 files) | 1.5h |
| Audit: `patterns/builder.sjs`, `functional.sjs`, `observable.sjs` | 1.5h |

**Sprint D done signal:** `superjs build --dir prototype/examples --outDir /tmp/all` — 0 type errors across the full examples tree. `superjs test prototype/examples/testing/` — all tests pass.

---

## Per-File Specifications

Every spec below includes: exact filename, 3–5 line code sketch in valid SJS, must-not-contain list, run command.

---

### `null-safety/01-basics.sjs`

**Concepts taught (max 3):** `T?` type declaration, null narrowing with `if`, non-nullable by default.

```sjs
// null-safety/01-basics.sjs — T? declarations and null narrowing
interface User { id: number; name: string; email: string?; bio: string? }

function formatEmail(user: User): string {
  if (user.email === null) return "(no email)"
  return "mailto:" + user.email   // email: string here (narrowed)
}

function describe(user: User): string {
  const bio = user.bio
  if (bio === null) return user.name + " — no bio"
  return user.name + ": " + bio
}

const alice: User = { id: 1, name: "Alice", email: "alice@example.com", bio: null }
const bob: User = { id: 2, name: "Bob", email: null, bio: "Engineer" }
console.log(formatEmail(alice))  // mailto:alice@example.com
console.log(describe(bob))       // Bob: Engineer
```

**Must not contain:** `T | null`, `T | undefined`, `?.`, `??`, `!`.
**Run:** `superjs build --source prototype/examples/null-safety/01-basics.sjs --outDir /tmp/out && node /tmp/out/01-basics.js`

---

### `null-safety/02-chaining.sjs`

**Concepts taught:** `?.` optional chaining on objects, arrays, function calls.

```sjs
// null-safety/02-chaining.sjs — ?. optional chain
interface Address { street: string; city: string; zip: string? }
interface Profile { displayName: string?; address: Address?; tags: string[]? }
interface Organization { name: string; owner: Profile? }

function getCity(org: Organization): string | undefined { return org.owner?.address?.city }
function firstTag(profile: Profile?): string | undefined { return profile?.tags?.[0] }
function callGreeter(greeter: (() => string)?): string | undefined { return greeter?.() }

const org: Organization = { name: "Acme", owner: { displayName: "Ada", address: null, tags: ["eng"] } }
console.log(getCity(org))       // undefined (address is null)
console.log(firstTag(org.owner)) // eng
```

**Must not contain:** `!`, `T | null`, plain property access on nullable without `?.`.
**Run:** `superjs build --source prototype/examples/null-safety/02-chaining.sjs --outDir /tmp/out && node /tmp/out/02-chaining.js`

---

### `null-safety/03-defaults.sjs`

**Concepts taught:** `??` nullish coalescing, `??=` nullish assignment, difference from `||`.

```sjs
// null-safety/03-defaults.sjs — ?? nullish coalescing
interface AppSettings { theme: string?; fontSize: number?; language: string? }

function resolveSettings(partial: AppSettings): AppSettings {
  return {
    theme: partial.theme ?? "light",
    fontSize: partial.fontSize ?? 14,
    language: partial.language ?? "en"
  }
}

function greet(name: string?): string { return "Hello, " + (name ?? "stranger") }
// Show ?? vs || difference: 0 and "" are falsy but NOT null
const count: number? = 0
console.log(count ?? 99)   // 0  — ?? does not trigger on 0
console.log(count || 99)   // 99 — || triggers on 0 (falsy)
```

**Must not contain:** `T | null`, `!`, `?.`, no `||` except in the explicit contrast block.
**Run:** `superjs build --source prototype/examples/null-safety/03-defaults.sjs --outDir /tmp/out && node /tmp/out/03-defaults.js`

---

### `null-safety/04-nullable-iteration.sjs`

**Concepts taught:** Iterating `T?[]` safely, filtering nulls, for-of with nullable elements.

```sjs
// null-safety/04-nullable-iteration.sjs — iterating T?[] safely
function compact<T>(arr: T?[]): T[] {
  const result: T[] = []
  for (const item of arr) {
    if (item !== null) result.push(item)  // item: T here (narrowed)
  }
  return result
}

function firstNonNull<T>(arr: T?[]): T? {
  for (const item of arr) {
    if (item !== null) return item
  }
  return null
}

const names: string?[] = ["Alice", null, "Bob", null, "Carol"]
console.log(compact(names))          // ["Alice", "Bob", "Carol"]
console.log(firstNonNull(names))     // Alice
```

**Must not contain:** `T | null`, `T | undefined`, `!`, `.filter(Boolean)` (hides type information).
**Run:** `superjs build --source prototype/examples/null-safety/04-nullable-iteration.sjs --outDir /tmp/out && node /tmp/out/04-nullable-iteration.js`

---

### `sum-types/01-basics.sjs`

**Concepts taught:** Sum type declaration (struct/tuple/unit variants), construction syntax.

```sjs
// sum-types/01-basics.sjs — sum type declarations and constructors
type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number }
  | Point

type Color = | Red | Green | Blue | Custom { r: number; g: number; b: number }
type Direction = | North | South | East | West

function area(s: Shape): number {
  return match s {
    Circle { radius } => Math.PI * radius * radius
    Rectangle { width; height } => width * height
    Point => 0
  }
}

const c: Shape = Circle { radius: 5 }
const r: Shape = Rectangle { width: 4; height: 6 }
console.log(area(c))   // 78.539...
console.log(area(r))   // 24
```

**Must not contain:** `enum`, `switch`, string literal unions for these types, `_tag` manual access.
**Run:** `superjs build --source prototype/examples/sum-types/01-basics.sjs --outDir /tmp/out && node /tmp/out/01-basics.js`

---

### `sum-types/02-match.sjs`

**Concepts taught:** Exhaustive `match`, wildcard arm (`_`), nested match, when to use wildcard vs exhaustive.

```sjs
// sum-types/02-match.sjs — exhaustive match and wildcard
type Token = | Number(number) | StringLit(string) | Bool(boolean) | Null | Identifier(string)

function tokenToString(t: Token): string {
  return match t {
    Number(n) => "num:" + n
    StringLit(s) => "str:" + s
    Bool(b) => "bool:" + b
    Null => "null"
    Identifier(name) => "id:" + name
    // All 5 variants covered — SJS-E007 would fire if any were missing
  }
}

// Wildcard suppresses exhaustiveness — use deliberately
function isLiteral(t: Token): boolean {
  return match t {
    Number(_) => true
    StringLit(_) => true
    Bool(_) => true
    Null => true
    _ => false    // wildcard — future variants default to false
  }
}

console.log(tokenToString(Number(42)))     // num:42
console.log(isLiteral(Identifier("x")))   // false
```

**Must not contain:** `switch`, `enum`, all-wildcard match (must show exhaustive version).
**Run:** `superjs build --source prototype/examples/sum-types/02-match.sjs --outDir /tmp/out && node /tmp/out/02-match.js`

---

### `sum-types/03-generic-sum-types.sjs`

**Concepts taught:** `Result<T,E>`, `Option<T>` as generic sum types, chaining with helper functions.

```sjs
// sum-types/03-generic-sum-types.sjs — Result<T,E> and Option<T>
type Result<T, E> = | Ok(T) | Err(E)
type Option<T> = | Some(T) | None

function mapResult<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
  return match r {
    Ok(value) => Ok(f(value))
    Err(e) => Err(e)
  }
}

function flatMapResult<T, U, E>(r: Result<T, E>, f: (v: T) => Result<U, E>): Result<U, E> {
  return match r {
    Ok(value) => f(value)
    Err(e) => Err(e)
  }
}

function parseNumber(s: string): Result<number, string> {
  const n = Number(s)
  if (isNaN(n)) return Err("not a number: " + s)
  return Ok(n)
}

function divideBy(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

// Chain: parse then divide
const result = flatMapResult(parseNumber("10"), n => divideBy(100, n))
match result {
  Ok(v) => console.log("result: " + v)   // result: 10
  Err(msg) => console.log("error: " + msg)
}
```

**Must not contain:** `T | null` for error representation, `throw`, `try/catch`, `any`.
**Run:** `superjs build --source prototype/examples/sum-types/03-generic-sum-types.sjs --outDir /tmp/out && node /tmp/out/03-generic-sum-types.js`

---

### `sum-types/04-recursive.sjs`

**Concepts taught:** Recursive sum types, structural recursion via match.

```sjs
// sum-types/04-recursive.sjs — Tree<T> and List<T>
type Tree<T> = | Leaf | Node { value: T; left: Tree<T>; right: Tree<T> }
type List<T> = | Nil | Cons(T, List<T>)

function treeDepth<T>(t: Tree<T>): number {
  return match t {
    Leaf => 0
    Node { left; right } => 1 + Math.max(treeDepth(left), treeDepth(right))
  }
}

function listToArray<T>(l: List<T>): T[] {
  const acc: T[] = []
  let cur: List<T> = l
  while (true) {
    const step = cur
    if (match step { Nil => true, Cons(_, _) => false }) break
    match step {
      Cons(h, t) => { acc.push(h); cur = t }
      Nil => break
    }
  }
  return acc
}

const tree: Tree<number> = Node { value: 1; left: Node { value: 2; left: Leaf; right: Leaf }; right: Leaf }
console.log(treeDepth(tree))   // 2
```

**Must not contain:** class-based tree with `left: TreeNode | null`.
**Run:** `superjs build --source prototype/examples/sum-types/04-recursive.sjs --outDir /tmp/out && node /tmp/out/04-recursive.js`

---

### `match/01-patterns.sjs`

**Concepts taught:** Struct variant patterns, tuple variant patterns, unit variant patterns — all three in one file.

```sjs
// match/01-patterns.sjs — struct, tuple, and unit variant patterns
type Event =
  | Click { x: number; y: number }
  | KeyPress(string)
  | Scroll { delta: number; direction: string }
  | Resize
  | Focus

function handleEvent(e: Event): string {
  return match e {
    Click { x; y } => `clicked at ${x},${y}`
    KeyPress(key) => `key: ${key}`
    Scroll { delta; direction } => `scroll ${direction} by ${delta}`
    Resize => "window resized"
    Focus => "focus gained"
  }
}

console.log(handleEvent(Click { x: 100; y: 200 }))   // clicked at 100,200
console.log(handleEvent(KeyPress("Enter")))            // key: Enter
console.log(handleEvent(Resize))                       // window resized
```

**Must not contain:** `switch`, `if-else` chains replacing match, string literal discriminants.
**Run:** `superjs build --source prototype/examples/match/01-patterns.sjs --outDir /tmp/out && node /tmp/out/01-patterns.js`

---

### `match/02-destructuring.sjs`

**Concepts taught:** Nested patterns, binding rename (`field: alias`), partial destructuring with `_`.

```sjs
// match/02-destructuring.sjs — nested patterns and binding rename
type Expr =
  | Lit(number)
  | Add { left: Expr; right: Expr }
  | Mul { left: Expr; right: Expr }
  | Neg(Expr)

function evaluate(e: Expr): number {
  return match e {
    Lit(n) => n
    Add { left: l; right: r } => evaluate(l) + evaluate(r)   // binding rename: left → l
    Mul { left: l; right: r } => evaluate(l) * evaluate(r)
    Neg(inner) => -evaluate(inner)
  }
}

// Nested pattern: match Add where left is Lit(0) → simplify
function simplify(e: Expr): Expr {
  return match e {
    Add { left: Lit(0); right: r } => r   // nested Lit(0) pattern
    Add { left: l; right: Lit(0) } => l
    _ => e
  }
}

console.log(evaluate(Add { left: Lit(3); right: Mul { left: Lit(2); right: Lit(4) } }))  // 11
```

**Must not contain:** manual `_tag` access, `instanceof` checks replacing match.
**Run:** `superjs build --source prototype/examples/match/02-destructuring.sjs --outDir /tmp/out && node /tmp/out/02-destructuring.js`

---

### `match/03-exhaustiveness.sjs`

**Concepts taught:** What SJS-E007 looks like, three ways to fix it.

```sjs
// match/03-exhaustiveness.sjs — SJS-E007: non-exhaustive match
// This file shows the error and THREE ways to fix it.
// Comments labeled /* ERROR */ show the triggering code.
// Comments labeled /* FIX */ show the resolution.

type Status = | Active | Inactive | Suspended | Deleted

// /* ERROR: SJS-E007 — match does not cover Suspended and Deleted */
// function describeWrong(s: Status): string {
//   return match s {
//     Active => "running"
//     Inactive => "stopped"
//   }
// }

/* FIX 1: Add all missing arms (preferred — compile-time safe) */
function describeFix1(s: Status): string {
  return match s {
    Active => "running"
    Inactive => "stopped"
    Suspended => "suspended"
    Deleted => "deleted"
  }
}

/* FIX 2: Wildcard arm (opt out of exhaustiveness — future variants fall through) */
function describeFix2(s: Status): string {
  return match s {
    Active => "running"
    Inactive => "stopped"
    _ => "other"
  }
}

/* FIX 3: assertNever helper — retain exhaustiveness proof even with wildcard-style default */
function assertNever(x: never): never { throw new Error("Unhandled: " + JSON.stringify(x)) }

function describeFix3(s: Status): string {
  return match s {
    Active => "running"
    Inactive => "stopped"
    Suspended => "suspended"
    Deleted => "deleted"
    // If Status gains a new variant, SJS-E007 fires here — not silently at runtime
  }
}

console.log(describeFix1(Active))   // running
console.log(describeFix2(Suspended)) // other
```

**Must not contain:** switch, no-op error commentary — every fix must be real runnable code.
**Run:** `superjs build --source prototype/examples/match/03-exhaustiveness.sjs --outDir /tmp/out && node /tmp/out/03-exhaustiveness.js`

---

### `dynamic/01-when-to-use.sjs`

**Concepts taught:** When to reach for `dynamic` vs `T?` vs sum type — decision guide with concrete examples.

```sjs
// dynamic/01-when-to-use.sjs — dynamic vs T? vs sum type
// Rule: reach for the most specific tool first.
//   1. T?   — value may be null, same type otherwise
//   2. sum type — value is one of several distinct shapes
//   3. dynamic — JS interop boundary or truly opaque external value

// CORRECT: T? for "may be absent"
interface User { id: number; nickname: string? }
function greet(u: User): string { return "Hi " + (u.nickname ?? u.id.toString()) }

// CORRECT: sum type for distinct shapes
type SearchResult = | Found { url: string; title: string } | NotFound | Error(string)

// CORRECT: dynamic for JSON.parse (opaque external value)
function parseConfig(raw: string): dynamic { return JSON.parse(raw) }

// WRONG (do not do this): using dynamic when T? is clearer
// function wrong(x: dynamic): void { ... }  // x could just be string?

// WRONG: using dynamic when a sum type captures intent
// function wrong2(): dynamic { ... }  // use Result<T,E> instead

const u: User = { id: 42, nickname: null }
console.log(greet(u))   // Hi 42
const r: SearchResult = NotFound
match r { Found { url } => console.log(url); NotFound => console.log("not found"); Error(e) => console.log(e) }
```

**Must not contain:** any use of `dynamic` as a lazy substitute for `T?` or sum types.
**Run:** `superjs build --source prototype/examples/dynamic/01-when-to-use.sjs --outDir /tmp/out && node /tmp/out/01-when-to-use.js`

---

### `dynamic/02-js-interop.sjs`

**Concepts taught:** `dynamic` at JS API boundary, runtime narrowing via `typeof`, explicit conversion to typed value.

```sjs
// dynamic/02-js-interop.sjs — dynamic at the JS interop boundary
// Requires Node 18+ for globalThis.fetch reference (fetch not called, only typed)

// Pattern: accept dynamic from external source, narrow immediately
function extractString(raw: dynamic): string? {
  if (typeof raw === "string") return raw   // raw: string (narrowed)
  return null
}

function extractNumber(raw: dynamic): number? {
  if (typeof raw === "number") return raw
  return null
}

// Pattern: parse untyped config map into typed record
interface ServerConfig { host: string; port: number }

function parseServerConfig(raw: dynamic): ServerConfig? {
  const host = extractString(raw.host)
  const port = extractNumber(raw.port)
  if (host === null || port === null) return null
  return { host, port }
}

// Pattern: dynamic DOM access without as-cast
function getInputValue(element: dynamic): string {
  const value: dynamic = element.value
  return extractString(value) ?? ""
}

const raw: dynamic = JSON.parse('{"host":"localhost","port":3000}')
const config = parseServerConfig(raw)
if (config !== null) console.log(config.host + ":" + config.port)  // localhost:3000
```

**Must not contain:** `as string`, `as number`, any `as T` cast — only `typeof` narrowing.
**Run:** `superjs build --source prototype/examples/dynamic/02-js-interop.sjs --outDir /tmp/out && node /tmp/out/02-js-interop.js`

---

### `structural-interfaces/01-no-implements.sjs`

**Concepts taught:** Structural typing — no `implements` keyword needed, satisfaction by shape.

```sjs
// structural-interfaces/01-no-implements.sjs — satisfaction by shape
// In SJS, `implements` is optional. Any object/class with the right shape satisfies an interface.

interface Named { name: string }
interface Printable { print(): void }
interface Serializable { serialize(): string }

// Class without implements — satisfies Named and Serializable by shape
class Product {
  name: string
  price: number
  constructor(name: string, price: number) { this.name = name; this.price = price }
  serialize(): string { return JSON.stringify({ name: this.name, price: this.price }) }
  print(): void { console.log(this.name + " $" + this.price) }
}

// Plain object satisfies Named
const tag: Named = { name: "tag-value" }

// Function accepts Named — both Product instance and plain object work
function printName(n: Named): void { console.log(n.name) }
function printAll(s: Serializable): void { console.log(s.serialize()) }

const p = new Product("Widget", 9.99)
printName(p)    // Widget — Product satisfies Named structurally
printName(tag)  // tag-value — plain object satisfies Named
printAll(p)     // {"name":"Widget","price":9.99}
```

**Must not contain:** `implements` keyword (show that it is not needed), intersection types.
**Run:** `superjs build --source prototype/examples/structural-interfaces/01-no-implements.sjs --outDir /tmp/out && node /tmp/out/01-no-implements.js`

---

### `structural-interfaces/02-generic-interfaces.sjs`

**Concepts taught:** `<T: Interface>` constraint syntax, self-referential constraint `<T: Comparable<T>>`, multiple constraints.

```sjs
// structural-interfaces/02-generic-interfaces.sjs — <T: Constraint> generic syntax
interface Comparable<T> { compareTo(other: T): number }
interface Printable { print(): void }
interface HasLength { length: number }

// Single constraint: <T: Comparable<T>>
function min<T: Comparable<T>>(a: T, b: T): T {
  return a.compareTo(b) <= 0 ? a : b
}

// Multiple constraints: <T: Comparable<T> & Printable>
function sortAndPrint<T: Comparable<T> & Printable>(items: T[]): void {
  items.sort((a, b) => a.compareTo(b))
  items.forEach(item => item.print())
}

// Constraint on built-in: <T: HasLength>
function longest<T: HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}

class Temperature {
  value: number
  constructor(v: number) { this.value = v }
  compareTo(other: Temperature): number { return this.value - other.value }
  print(): void { console.log(this.value + "°") }
}

console.log(min(new Temperature(30), new Temperature(20)).value)   // 20
sortAndPrint([new Temperature(30), new Temperature(10), new Temperature(20)])  // 10° 20° 30°
console.log(longest("hello", "hi"))  // hello
```

**Must not contain:** `T extends Interface` (use `T: Interface`), `A & B` as user-facing intersection in types.
**Run:** `superjs build --source prototype/examples/structural-interfaces/02-generic-interfaces.sjs --outDir /tmp/out && node /tmp/out/02-generic-interfaces.js`

---

### `errors/SJS-E001-null-deref.sjs`

**Concepts taught:** What SJS-E001 looks like (null assigned to non-nullable), three fixes.

```sjs
// errors/SJS-E001-null-deref.sjs — SJS-E001: cannot assign type null to string
//
// SJS-E001 fires when null (or a nullable type) is assigned to a non-nullable type.
// This file shows the error pattern and three resolution strategies.
//
// Trigger pattern (commented out — would cause SJS-E001):
//   const name: string = null
//   // error SJS-E001: Cannot assign type 'null' to 'string'
//   // Hint: declare the type as 'string?' if null is expected here

// FIX 1: Declare as nullable (T?)
const name1: string? = null   // ok — string? means string | null

// FIX 2: Provide a non-null value
const name2: string = "Alice"   // ok — string literal is not null

// FIX 3: Narrow before use (for function parameters)
function greet(name: string?): string {
  if (name === null) return "Hello, stranger"   // narrow out null
  return "Hello, " + name   // name: string here
}

// Common mistake: optional chaining returns T | undefined, not T
interface Config { timeout?: number }
const cfg: Config = {}
// const t: number = cfg.timeout   // SJS-E001: number | undefined not assignable to number
const t: number = cfg.timeout ?? 5000   // FIX: nullish coalescing

console.log(greet(null))    // Hello, stranger
console.log(greet("Bob"))   // Hello, Bob
console.log(t)               // 5000
```

**Must not contain:** `!` assertion, live (uncommented) E001-triggering code.
**Run:** `superjs build --source prototype/examples/errors/SJS-E001-null-deref.sjs --outDir /tmp/out && node /tmp/out/SJS-E001-null-deref.js`

---

### `errors/SJS-E007-nonexhaustive.sjs`

**Concepts taught:** SJS-E007 non-exhaustive match — trigger pattern, three fixes.

```sjs
// errors/SJS-E007-nonexhaustive.sjs — SJS-E007: non-exhaustive match
//
// SJS-E007 fires when a match expression does not cover all variants.
// Adding a new variant to a sum type triggers SJS-E007 in all non-wildcard match sites —
// this is a FEATURE: the compiler finds every place you need to handle the new case.
//
// Trigger (commented out):
//   type Color = | Red | Green | Blue
//   function name(c: Color): string {
//     return match c {
//       Red => "red"
//       Green => "green"
//       // Missing Blue — SJS-E007: match on Color does not cover: Blue
//     }
//   }

// FIX 1: Add all missing arms
type Color = | Red | Green | Blue

function nameFix1(c: Color): string {
  return match c {
    Red => "red"
    Green => "green"
    Blue => "blue"
  }
}

// FIX 2: Wildcard default
function nameFix2(c: Color): string {
  return match c {
    Red => "red"
    _ => "other"
  }
}

// FIX 3: assertNever helper — exhaustive with a runtime trap for impossible branches
function assertNever(x: never): never { throw new Error("Unreachable: " + JSON.stringify(x)) }

function nameFix3(c: Color): string {
  return match c {
    Red => "red"
    Green => "green"
    Blue => "blue"
    // Any future Color variant produces SJS-E007 here — compiler forces an update
  }
}

console.log(nameFix1(Blue))   // blue
console.log(nameFix2(Blue))   // other
```

**Must not contain:** live (uncommented) E007-triggering code.
**Run:** `superjs build --source prototype/examples/errors/SJS-E007-nonexhaustive.sjs --outDir /tmp/out && node /tmp/out/SJS-E007-nonexhaustive.js`

---

### `gradual-typing/step-by-step.sjs`

**Concepts taught:** Migration path — plain JS → partial annotations → full types → sum types. Shows same function at each stage.

```sjs
// gradual-typing/step-by-step.sjs — migration path: plain JS → full SJS types
// Each stage is a separate named function. All stages compile correctly.

// STAGE 1: Plain JavaScript — no annotations (dynamic everywhere)
function parseUser1(raw) {
  return { name: raw.name || "unknown", age: raw.age || 0 }
}

// STAGE 2: Add parameter annotation (only the input is typed)
function parseUser2(raw: dynamic) {
  return { name: raw.name || "unknown", age: raw.age || 0 }
}

// STAGE 3: Add return type annotation
interface User { name: string; age: number }
function parseUser3(raw: dynamic): User {
  return { name: raw.name || "unknown", age: raw.age || 0 }
}

// STAGE 4: Full types — null-safe, uses ?? instead of ||
function parseUser4(raw: dynamic): User {
  const name: string = (typeof raw.name === "string") ? raw.name : "unknown"
  const age: number = (typeof raw.age === "number") ? raw.age : 0
  return { name, age }
}

// STAGE 5: SJS idioms — Result<T,E> for validation errors
type ParseError = | MissingField(string) | WrongType(string, string)
type Result<T, E> = | Ok(T) | Err(E)

function parseUser5(raw: dynamic): Result<User, ParseError> {
  if (typeof raw.name !== "string") return Err(WrongType("name", typeof raw.name))
  if (typeof raw.age !== "number") return Err(WrongType("age", typeof raw.age))
  return Ok({ name: raw.name, age: raw.age })
}

const raw: dynamic = JSON.parse('{"name":"Alice","age":30}')
console.log(parseUser1(raw).name)   // Alice
console.log(parseUser4(raw).name)   // Alice
match parseUser5(raw) {
  Ok(u) => console.log(u.name + " age " + u.age)  // Alice age 30
  Err(e) => match e {
    MissingField(f) => console.log("missing: " + f)
    WrongType(f, t) => console.log("wrong type for " + f + ": " + t)
  }
}
```

**Must not contain:** `any`, `T | null` on plain fields in stages 3+.
**Run:** `superjs build --source prototype/examples/gradual-typing/step-by-step.sjs --outDir /tmp/out && node /tmp/out/step-by-step.js`

---

### `jsx/sum-types.sjs`

**Concepts taught:** JSX component using `Result<T,E>` in props; pattern match in render.

```sjs
// jsx/sum-types.sjs — JSX component with Result<T,E> in props
// Shows SJS sum types integrated with React-style JSX rendering.
// Requires Node 18+ for demonstration; React must be in scope.

type Result<T, E> = | Ok(T) | Err(E)
type LoadError = | NetworkError(string) | NotFound | Unauthorized

interface User { id: number; name: string; email: string? }

// Component props use Result<T,E> to express loading states
interface UserCardProps {
  result: Result<User, LoadError>
  onRetry: () => void
}

function errorMessage(e: LoadError): string {
  return match e {
    NetworkError(msg) => "Network error: " + msg
    NotFound => "User not found"
    Unauthorized => "Please log in"
  }
}

function UserCard(props: UserCardProps): dynamic {
  return match props.result {
    Ok(user) => (
      <div className="user-card">
        <h2>{user.name}</h2>
        <p>{user.email ?? "(no email)"}</p>
      </div>
    )
    Err(e) => (
      <div className="error">
        <p>{errorMessage(e)}</p>
        <button onClick={props.onRetry}>Retry</button>
      </div>
    )
  }
}

// Demo: compile check — no runtime without React DOM
const okResult: Result<User, LoadError> = Ok({ id: 1, name: "Alice", email: null })
const errResult: Result<User, LoadError> = Err(NotFound)
console.log("ok tag:", okResult._tag)    // ok tag: Ok
console.log("err tag:", errResult._tag)  // err tag: Err
```

**Must not contain:** `any` in props, string `| null` for error representation.
**Run:** `superjs build --source prototype/examples/jsx/sum-types.sjs --outDir /tmp/out && node /tmp/out/sum-types.js`

---

### `real-world/task-manager.sjs`

**Concepts taught:** Full CRUD combining Result<T,E>, nullable fields, sum types for status, async operation.

**Key requirement from critique:** Must show error handling via Result, at least one async operation, at least one external import.

```sjs
// real-world/task-manager.sjs — task manager: Result + nullable + async + Node fs
// Requires Node 18+
import { readFileSync, writeFileSync } from 'fs'

type Priority = | Low | Medium | High | Critical
type TaskStatus = | Todo | InProgress | Done | Cancelled
type AppError = | NotFound(string) | ValidationError(string) | IOError(string)
type Result<T, E> = | Ok(T) | Err(E)

interface Task {
  id: number
  title: string
  description: string?
  priority: Priority
  status: TaskStatus
  assignee: string?
}

interface TaskPatch {
  title?: string
  description?: string
  assignee?: string
  priority?: Priority
}
```

Key functions (all returning `Result<T, AppError>`, no thrown exceptions):
- `create(title: string, priority: Priority): Result<Task, AppError>` — validates non-empty title
- `update(id: number, patch: TaskPatch): Result<Task, AppError>` — NotFound on miss
- `complete(id: number): Result<Task, AppError>`
- `cancel(id: number): Result<Task, AppError>`
- `byPriority(p: Priority): Task[]`
- `save(path: string): Result<void, AppError>` — writes JSON to file (Node fs)
- `load(path: string): Result<TaskManager, AppError>` — reads JSON from file (Node fs)

Demo block: create 3 tasks, update one, complete one, cancel one, save to `/tmp/tasks.json`, print summary.

**Must not contain:** `any`, `Partial<T>`, `throw` at business logic level (only at top of demo for demo purposes), `T | null` for optionals (use `T?`).
**Run:** `superjs build --source prototype/examples/real-world/task-manager.sjs --outDir /tmp/out && node /tmp/out/task-manager.js`

---

### `real-world/http-client.sjs`

**Concepts taught:** Async `Result<T,E>`, retry logic, timeout — real HTTP client behavior. Requires Node 18+.

```sjs
// real-world/http-client.sjs — HTTP client with Result, retry, timeout
// Requires Node 18+ (uses globalThis.fetch)

type HttpError = | NetworkError(string) | StatusError(number, string) | ParseError(string) | Timeout
type Result<T, E> = | Ok(T) | Err(E)

interface RequestConfig {
  url: string
  method: string
  timeout: number?
  retries: number?
  headers: Map<string, string>?
  body: string?
}
```

Key functions:
- `async function request<T>(config: RequestConfig): Promise<Result<T, HttpError>>` — uses `globalThis.fetch`, respects `timeout` via AbortSignal, wraps fetch errors in `NetworkError`, non-2xx in `StatusError`, JSON parse failure in `ParseError`
- `async function withRetry<T>(fn: () => Promise<Result<T, HttpError>>, retries: number): Promise<Result<T, HttpError>>` — retries on `NetworkError` or `Timeout` (not on `StatusError`)
- `async function get<T>(url: string, opts: RequestConfig?): Promise<Result<T, HttpError>>`
- `async function post<T>(url: string, body: dynamic, opts: RequestConfig?): Promise<Result<T, HttpError>>`
- `function handleError(e: HttpError): string` — match all variants

Demo block: `get` from `https://jsonplaceholder.typicode.com/todos/1` with retry, print result.

**Must not contain:** bare `throw` for HTTP errors, `any` for response body, `catch(e: any)`.
**Run:** `superjs build --source prototype/examples/real-world/http-client.sjs --outDir /tmp/out && node /tmp/out/http-client.js`

---

### `real-world/config-loader.sjs`

**Concepts taught:** File parsing with sum-type errors, `dynamic` narrowing into typed record, `Result<T,E>` composition.

```sjs
// real-world/config-loader.sjs — config file parser with sum-type errors
// Requires Node 18+ (uses fs.readFileSync)
import { readFileSync } from 'fs'

type ConfigError =
  | MissingField(string)
  | InvalidValue { field: string; expected: string; got: string }
  | FileNotFound(string)
  | ParseFailure(string)

type Result<T, E> = | Ok(T) | Err(E)

interface DatabaseConfig { host: string; port: number; name: string; user: string; password: string? }
interface ServerConfig { port: number; host: string?; cors: boolean?; maxConnections: number? }
interface AppConfig { database: DatabaseConfig; server: ServerConfig; debug: boolean? }
```

Key functions:
- `function requireString(raw: dynamic, field: string): Result<string, ConfigError>` — typeof check, MissingField/InvalidValue on failure
- `function requireNumber(raw: dynamic, field: string): Result<number, ConfigError>`
- `function parseDatabase(raw: dynamic): Result<DatabaseConfig, ConfigError>` — composes requireString/requireNumber for each field
- `function parseServer(raw: dynamic): Result<ServerConfig, ConfigError>`
- `function loadConfig(path: string): Result<AppConfig, ConfigError>` — readFileSync + JSON.parse + validate
- `function describeError(e: ConfigError): string` — match all variants

Demo: `loadConfig("./superjs.config.json")`, show Ok and Err paths.

**Must not contain:** `Partial<T>`, `any`, unguarded property access on `dynamic`.
**Run:** `superjs build --source prototype/examples/real-world/config-loader.sjs --outDir /tmp/out && node /tmp/out/config-loader.js`

---

### `testing/01-basic.test.sjs`

**Concepts taught:** How to write SJS tests with `superjs test`, asserting on `Result<T,E>` values.

```sjs
// testing/01-basic.test.sjs — basic SJS tests
// Run: superjs test prototype/examples/testing/01-basic.test.sjs

type Result<T, E> = | Ok(T) | Err(E)

function parseNumber(s: string): Result<number, string> {
  const n = Number(s)
  if (isNaN(n)) return Err("not a number: " + s)
  return Ok(n)
}

// Helper: assert Ok
function assertOk<T, E>(r: Result<T, E>, label: string): T {
  return match r {
    Ok(v) => v
    Err(e) => { throw new Error(label + " expected Ok, got Err: " + e) }
  }
}

// Helper: assert Err
function assertErr<T, E>(r: Result<T, E>, label: string): E {
  return match r {
    Err(e) => e
    Ok(v) => { throw new Error(label + " expected Err, got Ok: " + v) }
  }
}

// Tests (convention: functions named test_*)
function test_parseNumber_valid(): void {
  const r = parseNumber("42")
  const v = assertOk(r, "parseNumber('42')")
  console.assert(v === 42, "expected 42, got " + v)
  console.log("PASS: parseNumber valid")
}

function test_parseNumber_invalid(): void {
  const r = parseNumber("hello")
  const e = assertErr(r, "parseNumber('hello')")
  console.assert(e.startsWith("not a number"), "unexpected error: " + e)
  console.log("PASS: parseNumber invalid")
}

test_parseNumber_valid()
test_parseNumber_invalid()
```

**Must not contain:** `any` in test helpers, bare `try/catch` for Result testing (use assertOk/assertErr).
**Run:** `superjs test prototype/examples/testing/01-basic.test.sjs`

---

### `testing/02-async.test.sjs`

**Concepts taught:** Testing async functions returning `Result<T,E>`, awaiting and asserting.

```sjs
// testing/02-async.test.sjs — testing async Result<T,E>
// Run: superjs test prototype/examples/testing/02-async.test.sjs
// Requires Node 18+

type Result<T, E> = | Ok(T) | Err(E)
type HttpError = | NetworkError(string) | NotFound

async function fakeFetch(url: string): Promise<Result<string, HttpError>> {
  if (url.includes("missing")) return Err(NotFound)
  return Ok('{"data":"hello"}')
}

async function test_fetch_ok(): Promise<void> {
  const r = await fakeFetch("https://example.com/data")
  match r {
    Ok(body) => {
      console.assert(body.includes("hello"), "expected hello in body")
      console.log("PASS: fetch ok")
    }
    Err(_) => { throw new Error("expected Ok") }
  }
}

async function test_fetch_notfound(): Promise<void> {
  const r = await fakeFetch("https://example.com/missing")
  match r {
    Err(NotFound) => console.log("PASS: fetch NotFound")
    Err(NetworkError(msg)) => { throw new Error("expected NotFound, got NetworkError: " + msg) }
    Ok(_) => { throw new Error("expected Err") }
  }
}

async function runAll(): Promise<void> {
  await test_fetch_ok()
  await test_fetch_notfound()
}

runAll().catch(e => { console.error("TEST FAILED:", e.message); process.exit(1) })
```

**Must not contain:** `any` in caught errors, untyped promise chains.
**Run:** `superjs test prototype/examples/testing/02-async.test.sjs`

---

### `types/generics-advanced.sjs` (REWRITE)

**Remove entirely:** all conditional types, all mapped types (`[K in keyof T]`), all `infer`, all `keyof`, all `any`.

**Rewrite to valid SJS — must demonstrate:**
- `<T: Interface>` constraint: `function getFirst<T: HasLength>(x: T): number { return x.length }`
- `<T: Comparable<T>>` self-referential constraint: `function min<T: Comparable<T>>(a: T, b: T): T`
- `<T: A & B>` multiple constraints: `function sortAndPrint<T: Comparable<T> & Printable>(items: T[]): void`
- Generic class: `class Stack<T>` with `pop(): T | undefined` (spec §8.1 — array.pop returns `T | undefined`)
- Sum-type `Option<T>` replacing class-based nullable: `type Option<T> = | Some(T) | None`
- Free functions `mapOption`, `getOrElse` operating on `Option<T>`

**Must not contain:** `T extends U ? A : B`, `{ [K in keyof T] }`, `infer`, `keyof`, `any`.
**Run:** `superjs build --source prototype/examples/types/generics-advanced.sjs --outDir /tmp/out && node /tmp/out/generics-advanced.js`

---

### `types/literal-and-enum.sjs` (REWRITE)

**Remove entirely:** all `enum`, all `const enum`, all `typeof X[keyof typeof X]`, template literal types.

**Rewrite to valid SJS — must demonstrate:**
```sjs
type Direction = | North | South | East | West
type LogLevel = | Debug | Info | Warn | Error
type HttpStatus = | Ok200 | Created201 | BadRequest400 | NotFound404 | InternalError500
type Permission = | None | Read | Write | Execute | Admin

function move(d: Direction): string {
  return match d { North => "up"; South => "down"; East => "right"; West => "left" }
}

function isSuccess(s: HttpStatus): boolean {
  return match s { Ok200 => true; Created201 => true; _ => false }
}

// Simple string constants (not as const mapping)
const RED = "#FF0000"
const GREEN = "#00FF00"
const BLUE = "#0000FF"
```

**Must not contain:** `enum`, `keyof`, `typeof X[keyof ...]`, template literal types.
**Run:** `superjs build --source prototype/examples/types/literal-and-enum.sjs --outDir /tmp/out && node /tmp/out/literal-and-enum.js`

---

### `types/union-types.sjs` (REWRITE with guidance)

**Rewrite to add narrowing guidance per critique §1.1:**

**Must demonstrate:**
- `string | number` union with `typeof` narrowing shown every time
- `string | number | boolean` primitive union
- When to prefer a sum type over `A | B` (explicit guidance comment)
- Discriminated union via sum type (the preferred SJS approach)

```sjs
// types/union-types.sjs — unions and when to prefer sum types
// Rule: use A|B unions for primitives where typeof works cleanly.
//        Use sum types for distinct shapes — they give exhaustive match.

type Primitive = string | number | boolean

function format(p: Primitive): string {
  if (typeof p === "string") return '"' + p + '"'   // MUST show narrowing
  if (typeof p === "number") return p.toFixed(2)
  return p ? "true" : "false"
}

// Sum type preferred when values have distinct meaning
type Id = | NumericId(number) | StringId(string)
function idToString(id: Id): string {
  return match id { NumericId(n) => "n:" + n; StringId(s) => "s:" + s }
}
```

**Must not contain:** any `A | B` union without showing the narrowing technique.
**Run:** `superjs build --source prototype/examples/types/union-types.sjs --outDir /tmp/out && node /tmp/out/union-types.js`

---

### `patterns/events.sjs` (REWRITE)

**Remove:** `{ [K in keyof T]: any }` constraint, `{ [K in keyof T]?: Set<...> }` mapped type.

**Rewrite:** Per-event typed handler lists (explicit, no mapped types).

```sjs
// patterns/events.sjs — typed event bus without mapped types
interface MessageData { user: string; text: string }

class ChatRoom {
  #messageHandlers: ((data: MessageData) => void)[] = []
  #joinHandlers: ((user: string) => void)[] = []
  #leaveHandlers: ((user: string) => void)[] = []

  onMessage(handler: (data: MessageData) => void): void { this.#messageHandlers.push(handler) }
  onJoin(handler: (user: string) => void): void { this.#joinHandlers.push(handler) }
  onLeave(handler: (user: string) => void): void { this.#leaveHandlers.push(handler) }

  emit(event: string, data: dynamic): void {
    if (event === "message") this.#messageHandlers.forEach(h => h(data))
    else if (event === "join") this.#joinHandlers.forEach(h => h(data))
    else if (event === "leave") this.#leaveHandlers.forEach(h => h(data))
  }
}
```

**Must not contain:** `[K in keyof T]`, `any` in handler types.
**Run:** `superjs build --source prototype/examples/patterns/events.sjs --outDir /tmp/out && node /tmp/out/events.js`

---

### `patterns/state.sjs` (REWRITE)

**Changes:** Replace tagged-object Action with SJS sum type and match.

```sjs
type FilterType = | All | Active | Completed
type Action = | AddTodo(string) | ToggleTodo(number) | SetFilter(FilterType) | ClearCompleted

interface Todo { id: number; text: string; completed: boolean }
interface AppState { todos: Todo[]; filter: FilterType; nextId: number }

function reducer(state: AppState, action: Action): AppState {
  return match action {
    AddTodo(text) => ({ ...state, todos: [...state.todos, { id: state.nextId, text, completed: false }], nextId: state.nextId + 1 })
    ToggleTodo(id) => ({ ...state, todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })
    SetFilter(f) => ({ ...state, filter: f })
    ClearCompleted => ({ ...state, todos: state.todos.filter(t => !t.completed) })
  }
}
```

**Must not contain:** `switch`, `type Action = { type: 'ADD_TODO'; payload: ... }` pattern.
**Run:** `superjs build --source prototype/examples/patterns/state.sjs --outDir /tmp/out && node /tmp/out/state.js`

---

### `oop/mixins.sjs` (REWRITE)

**Changes per critique §1.6:**
- `Constructor<T>` with `...args: any[]` → show object composition instead (not mixin pattern — spec cannot express varargs constructor generically without `any`)
- Comment explains: "SJS cannot express mixin constructors with varargs without `dynamic`; use object composition or interface extension instead"
- `EventEmitter`: `Map<string, Set<(data: dynamic) => void>>` — no `any`, no `Function` type
- `emit(event: string, data: dynamic): void` — single data arg
- Remove `applyMixins` (uses `any`/`Object.defineProperty`)
- Replace `!` assertion with `??` pattern: `this.listeners.get(event)?.add(listener)`

**Must not contain:** `any`, `!` assertion, `applyMixins`.
**Run:** `superjs build --source prototype/examples/oop/mixins.sjs --outDir /tmp/out && node /tmp/out/mixins.js`

---

### `real-world/task-manager.sjs` — `Partial<T>` resolution

**Critique §1.4 fix:** `Partial<T>` is a banned mapped type. Replace with explicit `TaskPatch` interface:

```sjs
// Explicit patch interface — no Partial<T>
interface TaskPatch {
  title?: string
  description?: string
  assignee?: string
  priority?: Priority
}
```

`update(id: number, patch: TaskPatch): Result<Task, AppError>` — patch fields are all optional via `?:` (ES optional property syntax per spec §6.3, which yields `T | undefined` on access).

---

### `jsx/todo-list.sjs` (REWRITE)

**Fix:** Remove `e.target as HTMLInputElement` cast.

```sjs
// Before (WRONG — as cast banned):
// const value = (e.target as HTMLInputElement).value

// After (CORRECT — assign to dynamic local):
function handleChange(e: dynamic): void {
  const target: dynamic = e.target
  const value: string = typeof target.value === "string" ? target.value : ""
  setInput(value)
}
```

**Must not contain:** `as HTMLInputElement`, `as string`, any `as T` cast.
**Run:** `superjs build --source prototype/examples/jsx/todo-list.sjs --outDir /tmp/out && node /tmp/out/todo-list.js`

---

### `jsx/fragments-and-composition.sjs` (REWRITE)

**Single change:** `children?: any` → `children?: dynamic` in all props interfaces.

**Must not contain:** `any` as a type annotation anywhere.
**Run:** `superjs build --source prototype/examples/jsx/fragments-and-composition.sjs --outDir /tmp/out && node /tmp/out/fragments-and-composition.js`

---

### `modules/collections.sjs` (NEW)

**Concepts taught:** Generic class exports, named exports, structural interface as export.

```sjs
// modules/collections.sjs — generic Stack<T> and Queue<T> exports
export interface Collection<T> { size: number; isEmpty(): boolean; toArray(): T[] }

export class Stack<T> {
  #items: T[] = []
  push(item: T): void { this.#items.push(item) }
  pop(): T | undefined { return this.#items.pop() }
  peek(): T | undefined { return this.#items[this.#items.length - 1] }
  get size(): number { return this.#items.length }
  isEmpty(): boolean { return this.#items.length === 0 }
  toArray(): T[] { return [...this.#items] }
}

export class Queue<T> {
  #items: T[] = []
  enqueue(item: T): void { this.#items.push(item) }
  dequeue(): T | undefined { return this.#items.shift() }
  peek(): T | undefined { return this.#items[0] }
  get size(): number { return this.#items.length }
  isEmpty(): boolean { return this.#items.length === 0 }
  toArray(): T[] { return [...this.#items] }
}

export function fromArray<T>(arr: T[]): Stack<T> {
  const s = new Stack<T>()
  for (const item of arr) s.push(item)
  return s
}
```

Note: `pop()` returns `T | undefined` per spec §8.1 (array.pop semantics) — this is the correct spec-aligned return type for JS runtime methods, not `T?`.

**Run:** `superjs build --source prototype/examples/modules/collections.sjs --outDir /tmp/out && node /tmp/out/collections.js`

---

### `modules/http.sjs` (NEW)

**Concepts taught:** Async module exports, module-level constants, re-exported types.

```sjs
// modules/http.sjs — async HTTP module with Result<T,E>
// Requires Node 18+
export type Result<T, E> = | Ok(T) | Err(E)
export type HttpError = | NetworkError(string) | NotFound | Timeout

export const DEFAULT_TIMEOUT = 5000

export async function get<T>(url: string): Promise<Result<T, HttpError>> {
  // Uses globalThis.fetch (Node 18+)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const resp = await globalThis.fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (resp.status === 404) return Err(NotFound)
    if (!resp.ok) return Err(NetworkError("status " + resp.status))
    const data: T = await resp.json()
    return Ok(data)
  } catch (e: dynamic) {
    clearTimeout(timer)
    if (e && e.name === "AbortError") return Err(Timeout)
    return Err(NetworkError(String(e)))
  }
}

export async function post<T>(url: string, body: dynamic): Promise<Result<T, HttpError>> {
  try {
    const resp = await globalThis.fetch(url, {
      method: "POST",
      headers: new Map([["Content-Type", "application/json"]]),
      body: JSON.stringify(body)
    })
    if (!resp.ok) return Err(NetworkError("status " + resp.status))
    const data: T = await resp.json()
    return Ok(data)
  } catch (e: dynamic) {
    return Err(NetworkError(String(e)))
  }
}
```

**Must not contain:** `any`, bare `throw` for HTTP errors.
**Run:** `superjs build --source prototype/examples/modules/http.sjs --outDir /tmp/out && node /tmp/out/http.js`

---

### `async/04-concurrent.sjs` (NEW)

**Concepts taught:** `Promise.all` with typed results, async iteration over `Result` stream.

```sjs
// async/04-concurrent.sjs — concurrent async with Result<T,E>
// Requires Node 18+
type Result<T, E> = | Ok(T) | Err(E)
type FetchError = | NetworkError(string) | Timeout

async function fakeFetch(url: string, delay: number): Promise<Result<string, FetchError>> {
  await new Promise(resolve => setTimeout(resolve, delay))
  if (url.includes("fail")) return Err(NetworkError("simulated failure"))
  return Ok('data from ' + url)
}

// Promise.all — all-or-nothing
async function fetchAll(urls: string[]): Promise<Result<string, FetchError>[]> {
  return Promise.all(urls.map(url => fakeFetch(url, 10)))
}

// Collect only Ok results
function collectOk<T, E>(results: Result<T, E>[]): T[] {
  const out: T[] = []
  for (const r of results) {
    match r { Ok(v) => out.push(v); Err(_) => {} }
  }
  return out
}

async function main(): Promise<void> {
  const urls = ["https://a.com", "https://b.com", "https://fail.com"]
  const results = await fetchAll(urls)
  const good = collectOk(results)
  console.log("successful fetches:", good.length)   // 2
  console.log(good[0])  // data from https://a.com
}

main()
```

**Must not contain:** `any`, bare `catch(e: any)`.
**Run:** `superjs build --source prototype/examples/async/04-concurrent.sjs --outDir /tmp/out && node /tmp/out/04-concurrent.js`

---

## README Specifications

### Root `examples/README.md`

Must contain all 9 sections from critique §9.1:

1. **Prerequisites:** Node.js 18+, `npm install -g superjs` (or `cd prototype && npm run build && npm link`), confirm with `superjs --version`
2. **Quickstart:** 5-line snippet — write `hello.sjs`, run `superjs build --source hello.sjs --outDir /tmp/out && node /tmp/out/hello.js`
3. **Reading order:** numbered list matching the canonical learning path defined above
4. **How to run any example:** `superjs build --source <file> --outDir /tmp/out && node /tmp/out/<filename>.js`
5. **SJS idiom cheatsheet:** `T?`, `??`, `?.`, `match`, sum-type decl, generic constraint — one-liner each
6. **When you hit error X:** pointer to `errors/SJS-E001-null-deref.sjs` and `errors/SJS-E007-nonexhaustive.sjs`
7. **File a bug:** link to `https://github.com/hbarve1/super-js/issues`
8. **What's intentionally NOT supported:** `any` (use `dynamic`), `enum` (use sum types), `Partial<T>` (declare explicit interface), `T!` assertion (use null check), `as T` cast (use `dynamic` local), mapped types, conditional types
9. **License:** MIT (or repo's license)

### Per-Category READMEs

Each directory README must contain:
- Theme sentence (1 line)
- Files in reading order with one-line description
- Run command for each file
- What shared types/conventions the files use

---

## Summary Counts (corrected from Round 1)

| Category | Count |
|---|---|
| Net new source files | 22 |
| Net new README files | 16 |
| Full rewrites | 23 |
| Audit + minor fix | 20 |
| Keep as-is | 6 |
| **Total files touched** | **87** |

Sprint budget: ~12 working days (Sprint 0: 1d, A: 3d, B: 2d, C: 2d, D: 3d, buffer for compiler bugs: 1d).

---

## CI Integration

After Sprint D, add every example to the CI smoke test matrix:

```
# In prototype/jest.config.ts or a new script: scripts/validate-examples.sh
superjs build --dir prototype/examples --outDir /tmp/sjs-examples-ci
# Run each file that has a demo block (not test files):
node /tmp/sjs-examples-ci/basics/hello-world.js
node /tmp/sjs-examples-ci/null-safety/01-basics.js
# ... one line per file
superjs test prototype/examples/testing/
```

If any file fails to compile or crashes at runtime, CI fails. This prevents example rot as the compiler evolves.
