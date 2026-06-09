# 010 — Primitive Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §PrimitiveType, §Literal

---

## Syntax

```ebnf
<PrimitiveType> ::= "number"
                  | "string"
                  | "boolean"
                  | "bigint"
                  | "symbol"
                  | "null"
                  | "undefined"
                  | "void"
                  | "never"
                  | "unknown"

<NumberLiteral>  ::= (* decimal, hex 0x, octal 0o, binary 0b, optional _ separator *)
<StringLiteral>  ::= (* single-quoted or double-quoted; no raw string form *)
<BooleanLiteral> ::= "true" | "false"
<NullLiteral>    ::= "null"
<UndefinedLiteral> ::= "undefined"
<BigIntLiteral>  ::= (* integer literal followed by n: 42n, 0xFFn *)
```

---

## Semantics

SJS provides ten primitive types. Each primitive type is disjoint from all others: no value belongs to more than one primitive type at the same time.

### `number`

Represents all numeric values as IEEE 754 double-precision floating-point. This includes integers representable in 53 bits, positive and negative infinity (`Infinity`, `-Infinity`), and the not-a-number sentinel (`NaN`). Integer and floating-point literals both have type `number`.

Literal forms: `0`, `42`, `3.14`, `0xFF`, `0o77`, `0b1010`, `1_000_000`, `Infinity`, `NaN`.

Valid operations and result types:
- Arithmetic `+`, `-`, `*`, `/`, `%`, `**` on two `number` operands → `number`
- Unary `+`, `-` on `number` → `number`
- Comparison `<`, `>`, `<=`, `>=`, `===`, `!==` on two `number` operands → `boolean`
- Bitwise `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>` — operands coerced to int32/uint32 at runtime → `number`

### `string`

Represents text as an immutable sequence of UTF-16 code units. String values are comparable with `===`/`!==`. `+` on two strings performs concatenation.

Literal forms: `"hello"`, `'world'`, template literals `` `Hello ${name}` ``.

Valid operations: `+` (concatenation) → `string`; comparison operators → `boolean`; property access `.length` → `number`; prototype methods (`.toUpperCase()`, `.slice()`, etc.) are available through the built-in `String` interface.

### `boolean`

The two-valued type. Only literal values are `true` and `false`.

Valid operations: `!` (logical not) → `boolean`; `&&`, `||` → `boolean`; `===`, `!==` → `boolean`.

### `bigint`

Arbitrary-precision integer values. `bigint` values cannot be mixed with `number` in arithmetic operations — doing so is a type error (SJS-E005).

Literal forms: `0n`, `42n`, `9007199254740993n`, `0xFFn`.

Valid operations: `+`, `-`, `*`, `/`, `%`, `**` on two `bigint` operands → `bigint`; comparison operators between two `bigint` values → `boolean`. Division truncates toward zero.

`bigint` cannot be used with bitwise operators that involve type coercion (`>>>` unsigned right shift is banned for `bigint`).

### `symbol`

Unique opaque identity values. Each call to `Symbol(description?)` produces a value unequal to all other symbols. Symbols are not coercible to `string` or `number`. The global symbol registry (`Symbol.for`) is permitted.

Literal forms: none. Symbols must be constructed via `Symbol(...)` or `Symbol.for(...)`.

Valid operations: `===`, `!==` → `boolean`; use as object property key.

### `null`

The intentional-absence type. The single value `null` has type `null`. It is not a member of any non-nullable type `T` — assigning `null` to `T` requires `T?` (i.e., `T | null`).

`null` is a keyword and cannot be rebind in SJS.

### `undefined`

The uninitialized/absent-property type. The single value `undefined` has type `undefined`. `undefined` is a reserved identifier in SJS and cannot be rebound or shadowed.

Distinction from `null`: `null` is an explicit programmer value; `undefined` signals "property absent" or "optional argument omitted." The `T?` shorthand desugars to `T | null`, not `T | null | undefined`. To include `undefined`, write `T | undefined` explicitly.

### `void`

`void` is only valid as a return type annotation. A function returning `void` may return without a value, or return `undefined` implicitly. A `void`-returning function's return value must not be used in an expression context that requires a non-void type.

`void` cannot annotate a variable, parameter, or property.

### `never`

The bottom type. `never` has no values. A function that always throws or never returns has return type `never`. An expression in dead code (unreachable after an exhaustive match or after an unconditional throw) has type `never`.

`never` is the bottom of the subtype lattice: `never <: T` for all types `T`.

Union collapse: `string | never` = `string`. `never | never` = `never`.

### `unknown`

The top type. Every value is assignable to `unknown`. A value of type `unknown` cannot be used in any typed operation without first narrowing it to a more specific type. This is the safe replacement for `dynamic` when you want maximum safety — unlike `dynamic`, no operations are permitted on `unknown` without narrowing.

