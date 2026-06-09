# ES2017 Highlights — Super.js Reference

**Edition**: ES8 / ES2017
**Versioned spec**: https://262.ecma-international.org/8.0/
**Living spec**: https://tc39.es/ecma262/

---

## Overview

ES2017 introduced the two most transformative features in modern JavaScript
development: `async`/`await` for readable asynchronous code, and
`Object.entries`/`Object.values` for ergonomic object iteration. Shared memory
primitives (`SharedArrayBuffer`, `Atomics`) and string padding round out the
release. Super.js gives all of these features first-class type support.

---

## 1. async / await  §15.8

**Living spec**: https://tc39.es/ecma262/#sec-async-function-definitions
**Versioned**: https://262.ecma-international.org/8.0/#sec-async-function-definitions

### What the spec says

An `async function` always returns a `Promise`. The `await` expression
suspends execution of the enclosing async function body and waits for the
operand promise to settle. The spec defines the async function object,
`AsyncFunctionStart`, and `AsyncFunctionResume` in §15.8.

### SJS type rules

- The return type of an `async` function is always `Promise<T>` where `T` is
  the annotated return type. Writing `async function f(): string` is an error
  in strict mode — use `async function f(): Promise<string>`.
- `await` unwraps `Promise<T>` to `T`. The type-checker propagates the inner
  type to the binding site.
- `await` on a non-Promise value is legal (the spec wraps it in
  `Promise.resolve`); SJS infers the type directly without widening to
  `Promise<T>`.
- An `async` function body that throws propagates the rejection; the return
  type remains `Promise<T>` and the throw type is not separately annotated
  (use a try/catch with typed catch variable in strict mode).

### SJS code examples

```sjs
// Basic typed async function
async function fetchUser(id: number): Promise<string> {
  const response: Response = await fetch(`/api/users/${id}`);
  const data: { name: string } = await response.json();
  return data.name;
}

// Async arrow function with inferred Promise wrapper
const delay = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

// Typed Promise chain equivalent — async/await is cleaner
function fetchUserLegacy(id: number): Promise<string> {
  return fetch(`/api/users/${id}`)
    .then((response: Response) => response.json())
    .then((data: { name: string }) => data.name);
}

// Parallel execution — types preserved through Promise.all
async function fetchMultiple(ids: number[]): Promise<string[]> {
  const promises: Promise<string>[] = ids.map(fetchUser);
  return Promise.all(promises);
}

// Error handling — typed catch
async function safeRead(path: string): Promise<string | null> {
  try {
    const content: string = await readFile(path);
    return content;
  } catch (err: Error) {
    console.error(err.message);
    return null;
  }
}

// Async class method
class ApiClient {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    const res: Response = await fetch(this.baseUrl + path);
    return res.json() as Promise<T>;
  }
}
```

### Compiler target notes

| `--target` | Transformation |
|------------|----------------|
| `es5`      | Desugared to generator + state machine (Regenerator-style) |
| `es2015`   | Desugared to `Promise` chains with generator scaffolding |
| `es2017`+  | Pass-through — emitted as-is |

### SJS diagnostics

| Code | Trigger |
|------|---------|
| SJS-E002 | `async function f(): string` — return type must be `Promise<T>` in strict mode |
| SJS-W001 | Unannotated async function in `--strict` mode (implicit `any` on return) |

---

## 2. Object.entries  §20.1.2.5

**Living spec**: https://tc39.es/ecma262/#sec-object.entries
**Versioned**: https://262.ecma-international.org/8.0/#sec-object.entries

### What the spec says

`Object.entries(O)` returns an array of `[key, value]` pairs for each own
enumerable string-keyed property of `O`, in the same order as `for...in`.

### SJS type rules

- For a typed record `{ a: number; b: string }`, `Object.entries` returns
  `[string, number | string][]` — SJS widens the value type to the union of
  all value types in the record.
- In untyped/`any` contexts the return type is `[string, any][]`.

### SJS code examples

```sjs
const config: { host: string; port: number } = { host: "localhost", port: 8080 };

// entries returns [string, string | number][]
for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value}`);
}

// Typed transformation
function mapValues<T, U>(
  obj: { [key: string]: T },
  fn: (v: T) => U
): { [key: string]: U } {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]: [string, T]) => [k, fn(v)])
  );
}
```

---

## 3. Object.values  §20.1.2.22

**Living spec**: https://tc39.es/ecma262/#sec-object.values
**Versioned**: https://262.ecma-international.org/8.0/#sec-object.values

### What the spec says

`Object.values(O)` returns an array of the own enumerable string-keyed property
values of `O`, in the same order as `for...in`.

### SJS type rules

- For a typed record, `Object.values` returns the union of all value types as
  an array: `(number | string)[]` for `{ a: number; b: string }`.
- Prefer `Object.values` over `Object.keys` + bracket access when only values
  are needed — the SJS linter will suggest this with rule `prefer-object-values`.

### SJS code examples

```sjs
const scores: { alice: number; bob: number; carol: number } = {
  alice: 92, bob: 88, carol: 95,
};

