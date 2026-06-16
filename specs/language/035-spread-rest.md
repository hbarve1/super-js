# 035 — Spread and Rest

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §ArrayLiteral, §ObjectLiteral, §ArgumentList, §FormalParameters

---

## Syntax

```ebnf
(* Spread in array literal *)
<ArrayLiteral>    ::= "[" [ <ArrayElement> { "," <ArrayElement> } ] "]"
<ArrayElement>    ::= <AssignmentExpression>
                    | "..." <AssignmentExpression>

(* Spread in object literal *)
<ObjectLiteral>   ::= "{" [ <PropertyDefinition> { "," <PropertyDefinition> } ] "}"
<PropertyDefinition> ::= <Identifier>
                       | <Identifier> ":" <AssignmentExpression>
                       | "..." <AssignmentExpression>

(* Spread in function call *)
<ArgumentList>    ::= <AssignmentExpression> { "," <AssignmentExpression> }
                    | "..." <AssignmentExpression>
                    | <ArgumentList> "," "..." <AssignmentExpression>

(* Rest in function parameters *)
<FormalParameters> ::= [ <FormalParameter> { "," <FormalParameter> } ]
                       [ "," "..." <Identifier> [ ":" <Type> ] ]
<FormalParameter>  ::= <Identifier> [ "?" ] ":" <Type> [ "=" <Expression> ]
```

---

## Semantics

### Array spread `[...a, ...b]`

Expands an iterable into an array literal. Both `a` and `b` must be iterables with compatible element types. The result is a new array containing all elements from each spread operand, in order.

Multiple spreads may appear in a single array literal alongside non-spread elements:

```sjs
const merged: number[] = [0, ...a, ...b, 99];
```

### Object spread `{ ...obj }`

Copies all own enumerable properties from `obj` into the new object literal. Later properties override earlier ones when property names collide. The type of the result is the structural merge of all spread sources and explicitly named properties.

In SJS v1, the type of a spread-merged object must be declared explicitly if it needs a named type — the compiler does not synthesize an anonymous intersection type (intersection types are banned; see `specs/language/007-banned-features.md`). Later spread properties override earlier ones in terms of runtime value, but the declared type must accommodate all named properties.

### Function call spread `f(...arr)`

Spreads an array as positional arguments. The spread must be compatible with the rest parameter or the remaining positional parameter types of the target function.

### Rest parameter `...args: T[]`

Collects all remaining positional arguments into an array of type `T[]`. A rest parameter must be the last parameter in the parameter list. A function may have at most one rest parameter.

Inside the function body, `args` has type `T[]`. The caller may pass zero or more arguments beyond the required positional parameters; all are collected.

---

## Type rules

```
Γ ⊢ a : T[]     Γ ⊢ b : T[]
──────────────────────────────── (array-spread-same)
Γ ⊢ [...a, ...b] : T[]

Γ ⊢ a : S[]     Γ ⊢ b : T[]     S ≠ T
──────────────────────────────────────── (array-spread-union)
Γ ⊢ [...a, ...b] : (S | T)[]

Γ ⊢ a : A     Γ ⊢ b : B     A, B are object types
──────────────────────────────────────────────────── (obj-spread)
Γ ⊢ { ...a, ...b } : declared type required for named use

Γ ⊢ args : T[]     f params end with ...rest: T[]
──────────────────────────────────────────────────── (call-spread)
Γ ⊢ f(...args) : ReturnType(f)

──────────────────────────────────────────────────── (rest-param)
Γ, args: T[] ⊢ function f(...args: T[]): R
```

For object spread, the result type must be explicitly annotated when used as a named type; the compiler does not derive an implicit intersection.

---

## JS Lowering (Prototype)

Array spread passes through for ES2015+ targets. Object spread passes through for ES2018+ targets or is lowered to `Object.assign` for older targets. Rest parameters pass through for ES2015+.

```sjs
// SJS input
const a: number[] = [1, 2, 3];
const b: number[] = [4, 5, 6];
const merged: number[] = [...a, ...b];

type Options { timeout: number; retries: number; }
const defaults: Options = { timeout: 5000, retries: 3 };
const overrides: Options = { ...defaults, timeout: 1000 };

function sum(...nums: number[]): number {
  return nums.reduce((acc: number, n: number) => acc + n, 0);
}
```

```javascript
// JS output (ES2018+ target — pass-through)
const a = [1, 2, 3];
const b = [4, 5, 6];
const merged = [...a, ...b];

const defaults = { timeout: 5000, retries: 3 };
const overrides = { ...defaults, timeout: 1000 };

function sum(...nums) {
  return nums.reduce((acc, n) => acc + n, 0);
}

// JS output (ES5 target)
const merged = a.concat(b);
const overrides = Object.assign({}, defaults, { timeout: 1000 });
function sum() {
  const nums = Array.prototype.slice.call(arguments);
  return nums.reduce(function(acc, n) { return acc + n; }, 0);
}
```

---

## LLVM Lowering (Future)

```llvm
; Array spread: [...a, ...b]
; SJS array layout: { i64 len, T* data }
%len_a = getelementptr %Array_T, %Array_T* %a, i32 0, i32 0
%len_a_val = load i64, i64* %len_a
%len_b = getelementptr %Array_T, %Array_T* %b, i32 0, i32 0
%len_b_val = load i64, i64* %len_b
%total_len = add i64 %len_a_val, %len_b_val

; allocate result array, then memcpy data from a and b
%result = call %Array_T* @__sjs_array_alloc(i64 %total_len)
call void @__sjs_array_concat(%Array_T* %result, %Array_T* %a, %Array_T* %b)

; Object spread: { ...a, ...b }
; Compile-time known struct layout — generate field-by-field copy
; Runtime unknown structs — call @__sjs_obj_spread helper
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E002` | Spread element type is not assignable to the array element type |
| `SJS-E002` | Call-site spread array element type does not match function parameter type |

---

## Examples

### Valid

```sjs
// Array spread — same element type
const xs: number[] = [1, 2];
const ys: number[] = [3, 4];
const all: number[] = [...xs, ...ys, 5];

// Object spread — explicit result type
type Point { x: number; y: number; }
type Point3D { x: number; y: number; z: number; }
const p2: Point = { x: 1, y: 2 };
const p3: Point3D = { ...p2, z: 3 };

// Rest parameter
function log(prefix: string, ...messages: string[]): void {
  messages.forEach((m: string) => console.log(prefix + m));
}
log("INFO:", "server started", "port 8080");

// Spread into call
const args: number[] = [1, 2, 3];
Math.max(...args);
```

### Invalid

```sjs
// SJS-E002: incompatible spread types in strict array context
const strs: string[] = ["a", "b"];
const nums: number[] = [1, 2];
const bad: string[] = [...strs, ...nums];
//                              ^^^^^^ SJS-E002: number is not assignable to string

// SJS-E002: spread mismatch at call site
function add(a: number, b: number): number { return a + b; }
const strArgs: string[] = ["x", "y"];
add(...strArgs);
//  ^^^^^^^^^ SJS-E002: string is not assignable to number at parameter position
```
