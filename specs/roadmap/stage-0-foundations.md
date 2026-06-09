# Stage 0: Foundations

## Goal
Lay down the project substrate — repo layout, CI, shared types (with documented breaking-change policy), grammar spec v1, error-code registry, diagnostic JSON schema, configuration schema (with a reserved `language` version field), the first five RFCs, and a threat model — so that every subsequent stage can build, test, and ship without re-inventing the platform underneath or making decisions the community had no chance to weigh in on.

## Entry Criteria
- Project decision to pursue 1.0 (this plan committed).
- `prototype/` from Phase 1 exists and is buildable as a reference for parser/checker fixtures.
- Maintainer has GitHub Sponsors / OpenCollective accounts ready (or pending) for co-maintainer recruitment.

## Exit Criteria (Done When)
- [ ] Monorepo restructured: `packages/`, `stdlib/`, `tools/`, `spec/`, `docs/`, `rfcs/` exist with their READMEs.
- [ ] `packages/compiler-types/` published to npm at `@superjs/compiler-types@0.x` with stable AST node interfaces, `SourceSpan`, `Diagnostic`, `SuperJSType` discriminator union (these are the types Stages 1–5 all import). **`CHANGELOG.md` + semver bump policy** also published (C6).
- [ ] `spec/grammar.ebnf` exists and parses every fixture in `prototype/examples/**/*.sjs` via a smoke parser-generator (e.g. `ohm-js` or `peggy`).
- [ ] `spec/error-codes.md` defines all `SJS-EXXX` codes already emitted by the prototype, plus stubs for every code the Stage-1 plan anticipates.
- [ ] `spec/diagnostics.schema.json` (JSON Schema 2020-12) validates a corpus of hand-written and prototype-emitted diagnostics; schema is tagged semver-stable from this point.
- [ ] `superjs.config.json` schema lives at `spec/config-schema.json` with JSON Schema validation; **schema includes `"language": "1.0"` reserved placeholder (C4)** and supports `"extends": "tsconfig.json"` for `paths` inheritance (M9); the prototype's CLI reads its config through this schema; CI fails on schema drift.
- [ ] CI pipeline green on Ubuntu, macOS, and **Windows**: lint, unit test, type-check, golden-fixture run, determinism check (build twice, byte-diff), benchmark baseline. **Nightly job adds Node 24-dev (non-blocking) (C7).**
- [ ] CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md (with **crash-log redaction policy** — R4), LICENSE (MIT), `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` all in place.
- [ ] **RFC-0001..0005 authored and merged** in `rfcs/` (S1):
  - RFC-0001 — No `any`; introduce `dynamic`.
  - RFC-0002 — Ban intersection / conditional / mapped / template-literal types.
  - RFC-0003 — Sum types with explicit `_tag` runtime representation.
  - RFC-0004 — `Result<T, E>` as canonical error type.
  - RFC-0005 — Edition system deferred to post-1.0.
- [ ] **`spec/parser-recovery.md` first draft published (M2)**: defines sync sets per production and phrase-vs-panic distinction; Stage 1 Sprint 1.2 implements.
- [ ] **Threat model published at `docs/security/threat-model.md` (S7)**: enumerates compiler input-parsing DoS, LSP message handling, playground sandbox escape, supply-chain (`--provenance`) tampering, BiDi-spoofing in source, crash-log data leakage.
- [ ] PR-feedback time (lint + check + tests) ≤ 10 min P95 on the empty-prototype baseline.
- [ ] Public co-maintainer recruitment announcement posted (GitHub Discussions + project README) with explicit reference to **solo-path decision gates A and B** in README.

## Sprints

### Sprint 0.1 — Repo, shared types, compiler-types policy (2 weeks)

