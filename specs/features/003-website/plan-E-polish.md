# Website Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six-area quality pass — OG image, SEO routes, accessibility, copy button for code blocks, Pagefind search quality, docs mobile sidebar, hero performance, and mobile layout.

**Architecture:** All changes are isolated to `website/src/` or `website/`. Each task touches 1–3 files. No new dependencies required. Build verification after each task: `cd website && npx tsc --noEmit && npm run build`.

**Tech Stack:** Next.js 16 App Router · `next/og` ImageResponse · Tailwind CSS v4 · Pagefind · React Three Fiber

**Worktree:** `.worktrees/008-website-polish` — all commands run from inside `website/` unless stated.

---

## File Map

| File | Action | Task |
|------|--------|------|
| `website/src/app/opengraph-image.tsx` | Create | E-1 |
| `website/src/app/sitemap.ts` | Create | E-2 |
| `website/src/app/robots.ts` | Create | E-2 |
| `website/src/app/global-error.tsx` | Create | E-2 |
| `website/src/app/layout.tsx` | Modify | E-3 |
| `website/src/app/page.tsx` | Modify | E-3 |
| `website/src/components/ui/Button.tsx` | Modify | E-3 |
| `website/src/components/ui/Navbar.tsx` | Modify | E-3 |
| `website/src/components/playground/Editor.tsx` | Modify | E-3 |
| `website/src/components/ui/CodeBlock.tsx` | Create | E-4 |
| `website/src/components/docs/DocContent.tsx` | Modify | E-4, E-5 |
| `website/src/components/docs/Sidebar.tsx` | Modify | E-5, E-6 |
| `website/src/components/docs/TableOfContents.tsx` | Modify | E-5 |
| `website/src/components/hero/index.tsx` | Modify | E-7 |
| `website/src/components/sections/PlaygroundEmbed.tsx` | Modify | E-8 |
| `website/next.config.ts` | Modify | E-8 |

---

### Task E-1: Static OG Image

**Files:**
- Create: `website/src/app/opengraph-image.tsx`

The Next.js file convention `app/opengraph-image.tsx` generates a static `og:image` PNG during `npm run build`. No runtime needed — works on Cloudflare Pages static output.

- [ ] **Step 1: Create `website/src/app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og'

export const alt = 'Super.js — JavaScript, Perfected.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#050510',
          display: 'flex',
          alignItems: 'center',
          padding: '60px 80px',
          gap: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left: wordmark + tagline + chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '0 0 380px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '72px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-2px' }}>
              Super
            </span>
            <span style={{ fontSize: '72px', fontWeight: 900, color: '#f97316' }}>.</span>
            <span style={{ fontSize: '72px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-2px' }}>
              js
            </span>
          </div>
          <div style={{ fontSize: '22px', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase' }}>
            JavaScript, Perfected.
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {['null-safe', 'sum types', 'match'].map((label) => (
              <div
                key={label}
                style={{
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid #f97316',
                  color: '#f97316',
                  fontSize: '14px',
                  padding: '4px 14px',
                  borderRadius: '999px',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: code panel */}
        <div
          style={{
            flex: 1,
            background: '#0d1117',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* glow */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%)',
            }}
          />
          <div style={{ fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7 }}>
            <span style={{ color: '#f97316' }}>type </span>
            <span style={{ color: '#fbbf24' }}>Result</span>
            <span style={{ color: '#94a3b8' }}>&lt;T, E&gt; = </span>
            <span style={{ color: '#fbbf24' }}>Ok</span>
            <span style={{ color: '#94a3b8' }}>(T) | </span>
            <span style={{ color: '#fbbf24' }}>Err</span>
            <span style={{ color: '#94a3b8' }}>(E)</span>
          </div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7, marginTop: '8px' }}>
            <span style={{ color: '#f97316' }}>match </span>
            <span style={{ color: '#f8fafc' }}>r </span>
            <span style={{ color: '#94a3b8' }}>{'{'}</span>
          </div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7, paddingLeft: '40px' }}>
            <span style={{ color: '#fbbf24' }}>Ok</span>
            <span style={{ color: '#94a3b8' }}>(v) =&gt; </span>
            <span style={{ color: '#86efac' }}>console.log</span>
            <span style={{ color: '#94a3b8' }}>(v),</span>
          </div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7, paddingLeft: '40px' }}>
            <span style={{ color: '#fbbf24' }}>Err</span>
            <span style={{ color: '#94a3b8' }}>(e) =&gt; </span>
            <span style={{ color: '#86efac' }}>console.error</span>
            <span style={{ color: '#94a3b8' }}>(e)</span>
          </div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7 }}>
            <span style={{ color: '#94a3b8' }}>{'}'}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

- [ ] **Step 2: Update `og:image` URL in `website/src/app/layout.tsx` metadata**

The file-convention OG image is auto-wired, but add an explicit URL so it's included in `og:image` meta tags for external scrapers. Change the `openGraph` block:

```ts
openGraph: {
  title: 'Super.js — JavaScript, Perfected',
  description: 'Null-safe. Sum types. Match expressions. Zero runtime overhead.',
  url: 'https://superjs.dev',
  siteName: 'Super.js',
  type: 'website',
  images: [{ url: 'https://superjs.dev/opengraph-image', width: 1200, height: 630, alt: 'Super.js — JavaScript, Perfected.' }],
},
twitter: {
  card: 'summary_large_image',
  title: 'Super.js — JavaScript, Perfected',
  images: ['https://superjs.dev/opengraph-image'],
},
```

- [ ] **Step 3: Verify type check**

```bash
cd website && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build and check OG image renders**

