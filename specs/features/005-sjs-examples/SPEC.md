# Feature 005: SJS Examples — Canonical Spec

**Status:** Round 2 plan complete. Ready for implementation.
**Spec authority:** `specs/001-superjs-core-language/type-system-v2.md` (normative).

---

## Goal

Rewrite and expand `prototype/examples/` to be spec-compliant, learnable, and CI-tested. Every example must compile clean with `superjs build` and demonstrate correct SJS idioms — no banned patterns, no TypeScript-isms.

---

## Spec-Grounded Clarifications

These resolve conflicts between Round 1 plan and the actual SJS spec:

| Question | Answer |
|---|---|
| `private` keyword | Supported — spec §6. ES2022 `#field` also valid. |
| `abstract` keyword | Supported — spec §6. |
| `implements` keyword | **Valid and optional** — spec §5.4 says `implements` is optional but allowed for explicit conformance checking. Round 1 was wrong to remove it. |
| `T?` meaning | `T \| null` only (spec §3.2). NOT `T \| null \| undefined`. |
| `Map.get()` return type | Returns `V \| undefined` (spec §8.4). Use `?? default` or explicit check. |
| `Partial<T>` | Not built-in in Phase 1 (spec §13.2). Replace with explicit interface with `?:` fields. |
| `as T` type casts | Banned — spec §14.7. Use `typeof` narrowing or assign to `dynamic` local. |
| Generic constraint syntax | `<T: Interface>` colon syntax (spec §9.2). TypeScript `T extends Interface` is wrong for SJS. |
| Multiple constraints | `<T: A & B>` — constraint intersection allowed (spec §9.3). |
| `string \| number` unions | Allowed (spec §10.1). Must show `typeof` narrowing every time. |
| Sum type construction | Struct: `Circle { radius: 5 }`. Tuple: `Ok(42)`. |
| Match arm syntax | No commas between arms. `Circle { radius } => ...` for struct destructuring. |
| `Stack.pop()` return | `T \| undefined` per JS array.pop semantics (spec §8.1) — NOT `T?`. |

---

## Banned Pattern Reference

| # | Pattern | SJS replacement |
|---|---|---|
| B1 | `any` | `dynamic` |
| B2 | `T \| undefined` for nullable fields/returns | `T?` (except `Map.get` and optional params — those genuinely return `T \| undefined`) |
| B3 | `T extends U ? A : B` conditional type | `<T: I>` generic constraint |
| B4 | `{ [K in keyof T]: ... }` mapped type | Explicit interface |
| B5 | `A & B` user-facing intersection | Interface extension |
| B6 | `enum Foo { ... }` | Sum type `type Foo = \| A \| B` |
| B7 | `namespace Foo { ... }` | ES module export/import |
| B8 | `expr!` non-null assertion | Null check + narrowing |
| B9 | `x as T` type cast | Assign to `dynamic` local then access |
| B10 | `typeof X[keyof typeof X]` | Direct type alias |
| B11 | `Partial<T>` | Explicit interface with `?:` fields |
| B12 | `T extends string` constraint | `T: StringLike` with interface |
| B13 | `function f(): x is T` type predicate | Use `typeof` / `match` in Phase 1 |

---

## Directory Structure (Final)

