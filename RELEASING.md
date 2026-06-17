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
