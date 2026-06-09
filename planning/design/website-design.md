# Super.js Website Design Spec

**Date:** 2026-05-31
**Status:** Approved
**Replaces:** `docs/` (Docusaurus)

---

## Goal

Replace the Docusaurus docs site with a Next.js 16 website featuring a stunning landing page (3D scroll-driven hero, animations) and ported documentation. Deploy on Cloudflare Pages.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 — `create-next-app@latest` (App Router) |
| Deploy | Cloudflare Pages — `@cloudflare/next-on-pages` |
| 3D | React Three Fiber + Three.js |
| Scroll animation | GSAP + ScrollTrigger |
| Component animation | Framer Motion |
| Styling | Tailwind CSS v4 |
| Syntax highlighting | Shiki |
| Docs content | MDX — ported from `docs/docs/` |
| Package manager | npm |

---

## Visual Identity

- **Background:** `#050510` → `#0d1117` (deep space dark)
- **Primary accent:** `#f97316` (orange)
- **Secondary accent:** `#fbbf24` (amber)
- **Gradient:** `linear-gradient(135deg, #f97316, #fbbf24)`
- **Text:** `#f8fafc` primary · `#94a3b8` muted
- **Font:** Geist Sans (Next.js default) + Geist Mono for code

---

## Repository Layout

```
website/                        — Next.js 16 project (replaces docs/)
  app/
    layout.tsx                  — root layout: fonts, metadata, Navbar
    page.tsx                    — landing page
    docs/
      layout.tsx                — sidebar + TOC shell
      [...slug]/page.tsx        — MDX renderer
    playground/
      page.tsx                  — full-page Monaco playground
    blog/
      page.tsx                  — blog index
      [slug]/page.tsx           — blog post
  components/
    hero/
      EvolutionScene.tsx        — R3F canvas, scroll-driven timeline
      CharacterJS.tsx           — JS mascot (glowing yellow cube)
      CharacterTS.tsx           — TS mascot (glowing blue square)
      CharacterSJS.tsx          — SJS hero (orange burst)
      FloatingCodeCards.tsx     — orbiting SJS syntax snippets in 3D
    sections/
      Features.tsx              — 6 animated feature cards
      Compare.tsx               — JS / TS / SJS side-by-side code
      Quickstart.tsx            — install command + first program
      PlaygroundEmbed.tsx       — embedded Monaco editor
      Ecosystem.tsx             — scrolling marquee of tools
      CallToAction.tsx          — bottom CTA
    docs/
      Sidebar.tsx               — collapsible nav tree
      DocContent.tsx            — MDX renderer wrapper
      TableOfContents.tsx       — right-rail headings
    ui/
      Navbar.tsx                — sticky dark nav
      CodeBlock.tsx             — Shiki-powered fenced code
      Button.tsx                — primary / ghost variants
  content/
    docs/                       — ported .md/.mdx files
      intro.mdx
      language-reference.mdx
      type-system.mdx
      specification.mdx
      tooling.mdx
      examples.mdx
      roadmap.mdx
      changelog.mdx
      changelog/
        0.1.0.mdx
        0.2.0.mdx
    blog/
      2024-01-01-welcome.mdx
      2024-01-15-0-2-0-released.mdx
  public/
    fonts/                      — Geist (bundled by create-next-app)
    og-image.png                — Open Graph image
  wrangler.toml                 — Cloudflare Pages config
  next.config.ts                — CF edge runtime, MDX plugin
  tailwind.config.ts
  tsconfig.json
```

---

## Landing Page — Section by Section

### 1. Navbar
Sticky, `backdrop-blur`, dark. Left: `Super.js` wordmark + orange dot. Right: `Docs`, `Playground`, GitHub icon, `Get Started` CTA button (orange gradient).

### 2. Hero — Scroll-Driven Evolution Timeline (full viewport)

Full-viewport R3F canvas behind content. GSAP ScrollTrigger drives a `progress` uniform from 0→1 over the first 300vh of scroll.