```
prototype/examples/
  README.md                              root README: prerequisites, reading order, cheatsheet

  basics/                                KEEP + MINOR FIX
    README.md                            NEW
    hello-world.sjs                      AUDIT
    variables.sjs                        AUDIT
    functions.sjs                        AUDIT
    arrays.sjs                           AUDIT
    objects.sjs                          AUDIT
    loops.sjs                            AUDIT
    control-flow.sjs                     AUDIT
    template-literals.sjs                AUDIT
    classes.sjs                          REWRITE (T|undefined -> T?)
    types.sjs                            REWRITE (remove Optional<T> alias)

  null-safety/                           NEW
    README.md
    01-basics.sjs                        T? declarations, null narrowing with if
    02-chaining.sjs                      ?. optional chain
    03-defaults.sjs                      ?? nullish coalescing, difference from ||
    04-nullable-iteration.sjs            iterating T?[] safely

  sum-types/                             NEW
    README.md
    01-basics.sjs                        type declarations, struct/tuple/unit constructors
    02-match.sjs                         exhaustive match, wildcard arm
    03-generic-sum-types.sjs             Result<T,E>, Option<T>
    04-recursive.sjs                     Tree<T>, List<T>

  match/                                 NEW
    README.md
    01-patterns.sjs                      struct/tuple/unit variant patterns
    02-destructuring.sjs                 nested patterns, binding rename
    03-exhaustiveness.sjs                SJS-E007 — trigger + 3 fixes

  dynamic/                               NEW
    README.md
    01-when-to-use.sjs                   dynamic vs T? vs sum type decision guide
    02-js-interop.sjs                    dynamic at JS API boundary, typeof narrowing

  structural-interfaces/                 NEW
    README.md
    01-no-implements.sjs                 satisfaction by shape (no implements needed)
    02-generic-interfaces.sjs            <T: Comparable<T>>, multiple constraints

  generics/                              REWRITE
    README.md
    01-basic.sjs                         identity<T>, first<T>, T? returns
    02-constraints.sjs                   <T: Interface>, <T: A & B>
    03-generic-sum-types.sjs             generic Result/Option

  async/                                 REWRITE + EXPAND
    README.md
    01-promises.sjs                      AUDIT/REWRITE
    02-async-await.sjs                   REWRITE (Result<T,E> errors, no `as Error`)
    03-error-handling.sjs                REWRITE (Result<T,E> wrap pattern)
    04-concurrent.sjs                    NEW — Promise.all, async iteration

  gradual-typing/                        KEEP + EXPAND
    README.md
    plain-js.sjs                         KEEP
    mixed.sjs                            KEEP
    step-by-step.sjs                     NEW — plain JS -> partial -> full -> sum types

  jsx/                                   PARTIAL REWRITE
    README.md
    basic-counter.sjs                    AUDIT
    fragments-and-composition.sjs        REWRITE (children: dynamic not any)
    server-side-rendering.sjs            KEEP
    todo-list.sjs                        REWRITE (remove as cast)
    sum-types.sjs                        NEW — JSX component using Result<T,E>

  modules/                               EXPAND
    README.md
    math.sjs                             KEEP
    main.sjs                             KEEP
    collections.sjs                      NEW — generic Stack<T>, Queue<T>
    http.sjs                             NEW — async module with Result<T,E>

  node/                                  KEEP + AUDIT
    README.md
    src/analyzer.sjs                     KEEP
    src/formatter.sjs                    AUDIT
    src/fs-utils.sjs                     AUDIT
    src/main.sjs                         AUDIT

  oop/                                   AUDIT + FIX
    README.md
    abstract-classes.sjs                 REWRITE (T|undefined -> T?)
    inheritance.sjs                      AUDIT
    mixins.sjs                           REWRITE (any->dynamic, !->?., no applyMixins)

  patterns/                              REWRITE KEY FILES
    README.md
    builder.sjs                          AUDIT/REWRITE
    dependency-injection.sjs             REWRITE (Map<string,dynamic>)
    events.sjs                           REWRITE (remove mapped types)
    functional.sjs                       AUDIT/REWRITE
    middleware.sjs                       REWRITE (body: dynamic)
    observable.sjs                       KEEP
    state.sjs                            REWRITE (SJS sum type Action)

  types/                                 REWRITE ALL
    README.md
    interfaces.sjs                       REWRITE (structural, no banned patterns)
    literal-and-enum.sjs                 REWRITE (enum -> sum types)
    generics-advanced.sjs                REWRITE (remove conditional/mapped types)
    tuple-types.sjs                      REWRITE
    type-aliases.sjs                     REWRITE
    union-types.sjs                      REWRITE (add typeof narrowing guide)

  algorithms/                            REWRITE NULLABLE
    README.md                            KEEP
    hash-map.sjs                         REWRITE
    binary-search-tree.sjs               REWRITE
    graph.sjs                            REWRITE
    linked-list.sjs                      REWRITE
    sorting.sjs                          AUDIT
    stack-queue.sjs                      REWRITE

  real-world/                            NEW
    README.md
    task-manager.sjs                     CRUD + Result + nullable + async
    http-client.sjs                      fetch wrapper + Result<T,HttpError> + retry
    config-loader.sjs                    file parse + sum-type errors

  errors/                                NEW
    README.md
    SJS-E001-null-deref.sjs              trigger + 3 fixes
    SJS-E007-nonexhaustive.sjs           trigger + 3 fixes

  testing/                               NEW
    README.md
    01-basic.test.sjs                    basic assertions, Result testing
    02-async.test.sjs                    testing async Result<T,E>
```