```bash
cd website && npm run build
```

Expected: build succeeds. The file `.next/server/app/opengraph-image.png` (or similar) exists.

```bash
ls .next/server/app/opengraph-image* 2>/dev/null || ls .next/static/media/opengraph-image* 2>/dev/null
```

- [ ] **Step 5: Commit**

```bash
git add website/src/app/opengraph-image.tsx website/src/app/layout.tsx
git commit -m "feat(website): static OG image via next/og ImageResponse"
```

---

### Task E-2: SEO Routes + global-error fix

**Files:**
- Create: `website/src/app/sitemap.ts`
- Create: `website/src/app/robots.ts`
- Create: `website/src/app/global-error.tsx`

- [ ] **Step 1: Create `website/src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'
import { getAllDocSlugs } from '@/lib/docs'
import { getAllPostSlugs } from '@/lib/blog'

const BASE = 'https://superjs.dev'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docSlugs = await getAllDocSlugs()   // string[][]
  const postSlugs = await getAllPostSlugs() // string[]

  const docEntries: MetadataRoute.Sitemap = docSlugs.map((segments) => ({
    url: `${BASE}/docs/${segments.join('/')}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const blogEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [
    { url: BASE, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/playground`, changeFrequency: 'monthly', priority: 0.5 },
    ...docEntries,
    ...blogEntries,
  ]
}
```

- [ ] **Step 2: Create `website/src/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://superjs.dev/sitemap.xml',
  }
}
```

- [ ] **Step 3: Create `website/src/app/global-error.tsx`**

This fixes the Pagefind warning about missing `lang` attribute on `/_global-error.html`.

```tsx
'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#050510',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
        <button
          onClick={reset}
          style={{
            padding: '8px 20px',
            background: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Type check and build**

```bash
cd website && npx tsc --noEmit && npm run build
```

Expected: build succeeds, Pagefind output no longer reports missing `lang` attribute.

- [ ] **Step 5: Commit**

```bash
git add website/src/app/sitemap.ts website/src/app/robots.ts website/src/app/global-error.tsx
git commit -m "feat(website): sitemap, robots.txt, global-error with lang attr"
```

---

### Task E-3: Accessibility — skip link, focus rings, aria labels

**Files:**
- Modify: `website/src/app/layout.tsx`
- Modify: `website/src/app/page.tsx`
- Modify: `website/src/components/ui/Button.tsx`
- Modify: `website/src/components/ui/Navbar.tsx`
- Modify: `website/src/components/playground/Editor.tsx`

- [ ] **Step 1: Add skip-to-content link to `website/src/app/layout.tsx`**

Add immediately before `<Navbar />` inside `<body>`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
>
  Skip to content
</a>
<Navbar />
```

- [ ] **Step 2: Add `id="main-content"` to `website/src/app/page.tsx`**

Change:
```tsx
<main className="bg-[#050510]">
```
To:
```tsx
<main id="main-content" className="bg-[#050510]">
```

- [ ] **Step 3: Add focus ring to `website/src/components/ui/Button.tsx`**

In the `base` string, add `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500`:

```ts
const base =
  'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'
```

- [ ] **Step 4: Update aria labels in `website/src/components/ui/Navbar.tsx`**

Change the hamburger button to use dynamic aria-label based on `open` state. Replace the existing button:

```tsx
<button
  className="md:hidden p-2 text-white/60 hover:text-white"
  onClick={() => setOpen(!open)}
  aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
  aria-expanded={open}
>
```

Add `aria-label` to the GitHub link in the desktop nav (line ~38):

```tsx
<a
  href="https://github.com/hbarve1/super-js"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="View Super.js on GitHub"
  className="text-sm text-white/60 hover:text-white transition-colors"
>
  GitHub
</a>
```

Also update the same GitHub link in the mobile menu (line ~79) with the same `aria-label`.

- [ ] **Step 5: Add aria attributes to `website/src/components/playground/Editor.tsx`**

Wrap the Monaco editor in an accessible container. In the JSX, wrap `<MonacoEditor .../>` with:

```tsx
<div role="application" aria-label="Super.js code editor" className="h-full">
  <MonacoEditor ... />
</div>
```

Update the Run button to add `aria-keyshortcuts`:

```tsx
<button
  onClick={onRun}
  aria-keyshortcuts="Control+Enter Meta+Enter"
  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded hover:opacity-90 transition-opacity"
>
```

- [ ] **Step 6: Type check**

```bash
cd website && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add website/src/app/layout.tsx website/src/app/page.tsx \
  website/src/components/ui/Button.tsx website/src/components/ui/Navbar.tsx \
  website/src/components/playground/Editor.tsx
git commit -m "feat(website): accessibility — skip link, focus rings, aria labels"
```

---

### Task E-4: Copy button for docs code blocks

**Files:**
- Create: `website/src/components/ui/CodeBlock.tsx`
- Modify: `website/src/components/docs/DocContent.tsx`

No existing `CodeBlock.tsx`. MDX fenced code blocks render as `<pre><code>`. We add a custom `pre` component to `mdxComponents` that wraps in a client component with copy functionality.

- [ ] **Step 1: Create `website/src/components/ui/CodeBlock.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'

export function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = preRef.current?.textContent ?? ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative group my-4">
      <pre
        ref={preRef}
        className="overflow-x-auto p-4 rounded-lg bg-[#0d1117] border border-white/10 text-sm font-mono text-[#e2e8f0] leading-relaxed"
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        aria-label={copied ? 'Copied!' : 'Copy code'}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-[#94a3b8] hover:text-white"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add `pre` to `mdxComponents` in `website/src/components/docs/DocContent.tsx`**

Add import at top:
```tsx
import { CodeBlockWrapper } from '@/components/ui/CodeBlock'
```

Add `pre` entry to `mdxComponents` object (after the `hr` entry):
```tsx
pre: (props: React.ComponentPropsWithoutRef<'pre'>) => (
  <CodeBlockWrapper>{props.children}</CodeBlockWrapper>
),
```

- [ ] **Step 3: Type check**

```bash
cd website && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build and spot-check**

```bash
cd website && npm run build
```

Visit `/docs/intro` in the dev server and hover a code block to verify the copy button appears.

```bash
cd website && npm run dev
```

Open `http://localhost:3000/docs/language-reference` — hover any fenced code block, copy button appears top-right. Click it, check clipboard. Button changes to "Copied" then reverts.

Stop dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add website/src/components/ui/CodeBlock.tsx website/src/components/docs/DocContent.tsx
git commit -m "feat(website): copy button on docs code blocks"
```

---

### Task E-5: Pagefind search quality

**Files:**
- Modify: `website/src/components/docs/DocContent.tsx`
- Modify: `website/src/components/docs/Sidebar.tsx`
- Modify: `website/src/components/docs/TableOfContents.tsx`

`data-pagefind-body` restricts indexing to doc content only. `data-pagefind-ignore` excludes nav from results.

- [ ] **Step 1: Add `data-pagefind-body` to `website/src/components/docs/DocContent.tsx`**

Change the `<article>` element:
```tsx
<article className="flex-1 min-w-0 max-w-3xl py-8" data-pagefind-body>
```

- [ ] **Step 2: Add `data-pagefind-ignore` to `website/src/components/docs/Sidebar.tsx`**

Change the `<nav>` root:
```tsx
<nav data-pagefind-ignore>
```

- [ ] **Step 3: Add `data-pagefind-ignore` to `website/src/components/docs/TableOfContents.tsx`**

Change the `<aside>` root:
```tsx
<aside className="w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pl-4" data-pagefind-ignore>
```

- [ ] **Step 4: Rebuild and verify Pagefind indexes doc content**

```bash
cd website && npm run build
```

Expected Pagefind output shows word count increased (was ~1521 words — with `data-pagefind-body` scoped to doc articles it may be lower but more precise).

- [ ] **Step 5: Commit**

```bash
git add website/src/components/docs/DocContent.tsx \
  website/src/components/docs/Sidebar.tsx \
  website/src/components/docs/TableOfContents.tsx
git commit -m "feat(website): Pagefind search quality — data-pagefind-body on content, ignore nav"
```

---

### Task E-6: Docs sidebar mobile drawer

**Files:**
- Modify: `website/src/components/docs/Sidebar.tsx`

Currently the sidebar is always visible. On mobile it pushes content off-screen. Replace with a drawer that slides in from the left.

- [ ] **Step 1: Rewrite `website/src/components/docs/Sidebar.tsx`**

Full replacement (preserves all existing desktop functionality, adds mobile drawer):

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { NavItem } from '@/lib/docs'

interface SidebarProps {
  items: NavItem[]
}

function SidebarNav({ items, onLinkClick }: { items: NavItem[]; onLinkClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav data-pagefind-ignore>
      <div className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-4 px-3">
        Documentation
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.slug}>
              <Link
                href={item.href}
                onClick={onLinkClick}
                className={[
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[#f97316]/15 text-[#f97316] font-medium'
                    : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/5',
                ].join(' ')}
              >
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default function Sidebar({ items }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:block w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
        <SidebarNav items={items} />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open documentation menu"
        className="md:hidden fixed bottom-6 left-4 z-40 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-orange-500/30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Docs
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-[#0d1117] border-r border-white/10 overflow-y-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold text-[#f8fafc]">Documentation</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close documentation menu"
                className="p-1 text-[#94a3b8] hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarNav items={items} onLinkClick={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd website && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build**

```bash
cd website && npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/docs/Sidebar.tsx
git commit -m "feat(website): docs sidebar mobile drawer"
```

---

### Task E-7: Hero deferred canvas + responsive height

**Files:**
- Modify: `website/src/components/hero/index.tsx`

Two changes: (1) defer WebGL init by 100ms so browser paints LCP text first, (2) use `h-[100svh]` for mobile browser chrome awareness, (3) add `touch-none` to prevent scroll hijack on iOS.

- [ ] **Step 1: Rewrite `website/src/components/hero/index.tsx`**

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { HeroContent } from './HeroContent'

const EvolutionScene = dynamic(
  () => import('./EvolutionScene').then((m) => m.EvolutionScene),
  { ssr: false }
)

export function Hero() {
  const { progress, containerRef } = useScrollProgress(2400)
  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setCanvasReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100svh] bg-[#050510] overflow-hidden touch-none"
    >
      {canvasReady && <EvolutionScene progress={progress} />}
      <HeroContent progress={progress} />
    </div>
  )
}
```

- [ ] **Step 2: Type check and build**

```bash
cd website && npx tsc --noEmit && npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add website/src/components/hero/index.tsx
git commit -m "perf(website): defer R3F canvas 100ms, use 100svh for mobile hero"
```

---

### Task E-8: Performance config + playground mobile

**Files:**
- Modify: `website/next.config.ts`
- Modify: `website/src/components/sections/PlaygroundEmbed.tsx`

- [ ] **Step 1: Add `optimizePackageImports` to `website/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

- [ ] **Step 2: Fix PlaygroundEmbed mobile layout in `website/src/components/sections/PlaygroundEmbed.tsx`**

Change the `<Playground>` call to pass a responsive height. On mobile (under md breakpoint) the editor and output should each be 220px + 160px = 380px total stacked. On desktop keep 380px side-by-side.

Replace:
```tsx
<Playground initialCode={EMBED_CODE} height="380px" />
```

With:
```tsx
<div className="block md:hidden">
  <Playground initialCode={EMBED_CODE} height="420px" />
</div>
<div className="hidden md:block">
  <Playground initialCode={EMBED_CODE} height="380px" />
</div>
```

Also open `website/src/components/playground/Playground.tsx` and add `min-h-0` to both flex children to prevent overflow:

Current:
```tsx
<div className="flex-1 min-h-0">
  <Editor value={code} onChange={setCode} onRun={handleRun} />
</div>
<div className="flex-1 min-h-0">
  <OutputPanel ... />
</div>
```

These already have `min-h-0` — no change needed if present. If not present, add it.

- [ ] **Step 3: Type check and build**

```bash
cd website && npx tsc --noEmit && npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add website/next.config.ts website/src/components/sections/PlaygroundEmbed.tsx
git commit -m "perf(website): optimizePackageImports for Three.js, fix playground mobile layout"
```

---

### Final verification

- [ ] **Full build passes**

```bash
cd website && npm run build 2>&1 | tail -20
```

Expected: all pages static/SSG, no errors, Pagefind indexes 15 pages.

- [ ] **Type check clean**

```bash
cd website && npx tsc --noEmit
```

Expected: no output (zero errors).
