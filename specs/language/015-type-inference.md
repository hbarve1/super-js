# 015 — Type Inference

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §VariableDecl, §FunctionDecl, §ArrowFunction

---

## Syntax

No special syntax. Type inference operates on existing constructs when a type annotation is absent.

---

## Semantics

SJS infers types for declarations and expressions that lack explicit annotations, reducing annotation burden while preserving soundness. Inference is **local** (within a single expression or statement) and **bidirectional** (propagates expected types inward as contextual types).

### Variable inference

**`const` declaration:** The type is inferred from the initializer. Literal values are inferred as **literal types** (string, number, boolean literal types), because `const` bindings cannot be reassigned.

```sjs
const x = 42;        // x: 42  (number literal type)
const s = "hello";   // s: "hello"  (string literal type)
const b = true;      // b: true  (boolean literal type)
```

**`let` declaration:** The type is inferred from the initializer but **widened** to the base primitive type, because `let` bindings may be reassigned.

```sjs
let x = 42;        // x: number  (not 42)
let s = "hello";   // s: string  (not "hello")
let b = true;      // b: boolean  (not true)
```

**`const` with `null`:** A `const` initialized to `null` has type `null`. It is not widened to a nullable type.

```sjs
const n = null;    // n: null
let m = null;      // m: null  (cannot widen null further without annotation)
```

**Array literal:** Inferred as `T[]` where `T` is the union of all element types. An empty array literal `[]` requires a contextual type; without one it is typed as `never[]` (SJS-W001 in strict mode).

```sjs
const arr = [1, 2, 3];       // arr: number[]
const mixed = [1, "two"];    // mixed: (number | string)[]
const empty: string[] = [];  // ok — contextual type provides T
```

**Object literal:** Inferred as an object type literal whose property types are inferred from each value.

```sjs
const obj = { x: 1, y: "hi" };  // obj: { x: number; y: string; }
```

### Function return type inference

If a function or method has no explicit return type annotation, the return type is inferred as the union of all types returned by `return` statements in the body. An implicit fall-off (reaching the end of the function body without a `return`) contributes `undefined` to the union.

```sjs
function f(flag: boolean) {
  if (flag) return 42;
  return "no";
}
// inferred return type: number | string
```

A function with no `return` statement infers return type `void`.

### Generic call inference

When a generic function is called without explicit type arguments, SJS infers the type parameters from the argument types.

```sjs
function identity<T>(x: T): T { return x; }

const n = identity(42);      // T inferred as number; n: number
const s = identity("hi");    // T inferred as string;  s: string
```

If inference is ambiguous or fails, the type parameter defaults to `unknown` and SJS-W001 may be emitted in strict mode.

### Contextual typing

SJS applies **contextual typing** when an expression appears in a position that has a known expected type. The expected type is propagated inward to help infer types for unannotated sub-expressions.

**Arrow function in callback context:**

```sjs
const nums: number[] = [1, 2, 3];
const doubled = nums.map(x => x * 2);
// x contextually typed as number (from number[].map callback)
```

**Object literal property:**

```sjs
const cfg: { port: number } = { port: 8080 };
// 8080 contextually typed as number (from port: number)
```

**Function argument:**

```sjs
function run(f: () => number): number { return f(); }
run(() => 42);  // arrow return contextually typed as number
```

### Widening rules summary

| Declaration | Literal | Widened type |
|-------------|---------|-------------|
| `const x = "a"` | `"a"` (string literal) | `"a"` — no widening |
| `let x = "a"` | `"a"` | `string` |
| `const x = 1` | `1` (number literal) | `1` — no widening |
| `let x = 1` | `1` | `number` |
| `const x = true` | `true` | `true` — no widening |
| `let x = true` | `true` | `boolean` |
| `const x = [1]` | `[1]` | `number[]` — arrays always widen |
| `let x = [1]` | `[1]` | `number[]` |

Array literals are always widened to `T[]` regardless of `const`/`let`, because the array is mutable (elements can be pushed/set).

