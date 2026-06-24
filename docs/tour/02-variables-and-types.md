---
title: 02 — Variables and types
sidebar_position: 3
description: const, let, primitives, and explicit annotations.
section: tour
---

# Variables and types

**Goal:** Annotate values and let the compiler catch mismatches.

Use `const` by default; `let` when reassignment is required. Primitives: `string`, `number`, `boolean`.

## Example

```sjs
const pi: number = 3.14
let count: number = 0
count = count + 1

const label: string = "items"
const ok: boolean = count > 0
```

[Open in playground](https://superjs.org/playground#code=Y29uc3QgcGk6IG51bWJlciA9IDMuMTQKbGV0IGNvdW50OiBudW1iZXIgPSAwCmNvdW50ID0gY291bnQgKyAxCgpjb25zdCBsYWJlbDogc3RyaW5nID0gIml0ZW1zIgpjb25zdCBvazogYm9vbGVhbiA9IGNvdW50ID4gMA)

## Key takeaways

- `const` bindings cannot be reassigned.
- Annotations are optional when inference is obvious.
- SJS-E001 fires on type mismatches.

**Next:** [Functions](./03-functions.md)
