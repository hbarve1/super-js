---
title: 'SJS-L018 — Mixed spaces and tabs in indentation'
description: 'SJS-L018 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L018'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A line's leading indentation mixes spaces and tabs. Mixed indentation renders inconsistently
across editors and breaks diffs. Pick one style per file (spaces are the project default).

## Example

```sjs
// ✗ lint warning — line mixes tab and spaces
export function f(): number {
 \t const x: number = 1   // SJS-L018
  return x
}
```

## Fix

Use consistent indentation (spaces only, or tabs only):

```sjs
// ✓ correct
export function f(): number {
  const x: number = 1
  return x
}
```

Run `superjs format` to normalize indentation where the formatter supports it.

## Configuration

```json
{
  "lint": {
    "L018": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L001` — prefer `const`