**File counts:** 22 net new source files, 16 net new README files, 23 full rewrites, 20 audit+minor fixes, 6 keep-as-is. Total files touched: ~87.

---

## Reading Order (Canonical Learning Path)

Defined in root `README.md`. Max 3 new SJS concepts per file.

1. `basics/` — hello-world, variables, functions, arrays, objects, loops, control-flow, template-literals, classes, types
2. `null-safety/` — 01-basics, 02-chaining, 03-defaults, 04-nullable-iteration
3. `sum-types/` — 01-basics, 02-match, 03-generic-sum-types, 04-recursive
4. `match/` — 01-patterns, 02-destructuring, 03-exhaustiveness
5. `dynamic/` — 01-when-to-use, 02-js-interop
6. `structural-interfaces/` — 01-no-implements, 02-generic-interfaces
7. `generics/` — 01-basic, 02-constraints
8. `gradual-typing/` — plain-js, mixed, step-by-step
9. `async/` — 01-promises, 02-async-await, 03-error-handling, 04-concurrent
10. `oop/`, `algorithms/`, `patterns/`, `types/` — reference material
11. `real-world/`, `jsx/` — synthesis, uses all concepts
12. `errors/` — troubleshooting reference
13. `testing/` — how to test SJS code

---

## Quality Criteria (Per-File)

A file is DONE when ALL hold:

1. No banned patterns B1–B13 present anywhere
2. Compiles clean: `superjs build --source <file> --outDir /tmp/sjs-out && node /tmp/sjs-out/<name>.js`
3. Runs and prints expected output (at least one console.log line in demo block)
4. Header comment states exactly what concept is taught, max 3 concepts named
5. 200 lines or fewer
6. Per-file "must not contain" list (see per-file specs below) is respected
7. Per-category README lists the file in reading order with its run command

---

## Per-File Specifications

### `null-safety/01-basics.sjs`
**Concepts:** `T?` declaration, null narrowing with `if`, non-nullable by default.
**Must not contain:** `T | null`, `T | undefined`, `?.`, `??`, `!`.

```sjs
interface User { id: number; name: string; email: string?; bio: string? }
function formatEmail(user: User): string {
  if (user.email === null) return "(no email)"
  return "mailto:" + user.email   // email narrowed to string
}
```

---

### `null-safety/02-chaining.sjs`
**Concepts:** `?.` on objects, arrays, function calls.
**Must not contain:** `!`, `T | null`, plain property access on nullable without `?.`.

```sjs
function getCity(org: Organization): string | undefined { return org.owner?.address?.city }
function firstTag(profile: Profile?): string | undefined { return profile?.tags?.[0] }
```

---

### `null-safety/03-defaults.sjs`
**Concepts:** `??` nullish coalescing, `??=` nullish assignment, difference from `||`.
**Must not contain:** `T | null`, `!`, show the `||` contrast explicitly.

```sjs
const count: number? = 0
console.log(count ?? 99)   // 0  — ?? does not trigger on 0
console.log(count || 99)   // 99 — || triggers on 0 (falsy)
```

---

### `null-safety/04-nullable-iteration.sjs`
**Concepts:** Iterating `T?[]` safely, filtering nulls, for-of with nullable elements.
**Must not contain:** `T | null`, `T | undefined`, `!`, `.filter(Boolean)`.

```sjs
function compact<T>(arr: T?[]): T[] {
  const result: T[] = []
  for (const item of arr) {
    if (item !== null) result.push(item)  // item narrowed to T
  }
  return result
}
```

---

### `sum-types/01-basics.sjs`
**Concepts:** Sum type declaration, struct/tuple/unit constructors, basic match.
**Must not contain:** `enum`, `switch`, string literal unions for these types.

```sjs
type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number }
  | Point

const c: Shape = Circle { radius: 5 }
const r: Shape = Rectangle { width: 4; height: 6 }
```

---

### `sum-types/02-match.sjs`
**Concepts:** Exhaustive match, wildcard arm `_`, when to use each.
**Must not contain:** `switch`, `enum`, all-wildcard match (must show exhaustive version).

---

### `sum-types/03-generic-sum-types.sjs`
**Concepts:** `Result<T,E>`, `Option<T>`, chaining with helper functions.
**Must not contain:** `T | null` for error representation, `throw`, `try/catch`, `any`.

