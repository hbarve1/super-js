# 007 — Banned TypeScript Features

**Status:** Implemented (Stage 1 parser + type-checker)
**Grammar:** `specs/grammar.ebnf` §BannedConstructs

---

## Overview

SJS is a strict subset of TypeScript's value language combined with a simplified, decidable type system. Several TypeScript type-system features are **banned** in SJS because they are:

- Undecidable or Turing-complete (conditional types, mapped types, `infer`)
- Unsafe escape hatches (`any`, `!` non-null assertion)
- Non-ECMAScript constructs with runtime overhead (`enum`, `namespace`)
- Incompatible with monomorphization and static memory layout (intersections, indexed access, `typeof` in type position)

This document is the normative reference for all banned constructs. Each section gives: what the construct is, why it is banned, the error code, the SJS alternative, and before/after examples.

The compiler emits the relevant diagnostic code and **halts code generation** for any file containing a banned construct. No partial JS output is produced.

---

## Syntax

Banned constructs are rejected at two stages:

1. **Parse time** — constructs with no valid parse in SJS grammar (angle-bracket cast, `namespace`, `enum`).
2. **Type-check time** — constructs that parse as valid expressions/types but are rejected by the type rules (`any`, `!`, intersections, conditional types, mapped types, `infer`, indexed access, `typeof` in type position).

---

## Semantics

Each banned feature is documented below. All are rejected unconditionally — there is no pragma, flag, or escape hatch to allow them.

---

### 1. `any` type → SJS-E004

**Description:** TypeScript's `any` type disables all type checking for a value. A value of type `any` is assignable to every type and every type is assignable to `any`.

**Why banned:** `any` is an invisible hole in the type system. It spreads silently — a function returning `any` contaminates every downstream variable. In a language targeting a native LLVM backend, `any` provides no memory layout information, making code generation impossible. Even in the JS prototype, `any` defeats the purpose of type checking.

**Error code:** `SJS-E004`

**SJS alternative:** Use `unknown` when the type is genuinely unknown (requires explicit narrowing before use) or `dynamic` when interfacing with untyped external code (tracked and warns in strict mode).

```sjs
// ✗ Before (TypeScript with any):
function parse(raw: any): any {
  return JSON.parse(raw)
}

// ✓ After (SJS with unknown):
function parse(raw: string): unknown {
  return JSON.parse(raw)
}
function useResult(x: unknown): string {
  if (typeof x === "string") return x   // narrowed to string
  return String(x)
}

// ✓ After (SJS with dynamic for external interop):
function fromExternal(x: dynamic): string {
  return String(x)
}
```

---

### 2. `!` non-null assertion operator → SJS-E011

**Description:** The postfix `x!` operator strips `null` and `undefined` from the type of `x` without performing any runtime check. It is a pure compile-time assertion.

**Why banned:** The assertion is unverifiable — the programmer is lying to the type checker. If `x` is actually `null` at runtime, the program proceeds with a null value typed as non-null, causing unpredictable failures downstream. This defeats null safety, which is a core SJS invariant (see `001-null-safety.md`).

**Error code:** `SJS-E011`

**SJS alternative:** Use an explicit null check, optional chaining `?.`, nullish coalescing `??`, or an early return/throw guard.

```sjs
// ✗ Before:
function getLength(s: string?): number {
  return s!.length   // SJS-E011
}

// ✓ After — null check:
function getLength(s: string?): number {
  if (s === null) return 0
  return s.length   // narrowed to string
}

// ✓ After — nullish coalescing:
function getLength(s: string?): number {
  return (s ?? "").length
}

// ✓ After — optional chaining with fallback:
function getLength(s: string?): number {
  return s?.length ?? 0
}
```

---

### 3. `enum` → SJS-E010

**Description:** TypeScript `enum` is a dual-valued construct that creates both a type and a runtime object. Numeric enums also generate a reverse mapping (`Direction[0] === "Up"`).

**Why banned:** `enum` is not an ECMAScript construct — it compiles to a self-executing function that creates a mutable object. It is not tree-shakeable, generates unexpected runtime overhead, and its numeric/string duality is a common source of bugs. The reverse mapping creates an unexpectedly large runtime artifact. SJS targets both JS and native LLVM; `enum` has no sensible LLVM representation.

**Error code:** `SJS-E010`

**SJS alternative:** String literal union types for exhaustive sets of named values; sum types with unit variants for discriminated unions.

