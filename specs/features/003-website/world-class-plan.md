# SuperJS Website — World-Class Plan

**Status:** Proposed. Sequenced into P0/P1/P2; each task is one PR.
**Baseline:** the site shipped in Phases A–E (Next 16, App Router, deployed on Vercel at `super-js-hbarve1-com.vercel.app`, domain → `superjs.org`). Landing (3D hero, Features, Compare, PlaygroundEmbed, Quickstart, Ecosystem, CTA), Docs (8 pages, sidebar/TOC/Pagefind), Blog (2 posts), live Playground on the real `@superjs/compiler`.

---

## 1. North Star

> **A developer lands, *gets* SuperJS in 10 seconds, proves it themselves in 60, and leaves with the install command run.**

Positioning: **"JavaScript, perfected — null-safe, sum-typed, zero runtime."** The site must do three jobs, in order:
1. **Convince** — why this exists, why now, why not just TypeScript. (Narrative)
2. **Prove** — let them feel it: live compile, real errors caught, real JS out. (Interactive proof)
3. **Convert** — install, docs, star, join. (Funnel)

Every section maps to one of those jobs or it's cut.

---

## 2. Benchmarks (what "world-class" looks like — and what to steal)

| Site | Steal this |
|---|---|
| **rust-lang.org** | Clear audience segmentation ("Who's using"), production logos, honest "why" |
| **bun.sh** | Benchmark-driven hero, speed as identity, copy-paste install front-and-center |
| **astro.build** | Design polish, "islands" concept sold visually, themed code samples |
| **svelte.dev** | Interactive tutorial (in-browser, stepped) — the gold standard for "prove it" |
| **effect.website / biomejs.dev** | Dense but navigable docs, strong typographic system, versioned |
| **deno.com / zig** | Honest comparison tables, runtime-fidelity demos |
| **typescriptlang.org** | Playground depth: shareable URLs, config, examples gallery, d.ts output |

Common denominators of all of them: **fast (CWV green), one-glance value prop, a thing you can *do* on the page, and credibility signals.**

---

## 3. Gap Audit (baseline → world-class)

**Strong already:** scroll-told 3D hero, real-compiler playground, dark/orange identity, docs scaffold, SSG perf, a11y basics, OG image.

**Gaps blocking "world-class":**
- **Narrative shallow** — Compare is 3 static snippets; no "why not TypeScript" depth, no real-world use cases, no problem→solution arc.
- **Proof is thin** — playground compiles but doesn't **run** (no JS execution/console), no **inline error squiggles**, no **shareable links**, no **examples gallery**, no **guided tour**.
- **No credibility** — no adoption/logos, no GitHub stars badge, no testimonials, no "who it's for."
- **Docs are ported stubs** — need real depth, a Tour, guides, an error-code reference, API.
- **Discoverability** — no per-page OG, no `schema.org` structured data, no `llms.txt`, no analytics, sitemap exists but no canonical/robots polish.
- **Perf risk** — R3F hero is heavy on low-end mobile; no perf budget enforced; fonts/images unoptimized.
- **Brand** — placeholder favicon, no full icon set, no logo lockup, no social handles.
- **Conversion** — single CTA style; no sticky install bar, no newsletter/Discord capture.

---

## 4. Pillars & Workstreams

### P-1 Narrative & Messaging
- Rewrite hero subcopy to lead with the **one** differentiator (null-safety + sum types + zero runtime), not a feature list.
- New **"Why SuperJS"** section: problem (JS unsafe, TS `any` leaks) → solution (sound types, exhaustive match) → payoff (fewer runtime bugs, zero overhead). Three beats, evidence each.
- **Interactive Compare**: tabbed JS / TS / SJS on the *same* program, with annotations highlighting the bug TS misses and SJS catches. Toggle "show the error."
- **"Who it's for"**: 3 personas (TS teams tired of `any`, library authors, correctness-minded).

### P-2 Interactive Proof (the differentiator)
- **Playground v2**:
  - **Run** the compiled JS in a sandboxed iframe → live `console` output (not just compile).
  - **Inline diagnostics** — map compiler `Diagnostic.span` → Monaco markers (squiggles + hover).
  - **Shareable URLs** — encode source in the URL (lz-string), like the TS playground.
  - **Examples gallery** — dropdown of curated snippets (Result/Option, match exhaustiveness, null-safety, generics, JSX).
  - **d.ts / output tabs** — show compiled JS + diagnostics + (later) emitted types.
- **Guided Tour** (`/tour`) — Svelte-style stepped, in-browser lessons: each step = editor + prose + "try it," progressing through the type system. The single highest-leverage "prove it" asset.

### P-3 Design System Elevation
- Adopt **semantic tokens** (canvas/card/ink-1..4/stroke) — borrow the structure from `homelab-viz` (see [reference]). Optional light mode via `@variant dark`.
- **Type scale + rhythm** pass; real **logo/wordmark**; full **favicon/icon set** (`icon.svg`, `apple-icon`, manifest).
- Motion budget: tasteful, reduced-motion-respecting; hero degrades to a static poster on `prefers-reduced-motion` and low-end.

### P-4 Content & Docs
- **Docs depth**: real Getting Started, Language Tour, Type System, Sum Types & Match, Null Safety, Gradual Typing, Interop (.d.ts), CLI, Config, FAQ.
- **Error-code reference** — generated from `@superjs/diagnostics` registry (SJS-E001…), each with example + fix. Wire `superjs explain` ↔ web.
- **Per-token Shiki in MDX** (rehype) so docs code blocks are highlighted, not plain mono.
- **Blog** cadence: launch post, "why we banned `any`", "sum types in practice."
- **`llms.txt`** + per-page descriptions for AI discoverability.

