# ECMAScript Features Implementation Plan
Branch: 002-ecmascript-features
Worktree: .worktrees/002-ecmascript-features
Started: 2026-06-03

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Phase 1 — Foundation (P0 features, blocks everything else)

### Task 1.1: Generic Type Parameter Resolution
**Files**: `prototype/src/typeChecker/types.ts`, `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] Add `TypeParam` node to SjsType union
- [x] Add `typeParams: string[]` to FunctionType and ObjectType
- [x] Implement `instantiate(type, bindings: Map<string, SjsType>)` substitution
- [x] Bind type params at call site (CallExpression handler)
- [x] Bind type params at variable declaration with explicit generic syntax
- [x] Test: `identity<T>`, `Array<T>`, `Promise<T>` resolve correctly
- [x] Write examples: `specs/002-ecmascript-features/examples/generics.sjs`

### Task 1.2: Async/Await Type Inference
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] Detect `async` modifier on FunctionDeclaration/ArrowFunction
- [x] Wrap inferred return type in `Promise<T>` if not already
- [x] Handle `AwaitExpression`: unwrap `Promise<T>` → `T`
- [x] Error SJS-E009 if `await` used outside async function
- [x] Test: async functions infer `Promise<T>`, await unwraps
- [x] Write examples: `specs/002-ecmascript-features/examples/async-types.sjs`

### Task 1.3: Destructuring Type Annotations
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [ ]
- [ ] Handle `ObjectPattern` in variable declarator with type annotation
- [ ] Extract per-binding type from declared object type
- [ ] Handle `ArrayPattern` with tuple/array type annotation
- [ ] Handle rest patterns `...rest` with remainder type
- [ ] Handle nested destructuring
- [ ] Write examples: `specs/002-ecmascript-features/examples/destructuring-types.sjs`

### Task 1.4: Object Spread Type Merging
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [ ]
- [ ] In ObjectExpression handler, detect `SpreadElement`
- [ ] Merge properties from spread source type into result
- [ ] Later spread properties override earlier ones
- [ ] Handle rest in destructuring: remainder is `Omit<T, Keys>`
- [ ] Write examples: `specs/002-ecmascript-features/examples/spread-types.sjs`

### Task 1.5: Type Narrowing (typeof / instanceof / null checks)
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [ ]
- [ ] Add narrowed type environment inside if/else branches
- [ ] Implement `typeof x === "string"` narrowing
- [ ] Implement `x instanceof Foo` narrowing
- [ ] Implement `x !== null` and `x != null` null narrowing
- [ ] Implement `"prop" in x` narrowing
- [ ] Narrowing applies to `?.` optional chain checks
- [ ] Write examples: `specs/002-ecmascript-features/examples/type-narrowing.sjs`

---

## Phase 2 — Common Patterns (P1 features)

### Task 2.1: Iterator / AsyncIterator Protocol
**Files**: `prototype/src/typeChecker/types.ts`, `prototype/src/typeChecker/index.ts`
**Status**: [ ]
- [ ] Define `IteratorType<Y,R,N>` and `IterableType<T>` in types.ts
- [ ] Define `AsyncIteratorType<Y,R,N>` and `AsyncIterableType<T>`
- [ ] Validate `Symbol.iterator` protocol on objects used in `for...of`
- [ ] Validate `Symbol.asyncIterator` for `for-await-of`
- [ ] Generator return type: `Generator<Y,R,N>`
- [ ] Async generator return type: `AsyncGenerator<Y,R,N>`
- [ ] Write examples: `specs/002-ecmascript-features/examples/iterators.sjs`

### Task 2.2: WeakRef<T> and FinalizationRegistry<T>
**Files**: `prototype/src/typeChecker/types.ts`, `prototype/src/typeChecker/index.ts`
**Status**: [ ]
- [ ] Add `WeakRefType<T>` to stdlib type env
- [ ] `.deref(): T | undefined` method
- [ ] Add `FinalizationRegistryType<T>` to stdlib type env
- [ ] `.register(target: object, value: T, token?: object): void`
- [ ] `.unregister(token: object): boolean`
- [ ] Constraint: T in WeakRef must extend object
- [ ] Write examples: `specs/002-ecmascript-features/examples/weak-refs.sjs`

### Task 2.3: BigInt Mixing Enforcement (SJS-E004)
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [ ]
- [ ] In BinaryExpression handler, check both operand types
- [ ] Error SJS-E004 when mixing `bigint` and `number`
- [ ] Allow `bigint op bigint` (all arithmetic operators)
- [ ] Allow `number op number`
- [ ] Reject `bigint op number` and `number op bigint`
- [ ] Write examples: `specs/002-ecmascript-features/examples/bigint-safety.sjs`

### Task 2.4: Promise.withResolvers<T>
**Files**: `prototype/src/typeChecker/index.ts` (stdlib types)
**Status**: [ ]
- [ ] Add to stdlib type env: `Promise.withResolvers<T>(): { promise: Promise<T>, resolve: (v: T) => void, reject: (r: unknown) => void }`
- [ ] Infer T from usage context
- [ ] Write examples: `specs/002-ecmascript-features/examples/promise-resolvers.sjs`

### Task 2.5: Object.groupBy and Map.groupBy
**Files**: `prototype/src/typeChecker/index.ts` (stdlib types)
**Status**: [ ]
- [ ] `Object.groupBy<K extends PropertyKey, T>(items: Iterable<T>, fn: (x:T)=>K): Partial<Record<K,T[]>>`
- [ ] `Map.groupBy<K, T>(items: Iterable<T>, fn: (x:T)=>K): Map<K,T[]>`
- [ ] Write examples: `specs/002-ecmascript-features/examples/groupby.sjs`

---

## Phase 3 — Modern Stdlib (P2 features)

### Task 3.1: Array.prototype.at() Return Type
- [ ] `at(index: number): T | undefined` (not just `T`)

### Task 3.2: Object.hasOwn() Narrowing
- [ ] `Object.hasOwn(obj: T, key: string): key is keyof T`

### Task 3.3: Error.cause Typing
- [ ] `new Error(message: string, options?: { cause?: unknown })`

### Task 3.4: Symbol as WeakMap/WeakSet Keys
- [ ] `WeakMap<K extends object | symbol, V>` (ES2023+)
- [ ] `WeakSet<T extends object | symbol>`

### Task 3.5: RegExp Named Capture Groups
- [ ] `exec()` and `match()` return `.groups: { [name: string]: string | undefined }`

### Task 3.6: SharedArrayBuffer and Atomics
- [ ] Basic type stubs for SharedArrayBuffer
- [ ] Atomics method signatures

---

## Phase 4 — ES2025 (P3 features)

### Task 4.1: Iterator Helpers Protocol
- [ ] `Iterator<T>` built-in with all helper methods typed
- [ ] `Iterator.from(iterable: Iterable<T>): Iterator<T>`

### Task 4.2: Set Methods
- [ ] All 7 new methods on `Set<T>` typed

### Task 4.3: Promise.try<T>
- [ ] `Promise.try<T>(fn: () => T | PromiseLike<T>): Promise<T>`

### Task 4.4: Error.isError() Type Guard
- [ ] `Error.isError(value: unknown): value is Error`

### Task 4.5: Float16Array
- [ ] Add as TypedArray variant

### Task 4.6: Math.sumPrecise
- [ ] `Math.sumPrecise(values: Iterable<number>): number`

---

## Progress Tracking

Each completed task must:
1. Update status above: `[x]`
2. Add passing tests in `prototype/tests/`
3. Add SJS example in `specs/002-ecmascript-features/examples/`
4. Commit to `002-ecmascript-features` branch
5. Update `specs/002-ecmascript-features/gap-analysis.md` classification

## Checkpoint Protocol (for long-running sessions)

After each phase completes:
```bash
cd /Users/hbarve1/codes/github/hbarve1/super-js/.worktrees/002-ecmascript-features
git add -A && git commit -m "feat(ecmascript): phase N complete - <summary>"
```

Then update KG:
- `kg_patch` `super-js.md` Recent Activity
- `kg_task_update` task 002-ecmascript-features