**Timeline:**
| Scroll % | What happens |
|---|---|
| 0% (load) | JS character floats in from left. Code card: `var x = null // 💥 runtime error` |
| 25% | TS character joins from right. Card: `const x: string = null // TS still allows any` |
| 50% | Orange evolution beam fires between JS + TS. Both characters step back. |
| 75% | SJS character (orange burst sphere) explodes in center. Floating code cards orbit: `type Result<T,E> = Ok(T) \| Err(E)`, `match r { Ok(v) => v }`, `const x: string? = null` |
| 100% | Headline locks: **"JavaScript, Perfected."** Subtext: "Null-safe. Sum types. Match expressions. Zero runtime overhead." CTA: `Get Started` + `View Docs` |

**Characters:** Low-poly 3D glTF models or procedural R3F meshes. JS = yellow rounded cube with `JS` etched. TS = blue square with `TS`. SJS = orange/amber icosahedron with glow shader.

### 3. Features Section
6 cards in a 2×3 grid, scroll-in stagger (Framer Motion). Each card: icon + feature name + animated code snippet.

| # | Feature | Code snippet |
|---|---|---|
| 1 | Null Safety | `const x: string? = null` |
| 2 | Sum Types | `type Result<T,E> = Ok(T) \| Err(E)` |
| 3 | Match Expressions | `match r { Ok(v) => v, Err(e) => 0 }` |
| 4 | No `any` | `dynamic` keyword instead |
| 5 | Gradual Typing | Mix typed + untyped freely |
| 6 | Zero Runtime | Compiles to plain JS |

### 4. Compare Section
Three-column code comparison: same program in JS, TypeScript, Super.js. Shiki-highlighted. Animated tab switcher on mobile. Highlights what SJS removes (red strikethrough on `any`, `enum`, `null`) and adds (green on `match`, `T?`, sum types).

### 5. Quickstart Section
Dark terminal-style panel:
```bash
npm install -g superjs
echo 'const x: string? = null' > hello.sjs
sjs compile hello.sjs
```
Animated typing effect. Below: first real SJS program with `Result` type.

### 6. Live Playground (Embedded)
Monaco editor (left) + JS output panel (right). Powered by the `prototype/` compiler via API route (`/api/compile`). Default code: the `Result` + `match` example. Orange run button.

### 7. Ecosystem Strip
Scrolling marquee (both directions on desktop). Icons: VS Code Extension, CLI, Compiler, Type Checker, Linter, Formatter, Node.js compatible, Browser compatible.

### 8. Bottom CTA
Full-width dark panel with subtle particle field (R3F, low density). Headline: "Start writing Super.js today." Two buttons: `Get Started →` (orange) + `View on GitHub` (ghost). Orange glow on background.

---

## Documentation

- Route: `/docs/[...slug]`
- Sidebar auto-generated from `content/docs/` file tree + frontmatter `title`/`sidebar_position`
- Versioning: `/docs/0.0.1/` for archived version
- Search: Pagefind (static, runs at build time, works on Cloudflare)
- Syntax theme: custom Shiki theme — orange/amber accents, matches landing palette

**Ported files mapping:**
| Old path | New path |
|---|---|
| `docs/docs/intro.md` | `content/docs/intro.mdx` |
| `docs/docs/language-reference.md` | `content/docs/language-reference.mdx` |
| `docs/docs/type-system.md` | `content/docs/type-system.mdx` |
| `docs/docs/specification.md` | `content/docs/specification.mdx` |
| `docs/docs/tooling.md` | `content/docs/tooling.mdx` |
| `docs/docs/examples.md` | `content/docs/examples.mdx` |
| `docs/docs/roadmap.md` | `content/docs/roadmap.mdx` |
| `docs/docs/changelog.md` | `content/docs/changelog.mdx` |

---

## Cloudflare Deployment

```toml
# wrangler.toml
name = "superjs-website"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

`next.config.ts`:
```ts
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'
```

GitHub Actions (`/.github/workflows/website.yml`):
- Trigger: push to `master` with changes in `website/**`
- Steps: `npm ci` → `npm run build` → `wrangler pages deploy`

---

## Playground API

Route: `website/app/api/compile/route.ts`
- POST `{ source: string }` → `{ output: string, errors: [] }`
- Calls `prototype/src/compiler` directly (monorepo import)
- Deployed as Cloudflare Worker (edge runtime)

---

## Out of Scope (v1)

- Dark/light theme toggle (dark only)
- i18n
- Full-text search beyond Pagefind
- Blog RSS feed
- Analytics
