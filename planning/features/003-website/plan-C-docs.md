# Super.js Website — Plan C: Docs System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/docs` route — MDX renderer, collapsible sidebar, right-rail TOC, Shiki code blocks, Pagefind search — and port all 8 existing Markdown docs from `docs/docs/` plus two blog posts.

**Architecture:** `app/docs/layout.tsx` wraps `app/docs/[...slug]/page.tsx`. Content lives in `content/docs/` as `.mdx` files. `next-mdx-remote/rsc` renders MDX server-side. Sidebar auto-generated at build time by reading the `content/docs/` file tree + frontmatter. Pagefind runs post-build (`npx pagefind --site .next`) to produce a static search index served by Cloudflare Pages.

**Tech Stack:** Next.js 16 App Router · `next-mdx-remote/rsc` · `gray-matter` · Shiki · `@pagefind/default-ui` · Tailwind CSS v4 · TypeScript 5

**Prerequisite:** Plan A must be complete (`website/` exists, Navbar works, Tailwind v4 configured).

---

## File Map

| File | Purpose |
|---|---|
| `website/src/lib/docs.ts` | Read `content/docs/`, parse frontmatter, build nav tree |
| `website/src/lib/shiki.ts` | Singleton Shiki highlighter with orange/amber theme |
| `website/src/components/docs/Sidebar.tsx` | Collapsible nav tree driven by lib/docs nav data |
| `website/src/components/docs/TableOfContents.tsx` | Right-rail headings extracted from MDX |
| `website/src/components/docs/DocContent.tsx` | MDX renderer wrapper with custom components |
| `website/src/components/ui/CodeBlock.tsx` | Shiki-powered fenced code block (server component) |
| `website/src/app/docs/layout.tsx` | Sidebar + TOC shell, three-column grid |
| `website/src/app/docs/page.tsx` | Redirect to `/docs/intro` |
| `website/src/app/docs/[...slug]/page.tsx` | MDX renderer + generateStaticParams |
| `website/src/app/blog/page.tsx` | Blog index — list all posts sorted by date |
| `website/src/app/blog/[slug]/page.tsx` | Blog post renderer |
| `website/content/docs/intro.mdx` | Ported from `docs/docs/intro.md` |
| `website/content/docs/language-reference.mdx` | Ported from `docs/docs/language-reference.md` |
| `website/content/docs/type-system.mdx` | Ported from `docs/docs/type-system.md` |
| `website/content/docs/specification.mdx` | Ported from `docs/docs/specification.md` |
| `website/content/docs/tooling.mdx` | Ported from `docs/docs/tooling.md` |
| `website/content/docs/examples.mdx` | Ported from `docs/docs/examples.md` |
| `website/content/docs/roadmap.mdx` | Ported from `docs/docs/roadmap.md` |
| `website/content/docs/changelog.mdx` | Ported from `docs/docs/changelog.md` |
| `website/content/blog/2024-01-01-welcome.mdx` | Welcome blog post |
| `website/content/blog/2024-01-15-0-2-0-released.mdx` | 0.2.0 release blog post |
| `website/next.config.ts` | Add MDX plugin (modify from Plan A) |

---

### Task 1: Install docs dependencies

**Files:**
- Modify: `website/package.json` (via npm install)

- [ ] **Step 1: Install MDX, gray-matter, shiki, pagefind**

```bash
cd website
npm install next-mdx-remote gray-matter shiki @pagefind/default-ui
npm install --save-dev @types/mdast
```

- [ ] **Step 2: Verify installs**

```bash
cd website
node -e "require('next-mdx-remote'); require('gray-matter'); require('shiki'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add website/package.json website/package-lock.json
git commit -m "chore(website): install docs dependencies (next-mdx-remote, gray-matter, shiki)"
```

---

### Task 2: Shiki singleton + CodeBlock component

**Files:**
- Create: `website/src/lib/shiki.ts`
- Create: `website/src/components/ui/CodeBlock.tsx`

- [ ] **Step 1: Write failing test**

