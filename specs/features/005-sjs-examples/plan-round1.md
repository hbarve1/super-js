# SJS Examples — Round 1 Rewrite Plan

**Date:** 2026-05-30  
**Scope:** Bring every file in `prototype/examples/` into full SJS-syntax compliance and fill structural gaps.

---

## Part 1 — Audit, Structure, Quality Criteria, Sprint Plan

---

### 1. Audit Table

Each row captures the current file(s), the violation category, and the action required.

| Directory | File(s) | Violations Found | Action |
|---|---|---|---|
| **advanced/async-iterator.sjs** | `T \| undefined` on `IteratorResult`, `any[]` in `processInChunks`, no sum types | `any`, `T\|undefined` not `T?` | REWRITE |
| **advanced/decorators.sjs** | `type MethodDecorator = (target: any, ...)`, `T extends new (...args: any[])`, `any` throughout | `any`, banned conditional generics | REWRITE |
| **advanced/generics.sjs** | `T \| undefined` returns, `T extends Identifiable` (ok), `T['id']` index access | `T\|undefined` not `T?`, minor issues | REWRITE |
| **advanced/todo-list.sjs** | `string \| null`, `Date \| null` instead of `T?` | nullable not using `T?` | REWRITE |
| **algorithms/hash-map.sjs** | `Entry<K,V> \| null` instead of `Entry<K,V>?`, `V \| null` returns, otherwise clean | nullable not using `T?` | REWRITE |
| **algorithms/binary-search-tree.sjs** | (not read but pattern-similar) likely `T \| null` for nodes | nullable | AUDIT+REWRITE |
| **algorithms/graph.sjs** | (not read) likely similar | nullable | AUDIT+REWRITE |
| **algorithms/linked-list.sjs** | (not read) likely `T \| null` node links | nullable | AUDIT+REWRITE |
| **algorithms/sorting.sjs** | (not read) likely clean — sort functions | likely ok | AUDIT |
| **algorithms/stack-queue.sjs** | (not read) likely `T \| undefined` | nullable | AUDIT+REWRITE |
| **async/async-await.sjs** | `(err as Error)` non-null assertion cast, `Promise<{ id: number; ... }>` inline anonymous — ok pattern, no sum types for errors | `as Error` cast (banned `!`-adjacent), no sum-type error handling | REWRITE |
| **async/error-handling.sjs** | (not read) title implies `try/catch` patterns likely using `any` for caught errors | likely `any` | AUDIT+REWRITE |
| **async/promises.sjs** | (not read) likely raw promise chains | likely ok with minor fixes | AUDIT |
| **basics/arrays.sjs** | (not read, new file on branch 001) likely clean new file | check for `T\|undefined` | AUDIT |
| **basics/classes.sjs** | `T \| undefined` pop returns, `private` keyword ok in SJS, abstract ok | `T\|undefined` not `T?` | REWRITE |
| **basics/control-flow.sjs** | (not read, new file) likely clean | check | AUDIT |
| **basics/functions.sjs** | (not read, new file) likely clean | check | AUDIT |
| **basics/hello-world.sjs** | (not read, new file) likely clean | check | KEEP |
| **basics/loops.sjs** | (not read, new file) likely clean | check | AUDIT |
| **basics/objects.sjs** | (not read, new file) likely clean | check | AUDIT |
| **basics/template-literals.sjs** | (not read, new file) likely clean | check | AUDIT |
| **basics/types.sjs** | `type Optional<T> = T \| null \| undefined` — defines banned pattern as alias, `T | null` usage | defines `T|null|undefined` alias | REWRITE |
| **basics/variables.sjs** | (not read, new file) likely clean | check | AUDIT |
| **gradual-typing/mixed.sjs** | (not read) keep — purpose is to show gradual | keep as-is | AUDIT |
| **gradual-typing/plain-js.sjs** | (not read) keep — purpose is to show gradual | keep as-is | AUDIT |
| **jsx/basic-counter.sjs** | `optional?: T` props (ok), no banned patterns visible | mostly ok | AUDIT |
| **jsx/fragments-and-composition.sjs** | `children?: any` — uses `any` | `any` banned | REWRITE |
| **jsx/server-side-rendering.sjs** | `.toString()` on JSX element — acceptable runtime call; otherwise clean | minor | KEEP |
| **jsx/todo-list.sjs** | `e.target as HTMLInputElement` — non-null cast pattern | cast | REWRITE |
| **jsx/src/App.sjs** | (not read) likely similar patterns | unknown | AUDIT |
| **jsx/src/components/*.sjs** | (not read) unknown | unknown | AUDIT |
| **modules/main.sjs** | (not read) only 2 files | thin coverage | EXPAND |
| **modules/math.sjs** | (not read) only 2 files | thin coverage | EXPAND |
| **node/src/analyzer.sjs** | Uses `type AnalysisResult<T> = Success(T) \| Failure(string)` — CORRECT SJS sum types. No violations found. | clean | KEEP |
| **oop/abstract-classes.sjs** | `T \| undefined` returns from Queue/Stack, `private` ok, otherwise clean structure | `T\|undefined` not `T?` | REWRITE |
| **oop/inheritance.sjs** | (not read) likely clean | check | AUDIT |
| **oop/mixins.sjs** | `Constructor<T = {}>` with `any[]` args, `any` in EventEmitter listeners, `any` in applyMixins, `!` assertion in `get(event)!.add` | `any`, `!` assertion | REWRITE |
| **patterns/builder.sjs** | (not read, new file on branch 001) unknown | unknown | AUDIT |
| **patterns/dependency-injection.sjs** | `Map<string, any>`, `resolve<T>(): T` on any | `any` in container | REWRITE |
| **patterns/events.sjs** | `{ [K in keyof T]: any }` constraint, `{ [K in keyof T]?: Set<...> }` mapped type body — both BANNED | mapped types, keyof | REWRITE |
| **patterns/functional.sjs** | (not read, new file) unknown | unknown | AUDIT |
| **patterns/middleware.sjs** | `body: any` in Request/Response | `any` | REWRITE |
| **patterns/observable.sjs** | Otherwise clean, minor emoji in string literals (not a type violation) | clean | KEEP |
| **patterns/state.sjs** | `type Action = \| { type: 'ADD_TODO'; payload: string } \| ...` — this IS a valid SJS sum-type approach with object tags, but should use SJS variant syntax | should use SJS variant syntax | REWRITE |
| **types/generics-advanced.sjs** | `T extends any[]`, `T extends (infer E)[]`, `{ readonly [K in keyof T]: ... }`, `{ [K in keyof T]: string }`, `T extends [any, ...infer Rest]`, `T extends Promise<infer U>`, conditional types throughout | mapped types, conditional types, `infer`, `keyof`, `any` — all BANNED | REWRITE |
| **types/interfaces.sjs** | (not read) unknown | unknown | AUDIT+REWRITE |
| **types/literal-and-enum.sjs** | `enum Direction2`, `enum HttpMethod`, `const enum Status`, `const enum Permission`, `typeof Color[keyof typeof Color]`, `T extends any[]` conditional type, template literal type `\`${number}${CSSUnit}\`` | `enum`, `keyof`, conditional types — all BANNED | REWRITE |
| **types/tuple-types.sjs** | (not read) likely uses tuples ok but may have labeled tuples | unknown | AUDIT+REWRITE |
| **types/type-aliases.sjs** | (not read) unknown | unknown | AUDIT+REWRITE |
| **types/type-guards.sjs** | (not read) likely uses `is` type predicate — check if banned | unknown | AUDIT+REWRITE |
| **types/union-types.sjs** | (not read) likely uses `A \| B` union — ok if not intersection | unknown | AUDIT |
| **web/src/app.sjs** | (not read) web app | unknown | AUDIT |
| **web/src/storage.sjs** | (not read) unknown | unknown | AUDIT |
| **web/src/utils.sjs** | (not read) unknown | unknown | AUDIT |

**NEW directories to create (all net-new files):**

| Directory | Purpose |
|---|---|
| `null-safety/` | Dedicated showcase: `T?`, `?.`, `??`, narrowing |
| `sum-types/` | Dedicated showcase: type declarations, constructors, match |
| `real-world/` | Complete mini-apps that use the full language |

---

### 2. Target Directory Structure

```
prototype/examples/
  README.md                          (update index)
  
  null-safety/                       NEW
    basics.sjs                       T? declarations, narrowing
    chaining.sjs                     ?. optional chain
    defaults.sjs                     ?? nullish coalescing
    patterns.sjs                     real-world nullable patterns
  
  sum-types/                         NEW
    basics.sjs                       type Foo = A | B, constructors
    match.sjs                        exhaustive match
    generic-sum-types.sjs            Result<T,E>, Option<T>
    recursive.sjs                    tree / linked list sum types
  
  real-world/                        NEW
    task-manager.sjs                 full CRUD with sum types + null safety
    http-client.sjs                  async + Result<T,E> error handling
    config-loader.sjs                file parsing with sum types
  
  basics/                            KEEP + AUDIT
    hello-world.sjs                  keep
    variables.sjs                    audit
    functions.sjs                    audit
    arrays.sjs                       audit
    objects.sjs                      audit
    loops.sjs                        audit
    control-flow.sjs                 audit
    template-literals.sjs            audit
    classes.sjs                      rewrite (T|undefined → T?)
    types.sjs                        rewrite (Optional<T> alias banned)
  
  algorithms/                        KEEP + REWRITE nullable
    hash-map.sjs                     rewrite (Entry? not Entry|null)
    binary-search-tree.sjs           rewrite
    graph.sjs                        rewrite
    linked-list.sjs                  rewrite
    sorting.sjs                      audit
    stack-queue.sjs                  rewrite
    README.md                        keep
  
  async/                             REWRITE
    async-await.sjs                  rewrite (sum-type errors, no `as Error`)
    error-handling.sjs               rewrite (Result<T,E> pattern)
    promises.sjs                     audit
  
  gradual-typing/                    KEEP
    plain-js.sjs                     keep
    mixed.sjs                        keep
  
  jsx/                               PARTIAL REWRITE
    basic-counter.sjs                audit
    fragments-and-composition.sjs    rewrite (children: dynamic not any)
    server-side-rendering.sjs        keep
    todo-list.sjs                    rewrite (cast removal)
    src/App.sjs                      audit
    src/components/Editor.sjs        audit
    src/components/Preview.sjs       audit
    src/components/Toolbar.sjs       audit
    src/hooks/useMarkdown.sjs        audit
    src/types.sjs                    audit
  
  modules/                           EXPAND
    math.sjs                         keep
    main.sjs                         keep
    collections.sjs                  NEW — generic exports
    http.sjs                         NEW — async module with re-exports
  
  node/                              KEEP
    src/analyzer.sjs                 keep (already correct SJS)
    src/formatter.sjs                audit
    src/fs-utils.sjs                 audit
    src/main.sjs                     audit
  
  oop/                               AUDIT + REWRITE
    abstract-classes.sjs             rewrite (T? returns)
    inheritance.sjs                  audit
    mixins.sjs                       rewrite (any, !)
  
  patterns/                          REWRITE
    builder.sjs                      audit/rewrite
    dependency-injection.sjs         rewrite (Map<string,dynamic>)
    events.sjs                       rewrite (remove mapped types)
    functional.sjs                   audit/rewrite
    middleware.sjs                   rewrite (body: dynamic)
    observable.sjs                   keep
    state.sjs                        rewrite (SJS variant syntax)
  
  types/                             REWRITE ALL
    generics-advanced.sjs            rewrite (remove all TS-specific)
    interfaces.sjs                   rewrite
    literal-and-enum.sjs             rewrite (enum → sum types)
    tuple-types.sjs                  rewrite
    type-aliases.sjs                 rewrite
    type-guards.sjs                  rewrite
    union-types.sjs                  audit/keep if clean
  
  advanced/                          REWRITE ALL
    async-iterator.sjs               rewrite
    decorators.sjs                   rewrite (decorator support if exists, else drop)
    generics.sjs                     rewrite (T? returns)
    todo-list.sjs                    rewrite (T? for nullable fields)
  
  web/                               AUDIT
    src/app.sjs                      audit
    src/storage.sjs                  audit
    src/utils.sjs                    audit
```

**Net new files: 9** (4 null-safety, 4 sum-types, 3 real-world, 2 modules = 9)  
**Files to rewrite: ~28**  
**Files to audit only (likely minor or no changes): ~20**  
**Files to keep as-is: ~8**

---

### 3. Quality Criteria

A file passes Round 1 review when ALL of the following hold:

#### 3.1 Syntax — Banned patterns must be absent

| # | Banned pattern | SJS replacement |
|---|---|---|
| B1 | `any` | `dynamic` |
| B2 | `T \| undefined` or `T \| null` | `T?` |
| B3 | `T extends U ? A : B` conditional type | remove or restructure |
| B4 | `{ [K in keyof T]: ... }` mapped type | structural interface |
| B5 | `A & B` intersection type | structural interface |
| B6 | `enum Foo { ... }` | `type Foo = A \| B \| C` or sum type |
| B7 | `namespace Foo { ... }` | module / export |
| B8 | `expr!` non-null assertion | `??` or null-check branch |
| B9 | `as T` type cast (in most cases) | match / type guard |
| B10 | `typeof X[keyof typeof X]` | direct type alias |

#### 3.2 Syntax — Required SJS idioms must be used where applicable

| # | Idiom | When required |
|---|---|---|
| R1 | `T?` | whenever a value may be absent |
| R2 | `?.` optional chain | chaining on nullable |
| R3 | `??` nullish coalesce | providing defaults for nullable |
| R4 | `type Result<T,E> = Ok(T) \| Err(E)` | async error paths |
| R5 | `match expr { Variant(x) => ... }` | exhaustive dispatch on sum types |
| R6 | `<T: Interface>` | generic constraints |
| R7 | `function f(x): dynamic` | when return is truly opaque |
| R8 | No `implements` keyword | structural typing only |

#### 3.3 Educational quality

- Every file has a comment header stating what concept it demonstrates.
- Every concept has at least one usage example at the bottom.
- No file exceeds 200 lines (split if needed).
- New directories (`null-safety/`, `sum-types/`, `real-world/`) have a short comment block at top of each file situating it within the directory's theme.

#### 3.4 Completeness

- `null-safety/` covers all four sub-topics (declaration, chaining, defaults, narrowing patterns).
- `sum-types/` covers all four sub-topics (basics, match, generics, recursive).
- `real-world/` has at least two complete mini-apps using sum types + null safety together.
- All directories listed in the structure above exist and have at least the files specified.

---

### 4. Sprint Plan

Work is organised into four sequential sprints. Each sprint is independently committable.

#### Sprint A — New directories (no conflicts, pure additions)

**Goal:** Create the three new directories with all specified files.

| File | Key concepts |
|---|---|
| `null-safety/basics.sjs` | `T?` declarations, narrowing with `if (x != null)` |
| `null-safety/chaining.sjs` | `?.` on objects, arrays, function calls |
| `null-safety/defaults.sjs` | `??` patterns, default arguments |
| `null-safety/patterns.sjs` | API response nullable fields, user input patterns |
| `sum-types/basics.sjs` | `type Shape = Circle(number) \| Rect(number, number)` |
| `sum-types/match.sjs` | exhaustive match, wildcard arm |
| `sum-types/generic-sum-types.sjs` | `Result<T,E>`, `Option<T>`, chained transforms |
| `sum-types/recursive.sjs` | `type Tree<T> = Leaf \| Node(T, Tree<T>, Tree<T>)` |
| `real-world/task-manager.sjs` | CRUD ops, `Result<Task,AppError>`, nullable fields |
| `real-world/http-client.sjs` | async fetch wrapper returning `Result<T,HttpError>` |
| `real-world/config-loader.sjs` | parse + validate config with sum-type error variants |

**Exit condition:** All 11 files pass quality criteria §3.1–3.4.

#### Sprint B — High-value rewrites (types/, advanced/, patterns/)

**Goal:** Eliminate the densest concentrations of banned TS-specific syntax.

| File | Primary violation to fix |
|---|---|
| `types/generics-advanced.sjs` | Remove all conditional/mapped types; rewrite with `<T: I>` constraints |
| `types/literal-and-enum.sjs` | Replace all `enum` with sum types |
| `types/interfaces.sjs` | Check / rewrite |
| `types/type-aliases.sjs` | Check / rewrite |
| `types/type-guards.sjs` | Replace `is` predicates with match if needed |
| `types/union-types.sjs` | Audit, keep if clean |
| `types/tuple-types.sjs` | Remove labeled tuple types if banned |
| `advanced/async-iterator.sjs` | `T?` for `IteratorResult`, remove `any` |
| `advanced/decorators.sjs` | Remove `any`, use `dynamic`; or drop file if decorators unsupported |
| `advanced/generics.sjs` | `T?` returns |
| `advanced/todo-list.sjs` | `string?` and `Date?` for nullable fields |
| `patterns/events.sjs` | Replace mapped-type EventEmitter with structural interface |
| `patterns/state.sjs` | SJS variant syntax for Action sum type |
| `patterns/dependency-injection.sjs` | `Map<string, dynamic>` |
| `patterns/middleware.sjs` | `body: dynamic` |

**Exit condition:** All 15 files pass quality criteria §3.1.

#### Sprint C — Algorithm and OOP rewrites (nullable T?)

**Goal:** Systematic `T|null` → `T?` conversion in data structure files.

| File | Primary violation |
|---|---|
| `algorithms/hash-map.sjs` | `Entry<K,V> \| null` → `Entry<K,V>?`, `V \| null` → `V?` |
| `algorithms/binary-search-tree.sjs` | Node nullable links |
| `algorithms/linked-list.sjs` | Node nullable next |
| `algorithms/graph.sjs` | nullable adjacency entries |
| `algorithms/stack-queue.sjs` | `T \| undefined` returns |
| `oop/abstract-classes.sjs` | `T \| undefined` from Queue/Stack |
| `oop/mixins.sjs` | `any`, `!` assertion |
| `oop/inheritance.sjs` | audit |
| `async/async-await.sjs` | sum-type error handling, remove `as Error` |
| `async/error-handling.sjs` | `Result<T,E>` pattern |
| `async/promises.sjs` | audit |

**Exit condition:** All 11 files pass quality criteria §3.1 and §3.2 (R1–R3).

#### Sprint D — Basics, JSX, Modules, Node, Web audits

**Goal:** Verify clean files and apply targeted fixes to remainder.

| File | Action |
|---|---|
| `basics/classes.sjs` | `T \| undefined` pop → `T?` |
| `basics/types.sjs` | Remove `Optional<T>` alias |
| `basics/` (8 other files) | Audit, minor fixes if any |
| `jsx/fragments-and-composition.sjs` | `children: dynamic` |
| `jsx/todo-list.sjs` | Remove `as HTMLInputElement` cast |
| `jsx/src/*.sjs` | Audit all |
| `modules/collections.sjs` | New file |
| `modules/http.sjs` | New file |
| `node/src/` (3 files) | Audit |
| `web/src/` (3 files) | Audit |
| `gradual-typing/` (2 files) | Keep / audit |
| `patterns/builder.sjs` | Audit |
| `patterns/functional.sjs` | Audit |

**Exit condition:** All audited files pass quality criteria §3.1. All new module files pass §3.1–3.4.

---

### 5. Summary Counts

| Category | Count |
|---|---|
| Net new files | 13 (11 Sprint A + 2 modules Sprint D) |
| Full rewrites | 28 |
| Audit + minor fix | 18 |
| Keep as-is | 8 |
| **Total files touched** | **67** |

---

---

## Part 2 — Per-File Specifications

---

### null-safety/basics.sjs

**Concept:** `T?` type declarations, null narrowing, non-nullable by default.

```
// null-safety/basics.sjs — T? declarations and narrowing
```

**Interfaces / types to define:**
- `interface User { id: number, name: string, email: string?, bio: string? }`
- `interface Config { host: string, port: number, timeout: number?, retries: number? }`

**Functions to implement:**
- `function formatEmail(user: User): string` — uses `if (user.email != null)` narrowing; returns formatted string or `"(no email)"`
- `function describe(user: User): string` — chains nullable fields with explicit null checks
- `function buildUrl(config: Config): string` — uses `config.timeout` nullable with fallback
- `function parsePort(raw: string?): number` — parameter itself is nullable; narrow before parse

**Demo block:** construct two users (one with all fields, one sparse), call all functions, log results.

**Must NOT contain:** `T | null`, `T | undefined`, `??` (that is defaults.sjs), `?.` (that is chaining.sjs).

---

### null-safety/chaining.sjs

**Concept:** `?.` optional chaining on objects, arrays, and functions.

```
// null-safety/chaining.sjs — ?. optional chain
```

**Types to define:**
- `interface Address { street: string, city: string, zip: string? }`
- `interface Profile { displayName: string?, address: Address?, tags: string[]? }`
- `interface Organization { name: string, owner: Profile? }`

**Functions to implement:**
- `function getCity(org: Organization): string?` — `org.owner?.address?.city`
- `function firstTag(profile: Profile?): string?` — `profile?.tags?.[0]`
- `function callGreeter(greeter: (() => string)?): string?` — `greeter?.()`
- `function getZip(org: Organization): string?` — multi-level: `org.owner?.address?.zip`

**Demo block:** construct org with partial nesting, call all functions.

**Must NOT contain:** `!` assertions, `T | null`, plain property access on nullable without `?.`.

---

### null-safety/defaults.sjs

**Concept:** `??` nullish coalescing for defaults.

**Types to define:**
- `interface AppSettings { theme: string?, fontSize: number?, language: string?, maxItems: number? }`
- `interface RequestOptions { timeout: number?, retries: number?, headers: string[]? }`

**Functions to implement:**
- `function resolveSettings(partial: AppSettings): AppSettings` — fills each field using `??`, returns fully-populated settings
- `function withDefaults(opts: RequestOptions?): RequestOptions` — parameter is nullable; `opts ?? {}` then field defaults
- `function greet(name: string?): string` — `"Hello, " + (name ?? "stranger")`
- `function clamp(value: number?, min: number, max: number): number` — `Math.min(max, Math.max(min, value ?? min))`

**Demo block:** show `??` vs `||` behavior difference with `0` and `""` values.

---

### null-safety/patterns.sjs

**Concept:** Real-world nullable patterns — API response fields, user input, optional configuration.

**Types to define:**
- `type FetchResult<T> = { data: T?, error: string?, status: number }`
- `interface SearchParams { query: string, limit: number?, offset: number?, sort: string? }`

**Functions to implement:**
- `function processResult<T>(result: FetchResult<T>, fallback: T): T` — narrow `data`, use fallback
- `function buildQueryString(params: SearchParams): string` — appends optional params only when non-null
- `function safeJsonParse(raw: string?): dynamic` — returns `null` if raw is null; wraps parse
- `function getNestedValue(obj: dynamic, keys: string[]): dynamic` — safe deep access returning nullable

**Demo block:** mock API results including null data cases, show narrowing.

---

### sum-types/basics.sjs

**Concept:** Sum type declarations and constructors.

**Types to declare:**
```
type Shape = Circle(number) | Rectangle(number, number) | Triangle(number, number, number)
type Color = Red | Green | Blue | Custom(number, number, number)
type Direction = North | South | East | West
```

**Functions to implement:**
- `function area(s: Shape): number` — match on shape, compute area per variant
- `function perimeter(s: Shape): number` — match, compute perimeter
- `function colorToHex(c: Color): string` — match, return hex string; Custom uses args
- `function opposite(d: Direction): Direction` — match, return opposite direction

**Demo block:** construct all variants, call all functions.

**Must NOT contain:** string literal unions for these types, `enum`, `switch`.

---

### sum-types/match.sjs

**Concept:** Exhaustive `match` expression, wildcards, nested match.

**Types to declare:**
```
type Token = Number(number) | StringLit(string) | Bool(boolean) | Null | Identifier(string)
type Expr = Literal(Token) | BinOp(string, Expr, Expr) | Unary(string, Expr) | Var(string)
```

**Functions to implement:**
- `function tokenToString(t: Token): string` — exhaustive match on all Token variants
- `function evalToken(t: Token): dynamic` — match, return underlying value
- `function exprDepth(e: Expr): number` — recursive match; `BinOp` recurses on both arms
- `function prettyPrint(e: Expr): string` — recursive; produces infix string

**Must demonstrate:** all arms covered (no wildcard crutch on Token), wildcard `_` arm used once in Expr for illustration.

---

### sum-types/generic-sum-types.sjs

**Concept:** `Result<T,E>` and `Option<T>` as first-class SJS sum types.

**Types to declare:**
```
type Result<T, E> = Ok(T) | Err(E)
type Option<T> = Some(T) | None
```

**Functions to implement:**
- `function mapResult<T, U, E>(r: Result<T,E>, f: (v: T) => U): Result<U,E>` — match, apply f to Ok
- `function flatMapResult<T, U, E>(r: Result<T,E>, f: (v: T) => Result<U,E>): Result<U,E>` — monadic bind
- `function resultToOption<T, E>(r: Result<T,E>): Option<T>` — discard error
- `function getOrDefault<T>(o: Option<T>, def: T): T` — match Some/None
- `function parseNumber(s: string): Result<number, string>` — real parse with error string
- `function divideBy(a: number, b: number): Result<number, string>` — guard divide-by-zero

**Demo block:** chain `parseNumber` → `divideBy` using `flatMapResult`.

---

### sum-types/recursive.sjs

**Concept:** Recursive sum types for tree and list structures.

**Types to declare:**
```
type Tree<T> = Leaf | Node(T, Tree<T>, Tree<T>)
type List<T> = Nil | Cons(T, List<T>)
type Json = JsonNull | JsonBool(boolean) | JsonNumber(number) | JsonString(string) | JsonArray(Json[]) | JsonObject(Map<string, Json>)
```

**Functions to implement:**
- `function treeDepth<T>(t: Tree<T>): number` — match Leaf/Node recursively
- `function treeMap<T, U>(t: Tree<T>, f: (v: T) => U): Tree<U>` — structural map
- `function listLength<T>(l: List<T>): number` — match Nil/Cons recursively
- `function listToArray<T>(l: List<T>): T[]` — accumulate
- `function jsonStringify(j: Json): string` — recursive match all variants

**Demo block:** build a small BST as a Tree, show depth and map; build a List of numbers.

---

### real-world/task-manager.sjs

**Concept:** Full CRUD app combining sum types, null safety, generics.

**Types to declare:**
```
type Priority = Low | Medium | High | Critical
type TaskStatus = Todo | InProgress | Done | Cancelled
type AppError = NotFound(string) | ValidationError(string) | PermissionDenied
type Result<T, E> = Ok(T) | Err(E)
interface Task { id: number, title: string, description: string?, priority: Priority, status: TaskStatus, dueDate: string?, assignee: string? }
```

**Class:** `TaskManager`
- `#tasks: Map<number, Task>`
- `create(title: string, priority: Priority): Result<Task, AppError>` — validates title non-empty
- `update(id: number, patch: Partial): Result<Task, AppError>` — `NotFound` on miss
- `complete(id: number): Result<Task, AppError>`
- `cancel(id: number): Result<Task, AppError>`
- `byPriority(p: Priority): Task[]`
- `pending(): Task[]`
- `summary(): string` — uses nullable fields with `??`

**Demo block:** create several tasks, update, complete one, cancel one, print summary.

**Must demonstrate:** `Result` returns everywhere (no exceptions), `T?` for optional Task fields, `match` on `AppError`.

---

### real-world/http-client.sjs

**Concept:** Async wrapper returning `Result<T,E>`, chained operations.

**Types to declare:**
```
type HttpError = NetworkError(string) | StatusError(number, string) | ParseError(string) | TimeoutError
type Result<T, E> = Ok(T) | Err(E)
interface Response<T> { status: number, headers: Map<string, string>, body: T? }
interface RequestConfig { url: string, method: string, timeout: number?, headers: Map<string, string>? }
```

**Functions to implement:**
- `async function request<T>(config: RequestConfig): Promise<Result<T, HttpError>>` — mock fetch, wraps errors in sum type variants
- `async function get<T>(url: string): Promise<Result<T, HttpError>>` — shorthand
- `async function post<T>(url: string, body: dynamic): Promise<Result<T, HttpError>>`
- `function mapHttpResult<T, U>(r: Result<T, HttpError>, f: (v: T) => U): Result<U, HttpError>`
- `function handleError(e: HttpError): string` — match all variants, produce user message

**Demo block:** chain two `get` calls, demonstrate `Err` path, use `mapHttpResult` to transform body.

---

### real-world/config-loader.sjs

**Concept:** Parse and validate configuration with sum-type errors.

**Types to declare:**
```
type ConfigError = MissingField(string) | InvalidValue(string, string) | FileNotFound(string) | ParseFailure(string)
type Result<T, E> = Ok(T) | Err(E)
interface DatabaseConfig { host: string, port: number, name: string, user: string, password: string? }
interface ServerConfig { port: number, host: string?, cors: boolean?, maxConnections: number? }
interface AppConfig { database: DatabaseConfig, server: ServerConfig, debug: boolean? }
```

**Functions to implement:**
- `function parseDatabase(raw: Map<string, string>): Result<DatabaseConfig, ConfigError>` — validates required fields, port is numeric
- `function parseServer(raw: Map<string, string>): Result<ServerConfig, ConfigError>`
- `function loadConfig(raw: Map<string, dynamic>): Result<AppConfig, ConfigError>` — composes the two parsers
- `function describeError(e: ConfigError): string` — match all variants
- `function withFallback<T, E>(r: Result<T,E>, fallback: T): T` — utility

**Demo block:** parse valid config, parse config with missing field (show error), parse config with invalid port.

---

### types/generics-advanced.sjs (REWRITE)

**Remove entirely:** all conditional types (`T extends U ? A : B`), all mapped types (`{ [K in keyof T]: ... }`), all `infer`, all `keyof`, all `any`.

**Keep / rewrite to SJS:**
- `function getProperty<T: Record>(obj: T, key: string): dynamic` — use dynamic return
- Generic `Stack<T>` class — keep, fix `T | undefined` → `T?` on `pop`/`peek`
- `interface Comparable<T> { compareTo(other: T): number }` — keep, valid structural interface
- `class Temperature` implementing `Comparable<Temperature>` — keep (no `implements` keyword)
- Generic `pipe` overloads — keep, remove `Function` as type; use `(a: A) => B` style
- Replace `Option<T>` class using `value: T | null` with sum-type: `type Option<T> = Some(T) | None`; implement `mapOption`, `flatMapOption`, `getOrElse` as free functions

**Must demonstrate:** `<T: Interface>` constraint syntax, `Option<T>` as proper SJS sum type.

---

### types/literal-and-enum.sjs (REWRITE)

**Remove entirely:** all `enum`, `const enum`, `typeof X[keyof typeof X]`, template literal types with `Capitalize`.

**Rewrite to SJS:**
- `type Direction = North | South | East | West` — sum type
- `type LogLevel = Debug | Info | Warn | Error` — sum type
- `function move(d: Direction): string` — match, return vector string
- HTTP status: `type HttpStatus = Ok | Created | BadRequest | Unauthorized | Forbidden | NotFound | InternalError` — sum type
- `function isSuccess(s: HttpStatus): boolean` — match
- Colors: `const RED = "#FF0000"` etc as plain constants (not `as const` mapping)
- `type Permission = None | Read | Write | Execute | All` — sum type
- `function canRead(p: Permission): boolean` — match
- Navigation: `type Route = Home | About | Contact` — sum type with `function toPath(r: Route): string`

**Must NOT contain:** any `enum` keyword, `keyof`, `typeof X[keyof ...]`.

---

### types/interfaces.sjs (REWRITE — audit first)

**Target:** Demonstrate structural typing without `implements`.

**Must demonstrate:**
- Interface declaration
- Structural satisfaction without `implements` keyword
- Generic interfaces `interface Container<T> { value: T }`
- Interface extension via spreading (if supported) or separate narrower interface
- Optional fields using `T?`

**Must NOT contain:** `implements` keyword, intersection types `A & B`.

---

### types/type-aliases.sjs (REWRITE — audit first)

**Target:** SJS-legal type aliases.

**Must demonstrate:**
- `type UserId = number`
- `type Callback = (event: string) => void`
- `type Predicate<T> = (value: T) => boolean`
- Sum type aliases: `type StringOrNumber = string | number` (union ok, not intersection)
- Recursive type alias if supported: `type Json = ...` (moved to sum-types/recursive if complex)

**Must NOT contain:** mapped types, conditional types, `keyof`, `infer`.

---

### types/type-guards.sjs (REWRITE — audit first)

**Target:** Narrowing without `is` type predicates (use match or null checks).

**Must demonstrate:**
- Null narrowing: `if (x != null) { ... }`
- `typeof` narrowing for primitives
- Match-based dispatch on sum types as the primary "type guard" pattern
- Instance checks via `x instanceof Class` if supported

**Must NOT contain:** `function isX(v: T): v is X` type predicate syntax (not in SJS spec).

---

### types/union-types.sjs (AUDIT — likely keep with minor fixes)

**Target:** Show `A | B` unions (not intersections).

**Must demonstrate:**
- `type StringOrNumber = string | number`
- `type Primitive = string | number | boolean`
- Functions accepting union parameters with narrowing
- Discriminated unions using literal string field (if not already using sum types)

**Must NOT contain:** `A & B` intersections, `any`.

---

### types/tuple-types.sjs (REWRITE — audit first)

**Target:** Tuple types as supported by SJS.

**Must demonstrate:**
- `type Point = [number, number]`
- `type RGB = [number, number, number]`
- Destructuring tuples
- Functions returning tuples: `function minMax(arr: number[]): [number, number]`

**Remove:** labeled tuple types (`[x: number, y: number]`) if not in SJS spec; plain positional tuples only.

---

### advanced/async-iterator.sjs (REWRITE)

**Keep structure:** `DataSource<T>` interface, `MockAPI`, `AsyncPageIterator`, `processInChunks`, `main`.

**Changes:**
- Remove `implements DataSource<string>` keyword (structural typing — `implements` not in SJS)
- Remove `implements AsyncIterableIterator<T[]>` — implement `[Symbol.asyncIterator]` structurally
- `{ done: true, value: undefined }` → use `T?` on the result value field: `{ done: boolean, value: T[]? }`
- Remove `main().catch(error => { console.error('Error:', error) })` — use `Result<void, string>` pattern or `.catch((e: Error) => ...)`

---

### advanced/decorators.sjs (REWRITE or REPLACE)

**Decision:** Decorator syntax (`@decorator`) is not confirmed in the SJS spec. Replace this file with a demonstration of higher-order functions achieving the same effect without decorator syntax.

**New concept:** "Function wrappers as decorators" — shows how to compose behavior without language-level decorator support.

**Functions to implement:**
- `function withLogging<T: object, K extends string>(fn: (args: T) => K, name: string): (args: T) => K` — wraps a function with before/after logs
- `function withMemoize<T, R>(fn: (arg: T) => R): (arg: T) => R` — wraps with cache
- `function withTiming<T, R>(fn: (arg: T) => R, label: string): (arg: T) => R`

**Demo:** compose the three wrappers on a `fibonacci` function.

---

### advanced/generics.sjs (REWRITE)

**Keep structure:** `Container<T>` interface, `Stack<T>` class, `wrapInContainer`, `findById`.

**Changes:**
- `pop(): T?` (was `T | undefined`)
- `peek(): T?`
- `findById<T: Identifiable>(items: T[], id: number): T?` — constraint syntax, `T?` return
- Remove `T extends Identifiable` → `<T: Identifiable>` constraint syntax
- Remove `T['id']` index type → `id: number` parameter directly
- Remove nested `interface User extends Identifiable` inside function — move to top-level

---

### advanced/todo-list.sjs (REWRITE)

**Changes:**
- `description: string?` (was `string | null`)
- `dueDate: Date?` (was `Date | null`)
- `addTodo(title, description: string? = null, priority: Priority = Medium): Task`
- Replace `'low' | 'medium' | 'high'` string union for Priority with `type Priority = Low | Medium | High` sum type
- `toggleComplete` and `setDueDate` return `Result<boolean, string>` (was `boolean`)
- `getTodosByPriority(p: Priority): Task[]` — match on Priority in filter

---

### algorithms/hash-map.sjs (REWRITE)

**Changes (minimal, surgical):**
- `next: Entry<K, V>?` (was `Entry<K,V> | null`)
- `buckets: Array<Entry<K,V>?>` (was `Array<Entry<K,V> | null>`)
- `get(key: K): V?` (was `V | null`)
- All `!== null` checks become `!= null` (SJS nullable narrowing)
- `entry = entry.next` loop already works with `T?`; remove `as number` cast in fib demo
- `private` keyword: keep (SJS supports `private`)

---

### algorithms/binary-search-tree.sjs (REWRITE)

**Assuming current content uses `Node<T> | null` for left/right:**
- `left: BST<T>?`, `right: BST<T>?`
- `insert`, `search`, `delete` — `T?` returns
- `type BST<T> = Leaf | Node(T, BST<T>, BST<T>)` — alternatively rewrite as a sum type (preferred); if keeping class form, use `T?` fields

---

### algorithms/linked-list.sjs (REWRITE)

**Assuming `next: Node<T> | null`:**
- `next: ListNode<T>?`
- `head: ListNode<T>?`
- `find(val: T): ListNode<T>?` — return nullable node
- Alternatively: `type List<T> = Nil | Cons(T, List<T>)` sum-type rewrite (preferred for showcase)

---

### algorithms/graph.sjs (REWRITE)

**Assuming adjacency list with nullable entries:**
- Replace nullable node lookups with `T?` returns
- `getNeighbors(node: string): string[]?` — returns nullable array
- All internal `Map.get()` returns (which are `T | undefined`) → use `??` or explicit `T?` field

---

### algorithms/stack-queue.sjs (REWRITE)

**Changes:**
- `pop(): T?`, `peek(): T?`, `dequeue(): T?` (was `T | undefined`)
- Keep all other logic

---

### oop/abstract-classes.sjs (REWRITE)

**Changes:**
- `Queue.remove(): T?` (was `T | undefined`)
- `Queue.peek(): T?`
- `Stack.remove(): T?`
- `Stack.peek(): T?`
- `PriorityQueue.remove(): T?`
- `PriorityQueue.peek(): T?`
- `CSVRowSerializer.deserialize` — `values[i] ?? ""` already correct, keep
- No structural changes needed beyond `T?` returns

---

### oop/mixins.sjs (REWRITE)

**Changes:**
- `type Constructor<T = {}>` with `...args: any[]` — replace with `type Constructor<T> = new () => T` (no `any[]` varargs)
- `EventEmitter`: replace `Map<string, Set<Function>>` with `Map<string, Set<(data: dynamic) => void>>` — no `any`, no `Function` type, use `dynamic`
- `emit(event: string, ...args: any[]): void` → `emit(event: string, data: dynamic): void`
- Remove `applyMixins` function entirely (uses `any`, `Object.defineProperty` with `any`) — replace with a note comment that interface satisfaction is structural
- Remove `!` assertion: `this.listeners.get(event)!.add(listener)` → `this.listeners.get(event)?.add(listener)` (or ensure-and-add pattern)
- Remove `(this as any)` in `DrawableMixin.draw` → use structural typing; access `name` via proper interface

---

### oop/inheritance.sjs (AUDIT)

Read on Sprint C start; apply fixes as needed. Expected: class extends, method override — likely clean. Watch for `any` in constructor args.

---

### async/async-await.sjs (REWRITE)

**Changes:**
- `(err as Error).message` → wrap caught value: `match err { e: Error => e.message, _ => "Unknown error" }` or narrow with `instanceof`
- Replace all return types `Promise<{ id: number; ... }>` with named interfaces
- Add `type AsyncResult<T> = Result<T, string>` and rewrite `safeGet` to return it
- `DataService.get<T>` — cache is `Map<number, dynamic>` (was `Map<number, any>`)
- `private cache: Map<number, any>` → `private cache: Map<number, dynamic>`

---

### async/error-handling.sjs (AUDIT+REWRITE)

**Expected violations:** `any` in catch blocks, `try/catch` without sum-type wrapping.

**Rewrite pattern:** wrap all async operations in `Result<T, AppError>`, demonstrate that callers use `match` instead of `try/catch`.

---

### async/promises.sjs (AUDIT)

Read on Sprint C start. If using `.catch((err: any) => ...)` replace with typed error. Otherwise keep.

---

### patterns/events.sjs (REWRITE)

**Remove entirely:** `{ [K in keyof T]: any }` constraint, `{ [K in keyof T]?: Set<...> }` mapped type.

**Rewrite:** Replace generic typed EventEmitter with a simpler structural interface approach.

```
// New approach: typed event bus using a record of handlers
interface ChatEvents {
  message: { user: string, text: string }
  join: string
  leave: string
  typing: { user: string, isTyping: boolean }
}

class ChatRoom {
  #messageHandlers: ((data: { user: string, text: string }) => void)[]
  #joinHandlers: ((data: string) => void)[]
  // ...per-event typed handler lists
}
```

Or use a simpler `on(event: string, cb: (data: dynamic) => void)` with `dynamic`, annotated clearly that this trades type safety for simplicity — showing gradual typing story.

**Keep:** `ChatRoom` domain logic, all four event types, the demo block.

---

### patterns/state.sjs (REWRITE)

**Changes:**
- Replace `type Action = | { type: 'ADD_TODO'; payload: string } | ...` with SJS sum type:
  ```
  type Action = AddTodo(string) | ToggleTodo(number) | SetFilter(FilterType)
  type FilterType = All | Active | Completed
  ```
- Replace `switch (action.type)` with `match action { AddTodo(text) => ..., ToggleTodo(id) => ..., SetFilter(f) => ... }`
- `Store<S, A>` class — keep generic, remove `Set<(state: S) => void>` if it uses mapped types (it doesn't; this is fine)
- `dispatch` — replace switch with match

---

### patterns/dependency-injection.sjs (REWRITE)

**Changes:**
- `Container.#services: Map<string, dynamic>` (was `Map<string, any>`)
- `Container.register<T>(token: string, service: T): void` — keep
- `Container.resolve<T>(token: string): T` — keep signature; internals use `dynamic` cast
- `class Application` — no changes needed
- Remove `implements Logger`, `implements Storage`, `implements UserService` keywords throughout — structural typing, no keyword needed

---

### patterns/middleware.sjs (REWRITE)

**Changes:**
- `body: dynamic` in `Request` and `Response` interfaces (was `any`)
- Keep all middleware function implementations unchanged

---

### patterns/builder.sjs (AUDIT on Sprint D)

Read the file; apply standard fixes (likely `any` → `dynamic` if present).

---

### patterns/functional.sjs (AUDIT on Sprint D)

Read the file; apply standard fixes. Likely uses function composition — watch for `Function` type (banned) → `(a: A) => B`.

---

### jsx/fragments-and-composition.sjs (REWRITE)

**Changes:**
- `children?: any` → `children?: dynamic` in `CardProps` and `TabPanelProps`
- No other violations visible

---

### jsx/todo-list.sjs (REWRITE)

**Changes:**
- `e.target as HTMLInputElement` → use `dynamic`: `(e.target as dynamic).value` or restructure to avoid cast
- Preferred SJS approach: `const input: dynamic = e.target; input.value`

---

### jsx/src/App.sjs, jsx/src/components/*.sjs, jsx/src/hooks/useMarkdown.sjs, jsx/src/types.sjs (AUDIT Sprint D)

Read each file; apply standard `any` → `dynamic` and `T | null` → `T?` fixes.

---

### modules/collections.sjs (NEW — Sprint D)

**Concept:** Generic exports, named and default exports.

**Export:**
- `export class Stack<T>` — push, pop (`T?`), peek (`T?`), size, isEmpty
- `export class Queue<T>` — enqueue, dequeue (`T?`), peek (`T?`), size
- `export type Collection<T>` — interface with size, isEmpty, toArray
- `export function fromArray<T>(arr: T[]): Stack<T>` — factory

**Must demonstrate:** named exports, generic class export, importing in sibling file.

---

### modules/http.sjs (NEW — Sprint D)

**Concept:** Async module, re-exports, module-level constants.

**Export:**
- `type Result<T, E> = Ok(T) | Err(E)`
- `type HttpError = NetworkError(string) | NotFound | Timeout`
- `export async function get<T>(url: string): Promise<Result<T, HttpError>>`
- `export async function post<T>(url: string, body: dynamic): Promise<Result<T, HttpError>>`
- `export const DEFAULT_TIMEOUT = 5000`

---

### basics/classes.sjs (REWRITE)

**Changes:**
- `pop(): T?` on any stack-like method (if present)
- Remove `private` on fields that use TypeScript-style `private` keyword — SJS supports `private`, keep it
- `abstract` keyword — keep (SJS supports `abstract`)
- `implements Shape` → remove keyword (structural)
- All `| undefined` → `?`

**Keep:** `Shape` interface, `BaseShape` abstract class, `Circle`, `Rectangle` implementations, static factory method, demo block.

---

### basics/types.sjs (REWRITE)

**Changes:**
- Remove `type Optional<T> = T | null | undefined` — this teaches the wrong pattern
- Replace with `type MaybeUser = User?` usage inline
- `email: Optional<string>` → `email: string?`
- `updateEmail(user: User, email?: string): void` — SJS optional param syntax is `email: string?`, not `email?:` (check spec); align to spec
- `Status = 'active' | 'inactive' | 'pending'` → `type Status = Active | Inactive | Pending` (sum type)
- Update `updateStatus` to take `Status` and use match or direct assignment

---

### gradual-typing/plain-js.sjs and gradual-typing/mixed.sjs (AUDIT — Keep)

These files intentionally demonstrate untyped / partially-typed code. They are pedagogically correct as-is. Audit only to ensure no accidentally banned syntax sneaked in. Keep the intentional lack of annotations.

---

### node/src/formatter.sjs, node/src/fs-utils.sjs, node/src/main.sjs (AUDIT)

Read each file on Sprint C/D start. `analyzer.sjs` is already correct. The others likely follow the same pattern. Apply standard fixes if found.

---

### web/src/app.sjs, web/src/storage.sjs, web/src/utils.sjs (AUDIT Sprint D)

Read each file; apply standard fixes. The web example is a browser todo app — watch for DOM type casts using `as`.

---

### README.md (UPDATE — Sprint D)

Update the examples index to:
- List all directories with one-line descriptions
- Call out `null-safety/`, `sum-types/`, `real-world/` as the best starting points for new users
- Add a "key SJS idioms demonstrated" section linking each idiom to the canonical example file