```sjs
// ✗ Before (TypeScript enum):
enum Direction { Up, Down, Left, Right }
function move(d: Direction): void { /* ... */ }
move(Direction.Up)

// ✓ After (SJS string literal union):
type Direction = "Up" | "Down" | "Left" | "Right"
function move(d: Direction): void { /* ... */ }
move("Up")

// ✗ Before (TypeScript string enum):
enum Status { Active = "ACTIVE", Inactive = "INACTIVE" }

// ✓ After (SJS type alias + named constants):
type Status = "ACTIVE" | "INACTIVE"
const Status = {
  Active: "ACTIVE" as Status,
  Inactive: "INACTIVE" as Status,
}

// ✓ After (SJS sum type — discriminated union):
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
```

---

### 4. `A & B` intersection types → SJS-E005

**Description:** TypeScript intersection types produce a type that is simultaneously `A` and `B`. A value of type `A & B` satisfies both `A` and `B`.

**Why banned:** Intersection types can produce unverifiable or unsound merged shapes — for example, `{ x: string } & { x: number }` produces `{ x: never }`, which no value can satisfy. More fundamentally, intersections create anonymous merged types with no named declaration, which cannot be assigned a stable memory layout for LLVM code generation. They also interact badly with generic monomorphization.

**Error code:** `SJS-E005`

**SJS alternative:** Interface extension (`interface C extends A, B {}`) for named combined types. Named interfaces give the compiler a stable, declared layout.

```sjs
// ✗ Before (TypeScript intersection):
type ColoredShape = Shape & Colored
function render(cs: Shape & Colored): void { /* ... */ }

// ✓ After (SJS interface extension):
interface Shape { area(): number }
interface Colored { color: string }
interface ColoredShape extends Shape, Colored {}
function render(cs: ColoredShape): void { /* ... */ }

// ✗ Before (inline intersection in function param):
function process(x: { id: number } & { name: string }): void { /* ... */ }

// ✓ After (named interface):
interface Entity { id: number; name: string }
function process(x: Entity): void { /* ... */ }
```

---

### 5. `T extends U ? A : B` conditional types → SJS-E008

**Description:** TypeScript conditional types express type-level if-then-else: "if `T` extends `U`, the type is `A`; otherwise `B`."

**Why banned:** Conditional types make the type system Turing-complete. General type-level computation is undecidable; the TypeScript compiler uses heuristics and depth limits to avoid infinite loops. SJS targets a decidable type system that can be compiled by a native compiler in a single pass without approximation. Additionally, the `T extends U` form in a generic constraint position (`<T extends U>`) is also banned for the same reason (see section 5 and `005-generics.md`).

**Error code:** `SJS-E008`

**SJS alternative:** Explicit function overloads; union return types; separate named functions for distinct cases.

```sjs
// ✗ Before (TypeScript conditional type):
type Flatten<T> = T extends Array<infer U> ? U : T

// ✓ After (SJS — separate explicit types):
type FlatNumber = number
type FlatString = string
// Or: accept the array and return the element:
function flattenNumbers(xs: number[]): number[] { return xs.flat() }

// ✗ Before (conditional return type):
function process<T>(x: T): T extends string ? string[] : number

// ✓ After (SJS — separate overloaded functions):
function processString(x: string): string[] { return x.split("") }
function processNumber(x: number): number { return x * 2 }
```

---

### 6. `{ [K in keyof T]: ... }` mapped types → SJS-E006

**Description:** TypeScript mapped types generate a new type by iterating over the keys of another type: `{ [K in keyof T]: T[K] | null }`.

**Why banned:** Mapped types require the compiler to enumerate the keys of a type at type-check time, which requires tracking all property names as first-class type-level values. This is incompatible with static struct layout determination for LLVM. A mapped type produces an anonymous, derived type with no stable identity — it cannot be monomorphized.

**Error code:** `SJS-E006`

**SJS alternative:** Declare the target type explicitly with named members. For utility-type use cases, write the transformed interface by hand or use a generator script.

```sjs
// ✗ Before (TypeScript mapped type):
type Partial<T> = { [K in keyof T]?: T[K] }
type Readonly<T> = { readonly [K in keyof T]: T[K] }

// ✓ After (SJS — explicit interface):
interface PartialUser {
  name?: string
  email?: string
  age?: number
}

interface ReadonlyPoint {
  readonly x: number
  readonly y: number
}

// ✗ Before (mapped type with template):
type Nullable<T> = { [K in keyof T]: T[K] | null }

// ✓ After (SJS — explicitly written out):
interface NullableUser {
  name: string?
  email: string?
  age: number?
}
```

---

### 7. `infer` keyword → SJS-E009

**Description:** The `infer` keyword appears exclusively inside conditional types: `T extends Array<infer U> ? U : never`. It binds a fresh type variable by pattern-matching the structure of another type.

