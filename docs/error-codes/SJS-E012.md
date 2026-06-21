---
title: 'SJS-E012 — `namespace` is not allowed in SJS'
description: 'SJS-E012 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E012'
---


**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

TypeScript `namespace` declarations are not valid SJS syntax. Namespaces are a TypeScript-specific
module system predating ES modules and have no ECMAScript equivalent.

Use ES module `import`/`export` syntax.

## Example

```sjs
// ✗ error
namespace Utils {    // SJS-E012
  export function format(s: string): string { return s.trim() }
}
```

## Fix

```sjs
// ✓ correct — ES module
// utils.sjs
export function format(s: string): string {
  return s.trim()
}

// consumer.sjs
import { format } from "./utils.sjs"
```

## Related codes

- `SJS-E010` — `enum` is also banned (use sum types)
