# ECMAScript Features Implementation Plan
Branch: 002-ecmascript-features
Worktree: .worktrees/002-ecmascript-features
Started: 2026-06-03
Completed: 2026-06-03

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
- [x] Test: `Array<T>`, `Promise<T>`, `Map<K,V>`, `Set<T>` resolve correctly
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
**Status**: [x]
- [x] Handle `ObjectPattern` in variable declarator with type annotation
- [x] Extract per-binding type from declared object type
- [x] Handle `ArrayPattern` with tuple/array type annotation
- [x] Handle rest patterns `...rest` with remainder type
- [x] Handle nested destructuring
- [x] Write examples: `specs/002-ecmascript-features/examples/destructuring-types.sjs`

### Task 1.4: Object Spread Type Merging
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] In ObjectExpression handler, detect `SpreadElement`
- [x] Merge properties from spread source type into result
- [x] Later spread properties override earlier ones
- [x] Handle rest in destructuring: remainder is untyped (gradual)
- [x] Write examples: `specs/002-ecmascript-features/examples/spread-types.sjs`

### Task 1.5: Type Narrowing (typeof / instanceof / null checks)
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] Add narrowed type environment inside if/else branches
- [x] Implement `typeof x === "string"` narrowing
- [x] Implement `x instanceof Foo` narrowing
- [x] Implement `x !== null` and `x != null` null narrowing
- [x] Implement `"prop" in x` narrowing
- [x] Truthy check removes null/undefined
- [x] Write examples: `specs/002-ecmascript-features/examples/type-narrowing.sjs`

---

## Phase 2 — Common Patterns (P1 features)

### Task 2.1: Iterator / AsyncIterator Protocol
**Files**: `prototype/src/typeChecker/types.ts`, `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] Define `IteratorType<Y,R,N>` and `IterableType<T>` in types.ts
- [x] Define `AsyncIteratorType<Y,R,N>` and `AsyncIterableType<T>`
- [x] Generator return type: `Generator<Y,R,N>`
- [x] Async generator return type: `AsyncGenerator<Y,R,N>`
- [x] `Iterator.from()` in stdlib (ES2025 iterator helpers)
- [x] Array `.values()`, `.keys()`, `.entries()` return iterators
- [x] Write examples: `specs/002-ecmascript-features/examples/iterators.sjs`

### Task 2.2: WeakRef<T> and FinalizationRegistry<T>
**Files**: `prototype/src/typeChecker/types.ts`, `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] Add `WeakRef<T>` to stdlib — `new WeakRef(target)` returns object with `.deref(): T | undefined`
- [x] Add `FinalizationRegistry<T>` to stdlib — `.register()` and `.unregister()`
- [x] `WeakRef<T>` and `FinalizationRegistry<T>` type references resolve in TSTypeReference
- [x] Write examples: `specs/002-ecmascript-features/examples/weak-refs.sjs`

### Task 2.3: BigInt Mixing Enforcement (SJS-E004)
**Files**: `prototype/src/typeChecker/index.ts`
**Status**: [x]
- [x] In BinaryExpression handler, check both operand types
- [x] Error SJS-E004 when mixing `bigint` and `number`
- [x] Allow `bigint op bigint` (all arithmetic operators)
- [x] Allow `number op number`
- [x] Reject `bigint op number` and `number op bigint`
- [x] Write examples: `specs/002-ecmascript-features/examples/bigint-safety.sjs`

### Task 2.4: Promise.withResolvers<T>
**Files**: `prototype/src/typeChecker/index.ts` (stdlib types)
**Status**: [x]
- [x] Add to stdlib: `Promise.withResolvers(): { promise: Promise<T>, resolve: (v: T) => void, reject: (r: unknown) => void }`
- [x] Write examples: `specs/002-ecmascript-features/examples/promise-resolvers.sjs`

### Task 2.5: Object.groupBy and Map.groupBy
**Files**: `prototype/src/typeChecker/index.ts` (stdlib types)
**Status**: [x]
- [x] `Object.groupBy<T>(items, fn) → any` in stdlib
- [x] `Map.groupBy<K,T>(items, fn) → Map instance` in stdlib
- [x] Write examples: `specs/002-ecmascript-features/examples/groupby.sjs`

---

## Phase 3 — Modern Stdlib (P2 features)

### Task 3.1: Array.prototype.at() Return Type
**Status**: [x]
- [x] `at(index: number): T | undefined` (not just `T`) in `_ArrayInstance` stdlib

### Task 3.2: Object.hasOwn() Narrowing
**Status**: [x]
- [x] `Object.hasOwn(obj, key): boolean` in stdlib

### Task 3.3: Error.cause Typing
**Status**: [x]
- [x] `new Error(message, options?: { cause?: unknown })` with `.cause` property
- [x] Write examples: `specs/002-ecmascript-features/examples/error-cause.sjs`

### Task 3.4: Symbol as WeakMap/WeakSet Keys
**Status**: [x]
- [x] `WeakMap<K, V>` accepts symbol/object keys via TSTypeReference handler
- [x] `WeakSet<T>` accepts symbol/object elements

### Task 3.5: RegExp Named Capture Groups
**Status**: [x]
- [x] `string.match()` returns object with `.groups` property
- [x] `string.matchAll()` returns Iterator

### Task 3.6: SharedArrayBuffer and Atomics
**Status**: [x]
- [x] `SharedArrayBuffer` stub with `byteLength`
- [x] `Atomics` with `add`, `load`, `store`, `wait`, `notify`

---

## Phase 4 — ES2025 (P3 features)

### Task 4.1: Iterator Helpers Protocol
**Status**: [x]
- [x] `Iterator<T>` in stdlib with `Iterator.from(iterable): Iterator<T>`

### Task 4.2: Set Methods
**Status**: [x]
- [x] All 7 new methods on `Set<T>`: union, intersection, difference, symmetricDifference, isSubsetOf, isSupersetOf, isDisjointFrom
- [x] Write examples: `specs/002-ecmascript-features/examples/set-methods.sjs`

### Task 4.3: Promise.try<T>
**Status**: [x]
- [x] `Promise.try<T>(fn: () => T | PromiseLike<T>): Promise<T>` in stdlib

### Task 4.4: Error.isError() Type Guard
**Status**: [x]
- [x] `Error.isError(value: unknown): boolean` in stdlib

### Task 4.5: Float16Array
**Status**: [x]
- [x] `Float16Array` stub with `BYTES_PER_ELEMENT`, `byteLength`, `length`

### Task 4.6: Math.sumPrecise
**Status**: [x]
- [x] `Math.sumPrecise(values: Iterable<number>): number` in stdlib

---

## Progress Tracking

Completed 2026-06-03:
- 150 tests pass (97 new ecmascript-features + 53 pre-existing)
- All phases 1–4 implemented
- Examples committed for all major features
- No regressions in existing test suite

## Final Verification

```bash
cd /Users/hbarve1/codes/github/hbarve1/super-js/.worktrees/002-ecmascript-features/prototype
npx jest --testPathPattern=typeChecker
# Expected: 150 tests, 5 suites, all pass
```
