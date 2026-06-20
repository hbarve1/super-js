# Contributing to SuperJS

Thank you for your interest in contributing to SuperJS! This document explains how to get started, what conventions we follow, and what we expect from contributors.

---

## Code of Conduct

All contributors are expected to abide by the [SuperJS Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

---

## Developer Certificate of Origin (DCO)

Every commit must be signed off with the Developer Certificate of Origin. This certifies that you have the right to submit the code you are contributing — i.e., that it is your own work, or work you have permission to submit under the project license.

Sign off each commit with:

```
git commit -s -m "feat(compiler): add expression parsing"
```

This appends the following trailer to your commit message:

```
Signed-off-by: Your Name <email@example.com>
```

By signing off you agree to the terms at https://developercertificate.org. Pull requests with unsigned commits will not be merged.

---

## Branch Naming

Use one of the following prefixes, followed by a short hyphenated description:

| Prefix   | When to use                              |
|----------|------------------------------------------|
| `feat/`  | New features or capabilities             |
| `fix/`   | Bug fixes                                |
| `chore/` | Maintenance, tooling, dependency updates |
| `docs/`  | Documentation-only changes               |

Examples: `feat/array-destructuring`, `fix/type-narrowing-crash`, `docs/contributing-guide`.

---

## Commit Message Style

SuperJS uses [Conventional Commits](https://www.conventionalcommits.org/).

**Format:**

```
<type>(<scope>): <short description>

[optional body]

[optional footers]
```

**Rules:**
- Subject line must be 72 characters or fewer.
- Use the imperative mood: "add X", not "added X" or "adds X".
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`.
- Scope is the package or area affected (e.g., `compiler`, `cli`, `types`, `docs`).

**Examples:**
```
feat(compiler): add support for template literal types
fix(cli): resolve crash when config file is missing
chore(deps): upgrade typescript to 5.5
docs(readme): update installation instructions
```

---

## Releases

SuperJS publishes two npm packages from the NX monorepo:

- [`@superjsorg/cli`](https://www.npmjs.com/package/@superjsorg/cli) — the `superjs` command.
- [`@superjsorg/compiler`](https://www.npmjs.com/package/@superjsorg/compiler) — the programmatic API.

Releases are **tag-triggered**: pushing a `v*` tag (e.g. `v0.1.1`) runs
`.github/workflows/release-npm.yml`, which stamps the version into both manifests,
builds the self-contained bundles, and publishes them to npm with provenance.
Maintainers cut releases; contributors do not need to touch versioning in a PR.

---

## Pull Request Checklist

Before opening a PR, confirm the following:

- [ ] All commits are signed off (`Signed-off-by:` trailer present).
- [ ] Commit messages follow Conventional Commits format.
- [ ] `pnpm nx run-many -t lint test typecheck` passes with no errors.
- [ ] Documentation has been updated if the PR adds or changes user-facing behavior.

---

## How to Run Tests

All work happens in the NX workspace under `superjs/` with [pnpm](https://pnpm.io):

```bash
cd superjs
pnpm install
```

Run a target for a single project (build, test, typecheck, lint):

```bash
pnpm nx test @superjs/checker
pnpm nx build @superjs/compiler
```

Run every check across the whole workspace (what CI runs):

```bash
pnpm nx run-many -t lint test typecheck build
```

Only re-run what your change affected:

```bash
pnpm nx affected -t test lint
```

---

## Proposing language changes

Language changes require an RFC. See [rfcs/README.md](rfcs/README.md) for the process and template.

## Spec changes

Changes under `specs/` require maintainer approval. Post-1.0 spec changes require an RFC plus a documented "spec exception" approval.

## Stability and deprecation

Public API stability tiers are defined in [STABILITY.md](STABILITY.md). Deprecation windows for stable APIs are in [docs/deprecation.md](docs/deprecation.md).

---

## Reporting Issues

Please use [GitHub Issues](https://github.com/hbarve1/super-js/issues) to report bugs, request features, or ask questions. Before opening a new issue, search existing issues to avoid duplicates.

For security vulnerabilities, do **not** open a public issue. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
