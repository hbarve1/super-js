# Stage 5: Ecosystem

## Goal
Make SuperJS installable, embeddable in real build systems, runnable in real test runners, consistent across monorepo workspaces, **and deployable to the target user's actual destinations (Node CLI, Fastify API, Cloudflare Workers, AWS Lambda)** via `superjs init <template>`. Ship a `superjs verify` subcommand that turns the determinism gate into a user-auditable feature.

A TS developer must be able to `npm install -g superjs`, `superjs init fastify-api`, drop in `@superjs/vite-plugin`, run their existing Vitest suite via `@superjs/vitest-transform`, and get a green build on three operating systems.

Round-3 changes: Stage 5 blocks on Stage 3 LSP M1 done before publishing CLI with `lsp` subcommand (B2); Jest transform calls the Stage-1 `transform()` async API, not a non-existent `transformAsync` (B1); `superjs init <template>` shipped for `node-cli`/`fastify-api`/`workers-api`/`lambda-handler` (T6); "minimum viable backend" fixture (T3); `superjs verify` CLI added (C10); `RELEASING.md` with publish-rights list + CVE fast-patch protocol (C8); npm `--provenance` two-account rotation (R1); spec text authored per feature (B8).

## Entry Criteria
- Stage 2 done. Hand-curated wrappers for top 30 packages exist (backend-first wave-1 per T1); translator works; `@superjs/interop` published; `superjs add` impl shipped (B6).
- Stage 4 done. `@superjs/std-*` packages on npm with `--provenance`; bootstrap pipeline working with downstream byte-equality (B3); stdlib determinism gate green (S3).
- Stage 1 `superjs build` is deterministic with hard gate (S3); per-phase perf targets met; `transform()` async API frozen (B1); `@superjs/runtime` published (B4).
- **Stage 3 LSP M1 done (B2)** — if Stage 5 reaches Sprint 5.1 publish before Stage 3 ships LSP M1, the CLI ships **without** the `lsp` subcommand at v1.0 and `superjs lsp` is added in a later minor release. This is explicit, documented in `RELEASING.md`, not a silent breaking change.

## Exit Criteria (Done When)
- [ ] `superjs` CLI package published to npm at `0.x` with `--provenance`; `npm install -g superjs` works on Windows, macOS, Linux with **no postinstall network calls** and **no native binary** (pure JS).
- [ ] `bin/superjs.cmd` shim included; tested on Windows.
- [ ] GitHub Releases tagged on every minor/patch with full changelog; release asset is the source tree + a notarised npm tarball (no native binary, no code signing required at v1.0).
- [ ] `@superjs/vite-plugin` published; implements `transform` and `handleHotUpdate`; HMR round-trip < 200 ms on a sample SJS+React+Vite project. **Internally uses `@superjs/compiler.transform()` (B1).**
- [ ] `@superjs/esbuild-plugin` published; transforms `.sjs` to JS in esbuild's plugin pipeline; source maps wired. **Uses `transform()` (B1).**
- [ ] `@superjs/jest-transform` published (graduates from Stage-1 stub at `0.0.x` to stable `0.1.0`); configures Jest's `transform` field; runs SJS tests in a sample 100+ test fixture. **`process(src, filename, opts)` calls `@superjs/compiler.transform()` (B1).** Sync wrapper provided for Jest's sync API via `deasync` or pre-compiled cache.
- [ ] `@superjs/vitest-transform` published; runs the same fixture under Vitest (Vite-based, re-uses vite plugin).
- [ ] `@superjs/test-matchers` published; re-exports `describe`/`it`/`expect`/lifecycle hooks under typed signatures; adds `toMatchVariant`, `toMatchVariantWith`, `toMatchResult`, `toMatchOption` matchers.
- [ ] **`superjs init <template>` (T6)** ships four templates, each building to a deployable artefact under CI:
  - `node-cli` — entry point `src/main.sjs`, `package.json` `bin`, builds to `dist/main.js`, runs as `node dist/main.js`.
  - `fastify-api` — Fastify route + zod schema + pino logger; CI step `node dist/server.js & curl :3000/health` returns 200.
  - `workers-api` — Cloudflare Workers `export default { fetch(request, env) }`; CI step `wrangler dev --local --test` returns expected response; matches the Workers demo mode shape in the playground (T5).
  - `lambda-handler` — `export const handler = async (event, context) => ...`; CI step invokes via `aws-lambda-ric` test container.
  Each template has a `README.md` walking the user through deployment specifics for the target.
