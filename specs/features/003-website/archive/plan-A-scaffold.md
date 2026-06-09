# Super.js Website — Plan A: Scaffold + Base Layout + Cloudflare Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js 16 website in `website/` with Tailwind v4, base layout, Navbar, dark theme, and a working Cloudflare Pages deploy pipeline — so Plans B/C/D have a running foundation to build on.

**Architecture:** `create-next-app@latest` in `website/`, App Router, TypeScript strict. Cloudflare Pages via `@cloudflare/next-on-pages`. GitHub Actions deploys on push to `master` when `website/**` changes. No content yet — just the shell.

**Tech Stack:** Next.js 16 · Tailwind CSS v4 · TypeScript 5 · `@cloudflare/next-on-pages` · Wrangler · Geist font

---

## File Map

| File | Purpose |
|---|---|
| `website/` | Next.js 16 project root (created by create-next-app) |
| `website/app/layout.tsx` | Root layout: Geist font, dark bg, Navbar |
| `website/app/page.tsx` | Landing page stub (just "Coming soon" for now) |
| `website/app/globals.css` | Tailwind v4 import + CSS variables |
| `website/components/ui/Navbar.tsx` | Sticky navbar: logo + nav links + CTA button |
| `website/components/ui/Button.tsx` | Reusable button: primary (orange gradient) + ghost variants |
| `website/next.config.ts` | CF edge runtime, strict mode |
| `website/wrangler.toml` | Cloudflare Pages project config |
| `website/.gitignore` | Standard Next.js ignores |
| `.github/workflows/website.yml` | CI: build + `wrangler pages deploy` on master |

---

### Task 1: Scaffold Next.js 16 project

**Files:**
- Create: `website/` (entire Next.js project via CLI)

- [ ] **Step 1: Run create-next-app from repo root**

```bash
cd /path/to/super-js
npx create-next-app@latest website \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

When prompted, accept all defaults. This creates `website/` with Next.js 16, TypeScript, Tailwind, App Router, `src/` directory structure.

- [ ] **Step 2: Verify it runs**

```bash
cd website
npm run dev
```

Expected: server starts at `http://localhost:3000`, default Next.js page loads with no errors.

- [ ] **Step 3: Remove boilerplate content**

Delete default content, keep structure. Edit `website/src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-[#050510] text-white flex items-center justify-center">
      <p className="text-white/40 text-sm">Super.js website — coming soon</p>
    </main>
  )
}
```

Delete `website/src/app/globals.css` content below the Tailwind directives (remove the `:root` variables and `.page` styles Vercel ships by default).

- [ ] **Step 4: Verify clean start**

```bash
npm run dev
```

Expected: dark page with "Super.js website — coming soon" text, no errors.

- [ ] **Step 5: Commit**

```bash
git add website/
git commit -m "feat(website): scaffold Next.js 16 project"
```

---

### Task 2: Configure Tailwind v4 + CSS variables

**Files:**
- Modify: `website/src/app/globals.css`
- Modify: `website/tailwind.config.ts`

- [ ] **Step 1: Replace globals.css**

```css
/* website/src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-bg-deep: #050510;
  --color-bg-dark: #0d1117;
  --color-bg-card: #0f1117;
  --color-border: rgba(255, 255, 255, 0.08);

  --color-orange: #f97316;
  --color-amber: #fbbf24;
  --color-orange-dim: rgba(249, 115, 22, 0.15);
  --color-amber-dim: rgba(251, 191, 36, 0.12);

  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-text-subtle: rgba(248, 250, 252, 0.4);

  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), "Fira Code", monospace;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-bg-deep);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg-deep); }
::-webkit-scrollbar-thumb { background: rgba(249, 115, 22, 0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(249, 115, 22, 0.5); }
```

- [ ] **Step 2: Update tailwind.config.ts**

```ts
// website/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
```

- [ ] **Step 3: Verify Tailwind classes work**

In `page.tsx` temporarily add `className="text-orange-500"` to the paragraph. Check browser — text should be orange.

- [ ] **Step 4: Commit**

```bash
git add website/src/app/globals.css website/tailwind.config.ts
git commit -m "feat(website): configure Tailwind v4 + CSS variables (orange/amber palette)"
```

---

### Task 3: Root layout with Geist font

