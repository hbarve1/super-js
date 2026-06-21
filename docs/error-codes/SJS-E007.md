---
title: 'SJS-E007 — Non-exhaustive match expression'
description: 'SJS-E007 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E007'
---


**Severity:** error  
**Category:** match  
**Stage:** Stage 0 (prototype)

## Description

A `match` expression over a sum type must have an arm for every variant. If one or more variants
are missing and there is no catch-all `_` arm, SJS emits SJS-E007.

Exhaustiveness is enforced at compile time so that adding a new variant to a sum type immediately
flags every `match` that does not handle it.

## Example

```sjs
type Shape = Circle(radius: number) | Rect(w: number, h: number) | Point

// ✗ error — Point arm missing
function area(s: Shape): number {
  return match s {
    Circle(r) => Math.PI * r * r,
    Rect(w, h) => w * h,
    // SJS-E007: missing arm for Point
  }
}
```

## Fix

Add the missing arm, or use `_` as a catch-all:

```sjs
// ✓ correct — all variants handled
function area(s: Shape): number {
  return match s {
    Circle(r)  => Math.PI * r * r,
    Rect(w, h) => w * h,
    Point      => 0,
  }
}

// ✓ correct — catch-all arm
function describe(s: Shape): string {
  return match s {
    Circle(r) => `circle r=${r}`,
    _         => "other shape",
  }
}
```

## Related codes

- `SJS-W003` — unreachable match arm (inverse problem: arm that can never be reached)
