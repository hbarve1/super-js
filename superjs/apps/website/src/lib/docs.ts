import fs from 'node:fs'
import path from 'node:path'
import { parseFrontmatter } from './frontmatter'

/**
 * Two content roots:
 *   1. LEGACY_DOCS_DIR — flat .mdx files in apps/website/content/docs/ (existing docs)
 *   2. ROOT_DOCS_DIR   — repo-root docs/ tree with section subdirs (v1.0 content workstreams)
 *
 * process.cwd() when Next.js runs = superjs/apps/website/
 * Repo root is three directories up from there.
 */
const LEGACY_DOCS_DIR = path.join(process.cwd(), 'content', 'docs')
const ROOT_DOCS_DIR = path.join(process.cwd(), '..', '..', '..', 'docs')

/** v1.0 section directories under docs/ at repo root */
const SECTION_DIRS = [
  { dir: 'roadmap', label: 'Roadmap', groupPosition: 5 },
  { dir: 'ops', label: 'Operations', groupPosition: 8 },
  { dir: 'launch', label: 'Launch', groupPosition: 9 },
  { dir: 'press', label: 'Press', groupPosition: 12 },
  { dir: 'tour', label: 'Language Tour', groupPosition: 10 },
  { dir: 'migration', label: 'Migration Guide', groupPosition: 20 },
  { dir: 'api', label: 'API Reference', groupPosition: 30 },
  { dir: 'why', label: 'Why SuperJS', groupPosition: 40 },
  { dir: 'compat', label: 'Compatibility', groupPosition: 50 },
  { dir: 'perf', label: 'Benchmarks', groupPosition: 60 },
  { dir: 'error-codes', label: 'Error Codes', groupPosition: 70 },
  { dir: 'spec', label: 'Language Spec', groupPosition: 80 },
  { dir: 'cli', label: 'CLI Reference', groupPosition: 90 },
  { dir: 'stdlib', label: 'Standard Library', groupPosition: 100 },
  { dir: 'beta', label: 'Beta Program', groupPosition: 110 },
]

export interface DocFrontmatter {
  title: string
  sidebar_position?: number
  description?: string
  /** Section directory name — set on repo-root docs/ files */
  section?: string
  /** Error code — e.g. SJS-E001 */
  error_code?: string
  /** Edit-on-GitHub URL for this page */
  edit_url?: string
}

export interface NavItem {
  slug: string
  title: string
  sidebar_position: number
  href: string
  /** Group label — present for section index pages and nested files */
  group?: string
  groupPosition?: number
}

export interface NavGroup {
  label: string
  groupPosition: number
  items: NavItem[]
}

export interface Doc {
  frontmatter: DocFrontmatter
  content: string
  slug: string[]
  /** Absolute filesystem path — used for edit-on-GitHub link */
  filePath: string
}

/** GitHub-style heading slug — shared by the MDX renderer and the TOC so anchors line up. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/** Build the edit-on-GitHub URL for a given filesystem path. */
export function editUrl(filePath: string): string {
  const repoRoot = path.resolve(process.cwd(), '..', '..', '..')
  const relative = path.relative(repoRoot, filePath).replace(/\\/g, '/')
  return `https://github.com/hbarve1/super-js/edit/main/${relative}`
}

// ---------------------------------------------------------------------------
// Legacy flat docs (content/docs/*.mdx)
// ---------------------------------------------------------------------------

async function getLegacyDocSlugs(): Promise<string[][]> {
  if (!fs.existsSync(LEGACY_DOCS_DIR)) return []
  return fs.readdirSync(LEGACY_DOCS_DIR).reduce<string[][]>((slugs, f) => {
    if (f.endsWith('.mdx') || f.endsWith('.md')) slugs.push([f.replace(/\.(mdx|md)$/, '')])
    return slugs
  }, [])
}

async function getLegacyDocBySlug(slug: string[]): Promise<Doc | null> {
  const slugPath = slug.join('/')
  const mdxPath = path.join(LEGACY_DOCS_DIR, `${slugPath}.mdx`)
  const mdPath = path.join(LEGACY_DOCS_DIR, `${slugPath}.md`)
  const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null
  if (!filePath) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = parseFrontmatter(raw)
  return { frontmatter: data as unknown as DocFrontmatter, content, slug, filePath }
}

