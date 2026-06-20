# WS-A3: Docs site infrastructure

**Branch:** `feature/v1.0-docs-infra`  
**Effort:** large  
**Deps:** none — start immediately (content workstreams WS-A4* block on this)  
**PR base:** `main`

## Objective

Stand up a production-ready Astro Starlight docs site at `superjs/apps/docs` (NX app).
Delivers the scaffold; content (tour, migration, API, why, compat, perf) comes in WS-A4*.

## Context

- NX monorepo at `super-js/superjs/`
- Existing website app: `superjs/apps/website` (Next.js marketing + playground)
- NX workspace config: `superjs/nx.json`, `superjs/package.json`
- Existing CI: `.github/workflows/` — check for existing jobs
- Design reference: `specs/design/website-design.md`

## Framework choice

**Astro Starlight** — use this. Rationale: purpose-built for documentation, built-in full-text
search, dark mode, mobile-responsive, sidebar from file tree, RSS, sitemap. No React needed.

If Starlight hits a blocking issue (e.g., NX integration fails), fallback to Docusaurus v3.
Document the decision in `specs/design/ADR-010-docs-site.md`.

## Site structure

```
superjs/apps/docs/
  astro.config.mjs
  package.json
  tsconfig.json
  project.json          # NX project config
  public/
    favicon.svg
    logo.svg            # reuse from apps/website/public if exists
  src/
    content/
      docs/
        index.mdx           # home page / getting started
        tour/               # 20 lessons — content from WS-A4a
          index.md
          01-hello-world.md
          ...
        migration/          # TS→SJS guide — content from WS-A4b
          index.md
        api/                # auto-generated — from WS-A4c
          index.md
        why/                # Why SJS — from WS-A4d
          index.md
        compat/             # compat matrix — from WS-A4e
          index.md
        perf/               # benchmarks — from WS-A4f
          index.md
        error-codes/        # one .md per SJS-EXXX — from WS-A2
          index.md          # lists all codes with links
          SJS-E001.md       # symlink or copy from specs/error-codes/
          ...
        spec/               # assembled language spec — from WS-A1
          index.md
        cli/                # CLI reference
          index.md
        stdlib/             # stdlib reference
          index.md
    styles/
      custom.css
```

## Astro + Starlight setup

```bash
# from superjs/ dir
pnpm create astro@latest apps/docs -- --template starlight
cd apps/docs
pnpm add @astrojs/starlight
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'SuperJS',
      description: 'The statically-typed language that compiles to JavaScript',
      logo: { src: './public/logo.svg' },
      social: {
        github: 'https://github.com/hbarve1/super-js',
      },
      sidebar: [
        { label: 'Getting Started', link: '/' },
        {
          label: 'Language Tour',
          autogenerate: { directory: 'tour' },
        },
        {
          label: 'Migration Guide',
          autogenerate: { directory: 'migration' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
        { label: 'Why SuperJS', link: 'why' },
        { label: 'Compat Matrix', link: 'compat' },
        { label: 'Benchmarks', link: 'perf' },
        {
          label: 'Error Codes',
          autogenerate: { directory: 'error-codes' },
        },
        {
          label: 'Language Spec',
          autogenerate: { directory: 'spec' },
        },
        { label: 'CLI Reference', link: 'cli' },
        {
          label: 'Standard Library',
          autogenerate: { directory: 'stdlib' },
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/hbarve1/super-js/edit/main/superjs/apps/docs/',
      },
      lastUpdated: true,
      pagination: true,
    }),
  ],
  site: 'https://superjs.dev',
});
```

## Full-text search

Use Starlight's built-in Pagefind (local, no external service). It's included by default.
For Algolia DocSearch as future upgrade: add `plugins: [starlightDocSearch({ appId, apiKey, indexName })]`.

## NX project.json