Create `website/src/__tests__/shiki.test.ts`:

```typescript
import { highlight } from '@/lib/shiki';

test('highlight returns html string with token colors', async () => {
  const html = await highlight('const x = 1', 'javascript');
  expect(html).toContain('<span');
  expect(html).toContain('#f97316'); // orange accent for keywords
});

test('highlight handles unknown lang without throw', async () => {
  await expect(highlight('some text', 'unknownlang')).resolves.toBeDefined();
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
cd website && npx jest src/__tests__/shiki.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create Shiki singleton**

Create `website/src/lib/shiki.ts`:

```typescript
import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const SJS_THEME = {
  name: 'superjs-dark',
  type: 'dark' as const,
  colors: {
    'editor.background': '#050510',
    'editor.foreground': '#f8fafc',
  },
  tokenColors: [
    { scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: '#f97316' } },
    { scope: ['string', 'string.quoted'], settings: { foreground: '#fbbf24' } },
    { scope: ['comment', 'comment.line', 'comment.block'], settings: { foreground: '#4a5568', fontStyle: 'italic' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#93c5fd' } },
    { scope: ['entity.name.type', 'support.class'], settings: { foreground: '#34d399' } },
    { scope: ['variable.other', 'meta.definition.variable'], settings: { foreground: '#f8fafc' } },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#fb923c' } },
    { scope: ['punctuation'], settings: { foreground: '#94a3b8' } },
  ],
};

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [SJS_THEME],
      langs: ['javascript', 'typescript', 'bash', 'json', 'tsx'],
    });
  }
  return highlighterPromise;
}

