# ECMAScript 2015 (ES6) — Highlights for Super.js

ECMA-262 6th Edition (2015). The foundational version that SJS targets as its
primary compilation baseline. Most SJS syntax maps directly onto ES2015 constructs;
the SJS type layer is erased during compilation, leaving idiomatic ES2015 output.

---

## 1. Classes — §15.7

`class` declarations and expressions provide syntactic sugar over prototype-based
inheritance. Includes `constructor`, instance methods, static methods, `extends`,
and `super`.

**What SJS uses it for:**
SJS `class` syntax is a superset of ES2015 classes. SJS adds typed fields, access
modifiers (`pub`, `priv`, `prot`), implements clauses, and decorator support. The
compiler erases all SJS-specific annotations and emits standard ES2015 class syntax.
Structural typing of class instances is resolved during type-checking.

```sjs
// SJS source
class Animal {
  pub name: string;
  priv age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  pub greet(): string {
    return `I am ${this.name}`;
  }
}

class Dog extends Animal {
  breed: string;

  constructor(name: string, age: number, breed: string) {
    super(name, age);
    this.breed = breed;
  }
}

// Compiled ES2015 output
class Animal {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  greet() {
    return `I am ${this.name}`;
  }
}
class Dog extends Animal {
  constructor(name, age, breed) {
    super(name, age);
    this.breed = breed;
  }
}
```

---

## 2. Arrow Functions — §15.3

`(params) => expr` or `(params) => { body }`. Arrow functions capture lexical `this`
and do not have their own `arguments`, `super`, or `new.target` bindings.

**What SJS uses it for:**
SJS typed arrow syntax annotates parameter and return types inline. The type
annotations are stripped at compile time; the arrow shape is preserved in output.
Arrow functions are the preferred callable form for SJS callbacks and inline lambdas.
Linter rule SJS-L008 warns when a named function expression would be clearer.

```sjs
// SJS typed arrow
let double = (n: number): number => n * 2;
let greet = (name: string): string => `Hello, ${name}`;

// Higher-order with typed arrows
fn transform(arr: number[], fn: (n: number) => number): number[] {
  return arr.map(fn);
}

let result: number[] = transform([1, 2, 3], (x: number) => x * 10);

// Compiled output
const double = (n) => n * 2;
const greet = (name) => `Hello, ${name}`;
function transform(arr, fn) { return arr.map(fn); }
const result = transform([1, 2, 3], (x) => x * 10);
```

---

## 3. let and const — §14.3.1 / §14.3.2

Block-scoped variable declarations. `let` allows reassignment; `const` binds a
name to a value that cannot be reassigned (but the value itself may be mutable).

**What SJS uses it for:**
SJS linter rule **SJS-L001 (prefer-const)** flags any `let` binding that is never
reassigned and suggests upgrading it to `const`. The SJS compiler emits `const`
for SJS-level immutable bindings and `let` for all others. `var` is never emitted
unless explicitly requested via compiler options for ES5 targets.

```sjs
// SJS source — SJS-L001 fires on `count` if it is never reassigned
let count: number = 0;
const MAX: number = 100;

// Correct SJS style
const threshold: number = 42;
let accumulator: number = 0;
for (item of items) {
  accumulator += item.value;
}
```

---

## 4. Template Literals — §13.2.8

Backtick-delimited strings with embedded expressions `${expr}` and optional tag
functions `tag\`...\``.

**What SJS uses it for:**
SJS string interpolation uses template literal syntax directly. Tagged templates are
supported and type-checked: the tag function's signature is `(strings: TemplateStringsArray, ...values: any[]) => T`.
The SJS `html`, `css`, and `sql` built-in tags produce typed outputs.

```sjs
// SJS source
let name: string = "World";
let greeting: string = `Hello, ${name}!`;

// Tagged template with SJS type
let query: SqlQuery = sql`SELECT * FROM users WHERE id = ${userId}`;
let markup: HtmlFragment = html`<p class="msg">${greeting}</p>`;

// Compiled output — template literals pass through unchanged
const greeting = `Hello, ${name}!`;
const query = sql`SELECT * FROM users WHERE id = ${userId}`;
```

---

## 5. Destructuring — §14.3.3

