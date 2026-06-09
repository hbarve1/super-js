# 001 — Null Safety

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §Type, §Parameter, §InterfaceProperty

---

## Syntax

```ebnf
<Type>              ::= <PrimaryType> [ "?" ]
<PrimaryType>       ::= <Identifier>
                      | <PrimitiveType>
                      | <FunctionType>
                      | <ArrayType>
                      | <TupleType>
                      | <UnionType>
                      | "(" <Type> ")"

<Parameter>         ::= <Identifier> [ "?" ] ":" <Type>
                      | <Identifier> ":" <Type> [ "=" <Expression> ]

<InterfaceProperty> ::= [ "readonly" ] <Identifier> [ "?" ] ":" <Type> ";"
```

The `?` suffix on a type position is the nullable shorthand. The `?` suffix on a parameter name or property name marks that position as optional (distinct from nullable — see Semantics).

---

## Semantics

### Non-nullable by default

Every type `T` in SJS is non-nullable unless explicitly annotated. The value `null` is not a member of any non-nullable type. This is a core language invariant — it cannot be disabled by configuration.

### Nullable shorthand: `T?`

`T?` is syntactic sugar that desugars to the union `T | null`. The two forms are interchangeable in all type positions:

```
T?  ≡  T | null
```

`undefined` is NOT included. To include `undefined`, write `T | undefined` or `T | null | undefined` explicitly. `T?` never implies `T | null | undefined`.

### Optional property: `prop?: T`

A property declared as `prop?: T` on an interface or object type has the type `T | undefined` within the object. When the property is absent from an object literal, its value is `undefined`. Inside a function or block that has narrowed the property to be present, its type is `T`.

```
{ prop?: T }  means: prop is absent (undefined) or T
```

### Optional parameter: `param?: T` and `param?: T`

A parameter declared as `p?: T` means the caller may omit the argument. Inside the function body, `p` has type `T | undefined`. To use `p` as `T`, the caller must narrow it first.

A parameter with a default value `p: T = default` is distinct: the parameter type is `T` inside the body (the default handles the absent case before body execution).

### `null` vs `undefined`

SJS treats `null` and `undefined` as distinct values with distinct types:

- `null` — intentional absence, part of `T?` via the `?` shorthand
- `undefined` — uninitialized / property-absent; written explicitly as `| undefined`

Neither is automatically included in any type. Both must be opted into explicitly.

---

## Type rules

### Assignability

```
────────────────── (null-literal)
Γ ⊢ null : null

────────────────── (null-sub-nullable)
null <: T?

────────────────── (T-sub-nullable)
T <: T?

────────────────── (nullable-expand)
T? ≡ T | null
```

A value of type `T` is assignable to `T?` (widening). A value of type `null` is assignable to `T?`. Neither is assignable to `T` without narrowing.

### Non-nullable enforcement

```
Γ ⊢ e : T      null ∉ T
──────────────────────────── (no-null-assign)
null  is not assignable to T          → SJS-E001
```

If the target type `T` does not contain `null` (i.e., `T` is not a union containing `null`), assigning `null` to it is a type error.

### Narrowing

After a null check, the type of a nullable variable is narrowed in the non-null branch:

```
Γ ⊢ x : T?
Γ, x : T ⊢ e : U    (branch where x !== null)
──────────────────────────────────────────────── (null-narrow)
in branch (x !== null): Γ ⊢ x : T
```

Control-flow narrowing forms:
- `if (x === null) { ... }` — in the else branch, `x : T`
- `if (x !== null) { ... }` — in the then branch, `x : T`
- `if (x == null) { ... }` — narrows both `null` and `undefined`
- Early return: `if (x === null) return;` — after the guard, `x : T`

### Optional chaining: `a?.b`

```
Γ ⊢ a : T?      PropType(T, 'b') = U
────────────────────────────────────── (opt-chain-nullable)
Γ ⊢ a?.b : U | undefined

Γ ⊢ a : T       PropType(T, 'b') = U
────────────────────────────────────── (opt-chain-nonnull)
Γ ⊢ a?.b : U
```

When `a` is `T?`, `a?.b` produces `U | undefined` (not `U | null`). This preserves the standard that `undefined` signals "short-circuit", distinct from a `null` payload.

Optional chaining applies to: property access (`?.`), method calls (`?.()`, `?.()`), and element access (`?.[key]`).

### Nullish coalescing: `a ?? b`

