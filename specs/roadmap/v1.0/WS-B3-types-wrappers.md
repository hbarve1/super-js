# WS-B3: 30 `@superjs/types-*` wrappers

**Branch:** `feature/v1.0-types-wrappers`  
**Effort:** xlarge  
**Deps:** none (can start scoping immediately); `@superjs/interop` translator must reach 70% gate  
**PR base:** `main`

## Objective

Publish 30 `@superjs/types-*` npm packages providing typed SJS bindings for popular JS libraries.
Backend-first wave 1. Translator (`@superjs/interop`) must achieve 70% typed-surface coverage gate.

## Context

- Interop library: `superjs/libs/interop/` — `.d.ts` → `.sjs` translator
- Compiler: `superjs/libs/compiler/`
- `dynamic` type: `specs/language/004-dynamic.md`
- `specs/dts-dynamic-reasons.md` — when `dynamic` is OK
- NX workspace: `superjs/nx.json`, `superjs/package.json`
- Publishing: `RELEASING.md` at repo root
- Compat matrix: `WS-A4e` — each wrapper needs a `STATUS.md`

## Wave-1 target packages (30 total)

### Tier A — Backend servers (priority: highest)
1. `@superjs/types-fastify` — Fastify 4.x
2. `@superjs/types-express` — Express 4.x
3. `@superjs/types-hono` — Hono 4.x
4. `@superjs/types-koa` — Koa 2.x
5. `@superjs/types-connect` — Connect 3.x

### Tier B — Database / ORM
6. `@superjs/types-pg` — node-postgres 8.x
7. `@superjs/types-mysql2` — mysql2 3.x
8. `@superjs/types-prisma` — Prisma 5.x
9. `@superjs/types-mongoose` — Mongoose 8.x
10. `@superjs/types-redis` — ioredis 5.x / redis 4.x

### Tier C — Utilities
11. `@superjs/types-zod` — Zod 3.x
12. `@superjs/types-joi` — Joi 17.x
13. `@superjs/types-axios` — Axios 1.x
14. `@superjs/types-node-fetch` — node-fetch 3.x
15. `@superjs/types-undici` — undici 6.x
16. `@superjs/types-pino` — Pino 9.x
17. `@superjs/types-winston` — Winston 3.x
18. `@superjs/types-dotenv` — dotenv 16.x
19. `@superjs/types-jsonwebtoken` — jsonwebtoken 9.x
20. `@superjs/types-passport` — Passport 0.7.x

### Tier D — Cloud / workers
21. `@superjs/types-aws-sdk-core` — @aws-sdk/client-* (core types)
22. `@superjs/types-cloudflare-workers` — @cloudflare/workers-types 4.x
23. `@superjs/types-bullmq` — BullMQ 5.x
24. `@superjs/types-multer` — Multer 1.x
25. `@superjs/types-supertest` — SuperTest 6.x

### Tier E — Frontend / universal
26. `@superjs/types-react` — React 18.x
27. `@superjs/types-nextjs` — Next.js 14.x
28. `@superjs/types-vite` — Vite 5.x
29. `@superjs/types-vitest` — Vitest 1.x
30. `@superjs/types-jest` — Jest 29.x

## Wrapper structure

Each wrapper lives in `superjs/libs/types-<name>/`:

```
libs/types-fastify/
  package.json          # name: @superjs/types-fastify, version: 0.1.0
  project.json          # NX project
  README.md
  STATUS.md             # YAML frontmatter: coverage, status, version
  src/
    index.sjs           # main exports
    types/
      request.sjs
      reply.sjs
      server.sjs
      route.sjs
      ...
  tests/
    basic.spec.ts       # import wrapper, assert types work
```

### STATUS.md format (feeds compat matrix)

```yaml
---
package: "fastify"
version: "4.x"
coverage: 82
status: "beta"
last-updated: "2026-06-18"
features:
  - routing
  - plugins
  - hooks
  - reply methods
  - request parsing
missing:
  - fastify-plugin type helpers
  - decorateRequest/decorateReply typings
---

# @superjs/types-fastify

SJS bindings for Fastify 4.x.
```

## How to generate wrappers

### Option A — Use `@superjs/interop` translator

```bash
# Install the JS package to get its .d.ts files
npm install fastify@4 --prefix /tmp/fastify

# Run translator
node superjs/apps/cli/dist/main.js translate \
  /tmp/fastify/node_modules/fastify/types/fastify.d.ts \
  --out superjs/libs/types-fastify/src/generated/
```

Translator converts `.d.ts` → `.sjs`, mapping:
- TypeScript `interface` → SJS `interface`
- TypeScript `type Alias = ...` → SJS type declaration
- TypeScript `function` → SJS `export function`
- TypeScript `any` → SJS `dynamic`
- TypeScript enum → SJS sum type
- TypeScript conditional/mapped types → `dynamic` (with `@sjs:dynamic-ok` comment)

### Option B — Hand-write (for small packages)

For packages with simple surfaces (dotenv, pino), hand-write the bindings directly.
Do NOT hand-write large packages like React or Prisma.

### 70% typed-surface gate

After generating a wrapper, run:
```bash
node superjs/apps/cli/dist/main.js translate --stats \
  /tmp/<package>/types/index.d.ts
```

Output: `{ total: N, translated: M, dynamic: K, percent: P }`

Gate: `percent >= 70`. Document in `STATUS.md` as `coverage: P`.

If below 70% for a package, mark as `status: wip` and do not publish until fixed.

## Publishing

Each package published separately to npm under `@superjsorg` scope (see RELEASING.md).
Version: `0.1.0` for initial publish.

CI: add `release-types.yml` that publishes on `v*` tags (similar to existing `release-npm.yml`).

## Implementation phases

### Phase 1 — Translator improvements + 5 core wrappers

1. Audit `@superjs/interop` translator against `fastify` `.d.ts` — find gaps
2. Fix top 3 translator gaps (likely: generic constraints, overloaded functions, conditional types)
3. Generate + hand-polish: `types-fastify`, `types-express`, `types-pg`, `types-zod`, `types-pino`
4. Each achieves ≥70% coverage gate
5. Each has `STATUS.md`, tests, README

### Phase 2 — 15 more wrappers

Batch generate using improved translator. Cover all Tier A + B + C.

### Phase 3 — 10 remaining wrappers

Tier D (cloud) + Tier E (frontend). Frontend wrappers are hardest due to JSX + hooks complexity.

## Acceptance criteria

- [ ] `@superjs/interop` translator achieves 70% typed-surface gate on ≥ 25 of 30 packages
- [ ] All 30 packages have `STATUS.md` with `coverage` + `status` fields
- [ ] All 30 packages have `src/index.sjs` exporting the main surface
- [ ] All 30 packages have at least 1 passing Vitest test
- [ ] `scripts/gen-compat-matrix.ts` (from WS-A4e) reads STATUS.md files and generates compat table
- [ ] All 30 packages published to npm under `@superjsorg` scope
- [ ] `nx run-many -t test --projects=types-*` all green

## Notes

- This is LARGE — plan for 3–4 multi-PR milestones (one per phase above)
- React wrapper is especially hard: JSX types, hooks, ref forwarding — may need `status: beta` for v1.0
- If translator hits a hard wall on a package (complex conditional types everywhere), manually write only the 20% most-used surface and mark remaining as `dynamic`
- Check `superjs/libs/interop/` for current translator implementation before starting
- RELEASING.md has npm publish instructions; use `NPM_TOKEN` secret (rotate first per C-item)
