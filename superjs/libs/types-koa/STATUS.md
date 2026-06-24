---
package: "koa"
version: "2.x"
coverage: 73
status: "beta"
last-updated: "2026-06-21"
license-compat: "MIT"
esm: true
cjs: true
features:
  - middleware stack
  - context
  - request/response
missing:
  - koa-router plugin types
  - koa-body integration
---

# @superjs/types-koa

Hand-curated SJS bindings for koa 2.x. Covers the most-used routing,
middleware, and request/response surface. Install alongside the runtime package and
import types from `@superjs/types-koa`, or let the compiler resolve via
`@superjs/types-<pkg>` precedence (see `specs/design/package-conventions.md`).