### P-5 Performance (hard budgets)
- Targets: **Lighthouse ≥95** all categories on mobile; **LCP <2.0s, INP <200ms, CLS <0.05** (field + lab).
- Lazy/deferred 3D; route-level code splitting; `next/font` (already Geist); image optimization; preconnect.
- CI **Lighthouse gate** (treosh/lighthouse-ci action) on the website workflow — fail PRs that regress.

### P-6 SEO & Discoverability
- Per-page `generateMetadata` (title/desc/canonical/OG) for docs + blog.
- `schema.org` JSON-LD: `SoftwareApplication` (landing), `TechArticle` (docs/blog), `BreadcrumbList`.
- Canonical to `superjs.org`; verified sitemap/robots; OG image per doc (dynamic `opengraph-image` with title).
- Pagefind index running in the Vercel build (confirm postbuild fires); search analytics.

### P-7 Accessibility (real audit, not vibes)
- axe + Lighthouse a11y in CI; manual keyboard + screen-reader pass on hero, playground (Monaco aria), docs drawer.
- Color-contrast audit with documented ratios (borrow homelab-viz's approach).
- `prefers-reduced-motion` honored across GSAP/framer/R3F.

### P-8 Credibility & Community
- GitHub **star count** badge (live), "Star on GitHub" CTA.
- **Adoption** strip (even if "early — built in the open"); roadmap link; honest status banner (v0.x).
- Community: Discord/Discussions links, **Contributing** page, Code of Conduct surfaced.
- Sponsor/Backers section if applicable.

### P-9 Conversion & Funnel
- **Sticky install bar** (`npm i -g superjs`) with copy button, persistent on landing.
- Primary CTA hierarchy: Try Playground (proof) → Get Started (docs) → Star (credibility).
- Newsletter/Discord capture (low-friction, optional).
- Clear next-step at the end of every docs page (pager already exists — enrich).

### P-10 Measurement
- Privacy-friendly analytics (Vercel Analytics or Plausible).
- Track: hero→playground rate, playground compiles, install-copy clicks, docs entry pages, search queries (Pagefind).
- Funnel dashboard; iterate on the 10s/60s/install goals.

---

## 5. Phased Roadmap (PR-sized)

### P0 — Launch-ready polish (ship the domain proud)
| # | Task | Pillar |
|---|---|---|
| 0.1 | superjs.org domain live on Vercel + DNS (homelab TF) | infra |
| 0.2 | Brand pass: logo/wordmark, full favicon/icon set, manifest | P-3 |
| 0.3 | Hero copy rewrite + `prefers-reduced-motion`/low-end static fallback | P-1/P-3 |
| 0.4 | Per-page metadata + canonical + JSON-LD (SoftwareApplication, TechArticle) | P-6 |
| 0.5 | Lighthouse CI gate + perf budget; confirm CWV green | P-5 |
| 0.6 | a11y audit pass (axe CI + manual) | P-7 |
| 0.7 | Sticky install bar + CTA hierarchy + GitHub stars badge | P-9/P-8 |

### P1 — Differentiation (the "prove it" moat)
| # | Task | Pillar |
|---|---|---|
| 1.1 | Playground v2: inline diagnostics (Monaco markers from spans) | P-2 |
| 1.2 | Playground: run compiled JS in sandboxed iframe + console | P-2 |
| 1.3 | Playground: shareable URLs + examples gallery | P-2 |
| 1.4 | Interactive Compare (tabbed, annotated, "show the error") | P-1 |
| 1.5 | `/tour` — stepped in-browser language tour (3–5 lessons to start) | P-2 |
| 1.6 | "Why SuperJS" + "Who it's for" sections | P-1 |
| 1.7 | Error-code reference generated from `@superjs/diagnostics` | P-4 |

### P2 — Growth & depth
| # | Task | Pillar |
|---|---|---|
| 2.1 | Docs depth: full Tour/Type-System/Interop/CLI/FAQ rewrite | P-4 |
| 2.2 | Per-token Shiki in MDX (rehype) | P-4 |
| 2.3 | Semantic design tokens + optional light mode | P-3 |
| 2.4 | Analytics + funnel dashboard | P-10 |
| 2.5 | Blog cadence + `llms.txt` + RSS | P-4/P-6 |
| 2.6 | Community: Contributing page, Discord, roadmap, sponsors | P-8 |

---

## 6. Definition of Done (world-class bar)
- **Perf:** Lighthouse ≥95 (all categories, mobile); LCP <2.0s, INP <200ms, CLS <0.05.
- **A11y:** zero axe criticals; full keyboard + SR pass; reduced-motion honored.
- **Proof:** a first-time visitor can compile **and run** SJS, see a real caught error, and share a link — without reading docs.
- **SEO:** every route has unique title/desc/OG/canonical + JSON-LD; valid sitemap; indexed.
- **Funnel:** measurable hero→playground→install path.
- **Brand:** consistent logo/icon/social card; no placeholders.

## 7. Risks & Notes
- **3D hero vs perf** — biggest CWV risk; enforce the static fallback + budget early (P0.5).
- **Running user JS** — sandbox in a cross-origin iframe with no network/DOM-escape; never `eval` on the main thread.
- **Compiler bundle in the API route** — keep `/api/compile` lean; the playground "run" executes *output* client-side, not the compiler.
- **Scope creep** — `/tour` (P1.5) is the highest-leverage single asset; prioritize it over breadth.

## 8. References
- Baseline spec: `specs/features/003-website/SPEC.md`
- Design reference: `homelab-viz` (semantic tokens, light/dark, documented contrast)
- Compiler query API for playground/diagnostics: `@superjs/compiler` (`transform`, `diagnosticsFor`, `typeAt`, `symbolAt`)