Binding patterns that unpack arrays and objects into individual variables.
Array destructuring uses `[]`; object destructuring uses `{}`. Supports
defaults, renaming, rest elements, and nesting.

**What SJS uses it for:**
SJS extends destructuring with inline type annotations on each binding. The
type-checker validates that the destructured shape matches the source type.
Typed destructuring is particularly important for function parameter patterns.

```sjs
// SJS typed array destructuring
let [first: number, second: number, ...rest: number[]] = [1, 2, 3, 4, 5];

// SJS typed object destructuring
let { name: string, age: number = 0 } = user;

// SJS function parameter destructuring
fn processPoint({ x: number, y: number }: Point): string {
  return `(${x}, ${y})`;
}

// Typed destructuring in for-of
for ({ id: number, label: string } of items) {
  print(`${id}: ${label}`);
}

// Compiled output (types erased)
const [first, second, ...rest] = [1, 2, 3, 4, 5];
const { name, age = 0 } = user;
function processPoint({ x, y }) { return `(${x}, ${y})`; }
```

---

## 6. Spread and Rest — §13.2.4 / §15.1

Spread `...expr` expands an iterable into individual elements in array literals,
object literals (ES2018), or call arguments. Rest `...name` collects remaining
elements into an array in destructuring or function parameters.

**What SJS uses it for:**
SJS types spread/rest positions. A spread of `T[]` into a function expecting
`...args: T[]` is type-checked for element compatibility. Object spread is the
preferred SJS idiom for immutable record updates.

```sjs
// Array spread
let combined: number[] = [...firstHalf, ...secondHalf];

// Function call spread
fn sum(...nums: number[]): number {
  return nums.reduce((a: number, b: number) => a + b, 0);
}
let total: number = sum(...[1, 2, 3, 4]);

// Immutable record update pattern (SJS idiomatic)
let updated: Config = { ...config, debug: true };

// Compiled output
const combined = [...firstHalf, ...secondHalf];
function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }
const total = sum(...[1, 2, 3, 4]);
const updated = { ...config, debug: true };
```

---

## 7. Modules — §16.2

Static `import` / `export` declarations define the ES module system. Named exports,
default exports, namespace imports, re-exports, and dynamic `import()` are all
specified here (dynamic import is §13.3.10, introduced later but built on §16.2
foundations).

**What SJS uses it for:**
SJS uses ES module syntax as its native module format. The SJS module resolver
enforces that all imports are resolvable and type-checked at compile time. Circular
imports are detected and reported as errors (SJS-E005). The compiler can emit either
ES module output or CommonJS (with `--module=cjs`), transforming `import`/`export`
to `require`/`module.exports` accordingly.

```sjs
// SJS module: math.sjs
export fn add(a: number, b: number): number { return a + b; }
export fn multiply(a: number, b: number): number { return a * b; }
export const PI: number = 3.14159265358979;

// SJS consumer: main.sjs
import { add, multiply, PI } from "./math";
import type { Vector2 } from "./types";    // type-only import, erased at compile

let area: number = multiply(PI, radius ** 2);

// Namespace import
import * as Math from "./math";
let result: number = Math.add(1, 2);

// Default export
export default class App { /* ... */ }
```

---

## 8. Symbol — §6.1.5 / §20.4

A primitive type whose values are unique and immutable. Created via `Symbol(description)`.
Well-known symbols (§6.1.5.1) like `Symbol.iterator`, `Symbol.toPrimitive` customise
built-in protocol behaviour.

**What SJS uses it for:**
SJS exposes `symbol` as a first-class type keyword. Symbols are used internally
to tag nominal types (SJS nominal brands) and to implement iterator protocols for
custom iterable types. Well-known symbols are part of the SJS standard interface
definitions.

```sjs
// SJS symbol type
let id: symbol = Symbol("userId");

// SJS nominal branding via symbol
const BrandedId = Symbol("BrandedId");
type UserId = number & { [BrandedId]: true };

// Custom iterable using Symbol.iterator
class Range implements Iterable<number> {
  start: number;
  end: number;

  [Symbol.iterator](): Iterator<number> {
    let current = this.start;
    let end = this.end;
    return {
      next(): IteratorResult<number> {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}
```

---

## 9. Map — §24.1

