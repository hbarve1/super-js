---
title: 06 — Pattern matching
sidebar_position: 7
description: match expressions and exhaustiveness.
section: tour
---

# Pattern matching

**Goal:** Replace fragile `switch` with exhaustive `match`.

`match` is an expression — every arm produces a value. Missing variants are compile errors (SJS-E007).

## Example

```sjs
type Status = Active | Paused | Done

function label(s: Status): string {
  return match s {
    Active => "active",
    Paused => "paused",
    Done => "done",
  }
}
```

[Open in playground](https://superjs.org/playground#code=dHlwZSBTdGF0dXMgPSBBY3RpdmUgfCBQYXVzZWQgfCBEb25lCgpmdW5jdGlvbiBsYWJlbChzOiBTdGF0dXMpOiBzdHJpbmcgewogIHJldHVybiBtYXRjaCBzIHsKICAgIEFjdGl2ZSA9PiAiYWN0aXZlIiwKICAgIFBhdXNlZCA9PiAicGF1c2VkIiwKICAgIERvbmUgPT4gImRvbmUiLAogIH0KfQ)

## Key takeaways

- Arms are separated by commas.
- Exhaustiveness is enforced at compile time.
- `match` works on sum types, not arbitrary strings.

**Next:** [Sum types](./07-sum-types.md)
