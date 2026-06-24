---
title: Idiom Changes
sidebar_position: 3
description: Common TypeScript patterns and their SuperJS equivalents — errors, nulls, sum types, casts, modules.
section: migration
---

# Part 2 — Idiom changes

Syntax rewrites get files compiling; idioms determine whether migrated code stays safe and readable.

## 1. Error handling — `throw` → `Result<T, E>`

TypeScript often uses exceptions for expected failures. SuperJS codebases typically model those as sum types:

```typescript
// TypeScript
function parseConfig(json: string): Config {
  try {
    return JSON.parse(json) as Config
  } catch {
    throw new Error("parse failed")
  }
}
```

```sjs
// SuperJS
type Result<T, E> = Ok(T) | Err(E)

function parseConfig(json: string): Result<Config, string> {
  const raw: dynamic = JSON.parse(json)
  if (!isConfig(raw)) return Err("parse failed")
  return Ok(raw as Config)
}

function isConfig(v: dynamic): boolean {
  return v !== null && typeof v === "object"
}
```

Callers use exhaustive `match` instead of `try/catch` for control flow.

---

## 2. Null handling — `undefined` checks → `T?` + narrowing

- Non-nullable by default: `string` cannot hold `null`.
- Nullable: `string?` ≡ `string | null`.
- Use `?.` and `??` for optional chaining and defaults (same as modern JS).
- Replace `value!` with an explicit `if (value === null)` guard ([SJS-E011](../error-codes/SJS-E011.md)).

```sjs
function greet(name: string?): string {
  if (name === null) return "stranger"
  return "hello " + name
}
```

---

## 3. Sum types — object unions → variants + `match`

```typescript
// TypeScript
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "rect"; w: number; h: number }

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r * s.r
    case "rect": return s.w * s.h
  }
}
```

```sjs
// SuperJS
type Shape = Circle(number) | Rect(number, number)

function area(s: Shape): number {
  return match s {
    Circle(r) => Math.PI * r * r,
    Rect(w, h) => w * h,
  }
}
```

The compiler emits [SJS-E007](../error-codes/SJS-E007.md) if a variant is not handled.

---

## 4. `as` casts — narrow `dynamic`, trust structure elsewhere

- `expr as T` is allowed for narrowing `dynamic` after runtime checks.
- Do **not** use `as` to silence errors the way TS uses `as any`.
- Structural object types infer field types without casts when shapes align.

---

## 5. `const enum` → unit sum type

```typescript
const enum Dir { Up, Down }
```

```sjs
type Dir = Up | Down
```

No reverse numeric mapping at runtime — variants lower to tagged values.

---

## 6. Generics — no `extends` constraints on type parameters

SJS supports `<T>` type parameters with optional defaults, but **not** `T extends U` constraints ([generics](../../specs/language/005-generics.md)). Encode bounds structurally:

```sjs
type HasLength { length: number; }

function count(xs: HasLength): number {
  return xs.length
}
```

If overloads differ by shape, use separate functions or a sum-type argument instead of `T extends U` constraints.

---

## 7. Module augmentation — not supported

TypeScript `declare module "pkg" { ... }` augmentation is not available. Options:

- Wrap the library in your own module and expose a typed facade.
- Use `@superjs/types-*` when a wrapper exists ([compat matrix](../compat/index.md)).
- Hold foreign values as `dynamic` and validate at the boundary.

---

## 8. `import type` → regular `import`

Type-only imports merge into value imports. Types are erased at emit — no `import type` keyword required.

```sjs
import { fastify } from "fastify"
import type { User } from "./user.sjs"
```

Both forms parse; emitted JS contains only runtime imports.

---

## Next

[Part 3 — Library ecosystem](./03-library.md)