A keyed collection of arbitrary key-value pairs where keys may be any value (not
just strings). Preserves insertion order. Key equality uses SameValueZero.

**What SJS uses it for:**
SJS types `Map` as `Map<K, V>`. The SJS standard library wraps `Map` with typed
helper methods. The SJS compiler's symbol table and scope chain are implemented as
`Map<string, SymbolEntry>` internally.

```sjs
// SJS typed Map
let registry: Map<string, number> = new Map();
registry.set("alpha", 1);
registry.set("beta", 2);

let val: number | undefined = registry.get("alpha");

// Iterable destruction in SJS
for ([key: string, value: number] of registry) {
  print(`${key} => ${value}`);
}

// Map from entries
let scores: Map<string, number> = new Map([
  ["Alice", 95],
  ["Bob", 87],
]);
```

---

## 10. Set — §24.2

A collection of unique values using SameValueZero equality. Preserves insertion order.

**What SJS uses it for:**
SJS types `Set` as `Set<T>`. Used in the compiler for dependency graph deduplication
and in the SJS standard library for set-algebra operations (`union`, `intersection`,
`difference`).

```sjs
// SJS typed Set
let visited: Set<string> = new Set();
visited.add("home");
visited.add("about");
visited.add("home"); // duplicate, ignored

let hasHome: bool = visited.has("home"); // true
let size: number = visited.size;         // 2

// Set operations (SJS stdlib)
let a: Set<number> = new Set([1, 2, 3]);
let b: Set<number> = new Set([2, 3, 4]);
let union: Set<number> = new Set([...a, ...b]);
```

---

## 11. Promise — §27.2

A first-class abstraction for asynchronous operations. Promises have three states:
pending, fulfilled, rejected. `Promise.resolve`, `Promise.reject`, `Promise.all`,
`Promise.race` are the primary combinators.

**What SJS uses it for:**
SJS types `Promise<T>` and enforces that `.then` callbacks match the resolved type.
The SJS async/await syntax (which compiles to Promise chains) is defined in ES2017
but relies on this ES2015 foundation. SJS-L015 warns on unhandled promise rejections
detected statically.

```sjs
// SJS typed Promise
fn fetchUser(id: number): Promise<User> {
  return fetch(`/users/${id}`)
    .then((res: Response) => res.json() as Promise<User>);
}

// Promise combinators
fn loadAll(ids: number[]): Promise<User[]> {
  return Promise.all(ids.map((id: number) => fetchUser(id)));
}

// Error handling
fetchUser(42)
  .then((user: User) => print(user.name))
  .catch((err: Error) => print(err.message));
```

---

## 12. Generators — §15.5

Functions declared with `function*` that can `yield` values. Each call to the
generator function returns a Generator object that is both an iterator and an
iterable. `yield*` delegates to another iterable.

**What SJS uses it for:**
SJS types generator functions as `() => Generator<YieldType, ReturnType, NextType>`.
Generators are the compilation target for SJS async iteration and are used in the
SJS coroutine model. The compiler also uses generator semantics internally when
modelling control-flow for exhaustive type narrowing.

```sjs
// SJS typed generator
fn* fibonacci(): Generator<number, void, void> {
  let [a, b]: [number, number] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Consuming a generator
let fib: Generator<number, void, void> = fibonacci();
let first10: number[] = [];
for (n: number of fib) {
  if (first10.length >= 10) break;
  first10.push(n);
}

// yield* delegation
fn* chain<T>(a: Iterable<T>, b: Iterable<T>): Generator<T, void, void> {
  yield* a;
  yield* b;
}
```

---

## 13. Iterators and Iterables — §27.1

The iterator protocol requires a `next()` method returning `{ value, done }`.
The iterable protocol requires a `[Symbol.iterator]()` method returning an iterator.
Built-ins like `Array`, `Map`, `Set`, `String` all implement the iterable protocol.

**What SJS uses it for:**
SJS defines `Iterable<T>` and `Iterator<T, R, N>` as built-in generic interfaces.
`for...of` in SJS is type-checked against the iterable protocol. Custom iterable
classes can implement the `Iterable<T>` SJS interface.

