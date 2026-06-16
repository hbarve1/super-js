# 005 — Generics

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §TypeParameters, §TypeArguments, §GenericFunction, §GenericClass

---

## Syntax

```ebnf
<TypeParameters>   ::= "<" <TypeParameter> { "," <TypeParameter> } ">"
<TypeParameter>    ::= <Identifier> [ "=" <Type> ]
                       (* default type param; NO "extends" constraint — banned in SJS *)

<TypeArguments>    ::= "<" <TypeArgumentList> ">"
<TypeArgumentList> ::= <Type> { "," <Type> }

<GenericFunction>  ::= "function" <Identifier> <TypeParameters>
                       "(" [ <ParameterList> ] ")" ":" <Type>
                       <Block>

<GenericClass>     ::= "class" <Identifier> <TypeParameters>
                       [ "extends" <TypeRef> [ <TypeArguments> ] ]
                       [ "implements" <TypeRef> { "," <TypeRef> } ]
                       "{" { <ClassMember> } "}"

<GenericType>      ::= "type" <Identifier> <TypeParameters>
                       [ "extends" <TypeRef> { "," <TypeRef> } ]
                       "{" { <TypeMember> } "}"

<GenericTypeAlias> ::= "type" <Identifier> <TypeParameters> "=" <Type> ";"
```

Type parameter names are conventionally single uppercase letters (`T`, `U`, `K`, `V`) but any valid identifier is accepted.

---

## Semantics

### Scope of type parameters

Type parameters are scoped to the declaration that introduces them. A type parameter `T` introduced on a function is bound for the duration of that function's parameter list, return type, and body. On a class, `T` is bound for all instance members (but not static members, which must introduce their own parameters if needed). On a `type` declaration (either brace form or alias form), `T` is bound within the body.

```sjs
function identity<T>(x: T): T { return x }   // T bound here only
class Box<T> { value: T }                     // T bound to instance scope
type Pair<A, B> { first: A; second: B }       // A, B bound in body
type Result<T> = { ok: true; value: T } | { ok: false; error: string }
```

### No `T extends U` constraints

SJS bans `T extends U` type constraints entirely. This rule exists because:

1. Constraint checking requires subtype decidability that conflicts with the SJS native compiler.
2. Constraints are typically needed only because the type system lacks another mechanism; in SJS, structural object types handle the common case.
3. Monomorphization generates one concrete function per instantiation; the compiler can verify structural compatibility at each call site without a general constraint mechanism.

See the "Constraints workaround" section below for the recommended patterns.

Attempting to use `T extends U` emits **SJS-E008**.

### Default type parameters

A type parameter may carry a default: `<T = string>`. When the generic is instantiated without providing an explicit argument for `T`, and the compiler cannot infer `T` from the call-site arguments, `T` resolves to the default type.

```sjs
type Box<T = string> = { value: T }

const a: Box = { value: "hello" }   // T defaults to string
const b: Box<number> = { value: 42 } // T explicitly number
```

Defaults are evaluated left-to-right. A later parameter may reference an earlier one as its default:

```sjs
type Keyed<K = string, V = K> = { key: K; value: V }
```

### Instantiation: explicit and inferred

Generic functions may be called with explicit type arguments or with arguments inferred from the value parameters:

```sjs
identity<number>(42)        // explicit instantiation
identity("hello")           // T inferred as string from argument
```

Inference is performed by unifying the types of actual arguments against the parameter types. If unification succeeds and all type parameters are resolved, explicit type arguments are not required. If unification is ambiguous or a type parameter appears only in the return type (not in any value parameter), an explicit type argument is required.

### Variance

All generic type parameters are **invariant** in v1. No `in`/`out` variance annotations exist. This means `Box<Cat>` is not assignable to `Box<Animal>` even if `Cat <: Animal`. Variance annotations are planned for a future version.

### Constraints workaround

Since `T extends Type` is banned, the recommended patterns for constraining generic behaviour are:

**Pattern 1 — Accept the object type directly (most common):**
```sjs
// Instead of: function process<T extends Serializable>(x: T): string
type Serializable { serialize(): string }
function process(x: Serializable): string { return x.serialize() }
```

**Pattern 2 — Accept `dynamic` and narrow at runtime:**
```sjs
function process(x: dynamic): string {
  if (typeof x.serialize === "function") {
    return x.serialize()
  }
  throw new Error("Not serializable")
}
```

**Pattern 3 — Use separate typed overloads for a finite set of types:**
```sjs
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
function clampBigInt(x: bigint, lo: bigint, hi: bigint): bigint {
  return lo > x ? lo : hi < x ? hi : x
}
```

---

## Type rules

### Generic introduction (function)

```
Γ, T ⊢ body : U    (T is fresh in Γ)
───────────────────────────────────────── (gen-intro-fn)
Γ ⊢ function f<T>(x: T): U
```

A generic function is well-typed if its body type-checks under an environment that includes the fresh type variable `T`.

### Generic elimination (explicit)

```
Γ ⊢ f : <T> (T → U)    Γ ⊢ arg : A
──────────────────────────────────── (gen-elim-explicit)
Γ ⊢ f<A>(arg) : [A/T]U
```

Explicit type application substitutes `A` for `T` throughout the result type.

### Generic elimination (inferred)