// ---------------------------------------------------------------------------
// Repo-root section docs (docs/<section>/*)
// ---------------------------------------------------------------------------

async function getSectionDocSlugs(): Promise<string[][]> {
  if (!fs.existsSync(ROOT_DOCS_DIR)) return []
  const slugs: string[][] = []
  for (const { dir } of SECTION_DIRS) {
    const sectionDir = path.join(ROOT_DOCS_DIR, dir)
    if (!fs.existsSync(sectionDir)) continue
    const files = fs.readdirSync(sectionDir)
    for (const f of files) {
      if (f.endsWith('.md') || f.endsWith('.mdx')) {
        const name = f.replace(/\.(mdx|md)$/, '')
        slugs.push([dir, name])
      }
    }
  }
  return slugs
}

async function getSectionDocBySlug(slug: string[]): Promise<Doc | null> {
  if (slug.length < 2) return null
  const [section, ...rest] = slug
  const slugPath = rest.join('/')
  const mdPath = path.join(ROOT_DOCS_DIR, section, `${slugPath}.md`)
  const mdxPath = path.join(ROOT_DOCS_DIR, section, `${slugPath}.mdx`)
  const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null
  if (!filePath) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = parseFrontmatter(raw)
  return { frontmatter: data as unknown as DocFrontmatter, content, slug, filePath }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getAllDocSlugs(): Promise<string[][]> {
  const [legacy, section] = await Promise.all([getLegacyDocSlugs(), getSectionDocSlugs()])
  return [...legacy, ...section]
}

export async function getDocBySlug(slug: string[]): Promise<Doc> {
  // Two-segment slug means it lives in a section dir
  if (slug.length >= 2) {
    const sectionDoc = await getSectionDocBySlug(slug)
    if (sectionDoc) return sectionDoc
  }

  // Fall back to legacy flat content/docs/
  const legacyDoc = await getLegacyDocBySlug(slug)
  if (legacyDoc) return legacyDoc

  throw new Error(`Doc not found: ${slug.join('/')}`)
}

export async function getDocNavTree(): Promise<NavItem[]> {
  const slugs = await getAllDocSlugs()
  const items = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const doc = await getDocBySlug(slug)
        const isSection = slug.length >= 2
        const sectionDef = isSection ? SECTION_DIRS.find((s) => s.dir === slug[0]) : undefined
        return {
          slug: slug.join('/'),
          title: doc.frontmatter.title ?? slug[slug.length - 1],
          sidebar_position: doc.frontmatter.sidebar_position ?? 99,
          href: `/docs/${slug.join('/')}`,
          group: sectionDef?.label,
          groupPosition: sectionDef?.groupPosition,
        } satisfies NavItem
      } catch {
        return null
      }
    }),
  )
  return (items.filter(Boolean) as NavItem[]).sort((a, b) => {
    // Legacy (no group) come first, then sections ordered by groupPosition
    const aPos = a.groupPosition ?? -1
    const bPos = b.groupPosition ?? -1
    if (aPos !== bPos) return aPos - bPos
    return a.sidebar_position - b.sidebar_position
  })
}

/**
 * Returns nav items grouped by section for use in the sidebar.
 * Legacy flat docs are returned as a single "Documentation" group.
 */
export async function getDocNavGroups(): Promise<NavGroup[]> {
  const items = await getDocNavTree()

  const legacyItems = items.filter((i) => !i.group)
  const groupMap = new Map<string, NavGroup>()

  for (const item of items) {
    if (!item.group) continue
    const key = item.group
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        label: key,
        groupPosition: item.groupPosition ?? 99,
        items: [],
      })
    }
    groupMap.get(key)!.items.push(item)
  }

  const groups: NavGroup[] = []

  if (legacyItems.length > 0) {
    groups.push({
      label: 'Documentation',
      groupPosition: -1,
      items: legacyItems,
    })
  }

  for (const group of groupMap.values()) {
    group.items.sort((a, b) => a.sidebar_position - b.sidebar_position)
    groups.push(group)
  }

  return groups.sort((a, b) => a.groupPosition - b.groupPosition)
}