### No inference for

The following positions require explicit annotation or `dynamic`:

- **Function parameters:** `function f(x)` — `x` must be annotated. Without annotation in strict mode, SJS-W001 is emitted and `x` is treated as `dynamic`.
- **Class properties without initializer:** `class C { x; }` — `x` must be annotated.
- **Recursive function return types** where the recursion makes the inference non-terminating.

---

## Type rules

### Const literal inference

```
Γ ⊢ e : T (literal type of e)    e is a literal
─────────────────────────────────────────────── (infer-const-literal)
Γ ⊢ const x = e  :  x has type T
```

### Let widening

```
Γ ⊢ e : T    widen(T) = T'
─────────────────────────── (infer-let-widen)
Γ ⊢ let x = e  :  x has type T'
```

where `widen("hello") = string`, `widen(42) = number`, `widen(true) = boolean`, `widen(null) = null`, `widen(T[]) = T[]`.

### Return type union inference

```
Γ ⊢ e1 : T1    Γ ⊢ e2 : T2
──────────────────────────────────────────────────── (infer-return-union)
Γ ⊢ function f() { return e1; ... return e2; } : () => T1 | T2
```

### Contextual typing propagation

```
expected(position) = T    Γ, ctx:T ⊢ e : U    U <: T
───────────────────────────────────────────────────── (contextual-type)
Γ ⊢ e : T
```

---

## JS Lowering (Prototype)

Type inference is entirely compile-time. It produces no JavaScript output changes. The inferred type information drives type checking; after checking it is discarded (or retained only for IDE/LSP use).

```sjs
// SJS input — no annotations
const greet = (name) => "Hello, " + name;
//   ^ return type inferred as string; name inferred as dynamic (or string from context)
```

```javascript
// JS output — identical (inference adds no runtime code)
const greet = (name) => "Hello, " + name;
```

---

## LLVM Lowering (Future)

Inferred types are resolved at compile time and used to select concrete LLVM IR types. Generic functions are **monomorphized**: each distinct instantiation (per inferred set of type arguments) generates a separate LLVM function with the concrete types substituted.

```llvm
; identity<T>(x: T): T  — two instantiations
define double @identity_double(double %x) { ret double %x }
define { i8*, i64 } @identity_string({ i8*, i64 } %x) { ret { i8*, i64 } %x }
```

Widening has no effect on LLVM IR — `let x = 1` and `const x = 1` both lower to the same `double` alloca.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-W001` | Unannotated function parameter or class property inferred as `dynamic` in strict mode |

---

## Examples

### Valid

```sjs
// ✓ const — literal types inferred
const greeting = "hello";  // "hello"
const count = 0;            // 0
const flag = false;         // false

// ✓ let — widened types inferred
let msg = "hi";    // string
let num = 100;     // number
let on = true;     // boolean

// ✓ Return type inferred from returns
function classify(n: number) {
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "zero";
}
// inferred: () => "positive" | "negative" | "zero"  (string literal union)

// ✓ Generic inference from arguments
function wrap<T>(val: T): T[] { return [val]; }
const ns = wrap(42);    // T = number; ns: number[]
const ss = wrap("hi");  // T = string; ss: string[]

// ✓ Contextual typing in callback
const results = [1, 2, 3].map(n => n * 2);
// n is contextually number; results: number[]

// ✓ Inferred object shape
const config = { host: "localhost", port: 3000 };
// config: { host: string; port: number }  (let-widened property types)
```

### Invalid

```sjs
// ✗ SJS-W001: unannotated parameter in strict mode
function double(x) {  // SJS-W001: x implicitly dynamic
  return x * 2;
}

// ✗ SJS-W001: unannotated class property
class Box {
  value;  // SJS-W001: value has no annotation and no initializer
}

// ✗ Inferred return type mismatch with explicit annotation
function getNum(): number {
  if (Math.random() > 0.5) return 42;
  return "oops";  // SJS-E002: string not assignable to number
}
```
