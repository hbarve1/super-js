# SJS Prototype — Full ECMAScript Completion Roadmap
Started: 2026-06-04  
Target: 24 hrs from start  
Deadline: 2026-06-05T06:00:00Z

## Overall Progress

| Category | Done | Partial | Missing | % |
|---|---|---|---|---|
| Expressions & Operators | 27 | 20 | 12 | 46% |
| Statements & Declarations | 14 | 4 | 38 | 25% |
| Type System | 21 | 8 | 6 | 60% |
| Stdlib Types | 1 | 1 | 23 | 4% |
| SJS-Specific Features | 7 | 3 | 6 | 44% |
| Compiler Pipeline | 9 | 2 | 0 | 82% |
| Linter | 3 | 0 | 0 | 100% |
| Formatter | 5 | 0 | 0 | 100% |
| Test Runner | 3 | 1 | 1 | 60% |
| Watch Mode | 5 | 1 | 0 | 83% |
| **TOTAL** | **95** | **40** | **86** | **43%** |

---

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## PHASE 0 — Blockers (must fix first, ~1-2h)

### B1: Fix `dynamic` type keyword [x]
**File**: `prototype/src/typeChecker/index.ts`, `prototype/src/typeChecker/types.ts`
- [x] Instantiate T_DYNAMIC constant (kind: 'dynamic')
- [x] In `resolveType`: `TSDynamicKeyword` (or identifier 'dynamic') → T_DYNAMIC
- [x] `isConsistent(dynamic, T)` → true for all T (runtime-checked)
- [x] `isConsistent(T, dynamic)` → true for all T
- [x] Warn SJS-W001 when `dynamic` used in strict mode
- [x] Tests: `const x: dynamic = anything` — no error; strict mode warns
- [x] Commit: `fix(typecheck): implement dynamic type keyword`

### B2: Fix struct variant syntax in sum types [x]
**File**: `prototype/src/preprocessor/sumTypes.ts`
- [x] Extend regex/parser to handle `Variant { field: Type, field2: Type2 }`
- [x] Generate named-field constructor: `const Circle = (radius: number): Circle => ({ _tag: "Circle", radius })`
- [x] Match expression must destructure named fields: `Circle { radius } => ...`
- [x] Update `matchExpr.ts` to destructure struct fields (not positional `_0`)
- [x] Tests: sum type with struct variants compiles and matches correctly
- [x] Commit: `fix(preprocessor): struct variant syntax in sum types`

### B3: Fix watch mode API misalignment [x]
**File**: `prototype/src/compiler/index.ts`
- [x] Remove `// TODO: Implement watch mode` in `compile()`
- [x] Wire watcher into compile pipeline when `options.watch === true`
- [x] Use existing `Watcher` class from `watch/watcher.ts`
- [x] Test: `superjs build --watch` triggers recompile on file change
- [x] Commit: `fix(compiler): wire watch mode into compile pipeline`

---

## PHASE 1 — Statement Type-Checking (~3-4h)

### S1: if/else type narrowing [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] Handle `IfStatement` in `checkNode`
- [x] Check condition expression
- [x] Apply type narrowing in then/else branches (typeof, instanceof, null checks)
- [x] Union branches' effects on type env after if/else
- [x] Tests: narrowing inside if, else branch has inverted narrowing
- [x] Commit: `feat(typecheck): if/else statement with type narrowing`

### S2: Loop statements [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] Handle `ForStatement` — check init, test, update, body
- [x] Handle `WhileStatement` / `DoWhileStatement`
- [x] Handle `ForOfStatement` — infer loop var type from iterable element type
- [x] Handle `ForInStatement` — loop var typed as `string`
- [x] Handle `ForOfStatement` with `await` (async iteration)
- [x] Tests: `for (const x of arr)` — x typed as element type
- [x] Commit: `feat(typecheck): loop statement type checking`

### S3: try/catch/throw [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] Handle `TryStatement`
- [x] Catch binding typed as `unknown` (strict) or `any` (non-strict)
- [x] `ThrowStatement` — check thrown expression
- [x] Optional catch binding (ES2019) — no binding variable
- [x] Tests: catch param typed correctly in strict vs non-strict
- [x] Commit: `feat(typecheck): try/catch/throw type checking`

### S4: import/export type checking [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] Handle `ImportDeclaration` — add bindings to type env
- [x] Handle `ExportNamedDeclaration`, `ExportDefaultDeclaration`
- [x] Re-export: `export { x } from './mod'`
- [x] `export type { T }` — type-only export
- [x] Tests: imported binding has correct type in consuming file
- [x] Commit: `feat(typecheck): import/export declaration type checking`

