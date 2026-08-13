# ADR-012 — bun as the workspace package manager and tooling runtime

**Status:** Accepted
**Date:** 2026-08-14
**Amends:** [ADR-008 — NX monorepo](./ADR-008-nx-monorepo.md) (§Package manager)

## Context

ADR-008 selected pnpm as the package manager for the `superjs/` NX workspace.
That decision was made for the isolated `node_modules` layout (strict dependency
hygiene, no phantom dependencies) and for workspace protocol support.

Since then the workspace has grown to 51 projects. Install and task-graph time
dominate both local iteration and CI wall-clock, and every CI job pays a full
`pnpm install --frozen-lockfile` before doing any work.

bun now provides the properties ADR-008 wanted from pnpm — an isolated linker
with a symlinked store, workspace globs, and lockfile-pinned installs — with
substantially faster installs and process startup.

## Decision

**bun is the package manager and the tooling runtime for this repository.**
**Node remains the supported runtime for everything we publish.**

The split is deliberate and load-bearing:

| Layer | Runtime | Rationale |
|---|---|---|
| Workspace install | `bun install` / `bun.lock` | speed; isolated linker keeps ADR-008's hygiene property |
| NX task graph, tests, lint, typecheck, build | bun (`bunx nx`, `bun run nx`) | speed; no behavioural difference observed across all 51 projects |
| Repo gate scripts (`scripts/*.mjs`) | bun | speed; all scripts are plain ESM with `node:` builtins |
| **Published packages** (`@superjsorg/cli`, `@superjsorg/compiler`) | **Node ≥18** | consumers must never need bun |

bun is a **build-time tool only**. It never appears in a published package's
`engines`, `dependencies`, or runtime requirements. The CLI bundle is still
emitted with `--target=node18` and the publish manifests still declare
`engines.node >= 18`.

### CI consequence

Because bun now runs the build, the Node compatibility guarantee needs its own
explicit gate rather than being an accident of the build tool. CI therefore:

1. builds the publishable bundles once, with bun (`bundles` job), and
2. executes those bundles under a **Node 18 / 20 / 22 / 24 matrix**
   (`node-compat` job) — running `superjs build` on a real `.sjs` program,
   executing the emitted JavaScript, and importing the compiler bundle.

This is a stronger guarantee than the previous arrangement: the old Node matrix
installed and tested the *workspace* under two Node versions, which proved the
dev toolchain worked but never proved the shipped artefact ran anywhere. The
matrix also regains Node 20 and adds Node 18 — both were previously impossible
because a workspace dependency (`wrangler`) requires Node ≥22 to install. The
compat job installs nothing, so that constraint no longer bounds the matrix.

## Migration notes

- `pnpm-workspace.yaml` is gone. Its `packages:` list became the `workspaces`
  field in `superjs/package.json`, negation (`!apps/vscode-extension`) included
  — bun honours the exclusion.
- Its `overrides:` block moved verbatim to `overrides` in `superjs/package.json`.
- Its `allowBuilds:` block has no bun equivalent and needs none: bun does not run
  dependency lifecycle scripts unless the package is listed in
  `trustedDependencies`, so "do not build this" is bun's default.
- `esbuild` is now an explicit root devDependency. It was previously reachable
  only through pnpm's hoisting of a transitive dependency; bun's isolated layout
  does not expose transitive binaries in `node_modules/.bin`, and the publish
  build scripts invoke it directly.
- `superjs/scripts/ci-node-setup.cjs` was deleted. It existed to suppress Node's
  `MaxListenersExceededWarning` when NX forks many task processes; that warning
  does not occur under bun.
- `apps/vscode-extension` is unchanged — it stays outside the workspace with its
  own `package-lock.json` and is built, tested, and published with npm, because
  of its native `oniguruma` dependency.
- Publishing still uses `npm publish --provenance`. npm provenance is signed via
  GitHub OIDC by the npm CLI; bun only installs the dependencies for that job.

## Consequences

**Positive.** Faster installs and task runs locally and in CI. One lockfile
format. The Node support claim is now tested against the actual published
artefact, on every version we claim to support, instead of being assumed.

**Negative.** Contributors need bun installed (`curl -fsSL https://bun.sh/install | bash`).
bun is a younger toolchain than pnpm; if an NX plugin or dependency turns out to
misbehave under it, the fallback is to run that one task with `node`/`npx` while
keeping bun for installs.

**Neutral.** `bun audit` replaces `pnpm audit` in the CI security gate. Both
report the same advisory set for this dependency graph (verified: 24 high at
time of writing, identical between the two).
