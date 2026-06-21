---
title: 'SJS-E010 — TypeScript `enum` is not allowed in SJS'
description: 'SJS-E010 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E010'
---


**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

TypeScript `enum` declarations are not valid SJS syntax. Enums generate runtime objects with
non-obvious semantics (reverse mappings, numeric/string duality) and are not part of ECMAScript.

Use sum types with unit variants for discriminated constant sets.

## Example

```sjs
// ✗ error
enum Direction {    // SJS-E010
  Up,
  Down,
  Left,
  Right,
}
```

## Fix

```sjs
// ✓ correct — sum type with unit variants
type Direction = Up | Down | Left | Right

function move(d: Direction): string {
  return match d {
    Up    => "up",
    Down  => "down",
    Left  => "left",
    Right => "right",
  }
}
```

Or use a string union for simple string constants:

```sjs
type Direction = "up" | "down" | "left" | "right"
```

## Related codes

- `SJS-E007` — non-exhaustive match
