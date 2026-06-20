# ADR-011: Docs Single Source of Truth

**Status:** Accepted  
**Date:** 2026-06-20  
**Supersedes:** WS-A3 Astro Starlight plan (`superjs/apps/docs`)

---

## Context

v1.0 WS-A3 originally proposed a separate Astro Starlight app at `superjs/apps/docs`.
The project already ships a Next.js site at `superjs/apps/website` with docs routing,
playground, and marketing pages. Maintaining two doc sites duplicates nav, search, CI,
and content sync.

## Decision

**One canonical docs tree, two renderers:**

| Consumer | Reads from |
|----------|------------|
| GitHub (browse/edit in repo) | `docs/` at repo root |
| superjs.org (website) | Same `docs/` tree — website build resolves paths into `docs/` |
| Formal spec (machine + agents) | `specs/` — unchanged; user-facing prose links into it |

Do **not** create `superjs/apps/docs` or a second documentation app.

### Content layout (target)

```
docs/
  README.md                 # docs home / index
  tour/                     # WS-A4a — 20 lessons
  migration/                # WS-A4b
  api/                      # WS-A4c (docgen output)
  why/                      # WS-A4d
  compat/                   # WS-A4e
  perf/                     # WS-A4f
  cli/                      # CLI reference
  stdlib/                   # stdlib reference
  comparisons/              # (existing)
  howto-*.md                # (existing)
  security/                 # (existing)

specs/error-codes/          # canonical error pages (WS-A2); website renders via reader
specs/language/             # spec sections; assembled by WS-A1
```

### WS-A3 revised objective

Extend **`superjs/apps/website`** and **`docs/`** so that:

1. Website `docs.ts` (or equivalent) reads from repo-root `docs/` (and error-code specs where needed).
2. Sidebar nav covers tour, migration, API, errors, spec, CLI, stdlib.
3. Full-text search, sitemap, dark mode, mobile, edit-on-GitHub — on the **existing** Next.js site.
4. CI builds `@superjs/website` (not a separate docs app).
5. Lighthouse + broken-link checks run against the website docs routes.

Record implementation details in the WS-A3 agent brief (`specs/roadmap/v1.0/agents/WS-A3.md`).

## Consequences

- WS-A4* agents write Markdown/MDX under `docs/`, not `apps/docs/src/content/`.
- Error codes stay in `specs/error-codes/`; website may wrap or re-export at `/docs/errors/`.
- ADR-010 (Starlight) is withdrawn before write — do not author it.
