# mvb-fastify — 5-minute SuperJS backend

Minimum-viable [Fastify](https://fastify.dev/) API written entirely in `.sjs`, used as the
launch “5-minute backend” demo (WS-A4d / tour lesson 18).

## Prerequisites

- Node.js 20+
- SuperJS CLI built from this repo (`superjs/apps/cli`) or installed globally

## Quick start

From this directory:

```bash
npm install
npm run build
npm start
```

In another terminal:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/users
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run check` | Type-check all `src/**/*.sjs` |
| `npm run build` | Compile to `dist/` (+ stdlib vendor shims) |
| `npm start` | Run `node dist/main.js` |
| `npm test` | Vitest integration tests (requires `npm run build` first) |

Build uses the in-repo CLI:

```bash
node ../../superjs/apps/cli/dist/main.js check src
node ../../superjs/apps/cli/dist/main.js build src --out-dir dist
```

## What this demonstrates

| SJS feature | Where |
|-------------|--------|
| Sum types + `match` | `src/routes/users.sjs`, `src/types/user.sjs` |
| Nullable `T?` | `findById` in `users.sjs` |
| `Result<T,E>` + `ok`/`err` | `parseCreate`, POST `/users` |
| `List<T>` from stdlib | GET `/users` |
| Structural object types | `UserStore` in `types/user.sjs` |
| JS interop (`dynamic`) | Fastify app + request objects |
| Multi-module `src/` layout | `routes/`, `types/`, `middleware/` |

Fastify is a JS package — `main.sjs` imports it as a default import and treats the
instance as `dynamic`, which is the recommended interop pattern until hand-curated
`@superjs/types-fastify` wrappers land (WS-B3).

## Project layout

```
src/
  main.sjs              entry — wires Fastify + routes
  routes/health.sjs     GET /health
  routes/users.sjs      GET/POST /users (sum types, Result, List)
  types/user.sjs        User sum type + UserStore
  middleware/logger.sjs onRequest logging hook
```

## Learn more

- [Language tour](https://superjs.org/docs/tour) (coming in WS-A4a)
- [SuperJS vs TypeScript](../../docs/comparisons/sjs-vs-typescript.md)
