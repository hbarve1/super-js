---
title: Maintenance & On-Call
sidebar_position: 2
description: Solo-path on-call model, SLAs, and triage for SuperJS v1.0.x patches.
section: ops
---

# Maintenance & On-Call

SuperJS v1.0 uses a **solo-path** maintenance model until a co-maintainer is
enrolled (see README solo-path gates). This document satisfies Stage 6 exit
criterion **R10** and references [`RELEASING.md`](../../RELEASING.md) (C8).

## Scope

| In scope | Out of scope |
|----------|----------------|
| `@superjsorg/cli`, `@superjsorg/compiler`, LSP, published `@superjs/*` packages | Application code compiled *by* SuperJS |
| Docs site, playground worker | npm registry infrastructure |
| Security advisories per `SECURITY.md` | Trademark / legal |

## On-call rotation (solo path)

Until a co-maintainer is named:

- **Primary:** repository maintainer (`@hbarve1`).
- **Backup triage:** GitHub Discussions volunteers tagged `help-wanted` for non-critical issues.
- **Escalation:** critical security → rotate credentials immediately; file GitHub Security Advisory.

When a co-maintainer joins, update this section with names and a weekly rotation schedule.

## SLAs (v1.0.x)

Aligned with [`RELEASING.md`](../../RELEASING.md):

| Severity | Triage | Patch target |
|----------|--------|--------------|
| **Critical** (RCE, data loss, publish compromise) | < 48 h | < 1 week |
| **High** (DoS compiler/LSP, sandbox escape) | < 3 business days | Next patch release |
| **Medium / low** | Best effort | Scheduled minor |

Security reports follow the 24 h triage / 7 day critical patch bar in `SECURITY.md`.

## Triage labels

| Label | Meaning |
|-------|---------|
| `severity=blocker` | Blocks RC or GA; fix before next tag |
| `severity=critical` | Security or data-loss; on-call SLA |
| `type=regression` | Worked in previous release |

RC cycle accepts **blocker fixes only** between `rc.N` tags (see `RELEASING.md`).

## Patch release checklist

1. Reproduce on `main` with minimal fixture.
2. Fix + test (`pnpm nx run-many -t test` in `superjs/`).
3. Changeset or changelog entry.
4. Verify bench targets: `node scripts/check-bench-results.mjs`.
5. Tag `vX.Y.Z` → `release-npm.yml` publishes with provenance.
6. GitHub Release + advisory if security-related.

## Monitoring (first week post-GA)

- npm download trend (`npm view superjs version`)
- GitHub Issues opened/day, `severity=*` count
- Playground smoke (if Worker deployed): `scripts/smoke-playground-run.mjs`

_Last updated: 2026-06-24._
