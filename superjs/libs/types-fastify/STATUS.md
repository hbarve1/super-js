---
package: "fastify"
version: "4.x"
coverage: 82
status: "beta"
last-updated: "2026-06-21"
license-compat: "MIT"
esm: true
cjs: true
features:
  - routing
  - plugins
  - hooks
  - reply methods
  - request parsing
missing:
  - fastify-plugin type helpers
  - decorateRequest/decorateReply typings
  - runtime `.delete()` / `.options()` use reserved keywords — bindings expose `del` / `optsRoute`
---

# @superjs/types-fastify

Hand-curated SJS bindings for fastify 4.x. Covers the most-used routing,
middleware, and request/response surface. Install alongside the runtime package and
import types from `@superjs/types-fastify`, or let the compiler resolve via
`@superjs/types-<pkg>` precedence (see `specs/design/package-conventions.md`).
