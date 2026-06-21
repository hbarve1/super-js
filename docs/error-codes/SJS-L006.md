---
title: 'SJS-L006 — `match` expression has no arms'
description: 'SJS-L006 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L006'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A `match` expression must contain at least one arm. An empty `match` is almost certainly a mistake
and will always throw at runtime when evaluated.

## Example

```sjs
type Status = Active | Inactive

// ✗ lint warning
const r = match s {}   // SJS-L006
```

## Fix

Add arms for every variant, or remove the `match` if it is not needed:

```sjs
// ✓ correct
const r = match s {
  Active => 1,
  Inactive => 0,
}
```

## Configuration

```json
{
  "lint": {
    "L006": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-E007` — non-exhaustive `match` (type error when variants are missing)
- `SJS-L007` — redundant match arm