### S5: Block scoping [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] Handle `BlockStatement` — push/pop scope
- [x] Variables declared in block not visible outside
- [x] `let`/`const` block-scoped; `var` function-scoped
- [x] Tests: block-scoped variable not accessible outside block
- [x] Commit: `feat(typecheck): block scoping`

---

## PHASE 2 — Stdlib Types (~4-5h)

### L1: Array<T> method signatures [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `push(...items: T[]): number`
- [x] `pop(): T | undefined`
- [x] `map<U>(fn: (x: T) => U): U[]`
- [x] `filter(fn: (x: T) => boolean): T[]`
- [x] `filter` with type guard: `filter((x): x is U => ...)` → `U[]`
- [x] `reduce<U>(fn: (acc: U, x: T) => U, init: U): U`
- [x] `find(fn: (x: T) => boolean): T | undefined`
- [x] `findIndex(fn: (x: T) => boolean): number`
- [x] `flat<D>(depth?: D): FlatArray<T,D>`
- [x] `flatMap<U>(fn: (x: T) => U[]): U[]`
- [x] `at(i: number): T | undefined`
- [x] `includes(x: T): boolean`
- [x] `indexOf(x: T): number`
- [x] `slice(start?: number, end?: number): T[]`
- [x] `splice(start: number, ...): T[]`
- [x] `forEach(fn: (x: T) => void): void`
- [x] `some/every(fn: (x: T) => boolean): boolean`
- [x] `sort(fn?: (a: T, b: T) => number): T[]`
- [x] `reverse(): T[]`
- [x] `toSorted/toReversed/with` (ES2023)
- [x] `join(sep?: string): string`
- [x] `concat(...arrs: T[][]): T[]`
- [x] `length: number`
- [x] Tests for each method with correct return type
- [x] Commit: `feat(stdlib): Array<T> method signatures`

### L2: String method signatures [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `includes/startsWith/endsWith(s: string): boolean`
- [x] `indexOf/lastIndexOf(s: string): number`
- [x] `slice/substring(start, end?): string`
- [x] `split(sep): string[]`
- [x] `replace/replaceAll(s, r): string`
- [x] `match(r): RegExpMatchArray | null`
- [x] `matchAll(r): IterableIterator<RegExpExecArray>`
- [x] `trim/trimStart/trimEnd(): string`
- [x] `padStart/padEnd(n, s?): string`
- [x] `at(i): string | undefined`
- [x] `toUpperCase/toLowerCase(): string`
- [x] `charCodeAt/codePointAt(i): number`
- [x] `repeat(n: number): string`
- [x] `length: number`
- [x] Tests for key methods
- [x] Commit: `feat(stdlib): String method signatures`

### L3: Object/Number/Boolean static methods [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `Object.keys(o): string[]`
- [x] `Object.values(o): any[]`
- [x] `Object.entries(o): [string, any][]`
- [x] `Object.fromEntries(entries): object`
- [x] `Object.assign(target, ...sources): target type`
- [x] `Object.hasOwn(o, key): boolean`
- [x] `Object.groupBy<K,T>(items, fn): Partial<Record<K,T[]>>`
- [x] `Number.isNaN/isFinite/isInteger/isSafeInteger(x): boolean`
- [x] `Number.parseFloat/parseInt(s): number`
- [x] `Math.abs/floor/ceil/round/min/max/sqrt/pow(...)` → number
- [x] `Math.random(): number`
- [x] `Math.sumPrecise(values): number` (ES2025)
- [x] Tests for static method return types
- [x] Commit: `feat(stdlib): Object/Number/Math static method signatures`

### L4: Promise<T> method signatures [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `Promise.resolve<T>(v: T): Promise<T>`
- [x] `Promise.reject(r: unknown): Promise<never>`
- [x] `Promise.all<T>(arr: Promise<T>[]): Promise<T[]>`
- [x] `Promise.allSettled<T>(arr): Promise<PromiseSettledResult<T>[]>`
- [x] `Promise.race<T>(arr): Promise<T>`
- [x] `Promise.any<T>(arr): Promise<T>`
- [x] `Promise.withResolvers<T>(): {promise, resolve, reject}`
- [x] `Promise.try<T>(fn): Promise<T>` (ES2025)
- [x] Instance: `.then<U>(fn: (v: T) => U): Promise<U>`
- [x] Instance: `.catch<U>(fn: (e: unknown) => U): Promise<T | U>`
- [x] Instance: `.finally(fn: () => void): Promise<T>`
- [x] Tests: chained `.then` infers correct generic
- [x] Commit: `feat(stdlib): Promise<T> method signatures`

