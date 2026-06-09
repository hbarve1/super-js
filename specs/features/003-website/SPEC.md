# Feature 003: SuperJS Website — Canonical Spec

**Status:** Plans A–E written. Ready for implementation.
**Implementable by:** Any agent that can run Next.js 16 + npm + wrangler.

---

## Goal

Build and ship the SuperJS marketing website at `superjs.dev`. A full-stack Next.js 16 application hosted on Cloudflare Pages with:
- Scroll-driven 3D hero (R3F)
- Docs system (MDX, sidebar, TOC, Pagefind search)
- Live playground (Monaco + prototype compiler)
- Blog
- OG image, sitemap, accessibility, mobile layouts

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 |
| Font | Geist (sans + mono) |
| 3D / Animation | React Three Fiber, Three.js, GSAP ScrollTrigger, Framer Motion |
| Syntax highlighting | Shiki (server-side singleton, orange/amber theme `superjs-dark`) |
| Docs | `next-mdx-remote/rsc`, `gray-matter` |
| Search | Pagefind (static, post-build) |
| Playground editor | Monaco via `@monaco-editor/react` |
| Deployment | Cloudflare Pages via `@cloudflare/next-on-pages` |
| CI/CD | GitHub Actions (deploy on push to `main` when `website/**` changes) |

---

## Design System

| Token | Value |
|---|---|
| Background deep | `#050510` |
| Background card | `#0d1117` |
| Accent orange | `#f97316` |
| Accent amber | `#fbbf24` |
| Text primary | `#f8fafc` |
| Text muted | `#94a3b8` |
| Border | `rgba(255, 255, 255, 0.08)` |

CSS variables defined in `globals.css` using Tailwind v4 `@theme` directive.

---

## Repository Layout

```
website/
  src/
    app/
      layout.tsx                    root layout: Geist font, Navbar, skip-to-content
      page.tsx                      landing page
      opengraph-image.tsx           static OG image (1200x630, next/og)
      sitemap.ts                    dynamic sitemap
      robots.ts                     robots.txt
      global-error.tsx              global error boundary with lang attr
      docs/
        layout.tsx                  Sidebar + SearchButton shell
        page.tsx                    redirect to /docs/intro
        [...slug]/page.tsx          MDX renderer + generateStaticParams
      blog/
        page.tsx                    blog index
        [slug]/page.tsx             blog post renderer
      api/
        compile/route.ts            edge route: POST {source} -> {output, errors}
      playground/
        page.tsx                    full-page playground (SSR disabled)
    components/
      ui/
        Navbar.tsx                  sticky, mobile hamburger, aria labels
        Button.tsx                  primary (orange gradient) + ghost variants
        CodeBlock.tsx               copy button wrapper (CodeBlockWrapper)
      hero/
        index.tsx                   Hero: deferred canvas (100ms), h-[100svh], touch-none
        EvolutionScene.tsx          R3F Canvas: Stars, ambient light, JS/TS/SJS characters
        CharacterJS.tsx             yellow cube, fades 0->0.5 scroll progress
        CharacterTS.tsx             blue flat box, fades 0.15->0.55
        CharacterSJS.tsx            orange icosahedron + orbit ring, bursts at 0.5
        FloatingCodeCards.tsx       orbiting SJS code snippets in 3D (appear at 0.65)
        HeroContent.tsx             HTML overlay: stage labels -> final headline + CTAs
      docs/
        Sidebar.tsx                 desktop sticky sidebar + mobile FAB drawer; data-pagefind-ignore
        TableOfContents.tsx         IntersectionObserver active-heading tracking; data-pagefind-ignore
        DocContent.tsx              MDXRemote wrapper, custom mdxComponents; data-pagefind-body on article
        SearchButton.tsx            Pagefind UI (client, loads post-build CSS+JS dynamically)
      playground/
        Editor.tsx                  Monaco: superjs-dark theme, Ctrl/Cmd+Enter shortcut, role="application"
        OutputPanel.tsx             compiled JS or error list with line numbers
        Playground.tsx              Editor + OutputPanel split, useCompiler hook
      sections/
        Features.tsx                6 server-component cards with Shiki-highlighted code
        Compare.tsx                 JS/TS/SJS 3-column side-by-side with Shiki
        Quickstart.tsx              3-step install guide with Shiki
        PlaygroundEmbed.tsx         compact playground (420px mobile / 380px desktop) for landing page
        Ecosystem.tsx               CSS marquee of tools (10 items, duplicated for seamless loop)
        CallToAction.tsx            bottom CTA with orange radial glow
    hooks/
      useScrollProgress.ts          GSAP ScrollTrigger -> normalized 0-1 progress; pins scroll container
      useCompiler.ts                fetch /api/compile, status: idle|loading|done|error
    lib/
      shiki.ts                      singleton Shiki highlighter (superjs-dark theme)
      docs.ts                       getAllDocSlugs, getDocBySlug, getDocNavTree (sorted by sidebar_position)
      blog.ts                       getAllPostSlugs, getPostBySlug, getAllPosts (sorted by date)
  content/
    docs/
      intro.mdx                     sidebar_position: 1
      language-reference.mdx        sidebar_position: 2
      type-system.mdx               sidebar_position: 3
      specification.mdx             sidebar_position: 4
      tooling.mdx                   sidebar_position: 5
      examples.mdx                  sidebar_position: 6
      roadmap.mdx                   sidebar_position: 7
      changelog.mdx                 sidebar_position: 8
    blog/
      2024-01-01-welcome.mdx
      2024-01-15-0-2-0-released.mdx
  next.config.ts
  wrangler.toml
  tailwind.config.ts
  package.json
```

