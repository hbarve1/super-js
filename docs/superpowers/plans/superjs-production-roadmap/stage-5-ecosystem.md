# Stage 5: Ecosystem

## Goal
Make SuperJS installable, embeddable in real build systems, runnable in real test runners, and consistent across monorepo workspaces — so a TS developer can `npm install -g superjs`, drop in `@superjs/vite-plugin`, run their existing Vitest suite via `@superjs/vitest-transform`, and get a green build on three operating systems.

## Entry Criteria
- Stage 2 done. Hand-curated wrappers for top 30 packages exist; translator works; `@superjs/interop` published.
- Stage 4 done. `@superjs/std-*` packages on npm with `--provenance`; bootstrap pipeline working.
- Stage 1 `superjs build` is deterministic (CI check from Stage 0 still passing on Stages 1–4 outputs).
- Stage 3 LSP + VS Code extension shipped (not strictly required for Stage 5 to ship plugins, but recommended so the user-facing "set up SuperJS" docs make sense).

## Exit Criteria (Done When)
- [ ] `superjs` CLI package published to npm at `0.x` with `--provenance`; `npm install -g superjs` works on Windows, macOS, Linux with **no postinstall network calls** and **no native binary** (pure JS).
- [ ] `bin/superjs.cmd` shim included; tested on Windows.
- [ ] GitHub Releases tagged on every minor/patch with full changelog; release asset is the source tree + a notarised npm tarball (no native binary, no code signing required at v1.0).
- [ ] `@superjs/vite-plugin` published; implements `transform` and `handleHotUpdate`; HMR round-trip < 200 ms on a sample SJS+React+Vite project.
- [ ] `@superjs/esbuild-plugin` published; transforms `.sjs` to JS in esbuild's plugin pipeline; source maps wired.
- [ ] `@superjs/jest-transform` published; configures Jest's `transform` field; runs SJS tests in a sample 100+ test fixture.
- [ ] `@superjs/vitest-transform` published; runs the same fixture under Vitest.
- [ ] `@superjs/test-matchers` published; re-exports `describe`/`it`/`expect`/lifecycle hooks under typed signatures; adds `toMatchVariant`, `toMatchVariantWith`, `toMatchResult`, `toMatchOption` matchers.
- [ ] **SJS package conventions** documented in `docs/package-conventions.md`: `package.json` with `"sjs": "src/index.sjs"` entry point; `"exports"` map covering `"."`, `"./*"`, conditional `"types"`; `"sjsConfig"` field for compile flags.
- [ ] **Monorepo workspace support**: cross-package `.sjs` imports resolve correctly across `npm`/`pnpm`/`yarn` workspaces; tested on a 5-workspace fixture.
- [ ] **Build determinism enforced in CI** as a hard gate (graduated from "soft" in Stage 1): two consecutive builds of the same input must be byte-identical; CI fails the merge on any diff.
- [ ] All published packages have CHANGELOG.md (Changesets-generated).
- [ ] Each official package has `--provenance` attestation visible on npm.

## Sprints

### Sprint 5.1 — CLI publish + Vite plugin + esbuild plugin (2 weeks)

**Deliverables:**
- `packages/superjs/` — the CLI npm package. Entry point bundles all of `packages/compiler/`, `packages/language-server/` (so `superjs lsp` works without a separate install), and any runtime helpers.
- Pure-JS distribution; no native binary; no `postinstall` script.
- `bin/superjs.js` (Unix) + `bin/superjs.cmd` (Windows shim per npm convention).
- Pre-bundled via `esbuild` or `tsup` — single self-contained file; no `node_modules` lookup at runtime for compiler internals.
- `@superjs/vite-plugin` at `packages/vite-plugin/`:
  - Implements Vite's `transform` hook: `.sjs` source → JS + source map via `@superjs/compiler` `compile`.
  - Implements `handleHotUpdate`: emits Vite's HMR signal on file change.
  - React Fast Refresh integration: detects JSX presence, injects the standard React Fast Refresh runtime (same as `@vitejs/plugin-react`).
  - Source-map chain integration: composes SJS source maps with Vite's bundler-level maps via `magic-string`.
  - Sample fixture: `examples/vite-react-sjs/` with a working HMR round-trip.
