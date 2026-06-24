---
title: 14 — Calling JS from SJS
sidebar_position: 15
description: Import npm packages and narrow with dynamic.
section: tour
---

# Calling JS from SJS

**Goal:** Call JavaScript libraries safely at the boundary.

Import runtime values normally. Treat unknown shapes as `dynamic`, then narrow.

## Example

```sjs
import { readFileSync } from "node:fs"

function readJson(path: string): dynamic {
  const text: string = readFileSync(path, "utf8")
  return JSON.parse(text)
}

function getName(doc: dynamic): string? {
  if (doc === null || typeof doc !== "object") return null
  const name: dynamic = doc.name
  return typeof name === "string" ? name : null
}
```

[Open in playground](https://superjs.org/playground#code=aW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAibm9kZTpmcyIKCmZ1bmN0aW9uIHJlYWRKc29uKHBhdGg6IHN0cmluZyk6IGR5bmFtaWMgewogIGNvbnN0IHRleHQ6IHN0cmluZyA9IHJlYWRGaWxlU3luYyhwYXRoLCAidXRmOCIpCiAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCkKfQoKZnVuY3Rpb24gZ2V0TmFtZShkb2M6IGR5bmFtaWMpOiBzdHJpbmc_IHsKICBpZiAoZG9jID09PSBudWxsIHx8IHR5cGVvZiBkb2MgIT09ICJvYmplY3QiKSByZXR1cm4gbnVsbAogIGNvbnN0IG5hbWU6IGR5bmFtaWMgPSBkb2MubmFtZQogIHJldHVybiB0eXBlb2YgbmFtZSA9PT0gInN0cmluZyIgPyBuYW1lIDogbnVsbAp9)

## Key takeaways

- `dynamic` replaces TypeScript `any`.
- Validate at boundaries — not in hot inner loops.
- Use `@superjs/types-*` when available.

**Next:** [dynamic and Schema](./15-dynamic-and-schema.md)