- [ ] **Minimum viable backend fixture (T3)** at `examples/mvb-fastify/`: Fastify + zod + pino, three routes (GET health, POST /users with schema validation, GET /users/:id with `Result`-returning DB stub), built and tested in CI on all three OSes. This is the end-to-end proof that the target user's stack works.
- [ ] **`superjs verify <input-dir> <output-dir>` (C10)** — re-runs build against `<input-dir>` and byte-diffs against `<output-dir>`; exits non-zero on diff. Turns the determinism gate from a CI-internal feature into a user-auditable command — a security-conscious user can verify their build artefact matches their source independently.
- [ ] **SJS package conventions** documented in `docs/package-conventions.md`: `package.json` with `"sjs": "src/index.sjs"` entry point; `"exports"` map covering `"."`, `"./*"`, conditional `"types"`; `"sjsConfig"` field for compile flags.
- [ ] **Monorepo workspace support**: the foundational behaviour ships in Stage 1 Sprint 1.4 with the pnpm-workspace acceptance test (S4); this stage **documents** patterns and covers **edge cases only** — Yarn-Berry-PnP nuances, hoisted vs nested `node_modules`, `workspace:*` protocol semantics.
- [ ] **Build determinism enforced in CI as a hard gate (S3 extension)**: every published-package build (stdlib already gated in Stage 4; this stage adds plugins and CLI bundles) goes through `check:determinism:plugins`. Two consecutive builds of the same input → byte-identical.
- [ ] All published packages have CHANGELOG.md (Changesets-generated).
- [ ] Each official package has `--provenance` attestation visible on npm.
- [ ] **`RELEASING.md` shipped (C8)** documenting:
  - List of all packages with publish rights and which accounts hold them (R1).
  - **Two npm accounts with `--provenance` publish rights (R1)** — primary maintainer + co-publisher; rotation procedure documented.
  - CI bar for a patch release (smoke tests, no new lint warnings, perf within +5 %).
  - CVE fast-patch protocol: 24-hour triage SLA; patch + advisory published within 7 days for critical (Stage 0 SECURITY.md cross-link).
- [ ] **Spec contribution (B8):** `spec/language.md/build-tool-integration.md` covers Vite/esbuild/Jest/Vitest transform semantics, source-map chaining, HMR signal shape.

## Sprints

### Sprint 5.1 — CLI publish + Vite plugin + esbuild plugin + `superjs init` templates + minimum viable backend (2 weeks)

**Deliverables:**
- `packages/superjs/` — the CLI npm package. Entry point bundles all of `packages/compiler/`, `packages/runtime/` (B4), `packages/jest-transform/` stub-graduated, and **conditionally** `packages/language-server/` (per B2 — only if Stage 3 LSP M1 is done; otherwise CLI ships without `superjs lsp`).
- Pure-JS distribution; no native binary; no `postinstall` script.
- `bin/superjs.js` (Unix) + `bin/superjs.cmd` (Windows shim per npm convention).
- Pre-bundled via `esbuild` or `tsup` — single self-contained file; no `node_modules` lookup at runtime for compiler internals.
- `@superjs/vite-plugin` at `packages/vite-plugin/`:
  - Implements Vite's `transform` hook: `.sjs` source → JS + source map via **`@superjs/compiler.transform()` (B1)**.
  - Implements `handleHotUpdate`: emits Vite's HMR signal on file change.
  - React Fast Refresh integration: detects JSX presence, injects the standard React Fast Refresh runtime (same as `@vitejs/plugin-react`).
  - Source-map chain integration: composes SJS source maps with Vite's bundler-level maps via `magic-string`.
  - Sample fixture: `examples/vite-react-sjs/` with a working HMR round-trip.
