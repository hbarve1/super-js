# 014 — Object Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §ObjectTypeLiteral, §ObjectTypeMember, §IndexSignature

---

## Syntax

```ebnf
<ObjectTypeLiteral> ::= "{" { <ObjectTypeMember> } "}"

<ObjectTypeMember>  ::= [ "readonly" ] <Identifier> [ "?" ] ":" <Type> ";"
                      | <IndexSignature>
                      | <InterfaceMethod>

<IndexSignature>    ::= "[" <Identifier> ":" <PrimitiveType> "]" ":" <Type> ";"
                        (* PrimitiveType must be string or number *)

<InterfaceMethod>   ::= <Identifier>
                        [ <TypeParameters> ]
                        "(" [ <ParameterList> ] ")"
                        ":" <Type> ";"
```

Object type literals are interchangeable with single object-type declarations (the `type` brace form, see `006-interfaces.md`) for structural compatibility purposes. The `<InterfaceMethod>` rule above is the shared method-signature rule, reused by both object type literals and the `type` brace form.

---

## Semantics

An object type literal describes the structural shape required of a value. SJS uses **structural typing** for all object types — both anonymous literals and the named `type` brace form: a value satisfies an object type if it provides all required members with compatible types, regardless of how the value was constructed or declared.

### Required property

```sjs
{ name: string }
```

The property `name` must be present and its value must be assignable to `string`. Accessing `name` on a value of this type always yields `string`.

### Optional property

```sjs
{ age?: number }
```

The property `age` may be absent. When the property is absent, reading it yields `undefined`. The effective type of the property inside the object is `number | undefined`. To use the value as `number`, narrow it first.

### Readonly property

```sjs
{ readonly id: number }
```

The property `id` may be read but not written after construction. This constraint is enforced at compile time only — no runtime protection is generated. A value with `{ readonly id: number }` is assignable to `{ id: number }` for reading, but cannot be assigned to a context that allows writes to `id`.

`readonly` on a property does not make nested object values immutable — only the property reference itself is frozen.

### Index signature

```sjs
{ [key: string]: number }
```

All string-keyed properties not explicitly named must have type `number`. An object type may combine named properties with an index signature, provided the named property types are assignable to the index signature's value type:

```sjs
{ name: string; [key: string]: string }  // ✓ name: string satisfies string index
{ name: number; [key: string]: string }  // ✗ SJS-E002: number not assignable to string index
```

Only `string` and `number` are valid index signature key types.

### Excess property checking

When an object literal is directly assigned to a typed variable or passed directly as a function argument, the compiler checks for properties that do not appear in the target type. This is called the **fresh object check**.

```sjs
type Point = { x: number; y: number; };
const p: Point = { x: 1, y: 2, z: 3 };  // SJS-W006: excess property z
```

When an object is first assigned to a variable of a compatible but untyped type and then passed on, excess property checking is not applied (the object is no longer "fresh"):

```sjs
const obj = { x: 1, y: 2, z: 3 };
const p: Point = obj;  // ok — obj is not a fresh literal at this assignment
```

Excess property checking is a warning (SJS-W006), not an error, because it does not violate soundness — the extra property is simply ignored by the type system.

### Method shorthand in object types

Object type members may declare methods using the method signature shorthand:

```sjs
{
  area(): number;
  scale(factor: number): void;
}
```

Method signatures are interchangeable with property signatures using function types:

```sjs
{ area(): number }  ≡  { area: () => number }
```

---

## Type rules

### Width subtyping (structural)

A type with more properties is a subtype of a type with fewer properties (structural subtyping):

```
{ p: T, q: U, ...rest } <: { p: T }
──────────────────────────────────── (width-sub)
```

### Depth subtyping (covariant for readable properties)

```
S <: T
──────────────────────────────── (depth-sub-read)
{ p: S } <: { p: T }             -- for reading

S ≠ T
──────────────────────────────── (depth-sub-write)
{ p: S } is NOT <: { p: T }      -- for writing (invariant)
```