const total: number = Object.values(scores).reduce(
  (sum: number, score: number) => sum + score,
  0
);

const avg: number = total / Object.values(scores).length;
```

---

## 4. String Padding  §22.1.3.16 / §22.1.3.15

**Living spec (padStart)**: https://tc39.es/ecma262/#sec-string.prototype.padstart
**Living spec (padEnd)**: https://tc39.es/ecma262/#sec-string.prototype.padend

### What the spec says

`String.prototype.padStart(maxLength, fillString?)` and
`String.prototype.padEnd(maxLength, fillString?)` pad the string with the fill
string (defaulting to `" "`) until the result reaches `maxLength`. If the
string is already at or beyond `maxLength`, no padding is applied.

### SJS type rules

- Both methods accept `(maxLength: number, fillString?: string)` and return
  `string`. SJS enforces these types — passing a non-number `maxLength` is a
  type error.

### SJS code examples

```sjs
const id: number = 42;
const padded: string = String(id).padStart(6, "0"); // "000042"

// Table formatting
function formatRow(label: string, value: string, width: number = 20): string {
  return label.padEnd(width) + value.padStart(10);
}
```

---

## 5. SharedArrayBuffer  §25.1

**Living spec**: https://tc39.es/ecma262/#sec-sharedarraybuffer-objects
**SJS status**: 🔲 Planned

### What the spec says

`SharedArrayBuffer` enables a single memory region to be shared across multiple
`Worker` threads. Unlike `ArrayBuffer`, it cannot be transferred — it is always
shared. Access must be coordinated with `Atomics` to avoid data races.

### SJS notes

`SharedArrayBuffer` is currently out of scope for SJS v1. The type system does
not model shared memory semantics in v1. When support is added, SJS will
require explicit `Atomics` usage for reads/writes to flag unsafe direct access.

---

## 6. Atomics  §25.4

**Living spec**: https://tc39.es/ecma262/#sec-atomics-object
**SJS status**: 🔲 Planned

### What the spec says

The `Atomics` object provides static methods for atomic operations on
`SharedArrayBuffer` typed arrays: `add`, `and`, `compareExchange`, `exchange`,
`load`, `or`, `store`, `sub`, `xor`, `wait`, and `notify`. Atomic operations
execute as indivisible read-modify-write sequences, preventing torn reads.

### SJS notes

Planned for the same milestone as `SharedArrayBuffer`. The SJS type system will
model `Atomics` methods as operating on `SharedArrayBuffer`-backed typed arrays,
not `ArrayBuffer`-backed ones, making the constraint statically checkable.

---

## 7. Object.getOwnPropertyDescriptors  §20.1.2.9

**Living spec**: https://tc39.es/ecma262/#sec-object.getownpropertydescriptors

Returns all own property descriptors of an object, including non-enumerable and
symbol-keyed ones. Primarily used for correct `Object.assign`-based mixins that
preserve getters/setters — a common pattern in library code.

```sjs
const source: object = { get x(): number { return 1; } };
const clone: object = Object.create(
  Object.getPrototypeOf(source),
  Object.getOwnPropertyDescriptors(source)
);
```

---

## Section Quick-Reference

| Feature | ECMA-262 §  | Living URL | SJS Status |
|---------|-------------|------------|------------|
| `async` functions | §15.8 | https://tc39.es/ecma262/#sec-async-function-definitions | ✅ |
| `await` expression | §15.8 | https://tc39.es/ecma262/#sec-async-function-definitions | ✅ |
| `Object.entries` | §20.1.2.5 | https://tc39.es/ecma262/#sec-object.entries | ✅ |
| `Object.values` | §20.1.2.22 | https://tc39.es/ecma262/#sec-object.values | ✅ |
| `String.prototype.padStart` | §22.1.3.16 | https://tc39.es/ecma262/#sec-string.prototype.padstart | ✅ |
| `String.prototype.padEnd` | §22.1.3.15 | https://tc39.es/ecma262/#sec-string.prototype.padend | ✅ |
| `SharedArrayBuffer` | §25.1 | https://tc39.es/ecma262/#sec-sharedarraybuffer-objects | 🔲 |
| `Atomics` | §25.4 | https://tc39.es/ecma262/#sec-atomics-object | 🔲 |
| `Object.getOwnPropertyDescriptors` | §20.1.2.9 | https://tc39.es/ecma262/#sec-object.getownpropertydescriptors | ✅ |

---

## See Also

- `specs/ecmascript/es2016/highlights.md` — `Array.includes`, `**`
- `specs/ecmascript/es2018/highlights.md` — async iteration, `Promise.finally`
- `specs/ecmascript/README.md` — full compliance matrix
- `prototype/src/typeChecker/index.ts` — runtime type-checker implementation