- `@superjs/esbuild-plugin` at `packages/esbuild-plugin/`:
  - Implements esbuild's `setup(build)` API; `onLoad({ filter: /\.sjs$/ })` calls `@superjs/compiler.transform()` (B1).
  - Source maps inlined or external per esbuild's `sourcemap` option.
  - Sample fixture: `examples/esbuild-sjs/` with a bundled output.
- **`superjs init <template>` (T6)** with four templates in `templates/`:
  - `templates/node-cli/`: minimal CLI scaffold (commander-style); `npm run build && npm start` works.
  - `templates/fastify-api/`: Fastify + zod (`@superjs/types-zod`) + pino (`@superjs/types-pino`); 3 routes; Dockerfile included.
  - `templates/workers-api/`: Cloudflare Workers `fetch` handler; `wrangler.toml`; matches Workers-demo-mode shape (T5).
  - `templates/lambda-handler/`: AWS Lambda handler; `serverless.yml` config (or SAM template); `aws-lambda-ric` for local test.
  - Each template's `README.md` documents deploy specifics.
  - CI test step `tools/init-template-smoke.ts` runs `superjs init <each-template> /tmp/<tmpl>` and asserts the resulting project builds + its smoke test passes.
- **Minimum viable backend fixture (T3)** at `examples/mvb-fastify/`:
  - Fastify v4 + zod + pino + `@superjs/std-fs` (for `Result`-returning DB stub).
  - Routes: `GET /health` (no-auth), `POST /users` (zod schema validates body), `GET /users/:id` (returns `Result<User, NotFound>` from a JSON-file-backed stub).
  - CI step: builds the fixture; starts the server on port 3000; runs `curl` smoke tests; asserts 200/201/404 responses correctly.
  - This is the canonical "SJS works for our target user" demo — referenced in tour lesson 19 + "Why SJS" page (Stage 6).
- **Spec contribution (B8):** `spec/language.md/build-tool-integration.md` first draft.

**Key tasks:**
- [ ] Bundle CLI via `tsup`/`esbuild` (single file); verify cold-start < 200 ms; conditional inclusion of `@superjs/language-server` per B2.
- [ ] Verify `bin/superjs.cmd` on Windows (CI matrix runs this).
- [ ] `npm pack` + `npm install -g ./superjs-X.Y.Z.tgz` smoke test in CI for each OS.
- [ ] Publish CLI to npm with `--provenance` (using primary npm account; co-publisher rotation tested in 5.3).
- [ ] Vite plugin: scaffold + transform (via `transform()`) + HMR + Fast Refresh.
- [ ] Esbuild plugin: scaffold + onLoad (via `transform()`) + source maps.
- [ ] HMR round-trip benchmark in `examples/vite-react-sjs/` < 200 ms; recorded.
- [ ] Author 4 `superjs init` templates (T6); wire CI smoke per template.
- [ ] Author `examples/mvb-fastify/` minimum viable backend fixture (T3); wire CI integration test.
- [ ] CI step that builds both example fixtures and asserts emitted JS runs.
- [ ] Author `spec/language.md/build-tool-integration.md`.

**Done signal:** `npm install -g superjs@<latest>` works on three OSes; `vite dev` on the sample React+SJS project hot-reloads in < 200 ms; `esbuild --bundle` on the sample produces a runnable bundle; `superjs init fastify-api /tmp/x` produces a working project that passes its smoke test; `examples/mvb-fastify/` CI step green on all three OSes.

### Sprint 5.2 — Jest transform + Vitest transform + matchers + test fixture (2 weeks)