**Why banned:** `infer` only exists in the context of conditional types, which are banned (see section 5). It makes type inference undecidable in the general case. No use of `infer` is valid in SJS.

**Error code:** `SJS-E009`

**SJS alternative:** Explicit type annotations; generic type parameters on functions and interfaces.

```sjs
// ✗ Before (TypeScript infer):
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never
type ElementType<T> = T extends Array<infer E> ? E : never

// ✓ After (SJS — annotate explicitly or use a generic parameter):
// Just annotate the return type directly:
function getUser(): User { /* ... */ }   // return type is explicitly User

// For extracting element type, accept the array and type the element:
function first<T>(xs: T[]): T? {
  return xs.length > 0 ? xs[0] : null
}
```

---

### 8. `T['key']` indexed access types → SJS-E006

**Description:** TypeScript indexed access types extract the type of a property at a given string key: `User['name']` produces the type of `name` on `User`.

**Why banned:** Indexed access creates a dependent type — a type that depends on a runtime string value. While the key is often a literal, the general mechanism allows runtime string variables as keys, making the type of `T[K]` undecidable without full evaluation. Even the literal-key form is banned in SJS for consistency and because it enables composition with mapped types and `keyof`, both of which are banned.

**Error code:** `SJS-E006`

**SJS alternative:** Define a named type alias for the property type.

```sjs
// ✗ Before (TypeScript indexed access):
type UserName = User['name']
type ConfigValue = Config['server']['port']

// ✓ After (SJS — explicit type alias):
type UserName = string   // the type of User.name

interface ServerConfig { port: number; host: string }
interface Config { server: ServerConfig }
type ConfigPort = number   // the type of Config.server.port
```

---

### 9. `namespace` → SJS-E012

**Description:** TypeScript `namespace` (formerly `module`) is a TypeScript-specific module system predating ES modules. It wraps declarations in a named scope.

**Why banned:** `namespace` has no ECMAScript equivalent. It compiles to an IIFE that mutates a shared object — a pattern that cannot be represented in ES modules or LLVM. It conflicts with the ES module system that SJS uses (`import`/`export`). Using `namespace` in new code is an anti-pattern even in TypeScript.

**Error code:** `SJS-E012`

**SJS alternative:** ES module `import`/`export`. Each file is a module. Use barrel files (`index.sjs`) for re-exporting grouped APIs.

```sjs
// ✗ Before (TypeScript namespace):
namespace Geometry {
  export interface Point { x: number; y: number }
  export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
}
const d = Geometry.distance({ x: 0, y: 0 }, { x: 3, y: 4 })

// ✓ After (SJS ES modules):
// geometry.sjs
export interface Point { x: number; y: number }
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// consumer.sjs
import { distance, Point } from "./geometry.sjs"
const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 })
```

---

### 10. `typeof x` in type position → SJS-E006

**Description:** TypeScript allows `typeof expr` in a type annotation to infer the type of a value: `let y: typeof x = ...`. This captures the inferred type of any expression as a type.

**Why banned:** `typeof expr` in type position makes the type of `y` depend on the inferred shape of `x`, coupling type identities to value shapes. This is a form of structural inference bypass that interferes with forward declarations and declaration-order independence. It also allows `typeof` to produce complex anonymous types (equivalent to mapped types or conditional results), both of which are banned.

**Error code:** `SJS-E006`

**SJS alternative:** Declare an explicit type alias and annotate both variables.

```sjs
// ✗ Before (TypeScript typeof in type position):
const config = { host: "localhost", port: 3000 }
type Config = typeof config   // SJS-E006

function update(cfg: typeof config): void { /* ... */ }   // SJS-E006

// ✓ After (SJS — explicit interface):
interface Config { host: string; port: number }
const config: Config = { host: "localhost", port: 3000 }
function update(cfg: Config): void { /* ... */ }
```

---

### 11. `<T>expr` angle-bracket type cast → Parse error

**Description:** TypeScript supports two cast syntaxes: `<string>value` (angle-bracket) and `value as string` (keyword form). SJS bans the angle-bracket form.

**Why banned:** Angle-bracket casts are ambiguous with JSX syntax: `<string>` can be a JSX element or a type cast depending on context. Rather than require a JSX flag, SJS bans the angle-bracket form universally and requires `as` instead.

**Error code:** Parse error (no SJS error code; rejected by the parser)

**SJS alternative:** Use `value as Type`.

```sjs
// ✗ Before (TypeScript angle-bracket cast):
const s = <string>someValue    // Parse error in SJS

// ✓ After (SJS as-cast):
const s = someValue as string
```

Note: `as` casts are themselves restricted in SJS. Casting to an incompatible type emits a type warning. Safe narrowing is preferred over unsafe casting.

