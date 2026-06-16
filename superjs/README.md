# SuperJS — NX Workspace

This is the [NX](https://nx.dev) monorepo for the SuperJS compiler, CLI, and
tooling. SuperJS (`.sjs`) is a strict superset of JavaScript with a sound,
Go-inspired type system. See the [repo root README](../README.md) for the
language overview and the [`specs/`](../specs/) directory for the formal spec.

> Architecture rationale: [`specs/design/ADR-008-nx-monorepo.md`](../specs/design/ADR-008-nx-monorepo.md).
> Implementation log: [`PROGRESS.md`](./PROGRESS.md).

## Layout

```
libs/         compiler pipeline (one project per stage, dependency-tiered)
  types        @superjs/types        — shared AST / Diagnostic / Type model (tier 0)
  diagnostics  @superjs/diagnostics  — error-code registry + factory
  config       @superjs/config       — superjs.config.json loader/validator
  lexer        @superjs/lexer
  parser       @superjs/parser       — recursive-descent + Pratt, error recovery
  checker      @superjs/checker      — bidirectional type checker
  ir           @superjs/ir           — TypedAST → SJS-IR lowering
  codegen-js   @superjs/codegen-js   — SJS-IR → ES2022 + source maps
  compiler     @superjs/compiler     — public API façade (published)
  interop      @superjs/interop      — .d.ts → .sjs translator (Stage 2)
  runtime      @superjs/runtime      — panic/iterator/inspect helpers
  test-utils   @superjs/test-utils   — shared test harness (private)
apps/
  cli          superjs binary (published as @superjsorg/cli)
  e2e          end-to-end corpus harness
  vscode-extension  TextMate grammar extension (own lockfile, built with npm)
  website      Next.js docs site + playground (superjs.org)
```

Internal libraries use the `@superjs/*` workspace scope. The two published npm
packages are [`@superjsorg/cli`](https://www.npmjs.com/package/@superjsorg/cli)
and [`@superjsorg/compiler`](https://www.npmjs.com/package/@superjsorg/compiler).

## Getting started

Requires Node 24+ and [pnpm](https://pnpm.io) 11+.

```bash
pnpm install
```

## Running tasks

Always go through `nx` (prefixed with `pnpm` to use the workspace-pinned CLI):

```bash
pnpm nx test @superjs/checker          # one project
pnpm nx build @superjs/compiler        # build (and its deps)
pnpm nx run-many -t lint test typecheck build   # everything — what CI runs
pnpm nx affected -t test lint          # only what your change touched
pnpm nx graph                          # visualize the project graph
```

The `vscode-extension` app is excluded from the pnpm workspace (it has its own
lockfile and a native dependency); build and test it from its own directory with
`npm`.

## Releasing

Pushing a `v*` git tag triggers `.github/workflows/release-npm.yml`, which builds
the self-contained bundles and publishes `@superjsorg/cli` and
`@superjsorg/compiler` to npm with provenance.

## License

GPL-3.0-or-later — see [LICENSE](../LICENSE).
