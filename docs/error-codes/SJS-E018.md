---
title: 'SJS-E018 — Top-level `await` used outside an ES module context'
description: 'SJS-E018 diagnostic reference'
sidebar_position: 99
section: error-codes
error_code: 'SJS-E018'
---


**Severity:** error  
**Category:** async-await  
**Stage:** Stage 1

## Description

Top-level `await` (ECMAScript 2022, ECMA-262 §15.2) is only valid in ES modules — files loaded
with `type="module"` in browsers, or treated as ESM by a Node.js-compatible runtime.

SJS detects whether the current file is an ES module by the presence of at least one `import` or
`export` declaration at the top level. A file without any such declaration is treated as a
CommonJS-style script, and top-level `await` inside it is a type error.

## Example

```sjs
// ✗ error — no import/export, so not an ES module
const data = await fetch("/api/data")   // SJS-E018
console.log(data)
```

## Fix

Option 1 — Make the file an ES module by adding at least one `export`:

```sjs
// ✓ correct — ES module (has export)
export {}

const data = await fetch("/api/data")
console.log(data)
```

Option 2 — Wrap the top-level logic in an async IIFE if you intentionally cannot use ESM:

```sjs
// ✓ correct — async IIFE, no top-level await
;(async () => {
  const data = await fetch("/api/data")
  console.log(data)
})()
```

## Related codes

- `SJS-E017` — circular import detected in module graph
