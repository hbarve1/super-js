---
package: "ioredis"
version: "5.x"
coverage: 79
status: "beta"
last-updated: "2026-06-24"
license-compat: "MIT"
esm: true
cjs: true
features:
  - string commands
  - hash commands
  - pub/sub
  - pipeline
missing:
  - cluster/sentinel topology
  - Lua script generics
---

# @superjs/types-redis

Hand-curated SJS bindings for ioredis 5.x. Covers the most-used
connection, query, and lifecycle surface. Install alongside the runtime package.
