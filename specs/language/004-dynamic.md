# 004 — Dynamic Type

**Status:** Implemented (Stage 1 type-checker)
**Grammar:** `specs/grammar.ebnf` §PrimitiveType

---

## Syntax

`dynamic` is a reserved keyword in SJS and a member of the `<PrimitiveType>` production. It appears only in type positions; there is no `dynamic` expression form.

```ebnf
<PrimitiveType> ::= "number"
                  | "string"
                  | "boolean"
                  | "null"
                  | "undefined"
                  | "void"
                  | "never"
                  | "unknown"
                  | "dynamic"
```

Values acquire the type `dynamic` through explicit annotation (`let x: dynamic = ...`) or through inference when no annotation is present and the compiler cannot determine a more specific type (see Semantics §Implicit dynamic).

---

## Semantics

### Gradual typing

`dynamic` is the gradual type. It participates in the type system through a consistency relation rather than a subtyping relation. The notation `T ~ U` means "T is consistent with U".

`dynamic` is consistent with every type and every type is consistent with `dynamic`:

```
dynamic ~ T    for all T
T ~ dynamic    for all T
```

This is distinct from subtyping: `dynamic` is not a subtype of `T`, nor is `T` a subtype of `dynamic`. The consistency relation is symmetric but not transitive.

### Distinguished from `unknown`

`unknown` is the top type in SJS — every type is a subtype of `unknown`. Unlike `dynamic`, operating on an `unknown` value without narrowing is a compile error. `unknown` is safe by construction; `dynamic` delegates safety to the programmer.

| Property | `dynamic` | `unknown` |
|----------|-----------|-----------|
| Assignable from any type | Yes (consistency) | Yes (subtyping) |
| Assignable to any typed position | Yes (consistency) | No (must narrow) |
| Property access without narrowing | Yes (result: `dynamic`) | No (compile error) |
| Method call without narrowing | Yes (result: `dynamic`) | No (compile error) |
| Arithmetic without narrowing | Yes (result: `dynamic`) | No (compile error) |

### Distinguished from banned `any`

TypeScript's `any` is banned in SJS. The keyword `any` is a reserved word that triggers SJS-E004. The conceptual role of `any` in TypeScript is filled by `dynamic` in SJS, with two differences:

1. `dynamic` emits SJS-W001 in `--strict` mode when implicit, making gradual typing visible.
2. In the LLVM backend (Phase 3), `dynamic` carries a runtime type tag, enabling safe dispatch.

### Propagation

Operations on `dynamic` values propagate the type:

- Property access: `e.prop` where `e: dynamic` → type is `dynamic`
- Method call: `e.method(args)` where `e: dynamic` → type is `dynamic`
- Element access: `e[k]` where `e: dynamic` → type is `dynamic`
- Function call: `e(args)` where `e: dynamic` → type is `dynamic`
- Arithmetic: `e + x` where `e: dynamic` → type is `dynamic`

This ensures that the `dynamic` boundary does not silently stop propagating — values derived from a `dynamic` source remain `dynamic` until an explicit type annotation or narrowing is applied.

### Implicit dynamic

When a declaration position has no type annotation and inference cannot determine a specific type, the position is implicitly typed as `dynamic`.

- **Phase 1 (current):** Implicit `dynamic` is silently accepted. No diagnostic.
- **Phase 2 (`--strict`):** Implicit `dynamic` emits SJS-W001 on the unannotated position.
- **Phase 3 (LLVM target):** Implicit `dynamic` in fully-typed positions is a compile error; annotation is required.

### Appropriate use cases

`dynamic` is appropriate at boundaries where the type is genuinely unknown at compile time:

1. **JS interop:** Calling a third-party library that has no `.d.sjs` declaration file.
2. **JSON deserialization:** The result of `JSON.parse(s)` is `dynamic` until narrowed.
3. **Incremental migration:** Translating plain JavaScript to SJS; `dynamic` is a placeholder to be removed as types are added.

`dynamic` is NOT appropriate as a substitute for:

- Not knowing the type → use `unknown` with narrowing
- Multiple possible types → use a union type `A | B`
- A reusable container of unknown type → use a type parameter `<T>`

### Narrowing `dynamic`

A `dynamic` value can be narrowed using type guards before use in a type-safe position:

