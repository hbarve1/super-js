# 033 — Logical Assignment

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §AssignmentOperator, §AssignmentExpression

---

## Syntax

```ebnf
<AssignmentExpression> ::= <ConditionalExpression>
                         | <LeftHandSideExpression> <AssignmentOperator> <AssignmentExpression>

<AssignmentOperator>   ::= "="  | "+=" | "-=" | "*=" | "/=" | "%="
                         | "&&=" | "||=" | "??="
```

Three logical assignment operators: `&&=`, `||=`, and `??=`. The LHS must be an assignable target (variable binding or property access).

---

## Semantics

Logical assignment operators combine a short-circuit logical evaluation with a conditional assignment. The RHS is evaluated only when the assignment will actually occur.

### `a &&= b` — logical AND assignment

Equivalent to `a && (a = b)`. The assignment occurs only if `a` is truthy. If `a` is falsy, `a` retains its current value and `b` is not evaluated.

Use case: update a field only when the object/field is present and truthy.

### `a ||= b` — logical OR assignment

Equivalent to `a || (a = b)`. The assignment occurs only if `a` is falsy. If `a` is truthy, `a` retains its current value and `b` is not evaluated.

Use case: provide a fallback for any falsy value (including `0`, `""`, `false`).

### `a ??= b` — nullish assignment

Equivalent to `a ?? (a = b)`. The assignment occurs only if `a` is `null` or `undefined`. Non-null falsy values (`0`, `""`, `false`) do not trigger the assignment.

Use case: lazy initialization — assign a default only when a value is absent.

### Short-circuit evaluation

All three operators are short-circuit: the RHS is not evaluated if the condition is not met. This matters when the RHS has side effects.

```sjs
// b() is called only when obj.count is falsy
obj.count ||= computeDefault();
```

---

## Type rules

```
Γ ⊢ a : T     Γ ⊢ b : S
──────────────────────────────────── (and-assign)
Γ' ⊢ a &&= b    →  a : T & S in truthy branch
-- After &&=: a was truthy (T) and is now S; narrowed to T ∩ S

Γ ⊢ a : T     Γ ⊢ b : S
──────────────────────────────────── (or-assign)
Γ' ⊢ a ||= b    →  a : T | S
-- After ||=: a was falsy (took b) or truthy (kept T)

Γ ⊢ a : T | null     Γ ⊢ b : S
──────────────────────────────────── (nullish-assign)
Γ' ⊢ a ??= b    →  a : T | S
-- After ??=: null branch replaced with S; non-null T retained

Γ ⊢ a : T | undefined     Γ ⊢ b : S
────────────────────────────────────── (nullish-assign-undef)
Γ' ⊢ a ??= b    →  a : T | S
```

The LHS must be a mutable binding or writable property. Applying any logical assignment to a `const` binding is SJS-E001.

Type compatibility: the RHS type `S` must be assignable to the declared type of `a`. If `a: T` and `S` is not `<: T`, SJS-E001 is emitted.

---

## JS Lowering (Prototype)

For ES2021+ targets, all three operators pass through natively. For older targets, each is desugared to a conditional expression.

```sjs
// SJS input
let active: boolean = false;
active ||= computeDefault();

let name: string? = null;
name ??= "Anonymous";

let score: number = 10;
score &&= score * 2;
```

```javascript
// JS output (ES2021+ — pass-through)
let active = false;
active ||= computeDefault();

let name = null;
name ??= "Anonymous";

let score = 10;
score &&= score * 2;

// JS output (ES5 target — desugar)
let active = false;
active || (active = computeDefault());

let name = null;
(name === null || name === undefined) && (name = "Anonymous");

let score = 10;
score && (score = score * 2);
```

---

## LLVM Lowering (Future)

Control-flow analysis informs the branch structure. Each logical assignment compiles to a conditional branch followed by a store, unified by a phi node.

```llvm
; score &&= score * 2
%score_val = load double, double* %score
%truthy = fcmp une double %score_val, 0.0   ; non-zero = truthy
br i1 %truthy, label %do_assign, label %skip

do_assign:
  %new_val = fmul double %score_val, 2.0
  store double %new_val, double* %score
  br label %skip

skip:
  ; %score now holds updated value (or unchanged if falsy)

; name ??= "Anonymous"  where name: Nullable<string*>
%name_ptr = load %SjsString*, %SjsString** %name
%is_null  = icmp eq %SjsString* %name_ptr, null
br i1 %is_null, label %assign_default, label %keep

assign_default:
  store %SjsString* @__sjs_str_anonymous, %SjsString** %name
  br label %keep

keep:
```

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | LHS is a `const` binding; logical assignment to const is forbidden |
| `SJS-E001` | RHS type is not assignable to the declared type of LHS |

---

## Examples

### Valid

```sjs
// ||= to provide falsy fallback
let port: number = 0;
port ||= 3000;
// port is now 3000 (0 was falsy)

// ??= for null-only initialization
let title: string? = null;
title ??= "Untitled";
// title is now "Untitled"

// &&= to update only when present/truthy
type Counter { hits: number; }
function increment(c: Counter): void {
  c.hits &&= c.hits + 1;
}

// ??= on object property
type Config { timeout: number?; }
function normalize(cfg: Config): void {
  cfg.timeout ??= 5000;
}

// ||= for lazy default
let cached: string = "";
cached ||= computeExpensiveDefault();
```

### Invalid

```sjs
// SJS-E001: &&= on const
const limit: number = 100;
limit &&= 200;
// ^^^^^ SJS-E001: cannot reassign const binding limit

// SJS-E001: RHS type incompatible with LHS
let name: string = "Alice";
name ??= 42;
//       ^^ SJS-E001: number is not assignable to string

// SJS-E001: ||= on const property (readonly)
type Frozen { readonly value: number; }
const f: Frozen = { value: 0 };
f.value ||= 1;
// ^^^^^^^ SJS-E001: cannot assign to readonly property value
```
