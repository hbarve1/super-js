# External Security Review (S7)

> **Status:** Pending external reviewer engagement. This document tracks scope,
> findings, and remediation for the v1.0 RC gate. Internal review complete:
> CodeQL on `main`, `pnpm audit --audit-level=high` clean, threat model v1.0 pass
> ([`docs/security/threat-model.md`](./security/threat-model.md)).

**Target:** complete before `1.0.0-rc.1` tag.  
**Report owner:** maintainer  
**Reviewer:** _TBD_

## Scope

| Component | In scope | Notes |
|-----------|----------|-------|
| `@superjsorg/compiler` pipeline | Yes | Lexer, parser, checker, codegen |
| `superjs` CLI | Yes | build, check, migrate, doctor |
| LSP server | Yes | JSON-RPC, memory budget, no eval |
| Playground `/api/run` + CF Worker | Yes | Sandbox, rate limits (T4) |
| Website | Partial | Playground API surface only |
| Published npm packages | Yes | Supply chain, provenance |
| VS Code extension | Partial | Spawns `superjs lsp`; no arbitrary code exec |

Out of scope: user application runtime, npm registry infrastructure, LLVM backend (v2.0).

## Reviewer deliverables

1. Written report (PDF or markdown) attached or linked here.
2. Findings table below filled with severity per finding.
3. Sign-off line when critical/high are resolved or accepted with documented risk.

## Findings

| ID | Component | Severity | Title | Status | Remediation PR |
|----|-----------|----------|-------|--------|----------------|
| _—_ | — | — | _Awaiting review_ | — | — |

Severity: `critical` | `high` | `medium` | `low` | `informational`

**RC gate:** zero open `critical` or `high` at `1.0.0-rc.1`.

## Internal pre-review checklist

- [x] Threat model T1–T9 documented
- [x] CodeQL workflow on `main`
- [x] npm audit — no high/critical in CI
- [x] Playground threat surface T4 mitigations shipped
- [x] LSP memory budget + audit
- [ ] External reviewer engaged
- [ ] Report published
- [ ] Critical/high remediated

## Engagement notes

_Backup reviewers and engagement letter references go here._

_Last updated: 2026-06-24._
