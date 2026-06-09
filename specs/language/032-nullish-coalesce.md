# 032 — Nullish Coalescing

**Status:** Stage 1 — implemented
**Grammar:** `specs/grammar.ebnf` §NullishCoalescing, §AssignmentOperator

---

## Syntax

```ebnf
<NullishCoalescing> ::= <LogicalOrExpression>
                      | <NullishCoalescing> "??" <LogicalOrExpression>

<AssignmentExpression> ::= <ConditionalExpression>
                         | <LeftHandSideExpression> "??=" <AssignmentExpression>
```

Two operators: the binary `??` (nullish coalescing) and the compound assignment `??=` (nullish assignment).

---

## Semantics

### `a ?? b` — nullish coalescing

Returns `b` if and only if `a` is `null` or `undefined`. If `a` is any other value — including `0`, `""`, `false`, or `NaN` — `a` is returned unchanged.

This is the key distinction from the logical OR (`||`) operator: `||` treats all falsy values as trigger conditions, while `??` triggers only on the two nullish values (`null` and `undefined`).

```
0    ?? "default"   →  0          (0 is not nullish)
""   ?? "default"   →  ""         ("" is not nullish)
false ?? true       →  false      (false is not nullish)
null ?? "default"   →  "default"  (null is nullish)
undefined ?? "x"    →  "x"        (undefined is nullish)
```

### `a ??= b` — nullish assignment

Assigns `b` to `a` only if `a` is currently `null` or `undefined`. If `a` is non-null, no assignment occurs and `a` is not re-evaluated as an assignment target. This is short-circuit evaluation: `b` is evaluated only when the assignment will occur.

After `??=` executes (and assuming `b: B`), the type of `a` is narrowed to `T | B` where `T` is the non-nullable portion of its original declared type.

### Mixing `??` with `||` and `&&`

`??` cannot be directly chained with `||` or `&&` without explicit grouping parentheses. This is a syntax-level restriction (mirrors the ECMA-262 grammar) that prevents ambiguous precedence. Use parentheses to combine:

```sjs
(a || b) ?? c   // valid — explicit grouping
a ?? (b || c)   // valid — explicit grouping
a ?? b || c     // SJS-P001: parse error — ambiguous precedence
```

---

## Type rules

```
Γ ⊢ a : A | null     Γ ⊢ b : B
──────────────────────────────────── (nullish-null)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A | undefined     Γ ⊢ b : B
──────────────────────────────────────── (nullish-undef)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A | null | undefined     Γ ⊢ b : B
────────────────────────────────────────────── (nullish-both)
Γ ⊢ a ?? b : A | B

Γ ⊢ a : A     null ∉ A     undefined ∉ A
────────────────────────────────────────── (nullish-noop)
Γ ⊢ a ?? b : A     -- b branch unreachable; SJS-W005 may fire
```

When `B <: A`, the result type simplifies to `A` — the union collapses. The type-checker performs this simplification automatically.

For `??=`: after the statement `a ??= b` where `a: T | null` and `b: B`:

```
Γ ⊢ a : T | null     Γ ⊢ b : B     B <: T
────────────────────────────────────────────── (nullish-assign)
Γ' ⊢ a : T      (null branch replaced; if B <: T, result is T)
```

---

## JS Lowering (Prototype)

For ES2020+ targets, `??` passes through natively. For ES5 targets, the compiler emits a conditional expression. `??=` (ES2021) is lowered to a conditional assignment for older targets.

```sjs
// SJS input
const label: string = title ?? "Untitled";

let port: number? = null;
port ??= 8080;
```

```javascript
// JS output (ES2020+ — pass-through)
const label = title ?? "Untitled";
let port = null;
port ??= 8080;

// JS output (ES5 target — polyfill)
const label = (title !== null && title !== undefined) ? title : "Untitled";
let port = null;
if (port === null || port === undefined) { port = 8080; }
```

---

## LLVM Lowering (Future)

```llvm
; a ?? b  where a: Nullable<T>
%is_null = extractvalue %Nullable_T %a, 0
%is_null_i1 = icmp eq i1 %is_null, 0   ; 0 = no value = nullish
br i1 %is_null_i1, label %use_b, label %use_a

use_a:
  %a_val = extractvalue %Nullable_T %a, 1
  br label %merge

use_b:
  ; evaluate b
  br label %merge

merge:
  %result = phi <T> [ %a_val, %use_a ], [ %b_val, %use_b ]

; ??= is equivalent: only store if null tag was set
```

For pointer-represented nullables (objects, strings), the null pointer serves as the null sentinel — no tag extraction is needed; use a single `icmp eq ptr, null` check.

---

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-E001` | Result of `??` assigned to a type that does not accommodate both branches |
| `SJS-P001` | `??` chained with `\|\|` or `&&` without explicit parentheses |

---

## Examples

### Valid

```sjs
// Basic nullish fallback
function display(label: string?): string {
  return label ?? "(none)";
}

// Preserves falsy non-null values
const timeout: number = userTimeout ?? 5000;
// If userTimeout is 0, result is 0 — not 5000

// Nullish assignment to initialize lazily
interface Cache { data: string?; }
function getOrInit(c: Cache): string {
  c.data ??= "default";
  return c.data;
}

// Chained optional + nullish coalescing
interface User { profile?: { displayName?: string; } }
function getName(u: User): string {
  return u.profile?.displayName ?? "Anonymous";
}

// ??= with nullable let
let config: string? = null;
config ??= "production";
// config is now "production"
```

### Invalid

```sjs
// SJS-E001: result not assignable to declared type
const name: string = (null as string?) ?? null;
//                                        ^^^^ SJS-E001: null is not assignable to string

// SJS-P001: ?? mixed with || without parens
const val = a ?? b || c;
//              ^^^^^^^^ SJS-P001: ?? cannot be mixed with || without parentheses

// SJS-W005: ?? on non-nullable operand (left branch always taken)
const fixed: string = "hello";
const result = fixed ?? "unused";
//             ^^^^^ SJS-W005: left side of ?? is never null or undefined
```
