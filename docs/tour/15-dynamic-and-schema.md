---
title: 15 — dynamic and Schema
sidebar_position: 16
description: Validate external data with std-schema.
section: tour
---

# dynamic and Schema

**Goal:** Parse JSON into typed values with `Schema.parse`.

`@superjs/std-schema` provides composable validators returning `Validated&lt;T&gt;`.

## Example

```sjs
import { string, object, field } from "@superjs/std-schema"

const NameSchema = object([field("name", string())])

function parseName(doc: dynamic): string? {
  const v = NameSchema.parse(doc)
  return match v {
    Valid(payload) => payload.name as string,
    Invalid(_) => null,
  }
}
```

[Open in playground](https://superjs.org/playground#code=aW1wb3J0IHsgc3RyaW5nLCBvYmplY3QsIGZpZWxkIH0gZnJvbSAiQHN1cGVyanMvc3RkLXNjaGVtYSIKCmNvbnN0IE5hbWVTY2hlbWEgPSBvYmplY3QoW2ZpZWxkKCJuYW1lIiwgc3RyaW5nKCkpXSkKCmZ1bmN0aW9uIHBhcnNlTmFtZShkb2M6IGR5bmFtaWMpOiBzdHJpbmc_IHsKICBjb25zdCB2ID0gTmFtZVNjaGVtYS5wYXJzZShkb2MpCiAgcmV0dXJuIG1hdGNoIHYgewogICAgVmFsaWQocGF5bG9hZCkgPT4gcGF5bG9hZC5uYW1lIGFzIHN0cmluZywKICAgIEludmFsaWQoXykgPT4gbnVsbCwKICB9Cn0)

## Key takeaways

- Schemas are reified — compose with `object`, `optional`, etc.
- Prefer schema validation over repeated `typeof` chains.
- See generated [std-schema API](../api/std-schema.md).

**Next:** [Errors and Result](./16-errors-and-result.md)
