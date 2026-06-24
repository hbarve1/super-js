---
title: Syntax Rewrites
sidebar_position: 2
description: TypeScript constructs banned in SuperJS and their replacements, with error codes.
section: migration
---

# Part 1 — Syntax rewrites

SuperJS rejects twelve TypeScript construct categories at parse or type-check time. There is no flag or pragma to re-enable them ([ADR-004](../../specs/design/ADR-004-banned-ts-constructs.md)).

## Quick reference

| TypeScript | SuperJS | Error |
|------------|---------|-------|
| `any` | `dynamic` | [SJS-E004](../error-codes/SJS-E004.md) |
| `A & B` intersection | `type C extends A, B { }` | [SJS-E005](../error-codes/SJS-E005.md) |
| `T extends U ? A : B` | sum type + `match` | [SJS-E008](../error-codes/SJS-E008.md) |
| `infer T` | not supported — explicit types | [SJS-E009](../error-codes/SJS-E009.md) |
| `enum E { ... }` | sum type / unit variants | [SJS-E010](../error-codes/SJS-E010.md) |
| `value!` non-null assertion | `if` / `?.` narrowing | [SJS-E011](../error-codes/SJS-E011.md) |
| `namespace N { }` | ES `import` / `export` | [SJS-E012](../error-codes/SJS-E012.md) |
| `{ [K in keyof T]: U }` mapped | structural index signature | [SJS-E006](../error-codes/SJS-E006.md) |
| `T['key']` indexed access | name fields explicitly | [SJS-E006](../error-codes/SJS-E006.md) |
| `typeof x` in type position | explicit type declaration | [SJS-E006](../error-codes/SJS-E006.md) |
| `<T>expr` angle cast | `expr as T` only | parse error |
| `==` / `!=` | `===` / `!==` | [SJS-L003](../error-codes/SJS-L003.md) |
| `@Decorator` | not supported | banned |
| `prop?: T` (optional) | `prop: T?` or `prop?: T` per semantics | — |

Decorators are **not** on the roadmap — they are incompatible with the ECMAScript-first emit model.

---

## `any` → `dynamic`

```typescript
// TypeScript
function load(raw: any): string {
  return raw.toUpperCase()
}
```

```sjs
// SuperJS
function load(raw: dynamic): string {
  if (typeof raw !== "string") {
    throw new Error("expected string")
  }
  return raw.toUpperCase()
}
```

`dynamic` is explicit and lintable. See [dynamic type](../../specs/language/004-dynamic.md).

---

## Intersection `A & B` → structural `extends`

```typescript
// TypeScript
type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged
```

```sjs
// SuperJS
type Named { name: string; }
type Aged { age: number; }
type Person extends Named, Aged { }
```

---

## Conditional types → sum types + `match`

```typescript
// TypeScript
type ApiResult<T> = T extends string ? { text: T } : { value: T }
```

```sjs
// SuperJS
type TextResult(text: string) | ValueResult(value: dynamic)

function wrap(x: dynamic): TextResult | ValueResult {
  if (typeof x === "string") return TextResult(x)
  return ValueResult(x)
}
```

---

## `enum` → sum types

```typescript
// TypeScript
enum Status { Active, Inactive }
```

```sjs
// SuperJS — unit variants
type Status = Active | Inactive

// With payload
type Status = Active(string) | Inactive
```

---

## Non-null assertion `!` → narrowing

```typescript
// TypeScript
function len(s: string | null): number {
  return s!.length
}
```

```sjs
// SuperJS
function len(s: string?): number {
  if (s === null) return 0
  return s.length
}
```

---

## `namespace` → ES modules

```typescript
// TypeScript
namespace Util {
  export function id<T>(x: T): T { return x }
}
```

```sjs
// SuperJS — util.sjs
export function id<T>(x: T): T {
  return x
}
```

---

## Mapped / indexed / `typeof` types → explicit shapes

```typescript
// TypeScript
type Partial<T> = { [K in keyof T]?: T[K] }
type Name = Person["name"]
type Inferred = typeof someValue
```

```sjs
// SuperJS — declare the shape you need
type StringMap {
  [key: string]: string;
}

type Person { name: string; age: number; }
// Use Person.name fields directly; no T["key"] operator
```

---

## Optional and nullable properties

```typescript
// TypeScript
interface Config {
  host: string
  port?: number
}
```

```sjs
// SuperJS — nullable field (may be null when present)
type Config {
  host: string;
  port: number?;
}
```

See [null safety](../../specs/language/001-null-safety.md): `T?` means `T | null`; optional `prop?: T` on object types means `T | undefined` when absent.

---

## Next

[Part 2 — Idiom changes](./02-idioms.md)