```sjs
let val: dynamic = getFromCache();

if (typeof val === "string") {
  // val: string in this branch
  console.log(val.toUpperCase());
}
```

After narrowing, the value is treated as the narrowed type. This is the recommended pattern for operating on `dynamic` values safely.

---

## Type rules

### Consistency rules

```
──────────────────── (dyn-top)
dynamic ~ T

──────────────────── (dyn-bottom)
T ~ dynamic
```

Consistency is symmetric but not transitive. `int ~ dynamic` and `dynamic ~ string` does NOT imply `int ~ string`.

### Assignment via consistency

```
Γ ⊢ e : dynamic     target type is T
──────────────────────────────────────── (dyn-assign-to-typed)
Γ ⊢ e assignable to T     (warning SJS-W002 in strict mode)

Γ ⊢ e : T     target type is dynamic
──────────────────────────────────────── (dyn-assign-from-typed)
Γ ⊢ e assignable to dynamic
```

### Property access propagation

```
Γ ⊢ e : dynamic
────────────────────────── (dyn-prop)
Γ ⊢ e.prop : dynamic
```

### Call propagation

```
Γ ⊢ e : dynamic
────────────────────────────────────── (dyn-call)
Γ ⊢ e(a1, ..., aN) : dynamic
```

### Arithmetic propagation

```
Γ ⊢ e1 : dynamic      Γ ⊢ e2 : T
──────────────────────────────────── (dyn-arith-left)
Γ ⊢ e1 op e2 : dynamic

Γ ⊢ e1 : T      Γ ⊢ e2 : dynamic
──────────────────────────────────── (dyn-arith-right)
Γ ⊢ e1 op e2 : dynamic
```

### Narrowing

```
Γ ⊢ e : dynamic
typeof e === "string" in branch B
──────────────────────────────────────── (dyn-narrow-typeof)
Γ|B ⊢ e : string
```

Narrowing applies to: `typeof`, `instanceof`, and discriminant checks. After narrowing, the value is treated as the narrowed type within the scope of the narrowed branch.

---

## JS Lowering (Prototype)

`dynamic` is erased entirely at compile time. No runtime representation is generated, no wrapper is emitted, and no type tag is attached to the value. A value of type `dynamic` is passed through the JS output as-is.

```sjs
// SJS input
function parseConfig(raw: dynamic): string {
  return raw.name;
}
```

```javascript
// JS output — dynamic erased, no wrappers
function parseConfig(raw) {
  return raw.name;
}
```

Implicit dynamic positions similarly produce no annotation in the output:

```sjs
// SJS input (implicit dynamic in non-strict mode)
function identity(x) {
  return x;
}
```

```javascript
// JS output — unchanged
function identity(x) {
  return x;
}
```

---

## LLVM Lowering (Future)

In the LLVM backend (Phase 3), `dynamic` values carry a runtime type tag. The tag enables safe dispatch for operations on dynamic values.

```llvm
; Dynamic value representation
%Dynamic = type { i8, %DynamicPayload }
%DynamicPayload = type { [8 x i8] }

; Tag encoding:
; 0 = number (f64)
; 1 = string (i8*)
; 2 = boolean (i1)
; 3 = null
; 4 = undefined
; 5 = object (%SJSObject*)
; 6 = array (%SJSArray*)
```

### Runtime dispatch for property access

Property access on a `dynamic` value dispatches through a runtime library function:

```llvm
; e.prop where e: dynamic
; Calls: __sjs_dynamic_prop(%Dynamic %e, i8* prop_name)
%prop_name = getelementptr [5 x i8], [5 x i8]* @.str.name, i32 0, i32 0
%result = call %Dynamic @__sjs_dynamic_prop(%Dynamic %e, i8* %prop_name)
```

### Runtime dispatch for arithmetic

```llvm
; e1 + e2 where e1: dynamic
; Calls: __sjs_dynamic_add(%Dynamic %e1, %Dynamic %e2)
%result = call %Dynamic @__sjs_dynamic_add(%Dynamic %e1, %Dynamic %e2)
```

The runtime library implements `__sjs_dynamic_add`, `__sjs_dynamic_prop`, `__sjs_dynamic_call`, etc. Each function inspects the tag and dispatches accordingly, mimicking JavaScript semantics for dynamic values.

---

## `dynamic` vs `unknown` vs `any` comparison

