---
title: 'SJS-E011 — Non-null assertion `!` is not allowed'
description: 'SJS-E011 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E011'
---


**Severity:** error  
**Category:** null-safety  
**Stage:** Stage 1

## Description

The TypeScript non-null assertion operator (`expr!`) is not valid SJS syntax. It silently strips
`null | undefined` from a type at the call site without any runtime check, defeating null safety.

Narrow explicitly with a conditional or early return.

## Example

```sjs
// ✗ error
const el = document.getElementById("app")!    // SJS-E011
el.innerHTML = "hello"
```

## Fix

```sjs
// ✓ correct — narrow explicitly
const el = document.getElementById("app")
if (el === null) throw new Error("Required element #app not found")
el.innerHTML = "hello"

// or with early return
function init(): void {
  const el = document.getElementById("app")
  if (el === null) return
  el.innerHTML = "hello"
}
```

## Related codes

- `SJS-E001` — null assigned to non-nullable type
- `SJS-E003` — property access on possibly-null value