```json
{
  "name": "docs",
  "$schema": "../../node_modules/nx/schemas/project.json",
  "projectType": "application",
  "sourceRoot": "apps/docs/src",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "astro build",
        "cwd": "{projectRoot}"
      }
    },
    "dev": {
      "executor": "nx:run-commands",
      "options": {
        "command": "astro dev",
        "cwd": "{projectRoot}"
      }
    },
    "preview": {
      "executor": "nx:run-commands",
      "options": {
        "command": "astro preview",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

## Error-code pages strategy

Do NOT symlink — Astro/Starlight uses Markdown/MDX with frontmatter.
Write a build script `scripts/sync-error-pages.ts` that:
1. Reads each `specs/error-codes/SJS-*.md`
2. Adds Starlight frontmatter (`title`, `description`, `sidebar.label`)
3. Writes to `apps/docs/src/content/docs/error-codes/`

Run this script as part of the `build` target (before `astro build`).

```typescript
// scripts/sync-error-pages.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'specs/error-codes';
const DEST = 'superjs/apps/docs/src/content/docs/error-codes';
mkdirSync(DEST, { recursive: true });

for (const file of readdirSync(SRC).filter(f => f.match(/^SJS-[EPLW]\d{3}\.md$/))) {
  const content = readFileSync(join(SRC, file), 'utf8');
  const code = file.replace('.md', '');
  // Extract title from first heading
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch?.[1] ?? code;
  const withFrontmatter = `---\ntitle: '${title.replace(/'/g, "\\'")}'\ndescription: '${code} diagnostic reference'\nsidebar:\n  label: '${code}'\n---\n\n${content.replace(/^# .+\n/, '')}`;
  writeFileSync(join(DEST, file), withFrontmatter);
}
console.log('Error-code pages synced.');
```

## CI

Add to `.github/workflows/ci.yml`:

```yaml
docs-build:
  name: Docs site build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'pnpm' }
    - run: pnpm install --frozen-lockfile
    - run: npx tsx scripts/sync-error-pages.ts
    - run: cd superjs && npx nx build docs
    - name: Serve built docs for Lighthouse
      run: npx serve superjs/apps/docs/dist -l 4321 &
           sleep 3  # wait for server to be ready
    - name: Lighthouse CI
      uses: treosh/lighthouse-ci-action@v11
      with:
        urls: |
          http://localhost:4321/
          http://localhost:4321/error-codes/SJS-E001/
        uploadArtifacts: true
        temporaryPublicStorage: true
    - name: Check for broken links
      run: npx lychee superjs/apps/docs/dist --no-progress --format markdown
```

## Lighthouse target

Score ≥ 90 on: Performance, Accessibility, Best Practices, SEO for:
- Home page
- Any 3 error-code pages (sampled)

## Implementation steps

1. Run `pnpm create astro@latest apps/docs -- --template starlight` from `superjs/` dir.
2. Write `project.json` (NX integration).
3. Configure `astro.config.mjs` with full sidebar nav (placeholder content dirs are OK).
4. Write `scripts/sync-error-pages.ts`.
5. Create placeholder `index.mdx` home page: "SuperJS — statically typed JS. Docs coming soon."
6. Create placeholder index pages for each sidebar section (tour, migration, api, why, compat, perf, spec, cli, stdlib).
7. Run `npx tsx scripts/sync-error-pages.ts` — verify error-code pages appear.
8. Run `nx build docs` — verify build succeeds.
9. Run `nx preview docs` + `npx lychee dist/` — fix broken links.
10. Add CI job to `.github/workflows/ci.yml`.
11. Write `specs/design/ADR-010-docs-site.md` confirming Astro Starlight choice.

## Acceptance criteria

- [ ] `nx build docs` succeeds, emits `dist/` with ≥1 HTML page per section
- [ ] All 80+ error-code pages visible in sidebar under "Error Codes"
- [ ] Pagefind search indexes pages; search widget visible in UI
- [ ] Lighthouse score ≥ 90 on home + 3 error-code pages
- [ ] `lychee` broken-link check passes on built output
- [ ] CI job `docs-build` added to `.github/workflows/ci.yml` and green
- [ ] Dark mode toggle present and works
- [ ] Mobile-responsive (check at 375px viewport)
- [ ] Edit-on-GitHub link present per page
- [ ] `specs/design/ADR-010-docs-site.md` written

## Notes

- Content workstreams (WS-A4*) add content into `src/content/docs/` — coordinate on directory names
- Do NOT start any of the Big-3 workstreams from here
- If pnpm workspace issues arise, check `superjs/pnpm-workspace.yaml` and add `apps/docs` to it
