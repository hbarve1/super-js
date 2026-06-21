---
title: 'SJS-L001 — Prefer `const` — `let` binding is never reassigned'
description: 'SJS-L001 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-L001'
---


**Severity:** warning  
**Category:** lint  
**Stage:** Stage 3

## Description

A `let` binding that is declared and initialized but never reassigned should be declared with
`const` instead. Using `const` communicates intent (the binding will not change), prevents
accidental reassignment, and allows the compiler to apply stronger optimizations.

The lint pass tracks every `let` binding in a scope and checks whether any subsequent assignment
or compound-assignment operator (`=`, `+=`, `-=`, `++`, `--`, etc.) targets it. If none does, the
binding is flagged.

## Example

```sjs
// ✗ lint warning
let x = 5          // SJS-L001 — x is never reassigned
let name = "Alice" // SJS-L001 — name is never reassigned

function greet() {
  let prefix = "Hello" // SJS-L001
  return `${prefix}, world`
}
```

## Fix

Replace `let` with `const` for bindings that are never reassigned:

```sjs
// ✓ correct
const x = 5
const name = "Alice"

function greet() {
  const prefix = "Hello"
  return `${prefix}, world`
}
```

Keep `let` only when reassignment is genuinely needed:

```sjs
// ✓ correct — reassignment occurs
let count = 0
count += 1
```

## Auto-fix

This diagnostic is **auto-fixable**. Running `superjs fix` replaces `let` with `const` for every
flagged binding.

## Configuration

Configurable in `superjs.config.json`:

```json
{
  "lint": {
    "L001": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` in standard mode, `"error"` in `--strict` mode.

## Related codes

- `SJS-L002` — prefer `let` or `const` over `var`