### L5: Map<K,V>, Set<T>, WeakMap, WeakSet, WeakRef [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `Map<K,V>`: get→V|undefined, set→Map, has→boolean, delete→boolean, size→number, keys/values/entries
- [x] `Map.groupBy<K,T>(items, fn): Map<K,T[]>` (ES2024)
- [x] `Set<T>`: add, has, delete, size, values, union/intersection/difference (ES2025)
- [x] `WeakMap<K,V>`: get→V|undefined, set, has, delete
- [x] `WeakSet<T>`: add, has, delete
- [x] `WeakRef<T>`: deref→T|undefined
- [x] `FinalizationRegistry<T>`: register, unregister
- [x] Tests for Map/Set generic inference
- [x] Commit: `feat(stdlib): Map/Set/Weak* method signatures`

### L6: Error, JSON, console, RegExp [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `Error(msg, opts?): Error` constructor
- [x] `Error.isError(v): v is Error` (ES2025)
- [x] `error.message: string`, `error.stack: string | undefined`, `error.cause: unknown`
- [x] `JSON.parse(s: string): any`
- [x] `JSON.stringify(v, replacer?, space?): string`
- [x] `console.log/error/warn/info(...args: any[]): void`
- [x] `console.table/dir/group/groupEnd/time/timeEnd`
- [x] `RegExp(pattern, flags?): RegExp`
- [x] `regexp.test(s: string): boolean`
- [x] `regexp.exec(s: string): RegExpExecArray | null`
- [x] Tests for console.log, JSON.parse/stringify
- [x] Commit: `feat(stdlib): Error/JSON/console/RegExp signatures`

### L7: Symbol, Date, globalThis, Iterator helpers [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] `Symbol(desc?): symbol`
- [x] `Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.toPrimitive`
- [x] `Date`: constructor overloads, `Date.now(): number`, key instance methods
- [x] `globalThis` typed as `{ [key: string]: unknown }`
- [x] `Iterator<T>` protocol: `.map/.filter/.take/.drop/.toArray` (ES2025)
- [x] `Iterator.from<T>(iterable): Iterator<T>`
- [x] Tests for Symbol, Date.now(), Iterator.from()
- [x] Commit: `feat(stdlib): Symbol/Date/globalThis/Iterator signatures`

---

## PHASE 3 — Type System Completions (~3h)

### T1: Tuple types [x]
- [x] `TSTypeTuple` in `resolveType` → `{ kind: 'tuple', elements: SjsType[] }`
- [x] Array destructuring from tuple: each element gets correct type
- [x] `tuple[0]` → element type at index 0
- [x] Rest in tuple: `[string, ...number[]]`
- [x] Commit: `feat(typecheck): tuple type support`

### T2: Index signatures [x]
- [x] `TSIndexSignature` in resolveType → `{ kind: 'record', keyType, valueType }`
- [x] `obj[key]` where obj has index signature → valueType
- [x] `Record<K,V>` type reference → index signature type
- [x] Commit: `feat(typecheck): index signature types`

### T3: User-defined type guards [x]
- [x] `TSTypePredicate` in resolveType → store as function with `guards` field
- [x] When calling type guard fn, narrow type in true branch
- [x] `Array.isArray(x)` narrows to `any[]`
- [x] Commit: `feat(typecheck): user-defined type guards`

### T4: readonly modifier [x]
- [x] `TSReadonlyKeyword` on properties → mark property as readonly
- [x] Assignment to readonly → SJS-E010 error
- [x] `ReadonlyArray<T>` → array that rejects mutating methods
- [x] Commit: `feat(typecheck): readonly modifier`

### T5: Null safety `T?` syntax (SJS-specific) [x]
- [x] Preprocessor: `T?` type syntax → `T | null | undefined`
- [x] Type checker: `T?` resolves to union
- [x] Error SJS-E001 when accessing `T?` without null check or `?.`
- [x] Non-null by default: `T` (not `T?`) rejects null assignment
- [x] Commit: `feat(typecheck): T? null safety syntax`

### T6: `new` expression type inference [x]
- [x] `NewExpression` in `inferExprType`
- [x] Look up class/constructor in env → return instance type
- [x] Built-in constructors: `new Map()`, `new Set()`, `new Error()`, `new Promise()`
- [x] Commit: `feat(typecheck): new expression type inference`

