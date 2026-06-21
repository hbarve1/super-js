---
title: 'SJS-L005 — `debugger` statement found in committed code'
description: 'SJS-L005 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L005'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

The `debugger` statement pauses execution in a JavaScript debugger. It is a development-only
tool and must not appear in committed source code. When the code is deployed without a debugger
attached the `debugger` statement is silently ignored, but it indicates an incomplete cleanup of
a debugging session and may cause unexpected pauses in environments where a debugger is attached
(e.g., browser DevTools left open, Node.js `--inspect` flag).

The lint pass flags every `debugger` statement unconditionally, regardless of the surrounding
context (inside conditionals, dead branches, or test files).

## Example

```sjs
// ✗ lint warning
function processOrder(order: Order) {
  debugger                  // SJS-L005
  const total = order.items.reduce((s, i) => s + i.price, 0)
  return total
}
```

## Fix

Remove the `debugger` statement:

```sjs
// ✓ correct
function processOrder(order: Order) {
  const total = order.items.reduce((s, i) => s + i.price, 0)
  return total
}
```

Use conditional breakpoints in your debugger tooling, or structured logging, rather than
embedding `debugger` statements in source.

## Auto-fix

This diagnostic is **auto-fixable**. Running `superjs fix` removes every `debugger` statement
(the statement and its trailing newline are deleted).

## Configuration

Configurable in `superjs.config.json`:

```json
{
  "lint": {
    "L005": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L001` — prefer `const` — `let` binding is never reassigned
