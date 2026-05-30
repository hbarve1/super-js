# Stage 0: Foundations

## Goal
Lay down the project substrate — repo layout, CI, shared types, grammar spec v1, error-code registry, diagnostic JSON schema — so that every subsequent stage can build, test, and ship without re-inventing the platform underneath.

## Entry Criteria
- Project decision to pursue 1.0 (this plan committed).
- `prototype/` from Phase 1 exists and is buildable as a reference for parser/checker fixtures.
- Maintainer has GitHub Sponsors / OpenCollective accounts ready (or pending) for co-maintainer recruitment.

## Exit Criteria (Done When)
- [ ] Monorepo restructured: `packages/`, `stdlib/`, `tools/`, `spec/`, `docs/`, `rfcs/` exist with their READMEs.
- [ ] `packages/compiler-types/` published to npm at `@superjs/compiler-types@0.x` with stable AST node interfaces, `SourceSpan`, `Diagnostic`, `SuperJSType` discriminator union (these are the types Stages 1–5 all import).
- [ ] `spec/grammar.ebnf` exists and parses every fixture in `prototype/examples/**/*.sjs` via a smoke parser-generator (e.g. `ohm-js` or `peggy`).
- [ ] `spec/error-codes.md` defines all `SJS-EXXX` codes already emitted by the prototype, plus stubs for every code the Stage-1 plan anticipates.
- [ ] `spec/diagnostics.schema.json` (JSON Schema 2020-12) validates a corpus of hand-written and prototype-emitted diagnostics; schema is tagged semver-stable from this point.
- [ ] `superjs.config.json` schema lives at `spec/config-schema.json` with JSON Schema validation; the prototype's CLI reads its config through this schema; CI fails on schema drift.
- [ ] CI pipeline green on Ubuntu, macOS, and **Windows**: lint, unit test, type-check, golden-fixture run, determinism check (build twice, byte-diff), benchmark baseline recorded.
- [ ] CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, LICENSE (MIT), `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` all in place.
- [ ] PR-feedback time (lint + check + tests) ≤ 10 min P95 on the empty-prototype baseline.
- [ ] Public co-maintainer recruitment announcement posted (GitHub Discussions + project README).

## Sprints

### Sprint 0.1 — Repo & shared types (2 weeks)

**Deliverables:**
- Monorepo restructure via `npm` or `pnpm` workspaces. Top-level `packages/`, `stdlib/`, `tools/`, `spec/`, `docs/`, `rfcs/`, `prototype/` (left in place, marked "legacy").
- `packages/compiler-types/` package: TypeScript declarations for `AstNode`, `SourceSpan`, `Diagnostic`, `Severity`, `SuperJSType`, `Symbol`, `ModuleId`. Published to npm `0.1.0-alpha.0`.
- LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md (with disclosure SLA — 7 days triage, 30 days critical patch).
- `.github/ISSUE_TEMPLATE/`: bug, feature, crash (the crash template URL the compiler will deep-link to per §12.15).
- `.github/pull_request_template.md` with checklist (lint, tests, docs updated, changeset added).
- Changesets installed and configured; release workflow stubbed.

**Key tasks:**
- [ ] Migrate `prototype/` to `prototype/` workspace package; preserve git history (`git mv`).
- [ ] Create `packages/compiler-types/src/` with: `ast.ts`, `span.ts`, `diagnostic.ts`, `types.ts`, `symbols.ts`, `index.ts`.
- [ ] Wire `prototype/` to import from `@superjs/compiler-types` instead of its own local types. Confirm prototype still builds.
- [ ] Add `package.json` `"workspaces"` field and root-level `tsconfig.json` with `"references"`.
- [ ] Author CONTRIBUTING.md (DCO sign-off policy, branch naming, commit style, changeset rules).
- [ ] Author SECURITY.md (disclosure email, GPG key, SLA, coordinated disclosure timeline).
- [ ] Author CODE_OF_CONDUCT.md (Contributor Covenant 2.1).
- [ ] Stand up GitHub Sponsors page and OpenCollective placeholder.
- [ ] Publish co-maintainer recruitment post in GitHub Discussions; cross-post to project README.

**Done signal:** `npm install && npm run -ws build && npm publish --workspace @superjs/compiler-types --dry-run` succeeds locally and in CI on three OSes.

### Sprint 0.2 — Spec, errors, CI matrix (2 weeks)

**Deliverables:**
- `spec/grammar.ebnf` first complete draft — covers every construct in `prototype/examples/`. Smoke-tested via `peggy` (or equivalent) producing a throwaway parser that accepts the fixture corpus.
- `spec/error-codes.md` — table of every `SJS-EXXX` code with `code | severity | category | short message | owning stage`. Includes:
  - `SJS-P001..P099` (parser) — codes from §4.4 of the monolith.
  - `SJS-E001..E099` (type checker) — codes from the prototype plus stubs for §4.3, §12.1, §12.2, §12.4, §12.10, §12.12.
  - `SJS-W001..W099` (warnings) — `SJS-W005` (circular value cycle), `SJS-W003` (unreachable arm), `SJS-W008` (deprecation), plus stubs.
