# WS-B1: Playground (server-side Workers sandbox)

**Branch:** `feature/v1.0-playground`  
**Effort:** xlarge  
**Deps:** WS-A4a (tour content, lesson 18 needs `?mode=workers` link); WS-B3 (types wrappers, for wrapper demos) — WS-A3 (docs infra) is NOT a dep; playground is in `apps/website`, not `apps/docs`  
**PR base:** `main`

## Objective

Upgrade the existing Next.js playground (in `superjs/apps/website/`) from client-side-only
compilation to a server-side Cloudflare Workers sandbox with rate limiting and demo mode.
Tour lesson 18 (serverless handlers) needs `?mode=workers` playground URL.

## Context

- Existing playground: `superjs/apps/website/` — Next.js app, current playground compiles in-browser using `@superjs/compiler`
- Read `superjs/apps/website/` structure to understand current implementation
- Workers sandbox: Cloudflare Workers via `@cloudflare/workers-types` + Wrangler
- Rate limiting: Cloudflare Rate Limiting API or custom token bucket
- Demo mode: pre-loaded examples accessible via URL param (`?example=hello-world`)

## Architecture

```text
Browser                     Cloudflare Worker
playground UI  ──POST /run──>  sandbox runner
(Next.js)     <──result JSON──  - compile SJS input
                                - run emitted JS in V8 isolate
                                - capture stdout/stderr
                                - return { output, errors, timings }
```

## Phases

### Phase 1 — Workers backend (server-side compile + run)

1. Create `superjs/apps/playground-worker/` — a Cloudflare Workers project:
   ```plaintext
   apps/playground-worker/
     wrangler.toml
     package.json
     src/
       index.ts          # Worker entry point
       compiler.ts       # bundles @superjs/compiler for Workers
       runner.ts         # executes compiled JS in a sub-context
       ratelimit.ts      # token bucket rate limiter
   ```

2. Worker endpoint: `POST /run`
   - Input: `{ code: string, mode?: 'node' | 'workers' }`
   - Output: `{ consoleLogs: string[], diagnostics: SjsDiagnostic[], compiledSource: string, timingMs: number }`
   - **Schema note:** the current `POST /api/compile` in `useCompiler.ts` returns `{ output: string, errors, diagnostics }`. The new `/run` endpoint returns both compiled source AND runtime console output in separate fields. Update the `useCompiler` hook in Phase 2 to handle the new schema.
   - Max input size: 50kB
   - Rate limit: 20 requests per minute per IP

3. Sandbox the emitted JS:
   - Capture `console.log` calls by overriding the console object **before** `new Function(code)()` executes: create a local `logs: string[]` array, replace `globalThis.console` with a proxy that pushes to it, restore after execution.
   - Run via `new Function('console', code)(capturedConsole)` inside a try/catch
   - Set a 5-second execution timeout via `AbortSignal.timeout(5000)` wrapping the Function call
   - No `fetch`, no `fs`, no `process.env` — strip these from the sandbox context by assigning `undefined` on the function scope

4. Workers demo mode (`mode: 'workers'`):
   - Pre-load a minimal Workers runtime shim: `Request`, `Response`, `URL`, `Headers`
   - Allows tour lesson 18 Workers example to run in the playground

### Phase 2 — Playground UI update

Update `superjs/apps/website/` to:
1. Send code to the Workers backend instead of compiling in-browser
2. Show compile errors inline (red underlines in Monaco editor)
3. Show runtime output in a scrollable console panel
4. Add "mode" selector: Node.js | Workers | Lambda
5. Add "examples" dropdown with pre-loaded demo programs:
   - Hello world
   - Sum types
   - null safety
   - async/await
   - Fastify route (links to mvb-fastify)
   - Workers handler (lesson 18)

### Phase 3 — Rate limiting + abuse protection

1. Cloudflare Rate Limiting: 20 req/min per IP (use CF Worker Rate Limiting API)
2. Response header: `X-RateLimit-Remaining: N`
3. 429 response with `Retry-After: 60` when exceeded
4. Input sanitization: reject inputs > 50kB, reject inputs with obvious infinite loops
   (heuristic: > 10k AST nodes)

### Phase 4 — Demo mode URLs

URL params:
- `?example=hello-world` — loads named example
- `?code=<urlencoded>` — loads arbitrary code (from tour lesson links)
- `?mode=workers` — activates Workers runtime shim
- `?mode=lambda` — activates Lambda mock context

## Key technical decisions

**Q: Should @superjs/compiler run in Workers?**
Workers uses V8 but without Node.js APIs. `@superjs/compiler` must not use Node-only APIs
(no `fs`, no `path` from Node). Check `superjs/libs/compiler/src/index.ts` — if it uses
Node APIs, bundle it with Wrangler and polyfill or remove those paths.

**Q: How to bundle compiler for Workers?**
```bash
wrangler build  # bundles to dist/worker.js
```
Use `wrangler.toml`:
```toml
name = "superjs-playground"
main = "src/index.ts"
compatibility_date = "2024-01-01"
[build]
command = "npx nx build playground-worker"
```

**Q: Deploy target?**
Cloudflare Workers free tier (100k requests/day) for v1.0.
Domain: `playground.superjs.dev` or `api.superjs.dev/run`.

## Implementation steps

1. Read `superjs/apps/website/` — understand current playground architecture.
2. Check if `@superjs/compiler` uses any Node-only APIs that would break in Workers.
3. Create `apps/playground-worker/` with Wrangler project.
4. Implement `/run` endpoint (compile + run + rate limit).
5. Test locally: `wrangler dev`.
6. Update website UI to call the Workers backend.
7. Add `?mode=workers` support + shims.
8. Add example gallery.
9. Add `project.json` for NX integration.
10. Deploy to Cloudflare (requires `CLOUDFLARE_API_TOKEN` secret in GitHub Actions).
11. Update tour lesson 18 playground links.

## Acceptance criteria

- [ ] `POST https://api.superjs.dev/run` accepts SJS code, returns compiled output + runtime result
- [ ] Rate limiting: 429 after 20 req/min per IP
- [ ] `?mode=workers` loads Workers shims; Workers handler example from lesson 18 runs
- [ ] Monaco editor shows compile errors inline
- [ ] Runtime output shows in console panel
- [ ] Examples dropdown works (min 5 examples)
- [ ] Max input 50kB enforced
- [ ] `wrangler deploy` deploys successfully
- [ ] Tour lesson 18 playground links work end-to-end

## Notes

- This is a LARGE milestone. If it takes multiple PRs, structure them as:
  PR1: Workers backend (compile-only, no run sandbox)
  PR2: Run sandbox + rate limiting
  PR3: UI updates + mode selector
  PR4: Demo mode + examples gallery
- Security is critical: the sandbox must not allow Workers to read secrets or reach internal infrastructure
- **Fallback if Workers bundling fails:** revert to the existing `POST /api/compile` Next.js API route (already in `apps/website/`) for compilation, and keep runtime execution in the client-side iframe sandbox (current behaviour). The UI fallback path: detect 5xx from `/run` → fall back to `/api/compile` + iframe; display a "sandbox unavailable" banner. Document the fallback as a feature flag (`NEXT_PUBLIC_USE_WORKERS_SANDBOX=false`) so it can be toggled without a deploy.
