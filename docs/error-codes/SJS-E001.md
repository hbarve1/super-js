---
title: 'SJS-E001 — Null or undefined assigned to non-nullable type'
description: 'SJS-E001 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E001'
---


**Severity:** error  
**Category:** null-safety  
**Stage:** Stage 0 (prototype)

## Description

All types in SJS are non-nullable by default. Assigning `null` or `undefined` to a type `T` without
opting into nullability (the `T?` suffix) is a type error.

## Example

```sjs
// ✗ error
let name: string = null      // SJS-E001

function greet(user: string) {
  return `Hello, ${user}`
}
greet(undefined)             // SJS-E001
```

## Fix

Append `?` to make the type nullable, then narrow before use:

```sjs
// ✓ correct
let name: string? = null

function greet(user: string?): string {
  if (user === null) return "Hello, stranger"
  return `Hello, ${user}`
}
```

Or, if the value must always be present, ensure the assignment can never be `null`.

## Related codes

- `SJS-E003` — property access on possibly-null value
- `SJS-E011` — non-null assertion (`!`) is banned