export async function highlight(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  const supportedLangs = hl.getLoadedLanguages();
  const safeLang = supportedLangs.includes(lang as never) ? lang : 'text';
  return hl.codeToHtml(code, { lang: safeLang, theme: 'superjs-dark' });
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
cd website && npx jest src/__tests__/shiki.test.ts
```

Expected: PASS

- [ ] **Step 5: Create CodeBlock server component**

Create `website/src/components/ui/CodeBlock.tsx`:

```typescript
import { highlight } from '@/lib/shiki';

interface CodeBlockProps {
  code: string;
  lang?: string;
  filename?: string;
}

export default async function CodeBlock({ code, lang = 'text', filename }: CodeBlockProps) {
  const html = await highlight(code, lang);
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 my-4">
      {filename && (
        <div className="px-4 py-2 text-xs text-[#94a3b8] bg-white/5 border-b border-white/10 font-mono">
          {filename}
        </div>
      )}
      <div
        className="overflow-x-auto text-sm [&>pre]:p-4 [&>pre]:m-0 [&>pre]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add website/src/lib/shiki.ts website/src/components/ui/CodeBlock.tsx website/src/__tests__/shiki.test.ts
git commit -m "feat(website): Shiki singleton with orange/amber theme + CodeBlock server component"
```

---

### Task 3: Docs data layer (lib/docs.ts)

**Files:**
- Create: `website/src/lib/docs.ts`

- [ ] **Step 1: Write failing test**

Create `website/src/__tests__/docs.test.ts`:

```typescript
import path from 'path';
import { getDocNavTree, getDocBySlug, getAllDocSlugs } from '@/lib/docs';

test('getAllDocSlugs returns array of slug arrays', async () => {
  const slugs = await getAllDocSlugs();
  expect(Array.isArray(slugs)).toBe(true);
  expect(slugs.length).toBeGreaterThan(0);
  expect(Array.isArray(slugs[0])).toBe(true);
});

test('getDocBySlug returns frontmatter + content for intro', async () => {
  const doc = await getDocBySlug(['intro']);
  expect(doc.frontmatter.title).toBeDefined();
  expect(typeof doc.content).toBe('string');
  expect(doc.content.length).toBeGreaterThan(0);
});

test('getDocNavTree returns sorted nav items', async () => {
  const tree = await getDocNavTree();
  expect(Array.isArray(tree)).toBe(true);
  expect(tree[0]).toHaveProperty('slug');
  expect(tree[0]).toHaveProperty('title');
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
cd website && npx jest src/__tests__/docs.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create lib/docs.ts**

Create `website/src/lib/docs.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');

export interface DocFrontmatter {
  title: string;
  sidebar_position?: number;
  description?: string;
}

export interface NavItem {
  slug: string;
  title: string;
  sidebar_position: number;
  href: string;
}

export interface Doc {
  frontmatter: DocFrontmatter;
  content: string;
  slug: string[];
}

export async function getAllDocSlugs(): Promise<string[][]> {
  const files = fs.readdirSync(DOCS_DIR);
  return files
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(f => [f.replace(/\.(mdx|md)$/, '')]);
}

export async function getDocBySlug(slug: string[]): Promise<Doc> {
  const slugPath = slug.join('/');
  const mdxPath = path.join(DOCS_DIR, `${slugPath}.mdx`);
  const mdPath = path.join(DOCS_DIR, `${slugPath}.md`);
  const filePath = fs.existsSync(mdxPath) ? mdxPath : mdPath;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    frontmatter: data as DocFrontmatter,
    content,
    slug,
  };
}

export async function getDocNavTree(): Promise<NavItem[]> {
  const slugs = await getAllDocSlugs();
  const items: NavItem[] = [];
  for (const slug of slugs) {
    const doc = await getDocBySlug(slug);
    items.push({
      slug: slug.join('/'),
      title: doc.frontmatter.title ?? slug[slug.length - 1],
      sidebar_position: doc.frontmatter.sidebar_position ?? 99,
      href: `/docs/${slug.join('/')}`,
    });
  }
  return items.sort((a, b) => a.sidebar_position - b.sidebar_position);
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
cd website && npx jest src/__tests__/docs.test.ts
```

Expected: PASS (requires `content/docs/intro.mdx` to exist — create a stub if not yet ported)

Stub content if needed:
```bash
mkdir -p website/content/docs
cat > website/content/docs/intro.mdx << 'EOF'
---
title: Introduction
sidebar_position: 1
---

# Introduction to Super.js

Stub — will be replaced in Task 5.
EOF
```

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/docs.ts website/src/__tests__/docs.test.ts website/content/docs/intro.mdx
git commit -m "feat(website): docs data layer (getAllDocSlugs, getDocBySlug, getDocNavTree)"
```

---

### Task 4: Sidebar + TOC + DocContent components

**Files:**
- Create: `website/src/components/docs/Sidebar.tsx`
- Create: `website/src/components/docs/TableOfContents.tsx`
- Create: `website/src/components/docs/DocContent.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `website/src/components/docs/Sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/docs';

interface SidebarProps {
  items: NavItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-4 px-3">
        Documentation
      </div>
      <ul className="space-y-1">
        {items.map(item => {
          const isActive = pathname === item.href;
          return (
            <li key={item.slug}>
              <Link
                href={item.href}
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
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Create TableOfContents component**

Create `website/src/components/docs/TableOfContents.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TocItem[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' }
    );
    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pl-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
        On this page
      </div>
      <ul className="space-y-1">
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 12}px` }}>
            <a
              href={`#${h.id}`}
              className={[
                'block text-sm py-0.5 transition-colors',
                activeId === h.id
                  ? 'text-[#f97316]'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]',
              ].join(' ')}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 3: Create DocContent component**

Create `website/src/components/docs/DocContent.tsx`:

```typescript
import { MDXRemote } from 'next-mdx-remote/rsc';
import CodeBlock from '@/components/ui/CodeBlock';

interface DocContentProps {
  source: string;
}

const mdxComponents = {
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => {
    const child = children as React.ReactElement<{ className?: string; children?: string }>;
    const lang = child?.props?.className?.replace('language-', '') ?? 'text';
    const code = child?.props?.children ?? '';
    return <CodeBlock code={String(code).trim()} lang={lang} />;
  },
  h1: (props: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl font-bold text-[#f8fafc] mt-8 mb-4 first:mt-0" {...props} />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-2xl font-semibold text-[#f8fafc] mt-8 mb-3 border-b border-white/10 pb-2" {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-xl font-semibold text-[#f8fafc] mt-6 mb-2" {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="text-[#94a3b8] leading-7 mb-4" {...props} />
  ),
  a: (props: React.ComponentPropsWithoutRef<'a'>) => (
    <a className="text-[#f97316] hover:text-[#fbbf24] underline underline-offset-2 transition-colors" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="text-[#94a3b8] list-disc list-inside space-y-1 mb-4 pl-4" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="text-[#94a3b8] list-decimal list-inside space-y-1 mb-4 pl-4" {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-7" {...props} />
  ),
  blockquote: (props: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-[#f97316] pl-4 my-4 text-[#94a3b8] italic" {...props} />
  ),
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="text-left px-4 py-2 text-[#f8fafc] font-semibold bg-white/5 border border-white/10" {...props} />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="px-4 py-2 text-[#94a3b8] border border-white/10" {...props} />
  ),
  code: (props: React.ComponentPropsWithoutRef<'code'>) => (
    <code className="px-1.5 py-0.5 rounded text-[#fbbf24] bg-white/10 font-mono text-sm" {...props} />
  ),
  hr: () => <hr className="border-white/10 my-8" />,
};

export default function DocContent({ source }: DocContentProps) {
  return (
    <article className="flex-1 min-w-0 max-w-3xl py-8">
      <MDXRemote source={source} components={mdxComponents} />
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add website/src/components/docs/
git commit -m "feat(website): Sidebar, TableOfContents, DocContent components"
```

---

### Task 5: Docs layout + page routes

**Files:**
- Create: `website/src/app/docs/layout.tsx`
- Create: `website/src/app/docs/page.tsx`
- Create: `website/src/app/docs/[...slug]/page.tsx`

- [ ] **Step 1: Create docs layout**

Create `website/src/app/docs/layout.tsx`:

```typescript
import { getDocNavTree } from '@/lib/docs';
import Sidebar from '@/components/docs/Sidebar';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const navItems = await getDocNavTree();

  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="max-w-screen-2xl mx-auto flex">
        <Sidebar items={navItems} />
        <main className="flex-1 flex px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create docs index redirect**

Create `website/src/app/docs/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function DocsPage() {
  redirect('/docs/intro');
}
```

- [ ] **Step 3: Create dynamic slug page**

Create `website/src/app/docs/[...slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { getDocBySlug, getAllDocSlugs, getDocNavTree } from '@/lib/docs';
import DocContent from '@/components/docs/DocContent';
import TableOfContents from '@/components/docs/TableOfContents';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = await getAllDocSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const doc = await getDocBySlug(slug);
    return {
      title: `${doc.frontmatter.title} — Super.js Docs`,
      description: doc.frontmatter.description ?? `Super.js documentation: ${doc.frontmatter.title}`,
    };
  } catch {
    return { title: 'Super.js Docs' };
  }
}

function extractHeadings(content: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ id, text, level: match[1].length });
  }
  return headings;
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  let doc;
  try {
    doc = await getDocBySlug(slug);
  } catch {
    notFound();
  }

  const headings = extractHeadings(doc.content);

  return (
    <>
      <DocContent source={doc.content} />
      <TableOfContents headings={headings} />
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add website/src/app/docs/
git commit -m "feat(website): docs routes — layout, index redirect, [slug] page with SSG"
```

---

### Task 6: Port all 8 docs from docs/docs/

**Files:**
- Create: `website/content/docs/intro.mdx` (replace stub from Task 3)
- Create: `website/content/docs/language-reference.mdx`
- Create: `website/content/docs/type-system.mdx`
- Create: `website/content/docs/specification.mdx`
- Create: `website/content/docs/tooling.mdx`
- Create: `website/content/docs/examples.mdx`
- Create: `website/content/docs/roadmap.mdx`
- Create: `website/content/docs/changelog.mdx`

- [ ] **Step 1: Copy and convert each file**

Run from repo root:

```bash
for f in intro language-reference type-system specification tooling examples roadmap changelog; do
  # Read source
  src="docs/docs/${f}.md"
  dst="website/content/docs/${f}.mdx"
  # Replace Docusaurus-specific frontmatter sidebar_position with title
  # Docusaurus uses sidebar_position; keep it — lib/docs.ts reads it for ordering
  cp "$src" "$dst"
done
```

- [ ] **Step 2: Add title to each MDX frontmatter (gray-matter requires it)**

Manually verify each file has `title:` in frontmatter. If missing, add it. Expected frontmatter for each:

`intro.mdx`:
```yaml
---
title: Introduction
sidebar_position: 1
description: Get started with Super.js — the type-safe JavaScript superset
---
```

`language-reference.mdx`:
```yaml
---
title: Language Reference
sidebar_position: 2
description: Complete reference for Super.js syntax and language features
---
```

`type-system.mdx`:
```yaml
---
title: Type System
sidebar_position: 3
description: Super.js type system — nullable types, sum types, generics
---
```

`specification.mdx`:
```yaml
---
title: Specification
sidebar_position: 4
description: Formal specification of the Super.js language
---
```

`tooling.mdx`:
```yaml
---
title: Tooling
sidebar_position: 5
description: Compiler, linter, formatter, and type checker for Super.js
---
```

`examples.mdx`:
```yaml
---
title: Examples
sidebar_position: 6
description: Super.js code examples and patterns
---
```

`roadmap.mdx`:
```yaml
---
title: Roadmap
sidebar_position: 7
description: Super.js development roadmap and planned features
---
```

`changelog.mdx`:
```yaml
---
title: Changelog
sidebar_position: 8
description: Super.js version history and release notes
---
```

- [ ] **Step 3: Fix Docusaurus-specific directives if any**

Search for `:::note`, `:::warning`, `:::tip`, `import` statements — Docusaurus callouts. Replace with plain MDX blockquotes:

```bash
cd website
# Check for Docusaurus admonitions
grep -r ":::" content/docs/ || echo "none found"
```

If found, replace `:::note\ncontent\n:::` with `> **Note:** content`.

- [ ] **Step 4: Run dev server and verify each doc renders**

```bash
cd website && npm run dev
```

Open: `http://localhost:3000/docs/intro`, `http://localhost:3000/docs/language-reference`, etc.

Each page should: show sidebar with active item highlighted, render MDX content with orange/amber syntax highlighting, show TOC on right rail.

- [ ] **Step 5: Commit**

```bash
git add website/content/docs/
git commit -m "feat(website): port all 8 docs from Docusaurus to MDX (intro, language-ref, type-system, spec, tooling, examples, roadmap, changelog)"
```

---

### Task 7: Blog routes + two starter posts

**Files:**
- Create: `website/src/lib/blog.ts`
- Create: `website/src/app/blog/page.tsx`
- Create: `website/src/app/blog/[slug]/page.tsx`
- Create: `website/content/blog/2024-01-01-welcome.mdx`
- Create: `website/content/blog/2024-01-15-0-2-0-released.mdx`

- [ ] **Step 1: Create lib/blog.ts**

Create `website/src/lib/blog.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface PostFrontmatter {
  title: string;
  date: string;
  description?: string;
  author?: string;
}

export interface PostSummary {
  slug: string;
  frontmatter: PostFrontmatter;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
}

export async function getAllPostSlugs(): Promise<string[]> {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''));
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { slug, frontmatter: data as PostFrontmatter, content };
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const slugs = await getAllPostSlugs();
  const posts: PostSummary[] = [];
  for (const slug of slugs) {
    const post = await getPostBySlug(slug);
    posts.push({ slug, frontmatter: post.frontmatter });
  }
  return posts.sort((a, b) =>
    new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
  );
}
```

- [ ] **Step 2: Create blog index page**

Create `website/src/app/blog/page.tsx`:

```typescript
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog — Super.js',
  description: 'News and updates from the Super.js team',
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main className="min-h-screen bg-[#050510] pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-[#f8fafc] mb-2">Blog</h1>
        <p className="text-[#94a3b8] mb-12">News and updates from the Super.js team</p>
        <div className="space-y-8">
          {posts.map(post => (
            <article key={post.slug} className="border border-white/10 rounded-xl p-6 hover:border-[#f97316]/40 transition-colors">
              <time className="text-xs text-[#94a3b8] font-mono">{post.frontmatter.date}</time>
              <h2 className="text-xl font-semibold text-[#f8fafc] mt-2 mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-[#f97316] transition-colors">
                  {post.frontmatter.title}
                </Link>
              </h2>
              {post.frontmatter.description && (
                <p className="text-[#94a3b8] text-sm leading-relaxed">{post.frontmatter.description}</p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="inline-block mt-4 text-sm text-[#f97316] hover:text-[#fbbf24] transition-colors"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create blog post page**

Create `website/src/app/blog/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { getAllPostSlugs, getPostBySlug } from '@/lib/blog';
import DocContent from '@/components/docs/DocContent';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    return {
      title: `${post.frontmatter.title} — Super.js Blog`,
      description: post.frontmatter.description,
    };
  } catch {
    return { title: 'Super.js Blog' };
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050510] pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <time className="text-xs text-[#94a3b8] font-mono">{post.frontmatter.date}</time>
        <h1 className="text-4xl font-bold text-[#f8fafc] mt-2 mb-8">{post.frontmatter.title}</h1>
        <DocContent source={post.content} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create two starter blog posts**

