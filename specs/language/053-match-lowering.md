# 053 — Match Expression Lowering

**Status:** Stage 0

---

## Overview

This document specifies how `match` expressions are lowered to JS (prototype backend) and LLVM IR (future backend). Cross-referenced by `003-match.md`. For the `_tag`-based encoding that match dispatch depends on, see `052-sum-type-encoding.md`.

---

## JS Lowering Algorithm

A `match` expression is lowered to an immediately-invoked arrow function (IIFE). This is necessary because `match` is an expression — it must produce a value — and `if`/`return` sequences require a function boundary.

**Subject evaluation:** the subject expression is assigned to a single temp variable `$m`. This ensures the subject is evaluated exactly once, regardless of how many arms reference it. This is critical for side-effectful subjects (function calls, increments, etc.).

**IIFE template:**

```javascript
const $result = (() => {
  const $m = <subject_expression>;
  // ... arm dispatch ...
  throw new Error("[SJS] Non-exhaustive match");
})();
```

The trailing `throw` is a compile-time-dead sentinel. It is emitted in all cases except when a `default` or binding arm is present (which statically guarantees a match). An exhaustive match verified by SJS-E007 will never reach this throw at runtime.

### Arm dispatch by pattern kind

**Tuple variant `Ok(v)`** — tests `_tag`, binds `_0`:

```javascript
if ($m._tag === "Ok") { const v = $m._0; return <body>; }
```

**Multi-field tuple `Pair(_0, _1)`:**

```javascript
if ($m._tag === "Pair") { const a = $m._0; const b = $m._1; return <body>; }
```

**Record variant `Rect({ width, height })`** — tests `_tag`, destructures fields:

```javascript
if ($m._tag === "Rect") { const { width, height } = $m; return <body>; }
```

Record variant with field rename `Click({ x: cx, y: cy })`:

```javascript
if ($m._tag === "Click") { const { x: cx, y: cy } = $m; return <body>; }
```

**Unit variant `None`** — tests `_tag` only:

```javascript
if ($m._tag === "None") { return <body>; }
```

**Literal `42` or `"hello"`** — strict equality check:

```javascript
if ($m === 42) { return <body>; }
```

**Binding pattern `other`** — always matches, introduces binding:

```javascript
{ const other = $m; return <body>; }
```

No `if` guard. Must not be a known variant name in scope (resolved at type-check time).

**`default` wildcard** — always matches, no binding:

```javascript
return <body>;
```

No `if` guard. Must appear last (enforced by the exhaustiveness check and parser).

### Block body arms

When an arm body is a `BlockStatement`, the final expression is lifted to a `return`:

```sjs
match x {
  Ok(v) => {
    const doubled = v * 2;
    doubled + 1
  },
  Err(e) => 0,
};
```

```javascript
(() => {
  const $m = x;
  if ($m._tag === "Ok") {
    const v = $m._0;
    const doubled = v * 2;
    return doubled + 1;
  }
  if ($m._tag === "Err") { const e = $m._0; return 0; }
  throw new Error("[SJS] Non-exhaustive match");
})()
```

The last statement in a block arm that is an expression statement is rewritten to `return <expr>`. If the block ends with a `return` statement, no rewrite is needed.

---

## LLVM Lowering

Match expressions compile to a `switch` instruction on the `_tag` i8 field. Each arm becomes a labeled basic block. The final match value is collected via a `phi` node at the merge point.

```llvm
; match result { Ok(v) => v * 2.0, Err(e) => -1.0 }
; Assume: Ok = tag 0, Err = tag 1

%tag = extractvalue %Result_f64_str %result, 0
switch i8 %tag, label %exhaustiveness_trap [
  i8 0, label %arm_ok
  i8 1, label %arm_err
]

arm_ok:
  %payload_ok  = extractvalue %Result_f64_str %result, 1
  %f64_ptr     = bitcast [24 x i8] %payload_ok to double
  %arm_ok_val  = fmul double %f64_ptr, 2.0
  br label %match_exit

arm_err:
  ; string payload extraction omitted for brevity
  br label %match_exit

exhaustiveness_trap:
  ; unreachable in exhaustive matches — type-checker guarantees coverage
  ; retained in debug builds for crash diagnostics
  ; optimized away (dead block) in release builds
  unreachable

match_exit:
  %match_result = phi double [ %arm_ok_val, %arm_ok ], [ -1.0, %arm_err ]
```

For record variants, field extraction uses a typed pointer cast on the payload byte array:

```llvm
; arm for Rect({ width, height }) where %RectPayload = type { double, double }
arm_rect:
  %payload     = extractvalue %Shape %subject, 1
  %rect_ptr    = bitcast [16 x i8] %payload to %RectPayload*
  %width       = load double, double* getelementptr(%RectPayload, %RectPayload* %rect_ptr, 0, 0)
  %height      = load double, double* getelementptr(%RectPayload, %RectPayload* %rect_ptr, 0, 1)
  %area        = fmul double %width, %height
  br label %match_exit
```

---

## Optimizations

| Condition | Optimization applied |
|---|---|
| Subject is a pure load (no side effects) | Temp `$m` / alloca elided; subject referenced directly |
| All arms covered (exhaustive) | `exhaustiveness_trap` / `throw` block is dead code; removed by optimizer |
| Single-arm match (one variant type) | Degenerates to a direct `_tag` check + extract — no switch or IIFE overhead |
| Large match (> 4 arms, LLVM) | Compiler annotates `switch` with `branch_weights` to prefer the statistically hot arm; backends may emit a jump table |
| Literal-only match | LLVM backend uses `switch` on the value directly (no tag) |

---

## Diagnostics

None. Match lowering runs after SJS-E007 (exhaustiveness) and SJS-W003 (unreachable arm) have been resolved. Lowering failures are internal compiler errors.
