---
title: 20 — Migrating a TS file
sidebar_position: 21
description: Move one TypeScript file to SuperJS.
section: tour
---

# Migrating a TS file

**Goal:** Apply the TS→SJS rewrite checklist on a real module.

1. Rename `.ts` → `.sjs`.
2. Fix banned constructs (`any`→`dynamic`, `enum`→sum types).
3. Run `superjs migrate from-prototype` if imports still point at prototype paths.
4. Run `superjs check` until clean.

Full guide: [Migration](../migration/index.md).

## Example

```sjs
// After migration — no any, no enum
type Role = Admin | Member

type User {
  name: string;
  role: Role;
}

function roleLabel(u: User): string {
  return match u.role {
    Admin => "admin",
    Member => "member",
  }
}
```

[Open in playground](https://superjs.org/playground#code=Ly8gQWZ0ZXIgbWlncmF0aW9uIOKAlCBubyBhbnksIG5vIGVudW0KdHlwZSBSb2xlID0gQWRtaW4gfCBNZW1iZXIKCnR5cGUgVXNlciB7CiAgbmFtZTogc3RyaW5nOwogIHJvbGU6IFJvbGU7Cn0KCmZ1bmN0aW9uIHJvbGVMYWJlbCh1OiBVc2VyKTogc3RyaW5nIHsKICByZXR1cm4gbWF0Y2ggdS5yb2xlIHsKICAgIEFkbWluID0-ICJhZG1pbiIsCiAgICBNZW1iZXIgPT4gIm1lbWJlciIsCiAgfQp9)

## Key takeaways

- Migrate leaf modules first.
- Use the [compat matrix](../compat/index.md) for npm wrappers.
- `superjs migrate from-ts` assists bulk moves.