Create `website/content/blog/2024-01-01-welcome.mdx`:

```mdx
---
title: Welcome to Super.js
date: 2024-01-01
description: Introducing Super.js — a type-safe JavaScript superset with null safety, sum types, and match expressions.
author: Himank Barve
---

# Welcome to Super.js

Today we're introducing **Super.js** — a new programming language that compiles to plain JavaScript.

## Why Super.js?

JavaScript is the most widely used programming language in the world. TypeScript improved it significantly with static types. But some fundamental issues remain:

- `null` and `undefined` cause runtime crashes
- `any` escapes the type system entirely
- No sum types mean verbose null-checking
- `enum` compiles to runtime objects

Super.js addresses all of these while compiling to the same JavaScript you know.

## What's Different

```sjs
// Nullable types with the ? suffix
const name: string? = null  // explicit, safe

// Sum types
type Result<T, E> = Ok(T) | Err(E)

// Exhaustive match
match result {
  Ok(value) => console.log(value),
  Err(error) => console.error(error),
}

// No `any` — use `dynamic` explicitly
const x: dynamic = fetchUnknownData()
```

## Try It Now

```bash
npm install -g superjs
echo 'const x: string? = null' > hello.sjs
sjs compile hello.sjs
```

We're just getting started. Follow the project on GitHub for updates.
```