```sjs
type Result<T, E> = | Ok(T) | Err(E)
type Option<T> = | Some(T) | None

function mapResult<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
  return match r {
    Ok(value) => Ok(f(value))
    Err(e) => Err(e)
  }
}
```

---

### `sum-types/04-recursive.sjs`
**Concepts:** Recursive sum types, structural recursion via match.
**Must not contain:** class-based tree with `left: TreeNode | null`.

```sjs
type Tree<T> = | Leaf | Node { value: T; left: Tree<T>; right: Tree<T> }
type List<T> = | Nil | Cons(T, List<T>)
```

---

### `match/01-patterns.sjs`
**Concepts:** Struct variant patterns, tuple variant patterns, unit variant patterns.
**Must not contain:** `switch`, `if-else` chains replacing match, string literal discriminants.

---

### `match/02-destructuring.sjs`
**Concepts:** Nested patterns, binding rename (`left: l`), partial destructuring with `_`.
**Must not contain:** manual `_tag` access, `instanceof` checks replacing match.

```sjs
Add { left: l; right: r } => evaluate(l) + evaluate(r)   // binding rename
Add { left: Lit(0); right: r } => r                       // nested pattern
```

---

### `match/03-exhaustiveness.sjs`
**Concepts:** SJS-E007 non-exhaustive match — trigger pattern, 3 fixes.
**Must not contain:** `switch`, live (uncommented) E007-triggering code.

Fixes shown: (1) add all missing arms, (2) wildcard arm, (3) `assertNever` helper.

---

### `dynamic/01-when-to-use.sjs`
**Concepts:** Decision guide — when `dynamic` vs `T?` vs sum type.
**Must not contain:** `dynamic` as a lazy substitute for `T?` or sum types.

```sjs
// T? for "may be absent", sum type for distinct shapes, dynamic for truly opaque
function parseConfig(raw: string): dynamic { return JSON.parse(raw) }
```

---

### `dynamic/02-js-interop.sjs`
**Concepts:** `dynamic` at JS API boundary, runtime narrowing via `typeof`.
**Must not contain:** `as string`, `as number`, any `as T` cast — only `typeof` narrowing.

```sjs
function extractString(raw: dynamic): string? {
  if (typeof raw === "string") return raw
  return null
}
```

---

### `structural-interfaces/01-no-implements.sjs`
**Concepts:** Structural typing, satisfaction by shape (no `implements` needed).
**Must not contain:** `implements` keyword (show it is not needed), intersection types.

```sjs
// No implements needed — Product satisfies Named and Serializable by shape
class Product {
  name: string
  serialize(): string { return JSON.stringify({ name: this.name }) }
}
function printName(n: Named): void { console.log(n.name) }
const p = new Product("Widget", 9.99)
printName(p)   // works — structural match
```

---

### `structural-interfaces/02-generic-interfaces.sjs`
**Concepts:** `<T: Interface>` constraint, self-referential `<T: Comparable<T>>`, multiple constraints `<T: A & B>`.
**Must not contain:** `T extends Interface` (use `T: Interface`), `A & B` as user-facing intersection in types.

---

### `errors/SJS-E001-null-deref.sjs`
**Concepts:** What SJS-E001 looks like, 3 fixes.
**Must not contain:** `!` assertion, live (uncommented) E001-triggering code.

Shows: (1) declare as `T?`, (2) provide non-null value, (3) narrow before use.

---

### `errors/SJS-E007-nonexhaustive.sjs`
**Concepts:** SJS-E007 non-exhaustive match, 3 fixes.
**Must not contain:** live (uncommented) E007-triggering code.

Shows: (1) add all missing arms, (2) wildcard default, (3) `assertNever`.

---

### `gradual-typing/step-by-step.sjs`
**Concepts:** Migration path — plain JS → partial annotations → full types → sum types.
**Must not contain:** `any`, `T | null` on fields in stages 3+.

Shows 5 versions of `parseUser`: no types, `dynamic` param, return type, full null-safe, `Result<User,ParseError>`.

---

### `jsx/sum-types.sjs`
**Concepts:** JSX component using `Result<T,E>` in props, pattern match in render.
**Must not contain:** `any` in props, `string | null` for error representation.

