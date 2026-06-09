# 034 — Destructuring

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §VariableDeclarator, §ArrayBindingPattern, §ObjectBindingPattern, §AssignmentExpression

---

## Syntax

```ebnf
<ArrayBindingPattern>  ::= "[" [ <ArrayBindingElement>
                               { "," <ArrayBindingElement> }
                               [ "," "..." <Identifier> [ ":" <Type> ] ] ] "]"

<ArrayBindingElement>  ::= <BindingPattern> [ ":" <Type> ] [ "=" <Expression> ]
                         | ","   (* elision — skip element *)

<ObjectBindingPattern> ::= "{" [ <ObjectBindingElement>
                                { "," <ObjectBindingElement> }
                                [ "," "..." <Identifier> ] ] "}"

<ObjectBindingElement> ::= <Identifier> [ ":" <BindingPattern> ]
                           [ ":" <Type> ] [ "=" <Expression> ]
                         | <Identifier> "as" <Identifier> [ ":" <Type> ]
```

Destructuring is available in: variable declarations (`const`, `let`), assignment expressions, function parameters, and `for`/`for-of` loop variables.

---

## Semantics

### Array destructuring

Binds elements by position. The right-hand side must be an iterable. The first binding receives index 0, the second index 1, and so on.

- **Type annotation on element** — `[a: T]` — constrains the expected element type; if the source element type is not `<: T`, SJS-E001 is emitted.
- **Default value** — `[a = 0]` — used when the element is `undefined` (not when `null`). The type of `a` after applying the default is `T` (the default removes `undefined` from consideration).
- **Rest element** — `[first, ...rest: T[]]` — `rest` collects all remaining elements as `T[]`. Rest must be the last element.
- **Elision** — `[, second]` — skips an element by position.
- **Nested** — `[[x, y], z]` — destructuring patterns may be nested arbitrarily.

### Object destructuring

Binds properties by name. The right-hand side must be an object (non-null).

- **Simple binding** — `{ name }` — binds the property `name` to a local variable also named `name`.
- **Rename** — `{ name: localName }` or `{ name as localName }` — binds property `name` to `localName`.
- **Type annotation** — `{ name: string }` — constrains the property type.
- **Default value** — `{ port = 3000 }` — used when the property is `undefined`.
- **Rest element** — `{ a, b, ...rest }` — `rest` receives all own enumerable properties not explicitly named.
- **Nested** — `{ address: { city } }` — nested object patterns.

### Destructuring in function parameters

Parameters may use any binding pattern. Type annotations in parameter destructuring are checked against the call-site argument type.

```sjs
function render({ width: number, height: number }): void { ... }
```

### Tuple destructuring

When the source is a tuple type `[A, B, C]`, destructuring is checked element-by-element against the tuple's element types. Destructuring more elements than the tuple has is SJS-E002.

---

## Type rules

```
Γ ⊢ e : { p: S }     S <: T
─────────────────────────────────── (obj-destructure-typed)
Γ ⊢ const { p: T } = e : Γ[p ↦ T]

Γ ⊢ e : { p: S }
─────────────────────────────────── (obj-destructure-inferred)
Γ ⊢ const { p } = e : Γ[p ↦ S]

Γ ⊢ e : [S, ...]     S <: T
─────────────────────────────────── (arr-destructure-typed)
Γ ⊢ const [a: T, ...] = e : Γ[a ↦ T]

Γ ⊢ e : T[]
─────────────────────────────────── (arr-rest)
Γ ⊢ const [first, ...rest] = e : Γ[first ↦ T, rest ↦ T[]]

Γ ⊢ e : { p?: S }
─────────────────────────────────── (obj-optional-prop)
Γ ⊢ const { p } = e : Γ[p ↦ S | undefined]

Γ ⊢ e : { p?: S }     Γ ⊢ d : S
─────────────────────────────────── (obj-default)
Γ ⊢ const { p = d } = e : Γ[p ↦ S]
```

---

## JS Lowering (Prototype)

Type annotations are erased. Rename syntax (`as`) is normalized. All other destructuring constructs pass through as standard JS destructuring.

```sjs
// SJS input
const { x: number, y: number } = origin;
const { host: string = "localhost", port: number = 3000 } = config;
const [first: string, ...rest: string[]] = items;
const { name as displayName: string } = user;
```

```javascript
// JS output
const { x, y } = origin;
const { host = "localhost", port = 3000 } = config;
const [first, ...rest] = items;
const { name: displayName } = user;
```

No helper functions are emitted. The structural match guarantee is enforced at type-check time only.

---

## LLVM Lowering (Future)

```llvm
; Object destructuring: { x, y } from a struct
; Struct layout: %Point = { double x, double y }
%x = getelementptr %Point, %Point* %origin, i32 0, i32 0
%x_val = load double, double* %x

%y = getelementptr %Point, %Point* %origin, i32 0, i32 1
%y_val = load double, double* %y

; Array destructuring: [first, ...rest] from T[]
; SJS array layout: { i64 len, T* data }
%data = getelementptr %Array_T, %Array_T* %arr, i32 0, i32 1
%data_ptr = load T*, T** %data
%first = load T, T* %data_ptr

; rest = slice starting at index 1 (runtime helper)
%rest = call %Array_T* @__sjs_array_slice(%Array_T* %arr, i64 1)
```

Struct field extraction is direct pointer arithmetic — no runtime overhead for known struct types.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | Destructured element or property type is not assignable to declared annotation |
| `SJS-E002` | Tuple destructuring exceeds the number of elements in the source tuple type |
| `SJS-E003` | Object destructuring on a nullable source without prior null narrowing |

---

## Examples

### Valid

```sjs
interface Point { x: number; y: number; }
const origin: Point = { x: 0, y: 0 };
const { x: number, y: number } = origin;

// Default values
interface Options { timeout?: number; retries?: number; }
function connect({ timeout = 5000, retries = 3 }: Options): void { }

// Rename with type
interface Response { statusCode: number; }
const res: Response = { statusCode: 200 };
const { statusCode as code: number } = res;

// Nested destructuring
interface Nested { a: { b: number; }; }
const data: Nested = { a: { b: 42 } };
const { a: { b: number } } = data;

// Array rest
const nums: number[] = [1, 2, 3, 4];
const [head: number, ...tail: number[]] = nums;

// Tuple destructuring
const pair: [string, number] = ["age", 30];
const [label: string, value: number] = pair;
```

### Invalid

```sjs
// SJS-E001: annotation mismatch
const pt: Point = { x: 1, y: 2 };
const { x: string } = pt;
//         ^^^^^^ SJS-E001: number is not assignable to string

// SJS-E002: destructuring more elements than tuple has
const t: [number, string] = [1, "a"];
const [a, b, c] = t;
//           ^ SJS-E002: index 2 is out of bounds for tuple [number, string]

// SJS-E003: destructuring nullable object
function getCoords(p: Point?): number {
  const { x } = p;
  //            ^ SJS-E003: p is Point? — null-check required before destructuring
  return x;
}
```