**Deliverables:**
- `@superjs/jest-transform` at `packages/jest-transform/` graduated from Stage-1 stub:
  - Implements Jest's `Transformer` interface: `process(src, filename, opts)` calls **`@superjs/compiler.transform()` (B1)** and returns `{ code, map }`.
  - Jest's sync API constraint: cache compiled output to disk per `(filename, mtime, compiler-version)` and serve sync from cache; first-run does a sync wait via `deasync` or `child_process.spawnSync` to bootstrap the cache.
  - Source maps wired so Jest's stack traces point to `.sjs` lines.
  - Sample fixture: `examples/jest-sjs/` with 100+ tests in `.test.sjs`.
- `@superjs/vitest-transform` at `packages/vitest-transform/`:
  - Implements Vitest's transform plugin (Vite-based — re-uses Vite plugin internals).
  - Sample fixture: `examples/vitest-sjs/`.
- `@superjs/test-matchers` at `packages/test-matchers/`:
  - Re-exports `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll` from Jest/Vitest under typed signatures.
  - Adds matchers: `toMatchVariant(tag)`, `toMatchVariantWith(tag, predicate)`, `toMatchResult({ ok? | err? })`, `toMatchOption({ some? | none? })`.
  - Single API surface usable with both Jest and Vitest (runner detection at install).
- **Snapshot testing in Jest transform** (Tier-2 stretch goal): ship if Sprint 5.1 finished on time.
- Compile-time-determined test runner detection so a single import works in both.

**Key tasks:**
- [ ] Jest transform implementation (calls `transform()` per B1) + sync-cache layer + `examples/jest-sjs/`.
- [ ] Vitest transform implementation + `examples/vitest-sjs/`.
- [ ] Matchers package with typed signatures.
- [ ] Snapshot stretch goal.
- [ ] CI step that runs the 100+ test fixture under both Jest and Vitest; all green.

**Done signal:** `npm test` on `examples/jest-sjs/` passes with stack traces pointing to `.sjs` lines; same fixture under Vitest passes with the same matchers.

### Sprint 5.3 — Package conventions + monorepo edge cases + determinism gate + `superjs verify` + `RELEASING.md` (2 weeks)

**Deliverables:**
- `docs/package-conventions.md` documents:
  - `package.json` fields for SJS packages: `"sjs"` entry, `"exports"` map with `"types"` conditional, `"sjsConfig"` for compile flags.
  - `superjs.config.json` format with reserved `"language": "1.0"` (C4) and `"extends": "tsconfig.json"` (M9).
  - Examples for library packages, app packages, monorepo packages.
- **Monorepo edge cases (S4 reframed):** foundational pnpm-workspace + npm-workspace resolver behaviour shipped in Stage 1 Sprint 1.4 with acceptance tests. This sprint covers:
  - Yarn-Berry PnP `.pnp.cjs` mode (documented as "supported with `pnpEnableEsmLoader`"; experimental flag — bug fixes only at v1.0).
  - Hoisted vs nested `node_modules` layouts; resolver tie-breaking documented.
  - `workspace:*` protocol semantics (how `superjs add` writes the dependency entry; how the resolver follows it).
  - Catch-all: a 5-workspace fixture at `examples/monorepo-sjs/` (app + 2 libs + 1 shared types + 1 stdlib-consumer) tested across npm, pnpm, yarn-classic. yarn-berry-pnp marked experimental.
- **Build determinism enforced as hard gate (S3 extension)**: this stage adds `check:determinism:plugins` covering plugin packages and `check:determinism:cli` covering the CLI bundle. PR cannot merge if any package's build is non-deterministic.
- **`superjs verify <input-dir> <output-dir>` (C10)** in `packages/compiler/src/cli/verify.ts`:
  - Reads source from `<input-dir>`.
  - Reads expected output from `<output-dir>`.
  - Runs `superjs build` against `<input-dir>` to a temp directory.
  - `diff -r` the temp output against `<output-dir>`.
  - Exit code 0 = match; non-zero + diff dump = mismatch.
  - Documented in `docs/cli/verify.md`; recommended in `docs/security/supply-chain.md` (Stage 6) as a way to verify CI-built artefacts against locally-built artefacts.