**Deliverables:**
- Monorepo restructure via `npm` or `pnpm` workspaces. Top-level `packages/`, `stdlib/`, `tools/`, `spec/`, `docs/`, `rfcs/`, `prototype/` (left in place, marked "legacy").
- `packages/compiler-types/` package: TypeScript declarations for `AstNode`, `SourceSpan`, `Diagnostic`, `Severity`, `SuperJSType`, `Symbol`, `ModuleId`. Published to npm `0.1.0-alpha.0`.
- `packages/compiler-types/CHANGELOG.md` + `packages/compiler-types/SEMVER.md` (C6): documents the bump policy — additive non-breaking → minor; breaking → major; every PR that touches `packages/compiler-types/src/` MUST add a changeset entry referencing the bump category. CI rejects PRs that change `src/` without a changeset.
- LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md (with disclosure SLA — 7 days triage, 30 days critical patch; **crash-log redaction policy R4**: crash logs ship file basenames + symbol basenames only; full paths/symbols are opt-in via `superjs build --crash-full`).
- `.github/ISSUE_TEMPLATE/`: bug, feature, crash (the crash template URL the compiler will deep-link to per §12.15).
- `.github/pull_request_template.md` with checklist (lint, tests, docs updated, changeset added, **`compiler-types` bump category declared if applicable**).
- Changesets installed and configured; release workflow stubbed.

**Key tasks:**
- [ ] Migrate `prototype/` to `prototype/` workspace package; preserve git history (`git mv`).
- [ ] Create `packages/compiler-types/src/` with: `ast.ts`, `span.ts`, `diagnostic.ts`, `types.ts`, `symbols.ts`, `index.ts`.
- [ ] Author `packages/compiler-types/CHANGELOG.md` (empty initial) and `packages/compiler-types/SEMVER.md` (policy + examples).
- [ ] Wire `prototype/` to import from `@superjs/compiler-types` instead of its own local types. Confirm prototype still builds.
- [ ] Add `package.json` `"workspaces"` field and root-level `tsconfig.json` with `"references"`.
- [ ] Author CONTRIBUTING.md (DCO sign-off policy, branch naming, commit style, changeset rules, `compiler-types` bump declaration rule).
- [ ] Author SECURITY.md (disclosure email, GPG key, SLA, coordinated disclosure timeline, **crash-log redaction default**).
- [ ] Author CODE_OF_CONDUCT.md (Contributor Covenant 2.1).
- [ ] Stand up GitHub Sponsors page and OpenCollective placeholder.
- [ ] Publish co-maintainer recruitment post in GitHub Discussions; cross-post to project README; link to **solo-path decision gates A and B** in the main README.

**Done signal:** `npm install && npm run -ws build && npm publish --workspace @superjs/compiler-types --dry-run` succeeds locally and in CI on three OSes; CHANGELOG.md present; CI rejects a synthetic PR that touches `compiler-types/src/` without a changeset.

### Sprint 0.2 — Spec, errors, CI matrix, RFCs, threat model (2 weeks)

**Deliverables:**
- `spec/grammar.ebnf` first complete draft — covers every construct in `prototype/examples/`. Smoke-tested via `peggy` (or equivalent) producing a throwaway parser that accepts the fixture corpus.
- `spec/error-codes.md` — table of every `SJS-EXXX` code with `code | severity | category | short message | owning stage`. Includes:
  - `SJS-P001..P099` (parser) — codes from §4.4 of the monolith.
  - `SJS-E001..E099` (type checker) — codes from the prototype plus stubs for §4.3, §12.1, §12.2, §12.4, §12.10, §12.12.
  - `SJS-W001..W099` (warnings) — `SJS-W005` (circular value cycle), `SJS-W003` (unreachable arm), `SJS-W008` (deprecation), `SJS-W010` (LSP memory pressure, M6), `SJS-W012` (BiDi codepoint in source, C9), plus stubs.