**Files:**
- Modify: `website/src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

```tsx
// website/src/app/layout.tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Super.js — JavaScript, Perfected',
    template: '%s | Super.js',
  },
  description:
    'A null-safe, sum-typed superset of JavaScript. Compile to plain JS with zero runtime overhead.',
  keywords: ['javascript', 'typescript', 'superset', 'type safety', 'sum types', 'match expressions'],
  openGraph: {
    title: 'Super.js — JavaScript, Perfected',
    description: 'Null-safe. Sum types. Match expressions. Zero runtime overhead.',
    url: 'https://superjs.dev',
    siteName: 'Super.js',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Super.js — JavaScript, Perfected',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-[#050510] text-[#f8fafc] font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Install Geist if not already present**

```bash
cd website
npm install geist
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Expected: no TypeScript errors, page renders with Geist font loaded (check DevTools Network tab for font files).

- [ ] **Step 4: Commit**

```bash
git add website/src/app/layout.tsx website/package.json website/package-lock.json
git commit -m "feat(website): root layout with Geist font + Open Graph metadata"
```

---

### Task 4: Navbar component

**Files:**
- Create: `website/src/components/ui/Navbar.tsx`
- Create: `website/src/components/ui/Button.tsx`
- Modify: `website/src/app/layout.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// website/src/components/ui/Button.tsx
import Link from 'next/link'
import { type ComponentProps } from 'react'

type ButtonProps = {
  variant?: 'primary' | 'ghost'
  href?: string
  size?: 'sm' | 'md'
} & ComponentProps<'button'>

export function Button({
  variant = 'primary',
  href,
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
  }
  const variants = {
    primary:
      'bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:from-orange-400 hover:to-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]',
    ghost:
      'border border-white/10 text-white/70 hover:border-white/25 hover:text-white bg-transparent',
  }

  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create Navbar component**

```tsx
// website/src/components/ui/Navbar.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from './Button'

const NAV_LINKS = [
  { label: 'Docs', href: '/docs' },
  { label: 'Playground', href: '/playground' },
  { label: 'Blog', href: '/blog' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#050510]/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 font-bold text-lg">
          <span className="text-white">Super</span>
          <span className="text-orange-500">.</span>
          <span className="text-white">js</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hbarve1/super-js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <Button href="/docs" size="sm">Get Started</Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#050510] px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hbarve1/super-js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white"
          >
            GitHub
          </a>
          <Button href="/docs" size="sm" className="w-fit">Get Started</Button>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 3: Add Navbar to layout**

In `website/src/app/layout.tsx`, add `<Navbar />` inside `<body>` before `{children}`:

```tsx
import { Navbar } from '@/components/ui/Navbar'

// inside <body>:
<Navbar />
{children}
```

- [ ] **Step 4: Add padding-top to main in page.tsx to account for sticky navbar**

```tsx
<main className="min-h-screen bg-[#050510] text-white flex items-center justify-center pt-14">
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Expected: sticky dark navbar with "Super.js" logo, nav links, "Get Started" orange button. Mobile hamburger toggles menu. No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add website/src/components/ website/src/app/layout.tsx website/src/app/page.tsx
git commit -m "feat(website): Navbar + Button components"
```

---

### Task 5: Cloudflare Pages config

**Files:**
- Modify: `website/next.config.ts`
- Create: `website/wrangler.toml`
- Modify: `website/package.json` (add CF build script)

- [ ] **Step 1: Install Cloudflare adapter**

```bash
cd website
npm install -D @cloudflare/next-on-pages
```

- [ ] **Step 2: Update next.config.ts**

```ts
// website/next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for @cloudflare/next-on-pages
  // Edge runtime is set per-route; here we just ensure compatibility
  experimental: {},
  images: {
    // Cloudflare Images or unoptimized for static export
    unoptimized: true,
  },
}

export default nextConfig
```

- [ ] **Step 3: Create wrangler.toml**

```toml
# website/wrangler.toml
name = "superjs-website"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

- [ ] **Step 4: Add CF build scripts to package.json**

In `website/package.json`, add to `"scripts"`:
```json
"build:cf": "npx @cloudflare/next-on-pages",
"preview:cf": "npm run build:cf && npx wrangler pages dev .vercel/output/static",
"deploy:cf": "npm run build:cf && npx wrangler pages deploy .vercel/output/static --project-name superjs-website"
```

- [ ] **Step 5: Test CF build locally**

```bash
cd website
npm run build:cf
```

Expected: `.vercel/output/static/` directory created. May warn about edge runtime for some routes — that's fine for now.

- [ ] **Step 6: Commit**

```bash
git add website/next.config.ts website/wrangler.toml website/package.json website/package-lock.json
git commit -m "feat(website): Cloudflare Pages adapter + build scripts"
```

---

### Task 6: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/website.yml`

- [ ] **Step 1: Create workflow file**

```yaml
# .github/workflows/website.yml
name: Deploy Website

on:
  push:
    branches: [master]
    paths:
      - 'website/**'
      - '.github/workflows/website.yml'

jobs:
  deploy:
    name: Build and deploy to Cloudflare Pages
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: website/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: website

      - name: Build for Cloudflare Pages
        run: npx @cloudflare/next-on-pages
        working-directory: website

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy .vercel/output/static --project-name=superjs-website
          workingDirectory: website
```

- [ ] **Step 2: Add secrets to GitHub repo (manual step)**

Go to repo Settings → Secrets → add:
- `CF_API_TOKEN` — Cloudflare API token with "Cloudflare Pages: Edit" permission
- `CF_ACCOUNT_ID` — found at Cloudflare dashboard → right sidebar

Document this in `website/README.md`:
```markdown
## Deployment

Deploys to Cloudflare Pages on push to `master` (when `website/` changes).

Required GitHub secrets:
- `CF_API_TOKEN` — Cloudflare API token (Pages: Edit permission)
- `CF_ACCOUNT_ID` — Cloudflare account ID

Local preview: `npm run preview:cf`
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/website.yml website/README.md
git commit -m "feat(website): GitHub Actions deploy workflow for Cloudflare Pages"
```

---

### Task 7: Verify end-to-end

- [ ] **Step 1: Full local build**

```bash
cd website
npm run build
```

Expected: Next.js static build completes, 0 TypeScript errors.

- [ ] **Step 2: CF build**

```bash
npm run build:cf
```

Expected: `.vercel/output/static/` populated.

- [ ] **Step 3: Push to a test branch and verify CI**

```bash
git push origin HEAD
```

Check GitHub Actions tab — workflow should trigger if `website/**` changed. (Deploy step will fail without CF secrets set, but the build step should pass.)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git commit -m "fix(website): resolve build issues"
```

---

## Done Signal

- `npm run dev` → dark page, Navbar renders, orange CTA button works
- `npm run build` → 0 TypeScript errors
- `npm run build:cf` → CF output produced
- GitHub Actions workflow exists and triggers on `website/**` push
- All routes (`/`, `/docs`, `/playground`, `/blog`) render (stubs OK)
