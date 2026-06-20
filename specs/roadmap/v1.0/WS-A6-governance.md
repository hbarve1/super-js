# WS-A6: Governance + security files

**Branch:** `feature/v1.0-governance`  
**Effort:** small  
**Deps:** none — start immediately  
**PR base:** `main`

## Objective

Create all governance, security, and contribution files required for v1.0 GA.
These are file-level deliverables — no code changes required.

## Files to create

All paths relative to repo root (`super-js/`).

### 1. `STABILITY.md`

Defines stability tiers for all public APIs.

```markdown
# Stability Tiers

SuperJS uses three stability tiers:

## stable

APIs tagged `stable` follow semver strictly. Breaking changes require a major version bump
and a 6-month deprecation window with an alias at the old name.

Stable surface areas as of v1.0:
- `@superjs/compiler` public API (`compile`, `parse`, `check`)
- `@superjs/stdlib` exports
- CLI commands: `check`, `build`, `format`, `lint`, `doc`, `init`, `verify`, `migrate`
- Diagnostic codes (SJS-EXXX numbers are permanent)
- `superjs.config.json` schema

## beta

APIs tagged `beta` may change between minor versions with a deprecation notice.
Located at `@superjs/std-*/beta/` subpath exports.

## unstable

Internal APIs, nightly builds, and features behind `--unstable` flag.
No backwards-compatibility guarantees.
```

### 2. `docs/deprecation.md`

```markdown
# Deprecation Policy

When a stable API is deprecated:
1. The old API is kept for **6 months** (one minor release cycle minimum).
2. A deprecation notice (SJS-W diagnostic or README section) is emitted.
3. The old form is removed in the next major version after the 6-month window.

This applies to: CLI flags, compiler API exports, diagnostic code semantics.
It does NOT apply to unstable or beta-tier surface.
```

### 3. `rfcs/` directory + RFC-0001 through RFC-0005 stubs

Create `rfcs/` with:
- `README.md` — RFC process description
- `RFC-0001-dynamic-type.md` — stub (shipped in Stage 0 Sprint 0.2)
- `RFC-0002-sum-types.md` — stub
- `RFC-0003-runtime-encoding.md` — `{_tag, _0}` runtime shape (matches ADR-003)
- `RFC-0004-banned-constructs.md` — what TS constructs SJS bans
- `RFC-0005-null-safety-model.md` — nullable `T?` defaults

RFC template (`rfcs/README.md`):

```markdown
# RFC Process

SuperJS uses RFCs (Request for Comments) for language changes and major API decisions.

## When to write an RFC
- New language syntax
- Semantic changes to existing constructs
- Major CLI changes
- Stability tier changes

## Template

RFCs live in `rfcs/RFC-NNNN-slug.md`. Use this structure:

---
rfc: NNNN
title: Short title
status: draft | final | withdrawn
author: @handle
date: YYYY-MM-DD
---

# RFC-NNNN: Title

## Summary
## Motivation
## Design
## Drawbacks
## Alternatives
## Unresolved questions
```

### 4. `CONTRIBUTING.md`

```markdown
# Contributing to SuperJS

## Quick start
1. Fork + clone
2. `cd superjs && pnpm install`
3. `nx test compiler` — verify baseline
4. Create branch: `feature/your-feature` or `fix/your-fix`
5. PR to `main` with `gh pr create --base main`

## Code style
- TypeScript with strict mode
- NX for build/test/lint: `nx lint <project>`, `nx test <project>`
- Commits: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`

## Proposing language changes
Language changes require an RFC. See `rfcs/README.md`.

## Spec changes
Spec (`specs/`) changes require maintainer approval.
Post-1.0 spec changes require an RFC + "spec exception" approval.

## Security vulnerabilities
See `SECURITY.md`.
```

### 5. `SECURITY.md`

```markdown
# Security Policy

## Supported versions
| Version | Supported |
|---------|-----------|
| 1.x | ✓ |
| 0.x | security fixes only |

## Reporting a vulnerability

Email: hbarve1592@gmail.com (replace with security@ alias at GA)

**Response SLA:**
- Acknowledgement: within 48 hours
- Triage + severity assessment: within 7 days
- Fix + coordinated disclosure: within 30 days for critical, 90 days for others

**Do NOT** open a public GitHub issue for a security vulnerability.

## Scope

In scope: compiler input handling (parser DoS), LSP message injection,
playground sandbox escape, npm package supply chain.

Out of scope: bugs that require physical access or social engineering.
```

### 6. Dependabot config (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/superjs"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
    groups:
      dev-deps:
        patterns:
          - "typescript"
          - "vitest"
          - "nx"
          - "@nx/*"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

### 7. CodeQL workflow (`.github/workflows/codeql.yml`)

```yaml
name: CodeQL
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # weekly Monday 6am
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

## Implementation steps

1. Create each file above at the specified path.
2. Read `specs/design/ADR-003-sum-type-runtime-encoding.md` before writing RFC-0003.
3. Read `specs/design/ADR-004-banned-ts-constructs.md` before writing RFC-0004.
4. Run `gh api repos/hbarve1/super-js/contents/.github/dependabot.yml` to check if it exists already.
5. Commit all in one PR (they're all documentation/config, no code changes).

## Acceptance criteria

- [ ] `STABILITY.md` exists at repo root
- [ ] `docs/deprecation.md` exists
- [ ] `rfcs/README.md` + RFC-0001 through RFC-0005 stubs exist
- [ ] `CONTRIBUTING.md` exists at repo root
- [ ] `SECURITY.md` exists at repo root with response SLA
- [ ] `.github/dependabot.yml` exists and is valid YAML
- [ ] `.github/workflows/codeql.yml` exists and has correct structure
- [ ] All files are coherent with each other (CONTRIBUTING references SECURITY, etc.)

## Notes

- Check whether any of these files already exist before creating — don't overwrite
- SECURITY.md email address: use `hbarve1592@gmail.com` for now, with a comment "replace with security@ at GA"
- RFCs 0001–0005 were conceptually shipped in Stage 0; these stubs acknowledge their existence for the governance record
