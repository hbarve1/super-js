---
title: 11 — Modules
sidebar_position: 12
description: import/export and barrel files.
section: tour
---

# Modules

**Goal:** Split code across ES modules.

SuperJS emits standard ES modules. Use named exports and explicit import paths.

## Example

```sjs
import { ok, err } from "@superjs/std-core"

export type UserId = string

export function parseId(raw: string): UserId {
  return raw
}

export function demo(): void {
  const r = ok(1)
  console.log(r)
}
```

[Open in playground](https://superjs.org/playground#code=aW1wb3J0IHsgb2ssIGVyciB9IGZyb20gIkBzdXBlcmpzL3N0ZC1jb3JlIgoKZXhwb3J0IHR5cGUgVXNlcklkID0gc3RyaW5nCgpleHBvcnQgZnVuY3Rpb24gcGFyc2VJZChyYXc6IHN0cmluZyk6IFVzZXJJZCB7CiAgcmV0dXJuIHJhdwp9CgpleHBvcnQgZnVuY3Rpb24gZGVtbygpOiB2b2lkIHsKICBjb25zdCByID0gb2soMSkKICBjb25zb2xlLmxvZyhyKQp9)

## Key takeaways

- One module per file is the default.
- Type-only imports are not required — types erase.
- Configure paths in `superjs.config.json`.

**Next:** [Async and await](./12-async-await.md)