---

## Implementation Phases

### Phase A — Scaffold

1. `npx create-next-app@latest website --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack`
2. Replace `globals.css` with CSS variable definitions using `@theme` (see design tokens above)
3. Create `Button.tsx` (primary orange gradient + ghost) and `Navbar.tsx` (sticky, mobile hamburger, aria labels)
4. Add Navbar to root layout; add skip-to-content link `href="#main-content"` before Navbar
5. Install `@cloudflare/next-on-pages`; add `wrangler.toml` (`name=superjs-website`, `compatibility_date=2025-01-01`, `nodejs_compat`)
6. Add scripts to `package.json`: `build:cf`, `preview:cf`, `deploy:cf`
7. Create `.github/workflows/website.yml` — triggers on `main` branch + `website/**` path filter; requires `CF_API_TOKEN` and `CF_ACCOUNT_ID` repo secrets

**Done signal:** `npm run dev` produces dark page with Navbar and orange CTA. `npm run build:cf` produces CF output.

---

### Phase B — Landing Page

Install: `npm install three @react-three/fiber @react-three/drei gsap framer-motion && npm install -D @types/three`

**Hero section flow:**
- `Hero` (index.tsx): deferred canvas via `useState(false)` + `useEffect` with `setTimeout(100ms)`, `h-[100svh]`, `touch-none`
- `useScrollProgress(2400)` returns `{progress: 0->1, containerRef}` using GSAP ScrollTrigger `scrub + pin`
- Canvas renders `CharacterJS` (progress < 0.5), `CharacterTS` (0.15–0.55), `CharacterSJS` (bursts at 0.5), `FloatingCodeCards` (opacity at 0.65)
- `HeroContent` shows stage labels at 0/0.25/0.5 progress; final headline "JavaScript, Perfected." at 0.75+

**Landing page section order:** Hero, Features, Compare, PlaygroundEmbed, Quickstart, Ecosystem, CallToAction

