---
title: 10 — Classes
sidebar_position: 11
description: Classes, fields, and methods.
section: tour
---

# Classes

**Goal:** Encapsulate state with classes — structural conformance, not `implements`.

`public` / `private` modifiers are allowed. Do not use `implements` — it is a parse error.

## Example

```sjs
class Counter {
  private value: number = 0

  increment(): void {
    this.value = this.value + 1
  }

  read(): number {
    return this.value
  }
}

const c: Counter = new Counter()
c.increment()
```

[Open in playground](https://superjs.org/playground#code=Y2xhc3MgQ291bnRlciB7CiAgcHJpdmF0ZSB2YWx1ZTogbnVtYmVyID0gMAoKICBpbmNyZW1lbnQoKTogdm9pZCB7CiAgICB0aGlzLnZhbHVlID0gdGhpcy52YWx1ZSArIDEKICB9CgogIHJlYWQoKTogbnVtYmVyIHsKICAgIHJldHVybiB0aGlzLnZhbHVlCiAgfQp9Cgpjb25zdCBjOiBDb3VudGVyID0gbmV3IENvdW50ZXIoKQpjLmluY3JlbWVudCgp)

## Key takeaways

- Fields are typed like object type members.
- Structural object types describe required methods.
- No decorator support.

**Next:** [Modules](./11-modules.md)
