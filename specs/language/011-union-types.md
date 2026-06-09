# 011 — Union Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §Type, §BitwiseOrExpression

---

## Syntax

Union types are written using `|` in type position. The `|` operator is parsed at the same level as `<BitwiseOrExpression>` in type expressions, making it lower precedence than postfix `?`.

```ebnf
<UnionType>  ::= <PrimaryType> { "|" <PrimaryType> }

<Type>       ::= <PrimaryType> [ "?" ]
               | <FunctionType>
               | <TupleType>
               | <UnionType>
```

A leading `|` is permitted for multi-line formatting:

```sjs
type Status =
  | "pending"
  | "active"
  | "closed";
```

---

## Semantics

A value of union type `A | B` is a value that is either an `A` or a `B`. The union is open to any number of members: `A | B | C | ...`.

### Operations on union types

An operation on a value of union type `A | B` is only permitted if the operation is valid for every member of the union. If the operation is valid on `A` but not on `B`, the compiler emits SJS-E002 unless the value has first been narrowed.

```sjs
function f(x: string | number): string {
  return x.toUpperCase();  // SJS-E002: toUpperCase does not exist on number
}
```

After narrowing `x` to `string`, the property access is permitted.

### Nullable shorthand

`T?` desugars to `T | null`. The two forms are interchangeable in all type positions. `T?` does **not** include `undefined`; write `T | null | undefined` to include both.

```
T?  ≡  T | null
```

Distribution over nullable:

```
(A | B)?  ≡  A | B | null
```

### Union normalization

The type-checker applies the following normalizations before comparing union types:

- **Idempotency:** `A | A` = `A`
- **Never collapse:** `A | never` = `A`; `never | A` = `A`
- **Commutativity:** `A | B` and `B | A` are the same type
- **Associativity:** `(A | B) | C` = `A | (B | C)` = `A | B | C`
- **Unknown absorption:** `A | unknown` = `unknown` for all `A`

### Discriminated unions

When every member of a union has a literal-typed discriminant property at the same key, the union is called a **discriminated union**. The compiler uses the discriminant to narrow the full union to a single member in match arms and `if` branches.

```sjs
interface Circle { kind: "circle"; radius: number; }
interface Rect   { kind: "rect";   width: number; height: number; }

type Shape = Circle | Rect;

function area(s: Shape): number {
  if (s.kind === "circle") {
    return Math.PI * s.radius * s.radius;  // s: Circle
  }
  return s.width * s.height;  // s: Rect
}
```

Sum types (declared with `type Foo = A(...) | B(...)`) use `_tag` as the discriminant automatically; see `002-sum-types.md`.

### JS Lowering (Prototype)

Union types are type-level constructs only. They are completely erased at compile time. No runtime tags, no wrapper objects, no helper code.

```sjs
// SJS input
function stringify(x: number | boolean): string {
  return String(x);
}
```

```javascript
// JS output
function stringify(x) {
  return String(x);
}
```

### LLVM Lowering (Future)

**Union of primitive types:** Lowered to a tagged union struct. The tag is an `i8` identifying which member is active; the payload is a union of all member types sized to the largest member.

```llvm
; string | number
%SJS_StringOrNumber = type { i8, [8 x i8] }
; tag: 0 = string ({i8*, i64} fat ptr), 1 = number (double)
```

**Union of pointer/reference types:** Lowered to a pointer with a tag stored in the low bits (pointer tagging), or as a `{ i8 tag, i8* ptr }` pair depending on alignment guarantees.

**Discriminated unions of interface/object types:** Lowered to a pointer to the concrete struct; the discriminant field is checked at runtime for narrowing branches.

---

## Type rules

### Introduction

```
Γ ⊢ e : A
──────────────────── (union-intro-left)
Γ ⊢ e : A | B

Γ ⊢ e : B
──────────────────── (union-intro-right)
Γ ⊢ e : A | B
```

### Elimination via narrowing

```
Γ ⊢ x : A | B    Γ, x:A ⊢ e1 : T    Γ, x:B ⊢ e2 : T
─────────────────────────────────────────────────────── (union-elim)
Γ ⊢ (narrow x to A → e1; to B → e2) : T
```

### Normalization

```
─────────────────── (union-never)
T | never  ≡  T

─────────────────── (union-idem)
T | T  ≡  T

─────────────────── (union-unknown)
T | unknown  ≡  unknown
```

### Narrowing patterns

| Pattern | Input type | Narrowed to (true branch) | Narrowed to (false branch) |
|---------|-----------|--------------------------|---------------------------|
| `x === null` | `T \| null` | `null` | `T` |
| `x !== null` | `T \| null` | `T` | `null` |
| `typeof x === "string"` | `string \| number` | `string` | `number` |
| `typeof x === "number"` | `string \| number` | `number` | `string` |
| `x instanceof C` | `C \| D` | `C` | `D` |
| `"prop" in x` | `A \| B` | members of union that have `prop` | remainder |
| `x.kind === "circle"` | discriminated union | variant with `kind: "circle"` | remaining variants |

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E002` | Operation applied to a union-typed value where the operation is not valid on all members |

---

## Examples

### Valid

```sjs
// ✓ Explicit union type
function format(x: string | number): string {
  if (typeof x === "string") {
    return x;           // x: string
  }
  return x.toFixed(2);  // x: number
}

// ✓ Nullable shorthand as union sugar
let name: string? = null;  // string | null

// ✓ Discriminated union narrowing
interface Success { status: "ok";   value: number; }
interface Failure { status: "fail"; error: string; }
type Response = Success | Failure;

function handle(r: Response): string {
  if (r.status === "ok") {
    return String(r.value);  // r: Success
  }
  return r.error;            // r: Failure
}

// ✓ Union in return type
function divide(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

// ✓ Three-member union with typeof narrowing
function printAll(x: string | number | boolean): void {
  if (typeof x === "string") {
    console.log(x.length);
  } else if (typeof x === "number") {
    console.log(x.toFixed(2));
  } else {
    console.log(x ? "yes" : "no");
  }
}
```

### Invalid

```sjs
// ✗ SJS-E002: method not valid on all union members
function bad(x: string | number): string {
  return x.toUpperCase();  // SJS-E002: toUpperCase not on number
}

// ✗ SJS-E002: arithmetic not valid on all union members
function add(x: string | number): number {
  return x + 1;  // SJS-E002: + on string | number is ambiguous
}
```
