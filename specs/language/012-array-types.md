# 012 — Array and Tuple Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §ArrayType, §TupleType, §ArrayLiteral

---

## Syntax

```ebnf
<ArrayType>  ::= <PrimaryType> "[" "]"
               (* left-recursive; T[][] = array of array of T *)

<TupleType>  ::= "[" [ <Type> { "," <Type> } ] "]"
               (* empty tuple [] is valid: zero-element tuple *)

<ArrayLiteral> ::= "[" [ <ArrayElement> { "," <ArrayElement> } [ "," ] ] "]"
<ArrayElement> ::= [ "..." ] <AssignmentExpression>
                 | (* elision — empty element *)
```

Alternative generic form `Array<T>` and `ReadonlyArray<T>` are accepted as `<TypeRef>` with one type argument.

---

## Semantics

### Array types: `T[]`

`T[]` is the type of a homogeneous, mutable, dynamically-sized sequence of values of type `T`. It is equivalent to `Array<T>`. Every element has type `T`; no element may be assigned a value of a type not assignable to `T`.

Array types are **covariant for reading** and **invariant for writing**. Assigning a `string[]` to a `(string | number)[]` variable is allowed (widening read); passing a `string[]` where a `(string | number)[]` is expected in a mutable parameter position is a type error (write invariance).

The type `ReadonlyArray<T>` (or `readonly T[]`) describes an immutable view of an array. It exposes no mutating methods (`.push`, `.pop`, `.splice`, etc.). A `T[]` is assignable to `ReadonlyArray<T>`, but not vice versa: a read-only view cannot be widened back to a mutable array.

### Tuple types: `[A, B, C]`

`[A, B, C]` is a fixed-length, heterogeneous array. Element at index 0 has type `A`, index 1 type `B`, index 2 type `C`. The length is a compile-time constant.

Accessing an index within the declared length yields the element type. Accessing an out-of-bounds constant index is a type error (SJS-E002). Accessing a dynamic index yields the union of all element types.

Tuple types are subtypes of their corresponding array type only in read-only context:

```
[A, B] <: ReadonlyArray<A | B>
[A, B] is NOT <: (A | B)[]   -- mutable array would allow push of wrong type
```

**Rest elements** in tuple types: `[A, ...B[], C]` denotes a tuple with a fixed first element of type `A`, a fixed last element of type `C`, and zero or more middle elements of type `B`. Rest elements must appear at most once per tuple type.

### Standard array operations and types

| Method / property | Type signature | Notes |
|-------------------|---------------|-------|
| `.length` | `number` | Array and tuple |
| `.push(v: T)` | `(T) => number` | Mutating; not on `ReadonlyArray` |
| `.pop()` | `() => T \| undefined` | Mutating; not on `ReadonlyArray` |
| `.map<U>(f: (T) => U)` | `(T => U) => U[]` | Returns new array |
| `.filter(f: (T) => boolean)` | `(T => boolean) => T[]` | Returns new array |
| `.reduce<U>(f: (U, T) => U, init: U)` | `(U, T) => U, U) => U` | Folds |
| `.slice(start?, end?)` | `(number?, number?) => T[]` | Returns new array |
| `.indexOf(v: T)` | `(T) => number` | Returns -1 if absent |
| `.includes(v: T)` | `(T) => boolean` | |
| `[i]` element access | `T` for array; element type for tuple | |

---

## Type rules

### Array construction

```
Γ ⊢ e1 : T, ..., Γ ⊢ eN : T
───────────────────────────── (array-literal)
Γ ⊢ [e1, ..., eN] : T[]

Γ ⊢ [] with expected type T[]
──────────────────────────── (array-empty)
Γ ⊢ [] : T[]
```

### Tuple construction

```
Γ ⊢ e1 : A    Γ ⊢ e2 : B    ...    Γ ⊢ eN : Z
─────────────────────────────────────────────── (tuple-literal)
Γ ⊢ [e1, e2, ..., eN] : [A, B, ..., Z]
```

### Element access

```
Γ ⊢ a : T[]    Γ ⊢ i : number
────────────────────────────── (array-index)
Γ ⊢ a[i] : T | undefined

Γ ⊢ t : [A, B, C]    k = 0
────────────────────────────── (tuple-index-known)
Γ ⊢ t[0] : A

Γ ⊢ t : [A, B, C]    k ≥ 3   (constant out-of-bounds)
────────────────────────────── (tuple-index-oob)
Γ ⊢ t[k]  → SJS-E002
```

