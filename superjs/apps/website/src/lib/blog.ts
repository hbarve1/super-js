import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface PostFrontmatter {
  title: string
  date: string
  description?: string
  author?: string
}

export interface PostSummary {
  slug: string
  frontmatter: PostFrontmatter
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}

export async function getAllPostSlugs(): Promise<string[]> {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs.readdirSync(BLOG_DIR).reduce<string[]>((slugs, f) => {
    if (f.endsWith('.mdx')) slugs.push(f.replace(/\.mdx$/, ''))
    return slugs
  }, [])
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  // gray-matter parses date fields as Date objects; normalize to YYYY-MM-DD.
  if (data.date instanceof Date) {
    data.date = data.date.toISOString().split('T')[0]
  }
  return { slug, frontmatter: data as PostFrontmatter, content }
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const slugs = await getAllPostSlugs()
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlug(slug)
      return { slug, frontmatter: post.frontmatter }
    }),
  )
  return posts.sort(
    (a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime(),
  )
}
