# WS-A4e: Compat matrix HTML

**Branch:** `feature/v1.0-compat`  
**Effort:** small  
**Deps:** WS-A3 (docs site infra merged first)  
**PR base:** `main`

## Objective

Build a sortable HTML compatibility matrix at
`superjs/apps/docs/src/content/docs/compat/index.mdx`
showing which JS/npm packages have typed SJS wrappers (`@superjs/types-*`),
their coverage level, and tested versions.

## Context

- Compat matrix is fed by each wrapper's `STATUS.md` file
- WS-B3 will create the actual `@superjs/types-*` wrappers
- This workstream builds the matrix infrastructure so it's ready when wrappers land
- Docs site scaffold from WS-A3

## Data format

Each `@superjs/types-*` wrapper will have a `STATUS.md` with a YAML frontmatter block:

```yaml
---
package: "fastify"
version: "4.x"
coverage: 87          # % of exported surface typed
status: "stable"      # stable | beta | wip
last-updated: "2026-06-01"
features:
  - routing
  - middleware
  - plugins
missing:
  - decorators
  - lifecycle hooks
---
```

## What to build

### Option A (static MVP — no wrappers exist yet)

Since WS-B3 (wrappers) may not be done when this merges, build a static MVP table
with placeholder rows for the 30 planned wave-1 packages, each marked "planned" or "wip".

### Option B (dynamic — preferred once WS-B3 lands)

Build a build-time script `scripts/gen-compat-matrix.ts` that:
1. Finds all `superjs/libs/types-*/STATUS.md` (or `packages/types-*/STATUS.md`)
2. Parses the YAML frontmatter
3. Generates a Markdown table sorted by package name
4. Writes to `superjs/apps/docs/src/content/docs/compat/index.mdx`

**Build this workstream as Option A (static) first. WS-B3 will upgrade to Option B.**

## Static table format

```mdx
---
title: 'Compatibility Matrix'
description: 'SuperJS typed wrapper coverage for popular npm packages.'
---

# Compatibility Matrix

Typed SJS wrappers (`@superjs/types-*`) for popular npm packages.

**Status:** stable (full coverage), beta (partial), wip (in progress), planned.

<div class="compat-table-wrapper">
| Package | Wrapper | Coverage | Status | Tested version |
|---------|---------|----------|--------|---------------|
| fastify | `@superjs/types-fastify` | — | planned | 4.x |
| express | `@superjs/types-express` | — | planned | 4.x |
| hono | `@superjs/types-hono` | — | planned | 4.x |
| pg | `@superjs/types-pg` | — | planned | 8.x |
| prisma | `@superjs/types-prisma` | — | planned | 5.x |
| zod | `@superjs/types-zod` | — | planned | 3.x |
| axios | `@superjs/types-axios` | — | planned | 1.x |
| react | `@superjs/types-react` | — | planned | 18.x |
| nextjs | `@superjs/types-nextjs` | — | planned | 14.x |
| vitest | `@superjs/types-vitest` | — | planned | 1.x |
| ... (30 total) | | | | |
</div>

> Wave 1 targets backend-first packages. See [WS-B3 spec](../../../specs/roadmap/v1.0/WS-B3-types-wrappers.md) for the full list.
```

## CSS for sortable table

Add a client-side sort script using vanilla JS (no framework):

```html
<script>
document.querySelectorAll('.compat-table-wrapper th').forEach((th, i) => {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => sortTable(th.closest('table'), i));
});
function sortTable(table, col) {
  const rows = [...table.querySelectorAll('tbody tr')];
  const asc = table.dataset.sortCol == col && table.dataset.sortDir === 'asc';
  rows.sort((a, b) => {
    const av = a.cells[col].textContent.trim();
    const bv = b.cells[col].textContent.trim();
    return asc ? bv.localeCompare(av) : av.localeCompare(bv);
  });
  table.dataset.sortCol = col;
  table.dataset.sortDir = asc ? 'desc' : 'asc';
  rows.forEach(r => table.querySelector('tbody').appendChild(r));
}
</script>
```

Embed via Astro `<script>` tag in the MDX file or via `custom.css` + inline script.

## Future gen-compat-matrix.ts

Leave a comment in `index.mdx`:
```
{/* AUTO-GENERATED section below — run scripts/gen-compat-matrix.ts to regenerate */}
```

Stub `scripts/gen-compat-matrix.ts` with a TODO comment pointing to WS-B3.

## Implementation steps

1. Create `superjs/apps/docs/src/content/docs/compat/index.mdx`.
2. Write the static table with 30 planned package rows (see WS-B3 for the full list).
3. Add sortable-table JS snippet.
4. Stub `scripts/gen-compat-matrix.ts` with TODO.
5. Run `nx build docs` — confirm compat page renders.
6. Verify sort works in browser (`nx preview docs`).

## Wave-1 package list (30 targets for WS-B3, fill into table)

Backend: fastify, express, hono, koa, connect, pg, mysql2, prisma, mongoose, redis,
ioredis, bullmq, aws-sdk-v3, node-fetch, undici, dotenv, pino, winston, zod, joi,
supertest, sharp, multer, passport, jsonwebtoken.
Frontend/universal: react, nextjs, vite, vitest, jest.

## Acceptance criteria

- [ ] `compat/index.mdx` exists with ≥30 package rows
- [ ] Table is sortable by clicking column headers (JS works)
- [ ] All 30 wave-1 packages listed with "planned" status
- [ ] `scripts/gen-compat-matrix.ts` stub exists with TODO comment
- [ ] `nx build docs` → compat page renders correctly
- [ ] Sortable table works at `nx preview docs`
