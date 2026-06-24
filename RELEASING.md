# Releasing

How SuperJS packages are versioned, published, and patched. The release workflow
is `.github/workflows/release-npm.yml` (tag-triggered).

## Packages & publish rights

Official packages publish under the `@superjsorg` scope (plus the unscoped
`superjs` CLI). Every package publishes with **npm provenance** (`--provenance`),
so each release is attested to its source commit + workflow.

| Package | Notes |
|---------|-------|
| `superjs` (CLI) | Bundled, pure JS, no native binary, no postinstall network calls. |
| `@superjsorg/compiler` | The compiler API surface. |
| `@superjs/lsp`, `@superjs/std-*`, `@superjs/types-*`, build plugins | Published as they stabilise. |

**Publish rights (R1):** at least **two** npm accounts hold publish + provenance
rights — the primary maintainer and a co-publisher — so a release is never
blocked on one person. Rotation: a new co-publisher is added before the previous
one is removed; rights are reviewed each minor release.

## Versioning

- Changesets-driven; every package keeps a `CHANGELOG.md`.
- Semver. The compiler and stdlib are coupled by a compiler-compat range
  (`peerDependencies`); a compiler major may force a stdlib major.
- Tag `vX.Y.Z` triggers `release-npm.yml`, which builds and publishes the
  affected packages with `--provenance`.

## Patch-release bar

A patch may ship only when:

- all smoke tests pass on Ubuntu / macOS / Windows;
- no new lint warnings;
- performance within **+5 %** of the prior release on the benchmark suite;
- `superjs verify` is byte-clean on the determinism fixtures.

## CVE / security fast-patch

- **Triage SLA:** 24 hours from a credible report (see `SECURITY.md`).
- **Critical:** patch + advisory within **7 days**; backported to the latest
  minor. Coordinate disclosure; rotate any leaked credential immediately.
- Advisories are filed as GitHub Security Advisories and noted in the changelog.

## Pre-publish checklist

1. `nx run-many -t test` green; `nx run-many -t build` green.
2. CHANGELOG entries written (Changesets).
3. `NPM_TOKEN` secret present in CI (provenance requires the trusted workflow).
4. Tag `vX.Y.Z`; confirm the workflow published and provenance shows on npm.
5. Cut the GitHub Release with the changelog.

## Release candidate (RC) cycle

v1.0 ships after at least one RC (`1.0.0-rc.1`). Maintainer-only — do not tag RC
without explicit approval and npm token rotation (see release checklist).

| Phase | Tag | Duration | Allowed changes |
|-------|-----|----------|-----------------|
| RC.1 | `v1.0.0-rc.1` | ≥ 2 weeks | Blocker fixes only |
| RC.2 | `v1.0.0-rc.2` | ≥ 2 weeks | Blocker fixes only |
| RC.3 | `v1.0.0-rc.3` (if needed) | ≥ 2 weeks | Blocker fixes only |
| GA | `v1.0.0` | — | Changelog + launch artefacts |

**RC checklist:**

1. Beta teams on `rc.N` (see `docs/beta/index.md`).
2. Bug bash complete — no open `severity=blocker` (see `docs/beta/bug-bash.md`).
3. External security review (S7) — critical/high fixed (`docs/security-review.md` when available).
4. `pnpm audit --audit-level=high` clean; CodeQL green on `main`.
5. Smoke on 3 OSes + Node 20/22/24: `superjs build`, `superjs check`, LSP hover fixture.
6. Playground Worker deployed + smoke (`docs/ops/playground-deploy.md`) if using CF path.
7. Automated preflight: `node scripts/rc-preflight.mjs` (see `--skip-slow` for quick pass).

**Publishing RC:** same `release-npm.yml` flow with `v1.0.0-rc.N` tag; npm dist-tag `next` recommended until GA.
