# ECMAScript 5 — Highlights for Super.js

ECMA-262 5th Edition (2009). The baseline compatibility target for SJS-compiled output
when targeting legacy environments. SJS enforces or leverages these features either
directly (emitting them in transpiled output) or as invariants the compiler relies on.

---

## 1. Strict Mode — §10.1.1 / §14.1

`"use strict"` turns on strict-mode semantics: no implicit globals, no duplicate
parameter names, no `with` statement, silent assignment errors become throws, `this`
is `undefined` in non-method calls, etc.

**What SJS uses it for:**
Every file emitted by the SJS compiler includes `"use strict"` as the first statement
of each CommonJS module wrapper or at the top of each ES-module output. This ensures
that SJS's type-safety assumptions (e.g., no accidental globals, predictable `this`)
are enforced at runtime in environments that do not yet run in strict mode by default.

```js
// SJS source
fn greet(name: string): string {
  return `Hello, ${name}`;
}

// Compiled output (CJS target)
"use strict";
function greet(name) {
  return `Hello, ${name}`;
}
exports.greet = greet;
```

---

## 2. JSON.parse / JSON.stringify — §24.5

Built-in serialisation. `JSON.parse(text)` converts a JSON string to a value;
`JSON.stringify(value)` converts a value to a JSON string.

**What SJS uses it for:**
- The SJS config loader parses `sjs.config.json` via `JSON.parse`.
- The watch-mode incremental cache serialises AST metadata using `JSON.stringify`
  between restarts.
- The diagnostic reporter emits structured JSON output (`sjs build --format=json`)
  via `JSON.stringify`.

```sjs
// SJS typed wrapper (stdlib/json.sjs)
fn parseConfig<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

fn serializeDiagnostics(diags: Diagnostic[]): string {
  return JSON.stringify(diags, null, 2);
}
```

---

## 3. Array.prototype.forEach — §23.1.3.12

`arr.forEach(callback)` iterates every element without returning a value. Callback
receives `(element, index, array)`.

**What SJS uses it for:**
Emitted in compiled output for `for...of` loops over arrays when the target is ES5,
and internally in the SJS compiler pipeline when visiting AST node lists without
accumulation.

```sjs
// SJS source
let names: string[] = ["Alice", "Bob", "Carol"];
for (name of names) {
  print(name);
}

// ES5 compiled output
var names = ["Alice", "Bob", "Carol"];
names.forEach(function(name) {
  console.log(name);
});
```

---

## 4. Array.prototype.map — §23.1.3.15

`arr.map(callback)` returns a new array by applying `callback` to every element.

**What SJS uses it for:**
The SJS type-checker transforms typed array expressions; `map` is the primary
compilation target for SJS array-comprehension syntax.

```sjs
// SJS source
let doubled: number[] = [1, 2, 3].map((n: number) => n * 2);

// Compiled ES5
var doubled = [1, 2, 3].map(function(n) { return n * 2; });
```

---

## 5. Array.prototype.filter — §23.1.3.9

`arr.filter(callback)` returns a new array containing only elements for which
`callback` returns truthy.

**What SJS uses it for:**
Diagnostic filtering in the linter and compiler: filtering rule violations by
severity before reporting.

```sjs
// SJS source
let evens: number[] = [1, 2, 3, 4, 5].filter((n: number) => n % 2 === 0);
```

---

## 6. Array.prototype.reduce — §23.1.3.21

`arr.reduce(callback, initialValue)` accumulates a single result across elements.

**What SJS uses it for:**
AST folding passes inside the compiler (constant folding) and accumulating
symbol tables from import declarations.

```sjs
// SJS source
let sum: number = [1, 2, 3, 4].reduce((acc: number, n: number) => acc + n, 0);
```

---

## 7. Array.prototype.some / every — §23.1.3.26 / §23.1.3.5

`some` returns `true` if at least one element satisfies the predicate; `every`
returns `true` if all elements satisfy it.

**What SJS uses it for:**
Type narrowing checks in the SJS type-checker (e.g., checking whether all members
of a union type are assignable to a target type).

```sjs
// SJS source
let flags: boolean[] = [true, true, false];
let anyTrue: bool = flags.some((f: bool) => f);
let allTrue: bool = flags.every((f: bool) => f);
```

---

## 8. Array.prototype.indexOf — §23.1.3.14

`arr.indexOf(searchElement)` returns the first index of `searchElement`, or `-1`.

**What SJS uses it for:**
Used in emitted ES5 output when SJS's `Array.includes` call is downlevelled and in
the compiler's own token-stream search logic.

