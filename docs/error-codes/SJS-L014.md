---
title: 'SJS-L014 — Variable shadowing'
description: 'SJS-L014 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L014'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A binding reuses a name already declared in an enclosing scope (function, block, `for`, or
`catch`). Shadowing makes it easy to read the wrong variable and hides bugs during refactors.

## Example

```sjs
// ✗ lint warning
const id: number = 1

export function f(id: number): number {   // SJS-L014 — shadows outer id
  return id
}
```

## Fix

Rename the inner binding to a distinct name:

```sjs
// ✓ correct
const id: number = 1

export function f(userId: number): number {
  return userId
}
```

## Configuration

```json
{
  "lint": {
    "L014": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L012` — unused declaration
