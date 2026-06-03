# ECMAScript Feature Gap Analysis for SJS Prototype
Generated: 2026-06-03

## Summary

| Category | Supported | Partial | Missing |
|----------|-----------|---------|---------|
| ES5 | 12 | 0 | 0 |
| ES2015 | 8 | 7 | 3 |
| ES2016 | 2 | 0 | 0 |
| ES2017 | 6 | 0 | 2 |
| ES2018 | 4 | 5 | 0 |
| ES2019 | 6 | 1 | 0 |
| ES2020 | 6 | 4 | 0 |
| ES2021 | 5 | 0 | 2 |
| ES2022 | 6 | 3 | 0 |
| ES2023 | 8 | 2 | 1 |
| ES2024 | 0 | 2 | 6 |
| ES2025 | 0 | 0 | 10 |
| **TOTAL** | **63** | **24** | **24** |

---

## Implementation Priority

### P0 — Critical (blocks type safety)

| Feature | Gap | Version |
|---------|-----|---------|
| Generic type parameter resolution | Parser recognizes `<T>` but checker never binds/substitutes | ES2015 |
| Async/await return type inference | `async fn(): Promise<T>` not unwrapped | ES2017 |
| Destructuring type annotations | `const { a }: { a: number } = x` not checked | ES2015 |
| Object spread type merging | `{ ...a, ...b }` result type not computed | ES2018 |
| Type narrowing (typeof/instanceof) | No conditional type refinement | ES2015 |

### P1 — High (common patterns)

| Feature | Gap | Version |
|---------|-----|---------|
| Iterator/AsyncIterator protocol | `Symbol.iterator` protocol not validated | ES2015/ES2018 |
| Generator types | `Generator<Y,R,N>` not checked | ES2015 |
| Async generator types | `AsyncGenerator<T,R,N>` not enforced | ES2018 |
| BigInt mixing enforcement | `bigint + number` not rejected (SJS-E004) | ES2020 |
| WeakRef<T> | No type coverage | ES2021 |
| FinalizationRegistry<T> | No type coverage | ES2021 |
| Promise.withResolvers<T> | No `{promise,resolve,reject}` inference | ES2024 |
| Object.groupBy / Map.groupBy | No `Partial<Record<K,T[]>>` typing | ES2024 |

### P2 — Medium (modern stdlib)

| Feature | Gap | Version |
|---------|-----|---------|
| Array.prototype.at() return type | Should be `T \| undefined` | ES2022 |
| Object.hasOwn() narrowing | No type guard behavior | ES2022 |
| Error.cause typing | `{ cause?: unknown }` option not checked | ES2022 |
| Symbol as WeakMap/WeakSet keys | Key constraint not validated | ES2023 |
| RegExp named capture groups | `.groups` property not typed | ES2018 |
| SharedArrayBuffer | No type coverage | ES2017 |
| Atomics | No type coverage | ES2017 |

### P3 — Low (ES2025 / bleeding edge)

| Feature | Gap | Version |
|---------|-----|---------|
| Iterator Helpers (`Iterator<T>` protocol) | No inference for chained `.map/.filter/.take` | ES2025 |
| Set methods (union/intersection/difference) | All 7 new Set methods untyped | ES2025 |
| Promise.try() | No `Promise<T>` inference | ES2025 |
| Error.isError() type guard | Cannot narrow `unknown` to `Error` | ES2025 |
| Float16Array | Not recognized as TypedArray variant | ES2025 |
| Math.sumPrecise() | Not recognized | ES2025 |
| RegExp /v flag (Unicode sets) | Set notation not validated | ES2024 |
| ArrayBuffer.resize/transfer | No detached-buffer safety | ES2024 |
| String.isWellFormed/toWellFormed | No WellFormedString brand type | ES2024 |
| for-await-of type checking | Loop var not validated vs AsyncIterable<T> | ES2018 |

---

## Detailed Gaps by Feature

