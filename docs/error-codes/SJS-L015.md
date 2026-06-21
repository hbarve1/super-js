---
title: 'SJS-L015 — Floating promise'
description: 'SJS-L015 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L015'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A `Promise`-typed expression is used as a standalone statement without being `await`ed,
`return`ed, assigned, or otherwise consumed. Fire-and-forget async work hides failures and races
shutdown.

This rule is type-aware: the linter checks the synthesized type at each expression statement.

## Example

```sjs
// ✗ lint warning
export async function run(): Promise<void> {
  fetchData()   // SJS-L015 — Promise ignored
}
```

## Fix

Await, return, or explicitly handle the promise:

```sjs
// ✓ correct
export async function run(): Promise<void> {
  await fetchData()
}

// ✓ correct — intentional fire-and-forget with handler
void fetchData().catch((e) => console.error(e))
```

## Configuration

```json
{
  "lint": {
    "L015": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L016` — unhandled `Result`
- `SJS-L017` — prefer `Result` over `throw`
