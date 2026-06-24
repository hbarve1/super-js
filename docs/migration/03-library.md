---
title: Library Ecosystem
sidebar_position: 4
description: Using npm packages with SuperJS — dynamic boundaries, @superjs/types-* wrappers, and migration tooling.
section: migration
---

# Part 3 — Library ecosystem

## 1. Using JavaScript libraries directly

Any npm package works at runtime. Types from `.d.ts` files are not consumed as-is — treat untrusted values as `dynamic` and narrow:

```sjs
import { readFileSync } from "node:fs"

function loadJson(path: string): Result<dynamic, string> {
  try {
    const text: string = readFileSync(path, "utf8")
    const value: dynamic = JSON.parse(text)
    return Ok(value)
  } catch (e) {
    return Err("read failed")
  }
}
```

For repeated shapes, add validators (manual `if` chains, or `@superjs/stdlib` schema helpers when available).

---

## 2. `@superjs/types-*` wrappers

Wave-1 typed bindings cover 30 popular packages. Install the wrapper alongside the runtime package:

```bash
npm install fastify @superjs/types-fastify
```

```sjs
import { fastify } from "fastify"

const app = fastify()
app.get("/health", async () => ({ ok: true }))
```

Coverage and status per package: **[Compatibility matrix](../compat/index.md)** (generated from each wrapper's `STATUS.md`).

### Wave-1 backends and data

fastify, express, hono, koa, connect, pg, mysql2, prisma, mongoose, redis

### Utilities and auth

zod, joi, axios, node-fetch, undici, pino, winston, dotenv, jsonwebtoken, passport

### Cloud and testing

aws-sdk-core, cloudflare-workers, bullmq, multer, supertest

### Frontend and test runners

react, nextjs, vite, vitest, jest

When no wrapper exists, use `dynamic` at the import boundary and file an issue or contribute a wrapper under `superjs/libs/types-*`.

---

## 3. `superjs migrate from-prototype`

Early SuperJS prototypes used deep relative imports into `prototype/` packages. The CLI rewrites those to `@superjs/*` workspace packages and emits a report:

```bash
# Preview changes
superjs migrate from-prototype ./src --dry-run

# Write migrated tree + MIGRATION_REPORT.md
superjs migrate from-prototype ./src --out ./migrated
```

This does **not** convert TypeScript syntax — run it after `.sjs` files exist and you need import-path cleanup (WS-A5).

Assisted TS → SJS migration (separate subcommand):

```bash
superjs migrate from-ts ./src
```

---

## 4. Gradual migration strategy

Recommended order for a brownfield TypeScript repo:

1. **Pick a leaf module** — no decorators, few dependencies ([index walkthrough](./index.md)).
2. **Rename** `.ts` → `.sjs` one file at a time; fix parse errors first.
3. **Clear banned constructs** — `any`, `enum`, `namespace`, intersections, conditional types ([Part 1](./01-syntax.md)).
4. **Replace `any`** with `dynamic` + validation at module boundaries.
5. **Convert `enum`** to sum types; replace `switch` with `match`.
6. **Replace throw-based control flow** with `Result` + `match` where failures are expected ([Part 2](./02-idioms.md)).
7. **Add wrappers** — swap `dynamic` facades for `@superjs/types-*` as they land on the [compat matrix](../compat/index.md).
8. **Wire CI** — `superjs check` on `src/**/*.sjs` in your pipeline.

Keep TypeScript files until their dependency cone is migrated — mixed `.ts` / `.sjs` repos are fine during transition if your bundler resolves both.

---

## Related

- [Why SuperJS](../why/index.md) — when migration is worth the cost
- [CLI reference](../../superjs/apps/cli/README.md) — `check`, `build`, `migrate`
- [mvb-fastify example](../../examples/mvb-fastify/) — end-to-end backend sample
