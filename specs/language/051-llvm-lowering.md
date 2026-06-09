# 051 — LLVM Lowering (Future)

**Status:** Stage 2+

---

## Overview

The LLVM backend compiles fully-annotated SJS (Phase 3 — no unannotated positions, no `dynamic` without an explicit narrowing tag) to LLVM IR 17. Each `.sjs` file produces one LLVM module. Generic types are monomorphized: every unique instantiation of `f<T>` or `Container<T>` produces a concrete LLVM function or struct with the type parameters substituted. No polymorphic dispatch through type erasure.

**Memory model:**
- v1: arena allocator. Objects are never individually freed. Suitable for short-lived compiler, CLI, and server processes with bounded allocation. No GC pauses.
- v2: precise moving GC with per-type maps generated at compile time. Required for long-lived processes and data-structure-heavy programs.

---

## Type → LLVM IR Mapping

| SJS type | LLVM IR type | Notes |
|---|---|---|
| `number` | `double` | IEEE 754 64-bit float |
| `string` | `%SjsString = type { i8*, i64, i64 }` | ptr, len, cap; short-string optimization (SSO) for ≤15 bytes stores inline |
| `boolean` | `i1` (register), `i8` (memory) | widened to `i8` when stored in structs for alignment |
| `bigint` | `%SjsBigInt = type { i32*, i32, i8 }` | digits array, len, sign byte; GMP-compatible layout |
| `symbol` | `%SjsSymbol = type { i8*, i64 }` | description_ptr, unique_id (monotonic counter) |
| `null` | pointer-typed `null` or sentinel `i8* null` | depends on context: null pointer when T is a pointer type |
| `undefined` | sentinel `i8* @sjs_undef_sentinel` | static global; pointer comparison |
| `void` | LLVM `void` | return type only; cannot be stored |
| `never` | function attributed `noreturn`; body ends with `unreachable` | callers may omit successor block |
| `unknown` | `%SjsDynamic` (same representation as `dynamic`) | must be narrowed before any operation |
| `dynamic` | `%SjsDynamic = type { i8, [8 x i8] }` | 1-byte tag + 8-byte payload union; see `004-dynamic.md` |
| `T?` nullable | `{ i1, T }` tagged struct, OR null pointer when T is a pointer type | tagged-struct form used for scalar T |
| `T[]` array | `%SjsArray_T = type { T*, i64, i64 }` | data ptr, len, cap; monomorphized per T |
| `[A, B]` tuple | `{ A, B }` | fields in declaration order; stack-allocated by default |
| `(P) => R` function type | `R (*)(P)` function pointer; closure = `{ R(*)(P, %env*), %env* }` fat pointer | |
| `{ k: T }` object type | `%Struct_name = type { T, ... }` | fields in declaration order; name mangled from type shape |
| Sum type | `{ i8, [N x i8] }` | tag byte + payload union sized to largest variant |

---

## Key Lowering Patterns

### Functions

```llvm
define double @double(double %n) {
entry:
  %result = fmul double %n, 2.0
  ret double %result
}
```

Type annotations are erased before LLVM emission. Parameter and return types come from the monomorphized signature.

### Closures

A closure is a fat pointer: a function pointer plus an environment pointer. The environment struct captures all free variables by value (or by pointer for mutable captures).

```llvm
; function add(x: number): (number) => number
%Closure_add_env = type { double }          ; captured: x
%Closure_add     = type { double (double, %Closure_add_env*)*, %Closure_add_env* }

define double @add_inner(double %y, %Closure_add_env* %env) {
  %x = load double, double* getelementptr(%Closure_add_env, %Closure_add_env* %env, 0, 0)
  %sum = fadd double %x, %y
  ret double %sum
}
```

### Nullable check (`T?`)

```llvm
; if (value != null) { ... }
%is_null = icmp eq i8 %tag, 0          ; tag 0 = null
br i1 %is_null, label %null_branch, label %value_branch
```

### Interface dispatch (vtable)

Interfaces compile to vtable structs. Each interface method becomes a function pointer slot. Values implementing the interface are fat pointers: `{ vtable*, data* }`.

```llvm
%AnimalVtable = type { void (%AnimalData*)* }   ; one slot: speak()
%Animal       = type { %AnimalVtable*, i8* }     ; vtable ptr + opaque data ptr

; Dispatch: animal.speak()
%vtable_ptr = extractvalue %Animal %animal, 0
%speak_slot = getelementptr %AnimalVtable, %AnimalVtable* %vtable_ptr, 0, 0
%speak_fn   = load void(%AnimalData*)*, void(%AnimalData*)** %speak_slot, align 8
%data_ptr   = extractvalue %Animal %animal, 1
%data_typed = bitcast i8* %data_ptr to %AnimalData*
call void %speak_fn(%AnimalData* %data_typed)
```

### Monomorphization

Each unique instantiation of a generic function or type is emitted as a distinct LLVM function or struct. The compiler maintains a monomorphization cache keyed on `(generic_name, [concrete_types…])`. Duplicate instantiations across modules are de-duplicated at link time via `linkonce_odr`.

### Memory (v1 arena)

```llvm
declare i8* @sjs_arena_alloc(i64 %size, i64 %align)

; Allocate a %Shape on the arena
%raw = call i8* @sjs_arena_alloc(i64 ptrtoint(%Shape* getelementptr(%Shape, null, 1) to i64), i64 8)
%ptr = bitcast i8* %raw to %Shape*
```

---

## Diagnostics

None. LLVM lowering is post-type-check. Failures during IR generation are internal compiler errors, not user-facing diagnostic codes.
