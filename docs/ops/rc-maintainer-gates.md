---
title: RC maintainer gates
sidebar_position: 4
description: Human-only steps between v1.0 code complete and 1.0.0-rc.1 — ordered checklist.
section: ops
---

# RC maintainer gates

All v1.0 **agent work is complete** (workstreams WS-A1…B3 + post-workstream PRs #194–#201).
These steps require maintainer credentials or external parties.

Run automated gates first:

```bash
node scripts/rc-preflight.mjs
# or: Actions → RC preflight → Run workflow
```

## Ordered checklist

| # | Gate | Action | Doc |
|---|------|--------|-----|
| 1 | Playground deploy | Add `CLOUDFLARE_API_TOKEN`; run **Playground Worker** workflow | [playground-deploy.md](./playground-deploy.md) |
| 2 | npm credentials | Rotate leaked token; verify `NPM_TOKEN` in CI | [RELEASING.md](../../RELEASING.md) |
| 3 | Patch publish | Tag `v0.1.1` if ReDoS fixes need npm republish | [release-npm.yml](../../.github/workflows/release-npm.yml) |
| 4 | Beta recruitment | Open **Beta interest** discussions; onboard 3 teams | [beta/index.md](../beta/index.md) |
| 5 | Security review | Engage external reviewer; fill findings | [security-review.md](../security-review.md) |
| 6 | Bug bash | One week; clear `severity=blocker` | [beta/bug-bash.md](../beta/bug-bash.md) |
| 7 | RC tag | `v1.0.0-rc.1` — **maintainer approval required** | [RELEASING.md](../../RELEASING.md) |

## After RC.1

- Wire `NEXT_PUBLIC_PLAYGROUND_RUN_URL` on the website host (if using CF Worker).
- Beta teams install `@superjsorg/cli@1.0.0-rc.1` (when published).
- Run `scripts/smoke-playground-run.mjs` against production worker URL.

## What agents cannot do

- Store Cloudflare or npm secrets
- Tag or publish without explicit maintainer approval
- Recruit beta teams or run external security reviews

_Last updated: 2026-06-24._
