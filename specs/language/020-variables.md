# 020 — Variables

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §VariableDecl, §VariableKind, §VariableDeclarator, §BindingPattern

---

## Syntax

```ebnf
<VariableDecl>       ::= <VariableKind> <VariableDeclarator>
                         { "," <VariableDeclarator> } ";"

<VariableKind>       ::= "const" | "let" | "var"

<VariableDeclarator> ::= <BindingPattern> [ ":" <Type> ] [ "=" <Expression> ]

<BindingPattern>     ::= <Identifier>
                       | <ArrayBindingPattern>
                       | <ObjectBindingPattern>

<ArrayBindingPattern>  ::= "[" [ <ArrayBindingElement>
                               { "," <ArrayBindingElement> }
                               [ "," "..." <Identifier> ] ] "]"

<ArrayBindingElement>  ::= <BindingPattern> [ ":" <Type> ] [ "=" <Expression> ]

<ObjectBindingPattern> ::= "{" [ <ObjectBindingElement>
                                { "," <ObjectBindingElement> }
                                [ "," "..." <Identifier> ] ] "}"

<ObjectBindingElement> ::= <Identifier> [ ":" <BindingPattern> ]
                           [ ":" <Type> ] [ "=" <Expression> ]
```

---

## Semantics

### `const`

A `const` declaration is block-scoped. It must have an initializer; omitting `=` is a syntax error. The binding itself cannot be reassigned after initialization — a subsequent assignment to the variable name is a type error (SJS-E001). The value the binding points to is not frozen: properties of an object or elements of an array bound with `const` remain mutable.

### `let`

A `let` declaration is block-scoped. The initializer is optional; if omitted, the binding holds `undefined` until the first assignment. The binding may be reassigned any number of times. A type annotation on a `let` declaration without an initializer fixes the binding's declared type; accessing the variable before its first assignment in strict mode is SJS-E016.

### `var`

A `var` declaration is function-scoped (or global-scoped at the top level). The binding is hoisted to the top of the enclosing function: the name is visible throughout the function body regardless of where the declaration appears. `var` is syntactically valid in SJS but every occurrence emits SJS-L002, directing the author to prefer `let` or `const`. The compiler does not reject `var`; the diagnostic is a linting warning.

### Temporal Dead Zone (TDZ)

`let` and `const` bindings exist from the start of their enclosing block but cannot be read or written before the declaration line is reached at runtime. Accessing the binding in the TDZ produces a `ReferenceError` at runtime. The SJS type-checker performs static TDZ analysis within a single function body and emits SJS-E016 for definite TDZ violations.

### `const` with object and array values

Declaring `const obj: MyType = { ... }` means the variable `obj` cannot be rebound to a different object. It does not make the object's properties immutable. To express deep immutability, annotate the type with `readonly` properties (see `specs/language/006-interfaces.md`).

### Typed destructuring

Destructured bindings may carry per-element type annotations. These annotations constrain the expected element type rather than casting it:

```sjs
const { x: number, y: number } = point;
const [a: string, b: number]   = pair;
```

The right-hand side type must structurally satisfy the destructuring pattern. A mismatch between the annotation and the inferred element type is SJS-E001.

### Prefer-const lint rule (SJS-L001)

If a `let` binding is assigned exactly once (at its declaration or at a single unconditional assignment site) and never reassigned thereafter, the compiler emits SJS-L001 suggesting the author change the declaration to `const`.

---

## Type rules

```
Γ ⊢ e : S    S <: T
─────────────────────────────────────── (const-typed)
Γ ⊢ const x: T = e : Γ[x ↦ T]

Γ ⊢ e : T
─────────────────────────────────────── (const-inferred)
Γ ⊢ const x = e : Γ[x ↦ T]

─────────────────────────────────────── (let-uninit)
Γ ⊢ let x: T : Γ[x ↦ T]        -- x is uninitialized; reading before assignment → SJS-E016

Γ ⊢ e : S    S <: T
─────────────────────────────────────── (let-typed)
Γ ⊢ let x: T = e : Γ[x ↦ T]

Γ ⊢ e : T
─────────────────────────────────────── (let-inferred)
Γ ⊢ let x = e : Γ[x ↦ T]
```

