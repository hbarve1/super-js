---
title: 04 — Control flow
sidebar_position: 5
description: if/else, ternary, and type narrowing in branches.
section: tour
---

# Control flow

**Goal:** Use branches to narrow types safely.

Conditions must be `boolean` — no truthy coercion in `--strict` lint paths.

## Example

```sjs
function abs(n: number): number {
  if (n < 0) {
    return -n
  }
  return n
}

function label(n: number): string {
  return n > 0 ? "positive" : n < 0 ? "negative" : "zero"
}
```

[Open in playground](https://superjs.org/playground#code=ZnVuY3Rpb24gYWJzKG46IG51bWJlcik6IG51bWJlciB7CiAgaWYgKG4gPCAwKSB7CiAgICByZXR1cm4gLW4KICB9CiAgcmV0dXJuIG4KfQoKZnVuY3Rpb24gbGFiZWwobjogbnVtYmVyKTogc3RyaW5nIHsKICByZXR1cm4gbiA-IDAgPyAicG9zaXRpdmUiIDogbiA8IDAgPyAibmVnYXRpdmUiIDogInplcm8iCn0)

## Key takeaways

- Each branch can refine types for locals.
- Ternary expressions must share a common result type.
- Prefer `===` over `==`.

**Next:** [Null safety](./05-null-safety.md)