- `@superjs/esbuild-plugin` at `packages/esbuild-plugin/`:
  - Implements esbuild's `setup(build)` API; `onLoad({ filter: /\.sjs$/ })` transforms via `@superjs/compiler`.
  - Source maps inlined or external per esbuild's `sourcemap` option.
  - Sample fixture: `examples/esbuild-sjs/` with a bundled output.

**Key tasks:**
- [ ] Bundle CLI via `tsup`/`esbuild` (single file); verify cold-start < 200 ms.
- [ ] Verify `bin/superjs.cmd` on Windows (CI matrix runs this).
- [ ] `npm pack` + `npm install -g ./superjs-X.Y.Z.tgz` smoke test in CI for each OS.
- [ ] Publish CLI to npm with `--provenance`.
- [ ] Vite plugin: scaffold + transform + HMR + Fast Refresh.
- [ ] Esbuild plugin: scaffold + onLoad + source maps.
- [ ] HMR round-trip benchmark in `examples/vite-react-sjs/` < 200 ms; recorded.
- [ ] CI step that builds both example fixtures and asserts emitted JS runs.

**Done signal:** `npm install -g superjs@<latest>` works on three OSes; `vite dev` on the sample React+SJS project hot-reloads in < 200 ms; `esbuild --bundle` on the sample produces a runnable bundle.

### Sprint 5.2 — Jest transform + Vitest transform + matchers + test fixture (2 weeks)

**Deliverables:**
- `@superjs/jest-transform` at `packages/jest-transform/`:
  - Implements Jest's `Transformer` interface: `process(src, filename, opts)` calls `@superjs/compiler.transformAsync` and returns `{ code, map }`.
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
- [ ] Jest transform implementation + `examples/jest-sjs/`.
- [ ] Vitest transform implementation + `examples/vitest-sjs/`.
- [ ] Matchers package with typed signatures.
- [ ] Snapshot stretch goal.
- [ ] CI step that runs the 100+ test fixture under both Jest and Vitest; all green.

**Done signal:** `npm test` on `examples/jest-sjs/` passes with stack traces pointing to `.sjs` lines; same fixture under Vitest passes with the same matchers.

### Sprint 5.3 — Package conventions + monorepo support + determinism gate (2 weeks)

**Deliverables:**
- `docs/package-conventions.md` documents:
  - `package.json` fields for SJS packages: `"sjs"` entry, `"exports"` map with `"types"` conditional, `"sjsConfig"` for compile flags.
  - `superjs.config.json` format (already speced in Stage 0; this stage documents user-facing patterns).
  - Examples for library packages, app packages, monorepo packages.
- Monorepo resolution: Stage 1's resolver extended (or verified) to walk up `node_modules` chains across `npm`/`pnpm`/`yarn` workspaces; cross-package `.sjs` imports type-check correctly.
- 5-workspace fixture at `examples/monorepo-sjs/`: app + 2 libs + 1 shared types + 1 stdlib-consumer. CI test asserts:
  - Cross-workspace `.sjs` imports resolve.
  - Type errors in one workspace surface at importer sites in another.
  - Incremental rebuild on one-package change is < 200 ms warm.
- **Build determinism enforced as hard gate**: Stage 0 set up the determinism CI step; Stage 1 wired it on the compiler; this stage adds it to **every** published-package build (stdlib, wrappers, plugins). PR cannot merge if any package's build is non-deterministic.
- `--provenance` attestation verified on every published package; `npm view @superjs/<pkg> dist.attestations` returns expected output.
- Air-gapped install documentation: every dep is npm-resolvable; no `postinstall` network calls; `npm install --offline` works after `npm cache add`.

