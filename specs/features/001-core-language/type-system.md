# Super.js Type System

**Branch**: `001-superjs-core-language` | **Updated**: 2026-05-26 | **Status**: ✅ Implemented

---

## Overview

Super.js extends ECMAScript with an *opt-in* static type system.
The algorithm is **bidirectional type checking** (synthesis bottom-up, checking
top-down) combined with **gradual typing** (Siek & Taha 2006): positions without
type annotations receive the dynamic type `any`, which is *consistent* with every
other type, enabling incremental migration from plain JavaScript.

Each rule below links to the normative ECMAScript specification section at
**https://tc39.es/ecma262/** that defines the underlying language semantics.

---

## TC-001 · Primitive Types

Every Super.js primitive annotation maps one-to-one to an ECMAScript Language Type.

| Annotation | Kind       | ECMAScript Spec |
|------------|------------|-----------------|
| `number`   | Number     | [ECMA-262 §6.1.6.1 — The Number Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type) |
| `string`   | String     | [ECMA-262 §6.1.4 — The String Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type) |
| `boolean`  | Boolean    | [ECMA-262 §6.1.3 — The Boolean Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type) |
| `symbol`   | Symbol     | [ECMA-262 §6.1.5 — The Symbol Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type) |
| `bigint`   | BigInt     | [ECMA-262 §6.1.6.2 — The BigInt Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type) |
| `null`     | Null       | [ECMA-262 §6.1.2 — The Null Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type) |
| `undefined`| Undefined  | [ECMA-262 §6.1.1 — The Undefined Type](https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type) |
| `object`   | Object     | [ECMA-262 §6.1.7 — The Object Type](https://tc39.es/ecma262/#sec-object-type) |

**Root reference**: [ECMA-262 §6.1 — ECMAScript Language Types](https://tc39.es/ecma262/#sec-ecmascript-language-types)

**Rule**: The initializer of an annotated binding must be *consistent* with the declared
primitive type. Mismatches produce diagnostic `SJS-E001`.

```
const x: number = "hello"  // SJS-E001: 'string' is not consistent with 'number'
const y: number = 42       // ok
```

---

## TC-002 · null and undefined

`null` and `undefined` are first-class ECMAScript types (§6.1.1–6.1.2) with
distinct type identities. Super.js follows TypeScript's convention:

- `null` is assignable only where the annotation includes `| null`.
- `undefined` is assignable only where the annotation includes `| undefined`.

```
const a: string | null = null       // ok   — union includes null
const b: string        = null       // SJS-E001 — string does not include null
const c: number | undefined = undefined  // ok
```

**Spec**: [ECMA-262 §6.1.1](https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type),
[§6.1.2](https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type)

---

## TC-003 · Gradual Typing — the `any` type

`any` is the *dynamic type* and is **consistent** with every other type (written `any ~ T`).
This is the core mechanism that allows Super.js to be a *gradual* type system.

**Rules**:
1. Every position without a type annotation receives `any` implicitly.
2. `any ~ T` holds for all `T` — assigning `any` to a typed variable is allowed.
3. `T ~ any` holds for all `T` — assigning any typed value to an `any` binding is allowed.
4. `string ~ number` is **false** — consistency is not equality; gradual typing
   only erases checks involving `any`, not all type errors.

```
let x = "hello"      // x : any (no annotation → gradual)
x = 42               // ok — any allows re-assignment to any type

const y: any = "hi"  // explicit any
const z: number = y  // ok — any ~ number

const a: any = 1
const b: number = "wrong"  // SJS-E001 — unrelated annotated binding still checked
```

**Reference**: Siek & Taha, "Gradual Typing for Functional Languages" (SCHEME 2006),
§3 — Consistency relation.

---

## TC-004 · Variable Declarations and Re-assignment

Variable declaration introduces a binding in the lexical environment.
The declared type (or `any` if unannotated) is registered for subsequent
assignment checks.

**Spec**: [ECMA-262 §14.3.1 — Let and Const Declarations](https://tc39.es/ecma262/#sec-let-and-const-declarations)

**Rules**:
1. `const` and `let` declarations with a type annotation check the initializer
   against the declared type.
2. Re-assignment to a `let` binding that was annotated must remain consistent
   with the declared type.
3. `const` re-assignment is caught at the ECMAScript level (a runtime TypeError
   per §14.3.1); the type checker does not duplicate this check.

```
let x: number = 1
x = 2          // ok — number ~ number
x = "hello"    // SJS-E001 — string is not consistent with number
```

**Diagnostic**: `SJS-E001` — type mismatch in assignment.
**Spec anchor**: [§13.15 Assignment Operators](https://tc39.es/ecma262/#sec-assignment-operators)

---

## TC-005 · Function Return Types

A function with a declared return type annotation must return a consistent value.

**Spec**: [ECMA-262 §15.2 — Function Definitions](https://tc39.es/ecma262/#sec-function-definitions)

Sub-rules:

### 15.2a — Regular functions (block body)
Checked at each `return` statement.

```
function f(): number { return 42 }      // ok
function g(): number { return "hello" } // SJS-E002
```

### 15.2b — Arrow functions with concise body
Arrow functions of the form `=> expr` have an implicit return.
The expression is the return value; checked directly against the annotation.

**Spec**: [ECMA-262 §15.3 — Arrow Function Definitions](https://tc39.es/ecma262/#sec-arrow-function-definitions)

```
const f = (): number => 42       // ok
const g = (): number => "hello"  // SJS-E002
```

### 15.2c — void functions
A function declared `: void` must not return a value.

**Spec**: ECMAScript defines an *absent* completion value (§6.2.4.1) for
void functions; returning a value violates the caller's contract.

```
function h(): void { return 42 }  // SJS-E002 — void function must not return a value
```

**Diagnostic**: `SJS-E002` — return type mismatch.

---

## TC-006 · Function Parameter Types

When a call expression targets a locally-declared function whose type is known,
each argument is checked against the corresponding parameter's declared type.

**Spec**: [ECMA-262 §13.3.8.1 — Runtime Semantics: EvaluateCall](https://tc39.es/ecma262/#sec-evaluatecall)

```
function greet(name: string): string { return "hi " + name }

greet("Alice")   // ok
greet(42)        // SJS-E003 — argument 'name' expected string, got number
```

**Gradual rule**: If the callee's type is not in the environment (e.g., an
imported function, a method call, or a function assigned to `any`), the call
passes without type checking — `any` propagates silently.

**Optional parameters**: A parameter marked `?` may be omitted at the call site.

```
function f(x: number, y?: number): number { return x }
f(1)    // ok — y is optional
f(1, 2) // ok
```

**Diagnostic**: `SJS-E003` — argument type mismatch or missing required argument.

---

## TC-007 · Union Types

Union types (`A | B`) are derived from multiple ECMAScript types.
A value is consistent with a union if it is consistent with *any* member.

```
const x: string | number = "hello"  // ok — string ~ (string | number)
const y: string | number = 42       // ok — number ~ (string | number)
const z: string | number = true     // SJS-E001 — boolean not in union
```

**Consistency rules**:
- `T ~ (A | B)` iff `T ~ A` or `T ~ B`
- `(A | B) ~ T` iff `A ~ T` and `B ~ T` (all branches must be consistent)

---

## TC-008 · Strict Mode — Implicit `any` (SJS-W001)

When `--strict` is passed to the CLI (or `strict: true` in `superjs.config.json`),
unannotated variables and function parameters emit a warning instead of silently
receiving `any`. This mirrors TypeScript's `--noImplicitAny` flag.

```
// superjs build --strict
let count = 0
// warning[SJS-W001]: 'count' implicitly has type 'any' because it lacks a type annotation.

function add(a, b) { return a + b }
// warning[SJS-W001]: Parameter 'a' implicitly has type 'any' …
// warning[SJS-W001]: Parameter 'b' implicitly has type 'any' …
```

**Non-strict (default)**: no warnings — gradual typing is silent.

**Reference**: TypeScript `noImplicitAny` option:
https://www.typescriptlang.org/tsconfig/#noImplicitAny

---

## Diagnostic Codes

| Code       | Rule    | Severity | Message pattern |
|------------|---------|----------|-----------------|
| `SJS-E001` | TC-001, TC-002, TC-004, TC-007 | error | `I cannot assign a value of type 'X' to … declared as 'Y'.` |
| `SJS-E002` | TC-005 | error | `I expected … to return 'X' but found 'Y'.` |
| `SJS-E003` | TC-006 | error | `I expected argument 'name' to be of type 'X' but found 'Y'.` |
| `SJS-E004` | — | error | `Circular import detected: a.sjs → b.sjs. Circular imports are not allowed.` |
| `SJS-W001` | TC-008 | warning | `'x' implicitly has type 'any' because it lacks a type annotation.` |

All diagnostics include:
- `specUrl` — direct anchor to the ECMAScript (or TypeScript) section that defines the rule
- `line` + `column` — 1-based line, 0-based column (Babel convention)
- `severity` — `error` | `warning` | `note`

Pass `--json` to the CLI to receive diagnostics as SARIF-compatible ndjson.

---

## Implementation

| File | Purpose |
|------|---------|
| `src/typeChecker/types.ts` | `Type`, `Diagnostic`, `TypeEnvironment` interfaces |
| `src/typeChecker/index.ts` | `TypeChecker` class — `resolveType`, `inferExprType`, `isConsistent`, all TC-* rules |
| `src/diagnostic.ts` | `formatDiagnosticsAsJson`, `formatDiagnosticsAsText` renderers |
| `tests/typeChecker/type-checker.test.ts` | TC-001 through TC-007 (31 tests) |
| `tests/typeChecker/strict-mode.test.ts` | TC-008 / SJS-W001 (14 tests) |
