---
title: 'SJS-E006 — Mapped type is not allowed in SJS'
description: 'SJS-E006 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E006'
---


**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

TypeScript mapped types (`{ [P in keyof T]: ... }`) are not valid SJS syntax. They generate types
implicitly from other types through metaprogramming, making shapes harder to audit and the type
system harder to reason about statically.

Spell out the shape you need explicitly.

## Example

```sjs
// ✗ error
type Optional<T> = {
  [P in keyof T]?: T[P]    // SJS-E006
}
```

## Fix

Declare the explicit object type:

```sjs
// ✓ correct — explicit optional shape
type OptionalUser {
  id?: number
  name?: string
  email?: string
}
```

For library code that genuinely needs parameterised shapes, restructure as explicit generic
object types with optional members.

## Related codes

- `SJS-E005` — intersection types are also banned
- `SJS-E008` — conditional types are also banned
