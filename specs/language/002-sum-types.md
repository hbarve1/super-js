# 002 — Sum Types

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §TypeDecl, §SumTypeDef, §VariantDef

---

## Syntax

```ebnf
<TypeDecl>        ::= "type" <Identifier> [ <TypeParameters> ] "=" <SumTypeDef> ";"

<SumTypeDef>      ::= <VariantDef> { "|" <VariantDef> }

<VariantDef>      ::= <Identifier>
                    | <Identifier> "(" <Type> ")"
                    | <Identifier> "(" "{" <VariantFieldList> "}" ")"

<VariantFieldList> ::= <VariantField> { "," <VariantField> } [ "," ]

<VariantField>    ::= <Identifier> ":" <Type>

<TypeParameters>  ::= "<" <TypeParam> { "," <TypeParam> } ">"
<TypeParam>       ::= <Identifier>
```

The three `VariantDef` forms correspond to unit variants (no payload), tuple variants (single positional payload), and record variants (named-field payload). A sum type must have at least one variant.

---

## Semantics

### Nominal typing

Sum types are nominally typed. Two distinct `type` declarations with identical structure are not the same type:

```sjs
type A = Foo(number) | Bar(string);
type B = Foo(number) | Bar(string);  // A ≠ B even though structurally equal
```

Type identity is determined by the declaration, not the structure.

### Type parameters

Type parameters declared in `<TypeParameters>` are in scope across all variant definitions in the `SumTypeDef`. They are bound at instantiation:

```sjs
type Result<T, E> = Ok(T) | Err(E);
// T and E are bound when Result is used as Result<number, string>
```

### Variant constructors

Each variant name becomes a constructor in scope after the `type` declaration. Constructors are not first-class values — they must be applied in an expression context where the expected type is known or inferable.

- **Unit variant** — takes no arguments: `None`
- **Tuple variant** — takes a single expression as payload: `Ok(42)`
- **Record variant** — takes a block of named fields: `Node({ left: t1, right: t2 })`

### Variant names and scoping

Variant names are module-scoped identifiers. If two sum types in scope declare the same variant name, the compiler resolves ambiguity using the expected type context. If context is insufficient to disambiguate, SJS-E020 is emitted.

### Recursive types

Sum types may be self-referential via nullable or reference payloads:

```sjs
type Tree<T> = Leaf | Node({ value: T, left: Tree<T>?, right: Tree<T>? });
```

Direct non-nullable recursion without indirection is a compile error (infinite size).

---

## Runtime representation

Sum type values are represented as plain JavaScript objects with a mandatory `_tag` discriminant field. The tag value is the variant name as a string. This representation is canonical — all code generation and pattern matching relies on it.

### Unit variant

```
{ _tag: "VariantName" }
```

No payload field is present.

### Tuple variant

```
{ _tag: "VariantName", _0: <payload value> }
```

The payload is stored under the key `_0`. There is no `_1`, `_2`, etc. — tuple variants carry exactly one value. Multiple positional values require a record variant or a tuple type in the payload.

### Record variant

```
{ _tag: "VariantName", field1: <value>, field2: <value>, ... }
```

Each declared field name is used directly as a key. No `_0` is present.

### Examples

```
None            →  { _tag: "None" }
Ok(42)          →  { _tag: "Ok", _0: 42 }
Err("fail")     →  { _tag: "Err", _0: "fail" }
Node({ left: l, right: r })  →  { _tag: "Node", left: l, right: r }
```

---

## Type rules

### Unit variant construction

```
type D = ... | V | ...    (V is a unit variant of D)
──────────────────────────────────────────────────── (variant-unit)
Γ ⊢ V : D
```

### Tuple variant construction

```
type D<...> = ... | V(T) | ...    Γ ⊢ e : T[θ]    θ = type substitution
───────────────────────────────────────────────────────────────────────── (variant-tuple)
Γ ⊢ V(e) : D<...>[θ]
```

### Record variant construction

```
type D<...> = ... | V({ f1: T1, ..., fN: TN }) | ...
Γ ⊢ e1 : T1[θ], ..., Γ ⊢ eN : TN[θ]
──────────────────────────────────────────────────────── (variant-record)
Γ ⊢ V({ f1: e1, ..., fN: eN }) : D<...>[θ]
```

### Subtyping

Each variant is a subtype of its declaring sum type:

```
Γ ⊢ e : V_constructed_type     V declared in D
──────────────────────────────────────────────── (variant-sub)
Γ ⊢ e : D
```

### Type-directed disambiguation

When multiple sum types in scope share a variant name `V`, the compiler resolves using the expected type context:

```
expected type = D1    V declared in D1 and D2
────────────────────────────────────────────── (variant-disambig)
Γ ⊢ V(e) : D1
```

If no expected type context is available and the variant name is ambiguous, SJS-E020 is emitted.

---

## JS Lowering (Prototype)

Sum type declarations are erased. No constructor functions are generated. Each constructor expression is lowered to an object literal with `_tag` and payload fields inline.