| Property | `dynamic` (SJS) | `unknown` (SJS) | `any` (TypeScript, banned in SJS) |
|---|---|---|---|
| Assignable from any type | Yes (consistency) | Yes (subtyping) | Yes |
| Assignable to any typed position | Yes (consistency) | No — must narrow first | Yes |
| Property access without narrowing | Yes — result is `dynamic` | No — compile error | Yes |
| Method call without narrowing | Yes — result is `dynamic` | No — compile error | Yes |
| Arithmetic without narrowing | Yes — result is `dynamic` | No — compile error | Yes |
| Implicit (unannotated) | Yes, with SJS-W001 in strict | Not implicit | Yes (was implicit in TS) |
| LLVM backend | Tagged union with runtime dispatch | Requires narrowing before LLVM use | N/A — banned |
| When to use | Interop boundaries, JSON, migration | "I will narrow before use" | Never — use `dynamic` |

---

## Diagnostic codes

| Code | When emitted |
|------|--------------|
| SJS-E004 | The keyword `any` appears in a type position (banned; message suggests `dynamic`) |
| SJS-W001 | An unannotated position is inferred as `dynamic` in `--strict` mode |
| SJS-W002 | A `dynamic` value is assigned to a typed position without narrowing in `--strict` mode |

---

## Examples

### Valid: interop boundary

```sjs
// Third-party library with no .d.sjs declarations
declare function loadPlugin(name: string): dynamic;

const plugin: dynamic = loadPlugin("chart-lib");
const version: dynamic = plugin.version;  // dynamic.prop → dynamic
const chart = plugin.create({ width: 400, height: 300 });  // dynamic.call → dynamic
```

### Valid: JSON parsing

```sjs
function parseUser(json: string): dynamic {
  return JSON.parse(json);  // JSON.parse returns dynamic
}

const raw: dynamic = parseUser('{"name":"Alice","age":30}');
// Access fields via dynamic — compiler trusts the programmer
const name: dynamic = raw.name;
```

### Valid: narrowing dynamic before use

```sjs
function processValue(val: dynamic): string {
  if (typeof val === "string") {
    // val: string in this branch
    return val.toUpperCase();
  }
  if (typeof val === "number") {
    // val: number in this branch
    return val.toFixed(2);
  }
  return String(val);
}
```

### Valid: incremental migration pattern

```sjs
// Phase 1: migrating from JS — dynamic is a temporary placeholder
function legacyTransform(input: dynamic): dynamic {
  const result: dynamic = input.data;
  return { processed: true, value: result };
}

// Phase 2 (target): replace dynamic with real types
function legacyTransform(input: { data: number }): { processed: boolean, value: number } {
  return { processed: true, value: input.data };
}
```

### Valid: explicit dynamic annotation (suppresses SJS-W001)

```sjs
// Explicit annotation: programmer has acknowledged dynamic use
let cache: dynamic = null;

function setCache(val: dynamic): void {
  cache = val;
}
```

### Invalid: using `any` (SJS-E004)

```sjs
// SJS-E004: `any` is banned in SJS
function process(x: any): any {
//                  ^^^  ^^^ SJS-E004: `any` is not a valid SJS type; use `dynamic`
  return x;
}
```

### Warning: implicit dynamic in strict mode (SJS-W001)

```sjs
// With --strict flag:
function add(a, b) {
//           ^  ^ SJS-W001: parameter a has no type annotation; inferred as dynamic
//              ^ SJS-W001: parameter b has no type annotation; inferred as dynamic
  return a + b;
}
```

### Warning: dynamic assigned to typed position (SJS-W002, strict mode)

```sjs
// With --strict flag:
function extract(data: dynamic): string {
  const name: string = data.name;
  //                   ^^^^^^^^^ SJS-W002: dynamic value assigned to string without narrowing
  return name;
}

// Fix: narrow first
function extract(data: dynamic): string {
  const raw: dynamic = data.name;
  if (typeof raw !== "string") {
    throw new Error("name must be a string");
  }
  return raw;  // raw: string here — no SJS-W002
}
```

### Invalid: using `dynamic` where a type parameter is appropriate

```sjs
// Incorrect: loses type information
function identity(x: dynamic): dynamic {
  return x;
}

// Correct: use a type parameter to preserve the relationship
function identity<T>(x: T): T {
  return x;
}
```