**Key tasks:**
- [ ] Author `docs/package-conventions.md`.
- [ ] Workspaces fixture build + CI test.
- [ ] Resolver test cases: pnpm, npm, yarn workspaces.
- [ ] Determinism CI step extended to all packages.
- [ ] Verify all packages publish with `--provenance`.
- [ ] Author air-gapped-install doc.

**Done signal:** `pnpm install` on the 5-workspace fixture works; `superjs build` produces correct output across packages; CI determinism check passes on all packages; `npm install -g superjs --offline` works after `npm cache add`.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vite HMR breaks for React Fast Refresh edge cases | M | H | Sprint 5.1 includes sample fixture HMR round-trip test; if breaks, ship without Fast Refresh and document workaround (full reload on SJS change); v1.1 fix. |
| Source-map composition through Vite + bundler + minifier loses fidelity | M | M | End-to-end stack-trace test in 5.1; if broken in production builds, ship dev-only working maps and document. |
| Jest transform breaks on ESM/CJS edge cases (Jest's perennial pain) | M | M | Test with both ESM and CJS Jest configs in 5.2; if breaks in some config, document the supported config. |
| Pnpm workspace resolution differs from npm workspaces in subtle ways | M | M | Test both in 5.3; document any incompatibility; pnpm wins for monorepo users. |
| Determinism breaks under a corner case (path normalisation across OSes) | L | H | CI matrix runs determinism on three OSes; cross-OS byte-equality is **not** required (only same-OS); document this. |
| CLI bundle size too large (slow `npm install`) | L | M | Bundle via esbuild; minify; target < 5 MB compressed. |
| `--provenance` requires GitHub Actions OIDC + npm linkage; setup failure | L | M | Documented in `RELEASING.md`; first publish dry-run validates. |
| Snapshot testing stretch goal not shipped | L | L | Tier-2 from the start; documented as v1.1. |

## API Contract

This stage produces:

1. **`superjs` CLI npm package** — the primary distribution. Consumed by every user; `npm install -g superjs` or `npm install --save-dev superjs`. CLI subcommands documented in `docs/cli/`.

2. **`@superjs/vite-plugin`, `@superjs/esbuild-plugin`** — build-tool integrations. Each exposes a standard plugin factory function consumed via the host bundler's plugin array.

3. **`@superjs/jest-transform`, `@superjs/vitest-transform`** — test-runner transforms. Configured in `jest.config.js` / `vitest.config.ts`.

4. **`@superjs/test-matchers`** — typed matcher surface. Consumed by user tests via `import { expect } from "@superjs/test-matchers"`.

5. **Package convention spec** — `docs/package-conventions.md`. Consumed by the SJS community (third-party plugin/library authors will look here first).

6. **Determinism contract** — `(same input, same compiler version, same config, same OS)` → byte-identical output across stdlib, wrappers, plugins, user code. CI-enforced from this stage onwards.

## Dependencies

- **Requires Stage 2:** `@superjs/types-vite`, `@superjs/types-esbuild`, `@superjs/types-jest`, `@superjs/types-vitest` — the wrappers needed for plugins to type their host APIs.
- **Requires Stage 4:** `@superjs/std-*` packages on npm — the CLI's `superjs init` template imports `@superjs/std-core` in the generated `index.sjs`.
- **Requires Stage 1:** stable compiler API; CLI bundling depends on `@superjs/compiler` and `@superjs/language-server` (Stage 3).
- **Soft requires Stage 3:** the CLI bundle includes `@superjs/lsp` so `superjs lsp` works after a single global install. If Stage 3 slips, ship the CLI without `lsp` subcommand and add later (degraded UX, not a blocker).
- **Unlocks Stage 6** — beta program needs working `npm install -g superjs`, working Vite plugin, working Jest transform. "Why SJS" page needs a "5-minute install" video/screenshot using these packages.