- `spec/diagnostics.schema.json` (JSON Schema 2020-12) matching §4.5's payload (`version: "1"`, `code`, `severity`, `message`, `span`, `labels[]`, `notes[]`, `helps[]`, `fix?`). Validated against a 50-diagnostic golden corpus.
- `spec/config-schema.json` for `superjs.config.json`: `compilerOptions`, `paths`, `output.variants`, `output.eol`, `lsp.memoryBudgetMB`, `env.allowlist`. Prototype CLI updated to read through it.
- CI matrix (`.github/workflows/ci.yml`): Ubuntu / macOS / Windows × Node 20 LTS, 22 LTS. Steps: install, build, lint, unit tests, golden fixtures, determinism check (build twice, `diff -r`), benchmark baseline.
- Nightly workflow (`.github/workflows/nightly.yml`): full matrix + LSP memory smoke test scaffolding (real test arrives in Stage 3).
- Codeowner file (`.github/CODEOWNERS`) routing `spec/` reviews to the maintainer.

**Key tasks:**
- [ ] Draft `spec/grammar.ebnf` by extracting productions from the prototype parser; document ambiguity-resolution notes inline.
- [ ] Set up `peggy` (or `ohm-js`) generator job that runs the grammar against `prototype/examples/**/*.sjs`; CI fails on parse failure.
- [ ] Enumerate every `SJS-EXXX` code already emitted by the prototype (`grep -r "SJS-" prototype/src/`); document each in `spec/error-codes.md`.
- [ ] Author `spec/diagnostics.schema.json`; back-validate prototype diagnostic emitter against it via a CI step.
- [ ] Add CI step: `node -e "schema.validate(diagnostic)"` runs against a corpus in `spec/fixtures/diagnostics/`.
- [ ] Add CI step: `npm run build && cp -r dist /tmp/a && npm run build && diff -r dist /tmp/a` (determinism check).
- [ ] Add CI step: `tinybench` benchmark on prototype compile of a 1k-LOC fixture; baseline JSON committed to `bench/baseline.json`.
- [ ] Configure Dependabot for `package.json` and GitHub Actions workflows.
- [ ] Enable CodeQL on the repo.
- [ ] Verify Windows: long-path test (>260 chars) passes; line-ending normalisation works in `prototype/` lexer.

**Done signal:** PR opens, all three OS CI jobs green, determinism check green, benchmark baseline recorded; `peggy` grammar smoke test produces an AST for every prototype example.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Grammar EBNF disagrees with prototype parser (ambiguity surfaces) | M | M | Treat prototype as ground truth; document ambiguity-resolution rules inline in `spec/grammar.ebnf` as `(* note: parser prefers X over Y here *)` comments; defer formal disambiguation to Stage 1 parser rewrite. |
| Diagnostic JSON schema design freezes too early and we later need a breaking change | M | M | Embed `version: "1"` in every payload; reserve `version: "2"` for future; document additive evolution policy in `spec/diagnostics.schema.md`. |
| Windows CI breaks on path normalisation in `prototype/` (latent bug surfaces) | M | L | Patch in `prototype/` as encountered; add Windows-specific golden fixtures with backslash paths. |
| Co-maintainer recruitment yields no candidates in Stage 0 | M | XL | Continue recruitment through Stages 1–2; budget the calendar against "solo serial" fallback (56 weeks). |
| Error-code registry omits codes the type checker port discovers in Stage 1 | M | L | `spec/error-codes.md` is append-only; Stage 1 may add codes but cannot rename. CI checks code-stability on PRs. |

## API Contract

This stage produces three contracts that all later stages consume:

1. **`@superjs/compiler-types`** — package exports (semver-stable from `0.1.0`):
   ```ts
   export interface SourceSpan { file: string; startLine: number; startCol: number; endLine: number; endCol: number; byteStart: number; byteEnd: number; }
   export interface Diagnostic { version: "1"; code: string; severity: "error" | "warning" | "info"; message: string; span: SourceSpan; labels: DiagnosticLabel[]; notes: string[]; helps: string[]; fix?: DiagnosticFix; }
   export interface AstNode { kind: string; span: SourceSpan; /* discriminated by kind */ }
   export type SuperJSType = /* discriminated union of primitive, object, function, union, variant, generic, dynamic */;
   ```
   Consumed by Stages 1, 2, 3, 4, 5.

2. **`spec/diagnostics.schema.json`** — JSON Schema for `--format json` and `--format ndjson` output. Semver-stable from `1.0.0`. Consumed by Stage 3 (LSP, VS Code extension) and any third-party tool.

3. **`spec/config-schema.json`** — JSON Schema for `superjs.config.json`. Stage 1 CLI reads through it; Stages 3 (LSP `lsp.memoryBudgetMB`) and 5 (build plugins inherit config) consume it.

## Dependencies

- **Requires:** nothing (this is the foundation).
- **Unlocks:** Stage 1 (compiler core can begin once shared types and grammar exist), and in parallel allows Stage 3 LSP scaffolding, Stage 5 plugin scaffolding, and Stage 6 docs scaffolding to start work that doesn't need the compiler yet.
