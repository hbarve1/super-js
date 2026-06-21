---
title: 'SJS-L012 — Unused top-level declaration'
description: 'SJS-L012 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L012'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A non-exported top-level binding (`const`, `let`, `var`, `function`, or `class`) is never
referenced elsewhere in the module. Dead code should be removed or exported if it is part of the
public API.

Exported declarations are never flagged — they may be consumed by other modules.

## Example

```sjs
// ✗ lint warning
function helper(): void {}   // SJS-L012 — never called

export function run(): void {
  console.log("ok")
}
```

## Fix

Remove the unused declaration, call it, or export it:

```sjs
// ✓ correct
export function helper(): void {}

export function run(): void {
  helper()
}
```

## Configuration

```json
{
  "lint": {
    "L012": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L009` — unused import
- `SJS-L001` — prefer `const`