```
Γ ⊢ a : A | null      Γ ⊢ b : B
──────────────────────────────────── (nullish-coalesce-null)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A | undefined      Γ ⊢ b : B
──────────────────────────────────────── (nullish-coalesce-undef)
Γ ⊢ a ?? b : A | B
```

`??` provides a fallback when the left side is `null` or `undefined`. The result type is the union of the non-null/non-undefined left type with the right type.

---

## JS Lowering (Prototype)

`T?` is a type-level annotation erased at compile time. No runtime representation is generated.

```sjs
// SJS input
function greet(name: string?): string {
  return name ?? "stranger";
}
```

```javascript
// JS output (types erased)
function greet(name) {
  return name ?? "stranger";
}
```

Optional chaining `?.` compiles to native `?.` for ES2020+ targets. For ES5 targets, the compiler emits a conditional:

```sjs
// SJS input
const city = user?.address?.city;
```

```javascript
// JS output (ES2020 target)
const city = user?.address?.city;

// JS output (ES5 target)
const city = user === null || user === undefined
  ? undefined
  : (user.address === null || user.address === undefined
      ? undefined
      : user.address.city);
```

Nullish coalescing `??` compiles to native `??` for ES2020+ or a polyfill for ES5:

```javascript
// ES5 polyfill for: a ?? b
(a !== null && a !== undefined ? a : b)
```

---

## LLVM Lowering (Future)

Non-nullable types compile to bare values with no overhead — there is no tag, no pointer indirection, and no null check generated at use sites.

Nullable `T?` compiles to a tagged union:

```llvm
; Nullable<i64>: { i1 hasValue, i64 value }
%Nullable_i64 = type { i1, i64 }

; Constructing null:
%n = insertvalue %Nullable_i64 undef, i1 0, 0

; Constructing Some(42):
%n = insertvalue %Nullable_i64 { i1 1, i64 undef }, i64 42, 1

; Null check (a?.b pattern):
%hasVal = extractvalue %Nullable_i64 %a, 0
br i1 %hasVal, label %non_null, label %was_null
non_null:
  %inner = extractvalue %Nullable_i64 %a, 1
  ; access .b on %inner
was_null:
  ; result is undefined sentinel
```

For pointer-sized types (objects, strings), the null sentinel is the null pointer — no tag word is needed:

```llvm
; Nullable<*Object>: represented as a pointer, null = null pointer
%obj_ptr = alloca %Object*
; null check:
%is_null = icmp eq %Object* %obj_ptr, null
```

The compiler chooses the representation based on whether `T` is a value type or a reference type.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E001 | `null` or `undefined` assigned to a non-nullable type `T` |
| SJS-E003 | Property or method access on `T?` without prior null narrowing |
| SJS-E011 | Non-null assertion operator `x!` used (banned in SJS) |
| SJS-W001 | Unannotated position inferred as `dynamic` in `--strict` mode |

---

## Examples

### Valid

```sjs
// Nullable variable with null check
let name: string? = null;
if (name !== null) {
  console.log(name.toUpperCase());  // name: string here
}

// Optional chaining
interface User {
  address?: { city: string; };
}
function getCity(u: User): string | undefined {
  return u.address?.city;
}

// Nullish coalescing as fallback
function display(label: string?): string {
  return label ?? "(none)";
}

// Optional parameter
function greet(title?: string): string {
  if (title !== undefined) {
    return "Hello, " + title;
  }
  return "Hello";
}

// Chained optional access
interface Config {
  server?: { host?: string; };
}
function getHost(cfg: Config): string | undefined {
  return cfg.server?.host;
}
```

### Invalid

```sjs
// SJS-E001: assigning null to non-nullable
let x: string = null;
//              ^^^^ SJS-E001: null is not assignable to string

// SJS-E001: returning null from non-nullable return type
function getName(): string {
  return null;  // SJS-E001
}

// SJS-E003: property access on nullable without narrowing
function printName(name: string?): void {
  console.log(name.toUpperCase());
  //          ^^^^ SJS-E003: name is string? — null-check required
}

// SJS-E011: non-null assertion operator (banned)
function unsafe(x: string?): string {
  return x!;  // SJS-E011: ! operator is not permitted in SJS
}

// SJS-E003: method call on nullable
interface Node {
  getValue(): number;
}
function use(n: Node?): number {
  return n.getValue();  // SJS-E003: n may be null
}
```
