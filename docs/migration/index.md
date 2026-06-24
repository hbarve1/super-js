---
title: Migration Guide
sidebar_position: 1
description: Migrate a TypeScript codebase to SuperJS step by step.
section: migration
---

# Migration Guide

Move from TypeScript to SuperJS incrementally: rename files, fix banned constructs, adopt idioms, then wire npm libraries through `@superjs/types-*` wrappers or `dynamic` boundaries.

## How this guide is organized

| Part | Page | Focus |
|------|------|--------|
| 1 | [Syntax rewrites](./01-syntax.md) | Every banned TS construct → SJS equivalent + error code |
| 2 | [Idiom changes](./02-idioms.md) | Errors, nulls, sum types, modules |
| 3 | [Library ecosystem](./03-library.md) | npm interop, wrappers, tooling, gradual rollout |

Authoritative ban list: [ADR-004](../../specs/design/ADR-004-banned-ts-constructs.md) and [banned features](../../specs/language/007-banned-features.md).

## Your first file (30-line walkthrough)

Start with one leaf module — a small utility with no framework decorators. Below is a typical TypeScript handler; each numbered change maps to a section in Part 1 or 2.

### Before (TypeScript)

```typescript
enum Role { Admin = "admin", Member = "member" }

interface User {
  id: string
  name: string
  role: Role
  email?: string
}

function findUser(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id)
}

function parseBody(body: any): User {
  if (!body || typeof body.name !== "string") {
    throw new Error("invalid body")
  }
  const role = body.role as Role
  return {
    id: String(body.id ?? crypto.randomUUID()),
    name: body.name,
    role,
    email: body.email,
  }
}

export function createUser(users: User[], body: unknown): User {
  const user = parseBody(body)
  const existing = findUser(users, user.id)
  if (existing) throw new Error("duplicate id")
  users.push(user)
  return user
}
```

### After (SuperJS)

```sjs
type Role = Admin | Member

type User {
  id: string;
  name: string;
  role: Role;
  email: string?;
}

type Result<T, E> = Ok(T) | Err(E)

function findUser(users: User[], id: string): User? {
  for (const u of users) {
    if (u.id === id) return u
  }
  return null
}

function parseBody(body: dynamic): Result<User, string> {
  if (body === null || typeof body !== "object") {
    return Err("invalid body")
  }
  const name: dynamic = body.name
  const role: dynamic = body.role
  const email: dynamic = body.email
  if (typeof name !== "string") return Err("invalid body")
  let roleVal: Role
  if (role === "admin") {
    roleVal = Admin
  } else if (role === "member") {
    roleVal = Member
  } else {
    return Err("invalid role")
  }
  const id: dynamic = body.id
  const user: User = {
    id: typeof id === "string" ? id : crypto.randomUUID(),
    name,
    role: roleVal,
    email: typeof email === "string" ? email : null,
  }
  return Ok(user)
}

export function createUser(users: User[], body: dynamic): Result<User, string> {
  const parsed: Result<User, string> = parseBody(body)
  return match parsed {
    Err(e) => Err(e),
    Ok(user) => {
      const existing: User? = findUser(users, user.id)
      if (existing !== null) return Err("duplicate id")
      users.push(user)
      return Ok(user)
    },
  }
}
```

### Change log

1. **`enum` → sum type** — `type Role = Admin | Member` ([SJS-E010](../error-codes/SJS-E010.md))
2. **`interface` → structural `type`** — SJS object types use `type Name { ... }`
3. **Optional `email?` → nullable `email: string?`** — non-nullable by default; use `T?` for `null` ([null safety](../../specs/language/001-null-safety.md))
4. **`User | undefined` → `User?`** — nullable return; explicit `null` instead of `undefined` for absence
5. **`any` / `unknown` boundary → `dynamic`** — parse untrusted JSON at the edge ([SJS-E004](../error-codes/SJS-E004.md))
6. **`throw` → `Result<T, E>` + `match`** — errors stay in the type system (Part 2)
7. **String role → exhaustive `match`** — replaces unsafe `as Role` cast

### Next steps

```bash
# Type-check the file
superjs check src/users.sjs

# Migrate prototype-era import paths (if applicable)
superjs migrate from-prototype ./src --dry-run
```

Continue with [Part 1 — Syntax rewrites](./01-syntax.md) for the full banned-construct table.
