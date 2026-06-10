# ADR-008: NX Monorepo — Fresh TypeScript Rewrite

**Status:** Accepted  
**Date:** 2026-06-10  
**Author:** Himank Barve  
**Supersedes:** Current npm-workspaces setup in root `package.json`

---

## Context

The current repository has six independent package.json files with no shared build orchestration:

| Path | Name | Lang | In workspaces? |
|------|------|------|---------------|
| `compiler/` | `super-js-compiler` | Plain JS | No |
| `backends/prototype/` | `super-js` | TypeScript | Yes |
| `packages/compiler-types/` | `@superjs/compiler-types` | TypeScript | Yes |
| `tools/ast-graph/` | `ast-graph` | TypeScript/React | No |
| `vscode-extension/` | `superjs-syntax` | TypeScript | No |
| `website/` | (Next.js) | TypeScript | No |

Problems with the current setup:
- Four packages outside npm workspaces — no linking, no shared caching
- `compiler/` is plain JavaScript; the production compiler must be TypeScript
- No build pipeline awareness — `npm run build` runs everything sequentially
- No affected detection — every CI run rebuilds everything
- Mixed package naming (`super-js`, `ast-graph`, `superjs-syntax`, `@superjs/compiler-types`)
- No tier/dependency enforcement — any package can import any other
- Not polyglot-ready — v2.0 adds C++/Rust (LLVM backend) and WASM toolchain

The v1.0 roadmap adds ~12 more packages. v2.0 adds 4 more non-JS packages. Scaling the current setup to 33 projects is not feasible.

---

## Decision

**Start a fresh NX monorepo with TypeScript throughout. Do not migrate existing code.**

The existing codebase served its purpose: it proved the language concepts, validated the pipeline, and built a 2000+ fixture corpus. That corpus is the test spec for the new implementation. The new monorepo uses the existing code as a reference — not as a migration target.

**Why fresh rewrite instead of migration:**
- Converting `compiler/` from plain JS → TypeScript would be a multi-week refactor on unstable foundations
- The existing workspace config is broken — fixing it means rebuilding it anyway
- Tier model and dep constraints are impossible to retrofit cleanly onto existing structure
- Every algorithm is proven — re-implementing in proper TypeScript with the correct structure is faster than migrating

**Why NX over Turborepo:**
- v2.0 adds LLVM backend (C++/Rust) and WASM toolchain — Turborepo is JS-first, polyglot support is bolted on
- NX `depConstraints` enforces the tier model at the linting level — Turborepo has no equivalent
- `nx graph` gives a live dependency graph critical for a compiler project with 33 projects
- NX has proper executors for non-JS build systems (`run-commands` for cmake/cargo/wasm-pack)
- NX Cloud remote cache is free for open source

**Why pnpm over npm:**
- pnpm is 2× faster installs via content-addressable store
- Strict by default — packages cannot use undeclared dependencies (catches implicit deps)
- Better monorepo support than npm workspaces
- NX's recommended package manager

---

## Monorepo Structure

### Tier Model

Dependency direction: Tier N may only depend on Tier < N. Enforced via NX `depConstraints` in `nx.json`. A lint gate rejects PRs that violate tier boundaries.

```
Tier 0   contracts      — pure types, no logic, no deps
Tier 1   pipeline       — compiler stages (lexer → parser → checker → ir)
Tier 2   backends       — code generators (JS, WASM, native)
Tier 3   compiler API   — public assembly of Tiers 1+2
Tier 4   tools          — consume compiler API (LSP, formatter, linter, doc-gen, migrate)
Tier 5   runtime        — independent of pipeline (runtime, stdlib)
Tier 6   integrations   — consume transform() API (build plugins)
Tier 7   apps           — deployable, consume everything below
```

### Apps — 5 total

```
apps/
  cli/               superjs binary — assembles Tier 3+4, published to npm as superjs
  website/           Next.js docs + marketing site
  playground/        Cloudflare Worker — runs @superjs/compiler in edge runtime [Stage 3]
  vscode-extension/  VS Code extension — LSP client + syntax highlighting
  e2e/               End-to-end tests — compiles examples/**/*.sjs, grammar smoke test, backend comparison
```

### Libs — 25 total

