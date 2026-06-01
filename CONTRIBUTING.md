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

## Changeset Rules

SuperJS uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

**When a changeset IS required:**
- Any PR that modifies code under `packages/`.

**When a changeset is NOT required:**
- PRs that only touch `docs/`, `rfcs/`, or `spec/`.
- PRs that only affect CI configuration, tooling, or repository metadata.

**Adding a changeset:**

```bash
npx changeset add
```

Follow the prompts to select the affected packages and bump type (`patch`, `minor`, or `major`). Commit the generated `.changeset/*.md` file with your PR.

---

## `compiler-types` Bump Declaration Rule

Any PR that touches files under `packages/compiler-types/src/` **must** explicitly declare the semver bump category in the changeset. Refer to the bump category table in [`packages/compiler-types/SEMVER.md`](packages/compiler-types/SEMVER.md) to determine whether the change warrants a `patch`, `minor`, or `major` bump.

This rule exists because `compiler-types` is a public contract: downstream tooling depends on the exported types, and an incorrect bump category can cause silent breakage for consumers.

---

## Pull Request Checklist

Before opening a PR, confirm the following:

- [ ] All commits are signed off (`Signed-off-by:` trailer present).
- [ ] Commit messages follow Conventional Commits format.
- [ ] `npm run lint` passes with no errors.
- [ ] `npm test` passes with no failures.
- [ ] `npm run typecheck` passes with no errors.
- [ ] A changeset has been added (if the PR modifies code under `packages/`).
- [ ] Documentation has been updated if the PR adds or changes user-facing behavior.
- [ ] If `packages/compiler-types/src/` was changed, the changeset declares the correct bump category per `packages/compiler-types/SEMVER.md`.

---

## How to Run Tests

**Prototype (super-js workspace):**
```bash
npm test --workspace=super-js
```

**Type-checking the compiler types package:**
```bash
npm run typecheck --workspace=@superjs/compiler-types
```

To run all checks from the repository root:
```bash
npm run lint && npm test && npm run typecheck
```

---

## Reporting Issues

Please use [GitHub Issues](https://github.com/hbarve1/super-js/issues) to report bugs, request features, or ask questions. Before opening a new issue, search existing issues to avoid duplicates.

For security vulnerabilities, do **not** open a public issue. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