Create `website/content/blog/2024-01-15-0-2-0-released.mdx`:

```mdx
---
title: Super.js 0.2.0 Released
date: 2024-01-15
description: Super.js 0.2.0 adds gradual typing, improved error messages, and the VS Code extension.
author: Himank Barve
---

# Super.js 0.2.0 Released

Version 0.2.0 is the biggest release yet. Here's what's new.

## Gradual Typing

You can now mix typed and untyped code freely. Functions without type annotations work exactly as in JavaScript:

```sjs
// Typed — full type checking
function greet(name: string): string {
  return `Hello, ${name}!`
}

// Untyped — works like JS, no errors
function add(a, b) {
  return a + b
}
```

## VS Code Extension

Install the Super.js VS Code extension for:

- Syntax highlighting for all SJS-specific syntax (`T?`, `match`, sum types)
- 13 snippets for common patterns
- Bracket matching and auto-close

Search "Super.js" in the VS Code marketplace.

## Improved Error Messages

The compiler now provides precise, friendly error messages with source locations:

```
error[E001]: Null assigned to non-nullable type
  --> hello.sjs:3:15
   |
 3 | const x: string = null
   |                   ^^^^ expected `string`, found `null`
   |
   = help: use `string?` to allow null values
```

## What's Next

Version 0.3.0 will focus on the standard library and module system. See the [roadmap](/docs/roadmap) for details.
```

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/blog.ts website/src/app/blog/ website/content/blog/
git commit -m "feat(website): blog routes + two starter posts (welcome, 0.2.0 release)"
```

---

### Task 8: Pagefind static search

**Files:**
- Modify: `website/package.json` (add pagefind scripts)
- Create: `website/src/components/docs/SearchButton.tsx`
- Modify: `website/src/app/docs/layout.tsx` (add search button)
- Modify: `.github/workflows/website.yml` (run pagefind post-build)

- [ ] **Step 1: Add pagefind build script to package.json**

In `website/package.json`, add to `"scripts"`:

```json
{
  "scripts": {
    "postbuild": "npx pagefind --site .next/static --output-path public/pagefind"
  }
}
```

- [ ] **Step 2: Create SearchButton client component**

Create `website/src/components/docs/SearchButton.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';

