---
title: 05 — Null safety
sidebar_position: 6
description: Nullable types, optional chaining, and nullish coalescing.
section: tour
---

# Null safety

**Goal:** Model absence with `T?` instead of abusing `undefined`.

`T` is non-nullable by default. `T?` means `T | null`. Use `?.` and `??` like modern JS.

## Example

```sjs
function nick(name: string?): string {
  return name?.toUpperCase() ?? "stranger"
}

function firstChar(s: string?): string {
  if (s === null) return ""
  return s.slice(0, 1)
}
```

[Open in playground](https://superjs.org/playground#code=ZnVuY3Rpb24gbmljayhuYW1lOiBzdHJpbmc_KTogc3RyaW5nIHsKICByZXR1cm4gbmFtZT8udG9VcHBlckNhc2UoKSA_PyAic3RyYW5nZXIiCn0KCmZ1bmN0aW9uIGZpcnN0Q2hhcihzOiBzdHJpbmc_KTogc3RyaW5nIHsKICBpZiAocyA9PT0gbnVsbCkgcmV0dXJuICIiCiAgcmV0dXJuIHMuc2xpY2UoMCwgMSkKfQ)

## Key takeaways

- No `!` non-null assertion — narrow with `if`.
- `T?` is shorthand for `T | null`.
- Optional chaining preserves nullability.

**Next:** [Pattern matching](./06-pattern-matching.md)
