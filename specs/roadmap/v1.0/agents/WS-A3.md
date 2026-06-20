# Agent brief: WS-A3 (amended)

**Overrides:** `WS-A3-docs-infra.md` sections on Astro Starlight and `superjs/apps/docs`.  
**Authority:** `specs/design/ADR-011-docs-single-source.md`

## Objective

Wire **repo-root `docs/`** as the single canonical docs tree for GitHub and superjs.org.
Extend **`superjs/apps/website`** (Next.js) to render it — do **not** create `apps/docs`.

## Deliverables

1. **Repo-root `docs/` scaffold** — directories for tour, migration, api, why, compat, perf, cli, stdlib (placeholder index pages OK).
2. **Website reads `docs/`** — update `superjs/apps/website/src/lib/docs.ts` (and routes if needed) to resolve Markdown/MDX from repo-root `docs/` relative to monorepo root, not only `apps/website/content/docs/`.
3. **Migrate or alias existing website docs** — consolidate duplicate content; avoid two homes for the same page.
4. **Error codes on site** — render `specs/error-codes/SJS-*.md` at `/docs/errors/<code>` (build-time reader or sync script; do not duplicate source files).
5. **Nav + search** — sidebar covers all v1.0 sections; search indexes doc pages (extend existing SearchButton or equivalent).
6. **Edit on GitHub** — links point at `docs/` paths on `main`.
7. **CI** — extend `.github/workflows/website.yml` (or root CI): build website, Lighthouse on docs routes, broken-link check.
8. **ADR-011** — already merged; no ADR-010 Starlight doc.

## Acceptance criteria (amended)

- [ ] No `superjs/apps/docs` directory created
- [ ] `docs/` tree exists with section placeholders
- [ ] Website serves pages from repo-root `docs/` at `/docs/*`
- [ ] Error-code pages reachable under `/docs/errors/` (sourced from `specs/error-codes/`)
- [ ] `pnpm nx build website` (or project target name) succeeds
- [ ] Lighthouse ≥ 90 on docs home + 3 sample pages (use existing lighthouserc if present)
- [ ] Broken-link check passes on built docs routes
- [ ] Dark mode + mobile layout unchanged or improved

## Out of scope

- WS-A4* content (other agents fill `docs/` subdirs after A3 merges)
- Playground Workers sandbox (WS-B1)
