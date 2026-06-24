---
package: "mongoose"
version: "8.x"
coverage: 74
status: "beta"
last-updated: "2026-06-24"
license-compat: "MIT"
esm: true
cjs: true
features:
  - Schema
  - Model queries
  - Document
  - connection
missing:
  - aggregation pipeline typings
  - virtuals/populate depth
---

# @superjs/types-mongoose

Hand-curated SJS bindings for mongoose 8.x. Covers the most-used
connection, query, and lifecycle surface. Install alongside the runtime package.
