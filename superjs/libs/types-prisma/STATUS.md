---
package: "@prisma/client"
version: "5.x"
coverage: 72
status: "beta"
last-updated: "2026-06-24"
license-compat: "MIT"
esm: true
cjs: true
features:
  - PrismaClient lifecycle
  - $transaction
  - $queryRaw
  - log options
missing:
  - generated model delegates
  - full DMMF types
  - extension API
---

# @superjs/types-prisma

Hand-curated SJS bindings for @prisma/client 5.x. Covers the most-used
connection, query, and lifecycle surface. Install alongside the runtime package.