```
libs/
  # Tier 0 — contracts
  types/             @superjs/types
                     AST nodes, Token, Span, Diagnostic, Type, ScopeEntry
                     The single source of truth for all cross-package interfaces.
                     Published. Zero deps.

  diagnostics/       @superjs/diagnostics
                     SJS-EXXX / WXXX / LXXX / PXXX registry.
                     Code → message, fix suggestion, spec page URL.
                     Used by compiler (emit messages), CLI (explain command), website (error pages).
                     Depends on: types

  config/            @superjs/config
                     superjs.config.json schema, loader, validator, defaults.
                     Used by: compiler, lsp, formatter, linter, cli.
                     Depends on: types

  test-utils/        internal, private: true
                     Shared test helpers: fixture loader, diagnostic matchers,
                     AST snapshot helpers, compile-and-check shorthand.
                     Depends on: types, diagnostics

  # Tier 1 — pipeline
  lexer/             @superjs/lexer
                     Source string → TokenStream.
                     BiDi-spoof rejection (SJS-W012).
                     Depends on: types, diagnostics

  parser/            @superjs/parser
                     TokenStream → AST. Recursive-descent + Pratt.
                     Error recovery (sync-sets, phrase/panic per spec/parser-recovery.md).
                     Depends on: types, diagnostics, lexer

  checker/           @superjs/checker
                     AST → TypedAST + Diagnostics.
                     Bidirectional inference (Dunfield-Krishnaswami + structural extensions).
                     Cross-file inference. Exhaustiveness checking.
                     Depends on: types, diagnostics, parser

  ir/                @superjs/ir
                     TypedAST → SJS-IR.
                     Monomorphization, sum-type lowering, closure lowering, nullable lowering.
                     Human-readable .sjsir serialization.
                     Note: JS codegen goes through IR too — all backends are equal citizens.
                     Depends on: types, checker

  # Tier 2 — backends
  codegen-js/        @superjs/codegen-js
                     SJS-IR → ES2022 + source maps v3.
                     Source map fidelity score target ≥ 0.85.
                     Depends on: types, ir

  codegen-wasm/      @superjs/codegen-wasm                    [stub — v2.0]
                     SJS-IR → wasm32-wasi (WASI Preview 2).
                     SJS-IR → wasm32-unknown (browser).
                     SJS-IR → wasm32-wasi-component (Component Model).
                     Direct IR codegen (not via LLVM). Binaryen wasm-opt integration.
                     Depends on: types, ir

  codegen-native/    @superjs/codegen-native                  [stub — v2.0]
                     SJS-IR → LLVM IR → native binary.
                     NX run-commands executor (invokes llc, clang, zig cc).
                     Depends on: types, ir

  # Tier 3 — public compiler API
  compiler/          @superjs/compiler
                     compile(), check(), transform(), typeAt().
                     Assembles Tiers 1+2. Owns incremental cache (apiHash/docHash).
                     THE public API for downstream tools — lsp, plugins, playground.
                     Depends on: config, types, diagnostics, lexer, parser, checker, ir, codegen-js

  # Tier 4 — language tools
  lsp/               @superjs/lsp                             [stub — Stage 3]
                     LSP M1: 9 methods. Memory ≤ 250 MB idle. P99 ≤ 200 ms.
                     Depends on: compiler, config

  formatter/         @superjs/formatter                       [stub — Stage 3]
                     Opinionated, deterministic, idempotent.
                     Uses parser directly — formatting is AST-only, no type info needed.
                     Depends on: parser, config

  linter/            @superjs/linter                          [stub — Stage 3]
                     17 rules at v1.0. Type-aware rules use compiler.
                     Depends on: compiler, config

  doc-gen/           @superjs/doc-gen                         [stub — Stage 3]
                     Extracts doc comments + type signatures → structured documentation.
                     Outputs: HTML, Markdown, JSON.
                     Powers: superjs doc CLI command, website API reference.
                     See: ADR-009-doc-gen.md for full design.
                     Depends on: compiler, types (type info makes docs exact)

  dts-translator/    @superjs/dts-translator                  [stub — Stage 2]
                     .d.ts → .d.sjs. any→dynamic, union→sum types, ?→T?.
                     Typed-surface score ≥ 70% on 200-package smoke test.
                     Depends on: types, parser, config

  migrate/           @superjs/migrate                         [stub — Stage 6]
                     from-prototype: rewrites prototype-layout → compiler-layout.
                     from-typescript: rewrites .ts → .sjs, flags banned constructs.
                     Depends on: parser, types

  create/            @superjs/create                          [stub — Stage 5]
                     superjs init template scaffolding.
                     Templates: node-cli, fastify-api, workers-api, lambda-handler.
                     Depends on: config

  wrappers/          internal, private: true                  [stub — Stage 2]
                     Hand-curated .d.sjs files for top 30 npm packages.
                     One NX lib, loaded by dts-translator and cli.
                     Depends on: types

  # Tier 5 — runtime + stdlib
  runtime/           @superjs/runtime
                     attachIteratorSymbol, inspect, panic, assert, todo, unreachable.
                     Pure runtime helpers. Ships with user apps.
                     Zero compiler deps.

  stdlib/            @superjs/std-core + std-collections + std-async [stub — Stage 4]
                     One NX lib, three publishable entrypoints via exports map.
                     Bootstrapped: Stage 1 compiler output == Stage 4 compiler output.
                     Depends on: runtime

  # Tier 6 — build integrations
  plugin-vite/       @superjs/vite-plugin                     [stub — Stage 5]
  plugin-esbuild/    @superjs/esbuild-plugin                  [stub — Stage 5]
  plugin-jest/       @superjs/jest-transform                  [stub — Stage 5]
  plugin-vitest/     @superjs/vitest-transform                [stub — Stage 5]
                     All use transform() from @superjs/compiler.
                     Separate libs: different peerDeps, different release cadence.
                     Depend on: compiler

### Tools — 4 total (internal, never published)

```
tools/
  ast-graph/         3D AST visualizer — Vite + React + react-force-graph-3d
  bench/             Per-phase benchmarking harness. Enforces perf targets from
                     bench/per-phase-targets.md. Runs in CI on sprint done-signal PRs.
  fixture-gen/       Generates parser/checker test fixtures from grammar + spec.
  doc-gen/           Website content generator:
                     spec/error-codes/*.md → website/content/errors/
                     stdlib JSDoc → website/content/api/
                     spec/language.md/*.md → assembled spec page
```

Note: `tools/doc-gen/` (website content) is distinct from `libs/doc-gen/` (user-facing `superjs doc`).

---

## Project Counts

| Milestone | Apps | Libs | Tools | Total |
|-----------|------|------|-------|-------|
| Phase 1 (now) | 2 | 10 | 1 | 13 |
| v1.0 GA | 5 | 25 | 4 | 34 |
| v2.0 GA | 5 | 27 | 4 | 36 |

**Phase 1 active (build from scratch):**
`libs/types`, `libs/diagnostics`, `libs/config`, `libs/test-utils`, `libs/lexer`, `libs/parser`, `libs/checker`, `libs/ir`, `libs/codegen-js`, `libs/compiler`, `libs/runtime`, `apps/cli`, `apps/e2e`

Everything else: scaffolded with correct `project.json` + empty `src/index.ts`, built when its stage starts.

---

## Build Order (Phase 1)

```
1. libs/types          — no deps; defines everything
2. libs/diagnostics    — depends on types
3. libs/config         — depends on types
4. libs/test-utils     — depends on types, diagnostics
5. libs/runtime        — no compiler deps; can build in parallel with 1-4
6. libs/lexer          — depends on types, diagnostics
7. libs/parser         — depends on lexer
8. libs/checker        — depends on parser
9. libs/ir             — depends on checker
10. libs/codegen-js    — depends on ir
11. libs/compiler      — depends on config + codegen-js (assembles all)
12. apps/cli           — depends on compiler
13. apps/e2e           — depends on cli (runs superjs build on examples/)
```

---

## Technology Choices

| Concern | Choice | Reason |
|---------|--------|--------|
| Package manager | pnpm | Strict, fast, best NX support |
| NX version | latest (21.x) | polyglot executors, dep constraints |
| Language | TypeScript 5.x everywhere | No mixed JS/TS |
| Test runner | Jest (transition to Vitest post-Stage 5) | Jest first for compatibility |
| Bundler (libs) | tsc (no bundler for libs) | Simpler; consumers bundle |
| Bundler (cli) | esbuild via NX executor | Single binary output |
| Bundler (website) | Next.js built-in | Standard |
| Bundler (ast-graph) | Vite | Existing setup |
| Linter | ESLint + @nx/eslint-plugin | NX-aware lint rules |
| Formatter | Prettier | For the monorepo itself (ironic but practical before Stage 3) |
| Versioning | Changesets | Already configured |
| CI caching | NX Cloud (free tier) | Remote cache across CI runs |
| Non-JS executors | NX run-commands | cmake/cargo/wasm-pack for v2.0 |

---

## NX Config Decisions

### `nx.json` — task pipeline

```json
{
  "targetDefaults": {
    "build":     { "dependsOn": ["^build"], "outputs": ["{projectRoot}/dist"] },
    "test":      { "dependsOn": ["build"], "inputs": ["default", "^default"] },
    "lint":      { "inputs": ["default"] },
    "typecheck": { "dependsOn": ["^build"] }
  },
  "namedInputs": {
    "default":   ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  }
}
```

`^build` means: build my dependencies before building me. This makes the tier model automatic — `libs/checker` builds after `libs/parser` builds.

### Dep constraints in `nx.json`

```json
{
  "depConstraints": [
    { "sourceTag": "tier:0", "onlyDependOnLibsWithTags": [] },
    { "sourceTag": "tier:1", "onlyDependOnLibsWithTags": ["tier:0"] },
    { "sourceTag": "tier:2", "onlyDependOnLibsWithTags": ["tier:0", "tier:1"] },
    { "sourceTag": "tier:3", "onlyDependOnLibsWithTags": ["tier:0", "tier:1", "tier:2"] },
    { "sourceTag": "tier:4", "onlyDependOnLibsWithTags": ["tier:0", "tier:1", "tier:2", "tier:3"] },
    { "sourceTag": "tier:5", "onlyDependOnLibsWithTags": ["tier:5"] },
    { "sourceTag": "tier:6", "onlyDependOnLibsWithTags": ["tier:0", "tier:3", "tier:5", "tier:6"] },
    { "sourceTag": "tier:app", "onlyDependOnLibsWithTags": ["tier:0", "tier:1", "tier:2", "tier:3", "tier:4", "tier:5", "tier:6"] },
    { "sourceTag": "scope:internal", "notDependOnLibsWithTags": ["scope:external"] }
  ]
}
```

Each `project.json` carries tags:
```json
{ "tags": ["tier:1", "scope:internal"] }
```

A PR that makes `libs/parser` import from `libs/lsp` (Tier 4) fails `nx lint` immediately.

### Package naming

All libs: `@superjs/<name>`. Internal libs carry `"private": true` in package.json — they get the scoped name for consistent imports within the monorepo but never publish to npm.

### tsconfig strategy

```
tsconfig.base.json          — shared compiler options (strict, exactOptionalPropertyTypes)
libs/types/tsconfig.json    — extends base
libs/lexer/tsconfig.json    — extends base; paths: { "@superjs/types": [...] }
...
```

NX manages path aliases so cross-lib imports work without building first in dev.

---

## CI Pipeline

```yaml
# .github/workflows/ci.yml (updated)

jobs:
  affected:
    runs-on: ubuntu-latest
    steps:
      - uses: nrwl/nx-set-shas@v4          # sets NX_BASE, NX_HEAD
      - run: pnpm install
      - run: pnpm nx affected -t lint typecheck build test
      - run: pnpm nx affected -t e2e       # only runs if cli or compiler changed
```

`nx affected` means: a change in `libs/checker` runs:
- `libs/checker` lint + typecheck + build + test
- `libs/ir` build + test (depends on checker)
- `libs/codegen-js` build + test
- `libs/compiler` build + test
- `apps/cli` build
- `apps/e2e` e2e

Does NOT run: `libs/lexer`, `libs/parser`, `libs/runtime`, `apps/website`, `tools/ast-graph`.

---

## Migration Path

**Phase 0 — freeze**
- Tag current `main` as `legacy/pre-nx`
- Branch `feat/nx-foundation` from `main`
- Delete `compiler/`, `backends/prototype/`, `packages/`, `tools/ast-graph/`, `vscode-extension/` from new branch
- Keep: `specs/`, `docs/`, `examples/`, `rfcs/`, `website/` (website migrates as-is), `.changeset/`

**Phase 1 — scaffold + implement**
- Initialize NX workspace: `npx create-nx-workspace@latest`
- Scaffold all 34 projects (13 active, 21 stubbed)
- Implement Phase 1 active libs in build order (types → diagnostics → config → ... → compiler → cli → e2e)
- Port website as-is into `apps/website/`

**Phase 2+ — implement per stage**
- Each stage's libs get implemented when their stage starts
- Stubs already have correct `project.json`, `tsconfig.json`, `package.json` — just empty `src/index.ts`

**Prototype reference**
- Old code accessible via `git show legacy/pre-nx:compiler/src/lexer/lexer.js`
- `apps/e2e` compare-backends test uses prototype as oracle until Stage 1 passes its full corpus

---

## Consequences

**Positive:**
- `nx affected` means CI only tests what changed — estimated 80% reduction in CI time by v1.0
- TypeScript throughout — no JS/TS mixed debugging
- Tier enforcement via dep constraints — impossible to create circular deps
- Polyglot ready — v2.0 LLVM/WASM backends slot in without restructuring
- Remote caching via NX Cloud — warm CI runs near-instant for unchanged code
- Clear build order — `^build` in `nx.json` handles dependency sequencing automatically

**Negative:**
- Phase 1 re-implements code that already works — 2–4 weeks of known work
- NX daemon adds background process (mitigated: `NX_DAEMON=false` in dev if desired)
- Per-project `project.json` boilerplate — mitigated by NX generators and templates

**Neutral:**
- `@superjs/compiler-types` → `@superjs/types` rename — clean break, correct in new setup
- pnpm strict mode may surface undeclared peer deps in existing npm packages — fix as encountered

---

## Related ADRs

- ADR-007: Two backend strategy — v1.0 JS backend, v2.0 LLVM + WASM backends
- ADR-009: `superjs doc` — documentation generation as first-class CLI command (see below)