- `spec/diagnostics.schema.json` (JSON Schema 2020-12) matching §4.5's payload (`version: "1"`, `code`, `severity`, `message`, `span`, `labels[]`, `notes[]`, `helps[]`, `fix?`). Validated against a 50-diagnostic golden corpus.
- `spec/config-schema.json` for `superjs.config.json`:
  - `compilerOptions`, `paths`, `output.variants`, `output.eol`, `lsp.memoryBudgetMB`, `env.allowlist`.
  - **`"language": "1.0"` reserved string placeholder (C4)** — must be `"1.0"` or absent; reserved for post-1.0 multi-version coexistence; does nothing at v1.0 but prevents schema-break later.
  - **`"extends": "tsconfig.json" | "./other.config.json"` (M9)** — when present, `paths` from the extended file is merged with this file's `paths` (this-file wins on conflict). Sprint 1.4 implements the resolver behaviour.
  - **JSX runtime selection** (`jsx.runtime: "automatic" | "classic"`), source-map mode (`sourceMap: "none" | "inline" | "external"`) — both feed into the cache-key hash (M3).
  - Prototype CLI updated to read through it.
- `spec/parser-recovery.md` (M2) — sync sets per production (item, statement, expression, type, pattern); panic-mode escapes to nearest item/statement boundary; phrase-mode recovers inside expressions/types/patterns without dropping the enclosing item; `SJS-P099` after 3 failed phrase recoveries.
- `rfcs/0001-no-any-introduce-dynamic.md`, `rfcs/0002-ban-complex-types.md`, `rfcs/0003-sum-type-tag-representation.md`, `rfcs/0004-result-canonical-error.md`, `rfcs/0005-defer-editions.md` — first complete drafts, opened as PRs with 2-week public comment window, merged at the end of Sprint 0.2 (S1).
- `docs/security/threat-model.md` (S7): STRIDE-style enumeration; columns `surface | threat | mitigation owner stage | status`. First-pass surfaces: parser DoS via pathological nesting, lexer DoS via huge identifiers, LSP message authentication, playground sandbox isolation, `--provenance` correctness, BiDi-spoofing source, crash-log path leakage, dependency confusion on `@superjs/types-*` namespace.
- CI matrix (`.github/workflows/ci.yml`): Ubuntu / macOS / Windows × Node 20 LTS, 22 LTS. Steps: install, build, lint, unit tests, golden fixtures, determinism check (build twice, `diff -r`), benchmark baseline.
- Nightly workflow (`.github/workflows/nightly.yml`): full matrix + LSP memory smoke test scaffolding (real test arrives in Stage 3) + **Node 24-dev job (non-blocking, C7)**.
- Codeowner file (`.github/CODEOWNERS`) routing `spec/` and `rfcs/` reviews to the maintainer.

**Key tasks:**
- [ ] Draft `spec/grammar.ebnf` by extracting productions from the prototype parser; document ambiguity-resolution notes inline.
- [ ] Set up `peggy` (or `ohm-js`) generator job that runs the grammar against `prototype/examples/**/*.sjs`; CI fails on parse failure.
- [ ] Enumerate every `SJS-EXXX` code already emitted by the prototype (`grep -r "SJS-" prototype/src/`); document each in `spec/error-codes.md`. Add `SJS-W010`, `SJS-W012` stubs.
- [ ] Author `spec/diagnostics.schema.json`; back-validate prototype diagnostic emitter against it via a CI step.
- [ ] Author `spec/parser-recovery.md` (M2).
- [ ] Author `spec/config-schema.json` with `language` placeholder and `extends` clause.
- [ ] Open RFC-0001..0005 PRs at start of sprint; merge at end after public comment window.
- [ ] Author `docs/security/threat-model.md` (S7).
- [ ] Add CI step: `node -e "schema.validate(diagnostic)"` runs against a corpus in `spec/fixtures/diagnostics/`.
- [ ] Add CI step: `npm run build && cp -r dist /tmp/a && npm run build && diff -r dist /tmp/a` (determinism check).
- [ ] Add CI step: `tinybench` benchmark on prototype compile of a 1k-LOC fixture; baseline JSON committed to `bench/baseline.json`.
- [ ] Configure Dependabot for `package.json` and GitHub Actions workflows.
- [ ] Enable CodeQL on the repo.
- [ ] Verify Windows: long-path test (>260 chars) passes; line-ending normalisation works in `prototype/` lexer.
- [ ] Add nightly Node 24-dev job (continue-on-error: true).

