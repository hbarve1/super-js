# 016 — Type Narrowing

**Status:** Stage 1 — planned
**Grammar:** `specs/grammar.ebnf` §TypeAssertion, §IfStatement, §EqualityExpression, §UnaryExpression

---

## Syntax

No special narrowing syntax beyond existing JavaScript operators. The only manual narrowing form is the `as` type assertion:

```ebnf
<TypeAssertion> ::= <Expression> "as" <Type>
```

`as` appears at the expression level, after `<PrimaryExpression>`. The `<Type>expr` prefix cast form is banned (parse error — syntactically ambiguous with JSX).

All other narrowing is performed by the compiler's Control Flow Analysis (CFA) based on existing operator forms in `<EqualityExpression>`, `<UnaryExpression>`, `<RelationalExpression>`, and `<IfStatement>`.

---

## Semantics

Type narrowing reduces the static type of a value within a branch or scope based on the outcome of a runtime check. Narrowings are tracked per-variable by CFA. At join points (after if-else, after loops) the type is the union of all types that flow in from each predecessor branch.

### Narrowing patterns

#### 1. Null and undefined checks

```sjs
let x: string? = getValue();
if (x !== null) {
  x.toUpperCase();  // x: string in this branch
}
// x: string | null here (join)
```

`x === null` narrows `x` to `null` in the true branch and to `T` in the false branch (where the original type was `T | null`).

`x == null` (loose equality) narrows both `null` and `undefined` out of the type. SJS lints against `==`/`!=`, so this form emits SJS-L001 while still narrowing.

#### 2. `typeof` checks

`typeof x === "<primitive>"` narrows `x` to the corresponding primitive type:

| `typeof` string | Narrowed SJS type |
|-----------------|-------------------|
| `"string"` | `string` |
| `"number"` | `number` |
| `"boolean"` | `boolean` |
| `"bigint"` | `bigint` |
| `"symbol"` | `symbol` |
| `"function"` | function type (any callable) |
| `"object"` | `object \| null` (JS coerces null to "object") |
| `"undefined"` | `undefined` |

After a `typeof x === "string"` check, `x` has type `string` in the true branch and the remaining union members in the false branch.

#### 3. `instanceof` checks

`x instanceof C` narrows `x` to `C` in the true branch. The input type of `x` must include `C` or a supertype of `C`; otherwise the check is always-false (SJS-W003).

```sjs
function handle(err: Error | string): string {
  if (err instanceof Error) {
    return err.message;  // err: Error
  }
  return err;            // err: string
}
```

#### 4. `in` operator

`"prop" in x` narrows `x` to the subset of the union whose types declare `prop`. Members that do not declare `prop` are narrowed out in the true branch.

```sjs
type A { a: number; }
type B { b: string; }
type AB = A | B;

function use(v: AB): string {
  if ("a" in v) {
    return String(v.a);  // v: A
  }
  return v.b;            // v: B
}
```

#### 5. Discriminated union narrowing

When a union's members share a common literal-typed discriminant property (e.g., `kind: "circle"` vs `kind: "rect"`), an equality check on that property narrows the union to the matching member(s).

```sjs
type Shape = { kind: "circle"; radius: number }
           | { kind: "rect";   width: number; height: number };

function area(s: Shape): number {
  if (s.kind === "circle") {
    return Math.PI * s.radius * s.radius;  // s: { kind: "circle"; radius: number }
  }
  return s.width * s.height;               // s: { kind: "rect"; ... }
}
```

Sum types (declared with `type T = V1(...) | V2(...)`) use `_tag` as their discriminant; see `002-sum-types.md` and `003-match.md`.

#### 6. Truthiness narrowing

A truthiness check `if (x)` narrows out the falsy members of the union: `null`, `undefined`, `0`, `""` (empty string), `false`, and `0n`. This narrowing is applied in Phase 2+.

```sjs
function greet(name: string | null): string {
  if (name) {
    return "Hello, " + name;  // name: string (null narrowed out)
  }
  return "Hello, stranger";
}
```

Note: truthiness narrowing does not narrow `number` to non-zero `number`, as there is no distinct non-zero-number type in SJS.

#### 7. Assignment narrowing

After an assignment `x = expr`, the type of `x` in the subsequent code is narrowed to the type of `expr`, even if the declared type of `x` is broader.

```sjs
let val: string | number = getVal();
val = "fixed";
val.toUpperCase();  // val: string after assignment
```

### `as` type assertion

`expr as T` is an explicit type assertion that overrides the inferred type of `expr` with `T`. It generates no runtime code and does not produce a checked cast — the programmer asserts that the value is of type `T`.

**Restrictions:**
- `T` must overlap with the inferred type of `expr`: `T <: typeof expr` or `typeof expr <: T`. An assertion between unrelated types is a type error (SJS-E002).
- `as` cannot widen to `dynamic` except when the source type is `unknown` (use `as dynamic` to opt out of type checking on a value).
- No `<T>expr` prefix form — that syntax is banned because it is ambiguous with JSX in SJS's grammar.

```sjs
const x: unknown = fetchData();
const s = x as string;  // ok: unknown → string is a narrowing assertion
```

### Control Flow Analysis (CFA)

The compiler tracks narrowed types through:

- `if` / `else if` / `else` branches — each branch has its own narrowed environment
- Early return guards — after `if (x === null) return;`, the code following the guard has `x: T` (non-null)
- `switch` cases on discriminant values
- Ternary expressions `cond ? a : b` — narrowed in each arm

At **join points** (merge of multiple control-flow paths), the type of a variable is the union of its types from all incoming paths:

```sjs
let y: string | number;
if (cond) {
  y = "hi";   // y: string here
} else {
  y = 42;     // y: number here
}
// join: y: string | number
```

**Loop bodies:** Types are widened back to the pre-loop type at the start of each iteration, because assignments within the loop body may run zero or more times.

---

## Type rules

### Null narrowing

```
Γ ⊢ x : T | null
─────────────────────────────── (narrow-null-true)
Γ, (x === null) ⊢ x : null

Γ ⊢ x : T | null
─────────────────────────────── (narrow-null-false)
Γ, (x !== null) ⊢ x : T
```

### `typeof` narrowing

```
Γ ⊢ x : T    "string" ∈ members(T)
──────────────────────────────────── (narrow-typeof-string-true)
Γ, (typeof x === "string") ⊢ x : string

Γ ⊢ x : T    "string" ∈ members(T)
──────────────────────────────────── (narrow-typeof-string-false)
Γ, (typeof x !== "string") ⊢ x : T \ string
```

### `instanceof` narrowing

```
Γ ⊢ x : T    C <: T
──────────────────────────────── (narrow-instanceof-true)
Γ, (x instanceof C) ⊢ x : C

Γ ⊢ x : T    C <: T
──────────────────────────────── (narrow-instanceof-false)
Γ, (x instanceof C) ⊢ x : T \ C
```

### `as` assertion

```
Γ ⊢ e : S    S <: T or T <: S
────────────────────────────── (as-assert)
Γ ⊢ (e as T) : T

Γ ⊢ e : S    S and T are unrelated (neither <: the other)
──────────────────────────────────────────────────────── (as-unrelated)
Γ ⊢ (e as T)  → SJS-E002
```

### Join point

```
Γ, branch-true ⊢ x : A    Γ, branch-false ⊢ x : B
──────────────────────────────────────────────────── (join)
Γ, after-if ⊢ x : A | B
```

---

## JS Lowering (Prototype)

All narrowing is type-level only. No runtime guards, tag checks, or type-testing code is generated by narrowing alone. `as` assertions are erased completely.

```sjs
// SJS input
function display(x: string | number): string {
  if (typeof x === "string") {
    return x.toUpperCase();
  }
  return x.toFixed(2);
}

const val: unknown = fetch();
const s = val as string;
```

```javascript
// JS output — as erased, narrowing adds no code
function display(x) {
  if (typeof x === "string") {
    return x.toUpperCase();
  }
  return x.toFixed(2);
}

const val = fetch();
const s = val;
```

---

## LLVM Lowering (Future)

Narrowing informs the compiler which LLVM type and instructions to use in each branch. A `typeof` check on a tagged union generates a `load` of the tag followed by a comparison; the narrowed branch then uses the appropriately typed payload accessor.

```llvm
; string | number narrowed by typeof x === "string"
%tag = extractvalue %sjs_union %x, 0
%is_str = icmp eq i8 %tag, 0    ; 0 = string tag
br i1 %is_str, label %str_branch, label %num_branch

str_branch:
  ; use %x as %sjs_string — extract payload as fat ptr
  ...
num_branch:
  ; use %x as double
  ...
```

`as` assertions between pointer-compatible types lower to a `bitcast`. `as` between value types of compatible size lower to a `bitcast` or are a no-op if representations match. `as unknown → T` lowering inserts a tag check in debug builds.

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| `SJS-E002` | `as` assertion between types with no subtype relationship |
| `SJS-E003` | Property or method access on a value whose type has not been narrowed away from nullable or unknown |

---

## Examples

### Valid

```sjs
// ✓ Null check narrowing
function greet(name: string?): string {
  if (name === null) {
    return "Hello, stranger";
  }
  return "Hello, " + name.toUpperCase();  // name: string
}

// ✓ Early-return guard pattern
function process(x: number?): number {
  if (x === null) return 0;
  return x * 2;  // x: number
}

// ✓ typeof narrowing in union
function stringify(v: string | number | boolean): string {
  if (typeof v === "number") return v.toFixed(2);
  if (typeof v === "boolean") return v ? "yes" : "no";
  return v;  // v: string
}

// ✓ instanceof narrowing
function getMessage(e: Error | string): string {
  if (e instanceof Error) return e.message;
  return e;
}

// ✓ Discriminated union narrowing
type Msg = { type: "ping" } | { type: "data"; payload: string };
function handle(m: Msg): string {
  if (m.type === "ping") return "pong";
  return m.payload;  // m: { type: "data"; payload: string }
}

// ✓ as assertion — overlapping types
function coerce(x: unknown): string {
  return x as string;
}
```

### Invalid

```sjs
// ✗ SJS-E003: property access on unnarrowed nullable
function bad(name: string?): string {
  return name.toUpperCase();  // SJS-E003: name is string? — null check required
}

// ✗ SJS-E002: as between unrelated types
const n: number = 42;
const arr = n as string[];  // SJS-E002: number and string[] are unrelated

// ✗ <T>expr prefix form is banned
const s = <string>someValue;  // SJS-P001: use `someValue as string` instead
```