```sjs
function UserCard(props: UserCardProps): dynamic {
  return match props.result {
    Ok(user) => <div><h2>{user.name}</h2></div>
    Err(e) => <div><p>{errorMessage(e)}</p></div>
  }
}
```

---

### `real-world/task-manager.sjs`
**Concepts:** Full CRUD combining `Result<T,E>`, nullable fields, sum types for status, Node.js fs.
**Must not contain:** `any`, `Partial<T>`, bare `throw` at business logic, `T | null` for optionals.

Use explicit `TaskPatch` interface (NOT `Partial<Task>`):
```sjs
interface TaskPatch {
  title?: string
  description?: string
  assignee?: string
  priority?: Priority
}
```

Key functions all return `Result<T, AppError>` — no thrown exceptions.

---

### `real-world/http-client.sjs`
**Concepts:** Async `Result<T,E>`, retry logic, timeout via AbortSignal.
**Must not contain:** bare `throw` for HTTP errors, `any` for response body.

```sjs
type HttpError = | NetworkError(string) | StatusError(number, string) | ParseError(string) | Timeout
async function request<T>(config: RequestConfig): Promise<Result<T, HttpError>>
async function withRetry<T>(fn: () => Promise<Result<T, HttpError>>, retries: number): Promise<Result<T, HttpError>>
```

---

### `real-world/config-loader.sjs`
**Concepts:** File parsing with sum-type errors, `dynamic` narrowing into typed record.
**Must not contain:** `Partial<T>`, `any`, unguarded property access on `dynamic`.

```sjs
type ConfigError =
  | MissingField(string)
  | InvalidValue { field: string; expected: string; got: string }
  | FileNotFound(string)
  | ParseFailure(string)
```

---

### `testing/01-basic.test.sjs`
**Concepts:** SJS tests, asserting on `Result<T,E>` values, `assertOk`/`assertErr` helpers.
**Must not contain:** `any` in test helpers, bare `try/catch` for Result testing.

---

### `testing/02-async.test.sjs`
**Concepts:** Testing async `Result<T,E>`, awaiting and asserting.
**Must not contain:** `any` in caught errors, untyped promise chains.

---

### `types/generics-advanced.sjs` (REWRITE)
**Remove:** all conditional types, mapped types, `infer`, `keyof`, `any`.
**Must demonstrate:** `<T: HasLength>` constraint, `<T: Comparable<T>>`, `<T: A & B>`, `Stack<T>` with `pop(): T | undefined` (NOT `T?`), `Option<T>` as sum type.

---

### `types/literal-and-enum.sjs` (REWRITE)
**Remove:** `enum`, `const enum`, `typeof X[keyof typeof X]`, template literal types.
**Rewrite to:** sum types for all enum-like constructs.

```sjs
type Direction = | North | South | East | West
type LogLevel = | Debug | Info | Warn | Error
type HttpStatus = | Ok200 | Created201 | BadRequest400 | NotFound404 | InternalError500
```

---

### `types/union-types.sjs` (REWRITE)
**Must demonstrate:** `string | number` union with `typeof` narrowing every time, explicit guidance on when to prefer sum types.

---

### `patterns/events.sjs` (REWRITE)
**Remove:** `{ [K in keyof T]: any }`, mapped types.
**Rewrite to:** explicit per-event typed handler arrays (no mapped types).

---

### `patterns/state.sjs` (REWRITE)
**Remove:** `switch`, `type Action = { type: 'ADD_TODO'; payload: ... }` pattern.
**Rewrite to:** SJS sum type `Action` + `match` in reducer.

```sjs
type Action = | AddTodo(string) | ToggleTodo(number) | SetFilter(FilterType) | ClearCompleted
function reducer(state: AppState, action: Action): AppState {
  return match action { AddTodo(text) => ..., ToggleTodo(id) => ..., ... }
}
```

---

### `oop/mixins.sjs` (REWRITE)
**Remove:** `Constructor<T>` with `...args: any[]`, `applyMixins`, `!` assertions.
**Rewrite to:** object composition pattern. Comment explaining why mixin-with-varargs-constructor can't be expressed without `dynamic`.

---

### `modules/collections.sjs` (NEW)
**Concepts:** Generic class exports, `Stack<T>`, `Queue<T>`.

Note: `Stack.pop()` returns `T | undefined` (NOT `T?`) — spec §8.1 JS array.pop semantics.

