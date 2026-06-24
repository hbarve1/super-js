# SuperJS v1.0 Workstream Index

Each `WS-*` file is a self-contained spec for one parallel workstream.
An agent can pick up any file in group A (no deps) immediately;
group B (docs content) after WS-A3 (docs infra) is merged;
WS-A1 (spec freeze) last.

## Agent orchestration

| Resource | Purpose |
|----------|---------|
| [`manifest.json`](./manifest.json) | Branch, worktree path, wave, status, PR URL per workstream |
| [`../../design/ADR-011-docs-single-source.md`](../design/ADR-011-docs-single-source.md) | Docs live in repo-root `docs/` + website — no separate docs app |
| [`agents/WS-A3.md`](./agents/WS-A3.md) | Amended brief for WS-A3 (overrides Starlight plan in WS-A3 spec) |
| [`../../../scripts/worktree-create.sh`](../../../scripts/worktree-create.sh) | Spawn isolated worktree for a workstream |
| [`.cursor/agents/v1.0-ws-*.md`](../../../.cursor/agents/) | One invokable Cursor agent per workstream |

```bash
# From repo root
./scripts/worktree-create.sh WS-A8
# → .worktrees/feature-v1.0-mvb-fastify on branch feature/v1.0-mvb-fastify
# Open that folder in Cursor, invoke @v1.0-ws-a8-mvb-fastify
```

Agents update `manifest.json` status and open a PR to `main` when acceptance criteria pass.

**All v1.0 workstreams merged as of 2026-06-24** (see `manifest.json`). Post-workstream
work follows [`v1.0-release-checklist.md`](../v1.0-release-checklist.md).

### Wave 1 recommended start order (low conflict → high)

1. **WS-A8** mvb-fastify (smallest)
2. **WS-A2** error-code pages
3. **WS-A6** governance
4. **WS-A7** Node 24 CI
5. **WS-A5** migrate from-prototype
6. **WS-A3** docs infra (ADR-011 — extend website + `docs/`)
7. **WS-B3** types wrappers — Tier A first, stacked PRs on same branch

## Execution order

```
Day 1 — fully parallel (no deps):
  WS-A2  error-code pages
  WS-A5  migrate from-prototype
  WS-A6  governance files
  WS-A7  Node 24 CI matrix
  WS-A8  mvb-fastify example
  WS-B2  DAP debugger          (big — start scoping)
  WS-B3  types wrappers        (big — start scoping)

After WS-A3 (docs infra) merges — fully parallel:
  WS-A4a language tour
  WS-A4b migration guide
  WS-A4c API reference
  WS-A4d Why SJS page          (also needs WS-A8 mvb-fastify)
  WS-A4e compat matrix
  WS-A4f perf benchmarks

After WS-B3 merges:
  WS-B1  playground            (Workers sandbox)

Last — after all A-items above:
  WS-A1  spec assembly + freeze
```

## Files

| File | Workstream | Effort | Branch |
|------|-----------|--------|--------|
| [WS-A1-spec-freeze.md](./WS-A1-spec-freeze.md) | Spec assembly + freeze | large | `feature/v1.0-spec-freeze` |
| [WS-A2-error-codes.md](./WS-A2-error-codes.md) | Missing error-code pages | medium | `feature/v1.0-error-codes` |
| [WS-A3-docs-infra.md](./WS-A3-docs-infra.md) | Docs infrastructure *(see ADR-011)* | large | `feature/v1.0-docs-infra` |
| [WS-A4a-tour.md](./WS-A4a-tour.md) | Language tour (20 lessons) | large | `feature/v1.0-tour` |
| [WS-A4b-migration-guide.md](./WS-A4b-migration-guide.md) | Migration guide TS→SJS | medium | `feature/v1.0-migration` |
| [WS-A4c-api-reference.md](./WS-A4c-api-reference.md) | API reference (docgen) | medium | `feature/v1.0-api-ref` |
| [WS-A4d-why-sjs.md](./WS-A4d-why-sjs.md) | "Why SJS" page | small | `feature/v1.0-why-sjs` |
| [WS-A4e-compat-matrix.md](./WS-A4e-compat-matrix.md) | Compat matrix HTML | small | `feature/v1.0-compat` |
| [WS-A4f-perf-benchmarks.md](./WS-A4f-perf-benchmarks.md) | Perf benchmarks page | medium | `feature/v1.0-perf` |
| [WS-A5-migrate-from-prototype.md](./WS-A5-migrate-from-prototype.md) | `superjs migrate from-prototype` | medium | `feature/v1.0-migrate-proto` |
| [WS-A6-governance.md](./WS-A6-governance.md) | Governance + security files | small | `feature/v1.0-governance` |
| [WS-A7-node24-ci.md](./WS-A7-node24-ci.md) | Node 24 blocking CI matrix | small | `feature/v1.0-node24` |
| [WS-A8-mvb-fastify.md](./WS-A8-mvb-fastify.md) | mvb-fastify example | small | `feature/v1.0-mvb-fastify` |
| [WS-B1-playground.md](./WS-B1-playground.md) | Playground (Workers sandbox) | xlarge | `feature/v1.0-playground` |
| [WS-B2-dap.md](./WS-B2-dap.md) | DAP debugger | xlarge | `feature/v1.0-dap` |
| [WS-B3-types-wrappers.md](./WS-B3-types-wrappers.md) | 30 @superjs/types-* wrappers | xlarge | `feature/v1.0-types-wrappers` |

## Human-only items (not in any workstream file)

These cannot be done by an agent:

- ⚠️ **Rotate leaked npm token** — BEFORE any publish
- ⚠️ **Tag `v0.1.1`** to republish ReDoS-fixed packages
- VS Code extension → Marketplace (needs co-publisher)
- Beta program: select 3 teams, onboard, weekly check-ins
- `dynamic` usage survey (C5) via beta teams
- Bug bash (1-week, maintainer + beta teams)
- Performance pass (hit targets: cold ≤2s, warm ≤100ms, LSP ≤250MB, P99 ≤200ms)
- External security review (S7)
- RC cycle: `1.0.0-rc.1` → `rc.2` → `rc.3`
- `superjs@1.0.0` publish with `--provenance`
- Launch artefacts (blog, HN, press kit, Discord)
- Trademark check (USPTO + EU)
- Domain (`superjs.dev`)
- On-call rotation

## Buffer rule (R9)

If at end of Sprint 6.1 ≥2 of {spec freeze, beta onboarding, security review} behind:
invoke +2-week buffer. Announce as README banner + `docs/blog/...-stage-6-buffer-invoked.md`.
No silent slip.