For destructuring declarations the rule is applied per element:

```
Γ ⊢ e : { p: S }    S <: T
─────────────────────────────────────── (object-destructure-typed)
Γ ⊢ const { p: T } = e : Γ[p ↦ T]

Γ ⊢ e : [S, ...]    S <: T
─────────────────────────────────────── (array-destructure-typed)
Γ ⊢ const [p: T, ...] = e : Γ[p ↦ T]
```

Binding-level type annotations are assertions; if `S` is not a subtype of `T`, SJS-E001 is emitted. They are not casts and do not suppress the error.

---

## JS Lowering (Prototype)

Type annotations are erased. `const`, `let`, and `var` keywords pass through unchanged. Typed destructuring becomes standard JS destructuring with annotations dropped.

```sjs
// SJS input
const name: string = "Alice";
let   count: number = 0;
var   legacy: boolean = true;

const { x: number, y: number } = origin;
const [first: string, ...rest: string[]] = items;
```

```javascript
// JS output
const name = "Alice";
let   count = 0;
var   legacy = true;

const { x, y } = origin;
const [first, ...rest] = items;
```

No helpers are emitted. TDZ enforcement is left to the JS runtime.

---

## LLVM Lowering (Future)

```llvm
; const x: i64 = 42  →  SSA value (no alloca if not address-taken)
%x = add i64 0, 42

; let y: i64          →  alloca on entry block
%y = alloca i64
; ... later assignment:
store i64 %val, i64* %y

; var z: i64          →  alloca hoisted to function entry (same as let at IR level)
%z = alloca i64
```

`const` bindings that are never address-taken and never escape are represented as pure SSA values — no stack allocation is needed. `let` and `var` both produce `alloca` instructions in the function's entry block. The SJS compiler marks `const` SSA values with LLVM `readonly` metadata to assist alias analysis.

---

## Diagnostic codes

| Code     | When emitted |
|----------|-------------|
| `SJS-E001` | Type of initializer or destructured element is not assignable to the declared type |
| `SJS-E016` | `let` or `const` binding read before its first definite assignment (static TDZ violation) |
| `SJS-L001` | `let` binding is never reassigned — prefer `const` |
| `SJS-L002` | `var` declaration used — prefer `let` or `const` |

---

## Examples

### Valid

```sjs
// Typed const — annotation matches inferred type
const greeting: string = "hello";

// Typed let with later reassignment
let score: number = 0;
score = score + 10;

// Const inferred — no annotation needed
const PI = 3.14159;

// Object destructuring with typed bindings
interface Point { x: number; y: number; }
const origin: Point = { x: 0, y: 0 };
const { x: number, y: number } = origin;

// Array destructuring with typed bindings and rest
const pair: [string, number] = ["age", 30];
const [label: string, value: number] = pair;

// Optional destructuring default
const { timeout: number = 5000 } = config;

// Nullable typed let (uninitialized is valid; type includes null)
let current: string? = null;
current = "active";
```

### Invalid

```sjs
// SJS-E001: null assigned to non-nullable const
const name: string = null;
//                   ^^^^ SJS-E001: null is not assignable to string

// SJS-E001: type mismatch in typed destructuring
const point = { x: 1, y: 2 };
const { x: string } = point;
//         ^^^^^^ SJS-E001: number is not assignable to string

// SJS-E016: let binding read before assignment
let result: number;
console.log(result);
//          ^^^^^^ SJS-E016: result may be uninitialized

// SJS-L001: let never reassigned — prefer const
let fixed: string = "immutable";
//  ^^^^^ SJS-L001: fixed is never reassigned; use const

// SJS-L002: var declaration
var counter: number = 0;
//  ^^^^^^^ SJS-L002: var is discouraged; use let or const

// SJS-E001: const binding reassigned
const limit = 100;
limit = 200;
// ^^^^^ SJS-E001: cannot reassign const binding limit
```
