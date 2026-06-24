---
package: "express"
version: "4.x"
coverage: 78
status: "beta"
last-updated: "2026-06-21"
license-compat: "MIT"
esm: true
cjs: true
features:
  - routing
  - middleware
  - request/response
  - Router
missing:
  - express-session typings
  - multer integration
---

# @superjs/types-express

Hand-curated SJS bindings for express 4.x. Covers the most-used routing,
middleware, and request/response surface. Install alongside the runtime package and
import types from `@superjs/types-express`, or let the compiler resolve via
`@superjs/types-<pkg>` precedence (see `specs/design/package-conventions.md`).