### Generic Type Parameters (P0)
**Current**: Parser sees `<T>` syntax, stores as string. Type checker treats all generics as `any`.
**Needed**: Bind type params at call site, substitute through body, check constraints.
**Files to change**: `typeChecker/types.ts`, `typeChecker/index.ts`
**Example**:
```sjs
function identity<T>(x: T): T { return x; }
const n: number = identity<string>("hello"); // SJS-E002: string not assignable to number
```

### Async/Await Type Inference (P0)
**Current**: `async` and `await` pass through Babel without SJS type checking.
**Needed**: Infer `async function f(): Promise<T>` return, unwrap `await expr` to `T`.
**Files to change**: `typeChecker/index.ts`
**Example**:
```sjs
async function fetchUser(): Promise<User> {
  const raw = await fetch("/api/user"); // raw: Response
  return raw.json();                    // must return User
}
```

### Destructuring Type Annotations (P0)
**Current**: Destructuring syntax parsed, bindings added to env but without type from destructured annotation.
**Needed**: Extract per-binding type from object/array type annotation.
**Files to change**: `typeChecker/index.ts`
**Example**:
```sjs
const { name, age }: { name: string; age: number } = getUser();
const [first, ...rest]: [string, ...number[]] = getTuple();
```

### Object Spread Type Merging (P0)
**Current**: Spread in object literals passes through; result typed as `any`.
**Needed**: Merge property types from spread sources, later props override earlier.
**Files to change**: `typeChecker/index.ts`
**Example**:
```sjs
const base = { x: 1, y: 2 };
const point: { x: number; y: number; z: number } = { ...base, z: 3 };
```

### Type Narrowing (P0)
**Current**: No type refinement inside conditionals.
**Needed**: `typeof`, `instanceof`, `in`, null checks narrow union types.
**Files to change**: `typeChecker/index.ts`
**Example**:
```sjs
function process(val: string | number) {
  if (typeof val === "string") {
    val.toUpperCase(); // val: string here
  }
}
```

### WeakRef<T> (P1)
**Current**: Not in type system.
**Needed**: `WeakRef<T extends object>` with `.deref(): T | undefined`.
**Files to change**: `typeChecker/types.ts`, `typeChecker/index.ts`

### FinalizationRegistry<T> (P1)
**Current**: Not in type system.
**Needed**: `FinalizationRegistry<T>` with `.register(target, value)` and `.unregister(token)`.
**Files to change**: `typeChecker/types.ts`, `typeChecker/index.ts`

### BigInt Mixing Enforcement (P1)
**Current**: `bigint` kind recognized in types.ts but `bigint + number` not rejected.
**Needed**: SJS-E004 error when mixing bigint and number in arithmetic.
**Files to change**: `typeChecker/index.ts`
**Example**:
```sjs
const n: number = 1;
const b: bigint = 2n;
const bad = n + b; // SJS-E004: cannot mix number and bigint
```

### Promise.withResolvers<T> (P1)
**Current**: Not type-checked.
**Needed**: Returns `{ promise: Promise<T>, resolve: (v: T) => void, reject: (r: unknown) => void }`.
**Files to change**: `typeChecker/index.ts` (stdlib type env)

### Iterator Helpers (P3)
**Current**: No `Iterator<T>` protocol in type system.
**Needed**: `Iterator<T>` with `.map<U>`, `.filter`, `.take`, `.drop`, `.flatMap<U>`, `.toArray`, `.forEach`, `.some`, `.every`, `.find`, `.reduce`.
**Files to change**: `typeChecker/types.ts`, `typeChecker/index.ts`

### Set Methods ES2025 (P3)
**Current**: `Set<T>` typed as basic collection, 7 new methods not present.
**Needed**: `.union`, `.intersection`, `.difference`, `.symmetricDifference`, `.isSubsetOf`, `.isSupersetOf`, `.isDisjointFrom` all typed.
**Files to change**: `typeChecker/index.ts` (stdlib type env)

---

## Implementation Plan

See `specs/002-ecmascript-features/implementation-plan.md` for phased task breakdown.