---

### 12. `==` / `!=` abstract equality → SJS-L003 (lint warning)

**Description:** JavaScript's `==` and `!=` operators perform type coercion before comparison: `1 == "1"` is `true`; `null == undefined` is `true`.

**Classification:** This is a **lint warning** (`SJS-L003`), not a hard type error. Code using `==`/`!=` is still compiled; a warning is emitted. In `--strict` mode, this warning is promoted to an error.

**Why linted:** Coercion-based equality is a persistent source of bugs. `null == undefined` being true means that null checks using `==` silently pass for both values. The coercion rules are complex and non-obvious.

**SJS alternative:** Use strict equality `===` and `!==`. For null/undefined checks that should match both, use the `??` operator or an explicit `x === null || x === undefined` guard.

```sjs
// ✗ Linted (SJS-L003):
if (x == null) { /* ... */ }    // matches null AND undefined (surprising)
if (count == "0") { /* ... */ } // type coercion: string "0" to number

// ✓ Preferred:
if (x === null || x === undefined) { /* ... */ }   // explicit
if (x === null) { /* ... */ }   // if only null is intended
if (count === 0) { /* ... */ }  // strict type equality
```

---

## JS Lowering (Prototype)

All banned features are rejected at parse or type-check time. The Babel-based compiler emits the diagnostic code and **does not produce JS output** for files containing banned constructs. There is no partial compilation.

```
// Any file containing a banned construct:
// → Parse/type error emitted
// → Compilation halted
// → No .js file written
// → Exit code 1
```

Tooling (language server, `--watch` mode) marks the offending range with the error code and continues processing other files.

---

## LLVM Lowering (Future)

Same policy — banned features never reach the LLVM backend. The type-checker runs before code generation; a file with any banned construct is rejected before IR emission begins.

---

## Diagnostic codes

| Code | Feature | Stage |
|------|---------|-------|
| `SJS-E004` | `any` type | Type-check |
| `SJS-E005` | `A & B` intersection type | Type-check |
| `SJS-E006` | Mapped type, indexed access `T['k']`, `typeof` in type position | Type-check |
| `SJS-E008` | Conditional type `T extends U ? A : B`; `T extends U` constraint | Type-check |
| `SJS-E009` | `infer` keyword | Type-check |
| `SJS-E010` | `enum` declaration | Parse |
| `SJS-E011` | `!` non-null assertion | Parse/Type-check |
| `SJS-E012` | `namespace` declaration | Parse |
| Parse error | `<T>expr` angle-bracket cast | Parse |
| `SJS-L003` | `==` / `!=` abstract equality | Lint |

---

## Examples

### Valid (SJS alternatives)

```sjs
// ✓ unknown instead of any
function safeParse(s: string): unknown {
  return JSON.parse(s)
}

// ✓ null check instead of !
function greet(name: string?): string {
  if (name === null) return "Hello"
  return "Hello, " + name
}

// ✓ string literal union instead of enum
type Color = "red" | "green" | "blue"
function paint(c: Color): void { /* ... */ }
paint("red")

// ✓ interface extension instead of intersection
interface Named { name: string }
interface Aged { age: number }
interface Person extends Named, Aged {}

// ✓ ES module instead of namespace
// shapes.sjs
export interface Circle { radius: number }
export function circleArea(c: Circle): number { return Math.PI * c.radius ** 2 }
```

### Invalid

```sjs
// ✗ SJS-E004: any
let x: any = 42          // SJS-E004

// ✗ SJS-E011: non-null assertion
const name: string = user.name!   // SJS-E011

// ✗ SJS-E010: enum
enum Status { Active, Inactive }   // SJS-E010

// ✗ SJS-E005: intersection type
type Both = A & B   // SJS-E005

// ✗ SJS-E008: conditional type
type IsString<T> = T extends string ? true : false   // SJS-E008

// ✗ SJS-E006: mapped type
type Partial<T> = { [K in keyof T]?: T[K] }   // SJS-E006

// ✗ SJS-E009: infer
type Elem<T> = T extends Array<infer E> ? E : never   // SJS-E009

// ✗ SJS-E006: indexed access
type N = User['name']   // SJS-E006

// ✗ SJS-E012: namespace
namespace Utils { export function id(x: number): number { return x } }   // SJS-E012

// ✗ SJS-E006: typeof in type position
type T = typeof someValue   // SJS-E006

// ✗ Parse error: angle-bracket cast
const s = <string>rawValue   // Parse error — use: rawValue as string

// ✗ SJS-L003: abstract equality (lint warning)
if (value == null) { /* ... */ }   // SJS-L003
```
