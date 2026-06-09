# Super.js Website Polish Design Spec

**Date:** 2026-06-01
**Status:** Approved
**Branch:** `008-website-polish` (from `007-website`)

---

## Goal

Six-area quality pass on the Next.js 16 website: OG image + SEO, code block UX, search quality, mobile layout, performance, and accessibility.

---

## Tech Stack (unchanged)

Next.js 16 App Router · Tailwind CSS v4 · React Three Fiber · Shiki · Pagefind · Cloudflare Pages

---

## Area 1: OG Image + SEO

### OG Image

**File:** `website/src/app/opengraph-image.tsx`

Next.js file-convention static OG image. `ImageResponse` at 1200×630px. Exported with `export const size` and `export const contentType`. At build time Next.js renders it to a PNG and wires it into `<meta og:image>` automatically — no runtime server needed, compatible with Cloudflare Pages static output.

**Visual design (code-preview style):**
- Background: `#050510` full bleed
- Left 40%: `Super.js` wordmark (white, 72px, bold) + `JavaScript, Perfected.` subtitle (slate-400, 24px) + three orange pill chips: `null-safe`, `sum types`, `match`
- Right 55%: dark code panel (`#0d1117`, rounded-xl, border `#1e293b`) showing:

```
type Result<T, E> = Ok(T) | Err(E)

match r {
  Ok(v)  => console.log(v),
  Err(e) => console.error(e)
}
```

Colors: `type`/`match` → `#f97316` (orange), `Result`/`Ok`/`Err` → `#fbbf24` (amber), identifiers → `#f8fafc`, strings → `#86efac`, comments → `#475569`

- Orange gradient glow behind code panel: `radial-gradient(ellipse at 80% 50%, #f9731615, transparent 60%)`

**Update `layout.tsx` metadata:**
```ts
openGraph: {
  images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  // existing fields unchanged
}
```

### SEO Files

**`website/src/app/sitemap.ts`**

Returns `MetadataRoute.Sitemap` with:
- `/` — `changeFrequency: 'monthly'`, `priority: 1.0`
- `/docs/[slug]` — one entry per doc file from `getAllDocSlugs()`, `changeFrequency: 'weekly'`, `priority: 0.8`
- `/blog/[slug]` — one entry per post from `getAllPostSlugs()`, `changeFrequency: 'monthly'`, `priority: 0.6`
- `/playground` — `changeFrequency: 'monthly'`, `priority: 0.5`

Base URL: `https://superjs.dev`