**Done signal:** PR opens, all three OS CI jobs green, determinism check green, benchmark baseline recorded; `peggy` grammar smoke test produces an AST for every prototype example; RFCs 0001–0005 merged; `docs/security/threat-model.md` published; nightly job runs against Node 24-dev (results recorded, non-blocking).

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Grammar EBNF disagrees with prototype parser (ambiguity surfaces) | M | M | Treat prototype as ground truth; document ambiguity-resolution rules inline in `spec/grammar.ebnf` as `(* note: parser prefers X over Y here *)` comments; defer formal disambiguation to Stage 1 parser rewrite. |
| Diagnostic JSON schema design freezes too early and we later need a breaking change | M | M | Embed `version: "1"` in every payload; reserve `version: "2"` for future; document additive evolution policy in `spec/diagnostics.schema.md`. |
| Windows CI breaks on path normalisation in `prototype/` (latent bug surfaces) | M | L | Patch in `prototype/` as encountered; add Windows-specific golden fixtures with backslash paths. |
| Co-maintainer recruitment yields no candidates in Stage 0 | M | XL | Continue recruitment through Stages 1–2; **solo-path decision gates A and B in README** make the fallback explicit and dated. |
| Error-code registry omits codes the type checker port discovers in Stage 1 | M | L | `spec/error-codes.md` is append-only; Stage 1 may add codes but cannot rename. CI checks code-stability on PRs. |
| RFC public comment window yields fundamental objection mid-Sprint 0.2 (S1) | L | H | Open RFC PRs on day 1 of Sprint 0.2; if fundamental objection surfaces, defer merge to Stage 1 Sprint 1.1 and re-scope; spec-text in stage files marks "RFC-NNNN pending". |
| Threat model uncovers a surface that requires Stage 0 work (e.g. crash-log redaction needs design) | L | M | Crash-log redaction default lands in SECURITY.md Sprint 0.1; other surfaces are mitigation-owner-stage-tagged in the threat model so they cannot be silently dropped (R4 captures the crash-log angle). |

## API Contract

This stage produces four contracts that all later stages consume:

1. **`@superjs/compiler-types`** — package exports (semver-stable from `0.1.0`):
   ```ts
   export interface SourceSpan { file: string; startLine: number; startCol: number; endLine: number; endCol: number; byteStart: number; byteEnd: number; }
   export interface Diagnostic { version: "1"; code: string; severity: "error" | "warning" | "info"; message: string; span: SourceSpan; labels: DiagnosticLabel[]; notes: string[]; helps: string[]; fix?: DiagnosticFix; }
   export interface AstNode { kind: string; span: SourceSpan; /* discriminated by kind */ }
   export type SuperJSType = /* discriminated union of primitive, object, function, union, variant, generic, dynamic */;
   ```
   Plus `CHANGELOG.md` + `SEMVER.md` (C6). Consumed by Stages 1, 2, 3, 4, 5.

2. **`spec/diagnostics.schema.json`** — JSON Schema for `--format json` and `--format ndjson` output. Semver-stable from `1.0.0`. Consumed by Stage 3 (LSP, VS Code extension) and any third-party tool.

3. **`spec/config-schema.json`** — JSON Schema for `superjs.config.json` with reserved `"language": "1.0"` field (C4) and `"extends"` clause for `paths` inheritance (M9). Stage 1 CLI reads through it; Stages 3 (LSP `lsp.memoryBudgetMB`) and 5 (build plugins inherit config) consume it.

4. **`spec/parser-recovery.md`** (M2) — sync-set + phrase-vs-panic spec. Consumed by Stage 1 Sprint 1.2 (parser implementation) and the golden recovery-test suite.

Additionally, this stage produces **process artefacts** consumed by all later stages: `rfcs/0001..0005`, `docs/security/threat-model.md`, `CHANGELOG.md` template for `compiler-types`.

## Dependencies

- **Requires:** nothing (this is the foundation).
- **Unlocks:** Stage 1 (compiler core can begin once shared types, grammar, recovery spec, and RFCs exist), and in parallel allows Stage 3 LSP scaffolding, Stage 5 plugin scaffolding, and Stage 6 docs scaffolding to start work that doesn't need the compiler yet.