**Shiki singleton** (`lib/shiki.ts`): `createHighlighter` with `superjs-dark` custom theme (keywords=#f97316, strings=#fbbf24, types=#34d399), singleton promise cached in module scope.

**Default playground code** (used in PlaygroundEmbed and full playground):
```
type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match divide(10, 2) {
  Ok(value) => console.log("Result:", value),
  Err(msg)  => console.error("Error:", msg),
}
```

**Done signal:** Scroll-driven hero works, all 6 sections render, `npm run build` produces 0 TypeScript errors.

---

### Phase C — Docs System

Install: `npm install next-mdx-remote gray-matter shiki @pagefind/default-ui`

**`lib/docs.ts`** exports:
- `getAllDocSlugs(): Promise<string[][]>` — reads `content/docs/*.mdx`
- `getDocBySlug(slug: string[]): Promise<Doc>` — parses frontmatter with gray-matter
- `getDocNavTree(): Promise<NavItem[]>` — sorted by `sidebar_position` frontmatter field

**`lib/blog.ts`** exports:
- `getAllPostSlugs(): Promise<string[]>`, `getPostBySlug(slug: string): Promise<Post>`, `getAllPosts(): Promise<PostSummary[]>` — sorted descending by `date`

**`DocContent.tsx`** — renders `MDXRemote` with `mdxComponents`: `pre` wraps in `CodeBlockWrapper`, headings with dark styling, links orange-colored, table with dark borders, inline `code` with amber color + bg-white/10. Article element has `data-pagefind-body`.

**`Sidebar.tsx`** — desktop: sticky `w-56`, `data-pagefind-ignore`. Mobile: `hidden md:block` desktop + FAB button (`fixed bottom-6 left-4`, orange pill, "Docs" label) + slide-in drawer (fixed, `z-50`, `w-72`, backdrop `bg-black/60`).

**`TableOfContents.tsx`** — `IntersectionObserver` with `rootMargin: '0px 0px -70% 0px'`, `data-pagefind-ignore` on the aside.

**Pagefind** — `postbuild` script: `npx pagefind --site .next/static --output-path public/pagefind`. `SearchButton.tsx` dynamically loads `/pagefind/pagefind-ui.js` client-side (silently fails in dev).

**8 docs to port** from `docs/docs/` (copy + update frontmatter to include `title` and `sidebar_position`): intro, language-reference, type-system, specification, tooling, examples, roadmap, changelog.

**Blog** — 2 starter posts:
- `2024-01-01-welcome.mdx` — intro to SuperJS (null safety, sum types, no `any`)
- `2024-01-15-0-2-0-released.mdx` — 0.2.0 release (gradual typing, VS Code extension, improved errors)

**Done signal:** `/docs/intro` renders with sidebar, TOC, Shiki highlighting. `npm run build` generates Pagefind index in `public/pagefind/`.

---

### Phase D — Playground

Install: `npm install @monaco-editor/react monaco-editor`

**`/api/compile/route.ts`** — `export const runtime = 'edge'`. POST `{source: string}` responds with `{output: string, errors: {message, line?, column?}[]}`. Imports `@superjs/compiler` via webpack alias `path.resolve(__dirname, '../prototype/src/compiler/index.ts')`. Normalizes compiler output: `result.output ?? result.js ?? result.code ?? ''`.

**`useCompiler.ts`** — states: `idle | loading | done | error`. Calls `/api/compile` via `fetch`, sets `output` and `errors`.

**`Editor.tsx`** — Monaco with `superjs-dark` theme (defined via `monaco.editor.defineTheme`), `Ctrl/Cmd+Enter` calls `onRun`, `role="application" aria-label="Super.js code editor"` wrapper.

**`OutputPanel.tsx`** — shows "Compiling..." spinner, checkmark on success, or error list with `Line N:` prefix.

**`Playground.tsx`** — `Editor` (dynamic, `ssr: false`) + `OutputPanel` in a flex split, `border border-white/10 rounded-xl`.

**`PlaygroundEmbed.tsx`** — wraps `Playground` with responsive height:
- Mobile (`block md:hidden`): height `420px`
- Desktop (`hidden md:block`): height `380px`

**`next.config.ts`** — add `experimental.optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei']`.

**Done signal:** `/playground` loads Monaco, Run button compiles, output shows. Cmd+Enter triggers run.

---

### Phase E — Polish

**E-1 OG image:** `app/opengraph-image.tsx` using `next/og ImageResponse` (1200x630). Left: SuperJS wordmark + 3 chips (null-safe, sum types, match). Right: dark code panel with `type Result` + `match` example. Update `openGraph.images` in `layout.tsx` metadata to `https://superjs.dev/opengraph-image`.

**E-2 SEO routes:**
- `app/sitemap.ts` — calls `getAllDocSlugs()` + `getAllPostSlugs()` to build dynamic sitemap
- `app/robots.ts` — allow all, `sitemap: https://superjs.dev/sitemap.xml`
- `app/global-error.tsx` — `<html lang="en">` (fixes Pagefind warning about missing lang attr)

**E-3 Accessibility:**
- Skip-to-content link in `layout.tsx`: `href="#main-content"`, `sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg`
- `id="main-content"` on `<main>` in `page.tsx`
- `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500` in `Button.tsx` base class
- Navbar hamburger: `aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}` + `aria-expanded={open}`
- GitHub links in Navbar: `aria-label="View Super.js on GitHub"`
- Monaco wrapper: `role="application" aria-label="Super.js code editor"`
- Run button: `aria-keyshortcuts="Control+Enter Meta+Enter"`

**E-4 Copy button:** `CodeBlockWrapper` client component — `useRef<HTMLPreElement>` + `navigator.clipboard.writeText`. Button is `opacity-0 group-hover:opacity-100`, shows "Copied" + checkmark for 2s. Registered as `pre` handler in `DocContent.tsx`.

**E-5 Pagefind quality:** `data-pagefind-body` on article in `DocContent.tsx`; `data-pagefind-ignore` on nav in `Sidebar.tsx`; `data-pagefind-ignore` on aside in `TableOfContents.tsx`.

**E-6 Docs mobile drawer:** Sidebar rewritten with desktop-only sticky + mobile FAB + slide-in drawer. `SidebarNav` extracted as inner component with `onLinkClick` for closing on navigation.

**E-7 Hero performance:** `Hero` deferred canvas with 100ms setTimeout. Use `h-[100svh]` + `touch-none`.

**E-8 Performance + mobile playground:** `optimizePackageImports` for Three.js in `next.config.ts`. `PlaygroundEmbed` uses responsive height divs.

---

## Compiler API Contract

`/api/compile` expects:
```
POST { "source": "const x: string? = null" }
-> { "output": "const x = null;", "errors": [] }
```

The compiler webpack alias `@superjs/compiler` points to `prototype/src/compiler/index.ts`. The `compile()` function return shape may vary — normalize: `result.output ?? result.js ?? result.code ?? ''` for output, `result.errors ?? result.diagnostics ?? []` for errors.

---

## Deployment

**Cloudflare Pages** — `wrangler pages deploy .vercel/output/static --project-name superjs-website`

Required GitHub repo secrets:
- `CF_API_TOKEN` — Cloudflare API token with "Pages: Edit" permission
- `CF_ACCOUNT_ID` — Cloudflare account ID

---

## Final Quality Gates

- `npm run build` — 0 TypeScript errors, 0 warnings
- `npx tsc --noEmit` — clean
- `npm run build:cf` — CF static output produced
- `ls public/pagefind/` shows `pagefind.js`, `pagefind-ui.js`
- All 8 docs render at `/docs/<slug>` with sidebar active, TOC visible, Shiki highlighting
- `/playground` — Monaco loads, Run compiles default code, output shows
- Skip-to-content link reachable via Tab; focus rings visible on all interactive elements
- `npm run build` on Cloudflare CI runner succeeds (no edge-runtime-incompatible code)
