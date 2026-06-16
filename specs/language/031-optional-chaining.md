# 031 — Optional Chaining

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §LeftHandSideExpression, §MemberExpression, §CallExpression

---

## Syntax

```ebnf
<OptionalExpression> ::= <MemberExpression> <OptionalChain>
                       | <CallExpression>   <OptionalChain>
                       | <OptionalExpression> <OptionalChain>

<OptionalChain>      ::= "?." <Identifier>
                       | "?." "[" <Expression> "]"
                       | "?." "(" <ArgumentList> ")"
                       | <OptionalChain> "." <Identifier>
                       | <OptionalChain> "[" <Expression> "]"
                       | <OptionalChain> "(" <ArgumentList> ")"
```

Three forms: property access `a?.b`, indexed access `a?.[key]`, and call `f?.()`.

---

## Semantics

The `?.` operator short-circuits to `undefined` when the left-hand side (LHS) is `null` or `undefined`. If the LHS is any other value, evaluation proceeds identically to the non-optional form.

Short-circuit is complete: when any `?.` in a chain fires, the entire tail of the chain is skipped and the overall expression evaluates to `undefined`. No subsequent property accesses, index operations, or calls in that chain are executed.

### `a?.b` — optional property access

Evaluates `a`. If `a` is `null` or `undefined`, the expression is `undefined`. Otherwise evaluates and returns `a.b`.

### `a?.[key]` — optional index access

Evaluates `a`, then `key`. If `a` is `null` or `undefined`, the expression is `undefined`. Otherwise evaluates and returns `a[key]`.

### `f?.()` — optional call

Evaluates `f`. If `f` is `null` or `undefined`, the expression is `undefined`. Otherwise calls `f()`. If `f` is not callable (not a function), a runtime `TypeError` is thrown — `?.()` only guards against null/undefined, not against non-functions.

### Chained `?.`

Each `?.` in a chain is an independent short-circuit guard. In `a?.b?.c`, if `a` is null the entire expression short-circuits to `undefined` without evaluating `b` or `c`. If `a` is non-null but `a.b` is null, the second `?.` short-circuits and `c` is not accessed.

### Combination with `??`

`a?.b ?? fallback` is the canonical pattern for providing a default when either `a` is null/undefined or `a.b` is null/undefined. The `??` operator fires on `undefined` (the short-circuit value from `?.`).

---

## Type rules

```
Γ ⊢ a : T?       PropType(T, 'p') = U
─────────────────────────────────────── (opt-prop-nullable)
Γ ⊢ a?.p : U | undefined

Γ ⊢ a : T        PropType(T, 'p') = U
─────────────────────────────────────── (opt-prop-nonnull)
Γ ⊢ a?.p : U

Γ ⊢ a : T?       IndexType(T, K) = U
─────────────────────────────────────── (opt-index-nullable)
Γ ⊢ a?.[k] : U | undefined

Γ ⊢ f : ((A) => R)?
─────────────────────────────────────── (opt-call-nullable)
Γ ⊢ f?.() : R | undefined

Γ ⊢ f : (A) => R
─────────────────────────────────────── (opt-call-nonnull)
Γ ⊢ f?.() : R
```

When the LHS is non-nullable, `?.` is still syntactically valid but the `| undefined` branch is unreachable. The type-checker may emit SJS-W005 for dead-code optional chains on provably non-null values.

---

## JS Lowering (Prototype)

For ES2020+ targets, `?.` passes through as-is (native support). For older targets, each `?.` is lowered to a conditional expression.

```sjs
// SJS input
const city = user?.address?.city;
const val  = arr?.[0];
const r    = cb?.();
```

```javascript
// JS output (ES2020+ target — pass-through)
const city = user?.address?.city;
const val  = arr?.[0];
const r    = cb?.();

// JS output (ES5 target — polyfill)
const city = (user === null || user === undefined)
  ? undefined
  : (user.address === null || user.address === undefined)
      ? undefined
      : user.address.city;

const val = (arr === null || arr === undefined)
  ? undefined
  : arr[0];

const r = (cb === null || cb === undefined)
  ? undefined
  : cb();
```

---

## LLVM Lowering (Future)

Each `?.` compiles to a null-tag check followed by a conditional branch. The result is unified via a phi node.

```llvm
; a?.b  where a: Nullable<T>
%has_a = extractvalue %Nullable_T %a, 0
br i1 %has_a, label %non_null, label %was_null

non_null:
  %inner = extractvalue %Nullable_T %a, 1
  %b_val = getelementptr %T, %T* %inner, i32 0, i32 <field_idx>
  %b = load <B_ty>, <B_ty>* %b_val
  br label %merge

was_null:
  ; undefined sentinel represented as zero-value or tagged union
  br label %merge

merge:
  %result = phi <B_ty | undef> [ %b, %non_null ], [ undef, %was_null ]
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E003` | Plain `.` used on a nullable (`T?`) type without prior null narrowing; use `?.` |

---

## Examples

### Valid

```sjs
type Address { city: string; zip: string; }
type User    { name: string; address?: Address; }

// Optional property access
function getCity(u: User): string | undefined {
  return u.address?.city;
}

// Chained optional access
type Config { db?: { host?: string; } }
function getHost(cfg: Config): string | undefined {
  return cfg.db?.host;
}

// Optional call
function run(cb: (() => void)?): void {
  cb?.();
}

// Optional index access
function first(arr: string[]?): string | undefined {
  return arr?.[0];
}

// Combined with nullish coalescing
function cityOrDefault(u: User): string {
  return u.address?.city ?? "Unknown";
}
```

### Invalid

```sjs
// SJS-E003: plain . on nullable type
type Node { value: number; next?: Node; }

function bad(n: Node?): number {
  return n.value;
  //     ^^^^^^^ SJS-E003: n is Node? — use n?.value or narrow first
}

// SJS-E003: chained plain . on optional property
function alsoBad(u: User): string {
  return u.address.city;
  //     ^^^^^^^^^ SJS-E003: u.address is Address | undefined — use u.address?.city
}
```
