# Stage 6: Stability & Launch

## Goal
**Polish and freeze** the language spec (which has been authored continuously through Stages 1–5 per B8), ship complete documentation, run a beta program with three friendly teams (including a structured `dynamic`-usage survey per C5), complete a bug bash + perf pass + security review, run the RC cycle, and publish `superjs@1.0.0` to npm with a public launch. Complete the `superjs migrate from-prototype` CLI started in Stage 1 (C2). Build the docs-site infrastructure to host 80+ error-code pages plus tour + migration + API (C3). Add Node 24 to the blocking matrix (C7).

This is the only stage that produces no new product capability — it ships *confidence* that the previous five stages' product is ready.

Round-3 changes: spec **polished and frozen** (B8 — the spec text was authored per-feature in Stages 1–5); RFCs are NOT backfilled here (S1 — they shipped in Stage 0 Sprint 0.2); docs-site infra budgeted, not just content (C3); tour lesson 18 = "Serverless handler patterns" not Decorators (T2); beta program structured survey on `dynamic` usage (C5); Node 24 promoted to blocking matrix (C7); `superjs migrate from-prototype` completed (C2); +2-week buffer documented (R9); co-maintainer / solo-path resilience (R10).

## Entry Criteria
- Stage 2 done. All 30 wrappers published (backend-first wave-1 per T1); translator hits 70 % typed-surface gate using the locked formula (B7); compat matrix MVP live.
- Stage 3 done. LSP M1 + VS Code extension on Marketplace (with co-publisher per R5); formatter idempotent with `.sjsignore` story (C1); **17-rule linter (T7)**; playground live (with Workers demo mode per T5); DAP working; migration tool validated against real beta-team codebase (S5).
- Stage 4 done. All `@superjs/std-*` packages on npm; bootstrap correctness test passing using downstream comparison (B3); stdlib determinism gate green.
- Stage 5 done. CLI on npm (with `superjs lsp` if Stage 3 was on time per B2); Vite/esbuild plugins; Jest/Vitest transforms (using `transform()` per B1); determinism gate active; `superjs verify` shipped (C10); four `superjs init` templates working (T6); minimum viable backend fixture green (T3); `RELEASING.md` published (C8).
- Beta candidate pipeline: at least 5 friendly teams identified (so 3 can be selected with 2 in reserve per Risk #15 of monolith).

## Exit Criteria (Done When)
- [ ] `spec/language.md` (~150 pages, assembled from the per-feature spec sections authored in Stages 1–5 per B8) **frozen** at least 8 weeks before 1.0 tag. No additions to v1.0 syntax/semantics after freeze; only typo/clarification fixes.
- [ ] `spec/grammar.ebnf` parses every fixture in `tests/fixtures/parser/`; CI enforces.
- [ ] Every `SJS-EXXX` code emitted by the compiler has a corresponding `spec/error-codes/SJS-EXXX.md` page. CI gate: for every code emitted, file exists.
- [ ] **Language tour** live at `docs/tour/`: **20 lessons** (≤ 5 min each); every lesson runnable in the playground (verified by automated link check). **Tour lesson 18 is "Serverless handler patterns" (T2)** — decorators are NOT in the spec and NOT in the tour.
- [ ] **Migration guide** from TypeScript live at `docs/migration/`: covers banned features with explicit rewrites; per-package notes for all 30 top wrappers.
- [ ] **API reference** auto-generated from stdlib doc comments and `@superjs/types-*` wrappers; live at `docs/api/`.
- [ ] **"Why SJS"** page live at `docs/why/`: covers Why not TypeScript, Why not ReScript / Flow / Hegel / Civet / Imba / Elm / PureScript; honest list of what SJS loses; concrete wins; ReScript comparison table.
- [ ] **Compatibility matrix** live at `docs/compat/` as sortable HTML table.
- [ ] **Performance benchmarks** published at `docs/perf/`: cold compile vs `tsc`, vs `esbuild`; warm rebuild numbers; LSP latency P99. Per-phase numbers (S6) included.
- [ ] **Docs-site infrastructure (C3)** delivered, not just content: Docusaurus or Astro Starlight site with full-text search (Algolia / local), sidebar nav for 80+ error-code pages + tour + migration + API + spec, sitemap, RSS, dark mode, mobile-responsive, lighthouse score ≥ 90. CI builds the site on every commit; broken-link checker runs.
- [ ] **RFC-0001..0005 — NOT backfilled here (S1):** they were shipped in Stage 0 Sprint 0.2 with a public comment window. Stage 6 only adds new RFCs for any post-1.0 work surfaced during the beta (e.g. RFC-0006 for top-level await deferred to v1.1).
- [ ] **Governance** live: GitHub Discussions enabled with RFC template; `STABILITY.md` documents stability tiers; deprecation policy in `docs/deprecation.md`.
- [ ] **Security**: Dependabot enabled; CodeQL enabled; SECURITY.md disclosure email tested (response within 7-day SLA); responsible disclosure policy linked; **threat model (Stage 0) reviewed and updated** with surfaces discovered during the build.
- [ ] **Beta program**: 3 friendly teams running `superjs@1.0.0-rc.X` in production-like environments; each team ≥ 1k LOC SJS code; weekly check-ins documented in `docs/beta/`. **Structured `dynamic` usage survey (C5)** completed by each team: counts `dynamic` occurrences per kLOC, classified by reason (per `spec/dts-dynamic-reasons.md` M8 closed set); aggregated results posted in `docs/beta/dynamic-usage-survey.md`. If aggregate > 20 % across the three teams, file `docs/known-issues/dynamic-rate-v1.md` and prioritise post-1.0 work.
- [ ] **Bug bash** completed: 1-week structured session with all maintainers + beta teams; results catalogued; all `severity=blocker` issues fixed.
- [ ] **Performance pass** hits all targets: cold compile 10k LOC ≤ 2 s; warm ≤ 100 ms; LSP idle ≤ 250 MB; LSP P99 ≤ 200 ms. Numbers published. Per-phase regression bounds (Stage 1 Sprint 1.1 S6) all green.
- [ ] **Security review** completed by **external reviewer booked at Stage 3 start (S7)**: CodeQL clean; npm audit clean (no high/critical); third-party security review report at `docs/security-review.md`; all `critical` and `high` findings fixed before RC.
- [ ] **RC cycle**: `1.0.0-rc.1` → `rc.2` → `rc.3` with at least 2 weeks between each; all blocker issues fixed before GA.
- [ ] **`superjs@1.0.0`** tagged and published to npm with `--provenance` (using either of the two accounts per R1); GitHub Release with full changelog.
- [ ] **Launch artefacts**: launch blog post; HN / lobste.rs / r/typescript post drafts; press kit (logo, screenshots, sample code, TS comparison); Discord or GitHub Discussions live with ≥ 50 members. **Launch demo uses `examples/mvb-fastify/` (Stage 5 T3) as the "5-minute backend" reference.**
- [ ] **Trademark check** completed: "SuperJS" name searched in USPTO + EU; no conflicts; explicit non-claim in LICENSE/README ("not registered, respectful forks welcome").
- [ ] **Domain ownership** verified for `superjs.dev` (or alternative).
- [ ] **On-call rotation** for v1.0.x patches documented (maintainer + co-maintainers OR solo-path documented per R10); SLA for critical bugs published per Stage 5 `RELEASING.md` (C8).
- [ ] **`superjs migrate from-prototype` (C2)** completed (stub shipped in Stage 1 Sprint 1.5): rewrites a `prototype/`-layout codebase to `packages/compiler`-layout; updates import paths; flags `.sjs` files that depend on prototype-only features. Tested against the actual `prototype/` directory in this repo.
- [ ] **Node 24 promoted to blocking matrix (C7)**: nightly job has been running since Stage 0 Sprint 0.2 as non-blocking; this stage promotes it to the blocking matrix (alongside Node 20 LTS and 22 LTS) for `superjs@1.0.0` release. Any Node 24 failure surfaced during beta blocks GA; fixes ship in RC cycle.

## Sprints

### Sprint 6.1 — Spec polish + freeze + docs site infra + content + migrate-from-prototype (2 weeks)

**Deliverables:**
- `spec/language.md` (~150 pages) **assembled and polished** from the per-feature `spec/language.md/*.md` sections authored in Stages 1–5 (B8). The work here is consolidation, cross-referencing, prose-polish, and consistency — NOT first-time authoring. Sections expected from prior stages:
  - `lexical.md` (Stage 1 Sprint 1.1)
  - `syntax.md` (Stage 1 Sprint 1.2)
  - `type-system.md` (Stage 1 Sprint 1.3)
  - `codegen-semantics.md` (Stage 1 Sprint 1.4)
  - `cli-surface.md` (Stage 1 Sprint 1.5)
  - `incremental-model.md` (Stage 1 Sprint 1.6)
  - `interop.md` (Stage 2 Sprint 2.1)
  - `tooling-surface.md` (Stage 3 Sprint 3.3)
  - `stdlib-surface.md` (Stage 4 Sprint 4.2)
  - `build-tool-integration.md` (Stage 5 Sprint 5.1)
- Spec freeze: PR merged with `spec: freeze for 1.0` commit message; further changes require explicit "spec exception" approval from all maintainers.
- 20-lesson language tour in `docs/tour/`. Sequence (round-3 lesson 18 changed per T2):
  1. Hello world
  2. Variables & types
  3. Functions
  4. Control flow
  5. Null safety
  6. Pattern matching
  7. Sum types (Result, Option)
  8. Records/interfaces
  9. Generics
  10. Classes
  11. Modules
  12. Async/await
  13. JSX
  14. Calling JS from SJS
  15. `dynamic` + Schema
  16. Errors + Result
  17. Iterators + for...of
  18. **Serverless handler patterns (T2)** — `workers-api` and `lambda-handler` template walkthrough; uses playground Workers demo mode (T5) for the Workers example. **Decorators removed from the lesson list** (not in spec).
  19. Tooling tour
  20. Migrating a TS file
- Each lesson links to playground; automated check that every link compiles in the playground (incl. Workers demo mode for lesson 18).
- Migration guide from TS in `docs/migration/`: 3 parts (syntax, idiom, library).
- "Why SJS" page in `docs/why/` with the ReScript comparison table; uses `examples/mvb-fastify/` (T3) as the concrete "5-minute backend" demo.
- API reference auto-generator (`superjs docgen`) runs over stdlib + wrappers; output at `docs/api/`.
- Compat matrix HTML page at `docs/compat/` consuming each wrapper's `STATUS.md` (Tier-2 from Stage 2; if not done, this stage owns delivery).
- Performance benchmarks at `docs/perf/`: numbers vs `tsc`, vs `esbuild`, vs prototype Phase-1 baseline; per-phase numbers from Sprint 1.1 (S6) baseline.
- Error-code reference pages: one per `SJS-EXXX` (~80 codes anticipated). CI gate: for every emitted code, file exists.
- **Docs-site infrastructure (C3):** Astro Starlight (or Docusaurus — choose one in week 1) configured with:
  - Algolia DocSearch or a local Pagefind/Lunr search index.
  - Sidebar nav generated from the file tree, with sections for spec, tour, migration, API, stdlib, errors (80+ pages), CLI.
  - Sitemap, RSS, dark mode, mobile-responsive.
  - Per-page edit-on-GitHub link.
  - Lighthouse CI step asserting score ≥ 90 on home page + a random sample of 10 error-code pages.
  - Broken-link checker run on every PR.
- **`superjs migrate from-prototype` (C2)** completed: rewrites `prototype/src/foo.sjs` import paths to `packages/compiler/src/foo.sjs`-style; flags any usage of prototype-only `.sjs` constructs (per a known list); produces `MIGRATION_REPORT.md`. Tested by running it against this repo's actual `prototype/` directory; the result is committed as a reference output.

**Key tasks:**
- [ ] Assemble `spec/language.md` from per-feature sections (B8); cross-reference every section to grammar production and error codes; polish prose.
- [ ] Merge spec-freeze PR.
- [ ] Author 20 tour lessons; **lesson 18 is "Serverless handler patterns"** (T2); each ≤ 5 min reading; each runs in playground (lesson 18 uses `mode=workers` per T5).
- [ ] Author migration guide.
- [ ] Author "Why SJS" page (including honest "what SJS loses" and `examples/mvb-fastify/` demo).
- [ ] Auto-API generator from stdlib + wrappers.
- [ ] Compat matrix HTML.
- [ ] Benchmark publishing (numbers + chart).
- [ ] One Markdown page per `SJS-EXXX` code (~80 codes anticipated).
- [ ] CI gate for code-page existence.
- [ ] Stand up docs-site infra (C3): pick Astro Starlight or Docusaurus; configure search, nav, sitemap, dark mode; Lighthouse + broken-link CI.
- [ ] Complete `superjs migrate from-prototype` (C2); test against the real `prototype/` dir.

**Done signal:** Spec PR merged with freeze tag; tour live and every lesson loads in playground (including lesson 18 in `mode=workers`); `docs/why/`, `docs/migration/`, `docs/api/`, `docs/compat/`, `docs/perf/` all live; docs-site Lighthouse ≥ 90; broken-link check green; `superjs migrate from-prototype` works on this repo's `prototype/`.

### Sprint 6.2 — Beta + bug bash + perf + security + `dynamic`-usage survey (2 weeks)

**Deliverables:**
- Beta program kicked off: 3 selected teams onboarded; each receives:
  - Direct Discord / email channel to maintainer.
  - Weekly 30-min check-in.
  - Issue-priority lane in the bug tracker (`label:beta`).
- Beta contract documented in `docs/beta/`: each team commits to ≥ 1k LOC SJS, biweekly bug reports, public testimonial (if comfortable) at launch, and **completion of the structured `dynamic` usage survey (C5)**.
- **`dynamic` usage structured survey (C5)** at `docs/beta/dynamic-usage-survey.md`:
  - Each team runs `superjs doctor --json` on their codebase + a custom `tools/count-dynamic.ts` script counting `dynamic` annotations in user-written source.
  - Results submitted as `{ team-id, total-loc, dynamic-occurrences, reasons-breakdown (M8 closed set), modules-with-dynamic, days-since-onboarding }`.
  - Aggregated into a table in `docs/beta/dynamic-usage-survey.md`; published at launch as part of "Why SJS" appendix evidence.
  - **Threshold for action:** if aggregate > 20 % dynamic-rate at boundaries, file `docs/known-issues/dynamic-rate-v1.md` and prioritise post-1.0 work (mirrors Stage 2 Sprint 2.4 real-world test threshold).
- Bug bash week: structured 5-day session; maintainer + co-maintainers + beta teams; all `severity=blocker` issues identified are fixed before RC.
- Performance pass: profile cold compile, warm rebuild, LSP startup, LSP hover, LSP completion. Cut allocations in hot paths. Re-record numbers; if any target missed, **slip 1.0 by one sprint** (per Risk register).
- Memory audit: heap snapshot the LSP with 100k-LOC project loaded; identify retained allocations; fix or document.
- **Security review by external reviewer booked at Stage 3 start (S7):**
  - Scope: compiler input parsing (DoS-resistant against pathological input?), LSP message handling (privilege escalation?), playground sandbox isolation, `--provenance` correctness, BiDi-spoofing source coverage (C9), crash-log redaction (R4).
  - Reviewer was engaged ≥ 15 weeks before sprint (Stage 3 Sprint 3.1, week 17); deliverable arrives in Sprint 6.2 (week 32) per the engagement letter.
  - Findings tracked as issues; `severity=critical` and `severity=high` fixed before RC.
- CodeQL clean + npm audit clean (no high/critical).
- Trademark search; domain ownership verification.
- **Node 24 promotion to blocking matrix (C7):** the nightly job (running since Sprint 0.2) is moved to the blocking CI matrix; any Node 24 failure surfaced during beta blocks GA.
- Public roadmap update: "we're entering RC, here's what we've cut, here's the path to GA."

**Key tasks:**
- [ ] Select 3 of 5 candidate beta teams; sign contracts.
- [ ] Onboard each team (env setup, install, first migration).
- [ ] Bug bash week — calendar + agenda + scribe.
- [ ] Performance profiling + optimisation passes.
- [ ] LSP memory audit.
- [ ] External security review engagement + report (S7).
- [ ] CodeQL / npm-audit gate.
- [ ] Trademark + domain checks.
- [ ] Aggregate `dynamic` usage survey (C5); publish.
- [ ] Promote Node 24 to blocking matrix (C7).
- [ ] Public roadmap update post.

**Done signal:** All 3 beta teams have a runnable v1.0-rc.0 codebase; bug-bash blockers all fixed; perf numbers re-recorded; security review delivered with no unfixed criticals; `dynamic` usage survey aggregated and published; Node 24 in blocking matrix; CI green on the new matrix.

### Sprint 6.3 — RC cycle + 1.0 GA + launch (+2-week buffer if needed per R9) (2 weeks)

**Deliverables:**
- `superjs@1.0.0-rc.1` tagged; full QA on three OSes + Node 24 (now blocking per C7); nightly fuzz running clean for ≥ 4 weeks.
- 1-week feedback window; collect issues; fix `severity=blocker` only.
- `superjs@1.0.0-rc.2` tagged; another 4-day window.
- `superjs@1.0.0-rc.3` (if needed) for any final blockers.
- `superjs@1.0.0` GA tag; published to npm with `--provenance` (R1 — published from primary or secondary account, with the other warmed up as failover); GitHub Release with full changelog; Sigstore attestation on release assets.
- Launch artefacts:
  - Launch blog post on `docs/blog/`.
  - HN "Show HN: SuperJS 1.0" post.
  - r/typescript announcement.
  - lobste.rs submission.
  - Twitter/X announcement.
  - Press kit at `docs/press/`: logo (SVG + PNG), screenshots, sample code, comparison-to-TS one-pager.
  - Discord server or GitHub Discussions kicked into "launch mode" with ≥ 50 members at GA.
  - **Launch demo uses `examples/mvb-fastify/` (Stage 5 T3)** as the "5-minute backend" walkthrough.
- On-call rotation for v1.0.x patches published (maintainer + co-maintainers per R10 — or solo-path fallback per README solo-path gates and `docs/maintenance.md` if no co-maintainer materialised); SLA: triage critical < 48 h, patch critical < 1 week (matches `RELEASING.md` C8).
- Post-launch monitoring: bug-report volume tracking; first-week metrics dashboard (npm downloads, GitHub stars, issue rate).

**Buffer (R9):** if at end of Sprint 6.1 **two or more** of {spec freeze, beta onboarding, security review} are behind schedule, an explicit **+2-week buffer** is invoked: Sprint 6.3 becomes a 4-week sprint. The decision is made as a PR adding a banner to README and `docs/blog/2026-XX-XX-stage-6-buffer-invoked.md`; no silent slip.

**Key tasks:**
- [ ] Tag and publish RC.1; smoke test on 3 OSes + Node 24 (C7).
- [ ] Feedback window; triage; fix blockers.
- [ ] Tag and publish RC.2 (and RC.3 if needed).
- [ ] Tag and publish 1.0.0.
- [ ] Author launch blog post.
- [ ] Author HN / lobste.rs / r/typescript posts.
- [ ] Press kit.
- [ ] Discord / GitHub Discussions launch.
- [ ] On-call rotation document; reference `RELEASING.md` (C8).
- [ ] First-week monitoring dashboard.
- [ ] (Conditional) Invoke +2-week buffer (R9) if Sprint 6.1 / 6.2 ran behind on multiple fronts.

**Done signal:** `npm view superjs version` returns `1.0.0`; GitHub Release page live; launch post live; HN post submitted; Discord ≥ 50 members; no `severity=critical` open issues at GA; Node 24 in CI matrix green for the release.

## Stage-Specific Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Beta teams disappear / don't ship code | M | M | 3 selected from 5 candidates; SLA on responsiveness; backup pipeline; slip 1 sprint if needed. |
| Spec polish takes longer than 2 weeks | L | M | Sprint 6.1 budget assumes per-feature sections exist from Stages 1–5 (B8) — work here is assembly + polish only. If the per-feature sections are missing (B8 was not followed), this stage slips by 2 weeks and a roadmap incident report is published. |
| Bug bash uncovers > 5 blockers | M | H | Sprint 6.2 has bug-fix days budgeted; if > 5 blockers persist, invoke R9 buffer. |
| Performance pass doesn't hit targets | M | H | Per-phase regression gates (S6) catch most issues earlier; documented slip protocol — don't ship slow compiler at 1.0. |
| External security reviewer unavailable on timeline | L | M | Engagement letter signed at Stage 3 Sprint 3.1 (S7) with 15-week lead time; backup reviewer (e.g. Trail of Bits or independent consultant) pre-identified; if delayed, ship RC with internal-only review note, flag for v1.0.1. |
| Critical RC bugs delay GA | M | H | RC cycle has 2 buffer weeks built in; R9 +2-week buffer invocation if more needed; do not ship known-critical. |
| Launch announcement gets negligible attention | M | M | Launch from a position of substance, not hype; HN post written with specific use case + benchmark; "Why SJS" page is the link. Backup: targeted outreach to TS community influencers in week before launch. The `dynamic`-usage survey (C5) provides concrete evidence the deal isn't broken. |
| Trademark conflict surfaces last-minute | L | M | Search done at Sprint 6.2; if conflict, rename plan: "Sjs", "SuperScript", "Super" — 1 week busywork. |
| Post-launch issue volume overwhelms maintainer | H | XL | On-call rotation in place (per R10 + R1 publish rotation per C8); auto-triage labels; first-week monitoring dashboard with alerting; co-maintainers in lane for triage. |
| **R9 — Stage 6 calendar has no aggregate-slip buffer** | M | M | Explicit "Stage 6 may extend by 2 weeks" decision point at end of Sprint 6.1 if ≥ 2 of {spec freeze, beta onboarding, security review} are behind; documented in plan and announced as a roadmap banner if invoked. |
| **R10 — Co-maintainer never materialises** | M | XL | Solo-path decision gates A and B in README (S2) force a documented choice at Stage 1 exit and Stage 3 entry; `docs/maintenance.md` documents solo-mode SLAs and scope; on-call rotation falls back to maintainer + designated triage volunteers if no co-maintainer. |
| Compat matrix regressions during RC cycle (an updated upstream breaks a wrapper) | M | M | Pin wrapper compat to known-good upstream versions; documented update SLA. |
| Spec freeze violated by a beta-team-discovered "must-fix" semantic issue | L | H | Spec-exception process documented; bar is "soundness or DoS bug only"; if used, document publicly. |
| `dynamic`-usage survey reveals >20 % rate (C5) close to launch | M | M | Threshold defined; `docs/known-issues/dynamic-rate-v1.md` filed with post-1.0 prioritisation; launch goes ahead with honest disclosure rather than silent slip — same posture as Stage 2 Sprint 2.4. |
| Node 24 promotion (C7) surfaces compatibility bug in late beta | L | M | Bug must be fixed before GA; if cannot be fixed in time, scope-cut option: GA with Node 20+22 support only, file v1.0.1 to add Node 24. Decision made at Sprint 6.3 kickoff. |
| Docs-site build infra (C3) breaks under 80+ error-code pages | L | M | Lighthouse + broken-link CI catches degradation in Sprint 6.1; static-site fallback (plain HTML index of MD) documented as v1.0.1 contingency. |

## API Contract

This stage produces:

1. **`spec/language.md`** — the canonical language reference, assembled from per-feature sections authored across Stages 1–5 (B8). Semver-stable from 1.0; changes require RFC.
2. **`spec/grammar.ebnf`** — semver-stable; parser-tested.
3. **`spec/error-codes.md` + `spec/error-codes/SJS-EXXX.md`** — each code is permanent; deprecated aliases follow the 6-month rule.
4. **`docs/api/` auto-generated reference** — stable surface area marks; beta/unstable surface explicitly tagged.
5. **`docs/compat/` matrix** — semver-stable URL; consumed by users and tooling.
6. **`docs/beta/dynamic-usage-survey.md` (C5)** — published evidence of `dynamic` rate at launch; tracked over time as a community-facing health metric.
7. **`superjs@1.0.0` npm package** — the GA artefact. Subsequent v1.x patches follow semver per `RELEASING.md` (C8).
8. **Public RFC process** — `rfcs/` directory + GitHub Discussions; documented in `CONTRIBUTING.md`. RFCs 0001–0005 were merged in Stage 0 Sprint 0.2 (S1); RFC-0006+ for post-1.0 work as needed.
9. **Stability tiers** — `stable` / `beta` (`@superjs/std-*/beta/` path) / `unstable` (nightly-only). Documented in `STABILITY.md`.
10. **Docs-site infrastructure (C3)** — Astro Starlight (or Docusaurus) configured with search, sidebar, sitemap, Lighthouse ≥ 90, broken-link CI; treated as a first-class deliverable not just content.

## Dependencies

- **Requires Stages 1, 2, 3, 4, 5** — every prior deliverable is in scope for the bug bash + perf pass + security review. Spec text per B8 must be present in `spec/language.md/*.md` from the prior stages.
- **Requires Stage 3 external security reviewer engagement letter (S7)** to be in place from week 17.
- **Unlocks** — post-1.0 work (Tier-3 from README): self-hosting, LLVM, WASM, editions, native test runner, more lint rules, JetBrains plugin, etc.
