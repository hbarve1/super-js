# Super.js Deep Type System Specification

**Document**: `type-system-v2.md`
**Branch**: `001-superjs-core-language`
**Date**: 2026-05-30
**Status**: Authoritative Specification
**Supersedes**: `type-system.md` (which documents the Phase 1 Babel-prototype rules only)

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Type Universe](#2-type-universe)
3. [Null Safety](#3-null-safety)
4. [Sum Types](#4-sum-types)
5. [Structural Interfaces](#5-structural-interfaces)
6. [Record Types](#6-record-types)
7. [Function Types](#7-function-types)
8. [Array and Collections](#8-array-and-collections)
9. [Generics](#9-generics)
10. [Type Compatibility](#10-type-compatibility)
11. [Type Narrowing](#11-type-narrowing)
12. [Type Inference](#12-type-inference)
13. [Excluded Features](#13-excluded-features)
14. [TypeScript Migration Guide](#14-typescript-migration-guide)
15. [Phase 1 Limitations](#15-phase-1-limitations)
16. [Diagnostic Codes Reference](#16-diagnostic-codes-reference)

---

## 1. Philosophy

### 1.1 Why Not TypeScript's Type System

TypeScript's type system was designed with a single, non-negotiable constraint: it must compile to JavaScript, and it must compile *any* JavaScript. This constraint produced a system of remarkable expressive power — mapped types, conditional types, template literal types, `infer`, declaration merging, module augmentation — and a system that is, by design, deliberately unsound.

The TypeScript team has documented this explicitly. TypeScript's goal is not soundness but *productivity*: the system is intentionally unsound in specific places (assignment compatibility of function parameters is bivariant in some contexts, `any` is freely assignable to and from every type, type assertions bypass the checker entirely, the `!` non-null assertion operator is an escape hatch that the checker cannot verify). These are pragmatic choices for a tool whose output is JavaScript.

Super.js takes a different starting position. The long-term goal is a language that compiles to **native machine code via LLVM IR**, where unsoundness becomes not merely imprecise but *dangerous* — it produces miscompiled programs, security vulnerabilities, and undefined behavior. A native compiler requires a sound type system because it makes memory layout decisions, register allocation decisions, and optimization decisions based on type information. If the type system lies, the compiler lies, and the program is wrong.

This does not mean Super.js refuses to interoperate with JavaScript. It means the type system is designed so that every future tightening of the rules produces more safety, never less. The gradualism described in Section 1.2 is a *migration path*, not a permanent state of affairs.

Concretely, Super.js excludes from its type system:

- **`any`** as a user-facing keyword (replaced by `dynamic`, which is tracked and explicit)
- **Bivariant function parameter checking** (parameters are always contravariant)
- **Structural unsoundness in generic variance** (variance is explicit, not inferred by structural walk)
- **Type assertions** (`x as T`) without proof (narrowing must be provable by control flow)
- **Mapped types** (they resist monomorphization; see Section 13)
- **Conditional types** (they are Turing-complete and undecidable for native-code layout; see Section 13)
- **Intersection types as a user-facing feature** (they are structurally equivalent to multi-constraint generics or structural interfaces, which are clearer; `IntersectionType` remains in the internal AST for union normalization)

### 1.2 The Gradual-to-Sound Path

Super.js is a *gradual* type system today and a *sound* type system tomorrow. The path has three phases:

**Phase 1 — Gradual (current, Babel prototype)**
All positions without a type annotation receive the `dynamic` type, which is consistent with every other type (Section 2.10). Type errors are reported only where annotations exist. This allows any JavaScript program to be a valid Super.js program, enabling incremental migration.

**Phase 2 — Strict gradual (--strict flag, near-term)**
When `--strict` is passed, all unannotated positions emit `SJS-W001` (implicit dynamic). The program compiles but the developer is pushed toward full annotation. Gradual rules still apply; `dynamic ~ T` still holds.

**Phase 3 — Sound (LLVM backend, future)**
The LLVM backend requires full type information for every value because it must compute memory layout at compile time. In the LLVM backend, `dynamic` is disallowed. Every position must have a statically-known type. The `dynamic` escape hatch is restricted to an explicit `Dynamic` tagged wrapper type with runtime type tags, which the compiler transforms into a discriminated union over all possible primitive kinds.

This phased approach means the type rules specified in this document are the *Phase 3 ground truth*. The Phase 1 Babel prototype implements a subset (documented in Section 15). Every rule defined here is designed to be implementable in LLVM IR.

### 1.3 The JS-Now, Native-Later Constraint

Every type in Super.js must satisfy two constraints simultaneously:

1. **JS-Now**: It must have a valid JavaScript runtime representation so that the Babel prototype can compile to `.js` files today.
2. **Native-Later**: It must have a valid LLVM IR representation so that the LLVM backend can compile to native code in Phase 3.

This dual constraint is the engineering spine of the type system. It explains why:

- `symbol` is supported (maps to a pointer-to-interned-string in LLVM IR) even though it has no natural numeric representation.
- `bigint` is supported (maps to a GMP-backed arbitrary-precision integer struct in LLVM IR).
- Mapped types are excluded — they require runtime property enumeration, which has no static LLVM IR representation.
- Nominal generics with monomorphization are preferred — the LLVM backend generates one compiled function per concrete type instantiation, as Rust and C++ do.

Every section of this document includes a "LLVM IR (future)" row in type tables. These are design commitments, not implemented features.

### 1.4 Design Principles Summary

| Principle | Implication |
|-----------|-------------|
| Soundness over expressiveness | Exclude constructs that cannot be made sound |
| Monomorphization over erasure | Generics produce one copy per concrete type, not one erased copy |
| Explicit over implicit | `dynamic` is an explicit keyword, not a silent default |
| Structural typing for interfaces, nominal for enums | Interfaces use structural matching; sum types use nominal tags |
| No hidden runtime cost | Every type operation has O(1) or O(n) overhead that is visible in the type annotation |
| ECMA-262 anchored | Every primitive type is grounded in the ECMAScript specification |

---

## 2. Type Universe

The Super.js type universe is a *lattice* with `never` at the bottom, `dynamic` at the top (in the gradual phase), and all concrete types in between. The following subsections define every type in the universe.

### 2.1 `number` — IEEE 754 Double

**ECMA-262 anchor**: §6.1.6.1 — The Number Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type`

**JS runtime representation**: JavaScript `number` — a 64-bit IEEE 754 double-precision floating-point value. This includes `+Infinity`, `-Infinity`, and `NaN` as valid values.

**LLVM IR (future)**: `double` — a 64-bit IEEE 754 double (LLVM type `double`). Operations map directly to LLVM floating-point instructions: `fadd`, `fsub`, `fmul`, `fdiv`, `frem`, `fcmp`.

**Valid literal forms**:
```
42          // integer literal (stored as double)
3.14        // decimal literal
0xFF        // hexadecimal literal
0b1010      // binary literal
0o777       // octal literal
1_000_000   // numeric separator (ES2021)
1e10        // exponential notation
```

**Valid operations**:
| Operator | Result type | ECMAScript section |
|----------|-------------|-------------------|
| `+` `-` `*` `/` `%` `**` | `number` | §13.8, §13.10 |
| `++` `--` (prefix/postfix) | `number` | §13.4, §13.5 |
| Bitwise `&` `|` `^` `~` `<<` `>>` `>>>` | `number` | §13.12 |
| `<` `>` `<=` `>=` | `boolean` | §13.11 |
| `===` `!==` | `boolean` | §13.11 |
| `Math.*` | `number` (varies) | §21.3 |

**Not valid** (compile-time error `SJS-E001`):
```
const n: number = "42"       // string is not number
const n: number = true       // boolean is not number
const n: number = null       // null is not number (use number?)
```

**Special values**: `NaN` and `Infinity` are of type `number`. The type system does not track IEEE 754 exceptional values as distinct types (that would require interval arithmetic, out of scope for v1).

**Notes on integer subsets**: Super.js does not currently define `int`, `uint`, `i32`, etc. as user-facing types. The LLVM backend will introduce these as a performance optimization in Phase 3 (`@native("i32")` annotation), but they are not part of the public type language.

### 2.2 `string` — UTF-16 String

**ECMA-262 anchor**: §6.1.4 — The String Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type`

**JS runtime representation**: JavaScript `string` — an immutable sequence of UTF-16 code units. Length is the number of code units (not Unicode code points for supplementary characters).

**LLVM IR (future)**: A struct `{ ptr: i8*, len: i64 }` — a fat pointer to heap-allocated UTF-8 (note: we convert from JS's UTF-16 to UTF-8 at the native boundary for simplicity; the LLVM runtime library handles the encoding). Short strings (≤ 15 bytes) use small-string optimization with inline storage.

```c
// LLVM IR struct layout (future)
%SjsString = type { i8*, i64, i64 }  ; ptr, len, capacity (or inline[15] + len_byte)
```

**Valid literal forms**:
```
"hello"
'hello'
`hello ${name}`    // template literal — type is string
```

**Valid operations**:
| Operator/Method | Result type | ECMAScript section |
|----------------|-------------|-------------------|
| `+` (concatenation) | `string` | §13.8.1 |
| `===` `!==` | `boolean` | §13.11 |
| `<` `>` `<=` `>=` (lexicographic) | `boolean` | §13.11 |
| `.length` | `number` | §10.1.1 |
| `.charAt(n)` | `string` | §22.1.3.1 |
| `.indexOf(s)` | `number` | §22.1.3.7 |
| `.slice(s, e)` | `string` | §22.1.3.19 |
| `.split(sep)` | `string[]` | §22.1.3.21 |
| `.toLowerCase()` `.toUpperCase()` | `string` | §22.1.3.24 |
| `.trim()` `.trimStart()` `.trimEnd()` | `string` | §22.1.3.28 |
| `.includes(s)` | `boolean` | §22.1.3.6 |
| `.startsWith(s)` `.endsWith(s)` | `boolean` | §22.1.3.5 |

**Template literals**: Template literals (`\`hello ${expr}\``) are type `string`. The embedded expressions may be of any type; they are coerced by `ToString` (§7.1.17) at runtime. Under `--strict`, embedded expressions of type `dynamic` emit `SJS-W002` (untyped template interpolation).

### 2.3 `boolean` — Logical Value

**ECMA-262 anchor**: §6.1.3 — The Boolean Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type`

**JS runtime representation**: JavaScript `boolean` — exactly two values: `true` and `false`.

**LLVM IR (future)**: `i1` — a single bit. In practice, stored as `i8` in memory for alignment but passed as `i1` in registers and in `br` conditions.

**Valid literal forms**:
```
true
false
```

**Valid operations**:
| Operator | Result type | ECMAScript section |
|----------|-------------|-------------------|
| `!` (logical NOT) | `boolean` | §13.5.6 |
| `&&` `||` | `boolean` (or union, see Section 2.9) | §13.13 |
| `===` `!==` | `boolean` | §13.11 |

**Note on truthiness**: Super.js does not expose JavaScript's implicit boolean coercion as a type rule. The type checker does not widen `number | string` to `boolean` at a conditional. Explicit coercion uses `Boolean(x)` (runtime) or `x !== 0 && x !== ""` (typed assertion).

### 2.4 `symbol` — Unique Symbol

**ECMA-262 anchor**: §6.1.5 — The Symbol Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type`

**JS runtime representation**: JavaScript `symbol` — a unique, opaque value created by `Symbol()`. Two symbols are equal only if they are the same symbol reference.

**LLVM IR (future)**: A pointer to an interned string table entry `{ i8* description, u64 id }`. Symbol identity is checked by comparing the `id` field (a monotonically-increasing counter).

**Valid operations**:
| Operation | Result type |
|-----------|-------------|
| `Symbol(description?)` | `symbol` |
| `===` `!==` | `boolean` |
| `typeof x === "symbol"` | narrows to `symbol` |
| As object key | property access |
| `Symbol.for(key)` | `symbol` (global registry) |
| `Symbol.keyFor(sym)` | `string?` |

**No arithmetic**: Arithmetic operators on `symbol` are `SJS-E005` (invalid operation).

### 2.5 `bigint` — Arbitrary-Precision Integer

**ECMA-262 anchor**: §6.1.6.2 — The BigInt Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type`

**JS runtime representation**: JavaScript `bigint` — arbitrary-precision integer. Cannot be mixed with `number` in arithmetic.

**LLVM IR (future)**: A struct pointer `{ u32* digits, u32 len, u8 sign }` backed by a GMP-compatible multi-precision integer library. Arithmetic operations call into the runtime library.

**Valid literal forms**:
```
42n
0xFFn
0b1010n
```

**Valid operations**:
| Operator | Result type | Note |
|----------|-------------|------|
| `+` `-` `*` `/` `%` `**` | `bigint` | Cannot mix with `number` |
| `===` `!==` `<` `>` `<=` `>=` | `boolean` | |
| Bitwise `&` `|` `^` `~` `<<` `>>` | `bigint` | No unsigned right shift `>>>` |
| `typeof x === "bigint"` | narrows to `bigint` | |

**Forbidden mixing**: `42n + 1` is `SJS-E005` (cannot apply `+` to `bigint` and `number`). This mirrors the ECMAScript runtime TypeError.

### 2.6 `void` — Absent Return Value

**ECMA-262 anchor**: §15.8.3 step 3 — absent completion value for void functions.

**JS runtime representation**: `undefined` at runtime (a void function's return expression is absent; JavaScript implicitly returns `undefined`).

**LLVM IR (future)**: LLVM `void` — no value is produced, no register is allocated for the return.

`void` is used exclusively as the return type of functions that produce no meaningful value:

```
function log(msg: string): void {
  console.log(msg)
}
```

**Rules**:
- A `void` function must not contain `return expr` (error `SJS-E002`).
- A bare `return` is allowed in a `void` function (early exit).
- `void` is not assignable to any other type.
- `void` is not a valid variable annotation: `const x: void = undefined` is `SJS-E001`. Use `undefined` instead.

### 2.7 `never` — Bottom Type

**ECMA-262 anchor**: None directly — `never` is a type-theoretic construct.

**JS runtime representation**: No value inhabits `never`. A `never`-typed expression is unreachable code.

**LLVM IR (future)**: Functions returning `never` emit `unreachable` instruction — a trap that terminates the program if executed (useful for assertions and panics in a native context).

**What produces `never`**:
- A function that always throws: `function fail(msg: string): never { throw new Error(msg) }`
- The exhausted branch of a sum-type `match` (Section 4.5)
- An infinite loop: `function loop(): never { while (true) {} }`
- The intersection of disjoint types in narrowing: after `if (x === null && x === undefined)`, `x` is `never` (impossible)

**Assignability**:
- `never` is assignable to every type (`never <: T` for all `T`). This is the bottom type rule.
- No type is assignable to `never` except `never` itself.
- A union containing `never` collapses: `string | never` simplifies to `string`.

**Exhaustiveness checking** (Section 4.5) uses `never` as the proof obligation: if a match arm receives `never`, the pattern is unreachable, confirming exhaustiveness.

### 2.8 `null` — Intentional Absence

**ECMA-262 anchor**: §6.1.2 — The Null Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type`

**JS runtime representation**: JavaScript `null`.

**LLVM IR (future)**: The null pointer `i8* null` (or a tagged union sentinel — see Section 3.4).

`null` is a first-class type in Super.js. A variable of type `string` cannot hold `null`. A variable of type `string?` (nullable string — see Section 3) can hold either a `string` or `null`.

```
const a: string = null       // SJS-E001 — null is not string
const b: string? = null      // ok — string? includes null
const c: string | null = null // ok — explicit union
```

`string?` is syntactic sugar for `string | null` (Section 3.1).

### 2.9 `undefined` — Uninitialized / Optional

**ECMA-262 anchor**: §6.1.1 — The Undefined Type
`https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type`

**JS runtime representation**: JavaScript `undefined`.

**LLVM IR (future)**: For optional struct fields: a tag bit plus the value (or a `Option<T>` tagged union). For function parameters: the parameter is present but holds a sentinel.

`undefined` appears in two contexts:

1. **Optional object properties** (`age?: number` — see Section 6.3): the property may be absent, in which case accessing it yields `undefined`.
2. **Optional function parameters** (`y?: number` — see Section 7.3): the parameter may be absent; within the function body, `y` has type `number | undefined`.

**Explicit undefined annotation**:
```
const x: undefined = undefined   // ok
const y: number | undefined = 42  // ok — union
```

**Identifier `undefined`**: The identifier `undefined` is not a reserved word in ECMAScript (§12.1); it is a property of the global object. Super.js treats it as if it were a reserved word — re-binding `undefined` is `SJS-E006` (cannot redeclare `undefined`).

### 2.10 `dynamic` — The Gradual Type

`dynamic` is the Super.js name for the gradual/dynamic type. It replaces TypeScript's `any` keyword with a more explicit, intention-signaling name.

**ECMA-262 anchor**: None — `dynamic` is a Super.js type-system extension, not an ECMAScript concept.

**JS runtime representation**: Any JavaScript value. When the Babel prototype compiles `dynamic`, it is simply erased (no runtime annotation added). In Phase 3, `dynamic` values carry a runtime type tag for safe dispatch.

**LLVM IR (future)**: A tagged union `{ u8 tag, union { double f64; i8* ptr; i1 b; ... } value }`. The tag identifies which concrete type is held. Operations on `dynamic` values dispatch through a runtime type-switch.

**Consistency rules** (Siek & Taha 2006):
- `dynamic ~ T` holds for all `T`.
- `T ~ dynamic` holds for all `T`.
- `dynamic ~ dynamic` holds trivially.
- Consistency is NOT transitivity: `string ~ dynamic` and `dynamic ~ number` do not imply `string ~ number`.

**Consistency vs. subtyping**: Consistency (`~`) is used for gradual positions. Subtyping (`<:`) is used for sound positions. In Phase 1, all positions use `~`. In Phase 3, only positions explicitly marked `dynamic` use `~`; all others use `<:`.

**Usage**:
```
// Explicit dynamic — gradual escape hatch
function parseJSON(raw: string): dynamic {
  return JSON.parse(raw)
}

// Implicit dynamic — unannotated position
function add(a, b) { return a + b }  // a: dynamic, b: dynamic
```

**`dynamic` is not `any`**: While `dynamic` behaves like TypeScript's `any` in Phase 1, it is tracked differently:
- `dynamic` is always explicit or flagged by `--strict`.
- There is no "implicit dynamic" in Phase 3.
- `dynamic` values carry runtime tags in the LLVM backend.

### 2.11 Type Lattice Summary

```
                     dynamic
                    /       \
               ... (all types) ...
              /         |        \
         number       string    boolean   symbol   bigint   null   undefined
              \         |        /
                    ... ...
                       |
                     never
```

- `never` is the bottom: assignable to everything, nothing assignable to it.
- `dynamic` is the top of the gradual layer: consistent with everything.
- All concrete types are incomparable except through explicit union or structural subtyping rules.

---

## 3. Null Safety

### 3.1 Non-Nullable by Default

In Super.js, every type annotation is **non-nullable by default**. A variable of type `T` cannot hold `null` or `undefined` unless the annotation explicitly includes them.

This is the opposite of JavaScript's runtime behavior (where any variable can hold `null` or `undefined`) and is a deliberate safety choice: the majority of runtime `TypeError: Cannot read properties of null` errors in JavaScript programs are null dereferences that the type system should prevent.

```
const name: string = "Alice"     // ok
const name: string = null        // SJS-E001 — null is not assignable to string
const name: string = undefined   // SJS-E001 — undefined is not assignable to string
```

For the LLVM backend, non-nullable types are represented as bare values (no tag, no pointer indirection), enabling more efficient code generation.

### 3.2 The `T?` Nullable Shorthand

The postfix `?` on a type annotation is syntactic sugar for `T | null`:

```
const name: string? = null      // ok — equivalent to string | null
const age: number? = undefined  // SJS-E001 — undefined is not null
```

`T?` is **not** `T | null | undefined`. To include `undefined`, write `T | undefined` or `T | null | undefined` explicitly.

**Grammar**:
```
Type ::= PrimaryType '?'*
       | PrimaryType ('|' PrimaryType)+
       | PrimaryType ('&' PrimaryType)+   -- internal only, not user-facing
```

**Flattening**: `(string?)?` is normalized to `string?` (i.e., `string | null`). The type checker flattens nested nullable types.

### 3.3 Control Flow Narrowing for Null

The type checker tracks assignments and conditional checks to narrow nullable types within branches. This is called **control flow narrowing** (CFA — Control Flow Analysis).

**Null check patterns that narrow**:

```
function greet(name: string?): string {
  // Type of name here: string | null

  if (name === null) {
    return "Hello, stranger"
    // name would be string here (unreachable after return)
  }

  // Type of name here: string (null eliminated by if-check above)
  return "Hello, " + name
}
```

**Truthiness check** (Phase 2):
```
function greet(name: string?): string {
  if (!name) {
    return "Hello, stranger"
  }
  // name: string here (null is falsy)
  return "Hello, " + name
}
```

**Narrowing scope**: Narrowing is per-branch. After the `if` block, if both branches rejoin (no `return`/`throw`), the type reverts to the pre-narrowed union unless both branches narrow to the same type.

**Phase 1 limitation**: The Babel prototype does not implement CFA. All narrowing in Phase 1 is manual (the developer must use explicit type assertions or restructure code). See Section 15.

### 3.4 Optional Chaining `?.`

The optional chaining operator `?.` (ES2020, ECMA-262 §13.5.6) short-circuits to `undefined` when the left-hand side is `null` or `undefined`.

**Type rule**: If `a: T?` (i.e., `T | null`), then `a?.b` has type `PropType(T, 'b') | undefined`.

```
interface User {
  name: string
  address?: { city: string }
}

const user: User? = getUser()
const city: string | undefined = user?.address?.city
```

**LLVM IR (future)**: Optional chaining compiles to a conditional branch: check the null tag, branch to `undefined` or proceed to the property access.

### 3.5 Nullish Coalescing `??`

The nullish coalescing operator `??` (ES2020, ECMA-262 §13.13) returns the right operand when the left is `null` or `undefined`.

**Type rule**: `a ?? b` where `a: A | null` and `b: B` has type `A | B`.
If `b: A` (same type as the non-null part of `a`), the result type simplifies to `A`.

```
const name: string? = null
const display: string = name ?? "Anonymous"  // ok — string | null ?? string → string
```

**Difference from `||`**: `||` returns the right side for any falsy left side (`0`, `""`, `false`). `??` only returns the right side for `null` or `undefined`. Super.js prefers `??` for null-safety patterns.

### 3.6 Nullish Assignment `??=`

The nullish assignment operator `??=` (ES2021, ECMA-262 §13.15) assigns the right side only if the left side is `null` or `undefined`.

**Type rule**: After `a ??= b` where `a: A?` and `b: A`, the narrowed type of `a` is `A` (non-nullable).

```
let config: Config? = loadConfig()
config ??= defaultConfig()
// Type of config after ??= : Config (narrowed)
```

### 3.7 The Non-Null Assertion `!` — Intentionally Excluded

TypeScript's postfix `!` non-null assertion operator (`value!`) is excluded from Super.js. It is an escape hatch that tells the type checker "trust me, this is not null" without any proof. This is antithetical to null safety: it moves the responsibility from the type system to the developer's correctness guarantee, which is unverifiable.

Instead, use control flow narrowing (Section 3.3) or explicit null checks. If you are calling a function that you know returns a non-null value but whose type says `T?`, either:
1. Update the function's return type to `T`.
2. Use `??` or `?.` to handle the null case explicitly.
3. Use a narrowing check and `throw` on null.

```
// TypeScript: const el = document.getElementById('app')!
// Super.js:
const el: HTMLElement? = document.getElementById('app')
if (el === null) throw new Error("Element not found")
// el: HTMLElement here (narrowed)
```

---

## 4. Sum Types

### 4.1 Motivation

Sum types (also called algebraic data types, discriminated unions, or tagged unions) are the primary mechanism in Super.js for representing values that can be one of several distinct shapes. They replace:
- TypeScript's discriminated union pattern (manual `kind` property)
- TypeScript's `enum` (which has runtime overhead and confusing semantics)
- TypeScript's overloaded function signatures (which are banned — see Section 7.4)

Sum types integrate directly with pattern matching (Section 4.5) and exhaustiveness checking (Section 4.6).

### 4.2 Declaration Syntax

```
type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number }
  | Point
```

**Grammar**:
```
SumTypeDecl ::= 'type' Identifier TypeParams? '='
                ('|' Variant)+

Variant ::= Identifier VariantBody?

VariantBody ::= '{' FieldList '}'           -- struct variant (named fields)
              | '(' TypeList ')'            -- tuple variant (positional fields)

FieldList ::= Field (';' Field)* ';'?

Field ::= Identifier ':' Type
        | Identifier '?:' Type             -- optional field

TypeList ::= Type (',' Type)*

TypeParams ::= '<' TypeParam (',' TypeParam)* '>'
TypeParam  ::= Identifier (':' Constraint)?
Constraint ::= InterfaceType ('&' InterfaceType)*
```

**Variants**:
- **Unit variant**: No body — `| None` — holds no data.
- **Struct variant**: Named fields — `| Circle { radius: number }`.
- **Tuple variant**: Positional fields — `| Pair(string, number)`.

### 4.3 Construction Syntax

Variants are constructed using the variant name as a constructor:

```
const c: Shape = Circle { radius: 5 }
const r: Shape = Rectangle { width: 10; height: 20 }
const p: Shape = Point
```

For tuple variants:
```
type Result<T, E> = | Ok(T) | Err(E)
const success: Result<number, string> = Ok(42)
const failure: Result<number, string> = Err("not found")
```

### 4.4 Runtime Representation

At the JavaScript layer, sum types compile to plain objects with a `_tag` discriminant and positional or named fields:

```javascript
// Compiled JS representation of: Circle { radius: 5 }
{ _tag: "Circle", radius: 5 }

// Compiled JS representation of: Rectangle { width: 10; height: 20 }
{ _tag: "Rectangle", width: 10, height: 20 }

// Compiled JS representation of: Point
{ _tag: "Point" }

// Compiled JS representation of: Ok(42)
{ _tag: "Ok", _0: 42 }

// Compiled JS representation of: Err("not found")
{ _tag: "Err", _0: "not found" }
```

**LLVM IR (future)**: A tagged union struct:
```c
// For Shape
struct Shape {
  uint8_t _tag;          // 0=Circle, 1=Rectangle, 2=Point
  union {
    struct { double radius; } circle;
    struct { double width; double height; } rectangle;
    // Point has no data
  } payload;
};
```

The tag values are assigned in declaration order. Variants are packed to the maximum field size of any variant (union semantics). The compiler may apply layout optimization (most common variant first, etc.) in Phase 3.

### 4.5 Pattern Matching

Sum types are consumed with `match` expressions:

```
const area: number = match shape {
  Circle { radius } => Math.PI * radius * radius
  Rectangle { width; height } => width * height
  Point => 0
}
```

**Grammar**:
```
MatchExpr  ::= 'match' Expr '{' MatchArm+ '}'
MatchArm   ::= Pattern '=>' Expr
             | Pattern '=>' Block

Pattern    ::= VariantPattern
             | '_'                          -- wildcard
             | Identifier                   -- binding (any value, binds name)
             | LiteralPattern               -- string/number/boolean literal

VariantPattern ::= Identifier '{' BindingList? '}'   -- struct variant
                 | Identifier '(' BindingList? ')'   -- tuple variant
                 | Identifier                         -- unit variant

BindingList ::= Binding (';' Binding)*
Binding     ::= Identifier                 -- bind field with same name
              | Identifier ':' Identifier  -- bind field to different name
```

**Match is an expression**: `match` returns a value. All arms must have the same type (or be subtypes of a common type). If arms have different types, the result is their union.

**Pattern variables**: Names in struct destructuring become bindings scoped to that arm:
```
match shape {
  Circle { radius } => radius * 2      // radius: number here
  Rectangle { width; height } => width + height
  Point => 0
}
```

### 4.6 Exhaustiveness Checking

The type checker requires that `match` expressions cover all variants of a sum type. If any variant is uncovered, `SJS-E007` is emitted (non-exhaustive match).

**Proof technique**: After processing all arms, the type checker computes the "remaining" variants not covered by any non-wildcard pattern. If the remaining set is non-empty, the match is non-exhaustive.

**The `never` proof**: In a fully typed context, an impossible branch has type `never`. Exhaustiveness can be manually checked with a helper:

```
function assertNever(x: never): never {
  throw new Error("Exhaustiveness failure: " + JSON.stringify(x))
}

match shape {
  Circle { radius } => radius * radius
  Rectangle { width; height } => width * height
  // Missing Point — SJS-E007 will fire before assertNever is needed
  _ => assertNever(shape)  // if you use wildcard, no SJS-E007 but also no exhaustiveness proof
}
```

**Wildcard `_` suppresses exhaustiveness**: A wildcard arm (`_ =>`) covers all remaining variants. The type checker does not emit `SJS-E007` when a wildcard is present. Developers must choose: exhaustive match (all variants listed, compile-time safety) or wildcard (runtime fallback, no compile-time guarantee).

**Adding variants**: When a new variant is added to a sum type, all non-wildcard match expressions that match that type produce `SJS-E007`. This is the key refactoring safety property: the compiler tells you everywhere you need to handle the new case.

### 4.7 Nested Patterns

Patterns can be nested for deep destructuring:

```
type List<T> = | Nil | Cons(T, List<T>)

function head<T>(list: List<T>): T? {
  return match list {
    Nil => null
    Cons(value, _) => value
  }
}

function secondElement<T>(list: List<T>): T? {
  return match list {
    Cons(_, Cons(second, _)) => second
    _ => null
  }
}
```

### 4.8 Generic Sum Types

Sum types can be parameterized (Section 9):

```
type Option<T> =
  | None
  | Some(T)

type Result<T, E> =
  | Ok(T)
  | Err(E)

type Either<L, R> =
  | Left(L)
  | Right(R)
```

### 4.9 Standard Library: `Option<T>`

`Option<T>` is the canonical nullable type for values that may be absent without using `null`:

```
type Option<T> =
  | None
  | Some(T)

function find<T>(arr: T[], pred: (item: T) => boolean): Option<T> {
  for (const item of arr) {
    if (pred(item)) return Some(item)
  }
  return None
}

const result = find([1, 2, 3], x => x > 2)
match result {
  None => console.log("not found")
  Some(value) => console.log("found: " + value)
}
```

**When to use `T?` vs `Option<T>`**:
- `T?` (nullable): Prefer for interop with JavaScript APIs that return `null`, for optional object properties, and for simple "may be absent" cases. It compiles to a bare `null` check at the JS layer.
- `Option<T>`: Prefer for function return values where the absence is semantically meaningful and you want exhaustive match. It compiles to a tagged object at the JS layer (slightly more overhead, more explicit).

### 4.10 Standard Library: `Result<T, E>`

`Result<T, E>` is the canonical error-as-value type, replacing thrown exceptions for predictable error paths:

```
type Result<T, E> =
  | Ok(T)
  | Err(E)

function parseInt(s: string): Result<number, string> {
  const n = Number(s)
  if (isNaN(n)) return Err("not a number: " + s)
  return Ok(n)
}

match parseInt("42") {
  Ok(value) => console.log("parsed: " + value)
  Err(msg) => console.log("error: " + msg)
}
```

**Chaining**: Result types compose with helper methods (defined in the standard library):

```
// stdlib interface (conceptual)
interface ResultOps<T, E> {
  map<U>(f: (value: T) => U): Result<U, E>
  flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E>
  mapErr<F>(f: (err: E) => F): Result<T, F>
  unwrapOr(default: T): T
  isOk(): boolean
  isErr(): boolean
}
```

---

## 5. Structural Interfaces

### 5.1 Motivation and Structural Typing

Interfaces in Super.js use **structural typing**: a value satisfies an interface if it has all the required fields with compatible types, regardless of whether it explicitly declares that it implements the interface. This is how JavaScript objects naturally work and is consistent with how TypeScript interfaces work.

Structural typing enables duck typing in a type-safe way: you don't need to modify existing code to make it satisfy an interface.

### 5.2 Declaration Syntax

```
interface Serializable {
  serialize(): string
}

interface Printable {
  print(): void
}

interface Animal {
  name: string
  sound: string
  speak(): void
}
```

**Grammar**:
```
InterfaceDecl ::= 'interface' Identifier TypeParams?
                  ('extends' InterfaceType (',' InterfaceType)*)?
                  '{' InterfaceMember* '}'

InterfaceMember ::= MethodSig
                  | PropertySig
                  | IndexSig

PropertySig ::= 'readonly'? Identifier '?'? ':' Type

MethodSig ::= Identifier TypeParams? '(' ParamList ')' ':' ReturnType

IndexSig  ::= '[' Identifier ':' IndexKeyType ']' ':' Type
IndexKeyType ::= 'string' | 'number' | 'symbol'
```

### 5.3 Implicit Satisfaction

Any object literal, class instance, or record value satisfies an interface if it structurally matches:

```
interface Point {
  x: number
  y: number
}

// Object literal satisfies Point implicitly
const p: Point = { x: 1, y: 2 }

// Function accepting Point — any object with x: number and y: number works
function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Inline object satisfies Point at call site
distance({ x: 0, y: 0 }, { x: 3, y: 4 })  // ok
```

### 5.4 Optional `implements` Clause

While satisfaction is implicit, you may declare `implements` explicitly for documentation and to get early errors if the implementation is incomplete:

```
interface Serializable {
  serialize(): string
  deserialize(data: string): void
}

class User implements Serializable {
  name: string

  constructor(name: string) {
    this.name = name
  }

  serialize(): string {
    return JSON.stringify({ name: this.name })
  }

  // Missing deserialize — SJS-E008: User does not implement Serializable.deserialize
}
```

`implements` is checked at the class declaration site. Without `implements`, the check is deferred to usage sites.

### 5.5 Interface Extension

Interfaces may extend other interfaces, adding their members:

```
interface Named {
  name: string
}

interface Aged {
  age: number
}

interface Person extends Named, Aged {
  email: string
}

// Person has: name, age, email
const alice: Person = { name: "Alice", age: 30, email: "alice@example.com" }
```

Extension adds all members of the base interface to the derived interface. If a base interface has a member with the same name, the derived interface must declare a compatible (subtype) type.

### 5.6 Generic Interfaces

Interfaces can be parameterized:

```
interface Container<T> {
  value: T
  map<U>(f: (value: T) => U): Container<U>
}

interface Comparable<T> {
  compareTo(other: T): number   // negative, zero, positive
}

interface Repository<Entity, Id> {
  findById(id: Id): Entity?
  findAll(): Entity[]
  save(entity: Entity): void
  delete(id: Id): void
}
```

### 5.7 Readonly Properties

Interface properties can be marked `readonly`:

```
interface Point {
  readonly x: number
  readonly y: number
}

const p: Point = { x: 1, y: 2 }
p.x = 3   // SJS-E009 — cannot assign to readonly property 'x'
```

`readonly` is a compile-time constraint; it compiles away at runtime (no `Object.freeze` is inserted unless explicitly called).

### 5.8 Vtable Strategy for LLVM

In the LLVM backend, interface dispatch is implemented via a **vtable** (virtual dispatch table) similar to C++ virtual methods or Rust trait objects.

For a function accepting an interface:
```
function speak(animal: Animal): void {
  animal.speak()
}
```

The LLVM backend generates:
1. A vtable struct for `Animal` interface: `{ void (*speak)(void*) }`
2. A fat pointer `{ void* data, AnimalVtable* vtable }` as the function parameter type
3. A concrete vtable for each type that satisfies `Animal`, generated at instantiation site

This is the "dyn trait" model (as in Rust). For generic functions with type constraints (Section 9), monomorphization is used instead (static dispatch, no vtable).

**Performance trade-off**: Vtable dispatch has one pointer indirection but enables polymorphism without code duplication. Monomorphization has zero indirection but duplicates code. The developer chooses: interface parameters use vtables, generic type constraints use monomorphization.

---

## 6. Record Types

### 6.1 Inline Record Types

An inline record (also called an object type literal) describes the shape of an object without giving it a name:

```
const user: { name: string; age: number } = { name: "Alice", age: 30 }
```

### 6.2 Named Record Types with `type`

Named records are aliases for structural object types:

```
type Point = { x: number; y: number }
type Color = { red: number; green: number; blue: number }
type Rect = { origin: Point; size: { width: number; height: number } }
```

`type` creates a structural alias, not a nominal type. Two `type` aliases with the same shape are interchangeable.

### 6.3 Optional Properties

A property marked `?:` is optional — the object may omit it, and accessing it yields `T | undefined`:

```
type Config = {
  host: string
  port?: number   // optional — may be absent
  debug?: boolean
}

const c: Config = { host: "localhost" }         // ok — port and debug omitted
const p: number | undefined = c.port            // type includes undefined
const port: number = c.port ?? 3000             // narrowed to number with default
```

### 6.4 Readonly Properties

Properties marked `readonly` cannot be re-assigned after the object is created:

```
type Point = {
  readonly x: number
  readonly y: number
}

const p: Point = { x: 1, y: 2 }
p.x = 3    // SJS-E009 — cannot assign to readonly property
```

### 6.5 Index Signatures

Index signatures describe objects with arbitrary keys of a given type:

```
type StringMap = { [key: string]: string }
type NumberMap = { [key: string]: number }
type IndexedByNumber = { [index: number]: string }
```

**Type rule**: When a property `p` is accessed on a type with an index signature `[key: string]: T`, the result type is `T | undefined` (the key may not exist). Under `--strict`, accessing indexed properties returns `T | undefined` always; without `--strict`, it returns `T` (gradual — matches JS behavior).

**Known properties + index signature**: A type can have both named properties and an index signature. Named properties must be compatible with the index signature's value type:

```
type Options = {
  timeout: number
  retries: number
  [key: string]: number   // all additional properties must be number
}
```

### 6.6 Nested Records

Record types compose naturally:

```
type Address = {
  street: string
  city: string
  zip: string
  country: string
}

type Contact = {
  name: string
  email: string
  phone?: string
  address: Address
}

const alice: Contact = {
  name: "Alice",
  email: "alice@example.com",
  address: {
    street: "123 Main St",
    city: "Springfield",
    zip: "12345",
    country: "US"
  }
}
```

### 6.7 Spread and Rest (Structural Extension)

Record types can be extended structurally using spread in object literals. The type of the resulting object is the union of all spread fields:

```
type Base = { id: number; name: string }
type Extended = { id: number; name: string; email: string }  // must be declared explicitly

const base: Base = { id: 1, name: "Alice" }
const extended: Extended = { ...base, email: "alice@example.com" }
```

Super.js does not support the TypeScript `&` intersection type at the user-facing type language level. Use explicit type declarations instead of `Base & { email: string }`.

---

## 7. Function Types

### 7.1 Function Type Annotation Syntax

A function type describes the parameter types and return type:

```
(param1: Type1, param2: Type2) => ReturnType
```

**Examples**:
```
const add: (a: number, b: number) => number = (a, b) => a + b
const log: (msg: string) => void = msg => console.log(msg)
const identity: <T>(x: T) => T = x => x
```

### 7.2 Function Declaration Types

Function declarations can include full type annotations:

```
function add(a: number, b: number): number {
  return a + b
}

// Arrow function with annotation
const multiply = (a: number, b: number): number => a * b
```

### 7.3 Optional and Default Parameters

**Optional parameters** (may be omitted at call sites):
```
function greet(name: string, title?: string): string {
  if (title) return "Hello, " + title + " " + name
  return "Hello, " + name
}

greet("Alice")          // ok — title omitted
greet("Alice", "Dr.")   // ok
```

Within the function body, `title` has type `string | undefined`.

**Default parameters** (have a fallback value if omitted):
```
function greet(name: string, title: string = "Mr."): string {
  return "Hello, " + title + " " + name
}

greet("Alice")          // ok — title defaults to "Mr."
greet("Alice", "Dr.")   // ok
```

Within the function body, `title` has type `string` (not `string | undefined`) because the default ensures it is always defined.

### 7.4 No Function Overloads

Super.js **explicitly excludes** function overloads. TypeScript allows:
```typescript
// TypeScript — not valid in Super.js
function parse(input: string): number
function parse(input: number): string
function parse(input: string | number): string | number { ... }
```

The reason for exclusion: function overloads cannot be represented in LLVM IR as a single function — they require either type-dispatch or multiple functions. Since sum types provide a clean solution with exhaustive pattern matching, overloads are unnecessary complexity.

**Super.js equivalent**: Use a sum type for the input:
```
type ParseInput = | FromString(string) | FromNumber(number)

function parse(input: ParseInput): string | number {
  return match input {
    FromString(s) => Number(s)
    FromNumber(n) => String(n)
  }
}
```

Or use separate functions with distinct names:
```
function parseString(input: string): number { ... }
function parseNumber(input: number): string { ... }
```

### 7.5 Higher-Order Functions

Functions are first-class values. Function types can be used as parameter and return types:

```
function map<T, U>(arr: T[], f: (item: T, index: number) => U): U[] {
  return arr.map(f)
}

function compose<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C {
  return (a: A): C => g(f(a))
}

function pipe<T>(...fns: ((x: T) => T)[]): (x: T) => T {
  return (x: T) => fns.reduce((acc, fn) => fn(acc), x)
}
```

### 7.6 Generic Functions

Functions can be parameterized with type variables (Section 9):

```
function identity<T>(x: T): T {
  return x
}

function first<T>(arr: T[]): T? {
  return arr.length > 0 ? arr[0] : null
}
```

### 7.7 Function Variance

Function type variance follows standard type theory:

- **Parameter types are contravariant**: if `B <: A`, then `(A) => R <: (B) => R`. A function expecting a wider input type can be used where a narrower input is expected.
- **Return types are covariant**: if `R <: S`, then `(P) => R <: (P) => S`. A function returning a narrower type can be used where a wider return type is expected.

This is enforced in Phase 3. Phase 1 uses consistency (`~`) which is symmetric.

**Practical implication**:
```
// Animal is a supertype of Dog (structurally)
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// A function that takes Animal can substitute a function that takes Dog
const petAnimal: (a: Animal) => void = (a) => console.log(a.name)
const petDog: (d: Dog) => void = petAnimal  // ok — contravariant
```

---

## 8. Array and Collections

### 8.1 Array Type `T[]` / `Array<T>`

Both syntaxes are equivalent:

```
const nums: number[] = [1, 2, 3]
const strs: Array<string> = ["a", "b", "c"]
```

**Element access**: `arr[i]` returns `T | undefined` under `--strict` (the index may be out of bounds) or `T` without `--strict` (gradual, matches JS behavior).

**LLVM IR (future)**: A struct `{ T* ptr, u64 len, u64 capacity }` — a dynamic array (Vec-like). Element access after bounds check returns `T` directly.

**Array methods** (selected):
```
arr.push(item: T): void
arr.pop(): T | undefined
arr.map<U>(f: (item: T, index: number) => U): U[]
arr.filter(pred: (item: T) => boolean): T[]
arr.reduce<U>(f: (acc: U, item: T) => U, initial: U): U
arr.find(pred: (item: T) => boolean): T | undefined
arr.findIndex(pred: (item: T) => boolean): number
arr.indexOf(item: T): number
arr.includes(item: T): boolean
arr.slice(start: number, end?: number): T[]
arr.sort(comparator?: (a: T, b: T) => number): T[]
arr.forEach(f: (item: T, index: number) => void): void
arr.some(pred: (item: T) => boolean): boolean
arr.every(pred: (item: T) => boolean): boolean
arr.flat<U>(): U[]    // T must be U[] for this to typecheck
arr.flatMap<U>(f: (item: T) => U[]): U[]
arr.concat(...others: T[][]): T[]
arr.join(sep?: string): string
arr.reverse(): T[]     // mutates in place
arr.length: number
```

### 8.2 Readonly Arrays

A readonly array cannot be mutated (no `push`, `pop`, etc.):

```
const nums: readonly number[] = [1, 2, 3]
nums.push(4)   // SJS-E009 — push is not available on readonly number[]
```

`readonly T[]` is equivalent to `ReadonlyArray<T>`. Readonly arrays are covariant (unlike mutable arrays, which are invariant for soundness).

### 8.3 Tuples `[T1, T2, ...]`

Tuples are fixed-length arrays where each position has a specific type:

```
const pair: [string, number] = ["Alice", 30]
const triple: [number, number, number] = [1, 2, 3]
```

**Element access**: `pair[0]` returns `string`, `pair[1]` returns `number`. Out-of-bounds access (`pair[2]`) returns `undefined` (or `SJS-E010` under `--strict`).

**Destructuring**:
```
const [name, age]: [string, number] = ["Alice", 30]
// name: string, age: number
```

**Labeled tuples** (Phase 2):
```
type Point2D = [x: number, y: number]
type RGB = [red: number, green: number, blue: number]
```

**LLVM IR (future)**: A fixed-size struct `{ T1 _0; T2 _1; ... }` — no heap allocation for small tuples.

### 8.4 `Map<K, V>`

A typed map (ES2015 Map):

```
const map: Map<string, number> = new Map()
map.set("a", 1)
map.set("b", 2)
const val: number | undefined = map.get("a")
```

**LLVM IR (future)**: A hash map with open addressing, typed keys and values.

### 8.5 `Set<T>`

A typed set (ES2015 Set):

```
const seen: Set<string> = new Set()
seen.add("hello")
const has: boolean = seen.has("hello")
```

### 8.6 `WeakMap<K extends object, V>` and `WeakSet<T extends object>`

Typed weak collections. Keys must be of object type.

---

## 9. Generics

### 9.1 Generic Type Parameters

Type parameters are introduced with `<T>`:

```
function identity<T>(x: T): T {
  return x
}

interface Box<T> {
  value: T
  map<U>(f: (value: T) => U): Box<U>
}

type Pair<A, B> = { first: A; second: B }
```

### 9.2 Type Constraints `<T: Interface>`

A type parameter can be constrained to types that satisfy an interface:

```
interface HasLength {
  length: number
}

function longest<T: HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}

// Valid calls — string and T[] both have .length
longest("hello", "world")          // T = string
longest([1, 2, 3], [4, 5])        // T = number[]
```

**Constraint syntax**: `T: Interface` uses a colon, not the TypeScript `extends` keyword. This is intentional: `extends` suggests class inheritance, which is a different concept.

### 9.3 Multiple Constraints `T: A & B`

A type parameter can require multiple interface constraints:

```
interface Comparable<T> {
  compareTo(other: T): number
}

interface Printable {
  print(): void
}

function sortAndPrint<T: Comparable<T> & Printable>(items: T[]): void {
  items.sort((a, b) => a.compareTo(b))
  items.forEach(item => item.print())
}
```

Note: `&` here is **constraint intersection** (the type must satisfy both interfaces), not the TypeScript `&` type intersection operator (which is excluded from user-facing type language).

### 9.4 Generic Type Instantiation

Generic types are instantiated at usage sites:

```
const box: Box<number> = { value: 42 }
const pair: Pair<string, number> = { first: "age", second: 30 }
```

Type arguments can often be inferred (Section 12.3):
```
const box = { value: 42 }  // type inferred as { value: number } (or Box<number> if context requires)
```

### 9.5 Monomorphization Strategy

In the LLVM backend, generic functions are **monomorphized** — the compiler generates one concrete function for each unique set of type arguments used in the program. This is the same strategy used by C++ templates and Rust generics.

**Example**:
```
function identity<T>(x: T): T { return x }

identity(42)       // generates: function identity_number(x: double): double { return x }
identity("hello")  // generates: function identity_string(x: SjsString): SjsString { return x }
```

**Advantages of monomorphization**:
- Zero overhead abstraction — generic functions compile to optimal machine code for each type.
- No runtime dispatch or boxing.
- Enables full inlining of small generic functions.

**Disadvantages**:
- Code size growth (one copy per instantiation).
- Compilation time growth (each instantiation is compiled separately).

For interface parameters (vtable dispatch — Section 5.8), the compiler uses a single compiled function with a fat pointer. Developers can choose between the two strategies based on their needs.

### 9.6 Recursive Generics

Recursive generic types are supported:

```
type List<T> = | Nil | Cons(T, List<T>)

type Tree<T> = | Leaf(T) | Branch(Tree<T>, Tree<T>)
```

**LLVM IR (future)**: Recursive types require heap allocation (the type size is not statically computable). The LLVM backend boxes recursive variants: `Cons` contains a `T` value and a `*List<T>` (box pointer).

### 9.7 Variance Annotations (Phase 2)

In Phase 2, generic type parameters can be annotated with explicit variance:

```
// Covariant — T only appears in output positions
interface Producer<out T> {
  produce(): T
}

// Contravariant — T only appears in input positions
interface Consumer<in T> {
  consume(value: T): void
}

// Invariant — T appears in both (default)
interface Container<T> {
  get(): T
  set(value: T): void
}
```

Phase 1 does not implement variance annotations.

---

## 10. Type Compatibility

### 10.1 Assignability Rules

A type `S` is **assignable to** type `T` (written `S <: T`) according to these rules:

1. **Reflexivity**: `T <: T` for all `T`.
2. **Bottom type**: `never <: T` for all `T`.
3. **Dynamic escape**: In gradual mode, `dynamic <: T` and `T <: dynamic` for all `T` (consistency, not subtyping).
4. **Union right**: `S <: T1 | T2` iff `S <: T1` or `S <: T2`.
5. **Union left**: `S1 | S2 <: T` iff `S1 <: T` and `S2 <: T`.
6. **Structural (records)**: `S <: T` for record types iff for all properties `p: P` in `T`, `S` has property `p: Q` and `Q <: P`.
7. **Functions**: `(P1) => R1 <: (P2) => R2` iff `P2 <: P1` (contravariant params) and `R1 <: R2` (covariant return).
8. **Nullable**: `T <: T?` (non-null is assignable to nullable). `T? <: T` is NOT valid.
9. **Arrays (mutable)**: `T[] <: S[]` iff `T = S` (invariant — for soundness).
10. **Arrays (readonly)**: `readonly T[] <: readonly S[]` iff `T <: S` (covariant).
11. **Generics**: `Box<T> <: Box<S>` depends on the declared variance of `T` in `Box` (Section 9.7). Default (invariant): `Box<T> <: Box<S>` iff `T = S`.

### 10.2 Structural Compatibility for Records

Two record types are structurally compatible if one has at least all the properties of the other:

```
type Named = { name: string }
type Person = { name: string; age: number }

const p: Person = { name: "Alice", age: 30 }
const n: Named = p   // ok — Person has all Named's properties (and more)
```

This is called **width subtyping** — a type with more fields is a subtype of a type with fewer fields (it can always substitute the narrower type). The extra fields are simply ignored.

**Property types must be compatible (depth subtyping)**:
```
type Named = { name: string }
type Named2 = { name: string | null }

const n2: Named2 = { name: null }
const n: Named = n2   // SJS-E001 — string | null is not assignable to string
```

### 10.3 Function Variance

As stated in Section 7.7, function parameters are contravariant and return types are covariant. This is enforced by the assignability rule in 10.1.7.

**Practical rule**: When a higher-order function accepts a callback `(Animal) => void`, you can safely pass `(Dog) => void` only if `Animal <: Dog` (contravariance). Since `Dog <: Animal` (Dog is more specific), a `(Dog) => void` callback CANNOT substitute a `(Animal) => void` callback — it might receive a non-Dog Animal and fail.

This is the correct, sound rule. TypeScript's bivariant method checking is a known unsoundness that Super.js corrects.

### 10.4 Gradual `dynamic ~ T` Rule

In the gradual phase (Phase 1), the consistency relation `~` is used instead of subtyping `<:`. The consistency relation is:

```
a ~ b  iff
  a = dynamic, or
  b = dynamic, or
  a = b (structural equality), or
  a <: b (subtyping), or
  b <: a (reverse subtyping — gradual symmetric)
```

Note that consistency is symmetric: `dynamic ~ string` and `string ~ dynamic` are both true. This is weaker than subtyping, which is directional.

In Phase 3 (sound), consistency is replaced by subtyping everywhere. The only remaining use of consistency is at explicit `dynamic` annotations.

### 10.5 `never` as Bottom Type

`never` is the bottom type:
- `never <: T` for all `T`.
- The only type assignable to `never` is `never` itself.
- A union `T | never` simplifies to `T`.
- A function returning `never` never actually returns (it always throws or loops infinitely).

---

## 11. Type Narrowing

Type narrowing is the process by which the type checker refines a variable's type within a conditional branch based on runtime checks. Narrowing makes null safety and sum type pattern matching practical.

### 11.1 Null Checks

**Strict equality check**:
```
function process(value: string?): string {
  if (value === null) {
    return "default"
  }
  // value: string here (narrowed from string | null)
  return value.toUpperCase()
}
```

**Loose null/undefined check** (narrows out both):
```
function process(value: string | null | undefined): string {
  if (value == null) {  // == checks both null and undefined
    return "default"
  }
  // value: string here
  return value
}
```

### 11.2 `typeof` Narrowing

The `typeof` operator narrows to primitive types:

```
function format(value: string | number): string {
  if (typeof value === "string") {
    // value: string here
    return value.toUpperCase()
  }
  // value: number here
  return value.toFixed(2)
}
```

`typeof` narrows:
| `typeof x === "string"` | x is `string` |
| `typeof x === "number"` | x is `number` |
| `typeof x === "boolean"` | x is `boolean` |
| `typeof x === "symbol"` | x is `symbol` |
| `typeof x === "bigint"` | x is `bigint` |
| `typeof x === "undefined"` | x is `undefined` |
| `typeof x === "function"` | x is a function type |
| `typeof x === "object"` | x is a non-null object (note: `typeof null === "object"` in JS — explicitly handled) |

### 11.3 Match Exhaustive Narrowing

Pattern matching (Section 4.5) performs narrowing within each arm:

```
type Shape = | Circle { radius: number } | Rectangle { width: number; height: number }

function area(shape: Shape): number {
  return match shape {
    Circle { radius } => {
      // shape: Circle here, radius: number
      Math.PI * radius * radius
    }
    Rectangle { width; height } => {
      // shape: Rectangle here, width: number, height: number
      width * height
    }
  }
}
```

After the match, `shape` is narrowed to `never` (all variants exhausted).

### 11.4 `_tag` Narrowing (Manual, Phase 1)

Before Phase 2 implements full pattern matching, developers can use the compiled `_tag` property for manual narrowing in JavaScript-layer code:

```
type Shape = | Circle { radius: number } | Rectangle { width: number; height: number }

// Manual JS-style narrowing (works in Phase 1 gradual mode)
function area(shape: Shape): number {
  if (shape._tag === "Circle") {
    return Math.PI * shape.radius * shape.radius
  }
  return shape.width * shape.height
}
```

This is less safe (no exhaustiveness checking) but works in Phase 1 where match is not yet fully implemented.

### 11.5 `instanceof` Narrowing

For class instances, `instanceof` narrows to the class type:

```
class Dog {
  breed: string
  constructor(breed: string) { this.breed = breed }
}

class Cat {
  indoor: boolean
  constructor(indoor: boolean) { this.indoor = indoor }
}

type Pet = Dog | Cat

function describe(pet: Pet): string {
  if (pet instanceof Dog) {
    // pet: Dog here
    return "Dog, breed: " + pet.breed
  }
  // pet: Cat here
  return "Cat, indoor: " + pet.indoor
}
```

### 11.6 User-Defined Type Guards (Phase 2)

In Phase 2, functions can declare that they narrow a type:

```
function isString(x: string | number): x is string {
  return typeof x === "string"
}

function process(value: string | number): void {
  if (isString(value)) {
    // value: string here
    console.log(value.toUpperCase())
  }
}
```

Phase 1 does not implement user-defined type guards.

### 11.7 Narrowing After Assignment

After a variable is assigned a more specific type, the narrowed type persists until the next assignment:

```
let x: string | number = "hello"
// x: string here (narrowed by literal assignment)

x = 42
// x: number here (narrowed by numeric assignment)

x = Math.random() > 0.5 ? "hi" : 1
// x: string | number here (union — both branches possible)
```

---

## 12. Type Inference

### 12.1 Variable Declaration Inference

When a variable is declared without an annotation, its type is inferred from the initializer:

```
const name = "Alice"     // inferred: string
const age = 30           // inferred: number
const active = true      // inferred: boolean
const scores = [1, 2, 3] // inferred: number[]
```

**Phase 1 behavior**: In Phase 1 (Babel prototype), unannotated variables receive `dynamic` (not the inferred type). True inference is a Phase 2 feature.

**Phase 2 inference rules**:
- Literal `"hello"` → `string` (or `"hello"` literal type — Phase 3)
- Literal `42` → `number`
- Literal `true`/`false` → `boolean`
- Array `[1, 2, 3]` → `number[]` (element types unified)
- Object `{ a: 1, b: "x" }` → `{ a: number; b: string }`
- `null` → `null` (not `T | null` — context-dependent widening)

### 12.2 Function Return Type Inference

If a function has no declared return type, the return type is inferred from the return statements:

```
function add(a: number, b: number) {
  return a + b   // inferred return type: number
}

function greet(name: string) {
  if (name) return "Hello, " + name  // inferred: string
  return null                         // inferred: null
}
// greet inferred return type: string | null
```

**Phase 1 behavior**: In Phase 1, unannotated return types are `dynamic`. The inference described above is Phase 2.

### 12.3 Generic Instantiation Inference

When a generic function is called, type arguments are inferred from the value arguments:

```
function identity<T>(x: T): T { return x }

const n = identity(42)      // T = number, result: number
const s = identity("hi")    // T = string, result: string

function pair<A, B>(a: A, b: B): [A, B] { return [a, b] }

const p = pair(1, "hello")  // A = number, B = string, result: [number, string]
```

**Inference algorithm**: Unification — collect constraints `T = ActualArgType` for each generic parameter, then solve the constraint system. If constraints are contradictory, emit `SJS-E011` (cannot infer type argument).

### 12.4 Sum Type Construction Inference

When constructing a sum type variant, the surrounding type context provides the expected sum type:

```
type Shape = | Circle { radius: number } | Rectangle { width: number; height: number }

const s: Shape = Circle { radius: 5 }
// The `: Shape` annotation provides context; Circle is resolved as a Shape variant
```

Without context, the constructor produces the singleton type `Circle` which is assignable to `Shape`.

### 12.5 Contextual Typing

In certain positions, the expected type flows inward to help infer types:

```
const nums: number[] = [1, 2, 3]   // elements inferred as number from number[] context

// Callback contextual typing
[1, 2, 3].map(x => x * 2)  // x inferred as number from number[].map callback signature
```

---

## 13. Excluded Features

This section documents features present in TypeScript that are intentionally excluded from Super.js, with rationale grounded in the JS-now/native-later design constraint.

### 13.1 `any` — Replaced by `dynamic`

**TypeScript**: `any` silently suppresses all type errors. It is implicit by default for unannotated positions.

**Why excluded**: `any` is invisible — developers don't know they are using it. `dynamic` is explicit and tracked. In Phase 3, `dynamic` carries a runtime type tag; `any` in TypeScript carries nothing at runtime. The semantic difference matters for the LLVM backend.

**Super.js equivalent**: `dynamic` (explicit, tracked, carries runtime information in Phase 3).

### 13.2 Mapped Types

**TypeScript**: `{ [K in keyof T]: T[K] }` — transform all properties of a type.

**Why excluded**: Mapped types require iterating over a type's property set at compile time, which has no direct LLVM IR equivalent. The LLVM compiler must know the concrete layout of every type at compile time; mapped types produce types whose layouts are only determined by their input type. In the LLVM backend, this would require runtime type reflection, which is expensive and contrary to the zero-cost abstraction goal.

**Super.js equivalent**: Explicit type declarations. If you need `Partial<T>`, declare the partial type explicitly or use an interface with all-optional properties. For common patterns (`Partial`, `Required`, `Readonly`, `Pick`, `Omit`), Super.js provides these as built-in syntax constructs (Phase 2) rather than computed types.

### 13.3 Conditional Types

**TypeScript**: `T extends U ? X : Y` — compute a type based on a type-level predicate.

**Why excluded**: Conditional types are Turing-complete — TypeScript's type system can express arbitrary computation. This means type-checking is undecidable in general. For a native compiler that must terminate type checking in bounded time and produce fixed-size type representations for LLVM IR layout, Turing-completeness is unacceptable.

**Super.js equivalent**: Generic constraints (`T: Interface`) express most of what conditional types do for type-safe dispatch. Sum types handle the "if this shape, then this type" pattern. Type-level computation is intentionally not supported.

### 13.4 Template Literal Types

**TypeScript**: `` `hello_${string}` `` as a type — string patterns as types.

**Why excluded**: Template literal types represent infinite sets of strings, which cannot be directly represented in LLVM IR as a concrete type. They are useful for TypeScript's type-level string manipulation (building property names from patterns) but those patterns are incompatible with static memory layout.

**Super.js equivalent**: Regular `string` type. If you need to validate string patterns, use runtime validation (e.g., a branded type — Phase 3).

### 13.5 TypeScript `enum`

**TypeScript**: `enum Direction { Up, Down, Left, Right }` — a nominal set of named constants.

**Why excluded**: TypeScript enums compile to JavaScript objects with bidirectional mapping (`Direction[Direction.Up] === "Up"`). This runtime representation is surprising, has string-to-value mapping overhead, and is often misused. Const enums (`const enum`) are better but have their own pitfalls with isolated modules.

**Super.js equivalent**: Sum types with unit variants:
```
type Direction = | Up | Down | Left | Right
```
This is cleaner, has exhaustive pattern matching, and compiles to simple `_tag` string comparisons at the JS layer or integer tags in LLVM IR.

### 13.6 `namespace` and Module Augmentation

**TypeScript**: `namespace Foo { ... }` and `declare module "foo" { ... }` for organizational grouping and library augmentation.

**Why excluded**: Namespaces are a TypeScript-specific module system that predates ES modules. ES modules (`import`/`export`) are the standard, and Super.js uses them exclusively. Module augmentation (adding properties to third-party modules) is incompatible with the closed-world assumption the LLVM backend requires.

**Super.js equivalent**: ES module `export` and `import`. For organizing related types, use standard module files.

### 13.7 `infer` in Conditional Types

**TypeScript**: `T extends Array<infer U> ? U : never` — extract a type from another type.

**Why excluded**: `infer` is part of the conditional type system, which is excluded entirely (Section 13.3). Additionally, `infer` requires the type checker to solve type equations whose solutions may not be unique or bounded.

**Super.js equivalent**: Generic type parameters with constraints. If you want "the element type of an array," use a generic function: `function first<T>(arr: T[]): T? { ... }`. The type `T` is inferred by the caller.

### 13.8 `&` Intersection Types (User-Facing)

**TypeScript**: `A & B` — a type that is both A and B simultaneously.

**Why excluded from user-facing syntax**: Intersection types on record types can be emulated by listing all the fields explicitly or by interface extension. The semantics of intersecting function types or primitive types are confusing and rarely the intent. For the LLVM backend, intersection types would require computing the merged memory layout of two types, which is structurally equivalent to defining a single type with all the merged fields.

**Internal use**: `IntersectionType` remains in the Super.js internal AST as a normalization target for union types (the distributive law: `(A | B) & C = (A & C) | (B & C)`). It is not exposed to users.

**Super.js equivalent**: Interface extension (`interface C extends A, B { ... }`) or explicit record merging (`type C = { all fields of A and B }`).

---

## 14. TypeScript Migration Guide

This section provides a reference table for developers migrating TypeScript code to Super.js.

### 14.1 Primitive Type Mapping

| TypeScript | Super.js | Notes |
|------------|----------|-------|
| `number` | `number` | Identical |
| `string` | `string` | Identical |
| `boolean` | `boolean` | Identical |
| `symbol` | `symbol` | Identical |
| `bigint` | `bigint` | Identical |
| `null` | `null` | Identical |
| `undefined` | `undefined` | Identical |
| `void` | `void` | Identical (return type only) |
| `never` | `never` | Identical |
| `any` | `dynamic` | Keyword change; semantics the same in Phase 1 |
| `unknown` | No equivalent | Use `dynamic` with explicit narrowing |
| `object` | Record type or interface | No `object` catch-all |

### 14.2 Composite Type Mapping

| TypeScript pattern | Super.js equivalent | Notes |
|-------------------|---------------------|-------|
| `string \| null` | `string?` or `string \| null` | Both work |
| `T \| undefined` | `T \| undefined` | No shorthand for undefined-nullable |
| `string \| number \| boolean` | `string \| number \| boolean` | Identical |
| `Array<T>` | `T[]` or `Array<T>` | Both work |
| `T[]` | `T[]` | Identical |
| `[string, number]` | `[string, number]` | Identical |
| `Readonly<T>` | `readonly T[]` (for arrays) or interface with `readonly` fields | |
| `Partial<T>` | Declare interface with all-`?` fields | No built-in `Partial` in Phase 1 |
| `Required<T>` | Declare interface without `?` fields | No built-in `Required` in Phase 1 |
| `Record<K, V>` | `{ [key: K]: V }` | Index signature syntax |
| `Map<K, V>` | `Map<K, V>` | Identical |
| `Set<T>` | `Set<T>` | Identical |

### 14.3 Function Type Mapping

| TypeScript pattern | Super.js equivalent | Notes |
|-------------------|---------------------|-------|
| `(a: T) => R` | `(a: T) => R` | Identical |
| `function f(a: T): R` | `function f(a: T): R` | Identical |
| `function f(a: T, b?: U): R` | `function f(a: T, b?: U): R` | Identical |
| `function f(a: T, b: U = v): R` | `function f(a: T, b: U = v): R` | Identical |
| Function overloads | Sum types + `match` | See Section 7.4 |
| `(...args: T[]): R` | `(...args: T[]): R` | Rest parameters identical |

### 14.4 Interface and Class Mapping

| TypeScript pattern | Super.js equivalent | Notes |
|-------------------|---------------------|-------|
| `interface Foo { ... }` | `interface Foo { ... }` | Identical |
| `interface Foo extends Bar { ... }` | `interface Foo extends Bar { ... }` | Identical |
| `class Foo implements Bar { ... }` | `class Foo implements Bar { ... }` | Identical |
| `interface Foo<T> { ... }` | `interface Foo<T> { ... }` | Identical |
| `interface Foo<T extends Bar> { ... }` | `interface Foo<T: Bar> { ... }` | Colon syntax instead of `extends` |
| `type Foo = { ... }` | `type Foo = { ... }` | Identical (structural alias) |
| `readonly prop: T` | `readonly prop: T` | Identical |
| `prop?: T` | `prop?: T` | Identical |

### 14.5 Generic Mapping

| TypeScript pattern | Super.js equivalent | Notes |
|-------------------|---------------------|-------|
| `function f<T>(x: T): T` | `function f<T>(x: T): T` | Identical |
| `function f<T extends Bar>(x: T): T` | `function f<T: Bar>(x: T): T` | Colon instead of `extends` |
| `function f<T extends A & B>(x: T)` | `function f<T: A & B>(x: T)` | `&` in constraints is allowed |
| `Array<T>` | `T[]` or `Array<T>` | Both work |

### 14.6 Discriminated Union / Enum Migration

| TypeScript pattern | Super.js equivalent |
|-------------------|---------------------|
| `enum Color { Red, Green, Blue }` | `type Color = \| Red \| Green \| Blue` |
| `const enum Direction { Up, Down }` | `type Direction = \| Up \| Down` |
| Manual discriminated union | Sum type declaration |

**TypeScript discriminated union**:
```typescript
// TypeScript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2
    case "rect": return s.width * s.height
  }
}
```

**Super.js sum type**:
```
// Super.js
type Shape =
  | Circle { radius: number }
  | Rect { width: number; height: number }

function area(s: Shape): number {
  return match s {
    Circle { radius } => Math.PI * radius ** 2
    Rect { width; height } => width * height
  }
}
```

### 14.7 Excluded TypeScript Features — Alternatives

| TypeScript feature | Reason excluded | Super.js alternative |
|-------------------|-----------------|---------------------|
| `any` (implicit) | Invisible, untraceable | `dynamic` (explicit only) |
| Type assertions `x as T` | Unsound escape hatch | Control flow narrowing, match |
| Non-null assertion `x!` | Unverifiable guarantee | Null check + narrowing |
| `enum` | Runtime overhead, confusing reverse mapping | Sum types with unit variants |
| `namespace` | Replaced by ES modules | ES module `export`/`import` |
| Mapped types | Undecidable layout for LLVM | Explicit type declarations |
| Conditional types | Turing-complete, undecidable | Generic constraints |
| `infer` | Part of excluded conditional types | Generic type parameters |
| Template literal types | Infinite string sets | `string` type + runtime validation |
| `&` intersection (user) | Same as explicit merged interface | Interface extension |
| Function overloads | Cannot have multiple LLVM IR signatures | Sum types + match |
| Declaration merging | Closed-world assumption violated | Single source of truth per type |
| Module augmentation | Closed-world assumption violated | Type-safe wrapper modules |
| `satisfies` operator | Gradual workaround not needed | Explicit type annotations |

---

## 15. Phase 1 Limitations

Phase 1 is the Babel-prototype implementation in `prototype/src/typeChecker/`. It implements a subset of the rules in this document. This section documents exactly what is and is not checked in Phase 1.

### 15.1 What Phase 1 Checks

| Rule | Code | Phase 1 Status |
|------|------|----------------|
| TC-001: Primitive type annotations | `SJS-E001` | Implemented |
| TC-002: null/undefined assignability | `SJS-E001` | Implemented |
| TC-003: Gradual typing (`dynamic ~ T`) | (no code) | Implemented (implicit any) |
| TC-004: Variable declaration and re-assignment | `SJS-E001` | Implemented |
| TC-005: Function return type | `SJS-E002` | Implemented |
| TC-006: Function call argument types | `SJS-E003` | Implemented |
| TC-007: Union types (basic) | `SJS-E001` | Implemented (consistency only) |
| TC-008: Strict mode implicit-any warning | `SJS-W001` | Implemented |
| Circular import detection | `SJS-E004` | Implemented (watch mode) |

### 15.2 What Phase 1 Does Not Check

| Feature | Section | Phase | Notes |
|---------|---------|-------|-------|
| Null safety (non-nullable default) | 3.1 | Phase 2 | Phase 1 allows null anywhere |
| `T?` shorthand | 3.2 | Phase 2 | Parsed but treated as `T \| null` union |
| Control flow narrowing | 3.3, 11 | Phase 2 | No CFA in Phase 1 |
| Optional chaining `?.` type rule | 3.4 | Phase 2 | Compiled correctly; not type-checked |
| Nullish coalescing `??` type rule | 3.5 | Phase 2 | Compiled correctly; not type-checked |
| Sum type declaration | 4.2 | Phase 2 | No sum type syntax in Phase 1 |
| Pattern matching `match` | 4.5 | Phase 2 | No `match` in Phase 1 |
| Exhaustiveness checking | 4.6 | Phase 2 | |
| `Option<T>` / `Result<T, E>` stdlib | 4.9, 4.10 | Phase 2 | |
| Structural interfaces (full) | 5 | Phase 2 | Interfaces parsed; minimal checking |
| Record type checking | 6 | Phase 2 | Object types partially checked |
| Optional properties | 6.3 | Phase 2 | |
| Readonly properties | 6.4, 6.7 | Phase 2 | |
| Index signatures | 6.5 | Phase 2 | |
| Function variance | 7.7, 10.3 | Phase 3 | Phase 1 uses consistency |
| `Map<K,V>`, `Set<T>` | 8.4, 8.5 | Phase 2 | |
| Tuple types | 8.3 | Phase 2 | |
| Readonly arrays | 8.2 | Phase 2 | |
| Generics | 9 | Phase 2 | `<T>` syntax parsed; treated as dynamic |
| Type constraints `<T: Interface>` | 9.2 | Phase 2 | |
| Monomorphization | 9.5 | Phase 3 | LLVM backend |
| Variance annotations | 9.7 | Phase 2 | |
| Subtyping rules (full) | 10.1 | Phase 3 | Phase 1 uses consistency |
| Structural record subtyping | 10.2 | Phase 2 | |
| Type inference (beyond dynamic) | 12 | Phase 2 | Phase 1: all unannotated = dynamic |
| Generic instantiation inference | 12.3 | Phase 2 | |
| Contextual typing | 12.5 | Phase 2 | |
| User-defined type guards | 11.6 | Phase 2 | |
| `instanceof` narrowing | 11.5 | Phase 2 | |
| `_tag` narrowing | 11.4 | Phase 1 (manual) | Gradual — user manually checks _tag |

### 15.3 Phase 1 Type Checker Architecture

The Phase 1 type checker (`prototype/src/typeChecker/index.ts`) uses the following approach:

**Algorithm**: Bidirectional type checking with gradual typing.
- **Synthesis** (bottom-up): `inferExprType(node, env)` derives a type from an expression.
- **Checking** (top-down): `isConsistent(inferred, declared)` verifies consistency.
- **Environment**: `TypeEnvironment` — a `Map<string, Type>` from identifier names to their types.

**Key design decisions in Phase 1**:
1. The environment is flat (no lexical scoping chains) — the Babel traverse visits nodes, and the checker manages a single flat environment.
2. Consistency (`~`) is used everywhere instead of subtyping (`<:`).
3. All unannotated positions receive `dynamic` (the `T_ANY` constant).
4. Unknown type annotations (anything not recognized by `resolveType`) fall back to `dynamic`.
5. Object types (`ObjectType`) have a `properties: Map<string, Type>` but property-level type checking is not yet wired up.

**Known gaps in Phase 1 checker**:
- `inferExprType` does not handle binary expressions, member expressions, or call expression results — they all return `dynamic`.
- The environment is not reset between top-level declarations, which can cause false positives if two different functions declare the same local variable name.
- Arrow functions inside other functions inherit the outer environment without a fresh scope.
- The `isConsistent` function's union handling is simplified — `union ~ union` always returns `true` instead of checking element-wise compatibility.

### 15.4 Diagnostic Codes — Phase 1

All diagnostics emitted by the Phase 1 prototype:

| Code | Severity | Rule | Message Pattern |
|------|----------|------|-----------------|
| `SJS-E001` | error | TC-001, TC-002, TC-004 | Cannot assign type 'X' to 'Y' |
| `SJS-E002` | error | TC-005 | Return type mismatch |
| `SJS-E003` | error | TC-006 | Argument type mismatch or missing argument |
| `SJS-E004` | error | Import graph | Circular import detected |
| `SJS-W001` | warning | TC-008 | Implicit `dynamic` (unannotated binding) |

---

## 16. Diagnostic Codes Reference

This section is the authoritative diagnostic code table for all Super.js phases.

### 16.1 Errors

| Code | Phase | Short name | Description |
|------|-------|-----------|-------------|
| `SJS-E001` | 1 | type-mismatch | A value of type `X` is not assignable to `Y` |
| `SJS-E002` | 1 | return-type-mismatch | Function's actual return type does not match declared return type |
| `SJS-E003` | 1 | argument-type-mismatch | Argument type does not match parameter type, or argument missing |
| `SJS-E004` | 1 | circular-import | Circular module dependency detected |
| `SJS-E005` | 2 | invalid-operation | Operator not applicable to the given type(s) |
| `SJS-E006` | 2 | redeclare-builtin | Cannot redeclare built-in identifier (`undefined`, `null`, `NaN`, `Infinity`) |
| `SJS-E007` | 2 | non-exhaustive-match | Match expression does not cover all variants of the sum type |
| `SJS-E008` | 2 | missing-implements | Class declares `implements` but does not provide required members |
| `SJS-E009` | 2 | readonly-assign | Cannot assign to a readonly property |
| `SJS-E010` | 2 | tuple-index-oob | Tuple index is out of bounds |
| `SJS-E011` | 2 | cannot-infer-type | Type argument cannot be inferred from usage; provide it explicitly |
| `SJS-E012` | 2 | null-deref | Potential null dereference without a null check |
| `SJS-E013` | 2 | unknown-type | Unknown type name in annotation |
| `SJS-E014` | 2 | variance-violation | Generic type used in a position that violates its variance annotation |
| `SJS-E015` | 3 | dynamic-in-strict-context | `dynamic` type used in a position that requires a statically-known type (LLVM mode) |

### 16.2 Warnings

| Code | Phase | Short name | Description |
|------|-------|-----------|-------------|
| `SJS-W001` | 1 | implicit-dynamic | Binding implicitly has type `dynamic` (unannotated in `--strict` mode) |
| `SJS-W002` | 2 | untyped-interpolation | Template literal interpolates a `dynamic` expression in `--strict` mode |
| `SJS-W003` | 2 | unused-variable | Variable declared but never used |
| `SJS-W004` | 2 | unused-import | Import binding never used |
| `SJS-W005` | 2 | unreachable-code | Code is unreachable (follows a `return`, `throw`, or `never`-typed expression) |
| `SJS-W006` | 2 | shadowed-variable | Variable declaration shadows an outer scope binding |
| `SJS-W007` | 2 | missing-return | Not all code paths return a value in a non-void function |
| `SJS-W008` | 2 | dynamic-spread | Spreading a `dynamic` value into a typed record — field types unknown |

### 16.3 Diagnostic Structure

Every diagnostic includes:

```typescript
interface Diagnostic {
  code: string            // "SJS-E001"
  severity: 'error' | 'warning' | 'note'
  message: string         // plain English, names types by kind
  file?: string           // source file path
  line: number            // 1-based line number
  column: number          // 0-based column (Babel convention)
  endLine?: number        // end of diagnostic span (for IDE highlighting)
  endColumn?: number
  specUrl: string         // authoritative spec anchor for this rule
  hint?: string           // optional suggestion for how to fix
  relatedInfo?: Array<{   // cross-file context (Phase 2)
    file: string
    line: number
    message: string
  }>
}
```

### 16.4 Diagnostic Format

**Text format** (human-readable, Phase 1):
```
error[SJS-E001]: I cannot assign a value of type 'string' to a variable declared as 'number'.
  --> src/app.sjs:5:12
   |
 5 | const x: number = "hello"
   |                   ^^^^^^^ string
   |
   = spec: https://tc39.es/ecma262/#sec-let-and-const-declarations
```

**JSON format** (`--json` flag, SARIF-compatible):
```json
{
  "code": "SJS-E001",
  "severity": "error",
  "message": "I cannot assign a value of type 'string' to a variable declared as 'number'.",
  "file": "src/app.sjs",
  "line": 5,
  "column": 18,
  "endLine": 5,
  "endColumn": 25,
  "specUrl": "https://tc39.es/ecma262/#sec-let-and-const-declarations"
}
```

---

## Appendix A: Grammar Summary

```
Program          ::= Statement*

Statement        ::= VarDecl | FuncDecl | TypeDecl | InterfaceDecl
                   | MatchStmt | ExprStmt | ReturnStmt | IfStmt
                   | ForStmt | WhileStmt | ImportDecl | ExportDecl
                   | BlockStmt

VarDecl          ::= ('const' | 'let' | 'var') Identifier TypeAnnotation? '=' Expr ';'?

FuncDecl         ::= 'function' Identifier TypeParams? '(' ParamList ')' TypeAnnotation? Block

TypeDecl         ::= 'type' Identifier TypeParams? '=' (Type | SumTypeBody)

SumTypeBody      ::= ('|' Variant)+

InterfaceDecl    ::= 'interface' Identifier TypeParams?
                     ('extends' InterfaceType (',' InterfaceType)*)?
                     '{' InterfaceMember* '}'

TypeAnnotation   ::= ':' Type

Type             ::= PrimaryType '?'?
                   | Type '|' Type
                   | '(' ParamList ')' '=>' Type    -- function type
                   | '[' TypeList ']'                -- tuple type
                   | 'readonly' Type

PrimaryType      ::= 'number' | 'string' | 'boolean' | 'symbol' | 'bigint'
                   | 'void' | 'never' | 'null' | 'undefined' | 'dynamic'
                   | Identifier TypeArgs?            -- named type or generic instantiation
                   | '{' FieldList '}'               -- inline record
                   | Type '[]'                       -- array
                   | 'Map' '<' Type ',' Type '>'
                   | 'Set' '<' Type '>'

TypeArgs         ::= '<' Type (',' Type)* '>'

TypeParams       ::= '<' TypeParam (',' TypeParam)* '>'
TypeParam        ::= Identifier (':' Constraint)?
Constraint       ::= InterfaceType ('&' InterfaceType)*

MatchExpr        ::= 'match' Expr '{' MatchArm+ '}'
MatchArm         ::= Pattern '=>' (Expr | Block)

Pattern          ::= Identifier '{' BindingList? '}'
                   | Identifier '(' BindingList? ')'
                   | Identifier
                   | '_'
                   | StringLiteral | NumericLiteral | BooleanLiteral
```

---

## Appendix B: Type System Formal Rules

For reference, the key typing judgments used in the Super.js type system:

```
Γ ⊢ e : T          "In environment Γ, expression e has type T" (synthesis)
Γ ⊢ e ≤ T          "In environment Γ, expression e checks against type T" (checking)
S <: T              "Type S is a subtype of T" (subtyping)
S ~ T               "Type S is consistent with T" (gradual)

Synthesis rules (selected):

  Γ ⊢ n : number              (numeric literal)
  Γ ⊢ s : string              (string literal)
  Γ ⊢ b : boolean             (boolean literal)
  Γ ⊢ null : null             (null literal)

  x : T ∈ Γ
  ──────────────
  Γ ⊢ x : T                  (identifier lookup)

  Γ, x₁: T₁, ..., xₙ: Tₙ ⊢ body : R
  ─────────────────────────────────────────
  Γ ⊢ (x₁: T₁, ..., xₙ: Tₙ) => body : (T₁, ..., Tₙ) => R    (arrow function)

Subtyping rules (selected):

  ──────────
  never <: T                  (bottom)

  ──────────
  T <: T                      (reflexivity)

  S <: T₁
  ───────────────────
  S <: T₁ | T₂               (union right — left branch)

  S₁ <: T    S₂ <: T
  ───────────────────
  S₁ | S₂ <: T               (union left)

  ∀ (p: P) ∈ T. ∃ (p: Q) ∈ S. Q <: P
  ──────────────────────────────────────
  S <: T                      (record width + depth subtyping)

  P₂ <: P₁    R₁ <: R₂
  ──────────────────────────────────────
  (P₁) => R₁ <: (P₂) => R₂  (function variance — contra/covariant)

Gradual consistency rules:

  ───────────
  dynamic ~ T                 (dynamic is consistent with everything)

  ───────────
  T ~ dynamic                 (everything is consistent with dynamic)

  S <: T
  ───────────
  S ~ T                       (subtyping implies consistency)
```

---

## Appendix C: LLVM IR Type Mapping Reference

| Super.js type | LLVM IR type | Notes |
|--------------|-------------|-------|
| `number` | `double` | IEEE 754 64-bit double |
| `string` | `%SjsString*` | Fat pointer `{i8* ptr, i64 len, i64 cap}` |
| `boolean` | `i1` | Single bit (i8 in structs for alignment) |
| `symbol` | `%SjsSymbol*` | `{i8* desc, u64 id}` |
| `bigint` | `%SjsBigInt*` | GMP-backed multi-precision |
| `null` | `i8* null` / sentinel | Tagged union null bit |
| `undefined` | sentinel / tag bit | Depends on context |
| `T?` | `%SjsOptional<T>` | `{i1 hasValue, T value}` |
| `T[]` | `%SjsArray<T>` | `{T* ptr, u64 len, u64 cap}` |
| `[T1, T2]` | `{T1 _0, T2 _1}` | Stack-allocated struct |
| `Map<K,V>` | `%SjsHashMap<K,V>*` | Hash table, heap allocated |
| `Set<T>` | `%SjsHashSet<T>*` | Hash set, heap allocated |
| Sum type | `%SjsTaggedUnion` | `{u8 tag, union payload}` |
| Interface (vtable) | `{void* data, %Vtable* vtbl}` | Fat pointer for dynamic dispatch |
| Generic `<T>` (monomorphized) | Concrete type at instantiation | One copy per concrete `T` |
| `never` | (unreachable) | `unreachable` instruction |
| `dynamic` | `%SjsDynamic` | `{u8 tag, union payload}` with runtime type info |
| `void` (return) | `void` | No return register |

---

*End of Super.js Deep Type System Specification v2*

*This document describes the intended design for all phases. Phase 1 (Babel prototype) implements the subset documented in Section 15. Discrepancies between this document and the current implementation are planned gaps, not bugs in the specification.*
