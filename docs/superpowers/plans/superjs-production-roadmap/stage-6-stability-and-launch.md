# Stage 6: Stability & Launch

## Goal
Freeze the language spec, ship complete documentation, run a beta program with three friendly teams, complete a bug bash + perf pass + security review, run the RC cycle, and publish `superjs@1.0.0` to npm with a public launch.

This is the only stage that produces no new product capability — it ships *confidence* that the previous five stages' product is ready.

## Entry Criteria
- Stage 2 done. All 30 wrappers published; translator hits 70 % typed-surface gate; compat matrix MVP live.
- Stage 3 done. LSP M1 + VS Code extension on Marketplace; formatter idempotent; linter 15 rules; playground live; DAP working.
- Stage 4 done. All `@superjs/std-*` packages on npm; bootstrap correctness test passing.
- Stage 5 done. CLI on npm; Vite/esbuild plugins; Jest/Vitest transforms; determinism gate active.
- Beta candidate pipeline: at least 5 friendly teams identified (so 3 can be selected with 2 in reserve per Risk #15 of monolith).

## Exit Criteria (Done When)
- [ ] `spec/language.md` (~150 pages) **frozen** at least 8 weeks before 1.0 tag. No additions to v1.0 syntax/semantics after freeze; only typo/clarification fixes.
- [ ] `spec/grammar.ebnf` parses every fixture in `tests/fixtures/parser/`; CI enforces.
- [ ] Every `SJS-EXXX` code emitted by the compiler has a corresponding `spec/error-codes/SJS-EXXX.md` page. CI gate: for every code emitted, file exists.
- [ ] **Language tour** live at `docs/tour/`: **20 lessons** (≤ 5 min each); every lesson runnable in the playground (verified by automated link check).
- [ ] **Migration guide** from TypeScript live at `docs/migration/`: covers banned features with explicit rewrites; per-package notes for all 30 top wrappers.
- [ ] **API reference** auto-generated from stdlib doc comments and `@superjs/types-*` wrappers; live at `docs/api/`.
- [ ] **"Why SJS"** page live at `docs/why/`: covers Why not TypeScript, Why not ReScript / Flow / Hegel / Civet / Imba / Elm / PureScript; honest list of what SJS loses; concrete wins; ReScript comparison table.
- [ ] **Compatibility matrix** live at `docs/compat/` as sortable HTML table.
- [ ] **Performance benchmarks** published at `docs/perf/`: cold compile vs `tsc`, vs `esbuild`; warm rebuild numbers; LSP latency P99.
- [ ] **5 backfilled RFCs** merged in `rfcs/`:
  - RFC-0001: No `any`; introduce `dynamic`.
  - RFC-0002: Ban intersection / conditional / mapped / template-literal types.
  - RFC-0003: Sum types with explicit `_tag` runtime representation.
  - RFC-0004: `Result<T, E>` as canonical error type.
  - RFC-0005: Edition system deferred to post-1.0.
- [ ] **Governance** live: GitHub Discussions enabled with RFC template; `STABILITY.md` documents stability tiers; deprecation policy in `docs/deprecation.md`.
- [ ] **Security**: Dependabot enabled; CodeQL enabled; SECURITY.md disclosure email tested (response within 7-day SLA); responsible disclosure policy linked.
- [ ] **Beta program**: 3 friendly teams running `superjs@1.0.0-rc.X` in production-like environments; each team ≥ 1k LOC SJS code; weekly check-ins documented in `docs/beta/`.
- [ ] **Bug bash** completed: 1-week structured session with all maintainers + beta teams; results catalogued; all `severity=blocker` issues fixed.
- [ ] **Performance pass** hits all targets: cold compile 10k LOC ≤ 2 s; warm ≤ 100 ms; LSP idle ≤ 250 MB; LSP P99 ≤ 200 ms. Numbers published.
- [ ] **Security review** completed: CodeQL clean; npm audit clean (no high/critical); third-party security review by an external reviewer (paid engagement) for compiler + LSP attack surface — documented in `docs/security-review.md`.
- [ ] **RC cycle**: `1.0.0-rc.1` → `rc.2` → `rc.3` with at least 2 weeks between each; all blocker issues fixed before GA.
- [ ] **`superjs@1.0.0`** tagged and published to npm with `--provenance`; GitHub Release with full changelog.
- [ ] **Launch artefacts**: launch blog post; HN / lobste.rs / r/typescript post drafts; press kit (logo, screenshots, sample code, TS comparison); Discord or GitHub Discussions live with ≥ 50 members.
- [ ] **Trademark check** completed: "SuperJS" name searched in USPTO + EU; no conflicts; explicit non-claim in LICENSE/README ("not registered, respectful forks welcome").
- [ ] **Domain ownership** verified for `superjs.dev` (or alternative).
- [ ] **On-call rotation** for v1.0.x patches documented (maintainer + co-maintainers); SLA for critical bugs published.

## Sprints

### Sprint 6.1 — Spec freeze + docs (2 weeks)

**Deliverables:**
- `spec/language.md` first complete draft (~150 pages): syntax, semantics, type system, module system, banned features, error codes. Every section cross-references its `spec/grammar.ebnf` production and `spec/error-codes.md` codes.
- Spec freeze: PR merged with `spec: freeze for 1.0` commit message; further changes require explicit "spec exception" approval from all maintainers.
- 20-lesson language tour in `docs/tour/`. Sequence per §9.1 of monolith:
  1. Hello world; 2. Variables & types; 3. Functions; 4. Control flow; 5. Null safety; 6. Pattern matching; 7. Sum types (Result, Option); 8. Records/interfaces; 9. Generics; 10. Classes; 11. Modules; 12. Async/await; 13. JSX; 14. Calling JS from SJS; 15. `dynamic` + Schema; 16. Errors + Result; 17. Iterators + for...of; 18. Decorators; 19. Tooling tour; 20. Migrating a TS file.
- Each lesson links to playground; automated check that every link compiles in the playground.
- Migration guide from TS in `docs/migration/`: 3 parts per §9.3 of monolith (syntax, idiom, library).
- "Why SJS" page in `docs/why/` with the ReScript comparison table from §13 of monolith.
- API reference auto-generator (`superjs docgen`) runs over stdlib + wrappers; output at `docs/api/`.
- Compat matrix HTML page at `docs/compat/` consuming each wrapper's `STATUS.md` (Tier-2 from Stage 2; if not done, this stage owns delivery).
- Performance benchmarks at `docs/perf/`: numbers vs `tsc`, vs `esbuild`, vs prototype Phase-1 baseline.
- Error-code reference pages: one per `SJS-EXXX` per §9.2 of monolith. CI gate: for every emitted code, file exists.

**Key tasks:**
- [ ] Draft `spec/language.md` by harvesting from existing topic docs + monolith plan + grammar EBNF.
- [ ] Cross-reference every section to grammar production and error codes.
- [ ] Merge spec-freeze PR.
- [ ] Author 20 tour lessons; each ≤ 5 min reading; each runs in playground.
- [ ] Author migration guide.
- [ ] Author "Why SJS" page (including honest "what SJS loses").
- [ ] Auto-API generator from stdlib + wrappers.
- [ ] Compat matrix HTML.
- [ ] Benchmark publishing (numbers + chart).
- [ ] One Markdown page per `SJS-EXXX` code (~80 codes anticipated).
- [ ] CI gate for code-page existence.

**Done signal:** Spec PR merged with freeze tag; tour live and every lesson loads in playground; `docs/why/`, `docs/migration/`, `docs/api/`, `docs/compat/`, `docs/perf/` all live.

### Sprint 6.2 — Beta + bug bash + perf + security (2 weeks)

**Deliverables:**
- Beta program kicked off: 3 selected teams onboarded; each receives:
  - Direct Discord / email channel to maintainer.
  - Weekly 30-min check-in.
  - Issue-priority lane in the bug tracker (`label:beta`).
- Beta contract documented in `docs/beta/`: each team commits to ≥ 1k LOC SJS, biweekly bug reports, public testimonial (if comfortable) at launch.
- Bug bash week: structured 5-day session; maintainer + co-maintainers + beta teams; all `severity=blocker` issues identified are fixed before RC.
- Performance pass: profile cold compile, warm rebuild, LSP startup, LSP hover, LSP completion. Cut allocations in hot paths. Re-record numbers; if any target missed, **slip 1.0 by one sprint** (per Risk register).
- Memory audit: heap snapshot the LSP with 100k-LOC project loaded; identify retained allocations; fix or document.
- Security review by external reviewer:
  - Scope: compiler input parsing (DoS-resistant against pathological input?), LSP message handling (privilege escalation?), playground sandbox isolation, `--provenance` correctness.
  - Reviewer engaged ≥ 6 weeks before sprint to deliver report by Sprint 6.2.
  - Findings tracked as issues; `severity=critical` and `severity=high` fixed before RC.
- CodeQL clean + npm audit clean (no high/critical).
- Trademark search; domain ownership verification.
- Public roadmap update: "we're entering RC, here's what we've cut, here's the path to GA."

**Key tasks:**
- [ ] Select 3 of 5 candidate beta teams; sign contracts.
- [ ] Onboard each team (env setup, install, first migration).
- [ ] Bug bash week — calendar + agenda + scribe.
- [ ] Performance profiling + optimisation passes.
- [ ] LSP memory audit.
- [ ] External security review engagement + report.
- [ ] CodeQL / npm-audit gate.
- [ ] Trademark + domain checks.
- [ ] Public roadmap update post.

**Done signal:** All 3 beta teams have a runnable v1.0-rc.0 codebase; bug-bash blockers all fixed; perf numbers re-recorded; security review delivered with no unfixed criticals.

### Sprint 6.3 — RC cycle + 1.0 GA + launch (2 weeks)

**Deliverables:**
- `superjs@1.0.0-rc.1` tagged; full QA on three OSes; nightly fuzz running clean for ≥ 4 weeks.
- 1-week feedback window; collect issues; fix `severity=blocker` only.
- `superjs@1.0.0-rc.2` tagged; another 4-day window.
- `superjs@1.0.0-rc.3` (if needed) for any final blockers.
- `superjs@1.0.0` GA tag; published to npm with `--provenance`; GitHub Release with full changelog; Sigstore attestation on release assets.
- Launch artefacts:
  - Launch blog post on `docs/blog/`.
  - HN "Show HN: SuperJS 1.0" post.
  - r/typescript announcement.
  - lobste.rs submission.
  - Twitter/X announcement.
  - Press kit at `docs/press/`: logo (SVG + PNG), screenshots, sample code, comparison-to-TS one-pager.
  - Discord server or GitHub Discussions kicked into "launch mode" with ≥ 50 members at GA.
- On-call rotation for v1.0.x patches published (maintainer + co-maintainers); SLA: triage critical < 48 h, patch critical < 1 week.
- Post-launch monitoring: bug-report volume tracking; first-week metrics dashboard (npm downloads, GitHub stars, issue rate).

**Key tasks:**
- [ ] Tag and publish RC.1; smoke test on 3 OSes.
- [ ] Feedback window; triage; fix blockers.
- [ ] Tag and publish RC.2 (and RC.3 if needed).
- [ ] Tag and publish 1.0.0.
- [ ] Author launch blog post.
- [ ] Author HN / lobste.rs / r/typescript posts.
- [ ] Press kit.
- [ ] Discord / GitHub Discussions launch.
- [ ] On-call rotation.
- [ ] First-week monitoring dashboard.

**Done signal:** `npm view superjs version` returns `1.0.0`; GitHub Release page live; launch post live; HN post submitted; Discord ≥ 50 members; no `severity=critical` open issues at GA.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Beta teams disappear / don't ship code | M | M | 3 selected from 5 candidates; SLA on responsiveness; backup pipeline; slip 1 sprint if needed. |
| Spec authoring takes longer than 2 weeks | H | M | Sprint 6.1 budget assumes harvest-from-existing-docs; if from-scratch needed, slip 1 sprint. |
| Bug bash uncovers > 5 blockers | M | H | Sprint 6.2 has bug-fix days budgeted; if > 5 blockers persist, slip RC by 1 sprint. |
| Performance pass doesn't hit targets | M | H | Documented slip protocol — don't ship slow compiler at 1.0. |
| External security reviewer unavailable on timeline | M | M | Engage reviewer 6 weeks ahead; have backup reviewer (e.g. Trail of Bits or independent consultant); if delayed, ship RC with internal-only review note, flag for v1.0.1. |
| Critical RC bugs delay GA | M | H | RC cycle has 2 buffer weeks built in; if more needed, slip — do not ship known-critical. |
| Launch announcement gets negligible attention | M | M | Launch from a position of substance, not hype; HN post written with specific use case + benchmark; "Why SJS" page is the link. Backup: targeted outreach to TS community influencers in week before launch. |
| Trademark conflict surfaces last-minute | L | M | Search done at Sprint 6.2; if conflict, rename plan: "Sjs", "SuperScript", "Super" — 1 week busywork. |
| Post-launch issue volume overwhelms maintainer | H | XL | On-call rotation in place; auto-triage labels; first-week monitoring dashboard with alerting; co-maintainers in lane for triage. |
| Co-maintainer recruitment never materialised | M | XL | Documented post-GA scope cuts; v1.0.1 may delay; explicit "maintenance mode" criteria in `docs/maintenance.md`. |
| Compat matrix regressions during RC cycle (an updated upstream breaks a wrapper) | M | M | Pin wrapper compat to known-good upstream versions; documented update SLA. |
| Spec freeze violated by a beta-team-discovered "must-fix" semantic issue | L | H | Spec-exception process documented; bar is "soundness or DoS bug only"; if used, document publicly. |

## API Contract

This stage produces:

1. **`spec/language.md`** — the canonical language reference. Semver-stable from 1.0; changes require RFC.
2. **`spec/grammar.ebnf`** — semver-stable; parser-tested.
3. **`spec/error-codes.md` + `spec/error-codes/SJS-EXXX.md`** — each code is permanent; deprecated aliases follow the 6-month rule per §4.5 of monolith.
4. **`docs/api/` auto-generated reference** — stable surface area marks; beta/unstable surface explicitly tagged.
5. **`docs/compat/` matrix** — semver-stable URL; consumed by users and tooling.
6. **`superjs@1.0.0` npm package** — the GA artefact. Subsequent v1.x patches follow semver.
7. **Public RFC process** — `rfcs/` directory + GitHub Discussions; documented in `CONTRIBUTING.md`.
8. **Stability tiers** — `stable` / `beta` (`@superjs/std-*/beta/` path) / `unstable` (nightly-only). Documented in `STABILITY.md`.

## Dependencies

- **Requires Stages 1, 2, 3, 4, 5** — every prior deliverable is in scope for the bug bash + perf pass + security review.
- **Unlocks** — post-1.0 work (Tier-3 from README): self-hosting, LLVM, WASM, editions, native test runner, more lint rules, JetBrains plugin, etc.