In practice, SJS does not distinguish read/write positions for object properties at the property level (no separate `get`/`set` types). Depth subtyping for mutable properties is treated as invariant in assignments that involve writes.

### Readonly subtyping

```
──────────────────────────────────────────── (readonly-not-mutable)
{ readonly p: T } is NOT <: { p: T }
```

A readonly-annotated property type is not assignable to a mutable property of the same type, because the target type would permit writes that the source forbids.

### Optional property access

```
Γ ⊢ obj : { p?: T }
──────────────────────────────── (opt-prop-read)
Γ ⊢ obj.p : T | undefined
```

### Excess property check

```
obj literal {p: T, q: U}    target type does not declare q
──────────────────────────────────────────────────────────── (excess-prop)
→ SJS-W006
```

---

## JS Lowering (Prototype)

Object type annotations are erased. Object literals lower verbatim. `readonly` is type-level only. No runtime shape checks are generated.

```sjs
// SJS input
type Config {
  readonly host: string;
  port?: number;
}

const cfg: Config = { host: "localhost", port: 8080 };
```

```javascript
// JS output
const cfg = { host: "localhost", port: 8080 };
```

Index signatures are erased; the underlying JS object accepts any string key at runtime.

---

## LLVM Lowering (Future)

Object types lower to LLVM structs with fields in property declaration order (for statically-known shapes).

```llvm
; { x: number; y: number }
%Point = type { double, double }
;               ^x       ^y

; Optional field { age?: number } → { i1 present, double value }
%OptNum = type { i1, double }
```

`readonly` properties generate no additional LLVM IR; the restriction is enforced at compile time.

Index signatures lower to a hash map structure (`%sjs_map`) keyed by string, appended after any statically-declared fields.

```llvm
; { name: string; [key: string]: string }
%DynObj = type { %sjs_string, %sjs_map* }
;                ^name field   ^dynamic properties
```

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E001` | Value of wrong type assigned to a typed property |
| `SJS-E002` | Named property type not assignable to index signature type; readonly property assigned; required property missing |
| `SJS-W006` | Excess property detected on a fresh object literal |

---

## Examples

### Valid

```sjs
// ✓ Basic object type
const point: { x: number; y: number; } = { x: 3, y: 4 };

// ✓ Optional property
type User {
  name: string;
  age?: number;
}
const u: User = { name: "Alice" };
const age: number | undefined = u.age;

// ✓ Readonly property
type Entity {
  readonly id: number;
  label: string;
}
const e: Entity = { id: 1, label: "root" };
e.label = "leaf";   // ok — mutable

// ✓ Index signature
const counts: { [key: string]: number } = {};
counts["hits"] = 42;
counts["misses"] = 7;

// ✓ Fresh object no-excess via variable
type Point = { x: number; y: number; };
const raw = { x: 1, y: 2, z: 3 };
const p: Point = raw;  // ok — raw is not a fresh literal at this point

// ✓ Structural satisfaction without explicit annotation
type Printable { toString(): string; }
function print(p: Printable): void { console.log(p.toString()); }
print({ toString() { return "hello"; } });  // satisfies Printable structurally

// ✓ Object type with method
type Scalable {
  scale(factor: number): Scalable;
}
```

### Invalid

```sjs
// ✗ SJS-W006: excess property on fresh literal
type Point = { x: number; y: number; };
const bad: Point = { x: 1, y: 2, z: 3 };
//                               ^ SJS-W006: z is not in Point

// ✗ SJS-E002: readonly property written after construction
type Frozen { readonly val: number; }
const f: Frozen = { val: 10 };
f.val = 20;  // SJS-E002: val is readonly

// ✗ SJS-E002: named property type incompatible with index signature
const bad2: { id: number; [k: string]: string } = { id: 1 };
//                         ^^^^^^^^^^^^^^^^^^^^^^
// SJS-E002: property id has type number, not assignable to index type string

// ✗ SJS-E001: wrong property type in literal
const p2: { x: number; } = { x: "oops" };
//                               ^^^^^^ SJS-E001: string not assignable to number
```
