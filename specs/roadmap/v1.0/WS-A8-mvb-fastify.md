# WS-A8: mvb-fastify example fixture

**Branch:** `feature/v1.0-mvb-fastify`  
**Effort:** small  
**Deps:** none — start immediately  
**PR base:** `main`

## Objective

Create `examples/mvb-fastify/` — a minimum-viable backend built with Fastify, written in SJS.
Used as the "5-minute backend" demo in the launch "Why SJS" page (WS-A4d) and tour lesson 18.

## Context

- Repo root: `super-js/`
- Compiler: `superjs/libs/compiler` — `compile()` API
- CLI: `superjs/apps/cli` — `superjs check`, `superjs build`
- `@superjs/stdlib` at `superjs/libs/stdlib`
- Init templates at `superjs/apps/cli/src/lib/templates.ts` (workers-api, fastify-api already stubbed)
- `RELEASING.md` at repo root for how to structure examples
- Existing SJS example patterns: `superjs/libs/stdlib/src/modules/*.sjs`

## What to build

`examples/mvb-fastify/` directory at repo root (alongside `superjs/`):

```
examples/mvb-fastify/
  README.md              # "5-minute backend" quickstart
  package.json           # deps: fastify@4, @superjs/compiler (devDep)
  superjs.config.json    # minimal config
  src/
    main.sjs             # Fastify server entry point
    routes/
      health.sjs         # GET /health → { status: "ok", ts: number }
      users.sjs          # GET /users, POST /users
    types/
      user.sjs           # User sum type + UserStore interface
    middleware/
      logger.sjs         # request logger
  tests/
    health.spec.ts       # Vitest integration test (import compiled output)
  dist/                  # gitignored — build output
```

### SJS patterns to demonstrate

`main.sjs` must show:
- `import` of fastify (JS interop via `dynamic`)
- top-level `async` function
- Result-returning route handler pattern
- `superjs.config.json` → `outDir: "dist"`

`routes/users.sjs` must show:
- Sum type (User = Admin(string) | Member(string))
- `match` expression
- nullable type (`User?`)
- `std-core` Result usage
- generic List<T> from `std-collections`

`types/user.sjs`:
```sjs
export type User = Admin(string) | Member(string)
export interface UserStore {
  findById(id: string): User?
  list(): User[]
  add(user: User): void
}
```

### package.json

```json
{
  "name": "mvb-fastify",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "superjs build src/main.sjs --outDir dist",
    "start": "node dist/main.js",
    "check": "superjs check src/**/*.sjs",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.0.0"
  },
  "devDependencies": {
    "@superjs/compiler": "workspace:*"
  }
}
```

### superjs.config.json

```json
{
  "rootDir": "src",
  "outDir": "dist",
  "strict": true
}
```

### README.md

Must cover:
1. Prerequisites (`node >=20`, `superjs` installed globally)
2. `npm install && npm run build && npm start`
3. `curl http://localhost:3000/health`
4. A paragraph explaining what SJS features are demonstrated
5. Link to the full language tour

## Implementation steps

1. Read `superjs/apps/cli/src/lib/templates.ts` to understand how `superjs init fastify-api` generates its scaffold — do NOT duplicate, extend it.
2. Create directory structure above.
3. Write `types/user.sjs` first — compile-test it: `node superjs/apps/cli/dist/main.js check examples/mvb-fastify/src/types/user.sjs`
4. Write `routes/health.sjs` — minimal, no sum types needed.
5. Write `routes/users.sjs` — uses User sum type + match + Result.
6. Write `middleware/logger.sjs`.
7. Write `main.sjs` — imports fastify as `dynamic`, wires routes.
8. Run `superjs check src/**/*.sjs` — must show 0 errors.
9. Run `superjs build src/main.sjs --outDir dist` — must produce `dist/main.js`.
10. Run `node dist/main.js` — curl `/health` must return `{"status":"ok"}`.
11. Write `tests/health.spec.ts` using Vitest — import compiled output, assert `/health` 200.
12. Write `README.md`.

## Acceptance criteria

- [ ] `superjs check examples/mvb-fastify/src/**/*.sjs` → 0 errors, 0 warnings
- [ ] `superjs build` produces `dist/main.js`; `node dist/main.js` starts without error
- [ ] `curl localhost:3000/health` → `{"status":"ok",...}`
- [ ] `curl localhost:3000/users` → JSON array
- [ ] Vitest test suite green
- [ ] `src/routes/users.sjs` uses: sum type, `match`, `Result`, nullable type
- [ ] README has build + start + curl instructions + SJS feature tour
- [ ] No TypeScript files in `src/` (all `.sjs`)

## Notes

- Fastify is JS library — access via `dynamic`. Pattern: `const fastify: dynamic = (await import("fastify")).default()`
- Do NOT add `@types/fastify` or TypeScript types — point of the demo is SJS handles JS interop via `dynamic` + `Schema`
- If compiler gaps block a feature, simplify that route, add `// TODO: requires SJS feature X` comment
