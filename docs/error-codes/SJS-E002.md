---
title: 'SJS-E002 — Type mismatch'
description: 'SJS-E002 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E002'
---


**Severity:** error  
**Category:** type-check  
**Stage:** Stage 0 (prototype)

## Description

The inferred or declared type of an expression does not match the expected type at an assignment,
return statement, function call, or similar site.

## Example

```sjs
// ✗ error — string assigned where number expected
let count: number = "five"         // SJS-E002

function double(n: number): number {
  return "two times " + n          // SJS-E002: string, not number
}
```

## Fix

Correct the expression to produce the expected type, or update the declared type if the intent
changed:

```sjs
// ✓ correct
let count: number = 5

function double(n: number): number {
  return n * 2
}
```

## Related codes

- `SJS-E001` — null/undefined assigned to non-nullable type
- `SJS-W001` — implicit `dynamic` (unannotated parameter in strict mode)