### Subtyping

```
T <: U
──────────────────────────── (array-covariant-read)
ReadonlyArray<T> <: ReadonlyArray<U>

──────────────────────────────────── (readonly-array-sub)
T[] <: ReadonlyArray<T>

[A, B] <: ReadonlyArray<A | B>
──────────────────────────────────── (tuple-to-readonly-array)
(only in read context)
```

---

## JS Lowering (Prototype)

`T[]` and `ReadonlyArray<T>` lower to plain JavaScript arrays. Tuple types lower to plain JavaScript arrays; the fixed-length and heterogeneous type information is type-level only and erased.

```sjs
// SJS input
const nums: number[] = [1, 2, 3];
const pair: [string, number] = ["age", 30];
const ro: ReadonlyArray<string> = ["a", "b"];
```

```javascript
// JS output
const nums = [1, 2, 3];
const pair = ["age", 30];
const ro = ["a", "b"];
```

No wrapper types, no runtime length checks, no read-only enforcement at runtime. `ReadonlyArray<T>` readonly constraint is compile-time only.

---

## LLVM Lowering (Future)

**`T[]` (mutable array):** Lowered to a heap-allocated struct containing a data pointer, a length, and a capacity. Analogous to a `Vec<T>` in Rust.

```llvm
; T[] where T = double
%sjs_array_double = type { double*, i64, i64 }
;                          ^data   ^len ^cap
```

Element access compiles to a bounds check followed by a `getelementptr` and load. The bounds check can be elided when the index is a compile-time constant within range.

**Tuple `[A, B, C]`:** Lowered to a stack-allocated packed struct with typed fields in declaration order.

```llvm
; [string, number]  →  { %sjs_string, double }
%sjs_tuple_str_num = type { %sjs_string, double }

; Constructing ["age", 30]:
%t = alloca %sjs_tuple_str_num
; store "age" into field 0...
; store 30.0 into field 1...
```

Tuple element access at a constant index compiles directly to `getelementptr` with no bounds check (index is statically verified).

**`ReadonlyArray<T>`:** Same representation as `T[]`; the mutation restriction is type-level only and generates no additional LLVM IR.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E001` | Value of wrong element type assigned into array or tuple |
| `SJS-E002` | Tuple index access at a compile-time constant that is out of bounds; or mutable array method called on `ReadonlyArray` |

---

## Examples

### Valid

```sjs
// ✓ Homogeneous array
const scores: number[] = [95, 87, 100];

// ✓ Array of nullable elements
const names: string?[] = ["Alice", null, "Bob"];

// ✓ Tuple with distinct element types
const point: [number, number] = [3, 4];
const entry: [string, number] = ["count", 42];

// ✓ ReadonlyArray prevents mutation
const frozen: ReadonlyArray<string> = ["x", "y"];

// ✓ Nested array type
const matrix: number[][] = [[1, 2], [3, 4]];

// ✓ Array map and filter
const doubled: number[] = [1, 2, 3].map(x => x * 2);
const evens: number[] = [1, 2, 3, 4].filter(x => x % 2 === 0);

// ✓ Tuple destructuring
const [x, y]: [number, number] = [10, 20];

// ✓ Rest tuple
function head<T>(xs: [T, ...T[]]): T {
  return xs[0];
}
```

### Invalid

```sjs
// ✗ SJS-E001: wrong element type
const bad: number[] = [1, "two", 3];
//                        ^^^^^ SJS-E001: string not assignable to number

// ✗ SJS-E002: tuple index out of bounds
const pair: [string, number] = ["a", 1];
const third = pair[2];  // SJS-E002: index 2 out of range for [string, number]

// ✗ SJS-E002: mutating a ReadonlyArray
const ro: ReadonlyArray<number> = [1, 2, 3];
ro.push(4);  // SJS-E002: push does not exist on ReadonlyArray<number>

// ✗ SJS-E001: tuple element type mismatch
const t: [string, number] = [42, "hello"];
//                            ^^ SJS-E001: number not assignable to string
```
