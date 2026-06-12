import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs')

export interface DocFrontmatter {
  title: string
  sidebar_position?: number
  description?: string
}

export interface NavItem {
  slug: string
  title: string
  sidebar_position: number
  href: string
}

export interface Doc {
  frontmatter: DocFrontmatter
  content: string
  slug: string[]
}

/** GitHub-style heading slug — shared by the MDX renderer and the TOC so anchors line up. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function getAllDocSlugs(): Promise<string[][]> {
  if (!fs.existsSync(DOCS_DIR)) return []
  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .map((f) => [f.replace(/\.(mdx|md)$/, '')])
}

export async function getDocBySlug(slug: string[]): Promise<Doc> {
  const slugPath = slug.join('/')
  const mdxPath = path.join(DOCS_DIR, `${slugPath}.mdx`)
  const mdPath = path.join(DOCS_DIR, `${slugPath}.md`)
  const filePath = fs.existsSync(mdxPath) ? mdxPath : mdPath
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return { frontmatter: data as DocFrontmatter, content, slug }
}

export async function getDocNavTree(): Promise<NavItem[]> {
  const slugs = await getAllDocSlugs()
  const items: NavItem[] = []
  for (const slug of slugs) {
    const doc = await getDocBySlug(slug)
    items.push({
      slug: slug.join('/'),
      title: doc.frontmatter.title ?? slug[slug.length - 1],
      sidebar_position: doc.frontmatter.sidebar_position ?? 99,
      href: `/docs/${slug.join('/')}`,
    })
  }
  return items.sort((a, b) => a.sidebar_position - b.sidebar_position)
}
