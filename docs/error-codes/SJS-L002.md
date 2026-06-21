---
title: 'SJS-L002 — Prefer `let` or `const` over `var`'
description: 'SJS-L002 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L002'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

`var` declarations have function scope (not block scope), are hoisted to the top of their
enclosing function with an initial value of `undefined`, and have no temporal dead zone (TDZ).
These semantics are a common source of bugs — a variable declared in the body of a loop or `if`
block leaks out of that block, and accessing it before its declaration silently returns
`undefined` instead of a reference error.

`let` and `const` are block-scoped, have a TDZ, and are the idiomatic replacements in modern
JavaScript and SJS. Every `var` declaration should be rewritten as `let` (if the binding needs
reassignment) or `const` (if it does not — see `SJS-L001`).

## Example

```sjs
// ✗ lint warning
var total = 0          // SJS-L002

function compute() {
  for (var i = 0; i < 10; i++) {  // SJS-L002 — i leaks outside the loop
    var partial = i * 2            // SJS-L002
    total += partial
  }
  console.log(i)       // 10 — var leaks; with let this would be a reference error
}
```

## Fix

Replace `var` with `let` or `const` as appropriate:

```sjs
// ✓ correct
let total = 0

function compute() {
  for (let i = 0; i < 10; i++) {
    const partial = i * 2
    total += partial
  }
  // i is not accessible here — block-scoped
}
```

## Auto-fix

This diagnostic is **auto-fixable**. Running `superjs fix` replaces `var` with `let`. A
subsequent pass of `SJS-L001` will then upgrade any `let` that is never reassigned to `const`.

Note: the auto-fix conservatively emits `let` (not `const`) because it does not know at the
`var` replacement stage whether the binding will be reassigned.

## Configuration

Configurable in `superjs.config.json`:

```json
{
  "lint": {
    "L002": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L001` — prefer `const` over `let` when a binding is never reassigned