```sjs
export class Stack<T> {
  #items: T[] = []
  pop(): T | undefined { return this.#items.pop() }
  peek(): T | undefined { return this.#items[this.#items.length - 1] }
}
```

---

### `modules/http.sjs` (NEW)
**Concepts:** Async module exports, `Result<T,E>` from module.
**Must not contain:** `any`, bare `throw` for HTTP errors.

---

### `async/04-concurrent.sjs` (NEW)
**Concepts:** `Promise.all` with typed results, collecting Ok values.
**Must not contain:** `any`, bare `catch(e: any)`.

---

## Root `README.md` Required Sections

1. **Prerequisites:** Node.js 18+, `npm install -g superjs`, confirm `superjs --version`
2. **Quickstart:** 5-line snippet — write `hello.sjs`, `superjs build --source hello.sjs --outDir /tmp/out && node /tmp/out/hello.js`
3. **Reading order:** numbered list matching canonical learning path
4. **How to run any example:** `superjs build --source <file> --outDir /tmp/out && node /tmp/out/<filename>.js`
5. **SJS idiom cheatsheet:** one-liner each for `T?`, `??`, `?.`, `match`, sum-type decl, generic constraint
6. **When you hit error X:** links to `errors/SJS-E001-null-deref.sjs` and `errors/SJS-E007-nonexhaustive.sjs`
7. **File a bug:** `https://github.com/hbarve1/super-js/issues`
8. **Intentionally NOT supported:** `any` (use `dynamic`), `enum` (use sum types), `Partial<T>` (declare explicit interface), `T!` (use null check), `as T` (use `dynamic` local), mapped types, conditional types
9. **License:** MIT

---

## Sprint Plan (~12 working days)

### Sprint 0 — Baseline (1 day)

1. DELETE `advanced/decorators.sjs` (decorator syntax not in SJS spec)
2. CONFIRM BUILD: `superjs build --source prototype/examples/node/src/analyzer.sjs --outDir /tmp/test && node /tmp/test/analyzer.js` — baseline "it works"
3. CONFIRM BUILD: `superjs build --dir prototype/examples/basics --outDir /tmp/test` — smoke test

**Done signal:** analyzer.js runs without error. basics/ produces 0 type errors.

---

### Sprint A — New categories (3 days)

null-safety/ (4 files + README), sum-types/ (4 files + README), match/ (3 files + README), dynamic/ (2 files + README), structural-interfaces/ (2 files + README).

**Done signal:** `superjs build --dir prototype/examples/null-safety --outDir /tmp/ns && node /tmp/ns/01-basics.js` — compiles and runs. Same for each new directory.

---

### Sprint B — High-value rewrites (2 days)

types/ (6 files + README), generics/ (3 files + README), patterns/events.sjs, patterns/state.sjs, patterns/dependency-injection.sjs, patterns/middleware.sjs + README.

**Done signal:** `superjs build --dir prototype/examples/types --outDir /tmp/types` — 0 errors. Same for generics/, patterns/.

---

### Sprint C — Algorithm/OOP/async rewrites (2 days)

algorithms/ (5 rewrites + 1 audit + README), oop/ (3 files + README), async/ (3 rewrites + 04-concurrent NEW + README).

**Done signal:** `superjs build --dir prototype/examples/algorithms --outDir /tmp/alg` — 0 errors. Same for oop/, async/.

---

### Sprint D — Real-world, errors, testing, and remaining (3 days)

real-world/ (3 files + README), errors/ (2 files + README), testing/ (2 files + README), gradual-typing/step-by-step.sjs + README, jsx/sum-types.sjs + 2 rewrites + README, modules/collections.sjs + http.sjs + README, basics/classes.sjs + types.sjs + README, root README.md, node/README.md, audit remaining files.

**Done signal:** `superjs build --dir prototype/examples --outDir /tmp/all` — 0 type errors across full examples tree. `superjs test prototype/examples/testing/` — all tests pass.

---

## CI Integration

After Sprint D, add to CI:

```bash
# scripts/validate-examples.sh
superjs build --dir prototype/examples --outDir /tmp/sjs-examples-ci
node /tmp/sjs-examples-ci/basics/hello-world.js
node /tmp/sjs-examples-ci/null-safety/01-basics.js
# one line per demo file...
superjs test prototype/examples/testing/
```

Any file failing to compile or crashing at runtime fails CI. This prevents example rot as the compiler evolves.