- `--provenance` attestation verified on every published package; `npm view @superjs/<pkg> dist.attestations` returns expected output.
- **`RELEASING.md` (C8)** at repo root documenting:
  - Per-package publish-rights table (which npm account, which GitHub Action role).
  - **R1 — two npm accounts with `--provenance` rights:** primary maintainer account + co-publisher account; OIDC bindings configured for both via GitHub OIDC; rotation procedure (revoke compromised account, transfer to backup, regenerate OIDC binding). Test rotation in this sprint by re-publishing one package from the co-publisher account.
  - CI bar for patch release: smoke tests + no new lint warnings + perf within +5 % of baseline + `--provenance` attestation present.
  - CVE fast-patch protocol: 24-hour triage SLA; patch + GitHub Security Advisory + npm `dist-tag` update within 7 days for critical; coordinated disclosure window per Stage 0 SECURITY.md.
- Air-gapped install documentation: every dep is npm-resolvable; no `postinstall` network calls; `npm install --offline` works after `npm cache add`.

**Key tasks:**
- [ ] Author `docs/package-conventions.md`.
- [ ] Workspaces edge-case fixture build + CI test (npm, pnpm, yarn-classic; yarn-berry-pnp marked experimental).
- [ ] Resolver edge-case docs (hoisted vs nested, `workspace:*`).
- [ ] Determinism CI step extended to plugins + CLI.
- [ ] Implement `superjs verify` (C10); document; add `docs/cli/verify.md`.
- [ ] Verify all packages publish with `--provenance`.
- [ ] Author `RELEASING.md` (C8): publish-rights table, two-account rotation (R1), patch CI bar, CVE fast-patch protocol.
- [ ] Test co-publisher rotation by re-publishing one package from the secondary account.
- [ ] Author air-gapped-install doc.

