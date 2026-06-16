# 013 — Function Types

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §FunctionType, §FunctionTypeParam, §ArrowFunction, §FunctionDecl

---

## Syntax

```ebnf
<FunctionType>          ::= "(" [ <FunctionTypeParamList> ] ")" "=>" <Type>

<FunctionTypeParamList> ::= <FunctionTypeParam> { "," <FunctionTypeParam> }
                          | "..." <Identifier> ":" <Type>

<FunctionTypeParam>     ::= <Identifier> [ "?" ] ":" <Type>
```

Function types appear wherever a `<Type>` is expected: variable annotations, parameter types, return types, object type (`type` brace form) members, and type aliases.

Generic function types use `<TypeParameters>` from the grammar:

```sjs
type Mapper<A, B> = (a: A) => B;
type Identity     = <T>(x: T) => T;
```

---

## Semantics

A function type describes the shape of a callable value: its parameter types and its return type. Parameter names in function types are documentary only — they are ignored for compatibility checking.

### Parameter forms

**Required parameter:** `(x: T)` — the argument is mandatory and must be of type `T`.

**Optional parameter:** `(x?: T)` — the argument may be omitted. Inside the function body, `x` has type `T | undefined`. From the caller's perspective, the argument may be passed as `T` or omitted entirely.

**Rest parameter:** `(...args: T[])` — zero or more trailing arguments of type `T`, collected into an array of type `T[]`.

Parameters with default values are declared on function declarations, not in function type annotations. In the function type, a parameter with a default is represented as optional (`?`).

### Return type `void`

A function type with return type `void` describes a function whose return value is not meaningful. Callers must not use the return value in a typed expression. The function body may return explicitly with no value, return `undefined`, or fall off the end.

### Return type `never`

A function type with return type `never` describes a function that never returns normally — it always throws or enters an infinite loop. A call to a `never`-returning function widens the control flow after the call to dead code.

### Generic function types

A function type may introduce its own type parameters: `<T>(x: T) => T`. These type parameters are bound per call and inferred from the arguments. No `extends` constraints are permitted on type parameters (banned in SJS).

### Overloads

TypeScript-style function overload declarations (multiple signatures followed by an implementation signature) are **not supported** in SJS. Use union parameter types or separate named functions instead.

```sjs
// ✓ Union params instead of overloads
function process(x: string | number): string { ... }

// ✗ Overload declaration syntax is banned
function process(x: string): string;
function process(x: number): string;
function process(x: string | number): string { ... }  // SJS-P001 on first overload line
```

---

## Type rules

### Subtyping (contravariant parameters, covariant return)

```
S1 <: P1    P2 <: S2    R1 <: R2
──────────────────────────────────────── (fn-subtype)
(P1 => R1) <: (P2 => R2)
```

Parameters are **contravariant**: if the supertype function accepts a wider parameter type, the subtype function must accept at least as wide. Return types are **covariant**: the subtype may return a narrower type.

Practical consequences:
- `(a: string | number) => number` is a subtype of `(a: string) => number` (contravariance: wider param → subtype).
- `(a: string) => number` is NOT a subtype of `(a: string | number) => number` (would accept a `number` argument illegally).
- `(a: string) => 42` (literal return) is a subtype of `(a: string) => number` (covariance: narrower return → subtype).

### Optional parameters and arity

```
Γ ⊢ f : (x: T) => R
──────────────────────────── (fn-optional-compat)
f is assignable to (x?: T) => R    (fewer required params → subtype)
```

A function that requires a parameter can be assigned to a context that makes that parameter optional.

### Call expression typing

```
Γ ⊢ f : (p1: P1, ..., pN: PN) => R
Γ ⊢ a1 : A1, ..., Γ ⊢ aN : AN
A1 <: P1, ..., AN <: PN
──────────────────────────────────── (call)
Γ ⊢ f(a1, ..., aN) : R

Γ ⊢ f : T    T not a function type
──────────────────────────────────── (call-non-fn)
Γ ⊢ f(...)  → SJS-E003
```

### Generic call instantiation

```
Γ ⊢ f : <T>(x: T) => R(T)
Γ ⊢ a : A
────────────────────────── (generic-call-infer)
Γ ⊢ f(a) : R(A)          -- T inferred as A
```

---

## JS Lowering (Prototype)

Function type annotations are erased. Regular JS functions and arrow functions are emitted. No wrappers, no arity checks, no type guards at runtime.

```sjs
// SJS input
const add: (a: number, b: number) => number = (a, b) => a + b;

function apply<T, U>(f: (x: T) => U, value: T): U {
  return f(value);
}
```

```javascript
// JS output
const add = (a, b) => a + b;

function apply(f, value) {
  return f(value);
}
```

Closures lower to JavaScript closures; no explicit environment struct is created in the prototype.

---

## LLVM Lowering (Future)

**Non-capturing function:** Lowered to a plain LLVM function pointer `R (*)(P1, P2, ...)`.

**Closure (captures environment):** Lowered to a fat pointer `{ fnptr, env* }` where `env*` points to a heap-allocated struct containing the captured values.

```llvm
; (number) => number  — non-capturing
%fn_num_num = type i64 (double)*

; Closure: captures x: number
%closure_env = type { double }          ; captured x
%closure_fn  = type { i64 (double, %closure_env*)*, %closure_env* }
```

Generic function types are monomorphized at compile time: each distinct instantiation produces a separate LLVM function with concrete types substituted.

```llvm
; <T>(x: T) => T  instantiated for T = double
define double @identity_double(double %x) {
  ret double %x
}
```

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E002` | Argument type not assignable to parameter type |
| `SJS-E003` | Calling a value that is not a function type |

---

## Examples

### Valid

```sjs
// ✓ Function type annotation on variable
const double: (x: number) => number = x => x * 2;

// ✓ Function type as parameter
function map(arr: number[], f: (x: number) => number): number[] {
  return arr.map(f);
}

// ✓ Optional parameter in function type
const greet: (name?: string) => string = (name) => {
  return "Hello, " + (name ?? "stranger");
};

// ✓ Rest parameter in function type
const sum: (...args: number[]) => number = (...args) => {
  return args.reduce((acc, x) => acc + x, 0);
};

// ✓ Generic function type
function identity<T>(x: T): T {
  return x;
}
const n: number = identity(42);
const s: string = identity("hi");

// ✓ Contravariance: wider param is subtype
const widerFn: (x: string | number) => boolean = x => true;
const narrowCtx: (x: string) => boolean = widerFn;  // ok: contravariant

// ✓ void return — value not used
function forEach(arr: number[], f: (x: number) => void): void {
  for (const x of arr) { f(x); }
}

// ✓ never return in union
function fail(msg: string): never {
  throw new Error(msg);
}
```

### Invalid

```sjs
// ✗ SJS-E002: argument type mismatch
const double: (x: number) => number = x => x * 2;
double("hello");  // SJS-E002: string not assignable to number

// ✗ SJS-E003: calling non-function
const n: number = 42;
n();  // SJS-E003: number is not callable

// ✗ SJS-E002: covariance violation — subtype must return narrower type
// (assigning a wider-return function to narrower-return type)
const getStr: () => string = () => 42 as string;
//                                 ^^ SJS-E002: number not assignable to string

// ✗ Overload syntax is banned
function parse(x: string): number;     // SJS-P001: overload declarations not supported
function parse(x: string): number { return parseInt(x, 10); }
```