`T <: unknown` for all types `T`.

---

## Type rules

### Subtype lattice boundaries

```
───────────────── (never-bottom)
never <: T

───────────────── (top-unknown)
T <: unknown
```

### Assignability of primitives

```
Γ ⊢ e : T    T <: U
──────────────────── (assign-sub)
Γ ⊢ e : U

────────────────────── (null-type)
Γ ⊢ null : null

────────────────────── (undefined-type)
Γ ⊢ undefined : undefined
```

### `void` restriction

```
f has declared return type void
Γ ⊢ return e;  in f
───────────────────────────────── (void-return-ok)   iff e : undefined | void

T ≠ void
──────────────────────────────── (void-no-var)
void is not a valid annotation for variables, parameters, or properties   → SJS-E002
```

### `bigint` and `number` isolation

```
Γ ⊢ a : bigint    Γ ⊢ b : number
──────────────────────────────────── (bigint-number-mix)
a + b  → SJS-E005
```

### Union collapse for `never`

```
─────────────────── (never-union-collapse)
T | never  ≡  T
```

---

## JS Lowering (Prototype)

All primitive type annotations are erased. Literals lower verbatim. No runtime type tags are emitted for primitive values.

```sjs
// SJS input
const n: number = 42;
const s: string = "hello";
const b: boolean = true;
const bi: bigint = 100n;
```

```javascript
// JS output (types erased)
const n = 42;
const s = "hello";
const b = true;
const bi = 100n;
```

`void` return type annotation is erased; the function body is emitted unchanged.

`never` return type is erased; the compiler may emit an `unreachable` comment in debug builds.

---

## LLVM Lowering (Future)

| SJS type  | LLVM IR type               | Notes                                      |
|-----------|----------------------------|--------------------------------------------|
| `number`  | `double`                   | IEEE 754 64-bit                            |
| `string`  | `{ i8*, i64 }`             | Fat pointer: data ptr + byte length        |
| `boolean` | `i1`                       | 0 = false, 1 = true                        |
| `bigint`  | `%sjs_bigint*`             | Pointer to GMP-style arbitrary-precision struct |
| `symbol`  | `i64*`                     | Interned pointer; identity = address       |
| `null`    | null pointer (`i8* null`)  | Nullable pointer sentinel                  |
| `undefined` | `i64` sentinel (`0xFFF...`) | Unboxed NaN-box sentinel value           |
| `void`    | `void`                     | No return value instruction                |
| `never`   | `unreachable`              | Compiler inserts `unreachable` instruction |
| `unknown` | `%sjs_any*`                | Boxed tagged value; narrowing inserts type check |

```llvm
; number: double
%n = alloca double
store double 4.200000e+01, double* %n

; string: fat pointer
%sjs_string = type { i8*, i64 }
%s = alloca %sjs_string
; ...populate data and length...

; boolean: i1
%b = alloca i1
store i1 true, i1* %b

; never: unreachable at call site
call void @always_throws()
unreachable
```

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E001` | `null` or `undefined` assigned to a non-nullable type |
| `SJS-E002` | Type mismatch, including `void` used as variable annotation |
| `SJS-E005` | `bigint` and `number` operands mixed in arithmetic |

---

## Examples

### Valid

```sjs
// ✓ All primitive literal forms
const n: number = 1_000_000;
const s: string = "hello";
const b: boolean = false;
const bi: bigint = 9007199254740993n;
const sym: symbol = Symbol("key");
const nothing: null = null;

// ✓ void return type
function log(msg: string): void {
  console.log(msg);
}

// ✓ never in exhaustive branch
function assertNever(x: never): never {
  throw new Error("Unexpected value: " + String(x));
}

// ✓ unknown requires narrowing before use
function process(x: unknown): string {
  if (typeof x === "string") {
    return x.toUpperCase();  // x: string here
  }
  return String(x);
}

// ✓ bigint arithmetic stays within bigint
const sum: bigint = 100n + 200n;

// ✓ union collapse
type A = string | never;  // equivalent to string
```

### Invalid

```sjs
// ✗ SJS-E001: null not assignable to non-nullable
const name: string = null;

// ✗ SJS-E002: void cannot annotate a variable
const result: void = undefined;

// ✗ SJS-E005: bigint + number is forbidden
const bad = 42n + 1;
//               ^ SJS-E005: cannot mix bigint and number

// ✗ SJS-E002: unknown cannot be used without narrowing
function unsafe(x: unknown): number {
  return x + 1;  // SJS-E002: x is unknown; narrow first
}

// ✗ undefined is a reserved identifier — cannot rebind
const undefined = 5;  // SJS-P001: parse error / SJS-E002
```
