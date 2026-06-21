---
title: 'SJS-L008 — Prefer an arrow function callback'
description: 'SJS-L008 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L008'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

An anonymous `function` expression passed directly as a call argument is flagged in favour of an
arrow function. Arrows are shorter, preserve lexical `this`, and match idiomatic modern JS.

Named function expressions (for recursion or stack traces) are not flagged.

## Example

```sjs
// ✗ lint warning
xs.map(function (x) { return x + 1 })   // SJS-L008
```

## Fix

Use an arrow function:

```sjs
// ✓ correct
xs.map((x) => x + 1)

// ✓ correct — named function is allowed
xs.map(function keep(x) { return x })
```

## Configuration

```json
{
  "lint": {
    "L008": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L001` — prefer `const` over `let`