```sjs
// SJS source (targets ES5)
let items: string[] = ["a", "b", "c"];
let idx: number = items.indexOf("b"); // 1
```

---

## 9. Object.defineProperty — §19.1.2.4

`Object.defineProperty(obj, prop, descriptor)` defines or modifies a property with
full control over `writable`, `enumerable`, `configurable`, `get`, and `set`.

**What SJS uses it for:**
- Emitting non-writable constants: SJS `const` on module-level objects is compiled
  to `Object.defineProperty` with `writable: false` when targeting ES5.
- Implementing SJS class property decorators in ES5 output.
- The SJS module system uses it to mark `exports.__esModule = true`.

```js
// Compiled output for: export const VERSION: string = "0.2.0"
Object.defineProperty(exports, "__esModule", { value: true });
Object.defineProperty(exports, "VERSION", {
  value: "0.2.0",
  writable: false,
  enumerable: true,
  configurable: false,
});
```

---

## 10. Object.getOwnPropertyNames — §19.1.2.8

`Object.getOwnPropertyNames(obj)` returns an array of all own property names,
including non-enumerable ones.

**What SJS uses it for:**
The SJS runtime reflection helpers (used by `typeof` and structural type checks at
runtime) enumerate all own keys including symbol-keyed private slots.

```sjs
// SJS stdlib helper (compiled to ES5)
fn ownKeys(obj: object): string[] {
  return Object.getOwnPropertyNames(obj);
}
```

---

## 11. Object.keys — §19.1.2.17

`Object.keys(obj)` returns an array of the object's own enumerable property names.

**What SJS uses it for:**
Spread operator compilation for plain objects in ES5 output, and the SJS `for...in`
typed variant uses `Object.keys` to restrict to own enumerable properties.

```sjs
// SJS source
let config: { debug: bool; port: number } = { debug: true, port: 3000 };
let keys: string[] = Object.keys(config); // ["debug", "port"]
```

---

## 12. Getter / Setter Syntax — §14.3.5 / §15.7.5

Object literals and class bodies may declare `get prop()` and `set prop(v)`.

**What SJS uses it for:**
SJS `@computed` properties on classes compile to getter/setter pairs in ES5. The
SJS type-checker models them as read-only or write-only properties depending on
which accessor is present.

```sjs
// SJS source
class Circle {
  radius: number;

  get area(): number {
    return Math.PI * this.radius ** 2;
  }
}

// Compiled ES5
function Circle() {}
Object.defineProperty(Circle.prototype, "area", {
  get: function() { return Math.PI * this.radius * this.radius; },
  enumerable: true,
  configurable: true,
});
```

---

## 13. Function.prototype.bind — §20.2.3.2

`fn.bind(thisArg, ...args)` returns a new function with `this` pre-bound and
optional partial application.

**What SJS uses it for:**
ES5 compilation target for SJS arrow functions (which capture lexical `this`): the
compiler wraps the function body in `.bind(this)` when emitting ES5.

```sjs
// SJS source
class Timer {
  count: number = 0;
  tick: () => void = () => { this.count++; };
}

// Compiled ES5
function Timer() {
  this.count = 0;
  this.tick = (function() { this.count++; }).bind(this);
}
```

---

## Summary Table

| Feature                      | ECMA-262 §   | SJS Role                                      |
|------------------------------|--------------|-----------------------------------------------|
| Strict mode                  | §10.1.1      | All compiled output                           |
| JSON.parse / stringify       | §24.5        | Config loading, diagnostic JSON output        |
| Array.forEach                | §23.1.3.12   | ES5 target for `for...of`                     |
| Array.map                    | §23.1.3.15   | Array comprehension compilation               |
| Array.filter                 | §23.1.3.9    | Diagnostic/linter filtering                   |
| Array.reduce                 | §23.1.3.21   | Compiler AST folding                          |
| Array.some / every           | §23.1.3.26/5 | Type-checker union checks                     |
| Array.indexOf                | §23.1.3.14   | ES5 downlevel of includes                     |
| Object.defineProperty        | §19.1.2.4    | const exports, class props, __esModule flag   |
| Object.getOwnPropertyNames   | §19.1.2.8    | Runtime reflection helpers                    |
| Object.keys                  | §19.1.2.17   | Spread compilation, typed for-in              |
| Getter / Setter syntax       | §14.3.5      | @computed class properties                    |
| Function.prototype.bind      | §20.2.3.2    | Arrow function this capture in ES5 output     |
