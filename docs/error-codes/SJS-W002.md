---
title: 'SJS-W002 — `dynamic` value assigned to a typed position without a narrowing check'
description: 'SJS-W002 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-W002'
---


**Severity:** warning  
**Category:** dynamic type  
**Stage:** Stage 1

## Description

When a value of type `dynamic` flows into a position that has a concrete type annotation
(`string`, `number`, `User`, etc.) without a type guard or narrowing check in between, the
assignment silently discards all type safety for that binding.

SJS emits this warning to surface the unsafety at the assignment site rather than letting it
propagate invisibly through the codebase.

## Example

```sjs
// ✗ warning
const raw: dynamic = externalLib.fetch()

let name: string = raw          // SJS-W002 — no narrowing before assignment
let count: number = raw + 1     // SJS-W002 — arithmetic on dynamic assigned to number
```

## Suppression / Fix

Narrow the `dynamic` value with a `typeof` check, `instanceof` check, or an explicit cast
before assigning it to a typed position:

```sjs
// ✓ correct — typeof guard
const raw: dynamic = externalLib.fetch()

if (typeof raw === "string") {
  let name: string = raw        // safe: raw is narrowed to string inside this branch
}
```

```sjs
// ✓ correct — explicit cast at the JS interop boundary
const name: string = raw as string
```

If the position genuinely cannot be typed, change its annotation to `dynamic` or `unknown`
and narrow before use downstream.

## Related codes

- `SJS-W001` — implicit `dynamic` on unannotated positions in `--strict` mode
- `SJS-E004` — `any` is not a valid type in SJS; `dynamic` is the correct escape hatch