export default function SearchButton() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Dynamically import pagefind UI only in browser after build
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/pagefind/pagefind-ui.css';
    document.head.appendChild(link);

    import('/pagefind/pagefind-ui.js' as never).then((pf: { PagefindUI: new (opts: object) => void }) => {
      new pf.PagefindUI({
        element: '#search',
        showSubResults: true,
        highlightParam: 'highlight',
      });
    }).catch(() => {
      // Pagefind not available in dev mode — expected
    });
  }, []);

  return (
    <div className="mb-6">
      <div id="search" className="[&_.pagefind-ui__search-input]:bg-white/5 [&_.pagefind-ui__search-input]:border-white/20 [&_.pagefind-ui__search-input]:text-[#f8fafc] [&_.pagefind-ui__search-input]:rounded-lg" />
    </div>
  );
}
```

- [ ] **Step 3: Add SearchButton to docs layout**

Edit `website/src/app/docs/layout.tsx` to add SearchButton above sidebar nav:

```typescript
import { getDocNavTree } from '@/lib/docs';
import Sidebar from '@/components/docs/Sidebar';
import SearchButton from '@/components/docs/SearchButton';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const navItems = await getDocNavTree();

  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="max-w-screen-2xl mx-auto flex">
        <nav className="w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
          <SearchButton />
          <Sidebar items={navItems} />
        </nav>
        <main className="flex-1 flex px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Note: Move `<nav>` wrapper out of `Sidebar` component since layout now owns it.

