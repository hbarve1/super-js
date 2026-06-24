---
package: "pg"
version: "8.x"
coverage: 81
status: "beta"
last-updated: "2026-06-24"
license-compat: "MIT"
esm: true
cjs: true
features:
  - Pool
  - PoolClient
  - QueryResult
  - connection config
missing:
  - COPY streams
  - cursor API
  - notice listeners
---

# @superjs/types-pg

Hand-curated SJS bindings for pg 8.x. Covers the most-used
connection, query, and lifecycle surface. Install alongside the runtime package.
