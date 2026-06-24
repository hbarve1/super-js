---
package: "mysql2"
version: "3.x"
coverage: 77
status: "beta"
last-updated: "2026-06-24"
license-compat: "MIT"
esm: true
cjs: true
features:
  - Pool
  - Connection
  - prepared statements
  - pool config
missing:
  - promise wrapper edge cases
  - SSL option matrix
---

# @superjs/types-mysql2

Hand-curated SJS bindings for mysql2 3.x. Covers the most-used
connection, query, and lifecycle surface. Install alongside the runtime package.