```sjs
// SJS declarations
type Result<T, E> = Ok(T) | Err(E);
type Option<T> = Some(T) | None;
type Shape = Circle({ radius: number }) | Rect({ w: number, h: number }) | Point;
```

```javascript
// No JS output for declarations — erased entirely
```

```sjs
// SJS constructor expressions
const r1: Result<number, string> = Ok(42);
const r2: Result<number, string> = Err("not found");
const o: Option<number> = None;
const s: Shape = Circle({ radius: 5.0 });
```

```javascript
// JS output (types erased, constructors become object literals)
const r1 = { _tag: "Ok", _0: 42 };
const r2 = { _tag: "Err", _0: "not found" };
const o  = { _tag: "None" };
const s  = { _tag: "Circle", radius: 5.0 };
```

No helper functions, no prototype chains, no class instances. Constructors are syntactic sugar for object literal construction.

### Generic instantiation

Generic type parameters are erased. `Result<number, string>` and `Result<boolean, Error>` both lower to the same JS object shape — differentiation exists only at the type-checker level.

---

## LLVM Lowering (Future)

Sum types compile to tagged unions. The tag is an `i8` (supporting up to 255 variants). The payload is a byte array sized to the largest variant's payload. The compiler generates typed accessor functions for each variant.

```llvm
; type Shape = Circle(f64) | Rect({ w: f64, h: f64 }) | Point
; Tag assignments: Circle=0, Rect=1, Point=2

%Shape = type { i8, [16 x i8] }
;               ^^  ^^^^^^^^^^^
;              tag   payload (sized to largest variant = Rect: 2x f64 = 16 bytes)

; Constructing Circle(3.14):
%c = alloca %Shape
%tag_ptr = getelementptr %Shape, %Shape* %c, i32 0, i32 0
store i8 0, i8* %tag_ptr
%payload_ptr = getelementptr %Shape, %Shape* %c, i32 0, i32 1
%f64_ptr = bitcast [16 x i8]* %payload_ptr to double*
store double 3.14, double* %f64_ptr

; Constructing Point (unit — no payload write needed):
%p = alloca %Shape
%tag_ptr2 = getelementptr %Shape, %Shape* %p, i32 0, i32 0
store i8 2, i8* %tag_ptr2
```

For record variants with multiple fields, the payload is a packed struct cast to/from the byte array:

```llvm
; Rect payload struct
%RectPayload = type { double, double }   ; w, h

; Constructing Rect({ w: 4.0, h: 2.0 }):
%payload_ptr = getelementptr %Shape, %Shape* %r, i32 0, i32 1
%rect_ptr = bitcast [16 x i8]* %payload_ptr to %RectPayload*
store %RectPayload { double 4.0, double 2.0 }, %RectPayload* %rect_ptr
```

The compiler tracks tag-to-index mapping and generates a `__sjs_shape_tag` enum constant for each variant.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E007 | Non-exhaustive `match` on a sum type (see `003-match.md`) |
| SJS-E020 | Ambiguous variant constructor: name shared by multiple sum types and context is insufficient |
| SJS-E010 | `enum` keyword used — SJS does not have C-style enums; use sum types |

---

## Examples

### Valid

```sjs
// Standard Result type
type Result<T, E> = Ok(T) | Err(E);

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("division by zero");
  }
  return Ok(a / b);
}

// Option type
type Option<T> = Some(T) | None;

function find(xs: number[], target: number): Option<number> {
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] === target) {
      return Some(i);
    }
  }
  return None;
}

// Shape with unit, tuple, and record variants
type Shape = Circle(number) | Rect({ width: number, height: number }) | Point;

const c: Shape = Circle(5.0);
const r: Shape = Rect({ width: 10.0, height: 4.0 });
const p: Shape = Point;

// Recursive tree
type Tree<T> = Leaf | Node({ value: T, left: Tree<T>?, right: Tree<T>? });

const leaf: Tree<number> = Leaf;
const tree: Tree<number> = Node({ value: 1, left: null, right: null });

// Nested generic
type Validated<T> = Valid(T) | Invalid(string[]);

const v: Validated<number> = Valid(42);
const e: Validated<number> = Invalid(["too small", "must be even"]);
```

### Invalid

```sjs
// SJS-E020: ambiguous variant (both types declare Ok)
type A = Ok(number) | Fail;
type B = Ok(string) | Fail;

const x = Ok(1);  // SJS-E020: Ok is ambiguous between A and B

// Wrong payload type
type Result<T, E> = Ok(T) | Err(E);
const bad: Result<number, string> = Ok("hello");
//                                     ^^^^^^^ type error: expected number, got string

// SJS-E010: enum keyword not supported
enum Color { Red, Green, Blue }  // SJS-E010: use sum types instead

// Missing required record field
type Config = Settings({ host: string, port: number });
const cfg: Config = Settings({ host: "localhost" });
//                             ^^^ SJS-E002: missing field port
```
