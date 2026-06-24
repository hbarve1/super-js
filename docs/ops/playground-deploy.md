---
title: Playground Worker Deploy
sidebar_position: 1
description: Maintainer runbook — deploy the Cloudflare playground worker and wire the website.
section: ops
---

# Playground Worker Deploy

Production playground can run on **Next.js `/api/run`** (default) or a **Cloudflare
Worker** (`@superjs/playground-worker`). This runbook covers the Worker path for
lower latency and isolated compute off the docs host.

**Prerequisites:** Cloudflare account, Workers Scripts edit permission, GitHub repo
admin (for secrets).

## 1. Create Cloudflare API token

1. Cloudflare Dashboard → **My Profile** → **API Tokens** → **Create Token**.
2. Use the **Edit Cloudflare Workers** template, or custom token with:
   - Account → Workers Scripts → **Edit**
   - Zone → Workers Routes → **Edit** (only if using custom domain)
3. Copy the token — you will not see it again.

## 2. Add GitHub secret

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Value |
|------|--------|
| `CLOUDFLARE_API_TOKEN` | Token from step 1 |

Optional if deploy fails with account errors:

| Name | Value |
|------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (dashboard URL) |

## 3. Deploy the worker

**GitHub Actions (recommended):**

1. **Actions** → **Playground Worker** → **Run workflow** → **Run workflow**.
2. Wait for **Deploy to Cloudflare** + **Smoke test /run endpoint** to pass.
3. Note the deployment URL in the workflow log (e.g. `https://superjs-playground.<subdomain>.workers.dev`).

**Local (one-off):**

```bash
cd superjs
pnpm nx build compiler
cd apps/playground-worker
pnpm exec wrangler login    # interactive, once
pnpm exec wrangler deploy
```

## 4. Smoke test

```bash
# Health + /run
PLAYGROUND_RUN_URL=https://superjs-playground.<account>.workers.dev/run \
  node scripts/smoke-playground-run.mjs
```

Or health only:

```bash
curl -s https://superjs-playground.<account>.workers.dev/health
# → {"ok":true,"service":"superjs-playground"}
```

Expect: `playground smoke OK`.

## 5. Wire the website

Set on the **website** host (Vercel project env or Cloudflare Pages):

```bash
NEXT_PUBLIC_PLAYGROUND_RUN_URL=https://superjs-playground.<account>.workers.dev/run
```

Redeploy the website. The playground will POST to the Worker instead of `/api/run`.

Optional iframe fallback when the Worker is down:

```bash
NEXT_PUBLIC_USE_WORKERS_SANDBOX=true
```

See `superjs/apps/website/.env.example`.

## 6. Custom domain (optional)

In `superjs/apps/playground-worker/wrangler.toml`, uncomment:

```toml
routes = [{ pattern = "api.superjs.dev/run*", zone_name = "superjs.dev" }]
```

Redeploy, then set:

```bash
NEXT_PUBLIC_PLAYGROUND_RUN_URL=https://api.superjs.dev/run
```

## Security

Rate limits, input caps, and sandbox scope are documented in `docs/security/threat-model.md` (T4).
Global rate limiting should use Cloudflare **Rate Limiting** rules in production.

## CI

- Every PR: `node scripts/check-playground-worker.mjs` (wrangler dry-run bundle).
- Manual deploy: `.github/workflows/playground-worker.yml` (`workflow_dispatch`).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Deploy job skipped | Use **Run workflow**, not push-only |
| `deployment-url` empty in logs | Check wrangler output; smoke step may be skipped |
| CORS errors in browser | Worker sends `Access-Control-Allow-Origin: *` on `/run` |
| 429 rate limit | Wait 1 minute; 20 req/min per IP in Worker |
| Website still hits `/api/run` | Rebuild website after setting `NEXT_PUBLIC_PLAYGROUND_RUN_URL` |