```
Γ ⊢ f : <T> (T → U)    Γ ⊢ arg : A    unify(T, A) = [A/T]
──────────────────────────────────────────────────────────── (gen-elim-infer)
Γ ⊢ f(arg) : [A/T]U    (T inferred as A)
```

### Default type parameter

```
Γ ⊢ Box<T = D>    no argument for T provided    unify(T) fails
──────────────────────────────────────────────────────────────── (gen-default)
T resolves to D
```

---

## JS Lowering (Prototype)

Generics are **fully erased** in the Babel-based JS output. Type parameters and type arguments exist only at the type-check level; they produce no runtime code.

```sjs
// SJS input
function identity<T>(x: T): T {
  return x
}

const n = identity<number>(42)
const s = identity("hello")
```

```javascript
// JS output
function identity(x) {
  return x;
}

const n = identity(42);
const s = identity("hello");
```

Generic class example:

```sjs
// SJS input
class Stack<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T? {
    return this.items.pop() ?? null
  }

  get size(): number {
    return this.items.length
  }
}
```

```javascript
// JS output
class Stack {
  items = [];

  push(item) {
    this.items.push(item);
  }

  pop() {
    return this.items.pop() ?? null;
  }

  get size() {
    return this.items.length;
  }
}
```

Type arguments in calls are stripped before code generation:

```sjs
// SJS input
const box: Box<number> = { value: 42 }
```

```javascript
// JS output
const box = { value: 42 };
```

---

## LLVM Lowering (Future)

The LLVM backend uses **monomorphization** — each unique instantiation of a generic produces a fully separate compiled function or struct. The compiler maintains a monomorphization table; duplicate instantiations (same generic + same type arguments) are deduplicated to a single definition.

This approach is mandatory because types affect memory layout. `Stack<number>` allocates 64-bit slots; `Stack<string>` allocates pointer-sized slots. Type erasure cannot be used safely with a native memory model.

```llvm
; function identity<T>(x: T): T
; Monomorphized for T = f64 (number):
define double @identity_number(double %x) {
entry:
  ret double %x
}

; Monomorphized for T = %SjsString (string):
define %SjsString @identity_string(%SjsString %x) {
entry:
  ret %SjsString %x
}
```

Generic struct monomorphization:

```llvm
; class Stack<T> — monomorphized for T = f64
%Stack_number = type {
  %SjsArray_number* ; items: number[]
}

; Stack<number>.push:
define void @Stack_number_push(%Stack_number* %self, double %item) {
  ; call SjsArray_number_push on %self->items
  ...
}
```

Template instantiation occurs at the call site. The compiler:
1. Resolves all type arguments (explicit or inferred).
2. Looks up the monomorphization table for an existing definition.
3. If not found, instantiates the generic body with concrete types and compiles it.
4. Emits a direct `call` to the monomorphized function.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E008` | `T extends U` used as a type constraint (banned in SJS) |
| `SJS-E006` | Indexed access type `T['key']` used inside a generic body or constraint |
| Parse error | `<` without matching `>` in type parameter list |
| Type error | Type argument count does not match type parameter count |
| Type error | Type argument cannot be inferred and no explicit argument provided |

---

## Examples

### Valid

```sjs
// ✓ Generic identity function
function identity<T>(x: T): T {
  return x
}
const a = identity<number>(42)       // explicit
const b = identity("hello")          // inferred: T = string

// ✓ Generic Stack class
class Stack<T> {
  private items: T[] = []

  push(item: T): void { this.items.push(item) }

  pop(): T? {
    if (this.items.length === 0) return null
    return this.items.pop()!  // internal use after length check
  }

  peek(): T? {
    return this.items[this.items.length - 1] ?? null
  }
}

const stack = new Stack<number>()
stack.push(1)
stack.push(2)
const top: number? = stack.pop()

// ✓ Generic type alias (Result type)
type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { ok: false, error: "division by zero" }
  return { ok: true, value: a / b }
}

// ✓ Generic Pair type alias
type Pair<A, B> = { first: A; second: B }

const coords: Pair<number, number> = { first: 3, second: 4 }
const entry: Pair<string, boolean> = { first: "active", second: true }

// ✓ Default type parameter
type Box<T = string> = { value: T }

const strBox: Box = { value: "hello" }     // T defaults to string
const numBox: Box<number> = { value: 99 }  // T explicitly number

// ✓ Type inference from arguments
function wrap<T>(value: T): { wrapped: T } {
  return { wrapped: value }
}
const w1 = wrap(true)         // inferred: T = boolean
const w2 = wrap<string>("x")  // explicit: T = string

// ✓ Generic object type (`type` brace form)
type Container<T> {
  value: T
  map<U>(fn: (x: T) => U): Container<U>
}
```

### Invalid

```sjs
// ✗ SJS-E008: T extends U constraint (banned)
function getLength<T extends { length: number }>(x: T): number {
  //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SJS-E008
  return x.length
}

// ✗ SJS-E008: extends in class type parameter
class Repository<T extends Entity> {
  //               ^^^^^^^^^^^^^^^ SJS-E008
}

// ✗ SJS-E006: indexed access type in generic
type ValueOf<T> = T['value']
//                ^^^^^^^^^ SJS-E006: indexed access type not permitted

// ✗ Type error: wrong number of type arguments
type Pair<A, B> = { first: A; second: B }
const bad: Pair<string> = { first: "x", second: "y" }
//         ^^^^^^^^^^^^ Error: Pair requires 2 type arguments, got 1
```
