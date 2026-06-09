# 052 — Sum Type Runtime Encoding

**Status:** Stage 0 — authoritative

---

## Overview

This document is the authoritative specification for the runtime representation of sum type values in both the JS prototype backend and the LLVM backend. All code generation, pattern matching, and runtime reflection must conform to this encoding. Cross-referenced by `002-sum-types.md` and `003-match.md`.

---

## JS Encoding

Sum type values are plain JavaScript objects. Every value carries a mandatory `_tag` property that identifies the variant. Payload fields follow a fixed naming convention determined by the variant form.

### Unit variant `| None`

No payload fields. The object contains only `_tag`.

```javascript
{ _tag: "None" }
```

### Tuple variant `| Ok(T)`

Single positional payload stored under key `_0`.

```javascript
{ _tag: "Ok", _0: value }
```

Multiple tuple fields `| Pair(A, B)`:

```javascript
{ _tag: "Pair", _0: firstValue, _1: secondValue }
```

Positional keys `_0`, `_1`, `_2`, … continue for as many fields as declared.

### Record variant `| Circle { radius: number }`

Each declared field name is used directly as an object key. No `_0` key is present.

```javascript
{ _tag: "Circle", radius: 5 }
```

Multi-field record `| Rect { width: number, height: number }`:

```javascript
{ _tag: "Rect", width: 10, height: 4 }
```

---

## `_tag` Invariants

- Type: always a `string`, never a number or symbol.
- Value: the exact variant name as declared in the `type` definition — case-sensitive, no transformation.
- Position: `_tag` must be the **first** property. V8 and SpiderMonkey optimize property access on consistent object shapes ("hidden classes"); placing `_tag` first ensures the discriminant check hits the fastest path.
- Payload keys: `_0`, `_1`, … for tuple variants; field names for record variants; absent for unit variants.
- Frozen: objects are NOT frozen by default. The `--frozen-tags` compiler option wraps each constructor output in `Object.freeze(…)`, enabling stricter immutability guarantees at a small runtime cost.
- Prototype: `Object.prototype` (plain object literal). No custom prototype chain.

---

## Constructor Inlining

Variant constructors are **not** emitted as helper functions. Each constructor expression is lowered to an inline object literal at the call site. This enables:

- Dead-code elimination: an unused `Ok(42)` is eliminated without a function-call side-effect barrier.
- Engine shape specialization: inline literals give the JS engine full visibility into object shape.
- Zero call overhead: no function dispatch.

```sjs
// SJS
const r: Result<number, string> = Ok(42);
```

```javascript
// JS — inlined, no helper function
const r = { _tag: "Ok", _0: 42 };
```

**Exception — higher-order use.** When a constructor is used as a first-class value (passed as a callback or stored in a variable without immediate application), the compiler wraps it in an arrow function:

```sjs
// SJS
const values = arr.map(Ok);
```

```javascript
// JS — arrow wrapper emitted
const values = arr.map(v => ({ _tag: "Ok", _0: v }));
```

Multi-field tuple constructor used as callback:

```javascript
arr.map((a, b) => ({ _tag: "Pair", _0: a, _1: b }));
```

The compiler detects higher-order use by checking whether the constructor expression appears in a non-call-expression position (argument to another call, right-hand side of assignment without immediate invocation, etc.).

---

## LLVM Encoding

In LLVM IR, sum type values are tagged unions. The tag is an `i8` (supports up to 255 variants per type). The payload is a byte array sized to the largest variant's concrete payload. Tag values are assigned in variant declaration order starting at 0 and are stable across compilations.

```llvm
; type Result<number, string>  (monomorphized)
; Variants: Ok(double)=0, Err(%SjsString)=1
; sizeof double = 8 bytes; sizeof %SjsString = { i8*, i64, i64 } = 24 bytes
; payload size = max(8, 24) = 24

%Result_f64_str = type {
  i8,           ; _tag: 0 = Ok, 1 = Err
  [24 x i8]     ; payload union
}
```

### Constructing `Ok(42.0)`

```llvm
%result = alloca %Result_f64_str, align 8
%tag_ptr     = getelementptr %Result_f64_str, %Result_f64_str* %result, 0, 0
store i8 0, i8* %tag_ptr                       ; tag = 0 (Ok)
%payload_ptr = getelementptr %Result_f64_str, %Result_f64_str* %result, 0, 1
%f64_ptr     = bitcast [24 x i8]* %payload_ptr to double*
store double 42.0, double* %f64_ptr
```

### Constructing `Err("not found")`

```llvm
store i8 1, i8* %tag_ptr                       ; tag = 1 (Err)
%str_ptr = bitcast [24 x i8]* %payload_ptr to %SjsString*
; ... initialize SjsString fields (ptr, len, cap)
```

### Tag assignment policy

Tags are assigned `0, 1, 2, …` in the order variants appear in the `type` declaration. This assignment is deterministic and stable: recompiling the same source always produces the same tag values. Adding a new variant to the end of a sum type increments the maximum tag but does not change existing tag values.

Removing or reordering variants is a breaking change requiring a full recompile of all dependents.

---

## Diagnostics

None. The encoding is a compiler implementation detail, not directly observable by user code. Violations produce internal compiler errors, not SJS diagnostic codes.