- [ ] **Step 4: Update GitHub Actions to run pagefind**

Edit `.github/workflows/website.yml`. After `npm run build`, add:

```yaml
- name: Run Pagefind
  run: npx pagefind --site website/.next/static --output-path website/public/pagefind
  working-directory: .
```

- [ ] **Step 5: Verify build with pagefind**

```bash
cd website && npm run build
ls public/pagefind/
```

Expected: `pagefind.js`, `pagefind-ui.js`, `pagefind-ui.css` present.

- [ ] **Step 6: Commit**

```bash
git add website/src/components/docs/SearchButton.tsx website/src/app/docs/layout.tsx website/package.json .github/workflows/website.yml
git commit -m "feat(website): Pagefind static search for docs"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `/docs/[...slug]` route with MDX renderer — Task 5
- [x] Sidebar auto-generated from `content/docs/` frontmatter — Task 3 + 4
- [x] TOC right rail — Task 4
- [x] Shiki syntax highlighting with orange/amber theme — Task 2
- [x] MDX content ported from `docs/docs/` (8 files) — Task 6
- [x] Pagefind search (static, post-build) — Task 8
- [x] Blog index + post route — Task 7
- [x] Two blog posts — Task 7

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:** `NavItem`, `DocFrontmatter`, `Doc` in `lib/docs.ts` used consistently in Task 3 tests and Task 4 components. `PostFrontmatter`, `Post`, `PostSummary` in `lib/blog.ts` used in Task 7.
