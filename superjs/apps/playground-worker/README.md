# Playground Worker (`@superjs/playground-worker`)

Cloudflare Worker that compiles and runs SuperJS playground snippets server-side.

**Endpoint:** `GET /health` (liveness), `POST /run` (compile + run)  
**Body:** `{ "code": string, "mode"?: "node" | "workers" | "lambda" }`  
**Response:** `{ compiledSource, consoleLogs, errors, diagnostics, timingMs }`

The website uses `/api/run` (Next.js) by default. Point production at this worker with:

```bash
NEXT_PUBLIC_PLAYGROUND_RUN_URL=https://<worker-host>/run
```

## Local development

```bash
cd superjs
pnpm nx build compiler
cd apps/playground-worker
pnpm dev
# POST http://localhost:8787/run
```

## Deploy

Requires a Cloudflare account and API token with **Workers Scripts: Edit** permission.

```bash
cd superjs/apps/playground-worker
pnpm exec wrangler login   # once, interactive
pnpm exec wrangler deploy
```

Or trigger **Actions → Playground Worker → Run workflow** (needs `CLOUDFLARE_API_TOKEN` repo secret).

Full runbook: [`docs/ops/playground-deploy.md`](../../../docs/ops/playground-deploy.md).

### Custom domain (optional)

Uncomment and set in `wrangler.toml`:

```toml
routes = [{ pattern = "api.superjs.dev/run*", zone_name = "superjs.dev" }]
```

Then set `NEXT_PUBLIC_PLAYGROUND_RUN_URL=https://api.superjs.dev/run` on the website.

## Security

- 50 kB input cap, 5 s execution timeout, 20 req/min per IP (in-isolate; use CF Rate Limiting for global enforcement).
- Sandbox strips `fetch` / `fs` / `process` from `new Function` scope.
- See `docs/security/threat-model.md` (T4).

## CI

`node scripts/check-playground-worker.mjs` runs `wrangler deploy --dry-run` on every PR.