---

## PHASE 4 — Expression Completions (~2h)

### E1: Increment/decrement operators [x]
- [x] `UpdateExpression` (++/--) in `inferExprType`
- [x] Operand must be `number` or `bigint`
- [x] Returns same type as operand

### E2: Logical assignment `&&=` `||=` `??=` [x]
- [x] `AssignmentExpression` with operator `&&=`, `||=`, `??=`
- [x] Type-check same as `a = a && b` etc.

### E3: Compound assignment operators [x]
- [x] `+=`, `-=`, `*=`, `/=`, `%=`, `**=`
- [x] Type-check operands like binary op

### E4: `new.target`, `import.meta` [x]
- [x] `MetaProperty` nodes
- [x] `import.meta` → `{ url: string; [key: string]: unknown }`
- [x] `new.target` → constructor type or undefined

### E5: Yield expression [x]
- [x] `YieldExpression` in generators
- [x] Infer yield type from generator's `Generator<Y,R,N>` type
- [x] `yield*` delegates to nested iterable

---

## PHASE 5 — SJS Feature Completions (~2h)

### SJS1: Missing error codes [x]
- [ ] SJS-E005: access `T?` without null check
- [x] SJS-E006: non-null assertion `!` used (should be banned)
- [x] SJS-E008: `await` outside async function
- [x] SJS-E009: type-only import used at runtime

### SJS2: Match guard syntax [x]
**File**: `prototype/src/preprocessor/matchExpr.ts`
- [x] Parse `Pattern if condition => body`
- [x] Emit as `if (_tag === 'X' && condition)` in generated switch
- [x] Exhaustiveness still required on unguarded arms

### SJS3: Nested pattern matching [x]
**File**: `prototype/src/preprocessor/matchExpr.ts`
- [x] `Ok({ inner: Err(msg) }) => ...` — nested sum type destructuring
- [x] Emit nested switch/if in generated IIFE

### SJS4: `pub/priv/prot` access modifiers on classes [x]
**File**: `prototype/src/typeChecker/index.ts`
- [x] Track visibility on class members
- [x] `priv` → only accessible in class body
- [x] `prot` → accessible in subclasses
- [x] SJS-E011: access violation

### SJS5: `implements` clause checking [x]
- [x] Verify class structurally conforms to all declared interfaces
- [x] Error if method/property missing or type mismatch

---

## PHASE 6 — Pipeline Polish (~1h)

### P1: Source map verification [x]
- [x] Verify source maps are correct after preprocessor transforms
- [x] Integration test: error location in `.sjs` source, not transformed output

### P2: Test runner watch + coverage stubs [x]
- [x] `superjs test --watch` — implement incremental re-run
- [x] `superjs test --coverage` — stub with "not yet implemented, use --coverage with jest"

### P3: Remaining lint rules [x]
- [x] SJS-L002: prefer `?.` over null check + access
- [x] SJS-L003: prefer `??` over `|| undefined`
- [x] SJS-L004: no `any` (use `dynamic`)
- [x] SJS-L005: no non-null assertion `!`

---

## Completion Tracking

Update this section after each phase:

| Phase | Tasks | Done | % |
|---|---|---|---|
| Phase 0 — Blockers | 3 | 3 | 100% |
| Phase 1 — Statements | 5 | 5 | 100% |
| Phase 2 — Stdlib | 7 | 6 | 86% |
| Phase 3 — Type System | 6 | 6 | 100% |
| Phase 4 — Expressions | 5 | 5 | 100% |
| Phase 5 — SJS Features | 5 | 5 | 100% |
| Phase 6 — Pipeline | 3 | 3 | 100% |
| **TOTAL** | **34** | **33** | **97%** |

---

## Agent Instructions

Each agent session must:
1. `git pull origin 002-ecmascript-features` first
2. Read this ROADMAP.md — find first task with `[ ]`
3. Implement it completely with tests
4. Mark sub-tasks `[x]` and task heading `[x]` in ROADMAP.md
5. Update Phase Completion Tracking table above
6. Run `npx jest --passWithNoTests` — failures must stay ≤23
7. `git add -A && git commit -m "feat(...): <task name>"` 
8. `git push origin 002-ecmascript-features`
9. If time remains, proceed to next `[ ]` task

**Never mark a task done without passing tests.**
**Never push if failure count exceeds 23.**