```sjs
// SJS iterable interface implementation
class InfiniteCounter implements Iterable<number> {
  start: number;

  constructor(start: number = 0) {
    this.start = start;
  }

  [Symbol.iterator](): Iterator<number> {
    let i = this.start;
    return {
      next(): IteratorResult<number> {
        return { value: i++, done: false };
      }
    };
  }
}

// Typed for-of
for (n: number of new InfiniteCounter(1)) {
  if (n > 5) break;
  print(n);
}
```

---

## 14. WeakMap — §24.3

A collection of key-value pairs where keys are objects (or registered symbols) and
references to keys are held weakly (eligible for GC when no other reference exists).
Keys are not enumerable.

**What SJS uses it for:**
SJS types `WeakMap<K extends object, V>`. Used in the SJS runtime for storing
private field data when targeting environments without native private class fields.
The SJS class compiler emits `WeakMap`-backed storage for `priv` fields in ES2015
output.

```sjs
// SJS private field storage (compiler-emitted pattern)
const _age = new WeakMap<Animal, number>();

class Animal {
  constructor(name: string, age: number) {
    this.name = name;
    _age.set(this, age);
  }

  pub getAge(): number {
    return _age.get(this)!;
  }
}
```

---

## 15. WeakSet — §24.4

A collection of objects (or registered symbols) held by weak references. Used to
track object membership without preventing garbage collection.

**What SJS uses it for:**
SJS types `WeakSet<T extends object>`. Used in the SJS runtime for cycle detection
during deep structural type checks at runtime (`instanceof`-like checks for
structural interfaces).

```sjs
// Cycle detection in SJS runtime helper
fn deepEqual<T>(a: T, b: T, seen: WeakSet<object> = new WeakSet()): bool {
  if (typeof a !== "object" || a === null) return a === (b as any);
  if (seen.has(a as object)) return true;
  seen.add(a as object);
  // ... recurse over keys
}
```

---

## 16. Default Parameters — §15.1

Function parameters may have default values: `function f(x = 0)`. The default
expression is evaluated lazily at call time if the argument is `undefined`.

**What SJS uses it for:**
SJS default parameters carry type annotations. The type of a parameter with a
default is inferred as the union of the annotated type and the default's type,
narrowed to the annotated type inside the function body.

```sjs
// SJS default parameters with types
fn createUser(
  name: string,
  role: string = "viewer",
  active: bool = true,
): User {
  return { name, role, active };
}

// SJS infers that `role` is `string` inside the body (not `string | undefined`)
fn repeat(str: string, times: number = 1): string {
  return str.repeat(times);
}

// Compiled output — defaults pass through unchanged
function createUser(name, role = "viewer", active = true) {
  return { name, role, active };
}
function repeat(str, times = 1) {
  return str.repeat(times);
}
```

---

## Summary Table

| Feature              | ECMA-262 §          | SJS Role                                              |
|----------------------|---------------------|-------------------------------------------------------|
| Classes              | §15.7               | SJS class syntax; access modifiers; implements clause |
| Arrow functions      | §15.3               | Typed inline lambdas; SJS-L008                        |
| let / const          | §14.3.1 / §14.3.2   | SJS-L001 prefer-const rule; primary emit targets      |
| Template literals    | §13.2.8             | String interpolation; typed tag functions             |
| Destructuring        | §14.3.3             | Typed binding patterns; function parameters           |
| Spread / rest        | §13.2.4             | Typed variadic params; immutable record updates       |
| Modules              | §16.2               | Native SJS module format; CJS transform               |
| Symbol               | §6.1.5 / §20.4      | `symbol` type; nominal branding; iterator protocol    |
| Map                  | §24.1               | `Map<K,V>`; compiler symbol table                     |
| Set                  | §24.2               | `Set<T>`; dependency deduplication                    |
| Promise              | §27.2               | `Promise<T>`; async foundation; SJS-L015              |
| Generators           | §15.5               | `Generator<Y,R,N>`; async iteration target            |
| Iterators/Iterables  | §27.1               | `Iterable<T>`; typed for-of                           |
| WeakMap              | §24.3               | `priv` field backing in ES2015 output                 |
| WeakSet              | §24.4               | Cycle detection in runtime structural checks          |
| Default parameters   | §15.1               | Typed defaults; narrowing inside function body        |
