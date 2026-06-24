---
package: "connect"
version: "3.x"
coverage: 71
status: "beta"
last-updated: "2026-06-21"
license-compat: "MIT"
esm: true
cjs: true
features:
  - middleware stack
  - request/response passthrough
missing:
  - body-parser integration
  - serve-static helpers
---

# @superjs/types-connect

Hand-curated SJS bindings for connect 3.x. Covers the most-used routing,
middleware, and request/response surface. Install alongside the runtime package and
import types from `@superjs/types-connect`, or let the compiler resolve via
`@superjs/types-<pkg>` precedence (see `specs/design/package-conventions.md`).