**`website/src/app/robots.ts`**

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://superjs.dev/sitemap.xml',
  }
}
```

### global-error fix

**`website/src/app/global-error.tsx`**

```tsx
'use client'
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#050510] text-[#f8fafc] flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <button onClick={reset} className="px-4 py-2 bg-orange-500 rounded">Try again</button>
        </div>
      </body>
    </html>
  )
}
```

---

## Area 2: Code Block UX

### CopyButton component

**`website/src/components/ui/CopyButton.tsx`** — `'use client'`

State: `copied: boolean`. On click: `navigator.clipboard.writeText(code)`, set `copied = true`, reset after 2000ms. Renders a small icon button positioned absolute top-right of the code block. Two states: clipboard icon (default) → checkmark (copied).

No external icon library — use inline SVG paths for clipboard and check icons.

### CodeBlock update

**`website/src/components/ui/CodeBlock.tsx`** (existing server component)

Wrap the `<div dangerouslySetInnerHTML>` in a `<div className="relative group">`. Render `<CopyButton code={code} />` as a sibling — absolute `top-2 right-2`, visible on `group-hover` via `opacity-0 group-hover:opacity-100 transition-opacity`.

Pass raw `code` string as prop to CopyButton (already available in the server component before highlight call).

---

## Area 3: Search Quality

**`website/src/components/docs/DocContent.tsx`**

Add `data-pagefind-body` attribute to the outermost `<div>` wrapper around MDX content. This tells Pagefind to index only this region.

**`website/src/components/docs/Sidebar.tsx`**

Add `data-pagefind-ignore` to the `<nav>` root element.

**`website/src/components/docs/TableOfContents.tsx`**

Add `data-pagefind-ignore` to the root `<nav>` element.

Rebuild Pagefind after these changes — the postbuild script handles it automatically on `npm run build`.

---

## Area 4: Mobile Layout

### Hero section

**`website/src/components/hero/index.tsx`**

- Canvas height: `h-[100svh]` (uses `svh` for mobile browser chrome awareness) instead of fixed `h-screen`
- `scrollHeight` stays 2400px on desktop; on mobile (detect via `window.innerWidth < 768` inside `useScrollProgress`) reduce to 1200px so the hero doesn't consume 3× the viewport
- Add `touch-none` to canvas wrapper to prevent scroll hijacking on touch

### Docs sidebar mobile

**`website/src/components/docs/Sidebar.tsx`** — already `'use client'`

Add `isMobileOpen: boolean` state. On mobile (`md:hidden`), render a slide-in drawer:
- Hamburger toggle button: fixed bottom-right `md:hidden`, orange circle button `☰`
- Drawer: full-height left panel, `translate-x-0` when open / `-translate-x-full` when closed, `transition-transform`, backdrop overlay `bg-black/50` closes on click

Desktop layout unchanged (`hidden md:block`).

### PlaygroundEmbed mobile

**`website/src/components/sections/PlaygroundEmbed.tsx`**

On mobile the `flex-col` stack already applies. Set editor height to `220px` and output height to `160px` on mobile by passing a responsive `height` map instead of a single string. Add `min-h-0` to both panels to prevent flex overflow.

---

## Area 5: Performance

### Deferred R3F canvas

**`website/src/components/hero/index.tsx`**

Wrap the dynamic `EvolutionScene` import in an `IntersectionObserver`: don't render the `<Canvas>` component until the hero container enters the viewport (threshold 0.01). Since hero is always first, this fires immediately on load — but the key win is: add a `useState(false)` initialized to `false`, set to `true` after a 100ms `setTimeout` on mount. This allows the browser to paint the initial HTML (LCP text) before initializing WebGL.

```tsx
const [canvasReady, setCanvasReady] = useState(false)
useEffect(() => {
  const t = setTimeout(() => setCanvasReady(true), 100)
  return () => clearTimeout(t)
}, [])
```

### Font preconnect

**`website/src/app/layout.tsx`**

Not needed — Geist fonts are served from the same origin (self-hosted via npm package). No external font CDN.

### next.config.ts

Enable `experimental.optimizePackageImports` for heavy packages:
```ts
experimental: {
  optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
}
```

---

## Area 6: Accessibility

### Skip-to-content link

**`website/src/app/layout.tsx`**

Add before `<Navbar />`:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded focus:font-semibold"
>
  Skip to content
</a>
```

Add `id="main-content"` to the `<main>` in `page.tsx` and the docs content wrapper.

### Navbar aria labels

**`website/src/components/ui/Navbar.tsx`**

- Hamburger button: add `aria-label="Open navigation menu"` / `aria-label="Close navigation menu"` toggled by `isOpen` state
- GitHub icon link: add `aria-label="View Super.js on GitHub"`

### Button focus ring

**`website/src/components/ui/Button.tsx`**

Add `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500` to both variants. Remove `outline-none` if present.

### Playground keyboard

**`website/src/components/playground/Editor.tsx`**

Wrap the Monaco container `<div>` with `role="application"` and `aria-label="Super.js code editor"`. The Run button already has visible text — add `aria-keyshortcuts="Control+Enter Meta+Enter"`.

---

## File Summary

| File | Action |
|------|--------|
| `src/app/opengraph-image.tsx` | Create |
| `src/app/sitemap.ts` | Create |
| `src/app/robots.ts` | Create |
| `src/app/global-error.tsx` | Create |
| `src/app/layout.tsx` | Modify (skip link, og image meta) |
| `src/app/page.tsx` | Modify (id="main-content" on main) |
| `src/components/ui/CopyButton.tsx` | Create |
| `src/components/ui/CodeBlock.tsx` | Modify (add CopyButton) |
| `src/components/ui/Button.tsx` | Modify (focus ring) |
| `src/components/ui/Navbar.tsx` | Modify (aria labels) |
| `src/components/docs/DocContent.tsx` | Modify (data-pagefind-body) |
| `src/components/docs/Sidebar.tsx` | Modify (pagefind-ignore, mobile drawer) |
| `src/components/docs/TableOfContents.tsx` | Modify (pagefind-ignore) |
| `src/components/hero/index.tsx` | Modify (canvas defer, svh, touch-none) |
| `src/components playground/Editor.tsx` | Modify (aria) |
| `src/components/sections/PlaygroundEmbed.tsx` | Modify (mobile heights) |
| `next.config.ts` | Modify (optimizePackageImports) |

---

## Out of Scope

- Dark/light toggle
- i18n
- Analytics
- Blog RSS feed
- Animation redesign (only defer canvas mount, no choreography changes)
