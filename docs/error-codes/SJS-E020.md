---
title: 'SJS-E020 — Ambiguous variant constructor'
description: 'SJS-E020 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E020'
---


**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

Two or more sum types in scope declare a variant with the same name (for example `Ok` on both
`Result<T, E>` and another alias). When you construct that variant without an expected type
context, the compiler cannot tell which sum type you mean and emits SJS-E020.

Add an explicit type annotation on the binding, parameter, or return position so the checker can
resolve the intended sum type.

## Example

```sjs
type A = Ok(number) | Fail
type B = Ok(string) | Done

// ✗ error — Ok is ambiguous between A and B
const x = Ok(1)   // SJS-E020
```

## Fix

Annotate the expected sum type (or narrow through a typed parameter / return type):

```sjs
// ✓ correct — expected type disambiguates Ok
const x: A = Ok(1)

function toA(): A {
  return Ok(1)
}
```

Rename variants so they are unique module-wide when ambiguity is a recurring problem.

## Related codes

- `SJS-E007` — non-exhaustive `match` expression
- `SJS-E002` — type mismatch
