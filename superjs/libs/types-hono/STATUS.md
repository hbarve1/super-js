---
package: "hono"
version: "4.x"
coverage: 76
status: "beta"
last-updated: "2026-06-21"
license-compat: "MIT"
esm: true
cjs: true
features:
  - routing
  - middleware
  - context
  - json helpers
missing:
  - jsx route handlers
  - RPC client types
---

# @superjs/types-hono

Hand-curated SJS bindings for hono 4.x. Covers the most-used routing,
middleware, and request/response surface. Install alongside the runtime package and
import types from `@superjs/types-hono`, or let the compiler resolve via
`@superjs/types-<pkg>` precedence (see `specs/design/package-conventions.md`).