**Done signal:** `pnpm install` on the 5-workspace fixture works; `superjs build` produces correct output across packages; CI determinism check passes on all packages + plugins + CLI; `superjs verify` against a known-good fixture returns 0; `superjs verify` against a tampered fixture returns non-zero with diff; `npm install -g superjs --offline` works after `npm cache add`; co-publisher rotation drill green; `RELEASING.md` reviewed and merged.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vite HMR breaks for React Fast Refresh edge cases | M | H | Sprint 5.1 includes sample fixture HMR round-trip test; if breaks, ship without Fast Refresh and document workaround (full reload on SJS change); v1.1 fix. |
| Source-map composition through Vite + bundler + minifier loses fidelity | M | M | End-to-end stack-trace test in 5.1; Stage 1 source-map fidelity gate (M5) catches most; if broken in production builds, ship dev-only working maps and document. |
| Jest transform breaks on ESM/CJS edge cases (Jest's perennial pain) | M | M | Test with both ESM and CJS Jest configs in 5.2; sync-cache layer handles Jest's sync constraint; if breaks in some config, document the supported config. |
| Pnpm workspace resolution differs from npm workspaces in subtle ways | L | M | Foundational acceptance test in Stage 1 Sprint 1.4 (S4); this stage covers edge cases only. |
| Determinism breaks under a corner case (path normalisation across OSes) | L | H | CI matrix runs determinism on three OSes; cross-OS byte-equality is **not** required (only same-OS); document this; `superjs verify` (C10) gives users the same per-OS guarantee. |
| CLI bundle size too large (slow `npm install`) | L | M | Bundle via esbuild; minify; target < 5 MB compressed; conditional `language-server` inclusion (B2) keeps size down if LSP slips. |
| **R1 — npm account SPOF for `--provenance`** | L | H | Two-account rotation documented in `RELEASING.md` and tested in Sprint 5.3; both have OIDC bindings; revocation procedure rehearsed. |
| Stage 3 LSP M1 not done by Sprint 5.1 publish (B2 case) | M | M | CLI ships without `superjs lsp`; documented in `RELEASING.md` as the intentional v1.0 stance; later minor adds it; not a silent breaking change because users were never offered `superjs lsp` in the v1.0 CLI. |
| Snapshot testing stretch goal not shipped | L | L | Tier-2 from the start; documented as v1.1. |
| `superjs init` templates rot due to upstream framework changes (Fastify, Workers runtime, Lambda) | M | L | Pin template `package.json` to known-good versions; CI runs template smoke daily; on upstream major bump, file template-update issue. |
| Minimum viable backend fixture flakes in CI due to port conflicts | L | L | Use random-port allocation in CI; retry with backoff. |
| `superjs verify` confuses users by surfacing legitimate non-determinism (e.g. user code does `Date.now()`) | M | L | `docs/cli/verify.md` explicitly notes "user code that depends on time/random will not byte-match by design; this command verifies the compiler's contribution to the output, not the user's". |

## API Contract

This stage produces:

1. **`superjs` CLI npm package** — the primary distribution. Consumed by every user; `npm install -g superjs` or `npm install --save-dev superjs`. CLI subcommands: `build`, `check`, `format`, `lint`, `init` (T6), `add`, `doctor`, `explain`, `migrate from-ts`, `migrate from-prototype` (C2), `verify` (C10), and **conditionally `lsp`** per B2. Documented in `docs/cli/`.

2. **`@superjs/vite-plugin`, `@superjs/esbuild-plugin`** — build-tool integrations using `@superjs/compiler.transform()` (B1). Each exposes a standard plugin factory function consumed via the host bundler's plugin array.

3. **`@superjs/jest-transform`, `@superjs/vitest-transform`** — test-runner transforms using `transform()` (B1). Configured in `jest.config.js` / `vitest.config.ts`.

4. **`@superjs/test-matchers`** — typed matcher surface. Consumed by user tests via `import { expect } from "@superjs/test-matchers"`.

5. **`superjs init <template>` (T6)** — four templates (`node-cli`, `fastify-api`, `workers-api`, `lambda-handler`); each is a versioned scaffold under `templates/`.

6. **`superjs verify` (C10)** — user-auditable determinism check; output is human-readable diff or empty + exit code.

7. **Package convention spec** — `docs/package-conventions.md`. Consumed by the SJS community (third-party plugin/library authors will look here first).

8. **`RELEASING.md` (C8)** — release process, publish-rights table, two-account rotation (R1), CVE fast-patch protocol.

9. **Determinism contract** — `(same input, same compiler version, same config, same OS)` → byte-identical output across stdlib, wrappers, plugins, user code. CI-enforced from this stage onwards; user-auditable via `superjs verify`.

## Dependencies

- **Requires Stage 2:** `@superjs/types-vite`, `@superjs/types-esbuild`, `@superjs/types-jest`, `@superjs/types-vitest`, `@superjs/types-fastify`, `@superjs/types-zod`, `@superjs/types-pino`, `@superjs/types-cloudflare-workers` (for templates).
- **Requires Stage 4:** `@superjs/std-*` packages on npm — `superjs init` templates import `@superjs/std-core` and `@superjs/std-fs` in the generated `index.sjs`.
- **Requires Stage 1:** stable compiler API; `transform()` async API (B1); `@superjs/runtime` (B4); CLI bundling depends on `@superjs/compiler` and (conditionally per B2) `@superjs/language-server` (Stage 3).
- **Blocks on Stage 3 LSP M1 done (B2)** before publishing CLI **with** the `lsp` subcommand. If Stage 3 slips beyond Stage 5's calendar, CLI ships without `lsp`; later minor adds it.
- **Unlocks Stage 6** — beta program needs working `npm install -g superjs`, working Vite plugin, working Jest transform, working templates. "Why SJS" page needs a "5-minute install" video/screenshot using these packages and `examples/mvb-fastify/` (T3).
